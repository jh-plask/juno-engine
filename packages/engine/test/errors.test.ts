import { describe, test, expect } from 'vitest';
import { EngineError } from '@engine/engine/errors.js';

describe('EngineError', () => {
  test('formats message with error code prefix', () => {
    const err = new EngineError('GPU_INIT_FAILED', 'WebGPU not available');
    expect(err.message).toBe('[GPU_INIT_FAILED] WebGPU not available');
    expect(err.code).toBe('GPU_INIT_FAILED');
    expect(err.name).toBe('EngineError');
  });

  test('preserves cause chain via ErrorOptions', () => {
    const cause = new Error('underlying adapter failure');
    const err = new EngineError('GPU_ADAPTER_NOT_FOUND', 'No adapter', { cause });
    expect(err.cause).toBe(cause);
  });

  test('is instanceof Error', () => {
    const err = new EngineError('ASSET_NOT_FOUND', 'missing texture');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(EngineError);
  });
});
