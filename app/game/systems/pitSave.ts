import { archiveTransferPending } from "./archiveTransferGuard";
import { isPitExtensionArenaId, type PitRuntimeArenaId } from "./pitArenaExtensions";

/**
 * Persistent sidecar for THE PIT.
 *
 * This file deliberately has no campaign progression dependency. A match can
 * update PIT statistics, but it can never award honor, clan marks, inventory,
 * trophies, codex entries, or mission progress.
 */

import {
  PIT_FIRST_EDITION_ARENA_IDS,
  PIT_FIRST_EDITION_FIGHTER_IDS,
  type PitFirstEditionArenaId,
  type PitFirstEditionFighterId,
} from "./pitFirstEdition";
import {
  PIT_ARCADE_ENCOUNTER_COUNT,
  PIT_ARCADE_LADDERS,
  PIT_DESCENT_FLOOR_COUNT,
  PIT_DESCENT_MAX_HEALTH,
  PIT_DESCENT_MAX_RECOVERIES,
  createPitDescentPlan,
  normalizePitDescentRun,
  type PitDescentResolutionRecord,
  type PitDescentRun,
} from "./pitArcade";
import {
  PIT_CIRCUIT_COSMETIC_REWARDS,
  PIT_CIRCUIT_FIGHT_COUNT,
  PIT_CLAN_CIRCUITS,
  applyPitCircuitFightResult,
  normalizePitCircuitRun,
  selectPitCircuitFight,
  type PitCircuitRun,
} from "./pitCircuit";

export const PIT_SAVE_VERSION = 5 as const;
export const PIT_SAVE_RUNTIME_REVISION = 5 as const;
export const PIT_SAVE_STORAGE_KEY = "yautja-long-hunt.the-pit";
export const PIT_SAVE_MAX_SERIALIZED_BYTES = 64 * 1024;
export const PIT_SAVE_MAX_APPLIED_RESULT_IDS = 1_024;

/** Keep each campaign profile in its own sidecar namespace. */
export function pitSaveStorageKey(ownerSaveCreatedAt: string): string {
  if (!validIsoDate(ownerSaveCreatedAt)) {
    throw new Error("THE PIT storage key requires a valid campaign owner.");
  }
  return `${PIT_SAVE_STORAGE_KEY}.${encodeURIComponent(ownerSaveCreatedAt)}`;
}

const MAX_IDENTIFIER_LENGTH = 96;
const MAX_COUNTER = 1_000_000_000;

export type PitSaveMode = "cpu" | "local" | "training" | "arcade" | "circuit" | "descent";
export type PitMatchMode = Exclude<PitSaveMode, "descent">;
export type PitSaveOutcome = "victory" | "defeat" | "draw";
export type PitSavedFighterId = PitFirstEditionFighterId;
export type PitSavedArenaId = PitRuntimeArenaId;
export type PitTrainingGuard = "none" | "high" | "low" | "alternating";

export interface PitModeStats {
  matches: number;
  victories: number;
  defeats: number;
  draws: number;
  roundsPlayed: number;
  roundsWon: number;
  roundsLost: number;
  roundsDrawn: number;
}

export interface PitTrainingPreferences {
  opponentId: PitSavedFighterId;
  guard: PitTrainingGuard;
  showFrameData: boolean;
  showHitboxes: boolean;
}

export interface PitArcadeFighterProgress {
  /** Number of encounters cleared on the best run, from zero through eight. */
  bestEncounter: number;
  completions: number;
  /** Zero-based encounter expected for the current run; zero also starts a new run. */
  nextEncounter: number;
}

export interface PitCircuitFighterProgress {
  /** Number of Circuit fights cleared on the best run, from zero through twelve. */
  bestFight: number;
  completions: number;
  /** Zero-based fight expected for the current run; zero also starts a new run. */
  nextFight: number;
}

export interface PitDescentFighterProgress {
  /** Deepest resolved floor reached by this fighter, from zero through eight. */
  bestFloor: number;
  completions: number;
}

export interface PitSaveV5 {
  version: typeof PIT_SAVE_VERSION;
  runtimeRevision: typeof PIT_SAVE_RUNTIME_REVISION;
  /** Identity of the campaign profile that owns this independent sidecar. */
  ownerSaveCreatedAt: string;
  /** Monotone mutation counter, including preference-only changes. */
  revision: number;
  /** Monotone count of unique match results applied to the sidecar. */
  sequence: number;
  createdAt: string;
  updatedAt: string;
  stats: Record<PitSaveMode, PitModeStats>;
  lastFighterId: PitSavedFighterId;
  lastArenaId: PitSavedArenaId;
  arcadeProgress: Record<PitSavedFighterId, PitArcadeFighterProgress>;
  circuitProgress: Record<PitSavedFighterId, PitCircuitFighterProgress>;
  /** Optional canonical run snapshots. V4 summaries remain authoritative history. */
  circuitRuns: Record<PitSavedFighterId, PitCircuitRun | null>;
  descentProgress: Record<PitSavedFighterId, PitDescentFighterProgress>;
  descentRuns: Record<PitSavedFighterId, PitDescentRun | null>;
  unlockedCosmeticIds: string[];
  trainingPreferences: PitTrainingPreferences;
  appliedResultIds: string[];
}

/** Compatibility names retained for callers compiled against earlier sidecar APIs. */
export type PitSaveV4 = PitSaveV5;
export type PitSaveV3 = PitSaveV5;
export type PitSaveV2 = PitSaveV5;
export type PitSaveV1 = PitSaveV5;

export interface PitMatchResult {
  id: string;
  mode: PitMatchMode;
  outcome: PitSaveOutcome;
  fighterId: PitSavedFighterId;
  arenaId?: PitSavedArenaId;
  roundsWon: number;
  roundsLost: number;
  roundsDrawn?: number;
  /** Zero-based Arcade encounter played by this result. */
  arcadeEncounterIndex?: number;
  arcadeCompleted?: boolean;
  /** Zero-based Clan Circuit fight played by this result. */
  circuitFightIndex?: number;
  circuitCompleted?: boolean;
  cosmeticRewardIds?: readonly string[];
  completedAt: string;
}

export interface PitSaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface PitSaveStorageOptions {
  storage?: PitSaveStorage | null;
  key?: string;
  expectedOwnerSaveCreatedAt?: string;
}

export type PitSaveLoadFailure =
  | "storage-unavailable"
  | "read-failed"
  | "corrupt-save"
  | "future-version"
  | "owner-conflict";

export interface PitSaveLoadResult {
  save: PitSaveV5 | null;
  loaded: boolean;
  failure: PitSaveLoadFailure | null;
}

export type PitSaveWriteFailure =
  | "storage-unavailable"
  | "read-failed"
  | "invalid-save"
  | "corrupt-save"
  | "future-version"
  | "owner-conflict"
  | "stale-sequence"
  | "stale-revision"
  | "quota-exceeded"
  | "write-denied";

export interface PitSaveWriteResult {
  save: PitSaveV5 | null;
  persisted: boolean;
  failure: PitSaveWriteFailure | null;
}

export type PitSaveClearFailure =
  | "storage-unavailable"
  | "read-failed"
  | "owner-conflict"
  | "write-denied";

export interface PitSaveClearResult {
  cleared: boolean;
  failure: PitSaveClearFailure | null;
}

export interface PitResultApplication {
  save: PitSaveV5;
  applied: boolean;
}

export interface PitRunSaveApplication {
  save: PitSaveV5;
  applied: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function validIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    !Number.isNaN(Date.parse(value))
  );
}

function validIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= MAX_IDENTIFIER_LENGTH
  );
}

function counter(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isSafeInteger(value)
    ? Math.max(0, Math.min(MAX_COUNTER, value))
    : fallback;
}

function exactCounter(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_COUNTER
  );
}

function integerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum;
}

function isMode(value: unknown): value is PitSaveMode {
  return (
    value === "cpu" ||
    value === "local" ||
    value === "training" ||
    value === "arcade" ||
    value === "circuit"
  );
}

function isValidRoundOutcome(
  outcome: PitSaveOutcome,
  roundsWon: number,
  roundsLost: number,
  roundsDrawn: number,
): boolean {
  if (outcome === "victory") return roundsWon === 2 && roundsLost < 2;
  if (outcome === "defeat") return roundsLost === 2 && roundsWon < 2;
  return roundsWon < 2 && roundsLost < 2 && roundsDrawn >= 1;
}

