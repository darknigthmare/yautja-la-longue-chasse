/** Ship collision and input model, independent of rendering and decorative art. */
export const PHYSICAL_SHIP_WORLD = { width: 1_400, height: 560, floorY: 480 } as const;

export const PHYSICAL_SHIP_SURFACES = [
  { left: 270, right: 1_080, y: 310 },
  { left: 20, right: 1_380, y: 480 },
] as const;

export const PHYSICAL_SHIP_LADDERS = [
  { x: 320, top: 310, bottom: 480 },
  { x: 1_000, top: 310, bottom: 480 },
] as const;

export type PhysicalShipStationId =
  | "galaxy-map"
  | "wall-armory"
  | "trophy-hall"
  | "clan-archives"
  | "appearance-forge"
  | "medical-bay"
  | "training-arena"
  | "launch-airlock";

export interface PhysicalShipStationDefinition {
  id: PhysicalShipStationId;
  label: string;
  shortLabel: string;
  description: string;
  x: number;
  y: number;
  level: "floor" | "gantry";
}

export const PHYSICAL_SHIP_STATIONS: readonly PhysicalShipStationDefinition[] = [
  { id: "galaxy-map", label: "Carte galactique", shortLabel: "NAVIGATION", description: "Explorer la galaxie et choisir la prochaine chasse.", x: 140, y: 480, level: "floor" },
  { id: "wall-armory", label: "Armurerie murale", shortLabel: "ARMURERIE", description: "Préparer les armes, l’armure et les équipements du départ.", x: 370, y: 310, level: "gantry" },
  { id: "trophy-hall", label: "Mur des trophées", shortLabel: "TROPHÉES", description: "Préparer et exposer les prises rapportées de tes chasses.", x: 560, y: 480, level: "floor" },
  { id: "clan-archives", label: "Archives du clan", shortLabel: "ARCHIVES", description: "Consulter les chasseurs, les rangs, le bestiaire et les chroniques.", x: 650, y: 310, level: "gantry" },
  { id: "appearance-forge", label: "Forge des parures", shortLabel: "PARURES", description: "Ajuster ton chasseur, son biomask, ses plaques et ses ornements.", x: 940, y: 310, level: "gantry" },
  { id: "medical-bay", label: "Baie médicale", shortLabel: "SOINS", description: "Traiter les blessures entre deux chasses.", x: 1_050, y: 480, level: "floor" },
  { id: "training-arena", label: "Cercle d’entraînement", shortLabel: "ENTRAÎNEMENT", description: "Éprouver mobilité, camouflage et acquisition biomask.", x: 800, y: 480, level: "floor" },
  { id: "launch-airlock", label: "Sas de départ", shortLabel: "DÉPART", description: "Vérifier la destination et le chargement avant de partir en chasse.", x: 1_275, y: 480, level: "floor" },
] as const;

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

export interface PhysicalShipHeldControls {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jumpQueued: boolean;
}

export interface PhysicalShipInput {
  horizontal: number;
  vertical: number;
  jump: boolean;
}

export interface PhysicalShipGamepadSample extends PhysicalShipInput {
  interact: boolean;
}

const WALK_SPEED = 210;
const CLIMB_SPEED = 150;
const JUMP_SPEED = 395;
const GRAVITY = 980;

