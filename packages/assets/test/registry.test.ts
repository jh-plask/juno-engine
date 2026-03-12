import { describe, test, expect } from 'vitest';
import { HandleRegistry } from '@engine/assets/registry.js';

describe('HandleRegistry', () => {
  test('CRUD lifecycle: add, get, remove, size', () => {
    const reg = new HandleRegistry<'Mesh', { name: string }>();

    const h1 = reg.add({ name: 'cube' });
    const h2 = reg.add({ name: 'sphere' });
    const h3 = reg.add({ name: 'plane' });

    expect(reg.size).toBe(3);
    expect(reg.get(h1)?.name).toBe('cube');
    expect(reg.get(h2)?.name).toBe('sphere');
    expect(reg.get(h3)?.name).toBe('plane');

    // Remove middle
    expect(reg.remove(h2)).toBe(true);
    expect(reg.size).toBe(2);
    expect(reg.get(h2)).toBeUndefined();
    expect(reg.has(h2)).toBe(false);

    // Others still present
    expect(reg.get(h1)?.name).toBe('cube');
    expect(reg.get(h3)?.name).toBe('plane');
  });

  test('remove returns false for missing handle', () => {
    const reg = new HandleRegistry<'Tex', number>();
    const h = reg.add(42);
    reg.remove(h);
    expect(reg.remove(h)).toBe(false);
  });

  test('two registries produce independent handle sequences', () => {
    const regA = new HandleRegistry<'A', string>();
    const regB = new HandleRegistry<'B', string>();

    const hA0 = regA.add('alpha');
    const hA1 = regA.add('beta');
    const hB0 = regB.add('gamma');

    // Both start from 0, but are type-incompatible
    // At runtime they happen to have same numeric value
    expect(regA.get(hA0)).toBe('alpha');
    expect(regB.get(hB0)).toBe('gamma');
    expect(regA.size).toBe(2);
    expect(regB.size).toBe(1);
  });

  test('iteration yields all stored entries', () => {
    const reg = new HandleRegistry<'Mat', number>();
    reg.add(10);
    reg.add(20);
    reg.add(30);

    const values = [...reg.values()];
    expect(values).toHaveLength(3);
    expect(values).toContain(10);
    expect(values).toContain(20);
    expect(values).toContain(30);

    const entries = [...reg.entries()];
    expect(entries).toHaveLength(3);
  });
});
