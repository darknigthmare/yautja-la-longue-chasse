import {
  PIT_REPLAY_VERSION,
  normalizePitReplay,
  serializePitReplay,
  type PitReplay,
} from "./pitReplay";
import { PIT_STATE_VERSION } from "./pitCombat";

/**
 * Campaign-owned persistence for the latest THE PIT replay.
 *
 * Replays deliberately live outside both the campaign save and the PIT stats
 * sidecar. A corrupt or oversized recording can therefore never invalidate
 * progression or match statistics.
 */
export const PIT_REPLAY_STORAGE_VERSION = 1 as const;
export const PIT_REPLAY_STORAGE_KEY = "yautja-long-hunt.the-pit.replay";
export const PIT_REPLAY_STORAGE_MAX_SERIALIZED_BYTES = 96 * 1024;

const MAX_REVISION = 1_000_000_000;

export interface PitReplayArchiveV1 {
  version: typeof PIT_REPLAY_STORAGE_VERSION;
  ownerSaveCreatedAt: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  latestReplay: PitReplay | null;
}

export interface PitReplayStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface PitReplayStorageOptions {
  ownerSaveCreatedAt: string;
  storage?: PitReplayStorage | null;
  key?: string;
}

export type PitReplayStorageLoadFailure =
  | "storage-unavailable"
  | "read-failed"
  | "corrupt-save"
  | "future-version"
  | "owner-conflict";

export interface PitReplayStorageLoadResult {
  archive: PitReplayArchiveV1 | null;
  loaded: boolean;
  failure: PitReplayStorageLoadFailure | null;
}

export type PitReplayStorageWriteFailure =
  | "storage-unavailable"
  | "read-failed"
  | "corrupt-save"
  | "future-version"
  | "owner-conflict"
  | "stale-revision"
  | "quota-exceeded"
  | "write-denied";

export interface PitReplayStorageWriteResult {
  archive: PitReplayArchiveV1 | null;
  persisted: boolean;
  failure: PitReplayStorageWriteFailure | null;
}

export type PitReplayStorageClearFailure =
  | "storage-unavailable"
  | "read-failed"
  | "owner-conflict"
  | "write-denied";

export interface PitReplayStorageClearResult {
  cleared: boolean;
  failure: PitReplayStorageClearFailure | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function isValidIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isRevision(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_REVISION
  );
}

function serializedByteLength(serialized: string): number {
  return new TextEncoder().encode(serialized).byteLength;
}

function hasFutureVersion(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (
    typeof value.version === "number" &&
    Number.isFinite(value.version) &&
    value.version > PIT_REPLAY_STORAGE_VERSION
  ) {
    return true;
  }
  if (!isRecord(value.latestReplay)) return false;
  return (
    (typeof value.latestReplay.version === "number" &&
      Number.isFinite(value.latestReplay.version) &&
      value.latestReplay.version > PIT_REPLAY_VERSION) ||
    (typeof value.latestReplay.engineVersion === "number" &&
      Number.isFinite(value.latestReplay.engineVersion) &&
      value.latestReplay.engineVersion > PIT_STATE_VERSION)
  );
}

function browserStorage(): PitReplayStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function storageFromOptions(
  options: PitReplayStorageOptions,
): PitReplayStorage | null {
  return options.storage === undefined ? browserStorage() : options.storage;
}

function expectedKey(options: PitReplayStorageOptions): string | null {
  try {
    const namespaced = pitReplayStorageKey(options.ownerSaveCreatedAt);
    return options.key === undefined || options.key === namespaced
      ? namespaced
      : null;
  } catch {
    return null;
  }
}