export function clampPhysicalShip(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function createPhysicalShipMotion(): PhysicalShipMotion {
  return { x: 1_275, y: PHYSICAL_SHIP_WORLD.floorY, velocityX: 0, velocityY: 0, facing: -1, onSurface: true, climbing: false, phase: 0 };
}

export function clearPhysicalShipControls(): PhysicalShipHeldControls {
  return { left: false, right: false, up: false, down: false, jumpQueued: false };
}

export function resolvePhysicalShipInput(
  held: PhysicalShipHeldControls,
  gamepad: PhysicalShipInput,
  suspended: boolean,
): PhysicalShipInput {
  if (suspended) return { horizontal: 0, vertical: 0, jump: false };
  return {
    horizontal: clampPhysicalShip(Number(held.right) - Number(held.left) + gamepad.horizontal, -1, 1),
    vertical: clampPhysicalShip(Number(held.down) - Number(held.up) + gamepad.vertical, -1, 1),
    jump: held.jumpQueued || gamepad.jump,
  };
}

/** A pad held while an overlay closes must return to neutral before controlling the deck. */
export function gatePhysicalShipGamepad(
  sample: PhysicalShipGamepadSample,
  ready: boolean,
  suspended: boolean,
): { ready: boolean; sample: PhysicalShipGamepadSample } {
  const neutral = sample.horizontal === 0 && sample.vertical === 0 && !sample.jump && !sample.interact;
  const nextReady = !suspended && (ready || neutral);
  return {
    ready: nextReady,
    sample: nextReady ? sample : { horizontal: 0, vertical: 0, jump: false, interact: false },
  };
}

export function nearestPhysicalShipStation(
  player: Pick<PhysicalShipMotion, "x" | "y">,
): PhysicalShipStationDefinition | null {
  let nearest: PhysicalShipStationDefinition | null = null;
  let nearestDistance = 92;
  for (const station of PHYSICAL_SHIP_STATIONS) {
    const distance = Math.hypot(player.x - station.x, (player.y - station.y) * 1.35);
    if (distance <= nearestDistance) {
      nearest = station;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/** Advance one bounded frame; suspension preserves position and momentum exactly. */
export function stepPhysicalShipMotion(
  current: PhysicalShipMotion,
  input: PhysicalShipInput,
  elapsedSeconds: number,
  suspended = false,
): PhysicalShipMotion {
  if (suspended) return current;
  const delta = clampPhysicalShip(elapsedSeconds, 0, 0.034);
  if (delta === 0) return current;
  const horizontal = clampPhysicalShip(input.horizontal, -1, 1);
  const vertical = clampPhysicalShip(input.vertical, -1, 1);
  let x = clampPhysicalShip(current.x + horizontal * WALK_SPEED * delta, 28, PHYSICAL_SHIP_WORLD.width - 28);
  let y = current.y;
  let velocityY = current.velocityY;
  let onSurface = false;
  let climbing = false;
  const facing = horizontal === 0 ? current.facing : horizontal < 0 ? -1 : 1;
  const ladder = PHYSICAL_SHIP_LADDERS.find((candidate) => Math.abs(x - candidate.x) <= 29 && y >= candidate.top - 12 && y <= candidate.bottom + 12);

  if (ladder && !input.jump && (vertical !== 0 || (current.climbing && horizontal === 0))) {
    climbing = true;
    x += (ladder.x - x) * Math.min(1, delta * 9);
    y = clampPhysicalShip(y + vertical * CLIMB_SPEED * delta, ladder.top, ladder.bottom);
    velocityY = 0;
    onSurface = y === ladder.top || y === ladder.bottom;
  } else {
    const surface = PHYSICAL_SHIP_SURFACES.find((candidate) => Math.abs(current.y - candidate.y) <= 2 && x >= candidate.left && x <= candidate.right);
    if (input.jump && (current.onSurface || current.climbing || surface)) {
      velocityY = -JUMP_SPEED;
    } else if (surface && !input.jump) {
      y = surface.y;
      velocityY = 0;
      onSurface = true;
    }
    if (!onSurface) {
      const previousY = y;
      velocityY += GRAVITY * delta;
      y += velocityY * delta;
      if (velocityY >= 0) {
        const landing = PHYSICAL_SHIP_SURFACES.find((candidate) => x >= candidate.left && x <= candidate.right && previousY <= candidate.y && y >= candidate.y);
        if (landing) {
          y = landing.y;
          velocityY = 0;
          onSurface = true;
        }
      }
    }
  }

  const velocityX = (x - current.x) / delta;
  const next = {
    x, y: clampPhysicalShip(y, 40, PHYSICAL_SHIP_WORLD.floorY), velocityX, velocityY, facing, onSurface, climbing,
    phase: (current.phase + (Math.abs(velocityX) > 0.1 || (climbing && vertical !== 0) ? delta * 1.7 : 0)) % 1,
  };
  return Object.keys(next).every((key) => next[key as keyof PhysicalShipMotion] === current[key as keyof PhysicalShipMotion]) ? current : next;
}
