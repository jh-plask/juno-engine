/**
 * Scene subsystem — camera, instances, materials.
 *
 * Manages the SceneGroup bind group (group 0) resources.
 * Follows the uniform subsystem pattern: create → extract → flush.
 */

import { query, asBuffer } from 'bitecs';
import { mat4 } from 'wgpu-matrix';
import { d } from 'typegpu';
import type { EngineWorld } from '@engine/engine/types.js';
import { Camera, WorldTransform } from '@engine/ecs/components.js';
import type { TgpuRoot } from '../gpu.js';
import { CameraUniform, InstanceGpu, MaterialGpu } from '../schemas.js';
import { SceneGroup } from '../layouts.js';
import { writeDefaultMaterials } from '../resources/materialGpu.js';
import { createStagedBuffer, packCamera, type StagedBuffer } from '../stagedBuffer.js';
import { INSTANCE_STRIDE } from '../schemas.js';
import {
  createFrameExtract,
  extractFrame,
  type FrameExtract,
} from '../extract/frameExtract.js';

// Scratch matrices — avoid per-frame allocation
const scratchView = mat4.create();
const scratchProj = mat4.create();
const scratchViewProj = mat4.create();
const scratchWorldMat = mat4.create();

export interface SceneSystem {
  /** Bind group for render pipelines (SceneGroup, index 0). */
  readonly bindGroup: ReturnType<TgpuRoot['createBindGroup']>;
  /** Camera GPU buffer — exposed for other subsystems that need camera data. */
  readonly cameraBuffer: ReturnType<TgpuRoot['createBuffer']>;
  /** Per-frame extraction result (batches, instance count). */
  readonly frame: FrameExtract;
  /** Staged instance buffer (consumers read f32/u32 for extraction). */
  readonly instances: StagedBuffer;
  /** Current camera state (updated by prepare()). */
  readonly camera: {
    readonly view: Float32Array;
    readonly proj: Float32Array;
    readonly viewProj: Float32Array;
    eyeX: number; eyeY: number; eyeZ: number;
  };

  /** Extract ECS data into staging buffers. */
  extract(world: EngineWorld): void;
  /** Upload staging data to GPU. */
  flush(world: EngineWorld, vpW: number, vpH: number, fov: number, near: number, far: number): void;
}

export function createSceneSystem(
  root: TgpuRoot,
  maxInstances: number,
  maxMaterials: number,
): SceneSystem {
  const cameraBuffer = root.createBuffer(CameraUniform).$usage('uniform');
  const instanceBuffer = root.createBuffer(d.arrayOf(InstanceGpu, maxInstances)).$usage('storage');
  const materialBuffer = root.createBuffer(d.arrayOf(MaterialGpu, maxMaterials)).$usage('storage');

  writeDefaultMaterials(materialBuffer, maxMaterials);

  const instances = createStagedBuffer(root.device, instanceBuffer.buffer, maxInstances * INSTANCE_STRIDE);
  const cameraBuf = createStagedBuffer(root.device, cameraBuffer.buffer, 224);

  const bindGroup = root.createBindGroup(SceneGroup, {
    camera: cameraBuffer,
    instances: instanceBuffer,
    materials: materialBuffer,
  });

  const frame = createFrameExtract();
  const cam = {
    view: scratchView,
    proj: scratchProj,
    viewProj: scratchViewProj,
    eyeX: 0, eyeY: 0, eyeZ: 5,
  };

  return {
    bindGroup,
    cameraBuffer,
    frame,
    instances,
    camera: cam,

    extract(world: EngineWorld) {
      extractFrame(world, frame, instances.f32, instances.u32);

      const cameras = query(
        world as Parameters<typeof query>[0],
        [Camera, WorldTransform],
        asBuffer,
      );

      if (cameras.length > 0) {
        const camEid = cameras[0]!;
        const base = camEid * 16;
        scratchWorldMat.set(WorldTransform.m.subarray(base, base + 16));
        mat4.inverse(scratchWorldMat, scratchView);
        cam.eyeX = scratchWorldMat[12]!;
        cam.eyeY = scratchWorldMat[13]!;
        cam.eyeZ = scratchWorldMat[14]!;
      } else {
        mat4.identity(scratchView);
        cam.eyeX = 0; cam.eyeY = 0; cam.eyeZ = 5;
      }
    },

    flush(world: EngineWorld, vpW: number, vpH: number, fov: number, near: number, far: number) {
      const aspect = vpW / vpH;
      mat4.perspective(fov, aspect, near, far, scratchProj);
      mat4.multiply(scratchProj, scratchView, scratchViewProj);

      packCamera(
        cameraBuf.f32, cameraBuf.u32,
        scratchView, scratchProj, scratchViewProj,
        cam.eyeX, cam.eyeY, cam.eyeZ,
        vpW, vpH,
        world.time.now, world.time.frame,
      );
      cameraBuf.flush();
      instances.flush(frame.instanceCount * INSTANCE_STRIDE);
    },
  };
}
