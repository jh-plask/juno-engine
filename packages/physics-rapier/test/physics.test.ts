import { describe, it, expect, beforeEach } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { createTestWorld } from '@engine/test-utils/world.js';
import { spawnTestEntity } from '@engine/test-utils/entity.js';
import type { EngineWorld } from '@engine/engine/types.js';
import { LocalTransform, WorldTransform } from '@engine/ecs/components.js';
import { attach } from '@engine/ecs/commands.js';
import {
  addDynamicBoxBody,
  addKinematicBoxBody,
  syncDynamicsFromRapier,
  syncKinematicsToRapier,
} from '../src/sync.js';

function createTestPhysics() {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  return {
    RAPIER,
    world,
    bodyStore: [],
    step() {
      world.step();
    },
    destroy() {
      world.free();
    },
  };
}

let world: EngineWorld;

beforeEach(() => {
  world = createTestWorld();
  world.physics = createTestPhysics() as any;
});

describe('physics', () => {
  describe('gravity causes falling', () => {
    it('entity at y=10 falls below initial position after stepping', () => {
      const eid = spawnTestEntity(world, { position: [0, 10, 0] });

      addDynamicBoxBody(world, eid, 0.5, 0.5, 0.5);

      // Step physics 60 times (~1 second at 60Hz)
      const physics = world.physics!;
      for (let i = 0; i < 60; i++) {
        physics.step();
      }

      syncDynamicsFromRapier(world);

      expect(LocalTransform.py[eid]).toBeLessThan(10);
    });
  });

  describe('dynamic body sync marks dirty', () => {
    it('sets WorldTransform.dirty after syncing dynamics', () => {
      const eid = spawnTestEntity(world, { position: [0, 5, 0] });

      addDynamicBoxBody(world, eid, 0.5, 0.5, 0.5);

      // Clear dirty before stepping
      WorldTransform.dirty[eid] = 0;

      // Step physics once
      world.physics!.step();
      syncDynamicsFromRapier(world);

      expect(WorldTransform.dirty[eid]).toBe(1);
    });
  });

  describe('kinematic body sync pushes position to Rapier', () => {
    it('Rapier body reflects ECS kinematic position after sync', () => {
      const eid = spawnTestEntity(world, { position: [0, 0, 0] });

      addKinematicBoxBody(world, eid, 0.5, 0.5, 0.5);

      // Move the entity in ECS
      LocalTransform.px[eid] = 5;
      LocalTransform.py[eid] = 0;
      LocalTransform.pz[eid] = 0;

      // Sync kinematic positions into Rapier and step
      syncKinematicsToRapier(world);
      world.physics!.step();

      // Access the Rapier body to verify its translation
      const physics = world.physics as ReturnType<typeof createTestPhysics>;
      // The rapier world should have a body at approximately x=5
      let foundBody = false;
      physics.world.bodies.forEach((body) => {
        if (body.isKinematic()) {
          const t = body.translation();
          expect(t.x).toBeCloseTo(5, 1);
          foundBody = true;
        }
      });
      expect(foundBody).toBe(true);
    });
  });

  describe('multiple bodies fall independently', () => {
    it('three entities at different heights all fall, maintaining relative order', () => {
      const eidA = spawnTestEntity(world, { position: [0, 10, 0] });
      const eidB = spawnTestEntity(world, { position: [0, 20, 0] });
      const eidC = spawnTestEntity(world, { position: [0, 30, 0] });

      addDynamicBoxBody(world, eidA, 0.5, 0.5, 0.5);
      addDynamicBoxBody(world, eidB, 0.5, 0.5, 0.5);
      addDynamicBoxBody(world, eidC, 0.5, 0.5, 0.5);

      // Step physics 60 times
      const physics = world.physics!;
      for (let i = 0; i < 60; i++) {
        physics.step();
      }

      syncDynamicsFromRapier(world);

      // All entities should have fallen below their initial y position
      expect(LocalTransform.py[eidA]).toBeLessThan(10);
      expect(LocalTransform.py[eidB]).toBeLessThan(20);
      expect(LocalTransform.py[eidC]).toBeLessThan(30);

      // Entity that started highest should still be highest
      expect(LocalTransform.py[eidC]!).toBeGreaterThan(LocalTransform.py[eidB]!);
      expect(LocalTransform.py[eidB]!).toBeGreaterThan(LocalTransform.py[eidA]!);
    });
  });

  describe('root-entity constraint', () => {
    it('throws when adding dynamic body to parented entity', () => {
      const parent = spawnTestEntity(world, { position: [0, 0, 0] });
      const child = spawnTestEntity(world, { position: [1, 0, 0] });
      attach(world, parent, child);

      expect(() => addDynamicBoxBody(world, child, 0.5, 0.5, 0.5)).toThrow(
        /Dynamic bodies must be root entities/,
      );
    });

    it('throws when adding kinematic body to parented entity', () => {
      const parent = spawnTestEntity(world, { position: [0, 0, 0] });
      const child = spawnTestEntity(world, { position: [1, 0, 0] });
      attach(world, parent, child);

      expect(() => addKinematicBoxBody(world, child, 0.5, 0.5, 0.5)).toThrow(
        /Kinematic bodies must be root entities/,
      );
    });
  });
});
