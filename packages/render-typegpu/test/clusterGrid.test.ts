import { describe, it, expect } from 'vitest';
import { computeClusterGrid } from '../src/resources/clusterGpu.js';

describe('computeClusterGrid', () => {
  it('1280x720 with default tile size (64): gridX=20, gridY=12, gridZ=24, total=5760', () => {
    const g = computeClusterGrid(1280, 720);

    expect(g.gridX).toBe(20);   // 1280 / 64 = 20
    expect(g.gridY).toBe(12);   // ceil(720 / 64) = 11.25 -> wait, 720/64=11.25 -> ceil=12
    expect(g.gridZ).toBe(24);
    expect(g.totalClusters).toBe(20 * 12 * 24);
    expect(g.totalClusters).toBe(5760);
  });

  it('1920x1080: gridX=30, gridY=17, gridZ=24, total=12240', () => {
    const g = computeClusterGrid(1920, 1080);

    expect(g.gridX).toBe(30);   // 1920 / 64 = 30
    expect(g.gridY).toBe(17);   // 1080 / 64 = 16.875 -> ceil = 17
    expect(g.gridZ).toBe(24);
    expect(g.totalClusters).toBe(30 * 17 * 24);
    expect(g.totalClusters).toBe(12240);
  });

  it('custom tile size 128: gridX=10, gridY=6', () => {
    const g = computeClusterGrid(1280, 720, 128);

    expect(g.gridX).toBe(10);   // 1280 / 128 = 10
    expect(g.gridY).toBe(6);    // 720 / 128 = 5.625 -> ceil = 6
    expect(g.tileSize).toBe(128);
  });

  it('custom depth slices 16: gridZ=16', () => {
    const g = computeClusterGrid(1280, 720, 64, 16);

    expect(g.gridZ).toBe(16);
    expect(g.totalClusters).toBe(20 * 12 * 16);
  });

  it('handles non-aligned viewport (1300x700): rounds up correctly', () => {
    const g = computeClusterGrid(1300, 700);

    expect(g.gridX).toBe(Math.ceil(1300 / 64));  // 20.3125 -> 21
    expect(g.gridY).toBe(Math.ceil(700 / 64));    // 10.9375 -> 11
    expect(g.gridX).toBe(21);
    expect(g.gridY).toBe(11);
  });

  it('totalClusters = gridX * gridY * gridZ', () => {
    const g = computeClusterGrid(800, 600, 32, 16);

    expect(g.totalClusters).toBe(g.gridX * g.gridY * g.gridZ);
  });
});
