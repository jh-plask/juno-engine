import { Hierarchy, query, asBuffer } from 'bitecs';
import { mat4 } from 'wgpu-matrix';
import { composeTRS } from '@engine/math/mat4.js';
import type { EngineWorld } from '@engine/engine/types.js';
import {
  LocalTransform,
  NO_PARENT,
  Parent,
  WorldTransform,
} from '../components.js';
import { ChildOf } from '../relations.js';

// Module-scoped scratch matrices to avoid allocation in hot loops
const localM = mat4.create();
const parentM = mat4.create();
const worldM = mat4.create();

function writeMat4(store: Float32Array, eid: number, m: Float32Array): void {
  store.set(m, eid * 16);
}

function readMat4(store: Float32Array, eid: number, out: Float32Array): Float32Array {
  out.set(store.subarray(eid * 16, eid * 16 + 16));
  return out;
}

function composeLocal(eid: number, out: Float32Array): Float32Array {
  return composeTRS(
    out,
    LocalTransform.px[eid]!, LocalTransform.py[eid]!, LocalTransform.pz[eid]!,
    LocalTransform.qx[eid]!, LocalTransform.qy[eid]!, LocalTransform.qz[eid]!, LocalTransform.qw[eid]!,
    LocalTransform.sx[eid]!, LocalTransform.sy[eid]!, LocalTransform.sz[eid]!,
  );
}

export function updateWorldTransforms(world: EngineWorld): void {
  const entities = query(
    world as Parameters<typeof query>[0],
    [LocalTransform, WorldTransform, Hierarchy(ChildOf)],
    asBuffer,
  );

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    if (WorldTransform.dirty[eid] === 0) continue;

    composeLocal(eid, localM);

    const parent = Parent.value[eid]!;
    if (parent === NO_PARENT) {
      writeMat4(WorldTransform.m, eid, localM);
    } else {
      readMat4(WorldTransform.m, parent, parentM);
      mat4.multiply(parentM, localM, worldM);
      writeMat4(WorldTransform.m, eid, worldM);
    }

    WorldTransform.dirty[eid] = 0;
  }
}
