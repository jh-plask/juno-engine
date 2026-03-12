import { vi } from 'vitest';
import type { Renderer } from '@engine/engine/types.js';

export function createMockRenderer(): Renderer {
  return {
    render: vi.fn(),
    destroy: vi.fn(),
  };
}
