import { describe, test, expect } from 'vitest';
import { composeTRS, decomposeTRS } from '@engine/math/mat4.js';
import { mat4 } from 'wgpu-matrix';
import '@engine/test-utils/matchers.js';

describe('composeTRS', () => {
  test('identity inputs produce identity matrix', () => {
    const out = new Float32Array(16);
    composeTRS(out, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1);
    const identity = mat4.identity();
    expect(out).toBeCloseToArray(identity);
  });

  test('pure translation produces translation matrix', () => {
    const out = new Float32Array(16);
    composeTRS(out, 5, 3, 1, 0, 0, 0, 1, 1, 1, 1);
    // Translation is in elements [12], [13], [14]
    expect(out[12]).toBeCloseTo(5);
    expect(out[13]).toBeCloseTo(3);
    expect(out[14]).toBeCloseTo(1);
    // Diagonal should still be 1 (no scale)
    expect(out[0]).toBeCloseTo(1);
    expect(out[5]).toBeCloseTo(1);
    expect(out[10]).toBeCloseTo(1);
  });

  test('pure uniform scale produces scale matrix', () => {
    const out = new Float32Array(16);
    composeTRS(out, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4);
    expect(out[0]).toBeCloseTo(2);
    expect(out[5]).toBeCloseTo(3);
    expect(out[10]).toBeCloseTo(4);
    // Translation should be 0
    expect(out[12]).toBeCloseTo(0);
    expect(out[13]).toBeCloseTo(0);
    expect(out[14]).toBeCloseTo(0);
  });

  test('combined TRS produces correct matrix', () => {
    const out = new Float32Array(16);
    // 90 degree rotation around Y axis: quat = (0, sin(45°), 0, cos(45°))
    const sin45 = Math.sin(Math.PI / 4);
    const cos45 = Math.cos(Math.PI / 4);
    composeTRS(out, 1, 2, 3, 0, sin45, 0, cos45, 2, 2, 2);
    // Position should be [1, 2, 3]
    expect(out[12]).toBeCloseTo(1);
    expect(out[13]).toBeCloseTo(2);
    expect(out[14]).toBeCloseTo(3);
    // After 90° Y rotation + scale 2: X axis maps to Z, Z axis maps to -X
    // Column 0 (x-axis) should be approx [0, 0, -2, 0] (rotated X * scale)
    expect(out[0]).toBeCloseTo(0, 4);
    expect(out[2]).toBeCloseTo(-2, 4);
    // Column 2 (z-axis) should be approx [2, 0, 0, 0]
    expect(out[8]).toBeCloseTo(2, 4);
    expect(out[10]).toBeCloseTo(0, 4);
  });
});

describe('decomposeTRS round-trip', () => {
  test('recovers position from composed matrix', () => {
    const m = new Float32Array(16);
    composeTRS(m, 7, -3, 12, 0, 0, 0, 1, 1, 1, 1);

    const pos = new Float32Array(3);
    const rot = new Float32Array(4);
    const scale = new Float32Array(3);
    decomposeTRS(m, pos, rot, scale);

    expect(pos[0]).toBeCloseTo(7);
    expect(pos[1]).toBeCloseTo(-3);
    expect(pos[2]).toBeCloseTo(12);
  });

  test('recovers scale from composed matrix', () => {
    const m = new Float32Array(16);
    composeTRS(m, 0, 0, 0, 0, 0, 0, 1, 3, 5, 7);

    const pos = new Float32Array(3);
    const rot = new Float32Array(4);
    const scale = new Float32Array(3);
    decomposeTRS(m, pos, rot, scale);

    expect(scale[0]).toBeCloseTo(3);
    expect(scale[1]).toBeCloseTo(5);
    expect(scale[2]).toBeCloseTo(7);
  });

  test('identity matrix decomposes to identity TRS', () => {
    const m = mat4.identity() as Float32Array;

    const pos = new Float32Array(3);
    const rot = new Float32Array(4);
    const scale = new Float32Array(3);
    decomposeTRS(m, pos, rot, scale);

    expect(pos).toBeCloseToArray([0, 0, 0]);
    expect(scale).toBeCloseToArray([1, 1, 1]);
    // Identity quaternion: (0, 0, 0, 1)
    expect(Math.abs(rot[3]!)).toBeCloseTo(1);
  });
});