function isFighter(value: unknown): value is PitSavedFighterId {
  return typeof value === "string" &&
    PIT_FIRST_EDITION_FIGHTER_IDS.includes(value as PitSavedFighterId);
}

function isArena(value: unknown): value is PitSavedArenaId {
  return typeof value === "string" &&
    (PIT_FIRST_EDITION_ARENA_IDS.includes(value as PitFirstEditionArenaId) || isPitExtensionArenaId(value));
}

function isGuard(value: unknown): value is PitTrainingGuard {
  return (
    value === "none" ||
    value === "high" ||
    value === "low" ||
    value === "alternating"
  );
}

function emptyStats(): PitModeStats {
  return {
    matches: 0,
    victories: 0,
    defeats: 0,
    draws: 0,
    roundsPlayed: 0,
    roundsWon: 0,
    roundsLost: 0,
    roundsDrawn: 0,
  };
}

const PIT_MODE_STATS_FIELDS = [
  "matches",
  "victories",
  "defeats",
  "draws",
  "roundsPlayed",
  "roundsWon",
  "roundsLost",
  "roundsDrawn",
] as const;

function normalizeStats(
  value: unknown,
  minimumRoundsPerDecision: 1 | 2 = 2,
): PitModeStats {
  const source = isRecord(value) ? value : {};
  const victories = counter(source.victories ?? source.wins);
  const defeats = counter(source.defeats ?? source.losses);
  const draws = counter(source.draws);
  const roundsWon = Math.max(
    counter(source.roundsWon),
    counter(victories * minimumRoundsPerDecision),
  );
  const roundsLost = Math.max(
    counter(source.roundsLost),
    counter(defeats * minimumRoundsPerDecision),
  );
  const roundsDrawn = Math.max(counter(source.roundsDrawn), draws);
  return {
    matches: Math.max(
      counter(source.matches),
      counter(victories + defeats + draws),
    ),
    victories,
    defeats,
    draws,
    roundsPlayed: Math.max(
      counter(source.roundsPlayed ?? source.rounds),
      counter(roundsWon + roundsLost + roundsDrawn),
    ),
    roundsWon,
    roundsLost,
    roundsDrawn,
  };
}

function normalizeExactStats(
  value: unknown,
  minimumRoundsPerDecision: 1 | 2 = 2,
): PitModeStats | null {
  if (
    !isRecord(value) ||
    !PIT_MODE_STATS_FIELDS.every((field) => exactCounter(value[field]))
  ) {
    return null;
  }
  const normalized = normalizeStats(value, minimumRoundsPerDecision);
  return PIT_MODE_STATS_FIELDS.every((field) => normalized[field] === value[field])
    ? normalized
    : null;
}

function normalizePreferences(value: unknown): PitTrainingPreferences {
  const source = isRecord(value) ? value : {};
  return {
    opponentId: isFighter(source.opponentId) ? source.opponentId : "berserker",
    guard: isGuard(source.guard) ? source.guard : "none",
    showFrameData: source.showFrameData === true,
    showHitboxes: source.showHitboxes === true,
  };
}

function normalizeResultIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    if (!validIdentifier(candidate)) continue;
    const id = candidate.trim();
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(id);
    }
  }
  return unique.slice(-PIT_SAVE_MAX_APPLIED_RESULT_IDS);
}

const PIT_SAVE_ARCADE_COSMETIC_IDS = PIT_FIRST_EDITION_FIGHTER_IDS.map(
  (fighterId) => PIT_ARCADE_LADDERS[fighterId].cosmeticRewardId,
);
export const PIT_SAVE_CIRCUIT_COSMETIC_IDS = PIT_CIRCUIT_COSMETIC_REWARDS.map(
  (reward) => reward.id,
);
export const PIT_SAVE_DESCENT_COSMETIC_ID = "pit-banner-descent-survivor" as const;

export const PIT_SAVE_ALLOWED_COSMETIC_IDS = [
  ...PIT_SAVE_ARCADE_COSMETIC_IDS,
  ...PIT_SAVE_CIRCUIT_COSMETIC_IDS,
  PIT_SAVE_DESCENT_COSMETIC_ID,
];

function normalizeCosmeticIds(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > PIT_SAVE_ALLOWED_COSMETIC_IDS.length) return null;
  const unique: string[] = [];
  for (const candidate of value) {
    if (
      !validIdentifier(candidate) ||
      !PIT_SAVE_ALLOWED_COSMETIC_IDS.includes(candidate) ||
      unique.includes(candidate)
    ) {
      return null;
    }
    unique.push(candidate);
  }
  return unique;
}

function emptyArcadeProgress(): Record<PitSavedFighterId, PitArcadeFighterProgress> {
  return Object.fromEntries(
    PIT_FIRST_EDITION_FIGHTER_IDS.map((fighterId) => [
      fighterId,
      { bestEncounter: 0, completions: 0, nextEncounter: 0 },
    ]),
  ) as unknown as Record<PitSavedFighterId, PitArcadeFighterProgress>;
}

function normalizeArcadeProgress(
  value: unknown,
  options: {
    allowMissingCursor: boolean;
    requireCompleteRecord: boolean;
  },
): Record<PitSavedFighterId, PitArcadeFighterProgress> | null {
  if (options.requireCompleteRecord && !isRecord(value)) return null;
  const source = isRecord(value) ? value : {};
  const progress = emptyArcadeProgress();
  for (const fighterId of PIT_FIRST_EDITION_FIGHTER_IDS) {
    const candidate = source[fighterId];
    if (candidate === undefined) {
      if (options.requireCompleteRecord) return null;
      continue;
    }
    if (
      !isRecord(candidate) ||
      !integerBetween(candidate.bestEncounter, 0, PIT_ARCADE_ENCOUNTER_COUNT) ||
      !exactCounter(candidate.completions)
    ) {
      return null;
    }
    const nextEncounter = candidate.nextEncounter === undefined &&
        options.allowMissingCursor
      ? candidate.completions > 0
        ? 0
        : Math.min(candidate.bestEncounter, PIT_ARCADE_ENCOUNTER_COUNT - 1)
      : candidate.nextEncounter;
    if (
      !integerBetween(nextEncounter, 0, PIT_ARCADE_ENCOUNTER_COUNT - 1) ||
      (candidate.completions === 0 && nextEncounter > candidate.bestEncounter)
    ) {
      return null;
    }
    progress[fighterId] = {
      bestEncounter: candidate.bestEncounter,
      completions: candidate.completions,
      nextEncounter,
    };
  }
  return progress;
}

function emptyCircuitProgress(): Record<PitSavedFighterId, PitCircuitFighterProgress> {
  return Object.fromEntries(
    PIT_FIRST_EDITION_FIGHTER_IDS.map((fighterId) => [
      fighterId,
      { bestFight: 0, completions: 0, nextFight: 0 },
    ]),
  ) as unknown as Record<PitSavedFighterId, PitCircuitFighterProgress>;
}

function normalizeCircuitProgress(
  value: unknown,
): Record<PitSavedFighterId, PitCircuitFighterProgress> | null {
  if (!isRecord(value)) return null;
  const progress = emptyCircuitProgress();
  for (const fighterId of PIT_FIRST_EDITION_FIGHTER_IDS) {
    const candidate = value[fighterId];
    if (
      !isRecord(candidate) ||
      !integerBetween(candidate.bestFight, 0, PIT_CIRCUIT_FIGHT_COUNT) ||
      !exactCounter(candidate.completions) ||
      !integerBetween(candidate.nextFight, 0, PIT_CIRCUIT_FIGHT_COUNT - 1)
    ) {
      return null;
    }
    const completed = candidate.completions > 0;
    if (
      (candidate.bestFight === PIT_CIRCUIT_FIGHT_COUNT) !== completed ||
      (!completed && candidate.nextFight > candidate.bestFight)
    ) {
      return null;
    }
    progress[fighterId] = {
      bestFight: candidate.bestFight,
      completions: candidate.completions,
      nextFight: candidate.nextFight,
    };
  }
  return progress;
}

function emptyCircuitRuns(): Record<PitSavedFighterId, PitCircuitRun | null> {
  return Object.fromEntries(
    PIT_FIRST_EDITION_FIGHTER_IDS.map((fighterId) => [fighterId, null]),
  ) as Record<PitSavedFighterId, PitCircuitRun | null>;
}

