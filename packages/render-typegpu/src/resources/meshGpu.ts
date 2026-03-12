import tgpu, { d } from 'typegpu';
import type { TgpuRoot } from '../gpu.js';
import { MeshVertex } from '../schemas.js';
import type { GpuVec2, GpuVec3, GpuVec4 } from '../gpuData.js';

export const MeshVertexLayout = tgpu.vertexLayout(
  (n: number) => d.disarrayOf(MeshVertex, n),
  'vertex',
);

export interface MeshGpu {
  vertexBuffer: ReturnType<TgpuRoot['createBuffer']>;
  indexBuffer: ReturnType<TgpuRoot['createBuffer']>;
  indexCount: number;
}

export interface MeshVertexData {
  position: GpuVec3;
  normal: GpuVec3;
  uv: GpuVec2;
  tangent: GpuVec4;
}

export function uploadMesh(
  root: TgpuRoot,
  vertices: MeshVertexData[],
  indices: number[],
): MeshGpu {
  const vertexBuffer = root
    .createBuffer(d.disarrayOf(MeshVertex, vertices.length), vertices as never)
    .$usage('vertex');

  const indexBuffer = root
    .createBuffer(d.arrayOf(d.u32, indices.length), indices as never)
    .$usage('index');

  return {
    vertexBuffer,
    indexBuffer,
    indexCount: indices.length,
  };
}
