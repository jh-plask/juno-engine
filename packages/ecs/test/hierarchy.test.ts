import { describe, it, expect, beforeEach } from 'vitest';
import '@engine/test-utils/matchers.js';
import { createTestWorld } from '@engine/test-utils/world.js';
import { spawnTestEntity } from '@engine/test-utils/entity.js';
import type { EngineWorld } from '@engine/engine/types.js';
import { updateWorldTransforms } from '../src/systems/transforms.js';
import {
  createNode,
  attach,
  detach,
  setLocalPosition,
  markSubtreeDirty,
} from '../src/commands.js';
import {
  WorldTransform,
  Parent,
  NO_PARENT,
} from '../src/components.js';

/** Read the world-space translation X for an entity from the column-major WorldTransform.m */
function worldX(eid: number): number {
  return WorldTransform.m[eid * 16 + 12]!;
}
function worldY(eid: number): number {
  return WorldTransform.m[eid * 16 + 13]!;
}
function worldZ(eid: number): number {
  return WorldTransform.m[eid * 16 + 14]!;
}

describe('Hierarchy – transform propagation', () => {
  let world: EngineWorld;

  beforeEach(() => {
    world = createTestWorld();
  });

  // ───────────────────────────────────────────────
  // Single-level hierarchy
  // ───────────────────────────────────────────────
  it('propagates parent translation to children (single level)', () => {
    const parent = spawnTestEntity(world, { position: [10, 0, 0] });
    const childA = spawnTestEntity(world, { position: [1, 0, 0], parent });
    const childB = spawnTestEntity(world, { position: [1, 0, 0], parent });
    const childC = spawnTestEntity(world, { position: [1, 0, 0], parent });

    updateWorldTransforms(world);

    // Parent world position = its own local position
    expect(worldX(parent)).toBeCloseTo(10);

    // Each child world X = parent 10 + local 1 = 11
    expect(worldX(childA)).toBeCloseTo(11);
    expect(worldX(childB)).toBeCloseTo(11);
    expect(worldX(childC)).toBeCloseTo(11);

    // Y and Z remain 0
    expect(worldY(childA)).toBeCloseTo(0);
    expect(worldZ(childA)).toBeCloseTo(0);
  });

  // ───────────────────────────────────────────────
  // Deep hierarchy (4 levels)
  // ───────────────────────────────────────────────
  it('propagates through a 4-level deep hierarchy', () => {
    const root = spawnTestEntity(world, { position: [5, 0, 0] });
    const a = spawnTestEntity(world, { position: [3, 0, 0], parent: root });
    const b = spawnTestEntity(world, { position: [2, 0, 0], parent: a });
    const c = spawnTestEntity(world, { position: [1, 0, 0], parent: b });

    updateWorldTransforms(world);

    expect(worldX(root)).toBeCloseTo(5);
    expect(worldX(a)).toBeCloseTo(8);   // 5 + 3
    expect(worldX(b)).toBeCloseTo(10);  // 5 + 3 + 2
    expect(worldX(c)).toBeCloseTo(11);  // 5 + 3 + 2 + 1
  });

  // ───────────────────────────────────────────────
  // Reparenting
  // ───────────────────────────────────────────────
  it('reparents a child from one parent to another', () => {
    const parentA = spawnTestEntity(world, { position: [10, 0, 0] });
    const parentB = spawnTestEntity(world, { position: [20, 0, 0] });
    const child = spawnTestEntity(world, { position: [1, 0, 0], parent: parentA });

    updateWorldTransforms(world);
    expect(worldX(child)).toBeCloseTo(11); // 10 + 1

    // Re-parent child under parentB
    detach(world, child);
    attach(world, parentB, child);
    updateWorldTransforms(world);

    expect(worldX(child)).toBeCloseTo(21); // 20 + 1
  });

  // ───────────────────────────────────────────────
  // Dirty propagation
  // ───────────────────────────────────────────────
  it('clears dirty flags after update, then re-dirties on parent move', () => {
    const parent = spawnTestEntity(world, { position: [5, 0, 0] });
    const child = spawnTestEntity(world, { position: [1, 0, 0], parent });
    const grandchild = spawnTestEntity(world, { position: [1, 0, 0], parent: child });

    updateWorldTransforms(world);

    // All dirty flags should be cleared
    expect(WorldTransform.dirty[parent]).toBe(0);
    expect(WorldTransform.dirty[child]).toBe(0);
    expect(WorldTransform.dirty[grandchild]).toBe(0);

    // Moving the parent should re-dirty the entire subtree
    setLocalPosition(world, parent, 20, 0, 0);

    expect(WorldTransform.dirty[parent]).toBe(1);
    expect(WorldTransform.dirty[child]).toBe(1);
    expect(WorldTransform.dirty[grandchild]).toBe(1);
  });

  // ───────────────────────────────────────────────
  // Detach
  // ───────────────────────────────────────────────
  it('detached entity world matrix equals its local matrix', () => {
    const parent = spawnTestEntity(world, { position: [10, 0, 0] });
    const child = spawnTestEntity(world, { position: [3, 0, 0], parent });

    updateWorldTransforms(world);
    expect(worldX(child)).toBeCloseTo(13); // 10 + 3

    detach(world, child);
    updateWorldTransforms(world);

    // After detach, world position should be just the local position
    expect(worldX(child)).toBeCloseTo(3);
    expect(Parent.value[child]).toBe(NO_PARENT);
  });

  // ───────────────────────────────────────────────
  // Empty world
  // ───────────────────────────────────────────────
  it('updateWorldTransforms on an empty world does not crash', () => {
    expect(() => updateWorldTransforms(world)).not.toThrow();
  });
});
