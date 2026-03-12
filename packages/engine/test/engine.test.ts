import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '@engine/engine/engine.js';
import { createTestWorld } from '@engine/test-utils/world.js';
import { createMockRenderer } from '@engine/test-utils/mocks/renderer.js';
import { createMockPhysics } from '@engine/test-utils/mocks/physics.js';

function makeEngine(opts?: { physics?: boolean }) {
  const world = createTestWorld();
  const renderer = createMockRenderer();
  const physics = opts?.physics !== false ? createMockPhysics() : null;
  const updateWorldTransforms = vi.fn();
  const syncKinematicsToRapier = vi.fn();
  const syncDynamicsFromRapier = vi.fn();

  const engine = createEngine({
    world,
    renderer,
    physics,
    updateWorldTransforms,
    syncKinematicsToRapier,
    syncDynamicsFromRapier,
  });

  return { engine, world, renderer, physics, updateWorldTransforms, syncKinematicsToRapier, syncDynamicsFromRapier };
}

describe('Engine update loop', () => {
  test('advances time state correctly', () => {
    const { engine, world } = makeEngine();
    engine.update(0.016);

    expect(world.time.now).toBeCloseTo(0.016);
    expect(world.time.frame).toBe(1);
    expect(world.time.dt).toBeCloseTo(0.016);
  });

  test('accumulates frames over multiple updates', () => {
    const { engine, world } = makeEngine();
    engine.update(0.016);
    engine.update(0.016);
    engine.update(0.016);

    expect(world.time.frame).toBe(3);
    expect(world.time.now).toBeCloseTo(0.048);
  });

  test('runs correct number of fixed steps for large dt', () => {
    const { engine, physics } = makeEngine();
    // fixedDt = 1/60 ≈ 0.01667. dt=0.1 should run 6 fixed steps
    engine.update(0.1);
    expect(physics!.step).toHaveBeenCalledTimes(6);
  });

  test('no fixed step when dt < fixedDt', () => {
    const { engine, physics } = makeEngine();
    engine.update(0.005); // Less than 1/60
    expect(physics!.step).not.toHaveBeenCalled();
  });

  test('accumulator carries over between frames', () => {
    const { engine, physics } = makeEngine();
    engine.update(0.01); // Not enough for a step
    expect(physics!.step).not.toHaveBeenCalled();

    engine.update(0.01); // Combined: 0.02 > 1/60 ≈ 0.0167
    expect(physics!.step).toHaveBeenCalledTimes(1);
  });

  test('system execution order: sync → step → sync (per fixed), then transforms → render (once)', () => {
    const { engine, syncKinematicsToRapier, physics, syncDynamicsFromRapier, updateWorldTransforms, renderer } = makeEngine();

    engine.update(1 / 60 + 0.001); // Just over one fixed step

    const order: string[] = [];
    syncKinematicsToRapier.mock.invocationCallOrder.forEach(() => order.push('syncK'));
    physics!.step.mock.invocationCallOrder.forEach(() => order.push('step'));
    syncDynamicsFromRapier.mock.invocationCallOrder.forEach(() => order.push('syncD'));
    updateWorldTransforms.mock.invocationCallOrder.forEach(() => order.push('transforms'));
    renderer.render.mock.invocationCallOrder.forEach(() => order.push('render'));

    // Sort by actual call order
    const calls = [
      ...syncKinematicsToRapier.mock.invocationCallOrder.map((o: number) => ({ o, name: 'syncK' })),
      ...(physics!.step as ReturnType<typeof vi.fn>).mock.invocationCallOrder.map((o: number) => ({ o, name: 'step' })),
      ...syncDynamicsFromRapier.mock.invocationCallOrder.map((o: number) => ({ o, name: 'syncD' })),
      ...updateWorldTransforms.mock.invocationCallOrder.map((o: number) => ({ o, name: 'transforms' })),
      ...(renderer.render as ReturnType<typeof vi.fn>).mock.invocationCallOrder.map((o: number) => ({ o, name: 'render' })),
    ].sort((a, b) => a.o - b.o).map(c => c.name);

    expect(calls).toEqual(['syncK', 'step', 'syncD', 'transforms', 'render']);
  });

  test('no physics calls when physics is null', () => {
    const { engine, updateWorldTransforms, renderer } = makeEngine({ physics: false });
    engine.update(0.1);

    expect(updateWorldTransforms).toHaveBeenCalledTimes(1);
    expect(renderer.render).toHaveBeenCalledTimes(1);
  });
});

describe('Engine lifecycle', () => {
  test('destroy calls physics and renderer destroy', () => {
    const { engine, physics, renderer } = makeEngine();
    engine.destroy();

    expect(physics!.destroy).toHaveBeenCalledTimes(1);
    expect(renderer.destroy).toHaveBeenCalledTimes(1);
  });
});
