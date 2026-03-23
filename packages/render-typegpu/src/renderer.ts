/**
 * Forward+ Clustered Renderer — thin frame orchestrator.
 *
 * Composes three subsystems, each with a uniform interface:
 *   SceneSystem:    ECS → instances + camera
 *   LightingSystem: ECS → lights + constants (with inline shadow data)
 *   ClusterSystem:  cluster grid + compute culling
 *
 * Per-frame flow:
 *   1. Extract:  scene.extract() + lighting.extract()
 *   2. Prepare:  scene.flush() + lighting.flush() + cluster.prepare()
 *   3. Shadow:   render shadow depth maps (reuses same batches)
 *   4. Compute:  cluster.dispatch()  (AABB build + light culling)
 *   5. Render:   draw batches with SceneGroup + LightingGroup + shadows
 */

import { mat4 } from 'wgpu-matrix';
import type { EngineWorld, Renderer, MeshHandle } from '@engine/engine/types.js';
import type { EngineError } from '@engine/engine/errors.js';
import type { AttemptResultAsync } from '@engine/engine/attempt.js';
import { Light, DirectionalLight, SpotLight } from '@engine/ecs/components.js';
import { query, asBuffer } from 'bitecs';
import { createGpuServices, type GpuServices } from './gpu.js';
import { MeshVertexLayout, type MeshGpu } from './resources/meshGpu.js';
import {
  createShadowAtlasRaw,
  createShadowSamplerRaw,
  computeAtlasRects,
} from './resources/shadowAtlas.js';
import { computeDirectionalShadowVP, computeSpotShadowVP } from './shaders/shadowMath.js';
import { createStaticMeshPipeline } from './pipelines/staticMesh.js';
import { createShadowPass, createShadowInstanceBindGroup } from './pipelines/shadowPass.js';
import { createSceneSystem } from './systems/sceneSystem.js';
import { createLightingSystem } from './systems/lightingSystem.js';
import { createClusterSystem } from './systems/clusterSystem.js';
import { packLightShadow } from './stagedBuffer.js';
import { LIGHT_FLOATS, LIGHT_TYPE_DIRECTIONAL, LIGHT_TYPE_SPOT } from './schemas.js';
import { type RendererConfig, DEFAULT_RENDERER_CONFIG } from './rendererConfig.js';

