// @ts-nocheck -- Shader function bodies use GPU operations (mat*vec, swizzle)
// that are compiled by unplugin-typegpu at bundle time, not executable JS.
import tgpu, { d } from 'typegpu';
import { builtin } from 'typegpu/data';
import type { TgpuRoot } from '../gpu.js';
import { SceneGroup } from '../layouts.js';
import { MeshVertexLayout } from '../resources/meshGpu.js';

// GPU shader function bodies are compiled by unplugin-typegpu at app bundle time.
// TypeScript's tsc cannot typecheck GPU-specific operations (mat*vec, swizzle, etc.),
// so we suppress those errors with type assertions.

const vertexFn = tgpu.vertexFn({
  in: {
    position: d.location(0, d.vec3f),
    normal: d.location(1, d.vec3f),
    uv: d.location(2, d.vec2f),
    tangent: d.location(3, d.vec4f),
    instanceIndex: builtin.instanceIndex,
  },
  out: {
    pos: builtin.position,
    normal: d.vec3f,
    uv: d.vec2f,
    materialIdx: d.interpolate('flat, either', d.u32),
  },
})((input) => {
  const instance = SceneGroup.$.instances[input.instanceIndex];
  const camera = SceneGroup.$.camera;

  const model = d.mat4x4f(
    instance.model0,
    instance.model1,
    instance.model2,
    instance.model3,
  );

  const worldPos = model * d.vec4f(input.position, 1.0);
  const clipPos = camera.viewProj * worldPos;
  const worldNormal = (model * d.vec4f(input.normal, 0.0)).xyz;

  return {
    pos: clipPos,
    normal: worldNormal,
    uv: input.uv,
    materialIdx: instance.material,
  };
});

const fragmentFn = tgpu.fragmentFn({
  in: {
    normal: d.vec3f,
    uv: d.vec2f,
    materialIdx: d.interpolate('flat, either', d.u32),
  },
  out: d.vec4f,
})((input) => {
  const material = SceneGroup.$.materials[input.materialIdx];
  return material.baseColor;
});

export function createStaticMeshPipeline(root: TgpuRoot) {
  return root.createRenderPipeline({
    vertex: vertexFn,
    fragment: fragmentFn,
    attribs: MeshVertexLayout.attrib,
    primitive: {
      topology: 'triangle-list',
      cullMode: 'back',
    },
    depthStencil: {
      format: 'depth24plus',
      depthWriteEnabled: true,
      depthCompare: 'less',
    },
  });
}
