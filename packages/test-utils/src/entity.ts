import type { EngineWorld } from '@engine/engine/types.js';
import { createNode, setLocalPosition, setLocalRotation, setLocalScale, attach } from '@engine/ecs/commands.js';
import { addComponents } from 'bitecs';
import { Renderable, MeshRef, MaterialRef } from '@engine/ecs/components.js';

export interface TestEntityOpts {
  position?: [number, number, number];
  rotation?: [number, number, number, number];
  scale?: [number, number, number];
  mesh?: number;
  material?: number;
  parent?: number;
}

export function spawnTestEntity(world: EngineWorld, opts: TestEntityOpts = {}): number {
  const eid = createNode(world);

  if (opts.position) {
    setLocalPosition(world, eid, opts.position[0], opts.position[1], opts.position[2]);
  }

  if (opts.rotation) {
    setLocalRotation(world, eid, opts.rotation[0], opts.rotation[1], opts.rotation[2], opts.rotation[3]);
  }

  if (opts.scale) {
    setLocalScale(world, eid, opts.scale[0], opts.scale[1], opts.scale[2]);
  }

  if (opts.mesh !== undefined || opts.material !== undefined) {
    addComponents(world as Parameters<typeof addComponents>[0], eid, Renderable, MeshRef, MaterialRef);
    if (opts.mesh !== undefined) MeshRef.value[eid] = opts.mesh;
    if (opts.material !== undefined) MaterialRef.value[eid] = opts.material;
  }

  if (opts.parent !== undefined) {
    attach(world, opts.parent, eid);
  }

  return eid;
}
