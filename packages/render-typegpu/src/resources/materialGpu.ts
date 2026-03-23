import { d } from 'typegpu';
import type { TgpuRoot } from '../gpu.js';
import { InstanceGpu, MaterialGpu } from '../schemas.js';

export function createMaterialBuffer(root: TgpuRoot, capacity: number) {
  return root
    .createBuffer(d.arrayOf(MaterialGpu, capacity))
    .$usage('storage');
}

export function createInstanceBuffer(root: TgpuRoot, capacity: number) {
  return root
    .createBuffer(d.arrayOf(InstanceGpu, capacity))
    .$usage('storage');
}

function mat(
  r: number, g: number, b: number,
  roughness: number, metalness: number,
) {
  return {
    baseColor: { x: r, y: g, z: b, w: 1 },
    emissive: { x: 0, y: 0, z: 0 },
    roughness, metalness, alphaCutoff: 0, flags: 0, _pad: 0,
  };
}

/**
 * Material palette. Indices are stable — referenced by scene code.
 *
 *  0  orange rough plastic     5  polished copper
 *  1  grey ground              6  teal ceramic
 *  2  gold metal               7  dark wood
 *  3  red glossy               8  cream marble
 *  4  cool blue rubber         9  charcoal rough
 */
export const MATERIAL_PALETTE = [
  /* 0 */ mat(0.80, 0.40, 0.20, 0.50, 0.00),
  /* 1 */ mat(0.35, 0.35, 0.38, 0.85, 0.00),
  /* 2 */ mat(1.00, 0.77, 0.34, 0.25, 1.00),
  /* 3 */ mat(0.85, 0.10, 0.10, 0.12, 0.00),
  /* 4 */ mat(0.25, 0.45, 0.75, 0.70, 0.00),
  /* 5 */ mat(0.96, 0.64, 0.54, 0.18, 1.00),
  /* 6 */ mat(0.15, 0.72, 0.65, 0.30, 0.00),
  /* 7 */ mat(0.30, 0.18, 0.10, 0.75, 0.00),
  /* 8 */ mat(0.92, 0.90, 0.85, 0.35, 0.00),
  /* 9 */ mat(0.12, 0.12, 0.12, 0.90, 0.00),
];

/**
 * Write the material palette into the buffer. Cold-path (called once at init).
 */
export function writeDefaultMaterials(
  buffer: ReturnType<typeof createMaterialBuffer>,
  capacity: number,
): void {
  const zero = mat(0, 0, 0, 0.5, 0);
  zero.baseColor.w = 0;
  const materials = new Array(capacity).fill(zero);
  for (let i = 0; i < MATERIAL_PALETTE.length; i++) {
    materials[i] = MATERIAL_PALETTE[i];
  }
  buffer.write(materials as never);
}
