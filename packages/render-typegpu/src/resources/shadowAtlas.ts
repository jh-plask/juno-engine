/**
 * Shadow atlas — raw WebGPU texture creation.
 *
 * Uses raw WebGPU API (not TypeGPU unstable) to guarantee the same
 * GPUTexture is used for both the shadow depth pass (render attachment)
 * and the fragment shader sampling (bind group texture view).
 */

import type { TgpuRoot } from '../gpu.js';

export interface ShadowAtlasRect {
  u: number; v: number; w: number; h: number;
  pixelX: number; pixelY: number; pixelSize: number;
}

export function computeAtlasRects(lightCount: number, atlasSize: number): ShadowAtlasRect[] {
  if (lightCount === 0) return [];
  const cols = Math.ceil(Math.sqrt(lightCount));
  const rows = Math.ceil(lightCount / cols);
  const tileSize = Math.floor(atlasSize / Math.max(cols, rows));
  const uvScale = tileSize / atlasSize;
  const rects: ShadowAtlasRect[] = [];
  for (let i = 0; i < lightCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    rects.push({
      u: (col * tileSize) / atlasSize,
      v: (row * tileSize) / atlasSize,
      w: uvScale, h: uvScale,
      pixelX: col * tileSize, pixelY: row * tileSize, pixelSize: tileSize,
    });
  }
  return rects;
}

/**
 * Create shadow atlas as raw WebGPU resources.
 * Returns both the GPUTexture (for shadow depth pass) and GPUTextureView
 * (for bind group sampling) from the SAME texture.
 */
export function createShadowAtlasRaw(device: GPUDevice, size: number) {
  const texture = device.createTexture({
    size: [size, size],
    format: 'depth32float',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });

  const depthView = texture.createView({ label: 'shadow-atlas-depth' });
  const sampledView = texture.createView({ label: 'shadow-atlas-sampled' });

  return { texture, depthView, sampledView };
}

/**
 * Create a comparison sampler as raw WebGPU resource.
 */
export function createShadowSamplerRaw(device: GPUDevice) {
  return device.createSampler({
    compare: 'less',
    magFilter: 'linear',
    minFilter: 'linear',
  });
}
