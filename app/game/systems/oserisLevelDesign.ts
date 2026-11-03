import type { ExplorationProgress, MissionId } from "../types";
import type { WorldClimbable, WorldPlatform, WorldRect } from "./worldBlueprints";

export const OSERIS_VERTICAL_BOUNDS = { minY: -800, maxY: 720 } as const;

export type OserisRoomLevel = "canopy" | "upper" | "ground" | "cave";

export interface OserisRoom extends WorldRect {
  readonly id: string;
  readonly label: string;
  readonly level: OserisRoomLevel;
  readonly purpose: "insertion" | "traversal" | "ability" | "secret" | "shortcut" | "combat" | "boss" | "extraction";
  readonly mapBox: { readonly x: number; readonly y: number; readonly width: number };
}

export type OserisConnectionGate = "ability" | "seal" | "hatch" | null;

export interface OserisRoomConnection {
  readonly id: string;
  readonly from: OserisRoom["id"];
  readonly to: OserisRoom["id"];
  readonly gate: OserisConnectionGate;
  readonly shortcut: boolean;
}

/**
 * First commercial-layout pass: twelve authored rooms spanning canopy, ruins,
 * ground route and river caves. The six original pilot IDs remain stable for
 * old saves; the later rooms extend the same graph across the whole mission.
 */
export const OSERIS_ROOMS: readonly OserisRoom[] = [
  { id: "jungle-pilot-approach", label: "Lisière d’insertion", level: "ground", purpose: "insertion", x: 0, y: 0, width: 800, height: 624, mapBox: { x: 20, y: 178, width: 105 } },
  { id: "jungle-pilot-underpass", label: "Passage inférieur", level: "ground", purpose: "traversal", x: 800, y: 416, width: 1_428, height: 208, mapBox: { x: 145, y: 178, width: 160 } },
  { id: "jungle-pilot-module", label: "Relais d’impulsion", level: "ground", purpose: "ability", x: 2_228, y: 416, width: 532, height: 208, mapBox: { x: 325, y: 178, width: 120 } },
  { id: "jungle-pilot-gallery", label: "Galerie suspendue", level: "upper", purpose: "traversal", x: 800, y: 0, width: 320, height: 392, mapBox: { x: 90, y: 112, width: 120 } },
  { id: "jungle-pilot-archive", label: "Archives du clan", level: "upper", purpose: "secret", x: 1_120, y: 0, width: 860, height: 392, mapBox: { x: 230, y: 112, width: 165 } },
  { id: "jungle-pilot-descent", label: "Puits de retour", level: "upper", purpose: "shortcut", x: 1_980, y: 0, width: 248, height: 416, mapBox: { x: 415, y: 112, width: 110 } },
  { id: "jungle-pilot-canopy-west", label: "Couronne des grands arbres", level: "canopy", purpose: "traversal", x: 400, y: -800, width: 900, height: 800, mapBox: { x: 75, y: 32, width: 145 } },
  { id: "jungle-pilot-canopy-heart", label: "Canopée des ruines", level: "canopy", purpose: "secret", x: 1_300, y: -800, width: 1_460, height: 800, mapBox: { x: 245, y: 32, width: 190 } },
  { id: "jungle-pilot-ravine", label: "Ravin des racines", level: "ground", purpose: "combat", x: 2_760, y: 0, width: 1_200, height: 624, mapBox: { x: 470, y: 178, width: 110 } },
  { id: "jungle-pilot-river-caves", label: "Grottes de la rivière", level: "cave", purpose: "shortcut", x: 3_960, y: -80, width: 1_150, height: 704, mapBox: { x: 600, y: 213, width: 125 } },
  { id: "jungle-pilot-vey-camp", label: "Camp de Vey", level: "ground", purpose: "combat", x: 5_110, y: 0, width: 1_500, height: 624, mapBox: { x: 745, y: 178, width: 115 } },
  { id: "jungle-pilot-duel-extraction", label: "Clairière du duel", level: "ground", purpose: "boss", x: 6_610, y: 0, width: 1_790, height: 624, mapBox: { x: 880, y: 178, width: 100 } },
] as const;

