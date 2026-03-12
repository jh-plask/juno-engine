import { createEntityIndex, createWorld } from 'bitecs';
import type { EngineContext, EngineWorld } from '@engine/engine/types.js';

export function createEngineWorld(ctx: EngineContext): EngineWorld {
  const sharedIndex = createEntityIndex();
  return createWorld<EngineContext>(ctx, sharedIndex) as unknown as EngineWorld;
}
