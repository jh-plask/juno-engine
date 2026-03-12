import type { EngineContext, EngineWorld } from '@engine/engine/types.js';
import { createEngineWorld } from '@engine/ecs/world.js';

export function createTestWorld(): EngineWorld {
  const ctx: EngineContext = {
    time: {
      now: 0,
      dt: 0,
      fixedDt: 1 / 60,
      frame: 0,
      accumulator: 0,
    },
    assets: {
      meshes: new Map(),
      materials: new Map(),
      textures: new Map(),
    },
    gpu: null,
    physics: null,
  };

  return createEngineWorld(ctx);
}
