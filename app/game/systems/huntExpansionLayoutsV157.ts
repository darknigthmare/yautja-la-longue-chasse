import type {
  AlternativeRoute,
  ClimbableKind,
  CoverNode,
  HazardKind,
  RouteId,
  SurfaceMaterial,
  TrackSurface,
  TrapSocket,
  WorldBlueprint,
  WorldClimbable,
  WorldHazard,
  WorldPlatform,
  WorldPoint,
} from "./worldBlueprints";
import type { BiomeId, MissionId } from "../types";

/**
 * V157 authored base layouts for the five expansion hunts.
 *
 * Until V156 these planets reused the jungle, ice and volcano templates
 * (Naraka-Delta and Mycora-V shared 68 % of their ledges with Oseris). Each
 * world below has its own composition in the 5,600 px source grid, read
 * through its ecology:
 *   - Naraka-Delta: low mangrove decks over water and mud, few high crowns.
 *   - Mycora-V:     stacked fruiting towers of narrow caps around stalks.
 *   - Serekh-9:     wide mesa tables, long open dunes, a ruined arch.
 *   - Acheron-Sigma: regular city terraces, long bridges, ladders and chains.
 *   - Pelagos-M:    reef islands split by surge channels, station gantries.
 *
 * Shared contracts are kept: spawn, extraction, floor, the family route ids
 * (labels are replaced per planet), and hazard order, which follows
 * EXPANSION_HAZARD_KINDS index for index. Behaviours (noise, tracks, hazard
 * cycles) and endemic materials are applied afterwards by expansionWorldBase.
 * The span x < ~1,210 is replaced by each planet's exploration region, so the
 * authored main route starts after it.
 */

const FLOOR = 624;

const platform = (id: string, x: number, y: number, width: number, material: SurfaceMaterial, routeId: RouteId, height = 25): WorldPlatform =>
  ({ id, x, y, width, height, material, routeId, collision: "one-way", noiseMultiplier: 1, trackPersistence: 0.1 });

/** Climbables stand on the floor; `top` is the highest grip. */
const climb = (id: string, x: number, top: number, width: number, kind: ClimbableKind, routeId: RouteId, dismounts: readonly WorldPoint[]): WorldClimbable => {
  const rigid = kind === "tree" || kind === "rock-face";
  return {
    id, x, y: top, width, height: FLOOR - top, kind, routeId,
    climbSpeedMultiplier: kind === "ladder" ? 1.08 : rigid ? 0.8 : 0.84,
    staminaPerSecond: kind === "ladder" ? 2 : kind === "tree" ? 3 : rigid ? 6 : 4,
    dismounts: [...dismounts],
  };
};

/** Floor hazards span up to the floor; vertical ones rise from it. */
const hazard = (id: string, kind: HazardKind, x: number, top: number, width: number, routeId: RouteId): WorldHazard => ({
  id, kind, x, y: top, width, height: FLOOR - top, routeId,
  damagePerSecond: 0, movementMultiplier: 1, noisePerSecond: 0, trackMultiplier: 1,
  revealsCloak: false, telegraphSeconds: 0, cycle: null,
});

/** Covers stand on the floor. */
const cover = (id: string, x: number, width: number, height: number, routeId: RouteId, approach: CoverNode["approach"] = "either", protection = 0.84): CoverNode =>
  ({ id, x, y: FLOOR - height, width, height, routeId, protection, approach, destructible: true });

const surface = (id: string, x: number, width: number, material: SurfaceMaterial): TrackSurface => {
  const y = material === "water" ? 570 : material === "mud" ? 582 : 584;
  return { id, x, y, width, height: FLOOR - y, material, footprintPersistenceSeconds: 20, scentRetention: 0.2, movementMultiplier: 1, baseNoise: 0.3, mudDepth: 0 };
};

const trap = (id: string, x: number, y: number, routeId: RouteId, facing: 1 | -1, concealment: number): TrapSocket =>
  ({ id, x, y, routeId, allowed: ["snare", "audio-decoy", "netgun"], facing, concealment });

