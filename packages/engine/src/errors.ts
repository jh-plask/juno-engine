export type EngineErrorCode =
  | 'GPU_INIT_FAILED'
  | 'GPU_ADAPTER_NOT_FOUND'
  | 'GPU_DEVICE_LOST'
  | 'GPU_CONTEXT_FAILED'
  | 'PHYSICS_WASM_FAILED'
  | 'PHYSICS_WORLD_FAILED'
  | 'ASSET_LOAD_FAILED'
  | 'ASSET_NOT_FOUND'
  | 'INVALID_HANDLE';

export class EngineError extends Error {
  constructor(
    readonly code: EngineErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(`[${code}] ${message}`, options);
    this.name = 'EngineError';
  }
}
