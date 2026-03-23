// @ts-nocheck -- GPU function bodies compiled by unplugin-typegpu at bundle time.

/**
 * Cluster math GPU functions for clustered forward rendering.
 *
 * - sphereAABBIntersect: light-cluster intersection test
 * - clusterIndex: fragment position → cluster flat index
 * - linearizeDepth: depth buffer value → linear eye-space depth
 */

import tgpu, { d, std } from 'typegpu';

/**
 * Sphere-AABB intersection test.
 *
 * Returns true if a sphere (center, radius) intersects an AABB (min, max).
 * Uses squared-distance comparison — no sqrt needed.
 */
export const sphereAABBIntersect = tgpu.fn([
  d.vec3f, d.f32, d.vec3f, d.vec3f,
], d.bool)
  ((center, radius, aabbMin, aabbMax) => {
    const closest = std.clamp(center, aabbMin, aabbMax);
    const delta = center - closest;
    const distSq = std.dot(delta, delta);
    return distSq <= radius * radius;
  });

/**
 * Compute flat cluster index from fragment screen position and linear depth.
 *
 * gridSize: vec3u (tilesX, tilesY, depthSlices)
 * tileSize: u32 (pixels per tile edge)
 * near: f32
 * sliceBias: f32 (= gridSizeZ / log(far/near))
 */
export const clusterIndex = tgpu.fn([
  d.vec2f, d.f32,
  d.vec3u, d.u32, d.f32, d.f32,
], d.u32)
  ((fragXY, linearDepth, gridSize, tileSize, near, sliceBias) => {
    const tileX = d.u32(fragXY.x) / tileSize;
    const tileY = d.u32(fragXY.y) / tileSize;
    const slice = d.u32(std.max(std.log(linearDepth / near) * sliceBias, 0.0));
    const clampedSlice = std.min(slice, gridSize.z - 1);
    return tileX + tileY * gridSize.x + clampedSlice * gridSize.x * gridSize.y;
  });

/**
 * Convert depth buffer value [0, 1] to linear eye-space depth.
 *
 * For a perspective projection with Z in [0, 1]:
 *   linearZ = near * far / (far - depth * (far - near))
 */
export const linearizeDepth = tgpu.fn([d.f32, d.f32, d.f32], d.f32)
  ((depth, near, far) => {
    return near * far / (far - depth * (far - near));
  });