function layout(
  missionId: MissionId,
  biome: BiomeId,
  windSeed: number,
  bossArena: WorldBlueprint["bossArena"],
  parts: Pick<WorldBlueprint, "platforms" | "climbables" | "hazards" | "covers" | "surfaces" | "routes" | "trapSockets">,
): WorldBlueprint {
  return {
    missionId, biome, width: 5_600, height: 720, floorY: FLOOR,
    spawn: { x: 150, y: 508 }, extraction: { x: 5_350, y: FLOOR }, bossArena,
    wind: { seed: windSeed, baseX: 0.3, baseY: -0.1, gustStrength: 0.5, gustPeriodSeconds: 11, verticalTurbulence: 0.25 },
    ...parts,
  };
}

const route = (id: RouteId, label: string, startX: number, endX: number, waypointIds: readonly string[], requirements: AlternativeRoute["requirements"], advantages: AlternativeRoute["advantages"], risk: AlternativeRoute["risk"]): AlternativeRoute =>
  ({ id, label, startX, endX, waypointIds, requirements, advantages, risk });

// ---------------------------------------------------------------------------
// Naraka-Delta — mangrove basse (routes: ground, canopy, flooded-cut)
// ---------------------------------------------------------------------------
export const SWAMP_LAYOUT_V157 = layout("swamp-hydra", "swamp", 0x5a4d09, { x: 4_080, y: 300, width: 1_080, height: 324 }, {
  platforms: [
    platform("sw-boardwalk-01", 1_240, 548, 420, "metal", "ground", 26),
    platform("sw-root-01", 1_720, 470, 260, "root", "canopy"),
    platform("sw-mangrove-01", 2_050, 556, 380, "root", "flooded-cut", 24),
    platform("sw-crown-01", 2_280, 452, 240, "root", "canopy"),
    platform("sw-crown-02", 2_660, 372, 250, "root", "canopy"),
    platform("sw-stilt-01", 3_000, 540, 360, "metal", "ground", 26),
    platform("sw-root-02", 3_420, 462, 300, "root", "canopy"),
    platform("sw-crown-03", 3_560, 360, 240, "root", "canopy"),
    platform("sw-mangrove-02", 3_820, 552, 320, "root", "flooded-cut", 24),
    platform("sw-arena-deck", 4_150, 540, 380, "stone", "ground", 26),
    platform("sw-arena-root", 4_600, 450, 280, "root", "canopy"),
    platform("sw-arena-crown", 4_960, 380, 250, "root", "canopy"),
  ],
  climbables: [
    climb("sw-vine-01", 1_660, 360, 60, "vine", "canopy", [{ x: 1_630, y: FLOOR }, { x: 1_740, y: 470 }]),
    climb("sw-tree-01", 2_540, 250, 110, "tree", "canopy", [{ x: 2_500, y: 452 }, { x: 2_680, y: 372 }]),
    climb("sw-tree-arena", 4_870, 250, 100, "tree", "canopy", [{ x: 4_850, y: 450 }, { x: 4_980, y: 380 }]),
  ],
  hazards: [
    hazard("sw-mud-boardwalk", "deep-mud", 1_260, 582, 400, "ground"),
    hazard("sw-flora-stilt", "predatory-flora", 2_880, 574, 110, "ground"),
    hazard("sw-surge-channel", "tidal-surge", 2_050, 570, 380, "flooded-cut"),
    hazard("sw-mud-mangrove", "deep-mud", 3_800, 582, 260, "flooded-cut"),
  ],
  covers: [
    cover("sw-cover-roots", 1_780, 100, 76, "ground"),
    cover("sw-cover-hut", 3_370, 92, 84, "ground", "left", 0.86),
    cover("sw-cover-arena-01", 4_400, 110, 88, "ground", "either", 0.8),
    cover("sw-cover-arena-02", 4_740, 96, 76, "ground", "right", 0.74),
  ],
  surfaces: [
    surface("sw-soil-west", 0, 1_260, "soil"),
    surface("sw-mud-west", 1_260, 400, "mud"),
    surface("sw-soil-reeds", 1_660, 390, "soil"),
    surface("sw-water-channel", 2_050, 380, "water"),
    surface("sw-soil-stilts", 2_430, 1_370, "soil"),
    surface("sw-mud-east", 3_800, 260, "mud"),
    surface("sw-soil-arena", 4_060, 1_540, "soil"),
  ],
  routes: [
    route("ground", "Pontons de la station", 0, 5_350, ["sw-boardwalk-01", "sw-stilt-01", "sw-arena-deck"], ["none"], ["tracking", "ambush"], 2),
    route("canopy", "Couronnes de palétuviers", 1_660, 5_210, ["sw-vine-01", "sw-root-01", "sw-tree-01", "sw-crown-02", "sw-crown-03", "sw-tree-arena", "sw-arena-crown"], ["climb"], ["stealth", "high-ground", "ambush"], 1),
    route("flooded-cut", "Chenaux de marée", 2_050, 4_140, ["sw-mangrove-01", "sw-surge-channel", "sw-mangrove-02", "sw-mud-mangrove"], ["mask", "timed-hazard"], ["speed", "tracking"], 3),
  ],
  trapSockets: [
    trap("sw-trap-reeds", 1_800, 610, "ground", 1, 0.84),
    trap("sw-trap-stilt", 3_200, 526, "ground", -1, 0.7),
    trap("sw-trap-crown", 3_650, 346, "canopy", 1, 0.72),
    trap("sw-trap-arena", 4_560, 610, "ground", -1, 0.66),
  ],
});

