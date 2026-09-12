import type { ExplorationAbilityId, ExplorationProgress, MissionId } from "../types";

const ABILITY_IDS = [
  "aerial-boost",
  "thermal-resistance",
  "acid-protection",
  "cutting-blade",
  "aquatic-respirator",
  "spore-vision",
  "ancient-tech-detection",
] as const satisfies readonly ExplorationAbilityId[];

const JUNGLE_GATE_IDS = ["jungle-resonance-seal", "jungle-canopy-hatch"] as const;
const ICE_GATE_IDS = ["ice-mine-relay", "ice-return-hatch"] as const;
const VOLCANO_GATE_IDS = ["volcano-heat-seal", "volcano-acid-return"] as const;
const SWAMP_GATE_IDS = ["swamp-acid-sluice", "swamp-cut-root"] as const;
const DESERT_GATE_IDS = ["desert-tether-gate", "desert-flooded-well"] as const;
const OCEAN_GATE_IDS = ["ocean-pressure-lock", "ocean-spore-vent"] as const;
const FUNGAL_GATE_IDS = ["fungal-memory-membrane", "fungal-ancient-lattice"] as const;
const RUINS_GATE_IDS = ["ruins-phase-grid", "ruins-gravity-chain"] as const;

const JUNGLE_SECRET_IDS = ["jungle-clan-cache"] as const;
const ICE_SECRET_IDS = ["ice-clan-cache"] as const;
const VOLCANO_SECRET_IDS = ["volcano-blooded-skull"] as const;
const SWAMP_SECRET_IDS = ["swamp-hydra-fang"] as const;
const DESERT_SECRET_IDS = ["desert-glass-disc"] as const;
const OCEAN_SECRET_IDS = ["ocean-leviathan-pearl"] as const;
const FUNGAL_SECRET_IDS = ["fungal-elder-spore"] as const;
const RUINS_SECRET_IDS = ["ruins-guardian-shard"] as const;

const JUNGLE_ROOM_IDS = [
  "jungle-pilot-approach",
  "jungle-pilot-underpass",
  "jungle-pilot-module",
  "jungle-pilot-gallery",
  "jungle-pilot-archive",
  "jungle-pilot-descent",
  "jungle-pilot-canopy-west",
  "jungle-pilot-canopy-heart",
  "jungle-pilot-ravine",
  "jungle-pilot-river-caves",
  "jungle-pilot-vey-camp",
  "jungle-pilot-duel-extraction",
] as const;
const ICE_ROOM_IDS = [
  "ice-region-approach",
  "ice-region-shaft",
  "ice-region-relay",
  "ice-region-vault",
  "ice-region-return",
] as const;
const VOLCANO_ROOM_IDS = [
  "volcano-forge-approach",
  "volcano-forge-ascent",
  "volcano-forge-vault",
  "volcano-forge-return",
] as const;
const SWAMP_ROOM_IDS = [
  "swamp-brood-approach",
  "swamp-brood-ascent",
  "swamp-brood-vault",
  "swamp-brood-return",
] as const;
const DESERT_ROOM_IDS = [
  "desert-crypt-approach",
  "desert-crypt-ascent",
  "desert-crypt-vault",
  "desert-crypt-return",
] as const;
const OCEAN_ROOM_IDS = [
  "ocean-pressure-approach",
  "ocean-pressure-ascent",
  "ocean-pressure-vault",
  "ocean-pressure-return",
] as const;
const FUNGAL_ROOM_IDS = [
  "fungal-memory-approach",
  "fungal-memory-ascent",
  "fungal-memory-vault",
  "fungal-memory-return",
] as const;
const RUINS_ROOM_IDS = [
  "ruins-oracle-approach",
  "ruins-oracle-ascent",
  "ruins-oracle-vault",
  "ruins-oracle-return",
] as const;

const GATE_IDS = [
  ...JUNGLE_GATE_IDS,
  ...ICE_GATE_IDS,
  ...VOLCANO_GATE_IDS,
  ...SWAMP_GATE_IDS,
  ...DESERT_GATE_IDS,
  ...OCEAN_GATE_IDS,
  ...FUNGAL_GATE_IDS,
  ...RUINS_GATE_IDS,
] as const;
const SECRET_IDS = [
  ...JUNGLE_SECRET_IDS,
  ...ICE_SECRET_IDS,
  ...VOLCANO_SECRET_IDS,
  ...SWAMP_SECRET_IDS,
  ...DESERT_SECRET_IDS,
  ...OCEAN_SECRET_IDS,
  ...FUNGAL_SECRET_IDS,
  ...RUINS_SECRET_IDS,
] as const;
const ROOM_IDS = [
  ...JUNGLE_ROOM_IDS,
  ...ICE_ROOM_IDS,
  ...VOLCANO_ROOM_IDS,
  ...SWAMP_ROOM_IDS,
  ...DESERT_ROOM_IDS,
  ...OCEAN_ROOM_IDS,
  ...FUNGAL_ROOM_IDS,
  ...RUINS_ROOM_IDS,
] as const;

