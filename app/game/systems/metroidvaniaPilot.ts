import type { ExplorationProgress, MissionId } from "../types";
import { mergeExplorationProgress, normalizeExplorationProgress } from "./explorationProgress";
import type { WorldBlueprint, WorldClimbable, WorldPlatform, WorldRect } from "./worldBlueprints";

export const PILOT_MISSION_ID: MissionId = "jungle-vey";
export const PILOT_UPPER_FLOOR_Y = 392;
export const PILOT_GROUND_Y = 624;
export const PILOT_ABILITY_ID = "aerial-boost";
export const PILOT_SEAL_ID = "jungle-resonance-seal";
export const PILOT_HATCH_ID = "jungle-canopy-hatch";
export const PILOT_SECRET_ID = "jungle-clan-cache";

// Runtime coordinates, with x/y at the top-left. Render and collision share them.
export const PILOT_MODULE: Readonly<WorldRect> = { x: 2522, y: 560, width: 56, height: 64 };
export const PILOT_CACHE: Readonly<WorldRect> = { x: 1652, y: 340, width: 56, height: 52 };
export const PILOT_SEAL: Readonly<WorldRect> = { x: 1120, y: 0, width: 28, height: 392 };
export const PILOT_HATCH: Readonly<WorldRect> = { x: 1980, y: 392, width: 160, height: 24 };
export const PILOT_RIGHT_WALL: Readonly<WorldRect> = { x: 2200, y: 0, width: 28, height: 416 };
export const PILOT_ROPE: Readonly<WorldRect> = { x: 2038, y: 240, width: 44, height: 384 };
export const PILOT_GALLERY: Readonly<WorldRect> = { x: 800, y: 392, width: 1400, height: 24 };
export const PILOT_REPLACEMENT_SPAN = { minX: 400, maxX: 2240 } as const;

export interface PilotRoom extends WorldRect {
  id: string;
  label: string;
  level: "upper" | "lower";
}

export const PILOT_ROOMS: readonly PilotRoom[] = [
  { id: "jungle-pilot-approach", label: "Approche", level: "lower", x: 400, y: 0, width: 400, height: 624 },
  { id: "jungle-pilot-underpass", label: "Passage inférieur", level: "lower", x: 800, y: 416, width: 1428, height: 208 },
  { id: "jungle-pilot-module", label: "Relais d’impulsion", level: "lower", x: 2228, y: 416, width: 532, height: 208 },
  { id: "jungle-pilot-gallery", label: "Galerie suspendue", level: "upper", x: 800, y: 0, width: 320, height: 392 },
  { id: "jungle-pilot-archive", label: "Archives du clan", level: "upper", x: 1120, y: 0, width: 860, height: 392 },
  { id: "jungle-pilot-descent", label: "Puits de retour", level: "upper", x: 1980, y: 0, width: 248, height: 416 },
];

function validRect(rect: WorldRect): boolean {
  return [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)
    && rect.width > 0 && rect.height > 0;
}

/** Positions are body centres, so the upper room is never revealed through its floor. */
export function pilotRoomAt(playerX: number, playerY: number): PilotRoom | null {
  if (!Number.isFinite(playerX) || !Number.isFinite(playerY)) return null;
  return PILOT_ROOMS.find((room) => playerX >= room.x && playerX < room.x + room.width
    && playerY >= room.y && playerY < room.y + room.height) ?? null;
}

export function discoverPilotRooms(progress: ExplorationProgress, playerRect: WorldRect): ExplorationProgress {
  const room = validRect(playerRect)
    ? pilotRoomAt(playerRect.x + playerRect.width / 2, playerRect.y + playerRect.height / 2)
    : null;
  return mergeExplorationProgress(progress, { discoveredRoomIds: room ? [room.id] : [] });
}

function platform(id: string, rect: Readonly<WorldRect>): WorldPlatform {
  return { ...rect, id, material: "ruin", routeId: "canopy", collision: "solid", noiseMultiplier: 0.85, trackPersistence: 0.12 };
}

