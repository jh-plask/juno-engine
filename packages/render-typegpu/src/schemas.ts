import { d } from 'typegpu';

// ── Struct stride constants ──────────────────────────────────────────────────
// Byte layouts for zero-copy staging. Co-located with struct definitions
// since they describe the same data.

/** InstanceGpu: 80 bytes = 4×vec4f (model) + 4×u32 (metadata). */
export const INSTANCE_STRIDE = 80;
export const INSTANCE_FLOATS = 20;

/** LightGpu: 160 bytes = 40 floats. Verified via d.sizeOf(LightGpu) = 160. */
export const LIGHT_STRIDE = 160;
export const LIGHT_FLOATS = 40;

/** CameraUniform: 224 bytes = 56 floats. */
export const CAMERA_STRIDE = 224;

/** LightConstants: 16 bytes. */
export const LIGHT_CONSTANTS_STRIDE = 16;

/** ClusterConfig: 48 bytes. */
export const CLUSTER_CONFIG_STRIDE = 48;

export const CameraUniform = d.struct({
  view: d.mat4x4f,
  proj: d.mat4x4f,
  viewProj: d.mat4x4f,
  eye: d.vec4f,
  viewport: d.vec2u,
  time: d.f32,
  frame: d.u32,
});

export const MaterialGpu = d.struct({
  baseColor: d.vec4f,
  emissive: d.vec3f,
  roughness: d.f32,
  metalness: d.f32,
  alphaCutoff: d.f32,
  flags: d.u32,
  _pad: d.f32,
});

export const InstanceGpu = d.struct({
  model0: d.vec4f,
  model1: d.vec4f,
  model2: d.vec4f,
  model3: d.vec4f,
  material: d.u32,
  entity: d.u32,
  flags: d.u32,
  _pad: d.u32,
});

export const CullState = d.struct({
  visibleCount: d.atomic(d.u32),
});

export const MeshVertex = d.unstruct({
  position: d.location(0, d.vec3f),
  normal: d.location(1, d.vec3f),
  uv: d.location(2, d.vec2f),
  tangent: d.location(3, d.vec4f),
});

export const CandidateSphere = d.struct({
  centerRadius: d.vec4f,
  entity: d.u32,
  mesh: d.u32,
  material: d.u32,
  _pad: d.u32,
});

// ── Light types ──────────────────────────────────────────────────────────────

export const LIGHT_TYPE_POINT = 0;
export const LIGHT_TYPE_SPOT = 1;
export const LIGHT_TYPE_DIRECTIONAL = 2;

/**
 * GPU light representation with inline shadow data (192 bytes = 48 floats).
 *
 * Shadow data lives inside the light struct — not a separate system.
 * This follows the DOOM Eternal / PlayCanvas / Filament pattern where
 * shadow VP matrices and atlas rects are per-light fields.
 *
 * Layout:
 *   Row 0: position(12) + lightType(4)           = 16
 *   Row 1: color(12) + intensity(4)              = 16
 *   Row 2: direction(12) + radius(4)             = 16
 *   Row 3: innerCone + outerCone + shadowBias + shadowNormalBias = 16
 *   Row 4-7: shadowViewProj mat4x4f              = 64
 *   Row 8: shadowAtlasRect vec4f                  = 16
 *   Row 9: shadowSoftness + shadowFlags + pad     = 16
 *   Total = 192 bytes
 */
export const LightGpu = d.struct({
  // Core light data (48 bytes)
  position: d.vec3f,
  lightType: d.u32,
  color: d.vec3f,
  intensity: d.f32,
  direction: d.vec3f,
  radius: d.f32,
  innerConeAngle: d.f32,
  outerConeAngle: d.f32,
  shadowBias: d.f32,
  shadowNormalBias: d.f32,

  // Inline shadow data (128 bytes)
  shadowViewProj: d.mat4x4f,
  shadowAtlasRect: d.vec4f,
  shadowSoftness: d.f32,
  shadowFlags: d.u32,        // bit 0: shadow enabled
  _pad0: d.f32,
  _pad1: d.f32,
});

/** Per-frame lighting constants (16 bytes). */
export const LightConstants = d.struct({
  ambientColor: d.vec3f,
  numLights: d.u32,
});

// ── Cluster grid ─────────────────────────────────────────────────────────────

/**
 * Configuration for the 3D cluster grid (froxel volume).
 *
 * Exponential depth slicing: slice = floor(log(z/near) * sliceBias)
 * where sliceBias = gridSizeZ / log(far/near).
 *
 * 48 bytes (3 × 16-byte aligned rows).
 */
/**
 * Cluster grid configuration (48 bytes).
 *
 * Exponential depth slicing: slice = floor(log(z/near) * sliceBias)
 * invProjX/Y precomputed on CPU for screen→view conversion in compute shaders.
 */
export const ClusterConfig = d.struct({
  gridSize: d.vec3u,      // tiles_x, tiles_y, depth_slices
  tileSize: d.u32,        // pixels per tile edge (square tiles)
  near: d.f32,
  far: d.f32,
  sliceBias: d.f32,       // gridSizeZ / log(far/near)
  sliceScale: d.f32,      // 1.0 / log(far/near)
  viewportWidth: d.u32,
  viewportHeight: d.u32,
  invProjX: d.f32,        // 1.0 / proj[0][0] (screen→view X)
  invProjY: d.f32,        // 1.0 / proj[1][1] (screen→view Y)
});

/** AABB for a single cluster in view space (32 bytes). */
export const ClusterAABB = d.struct({
  minBounds: d.vec4f,     // xyz = min, w unused
  maxBounds: d.vec4f,     // xyz = max, w unused
});

/** Atomic counter for light index list allocation. */
export const GlobalCounter = d.struct({
  count: d.atomic(d.u32),
});