function normalizeCircuitRuns(
  value: unknown,
): Record<PitSavedFighterId, PitCircuitRun | null> | null {
  if (!isRecord(value)) return null;
  const runs = emptyCircuitRuns();
  for (const fighterId of PIT_FIRST_EDITION_FIGHTER_IDS) {
    const candidate = value[fighterId];
    if (candidate === undefined) return null;
    if (candidate === null) continue;
    const run = normalizePitCircuitRun(candidate);
    if (!run || run.fighterId !== fighterId) return null;
    runs[fighterId] = run;
  }
  return runs;
}

function emptyDescentProgress(): Record<PitSavedFighterId, PitDescentFighterProgress> {
  return Object.fromEntries(
    PIT_FIRST_EDITION_FIGHTER_IDS.map((fighterId) => [
      fighterId,
      { bestFloor: 0, completions: 0 },
    ]),
  ) as Record<PitSavedFighterId, PitDescentFighterProgress>;
}

function normalizeDescentProgress(
  value: unknown,
): Record<PitSavedFighterId, PitDescentFighterProgress> | null {
  if (!isRecord(value)) return null;
  const progress = emptyDescentProgress();
  for (const fighterId of PIT_FIRST_EDITION_FIGHTER_IDS) {
    const candidate = value[fighterId];
    if (
      !isRecord(candidate) ||
      !integerBetween(candidate.bestFloor, 0, PIT_DESCENT_FLOOR_COUNT) ||
      !exactCounter(candidate.completions) ||
      ((candidate.bestFloor === PIT_DESCENT_FLOOR_COUNT) !==
        (candidate.completions > 0))
    ) {
      return null;
    }
    progress[fighterId] = {
      bestFloor: candidate.bestFloor,
      completions: candidate.completions,
    };
  }
  return progress;
}

function emptyDescentRuns(): Record<PitSavedFighterId, PitDescentRun | null> {
  return Object.fromEntries(
    PIT_FIRST_EDITION_FIGHTER_IDS.map((fighterId) => [fighterId, null]),
  ) as Record<PitSavedFighterId, PitDescentRun | null>;
}

function normalizeDescentRuns(
  value: unknown,
): Record<PitSavedFighterId, PitDescentRun | null> | null {
  if (!isRecord(value)) return null;
  const runs = emptyDescentRuns();
  for (const fighterId of PIT_FIRST_EDITION_FIGHTER_IDS) {
    const candidate = value[fighterId];
    if (candidate === undefined) return null;
    if (candidate === null) continue;
    const run = normalizePitDescentRun(candidate);
    if (!run || run.fighterId !== fighterId) return null;
    runs[fighterId] = run;
  }
  return runs;
}

function descentCombatHistory(run: PitDescentRun): PitDescentResolutionRecord[] {
  const lookup = createDescentNodeLookup(run);
  return run.resolutionHistory.flatMap((resolution, index) => {
    const node = lookup[index]?.get(resolution.nodeId);
    return node?.kind === "fight" || node?.kind === "boss" ? [resolution] : [];
  });
}

function createDescentNodeLookup(
  run: PitDescentRun,
): ReadonlyArray<ReadonlyMap<string, { readonly kind: string }>> {
  const plan = createPitDescentPlan(run.fighterId, run.seed);
  return plan.floors.map(
    (floor) => new Map(floor.options.map((node) => [node.id, node])),
  );
}
function circuitRewardsForClearedFights(
  fighterId: PitSavedFighterId,
  clearedFightCount: number,
): string[] {
  const circuit = PIT_CLAN_CIRCUITS[fighterId];
  return PIT_CIRCUIT_COSMETIC_REWARDS.filter((reward) => {
    const chapterFights = circuit.fights.filter(
      (fight) => fight.chapterId === reward.chapterId,
    );
    const finalFight = chapterFights[chapterFights.length - 1];
    return finalFight !== undefined && clearedFightCount >= finalFight.index;
  }).map((reward) => reward.id);
}

function expectedCircuitRewards(
  fighterId: PitSavedFighterId,
  fightIndex: number,
  outcome: PitSaveOutcome,
): string[] {
  if (outcome !== "victory") return [];
  const circuit = PIT_CLAN_CIRCUITS[fighterId];
  const fight = circuit.fights[fightIndex];
  const nextFight = circuit.fights[fightIndex + 1];
  if (nextFight?.chapterId === fight.chapterId) return [];
  const reward = PIT_CIRCUIT_COSMETIC_REWARDS.find(
    (candidate) => candidate.chapterId === fight.chapterId,
  );
  return reward ? [reward.id] : [];
}

function cloneSave(save: PitSaveV5): PitSaveV5 {
  return {
    ...save,
    stats: {
      cpu: { ...save.stats.cpu },
      local: { ...save.stats.local },
      training: { ...save.stats.training },
      arcade: { ...save.stats.arcade },
      circuit: { ...save.stats.circuit },
      descent: { ...save.stats.descent },
    },
    arcadeProgress: Object.fromEntries(
      PIT_FIRST_EDITION_FIGHTER_IDS.map((fighterId) => [
        fighterId,
        { ...save.arcadeProgress[fighterId] },
      ]),
    ) as unknown as Record<PitSavedFighterId, PitArcadeFighterProgress>,
    circuitProgress: Object.fromEntries(
      PIT_FIRST_EDITION_FIGHTER_IDS.map((fighterId) => [
        fighterId,
        { ...save.circuitProgress[fighterId] },
      ]),
    ) as unknown as Record<PitSavedFighterId, PitCircuitFighterProgress>,
    circuitRuns: Object.fromEntries(
      PIT_FIRST_EDITION_FIGHTER_IDS.map((fighterId) => {
        const run = save.circuitRuns[fighterId];
        return [fighterId, run ? normalizePitCircuitRun(run) : null];
      }),
    ) as Record<PitSavedFighterId, PitCircuitRun | null>,
    descentProgress: Object.fromEntries(
      PIT_FIRST_EDITION_FIGHTER_IDS.map((fighterId) => [
        fighterId,
        { ...save.descentProgress[fighterId] },
      ]),
    ) as Record<PitSavedFighterId, PitDescentFighterProgress>,
    descentRuns: Object.fromEntries(
      PIT_FIRST_EDITION_FIGHTER_IDS.map((fighterId) => {
        const run = save.descentRuns[fighterId];
        return [fighterId, run ? normalizePitDescentRun(run) : null];
      }),
    ) as Record<PitSavedFighterId, PitDescentRun | null>,
    unlockedCosmeticIds: [...save.unlockedCosmeticIds],
    trainingPreferences: { ...save.trainingPreferences },
    appliedResultIds: [...save.appliedResultIds],
  };
}

function serializedByteLength(serialized: string): number {
  return new TextEncoder().encode(serialized).byteLength;
}

function hasFutureVersion(value: unknown): boolean {
  return (
    isRecord(value) &&
    (Number(value.version) > PIT_SAVE_VERSION ||
      Number(value.runtimeRevision) > PIT_SAVE_RUNTIME_REVISION)
  );
}

/** Create a deterministic, campaign-owned PIT sidecar. */
export function createPitSave(
  ownerSaveCreatedAt: string,
  createdAt = ownerSaveCreatedAt,
): PitSaveV5 {
  if (!validIsoDate(ownerSaveCreatedAt) || !validIsoDate(createdAt)) {
    throw new Error("THE PIT save requires valid owner and creation timestamps.");
  }
  return {
    version: PIT_SAVE_VERSION,
    runtimeRevision: PIT_SAVE_RUNTIME_REVISION,
    ownerSaveCreatedAt,
    revision: 0,
    sequence: 0,
    createdAt,
    updatedAt: createdAt,
    stats: {
      cpu: emptyStats(),
      local: emptyStats(),
      training: emptyStats(),
      arcade: emptyStats(),
      circuit: emptyStats(),
      descent: emptyStats(),
    },
    lastFighterId: "jungle-hunter",
    lastArenaId: "the-pit",
    arcadeProgress: emptyArcadeProgress(),
    circuitProgress: emptyCircuitProgress(),
    circuitRuns: emptyCircuitRuns(),
    descentProgress: emptyDescentProgress(),
    descentRuns: emptyDescentRuns(),
    unlockedCosmeticIds: [],
    trainingPreferences: normalizePreferences(null),
    appliedResultIds: [],
  };
}

/**
 * Accepts V5 through V1 and the unpublished V0 draft. Pre-V5 saves had no
 * resumable Circuit snapshots or Descent contract; migration initializes both safely.
 */
