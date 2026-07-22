import type { BiomeId, MissionId } from "../types";
import {
  WORLD_SCREEN_WORLD_WIDTH,
  worldScreensFor,
  type WorldScreenFeature,
} from "../worldScreens";

/**
 * Serializable world geometry for the side-scrolling hunt runtime.
 *
 * Coordinates use the same 8_400 x 720 space and 624 px floor
 * as HuntCanvas. Nothing in this module depends on Canvas, React or browser
 * globals, so the same blueprints can drive simulation, debug overlays and
 * tests.
 */

export interface WorldPoint {
  x: number;
  y: number;
}

export interface WorldRect extends WorldPoint {
  width: number;
  height: number;
}

export type SurfaceMaterial =
  | "soil"
  | "root"
  | "mud"
  | "water"
  | "sand"
  | "coral"
  | "mycelium"
  | "obsidian"
  | "stone"
  | "snow"
  | "ice"
  | "metal"
  | "basalt"
  | "ash"
  | "ruin";

export type RouteId =
  | "ground"
  | "canopy"
  | "flooded-cut"
  | "ice-surface"
  | "glacial-caves"
  | "mining-gantry"
  | "sanctum-floor"
  | "vent-flank"
  | "ruin-highline";

export interface WorldPlatform extends WorldRect {
  id: string;
  material: SurfaceMaterial;
  routeId: RouteId;
  collision: "one-way" | "solid";
  noiseMultiplier: number;
  trackPersistence: number;
}

export type ClimbableKind =
  | "tree"
  | "vine"
  | "rock-face"
  | "ice-wall"
  | "ladder"
  | "rope"
  | "chain"
  | "basalt-column";

export interface WorldClimbable extends WorldRect {
  id: string;
  kind: ClimbableKind;
  routeId: RouteId;
  climbSpeedMultiplier: number;
  staminaPerSecond: number;
  dismounts: readonly WorldPoint[];
}

export type HazardKind =
  | "deep-mud"
  | "predatory-flora"
  | "flash-flood"
  | "thin-ice"
  | "falling-ice"
  | "whiteout"
  | "lava"
  | "steam-vent"
  | "ash-squall"
  | "tidal-surge"
  | "sand-collapse"
  | "glass-storm"
  | "heat-burst"
  | "rogue-wave"
  | "electrical-surge"
  | "abyssal-vent"
  | "spore-cloud"
  | "mycelial-snare"
  | "acid-bloom"
  | "gravity-pulse"
  | "nanite-field"
  | "laser-grid";

export interface HazardCycle {
  periodSeconds: number;
  activeSeconds: number;
  phaseSeconds: number;
}

export interface WorldHazard extends WorldRect {
  id: string;
  kind: HazardKind;
  routeId: RouteId;
  damagePerSecond: number;
  movementMultiplier: number;
  noisePerSecond: number;
  trackMultiplier: number;
  revealsCloak: boolean;
  telegraphSeconds: number;
  cycle: HazardCycle | null;
}

export interface CoverNode extends WorldRect {
  id: string;
  routeId: RouteId;
  protection: number;
  approach: "left" | "right" | "either";
  destructible: boolean;
}

export interface TrackSurface extends WorldRect {
  id: string;
  material: SurfaceMaterial;
  footprintPersistenceSeconds: number;
  scentRetention: number;
  movementMultiplier: number;
  baseNoise: number;
  mudDepth: number;
}

export type RouteRequirement =
  | "none"
  | "climb"
  | "mask"
  | "cloak"
  | "timed-hazard";

export interface AlternativeRoute {
  id: RouteId;
  label: string;
  startX: number;
  endX: number;
  waypointIds: readonly string[];
  requirements: readonly RouteRequirement[];
  advantages: readonly ("stealth" | "speed" | "high-ground" | "tracking" | "ambush")[];
  risk: 1 | 2 | 3;
}

export interface TrapSocket extends WorldPoint {
  id: string;
  routeId: RouteId;
  allowed: readonly ("snare" | "audio-decoy" | "netgun")[];
  facing: -1 | 1;
  concealment: number;
}

export interface WindProfile {
  seed: number;
  baseX: number;
  baseY: number;
  gustStrength: number;
  gustPeriodSeconds: number;
  verticalTurbulence: number;
}

export interface WorldBlueprint {
  missionId: MissionId;
  biome: BiomeId;
  width: number;
  height: 720;
  floorY: 624;
  spawn: WorldPoint;
  extraction: WorldPoint;
  bossArena: WorldRect;
  wind: WindProfile;
  platforms: readonly WorldPlatform[];
  climbables: readonly WorldClimbable[];
  hazards: readonly WorldHazard[];
  covers: readonly CoverNode[];
  surfaces: readonly TrackSurface[];
  routes: readonly AlternativeRoute[];
  trapSockets: readonly TrapSocket[];
}

