/** The Isles V1 · Yautja movement on the tile columns: run, jump, climb, swim, cloak.
 * Pure and deterministic: the same actor, input, map and dt always give the same result. */
import {heightAtV1, isDeepWaterV1, isWetV1, kindAtV1, tileAtV1, type IslesMapV1, type IslesTileKindV1} from "./islesMapV1";

export interface IslesMovementTuningV1 {
  walkSpeed: number; runSpeed: number; swimSpeed: number; acceleration: number; gravity: number;
  jumpSpeed: number; stepHeight: number; climbSpeed: number; climbMaxHeight: number; climbPushDot: number;
  radius: number; bodyHeight: number; waterLevel: number; swimDepth: number; climbable: string[];
}
export interface IslesCloakTuningV1 {
  capacity: number; drainPerSecond: number; runDrainPerSecond: number; regenPerSecond: number;
  minToEngage: number; waterRevealSeconds: number;
}

/** Position is the centre of the feet, in metres; y is up. */
export interface IslesActorV1 {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  facing: number;
  grounded: boolean;
  climbing: boolean;
  climbTop: number;
  climbX: number;
  climbZ: number;
  swimming: boolean;
  wading: boolean;
  running: boolean;
  cloaked: boolean;
  cloakEnergy: number;
  revealSeconds: number;
}

/** World-space movement intent (|move| ≤ 1); `jump` and `cloak` are presses of this step. */
export interface IslesMoveInputV1 { moveX: number; moveZ: number; run: boolean; jump: boolean; cloak: boolean }

export type IslesMoveEventV1 = "jump" | "land" | "climb-start" | "climb-end" | "swim" | "cloak-on" | "cloak-off" | "revealed";

export const NO_MOVE_INPUT_V1: IslesMoveInputV1 = {moveX: 0, moveZ: 0, run: false, jump: false, cloak: false};

/** New actor standing on the ground at a world point. */
export function createIslesActorV1(map: IslesMapV1, x: number, z: number, cloak: IslesCloakTuningV1): IslesActorV1 {
  const [tx, tz] = tileAtV1(map, x, z);
  return {x, y: Math.max(0, heightAtV1(map, tx, tz)), z, vx: 0, vy: 0, vz: 0, facing: 0, grounded: true,
    climbing: false, climbTop: 0, climbX: 0, climbZ: 0, swimming: false, wading: false, running: false,
    cloaked: false, cloakEnergy: cloak.capacity, revealSeconds: 0};
}

interface Footprint { top: number; kind: IslesTileKindV1; allDeep: boolean; centerKind: IslesTileKindV1 }

/** Highest column under the body square, and whether all of it is deep water. */
export function footprintV1(map: IslesMapV1, x: number, z: number, radius: number): Footprint {
  const t = map.tileMeters;
  let top = -Infinity, kind: IslesTileKindV1 = "water", allDeep = true;
  for (let tz = Math.floor((z - radius) / t); tz <= Math.floor((z + radius) / t); tz++) {
    for (let tx = Math.floor((x - radius) / t); tx <= Math.floor((x + radius) / t); tx++) {
      const h = heightAtV1(map, tx, tz), k = kindAtV1(map, tx, tz);
      if (!isDeepWaterV1(k)) allDeep = false;
      if (h > top) { top = h; kind = k; }
    }
  }
  const [cx, cz] = tileAtV1(map, x, z);
  return {top, kind, allDeep, centerKind: kindAtV1(map, cx, cz)};
}

/** Column that stops a body standing at height y, or null when the way is free. */
function blockerV1(map: IslesMapV1, x: number, z: number, y: number, m: IslesMovementTuningV1): Footprint | null {
  const print = footprintV1(map, x, z, m.radius);
  return print.top > y + m.stepHeight ? print : null;
}