export function normalizePitSave(value: unknown): PitSaveV5 | null {
  try {
    if (!isRecord(value) || hasFutureVersion(value)) return null;
    const sourceVersion = value.version === undefined ? 0 : value.version;
    if (!integerBetween(sourceVersion, 0, PIT_SAVE_VERSION)) return null;
    if (sourceVersion >= 2) {
      if (value.runtimeRevision !== sourceVersion) return null;
    } else if (
      value.runtimeRevision !== undefined &&
      value.runtimeRevision !== 0 &&
      value.runtimeRevision !== 1
    ) {
      return null;
    }
    if (!validIsoDate(value.ownerSaveCreatedAt)) return null;
    const createdAt = validIsoDate(value.createdAt)
      ? value.createdAt
      : value.ownerSaveCreatedAt;
    const updatedAt = validIsoDate(value.updatedAt) ? value.updatedAt : createdAt;
    const sourceRevision = value.revision === undefined ? 0 : value.revision;
    const sourceSequence = value.sequence === undefined ? 0 : value.sequence;
    if (!exactCounter(sourceRevision) || !exactCounter(sourceSequence)) return null;
    let revision: number = sourceRevision;
    let sequence: number = sourceSequence;

    const legacyDraft = sourceVersion <= 1;
    const sourceStats = isRecord(value.stats) ? value.stats : {};
    const cpuStats = legacyDraft
      ? normalizeStats(sourceStats.cpu)
      : normalizeExactStats(sourceStats.cpu);
    const localStats = legacyDraft
      ? normalizeStats(sourceStats.local)
      : normalizeExactStats(sourceStats.local);
    const trainingStats = legacyDraft
      ? normalizeStats(sourceStats.training)
      : normalizeExactStats(sourceStats.training);
    const arcadeStats = legacyDraft
      ? emptyStats()
      : normalizeExactStats(sourceStats.arcade);
    const circuitStats = sourceVersion < 4
      ? emptyStats()
      : normalizeExactStats(sourceStats.circuit);
    const descentStats = sourceVersion < 5
      ? emptyStats()
      : normalizeExactStats(sourceStats.descent, 1);
    if (
      !cpuStats ||
      !localStats ||
      !trainingStats ||
      !arcadeStats ||
      !circuitStats ||
      !descentStats
    ) {
      return null;
    }
    const stats: Record<PitSaveMode, PitModeStats> = {
      cpu: cpuStats,
      local: localStats,
      training: trainingStats,
      arcade: arcadeStats,
      circuit: circuitStats,
      descent: descentStats,
    };

    const arcadeProgress = legacyDraft
      ? emptyArcadeProgress()
      : normalizeArcadeProgress(value.arcadeProgress, {
          allowMissingCursor: sourceVersion === 2,
          requireCompleteRecord: true,
        });
    const circuitProgress = sourceVersion < 4
      ? emptyCircuitProgress()
      : normalizeCircuitProgress(value.circuitProgress);
    const circuitRuns = sourceVersion < 5
      ? emptyCircuitRuns()
      : normalizeCircuitRuns(value.circuitRuns);
    const descentProgress = sourceVersion < 5
      ? emptyDescentProgress()
      : normalizeDescentProgress(value.descentProgress);
    const descentRuns = sourceVersion < 5
      ? emptyDescentRuns()
      : normalizeDescentRuns(value.descentRuns);
    const unlockedCosmeticIds = legacyDraft
      ? []
      : Array.isArray(value.unlockedCosmeticIds)
        ? normalizeCosmeticIds(value.unlockedCosmeticIds)
        : null;
    if (
      !arcadeProgress ||
      !circuitProgress ||
      !circuitRuns ||
      !descentProgress ||
      !descentRuns ||
      !unlockedCosmeticIds
    ) return null;
    if (
      (sourceVersion < 4 &&
        unlockedCosmeticIds.some((rewardId) =>
          PIT_SAVE_CIRCUIT_COSMETIC_IDS.includes(rewardId)
        )) ||
      (sourceVersion < 5 &&
        unlockedCosmeticIds.includes(PIT_SAVE_DESCENT_COSMETIC_ID))
    ) {
      return null;
    }

    let minimumArcadeVictories = 0;
    for (const fighterId of PIT_FIRST_EDITION_FIGHTER_IDS) {
      const progress = arcadeProgress[fighterId];
      const completed = progress.completions > 0;
      const rewardUnlocked = unlockedCosmeticIds.includes(
        PIT_ARCADE_LADDERS[fighterId].cosmeticRewardId,
      );
      if (
        (progress.bestEncounter === PIT_ARCADE_ENCOUNTER_COUNT) !== completed ||
        rewardUnlocked !== completed
      ) {
        return null;
      }
      const currentRunVictories = completed
        ? progress.nextEncounter
        : progress.bestEncounter;
      minimumArcadeVictories +=
        progress.completions * PIT_ARCADE_ENCOUNTER_COUNT +
        currentRunVictories;
      if (
        !Number.isSafeInteger(minimumArcadeVictories) ||
        minimumArcadeVictories > MAX_COUNTER
      ) {
        return null;
      }
    }
    if (stats.arcade.victories < minimumArcadeVictories) return null;

    let minimumCircuitVictories = 0;
    const earnedCircuitRewardIds = new Set<string>();
    for (const fighterId of PIT_FIRST_EDITION_FIGHTER_IDS) {
      const progress = circuitProgress[fighterId];
      const currentRunVictories = progress.completions > 0
        ? progress.nextFight
        : progress.bestFight;
      minimumCircuitVictories +=
        progress.completions * PIT_CIRCUIT_FIGHT_COUNT +
        currentRunVictories;
      if (
        !Number.isSafeInteger(minimumCircuitVictories) ||
        minimumCircuitVictories > MAX_COUNTER
      ) {
        return null;
      }
      for (const rewardId of circuitRewardsForClearedFights(
        fighterId,
        progress.bestFight,
      )) {
        earnedCircuitRewardIds.add(rewardId);
      }
    }
    if (stats.circuit.victories < minimumCircuitVictories) return null;
    for (const rewardId of PIT_SAVE_CIRCUIT_COSMETIC_IDS) {
      if (
        unlockedCosmeticIds.includes(rewardId) !==
        earnedCircuitRewardIds.has(rewardId)
      ) {
        return null;
      }
    }

    let visibleCircuitVictories = 0;
    let visibleCircuitDefeats = 0;
    let visibleCircuitDraws = 0;
    for (const fighterId of PIT_FIRST_EDITION_FIGHTER_IDS) {
      const run = circuitRuns[fighterId];
      if (!run) continue;
      const progress = circuitProgress[fighterId];
      if (
        run.fightIndex > progress.bestFight ||
        (run.phase === "active" && run.fightIndex !== progress.nextFight) ||
        (run.phase === "completed" &&
          (progress.completions === 0 ||
            progress.bestFight !== PIT_CIRCUIT_FIGHT_COUNT ||
            progress.nextFight !== 0)) ||
        run.unlockedPitCosmeticIds.some(
          (rewardId) => !unlockedCosmeticIds.includes(rewardId),
        )
      ) {
        return null;
      }
      visibleCircuitVictories += run.victories;
      visibleCircuitDefeats += run.defeats;
      visibleCircuitDraws += run.draws;
    }
    if (
      stats.circuit.victories < visibleCircuitVictories ||
      stats.circuit.defeats < visibleCircuitDefeats ||
      stats.circuit.draws < visibleCircuitDraws
    ) {
      return null;
    }

    let minimumDescentVictories = 0;
    let visibleDescentDefeats = 0;
    let visibleDescentRoundsWon = 0;
    let visibleDescentRoundsLost = 0;
    let visibleDescentRoundsDrawn = 0;
    let descentCompletions = 0;
    for (const fighterId of PIT_FIRST_EDITION_FIGHTER_IDS) {
      const progress = descentProgress[fighterId];
      const run = descentRuns[fighterId];
      descentCompletions += progress.completions;
      minimumDescentVictories += progress.completions * 6;
      if (
        !Number.isSafeInteger(minimumDescentVictories) ||
        minimumDescentVictories > MAX_COUNTER
      ) {
        return null;
      }
      if (!run) continue;
      if (
        run.completedFloors > progress.bestFloor ||
        (run.phase === "completed" &&
          (progress.completions === 0 ||
            progress.bestFloor !== PIT_DESCENT_FLOOR_COUNT))
      ) {
        return null;
      }
      const combatHistory = descentCombatHistory(run);
      const runVictories = combatHistory.filter(
        (resolution) => resolution.victory === true,
      ).length;
      if (run.phase !== "completed") {
        minimumDescentVictories += runVictories;
      }
      visibleDescentDefeats += combatHistory.filter(
        (resolution) => resolution.victory === false,
      ).length;
      visibleDescentRoundsWon += combatHistory.reduce(
        (total, resolution) => total + (resolution.roundsWon ?? 0),
        0,
      );
      visibleDescentRoundsLost += combatHistory.reduce(
        (total, resolution) => total + (resolution.roundsLost ?? 0),
        0,
      );
      visibleDescentRoundsDrawn += combatHistory.reduce(
        (total, resolution) => total + (resolution.roundsDrawn ?? 0),
        0,
      );
    }
    if (
      !Number.isSafeInteger(descentCompletions) ||
      descentCompletions > MAX_COUNTER ||
      stats.descent.matches !== stats.descent.victories + stats.descent.defeats ||
      stats.descent.draws !== 0 ||
      stats.descent.victories < minimumDescentVictories ||
      stats.descent.defeats < visibleDescentDefeats ||
      stats.descent.roundsWon < visibleDescentRoundsWon ||
      stats.descent.roundsLost < visibleDescentRoundsLost ||
      stats.descent.roundsDrawn < visibleDescentRoundsDrawn ||
      unlockedCosmeticIds.includes(PIT_SAVE_DESCENT_COSMETIC_ID) !==
        (descentCompletions > 0)
    ) {
      return null;
    }
    const totalMatches = Object.values(stats).reduce(
      (total, modeStats) => total + modeStats.matches,
      0,
    );
    if (!Number.isSafeInteger(totalMatches) || totalMatches > MAX_COUNTER) return null;
    if (legacyDraft) {
      sequence = Math.max(sequence, totalMatches);
      revision = Math.max(revision, sequence);
    } else if (revision < sequence || sequence < totalMatches) {
      return null;
    }

    const normalized: PitSaveV5 = {
      version: PIT_SAVE_VERSION,
      runtimeRevision: PIT_SAVE_RUNTIME_REVISION,
      ownerSaveCreatedAt: value.ownerSaveCreatedAt,
      revision,
      sequence,
      createdAt,
      updatedAt,
      stats,
      lastFighterId: isFighter(value.lastFighterId)
        ? value.lastFighterId
        : "jungle-hunter",
      lastArenaId: isArena(value.lastArenaId) ? value.lastArenaId : "the-pit",
      arcadeProgress,
      circuitProgress,
      circuitRuns,
      descentProgress,
      descentRuns,
      unlockedCosmeticIds,
      trainingPreferences: normalizePreferences(value.trainingPreferences),
      appliedResultIds: normalizeResultIds(value.appliedResultIds),
    };
    const serialized = JSON.stringify(normalized);
    if (serializedByteLength(serialized) > PIT_SAVE_MAX_SERIALIZED_BYTES) return null;
    return JSON.parse(serialized) as PitSaveV5;
  } catch {
    return null;
  }
}

function hasSameCanonicalPitValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) =>
        hasSameCanonicalPitValue(entry, right[index]),
      )
    );
  }
  if (!isRecord(left) || !isRecord(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        hasSameCanonicalPitValue(left[key], right[key]),
    )
  );
}

/**
 * Accept a current PIT sidecar only when every nested field is already
 * canonical. Complete archives use this boundary so malformed V5 data cannot
 * be repaired silently; normalizePitSave remains the explicit V0-V4 migration.
 */
export function validateCanonicalPitSave(value: unknown): PitSaveV5 | null {
  if (
    !isRecord(value) ||
    value.version !== PIT_SAVE_VERSION ||
    value.runtimeRevision !== PIT_SAVE_RUNTIME_REVISION
  ) {
    return null;
  }
  const normalized = normalizePitSave(value);
  return normalized && hasSameCanonicalPitValue(value, normalized)
    ? normalized
    : null;
}

/** Apply once within the retained 1,024-result idempotency window. */
export function applyPitResult(
  current: PitSaveV5,
  result: PitMatchResult,
): PitResultApplication {
  const save = normalizePitSave(current);
  const arenaId = result.arenaId ?? "the-pit";
  const roundsDrawn = result.roundsDrawn ?? 0;
  const cosmeticRewardIds = normalizeCosmeticIds(result.cosmeticRewardIds);
  if (
    !save ||
    !validIdentifier(result.id) ||
    !isMode(result.mode) ||
    (result.outcome !== "victory" &&
      result.outcome !== "defeat" &&
      result.outcome !== "draw") ||
    !isFighter(result.fighterId) ||
    !isArena(arenaId) ||
    !exactCounter(result.roundsWon) ||
    !exactCounter(result.roundsLost) ||
    !exactCounter(roundsDrawn) ||
    !validIsoDate(result.completedAt) ||
    !cosmeticRewardIds
  ) {
    throw new Error("Invalid THE PIT match result.");
  }

  if (!isValidRoundOutcome(
    result.outcome,
    result.roundsWon,
    result.roundsLost,
    roundsDrawn,
  )) {
    throw new Error("Invalid THE PIT round outcome.");
  }

  const isArcadeResult = result.mode === "arcade";
  const isCircuitResult = result.mode === "circuit";
  if (
    isArcadeResult !== (result.arcadeEncounterIndex !== undefined) ||
    (isArcadeResult &&
      !integerBetween(result.arcadeEncounterIndex, 0, PIT_ARCADE_ENCOUNTER_COUNT - 1)) ||
    (!isArcadeResult && result.arcadeCompleted !== undefined) ||
    (isArcadeResult &&
      (result.circuitFightIndex !== undefined ||
        result.circuitCompleted !== undefined))
  ) {
    throw new Error("Invalid THE PIT Arcade result.");
  }
  if (
    isCircuitResult !== (result.circuitFightIndex !== undefined) ||
    (isCircuitResult &&
      (!integerBetween(result.circuitFightIndex, 0, PIT_CIRCUIT_FIGHT_COUNT - 1) ||
        typeof result.circuitCompleted !== "boolean")) ||
    (!isCircuitResult && result.circuitCompleted !== undefined) ||
    (!isArcadeResult && !isCircuitResult && cosmeticRewardIds.length > 0)
  ) {
    throw new Error("Invalid THE PIT Clan Circuit result.");
  }

  if (isArcadeResult && isPitExtensionArenaId(arenaId)) {
    // Expansion arenas are neutral duels; the original Arcade routes stay fixed.
    throw new Error("Invalid THE PIT Arcade arena: duel extension.");
  }

  if (isArcadeResult) {
    const encounterIndex = result.arcadeEncounterIndex;
    if (encounterIndex === undefined) {
      throw new Error("Invalid THE PIT Arcade result.");
    }
    const completed = result.arcadeCompleted === true;
    const expectedCompletion =
      result.outcome === "victory" &&
      encounterIndex === PIT_ARCADE_ENCOUNTER_COUNT - 1;
    if (completed !== expectedCompletion) {
      throw new Error("Invalid THE PIT Arcade completion.");
    }
    const expectedRewards = completed
      ? [PIT_ARCADE_LADDERS[result.fighterId].cosmeticRewardId]
      : [];
    if (
      cosmeticRewardIds.length !== expectedRewards.length ||
      cosmeticRewardIds.some((rewardId, index) => rewardId !== expectedRewards[index])
    ) {
      throw new Error("Invalid THE PIT Arcade cosmetic reward.");
    }
  }

  if (isCircuitResult) {
    const fightIndex = result.circuitFightIndex;
    if (fightIndex === undefined) {
      throw new Error("Invalid THE PIT Clan Circuit result.");
    }
    const expectedFight = PIT_CLAN_CIRCUITS[result.fighterId].fights[fightIndex];
    const expectedCompletion =
      result.outcome === "victory" &&
      fightIndex === PIT_CIRCUIT_FIGHT_COUNT - 1;
    const expectedRewards = expectedCircuitRewards(
      result.fighterId,
      fightIndex,
      result.outcome,
    );
    if (
      arenaId !== expectedFight.arenaId ||
      result.circuitCompleted !== expectedCompletion ||
      cosmeticRewardIds.length !== expectedRewards.length ||
      cosmeticRewardIds.some((rewardId, index) => rewardId !== expectedRewards[index])
    ) {
      throw new Error("Invalid THE PIT Clan Circuit contract or reward.");
    }
  }

  const resultId = result.id.trim();
  if (save.appliedResultIds.includes(resultId)) {
    return { save, applied: false };
  }

  if (isArcadeResult) {
    const encounterIndex = result.arcadeEncounterIndex;
    const progress = save.arcadeProgress[result.fighterId];
    if (
      encounterIndex === undefined ||
      (encounterIndex !== 0 && encounterIndex !== progress.nextEncounter)
    ) {
      throw new Error("THE PIT Arcade result skips an unreached encounter.");
    }
  }
  if (isCircuitResult) {
    const fightIndex = result.circuitFightIndex;
    const progress = save.circuitProgress[result.fighterId];
    if (
      fightIndex === undefined ||
      (fightIndex !== 0 && fightIndex !== progress.nextFight)
    ) {
      throw new Error("THE PIT Clan Circuit result skips an unreached fight.");
    }
  }
  if (save.sequence >= MAX_COUNTER || save.revision >= MAX_COUNTER) {
    throw new Error("THE PIT monotone counters are exhausted.");
  }

  const modeStats = save.stats[result.mode];
  const nextModeStats: PitModeStats = {
    matches: counter(modeStats.matches + 1),
    victories: counter(modeStats.victories + (result.outcome === "victory" ? 1 : 0)),
    defeats: counter(modeStats.defeats + (result.outcome === "defeat" ? 1 : 0)),
    draws: counter(modeStats.draws + (result.outcome === "draw" ? 1 : 0)),
    roundsPlayed: counter(
      modeStats.roundsPlayed + result.roundsWon + result.roundsLost + roundsDrawn,
    ),
    roundsWon: counter(modeStats.roundsWon + result.roundsWon),
    roundsLost: counter(modeStats.roundsLost + result.roundsLost),
    roundsDrawn: counter(modeStats.roundsDrawn + roundsDrawn),
  };

  const next = cloneSave(save);
  next.revision += 1;
  next.sequence += 1;
  next.updatedAt = result.completedAt;
  next.stats[result.mode] = nextModeStats;
  next.lastFighterId = result.fighterId;
  next.lastArenaId = arenaId;
  if (isArcadeResult && result.arcadeEncounterIndex !== undefined) {
    const previous = next.arcadeProgress[result.fighterId];
    const clearedEncounters =
      result.arcadeEncounterIndex + (result.outcome === "victory" ? 1 : 0);
    next.arcadeProgress[result.fighterId] = {
      bestEncounter: Math.max(previous.bestEncounter, clearedEncounters),
      completions: previous.completions + (result.arcadeCompleted === true ? 1 : 0),
      nextEncounter: result.outcome === "victory"
        ? (result.arcadeEncounterIndex + 1) % PIT_ARCADE_ENCOUNTER_COUNT
        : result.arcadeEncounterIndex,
    };
    next.unlockedCosmeticIds = [
      ...new Set([...next.unlockedCosmeticIds, ...cosmeticRewardIds]),
    ];
  }
  if (isCircuitResult && result.circuitFightIndex !== undefined) {
    const previous = next.circuitProgress[result.fighterId];
    const clearedFights =
      result.circuitFightIndex + (result.outcome === "victory" ? 1 : 0);
    next.circuitProgress[result.fighterId] = {
      bestFight: Math.max(previous.bestFight, clearedFights),
      completions: previous.completions + (result.circuitCompleted === true ? 1 : 0),
      nextFight: result.outcome === "victory"
        ? (result.circuitFightIndex + 1) % PIT_CIRCUIT_FIGHT_COUNT
        : result.circuitFightIndex,
    };
    next.unlockedCosmeticIds = [
      ...new Set([...next.unlockedCosmeticIds, ...cosmeticRewardIds]),
    ];
    const storedRun = next.circuitRuns[result.fighterId];
    if (storedRun) {
      const fight = PIT_CLAN_CIRCUITS[result.fighterId].fights[result.circuitFightIndex];
      if (
        storedRun.fightIndex !== result.circuitFightIndex ||
        (storedRun.selectedFightId !== null && storedRun.selectedFightId !== fight.id)
      ) {
        throw new Error("THE PIT Clan Circuit snapshot is not ready for this result.");
      }
      const readyRun = storedRun.selectedFightId === null
        ? selectPitCircuitFight(storedRun, fight.id)
        : storedRun;
      next.circuitRuns[result.fighterId] = applyPitCircuitFightResult(readyRun, {
        resultId,
        fightId: fight.id,
        outcome: result.outcome,
      }).run;
    }
  }
  next.appliedResultIds = [...next.appliedResultIds, resultId].slice(
    -PIT_SAVE_MAX_APPLIED_RESULT_IDS,
  );
  return { save: next, applied: true };
}

function sameCanonicalValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertRunMutationBase(
  current: PitSaveV5,
  updatedAt: string,
): PitSaveV5 {
  const save = normalizePitSave(current);
  if (!save || !validIsoDate(updatedAt) || save.revision >= MAX_COUNTER) {
    throw new Error("Invalid THE PIT run persistence mutation.");
  }
  return save;
}

export function getPitCircuitRun(
  current: PitSaveV5,
  fighterId: PitSavedFighterId,
): PitCircuitRun | null {
  const save = normalizePitSave(current);
  if (!save || !isFighter(fighterId)) {
    throw new Error("Invalid THE PIT Clan Circuit run lookup.");
  }
  const run = save.circuitRuns[fighterId];
  return run ? normalizePitCircuitRun(run) : null;
}

function isFreshCircuitRun(run: PitCircuitRun): boolean {
  return (
    run.phase === "active" &&
    run.fightIndex === 0 &&
    run.victories === 0 &&
    run.defeats === 0 &&
    run.draws === 0 &&
    run.appliedResults.length === 0 &&
    run.completedChapterIds.length === 0 &&
    run.unlockedPitCosmeticIds.length === 0
  );
}

/**
 * Persist a selection or the single result already applied through
 * applyPitResult. The helper never writes storage itself.
 */
export function persistPitCircuitRun(
  current: PitSaveV5,
  runValue: PitCircuitRun,
  updatedAt: string,
): PitRunSaveApplication {
  const save = assertRunMutationBase(current, updatedAt);
  const run = normalizePitCircuitRun(runValue);
  if (!run) throw new Error("Invalid THE PIT Clan Circuit run snapshot.");
  const previous = save.circuitRuns[run.fighterId];
  if (previous && sameCanonicalValue(previous, run)) {
    return { save, applied: false };
  }

  if (!previous) {
    const recoverableFirstResult =
      run.appliedResults.length === 1 &&
      save.appliedResultIds.includes(run.appliedResults[0].resultId);
    if (!isFreshCircuitRun(run) && !recoverableFirstResult) {
      throw new Error("A Clan Circuit snapshot must start from a fresh or just-applied run.");
    }
  } else {
    if (
      previous.phase !== "active" ||
      previous.circuitId !== run.circuitId ||
      run.appliedResults.length < previous.appliedResults.length ||
      run.appliedResults.length > previous.appliedResults.length + 1 ||
      !previous.appliedResults.every((result, index) =>
        sameCanonicalValue(result, run.appliedResults[index])
      )
    ) {
      throw new Error("Invalid THE PIT Clan Circuit run transition.");
    }
    if (run.appliedResults.length === previous.appliedResults.length + 1) {
      const result = run.appliedResults[run.appliedResults.length - 1];
      if (!save.appliedResultIds.includes(result.resultId)) {
        throw new Error("Clan Circuit snapshot result was not durably applied.");
      }
    }
  }

  const next = cloneSave(save);
  next.revision += 1;
  next.updatedAt = updatedAt;
  if (!previous) {
    next.circuitProgress[run.fighterId] = {
      ...next.circuitProgress[run.fighterId],
      nextFight: 0,
    };
  }
  next.circuitRuns[run.fighterId] = run;
  const normalized = normalizePitSave(next);
  if (!normalized) {
    throw new Error("Clan Circuit snapshot conflicts with persistent progress.");
  }
  return { save: normalized, applied: true };
}

/** Explicitly abandon any stored Circuit route and start a clean one. */
export function replacePitCircuitRun(
  current: PitSaveV5,
  runValue: PitCircuitRun,
  updatedAt: string,
): PitRunSaveApplication {
  const save = assertRunMutationBase(current, updatedAt);
  const run = normalizePitCircuitRun(runValue);
  if (!run || !isFreshCircuitRun(run)) {
    throw new Error("A replacement Clan Circuit run must be fresh.");
  }
  const previous = save.circuitRuns[run.fighterId];
  if (
    previous &&
    sameCanonicalValue(previous, run) &&
    save.circuitProgress[run.fighterId].nextFight === 0
  ) {
    return { save, applied: false };
  }
  const next = cloneSave(save);
  next.revision += 1;
  next.updatedAt = updatedAt;
  next.circuitProgress[run.fighterId] = {
    ...next.circuitProgress[run.fighterId],
    nextFight: 0,
  };
  next.circuitRuns[run.fighterId] = run;
  const normalized = normalizePitSave(next);
  if (!normalized) throw new Error("Unable to replace THE PIT Clan Circuit run.");
  return { save: normalized, applied: true };
}