const JUNGLE_WORLD_BASE: WorldBlueprint = {
  missionId: "jungle-vey",
  biome: "jungle",
  width: 5_600,
  height: 720,
  floorY: 624,
  spawn: { x: 150, y: 508 },
  extraction: { x: 5_350, y: 624 },
  bossArena: { x: 4_120, y: 310, width: 1_020, height: 314 },
  wind: {
    seed: 0x05e11f,
    baseX: 0.62,
    baseY: -0.08,
    gustStrength: 0.42,
    gustPeriodSeconds: 13,
    verticalTurbulence: 0.18,
  },
  platforms: [
    { id: "j-root-01", x: 390, y: 520, width: 310, height: 26, material: "root", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.72, trackPersistence: 0.35 },
    { id: "j-crown-01", x: 790, y: 430, width: 270, height: 24, material: "root", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.65, trackPersistence: 0.22 },
    { id: "j-slab-01", x: 1_205, y: 505, width: 330, height: 25, material: "stone", routeId: "ground", collision: "one-way", noiseMultiplier: 1.1, trackPersistence: 0.08 },
    { id: "j-crown-02", x: 1_665, y: 382, width: 300, height: 24, material: "root", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.66, trackPersistence: 0.25 },
    { id: "j-cave-lip", x: 2_035, y: 534, width: 355, height: 28, material: "stone", routeId: "flooded-cut", collision: "one-way", noiseMultiplier: 0.9, trackPersistence: 0.08 },
    { id: "j-root-02", x: 2_465, y: 418, width: 330, height: 24, material: "root", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.7, trackPersistence: 0.28 },
    { id: "j-camp-01", x: 2_900, y: 510, width: 350, height: 26, material: "metal", routeId: "ground", collision: "one-way", noiseMultiplier: 1.55, trackPersistence: 0.04 },
    { id: "j-crown-03", x: 3_335, y: 396, width: 330, height: 24, material: "root", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.7, trackPersistence: 0.24 },
    { id: "j-flood-exit", x: 3_710, y: 522, width: 330, height: 24, material: "stone", routeId: "flooded-cut", collision: "one-way", noiseMultiplier: 0.95, trackPersistence: 0.12 },
    { id: "j-watchtower", x: 4_115, y: 407, width: 315, height: 25, material: "metal", routeId: "canopy", collision: "one-way", noiseMultiplier: 1.45, trackPersistence: 0.02 },
    { id: "j-arena-left", x: 4_565, y: 515, width: 330, height: 25, material: "soil", routeId: "ground", collision: "one-way", noiseMultiplier: 0.9, trackPersistence: 0.75 },
    { id: "j-arena-high", x: 4_955, y: 414, width: 300, height: 24, material: "root", routeId: "canopy", collision: "one-way", noiseMultiplier: 0.68, trackPersistence: 0.22 },
  ],
  climbables: [
    { id: "j-tree-west", x: 755, y: 248, width: 132, height: 376, kind: "tree", routeId: "canopy", climbSpeedMultiplier: 1, staminaPerSecond: 3, dismounts: [{ x: 810, y: 430 }, { x: 850, y: 245 }] },
    { id: "j-vine-west", x: 1_765, y: 165, width: 76, height: 245, kind: "vine", routeId: "canopy", climbSpeedMultiplier: 0.84, staminaPerSecond: 4, dismounts: [{ x: 1_700, y: 382 }, { x: 1_845, y: 382 }] },
    { id: "j-rock-cut", x: 2_120, y: 430, width: 88, height: 194, kind: "rock-face", routeId: "flooded-cut", climbSpeedMultiplier: 0.78, staminaPerSecond: 5, dismounts: [{ x: 2_080, y: 534 }, { x: 2_240, y: 420 }] },
    { id: "j-tree-center", x: 2_425, y: 202, width: 138, height: 422, kind: "tree", routeId: "canopy", climbSpeedMultiplier: 1, staminaPerSecond: 3, dismounts: [{ x: 2_500, y: 418 }, { x: 2_545, y: 200 }] },
    { id: "j-vine-east", x: 3_460, y: 146, width: 78, height: 274, kind: "vine", routeId: "canopy", climbSpeedMultiplier: 0.82, staminaPerSecond: 4, dismounts: [{ x: 3_400, y: 396 }, { x: 3_555, y: 396 }] },
    { id: "j-tree-arena", x: 4_090, y: 210, width: 136, height: 414, kind: "tree", routeId: "canopy", climbSpeedMultiplier: 1.05, staminaPerSecond: 3, dismounts: [{ x: 4_145, y: 407 }, { x: 4_230, y: 215 }] },
  ],
  hazards: [
    { id: "j-mud-west", x: 1_050, y: 582, width: 420, height: 42, kind: "deep-mud", routeId: "ground", damagePerSecond: 0, movementMultiplier: 0.58, noisePerSecond: 0.08, trackMultiplier: 2.4, revealsCloak: false, telegraphSeconds: 0, cycle: null },
    { id: "j-flora-center", x: 2_680, y: 574, width: 155, height: 50, kind: "predatory-flora", routeId: "ground", damagePerSecond: 9, movementMultiplier: 0.72, noisePerSecond: 0.42, trackMultiplier: 1.1, revealsCloak: true, telegraphSeconds: 0.45, cycle: { periodSeconds: 4.5, activeSeconds: 1.4, phaseSeconds: 0.8 } },
    { id: "j-flood-pulse", x: 3_210, y: 570, width: 610, height: 54, kind: "flash-flood", routeId: "flooded-cut", damagePerSecond: 6, movementMultiplier: 0.48, noisePerSecond: 0.6, trackMultiplier: 0.2, revealsCloak: true, telegraphSeconds: 1.25, cycle: { periodSeconds: 12, activeSeconds: 3.5, phaseSeconds: 2 } },
  ],
  covers: [
    { id: "j-cover-log-01", x: 1_475, y: 548, width: 105, height: 76, routeId: "ground", protection: 0.72, approach: "either", destructible: true },
    { id: "j-cover-camp-01", x: 3_035, y: 545, width: 92, height: 79, routeId: "ground", protection: 0.86, approach: "left", destructible: true },
    { id: "j-cover-arena-01", x: 4_405, y: 535, width: 112, height: 89, routeId: "ground", protection: 0.8, approach: "either", destructible: true },
    { id: "j-cover-arena-02", x: 4_870, y: 548, width: 96, height: 76, routeId: "ground", protection: 0.74, approach: "right", destructible: true },
  ],
  surfaces: [
    { id: "j-surface-west", x: 0, y: 584, width: 1_050, height: 40, material: "soil", footprintPersistenceSeconds: 24, scentRetention: 0.8, movementMultiplier: 1, baseNoise: 0.22, mudDepth: 0 },
    { id: "j-surface-mud", x: 1_050, y: 582, width: 420, height: 42, material: "mud", footprintPersistenceSeconds: 92, scentRetention: 1.45, movementMultiplier: 0.58, baseNoise: 0.42, mudDepth: 0.82 },
    { id: "j-surface-center", x: 1_470, y: 584, width: 1_710, height: 40, material: "soil", footprintPersistenceSeconds: 30, scentRetention: 0.95, movementMultiplier: 1, baseNoise: 0.25, mudDepth: 0.08 },
    { id: "j-surface-water", x: 3_180, y: 570, width: 640, height: 54, material: "water", footprintPersistenceSeconds: 0, scentRetention: 0.15, movementMultiplier: 0.62, baseNoise: 0.56, mudDepth: 0.28 },
    { id: "j-surface-east", x: 3_820, y: 584, width: 1_780, height: 40, material: "soil", footprintPersistenceSeconds: 26, scentRetention: 0.84, movementMultiplier: 1, baseNoise: 0.23, mudDepth: 0.04 },
  ],
  routes: [
    { id: "ground", label: "Sous-bois et camp de Vey", startX: 0, endX: 5_350, waypointIds: ["j-cover-log-01", "j-camp-01", "j-cover-arena-01"], requirements: ["none"], advantages: ["tracking", "ambush"], risk: 2 },
    { id: "canopy", label: "Canopée silencieuse", startX: 390, endX: 5_255, waypointIds: ["j-tree-west", "j-crown-02", "j-tree-center", "j-watchtower", "j-arena-high"], requirements: ["climb"], advantages: ["stealth", "high-ground", "ambush"], risk: 1 },
    { id: "flooded-cut", label: "Tranchée inondée", startX: 2_035, endX: 4_040, waypointIds: ["j-rock-cut", "j-cave-lip", "j-flood-pulse", "j-flood-exit"], requirements: ["mask", "timed-hazard"], advantages: ["speed", "tracking"], risk: 3 },
  ],
  trapSockets: [
    { id: "j-trap-01", x: 1_520, y: 610, routeId: "ground", allowed: ["snare", "audio-decoy"], facing: 1, concealment: 0.82 },
    { id: "j-trap-02", x: 2_735, y: 610, routeId: "ground", allowed: ["snare", "netgun"], facing: -1, concealment: 0.9 },
    { id: "j-trap-03", x: 3_555, y: 390, routeId: "canopy", allowed: ["audio-decoy", "netgun"], facing: 1, concealment: 0.72 },
    { id: "j-trap-arena", x: 4_680, y: 610, routeId: "ground", allowed: ["snare", "audio-decoy", "netgun"], facing: -1, concealment: 0.66 },
  ],
};

