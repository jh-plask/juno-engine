export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type MeshHandle = Brand<number, 'MeshHandle'>;
export type MaterialHandle = Brand<number, 'MaterialHandle'>;
export type TextureHandle = Brand<number, 'TextureHandle'>;
export type BodyHandle = Brand<number, 'BodyHandle'>;

export interface TimeState {
  now: number;
  dt: number;
  fixedDt: number;
  frame: number;
  accumulator: number;
}

export interface AssetRegistry {
  meshes: Map<MeshHandle, unknown>;
  materials: Map<MaterialHandle, unknown>;
  textures: Map<TextureHandle, unknown>;
}

export interface GpuServices {
  root: unknown;
  context: unknown;
  enabledFeatures: ReadonlySet<string>;
  destroy(): void;
}

export interface PhysicsServices {
  world: unknown;
  step(): void;
  destroy(): void;
}

export interface EngineContext {
  time: TimeState;
  assets: AssetRegistry;
  gpu: GpuServices | null;
  physics: PhysicsServices | null;
}

// EngineWorld is the bitECS world with EngineContext as its context type.
// We type it loosely here since bitECS createWorld returns a generic type.
// The actual world creation happens in @engine/ecs.
export type EngineWorld = EngineContext & { [key: string]: unknown };

export interface Renderer {
  render(world: EngineWorld): void;
  destroy(): void;
}

export interface Engine {
  world: EngineWorld;
  update(dt: number): void;
  destroy(): void;
}
