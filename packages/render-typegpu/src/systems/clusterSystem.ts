/**
 * Cluster subsystem — froxel grid, AABB build, light culling.
 *
 * Manages the 3D cluster grid and orchestrates two compute passes:
 *   1. clusterBuild: compute view-space AABBs per cluster (on resize)
 *   2. lightCulling: assign lights to clusters (every frame)
 *
 * Follows the uniform subsystem pattern: create → resize → dispatch.
 */

import { d } from 'typegpu';
import type { TgpuRoot } from '../gpu.js';
import { ClusterAABB, ClusterConfig, GlobalCounter } from '../schemas.js';
import { LightingGroup, ClusterBuildGroup, LightCullingGroup } from '../layouts.js';
import { createClusterBuildPipeline } from '../pipelines/clusterBuild.js';
import { createLightCullingPipeline } from '../pipelines/lightCulling.js';
import { createStagedBuffer, packClusterConfig, type StagedBuffer } from '../stagedBuffer.js';
import {
  computeClusterGrid,
  MAX_LIGHTS_PER_CLUSTER,
  type ClusterGridInfo,
} from '../resources/clusterGpu.js';
import type { LightingSystem } from './lightingSystem.js';
import type { SceneSystem } from './sceneSystem.js';

export interface ClusterSystem {
  /** Lighting bind group (SceneGroup index 1) — includes light grid + cluster config. */
  readonly lightingBindGroup: ReturnType<TgpuRoot['createBindGroup']>;
  /** Current cluster grid dimensions. */
  readonly grid: ClusterGridInfo;

  /** Check viewport and rebuild buffers/bind groups if needed. */
  resize(vpW: number, vpH: number): void;
  /** Update cluster config uniform with current camera projection. */
  prepare(vpW: number, vpH: number, near: number, far: number, invProjX: number, invProjY: number): void;
  /** Dispatch compute passes (AABB build + light culling). */
  dispatch(): void;
}

/** Shadow resources passed from the renderer to include in the lighting bind group. */
export interface ShadowResources {
  shadowAtlasView: unknown; // TgpuTextureView (depth2d)
  shadowSampler: unknown;   // TgpuComparisonSampler
}

export function createClusterSystem(
  root: TgpuRoot,
  scene: SceneSystem,
  lighting: LightingSystem,
  shadow: ShadowResources,
  initialWidth: number,
  initialHeight: number,
): ClusterSystem {
  let grid = computeClusterGrid(initialWidth, initialHeight);
  let dirty = true;

  // Cluster config uniform (shared by build, culling, and shading)
  const configBuffer = root.createBuffer(ClusterConfig).$usage('uniform');
  const configStaged = createStagedBuffer(root.device, configBuffer.buffer, 48);

  // Cluster data buffers — recreated on grid resize
  let aabbBuffer = root.createBuffer(d.arrayOf(ClusterAABB, grid.totalClusters)).$usage('storage');
  let lightGridBuffer = root.createBuffer(d.arrayOf(d.vec2u, grid.totalClusters)).$usage('storage');
  let indexListBuffer = root.createBuffer(
    d.arrayOf(d.u32, grid.totalClusters * MAX_LIGHTS_PER_CLUSTER),
  ).$usage('storage');
  const counterBuffer = root.createBuffer(GlobalCounter).$usage('storage');

  // Pipelines
  const buildPipeline = createClusterBuildPipeline(root);
  const cullingPipeline = createLightCullingPipeline(root);

  // ── Bind group construction ────────────────────────────────────────────
  // Extracted to a function since bind groups are rebuilt on resize.

  // TypeGPU bind group creation requires exact schema-typed buffers.
  // Cross-subsystem buffer references lose their schema type through interfaces,
  // so we use `as never` for type narrowing (safe — schemas match by construction).

  function makeLightingBindGroup() {
    return root.createBindGroup(LightingGroup, {
      lights: lighting.lightBuffer as never,
      lightGrid: lightGridBuffer,
      lightIndexList: indexListBuffer,
      lightConstants: lighting.lightConstantsBuffer as never,
      clusterConfig: configBuffer,
      shadowAtlas: shadow.shadowAtlasView as never,
      shadowSampler: shadow.shadowSampler as never,
    });
  }

  function makeBuildBindGroup() {
    return root.createBindGroup(ClusterBuildGroup, {
      config: configBuffer,
      clusterAABBs: aabbBuffer,
    });
  }

  function makeCullingBindGroup() {
    return root.createBindGroup(LightCullingGroup, {
      config: configBuffer,
      lightConstants: lighting.lightConstantsBuffer as never,
      lights: lighting.lightBuffer as never,
      clusterAABBs: aabbBuffer,
      camera: scene.cameraBuffer as never,
      lightGrid: lightGridBuffer,
      lightIndexList: indexListBuffer,
      globalCounter: counterBuffer,
    });
  }

  let lightingBindGroup = makeLightingBindGroup();
  let buildBindGroup = makeBuildBindGroup();
  let cullingBindGroup = makeCullingBindGroup();

  // Track previous viewport for resize detection
  let prevW = initialWidth;
  let prevH = initialHeight;

  const system: ClusterSystem = {
    get lightingBindGroup() { return lightingBindGroup; },
    get grid() { return grid; },

    resize(vpW: number, vpH: number) {
      if (vpW === prevW && vpH === prevH) return;
      prevW = vpW;
      prevH = vpH;

      const newGrid = computeClusterGrid(vpW, vpH);

      if (newGrid.totalClusters !== grid.totalClusters) {
        aabbBuffer = root.createBuffer(d.arrayOf(ClusterAABB, newGrid.totalClusters)).$usage('storage');
        lightGridBuffer = root.createBuffer(d.arrayOf(d.vec2u, newGrid.totalClusters)).$usage('storage');
        indexListBuffer = root.createBuffer(
          d.arrayOf(d.u32, newGrid.totalClusters * MAX_LIGHTS_PER_CLUSTER),
        ).$usage('storage');

        lightingBindGroup = makeLightingBindGroup();
        buildBindGroup = makeBuildBindGroup();
        cullingBindGroup = makeCullingBindGroup();
      }

      grid = newGrid;
      dirty = true;
    },

    prepare(vpW, vpH, near, far, invProjX, invProjY) {
      packClusterConfig(
        configStaged.f32, configStaged.u32,
        grid.gridX, grid.gridY, grid.gridZ, grid.tileSize,
        near, far, vpW, vpH, invProjX, invProjY,
      );
      configStaged.flush();
    },

    dispatch() {
      // Build cluster AABBs (only when grid changed)
      if (dirty) {
        buildPipeline
          .with(buildBindGroup)
          .dispatchWorkgroups(
            Math.ceil(grid.gridX / 4),
            Math.ceil(grid.gridY / 4),
            Math.ceil(grid.gridZ / 4),
          );
        dirty = false;
      }

      // Reset global counter
      root.device.queue.writeBuffer(counterBuffer.buffer, 0, new Uint32Array([0]));

      // Light culling
      cullingPipeline
        .with(cullingBindGroup)
        .dispatchWorkgroups(Math.ceil(grid.totalClusters / 64), 1, 1);
    },
  };

  return system;
}