const ICE_WORLD_BASE: WorldBlueprint = {
  missionId: "ice-cryostalker",
  biome: "ice",
  width: 5_600,
  height: 720,
  floorY: 624,
  spawn: { x: 150, y: 508 },
  extraction: { x: 5_350, y: 624 },
  bossArena: { x: 4_070, y: 286, width: 1_120, height: 338 },
  wind: {
    seed: 0x1ce04b,
    baseX: -0.78,
    baseY: 0.04,
    gustStrength: 0.7,
    gustPeriodSeconds: 8,
    verticalTurbulence: 0.32,
  },
  platforms: [
    { id: "i-shelf-01", x: 360, y: 515, width: 330, height: 25, material: "ice", routeId: "ice-surface", collision: "one-way", noiseMultiplier: 1.25, trackPersistence: 1.3 },
    { id: "i-shelf-02", x: 790, y: 410, width: 285, height: 24, material: "ice", routeId: "ice-surface", collision: "one-way", noiseMultiplier: 1.2, trackPersistence: 1.25 },
    { id: "i-cave-01", x: 1_160, y: 520, width: 370, height: 28, material: "stone", routeId: "glacial-caves", collision: "one-way", noiseMultiplier: 0.85, trackPersistence: 0.12 },
    { id: "i-gantry-01", x: 1_640, y: 394, width: 330, height: 24, material: "metal", routeId: "mining-gantry", collision: "one-way", noiseMultiplier: 1.65, trackPersistence: 0.02 },
    { id: "i-cave-02", x: 2_045, y: 510, width: 350, height: 26, material: "ice", routeId: "glacial-caves", collision: "one-way", noiseMultiplier: 1.05, trackPersistence: 1.4 },
    { id: "i-gantry-02", x: 2_470, y: 405, width: 335, height: 24, material: "metal", routeId: "mining-gantry", collision: "one-way", noiseMultiplier: 1.7, trackPersistence: 0.02 },
    { id: "i-thin-bridge", x: 2_895, y: 526, width: 350, height: 20, material: "ice", routeId: "ice-surface", collision: "one-way", noiseMultiplier: 1.42, trackPersistence: 1.55 },
    { id: "i-cave-03", x: 3_335, y: 392, width: 320, height: 25, material: "ice", routeId: "glacial-caves", collision: "one-way", noiseMultiplier: 1.08, trackPersistence: 1.35 },
    { id: "i-gantry-03", x: 3_735, y: 505, width: 300, height: 24, material: "metal", routeId: "mining-gantry", collision: "one-way", noiseMultiplier: 1.58, trackPersistence: 0.02 },
    { id: "i-arena-left", x: 4_120, y: 430, width: 320, height: 28, material: "ice", routeId: "ice-surface", collision: "one-way", noiseMultiplier: 1.22, trackPersistence: 1.3 },
    { id: "i-arena-pillar", x: 4_560, y: 510, width: 310, height: 25, material: "ice", routeId: "ice-surface", collision: "one-way", noiseMultiplier: 1.1, trackPersistence: 1.5 },
    { id: "i-arena-high", x: 4_965, y: 390, width: 300, height: 24, material: "ice", routeId: "glacial-caves", collision: "one-way", noiseMultiplier: 1.1, trackPersistence: 1.35 },
  ],
  climbables: [
    { id: "i-wall-west", x: 730, y: 260, width: 98, height: 364, kind: "ice-wall", routeId: "ice-surface", climbSpeedMultiplier: 0.72, staminaPerSecond: 7, dismounts: [{ x: 795, y: 410 }, { x: 835, y: 255 }] },
    { id: "i-mine-ladder", x: 1_720, y: 210, width: 62, height: 208, kind: "ladder", routeId: "mining-gantry", climbSpeedMultiplier: 1.1, staminaPerSecond: 2, dismounts: [{ x: 1_665, y: 394 }, { x: 1_800, y: 394 }] },
    { id: "i-cave-wall", x: 2_315, y: 302, width: 100, height: 322, kind: "ice-wall", routeId: "glacial-caves", climbSpeedMultiplier: 0.68, staminaPerSecond: 8, dismounts: [{ x: 2_355, y: 510 }, { x: 2_440, y: 300 }] },
    { id: "i-gantry-rope", x: 2_600, y: 180, width: 54, height: 245, kind: "rope", routeId: "mining-gantry", climbSpeedMultiplier: 0.86, staminaPerSecond: 4, dismounts: [{ x: 2_525, y: 405 }, { x: 2_690, y: 405 }] },
    { id: "i-rift-wall", x: 3_300, y: 195, width: 105, height: 429, kind: "ice-wall", routeId: "glacial-caves", climbSpeedMultiplier: 0.7, staminaPerSecond: 7, dismounts: [{ x: 3_360, y: 392 }, { x: 3_420, y: 190 }] },
    { id: "i-arena-wall", x: 4_910, y: 190, width: 102, height: 434, kind: "ice-wall", routeId: "glacial-caves", climbSpeedMultiplier: 0.74, staminaPerSecond: 7, dismounts: [{ x: 4_990, y: 390 }, { x: 5_035, y: 190 }] },
  ],
  hazards: [
    { id: "i-thin-ice-west", x: 1_040, y: 590, width: 330, height: 34, kind: "thin-ice", routeId: "ice-surface", damagePerSecond: 14, movementMultiplier: 0.7, noisePerSecond: 0.7, trackMultiplier: 1.6, revealsCloak: false, telegraphSeconds: 1.1, cycle: { periodSeconds: 9, activeSeconds: 2.2, phaseSeconds: 1 } },
    { id: "i-whiteout", x: 2_650, y: 220, width: 850, height: 404, kind: "whiteout", routeId: "ice-surface", damagePerSecond: 0, movementMultiplier: 0.78, noisePerSecond: 0.25, trackMultiplier: 0.55, revealsCloak: false, telegraphSeconds: 1.8, cycle: { periodSeconds: 14, activeSeconds: 5, phaseSeconds: 2.5 } },
    { id: "i-stalactites", x: 3_430, y: 270, width: 420, height: 354, kind: "falling-ice", routeId: "glacial-caves", damagePerSecond: 18, movementMultiplier: 0.9, noisePerSecond: 0.85, trackMultiplier: 1, revealsCloak: true, telegraphSeconds: 0.85, cycle: { periodSeconds: 7.5, activeSeconds: 1, phaseSeconds: 0.4 } },
    { id: "i-arena-collapse", x: 4_350, y: 250, width: 650, height: 374, kind: "falling-ice", routeId: "ice-surface", damagePerSecond: 22, movementMultiplier: 0.86, noisePerSecond: 1, trackMultiplier: 1.2, revealsCloak: true, telegraphSeconds: 0.95, cycle: { periodSeconds: 8, activeSeconds: 1.3, phaseSeconds: 4 } },
  ],
  covers: [
    { id: "i-cover-drill", x: 1_470, y: 530, width: 105, height: 94, routeId: "glacial-caves", protection: 0.86, approach: "either", destructible: true },
    { id: "i-cover-crate", x: 2_690, y: 548, width: 90, height: 76, routeId: "mining-gantry", protection: 0.72, approach: "right", destructible: true },
    { id: "i-pillar-left", x: 4_315, y: 390, width: 88, height: 234, routeId: "ice-surface", protection: 0.94, approach: "either", destructible: true },
    { id: "i-pillar-right", x: 4_830, y: 370, width: 94, height: 254, routeId: "ice-surface", protection: 0.94, approach: "either", destructible: true },
  ],
  surfaces: [
    { id: "i-snow-west", x: 0, y: 584, width: 1_050, height: 40, material: "snow", footprintPersistenceSeconds: 78, scentRetention: 0.3, movementMultiplier: 0.88, baseNoise: 0.45, mudDepth: 0 },
    { id: "i-thin-surface", x: 1_050, y: 590, width: 320, height: 34, material: "ice", footprintPersistenceSeconds: 36, scentRetention: 0.08, movementMultiplier: 0.92, baseNoise: 0.7, mudDepth: 0 },
    { id: "i-snow-center", x: 1_370, y: 584, width: 1_500, height: 40, material: "snow", footprintPersistenceSeconds: 95, scentRetention: 0.34, movementMultiplier: 0.86, baseNoise: 0.48, mudDepth: 0 },
    { id: "i-ice-center", x: 2_870, y: 590, width: 1_050, height: 34, material: "ice", footprintPersistenceSeconds: 42, scentRetention: 0.06, movementMultiplier: 1.08, baseNoise: 0.74, mudDepth: 0 },
    { id: "i-arena-snow", x: 3_920, y: 584, width: 1_680, height: 40, material: "snow", footprintPersistenceSeconds: 82, scentRetention: 0.28, movementMultiplier: 0.9, baseNoise: 0.46, mudDepth: 0 },
  ],
  routes: [
    { id: "ice-surface", label: "Banquise exposée", startX: 0, endX: 5_350, waypointIds: ["i-shelf-01", "i-wall-west", "i-thin-bridge", "i-pillar-left"], requirements: ["timed-hazard"], advantages: ["speed", "tracking"], risk: 3 },
    { id: "glacial-caves", label: "Galeries glaciaires", startX: 1_160, endX: 5_265, waypointIds: ["i-cave-01", "i-cave-wall", "i-cave-03", "i-arena-wall"], requirements: ["climb", "mask"], advantages: ["stealth", "ambush"], risk: 2 },
    { id: "mining-gantry", label: "Anciennes passerelles minières", startX: 1_640, endX: 4_035, waypointIds: ["i-mine-ladder", "i-gantry-01", "i-gantry-rope", "i-gantry-03"], requirements: ["climb"], advantages: ["high-ground", "speed"], risk: 2 },
  ],
  trapSockets: [
    { id: "i-trap-cave", x: 1_330, y: 610, routeId: "glacial-caves", allowed: ["snare", "audio-decoy"], facing: 1, concealment: 0.76 },
    { id: "i-trap-bridge", x: 3_035, y: 612, routeId: "ice-surface", allowed: ["snare", "netgun"], facing: -1, concealment: 0.42 },
    { id: "i-trap-rift", x: 3_520, y: 385, routeId: "glacial-caves", allowed: ["audio-decoy", "netgun"], facing: 1, concealment: 0.68 },
    { id: "i-trap-arena", x: 4_645, y: 610, routeId: "ice-surface", allowed: ["snare", "audio-decoy", "netgun"], facing: -1, concealment: 0.48 },
  ],
};

