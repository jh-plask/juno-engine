import { d } from 'typegpu';

/**
 * Placeholder static mesh vertex/fragment shader definitions.
 * The actual pipeline wiring happens in @engine/render-typegpu.
 * These functions define the shader interface contract.
 */

/** Vertex output / Fragment input */
export const VertexOutput = d.struct({
  position: d.vec4f,
  worldPos: d.vec3f,
  normal: d.vec3f,
  uv: d.vec2f,
});
