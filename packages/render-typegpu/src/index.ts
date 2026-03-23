// GPU services
export { createGpuServices, type GpuServices, type TgpuRoot } from './gpu.js';

// Core utilities
export {
  type StagedBuffer,
  createStagedBuffer,
  packCamera,
  packLightConstants,
  packClusterConfig,
} from './stagedBuffer.js';

// Schemas & stride constants
export {
  CameraUniform,
  MaterialGpu,
  InstanceGpu,
  MeshVertex,
  LightGpu,
  LightConstants,
  ClusterConfig,
  ClusterAABB,
  GlobalCounter,
  LIGHT_TYPE_POINT,
  LIGHT_TYPE_SPOT,
  LIGHT_TYPE_DIRECTIONAL,
  INSTANCE_STRIDE,
  INSTANCE_FLOATS,
  LIGHT_STRIDE,
  LIGHT_FLOATS,
  CAMERA_STRIDE,
  LIGHT_CONSTANTS_STRIDE,
  CLUSTER_CONFIG_STRIDE,
} from './schemas.js';

// Layouts
export {
  SceneGroup,
  LightingGroup,
  ClusterBuildGroup,
  LightCullingGroup,
} from './layouts.js';

// GPU data types (cold-path TypeGPU write boundary)
export { type GpuVec2, type GpuVec3, type GpuVec4 } from './gpuData.js';

// Renderer config
export { type RendererConfig, DEFAULT_RENDERER_CONFIG } from './rendererConfig.js';

// Resources
export { MeshVertexLayout, type MeshGpu, type MeshVertexData, uploadMesh } from './resources/meshGpu.js';
export { MATERIAL_PALETTE, writeDefaultMaterials } from './resources/materialGpu.js';
export { createBaseColorTexture } from './resources/textureGpu.js';
export {
  computeClusterGrid,
  type ClusterGridInfo,
  DEFAULT_TILE_SIZE,
  DEFAULT_DEPTH_SLICES,
  MAX_LIGHTS_PER_CLUSTER,
} from './resources/clusterGpu.js';

// Shaders (BRDF kernels)
export {
  D_GGX,
  V_SmithGGXCorrelated,
  F_Schlick,
  evaluatePBR,
  attenuationWindowed,
  attenuationSpot,
  linearToSrgb,
} from './shaders/brdf.js';

// Shaders (cluster math)
export {
  sphereAABBIntersect,
  clusterIndex,
  linearizeDepth,
} from './shaders/clusterMath.js';

// Extract
export {
  type CandidateValue,
  type DrawBatch,
  type FrameExtract,
  createFrameExtract,
  extractFrame,
} from './extract/frameExtract.js';
export {
  type LightExtract,
  createLightExtract,
  extractLights,
} from './extract/lightExtract.js';

// Systems
export { type SceneSystem, createSceneSystem } from './systems/sceneSystem.js';
export { type LightingSystem, createLightingSystem } from './systems/lightingSystem.js';
export { type ClusterSystem, createClusterSystem } from './systems/clusterSystem.js';

// Pipelines
export { createStaticMeshPipeline } from './pipelines/staticMesh.js';
export { createClusterBuildPipeline } from './pipelines/clusterBuild.js';
export { createLightCullingPipeline } from './pipelines/lightCulling.js';

// Renderer
export { createRenderer } from './renderer.js';
