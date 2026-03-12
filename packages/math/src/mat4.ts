import { mat4, quat } from 'wgpu-matrix';

// Module-scoped scratch matrices to avoid allocation in hot loops
const _rotMat = mat4.create();
const _scratchQuat = new Float32Array(4);
const _scratchPos = new Float32Array(3);
const _scratchScale = new Float32Array(3);

/**
 * Compose a 4x4 matrix from position, rotation (quaternion), and scale.
 * Writes result to `out`.
 */
export function composeTRS(
  out: Float32Array,
  px: number, py: number, pz: number,
  qx: number, qy: number, qz: number, qw: number,
  sx: number, sy: number, sz: number,
): Float32Array {
  mat4.identity(out);

  _scratchPos[0] = px; _scratchPos[1] = py; _scratchPos[2] = pz;
  mat4.translate(out, _scratchPos, out);

  _scratchQuat[0] = qx; _scratchQuat[1] = qy; _scratchQuat[2] = qz; _scratchQuat[3] = qw;
  mat4.fromQuat(_scratchQuat, _rotMat);
  mat4.multiply(out, _rotMat, out);

  _scratchScale[0] = sx; _scratchScale[1] = sy; _scratchScale[2] = sz;
  mat4.scale(out, _scratchScale, out);

  return out;
}

/**
 * Decompose a 4x4 matrix into position, rotation quaternion, and scale.
 * Basic decomposition -- does not handle shear or negative scales correctly.
 */
export function decomposeTRS(
  m: Float32Array,
  outPos: Float32Array,
  outQuat: Float32Array,
  outScale: Float32Array,
): void {
  // Extract translation from column 3
  outPos[0] = m[12]!;
  outPos[1] = m[13]!;
  outPos[2] = m[14]!;

  // Extract scale as column magnitudes
  const sx = Math.hypot(m[0]!, m[1]!, m[2]!);
  const sy = Math.hypot(m[4]!, m[5]!, m[6]!);
  const sz = Math.hypot(m[8]!, m[9]!, m[10]!);
  outScale[0] = sx;
  outScale[1] = sy;
  outScale[2] = sz;

  // Build a pure rotation matrix by dividing columns by scale
  const invSx = sx > 0 ? 1 / sx : 0;
  const invSy = sy > 0 ? 1 / sy : 0;
  const invSz = sz > 0 ? 1 / sz : 0;

  _rotMat[0] = m[0]! * invSx;
  _rotMat[1] = m[1]! * invSx;
  _rotMat[2] = m[2]! * invSx;
  _rotMat[3] = 0;
  _rotMat[4] = m[4]! * invSy;
  _rotMat[5] = m[5]! * invSy;
  _rotMat[6] = m[6]! * invSy;
  _rotMat[7] = 0;
  _rotMat[8] = m[8]! * invSz;
  _rotMat[9] = m[9]! * invSz;
  _rotMat[10] = m[10]! * invSz;
  _rotMat[11] = 0;
  _rotMat[12] = 0;
  _rotMat[13] = 0;
  _rotMat[14] = 0;
  _rotMat[15] = 1;

  quat.fromMat(_rotMat, outQuat);
}
