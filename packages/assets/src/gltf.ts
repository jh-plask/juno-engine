import { EngineError } from '@engine/engine/errors.js';
import type { AttemptResultAsync } from '@engine/engine/attempt.js';

/**
 * Placeholder for future glTF loading support.
 * Will parse .glb/.gltf files and return mesh, material, and texture data
 * ready for registration into the asset registries.
 */
export async function loadGltf(
  _url: string,
): AttemptResultAsync<EngineError, void> {
  return [
    new EngineError('ASSET_LOAD_FAILED', 'glTF loading not yet implemented'),
    null,
  ];
}
