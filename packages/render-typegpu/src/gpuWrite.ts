/**
 * Zero-copy GPU buffer writers.
 *
 * Bypasses TypeGPU's compiled writer (which requires {x,y,z,w} object creation)
 * by writing flat Float32Array / Uint32Array data directly via queue.writeBuffer().
 * Only used for hot-path per-frame writes (instances, camera). Cold-path writes
 * (materials, meshes) still use TypeGPU's .write() via gpuData.ts types.
 *
 * The byte layouts here must match the WGSL struct layouts defined in schemas.ts.
 * InstanceGpu: 80 bytes = 4×vec4f (64B model) + 4×u32 (16B metadata), 16-byte aligned.
 * CameraUniform: 224 bytes = 3×mat4x4f (192B) + vec4f(16B) + vec2u(8B) + f32(4B) + u32(4B).
 */

/** InstanceGpu stride in bytes / float count */
export const INSTANCE_STRIDE = 80;
export const INSTANCE_FLOATS = 20;

export interface InstanceWriter {
  /** Float32 view into staging buffer (for model matrix copies). */
  f32: Float32Array;
  /** Uint32 view into staging buffer (for metadata packing). */
  u32: Uint32Array;
  /** Flush `count` instances to the GPU. Only writes count * 80 bytes. */
  flush(count: number): void;
}

export function createInstanceWriter(
  device: GPUDevice,
  gpuBuffer: GPUBuffer,
  maxInstances: number,
): InstanceWriter {
  const staging = new ArrayBuffer(maxInstances * INSTANCE_STRIDE);
  const f32 = new Float32Array(staging);
  const u32 = new Uint32Array(staging);

  return {
    f32,
    u32,
    flush(count: number) {
      if (count > 0) {
        device.queue.writeBuffer(gpuBuffer, 0, staging, 0, count * INSTANCE_STRIDE);
      }
    },
  };
}

export interface CameraWriter {
  write(
    view: Float32Array, proj: Float32Array, viewProj: Float32Array,
    eyeX: number, eyeY: number, eyeZ: number,
    vpW: number, vpH: number,
    time: number, frame: number,
  ): void;
}

export function createCameraWriter(
  device: GPUDevice,
  gpuBuffer: GPUBuffer,
): CameraWriter {
  // CameraUniform: 224 bytes = 56 floats
  const staging = new Float32Array(56);
  const u32view = new Uint32Array(staging.buffer);

  return {
    write(view, proj, viewProj, eyeX, eyeY, eyeZ, vpW, vpH, time, frame) {
      // mat4x4f × 3: bytes 0-191 (48 floats each at offset 0, 16, 32)
      staging.set(view, 0);
      staging.set(proj, 16);
      staging.set(viewProj, 32);
      // eye (vec4f): bytes 192-207
      staging[48] = eyeX;
      staging[49] = eyeY;
      staging[50] = eyeZ;
      staging[51] = 1;
      // viewport (vec2u): bytes 208-215
      u32view[52] = vpW;
      u32view[53] = vpH;
      // time (f32): bytes 216-219
      staging[54] = time;
      // frame (u32): bytes 220-223
      u32view[55] = frame;

      device.queue.writeBuffer(gpuBuffer, 0, staging);
    },
  };
}
