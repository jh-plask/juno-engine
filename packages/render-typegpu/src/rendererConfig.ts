export interface RendererConfig {
  clearColor: { r: number; g: number; b: number; a: number };
  fov: number;
  near: number;
  far: number;
  maxInstances: number;
  maxMaterials: number;
  maxLights: number;
  ambientColor: { r: number; g: number; b: number };
  /** MSAA sample count (1 = off, 4 = 4x MSAA). WebGPU only supports 1 or 4. */
  msaa: 1 | 4;
  /** Shadow atlas resolution (width = height). Each light gets a tile. */
  shadowMapSize: number;
  /** Maximum simultaneous shadow-casting lights. */
  maxShadowLights: number;
  /** Enable shadow mapping. */
  shadowsEnabled: boolean;
}

export const DEFAULT_RENDERER_CONFIG: Readonly<RendererConfig> = {
  clearColor: { r: 0.08, g: 0.08, b: 0.1, a: 1 },
  fov: Math.PI / 4,
  near: 0.1,
  far: 1000,
  maxInstances: 200_000,
  maxMaterials: 16_384,
  maxLights: 1_024,
  ambientColor: { r: 0.08, g: 0.08, b: 0.1 },
  msaa: 4,
  shadowMapSize: 4096,
  maxShadowLights: 4,
  shadowsEnabled: true,
};
