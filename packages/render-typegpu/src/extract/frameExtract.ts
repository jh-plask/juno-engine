import { query, asBuffer } from 'bitecs';
import type { EngineWorld } from '@engine/engine/types.js';
import {
  Bounds,
  MaterialRef,
  MeshRef,
  Renderable,
  WorldTransform,
} from '@engine/ecs/components.js';
import { INSTANCE_FLOATS } from '../gpuWrite.js';

export interface CandidateValue {
  entity: number;
  mesh: number;
  material: number;
}

export interface DrawBatch {
  mesh: number;
  firstInstance: number;
  instanceCount: number;
}

export interface FrameExtract {
  candidates: CandidateValue[];
  instanceCount: number;
  batches: DrawBatch[];
}

export function createFrameExtract(): FrameExtract {
  return {
    candidates: [],
    instanceCount: 0,
    batches: [],
  };
}

/**
 * Extract renderable entities into GPU-ready instance data.
 *
 * Instance data is written directly into the provided staging buffers
 * (matching InstanceGpu's 80-byte layout) to avoid intermediate object creation.
 * The staging Float32Array and Uint32Array must share the same underlying ArrayBuffer.
 */
export function extractFrame(
  world: EngineWorld,
  out: FrameExtract,
  staging: Float32Array,
  u32staging: Uint32Array,
): void {
  out.candidates.length = 0;
  out.batches.length = 0;

  const entities = query(
    world as Parameters<typeof query>[0],
    [Renderable, MeshRef, MaterialRef, Bounds, WorldTransform],
    asBuffer,
  );

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;

    out.candidates.push({
      entity: eid,
      mesh: MeshRef.value[eid]!,
      material: MaterialRef.value[eid]!,
    });
  }

  // Sort by mesh+material for batching
  out.candidates.sort((a, b) => a.mesh - b.mesh || a.material - b.material);

  let batchStart = 0;
  let currentMesh = -1;

  for (let i = 0; i < out.candidates.length; i++) {
    const c = out.candidates[i]!;
    const eid = c.entity;
    const base = i * INSTANCE_FLOATS;

    // Direct memcpy: WorldTransform.m (column-major Float32Array) → staging
    // InstanceGpu layout: model0-model3 = 4×vec4f = 16 contiguous floats
    const srcOffset = eid * 16;
    staging.set(WorldTransform.m.subarray(srcOffset, srcOffset + 16), base);

    // Pack metadata into u32 view (bytes 64-79 of each instance)
    u32staging[base + 16] = c.material;
    u32staging[base + 17] = eid;
    u32staging[base + 18] = 0; // flags
    u32staging[base + 19] = 0; // _pad

    if (c.mesh !== currentMesh) {
      if (i > batchStart) {
        out.batches.push({
          mesh: currentMesh,
          firstInstance: batchStart,
          instanceCount: i - batchStart,
        });
      }
      currentMesh = c.mesh;
      batchStart = i;
    }
  }

  if (out.candidates.length > batchStart) {
    out.batches.push({
      mesh: currentMesh,
      firstInstance: batchStart,
      instanceCount: out.candidates.length - batchStart,
    });
  }

  out.instanceCount = out.candidates.length;
}
