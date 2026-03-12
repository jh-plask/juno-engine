import { vi } from 'vitest';
import type { PhysicsServices } from '@engine/engine/types.js';

export function createMockPhysics(): PhysicsServices {
  return {
    world: null,
    bodyStore: [],
    step: vi.fn(),
    destroy: vi.fn(),
  };
}
