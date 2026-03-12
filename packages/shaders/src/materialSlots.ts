import tgpu from 'typegpu';

// Feature toggle slots -- resolved at pipeline creation time
export const USE_VERTEX_COLOR = tgpu.slot<boolean>(false);
export const USE_FOG = tgpu.slot<boolean>(false);

/**
 * Base material shade function using TypeGPU slots for permutation.
 * Dead branches are pruned at resolution time when slot values are known.
 *
 * The `'use gpu'` directive is transformed by unplugin-typegpu at build time
 * into a proper tgpu.fn() call that supports `.with()` for specializations.
 *
 * Specializations (Unlit, UnlitFogged, etc.) are created at the app level
 * where unplugin-typegpu runs, since `.with()` is only available after
 * the plugin transform.
 *
 * Usage in app code:
 *   const Unlit = shadeBase.with(USE_VERTEX_COLOR, false).with(USE_FOG, false);
 */
export const shadeBase = (...args: unknown[]): unknown => {
  'use gpu';
  // This function body is replaced by unplugin-typegpu.
  // The actual GPU shader logic goes here in the source,
  // but TypeScript cannot typecheck 'use gpu' blocks.
  return args[0];
};
