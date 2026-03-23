import type { EngineWorld } from '@engine/engine/types.js';
import {
  createNode,
  setLocalPosition,
  setLocalScale,
  spawnStaticMesh,
} from '@engine/ecs/commands.js';
import {
  spawnCamera,
  spawnDirectionalLight,
  spawnPointLight,
  spawnSpotLight,
} from '@engine/ecs/prefabs.js';

const MESH_CUBE = 0, MESH_SPHERE = 1, MESH_CYLINDER = 2;
const MESH_TORUS = 3, MESH_PLANE = 4, MESH_CONE = 5;
const MAT_ORANGE = 0, MAT_GROUND = 1, MAT_GOLD = 2, MAT_RED_GLOSS = 3;
const MAT_BLUE_RUBBER = 4, MAT_COPPER = 5, MAT_TEAL = 6;
const MAT_WOOD = 7, MAT_MARBLE = 8, MAT_CHARCOAL = 9;

const GY = -0.5;
function onGround(halfH: number) { return GY + halfH; }

export interface SceneResult {
  root: number; entities: number[];
  dynamicBodies: { eid: number; halfW: number; halfH: number; halfD: number }[];
  orbitingLights: number[]; bobbingMeshes: number[]; spotLights: number[];
  sun: number;
}

export function populateScene(world: EngineWorld): SceneResult {
  const root = createNode(world);
  const entities: number[] = [];
  const dynamicBodies: SceneResult['dynamicBodies'] = [];
  const orbitingLights: number[] = [];
  const bobbingMeshes: number[] = [];
  const spotLights: number[] = [];

  spawnCamera(world, 0, 5, 16);

  // ── Lights ────────────────────────────────────────────────────────────

  // Primary directional — strong shadow, will be animated (sun rotation)
  const sun = spawnDirectionalLight(world, 0.4, -0.8, -0.4, 1.0, 0.95, 0.85, 2.5);
  // Soft fill (static)
  spawnDirectionalLight(world, -0.5, -0.3, 0.3, 0.4, 0.5, 0.7, 0.6);

  // 2 orbiting spot lights with shadow
  const sp0 = spawnSpotLight(world, -5, 10, 4, 0.3, -0.9, -0.2, 1.0, 0.9, 0.7, 300, 28, Math.PI/7, Math.PI/3.5);
  const sp1 = spawnSpotLight(world, 5, 10, 4, -0.3, -0.9, -0.2, 0.5, 0.7, 1.0, 300, 28, Math.PI/7, Math.PI/3.5);
  spotLights.push(sp0, sp1);

  // Orbiting point lights (fill)
  const orb0 = spawnPointLight(world, 5, 3, 0, 1.0, 0.4, 0.2, 15, 12);
  const orb1 = spawnPointLight(world, -5, 3, 0, 0.2, 0.5, 1.0, 15, 12);
  orbitingLights.push(orb0, orb1);

  // ── Ground + backdrop walls ─────────────────────────────────────────

  const ground = spawnStaticMesh(world, MESH_PLANE, MAT_GROUND, root);
  setLocalPosition(world, ground, 0, GY, 0);

  // Back wall
  const backWall = spawnStaticMesh(world, MESH_CUBE, MAT_MARBLE, root);
  setLocalScale(world, backWall, 20, 8, 0.3);
  setLocalPosition(world, backWall, 0, GY + 4, -12);
  entities.push(backWall);

  // Left wall
  const leftWall = spawnStaticMesh(world, MESH_CUBE, MAT_MARBLE, root);
  setLocalScale(world, leftWall, 0.3, 6, 12);
  setLocalPosition(world, leftWall, -10, GY + 3, -2);
  entities.push(leftWall);

  // Right wall
  const rightWall = spawnStaticMesh(world, MESH_CUBE, MAT_MARBLE, root);
  setLocalScale(world, rightWall, 0.3, 6, 12);
  setLocalPosition(world, rightWall, 10, GY + 3, -2);
  entities.push(rightWall);

  // ── Center pedestal + gold sphere ─────────────────────────────────────

  const pedestal = spawnStaticMesh(world, MESH_CUBE, MAT_MARBLE, root);
  setLocalScale(world, pedestal, 1.5, 0.6, 1.5);
  setLocalPosition(world, pedestal, 0, onGround(0.3), 0);
  entities.push(pedestal);

  const centerSphere = spawnStaticMesh(world, MESH_SPHERE, MAT_GOLD, root);
  setLocalScale(world, centerSphere, 1.1, 1.1, 1.1);
  setLocalPosition(world, centerSphere, 0, onGround(0.6) + 0.55, 0);
  bobbingMeshes.push(centerSphere);
  entities.push(centerSphere);

  // ── Left — teal ──────────────────────────────────────────────────────

  const tealSphere = spawnStaticMesh(world, MESH_SPHERE, MAT_TEAL, root);
  setLocalScale(world, tealSphere, 1.4, 1.4, 1.4);
  setLocalPosition(world, tealSphere, -4.5, onGround(0.7), -1);
  entities.push(tealSphere);

  const tealCyl = spawnStaticMesh(world, MESH_CYLINDER, MAT_TEAL, root);
  setLocalScale(world, tealCyl, 0.6, 0.8, 0.6);
  setLocalPosition(world, tealCyl, -3.5, onGround(0.4), 2);
  entities.push(tealCyl);

  // ── Right — red glossy ────────────────────────────────────────────────

  const redCube = spawnStaticMesh(world, MESH_CUBE, MAT_RED_GLOSS, root);
  setLocalPosition(world, redCube, 4.5, onGround(0.5), 0.5);
  bobbingMeshes.push(redCube);
  entities.push(redCube);

  const redCone = spawnStaticMesh(world, MESH_CONE, MAT_RED_GLOSS, root);
  setLocalPosition(world, redCone, 3.5, onGround(0.5), 2.5);
  entities.push(redCone);

  // ── Back — copper ─────────────────────────────────────────────────────

  const copperSphere = spawnStaticMesh(world, MESH_SPHERE, MAT_COPPER, root);
  setLocalScale(world, copperSphere, 1.4, 1.4, 1.4);
  setLocalPosition(world, copperSphere, -2, onGround(0.7), -4.5);
  entities.push(copperSphere);

  const copperCyl = spawnStaticMesh(world, MESH_CYLINDER, MAT_COPPER, root);
  setLocalScale(world, copperCyl, 0.5, 1.4, 0.5);
  setLocalPosition(world, copperCyl, 0, onGround(0.7), -5.5);
  entities.push(copperCyl);

  // ── Marble pillars ────────────────────────────────────────────────────

  for (let i = 0; i < 5; i++) {
    const eid = spawnStaticMesh(world, MESH_CYLINDER, MAT_MARBLE, root);
    setLocalScale(world, eid, 0.35, 3, 0.35);
    setLocalPosition(world, eid, (i - 2) * 4, onGround(1.5), -9);
    entities.push(eid);
  }

  // ── Floating torus chain ──────────────────────────────────────────────

  const torusMats = [MAT_GOLD, MAT_COPPER, MAT_RED_GLOSS, MAT_TEAL, MAT_BLUE_RUBBER];
  for (let i = 0; i < 5; i++) {
    const eid = spawnStaticMesh(world, MESH_TORUS, torusMats[i]!, root);
    setLocalScale(world, eid, 1.3, 1.3, 1.3);
    setLocalPosition(world, eid, (i - 2) * 2.5, 5.5, -3);
    bobbingMeshes.push(eid);
    entities.push(eid);
  }

  // ── Physics bodies — lots of falling cubes and spheres ──────────────

  const physicsMats = [MAT_ORANGE, MAT_RED_GLOSS, MAT_BLUE_RUBBER, MAT_TEAL, MAT_GOLD, MAT_COPPER, MAT_MARBLE, MAT_WOOD, MAT_CHARCOAL];
  const physicsMeshes = [MESH_CUBE, MESH_CUBE, MESH_SPHERE, MESH_CUBE, MESH_SPHERE, MESH_CUBE, MESH_CUBE, MESH_SPHERE, MESH_CUBE];

  for (let i = 0; i < 200; i++) {
    const mesh = physicsMeshes[i % physicsMeshes.length]!;
    const mat = physicsMats[i % physicsMats.length]!;
    const eid = spawnStaticMesh(world, mesh, mat);
    const s = 0.3 + Math.random() * 0.35;
    setLocalScale(world, eid, s, s, s);
    const col = i % 12;
    const row = Math.floor(i / 12);
    setLocalPosition(world, eid,
      (col - 5.5) * 1.2 + (Math.random() - 0.5) * 0.6,
      5 + row * 1.5 + Math.random() * 1.5,
      (Math.random() - 0.5) * 8,
    );
    entities.push(eid);
    dynamicBodies.push({ eid, halfW: s / 2, halfH: s / 2, halfD: s / 2 });
  }

  return { root, entities, dynamicBodies, orbitingLights, bobbingMeshes, spotLights, sun };
}