/** These are closed volumes: one-way platforms would let the locked branch be bypassed. */
export function pilotPlatforms(progress: ExplorationProgress): WorldPlatform[] {
  const state = normalizeExplorationProgress(progress);
  return [
    platform("jungle-pilot-gallery-west", { x: 800, y: 392, width: 1180, height: 24 }),
    platform("jungle-pilot-gallery-east", { x: 2140, y: 392, width: 60, height: 24 }),
    platform("jungle-pilot-right-wall", PILOT_RIGHT_WALL),
    ...(!state.openedGateIds.includes(PILOT_SEAL_ID) ? [platform(PILOT_SEAL_ID, PILOT_SEAL)] : []),
    ...(!state.openedGateIds.includes(PILOT_HATCH_ID) ? [platform(PILOT_HATCH_ID, PILOT_HATCH)] : []),
  ];
}

export function pilotClimbables(progress: ExplorationProgress): WorldClimbable[] {
  if (!normalizeExplorationProgress(progress).openedGateIds.includes(PILOT_HATCH_ID)) return [];
  return [{
    ...PILOT_ROPE, id: "jungle-pilot-return-rope", kind: "rope", routeId: "canopy",
    climbSpeedMultiplier: 1, staminaPerSecond: 0,
    // The rope rises above the upper floor, leaving enough fall time to reach either lip.
    dismounts: [{ x: 1900, y: 392 }, { x: 2128, y: 392 }, { x: 2024, y: 624 }],
  }];
}

function authoredPilotGeometry(id: string): boolean {
  return id.startsWith("jungle-pilot-") || id === PILOT_SEAL_ID || id === PILOT_HATCH_ID;
}

/** Apply to runtime-expanded worlds only; other missions and the main ground route stay intact. */
export function applyPilotWorld(baseWorld: WorldBlueprint, progress: ExplorationProgress): WorldBlueprint {
  if (baseWorld.missionId !== PILOT_MISSION_ID) return baseWorld;
  const replaced = (rect: WorldRect) => rect.x < PILOT_REPLACEMENT_SPAN.maxX
    && rect.x + rect.width > PILOT_REPLACEMENT_SPAN.minX && rect.y < PILOT_GROUND_Y;
  return {
    ...baseWorld,
    platforms: [...baseWorld.platforms.filter((entry) => !authoredPilotGeometry(entry.id) && !replaced(entry)), ...pilotPlatforms(progress)],
    climbables: [...baseWorld.climbables.filter((entry) => !authoredPilotGeometry(entry.id) && !replaced(entry)), ...pilotClimbables(progress)],
  };
}

function horizontalDistance(a: WorldRect, b: WorldRect): number {
  return Math.max(0, a.x - b.x - b.width, b.x - a.x - a.width);
}

function near(a: WorldRect, b: WorldRect, distance = 52): boolean {
  const dy = Math.max(0, a.y - b.y - b.height, b.y - a.y - a.height);
  return Math.hypot(horizontalDistance(a, b), dy) <= distance;
}

function onUpperFloor(rect: WorldRect): boolean {
  // A hand/head below the floor must not activate a device above it.
  const feet = rect.y + rect.height;
  return rect.y < PILOT_UPPER_FLOOR_Y && feet >= PILOT_UPPER_FLOOR_Y - 24 && feet <= PILOT_UPPER_FLOOR_Y + 4;
}

export interface PilotInteraction {
  progress: ExplorationProgress;
  changed: boolean;
  message: string;
  event: "ability" | "gate" | "secret" | null;
}

