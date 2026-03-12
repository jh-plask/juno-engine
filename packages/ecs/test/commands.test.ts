import { describe, it, expect, beforeEach } from 'vitest';
import '@engine/test-utils/matchers.js';
import { createTestWorld } from '@engine/test-utils/world.js';
import { spawnTestEntity } from '@engine/test-utils/entity.js';
import type { EngineWorld } from '@engine/engine/types.js';
import {
  createNode,
  attach,
  setLocalPosition,
  spawnStaticMesh,
} from '../src/commands.js';
import { hasComponent, query } from 'bitecs';
import {
  LocalTransform,
  WorldTransform,
  Renderable,
  MeshRef,
  MaterialRef,
  Parent,
  NO_PARENT,
} from '../src/components.js';

describe('Commands', () => {
  let world: EngineWorld;

  beforeEach(() => {
    world = createTestWorld();
  });

  // ───────────────────────────────────────────────
  // createNode defaults
  // ───────────────────────────────────────────────
  describe('createNode', () => {
    it('initialises with identity rotation, unit scale, and dirty flag', () => {
      const eid = createNode(world);

      // Identity quaternion: (0, 0, 0, 1)
      expect(LocalTransform.qx[eid]).toBe(0);
      expect(LocalTransform.qy[eid]).toBe(0);
      expect(LocalTransform.qz[eid]).toBe(0);
      expect(LocalTransform.qw[eid]).toBe(1);

      // Unit scale
      expect(LocalTransform.sx[eid]).toBe(1);
      expect(LocalTransform.sy[eid]).toBe(1);
      expect(LocalTransform.sz[eid]).toBe(1);

      // Dirty flag set
      expect(WorldTransform.dirty[eid]).toBe(1);

      // No parent
      expect(Parent.value[eid]).toBe(NO_PARENT);
    });
  });

  // ───────────────────────────────────────────────
  // spawnStaticMesh
  // ───────────────────────────────────────────────
  describe('spawnStaticMesh', () => {
    it('creates a renderable entity with mesh and material refs', () => {
      const eid = spawnStaticMesh(world, 42, 7);

      expect(
        hasComponent(world as Parameters<typeof hasComponent>[0], eid, Renderable),
      ).toBe(true);
      expect(MeshRef.value[eid]).toBe(42);
      expect(MaterialRef.value[eid]).toBe(7);
    });

    it('attaches to parent when parent is provided', () => {
      const parent = createNode(world);
      const eid = spawnStaticMesh(world, 1, 2, parent);

      expect(Parent.value[eid]).toBe(parent);
    });

    it('has no parent when parent is not provided', () => {
      const eid = spawnStaticMesh(world, 1, 2);

      expect(Parent.value[eid]).toBe(NO_PARENT);
    });
  });

  // ───────────────────────────────────────────────
  // Subtree dirty marking
  // ───────────────────────────────────────────────
  describe('markSubtreeDirty via setLocalPosition', () => {
    it('dirties all descendants when root position changes', () => {
      const root = createNode(world);
      const mid = createNode(world);
      const leaf = createNode(world);

      attach(world, root, mid);
      attach(world, mid, leaf);

      // Manually clear dirty flags to simulate a post-update state
      WorldTransform.dirty[root] = 0;
      WorldTransform.dirty[mid] = 0;
      WorldTransform.dirty[leaf] = 0;

      // Moving root should dirty root + mid + leaf
      setLocalPosition(world, root, 5, 0, 0);

      expect(WorldTransform.dirty[root]).toBe(1);
      expect(WorldTransform.dirty[mid]).toBe(1);
      expect(WorldTransform.dirty[leaf]).toBe(1);
    });
  });
});
