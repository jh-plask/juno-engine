export interface RendererConfig {
  clearColor: { r: number; g: number; b: number; a: number };
  fov: number;
  near: number;
  far: number;
  maxInstances: number;
  maxMaterials: number;
}

export const DEFAULT_RENDERER_CONFIG: Readonly<RendererConfig> = {
  clearColor: { r: 0.08, g: 0.08, b: 0.1, a: 1 },
  fov: Math.PI / 4,
  near: 0.1,
  far: 1000,
  maxInstances: 200_000,
  maxMaterials: 16_384,
};
