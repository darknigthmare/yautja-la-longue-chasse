/**
 * Persistent sidecar for THE PIT.
 *
 * This file deliberately has no campaign progression dependency. A match can
 * update PIT statistics, but it can never award honor, clan marks, inventory,
 * trophies, codex entries, or mission progress.
 */

export const PIT_SAVE_VERSION = 1 as const;
export const PIT_SAVE_RUNTIME_REVISION = 1 as const;
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

export type PitSaveMode = "cpu" | "local" | "training";
export type PitSaveOutcome = "victory" | "defeat" | "draw";
export type PitSavedFighterId = "jungle-hunter" | "berserker";
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

export interface PitSaveV1 {
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
  trainingPreferences: PitTrainingPreferences;
  appliedResultIds: string[];
}

export interface PitMatchResult {
  id: string;
  mode: PitSaveMode;
  outcome: PitSaveOutcome;
  fighterId: PitSavedFighterId;
  roundsWon: number;
  roundsLost: number;
  roundsDrawn?: number;
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
  save: PitSaveV1 | null;
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
  save: PitSaveV1 | null;
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
  save: PitSaveV1;
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

function isMode(value: unknown): value is PitSaveMode {
  return value === "cpu" || value === "local" || value === "training";
}

function isFighter(value: unknown): value is PitSavedFighterId {
  return value === "jungle-hunter" || value === "berserker";
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

function normalizeStats(value: unknown): PitModeStats {
  const source = isRecord(value) ? value : {};
  const victories = counter(source.victories ?? source.wins);
  const defeats = counter(source.defeats ?? source.losses);
  const draws = counter(source.draws);
  const roundsWon = counter(source.roundsWon);
  const roundsLost = counter(source.roundsLost);
  const roundsDrawn = counter(source.roundsDrawn);
  return {
    matches: Math.max(counter(source.matches), victories + defeats + draws),
    victories,
    defeats,
    draws,
    roundsPlayed: Math.max(
      counter(source.roundsPlayed ?? source.rounds),
      roundsWon + roundsLost + roundsDrawn,
    ),
    roundsWon,
    roundsLost,
    roundsDrawn,
  };
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

function cloneSave(save: PitSaveV1): PitSaveV1 {
  return {
    ...save,
    stats: {
      cpu: { ...save.stats.cpu },
      local: { ...save.stats.local },
      training: { ...save.stats.training },
    },
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
): PitSaveV1 {
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
    },
    lastFighterId: "jungle-hunter",
    trainingPreferences: normalizePreferences(null),
    appliedResultIds: [],
  };
}

/**
 * Accepts V1 and the unpublished V0 draft (missing/zero version). V0 used
 * wins/losses/rounds aliases; normalization migrates those names to V1.
 */
export function normalizePitSave(value: unknown): PitSaveV1 | null {
  try {
    if (!isRecord(value) || hasFutureVersion(value)) return null;
    if (value.version !== undefined && value.version !== 0 && value.version !== 1) {
      return null;
    }
    if (
      value.runtimeRevision !== undefined &&
      value.runtimeRevision !== 0 &&
      value.runtimeRevision !== PIT_SAVE_RUNTIME_REVISION
    ) {
      return null;
    }
    if (!validIsoDate(value.ownerSaveCreatedAt)) return null;
    const createdAt = validIsoDate(value.createdAt)
      ? value.createdAt
      : value.ownerSaveCreatedAt;
    const updatedAt = validIsoDate(value.updatedAt) ? value.updatedAt : createdAt;
    const revision = value.revision === undefined ? 0 : value.revision;
    const sequence = value.sequence === undefined ? 0 : value.sequence;
    if (!exactCounter(revision) || !exactCounter(sequence)) return null;
    const sourceStats = isRecord(value.stats) ? value.stats : {};
    const normalized: PitSaveV1 = {
      version: PIT_SAVE_VERSION,
      runtimeRevision: PIT_SAVE_RUNTIME_REVISION,
      ownerSaveCreatedAt: value.ownerSaveCreatedAt,
      revision,
      sequence,
      createdAt,
      updatedAt,
      stats: {
        cpu: normalizeStats(sourceStats.cpu),
        local: normalizeStats(sourceStats.local),
        training: normalizeStats(sourceStats.training),
      },
      lastFighterId: isFighter(value.lastFighterId)
        ? value.lastFighterId
        : "jungle-hunter",
      trainingPreferences: normalizePreferences(value.trainingPreferences),
      appliedResultIds: normalizeResultIds(value.appliedResultIds),
    };
    const serialized = JSON.stringify(normalized);
    if (serializedByteLength(serialized) > PIT_SAVE_MAX_SERIALIZED_BYTES) return null;
    return JSON.parse(serialized) as PitSaveV1;
  } catch {
    return null;
  }
}

/** Apply once within the retained 1,024-result idempotency window. */
export function applyPitResult(
  current: PitSaveV1,
  result: PitMatchResult,
): PitResultApplication {
  const save = normalizePitSave(current);
  if (!save) throw new Error("Cannot apply a result to an invalid THE PIT save.");
  if (
    !validIdentifier(result.id) ||
    !isMode(result.mode) ||
    (result.outcome !== "victory" &&
      result.outcome !== "defeat" &&
      result.outcome !== "draw") ||
    !isFighter(result.fighterId) ||
    !exactCounter(result.roundsWon) ||
    !exactCounter(result.roundsLost) ||
    !exactCounter(result.roundsDrawn ?? 0) ||
    !validIsoDate(result.completedAt)
  ) {
    throw new Error("Invalid THE PIT match result.");
  }
  const resultId = result.id.trim();
  if (save.appliedResultIds.includes(resultId)) {
    return { save, applied: false };
  }
  if (save.sequence >= MAX_COUNTER || save.revision >= MAX_COUNTER) {
    throw new Error("THE PIT monotone counters are exhausted.");
  }
  const modeStats = save.stats[result.mode];
  const roundsDrawn = result.roundsDrawn ?? 0;
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
  next.appliedResultIds = [...next.appliedResultIds, resultId].slice(
    -PIT_SAVE_MAX_APPLIED_RESULT_IDS,
  );
  return { save: next, applied: true };
}

/** Preference mutations advance revision but do not forge a match sequence. */
export function updatePitTrainingPreferences(
  current: PitSaveV1,
  preferences: Partial<PitTrainingPreferences>,
  updatedAt: string,
): PitSaveV1 {
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

export function serializePitSave(value: PitSaveV1): string {
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
  value: PitSaveV1,
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
    storage.removeItem(key);
    return storage.getItem(key) === null
      ? { cleared: true, failure: null }
      : { cleared: false, failure: "write-denied" };
  } catch {
    return { cleared: false, failure: "write-denied" };
  }
}