const VOLCANO_WORLD_BASE: WorldBlueprint = {
  missionId: "volcano-bad-blood",
  biome: "volcano",
  width: 5_600,
  height: 720,
  floorY: 624,
  spawn: { x: 150, y: 508 },
  extraction: { x: 5_350, y: 624 },
  bossArena: { x: 4_040, y: 272, width: 1_160, height: 352 },
  wind: {
    seed: 0xbaad81,
    baseX: 0.18,
    baseY: -0.46,
    gustStrength: 0.64,
    gustPeriodSeconds: 10,
    verticalTurbulence: 0.55,
  },
  platforms: [
    { id: "v-basalt-01", x: 370, y: 520, width: 315, height: 28, material: "basalt", routeId: "sanctum-floor", collision: "one-way", noiseMultiplier: 1.25, trackPersistence: 0.04 },
    { id: "v-ruin-01", x: 785, y: 425, width: 290, height: 25, material: "ruin", routeId: "ruin-highline", collision: "one-way", noiseMultiplier: 1.05, trackPersistence: 0.06 },
    { id: "v-vent-01", x: 1_165, y: 510, width: 340, height: 26, material: "basalt", routeId: "vent-flank", collision: "one-way", noiseMultiplier: 1.18, trackPersistence: 0.04 },
    { id: "v-ruin-02", x: 1_610, y: 382, width: 340, height: 25, material: "ruin", routeId: "ruin-highline", collision: "one-way", noiseMultiplier: 1.08, trackPersistence: 0.05 },
    { id: "v-basalt-02", x: 2_015, y: 522, width: 370, height: 27, material: "basalt", routeId: "sanctum-floor", collision: "one-way", noiseMultiplier: 1.24, trackPersistence: 0.04 },
    { id: "v-chain-ledge", x: 2_460, y: 402, width: 335, height: 24, material: "ruin", routeId: "ruin-highline", collision: "one-way", noiseMultiplier: 1.12, trackPersistence: 0.03 },
    { id: "v-vent-02", x: 2_875, y: 515, width: 370, height: 26, material: "basalt", routeId: "vent-flank", collision: "one-way", noiseMultiplier: 1.2, trackPersistence: 0.03 },
    { id: "v-aqueduct", x: 3_315, y: 390, width: 345, height: 25, material: "ruin", routeId: "ruin-highline", collision: "one-way", noiseMultiplier: 1.06, trackPersistence: 0.04 },
    { id: "v-sanctum-gate", x: 3_725, y: 505, width: 320, height: 26, material: "ruin", routeId: "sanctum-floor", collision: "one-way", noiseMultiplier: 1.15, trackPersistence: 0.04 },
    { id: "v-arena-left", x: 4_100, y: 420, width: 340, height: 26, material: "ruin", routeId: "sanctum-floor", collision: "one-way", noiseMultiplier: 1.08, trackPersistence: 0.04 },
    { id: "v-arena-core", x: 4_535, y: 512, width: 360, height: 28, material: "basalt", routeId: "sanctum-floor", collision: "one-way", noiseMultiplier: 1.22, trackPersistence: 0.03 },
    { id: "v-arena-high", x: 4_980, y: 384, width: 305, height: 25, material: "ruin", routeId: "ruin-highline", collision: "one-way", noiseMultiplier: 1.04, trackPersistence: 0.04 },
  ],
  climbables: [
    { id: "v-column-west", x: 720, y: 245, width: 110, height: 379, kind: "basalt-column", routeId: "ruin-highline", climbSpeedMultiplier: 0.8, staminaPerSecond: 6, dismounts: [{ x: 795, y: 425 }, { x: 840, y: 240 }] },
    { id: "v-ruin-ladder", x: 1_700, y: 195, width: 66, height: 212, kind: "ladder", routeId: "ruin-highline", climbSpeedMultiplier: 1.08, staminaPerSecond: 2, dismounts: [{ x: 1_650, y: 382 }, { x: 1_790, y: 382 }] },
    { id: "v-chain-center", x: 2_535, y: 150, width: 58, height: 276, kind: "chain", routeId: "ruin-highline", climbSpeedMultiplier: 0.82, staminaPerSecond: 4, dismounts: [{ x: 2_485, y: 402 }, { x: 2_625, y: 402 }] },
    { id: "v-vent-column", x: 3_000, y: 295, width: 108, height: 329, kind: "basalt-column", routeId: "vent-flank", climbSpeedMultiplier: 0.78, staminaPerSecond: 6, dismounts: [{ x: 3_045, y: 515 }, { x: 3_120, y: 290 }] },
    { id: "v-aqueduct-ladder", x: 3_415, y: 170, width: 64, height: 245, kind: "ladder", routeId: "ruin-highline", climbSpeedMultiplier: 1.05, staminaPerSecond: 2, dismounts: [{ x: 3_360, y: 390 }, { x: 3_505, y: 390 }] },
    { id: "v-arena-chain", x: 4_930, y: 140, width: 60, height: 269, kind: "chain", routeId: "ruin-highline", climbSpeedMultiplier: 0.84, staminaPerSecond: 4, dismounts: [{ x: 4_985, y: 384 }, { x: 5_035, y: 140 }] },
  ],
  hazards: [
    { id: "v-lava-west", x: 1_000, y: 590, width: 320, height: 34, kind: "lava", routeId: "sanctum-floor", damagePerSecond: 34, movementMultiplier: 0.35, noisePerSecond: 0.5, trackMultiplier: 0, revealsCloak: true, telegraphSeconds: 0, cycle: null },
    { id: "v-steam-center", x: 2_690, y: 310, width: 330, height: 314, kind: "steam-vent", routeId: "vent-flank", damagePerSecond: 15, movementMultiplier: 0.74, noisePerSecond: 0.72, trackMultiplier: 0.25, revealsCloak: true, telegraphSeconds: 1, cycle: { periodSeconds: 6.5, activeSeconds: 1.8, phaseSeconds: 0.5 } },
    { id: "v-ash-east", x: 3_320, y: 210, width: 720, height: 414, kind: "ash-squall", routeId: "sanctum-floor", damagePerSecond: 2, movementMultiplier: 0.8, noisePerSecond: 0.28, trackMultiplier: 1.8, revealsCloak: false, telegraphSeconds: 1.6, cycle: { periodSeconds: 13, activeSeconds: 4.5, phaseSeconds: 3 } },
    { id: "v-arena-vents", x: 4_300, y: 330, width: 700, height: 294, kind: "steam-vent", routeId: "sanctum-floor", damagePerSecond: 19, movementMultiplier: 0.76, noisePerSecond: 0.84, trackMultiplier: 0.35, revealsCloak: true, telegraphSeconds: 0.9, cycle: { periodSeconds: 7, activeSeconds: 1.6, phaseSeconds: 4 } },
  ],
  covers: [
    { id: "v-cover-idol", x: 1_420, y: 502, width: 102, height: 122, routeId: "sanctum-floor", protection: 0.84, approach: "either", destructible: false },
    { id: "v-cover-pillar", x: 3_780, y: 478, width: 90, height: 146, routeId: "sanctum-floor", protection: 0.9, approach: "either", destructible: true },
    { id: "v-arena-cover-left", x: 4_280, y: 502, width: 108, height: 122, routeId: "sanctum-floor", protection: 0.86, approach: "right", destructible: true },
    { id: "v-arena-cover-right", x: 4_875, y: 494, width: 110, height: 130, routeId: "sanctum-floor", protection: 0.86, approach: "left", destructible: true },
  ],
  surfaces: [
    { id: "v-ash-west", x: 0, y: 584, width: 1_000, height: 40, material: "ash", footprintPersistenceSeconds: 58, scentRetention: 0.2, movementMultiplier: 0.94, baseNoise: 0.18, mudDepth: 0 },
    { id: "v-lava-surface", x: 1_000, y: 590, width: 320, height: 34, material: "basalt", footprintPersistenceSeconds: 2, scentRetention: 0, movementMultiplier: 0.35, baseNoise: 0.7, mudDepth: 0 },
    { id: "v-ash-center", x: 1_320, y: 584, width: 1_850, height: 40, material: "ash", footprintPersistenceSeconds: 72, scentRetention: 0.24, movementMultiplier: 0.92, baseNoise: 0.2, mudDepth: 0 },
    { id: "v-basalt-center", x: 3_170, y: 584, width: 870, height: 40, material: "basalt", footprintPersistenceSeconds: 5, scentRetention: 0.04, movementMultiplier: 1, baseNoise: 0.66, mudDepth: 0 },
    { id: "v-arena-ash", x: 4_040, y: 584, width: 1_560, height: 40, material: "ash", footprintPersistenceSeconds: 64, scentRetention: 0.18, movementMultiplier: 0.93, baseNoise: 0.22, mudDepth: 0 },
  ],
  routes: [
    { id: "sanctum-floor", label: "Sol du sanctuaire", startX: 0, endX: 5_350, waypointIds: ["v-basalt-01", "v-cover-idol", "v-sanctum-gate", "v-arena-core"], requirements: ["timed-hazard"], advantages: ["tracking", "ambush"], risk: 2 },
    { id: "vent-flank", label: "Flanc des évents", startX: 1_165, endX: 3_245, waypointIds: ["v-vent-01", "v-steam-center", "v-vent-column", "v-vent-02"], requirements: ["climb", "timed-hazard"], advantages: ["speed", "stealth"], risk: 3 },
    { id: "ruin-highline", label: "Aqueduc des anciens", startX: 785, endX: 5_285, waypointIds: ["v-column-west", "v-ruin-02", "v-chain-center", "v-aqueduct", "v-arena-high"], requirements: ["climb"], advantages: ["high-ground", "ambush", "stealth"], risk: 2 },
  ],
  trapSockets: [
    { id: "v-trap-idol", x: 1_500, y: 610, routeId: "sanctum-floor", allowed: ["snare", "audio-decoy"], facing: 1, concealment: 0.58 },
    { id: "v-trap-vent", x: 2_940, y: 608, routeId: "vent-flank", allowed: ["snare", "netgun"], facing: -1, concealment: 0.46 },
    { id: "v-trap-aqueduct", x: 3_520, y: 384, routeId: "ruin-highline", allowed: ["audio-decoy", "netgun"], facing: 1, concealment: 0.62 },
    { id: "v-trap-arena", x: 4_675, y: 610, routeId: "sanctum-floor", allowed: ["snare", "audio-decoy", "netgun"], facing: -1, concealment: 0.35 },
  ],
};

