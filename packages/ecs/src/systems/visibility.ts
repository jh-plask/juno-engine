import type { EngineWorld } from '@engine/engine/types.js';

/**
 * Placeholder for frustum culling system.
 * Will query entities with Bounds + WorldTransform and test against camera frustum planes.
 */
export function updateVisibility(_world: EngineWorld): void {
  // TODO: Implement frustum culling
  // 1. Extract frustum planes from camera viewProj
  // 2. Query [Bounds, WorldTransform] entities
  // 3. Test bounding sphere against frustum planes
  // 4. Set visibility flag
}