const MISSION_EXPLORATION_IDS: Readonly<Record<MissionId, {
  abilityIds: readonly ExplorationAbilityId[];
  gateIds: readonly string[];
  secretIds: readonly string[];
  roomIds: readonly string[];
}>> = {
  "jungle-vey": { abilityIds: ["aerial-boost"], gateIds: JUNGLE_GATE_IDS, secretIds: JUNGLE_SECRET_IDS, roomIds: JUNGLE_ROOM_IDS },
  "ice-cryostalker": { abilityIds: [], gateIds: ICE_GATE_IDS, secretIds: ICE_SECRET_IDS, roomIds: ICE_ROOM_IDS },
  "volcano-bad-blood": { abilityIds: ["thermal-resistance"], gateIds: VOLCANO_GATE_IDS, secretIds: VOLCANO_SECRET_IDS, roomIds: VOLCANO_ROOM_IDS },
  "swamp-hydra": { abilityIds: ["acid-protection"], gateIds: SWAMP_GATE_IDS, secretIds: SWAMP_SECRET_IDS, roomIds: SWAMP_ROOM_IDS },
  "desert-sandmaw": { abilityIds: ["cutting-blade"], gateIds: DESERT_GATE_IDS, secretIds: DESERT_SECRET_IDS, roomIds: DESERT_ROOM_IDS },
  "ocean-leviathan": { abilityIds: ["aquatic-respirator"], gateIds: OCEAN_GATE_IDS, secretIds: OCEAN_SECRET_IDS, roomIds: OCEAN_ROOM_IDS },
  "fungal-hivemind": { abilityIds: ["spore-vision"], gateIds: FUNGAL_GATE_IDS, secretIds: FUNGAL_SECRET_IDS, roomIds: FUNGAL_ROOM_IDS },
  "ruins-ancient-guardian": { abilityIds: ["ancient-tech-detection"], gateIds: RUINS_GATE_IDS, secretIds: RUINS_SECRET_IDS, roomIds: RUINS_ROOM_IDS },
};

export function isExplorationMission(id: unknown): id is MissionId {
  return typeof id === "string" && Object.hasOwn(MISSION_EXPLORATION_IDS, id);
}

/** Each caller owns its arrays: a runtime cannot mutate another save's defaults. */
export function defaultExplorationProgress(): ExplorationProgress {
  return { abilityIds: [], openedGateIds: [], secretIds: [], discoveredRoomIds: [] };
}

function knownIds<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(value)) return [];
  const reported = new Set(value.filter((id): id is string => typeof id === "string"));
  // Authored ordering keeps merges deterministic, regardless of the route taken.
  return allowed.filter((id) => reported.has(id));
}

/** Persist only authored unlocks; runtime positions and arbitrary keys are ignored. */
export function normalizeExplorationProgress(value: unknown): ExplorationProgress {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return defaultExplorationProgress();
  }
  const source = value as Record<string, unknown>;
  return {
    abilityIds: knownIds(source.abilityIds, ABILITY_IDS),
    openedGateIds: knownIds(source.openedGateIds, GATE_IDS),
    secretIds: knownIds(source.secretIds, SECRET_IDS),
    discoveredRoomIds: knownIds(source.discoveredRoomIds, ROOM_IDS),
  };
}

/** A runtime can report only acquisitions authored in its current mission. */
export function explorationForMission(missionId: unknown, value: unknown): ExplorationProgress {
  if (!isExplorationMission(missionId)) return defaultExplorationProgress();
  const progress = normalizeExplorationProgress(value);
  const authored = MISSION_EXPLORATION_IDS[missionId];
  return {
    // Earlier abilities are merged from the campaign by the caller and cannot
    // be forged by a checkpoint from another mission.
    abilityIds: knownIds(progress.abilityIds, authored.abilityIds),
    openedGateIds: knownIds(progress.openedGateIds, authored.gateIds),
    secretIds: knownIds(progress.secretIds, authored.secretIds),
    discoveredRoomIds: knownIds(progress.discoveredRoomIds, authored.roomIds),
  };
}

/** Union is idempotent: retrying, revisiting or importing a room cannot pay twice. */
export function mergeExplorationProgress(...values: unknown[]): ExplorationProgress {
  const combined = defaultExplorationProgress();
  for (const value of values) {
    const progress = normalizeExplorationProgress(value);
    combined.abilityIds.push(...progress.abilityIds);
    combined.openedGateIds.push(...progress.openedGateIds);
    combined.secretIds.push(...progress.secretIds);
    combined.discoveredRoomIds.push(...progress.discoveredRoomIds);
  }
  return normalizeExplorationProgress(combined);
}

/** Flat equipment bonus, not an absolute capacity or a spendable currency reward. */
export function explorationBonuses(progress: unknown): { maxEnergy: number } {
  const normalized = normalizeExplorationProgress(progress);
  const majorCaches =
    Number(normalized.secretIds.includes("jungle-clan-cache"))
    + Number(normalized.secretIds.includes("ice-clan-cache"));
  const regionalTrophies = normalized.secretIds.filter(
    (id) => id !== "jungle-clan-cache" && id !== "ice-clan-cache",
  ).length;
  // Six minor trophies add utility without doubling the base combat pool.
  return { maxEnergy: majorCaches * 15 + regionalTrophies * 5 };
}
