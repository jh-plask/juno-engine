// @ts-nocheck -- GPU function bodies use vector/scalar operations
// compiled by unplugin-typegpu at bundle time, not executable as JS.

/**
 * Physically-based rendering BRDF kernels.
 *
 * Industry-standard Cook-Torrance microfacet model matching
 * Filament, UE4, and Frostbite implementations:
 *   D: GGX/Trowbridge-Reitz NDF
 *   V: Smith height-correlated visibility (fast approximation, no sqrt)
 *   F: Schlick Fresnel approximation
 *   Diffuse: Lambertian (1/PI)
 *   Attenuation: Frostbite/Filament windowed inverse-square
 *
 * Each function is a standalone tgpu.fn that compiles to a WGSL function.
 * They compose into evaluatePBR and the per-light-type evaluators.
 */

import tgpu, { d, std } from 'typegpu';

const PI = 3.14159265359;
const INV_PI = 1.0 / PI;
const MIN_DIST_SQ = 0.0001; // 1cm^2 singularity guard

// ── Core BRDF terms ──────────────────────────────────────────────────────────

/**
 * GGX/Trowbridge-Reitz Normal Distribution Function.
 *
 * D(h, α²) = α² / (π * ((n·h)² * (α² − 1) + 1)²)
 */
export const D_GGX = tgpu.fn([d.f32, d.f32], d.f32)
  ((NoH, a2) => {
    const denom = NoH * NoH * (a2 - 1.0) + 1.0;
    return a2 / (PI * denom * denom);
  });

/**
 * Smith height-correlated visibility function (Filament fast approximation).
 *
 * Avoids two sqrt operations by using the linear approximation.
 * Returns the combined geometry/visibility term including the 1/(4*NoV*NoL) factor.
 */
export const V_SmithGGXCorrelated = tgpu.fn([d.f32, d.f32, d.f32], d.f32)
  ((NoV, NoL, a) => {
    const GGXV = NoL * (NoV * (1.0 - a) + a);
    const GGXL = NoV * (NoL * (1.0 - a) + a);
    return 0.5 / (GGXV + GGXL + 0.0001);
  });

/**
 * Schlick Fresnel approximation.
 *
 * F(θ, f0) = f0 + (1 − f0) * (1 − cos θ)^5
 */
export const F_Schlick = tgpu.fn([d.f32, d.vec3f], d.vec3f)
  ((u, f0) => {
    const f = std.pow(1.0 - u, 5.0);
    return f0 + (d.vec3f(1.0) - f0) * f;
  });

// ── Attenuation ──────────────────────────────────────────────────────────────

/**
 * Frostbite/Filament windowed inverse-square attenuation.
 *
 * att = saturate(1 − (d/r)^4)^2 / max(d², ε²)
 *
 * Preserves physically correct inverse-square falloff within the light's
 * radius while smoothly reaching zero at the boundary.
 */
export const attenuationWindowed = tgpu.fn([d.f32, d.f32], d.f32)
  ((distance, radius) => {
    const d2 = distance * distance;
    const dr = distance / radius;
    const dr2 = dr * dr;
    const dr4 = dr2 * dr2;
    const falloff = std.saturate(1.0 - dr4);
    return (falloff * falloff) / std.max(d2, MIN_DIST_SQ);
  });

/**
 * Spot light angular attenuation.
 *
 * Smooth falloff between inner and outer cone angles.
 * innerCos/outerCos are pre-computed cosines of the half-angles.
 */
export const attenuationSpot = tgpu.fn([d.f32, d.f32, d.f32], d.f32)
  ((cosAngle, innerCos, outerCos) => {
    return std.saturate((cosAngle - outerCos) / (innerCos - outerCos + 0.0001));
  });

// ── Tone mapping & color space ───────────────────────────────────────────────

/** Linear → sRGB gamma curve (per-channel). */
export const linearToSrgb = tgpu.fn([d.vec3f], d.vec3f)
  ((linear) => {
    // Exact sRGB transfer: threshold at 0.0031308
    // Simplified: pow(1/2.2) is close enough and cheaper
    const r = std.pow(std.saturate(linear.x), 1.0 / 2.2);
    const g = std.pow(std.saturate(linear.y), 1.0 / 2.2);
    const b = std.pow(std.saturate(linear.z), 1.0 / 2.2);
    return d.vec3f(r, g, b);
  });

// ── Composite evaluator ─────────────────────────────────────────────────────

/**
 * Evaluate Cook-Torrance BRDF for a single light contribution.
 *
 * @param N        - Surface normal (normalized)
 * @param V        - View direction (normalized, pointing toward camera)
 * @param L        - Light direction (normalized, pointing toward light)
 * @param radiance - Incoming light radiance (color * intensity * attenuation)
 * @param albedo   - Diffuse albedo (baseColor * (1 - metalness))
 * @param f0       - Specular reflectance at normal incidence
 * @param roughness - Perceptual roughness [0, 1]
 */
export const evaluatePBR = tgpu.fn([
  d.vec3f, d.vec3f, d.vec3f, d.vec3f,
  d.vec3f, d.vec3f, d.f32,
], d.vec3f)
  ((N, V, L, radiance, albedo, f0, roughness) => {
    const H = std.normalize(V + L);
    const NoL = std.saturate(std.dot(N, L));
    const NoH = std.saturate(std.dot(N, H));
    const NoV = std.saturate(std.dot(N, V));
    const VoH = std.saturate(std.dot(V, H));

    const a = roughness * roughness;
    const a2 = a * a;

    // Specular: D * V * F
    const Ds = D_GGX(NoH, a2);
    const Vis = V_SmithGGXCorrelated(NoV, NoL, a);
    const F = F_Schlick(VoH, f0);
    const specular = F * (Ds * Vis);

    // Diffuse: Lambertian with energy conservation
    const kD = (d.vec3f(1.0) - F) * INV_PI;
    const diffuse = albedo * kD;

    return (diffuse + specular) * radiance * NoL;
  });
