// @ts-nocheck -- Shader function bodies use GPU operations (mat*vec, swizzle)
// that are compiled by unplugin-typegpu at bundle time, not executable JS.
import tgpu, { d, std } from 'typegpu';
import { builtin } from 'typegpu/data';
import type { TgpuRoot } from '../gpu.js';
import { SceneGroup, LightingGroup } from '../layouts.js';
import { MeshVertexLayout } from '../resources/meshGpu.js';
import {
  LIGHT_TYPE_POINT,
  LIGHT_TYPE_SPOT,
  LIGHT_TYPE_DIRECTIONAL,
} from '../schemas.js';
import {
  evaluatePBR,
  attenuationWindowed,
  attenuationSpot,
  linearToSrgb,
} from '../shaders/brdf.js';
import { clusterIndex, linearizeDepth } from '../shaders/clusterMath.js';

// ── Vertex shader ────────────────────────────────────────────────────────────

const vertexFn = tgpu.vertexFn({
  in: {
    position: d.location(0, d.vec3f),
    normal: d.location(1, d.vec3f),
    uv: d.location(2, d.vec2f),
    tangent: d.location(3, d.vec4f),
    instanceIndex: builtin.instanceIndex,
  },
  out: {
    pos: builtin.position,
    worldPos: d.vec3f,
    normal: d.vec3f,
    uv: d.vec2f,
    materialIdx: d.interpolate('flat, either', d.u32),
  },
})((input) => {
  const instance = SceneGroup.$.instances[input.instanceIndex];
  const camera = SceneGroup.$.camera;

  const model = d.mat4x4f(
    instance.model0,
    instance.model1,
    instance.model2,
    instance.model3,
  );

  const worldPos = model * d.vec4f(input.position, 1.0);
  const clipPos = camera.viewProj * worldPos;
  const worldNormal = std.normalize((model * d.vec4f(input.normal, 0.0)).xyz);

  return {
    pos: clipPos,
    worldPos: worldPos.xyz,
    normal: worldNormal,
    uv: input.uv,
    materialIdx: instance.material,
  };
});

// ── Per-light evaluation helpers ─────────────────────────────────────────────

const evaluateDirectionalLight = tgpu.fn([
  d.vec3f, d.vec3f,         // N, V
  d.vec3f, d.vec3f, d.f32,  // albedo, f0, roughness
  d.vec3f, d.f32, d.vec3f,  // light.color, light.intensity, light.direction
  d.f32,                     // shadowFactor
], d.vec3f)
  ((N, V, albedo, f0, roughness, lightColor, lightIntensity, lightDir, shadowFactor) => {
    const L = std.normalize(d.vec3f(0.0) - lightDir);
    const radiance = lightColor * lightIntensity * shadowFactor;
    return evaluatePBR(N, V, L, radiance, albedo, f0, roughness);
  });

const evaluatePointLightContrib = tgpu.fn([
  d.vec3f, d.vec3f, d.vec3f,     // N, V, worldPos
  d.vec3f, d.vec3f, d.f32,       // albedo, f0, roughness
  d.vec3f, d.vec3f, d.f32, d.f32, // light.position, light.color, light.intensity, light.radius
  d.f32,                          // shadowFactor
], d.vec3f)
  ((N, V, worldPos, albedo, f0, roughness, lightPos, lightColor, lightIntensity, lightRadius, shadowFactor) => {
    const toLight = lightPos - worldPos;
    const dist = std.length(toLight);
    const L = toLight / dist;
    const att = attenuationWindowed(dist, lightRadius);
    const radiance = lightColor * lightIntensity * att * shadowFactor;
    return evaluatePBR(N, V, L, radiance, albedo, f0, roughness);
  });

const evaluateSpotLightContrib = tgpu.fn([
  d.vec3f, d.vec3f, d.vec3f,     // N, V, worldPos
  d.vec3f, d.vec3f, d.f32,       // albedo, f0, roughness
  d.vec3f, d.vec3f, d.f32, d.f32, // light.position, light.color, light.intensity, light.radius
  d.vec3f, d.f32, d.f32,          // light.direction, innerCone, outerCone
  d.f32,                          // shadowFactor
], d.vec3f)
  ((N, V, worldPos, albedo, f0, roughness, lightPos, lightColor, lightIntensity, lightRadius, lightDir, innerCone, outerCone, shadowFactor) => {
    const toLight = lightPos - worldPos;
    const dist = std.length(toLight);
    const L = toLight / dist;
    const att = attenuationWindowed(dist, lightRadius);
    const cosAngle = std.dot(d.vec3f(0.0) - L, std.normalize(lightDir));
    const spotAtt = attenuationSpot(cosAngle, innerCone, outerCone);
    const radiance = lightColor * lightIntensity * att * spotAtt * shadowFactor;
    return evaluatePBR(N, V, L, radiance, albedo, f0, roughness);
  });

