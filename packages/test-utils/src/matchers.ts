import { expect } from 'vitest';

const EPSILON = 1e-5;

expect.extend({
  toBeCloseToArray(
    received: ArrayLike<number> | number[],
    expected: ArrayLike<number> | number[],
    epsilon: number = EPSILON,
  ) {
    const recArr = Array.from(received);
    const expArr = Array.from(expected);

    if (recArr.length !== expArr.length) {
      return {
        pass: false,
        message: () =>
          `Expected arrays of same length: got ${recArr.length} vs ${expArr.length}`,
      };
    }

    const mismatches: string[] = [];
    for (let i = 0; i < recArr.length; i++) {
      const diff = Math.abs(recArr[i]! - expArr[i]!);
      if (diff > epsilon) {
        mismatches.push(`  [${i}]: ${recArr[i]} vs ${expArr[i]} (diff: ${diff})`);
      }
    }

    return {
      pass: mismatches.length === 0,
      message: () =>
        mismatches.length === 0
          ? `Expected arrays to NOT be close (epsilon=${epsilon})`
          : `Arrays differ at:\n${mismatches.join('\n')}`,
    };
  },
});

declare module 'vitest' {
  interface Assertion<T> {
    toBeCloseToArray(expected: ArrayLike<number> | number[], epsilon?: number): void;
  }
  interface AsymmetricMatchersContaining {
    toBeCloseToArray(expected: ArrayLike<number> | number[], epsilon?: number): void;
  }
}