// ---------------------------------------------------------------------------
// Mycora-V — tours de fructification (routes: ground, canopy, flooded-cut)
// ---------------------------------------------------------------------------
export const FUNGAL_LAYOUT_V157 = layout("fungal-hivemind", "fungal", 0xf09a17, { x: 4_060, y: 240, width: 1_100, height: 384 }, {
  platforms: [
    platform("fg-cap-01", 1_260, 530, 220, "mycelium", "ground", 24),
    platform("fg-cap-02", 1_420, 420, 200, "mycelium", "canopy", 22),
    platform("fg-cap-03", 1_560, 320, 190, "mycelium", "canopy", 22),
    platform("fg-relay-01", 1_960, 540, 300, "metal", "ground", 26),
    platform("fg-cap-04", 2_330, 450, 220, "mycelium", "canopy", 22),
    platform("fg-cap-05", 2_480, 350, 200, "mycelium", "canopy", 22),
    platform("fg-cap-06", 2_620, 250, 200, "mycelium", "canopy", 22),
    platform("fg-root-shelf", 3_080, 556, 360, "stone", "flooded-cut", 26),
    platform("fg-cap-07", 3_520, 470, 220, "mycelium", "canopy", 22),
    platform("fg-cap-08", 3_700, 370, 200, "mycelium", "canopy", 22),
    platform("fg-arena-ring", 4_120, 520, 340, "mycelium", "ground", 26),
    platform("fg-arena-cap", 4_560, 420, 240, "mycelium", "canopy", 24),
    platform("fg-arena-crown", 4_880, 320, 240, "mycelium", "canopy", 24),
  ],
  climbables: [
    climb("fg-stalk-01", 1_760, 300, 60, "vine", "canopy", [{ x: 1_740, y: 320 }, { x: 1_840, y: FLOOR }]),
    climb("fg-stalk-02", 2_830, 230, 110, "tree", "canopy", [{ x: 2_800, y: 250 }, { x: 2_960, y: FLOOR }]),
    climb("fg-filament-04", 3_460, 400, 56, "vine", "flooded-cut", [{ x: 3_440, y: 556 }, { x: 3_540, y: 470 }]),
    climb("fg-stalk-arena", 4_810, 300, 60, "vine", "canopy", [{ x: 4_790, y: 420 }, { x: 4_900, y: 320 }]),
  ],
  hazards: [
    hazard("fg-spores-tower", "spore-cloud", 2_350, 300, 300, "canopy"),
    hazard("fg-snare-relay", "mycelial-snare", 1_980, 580, 260, "ground"),
    hazard("fg-acid-pool", "acid-bloom", 3_100, 572, 320, "flooded-cut"),
    hazard("fg-spores-gill", "spore-cloud", 3_560, 280, 280, "canopy"),
  ],
  covers: [
    cover("fg-cover-gill", 1_840, 110, 84, "ground"),
    cover("fg-cover-husk", 2_970, 96, 76, "ground", "right", 0.76),
    cover("fg-cover-arena-01", 4_480, 110, 92, "ground", "either", 0.82),
    cover("fg-cover-arena-02", 5_020, 100, 76, "ground", "left", 0.76),
  ],
  surfaces: [
    surface("fg-mycelium-west", 0, 1_980, "mycelium"),
    surface("fg-mud-relay", 1_980, 260, "mud"),
    surface("fg-mycelium-towers", 2_240, 860, "mycelium"),
    surface("fg-water-pool", 3_100, 320, "water"),
    surface("fg-mycelium-east", 3_420, 2_180, "mycelium"),
  ],
  routes: [
    route("ground", "Tapis mycélien", 0, 5_350, ["fg-cap-01", "fg-relay-01", "fg-arena-ring"], ["none"], ["tracking", "ambush"], 2),
    route("canopy", "Tours de fructification", 1_420, 5_120, ["fg-cap-03", "fg-stalk-01", "fg-cap-06", "fg-stalk-02", "fg-cap-08", "fg-stalk-arena", "fg-arena-crown"], ["climb"], ["stealth", "high-ground", "ambush"], 1),
    route("flooded-cut", "Racines-mémoires", 3_080, 3_920, ["fg-root-shelf", "fg-acid-pool", "fg-filament-04", "fg-cap-07"], ["mask", "timed-hazard"], ["speed", "tracking"], 3),
  ],
  trapSockets: [
    trap("fg-trap-gill", 1_850, 610, "ground", 1, 0.82),
    trap("fg-trap-tower", 2_700, 236, "canopy", -1, 0.74),
    trap("fg-trap-shelf", 3_200, 542, "flooded-cut", 1, 0.7),
    trap("fg-trap-arena", 4_300, 506, "ground", -1, 0.66),
  ],
});

