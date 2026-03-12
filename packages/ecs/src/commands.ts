import {
  addComponent,
  addComponents,
  addEntity,
  query,
  removeComponent,
} from 'bitecs';
import type { EngineWorld } from '@engine/engine/types.js';
import {
  Bounds,
  LocalTransform,
  MaterialRef,
  MeshRef,
  Node,
  NO_PARENT,
  Parent,
  Renderable,
  WorldTransform,
} from './components.js';
import { ChildOf } from './relations.js';

export function createNode(world: EngineWorld): number {
  const eid = addEntity(world as Parameters<typeof addEntity>[0]);

  addComponents(
    world as Parameters<typeof addComponents>[0],
    eid,
    Node,
    LocalTransform,
    WorldTransform,
    Bounds,
  );

  Parent.value[eid] = NO_PARENT;
  WorldTransform.dirty[eid] = 1;

  // Identity rotation / unit scale
  LocalTransform.qw[eid] = 1;
  LocalTransform.sx[eid] = 1;
  LocalTransform.sy[eid] = 1;
  LocalTransform.sz[eid] = 1;

  return eid;
}

export function attach(world: EngineWorld, parent: number, child: number): void {
  Parent.value[child] = parent;
  addComponent(world as Parameters<typeof addComponent>[0], child, ChildOf(parent));
  markSubtreeDirty(world, child);
}

export function detach(world: EngineWorld, child: number): void {
  const parent = Parent.value[child]!;
  if (parent !== NO_PARENT) {
    removeComponent(world as Parameters<typeof removeComponent>[0], child, ChildOf(parent));
  }
  Parent.value[child] = NO_PARENT;
  markSubtreeDirty(world, child);
}

export function setLocalPosition(world: EngineWorld, eid: number, x: number, y: number, z: number): void {
  LocalTransform.px[eid] = x;
  LocalTransform.py[eid] = y;
  LocalTransform.pz[eid] = z;
  markSubtreeDirty(world, eid);
}

export function setLocalRotation(world: EngineWorld, eid: number, x: number, y: number, z: number, w: number): void {
  LocalTransform.qx[eid] = x;
  LocalTransform.qy[eid] = y;
  LocalTransform.qz[eid] = z;
  LocalTransform.qw[eid] = w;
  markSubtreeDirty(world, eid);
}

export function setLocalScale(world: EngineWorld, eid: number, x: number, y: number, z: number): void {
  LocalTransform.sx[eid] = x;
  LocalTransform.sy[eid] = y;
  LocalTransform.sz[eid] = z;
  markSubtreeDirty(world, eid);
}

export function spawnStaticMesh(
  world: EngineWorld,
  mesh: number,
  material: number,
  parent?: number,
): number {
  const eid = createNode(world);

  addComponents(world as Parameters<typeof addComponents>[0], eid, Renderable, MeshRef, MaterialRef);
  MeshRef.value[eid] = mesh;
  MaterialRef.value[eid] = material;

  if (parent !== undefined) attach(world, parent, eid);
  return eid;
}

export function markSubtreeDirty(world: EngineWorld, rootEid: number): void {
  WorldTransform.dirty[rootEid] = 1;

  const children = query(world as Parameters<typeof query>[0], [ChildOf(rootEid)]);
  for (let i = 0; i < children.length; i++) {
    markSubtreeDirty(world, children[i]!);
  }
}