/** The caller supplies an interaction edge, never a held button; this function has no side effects. */
export function pilotInteract(progress: ExplorationProgress, playerRect: WorldRect): PilotInteraction | null {
  if (!validRect(playerRect)) return null;
  const state = normalizeExplorationProgress(progress);
  const hasBoost = state.abilityIds.includes(PILOT_ABILITY_ID);
  const hasSeal = state.openedGateIds.includes(PILOT_SEAL_ID);
  const reply = (message: string): PilotInteraction => ({ progress: state, changed: false, message, event: null });
  const unlock = (event: "ability" | "gate" | "secret", delta: Partial<ExplorationProgress>, message: string): PilotInteraction => ({
    progress: mergeExplorationProgress(state, delta), changed: true, message, event,
  });

  if (playerRect.y >= PILOT_UPPER_FLOOR_Y && near(playerRect, PILOT_MODULE)) {
    return hasBoost ? reply("Impulsion aérienne déjà installée.")
      : unlock("ability", { abilityIds: [PILOT_ABILITY_ID] }, "Impulsion aérienne installée : un second saut en l’air. Revenez à l’entrée de la galerie.");
  }
  if (!onUpperFloor(playerRect)) return null;
  if (horizontalDistance(playerRect, PILOT_SEAL) <= 52 && !hasSeal) {
    return hasBoost
      ? unlock("gate", { openedGateIds: [PILOT_SEAL_ID] }, "Sceau de résonance ouvert.")
      : reply("Sceau inactif : un module d’impulsion est nécessaire.");
  }
  if (near(playerRect, PILOT_CACHE)) {
    if (!hasBoost || !hasSeal) return reply("Le sceau de la galerie doit être ouvert.");
    return state.secretIds.includes(PILOT_SECRET_ID) ? reply("Cache du clan déjà récupérée.")
      : unlock("secret", { secretIds: [PILOT_SECRET_ID] }, "Cache du clan récupérée : énergie maximale +15.");
  }
  if (horizontalDistance(playerRect, PILOT_HATCH) <= 28) {
    if (!hasBoost || !hasSeal) return reply("Le sceau de la galerie doit être ouvert.");
    return state.openedGateIds.includes(PILOT_HATCH_ID) ? reply("Trappe ouverte : la corde permet de revenir dans la galerie.")
      : unlock("gate", { openedGateIds: [PILOT_HATCH_ID] }, "Trappe ouverte. La corde relie désormais les deux niveaux.");
  }
  return null;
}

/** Text deliberately omits key names: the UI displays the player's remapped interaction binding. */
export function pilotHint(progress: ExplorationProgress, playerRect: WorldRect): string | null {
  if (!validRect(playerRect)) return null;
  const state = normalizeExplorationProgress(progress);
  const hasBoost = state.abilityIds.includes(PILOT_ABILITY_ID);
  if (playerRect.y >= PILOT_UPPER_FLOOR_Y && near(playerRect, PILOT_MODULE)) {
    return hasBoost ? "Impulsion installée : revenez vers la galerie à gauche." : "Installer le module d’impulsion aérienne";
  }
  if (onUpperFloor(playerRect)) {
    if (horizontalDistance(playerRect, PILOT_SEAL) <= 52 && !state.openedGateIds.includes(PILOT_SEAL_ID)) {
      return hasBoost ? "Ouvrir le sceau de résonance" : "Sceau verrouillé : module d’impulsion requis";
    }
    if (near(playerRect, PILOT_CACHE) && !state.secretIds.includes(PILOT_SECRET_ID)) return "Récupérer la cache du clan";
    if (horizontalDistance(playerRect, PILOT_HATCH) <= 28 && !state.openedGateIds.includes(PILOT_HATCH_ID)) return "Ouvrir la trappe de retour depuis la galerie";
  }
  const room = pilotRoomAt(playerRect.x + playerRect.width / 2, playerRect.y + playerRect.height / 2);
  if (room?.id === "jungle-pilot-approach") {
    return hasBoost ? "Deux sauts successifs donnent accès à la galerie suspendue." : "Galerie hors de portée. Le passage inférieur reste ouvert.";
  }
  return null;
}