// ---------------------------------------------------------------------------
// Serekh-9 — mesas et mer de silice (routes: sanctum-floor, vent-flank, ruin-highline)
// ---------------------------------------------------------------------------
export const DESERT_LAYOUT_V157 = layout("desert-sandmaw", "desert", 0xde5e47, { x: 4_060, y: 280, width: 1_140, height: 344 }, {
  platforms: [
    platform("ds-table-01", 1_240, 500, 520, "stone", "sanctum-floor", 28),
    platform("ds-mesa-01", 1_560, 380, 260, "stone", "ruin-highline", 28),
    platform("ds-mesa-top", 1_920, 290, 220, "stone", "ruin-highline", 26),
    platform("ds-arch-01", 2_380, 440, 300, "ruin", "ruin-highline", 26),
    platform("ds-ledge-01", 2_950, 520, 340, "stone", "vent-flank", 26),
    platform("ds-ledge-02", 3_330, 420, 300, "stone", "vent-flank", 26),
    platform("ds-ruin-gate", 3_720, 500, 300, "ruin", "sanctum-floor", 26),
    platform("ds-arena-table", 4_120, 494, 460, "stone", "sanctum-floor", 28),
    platform("ds-arena-spire", 4_700, 380, 220, "ruin", "ruin-highline", 26),
    platform("ds-arena-shelf", 4_980, 500, 260, "stone", "sanctum-floor", 26),
  ],
  climbables: [
    climb("ds-face-mesa", 1_830, 280, 90, "rock-face", "ruin-highline", [{ x: 1_800, y: 380 }, { x: 1_940, y: 290 }]),
    climb("ds-rope-arch", 2_310, 420, 54, "rope", "ruin-highline", [{ x: 2_290, y: FLOOR }, { x: 2_400, y: 440 }]),
    climb("ds-rope-flank", 3_270, 400, 54, "rope", "vent-flank", [{ x: 3_250, y: 520 }, { x: 3_350, y: 420 }]),
    climb("ds-face-arena", 4_600, 360, 90, "rock-face", "ruin-highline", [{ x: 4_570, y: 494 }, { x: 4_720, y: 380 }]),
  ],
  hazards: [
    hazard("ds-collapse-dunes", "sand-collapse", 2_120, 590, 620, "sanctum-floor"),
    hazard("ds-heat-flank", "heat-burst", 2_980, 330, 300, "vent-flank"),
    hazard("ds-storm-gate", "glass-storm", 3_700, 200, 360, "sanctum-floor"),
    hazard("ds-collapse-spire", "sand-collapse", 4_700, 590, 240, "sanctum-floor"),
  ],
  covers: [
    cover("ds-cover-rock", 2_000, 102, 104, "sanctum-floor"),
    cover("ds-cover-ruin", 2_830, 100, 122, "sanctum-floor", "either", 0.88),
    cover("ds-cover-arena-01", 4_300, 110, 84, "sanctum-floor", "right", 0.84),
    cover("ds-cover-arena-02", 4_960, 104, 88, "sanctum-floor", "left", 0.84),
  ],
  surfaces: [
    surface("ds-sand-west", 0, 2_950, "sand"),
    surface("ds-stone-flank", 2_950, 380, "stone"),
    surface("ds-sand-east", 3_330, 2_270, "sand"),
  ],
  routes: [
    route("sanctum-floor", "Mer de silice", 0, 5_350, ["ds-table-01", "ds-cover-ruin", "ds-ruin-gate", "ds-arena-table"], ["timed-hazard"], ["tracking", "ambush"], 2),
    route("vent-flank", "Couloirs du vent", 2_950, 3_630, ["ds-ledge-01", "ds-heat-flank", "ds-rope-flank", "ds-ledge-02"], ["climb", "timed-hazard"], ["speed", "stealth"], 3),
    route("ruin-highline", "Crêtes du canyon", 1_560, 4_920, ["ds-mesa-01", "ds-face-mesa", "ds-mesa-top", "ds-rope-arch", "ds-arch-01", "ds-face-arena", "ds-arena-spire"], ["climb"], ["high-ground", "ambush", "stealth"], 2),
  ],
  trapSockets: [
    trap("ds-trap-table", 1_400, 486, "sanctum-floor", 1, 0.58),
    trap("ds-trap-dune", 2_790, 610, "sanctum-floor", -1, 0.46),
    trap("ds-trap-arch", 2_500, 426, "ruin-highline", 1, 0.62),
    trap("ds-trap-arena", 4_400, 480, "sanctum-floor", -1, 0.4),
  ],
});