export const OSERIS_ROOM_CONNECTIONS: readonly OserisRoomConnection[] = [
  { id: "approach-underpass", from: "jungle-pilot-approach", to: "jungle-pilot-underpass", gate: null, shortcut: false },
  { id: "underpass-module", from: "jungle-pilot-underpass", to: "jungle-pilot-module", gate: null, shortcut: false },
  { id: "approach-gallery", from: "jungle-pilot-approach", to: "jungle-pilot-gallery", gate: "ability", shortcut: false },
  { id: "gallery-archive", from: "jungle-pilot-gallery", to: "jungle-pilot-archive", gate: "seal", shortcut: false },
  { id: "archive-descent", from: "jungle-pilot-archive", to: "jungle-pilot-descent", gate: null, shortcut: false },
  { id: "descent-underpass", from: "jungle-pilot-descent", to: "jungle-pilot-underpass", gate: "hatch", shortcut: true },
  { id: "gallery-canopy", from: "jungle-pilot-gallery", to: "jungle-pilot-canopy-west", gate: "ability", shortcut: false },
  { id: "canopy-crossing", from: "jungle-pilot-canopy-west", to: "jungle-pilot-canopy-heart", gate: "seal", shortcut: false },
  { id: "canopy-module-loop", from: "jungle-pilot-canopy-heart", to: "jungle-pilot-module", gate: "ability", shortcut: true },
  { id: "module-ravine", from: "jungle-pilot-module", to: "jungle-pilot-ravine", gate: null, shortcut: false },
  { id: "ravine-caves", from: "jungle-pilot-ravine", to: "jungle-pilot-river-caves", gate: null, shortcut: false },
  { id: "ravine-camp-high", from: "jungle-pilot-ravine", to: "jungle-pilot-vey-camp", gate: "ability", shortcut: false },
  { id: "caves-camp-low", from: "jungle-pilot-river-caves", to: "jungle-pilot-vey-camp", gate: null, shortcut: true },
  { id: "camp-duel", from: "jungle-pilot-vey-camp", to: "jungle-pilot-duel-extraction", gate: null, shortcut: false },
] as const;

export const OSERIS_VERTICAL_PLATFORMS: readonly WorldPlatform[] = [
  { id: "jungle-vertical-root-west", x: 470, y: -120, width: 420, height: 24, material: "root", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.62, trackPersistence: 0.28 },
  { id: "jungle-vertical-crown-west", x: 930, y: -300, width: 340, height: 24, material: "root", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.58, trackPersistence: 0.22 },
  { id: "jungle-vertical-crown-heart", x: 1_390, y: -420, width: 370, height: 26, material: "ruin", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.76, trackPersistence: 0.12 },
  { id: "jungle-vertical-ruin-bridge", x: 1_830, y: -260, width: 390, height: 24, material: "stone", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.88, trackPersistence: 0.1 },
  { id: "jungle-vertical-lookout", x: 2_320, y: -380, width: 340, height: 24, material: "root", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.61, trackPersistence: 0.25 },
  { id: "jungle-vertical-ravine-ledge", x: 2_940, y: 345, width: 420, height: 24, material: "root", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.7, trackPersistence: 0.25 },
  { id: "jungle-vertical-ravine-step", x: 3_420, y: 235, width: 340, height: 24, material: "root", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.68, trackPersistence: 0.24 },
  { id: "jungle-vertical-ravine-arch", x: 3_820, y: 115, width: 340, height: 24, material: "ruin", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.82, trackPersistence: 0.12 },
  { id: "jungle-vertical-cave-bridge", x: 4_220, y: -5, width: 350, height: 24, material: "stone", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.88, trackPersistence: 0.1 },
  { id: "jungle-vertical-cave-crown", x: 4_620, y: 115, width: 350, height: 24, material: "root", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.64, trackPersistence: 0.27 },
  { id: "jungle-vertical-camp-watch", x: 5_020, y: 235, width: 360, height: 24, material: "metal", routeId: "canopy", collision: "one-way", noiseMultiplier: 1.18, trackPersistence: 0.04 },
  { id: "jungle-vertical-camp-roof", x: 5_430, y: 345, width: 360, height: 24, material: "root", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.7, trackPersistence: 0.23 },
  { id: "jungle-vertical-camp-beam", x: 5_840, y: 235, width: 360, height: 24, material: "metal", routeId: "canopy", collision: "one-way", noiseMultiplier: 1.2, trackPersistence: 0.03 },
  { id: "jungle-vertical-scout-perch", x: 6_250, y: 345, width: 300, height: 24, material: "root", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.68, trackPersistence: 0.25 },
] as const;

