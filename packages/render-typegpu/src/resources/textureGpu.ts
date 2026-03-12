import type { TgpuRoot } from '../gpu.js';

/**
 * Creates a base color texture from an ImageBitmap, with automatic mipmap generation.
 * Wraps TypeGPU's unstable texture API -- never expose outside this package.
 */
export function createBaseColorTexture(root: TgpuRoot, image: ImageBitmap) {
  const mipLevelCount =
    Math.floor(Math.log2(Math.max(image.width, image.height))) + 1;

  const texture = (root as any)['~unstable']
    .createTexture({
      size: [image.width, image.height],
      format: 'rgba8unorm',
      mipLevelCount,
    })
    .$usage('sampled', 'render');

  texture.write(image);
  texture.generateMipmaps();

  return texture;
}
