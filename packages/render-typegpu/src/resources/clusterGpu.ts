/** Default tile size in pixels (square tiles). */
export const DEFAULT_TILE_SIZE = 64;

/** Maximum lights per cluster (caps the index list size). */
export const MAX_LIGHTS_PER_CLUSTER = 128;

/** Default depth slice count. */
export const DEFAULT_DEPTH_SLICES = 24;

export interface ClusterGridInfo {
  gridX: number;
  gridY: number;
  gridZ: number;
  tileSize: number;
  totalClusters: number;
}

/** Compute cluster grid dimensions from viewport size. */
export function computeClusterGrid(
  viewportWidth: number,
  viewportHeight: number,
  tileSize = DEFAULT_TILE_SIZE,
  depthSlices = DEFAULT_DEPTH_SLICES,
): ClusterGridInfo {
  const gridX = Math.ceil(viewportWidth / tileSize);
  const gridY = Math.ceil(viewportHeight / tileSize);
  return {
    gridX,
    gridY,
    gridZ: depthSlices,
    tileSize,
    totalClusters: gridX * gridY * depthSlices,
  };
}
