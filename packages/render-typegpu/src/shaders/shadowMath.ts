/**
 * Shadow math — CPU-side light view-projection computation.
 *
 * GPU-side PCF sampling is defined inline in staticMesh.ts where
 * the LightingGroup bind group (shadow atlas + sampler) is in scope.
 * These CPU functions are pure and testable without a GPU.
 */

import { mat4 } from 'wgpu-matrix';

// Scratch matrices — avoid per-call allocation
const scratchView = mat4.create();
const scratchProj = mat4.create();
const scratchVP = mat4.create();

/**
 * Compute orthographic view-projection for a directional light.
 *
 * The projection volume is a box centered on the scene origin,
 * sized to enclose a sphere of `sceneRadius`.
 */
export function computeDirectionalShadowVP(
  dirX: number, dirY: number, dirZ: number,
  sceneRadius: number,
  out: Float32Array, // must be ≥16 floats
): void {
  const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
  const dx = dirX / len;
  const dy = dirY / len;
  const dz = dirZ / len;

  // Light "eye" position: offset from scene center along -direction
  const lightDist = sceneRadius * 2;
  const eyeX = -dx * lightDist;
  const eyeY = -dy * lightDist;
  const eyeZ = -dz * lightDist;

  // Up vector: avoid parallel with direction
  const upX = Math.abs(dy) > 0.99 ? 0 : 0;
  const upY = Math.abs(dy) > 0.99 ? 0 : 1;
  const upZ = Math.abs(dy) > 0.99 ? 1 : 0;

  mat4.lookAt([eyeX, eyeY, eyeZ], [0, 0, 0], [upX, upY, upZ], scratchView);

  const r = sceneRadius;
  mat4.ortho(-r, r, -r, r, 0.1, lightDist + r, scratchProj);

  mat4.multiply(scratchProj, scratchView, scratchVP);
  out.set(scratchVP);
}

/**
 * Compute perspective view-projection for a spot light.
 */
export function computeSpotShadowVP(
  posX: number, posY: number, posZ: number,
  dirX: number, dirY: number, dirZ: number,
  outerConeAngle: number, // radians, half-angle
  range: number,
  out: Float32Array, // must be ≥16 floats
): void {
  const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
  const dx = dirX / len;
  const dy = dirY / len;
  const dz = dirZ / len;

  // Move target far along direction to avoid numerical issues with close lookAt
  const targetX = posX + dx * range;
  const targetY = posY + dy * range;
  const targetZ = posZ + dz * range;

  const upX = Math.abs(dy) > 0.99 ? 0 : 0;
  const upY = Math.abs(dy) > 0.99 ? 0 : 1;
  const upZ = Math.abs(dy) > 0.99 ? 1 : 0;

  mat4.lookAt([posX, posY, posZ], [targetX, targetY, targetZ], [upX, upY, upZ], scratchView);

  // outerConeAngle is cos(halfAngle) from ECS — recover the actual angle
  // outerConeAngle is cos(halfAngle) from ECS — recover the actual angle
  const fov = Math.max(Math.acos(outerConeAngle) * 2, 0.1);
  // Near plane at 0.5 (not 0.1) to preserve depth precision for distant objects
  mat4.perspective(fov, 1.0, 0.5, range, scratchProj);

  mat4.multiply(scratchProj, scratchView, scratchVP);
  out.set(scratchVP);
}
