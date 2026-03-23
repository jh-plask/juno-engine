import { describe, it, expect, beforeEach } from 'vitest';
import { createTestWorld } from '@engine/test-utils/world.js';
import type { EngineWorld } from '@engine/engine/types.js';
import { Light, WorldTransform } from '@engine/ecs/components.js';
import {
  spawnDirectionalLight,
  spawnPointLight,
  spawnSpotLight,
} from '@engine/ecs/prefabs.js';
import { updateWorldTransforms } from '@engine/ecs/systems/transforms.js';
import {
  extractLights,
  createLightExtract,
  type LightExtract,
} from '../src/extract/lightExtract.js';
import { LIGHT_FLOATS } from '../src/schemas.js';
import {
  LIGHT_TYPE_POINT,
  LIGHT_TYPE_SPOT,
  LIGHT_TYPE_DIRECTIONAL,
} from '../src/schemas.js';

let world: EngineWorld;
let out: LightExtract;

const MAX_TEST = 64;
const stagingBuf = new ArrayBuffer(MAX_TEST * LIGHT_FLOATS * 4);
const f32 = new Float32Array(stagingBuf);
const u32 = new Uint32Array(stagingBuf);

beforeEach(() => {
  world = createTestWorld();
  out = createLightExtract();
  f32.fill(0);
});

