import { describe, it, expect, beforeEach } from 'vitest';
import '@engine/test-utils/matchers.js';
import { createTestWorld } from '@engine/test-utils/world.js';
import { spawnTestEntity } from '@engine/test-utils/entity.js';
import type { EngineWorld } from '@engine/engine/types.js';
import { updateWorldTransforms } from '../src/systems/transforms.js';
import { setLocalPosition } from '../src/commands.js';
import { WorldTransform } from '../src/components.js';
import {
  createFrameExtract,
  extractFrame,
} from '@engine/render-typegpu/extract/frameExtract.js';
import { INSTANCE_FLOATS } from '@engine/render-typegpu/gpuWrite.js';

// Staging buffers for extractFrame
const MAX_TEST = 100;
const _stagingBuf = new ArrayBuffer(MAX_TEST * 80);
const _f32 = new Float32Array(_stagingBuf);
const _u32 = new Uint32Array(_stagingBuf);

/** Read world-space translation X from column-major WorldTransform.m */
function worldX(eid: number): number {
  return WorldTransform.m[eid * 16 + 12]!;
}

describe('Pipeline – integration', () => {
  let world: EngineWorld;

  beforeEach(() => {
    world = createTestWorld();
  });

  // ───────────────────────────────────────────────
  // Hierarchical movement
  // ───────────────────────────────────────────────
  describe('hierarchical movement', () => {
    it('computes correct world positions after initial propagation', () => {
      const root = spawnTestEntity(world, { position: [10, 0, 0] });
      const child = spawnTestEntity(world, { position: [5, 0, 0], parent: root });
      const grandchild = spawnTestEntity(world, {
        position: [1, 0, 0],
        parent: child,
      });

      updateWorldTransforms(world);

      expect(worldX(root)).toBeCloseTo(10);
      expect(worldX(child)).toBeCloseTo(15);       // 10 + 5
      expect(worldX(grandchild)).toBeCloseTo(16);   // 10 + 5 + 1
    });

    it('updates world positions after moving root', () => {
      const root = spawnTestEntity(world, { position: [10, 0, 0] });
      const child = spawnTestEntity(world, { position: [5, 0, 0], parent: root });
      const grandchild = spawnTestEntity(world, {
        position: [1, 0, 0],
        parent: child,
      });

      updateWorldTransforms(world);
      expect(worldX(grandchild)).toBeCloseTo(16);

      // Move root from 10 to 20
      setLocalPosition(world, root, 20, 0, 0);
      updateWorldTransforms(world);

      expect(worldX(root)).toBeCloseTo(20);
      expect(worldX(child)).toBeCloseTo(25);        // 20 + 5
      expect(worldX(grandchild)).toBeCloseTo(26);   // 20 + 5 + 1
    });
  });

  // ───────────────────────────────────────────────
  // Scene population matches frame extraction
  // ───────────────────────────────────────────────
  describe('frame extraction', () => {
    it('extracts the correct number of instances from renderable entities', () => {
      // Spawn 5 renderable entities (each with mesh + material)
      for (let i = 0; i < 5; i++) {
        spawnTestEntity(world, {
          position: [i * 2, 0, 0],
          mesh: i + 1,
          material: i + 1,
        });
      }

      updateWorldTransforms(world);

      const frame = createFrameExtract();
      _f32.fill(0);
      extractFrame(world, frame, _f32, _u32);

      // Total instances should be 5
      expect(frame.instanceCount).toBe(5);

      // Sum of batch instanceCounts should equal 5
      const totalBatchInstances = frame.batches.reduce(
        (sum, batch) => sum + batch.instanceCount,
        0,
      );
      expect(totalBatchInstances).toBe(5);
    });
  });
});
