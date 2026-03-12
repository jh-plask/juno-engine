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

/**
 * Write a default material set into the buffer. Cold-path (called once at init).
 * Material 0 gets a visible base color; all others are zeroed.
 */
export function writeDefaultMaterials(
  buffer: ReturnType<typeof createMaterialBuffer>,
  capacity: number,
): void {
  const zero = {
    baseColor: { x: 0, y: 0, z: 0, w: 0 },
    emissive: { x: 0, y: 0, z: 0 },
    roughness: 0.5, metalness: 0, alphaCutoff: 0, flags: 0, _pad: 0,
  };
  const materials = new Array(capacity).fill(zero);
  materials[0] = {
    baseColor: { x: 0.8, y: 0.4, z: 0.2, w: 1 },
    emissive: { x: 0, y: 0, z: 0 },
    roughness: 0.5, metalness: 0, alphaCutoff: 0, flags: 0, _pad: 0,
  };
  buffer.write(materials as never);
}
