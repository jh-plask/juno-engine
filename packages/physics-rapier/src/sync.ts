import { addComponents, query, asBuffer } from 'bitecs';
import type { EngineWorld } from '@engine/engine/types.js';
import {
  BodyRef,
  DynamicBody,
  KinematicBody,
  LocalTransform,
  WorldTransform,
  Parent,
  NO_PARENT,
} from '@engine/ecs/components.js';
import { markSubtreeDirty } from '@engine/ecs/commands.js';
import type { PhysicsServices } from './runtime.js';

function allocBodyHandle(physics: PhysicsServices, body: unknown): number {
  const id = physics.bodyStore.length;
  physics.bodyStore.push(body);
  return id;
}

/**
 * Create a dynamic box rigid body and attach it to an entity.
 */
export function addDynamicBoxBody(
  world: EngineWorld,
  eid: number,
  halfX: number,
  halfY: number,
  halfZ: number,
): void {
  if (Parent.value[eid] !== NO_PARENT) {
    throw new Error(
      `addDynamicBoxBody: entity ${eid} has parent ${Parent.value[eid]}. ` +
      `Dynamic bodies must be root entities. Attach child visuals via ChildOf.`
    );
  }

  const physics = world.physics as PhysicsServices;
  const { RAPIER, world: rapierWorld } = physics;

  const rbDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(
    LocalTransform.px[eid]!,
    LocalTransform.py[eid]!,
    LocalTransform.pz[eid]!,
  );

  const rb = rapierWorld.createRigidBody(rbDesc);
  const col = RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ);
  rapierWorld.createCollider(col, rb);

  addComponents(world as Parameters<typeof addComponents>[0], eid, DynamicBody, BodyRef);
  BodyRef.value[eid] = allocBodyHandle(physics, rb);
}

/**
 * Create a kinematic box rigid body and attach it to an entity.
 */
export function addKinematicBoxBody(
  world: EngineWorld,
  eid: number,
  halfX: number,
  halfY: number,
  halfZ: number,
): void {
  if (Parent.value[eid] !== NO_PARENT) {
    throw new Error(
      `addKinematicBoxBody: entity ${eid} has parent ${Parent.value[eid]}. ` +
      `Kinematic bodies must be root entities.`
    );
  }

  const physics = world.physics as PhysicsServices;
  const { RAPIER, world: rapierWorld } = physics;

  const rbDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
    LocalTransform.px[eid]!,
    LocalTransform.py[eid]!,
    LocalTransform.pz[eid]!,
  );

  const rb = rapierWorld.createRigidBody(rbDesc);
  const col = RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ);
  rapierWorld.createCollider(col, rb);

  addComponents(world as Parameters<typeof addComponents>[0], eid, KinematicBody, BodyRef);
  BodyRef.value[eid] = allocBodyHandle(physics, rb);
}

/**
 * Push ECS kinematic positions into Rapier before stepping.
 */
export function syncKinematicsToRapier(world: EngineWorld): void {
  const physics = world.physics as PhysicsServices;
  const entities = query(
    world as Parameters<typeof query>[0],
    [KinematicBody, BodyRef, LocalTransform],
    asBuffer,
  );

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    const rb = physics.bodyStore[BodyRef.value[eid]!] as any;
    if (!rb) continue;

    rb.setNextKinematicTranslation({
      x: LocalTransform.px[eid]!,
      y: LocalTransform.py[eid]!,
      z: LocalTransform.pz[eid]!,
    });

    rb.setNextKinematicRotation({
      x: LocalTransform.qx[eid]!,
      y: LocalTransform.qy[eid]!,
      z: LocalTransform.qz[eid]!,
      w: LocalTransform.qw[eid]!,
    });
  }
}

/**
 * Pull Rapier dynamic body positions/rotations back into the ECS after stepping.
 */
export function syncDynamicsFromRapier(world: EngineWorld): void {
  const physics = world.physics as PhysicsServices;
  const entities = query(
    world as Parameters<typeof query>[0],
    [DynamicBody, BodyRef, LocalTransform],
    asBuffer,
  );

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    const rb = physics.bodyStore[BodyRef.value[eid]!] as any;
    if (!rb) continue;

    const t = rb.translation();
    const r = rb.rotation();

    LocalTransform.px[eid] = t.x;
    LocalTransform.py[eid] = t.y;
    LocalTransform.pz[eid] = t.z;

    LocalTransform.qx[eid] = r.x;
    LocalTransform.qy[eid] = r.y;
    LocalTransform.qz[eid] = r.z;
    LocalTransform.qw[eid] = r.w;

    markSubtreeDirty(world, eid);
  }
}
