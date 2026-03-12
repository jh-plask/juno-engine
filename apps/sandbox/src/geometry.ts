import type { MeshVertexData } from '@engine/render-typegpu/resources/meshGpu.js';

// Unit cube: 24 vertices (4 per face for correct normals), 36 indices.
// TypeGPU vec types use {x,y,z,w} object format.

function v3(x: number, y: number, z: number) { return { x, y, z }; }
function v4(x: number, y: number, z: number, w: number) { return { x, y, z, w }; }
function v2(x: number, y: number) { return { x, y }; }

export const CUBE_VERTICES: MeshVertexData[] = [
  // +Z face
  { position: v3(-0.5, -0.5,  0.5), normal: v3(0, 0, 1), uv: v2(0, 1), tangent: v4(1, 0, 0, 1) },
  { position: v3( 0.5, -0.5,  0.5), normal: v3(0, 0, 1), uv: v2(1, 1), tangent: v4(1, 0, 0, 1) },
  { position: v3( 0.5,  0.5,  0.5), normal: v3(0, 0, 1), uv: v2(1, 0), tangent: v4(1, 0, 0, 1) },
  { position: v3(-0.5,  0.5,  0.5), normal: v3(0, 0, 1), uv: v2(0, 0), tangent: v4(1, 0, 0, 1) },
  // -Z face
  { position: v3( 0.5, -0.5, -0.5), normal: v3(0, 0, -1), uv: v2(0, 1), tangent: v4(-1, 0, 0, 1) },
  { position: v3(-0.5, -0.5, -0.5), normal: v3(0, 0, -1), uv: v2(1, 1), tangent: v4(-1, 0, 0, 1) },
  { position: v3(-0.5,  0.5, -0.5), normal: v3(0, 0, -1), uv: v2(1, 0), tangent: v4(-1, 0, 0, 1) },
  { position: v3( 0.5,  0.5, -0.5), normal: v3(0, 0, -1), uv: v2(0, 0), tangent: v4(-1, 0, 0, 1) },
  // +X face
  { position: v3( 0.5, -0.5,  0.5), normal: v3(1, 0, 0), uv: v2(0, 1), tangent: v4(0, 0, -1, 1) },
  { position: v3( 0.5, -0.5, -0.5), normal: v3(1, 0, 0), uv: v2(1, 1), tangent: v4(0, 0, -1, 1) },
  { position: v3( 0.5,  0.5, -0.5), normal: v3(1, 0, 0), uv: v2(1, 0), tangent: v4(0, 0, -1, 1) },
  { position: v3( 0.5,  0.5,  0.5), normal: v3(1, 0, 0), uv: v2(0, 0), tangent: v4(0, 0, -1, 1) },
  // -X face
  { position: v3(-0.5, -0.5, -0.5), normal: v3(-1, 0, 0), uv: v2(0, 1), tangent: v4(0, 0, 1, 1) },
  { position: v3(-0.5, -0.5,  0.5), normal: v3(-1, 0, 0), uv: v2(1, 1), tangent: v4(0, 0, 1, 1) },
  { position: v3(-0.5,  0.5,  0.5), normal: v3(-1, 0, 0), uv: v2(1, 0), tangent: v4(0, 0, 1, 1) },
  { position: v3(-0.5,  0.5, -0.5), normal: v3(-1, 0, 0), uv: v2(0, 0), tangent: v4(0, 0, 1, 1) },
  // +Y face
  { position: v3(-0.5,  0.5,  0.5), normal: v3(0, 1, 0), uv: v2(0, 1), tangent: v4(1, 0, 0, 1) },
  { position: v3( 0.5,  0.5,  0.5), normal: v3(0, 1, 0), uv: v2(1, 1), tangent: v4(1, 0, 0, 1) },
  { position: v3( 0.5,  0.5, -0.5), normal: v3(0, 1, 0), uv: v2(1, 0), tangent: v4(1, 0, 0, 1) },
  { position: v3(-0.5,  0.5, -0.5), normal: v3(0, 1, 0), uv: v2(0, 0), tangent: v4(1, 0, 0, 1) },
  // -Y face
  { position: v3(-0.5, -0.5, -0.5), normal: v3(0, -1, 0), uv: v2(0, 1), tangent: v4(1, 0, 0, 1) },
  { position: v3( 0.5, -0.5, -0.5), normal: v3(0, -1, 0), uv: v2(1, 1), tangent: v4(1, 0, 0, 1) },
  { position: v3( 0.5, -0.5,  0.5), normal: v3(0, -1, 0), uv: v2(1, 0), tangent: v4(1, 0, 0, 1) },
  { position: v3(-0.5, -0.5,  0.5), normal: v3(0, -1, 0), uv: v2(0, 0), tangent: v4(1, 0, 0, 1) },
];

export const CUBE_INDICES: number[] = [
   0,  1,  2,   2,  3,  0,  // +Z
   4,  5,  6,   6,  7,  4,  // -Z
   8,  9, 10,  10, 11,  8,  // +X
  12, 13, 14,  14, 15, 12,  // -X
  16, 17, 18,  18, 19, 16,  // +Y
  20, 21, 22,  22, 23, 20,  // -Y
];