// ── Shadow sampling (inline — needs LightingGroup.$ for texture/sampler) ─────

const GOLDEN_ANGLE = 2.399963;

const interleavedGradientNoise = tgpu.fn([d.vec2f], d.f32)
  ((pos) => {
    return std.fract(52.9829189 * std.fract(std.dot(pos, d.vec2f(0.06711056, 0.00583715))));
  });

const vogelDiskSample = tgpu.fn([d.u32, d.u32, d.f32], d.vec2f)
  ((sampleIndex, sampleCount, phi) => {
    const r = std.sqrt((d.f32(sampleIndex) + 0.5) / d.f32(sampleCount));
    const theta = d.f32(sampleIndex) * GOLDEN_ANGLE + phi;
    return d.vec2f(r * std.cos(theta), r * std.sin(theta));
  });

/**
 * Evaluate shadow for a light. Returns 1.0 (fully lit) if shadow disabled,
 * 0.0-1.0 PCF shadow factor otherwise.
 *
 * Uses textureSampleCompareLevel (non-uniform-flow safe) to sample the
 * shadow atlas depth texture with the comparison sampler from LightingGroup.
 *
 * Branchless: shadowFlags bit 0 selects between 1.0 and PCF result via mix().
 * Single return path (TypeGPU constraint).
 */
const evaluateShadow = tgpu.fn([
  d.vec3f,       // worldPos
  d.vec3f,       // normal (for normal offset bias)
  d.mat4x4f,     // shadowViewProj
  d.vec4f,       // shadowAtlasRect
  d.f32,         // shadowBias
  d.f32,         // shadowNormalBias
  d.f32,         // shadowSoftness
  d.u32,         // shadowFlags
  d.vec2f,       // screenPos (for noise)
], d.f32)
  ((worldPos, normal, shadowVP, atlasRect, bias, normalBias, softness, flags, screenPos) => {
    // Normal offset bias: push sample point along normal to reduce acne
    // on surfaces facing away from the light
    const biasedPos = worldPos + normal * normalBias;

    // Project biased position into shadow clip space
    const clipPos = shadowVP * d.vec4f(biasedPos, 1.0);
    const ndc = clipPos.xyz / clipPos.w;

    // NDC to UV [0, 1]
    const shadowU = ndc.x * 0.5 + 0.5;
    const shadowV = 1.0 - (ndc.y * 0.5 + 0.5);

    // Map to atlas rect
    const atlasUV = d.vec2f(
      atlasRect.x + shadowU * atlasRect.z,
      atlasRect.y + shadowV * atlasRect.w,
    );

    const refDepth = ndc.z - bias;

    // Bounds check (branchless)
    const inBounds = std.step(0.0, shadowU) * std.step(shadowU, 1.0)
                   * std.step(0.0, shadowV) * std.step(shadowV, 1.0)
                   * std.step(0.0, clipPos.w);

    // 8-tap Vogel disk PCF with per-pixel rotation
    const SAMPLES = d.u32(8);
    const phi = interleavedGradientNoise(screenPos) * GOLDEN_ANGLE;
    const texelScale = softness / 2048.0;

    let shadow = d.f32(0.0);
    for (let i = d.u32(0); i < SAMPLES; i += 1) {
      const offset = vogelDiskSample(i, SAMPLES, phi) * texelScale;
      shadow = shadow + std.textureSampleCompareLevel(
        LightingGroup.$.shadowAtlas,
        LightingGroup.$.shadowSampler,
        atlasUV + offset,
        refDepth,
      );
    }
    shadow = shadow / d.f32(SAMPLES);

    const hasFlag = std.step(0.5, d.f32(flags));

    // DEBUG — force 30% brightness for shadow-enabled lights
    return std.mix(1.0, 0.3, hasFlag);
  });

// ── Fragment shader ──────────────────────────────────────────────────────────