function isQuotaError(error: unknown): boolean {
  if (
    (typeof error !== "object" && typeof error !== "function") ||
    error === null
  ) {
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

function cloneArchive(archive: PitReplayArchiveV1): PitReplayArchiveV1 {
  return JSON.parse(JSON.stringify(archive)) as PitReplayArchiveV1;
}

/** Return the only storage key allowed for one campaign owner. */
export function pitReplayStorageKey(ownerSaveCreatedAt: string): string {
  if (!isValidIsoDate(ownerSaveCreatedAt)) {
    throw new Error("THE PIT replay storage key requires a valid campaign owner.");
  }
  return `${PIT_REPLAY_STORAGE_KEY}.${encodeURIComponent(ownerSaveCreatedAt)}`;
}

export function createPitReplayArchive(
  ownerSaveCreatedAt: string,
  createdAt = ownerSaveCreatedAt,
): PitReplayArchiveV1 {
  if (!isValidIsoDate(ownerSaveCreatedAt) || !isValidIsoDate(createdAt)) {
    throw new Error("THE PIT replay archive requires valid timestamps.");
  }
  return {
    version: PIT_REPLAY_STORAGE_VERSION,
    ownerSaveCreatedAt,
    revision: 0,
    createdAt,
    updatedAt: createdAt,
    latestReplay: null,
  };
}

/** Normalize and detach an archive, including its nested replay. */
export function normalizePitReplayArchive(
  value: unknown,
): PitReplayArchiveV1 | null {
  try {
    if (!isRecord(value) || hasFutureVersion(value)) return null;
    if (value.version !== PIT_REPLAY_STORAGE_VERSION) return null;
    if (
      !isValidIsoDate(value.ownerSaveCreatedAt) ||
      !isRevision(value.revision) ||
      !isValidIsoDate(value.createdAt) ||
      !isValidIsoDate(value.updatedAt)
    ) {
      return null;
    }
    const latestReplay =
      value.latestReplay === null
        ? null
        : normalizePitReplay(value.latestReplay);
    if (value.latestReplay !== null && !latestReplay) return null;
    if (latestReplay) {
      // Reuse the replay module's own byte and deep-shape validation.
      serializePitReplay(latestReplay);
    }
    const normalized: PitReplayArchiveV1 = {
      version: PIT_REPLAY_STORAGE_VERSION,
      ownerSaveCreatedAt: value.ownerSaveCreatedAt,
      revision: value.revision,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
      latestReplay,
    };
    const serialized = JSON.stringify(normalized);
    if (
      serializedByteLength(serialized) >
      PIT_REPLAY_STORAGE_MAX_SERIALIZED_BYTES
    ) {
      return null;
    }
    return JSON.parse(serialized) as PitReplayArchiveV1;
  } catch {
    return null;
  }
}

export function serializePitReplayArchive(value: unknown): string {
  const archive = normalizePitReplayArchive(value);
  if (!archive) throw new Error("Cannot serialize an invalid THE PIT replay archive.");
  const serialized = JSON.stringify(archive);
  if (
    serializedByteLength(serialized) >
    PIT_REPLAY_STORAGE_MAX_SERIALIZED_BYTES
  ) {
    throw new Error("THE PIT replay archive exceeds its storage budget.");
  }
  return serialized;
}

export function withLatestPitReplay(
  current: PitReplayArchiveV1,
  replay: unknown,
  updatedAt: string,
): PitReplayArchiveV1 {
  const archive = normalizePitReplayArchive(current);
  const normalizedReplay = normalizePitReplay(replay);
  if (
    !archive ||
    !normalizedReplay ||
    !isValidIsoDate(updatedAt) ||
    archive.revision >= MAX_REVISION
  ) {
    throw new Error("Invalid THE PIT replay archive update.");
  }
  serializePitReplay(normalizedReplay);
  const next: PitReplayArchiveV1 = {
    ...cloneArchive(archive),
    revision: archive.revision + 1,
    updatedAt,
    latestReplay: normalizedReplay,
  };
  if (!normalizePitReplayArchive(next)) {
    throw new Error("THE PIT replay archive exceeds its storage budget.");
  }
  return next;
}

export function loadPitReplayArchive(
  options: PitReplayStorageOptions,
): PitReplayStorageLoadResult {
  const key = expectedKey(options);
  if (!key) return { archive: null, loaded: false, failure: "owner-conflict" };
  const storage = storageFromOptions(options);
  if (!storage) {
    return { archive: null, loaded: false, failure: "storage-unavailable" };
  }
  let serialized: string | null;
  try {
    serialized = storage.getItem(key);
  } catch {
    return { archive: null, loaded: false, failure: "read-failed" };
  }
  if (serialized === null) {
    return { archive: null, loaded: false, failure: null };
  }
  if (
    serializedByteLength(serialized) >
    PIT_REPLAY_STORAGE_MAX_SERIALIZED_BYTES
  ) {
    return { archive: null, loaded: false, failure: "corrupt-save" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    return { archive: null, loaded: false, failure: "corrupt-save" };
  }
  if (hasFutureVersion(parsed)) {
    return { archive: null, loaded: false, failure: "future-version" };
  }
  const archive = normalizePitReplayArchive(parsed);
  if (!archive) {
    return { archive: null, loaded: false, failure: "corrupt-save" };
  }
  if (archive.ownerSaveCreatedAt !== options.ownerSaveCreatedAt) {
    return { archive: null, loaded: false, failure: "owner-conflict" };
  }
  return { archive, loaded: true, failure: null };
}

export function writePitReplayArchive(
  value: unknown,
  options: PitReplayStorageOptions,
): PitReplayStorageWriteResult {
  if (hasFutureVersion(value)) {
    return { archive: null, persisted: false, failure: "future-version" };
  }
  const archive = normalizePitReplayArchive(value);
  if (!archive) {
    return { archive: null, persisted: false, failure: "corrupt-save" };
  }
  const key = expectedKey(options);
  if (
    !key ||
    archive.ownerSaveCreatedAt !== options.ownerSaveCreatedAt
  ) {
    return { archive, persisted: false, failure: "owner-conflict" };
  }
  const storage = storageFromOptions(options);
  if (!storage) {
    return { archive, persisted: false, failure: "storage-unavailable" };
  }

  try {
    const currentSerialized = storage.getItem(key);
    if (currentSerialized !== null) {
      if (
        serializedByteLength(currentSerialized) >
        PIT_REPLAY_STORAGE_MAX_SERIALIZED_BYTES
      ) {
        return { archive, persisted: false, failure: "corrupt-save" };
      }
      let currentValue: unknown;
      try {
        currentValue = JSON.parse(currentSerialized) as unknown;
      } catch {
        return { archive, persisted: false, failure: "corrupt-save" };
      }
      if (hasFutureVersion(currentValue)) {
        return { archive, persisted: false, failure: "future-version" };
      }
      const current = normalizePitReplayArchive(currentValue);
      if (!current) {
        return { archive, persisted: false, failure: "corrupt-save" };
      }
      if (current.ownerSaveCreatedAt !== archive.ownerSaveCreatedAt) {
        return { archive, persisted: false, failure: "owner-conflict" };
      }
      if (archive.revision <= current.revision) {
        return { archive, persisted: false, failure: "stale-revision" };
      }
    }
  } catch {
    return { archive, persisted: false, failure: "read-failed" };
  }

  let serialized: string;
  try {
    serialized = serializePitReplayArchive(archive);
  } catch {
    return { archive, persisted: false, failure: "corrupt-save" };
  }
  try {
    storage.setItem(key, serialized);
    if (storage.getItem(key) !== serialized) {
      return { archive, persisted: false, failure: "write-denied" };
    }
    return { archive, persisted: true, failure: null };
  } catch (error) {
    return {
      archive,
      persisted: false,
      failure: isQuotaError(error) ? "quota-exceeded" : "write-denied",
    };
  }
}

/** Delete only the namespace derived from the confirmed campaign owner. */
export function clearPitReplayArchive(
  options: PitReplayStorageOptions,
): PitReplayStorageClearResult {
  const key = expectedKey(options);
  if (!key) return { cleared: false, failure: "owner-conflict" };
  const storage = storageFromOptions(options);
  if (!storage) return { cleared: false, failure: "storage-unavailable" };
  if (typeof storage.removeItem !== "function") {
    return { cleared: false, failure: "write-denied" };
  }
  let serialized: string | null;
  try {
    serialized = storage.getItem(key);
  } catch {
    return { cleared: false, failure: "read-failed" };
  }
  if (serialized !== null) {
    try {
      const parsed = JSON.parse(serialized) as unknown;
      if (
        isRecord(parsed) &&
        isValidIsoDate(parsed.ownerSaveCreatedAt) &&
        parsed.ownerSaveCreatedAt !== options.ownerSaveCreatedAt
      ) {
        return { cleared: false, failure: "owner-conflict" };
      }
    } catch {
      // The exact owner-derived namespace can safely discard corrupt data.
    }
  }
  try {
    storage.removeItem(key);
    return storage.getItem(key) === null
      ? { cleared: true, failure: null }
      : { cleared: false, failure: "write-denied" };
  } catch {
    return { cleared: false, failure: "write-denied" };
  }
}
