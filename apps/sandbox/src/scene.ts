import type { EngineWorld } from '@engine/engine/types.js';
import {
  createNode,
  attach,
  setLocalPosition,
  spawnStaticMesh,
} from '@engine/ecs/commands.js';
import { spawnCamera } from '@engine/ecs/prefabs.js';

/**
 * Populate the world with test entities for the sandbox.
 */
export function populateScene(world: EngineWorld): { root: number; cubes: number[] } {
  // Scene root node
  const root = createNode(world);

  // Spawn camera looking at the scene
  spawnCamera(world, 0, 3, 10);

  // Spawn a grid of cubes using mesh handle 0 and material handle 0
  const cubes: number[] = [];
  const gridSize = 3;
  const spacing = 2.5;
  const offset = ((gridSize - 1) * spacing) / 2;

  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      const eid = spawnStaticMesh(world, 0, 0, root);
      setLocalPosition(
        world,
        eid,
        x * spacing - offset,
        0,
        z * spacing - offset,
      );
      cubes.push(eid);
    }
  }

  // Elevate one cube to test hierarchy
  const elevated = spawnStaticMesh(world, 0, 0, root);
  setLocalPosition(world, elevated, 0, 3, 0);
  cubes.push(elevated);

  return { root, cubes };
}