const fragmentFn = tgpu.fragmentFn({
  in: {
    fragCoord: builtin.position,
    worldPos: d.vec3f,
    normal: d.vec3f,
    uv: d.vec2f,
    materialIdx: d.interpolate('flat, either', d.u32),
  },
  out: d.vec4f,
})((input) => {
  const material = SceneGroup.$.materials[input.materialIdx];
  const camera = SceneGroup.$.camera;
  const constants = LightingGroup.$.lightConstants;
  const config = LightingGroup.$.clusterConfig;

  // Surface parameters (metallic-roughness workflow)
  const baseColor = material.baseColor.rgb;
  const metalness = material.metalness;
  const roughness = std.max(material.roughness, 0.04);

  // Derived PBR parameters
  const albedo = baseColor * (1.0 - metalness);
  const f0 = std.mix(d.vec3f(0.04), baseColor, metalness);

  const N = std.normalize(input.normal);
  const V = std.normalize(camera.eye.xyz - input.worldPos);

  // ── Cluster lookup ───────────────────────────────────────────────────────
  const linZ = linearizeDepth(input.fragCoord.z, config.near, config.far);
  const cIdx = clusterIndex(
    input.fragCoord.xy, linZ,
    config.gridSize, config.tileSize, config.near, config.sliceBias,
  );
  const gridEntry = LightingGroup.$.lightGrid[cIdx];
  const clusterLightCount = gridEntry.y;

  // ── Accumulate lighting from cluster's light list ────────────────────────
  let color = d.vec3f(0.0, 0.0, 0.0);

  for (let li = d.u32(0); li < clusterLightCount; li += 1) {
    const light = LightingGroup.$.lights[LightingGroup.$.lightIndexList[gridEntry.x + li]];

    // Shadow evaluation — inlined in fragment shader because TypeGPU has issues
    // passing u32 parameters to tgpu.fn functions.
    const hasFlag = std.step(0.5, d.f32(light.shadowFlags));
    const biasedPos = input.worldPos + N * light.shadowNormalBias;
    const shadowClip = light.shadowViewProj * d.vec4f(biasedPos, 1.0);
    const shadowNdc = shadowClip.xyz / shadowClip.w;
    const shadowU = shadowNdc.x * 0.5 + 0.5;
    const shadowV = 1.0 - (shadowNdc.y * 0.5 + 0.5);
    const shadowAtlasUV = d.vec2f(
      light.shadowAtlasRect.x + shadowU * light.shadowAtlasRect.z,
      light.shadowAtlasRect.y + shadowV * light.shadowAtlasRect.w,
    );
    const refDepth = shadowNdc.z - light.shadowBias;
    const inBounds = std.step(0.0, shadowU) * std.step(shadowU, 1.0)
                   * std.step(0.0, shadowV) * std.step(shadowV, 1.0)
                   * std.step(0.0, shadowClip.w);

    // 8-tap Vogel disk PCF with per-pixel rotation (inline — tgpu.fn has u32 param bugs)
    const pcfPhi = interleavedGradientNoise(input.fragCoord.xy) * GOLDEN_ANGLE;
    const pcfTexelScale = light.shadowSoftness / 2048.0;

    let shadowAccum = d.f32(0.0);
    for (let si = d.u32(0); si < d.u32(8); si += 1) {
      const pcfOffset = vogelDiskSample(si, d.u32(8), pcfPhi) * pcfTexelScale;
      shadowAccum = shadowAccum + std.textureSampleCompareLevel(
        LightingGroup.$.shadowAtlas,
        LightingGroup.$.shadowSampler,
        shadowAtlasUV + pcfOffset,
        refDepth,
      );
    }
    const shadowSample = shadowAccum / 8.0;

    const sf = std.mix(1.0, std.mix(1.0, shadowSample, inBounds), hasFlag);

    if (light.lightType === LIGHT_TYPE_DIRECTIONAL) {
      color = color + evaluateDirectionalLight(
        N, V, albedo, f0, roughness,
        light.color, light.intensity, light.direction, sf,
      );
    } else if (light.lightType === LIGHT_TYPE_POINT) {
      color = color + evaluatePointLightContrib(
        N, V, input.worldPos, albedo, f0, roughness,
        light.position, light.color, light.intensity, light.radius, sf,
      );
    } else {
      color = color + evaluateSpotLightContrib(
        N, V, input.worldPos, albedo, f0, roughness,
        light.position, light.color, light.intensity, light.radius,
        light.direction, light.innerConeAngle, light.outerConeAngle, sf,
      );
    }
  }

  // Ambient
  const ambientDiffuse = constants.ambientColor * albedo;
  const ambientSpecular = constants.ambientColor * f0 * 0.5;
  color = color + ambientDiffuse + ambientSpecular;

  // Linear → sRGB gamma correction
  color = linearToSrgb(color);

  return d.vec4f(color, material.baseColor.a);
});

// ── Pipeline ─────────────────────────────────────────────────────────────────

export function createStaticMeshPipeline(root: TgpuRoot, sampleCount: 1 | 4 = 1) {
  return root.createRenderPipeline({
    vertex: vertexFn,
    fragment: fragmentFn,
    attribs: MeshVertexLayout.attrib,
    primitive: {
      topology: 'triangle-list',
      cullMode: 'back',
    },
    depthStencil: {
      format: 'depth24plus',
      depthWriteEnabled: true,
      depthCompare: 'less',
    },
    multisample: { count: sampleCount },
  });
}
