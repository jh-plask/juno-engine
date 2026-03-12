import type { EngineContext, MeshHandle } from '@engine/engine/types.js';
import { createEngine } from '@engine/engine/engine.js';
import { createEngineWorld } from '@engine/ecs/world.js';
import { updateWorldTransforms } from '@engine/ecs/systems/transforms.js';
import { createRenderer } from '@engine/render-typegpu/renderer.js';
import { uploadMesh } from '@engine/render-typegpu/resources/meshGpu.js';
import { createPhysicsServices } from '@engine/physics-rapier/runtime.js';
import {
  syncKinematicsToRapier,
  syncDynamicsFromRapier,
  addDynamicBoxBody,
} from '@engine/physics-rapier/sync.js';
import { spawnStaticMesh, setLocalPosition } from '@engine/ecs/commands.js';
import { populateScene } from './scene.js';
import { CUBE_VERTICES, CUBE_INDICES } from './geometry.js';

const errorDiv = document.getElementById('error')!;

function showError(msg: string) {
  errorDiv.style.display = 'block';
  errorDiv.textContent = msg;
}

async function boot() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) {
    showError('Canvas element not found');
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  if (!navigator.gpu) {
    showError(
      'WebGPU is not supported in this browser.\nTry Chrome 113+ or Edge 113+.',
    );
    return;
  }

  const ctx: EngineContext = {
    time: { now: 0, dt: 0, fixedDt: 1 / 60, frame: 0, accumulator: 0 },
    assets: {
      meshes: new Map(),
      materials: new Map(),
      textures: new Map(),
    },
    gpu: null,
    physics: null,
  };

  const world = createEngineWorld(ctx);

  // Initialize renderer (attempt returns [error, result])
  const [rendererErr, rendererResult] = await createRenderer(canvas);
  if (rendererErr) {
    showError(`Renderer init failed:\n${rendererErr.message}`);
    return;
  }

  const { renderer, gpu } = rendererResult;

  // Initialize physics (attempt returns [error, result])
  const [physicsErr, physics] = await createPhysicsServices();
  if (physicsErr) {
    showError(`Physics init failed:\n${physicsErr.message}`);
    renderer.destroy();
    return;
  }

  world.gpu = gpu;
  world.physics = physics;

  // Upload cube mesh to asset registry
  const cubeMesh = uploadMesh(gpu.root, CUBE_VERTICES, CUBE_INDICES);
  world.assets.meshes.set(0 as MeshHandle, cubeMesh);

  const engine = createEngine({
    world,
    renderer,
    physics,
    updateWorldTransforms,
    syncKinematicsToRapier,
    syncDynamicsFromRapier,
  });

  const { cubes } = populateScene(engine.world);

  // Dynamic body must be a root entity (no parent) per the physics constraint.
  // Create it directly without attaching to the scene hierarchy.
  const dynamicCube = spawnStaticMesh(engine.world, 0, 0);
  setLocalPosition(engine.world, dynamicCube, 0, 5, 0);
  addDynamicBoxBody(engine.world, dynamicCube, 0.5, 0.5, 0.5);

  console.log(
    `[juno] Engine booted. ${cubes.length + 1} entities spawned. Frame loop starting.`,
  );

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    engine.update(dt);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

boot().then(undefined, (err) => {
  console.error('[juno] Boot failed:', err);
  showError(
    `Boot failed:\n${err instanceof Error ? err.message : String(err)}`,
  );
});
