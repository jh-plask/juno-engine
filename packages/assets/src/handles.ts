import type { Brand } from '@engine/engine/types.js';

/**
 * A branded handle type for type-safe resource references.
 * At runtime it's just a number, but TypeScript prevents mixing handle types.
 */
export type Handle<T extends string> = Brand<number, T>;

/**
 * Creates a handle allocator that produces monotonically increasing handles.
 */
export function createHandleAllocator<T extends string>(): {
  next(): Handle<T>;
} {
  let counter = 0;
  return {
    next(): Handle<T> {
      return counter++ as Handle<T>;
    },
  };
}
