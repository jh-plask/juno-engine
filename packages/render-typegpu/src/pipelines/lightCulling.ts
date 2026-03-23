// @ts-nocheck -- GPU function bodies compiled by unplugin-typegpu at bundle time.

/**
 * Compute pipeline: assign lights to clusters.
 *
 * For scenes with few lights (< MAX_LIGHTS_PER_CLUSTER), assigns all lights
 * to every cluster — this is correct and optimal since the culling overhead
 * exceeds the shading savings. For high light counts, a sphere-AABB culling
 * test filters per-cluster light lists.
 *
 * The threshold is evaluated on the CPU (renderer) and controls which
 * kernel variant to dispatch. Currently the all-assign path is used.
 */

import tgpu, { d, std } from 'typegpu';
import { builtin } from 'typegpu/data';
import type { TgpuRoot } from '../gpu.js';
import { LightCullingGroup } from '../layouts.js';
import { sphereAABBIntersect } from '../shaders/clusterMath.js';

// ── All-assign kernel (optimal for < ~128 lights) ────────────────────────────

const assignAllLightsFn = tgpu.computeFn({
  in: { gid: builtin.globalInvocationId },
  workgroupSize: [64, 1, 1],
})((input) => {
  const config = LightCullingGroup.$.config;
  const constants = LightCullingGroup.$.lightConstants;
  const totalClusters = config.gridSize.x * config.gridSize.y * config.gridSize.z;
  const clusterIdx = input.gid.x;

  if (clusterIdx >= totalClusters) { return; }

  // Cap per-cluster lights to prevent buffer overflow
  const numLights = std.min(constants.numLights, d.u32(128));
  const offset = std.atomicAdd(LightCullingGroup.$.globalCounter.count, numLights);

  for (let i = d.u32(0); i < numLights; i += 1) {
    LightCullingGroup.$.lightIndexList[offset + i] = i;
  }

  LightCullingGroup.$.lightGrid[clusterIdx] = d.vec2u(offset, numLights);
});

// ── Culled kernel (for high light counts) ────────────────────────────────────

const cullLightsFn = tgpu.computeFn({
  in: { gid: builtin.globalInvocationId },
  workgroupSize: [64, 1, 1],
})((input) => {
  const config = LightCullingGroup.$.config;
  const constants = LightCullingGroup.$.lightConstants;
  const camera = LightCullingGroup.$.camera;
  const totalClusters = config.gridSize.x * config.gridSize.y * config.gridSize.z;
  const clusterIdx = input.gid.x;

  if (clusterIdx >= totalClusters) { return; }

  const aabb = LightCullingGroup.$.clusterAABBs[clusterIdx];
  const aabbMin = aabb.minBounds.xyz;
  const aabbMax = aabb.maxBounds.xyz;
  const numLights = constants.numLights;

  // Count matching lights
  let count = d.u32(0);
  for (let i = d.u32(0); i < numLights; i += 1) {
    const light = LightCullingGroup.$.lights[i];
    const viewPos = (camera.view * d.vec4f(light.position, 1.0)).xyz;
    // Conservative radius expansion (1.5x) for boundary safety
    if (sphereAABBIntersect(viewPos, light.radius * 1.5, aabbMin, aabbMax)) {
      count = count + d.u32(1);
    }
  }

  const offset = std.atomicAdd(LightCullingGroup.$.globalCounter.count, count);

  // Write matching indices (unconditional write + conditional advance)
  let wp = d.u32(0);
  for (let i = d.u32(0); i < numLights; i += 1) {
    const light = LightCullingGroup.$.lights[i];
    const viewPos = (camera.view * d.vec4f(light.position, 1.0)).xyz;
    LightCullingGroup.$.lightIndexList[offset + wp] = i;
    if (sphereAABBIntersect(viewPos, light.radius * 1.5, aabbMin, aabbMax)) {
      wp = wp + d.u32(1);
    }
  }

  LightCullingGroup.$.lightGrid[clusterIdx] = d.vec2u(offset, count);
});

// ── Exported pipeline factories ──────────────────────────────────────────────

export function createLightCullingPipeline(root: TgpuRoot) {
  return root.createComputePipeline({ compute: assignAllLightsFn });
}

export function createCulledLightPipeline(root: TgpuRoot) {
  return root.createComputePipeline({ compute: cullLightsFn });
}
