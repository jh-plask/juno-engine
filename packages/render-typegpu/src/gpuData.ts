/**
 * Plain-object types for the TypeGPU cold-path write boundary.
 *
 * TypeGPU's compiled writer expects named-property access ({x,y,z,w} for vectors,
 * {columns:[...]} for matrices). These types are used only on cold paths (mesh upload,
 * material init) where object creation cost is negligible. The hot path (per-frame
 * instance + camera writes) bypasses TypeGPU entirely via stagedBuffer.ts.
 */

export interface GpuVec2 { x: number; y: number }
export interface GpuVec3 { x: number; y: number; z: number }
export interface GpuVec4 { x: number; y: number; z: number; w: number }
