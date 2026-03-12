import type { Engine, EngineWorld, PhysicsServices, Renderer } from './types.js';

export interface CreateEngineOptions {
  world: EngineWorld;
  renderer: Renderer;
  physics: PhysicsServices | null;
  updateWorldTransforms: (world: EngineWorld) => void;
  syncKinematicsToRapier?: (world: EngineWorld) => void;
  syncDynamicsFromRapier?: (world: EngineWorld) => void;
}

export function createEngine(options: CreateEngineOptions): Engine {
  const { world, renderer, physics, updateWorldTransforms, syncKinematicsToRapier, syncDynamicsFromRapier } = options;

  world.physics = physics;

  return {
    world,

    update(dt: number) {
      world.time.dt = dt;
      world.time.now += dt;
      world.time.frame += 1;
      world.time.accumulator += dt;

      // Fixed timestep accumulator loop
      while (world.time.accumulator >= world.time.fixedDt) {
        if (physics) {
          syncKinematicsToRapier?.(world);
          physics.step();
          syncDynamicsFromRapier?.(world);
        }
        world.time.accumulator -= world.time.fixedDt;
      }

      // Variable-rate updates
      updateWorldTransforms(world);
      renderer.render(world);
    },

    destroy() {
      physics?.destroy();
      renderer.destroy();
    },
  };
}
