import { d } from 'typegpu';

export const CameraUniform = d.struct({
  view: d.mat4x4f,
  proj: d.mat4x4f,
  viewProj: d.mat4x4f,
  eye: d.vec4f,
  viewport: d.vec2u,
  time: d.f32,
  frame: d.u32,
});

export const MaterialGpu = d.struct({
  baseColor: d.vec4f,
  emissive: d.vec3f,
  roughness: d.f32,
  metalness: d.f32,
  alphaCutoff: d.f32,
  flags: d.u32,
  _pad: d.f32,
});

export const InstanceGpu = d.struct({
  model0: d.vec4f,
  model1: d.vec4f,
  model2: d.vec4f,
  model3: d.vec4f,
  material: d.u32,
  entity: d.u32,
  flags: d.u32,
  _pad: d.u32,
});

export const CullState = d.struct({
  visibleCount: d.atomic(d.u32),
});

export const MeshVertex = d.unstruct({
  position: d.location(0, d.vec3f),
  normal: d.location(1, d.vec3f),
  uv: d.location(2, d.vec2f),
  tangent: d.location(3, d.vec4f),
});

export const CandidateSphere = d.struct({
  centerRadius: d.vec4f,
  entity: d.u32,
  mesh: d.u32,
  material: d.u32,
  _pad: d.u32,
});
