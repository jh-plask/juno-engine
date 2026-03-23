// Components
export {
  MAX,
  NO_PARENT,
  Node,
  Renderable,
  Camera,
  Static,
  DynamicBody,
  KinematicBody,
  DirtyBounds,
  PointLight,
  SpotLight,
  DirectionalLight,
  Light,
  LocalTransform,
  Parent,
  WorldTransform,
  Bounds,
  MeshRef,
  MaterialRef,
  BodyRef,
  meshOf,
  materialOf,
  bodyOf,
} from './components.js';

// Relations
export { ChildOf, OwnedBy } from './relations.js';

// World
export { createEngineWorld } from './world.js';

// Commands
export {
  createNode,
  attach,
  detach,
  setLocalPosition,
  setLocalRotation,
  setLocalScale,
  spawnStaticMesh,
  markSubtreeDirty,
} from './commands.js';

// Systems
export { updateWorldTransforms } from './systems/transforms.js';
export { updateVisibility } from './systems/visibility.js';

// Prefabs
export {
  spawnCamera,
  spawnMeshNode,
  spawnDirectionalLight,
  spawnPointLight,
  spawnSpotLight,
} from './prefabs.js';

// Serialization
export { createWorldSnapshotIO, rebuildHierarchy } from './serialization.js';
