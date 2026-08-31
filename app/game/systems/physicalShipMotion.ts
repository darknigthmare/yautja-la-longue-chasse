/** Physical ship simulation, independent of React and decorative bitmaps. */
import {
  SHIP_LEVEL_WORLD, SHIP_LEVEL_PLAYER, SHIP_LEVEL_SPAWN,
  SHIP_LEVEL_SOLIDS, SHIP_LEVEL_SURFACES, SHIP_LEVEL_LADDERS,
  SHIP_LEVEL_DOORS, SHIP_LEVEL_STATIONS, createShipDoorStates, shipDoorPanel,
  type ShipRectangle, type ShipDoorStates, type PhysicalShipStationDefinition,
} from "./shipLevelLayout";

export {
  SHIP_LEVEL_WORLD as PHYSICAL_SHIP_WORLD,
  SHIP_LEVEL_SURFACES as PHYSICAL_SHIP_SURFACES,
  SHIP_LEVEL_LADDERS as PHYSICAL_SHIP_LADDERS,
  SHIP_LEVEL_STATIONS as PHYSICAL_SHIP_STATIONS,
  SHIP_LEVEL_SOLIDS, SHIP_LEVEL_PLAYER, SHIP_LEVEL_ROOMS, SHIP_LEVEL_SPACES, SHIP_LEVEL_DOORS, SHIP_LEVEL_SHAFTS, SHIP_LEVEL_CORRIDORS,
  createShipDoorStates, stepShipDoorStates, shipDoorPanel, getShipCamera, shipRoomAt, shipSpaceAt,
} from "./shipLevelLayout";
export type { ShipDoorStates, ShipDoorDefinition, PhysicalShipStationDefinition, PhysicalShipStationId } from "./shipLevelLayout";

export interface PhysicalShipMotion {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  facing: -1 | 1;
  onSurface: boolean;
  climbing: boolean;
  phase: number;
}
export interface PhysicalShipHeldControls { left: boolean; right: boolean; up: boolean; down: boolean; jumpQueued: boolean }
export interface PhysicalShipInput { horizontal: number; vertical: number; jump: boolean }
export interface PhysicalShipGamepadSample extends PhysicalShipInput { interact: boolean }

export const PHYSICAL_SHIP_MOVEMENT = { walkSpeed: 275, climbSpeed: 185, jumpSpeed: 395, gravity: 980 } as const;
const EPSILON = 0.001;
const CLOSED_DOORS = createShipDoorStates();

export function clampPhysicalShip(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
export function createPhysicalShipMotion(): PhysicalShipMotion {
  return { ...SHIP_LEVEL_SPAWN, velocityX: 0, velocityY: 0, facing: -1, onSurface: true, climbing: false, phase: 0 };
}
export function clearPhysicalShipControls(): PhysicalShipHeldControls {
  return { left: false, right: false, up: false, down: false, jumpQueued: false };
}
export function resolvePhysicalShipInput(held: PhysicalShipHeldControls, gamepad: PhysicalShipInput, suspended: boolean): PhysicalShipInput {
  if (suspended) return { horizontal: 0, vertical: 0, jump: false };
  return {
    horizontal: clampPhysicalShip(Number(held.right) - Number(held.left) + gamepad.horizontal, -1, 1),
    vertical: clampPhysicalShip(Number(held.down) - Number(held.up) + gamepad.vertical, -1, 1),
    jump: held.jumpQueued || gamepad.jump,
  };
}
/** A pad held while an overlay closes must return to neutral before controlling the deck. */
export function gatePhysicalShipGamepad(sample: PhysicalShipGamepadSample, ready: boolean, suspended: boolean): { ready: boolean; sample: PhysicalShipGamepadSample } {
  const neutral = sample.horizontal === 0 && sample.vertical === 0 && !sample.jump && !sample.interact;
  const nextReady = !suspended && (ready || neutral);
  return { ready: nextReady, sample: nextReady ? sample : { horizontal: 0, vertical: 0, jump: false, interact: false } };
}
export function nearestPhysicalShipStation(player: Pick<PhysicalShipMotion, "x" | "y">): PhysicalShipStationDefinition | null {
  let nearest: PhysicalShipStationDefinition | null = null;
  let nearestDistance = 105;
  for (const station of SHIP_LEVEL_STATIONS) {
    const distance = Math.hypot(player.x - station.x, (player.y - station.y) * 1.35);
    if (distance <= nearestDistance) { nearest = station; nearestDistance = distance; }
  }
  return nearest;
}

export function physicalShipPlayerBounds(player: { x: number; y: number }): ShipRectangle {
  return { x: player.x - SHIP_LEVEL_PLAYER.halfWidth, y: player.y - SHIP_LEVEL_PLAYER.height, width: SHIP_LEVEL_PLAYER.halfWidth * 2, height: SHIP_LEVEL_PLAYER.height };
}
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd - EPSILON && aEnd > bStart + EPSILON;
}
function frameSolids(doorStates: ShipDoorStates): readonly ShipRectangle[] {
  const panels = SHIP_LEVEL_DOORS.flatMap((door) => {
    const panel = shipDoorPanel(door, doorStates[door.id]);
    return panel ? [panel] : [];
  });
  return [...SHIP_LEVEL_SOLIDS, ...panels];
}

