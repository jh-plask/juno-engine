import type { EngineWorld } from '@engine/engine/types.js';
import { createNode, attach, setLocalPosition } from './commands.js';
import { addComponents } from 'bitecs';
import { Camera, Renderable, MeshRef, MaterialRef } from './components.js';

export function spawnCamera(
  world: EngineWorld,
  x: number,
  y: number,
  z: number,
  parent?: number,
): number {
  const eid = createNode(world);
  addComponents(world as Parameters<typeof addComponents>[0], eid, Camera);
  setLocalPosition(world, eid, x, y, z);
  if (parent !== undefined) attach(world, parent, eid);
  return eid;
}

export function spawnMeshNode(
  world: EngineWorld,
  mesh: number,
  material: number,
  x: number,
  y: number,
  z: number,
  parent?: number,
): number {
  const eid = createNode(world);
  addComponents(world as Parameters<typeof addComponents>[0], eid, Renderable, MeshRef, MaterialRef);
  MeshRef.value[eid] = mesh;
  MaterialRef.value[eid] = material;
  setLocalPosition(world, eid, x, y, z);
  if (parent !== undefined) attach(world, parent, eid);
  return eid;
}
