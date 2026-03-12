import type {
  BodyHandle,
  MaterialHandle,
  MeshHandle,
} from '@engine/engine/types.js';

export const MAX = 1 << 20;
export const NO_PARENT = 0xffffffff;

// Tag components (empty objects)
export const Node = {};
export const Renderable = {};
export const Camera = {};
export const Static = {};
export const DynamicBody = {};
export const KinematicBody = {};
export const DirtyBounds = {};

// SoA stores
export const LocalTransform = {
  px: new Float32Array(MAX),
  py: new Float32Array(MAX),
  pz: new Float32Array(MAX),

  qx: new Float32Array(MAX),
  qy: new Float32Array(MAX),
  qz: new Float32Array(MAX),
  qw: new Float32Array(MAX),

  sx: new Float32Array(MAX),
  sy: new Float32Array(MAX),
  sz: new Float32Array(MAX),
};

export const Parent = {
  value: new Uint32Array(MAX),
};

export const WorldTransform = {
  m: new Float32Array(MAX * 16),
  dirty: new Uint8Array(MAX),
};

export const Bounds = {
  centerX: new Float32Array(MAX),
  centerY: new Float32Array(MAX),
  centerZ: new Float32Array(MAX),
  radius: new Float32Array(MAX),
};

export const MeshRef = {
  value: new Uint32Array(MAX),
};

export const MaterialRef = {
  value: new Uint32Array(MAX),
};

export const BodyRef = {
  value: new Uint32Array(MAX),
};

// Typed handle casts at the edges
export const meshOf = (eid: number) => MeshRef.value[eid] as unknown as MeshHandle;
export const materialOf = (eid: number) => MaterialRef.value[eid] as unknown as MaterialHandle;
export const bodyOf = (eid: number) => BodyRef.value[eid] as unknown as BodyHandle;