const BASE_WORLD_WIDTH = 5_600;

type BlueprintBiomeFamily = "jungle" | "ice" | "volcano";

/**
 * New worlds inherit a battle-tested collision vocabulary while their room
 * plan adds endemic traversal features. This keeps every planet playable in
 * the current Canvas runtime without collapsing its public biome identity.
 */
function biomeFamily(biome: BiomeId): BlueprintBiomeFamily {
  if (biome === "swamp" || biome === "fungal") return "jungle";
  if (biome === "ocean") return "ice";
  if (biome === "desert" || biome === "ruins") return "volcano";
  return biome;
}

type ExpansionBiomeId = Exclude<BiomeId, "jungle" | "ice" | "volcano">;

const EXPANSION_HAZARD_KINDS: Readonly<
  Record<ExpansionBiomeId, readonly [HazardKind, HazardKind, HazardKind]>
> = {
  swamp: ["deep-mud", "predatory-flora", "tidal-surge"],
  desert: ["sand-collapse", "heat-burst", "glass-storm"],
  ocean: ["rogue-wave", "electrical-surge", "abyssal-vent"],
  fungal: ["spore-cloud", "mycelial-snare", "acid-bloom"],
  ruins: ["gravity-pulse", "nanite-field", "laser-grid"],
};

type HazardBehavior = Pick<
  WorldHazard,
  | "damagePerSecond"
  | "movementMultiplier"
  | "noisePerSecond"
  | "trackMultiplier"
  | "revealsCloak"
  | "telegraphSeconds"
  | "cycle"
>;

function hazardCycle(
  periodSeconds: number,
  activeSeconds: number,
  phaseSeconds: number,
): HazardCycle {
  return { periodSeconds, activeSeconds, phaseSeconds };
}

function hazardBehavior(kind: HazardKind, variant: number): HazardBehavior {
  switch (kind) {
    case "deep-mud":
      return { damagePerSecond: 0, movementMultiplier: 0.52, noisePerSecond: 0.12, trackMultiplier: 2.6, revealsCloak: false, telegraphSeconds: 0, cycle: null };
    case "predatory-flora":
      return { damagePerSecond: 10, movementMultiplier: 0.7, noisePerSecond: 0.42, trackMultiplier: 1.2, revealsCloak: true, telegraphSeconds: 0.45, cycle: hazardCycle(4.5, 1.4, variant * 0.8) };
    case "tidal-surge":
      return { damagePerSecond: 8, movementMultiplier: 0.44, noisePerSecond: 0.82, trackMultiplier: 0.15, revealsCloak: true, telegraphSeconds: 1.5, cycle: hazardCycle(11, 3, variant * 1.2) };
    case "sand-collapse":
      return { damagePerSecond: 7, movementMultiplier: 0.43, noisePerSecond: 0.36, trackMultiplier: 2.2, revealsCloak: false, telegraphSeconds: 1.25, cycle: hazardCycle(10, 2.4, variant) };
    case "glass-storm":
      return { damagePerSecond: 4, movementMultiplier: 0.76, noisePerSecond: 0.38, trackMultiplier: 1.8, revealsCloak: true, telegraphSeconds: 1.8, cycle: hazardCycle(14, 5, variant * 1.5) };
    case "heat-burst":
      return { damagePerSecond: 16, movementMultiplier: 0.82, noisePerSecond: 0.7, trackMultiplier: 0.12, revealsCloak: true, telegraphSeconds: 1, cycle: hazardCycle(7, 1.6, variant * 0.7) };
    case "rogue-wave":
      return { damagePerSecond: 12, movementMultiplier: 0.48, noisePerSecond: 0.92, trackMultiplier: 0.1, revealsCloak: true, telegraphSeconds: 1.4, cycle: hazardCycle(11, 2.6, variant * 1.1) };
    case "electrical-surge":
      return { damagePerSecond: 18, movementMultiplier: 0.84, noisePerSecond: 0.78, trackMultiplier: 0.2, revealsCloak: true, telegraphSeconds: 0.8, cycle: hazardCycle(8, 1.2, variant * 0.65) };
    case "abyssal-vent":
      return { damagePerSecond: 14, movementMultiplier: 0.72, noisePerSecond: 0.68, trackMultiplier: 0.25, revealsCloak: true, telegraphSeconds: 1.1, cycle: hazardCycle(7, 1.8, variant * 0.9) };
    case "spore-cloud":
      return { damagePerSecond: 4, movementMultiplier: 0.72, noisePerSecond: 0.18, trackMultiplier: 1.6, revealsCloak: true, telegraphSeconds: 1.6, cycle: hazardCycle(12, 4, variant * 1.3) };
    case "mycelial-snare":
      return { damagePerSecond: 6, movementMultiplier: 0.4, noisePerSecond: 0.1, trackMultiplier: 2.3, revealsCloak: false, telegraphSeconds: 0.7, cycle: hazardCycle(8, 3, variant) };
    case "acid-bloom":
      return { damagePerSecond: 15, movementMultiplier: 0.65, noisePerSecond: 0.4, trackMultiplier: 0.6, revealsCloak: true, telegraphSeconds: 1, cycle: hazardCycle(6.5, 1.5, variant * 0.6) };
    case "gravity-pulse":
      return { damagePerSecond: 10, movementMultiplier: 0.55, noisePerSecond: 0.7, trackMultiplier: 0.1, revealsCloak: true, telegraphSeconds: 1.2, cycle: hazardCycle(9, 2, variant) };
    case "nanite-field":
      return { damagePerSecond: 7, movementMultiplier: 0.8, noisePerSecond: 0.22, trackMultiplier: 0.5, revealsCloak: true, telegraphSeconds: 1.5, cycle: hazardCycle(12, 4, variant * 1.4) };
    case "laser-grid":
      return { damagePerSecond: 22, movementMultiplier: 0.9, noisePerSecond: 0.85, trackMultiplier: 0, revealsCloak: true, telegraphSeconds: 0.9, cycle: hazardCycle(7, 1, variant * 0.75) };
    case "lava":
      return { damagePerSecond: 34, movementMultiplier: 0.35, noisePerSecond: 0.5, trackMultiplier: 0, revealsCloak: true, telegraphSeconds: 0, cycle: null };
    case "steam-vent":
      return { damagePerSecond: 15, movementMultiplier: 0.74, noisePerSecond: 0.72, trackMultiplier: 0.25, revealsCloak: true, telegraphSeconds: 1, cycle: hazardCycle(6.5, 1.8, variant) };
    case "thin-ice":
      return { damagePerSecond: 14, movementMultiplier: 0.7, noisePerSecond: 0.62, trackMultiplier: 1.6, revealsCloak: false, telegraphSeconds: 1.1, cycle: hazardCycle(9, 2.2, variant) };
    default:
      return { damagePerSecond: 8, movementMultiplier: 0.78, noisePerSecond: 0.4, trackMultiplier: 1, revealsCloak: false, telegraphSeconds: 1, cycle: null };
  }
}

