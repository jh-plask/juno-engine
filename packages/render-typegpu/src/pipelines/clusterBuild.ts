// @ts-nocheck -- GPU function bodies compiled by unplugin-typegpu at bundle time.

/**
 * Compute pipeline: build view-space AABBs for each cluster.
 *
 * Runs once when viewport or camera projection changes (not every frame).
 * Each thread handles one cluster (gid.x, gid.y, gid.z).
 * Computes 8 frustum corners (4 screen corners × 2 depth bounds)
 * and stores the bounding AABB.
 */

import tgpu, { d, std } from 'typegpu';
import { builtin } from 'typegpu/data';
import type { TgpuRoot } from '../gpu.js';
import { ClusterBuildGroup } from '../layouts.js';

const buildClusterAABBsFn = tgpu.computeFn({
  in: { gid: builtin.globalInvocationId },
  workgroupSize: [4, 4, 4],
})((input) => {
  const config = ClusterBuildGroup.$.config;
  const gid = input.gid;

  if (gid.x >= config.gridSize.x || gid.y >= config.gridSize.y || gid.z >= config.gridSize.z) {
    return;
  }

  const tileF = d.f32(config.tileSize);
  const vpW = d.f32(config.viewportWidth);
  const vpH = d.f32(config.viewportHeight);

  // Screen-space pixel bounds of this tile
  const x0 = d.f32(gid.x) * tileF;
  const y0 = d.f32(gid.y) * tileF;
  const x1 = std.min(x0 + tileF, vpW);
  const y1 = std.min(y0 + tileF, vpH);

  // NDC [-1, 1] — Y flipped (screen top = NDC +1)
  const ndcX0 = x0 / vpW * 2.0 - 1.0;
  const ndcX1 = x1 / vpW * 2.0 - 1.0;
  const ndcY0 = (1.0 - y1 / vpH) * 2.0 - 1.0;
  const ndcY1 = (1.0 - y0 / vpH) * 2.0 - 1.0;

  // Exponential depth slice bounds
  const ratio = config.far / config.near;
  const sliceZ = d.f32(gid.z);
  const slicesF = d.f32(config.gridSize.z);
  const zNear = config.near * std.pow(ratio, sliceZ / slicesF);
  const zFar = config.near * std.pow(ratio, (sliceZ + 1.0) / slicesF);

  // Screen → view space: viewX = ndcX * depth * invProjX, viewZ = -depth
  const ipx = config.invProjX;
  const ipy = config.invProjY;

  // 8 frustum corners (4 NDC corners × 2 depth planes)
  const n00 = d.vec3f(ndcX0 * zNear * ipx, ndcY0 * zNear * ipy, 0.0 - zNear);
  const n10 = d.vec3f(ndcX1 * zNear * ipx, ndcY0 * zNear * ipy, 0.0 - zNear);
  const n01 = d.vec3f(ndcX0 * zNear * ipx, ndcY1 * zNear * ipy, 0.0 - zNear);
  const n11 = d.vec3f(ndcX1 * zNear * ipx, ndcY1 * zNear * ipy, 0.0 - zNear);

  const f00 = d.vec3f(ndcX0 * zFar * ipx, ndcY0 * zFar * ipy, 0.0 - zFar);
  const f10 = d.vec3f(ndcX1 * zFar * ipx, ndcY0 * zFar * ipy, 0.0 - zFar);
  const f01 = d.vec3f(ndcX0 * zFar * ipx, ndcY1 * zFar * ipy, 0.0 - zFar);
  const f11 = d.vec3f(ndcX1 * zFar * ipx, ndcY1 * zFar * ipy, 0.0 - zFar);

  // AABB = bounding box of all 8 corners
  const minN = std.min(std.min(n00, n10), std.min(n01, n11));
  const maxN = std.max(std.max(n00, n10), std.max(n01, n11));
  const minF = std.min(std.min(f00, f10), std.min(f01, f11));
  const maxF = std.max(std.max(f00, f10), std.max(f01, f11));

  const aabbMin = std.min(minN, minF);
  const aabbMax = std.max(maxN, maxF);

  // Write to output buffer (assign fields individually — TypeGPU requires
  // explicit schema for struct literal assignment)
  const idx = gid.x + gid.y * config.gridSize.x
    + gid.z * config.gridSize.x * config.gridSize.y;
  ClusterBuildGroup.$.clusterAABBs[idx].minBounds = d.vec4f(aabbMin, 0.0);
  ClusterBuildGroup.$.clusterAABBs[idx].maxBounds = d.vec4f(aabbMax, 0.0);
});

export function createClusterBuildPipeline(root: TgpuRoot) {
  return root.createComputePipeline({
    compute: buildClusterAABBsFn,
  });
}
