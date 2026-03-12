import tgpu, { d } from 'typegpu';
import {
  CameraUniform,
  CandidateSphere,
  CullState,
  InstanceGpu,
  MaterialGpu,
} from './schemas.js';

export const SceneGroup = tgpu.bindGroupLayout({
  camera: { uniform: CameraUniform },
  instances: { storage: (n: number) => d.arrayOf(InstanceGpu, n) },
  materials: { storage: (n: number) => d.arrayOf(MaterialGpu, n) },
}).$idx(0);

export const CullGroup = tgpu.bindGroupLayout({
  camera: { uniform: CameraUniform },
  candidates: { storage: (n: number) => d.arrayOf(CandidateSphere, n) },
  visible: { storage: (n: number) => d.arrayOf(InstanceGpu, n), access: 'mutable' as const },
  state: { storage: CullState, access: 'mutable' as const },
}).$idx(1);