function surfaceBehavior(
  material: SurfaceMaterial,
): Omit<TrackSurface, keyof WorldRect | "id" | "material"> {
  switch (material) {
    case "mud":
      return { footprintPersistenceSeconds: 92, scentRetention: 1.45, movementMultiplier: 0.58, baseNoise: 0.42, mudDepth: 0.82 };
    case "water":
      return { footprintPersistenceSeconds: 0, scentRetention: 0.15, movementMultiplier: 0.62, baseNoise: 0.56, mudDepth: 0.28 };
    case "sand":
      return { footprintPersistenceSeconds: 66, scentRetention: 0.18, movementMultiplier: 0.86, baseNoise: 0.34, mudDepth: 0 };
    case "coral":
      return { footprintPersistenceSeconds: 18, scentRetention: 0.12, movementMultiplier: 0.92, baseNoise: 0.52, mudDepth: 0 };
    case "mycelium":
      return { footprintPersistenceSeconds: 88, scentRetention: 1.2, movementMultiplier: 0.8, baseNoise: 0.24, mudDepth: 0.12 };
    case "obsidian":
      return { footprintPersistenceSeconds: 6, scentRetention: 0.02, movementMultiplier: 1, baseNoise: 0.7, mudDepth: 0 };
    case "soil":
      return { footprintPersistenceSeconds: 28, scentRetention: 0.88, movementMultiplier: 1, baseNoise: 0.24, mudDepth: 0.04 };
    case "ruin":
      return { footprintPersistenceSeconds: 8, scentRetention: 0.08, movementMultiplier: 0.98, baseNoise: 0.58, mudDepth: 0 };
    case "stone":
      return { footprintPersistenceSeconds: 12, scentRetention: 0.1, movementMultiplier: 1, baseNoise: 0.55, mudDepth: 0 };
    default:
      return { footprintPersistenceSeconds: 20, scentRetention: 0.2, movementMultiplier: 0.96, baseNoise: 0.38, mudDepth: 0 };
  }
}

function platformBehavior(
  material: SurfaceMaterial,
): Pick<WorldPlatform, "noiseMultiplier" | "trackPersistence"> {
  if (material === "metal") return { noiseMultiplier: 1.6, trackPersistence: 0.02 };
  if (material === "root" || material === "mycelium") return { noiseMultiplier: 0.7, trackPersistence: 0.3 };
  if (material === "sand") return { noiseMultiplier: 0.82, trackPersistence: 0.9 };
  if (material === "coral") return { noiseMultiplier: 1.12, trackPersistence: 0.1 };
  if (material === "obsidian") return { noiseMultiplier: 1.3, trackPersistence: 0.03 };
  return { noiseMultiplier: 1.05, trackPersistence: 0.08 };
}

interface FeatureGeometry {
  platforms: WorldPlatform[];
  climbables: WorldClimbable[];
  hazards: WorldHazard[];
  covers: CoverNode[];
  surfaces: TrackSurface[];
}

function scalePoint<T extends WorldPoint>(
  point: T,
  horizontalScale: number,
): T {
  return { ...point, x: point.x * horizontalScale };
}

function scaleRect<T extends WorldRect>(
  rect: T,
  horizontalScale: number,
): T {
  return {
    ...rect,
    x: rect.x * horizontalScale,
    width: rect.width * horizontalScale,
  };
}

/**
 * Preserve the authored 720 px vertical composition while expanding every
 * horizontal gameplay coordinate. This moves extraction, arenas, routes and
 * collision spans together instead of appending an empty decorative tail.
 */
function expandBaseBlueprint(base: WorldBlueprint): WorldBlueprint {
  const horizontalScale = WORLD_SCREEN_WORLD_WIDTH / BASE_WORLD_WIDTH;
  return {
    ...base,
    width: WORLD_SCREEN_WORLD_WIDTH,
    spawn: scalePoint(base.spawn, horizontalScale),
    extraction: scalePoint(base.extraction, horizontalScale),
    bossArena: scaleRect(base.bossArena, horizontalScale),
    platforms: base.platforms.map((platform) =>
      scaleRect(platform, horizontalScale),
    ),
    climbables: base.climbables.map((climbable) => ({
      ...scaleRect(climbable, horizontalScale),
      dismounts: climbable.dismounts.map((point) =>
        scalePoint(point, horizontalScale),
      ),
    })),
    hazards: base.hazards.map((hazard) =>
      scaleRect(hazard, horizontalScale),
    ),
    covers: base.covers.map((cover) => scaleRect(cover, horizontalScale)),
    surfaces: base.surfaces.map((surface) =>
      scaleRect(surface, horizontalScale),
    ),
    routes: base.routes.map((route) => ({
      ...route,
      startX: route.startX * horizontalScale,
      endX: route.endX * horizontalScale,
    })),
    trapSockets: base.trapSockets.map((socket) =>
      scalePoint(socket, horizontalScale),
    ),
  };
}

function routeForFeature(
  biome: BiomeId,
  item: WorldScreenFeature,
): RouteId {
  const family = biomeFamily(biome);
  if (family === "jungle") {
    if (item.role === "climb") return "canopy";
    if (item.role === "water") return "flooded-cut";
    return "ground";
  }
  if (family === "ice") {
    if (
      item.kind === "metal-gantry" ||
      item.kind === "ladder" ||
      item.kind === "rope"
    ) {
      return "mining-gantry";
    }
    if (item.role === "climb") return "glacial-caves";
    return "ice-surface";
  }
  if (item.kind === "steam-vent") return "vent-flank";
  if (
    item.role === "climb" ||
    item.kind === "ruin" ||
    item.kind === "chain"
  ) {
    return "ruin-highline";
  }
  return "sanctum-floor";
}

