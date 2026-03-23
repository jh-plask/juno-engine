import { describe, it, expect, vi } from 'vitest';
import {
  createStagedBuffer,
  packCamera,
  packLightConstants,
  packClusterConfig,
} from '../src/stagedBuffer.js';

// ── createStagedBuffer ──────────────────────────────────────────────────────

describe('createStagedBuffer', () => {
  function mockDevice() {
    return {
      queue: {
        writeBuffer: vi.fn(),
      },
    } as unknown as GPUDevice;
  }

  function mockGpuBuffer() {
    return {} as GPUBuffer;
  }

  it('creates views with correct byte capacity', () => {
    const device = mockDevice();
    const gpuBuf = mockGpuBuffer();
    const staged = createStagedBuffer(device, gpuBuf, 256);

    expect(staged.byteCapacity).toBe(256);
    expect(staged.f32.byteLength).toBe(256);
    expect(staged.u32.byteLength).toBe(256);
    expect(staged.u8.byteLength).toBe(256);
    expect(staged.f32.length).toBe(64);   // 256 / 4
    expect(staged.u32.length).toBe(64);
  });

  it('f32 and u32 share the same underlying ArrayBuffer', () => {
    const device = mockDevice();
    const gpuBuf = mockGpuBuffer();
    const staged = createStagedBuffer(device, gpuBuf, 128);

    expect(staged.f32.buffer).toBe(staged.u32.buffer);
    expect(staged.u8.buffer).toBe(staged.f32.buffer);

    // Writing via f32 should be visible via u32 and vice versa
    staged.u32[0] = 42;
    const dv = new DataView(staged.f32.buffer);
    expect(dv.getUint32(0, true)).toBe(42);
  });

  it('flush(0) is a no-op and does not call writeBuffer', () => {
    const device = mockDevice();
    const gpuBuf = mockGpuBuffer();
    const staged = createStagedBuffer(device, gpuBuf, 64);

    staged.flush(0);

    expect(device.queue.writeBuffer).not.toHaveBeenCalled();
  });

  it('flush() with bytes > 0 calls writeBuffer', () => {
    const device = mockDevice();
    const gpuBuf = mockGpuBuffer();
    const staged = createStagedBuffer(device, gpuBuf, 64);

    staged.flush(32);

    expect(device.queue.writeBuffer).toHaveBeenCalledOnce();
    expect(device.queue.writeBuffer).toHaveBeenCalledWith(
      gpuBuf, 0, expect.any(ArrayBuffer), 0, 32,
    );
  });

  it('flush() without arguments uploads entire capacity', () => {
    const device = mockDevice();
    const gpuBuf = mockGpuBuffer();
    const staged = createStagedBuffer(device, gpuBuf, 128);

    staged.flush();

    expect(device.queue.writeBuffer).toHaveBeenCalledWith(
      gpuBuf, 0, expect.any(ArrayBuffer), 0, 128,
    );
  });

  it('exposes the gpuBuffer reference', () => {
    const device = mockDevice();
    const gpuBuf = mockGpuBuffer();
    const staged = createStagedBuffer(device, gpuBuf, 64);

    expect(staged.gpuBuffer).toBe(gpuBuf);
  });
});

// ── packCamera ──────────────────────────────────────────────────────────────

describe('packCamera', () => {
  // 224 bytes = 56 floats
  const buf = new ArrayBuffer(224);
  const f32 = new Float32Array(buf);
  const u32 = new Uint32Array(buf);

  const identity = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);

  const viewMat = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    -5, -3, -10, 1,
  ]);

  const projMat = new Float32Array([
    2, 0, 0, 0,
    0, 3, 0, 0,
    0, 0, -1, -1,
    0, 0, -0.2, 0,
  ]);

  const viewProjMat = new Float32Array([
    0.5, 0, 0, 0,
    0, 0.5, 0, 0,
    0, 0, -0.5, -1,
    0, 0, -0.1, 0,
  ]);

  beforeEach(() => {
    f32.fill(0);
  });

  it('writes view matrix at offset 0 (16 floats)', () => {
    packCamera(f32, u32, viewMat, identity, identity, 0, 0, 0, 1, 1, 0, 0);

    for (let i = 0; i < 16; i++) {
      expect(f32[i]).toBe(viewMat[i]!);
    }
  });

  it('writes proj matrix at offset 16', () => {
    packCamera(f32, u32, identity, projMat, identity, 0, 0, 0, 1, 1, 0, 0);

    for (let i = 0; i < 16; i++) {
      expect(f32[16 + i]).toBe(projMat[i]!);
    }
  });

  it('writes viewProj matrix at offset 32', () => {
    packCamera(f32, u32, identity, identity, viewProjMat, 0, 0, 0, 1, 1, 0, 0);

    for (let i = 0; i < 16; i++) {
      expect(f32[32 + i]).toBe(viewProjMat[i]!);
    }
  });

  it('writes eye position at offsets 48-50, w=1 at 51', () => {
    packCamera(f32, u32, identity, identity, identity, 7, 11, -3, 1, 1, 0, 0);

    expect(f32[48]).toBe(7);
    expect(f32[49]).toBe(11);
    expect(f32[50]).toBe(-3);
    expect(f32[51]).toBe(1);  // w component always 1
  });

  it('writes viewport width/height as u32 at offsets 52-53', () => {
    packCamera(f32, u32, identity, identity, identity, 0, 0, 0, 1920, 1080, 0, 0);

    expect(u32[52]).toBe(1920);
    expect(u32[53]).toBe(1080);
  });

  it('writes time and frame at offsets 54-55', () => {
    packCamera(f32, u32, identity, identity, identity, 0, 0, 0, 1, 1, 3.14, 42);

    expect(f32[54]).toBeCloseTo(3.14);
    expect(u32[55]).toBe(42);
  });
});

