import type { ExplorationAbilityId, ExplorationProgress } from "../types";

const ABILITY_IDS = ["aerial-boost"] as const satisfies readonly ExplorationAbilityId[];
const GATE_IDS = ["jungle-resonance-seal", "jungle-canopy-hatch"] as const;
const SECRET_IDS = ["jungle-clan-cache"] as const;
const ROOM_IDS = [
  "jungle-pilot-approach",
  "jungle-pilot-underpass",
  "jungle-pilot-module",
  "jungle-pilot-gallery",
  "jungle-pilot-archive",
  "jungle-pilot-descent",
] as const;

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
  return { maxEnergy: normalized.secretIds.includes("jungle-clan-cache") ? 15 : 0 };
}
