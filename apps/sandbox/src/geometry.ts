import type { MeshVertexData } from '@engine/render-typegpu/resources/meshGpu.js';

function v3(x: number, y: number, z: number) { return { x, y, z }; }
function v4(x: number, y: number, z: number, w: number) { return { x, y, z, w }; }
function v2(x: number, y: number) { return { x, y }; }

// ── Cube ─────────────────────────────────────────────────────────────────────

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

// ── UV Sphere ────────────────────────────────────────────────────────────────

export function generateSphere(
  radius = 0.5,
  segments = 24,
  rings = 16,
): { vertices: MeshVertexData[]; indices: number[] } {
  const vertices: MeshVertexData[] = [];
  const indices: number[] = [];

  for (let r = 0; r <= rings; r++) {
    const phi = (r / rings) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let s = 0; s <= segments; s++) {
      const theta = (s / segments) * Math.PI * 2;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      const nx = cosTheta * sinPhi;
      const ny = cosPhi;
      const nz = sinTheta * sinPhi;

      vertices.push({
        position: v3(nx * radius, ny * radius, nz * radius),
        normal: v3(nx, ny, nz),
        uv: v2(s / segments, r / rings),
        tangent: v4(-sinTheta, 0, cosTheta, 1),
      });
    }
  }

  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * (segments + 1) + s;
      const b = a + segments + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  return { vertices, indices };
}

// ── Cylinder ─────────────────────────────────────────────────────────────────

export function generateCylinder(
  radiusTop = 0.5,
  radiusBottom = 0.5,
  height = 1,
  segments = 24,
): { vertices: MeshVertexData[]; indices: number[] } {
  const vertices: MeshVertexData[] = [];
  const indices: number[] = [];
  const halfH = height / 2;

  // Side wall
  const slopeLen = Math.sqrt((radiusTop - radiusBottom) ** 2 + height ** 2);
  const ny = (radiusBottom - radiusTop) / slopeLen;
  const nxzScale = height / slopeLen;

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    const nx = cos * nxzScale;
    const nz = sin * nxzScale;

    // Bottom vertex
    vertices.push({
      position: v3(cos * radiusBottom, -halfH, sin * radiusBottom),
      normal: v3(nx, ny, nz),
      uv: v2(i / segments, 1),
      tangent: v4(-sin, 0, cos, 1),
    });
    // Top vertex
    vertices.push({
      position: v3(cos * radiusTop, halfH, sin * radiusTop),
      normal: v3(nx, ny, nz),
      uv: v2(i / segments, 0),
      tangent: v4(-sin, 0, cos, 1),
    });
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b);
    indices.push(b, c, d);
  }

  // Top cap
  const topCenter = vertices.length;
  vertices.push({
    position: v3(0, halfH, 0),
    normal: v3(0, 1, 0),
    uv: v2(0.5, 0.5),
    tangent: v4(1, 0, 0, 1),
  });
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    vertices.push({
      position: v3(Math.cos(theta) * radiusTop, halfH, Math.sin(theta) * radiusTop),
      normal: v3(0, 1, 0),
      uv: v2(Math.cos(theta) * 0.5 + 0.5, Math.sin(theta) * 0.5 + 0.5),
      tangent: v4(1, 0, 0, 1),
    });
  }
  for (let i = 0; i < segments; i++) {
    indices.push(topCenter, topCenter + 1 + i, topCenter + 2 + i);
  }

  // Bottom cap
  const botCenter = vertices.length;
  vertices.push({
    position: v3(0, -halfH, 0),
    normal: v3(0, -1, 0),
    uv: v2(0.5, 0.5),
    tangent: v4(1, 0, 0, 1),
  });
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    vertices.push({
      position: v3(Math.cos(theta) * radiusBottom, -halfH, Math.sin(theta) * radiusBottom),
      normal: v3(0, -1, 0),
      uv: v2(Math.cos(theta) * 0.5 + 0.5, Math.sin(theta) * 0.5 + 0.5),
      tangent: v4(1, 0, 0, 1),
    });
  }
  for (let i = 0; i < segments; i++) {
    indices.push(botCenter, botCenter + 2 + i, botCenter + 1 + i);
  }

  return { vertices, indices };
}

// ── Torus ────────────────────────────────────────────────────────────────────

export function generateTorus(
  majorRadius = 0.4,
  minorRadius = 0.15,
  majorSegments = 24,
  minorSegments = 12,
): { vertices: MeshVertexData[]; indices: number[] } {
  const vertices: MeshVertexData[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= majorSegments; j++) {
    const u = (j / majorSegments) * Math.PI * 2;
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);

    for (let i = 0; i <= minorSegments; i++) {
      const v = (i / minorSegments) * Math.PI * 2;
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      const x = (majorRadius + minorRadius * cosV) * cosU;
      const y = minorRadius * sinV;
      const z = (majorRadius + minorRadius * cosV) * sinU;

      const nx = cosV * cosU;
      const ny = sinV;
      const nz = cosV * sinU;

      vertices.push({
        position: v3(x, y, z),
        normal: v3(nx, ny, nz),
        uv: v2(j / majorSegments, i / minorSegments),
        tangent: v4(-sinU, 0, cosU, 1),
      });
    }
  }

  for (let j = 0; j < majorSegments; j++) {
    for (let i = 0; i < minorSegments; i++) {
      const a = j * (minorSegments + 1) + i;
      const b = a + minorSegments + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  return { vertices, indices };
}

// ── Ground plane ─────────────────────────────────────────────────────────────

export function generatePlane(
  width = 20,
  depth = 20,
  subdivisionsW = 1,
  subdivisionsD = 1,
): { vertices: MeshVertexData[]; indices: number[] } {
  const vertices: MeshVertexData[] = [];
  const indices: number[] = [];
  const hw = width / 2;
  const hd = depth / 2;

  for (let z = 0; z <= subdivisionsD; z++) {
    for (let x = 0; x <= subdivisionsW; x++) {
      const u = x / subdivisionsW;
      const v = z / subdivisionsD;
      vertices.push({
        position: v3(u * width - hw, 0, v * depth - hd),
        normal: v3(0, 1, 0),
        uv: v2(u, v),
        tangent: v4(1, 0, 0, 1),
      });
    }
  }

  for (let z = 0; z < subdivisionsD; z++) {
    for (let x = 0; x < subdivisionsW; x++) {
      const a = z * (subdivisionsW + 1) + x;
      const b = a + subdivisionsW + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  return { vertices, indices };
}

// ── Cone (cylinder with radiusTop=0) ─────────────────────────────────────────

export function generateCone(
  radius = 0.5,
  height = 1,
  segments = 24,
): { vertices: MeshVertexData[]; indices: number[] } {
  return generateCylinder(0.001, radius, height, segments);
}
