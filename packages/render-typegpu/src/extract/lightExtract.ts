import { query, asBuffer } from 'bitecs';
import type { EngineWorld } from '@engine/engine/types.js';
import {
  DirectionalLight,
  Light,
  PointLight,
  SpotLight,
  WorldTransform,
} from '@engine/ecs/components.js';
import { LIGHT_FLOATS } from '../schemas.js';
import {
  LIGHT_TYPE_DIRECTIONAL,
  LIGHT_TYPE_POINT,
  LIGHT_TYPE_SPOT,
} from '../schemas.js';

export interface LightExtract {
  lightCount: number;
}

export function createLightExtract(): LightExtract {
  return { lightCount: 0 };
}

/**
 * Extract all light entities into GPU-ready staging buffers.
 *
 * Layout per light (192 bytes = 48 floats, matches LightGpu):
 *   [0-2]   position (vec3f)
 *   [3]     lightType (u32)
 *   [4-6]   color (vec3f)
 *   [7]     intensity (f32)
 *   [8-10]  direction (vec3f)
 *   [11]    radius (f32)
 *   [12]    innerConeAngle (f32)
 *   [13]    outerConeAngle (f32)
 *   [14]    shadowBias (f32)
 *   [15]    shadowNormalBias (f32)
 *   [16-31] shadowViewProj (mat4x4f, 16 floats)
 *   [32-35] shadowAtlasRect (vec4f)
 *   [36]    shadowSoftness (f32)
 *   [37]    shadowFlags (u32)
 *   [38-39] padding
 *   [40-47] padding (alignment to 192 bytes)
 *
 * Shadow fields [14-39] are zeroed here. The renderer fills them
 * via packLightShadow() after shadow allocation runs.
 */

/** Write core light fields (0-13) into staging. Shadow fields are zeroed. */
function packLightCore(
  staging: Float32Array,
  u32staging: Uint32Array,
  base: number,
  posX: number, posY: number, posZ: number,
  lightType: number,
  r: number, g: number, b: number,
  intensity: number,
  dirX: number, dirY: number, dirZ: number,
  radius: number,
  innerCone: number, outerCone: number,
): void {
  staging[base + 0] = posX;
  staging[base + 1] = posY;
  staging[base + 2] = posZ;
  u32staging[base + 3] = lightType;
  staging[base + 4] = r;
  staging[base + 5] = g;
  staging[base + 6] = b;
  staging[base + 7] = intensity;
  staging[base + 8] = dirX;
  staging[base + 9] = dirY;
  staging[base + 10] = dirZ;
  staging[base + 11] = radius;
  staging[base + 12] = innerCone;
  staging[base + 13] = outerCone;

  // Zero shadow fields (14-47). The renderer fills these after shadow allocation.
  for (let j = 14; j < LIGHT_FLOATS; j++) {
    staging[base + j] = 0;
  }
}

export function extractLights(
  world: EngineWorld,
  out: LightExtract,
  staging: Float32Array,
  u32staging: Uint32Array,
): void {
  let count = 0;

  // Point lights
  const points = query(
    world as Parameters<typeof query>[0],
    [PointLight, Light, WorldTransform],
    asBuffer,
  );
  for (let i = 0; i < points.length; i++) {
    const eid = points[i]!;
    const wbase = eid * 16;
    packLightCore(
      staging, u32staging, count * LIGHT_FLOATS,
      WorldTransform.m[wbase + 12]!, WorldTransform.m[wbase + 13]!, WorldTransform.m[wbase + 14]!,
      LIGHT_TYPE_POINT,
      Light.colorR[eid]!, Light.colorG[eid]!, Light.colorB[eid]!,
      Light.intensity[eid]!,
      0, 0, 0,
      Light.radius[eid]!,
      0, 0,
    );
    count++;
  }

  // Spot lights
  const spots = query(
    world as Parameters<typeof query>[0],
    [SpotLight, Light, WorldTransform],
    asBuffer,
  );
  for (let i = 0; i < spots.length; i++) {
    const eid = spots[i]!;
    const wbase = eid * 16;
    packLightCore(
      staging, u32staging, count * LIGHT_FLOATS,
      WorldTransform.m[wbase + 12]!, WorldTransform.m[wbase + 13]!, WorldTransform.m[wbase + 14]!,
      LIGHT_TYPE_SPOT,
      Light.colorR[eid]!, Light.colorG[eid]!, Light.colorB[eid]!,
      Light.intensity[eid]!,
      Light.dirX[eid]!, Light.dirY[eid]!, Light.dirZ[eid]!,
      Light.radius[eid]!,
      Light.innerConeAngle[eid]!, Light.outerConeAngle[eid]!,
    );
    count++;
  }

  // Directional lights
  const dirs = query(
    world as Parameters<typeof query>[0],
    [DirectionalLight, Light, WorldTransform],
    asBuffer,
  );
  for (let i = 0; i < dirs.length; i++) {
    const eid = dirs[i]!;
    packLightCore(
      staging, u32staging, count * LIGHT_FLOATS,
      0, 0, 0,
      LIGHT_TYPE_DIRECTIONAL,
      Light.colorR[eid]!, Light.colorG[eid]!, Light.colorB[eid]!,
      Light.intensity[eid]!,
      Light.dirX[eid]!, Light.dirY[eid]!, Light.dirZ[eid]!,
      0,
      0, 0,
    );
    count++;
  }

  out.lightCount = count;
}