describe('extractLights', () => {
  describe('empty world', () => {
    it('returns lightCount = 0', () => {
      extractLights(world, out, f32, u32);
      expect(out.lightCount).toBe(0);
    });
  });

  describe('single directional light', () => {
    it('extracts correct lightType, color, intensity, and direction', () => {
      const eid = spawnDirectionalLight(
        world,
        0, -1, 0,       // direction
        1.0, 0.9, 0.8,  // color
        2.5,             // intensity
      );
      updateWorldTransforms(world);
      extractLights(world, out, f32, u32);

      expect(out.lightCount).toBe(1);

      // Directional lights have no position
      expect(f32[0]).toBe(0);
      expect(f32[1]).toBe(0);
      expect(f32[2]).toBe(0);

      // lightType (u32 at offset 3)
      expect(u32[3]).toBe(LIGHT_TYPE_DIRECTIONAL);

      // color
      expect(f32[4]).toBeCloseTo(1.0);
      expect(f32[5]).toBeCloseTo(0.9);
      expect(f32[6]).toBeCloseTo(0.8);

      // intensity
      expect(f32[7]).toBeCloseTo(2.5);

      // direction (stored directly from Light component)
      expect(f32[8]).toBeCloseTo(0);
      expect(f32[9]).toBeCloseTo(-1);
      expect(f32[10]).toBeCloseTo(0);

      // radius unused for directional
      expect(f32[11]).toBe(0);

      // cone angles unused
      expect(f32[12]).toBe(0);
      expect(f32[13]).toBe(0);
    });
  });

  describe('single point light', () => {
    it('extracts correct lightType, position from WorldTransform, color, intensity, radius', () => {
      const eid = spawnPointLight(
        world,
        3, 5, 7,          // position
        0.2, 0.4, 0.6,    // color
        10,                // intensity
        25,                // radius
      );
      updateWorldTransforms(world);
      extractLights(world, out, f32, u32);

      expect(out.lightCount).toBe(1);

      // Position comes from WorldTransform column 3 (m[eid*16 + 12..14])
      const wbase = eid * 16;
      expect(f32[0]).toBe(WorldTransform.m[wbase + 12]!);
      expect(f32[1]).toBe(WorldTransform.m[wbase + 13]!);
      expect(f32[2]).toBe(WorldTransform.m[wbase + 14]!);

      // lightType
      expect(u32[3]).toBe(LIGHT_TYPE_POINT);

      // color
      expect(f32[4]).toBeCloseTo(0.2);
      expect(f32[5]).toBeCloseTo(0.4);
      expect(f32[6]).toBeCloseTo(0.6);

      // intensity
      expect(f32[7]).toBeCloseTo(10);

      // direction unused for point lights
      expect(f32[8]).toBe(0);
      expect(f32[9]).toBe(0);
      expect(f32[10]).toBe(0);

      // radius
      expect(f32[11]).toBeCloseTo(25);

      // cone angles unused
      expect(f32[12]).toBe(0);
      expect(f32[13]).toBe(0);
    });

    it('reads position from WorldTransform column 3', () => {
      const eid = spawnPointLight(world, 10, 20, 30, 1, 1, 1, 1, 5);
      updateWorldTransforms(world);
      extractLights(world, out, f32, u32);

      const wbase = eid * 16;
      // Column 3 of the 4x4 matrix holds translation
      expect(f32[0]).toBe(WorldTransform.m[wbase + 12]!);
      expect(f32[1]).toBe(WorldTransform.m[wbase + 13]!);
      expect(f32[2]).toBe(WorldTransform.m[wbase + 14]!);
    });
  });

  describe('single spot light', () => {
    it('extracts correct lightType, position, direction, cone angles (stored as cos)', () => {
      const innerAngle = Math.PI / 6;  // 30 degrees
      const outerAngle = Math.PI / 4;  // 45 degrees
      const eid = spawnSpotLight(
        world,
        1, 2, 3,           // position
        0, -1, 0,          // direction
        1.0, 0.5, 0.0,     // color
        8,                  // intensity
        15,                 // radius
        innerAngle,
        outerAngle,
      );
      updateWorldTransforms(world);
      extractLights(world, out, f32, u32);

      expect(out.lightCount).toBe(1);

      // Position from WorldTransform
      const wbase = eid * 16;
      expect(f32[0]).toBe(WorldTransform.m[wbase + 12]!);
      expect(f32[1]).toBe(WorldTransform.m[wbase + 13]!);
      expect(f32[2]).toBe(WorldTransform.m[wbase + 14]!);

      // lightType
      expect(u32[3]).toBe(LIGHT_TYPE_SPOT);

      // color
      expect(f32[4]).toBeCloseTo(1.0);
      expect(f32[5]).toBeCloseTo(0.5);
      expect(f32[6]).toBeCloseTo(0.0);

      // intensity
      expect(f32[7]).toBeCloseTo(8);

      // direction (stored directly from Light.dirX/Y/Z)
      expect(f32[8]).toBeCloseTo(0);
      expect(f32[9]).toBeCloseTo(-1);
      expect(f32[10]).toBeCloseTo(0);

      // radius
      expect(f32[11]).toBeCloseTo(15);

      // cone angles stored as cos() by the prefab
      expect(f32[12]).toBeCloseTo(Math.cos(innerAngle));
      expect(f32[13]).toBeCloseTo(Math.cos(outerAngle));
    });
  });

  describe('multiple lights', () => {
    it('extracts correct count and all lights are present', () => {
      spawnDirectionalLight(world, 0, -1, 0, 1, 1, 1, 1);
      spawnPointLight(world, 0, 5, 0, 1, 0, 0, 5, 10);
      spawnSpotLight(world, 0, 3, 0, 0, -1, 0, 0, 1, 0, 3, 8, Math.PI / 4, Math.PI / 3);
      updateWorldTransforms(world);

      extractLights(world, out, f32, u32);

      expect(out.lightCount).toBe(3);

      // Verify all 3 light types are present in the staging buffer
      const types = new Set<number>();
      for (let i = 0; i < 3; i++) {
        types.add(u32[i * LIGHT_FLOATS + 3]!);
      }
      expect(types.has(LIGHT_TYPE_POINT)).toBe(true);
      expect(types.has(LIGHT_TYPE_SPOT)).toBe(true);
      expect(types.has(LIGHT_TYPE_DIRECTIONAL)).toBe(true);
    });
  });

  describe('light direction', () => {
    it('stores direction directly from Light.dirX/Y/Z, not computed from transform', () => {
      const eid = spawnDirectionalLight(world, 0.5, -0.7, 0.3, 1, 1, 1, 1);
      updateWorldTransforms(world);
      extractLights(world, out, f32, u32);

      // Direction comes from the Light component fields, not the transform matrix
      expect(f32[8]).toBe(Light.dirX[eid]!);
      expect(f32[9]).toBe(Light.dirY[eid]!);
      expect(f32[10]).toBe(Light.dirZ[eid]!);
    });
  });
});
