import { describe, expect } from 'vitest';
import { test as fcTest } from '@fast-check/vitest';
import fc from 'fast-check';
import { composeTRS, decomposeTRS } from '@engine/math/mat4.js';
import '@engine/test-utils/matchers.js';

const EPSILON = 1e-4;

const arbFloat = fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true, noDefaultInfinity: true });
const arbPositiveFloat = fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true, noDefaultInfinity: true });

describe('TRS round-trip invariants', () => {
  fcTest.prop([arbFloat, arbFloat, arbFloat])(
    'position round-trip: decompose(compose(p)).position ≈ p',
    (px, py, pz) => {
      const m = new Float32Array(16);
      composeTRS(m, px, py, pz, 0, 0, 0, 1, 1, 1, 1);

      const outPos = new Float32Array(3);
      const outRot = new Float32Array(4);
      const outScale = new Float32Array(3);
      decomposeTRS(m, outPos, outRot, outScale);

      expect(Math.abs(outPos[0]! - px)).toBeLessThan(EPSILON);
      expect(Math.abs(outPos[1]! - py)).toBeLessThan(EPSILON);
      expect(Math.abs(outPos[2]! - pz)).toBeLessThan(EPSILON);
    },
  );

  fcTest.prop([arbPositiveFloat, arbPositiveFloat, arbPositiveFloat])(
    'scale round-trip: decompose(compose(s)).scale ≈ s (positive scales)',
    (sx, sy, sz) => {
      const m = new Float32Array(16);
      composeTRS(m, 0, 0, 0, 0, 0, 0, 1, sx, sy, sz);

      const outPos = new Float32Array(3);
      const outRot = new Float32Array(4);
      const outScale = new Float32Array(3);
      decomposeTRS(m, outPos, outRot, outScale);

      expect(Math.abs(outScale[0]! - sx)).toBeLessThan(EPSILON);
      expect(Math.abs(outScale[1]! - sy)).toBeLessThan(EPSILON);
      expect(Math.abs(outScale[2]! - sz)).toBeLessThan(EPSILON);
    },
  );

  fcTest.prop([arbFloat, arbFloat, arbFloat, arbFloat])(
    'rotation round-trip: decompose(compose(q)).quat ≈ ±q (unit quaternion)',
    (a, b, c, d) => {
      // Normalize to unit quaternion
      const len = Math.sqrt(a * a + b * b + c * c + d * d);
      if (len < 0.001) return; // skip degenerate
      const qx = a / len;
      const qy = b / len;
      const qz = c / len;
      const qw = d / len;

      const m = new Float32Array(16);
      composeTRS(m, 0, 0, 0, qx, qy, qz, qw, 1, 1, 1);

      const outPos = new Float32Array(3);
      const outRot = new Float32Array(4);
      const outScale = new Float32Array(3);
      decomposeTRS(m, outPos, outRot, outScale);

      // Quaternion double-cover: q and -q represent same rotation
      const sign = Math.sign(outRot[3]! * qw + outRot[0]! * qx + outRot[1]! * qy + outRot[2]! * qz);
      const s = sign >= 0 ? 1 : -1;

      expect(Math.abs(outRot[0]! - s * qx)).toBeLessThan(EPSILON);
      expect(Math.abs(outRot[1]! - s * qy)).toBeLessThan(EPSILON);
      expect(Math.abs(outRot[2]! - s * qz)).toBeLessThan(EPSILON);
      expect(Math.abs(outRot[3]! - s * qw)).toBeLessThan(EPSILON);
    },
  );
});