export function removePitCircuitRun(
  current: PitSaveV5,
  fighterId: PitSavedFighterId,
  updatedAt: string,
): PitRunSaveApplication {
  const save = assertRunMutationBase(current, updatedAt);
  if (!isFighter(fighterId)) throw new Error("Invalid Clan Circuit fighter.");
  if (!save.circuitRuns[fighterId]) return { save, applied: false };
  const next = cloneSave(save);
  next.revision += 1;
  next.updatedAt = updatedAt;
  next.circuitRuns[fighterId] = null;
  next.circuitProgress[fighterId] = {
    ...next.circuitProgress[fighterId],
    nextFight: 0,
  };
  const normalized = normalizePitSave(next);
  if (!normalized) throw new Error("Unable to remove THE PIT Clan Circuit run.");
  return { save: normalized, applied: true };
}

export function getPitDescentRun(
  current: PitSaveV5,
  fighterId: PitSavedFighterId,
): PitDescentRun | null {
  const save = normalizePitSave(current);
  if (!save || !isFighter(fighterId)) {
    throw new Error("Invalid THE PIT Descent run lookup.");
  }
  const run = save.descentRuns[fighterId];
  return run ? normalizePitDescentRun(run) : null;
}

function isFreshDescentRun(run: PitDescentRun): boolean {
  return (
    run.phase === "active" &&
    run.completedFloors === 0 &&
    run.health === PIT_DESCENT_MAX_HEALTH &&
    run.recoveriesRemaining === PIT_DESCENT_MAX_RECOVERIES &&
    run.resolutionHistory.length === 0 &&
    run.resolvedNodeIds.length === 0 &&
    run.appliedResolutionIds.length === 0 &&
    run.temporaryRelicIds.length === 0 &&
    run.cosmeticRewardIds.length === 0
  );
}

function sameDescentHistoryPrefix(
  previous: PitDescentRun,
  next: PitDescentRun,
): boolean {
  return previous.resolutionHistory.every((resolution, index) =>
    sameCanonicalValue(resolution, next.resolutionHistory[index])
  );
}

/**
 * Persist one legal Descente mutation. Combat nodes atomically update match
 * statistics; relic and recovery nodes only advance the revision.
 */
export function persistPitDescentRun(
  current: PitSaveV5,
  runValue: PitDescentRun,
  updatedAt: string,
): PitRunSaveApplication {
  const save = assertRunMutationBase(current, updatedAt);
  const run = normalizePitDescentRun(runValue);
  if (!run) throw new Error("Invalid THE PIT Descent run snapshot.");
  const previous = save.descentRuns[run.fighterId];
  if (previous && sameCanonicalValue(previous, run)) {
    return { save, applied: false };
  }

  let appendedResolution: PitDescentResolutionRecord | null = null;
  if (!previous) {
    if (run.resolutionHistory.length === 1) {
      appendedResolution = run.resolutionHistory[0];
    } else if (!isFreshDescentRun(run)) {
      throw new Error("A Descent snapshot must start from a fresh or first resolved floor.");
    }
  } else {
    if (
      previous.phase !== "active" ||
      previous.seed !== run.seed ||
      run.resolutionHistory.length < previous.resolutionHistory.length ||
      run.resolutionHistory.length > previous.resolutionHistory.length + 1 ||
      !sameDescentHistoryPrefix(previous, run)
    ) {
      throw new Error("Invalid THE PIT Descent run transition.");
    }
    if (run.resolutionHistory.length === previous.resolutionHistory.length) {
      if (
        previous.health !== run.health ||
        previous.completedFloors !== run.completedFloors ||
        previous.phase !== run.phase
      ) {
        throw new Error("A Descent selection cannot mutate run resources.");
      }
    } else {
      appendedResolution = run.resolutionHistory[run.resolutionHistory.length - 1];
      if (
        previous.selectedNodeId !== null &&
        previous.selectedNodeId !== appendedResolution.nodeId
      ) {
        throw new Error("The resolved Descent branch was not selected.");
      }
    }
  }

  const next = cloneSave(save);
  next.revision += 1;
  next.updatedAt = updatedAt;
  next.descentRuns[run.fighterId] = run;
  next.descentProgress[run.fighterId] = {
    bestFloor: Math.max(
      next.descentProgress[run.fighterId].bestFloor,
      run.completedFloors,
    ),
    completions:
      next.descentProgress[run.fighterId].completions +
      (appendedResolution && run.phase === "completed" ? 1 : 0),
  };

  if (appendedResolution) {
    const node = createPitDescentPlan(run.fighterId, run.seed)
      .floors[run.completedFloors - 1]
      .options.find((candidate) => candidate.id === appendedResolution?.nodeId);
    if (!node) throw new Error("Unable to resolve the persisted Descent node.");
    if (node.kind === "fight" || node.kind === "boss") {
      if (
        next.sequence >= MAX_COUNTER ||
        next.appliedResultIds.includes(appendedResolution.id)
      ) {
        throw new Error("Conflicting or exhausted THE PIT Descent result id.");
      }
      const won = appendedResolution.victory === true;
      const modeStats = next.stats.descent;
      next.sequence += 1;
      next.stats.descent = {
        matches: modeStats.matches + 1,
        victories: modeStats.victories + (won ? 1 : 0),
        defeats: modeStats.defeats + (won ? 0 : 1),
        draws: modeStats.draws,
        roundsPlayed:
          modeStats.roundsPlayed +
          (appendedResolution.roundsWon ?? 0) +
          (appendedResolution.roundsLost ?? 0) +
          (appendedResolution.roundsDrawn ?? 0),
        roundsWon: modeStats.roundsWon + (appendedResolution.roundsWon ?? 0),
        roundsLost: modeStats.roundsLost + (appendedResolution.roundsLost ?? 0),
        roundsDrawn:
          modeStats.roundsDrawn + (appendedResolution.roundsDrawn ?? 0),
      };
      next.lastFighterId = run.fighterId;
      next.lastArenaId = node.arenaId;
      next.appliedResultIds = [
        ...next.appliedResultIds,
        appendedResolution.id,
      ].slice(-PIT_SAVE_MAX_APPLIED_RESULT_IDS);
    }
    if (run.phase === "completed") {
      next.unlockedCosmeticIds = [
        ...new Set([
          ...next.unlockedCosmeticIds,
          PIT_SAVE_DESCENT_COSMETIC_ID,
        ]),
      ];
    }
  }

  const normalized = normalizePitSave(next);
  if (!normalized) {
    throw new Error("Descent snapshot conflicts with persistent progress.");
  }
  return { save: normalized, applied: true };
}

/** Explicitly abandon a route while retaining lifetime PIT statistics/rewards. */
export function replacePitDescentRun(
  current: PitSaveV5,
  runValue: PitDescentRun,
  updatedAt: string,
): PitRunSaveApplication {
  const save = assertRunMutationBase(current, updatedAt);
  const run = normalizePitDescentRun(runValue);
  if (!run || !isFreshDescentRun(run)) {
    throw new Error("A replacement Descent run must be fresh.");
  }
  const previous = save.descentRuns[run.fighterId];
  if (previous && sameCanonicalValue(previous, run)) {
    return { save, applied: false };
  }
  const next = cloneSave(save);
  next.revision += 1;
  next.updatedAt = updatedAt;
  next.descentRuns[run.fighterId] = run;
  const normalized = normalizePitSave(next);
  if (!normalized) throw new Error("Unable to replace THE PIT Descent run.");
  return { save: normalized, applied: true };
}