/** Advances one actor by dt seconds. */
export function stepIslesActorV1(previous: IslesActorV1, input: IslesMoveInputV1, map: IslesMapV1,
  m: IslesMovementTuningV1, cloak: IslesCloakTuningV1, rawDt: number): {actor: IslesActorV1; events: IslesMoveEventV1[]} {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  const a: IslesActorV1 = {...previous};
  const events: IslesMoveEventV1[] = [];
  const magnitude = Math.min(1, Math.hypot(input.moveX, input.moveZ));
  const dirX = magnitude > 1e-4 ? input.moveX / Math.hypot(input.moveX, input.moveZ) : 0;
  const dirZ = magnitude > 1e-4 ? input.moveZ / Math.hypot(input.moveX, input.moveZ) : 0;
  a.running = input.run && magnitude > 0.1 && !a.swimming;

  if (a.climbing) {
    const pushing = magnitude > 0.1 && dirX * a.climbX + dirZ * a.climbZ > m.climbPushDot;
    a.vx = 0; a.vz = 0;
    if (!pushing) {
      a.climbing = false;
      a.vy = 0;
    } else {
      a.vy = m.climbSpeed;
      a.y = Math.min(a.climbTop, a.y + m.climbSpeed * dt);
      if (a.y >= a.climbTop - 1e-6) {
        a.climbing = false;
        a.vy = 0;
        // Pull the body over the lip so it stands on the top.
        a.x += a.climbX * (m.radius + 0.15);
        a.z += a.climbZ * (m.radius + 0.15);
        a.grounded = true;
        events.push("climb-end");
      }
    }
  } else {
    const speed = a.swimming ? m.swimSpeed : a.running ? m.runSpeed : m.walkSpeed;
    const targetX = dirX * speed * magnitude, targetZ = dirZ * speed * magnitude;
    const change = m.acceleration * dt;
    const dx = targetX - a.vx, dz = targetZ - a.vz, delta = Math.hypot(dx, dz);
    if (delta <= change) { a.vx = targetX; a.vz = targetZ; } else { a.vx += dx / delta * change; a.vz += dz / delta * change; }

    const limitX = map.width * map.tileMeters - m.radius, limitZ = map.depth * map.tileMeters - m.radius;
    const tryClimb = (block: Footprint, axisX: number, axisZ: number) => {
      const pushing = dirX * axisX + dirZ * axisZ > m.climbPushDot;
      if (pushing && m.climbable.includes(block.kind) && block.top - a.y <= m.climbMaxHeight && !a.swimming) {
        a.climbing = true; a.climbTop = block.top; a.climbX = axisX; a.climbZ = axisZ;
        a.vx = 0; a.vz = 0; a.vy = 0;
        events.push("climb-start");
        return true;
      }
      return false;
    };
    const nextX = Math.min(limitX, Math.max(m.radius, a.x + a.vx * dt));
    const blockX = blockerV1(map, nextX, a.z, a.y, m);
    if (blockX) { if (!tryClimb(blockX, Math.sign(a.vx), 0)) a.vx = 0; } else a.x = nextX;
    if (!a.climbing) {
      const nextZ = Math.min(limitZ, Math.max(m.radius, a.z + a.vz * dt));
      const blockZ = blockerV1(map, a.x, nextZ, a.y, m);
      if (blockZ) { if (!tryClimb(blockZ, 0, Math.sign(a.vz))) a.vz = 0; } else a.z = nextZ;
    }
  }

  if (!a.climbing) {
    const print = footprintV1(map, a.x, a.z, m.radius);
    const floor = print.allDeep ? m.waterLevel - m.swimDepth : print.top;
    if (input.jump && a.grounded && !a.swimming) { a.vy = m.jumpSpeed; a.grounded = false; events.push("jump"); }
    if (a.grounded && floor > a.y && floor <= a.y + m.stepHeight) a.y = floor;
    a.vy -= m.gravity * dt;
    a.y += a.vy * dt;
    if (a.y <= floor) {
      if (!a.grounded && previous.vy < -2) events.push("land");
      a.y = floor; a.vy = 0; a.grounded = true;
    } else if (a.y > floor + 0.05) {
      a.grounded = false;
    }
    const wasSwimming = a.swimming;
    a.swimming = print.allDeep && a.y <= m.waterLevel - m.swimDepth + 0.05;
    a.wading = !a.swimming && isWetV1(print.centerKind) && a.y <= m.waterLevel;
    if (a.swimming && !wasSwimming) events.push("swim");
  }

  const horizontal = Math.hypot(a.vx, a.vz);
  if (horizontal > 0.2) a.facing = Math.atan2(a.vx, a.vz);
  else if (a.climbing) a.facing = Math.atan2(a.climbX, a.climbZ);

  // Cloak (section 4.3): water reveals, the field drains faster at a run.
  a.revealSeconds = Math.max(0, a.revealSeconds - dt);
  if (a.swimming || a.wading) {
    if (a.cloaked) { a.cloaked = false; events.push("revealed"); }
    a.revealSeconds = cloak.waterRevealSeconds;
  }
  if (input.cloak) {
    if (a.cloaked) { a.cloaked = false; events.push("cloak-off"); }
    else if (a.cloakEnergy >= cloak.minToEngage && a.revealSeconds <= 0) { a.cloaked = true; events.push("cloak-on"); }
  }
  if (a.cloaked) {
    a.cloakEnergy -= (a.running ? cloak.runDrainPerSecond : cloak.drainPerSecond) * dt;
    if (a.cloakEnergy <= 0) { a.cloakEnergy = 0; a.cloaked = false; events.push("cloak-off"); }
  } else {
    a.cloakEnergy = Math.min(cloak.capacity, a.cloakEnergy + cloak.regenPerSecond * dt);
  }
  return {actor: a, events};
}