export async function createRenderer(
  canvas: HTMLCanvasElement,
  config?: Partial<RendererConfig>,
): AttemptResultAsync<EngineError, { renderer: Renderer; gpu: GpuServices }> {
  const cfg = { ...DEFAULT_RENDERER_CONFIG, ...config };

  const [gpuErr, gpu] = await createGpuServices(canvas);
  if (gpuErr) return [gpuErr, null];

  const root = gpu!.root;
  const context = gpu!.context;

  // ── Subsystems ─────────────────────────────────────────────────────────

  const scene = createSceneSystem(root, cfg.maxInstances, cfg.maxMaterials);
  const lighting = createLightingSystem(root, cfg.maxLights);

  // Shadow atlas — raw WebGPU texture (NOT TypeGPU unstable API).
  // Same GPUTexture is used for both depth rendering and shader sampling.
  const shadowAtlasRaw = createShadowAtlasRaw(root.device, cfg.shadowMapSize);
  const shadowSamplerRaw = createShadowSamplerRaw(root.device);
  const shadowAtlasRects = computeAtlasRects(cfg.maxShadowLights, cfg.shadowMapSize);

  const cluster = createClusterSystem(
    root, scene, lighting,
    // Pass raw GPUTextureView + GPUSampler — TypeGPU bind groups accept raw resources
    { shadowAtlasView: shadowAtlasRaw.sampledView, shadowSampler: shadowSamplerRaw },
    canvas.width, canvas.height,
  );

  // ── Pipelines ──────────────────────────────────────────────────────────

  const pipeline = createStaticMeshPipeline(root, cfg.msaa);

  // Shadow pass — raw WebGPU for depth-only rendering
  const shadowPass = createShadowPass(root);
  const shadowInstanceBG = createShadowInstanceBindGroup(
    root.device,
    shadowPass.pipeline.getBindGroupLayout(1),
    scene.instances.gpuBuffer,
  );
  const lightVPStaging = new Float32Array(16);

  // ── MSAA textures (only when msaa=4) ───────────────────────────────────

  let msaaColorTexture: any = null;
  let depthWidth = canvas.width;
  let depthHeight = canvas.height;
  let depthTexture = (root as any)['~unstable']
    .createTexture({
      size: [depthWidth, depthHeight],
      format: 'depth24plus',
      ...(cfg.msaa > 1 ? { sampleCount: cfg.msaa } : {}),
    })
    .$usage('render');

  if (cfg.msaa > 1) {
    msaaColorTexture = (root as any)['~unstable']
      .createTexture({
        size: [depthWidth, depthHeight],
        format: navigator.gpu.getPreferredCanvasFormat(),
        sampleCount: cfg.msaa,
      })
      .$usage('render');
  }

  function ensureRenderTextures() {
    if (canvas.width !== depthWidth || canvas.height !== depthHeight) {
      depthTexture.destroy();
      if (msaaColorTexture) msaaColorTexture.destroy();

      depthWidth = canvas.width;
      depthHeight = canvas.height;

      depthTexture = (root as any)['~unstable']
        .createTexture({
          size: [depthWidth, depthHeight],
          format: 'depth24plus',
          ...(cfg.msaa > 1 ? { sampleCount: cfg.msaa } : {}),
        })
        .$usage('render');

      if (cfg.msaa > 1) {
        msaaColorTexture = (root as any)['~unstable']
          .createTexture({
            size: [depthWidth, depthHeight],
            format: navigator.gpu.getPreferredCanvasFormat(),
            sampleCount: cfg.msaa,
          })
          .$usage('render');
      }
    }
  }

  // ── Diagnostics ────────────────────────────────────────────────────────

  const diag = {
    frameCount: 0,
    instanceCount: 0,
    lightCount: 0,
    batchCount: 0,
    drawCalls: 0,
    triangles: 0,
    shadowLights: 0,
    msaa: cfg.msaa,
    clusterGrid: [0, 0, 0] as number[],
    totalClusters: 0,
    cpuTimes: { extract: 0, prepare: 0, shadow: 0, compute: 0, render: 0, total: 0 },
    fps: { current: 0, avg: 0, min: Infinity, max: 0 },
    errors: [] as string[],
    _frameTimes: [] as number[],
    _lastTime: performance.now(),
  };
  (globalThis as any).__juno = diag;

  root.device.addEventListener('uncapturederror', (e: any) => {
    const msg = e?.error?.message || String(e);
    diag.errors.push(msg);
    if (diag.errors.length > 20) diag.errors.shift();
  });

  // ── Frame loop ─────────────────────────────────────────────────────────

  function render(world: EngineWorld): void {
    const t0 = performance.now();
    diag.frameCount++;

    // FPS tracking
    const frameDt = t0 - diag._lastTime;
    diag._lastTime = t0;
    if (frameDt > 0 && frameDt < 1000) {
      diag._frameTimes.push(frameDt);
      if (diag._frameTimes.length > 120) diag._frameTimes.shift();
      const avg = diag._frameTimes.reduce((s, v) => s + v, 0) / diag._frameTimes.length;
      diag.fps.current = Math.round(1000 / frameDt);
      diag.fps.avg = Math.round(1000 / avg);
      diag.fps.min = Math.min(diag.fps.min, diag.fps.current);
      diag.fps.max = Math.max(diag.fps.max, diag.fps.current);
    }

    // 1. Extract
    const tExtract = performance.now();
    scene.extract(world);
    if (scene.frame.instanceCount === 0) return;
    lighting.extract(world);
    diag.cpuTimes.extract = performance.now() - tExtract;

    const vpW = canvas.width;
    const vpH = canvas.height;

    ensureRenderTextures();
    cluster.resize(vpW, vpH);

    // 2. Prepare
    const tPrepare = performance.now();
    scene.flush(world, vpW, vpH, cfg.fov, cfg.near, cfg.far);

    // Write shadow VP matrices + atlas rects into the light staging buffer
    // before flushing lights to GPU. Shadow data is inline in LightGpu.
    if (cfg.shadowsEnabled) {
      const lf = lighting.lightFrame;
      let shadowIdx = 0;
      for (let i = 0; i < lf.lightCount && shadowIdx < cfg.maxShadowLights; i++) {
        const lightBase = i * LIGHT_FLOATS;
        const lightType = lighting.stagingU32[lightBase + 3];

        if (lightType === LIGHT_TYPE_DIRECTIONAL) {
          const dirX = lighting.stagingF32[lightBase + 8]!;
          const dirY = lighting.stagingF32[lightBase + 9]!;
          const dirZ = lighting.stagingF32[lightBase + 10]!;
          computeDirectionalShadowVP(dirX, dirY, dirZ, 15, lightVPStaging);

          const rect = shadowAtlasRects[shadowIdx];
          if (rect) {
            packLightShadow(
              lighting.stagingF32, lighting.stagingU32,
              i, LIGHT_FLOATS, lightVPStaging,
              rect.u, rect.v, rect.w, rect.h,
              0.001, 0.005, 2.0, 1, // bias, normalBias, softness, flags=enabled
            );
          }
          shadowIdx++;
        } else if (lightType === LIGHT_TYPE_SPOT) {
          const posX = lighting.stagingF32[lightBase + 0]!;
          const posY = lighting.stagingF32[lightBase + 1]!;
          const posZ = lighting.stagingF32[lightBase + 2]!;
          const dirX = lighting.stagingF32[lightBase + 8]!;
          const dirY = lighting.stagingF32[lightBase + 9]!;
          const dirZ = lighting.stagingF32[lightBase + 10]!;
          const radius = lighting.stagingF32[lightBase + 11]!;
          const outerCone = lighting.stagingF32[lightBase + 13]!;

          computeSpotShadowVP(posX, posY, posZ, dirX, dirY, dirZ, outerCone, radius, lightVPStaging);

          const rect = shadowAtlasRects[shadowIdx];
          if (rect) {
            packLightShadow(
              lighting.stagingF32, lighting.stagingU32,
              i, LIGHT_FLOATS, lightVPStaging,
              rect.u, rect.v, rect.w, rect.h,
              0.005, 0.05, 3.0, 1,
            );
          }
          shadowIdx++;
        }
      }
      diag.shadowLights = shadowIdx;
    }

    lighting.flush(cfg.ambientColor.r, cfg.ambientColor.g, cfg.ambientColor.b);

    const invProjX = 1.0 / (scene.camera.proj[0] || 1);
    const invProjY = 1.0 / (scene.camera.proj[5] || 1);
    cluster.prepare(vpW, vpH, cfg.near, cfg.far, invProjX, invProjY);
    diag.cpuTimes.prepare = performance.now() - tPrepare;

    // 3. Shadow passes — render depth from each shadow light's viewpoint
    const tShadow = performance.now();
    if (cfg.shadowsEnabled) {
      let shadowIdx = 0;
      for (let i = 0; i < lighting.lightFrame.lightCount && shadowIdx < cfg.maxShadowLights; i++) {
        const lightBase = i * LIGHT_FLOATS;
        const lightType = lighting.stagingU32[lightBase + 3];

        if (lightType === LIGHT_TYPE_DIRECTIONAL || lightType === LIGHT_TYPE_SPOT) {
          const rect = shadowAtlasRects[shadowIdx];
          if (!rect) { shadowIdx++; continue; }

          // Read the VP matrix we packed earlier and write to raw GPU buffer
          const vpOffset = lightBase + 16;
          lightVPStaging.set(lighting.stagingF32.subarray(vpOffset, vpOffset + 16));
          root.device.queue.writeBuffer(shadowPass.lightVPBuffer, 0, lightVPStaging);

          // Render all batches using raw WebGPU (depth-only, no fragment stage)
          // Each shadow light renders to its own tile in the atlas via viewport
          const encoder = root.device.createCommandEncoder();
          const isFirstShadow = shadowIdx === 0;
          const shadowRenderPass = encoder.beginRenderPass({
            colorAttachments: [],
            depthStencilAttachment: {
              view: shadowAtlasRaw.depthView,
              depthClearValue: 1.0,
              depthLoadOp: isFirstShadow ? 'clear' : 'load',
              depthStoreOp: 'store',
            },
          });
          shadowRenderPass.setPipeline(shadowPass.pipeline);
          shadowRenderPass.setBindGroup(0, shadowPass.lightVPBindGroup);
          shadowRenderPass.setBindGroup(1, shadowInstanceBG);
          // Viewport restricts rendering to this light's atlas tile
          shadowRenderPass.setViewport(
            rect.pixelX, rect.pixelY, rect.pixelSize, rect.pixelSize,
            0, 1,
          );
          shadowRenderPass.setScissorRect(
            rect.pixelX, rect.pixelY, rect.pixelSize, rect.pixelSize,
          );

          const { frame } = scene;
          const MESH_PLANE = 4; // ground plane — shadow receiver, not caster
          for (let b = 0; b < frame.batches.length; b++) {
            const batch = frame.batches[b]!;
            if (batch.mesh === MESH_PLANE) continue; // skip ground in shadow pass
            const mesh = world.assets.meshes.get(batch.mesh as MeshHandle) as MeshGpu | undefined;
            if (!mesh) continue;

            const rawVB = (mesh.vertexBuffer as any).buffer as GPUBuffer;
            const rawIB = (mesh.indexBuffer as any).buffer as GPUBuffer;
            shadowRenderPass.setVertexBuffer(0, rawVB);
            shadowRenderPass.setIndexBuffer(rawIB, 'uint32');
            shadowRenderPass.drawIndexed(mesh.indexCount, batch.instanceCount, 0, 0, batch.firstInstance);
          }

          shadowRenderPass.end();
          root.device.queue.submit([encoder.finish()]);
          shadowIdx++;
        }
      }
    }
    diag.cpuTimes.shadow = performance.now() - tShadow;

    // 4. Compute — cluster AABB build + light culling
    const tCompute = performance.now();
    cluster.dispatch();
    diag.cpuTimes.compute = performance.now() - tCompute;

    // 5. Render — draw batches
    const tRender = performance.now();
    const { frame } = scene;
    let drawCalls = 0;
    let triangles = 0;
    for (let i = 0; i < frame.batches.length; i++) {
      const batch = frame.batches[i]!;
      const mesh = world.assets.meshes.get(batch.mesh as MeshHandle) as MeshGpu | undefined;
      if (!mesh) continue;

      const isFirst = i === 0;

      // MSAA: render into MSAA texture, resolve to swapchain
      const colorView = cfg.msaa > 1 ? msaaColorTexture : context;
      const resolveTarget = cfg.msaa > 1 ? context : undefined;

      pipeline
        .withColorAttachment({
          view: colorView as never,
          ...(resolveTarget ? { resolveTarget: resolveTarget as never } : {}),
          clearValue: isFirst ? cfg.clearColor : { r: 0, g: 0, b: 0, a: 0 },
          loadOp: isFirst ? 'clear' : 'load',
          storeOp: 'store',
        } as never)
        .withDepthStencilAttachment({
          view: depthTexture as never,
          depthClearValue: 1.0,
          depthLoadOp: isFirst ? 'clear' : 'load',
          depthStoreOp: 'store',
        } as never)
        .with(scene.bindGroup)
        .with(cluster.lightingBindGroup)
        .with(MeshVertexLayout, mesh.vertexBuffer as never)
        .withIndexBuffer(mesh.indexBuffer as never)
        .drawIndexed(mesh.indexCount, batch.instanceCount, 0, 0, batch.firstInstance);
      drawCalls++;
      triangles += (mesh.indexCount / 3) * batch.instanceCount;
    }

    diag.cpuTimes.render = performance.now() - tRender;
    diag.cpuTimes.total = performance.now() - t0;
    diag.instanceCount = frame.instanceCount;
    diag.lightCount = lighting.lightFrame.lightCount;
    diag.batchCount = frame.batches.length;
    diag.drawCalls = drawCalls;
    diag.triangles = triangles;
    diag.clusterGrid = [cluster.grid.gridX, cluster.grid.gridY, cluster.grid.gridZ];
    diag.totalClusters = cluster.grid.totalClusters;
  }

  return [
    null,
    {
      renderer: { render, destroy() { depthTexture.destroy(); gpu!.destroy(); } },
      gpu: gpu!,
    },
  ];
}
