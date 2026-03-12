// GPU services
export { createGpuServices, type GpuServices, type TgpuRoot } from './gpu.js';

// Schemas
export {
  CameraUniform,
  MaterialGpu,
  InstanceGpu,
  CullState,
  MeshVertex,
  CandidateSphere,
} from './schemas.js';

// Layouts
export { SceneGroup, CullGroup } from './layouts.js';

// GPU data types (cold-path TypeGPU write boundary)
export { type GpuVec2, type GpuVec3, type GpuVec4 } from './gpuData.js';

// GPU writers (hot-path zero-copy)
export {
  type InstanceWriter,
  type CameraWriter,
  createInstanceWriter,
  createCameraWriter,
  INSTANCE_STRIDE,
  INSTANCE_FLOATS,
} from './gpuWrite.js';

// Renderer config
export { type RendererConfig, DEFAULT_RENDERER_CONFIG } from './rendererConfig.js';

// Resources
export { MeshVertexLayout, type MeshGpu, type MeshVertexData, uploadMesh } from './resources/meshGpu.js';
export { createMaterialBuffer, createInstanceBuffer, writeDefaultMaterials } from './resources/materialGpu.js';
export { createBaseColorTexture } from './resources/textureGpu.js';

// Extract
export {
  type CandidateValue,
  type DrawBatch,
  type FrameExtract,
  createFrameExtract,
  extractFrame,
} from './extract/frameExtract.js';

// Pipelines
export { createStaticMeshPipeline } from './pipelines/staticMesh.js';
export { type DebugBlitPipeline, createDebugBlitPipelineDesc } from './pipelines/debugBlit.js';

// Renderer
export { createRenderer } from './renderer.js';