// ── packLightConstants ──────────────────────────────────────────────────────

describe('packLightConstants', () => {
  const buf = new ArrayBuffer(16);
  const f32 = new Float32Array(buf);
  const u32 = new Uint32Array(buf);

  beforeEach(() => {
    f32.fill(0);
  });

  it('writes ambientColor.rgb at f32 offsets 0-2', () => {
    packLightConstants(f32, u32, 5, 0.2, 0.3, 0.4);

    expect(f32[0]).toBeCloseTo(0.2);
    expect(f32[1]).toBeCloseTo(0.3);
    expect(f32[2]).toBeCloseTo(0.4);
  });

  it('writes numLights as u32 at offset 3', () => {
    packLightConstants(f32, u32, 7, 0, 0, 0);

    expect(u32[3]).toBe(7);
  });
});

// ── packClusterConfig ───────────────────────────────────────────────────────

describe('packClusterConfig', () => {
  // 48 bytes = 12 u32/f32
  const buf = new ArrayBuffer(48);
  const f32 = new Float32Array(buf);
  const u32 = new Uint32Array(buf);

  beforeEach(() => {
    f32.fill(0);
  });

  it('writes gridSize xyz as u32 at offsets 0-2', () => {
    packClusterConfig(f32, u32, 20, 12, 24, 64, 0.1, 100, 1280, 720, 1, 1);

    expect(u32[0]).toBe(20);
    expect(u32[1]).toBe(12);
    expect(u32[2]).toBe(24);
  });

  it('writes tileSize as u32 at offset 3', () => {
    packClusterConfig(f32, u32, 20, 12, 24, 64, 0.1, 100, 1280, 720, 1, 1);

    expect(u32[3]).toBe(64);
  });

  it('writes near/far at f32 offsets 4-5', () => {
    packClusterConfig(f32, u32, 20, 12, 24, 64, 0.5, 500, 1280, 720, 1, 1);

    expect(f32[4]).toBeCloseTo(0.5);
    expect(f32[5]).toBeCloseTo(500);
  });

  it('writes sliceBias = gridZ / log(far/near) at offset 6', () => {
    const near = 0.1;
    const far = 100;
    const gridZ = 24;
    packClusterConfig(f32, u32, 20, 12, gridZ, 64, near, far, 1280, 720, 1, 1);

    const expected = gridZ / Math.log(far / near);
    expect(f32[6]).toBeCloseTo(expected);
  });

  it('writes sliceScale = 1 / log(far/near) at offset 7', () => {
    const near = 0.1;
    const far = 100;
    packClusterConfig(f32, u32, 20, 12, 24, 64, near, far, 1280, 720, 1, 1);

    const expected = 1.0 / Math.log(far / near);
    expect(f32[7]).toBeCloseTo(expected);
  });

  it('writes viewport w/h as u32 at offsets 8-9', () => {
    packClusterConfig(f32, u32, 20, 12, 24, 64, 0.1, 100, 1920, 1080, 1, 1);

    expect(u32[8]).toBe(1920);
    expect(u32[9]).toBe(1080);
  });

  it('writes invProjX/Y at f32 offsets 10-11', () => {
    packClusterConfig(f32, u32, 20, 12, 24, 64, 0.1, 100, 1280, 720, 0.75, 1.33);

    expect(f32[10]).toBeCloseTo(0.75);
    expect(f32[11]).toBeCloseTo(1.33);
  });
});
