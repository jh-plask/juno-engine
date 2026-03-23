import type { EngineWorld } from '@engine/engine/types.js';
import { createNode, attach, setLocalPosition } from './commands.js';
import { addComponents } from 'bitecs';
import {
  Camera,
  DirectionalLight,
  Light,
  MaterialRef,
  MeshRef,
  PointLight,
  Renderable,
  SpotLight,
} from './components.js';

export function spawnCamera(
  world: EngineWorld,
  x: number,
  y: number,
  z: number,
  parent?: number,
): number {
  const eid = createNode(world);
  addComponents(world as Parameters<typeof addComponents>[0], eid, Camera);
  setLocalPosition(world, eid, x, y, z);
  if (parent !== undefined) attach(world, parent, eid);
  return eid;
}

export function spawnMeshNode(
  world: EngineWorld,
  mesh: number,
  material: number,
  x: number,
  y: number,
  z: number,
  parent?: number,
): number {
  const eid = createNode(world);
  addComponents(world as Parameters<typeof addComponents>[0], eid, Renderable, MeshRef, MaterialRef);
  MeshRef.value[eid] = mesh;
  MaterialRef.value[eid] = material;
  setLocalPosition(world, eid, x, y, z);
  if (parent !== undefined) attach(world, parent, eid);
  return eid;
}

// ── Light prefabs ────────────────────────────────────────────────────────────

export function spawnDirectionalLight(
  world: EngineWorld,
  dirX: number, dirY: number, dirZ: number,
  r: number, g: number, b: number,
  intensity: number,
): number {
  const eid = createNode(world);
  addComponents(world as Parameters<typeof addComponents>[0], eid, DirectionalLight, Light);
  Light.colorR[eid] = r;
  Light.colorG[eid] = g;
  Light.colorB[eid] = b;
  Light.intensity[eid] = intensity;
  // Store world-space direction (normalize on GPU)
  Light.dirX[eid] = dirX;
  Light.dirY[eid] = dirY;
  Light.dirZ[eid] = dirZ;
  return eid;
}

export function spawnPointLight(
  world: EngineWorld,
  x: number, y: number, z: number,
  r: number, g: number, b: number,
  intensity: number,
  radius: number,
): number {
  const eid = createNode(world);
  addComponents(world as Parameters<typeof addComponents>[0], eid, PointLight, Light);
  Light.colorR[eid] = r;
  Light.colorG[eid] = g;
  Light.colorB[eid] = b;
  Light.intensity[eid] = intensity;
  Light.radius[eid] = radius;
  setLocalPosition(world, eid, x, y, z);
  return eid;
}

export function spawnSpotLight(
  world: EngineWorld,
  x: number, y: number, z: number,
  dirX: number, dirY: number, dirZ: number,
  r: number, g: number, b: number,
  intensity: number,
  radius: number,
  innerAngle: number,
  outerAngle: number,
): number {
  const eid = createNode(world);
  addComponents(world as Parameters<typeof addComponents>[0], eid, SpotLight, Light);
  Light.colorR[eid] = r;
  Light.colorG[eid] = g;
  Light.colorB[eid] = b;
  Light.intensity[eid] = intensity;
  Light.radius[eid] = radius;
  Light.innerConeAngle[eid] = Math.cos(innerAngle);
  Light.outerConeAngle[eid] = Math.cos(outerAngle);
  Light.dirX[eid] = dirX;
  Light.dirY[eid] = dirY;
  Light.dirZ[eid] = dirZ;
  setLocalPosition(world, eid, x, y, z);
  return eid;
}