/** Swept axes prevent tunnelling through thin bulkheads, even after a long frame. */
function moveHorizontally(player: PhysicalShipMotion, intendedX: number, solids: readonly ShipRectangle[]): number {
  let x = clampPhysicalShip(intendedX, SHIP_LEVEL_PLAYER.halfWidth, SHIP_LEVEL_WORLD.width - SHIP_LEVEL_PLAYER.halfWidth);
  for (const solid of solids) {
    if (!overlaps(player.y - SHIP_LEVEL_PLAYER.height, player.y, solid.y, solid.y + solid.height)) continue;
    if (intendedX > player.x && player.x + SHIP_LEVEL_PLAYER.halfWidth <= solid.x + EPSILON && x + SHIP_LEVEL_PLAYER.halfWidth > solid.x) {
      x = Math.min(x, solid.x - SHIP_LEVEL_PLAYER.halfWidth);
    } else if (intendedX < player.x && player.x - SHIP_LEVEL_PLAYER.halfWidth >= solid.x + solid.width - EPSILON && x - SHIP_LEVEL_PLAYER.halfWidth < solid.x + solid.width) {
      x = Math.max(x, solid.x + solid.width + SHIP_LEVEL_PLAYER.halfWidth);
    }
  }
  return x;
}
function moveVertically(x: number, previousY: number, intendedY: number, solids: readonly ShipRectangle[], ignoreGantry: boolean): { y: number; hit: boolean; floor: boolean } {
  let y = intendedY;
  let hit = false;
  const falling = intendedY >= previousY;
  for (const solid of solids) {
    if (!overlaps(x - SHIP_LEVEL_PLAYER.halfWidth, x + SHIP_LEVEL_PLAYER.halfWidth, solid.x, solid.x + solid.width)) continue;
    if (falling && previousY <= solid.y + EPSILON && y >= solid.y) {
      y = Math.min(y, solid.y); hit = true;
    } else if (!falling && previousY - SHIP_LEVEL_PLAYER.height >= solid.y + solid.height - EPSILON && y - SHIP_LEVEL_PLAYER.height < solid.y + solid.height) {
      y = Math.max(y, solid.y + solid.height + SHIP_LEVEL_PLAYER.height); hit = true;
    }
  }
  if (falling && !ignoreGantry) {
    for (const surface of SHIP_LEVEL_SURFACES) {
      if (surface.kind !== "gantry") continue;
      if (overlaps(x - SHIP_LEVEL_PLAYER.halfWidth, x + SHIP_LEVEL_PLAYER.halfWidth, surface.left, surface.right) && previousY <= surface.y + EPSILON && y >= surface.y) {
        y = Math.min(y, surface.y); hit = true;
      }
    }
  }
  return { y, hit, floor: falling && hit };
}

/** The caller advances doors before the player; a suspended frame preserves both states. */
export function stepPhysicalShipMotion(current: PhysicalShipMotion, input: PhysicalShipInput, elapsedSeconds: number, suspended = false, doorStates: ShipDoorStates = CLOSED_DOORS): PhysicalShipMotion {
  if (suspended) return current;
  const delta = clampPhysicalShip(elapsedSeconds, 0, 0.034);
  if (delta === 0) return current;
  const horizontal = clampPhysicalShip(input.horizontal, -1, 1);
  const vertical = clampPhysicalShip(input.vertical, -1, 1);
  const solids = frameSolids(doorStates);
  let x = moveHorizontally(current, current.x + horizontal * PHYSICAL_SHIP_MOVEMENT.walkSpeed * delta, solids);
  let y = current.y;
  let velocityY = current.velocityY;
  let onSurface = false;
  let climbing = false;
  const facing = horizontal === 0 ? current.facing : horizontal < 0 ? -1 : 1;
  const ladder = SHIP_LEVEL_LADDERS.find((candidate) => Math.abs(x - candidate.x) <= 36 && y >= candidate.top - 12 && y <= candidate.bottom + 12);

  const exitingLadder = ladder && horizontal !== 0 && (
    (vertical < 0 && y <= ladder.top + EPSILON) ||
    (vertical > 0 && y >= ladder.bottom - EPSILON)
  );
  if (ladder && !exitingLadder && !input.jump && (vertical !== 0 || (current.climbing && horizontal === 0))) {
    climbing = true;
    x += (ladder.x - x) * Math.min(1, delta * 10);
    const intendedY = clampPhysicalShip(y + vertical * PHYSICAL_SHIP_MOVEMENT.climbSpeed * delta, ladder.top, ladder.bottom);
    y = moveVertically(x, y, intendedY, solids, true).y;
    velocityY = 0;
    onSurface = Math.abs(y - ladder.top) < EPSILON || Math.abs(y - ladder.bottom) < EPSILON;
  } else {
    if (input.jump && (current.onSurface || current.climbing)) velocityY = -PHYSICAL_SHIP_MOVEMENT.jumpSpeed;
    velocityY += PHYSICAL_SHIP_MOVEMENT.gravity * delta;
    const motion = moveVertically(x, y, y + velocityY * delta, solids, false);
    y = motion.y;
    onSurface = motion.floor;
    if (motion.hit) velocityY = 0;
  }

  const velocityX = (x - current.x) / delta;
  const moving = Math.abs(velocityX) > 0.1 || (climbing && Math.abs(y - current.y) > EPSILON);
  const next: PhysicalShipMotion = { x, y, velocityX, velocityY, facing, onSurface, climbing, phase: (current.phase + (moving ? delta * 1.7 : 0)) % 1 };
  return Object.keys(next).every((key) => next[key as keyof PhysicalShipMotion] === current[key as keyof PhysicalShipMotion]) ? current : next;
}
