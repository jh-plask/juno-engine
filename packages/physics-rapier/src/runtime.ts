import { attempt } from '@engine/engine/attempt.js';
import { EngineError } from '@engine/engine/errors.js';
import type { AttemptResultAsync } from '@engine/engine/attempt.js';

type RapierModule = typeof import('@dimforge/rapier3d-simd');

/**
 * Creates Rapier physics services via async WASM initialization.
 * Uses @dimforge/rapier3d-simd for SIMD-accelerated physics.
 */
export async function createPhysicsServices(): AttemptResultAsync<
  EngineError,
  PhysicsServices
> {
  const [importErr, RAPIER] = await attempt<Error, RapierModule>(
    import('@dimforge/rapier3d-simd'),
  );

  if (importErr) {
    return [
      new EngineError('PHYSICS_WASM_FAILED', 'Failed to load Rapier WASM module', {
        cause: importErr,
      }),
      null,
    ];
  }

  const [worldErr, world] = attempt<Error, InstanceType<RapierModule['World']>>(
    () => new RAPIER.World({ x: 0, y: -9.81, z: 0 }),
  );

  if (worldErr) {
    return [
      new EngineError('PHYSICS_WORLD_FAILED', 'Failed to create physics world', {
        cause: worldErr,
      }),
      null,
    ];
  }

  return [
    null,
    {
      RAPIER,
      world,
      bodyStore: [],
      step() {
        world.step();
      },
      destroy() {
        world.free();
      },
    },
  ];
}

export interface PhysicsServices {
  RAPIER: RapierModule;
  world: InstanceType<RapierModule['World']>;
  bodyStore: unknown[];
  step(): void;
  destroy(): void;
}