function materialForFeature(
  biome: BiomeId,
  item: WorldScreenFeature,
): SurfaceMaterial {
  if (item.kind === "metal-gantry" || item.kind === "ladder") return "metal";
  if (item.kind === "ruin") return "ruin";
  if (item.kind === "basalt-column" || item.kind === "lava") return "basalt";
  if (item.kind === "rock-face") return "stone";
  if (item.kind === "mud") return "mud";
  if (item.kind === "water") return "water";
  if (item.kind === "sand") return "sand";
  if (item.kind === "coral") return "coral";
  if (item.kind === "mycelium") return "mycelium";
  if (item.kind === "obsidian") return "obsidian";
  if (item.kind === "snowdrift") return "snow";
  if (item.kind === "thin-ice" || item.kind === "ice-wall") return "ice";
  if (biome === "jungle") return item.kind === "platform" ? "root" : "soil";
  if (biome === "ice") return "ice";
  if (biome === "volcano") return "basalt";
  if (biome === "swamp") return item.kind === "platform" ? "root" : "soil";
  if (biome === "desert") return "sand";
  if (biome === "ocean") return "coral";
  if (biome === "fungal") return "mycelium";
  return "obsidian";
}

function boundedFeatureX(
  anchorX: number,
  width: number,
  worldWidth: number,
): number {
  return Math.max(0, Math.min(worldWidth - width, anchorX - width / 2));
}

