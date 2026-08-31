import type { ExplorationAbilityId, ExplorationProgress } from "../types";

const ABILITY_IDS = ["aerial-boost"] as const satisfies readonly ExplorationAbilityId[];
const JUNGLE_GATE_IDS = ["jungle-resonance-seal", "jungle-canopy-hatch"] as const;
const ICE_GATE_IDS = ["ice-mine-relay", "ice-return-hatch"] as const;
const JUNGLE_SECRET_IDS = ["jungle-clan-cache"] as const;
const ICE_SECRET_IDS = ["ice-clan-cache"] as const;
const JUNGLE_ROOM_IDS = [
  "jungle-pilot-approach",
  "jungle-pilot-underpass",
  "jungle-pilot-module",
  "jungle-pilot-gallery",
  "jungle-pilot-archive",
  "jungle-pilot-descent",
] as const;
const ICE_ROOM_IDS = [
  "ice-region-approach",
  "ice-region-shaft",
  "ice-region-relay",
  "ice-region-vault",
  "ice-region-return",
] as const;
const GATE_IDS = [...JUNGLE_GATE_IDS, ...ICE_GATE_IDS];
const SECRET_IDS = [...JUNGLE_SECRET_IDS, ...ICE_SECRET_IDS];
const ROOM_IDS = [...JUNGLE_ROOM_IDS, ...ICE_ROOM_IDS];

export function isExplorationMission(id: unknown): id is "jungle-vey" | "ice-cryostalker" {
  return id === "jungle-vey" || id === "ice-cryostalker";
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

/** A runtime can report only discoveries authored in its current mission. */
export function explorationForMission(missionId: unknown, value: unknown): ExplorationProgress {
  if (!isExplorationMission(missionId)) return defaultExplorationProgress();
  const progress = normalizeExplorationProgress(value);
  const jungle = missionId === "jungle-vey";
  return {
    // The ice branch consumes the jungle traversal ability; it never awards it.
    abilityIds: jungle ? progress.abilityIds : [],
    openedGateIds: knownIds(progress.openedGateIds, jungle ? JUNGLE_GATE_IDS : ICE_GATE_IDS),
    secretIds: knownIds(progress.secretIds, jungle ? JUNGLE_SECRET_IDS : ICE_SECRET_IDS),
    discoveredRoomIds: knownIds(progress.discoveredRoomIds, jungle ? JUNGLE_ROOM_IDS : ICE_ROOM_IDS),
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
  const cacheCount = Number(normalized.secretIds.includes("jungle-clan-cache")) +
    Number(normalized.secretIds.includes("ice-clan-cache"));
  return { maxEnergy: cacheCount * 15 };
}