export function removePitDescentRun(
  current: PitSaveV5,
  fighterId: PitSavedFighterId,
  updatedAt: string,
): PitRunSaveApplication {
  const save = assertRunMutationBase(current, updatedAt);
  if (!isFighter(fighterId)) throw new Error("Invalid Descent fighter.");
  if (!save.descentRuns[fighterId]) return { save, applied: false };
  const next = cloneSave(save);
  next.revision += 1;
  next.updatedAt = updatedAt;
  next.descentRuns[fighterId] = null;
  const normalized = normalizePitSave(next);
  if (!normalized) throw new Error("Unable to remove THE PIT Descent run.");
  return { save: normalized, applied: true };
}
/** Preference mutations advance revision but do not forge a match sequence. */
export function updatePitTrainingPreferences(
  current: PitSaveV5,
  preferences: Partial<PitTrainingPreferences>,
  updatedAt: string,
): PitSaveV5 {
  const save = normalizePitSave(current);
  if (!save || !validIsoDate(updatedAt) || save.revision >= MAX_COUNTER) {
    throw new Error("Invalid THE PIT preference update.");
  }
  const candidate = normalizePreferences({
    ...save.trainingPreferences,
    ...preferences,
  });
  const next = cloneSave(save);
  next.revision += 1;
  next.updatedAt = updatedAt;
  next.trainingPreferences = candidate;
  return next;
}

export function serializePitSave(value: PitSaveV5): string {
  const save = normalizePitSave(value);
  if (!save) throw new Error("Cannot serialize an invalid THE PIT save.");
  const serialized = JSON.stringify(save);
  if (serializedByteLength(serialized) > PIT_SAVE_MAX_SERIALIZED_BYTES) {
    throw new Error("THE PIT save exceeds its storage budget.");
  }
  return serialized;
}

function browserStorage(): PitSaveStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function storageFromOptions(options: PitSaveStorageOptions): PitSaveStorage | null {
  return options.storage === undefined ? browserStorage() : options.storage;
}

function isQuotaError(error: unknown): boolean {
  if ((typeof error !== "object" && typeof error !== "function") || error === null) {
    return false;
  }
  try {
    const candidate = error as { name?: unknown; code?: unknown };
    return (
      candidate.name === "QuotaExceededError" ||
      candidate.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      candidate.code === 22 ||
      candidate.code === 1014
    );
  } catch {
    return false;
  }
}

export function loadPitSave(
  options: PitSaveStorageOptions = {},
): PitSaveLoadResult {
  const storage = storageFromOptions(options);
  if (!storage) return { save: null, loaded: false, failure: "storage-unavailable" };
  if (
    options.key !== undefined &&
    options.expectedOwnerSaveCreatedAt !== undefined &&
    options.key !== pitSaveStorageKey(options.expectedOwnerSaveCreatedAt)
  ) {
    return { save: null, loaded: false, failure: "owner-conflict" };
  }
  let serialized: string | null;
  try {
    serialized = storage.getItem(options.key ?? PIT_SAVE_STORAGE_KEY);
  } catch {
    return { save: null, loaded: false, failure: "read-failed" };
  }
  if (serialized === null) return { save: null, loaded: false, failure: null };
  if (serializedByteLength(serialized) > PIT_SAVE_MAX_SERIALIZED_BYTES) {
    return { save: null, loaded: false, failure: "corrupt-save" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return { save: null, loaded: false, failure: "corrupt-save" };
  }
  if (hasFutureVersion(parsed)) {
    return { save: null, loaded: false, failure: "future-version" };
  }
  const save = normalizePitSave(parsed);
  if (!save) return { save: null, loaded: false, failure: "corrupt-save" };
  if (
    options.key !== undefined &&
    options.key !== pitSaveStorageKey(save.ownerSaveCreatedAt)
  ) {
    return { save: null, loaded: false, failure: "owner-conflict" };
  }
  if (
    options.expectedOwnerSaveCreatedAt !== undefined &&
    save.ownerSaveCreatedAt !== options.expectedOwnerSaveCreatedAt
  ) {
    return { save: null, loaded: false, failure: "owner-conflict" };
  }
  return { save, loaded: true, failure: null };
}

export function writePitSave(
  value: PitSaveV5,
  options: PitSaveStorageOptions = {},
): PitSaveWriteResult {
  const save = normalizePitSave(value);
  if (!save) {
    return {
      save: null,
      persisted: false,
      failure: hasFutureVersion(value) ? "future-version" : "invalid-save",
    };
  }
  if (
    options.expectedOwnerSaveCreatedAt !== undefined &&
    save.ownerSaveCreatedAt !== options.expectedOwnerSaveCreatedAt
  ) {
    return { save, persisted: false, failure: "owner-conflict" };
  }
  if (
    options.key !== undefined &&
    options.key !== pitSaveStorageKey(save.ownerSaveCreatedAt)
  ) {
    return { save, persisted: false, failure: "owner-conflict" };
  }
  if (
    options.key !== undefined &&
    options.expectedOwnerSaveCreatedAt !== undefined &&
    options.key !== pitSaveStorageKey(options.expectedOwnerSaveCreatedAt)
  ) {
    return { save, persisted: false, failure: "owner-conflict" };
  }
  const storage = storageFromOptions(options);
  if (!storage) return { save, persisted: false, failure: "storage-unavailable" };
  if (archiveTransferPending(storage)) return { save, persisted: false, failure: "write-denied" };
  const key = options.key ?? PIT_SAVE_STORAGE_KEY;
  try {
    const currentSerialized = storage.getItem(key);
    if (currentSerialized !== null) {
      if (serializedByteLength(currentSerialized) > PIT_SAVE_MAX_SERIALIZED_BYTES) {
        return { save, persisted: false, failure: "corrupt-save" };
      }
      let currentValue: unknown;
      try {
        currentValue = JSON.parse(currentSerialized);
      } catch {
        return { save, persisted: false, failure: "corrupt-save" };
      }
      if (hasFutureVersion(currentValue)) {
        return { save, persisted: false, failure: "future-version" };
      }
      const current = normalizePitSave(currentValue);
      if (!current) return { save, persisted: false, failure: "corrupt-save" };
      if (current.ownerSaveCreatedAt !== save.ownerSaveCreatedAt) {
        return { save, persisted: false, failure: "owner-conflict" };
      }
      if (save.sequence < current.sequence) {
        return { save, persisted: false, failure: "stale-sequence" };
      }
      if (save.revision <= current.revision) {
        return { save, persisted: false, failure: "stale-revision" };
      }
    }
  } catch {
    return { save, persisted: false, failure: "read-failed" };
  }

  let serialized: string;
  try {
    serialized = serializePitSave(save);
  } catch {
    return { save, persisted: false, failure: "invalid-save" };
  }
  try {
    if (archiveTransferPending(storage)) return { save, persisted: false, failure: "write-denied" };
    storage.setItem(key, serialized);
    if (storage.getItem(key) !== serialized) {
      return { save, persisted: false, failure: "write-denied" };
    }
    return { save, persisted: true, failure: null };
  } catch (error) {
    return {
      save,
      persisted: false,
      failure: isQuotaError(error) ? "quota-exceeded" : "write-denied",
    };
  }
}

/** Remove one campaign-owned namespace after the campaign reset is confirmed. */
export function clearPitSave(
  ownerSaveCreatedAt: string,
  options: PitSaveStorageOptions = {},
): PitSaveClearResult {
  let expectedKey: string;
  try {
    expectedKey = pitSaveStorageKey(ownerSaveCreatedAt);
  } catch {
    return { cleared: false, failure: "owner-conflict" };
  }
  if (options.key !== undefined && options.key !== expectedKey) {
    return { cleared: false, failure: "owner-conflict" };
  }
  const storage = storageFromOptions(options);
  if (!storage) return { cleared: false, failure: "storage-unavailable" };
  if (archiveTransferPending(storage)) return { cleared: false, failure: "write-denied" };
  if (typeof storage.removeItem !== "function") {
    return { cleared: false, failure: "write-denied" };
  }
  const key = options.key ?? expectedKey;
  try {
    const serialized = storage.getItem(key);
    if (serialized !== null && serializedByteLength(serialized) <= PIT_SAVE_MAX_SERIALIZED_BYTES) {
      try {
        const existing = normalizePitSave(JSON.parse(serialized));
        if (existing && existing.ownerSaveCreatedAt !== ownerSaveCreatedAt) {
          return { cleared: false, failure: "owner-conflict" };
        }
      } catch {
        // A corrupt value is still safe to remove because the namespace itself
        // was derived from the confirmed campaign owner.
      }
    }
    if (archiveTransferPending(storage)) return { cleared: false, failure: "write-denied" };
    storage.removeItem(key);
    return storage.getItem(key) === null
      ? { cleared: true, failure: null }
      : { cleared: false, failure: "write-denied" };
  } catch {
    return { cleared: false, failure: "write-denied" };
  }
}
