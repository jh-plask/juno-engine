import { query, asBuffer } from 'bitecs';
import { mat4 } from 'wgpu-matrix';
import type { EngineWorld, Renderer, MeshHandle } from '@engine/engine/types.js';
import type { EngineError } from '@engine/engine/errors.js';
import type { AttemptResultAsync } from '@engine/engine/attempt.js';
import { Camera, WorldTransform } from '@engine/ecs/components.js';
import { createGpuServices, type GpuServices } from './gpu.js';
import { createFrameExtract, extractFrame } from './extract/frameExtract.js';
import {
  createInstanceBuffer,
  createMaterialBuffer,
  writeDefaultMaterials,
} from './resources/materialGpu.js';
import { MeshVertexLayout, type MeshGpu } from './resources/meshGpu.js';
import { CameraUniform } from './schemas.js';
import { SceneGroup } from './layouts.js';
import { createStaticMeshPipeline } from './pipelines/staticMesh.js';
import { createInstanceWriter, createCameraWriter } from './gpuWrite.js';
import { type RendererConfig, DEFAULT_RENDERER_CONFIG } from './rendererConfig.js';

// Scratch matrices for camera — avoid per-frame allocation
const scratchView = mat4.create();
const scratchProj = mat4.create();
const scratchViewProj = mat4.create();
const scratchWorldMat = mat4.create();

export async function createRenderer(
  canvas: HTMLCanvasElement,
  config?: Partial<RendererConfig>,
): AttemptResultAsync<EngineError, { renderer: Renderer; gpu: GpuServices }> {
  const cfg = { ...DEFAULT_RENDERER_CONFIG, ...config };

  const [gpuErr, gpu] = await createGpuServices(canvas);
  if (gpuErr) {
    return [gpuErr, null];
  }

  const root = gpu!.root;
  const context = gpu!.context;
  const gpuDestroy = gpu!.destroy;

  const cameraBuffer = root
    .createBuffer(CameraUniform)
    .$usage('uniform');

  const instanceBuffer = createInstanceBuffer(root, cfg.maxInstances);
  const materialBuffer = createMaterialBuffer(root, cfg.maxMaterials);

  // Cold-path: write default materials once
  writeDefaultMaterials(materialBuffer, cfg.maxMaterials);

  const frame = createFrameExtract();

  // Hot-path: zero-copy writers bypass TypeGPU's compiled writer
  const instanceWriter = createInstanceWriter(root.device, instanceBuffer.buffer, cfg.maxInstances);
  const cameraWriter = createCameraWriter(root.device, cameraBuffer.buffer);

  const sceneBindGroup = root.createBindGroup(SceneGroup, {
    camera: cameraBuffer,
    instances: instanceBuffer,
    materials: materialBuffer,
  });

  const pipeline = createStaticMeshPipeline(root);

  // Depth texture (recreated on resize)
  let depthWidth = canvas.width;
  let depthHeight = canvas.height;
  let depthTexture = (root as any)['~unstable']
    .createTexture({ size: [depthWidth, depthHeight], format: 'depth24plus' })
    .$usage('render');

  function ensureDepthTexture() {
    if (canvas.width !== depthWidth || canvas.height !== depthHeight) {
      depthTexture.destroy();
      depthWidth = canvas.width;
      depthHeight = canvas.height;
      depthTexture = (root as any)['~unstable']
        .createTexture({ size: [depthWidth, depthHeight], format: 'depth24plus' })
        .$usage('render');
    }
  }

  function render(world: EngineWorld): void {
    // Extract instances directly into staging buffer (zero object creation)
    extractFrame(world, frame, instanceWriter.f32, instanceWriter.u32);

    if (frame.instanceCount === 0) return;

    ensureDepthTexture();

    // Compute camera from ECS entity
    const cameras = query(
      world as Parameters<typeof query>[0],
      [Camera, WorldTransform],
      asBuffer,
    );

    let eyeX = 0, eyeY = 0, eyeZ = 5;

    if (cameras.length > 0) {
      const camEid = cameras[0]!;
      const base = camEid * 16;
      scratchWorldMat.set(WorldTransform.m.subarray(base, base + 16));
      mat4.inverse(scratchWorldMat, scratchView);

      const aspect = canvas.width / canvas.height;
      mat4.perspective(cfg.fov, aspect, cfg.near, cfg.far, scratchProj);
      mat4.multiply(scratchProj, scratchView, scratchViewProj);

      eyeX = scratchWorldMat[12]!;
      eyeY = scratchWorldMat[13]!;
      eyeZ = scratchWorldMat[14]!;
    } else {
      mat4.identity(scratchView);
      mat4.identity(scratchProj);
      mat4.identity(scratchViewProj);
    }

    // Zero-copy GPU writes — Float32Array directly to queue.writeBuffer
    cameraWriter.write(
      scratchView, scratchProj, scratchViewProj,
      eyeX, eyeY, eyeZ,
      canvas.width, canvas.height,
      world.time.now, world.time.frame,
    );
    instanceWriter.flush(frame.instanceCount);

    // Draw batches
    for (let i = 0; i < frame.batches.length; i++) {
      const batch = frame.batches[i]!;
      const mesh = world.assets.meshes.get(batch.mesh as MeshHandle) as MeshGpu | undefined;
      if (!mesh) continue;

      const isFirst = i === 0;

      // TypeGPU render-pass API type narrowing (not data conversion casts)
      pipeline
        .withColorAttachment({
          view: context as never,
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
        .with(sceneBindGroup)
        .with(MeshVertexLayout, mesh.vertexBuffer as never)
        .withIndexBuffer(mesh.indexBuffer as never)
        .drawIndexed(mesh.indexCount, batch.instanceCount, 0, 0, batch.firstInstance);
    }
  }

  return [
    null,
    {
      renderer: { render, destroy() { depthTexture.destroy(); gpuDestroy(); } },
      gpu: gpu!,
    },
  ];
}
