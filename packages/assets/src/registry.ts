import type { Handle } from './handles.js';
import { createHandleAllocator } from './handles.js';

/**
 * A sparse Map-based registry for cold storage of resources.
 * Resources are stored by handle and can be added, retrieved, and removed.
 */
export class HandleRegistry<Tag extends string, T> {
  private readonly store = new Map<Handle<Tag>, T>();
  private readonly alloc = createHandleAllocator<Tag>();

  add(data: T): Handle<Tag> {
    const handle = this.alloc.next();
    this.store.set(handle, data);
    return handle;
  }

  get(handle: Handle<Tag>): T | undefined {
    return this.store.get(handle);
  }

  remove(handle: Handle<Tag>): boolean {
    return this.store.delete(handle);
  }

  has(handle: Handle<Tag>): boolean {
    return this.store.has(handle);
  }

  get size(): number {
    return this.store.size;
  }

  entries(): IterableIterator<[Handle<Tag>, T]> {
    return this.store.entries();
  }

  values(): IterableIterator<T> {
    return this.store.values();
  }
}
