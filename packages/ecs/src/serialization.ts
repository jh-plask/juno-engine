import {
  createSnapshotDeserializer,
  createSnapshotSerializer,
} from 'bitecs/serialization';
import { addComponent, query, asBuffer } from 'bitecs';
import type { EngineWorld } from '@engine/engine/types.js';
import {
  Bounds,
  LocalTransform,
  MaterialRef,
  MeshRef,
  WorldTransform,
  Parent,
  BodyRef,
  Node,
  Renderable,
  Camera,
  Static,
  DynamicBody,
  KinematicBody,
  NO_PARENT,
} from './components.js';
import { ChildOf } from './relations.js';

const tracked = [
  LocalTransform,
  WorldTransform,
  Bounds,
  MeshRef,
  MaterialRef,
  BodyRef,
  Parent,
  Node,
  Renderable,
  Camera,
  Static,
  DynamicBody,
  KinematicBody,
];

export function createWorldSnapshotIO(world: EngineWorld) {
  return {
    save: createSnapshotSerializer(world as Parameters<typeof createSnapshotSerializer>[0], tracked),
    load: createSnapshotDeserializer(world as Parameters<typeof createSnapshotDeserializer>[0], tracked),
  };
}

export function rebuildHierarchy(world: EngineWorld): void {
  const entities = query(world as Parameters<typeof query>[0], [Parent], asBuffer);
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    const parent = Parent.value[eid]!;
    if (parent !== NO_PARENT) {
      addComponent(world as Parameters<typeof addComponent>[0], eid, ChildOf(parent));
    }
  }
}