function featureVariant(id: string): number {
  return [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 3;
}

function climbableKind(item: WorldScreenFeature): ClimbableKind {
  switch (item.kind) {
    case "tree":
    case "vine":
    case "rock-face":
    case "ice-wall":
    case "ladder":
    case "rope":
    case "chain":
    case "basalt-column":
      return item.kind;
    default:
      return "rock-face";
  }
}

/** Convert every room-plan feature into geometry consumed by HuntCanvas. */
function geometryForScreenFeatures(
  missionId: MissionId,
  worldWidth: number,
  floorY: number,
): FeatureGeometry {
  const layout = worldScreensFor(missionId);
  const result: FeatureGeometry = {
    platforms: [],
    climbables: [],
    hazards: [],
    covers: [],
    surfaces: [],
  };

  for (const item of layout.screens.flatMap((screen) => screen.features)) {
    const id = `feature-${item.id}`;
    const routeId = routeForFeature(layout.biome, item);
    const material = materialForFeature(layout.biome, item);
    const variant = featureVariant(item.id);

    if (item.role === "platform") {
      const width = item.kind === "metal-gantry" ? 340 : item.kind === "ruin" ? 300 : 270;
      const y = [512, 430, 366][variant];
      const behavior = platformBehavior(material);
      result.platforms.push({
        id,
        x: boundedFeatureX(item.x, width, worldWidth),
        y,
        width,
        height: item.kind === "ruin" ? 28 : 24,
        material,
        routeId,
        collision: "one-way",
        ...behavior,
      });
      continue;
    }

    if (item.role === "climb") {
      const kind = climbableKind(item);
      const flexible = kind === "vine" || kind === "rope" || kind === "chain";
      const width = flexible ? 64 : kind === "ladder" ? 68 : 112;
      const y = flexible ? 166 + variant * 20 : 220 - variant * 24;
      const height = floorY - y;
      const x = boundedFeatureX(item.x, width, worldWidth);
      result.climbables.push({
        id,
        x,
        y,
        width,
        height,
        kind,
        routeId,
        climbSpeedMultiplier: kind === "ladder" ? 1.08 : flexible ? 0.84 : 0.78,
        staminaPerSecond: kind === "ladder" ? 2 : flexible ? 4 : 6,
        dismounts: [
          { x: Math.max(0, x - 36), y: floorY },
          { x: Math.min(worldWidth, x + width + 36), y },
        ],
      });
      continue;
    }

    if (item.role === "hazard") {
      const kind = item.kind as HazardKind;
      const vertical = new Set<HazardKind>([
        "steam-vent",
        "glass-storm",
        "heat-burst",
        "electrical-surge",
        "abyssal-vent",
        "spore-cloud",
        "acid-bloom",
        "gravity-pulse",
        "nanite-field",
        "laser-grid",
      ]).has(kind);
      const width = vertical ? 290 : kind === "lava" ? 360 : 390;
      const y = vertical ? 290 : kind === "tidal-surge" || kind === "rogue-wave" ? 560 : 590;
      const behavior = hazardBehavior(kind, variant);
      result.hazards.push({
        id,
        x: boundedFeatureX(item.x, width, worldWidth),
        y,
        width,
        height: floorY - y,
        kind,
        routeId,
        ...behavior,
      });
      continue;
    }

    if (item.role === "cover") {
      const width = item.kind === "tree" || item.kind === "basalt-column" ? 118 : 132;
      const height = item.kind === "snowdrift" ? 76 : 154 + variant * 24;
      result.covers.push({
        id,
        x: boundedFeatureX(item.x, width, worldWidth),
        y: floorY - height,
        width,
        height,
        routeId,
        protection: item.kind === "snowdrift" ? 0.68 : 0.88,
        approach: "either",
        destructible: item.kind !== "basalt-column",
      });
      continue;
    }

    const isWater = item.role === "water";
    const width = isWater ? 420 : 340;
    const y = isWater ? 570 : 584;
    const behavior = surfaceBehavior(material);
    result.surfaces.push({
      id,
      x: boundedFeatureX(item.x, width, worldWidth),
      y,
      width,
      height: floorY - y,
      material,
      ...behavior,
    });
  }

  return result;
}

function rectsOverlap(left: WorldRect, right: WorldRect): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function buildPlayableWorld(base: WorldBlueprint): WorldBlueprint {
  const expanded = expandBaseBlueprint(base);
  const features = geometryForScreenFeatures(
    expanded.missionId,
    expanded.width,
    expanded.floorY,
  );
  // A room feature replaces an overlapping legacy hazard of the same kind.
  // Keeping both made lava/ice/steam inflict their DPS twice in one footprint.
  const hazardReplacements = new Map<string, string>();
  const legacyHazards = expanded.hazards.filter((hazard) => {
    const replacement = features.hazards.find(
      (featureHazard) =>
        featureHazard.kind === hazard.kind &&
        rectsOverlap(featureHazard, hazard),
    );
    if (!replacement) return true;
    hazardReplacements.set(hazard.id, replacement.id);
    return false;
  });
  return {
    ...expanded,
    platforms: [...expanded.platforms, ...features.platforms],
    climbables: [...expanded.climbables, ...features.climbables],
    hazards: [...legacyHazards, ...features.hazards],
    covers: [...expanded.covers, ...features.covers],
    // Feature surfaces come last; HuntCanvas resolves the most-specific match
    // from the end so lakes, mud and snowdrifts override the broad base strip.
    surfaces: [...expanded.surfaces, ...features.surfaces],
    routes: expanded.routes.map((route) => ({
      ...route,
      waypointIds: route.waypointIds.map(
        (waypointId) => hazardReplacements.get(waypointId) ?? waypointId,
      ),
    })),
  };
}

const JUNGLE_WORLD = buildPlayableWorld(JUNGLE_WORLD_BASE);
const ICE_WORLD = buildPlayableWorld(ICE_WORLD_BASE);
const VOLCANO_WORLD = buildPlayableWorld(VOLCANO_WORLD_BASE);

function expansionPlatformMaterial(
  biome: ExpansionBiomeId,
  material: SurfaceMaterial,
): SurfaceMaterial {
  if (biome === "swamp") {
    if (material === "metal" || material === "stone") return material;
    return "root";
  }
  if (biome === "desert") return material === "ruin" ? "ruin" : "stone";
  if (biome === "ocean") {
    if (material === "metal" || material === "stone") return material;
    return "coral";
  }
  if (biome === "fungal") {
    if (material === "metal" || material === "stone") return material;
    return "mycelium";
  }
  return material === "ruin" ? "ruin" : "obsidian";
}

function expansionSurfaceMaterial(
  biome: ExpansionBiomeId,
  material: SurfaceMaterial,
): SurfaceMaterial {
  if (biome === "swamp") {
    if (material === "mud" || material === "water") return material;
    return "soil";
  }
  if (biome === "desert") return material === "basalt" ? "stone" : "sand";
  if (biome === "ocean") return material === "ice" ? "water" : "coral";
  if (biome === "fungal") {
    if (material === "mud" || material === "water") return material;
    return "mycelium";
  }
  return material === "basalt" ? "ruin" : "obsidian";
}

function expansionClimbableKind(
  biome: ExpansionBiomeId,
  kind: ClimbableKind,
): ClimbableKind {
  if (biome === "ocean" && kind === "ice-wall") return "rock-face";
  if (
    (biome === "desert" || biome === "ruins") &&
    kind === "basalt-column"
  ) {
    return "rock-face";
  }
  return kind;
}

function expansionWorldBase(
  template: WorldBlueprint,
  missionId: MissionId,
  biome: ExpansionBiomeId,
  windSeed: number,
  routeLabels: readonly [string, string, string],
): WorldBlueprint {
  const hazardKinds = EXPANSION_HAZARD_KINDS[biome];
  return {
    ...template,
    missionId,
    biome,
    wind: { ...template.wind, seed: windSeed },
    platforms: template.platforms.map((platform) => {
      const material = expansionPlatformMaterial(biome, platform.material);
      return { ...platform, material, ...platformBehavior(material) };
    }),
    climbables: template.climbables.map((climbable) => ({
      ...climbable,
      kind: expansionClimbableKind(biome, climbable.kind),
    })),
    hazards: template.hazards.map((hazard, index) => {
      const kind = hazardKinds[index % hazardKinds.length];
      return { ...hazard, kind, ...hazardBehavior(kind, index) };
    }),
    surfaces: template.surfaces.map((surface) => {
      const material = expansionSurfaceMaterial(biome, surface.material);
      return { ...surface, material, ...surfaceBehavior(material) };
    }),
    routes: template.routes.map((route, index) => ({
      ...route,
      label: routeLabels[index] ?? route.label,
    })),
  };
}

const SWAMP_WORLD = buildPlayableWorld(
  expansionWorldBase(
    JUNGLE_WORLD_BASE,
    "swamp-hydra",
    "swamp",
    0x5a4d09,
    ["Mangrove basse", "Couronnes de racines", "Chenaux de marée"],
  ),
);
const DESERT_WORLD = buildPlayableWorld(
  expansionWorldBase(
    VOLCANO_WORLD_BASE,
    "desert-sandmaw",
    "desert",
    0xde5e47,
    ["Mer de silice", "Couloirs du vent", "Crêtes du canyon"],
  ),
);
const OCEAN_WORLD = buildPlayableWorld(
  expansionWorldBase(
    ICE_WORLD_BASE,
    "ocean-leviathan",
    "ocean",
    0x0cea71,
    ["Récif battu", "Arches submergées", "Passerelles de la station"],
  ),
);
const FUNGAL_WORLD = buildPlayableWorld(
  expansionWorldBase(
    JUNGLE_WORLD_BASE,
    "fungal-hivemind",
    "fungal",
    0xf09a17,
    ["Tapis mycélien", "Tours de fructification", "Racines-mémoires"],
  ),
);
const RUINS_WORLD = buildPlayableWorld(
  expansionWorldBase(
    VOLCANO_WORLD_BASE,
    "ruins-ancient-guardian",
    "ruins",
    0xac4e09,
    ["Galeries de la cité", "Failles gravitationnelles", "Ponts d'obsidienne"],
  ),
);

export const WORLD_BLUEPRINTS_BY_MISSION: Readonly<
  Record<MissionId, WorldBlueprint>
> = {
  "jungle-vey": JUNGLE_WORLD,
  "ice-cryostalker": ICE_WORLD,
  "volcano-bad-blood": VOLCANO_WORLD,
  "swamp-hydra": SWAMP_WORLD,
  "desert-sandmaw": DESERT_WORLD,
  "ocean-leviathan": OCEAN_WORLD,
  "fungal-hivemind": FUNGAL_WORLD,
  "ruins-ancient-guardian": RUINS_WORLD,
};

export const WORLD_BLUEPRINTS_BY_BIOME: Readonly<
  Record<BiomeId, WorldBlueprint>
> = {
  jungle: JUNGLE_WORLD,
  ice: ICE_WORLD,
  volcano: VOLCANO_WORLD,
  swamp: SWAMP_WORLD,
  desert: DESERT_WORLD,
  ocean: OCEAN_WORLD,
  fungal: FUNGAL_WORLD,
  ruins: RUINS_WORLD,
};

export function worldBlueprintFor(
  id: MissionId | BiomeId,
): WorldBlueprint {
  if (id in WORLD_BLUEPRINTS_BY_MISSION) {
    return WORLD_BLUEPRINTS_BY_MISSION[id as MissionId];
  }
  return WORLD_BLUEPRINTS_BY_BIOME[id as BiomeId];
}

export function isHazardActive(
  hazard: WorldHazard,
  elapsedSeconds: number,
): boolean {
  if (!hazard.cycle) return true;
  const { periodSeconds, activeSeconds, phaseSeconds } = hazard.cycle;
  const cycleTime =
    ((elapsedSeconds + phaseSeconds) % periodSeconds + periodSeconds) %
    periodSeconds;
  return cycleTime < activeSeconds;
}

export function validateWorldBlueprint(
  blueprint: WorldBlueprint,
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const register = (kind: string, id: string, rect?: WorldRect) => {
    if (ids.has(id)) errors.push(`Duplicate world id: ${id}`);
    ids.add(id);
    if (!rect) return;
    if (rect.width <= 0 || rect.height <= 0) {
      errors.push(`${kind}/${id} has a non-positive size`);
    }
    if (
      rect.x < 0 ||
      rect.y < 0 ||
      rect.x + rect.width > blueprint.width ||
      rect.y + rect.height > blueprint.height
    ) {
      errors.push(`${kind}/${id} escapes the world bounds`);
    }
  };

  for (const platform of blueprint.platforms) {
    register("platform", platform.id, platform);
  }
  for (const climbable of blueprint.climbables) {
    register("climbable", climbable.id, climbable);
  }
  for (const hazard of blueprint.hazards) {
    register("hazard", hazard.id, hazard);
    if (
      hazard.cycle &&
      (hazard.cycle.periodSeconds <= 0 ||
        hazard.cycle.activeSeconds < 0 ||
        hazard.cycle.activeSeconds > hazard.cycle.periodSeconds)
    ) {
      errors.push(`hazard/${hazard.id} has an invalid activation cycle`);
    }
  }
  for (const cover of blueprint.covers) register("cover", cover.id, cover);
  for (const surface of blueprint.surfaces) {
    register("surface", surface.id, surface);
  }
  for (const socket of blueprint.trapSockets) {
    register("trap", socket.id);
    if (
      socket.x < 0 ||
      socket.x > blueprint.width ||
      socket.y < 0 ||
      socket.y > blueprint.height
    ) {
      errors.push(`trap/${socket.id} escapes the world bounds`);
    }
  }

  const routeIds = new Set(blueprint.routes.map((route) => route.id));
  for (const route of blueprint.routes) {
    register("route", route.id);
    if (route.startX < 0 || route.endX > blueprint.width || route.startX >= route.endX) {
      errors.push(`route/${route.id} has an invalid horizontal span`);
    }
    for (const waypointId of route.waypointIds) {
      if (!ids.has(waypointId)) {
        errors.push(`route/${route.id} references missing waypoint ${waypointId}`);
      }
    }
  }
  for (const item of [
    ...blueprint.platforms,
    ...blueprint.climbables,
    ...blueprint.hazards,
    ...blueprint.covers,
    ...blueprint.trapSockets,
  ]) {
    if (!routeIds.has(item.routeId)) {
      errors.push(`${item.id} references missing route ${item.routeId}`);
    }
  }

  return errors;
}
