import { describe, it, expect } from 'vitest';
import {
  INSTANCE_STRIDE,
  INSTANCE_FLOATS,
  LIGHT_STRIDE,
  LIGHT_FLOATS,
  CAMERA_STRIDE,
  LIGHT_CONSTANTS_STRIDE,
  CLUSTER_CONFIG_STRIDE,
} from '../src/schemas.js';
import { MATERIAL_PALETTE } from '../src/resources/materialGpu.js';

describe('struct stride constants', () => {
  it('INSTANCE_STRIDE = 80 (4 x vec4f model + 4 x u32 metadata)', () => {
    expect(INSTANCE_STRIDE).toBe(80);
  });

  it('INSTANCE_FLOATS = 20 (80 / 4)', () => {
    expect(INSTANCE_FLOATS).toBe(20);
    expect(INSTANCE_FLOATS).toBe(INSTANCE_STRIDE / 4);
  });

  it('LIGHT_STRIDE = 160 (verified via d.sizeOf(LightGpu))', () => {
    expect(LIGHT_STRIDE).toBe(160);
  });

  it('LIGHT_FLOATS = 40 (160 / 4)', () => {
    expect(LIGHT_FLOATS).toBe(40);
    expect(LIGHT_FLOATS).toBe(LIGHT_STRIDE / 4);
  });

  it('CAMERA_STRIDE = 224 (3 x mat4x4f + vec4f + vec2u + f32 + u32)', () => {
    expect(CAMERA_STRIDE).toBe(224);
  });

  it('LIGHT_CONSTANTS_STRIDE = 16 (vec3f + u32)', () => {
    expect(LIGHT_CONSTANTS_STRIDE).toBe(16);
  });

  it('CLUSTER_CONFIG_STRIDE = 48 (12 x 4 bytes)', () => {
    expect(CLUSTER_CONFIG_STRIDE).toBe(48);
  });
});

describe('MATERIAL_PALETTE', () => {
  it('has 10 entries', () => {
    expect(MATERIAL_PALETTE).toHaveLength(10);
  });

  it('each entry has valid roughness in [0, 1]', () => {
    for (let i = 0; i < MATERIAL_PALETTE.length; i++) {
      const mat = MATERIAL_PALETTE[i]!;
      expect(mat.roughness).toBeGreaterThanOrEqual(0);
      expect(mat.roughness).toBeLessThanOrEqual(1);
    }
  });

  it('each entry has valid metalness in [0, 1]', () => {
    for (let i = 0; i < MATERIAL_PALETTE.length; i++) {
      const mat = MATERIAL_PALETTE[i]!;
      expect(mat.metalness).toBeGreaterThanOrEqual(0);
      expect(mat.metalness).toBeLessThanOrEqual(1);
    }
  });
});