// ---------------------------------------------------------------------------
// Acheron-Sigma — cité d'obsidienne (routes: sanctum-floor, vent-flank, ruin-highline)
// ---------------------------------------------------------------------------
export const RUINS_LAYOUT_V157 = layout("ruins-ancient-guardian", "ruins", 0xac4e09, { x: 4_060, y: 260, width: 1_140, height: 364 }, {
  platforms: [
    platform("rn-step-01", 1_240, 540, 200, "ruin", "sanctum-floor", 28),
    platform("rn-step-02", 1_440, 450, 200, "ruin", "ruin-highline", 28),
    platform("rn-step-03", 1_640, 360, 200, "ruin", "ruin-highline", 28),
    platform("rn-bridge-01", 1_900, 360, 520, "obsidian", "ruin-highline", 24),
    platform("rn-step-04", 2_480, 450, 200, "ruin", "sanctum-floor", 28),
    platform("rn-step-05", 2_680, 540, 200, "ruin", "sanctum-floor", 28),
    platform("rn-hall-01", 3_000, 520, 380, "obsidian", "vent-flank", 26),
    platform("rn-gallery-01", 3_440, 420, 320, "ruin", "vent-flank", 26),
    platform("rn-bridge-02", 3_820, 330, 300, "obsidian", "ruin-highline", 24),
    platform("rn-arena-dais", 4_120, 530, 300, "ruin", "sanctum-floor", 28),
    platform("rn-arena-tier", 4_480, 440, 300, "ruin", "sanctum-floor", 28),
    platform("rn-arena-bridge", 4_840, 350, 300, "obsidian", "ruin-highline", 24),
  ],
  climbables: [
    climb("rn-chain-bridge", 2_420, 300, 58, "chain", "ruin-highline", [{ x: 2_410, y: 360 }, { x: 2_500, y: 450 }]),
    climb("rn-ladder-gallery", 3_770, 310, 64, "ladder", "ruin-highline", [{ x: 3_740, y: 420 }, { x: 3_850, y: 330 }]),
    climb("rn-chain-arena", 5_150, 250, 58, "chain", "ruin-highline", [{ x: 5_130, y: 350 }, { x: 5_230, y: FLOOR }]),
  ],
  hazards: [
    hazard("rn-gravity-bridge", "gravity-pulse", 2_000, 390, 300, "ruin-highline"),
    hazard("rn-nanite-hall", "nanite-field", 3_020, 300, 340, "vent-flank"),
    hazard("rn-laser-corridor", "laser-grid", 3_800, 430, 340, "sanctum-floor"),
  ],
  covers: [
    cover("rn-cover-stele", 2_320, 96, 124, "sanctum-floor", "either", 0.86),
    cover("rn-cover-pillar", 3_390, 90, 146, "vent-flank", "either", 0.9),
    cover("rn-cover-arena-01", 4_430, 100, 122, "sanctum-floor", "right", 0.86),
    cover("rn-cover-arena-02", 4_790, 100, 130, "sanctum-floor", "left", 0.86),
  ],
  surfaces: [
    surface("rn-obsidian-west", 0, 1_240, "obsidian"),
    surface("rn-ruin-terraces", 1_240, 1_760, "ruin"),
    surface("rn-obsidian-halls", 3_000, 1_100, "obsidian"),
    surface("rn-ruin-arena", 4_100, 1_500, "ruin"),
  ],
  routes: [
    route("sanctum-floor", "Galeries de la cité", 0, 5_350, ["rn-step-01", "rn-step-05", "rn-arena-dais", "rn-arena-tier"], ["timed-hazard"], ["tracking", "ambush"], 2),
    route("vent-flank", "Failles gravitationnelles", 3_000, 3_760, ["rn-hall-01", "rn-nanite-hall", "rn-cover-pillar", "rn-gallery-01"], ["climb", "timed-hazard"], ["speed", "stealth"], 3),
    route("ruin-highline", "Ponts d'obsidienne", 1_440, 5_140, ["rn-step-03", "rn-bridge-01", "rn-chain-bridge", "rn-ladder-gallery", "rn-bridge-02", "rn-arena-bridge"], ["climb"], ["high-ground", "ambush", "stealth"], 2),
  ],
  trapSockets: [
    trap("rn-trap-steps", 1_500, 436, "ruin-highline", 1, 0.6),
    trap("rn-trap-court", 2_760, 526, "sanctum-floor", -1, 0.5),
    trap("rn-trap-gallery", 3_600, 406, "vent-flank", 1, 0.62),
    trap("rn-trap-arena", 4_250, 516, "sanctum-floor", -1, 0.36),
  ],
});

