import type { EngineContext, MeshHandle } from '@engine/engine/types.js';
import { createEngine } from '@engine/engine/engine.js';
import { createEngineWorld } from '@engine/ecs/world.js';
import { updateWorldTransforms } from '@engine/ecs/systems/transforms.js';
import { setLocalPosition } from '@engine/ecs/commands.js';
import { Light } from '@engine/ecs/components.js';
import { createRenderer } from '@engine/render-typegpu/renderer.js';
import { uploadMesh } from '@engine/render-typegpu/resources/meshGpu.js';
import { createPhysicsServices } from '@engine/physics-rapier/runtime.js';
import {
  syncKinematicsToRapier,
  syncDynamicsFromRapier,
  addDynamicBoxBody,
  addStaticBoxBody,
  resetDynamicBody,
} from '@engine/physics-rapier/sync.js';
import { populateScene, type SceneResult } from './scene.js';
import {
  CUBE_VERTICES,
  CUBE_INDICES,
  generateSphere,
  generateCylinder,
  generateTorus,
  generatePlane,
  generateCone,
} from './geometry.js';

const errorDiv = document.getElementById('error')!;

function showError(msg: string) {
  errorDiv.style.display = 'block';
  errorDiv.textContent = msg;
}

async function boot() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) { showError('Canvas element not found'); return; }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  if (!navigator.gpu) {
    showError('WebGPU is not supported in this browser.\nTry Chrome 113+ or Edge 113+.');
    return;
  }

  const ctx: EngineContext = {
    time: { now: 0, dt: 0, fixedDt: 1 / 60, frame: 0, accumulator: 0 },
    assets: { meshes: new Map(), materials: new Map(), textures: new Map() },
    gpu: null,
    physics: null,
  };

  const world = createEngineWorld(ctx);

  const [rendererErr, rendererResult] = await createRenderer(canvas);
  if (rendererErr) { showError(`Renderer init failed:\n${rendererErr.message}`); return; }
  const { renderer, gpu } = rendererResult;

  const [physicsErr, physics] = await createPhysicsServices();
  if (physicsErr) { showError(`Physics init failed:\n${physicsErr.message}`); renderer.destroy(); return; }

  world.gpu = gpu;
  world.physics = physics;

  // ── Upload meshes (handle order matches scene.ts constants) ────────────

  const sphere = generateSphere(0.5, 32, 20);
  const cylinder = generateCylinder(0.5, 0.5, 1, 24);
  const torus = generateTorus(0.4, 0.15, 32, 16);
  const plane = generatePlane(40, 40, 4, 4);
  const cone = generateCone(0.5, 1, 24);

  world.assets.meshes.set(0 as MeshHandle, uploadMesh(gpu.root, CUBE_VERTICES, CUBE_INDICES));
  world.assets.meshes.set(1 as MeshHandle, uploadMesh(gpu.root, sphere.vertices, sphere.indices));
  world.assets.meshes.set(2 as MeshHandle, uploadMesh(gpu.root, cylinder.vertices, cylinder.indices));
  world.assets.meshes.set(3 as MeshHandle, uploadMesh(gpu.root, torus.vertices, torus.indices));
  world.assets.meshes.set(4 as MeshHandle, uploadMesh(gpu.root, plane.vertices, plane.indices));
  world.assets.meshes.set(5 as MeshHandle, uploadMesh(gpu.root, cone.vertices, cone.indices));

  const engine = createEngine({
    world,
    renderer,
    physics,
    updateWorldTransforms,
    syncKinematicsToRapier,
    syncDynamicsFromRapier,
  });

  // ── Populate scene ─────────────────────────────────────────────────────

  const { entities, dynamicBodies, orbitingLights, bobbingMeshes, spotLights, sun } = populateScene(engine.world);

  // Static ground collider (large invisible box at y=-1)
  addStaticBoxBody(engine.world, 20, 0.5, 20, 0, -1, 0);

  // Dynamic physics bodies with mild bounce
  for (const { eid, halfW, halfH, halfD } of dynamicBodies) {
    addDynamicBoxBody(engine.world, eid, halfW, halfH, halfD, 0.4);
  }

  // Expose engine for runtime diagnostics
  (globalThis as any).__engine = engine;

  console.log(
    `[juno] Engine booted. ${entities.length} entities, 6 meshes, 10 materials, ` +
    `14 lights, ${dynamicBodies.length} dynamic bodies. Frame loop starting.`,
  );

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  // ── Hacky per-frame animation (will be replaced by proper animation system)
  // Store initial positions for bobbing meshes
  const { LocalTransform } = await import('@engine/ecs/components.js');
  const bobBaseY = bobbingMeshes.map(eid => LocalTransform.py[eid]!);

  let elapsed = 0;
  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    elapsed += dt;

    const w = engine.world;

    // Orbiting point lights — circle around the scene
    for (let i = 0; i < orbitingLights.length; i++) {
      const eid = orbitingLights[i]!;
      const phase = (i / orbitingLights.length) * Math.PI * 2;
      const angle = elapsed * 0.5 + phase;
      const r = 6;
      setLocalPosition(w, eid,
        Math.cos(angle) * r,
        2.5 + Math.sin(elapsed * 1.2 + phase) * 1.0,
        Math.sin(angle) * r,
      );
    }

    // Bobbing meshes — gentle up-down from initial Y
    for (let i = 0; i < bobbingMeshes.length; i++) {
      const eid = bobbingMeshes[i]!;
      const phase = (i / bobbingMeshes.length) * Math.PI * 2;
      const bob = Math.sin(elapsed * 1.5 + phase) * 0.3;
      setLocalPosition(w, eid,
        LocalTransform.px[eid]!,
        bobBaseY[i]! + bob,
        LocalTransform.pz[eid]!,
      );
    }

    // Sun — slowly rotate direction so ALL shadows sweep across the scene
    const sunAngle = elapsed * 0.15;
    Light.dirX[sun] = Math.sin(sunAngle) * 0.5;
    Light.dirY[sun] = -0.8;
    Light.dirZ[sun] = Math.cos(sunAngle) * 0.5 - 0.3;

    // Spot lights — orbit position + sweep direction
    for (let i = 0; i < spotLights.length; i++) {
      const eid = spotLights[i]!;
      const phase = (i / spotLights.length) * Math.PI * 2;
      const angle = elapsed * 0.4 + phase;

      const orbR = 6;
      const posX = Math.cos(angle) * orbR;
      const posZ = Math.sin(angle) * orbR;
      setLocalPosition(w, eid, posX, 10, posZ);

      const dx = -posX * 0.3;
      const dz = -posZ * 0.3;
      Light.dirX[eid] = dx;
      Light.dirY[eid] = -0.95;
      Light.dirZ[eid] = dz;
    }

    // Respawn physics cubes that fell off edges — reset velocity to prevent flying
    for (const { eid } of dynamicBodies) {
      const py = LocalTransform.py[eid]!;
      const px = LocalTransform.px[eid]!;
      const pz = LocalTransform.pz[eid]!;
      if (py < -3 || Math.abs(px) > 15 || Math.abs(pz) > 15) {
        resetDynamicBody(w, eid,
          (Math.random() - 0.5) * 8,
          6 + Math.random() * 3,
          (Math.random() - 0.5) * 6,
        );
      }
    }

    engine.update(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot().then(undefined, (err) => {
  console.error('[juno] Boot failed:', err);
  showError(`Boot failed:\n${err instanceof Error ? err.message : String(err)}`);
});
