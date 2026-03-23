/**
 * Lighting subsystem — light extraction, buffer management.
 *
 * Follows the uniform subsystem pattern: create → extract → flush.
 * Manages the light buffer and light constants; the cluster system
 * handles the light grid and index list.
 */

import { d } from 'typegpu';
import type { EngineWorld } from '@engine/engine/types.js';
import type { TgpuRoot } from '../gpu.js';
import { LightGpu, LightConstants } from '../schemas.js';
import { createStagedBuffer, packLightConstants, type StagedBuffer } from '../stagedBuffer.js';
import { LIGHT_STRIDE } from '../schemas.js';
import {
  createLightExtract,
  extractLights,
  type LightExtract,
} from '../extract/lightExtract.js';

export interface LightingSystem {
  /** Light GPU buffer (storage, for bind groups). */
  readonly lightBuffer: ReturnType<TgpuRoot['createBuffer']>;
  /** Light constants GPU buffer (uniform, for bind groups). */
  readonly lightConstantsBuffer: ReturnType<TgpuRoot['createBuffer']>;
  /** Per-frame extraction result. */
  readonly lightFrame: LightExtract;
  /** Float32 view into light staging buffer (for shadow data injection). */
  readonly stagingF32: Float32Array;
  /** Uint32 view into light staging buffer (for shadow flags). */
  readonly stagingU32: Uint32Array;

  /** Extract light entities from ECS into staging. */
  extract(world: EngineWorld): void;
  /** Upload light data to GPU. */
  flush(ambientR: number, ambientG: number, ambientB: number): void;
}

export function createLightingSystem(
  root: TgpuRoot,
  maxLights: number,
): LightingSystem {
  const lightBuffer = root.createBuffer(d.arrayOf(LightGpu, maxLights)).$usage('storage');
  const lightConstantsBuffer = root.createBuffer(LightConstants).$usage('uniform');

  const lights = createStagedBuffer(root.device, lightBuffer.buffer, maxLights * LIGHT_STRIDE);
  const constants = createStagedBuffer(root.device, lightConstantsBuffer.buffer, 16);

  const lightFrame = createLightExtract();

  return {
    lightBuffer,
    lightConstantsBuffer,
    lightFrame,
    stagingF32: lights.f32,
    stagingU32: lights.u32,

    extract(world: EngineWorld) {
      extractLights(world, lightFrame, lights.f32, lights.u32);
    },

    flush(ambientR: number, ambientG: number, ambientB: number) {
      lights.flush(lightFrame.lightCount * LIGHT_STRIDE);
      packLightConstants(constants.f32, constants.u32, lightFrame.lightCount, ambientR, ambientG, ambientB);
      constants.flush();
    },
  };
}
