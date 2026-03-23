/**
 * StagedBuffer — unified CPU staging + GPU buffer abstraction.
 *
 * Every hot-path GPU buffer in the engine follows the same pattern:
 *   1. CPU writes data into a staging ArrayBuffer
 *   2. Flush copies staging → GPU via queue.writeBuffer
 *
 * StagedBuffer provides a single, consistent interface for this pattern,
 * replacing the scattered writer implementations (instance, camera, light,
 * lightConstants, clusterConfig).
 *
 * Consumers write directly into the typed views (f32, u32), then call
 * flush() to upload. Packing logic lives in pure functions external to
 * StagedBuffer — this separates buffer management from data encoding.
 */

export interface StagedBuffer {
  /** The underlying GPU buffer handle. */
  readonly gpuBuffer: GPUBuffer;
  /** Total byte capacity of the staging area. */
  readonly byteCapacity: number;
  /** Float32 view into the staging area. */
  readonly f32: Float32Array;
  /** Uint32 view into the staging area. */
  readonly u32: Uint32Array;
  /** Uint8 view into the staging area. */
  readonly u8: Uint8Array;
  /**
   * Upload `byteLength` bytes from staging to GPU.
   * For array buffers: pass `count * stride`.
   * For uniform buffers: pass the full struct size or omit for writeAll.
   */
  flush(byteLength?: number): void;
}

/**
 * Create a StagedBuffer for an existing GPU buffer.
 *
 * @param device      GPU device (for queue.writeBuffer)
 * @param gpuBuffer   The target GPU buffer
 * @param byteCapacity  Size of the staging area in bytes
 */
export function createStagedBuffer(
  device: GPUDevice,
  gpuBuffer: GPUBuffer,
  byteCapacity: number,
): StagedBuffer {
  const staging = new ArrayBuffer(byteCapacity);
  const f32 = new Float32Array(staging);
  const u32 = new Uint32Array(staging);
  const u8 = new Uint8Array(staging);

  return {
    gpuBuffer,
    byteCapacity,
    f32,
    u32,
    u8,
    flush(byteLength?: number) {
      const len = byteLength ?? byteCapacity;
      if (len > 0) {
        device.queue.writeBuffer(gpuBuffer, 0, staging, 0, len);
      }
    },
  };
}

// ── Pack functions ───────────────────────────────────────────────────────────
// Pure functions that encode data into staging views.
// Separated from StagedBuffer so they're composable and testable.

/** Pack camera data into staging. Layout matches CameraUniform (224 bytes). */
export function packCamera(
  f32: Float32Array,
  u32: Uint32Array,
  view: Float32Array,
  proj: Float32Array,
  viewProj: Float32Array,
  eyeX: number, eyeY: number, eyeZ: number,
  vpW: number, vpH: number,
  time: number, frame: number,
): void {
  f32.set(view, 0);       // mat4x4f view:     bytes 0-63
  f32.set(proj, 16);      // mat4x4f proj:     bytes 64-127
  f32.set(viewProj, 32);  // mat4x4f viewProj: bytes 128-191
  f32[48] = eyeX;         // vec4f eye:        bytes 192-207
  f32[49] = eyeY;
  f32[50] = eyeZ;
  f32[51] = 1;
  u32[52] = vpW;          // vec2u viewport:   bytes 208-215
  u32[53] = vpH;
  f32[54] = time;         // f32 time:         bytes 216-219
  u32[55] = frame;        // u32 frame:        bytes 220-223
}

/** Pack light constants into staging. Layout matches LightConstants (16 bytes). */
export function packLightConstants(
  f32: Float32Array,
  u32: Uint32Array,
  numLights: number,
  ambientR: number, ambientG: number, ambientB: number,
): void {
  f32[0] = ambientR;     // vec3f ambientColor: bytes 0-11
  f32[1] = ambientG;
  f32[2] = ambientB;
  u32[3] = numLights;    // u32 numLights:      bytes 12-15
}

/**
 * Pack shadow data for a single light into the light staging buffer.
 *
 * Writes into the shadow region of a LightGpu entry (floats 14-39).
 * Called by the renderer after shadow VP matrices are computed.
 *
 * @param lightIndex  Index of the light in the staging buffer
 * @param lightFloats LIGHT_FLOATS constant (48)
 */
export function packLightShadow(
  f32: Float32Array,
  u32: Uint32Array,
  lightIndex: number,
  lightFloats: number,
  viewProj: Float32Array,                      // 16 floats
  atlasU: number, atlasV: number,              // atlas rect offset
  atlasW: number, atlasH: number,              // atlas rect scale
  bias: number, normalBias: number,
  softness: number, flags: number,
): void {
  const base = lightIndex * lightFloats;
  // shadowBias / shadowNormalBias (floats 14-15)
  f32[base + 14] = bias;
  f32[base + 15] = normalBias;
  // shadowViewProj (floats 16-31)
  f32.set(viewProj, base + 16);
  // shadowAtlasRect (floats 32-35)
  f32[base + 32] = atlasU;
  f32[base + 33] = atlasV;
  f32[base + 34] = atlasW;
  f32[base + 35] = atlasH;
  // shadowSoftness + shadowFlags (floats 36-37)
  f32[base + 36] = softness;
  u32[base + 37] = flags;
}

/** Pack cluster config into staging. Layout matches ClusterConfig (48 bytes). */
export function packClusterConfig(
  f32: Float32Array,
  u32: Uint32Array,
  gridX: number, gridY: number, gridZ: number, tileSize: number,
  near: number, far: number,
  vpW: number, vpH: number,
  invProjX: number, invProjY: number,
): void {
  u32[0] = gridX;
  u32[1] = gridY;
  u32[2] = gridZ;
  u32[3] = tileSize;
  const logFarNear = Math.log(far / near);
  f32[4] = near;
  f32[5] = far;
  f32[6] = gridZ / logFarNear;     // sliceBias
  f32[7] = 1.0 / logFarNear;       // sliceScale
  u32[8] = vpW;
  u32[9] = vpH;
  f32[10] = invProjX;
  f32[11] = invProjY;
}