// ---------------------------------------------------------------------------
// Pelagos-M — récifs et station (routes: ice-surface, glacial-caves, mining-gantry)
// ---------------------------------------------------------------------------
export const OCEAN_LAYOUT_V157 = layout("ocean-leviathan", "ocean", 0x0cea71, { x: 4_060, y: 300, width: 1_140, height: 324 }, {
  platforms: [
    platform("oc-reef-01", 1_240, 530, 340, "coral", "ice-surface", 26),
    platform("oc-reef-02", 1_700, 500, 300, "coral", "ice-surface", 26),
    platform("oc-gantry-01", 1_980, 400, 420, "metal", "mining-gantry", 24),
    platform("oc-arch-01", 2_520, 440, 280, "coral", "glacial-caves", 26),
    platform("oc-reef-03", 2_820, 540, 300, "coral", "ice-surface", 26),
    platform("oc-gantry-02", 3_220, 380, 400, "metal", "mining-gantry", 24),
    platform("oc-reef-04", 3_700, 520, 300, "coral", "ice-surface", 26),
    platform("oc-wreck-01", 4_120, 500, 360, "stone", "glacial-caves", 28),
    platform("oc-arena-mast", 4_560, 400, 260, "metal", "mining-gantry", 24),
    platform("oc-arena-reef", 4_900, 520, 300, "coral", "ice-surface", 26),
    platform("oc-arena-crow", 4_940, 330, 220, "metal", "mining-gantry", 24),
  ],
  climbables: [
    climb("oc-face-reef", 1_620, 420, 80, "rock-face", "ice-surface", [{ x: 1_600, y: FLOOR }, { x: 1_720, y: 500 }]),
    climb("oc-rope-gantry", 2_420, 300, 54, "rope", "mining-gantry", [{ x: 2_400, y: 400 }, { x: 2_500, y: 440 }]),
    climb("oc-ladder-station", 3_160, 360, 62, "ladder", "mining-gantry", [{ x: 3_140, y: FLOOR }, { x: 3_240, y: 380 }]),
    climb("oc-rope-arena", 4_860, 310, 54, "rope", "mining-gantry", [{ x: 4_830, y: 400 }, { x: 4_960, y: 330 }]),
  ],
  hazards: [
    hazard("oc-wave-channel", "rogue-wave", 2_420, 560, 400, "glacial-caves"),
    hazard("oc-surge-station", "electrical-surge", 3_240, 300, 360, "mining-gantry"),
    hazard("oc-vent-reef", "abyssal-vent", 3_620, 330, 280, "ice-surface"),
    hazard("oc-wave-inlet", "rogue-wave", 1_580, 560, 120, "ice-surface"),
  ],
  covers: [
    cover("oc-cover-coral", 2_000, 100, 84, "ice-surface"),
    cover("oc-cover-crate", 3_060, 90, 76, "mining-gantry", "right", 0.72),
    cover("oc-cover-arena-01", 4_260, 118, 90, "glacial-caves", "either", 0.86),
    cover("oc-cover-arena-02", 4_790, 92, 124, "ice-surface", "left", 0.9),
  ],
  surfaces: [
    surface("oc-coral-west", 0, 1_580, "coral"),
    surface("oc-water-inlet", 1_580, 120, "water"),
    surface("oc-coral-reef", 1_700, 720, "coral"),
    surface("oc-water-channel", 2_420, 400, "water"),
    surface("oc-coral-station", 2_820, 1_180, "coral"),
    surface("oc-water-arena", 4_000, 120, "water"),
    surface("oc-coral-arena", 4_120, 1_480, "coral"),
  ],
  routes: [
    route("ice-surface", "Récif battu", 0, 5_350, ["oc-reef-01", "oc-reef-02", "oc-reef-03", "oc-reef-04", "oc-arena-reef"], ["timed-hazard"], ["speed", "tracking"], 3),
    route("glacial-caves", "Arches submergées", 2_420, 4_480, ["oc-arch-01", "oc-wave-channel", "oc-wreck-01"], ["climb", "mask"], ["stealth", "ambush"], 2),
    route("mining-gantry", "Passerelles de la station", 1_980, 5_160, ["oc-gantry-01", "oc-rope-gantry", "oc-ladder-station", "oc-gantry-02", "oc-arena-mast", "oc-rope-arena", "oc-arena-crow"], ["climb"], ["high-ground", "speed"], 2),
  ],
  trapSockets: [
    trap("oc-trap-reef", 1_820, 486, "ice-surface", 1, 0.6),
    trap("oc-trap-arch", 2_600, 426, "glacial-caves", -1, 0.56),
    trap("oc-trap-station", 3_605, 366, "mining-gantry", 1, 0.5),
    trap("oc-trap-arena", 4_300, 486, "glacial-caves", -1, 0.44),
  ],
});
