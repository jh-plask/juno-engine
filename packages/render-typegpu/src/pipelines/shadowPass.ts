/**
 * Shadow depth pass using raw WebGPU.
 *
 * TypeGPU's render pipeline chain doesn't support depth-only passes
 * (no fragment shader = empty WGSL struct error, dummy color target
 * adds complexity). The shadow pass is trivial enough that raw WebGPU
 * is cleaner and more reliable.
 *
 * The WGSL shader reads instance data from the same SceneGroup storage
 * buffer used by the main forward pass. The light VP matrix is passed
 * via a separate uniform buffer.
 */

import type { TgpuRoot } from '../gpu.js';

const SHADOW_WGSL = /* wgsl */ `
struct Instance {
  model0: vec4f, model1: vec4f, model2: vec4f, model3: vec4f,
  material: u32, entity: u32, flags: u32, _pad: u32,
};

@group(0) @binding(0) var<uniform> lightViewProj: mat4x4f;
@group(1) @binding(1) var<storage, read> instances: array<Instance>;

struct VertexInput {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
  @location(3) tangent: vec4f,
  @builtin(instance_index) instanceIndex: u32,
};

@vertex fn vs(input: VertexInput) -> @builtin(position) vec4f {
  let inst = instances[input.instanceIndex];
  let model = mat4x4f(inst.model0, inst.model1, inst.model2, inst.model3);
  let worldPos = model * vec4f(input.position, 1.0);
  let clipPos = lightViewProj * worldPos;
  // Debug: ensure depth is in [0,1] range
  return clipPos;
}
`;

export interface ShadowPassResources {
  pipeline: GPURenderPipeline;
  lightVPBuffer: GPUBuffer;
  lightVPBindGroup: GPUBindGroup;
  bindGroupLayout0: GPUBindGroupLayout;
}

export function createShadowPass(root: TgpuRoot): ShadowPassResources {
  const device = root.device;

  const shaderModule = device.createShaderModule({ code: SHADOW_WGSL });

  // Group 0: light VP matrix (uniform)
  const bindGroupLayout0 = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX,
      buffer: { type: 'uniform' },
    }],
  });

  // Group 1: instance storage buffer — will be bound from the scene's existing buffer
  const bindGroupLayout1 = device.createBindGroupLayout({
    entries: [{
      binding: 1,
      visibility: GPUShaderStage.VERTEX,
      buffer: { type: 'read-only-storage' },
    }],
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout0, bindGroupLayout1],
  });

  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: shaderModule,
      entryPoint: 'vs',
      buffers: [{
        // MeshVertex: position(vec3f) + normal(vec3f) + uv(vec2f) + tangent(vec4f)
        arrayStride: 48, // 12 + 12 + 8 + 16
        stepMode: 'vertex',
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position
          { shaderLocation: 1, offset: 12, format: 'float32x3' }, // normal
          { shaderLocation: 2, offset: 24, format: 'float32x2' }, // uv
          { shaderLocation: 3, offset: 32, format: 'float32x4' }, // tangent
        ],
      }],
    },
    // No fragment stage — depth-only
    primitive: {
      topology: 'triangle-list',
      cullMode: 'none', // DEBUG: no culling to verify geometry renders
    },
    depthStencil: {
      format: 'depth32float',
      depthWriteEnabled: true,
      depthCompare: 'less',
      depthBias: 4,
      depthBiasSlopeScale: 2.0,
      depthBiasClamp: 0.01,
    },
  });

  // Light VP uniform buffer
  const lightVPBuffer = device.createBuffer({
    size: 64, // mat4x4f = 16 floats × 4 bytes
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const lightVPBindGroup = device.createBindGroup({
    layout: bindGroupLayout0,
    entries: [{ binding: 0, resource: { buffer: lightVPBuffer } }],
  });

  return { pipeline, lightVPBuffer, lightVPBindGroup, bindGroupLayout0 };
}

/**
 * Create bind group 1 for shadow pass — wraps the scene's instance buffer.
 * Called once (or when instance buffer changes).
 */
export function createShadowInstanceBindGroup(
  device: GPUDevice,
  layout: GPUBindGroupLayout,
  instanceBuffer: GPUBuffer,
): GPUBindGroup {
  return device.createBindGroup({
    layout,
    entries: [{ binding: 1, resource: { buffer: instanceBuffer } }],
  });
}
