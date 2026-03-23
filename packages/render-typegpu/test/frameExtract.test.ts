import { describe, it, expect, beforeEach } from 'vitest';
import { createTestWorld } from '@engine/test-utils/world.js';
import { spawnTestEntity } from '@engine/test-utils/entity.js';
import type { EngineWorld } from '@engine/engine/types.js';
import { WorldTransform } from '@engine/ecs/components.js';
import {
  extractFrame,
  createFrameExtract,
  type FrameExtract,
} from '../src/extract/frameExtract.js';
import { INSTANCE_FLOATS } from '../src/schemas.js';

let world: EngineWorld;
let frame: FrameExtract;

// Staging buffers (shared ArrayBuffer like the real renderer)
const MAX_TEST = 100;
const stagingBuf = new ArrayBuffer(MAX_TEST * 80);
const f32 = new Float32Array(stagingBuf);
const u32 = new Uint32Array(stagingBuf);

beforeEach(() => {
  world = createTestWorld();
  frame = createFrameExtract();
  f32.fill(0);
});

describe('extractFrame', () => {
  describe('empty world', () => {
    it('returns empty candidates, zero instances, and empty batches', () => {
      extractFrame(world, frame, f32, u32);

      expect(frame.candidates).toHaveLength(0);
      expect(frame.instanceCount).toBe(0);
      expect(frame.batches).toHaveLength(0);
    });
  });

  describe('single renderable', () => {
    it('extracts 1 candidate, 1 instance in staging, and 1 batch', () => {
      const eid = spawnTestEntity(world, { mesh: 0, material: 0 });

      // Write a known identity+translation matrix (column-major)
      const base = eid * 16;
      WorldTransform.m[base + 0] = 1;  WorldTransform.m[base + 1] = 0;
      WorldTransform.m[base + 2] = 0;  WorldTransform.m[base + 3] = 0;
      WorldTransform.m[base + 4] = 0;  WorldTransform.m[base + 5] = 1;
      WorldTransform.m[base + 6] = 0;  WorldTransform.m[base + 7] = 0;
      WorldTransform.m[base + 8] = 0;  WorldTransform.m[base + 9] = 0;
      WorldTransform.m[base + 10] = 1; WorldTransform.m[base + 11] = 0;
      WorldTransform.m[base + 12] = 5; WorldTransform.m[base + 13] = 3;
      WorldTransform.m[base + 14] = 1; WorldTransform.m[base + 15] = 1;

      WorldTransform.dirty[eid] = 0;

      extractFrame(world, frame, f32, u32);

      expect(frame.candidates).toHaveLength(1);
      expect(frame.instanceCount).toBe(1);
      expect(frame.batches).toHaveLength(1);

      // Verify model matrix was memcpied directly into staging (16 floats at offset 0)
      expect(f32[0]).toBe(1);  // col0.x
      expect(f32[1]).toBe(0);  // col0.y
      expect(f32[12]).toBe(5); // col3.x (translation x)
      expect(f32[13]).toBe(3); // col3.y (translation y)
      expect(f32[14]).toBe(1); // col3.z (translation z)
      expect(f32[15]).toBe(1); // col3.w

      // Verify metadata packed in u32 view
      expect(u32[16]).toBe(0); // material
      expect(u32[17]).toBe(eid); // entity

      // Batch
      const batch = frame.batches[0]!;
      expect(batch.mesh).toBe(0);
      expect(batch.firstInstance).toBe(0);
      expect(batch.instanceCount).toBe(1);
    });
  });

  describe('batching by mesh', () => {
    it('produces 2 batches sorted by mesh index', () => {
      spawnTestEntity(world, { mesh: 0, material: 0 });
      spawnTestEntity(world, { mesh: 0, material: 0 });
      spawnTestEntity(world, { mesh: 0, material: 0 });
      spawnTestEntity(world, { mesh: 1, material: 0 });
      spawnTestEntity(world, { mesh: 1, material: 0 });

      extractFrame(world, frame, f32, u32);

      expect(frame.candidates).toHaveLength(5);
      expect(frame.instanceCount).toBe(5);
      expect(frame.batches).toHaveLength(2);

      expect(frame.batches[0]!.mesh).toBe(0);
      expect(frame.batches[0]!.instanceCount).toBe(3);
      expect(frame.batches[1]!.mesh).toBe(1);
      expect(frame.batches[1]!.instanceCount).toBe(2);
    });
  });

  describe('sort by mesh then material', () => {
    it('sorts candidates by mesh first, then material', () => {
      spawnTestEntity(world, { mesh: 1, material: 0 });
      spawnTestEntity(world, { mesh: 0, material: 1 });
      spawnTestEntity(world, { mesh: 0, material: 0 });
      spawnTestEntity(world, { mesh: 1, material: 1 });

      extractFrame(world, frame, f32, u32);

      expect(frame.candidates).toHaveLength(4);

      expect(frame.candidates[0]!.mesh).toBe(0);
      expect(frame.candidates[0]!.material).toBe(0);
      expect(frame.candidates[1]!.mesh).toBe(0);
      expect(frame.candidates[1]!.material).toBe(1);
      expect(frame.candidates[2]!.mesh).toBe(1);
      expect(frame.candidates[2]!.material).toBe(0);
      expect(frame.candidates[3]!.mesh).toBe(1);
      expect(frame.candidates[3]!.material).toBe(1);
    });
  });

  describe('instance data correctness', () => {
    it('preserves materialRef in staging metadata', () => {
      spawnTestEntity(world, { mesh: 0, material: 7 });

      extractFrame(world, frame, f32, u32);

      expect(frame.instanceCount).toBe(1);
      expect(u32[16]).toBe(7); // material at u32 offset 16
    });

    it('preserves entity id in staging metadata', () => {
      const eid = spawnTestEntity(world, { mesh: 0, material: 0 });

      extractFrame(world, frame, f32, u32);

      expect(frame.instanceCount).toBe(1);
      expect(u32[17]).toBe(eid); // entity at u32 offset 17
    });
  });
});