/** Independent cave roofs turn the river route into an enclosed passage with a usable top route. */
export const OSERIS_CAVE_PLATFORMS: readonly WorldPlatform[] = [
  { id: "jungle-pilot-cave-roof-west", x: 4_000, y: 400, width: 520, height: 34, material: "stone", routeId: "flooded-cut", collision: "solid", noiseMultiplier: 0.9, trackPersistence: 0.12 },
  { id: "jungle-pilot-cave-roof-east", x: 4_590, y: 400, width: 480, height: 34, material: "root", routeId: "flooded-cut", collision: "solid", noiseMultiplier: 0.76, trackPersistence: 0.2 },
] as const;

const CANOPY_CLIMBABLES: readonly WorldClimbable[] = [
  { id: "jungle-vertical-vine-west", x: 790, y: -165, width: 54, height: 557, kind: "vine", routeId: "canopy", climbSpeedMultiplier: 0.9, staminaPerSecond: 0, dismounts: [{ x: 720, y: -120 }, { x: 860, y: 392 }] },
  { id: "jungle-vertical-vine-heart", x: 1_500, y: -470, width: 58, height: 862, kind: "vine", routeId: "canopy", climbSpeedMultiplier: 0.86, staminaPerSecond: 0, dismounts: [{ x: 1_430, y: -420 }, { x: 1_580, y: 392 }] },
  { id: "jungle-vertical-vine-east", x: 2_430, y: -430, width: 60, height: 1_054, kind: "vine", routeId: "canopy", climbSpeedMultiplier: 0.88, staminaPerSecond: 0, dismounts: [{ x: 2_360, y: -380 }, { x: 2_510, y: 624 }] },
] as const;

export function oserisVerticalClimbables(progress: ExplorationProgress): readonly WorldClimbable[] {
  return progress.abilityIds.includes("aerial-boost") ? CANOPY_CLIMBABLES : [];
}

export function isOserisVerticalGeometry(id: string): boolean {
  return id.startsWith("jungle-vertical-");
}

export function targetOserisCameraY(
  missionId: MissionId,
  playerCenterY: number,
  viewportHeight = 720,
): number {
  if (missionId !== "jungle-vey" || !Number.isFinite(playerCenterY) || !Number.isFinite(viewportHeight) || viewportHeight <= 0) return 0;
  const desired = playerCenterY - viewportHeight * 0.54;
  return Math.max(OSERIS_VERTICAL_BOUNDS.minY, Math.min(0, desired));
}

export function oserisRoomAt(playerX: number, playerY: number): OserisRoom | null {
  if (!Number.isFinite(playerX) || !Number.isFinite(playerY)) return null;
  return OSERIS_ROOMS.find((room) => playerX >= room.x && playerX < room.x + room.width
    && playerY >= room.y && playerY < room.y + room.height) ?? null;
}

export const OSERIS_LEVEL_DESIGN_SUMMARY = {
  rooms: OSERIS_ROOMS.length,
  connections: OSERIS_ROOM_CONNECTIONS.length,
  canopyPlatforms: OSERIS_VERTICAL_PLATFORMS.length,
  levels: ["canopy", "upper", "ground", "cave"] as const,
  productionTargetRooms: 48,
  productionTargetSubregions: 8,
  status: "p0-playable-foundation" as const,
} as const;
