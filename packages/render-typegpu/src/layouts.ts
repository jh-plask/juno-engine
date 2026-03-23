import tgpu, { d } from 'typegpu';
import {
  CameraUniform,
  ClusterAABB,
  ClusterConfig,
  GlobalCounter,
  InstanceGpu,
  LightConstants,
  LightGpu,
  MaterialGpu,
} from './schemas.js';

// ── Render pass bind groups ──────────────────────────────────────────────────

export const SceneGroup = tgpu.bindGroupLayout({
  camera: { uniform: CameraUniform },
  instances: { storage: (n: number) => d.arrayOf(InstanceGpu, n) },
  materials: { storage: (n: number) => d.arrayOf(MaterialGpu, n) },
}).$idx(0);

/**
 * Shading pass: lights (with inline shadow data) + clustered light grid
 * + shadow atlas depth texture + comparison sampler.
 */
export const LightingGroup = tgpu.bindGroupLayout({
  lights: { storage: (n: number) => d.arrayOf(LightGpu, n) },
  lightGrid: { storage: (n: number) => d.arrayOf(d.vec2u, n) },
  lightIndexList: { storage: (n: number) => d.arrayOf(d.u32, n) },
  lightConstants: { uniform: LightConstants },
  clusterConfig: { uniform: ClusterConfig },
  shadowAtlas: { texture: d.textureDepth2d() },
  shadowSampler: { sampler: 'comparison' as const },
}).$idx(1);

// ── Compute pass bind groups ─────────────────────────────────────────────────

/** Cluster AABB build compute: camera + config → AABBs. */
export const ClusterBuildGroup = tgpu.bindGroupLayout({
  config: { uniform: ClusterConfig },
  clusterAABBs: {
    storage: (n: number) => d.arrayOf(ClusterAABB, n),
    access: 'mutable' as const,
  },
});

/** Light culling compute: lights + AABBs → light grid + index list. */
export const LightCullingGroup = tgpu.bindGroupLayout({
  config: { uniform: ClusterConfig },
  lightConstants: { uniform: LightConstants },
  lights: { storage: (n: number) => d.arrayOf(LightGpu, n) },
  clusterAABBs: { storage: (n: number) => d.arrayOf(ClusterAABB, n) },
  camera: { uniform: CameraUniform },
  lightGrid: {
    storage: (n: number) => d.arrayOf(d.vec2u, n),
    access: 'mutable' as const,
  },
  lightIndexList: {
    storage: (n: number) => d.arrayOf(d.u32, n),
    access: 'mutable' as const,
  },
  globalCounter: { storage: GlobalCounter, access: 'mutable' as const },
});

