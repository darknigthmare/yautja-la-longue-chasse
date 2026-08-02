/**
 * Versioned persistence envelope for an interrupted hunt.
 *
 * The Canvas owns the concrete configuration and snapshot schemas. This
 * sidecar only guarantees that their payloads are bounded, JSON-safe values
 * before they reach localStorage.
 */

export const ACTIVE_HUNT_SAVE_VERSION = 1 as const;
export const ACTIVE_HUNT_RUNTIME_REVISION = 1;
export const ACTIVE_HUNT_STORAGE_KEY = "yautja-long-hunt.active-hunt";

export const ACTIVE_HUNT_MAX_SERIALIZED_BYTES = 512 * 1024;
export const ACTIVE_HUNT_MAX_DEPTH = 16;
export const ACTIVE_HUNT_MAX_COLLECTION_LENGTH = 512;
export const ACTIVE_HUNT_MAX_TOTAL_NODES = 25_000;
export const ACTIVE_HUNT_MAX_STRING_LENGTH = 16_384;

const ACTIVE_HUNT_MAX_IDENTIFIER_LENGTH = 128;
const ACTIVE_HUNT_MAX_OBJECT_KEY_LENGTH = 256;
const ACTIVE_HUNT_MAX_COUNTER = 1_000_000_000;
const UNSAFE_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

export interface ActiveHuntSaveV1<
  TConfiguration = JsonObject,
  TSnapshot = JsonObject,
  TRetryCheckpoint = JsonObject,
> {
  version: typeof ACTIVE_HUNT_SAVE_VERSION;
  runtimeRevision: number;
  ownerSaveCreatedAt: string;
  missionId: string;
  difficultyId: string;
  encounterRun: number;
  runId: string;
  sequence: number;
  startedAt: string;
  savedAt: string;
  configuration: TConfiguration;
  snapshot: TSnapshot;
  retryCheckpoint: TRetryCheckpoint | null;
}

export interface ActiveHuntStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ActiveHuntCompatibilityRequirements {
  ownerSaveCreatedAt: string;
  encounterRun: number;
  runtimeRevision?: number;
  missionId?: string;
  difficultyId?: string;
  missionAvailable?: boolean;
  allowedMissionIds?: readonly string[];
  allowedDifficultyIds?: readonly string[];
}

export type ActiveHuntIncompatibilityReason =
  | "runtime-revision"
  | "save-owner"
  | "mission"
  | "mission-unavailable"
  | "difficulty"
  | "encounter-run";

export type ActiveHuntCompatibilityResult =
  | { compatible: true; reason: null }
  | { compatible: false; reason: ActiveHuntIncompatibilityReason };

export interface ActiveHuntStorageOptions {
  storage?: ActiveHuntStorage | null;
  key?: string;
  expectedRuntimeRevision?: number;
}

export interface ActiveHuntLoadOptions
  extends ActiveHuntStorageOptions {
  compatibility?: ActiveHuntCompatibilityRequirements;
}

export type ActiveHuntLoadFailure =
  | "storage-unavailable"
  | "read-failed"
  | "invalid-save"
  | "incompatible";

export interface ActiveHuntLoadResult<
  TConfiguration = JsonObject,
  TSnapshot = JsonObject,
  TRetryCheckpoint = JsonObject,
> {
  save: ActiveHuntSaveV1<
    TConfiguration,
    TSnapshot,
    TRetryCheckpoint
  > | null;
  loaded: boolean;
  failure: ActiveHuntLoadFailure | null;
  incompatibilityReason: ActiveHuntIncompatibilityReason | null;
}

export type ActiveHuntWriteFailure =
  | "storage-unavailable"
  | "read-failed"
  | "invalid-save"
  | "stale-sequence"
  | "write-failed";

export interface ActiveHuntWriteResult<
  TConfiguration = JsonObject,
  TSnapshot = JsonObject,
  TRetryCheckpoint = JsonObject,
> {
  save: ActiveHuntSaveV1<
    TConfiguration,
    TSnapshot,
    TRetryCheckpoint
  > | null;
  persisted: boolean;
  failure: ActiveHuntWriteFailure | null;
}

export type ActiveHuntClearFailure =
  | "storage-unavailable"
  | "clear-failed";

export interface ActiveHuntClearResult {
  cleared: boolean;
  failure: ActiveHuntClearFailure | null;
}

interface JsonValidationBudget {
  totalNodes: number;
  ancestors: Set<object>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyJsonObjectProperties(value: Record<string, unknown>): boolean {
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== Object.keys(value).length) return false;

  for (const key of ownKeys) {
    if (
      typeof key !== "string" ||
      key.length > ACTIVE_HUNT_MAX_OBJECT_KEY_LENGTH ||
      UNSAFE_OBJECT_KEYS.has(key)
    ) {
      return false;
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) return false;
  }
  return true;
}

function validateJsonValue(
  value: unknown,
  depth: number,
  budget: JsonValidationBudget,
): value is JsonValue {
  budget.totalNodes += 1;
  if (
    budget.totalNodes > ACTIVE_HUNT_MAX_TOTAL_NODES ||
    depth > ACTIVE_HUNT_MAX_DEPTH
  ) {
    return false;
  }

  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    return value.length <= ACTIVE_HUNT_MAX_STRING_LENGTH;
  }
  if (typeof value !== "object") return false;
  if (budget.ancestors.has(value)) return false;

  budget.ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (
        Object.getPrototypeOf(value) !== Array.prototype ||
        value.length > ACTIVE_HUNT_MAX_COLLECTION_LENGTH ||
        Object.keys(value).length !== value.length ||
        Object.getOwnPropertySymbols(value).length > 0
      ) {
        return false;
      }
      return value.every((entry) =>
        validateJsonValue(entry, depth + 1, budget),
      );
    }

    if (!isPlainObject(value)) return false;
    const keys = Object.keys(value);
    if (
      keys.length > ACTIVE_HUNT_MAX_COLLECTION_LENGTH ||
      !hasOnlyJsonObjectProperties(value)
    ) {
      return false;
    }
    return keys.every((key) =>
      validateJsonValue(value[key], depth + 1, budget),
    );
  } finally {
    budget.ancestors.delete(value);
  }
}

export function isBoundedJsonValue(value: unknown): value is JsonValue {
  return validateJsonValue(value, 0, {
    totalNodes: 0,
    ancestors: new Set(),
  });
}

function serializedByteLength(serialized: string): number {
  return new TextEncoder().encode(serialized).byteLength;
}

function cloneBoundedJsonValue(value: unknown): JsonValue | null {
  if (!isBoundedJsonValue(value)) return null;
  try {
    const serialized = JSON.stringify(value);
    if (
      serializedByteLength(serialized) > ACTIVE_HUNT_MAX_SERIALIZED_BYTES
    ) {
      return null;
    }
    return JSON.parse(serialized) as JsonValue;
  } catch {
    return null;
  }
}

function validIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= ACTIVE_HUNT_MAX_IDENTIFIER_LENGTH
  );
}

function validIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= ACTIVE_HUNT_MAX_IDENTIFIER_LENGTH &&
    !Number.isNaN(Date.parse(value))
  );
}

function validCounter(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= ACTIVE_HUNT_MAX_COUNTER
  );
}

export function normalizeActiveHuntSave<
  TConfiguration = JsonObject,
  TSnapshot = JsonObject,
  TRetryCheckpoint = JsonObject,
>(
  value: unknown,
  expectedRuntimeRevision?: number,
): ActiveHuntSaveV1<TConfiguration, TSnapshot, TRetryCheckpoint> | null {
  if (!isPlainObject(value)) return null;
  if (value.version !== ACTIVE_HUNT_SAVE_VERSION) return null;
  if (
    !validCounter(value.runtimeRevision) ||
    value.runtimeRevision === 0 ||
    (expectedRuntimeRevision !== undefined &&
      value.runtimeRevision !== expectedRuntimeRevision)
  ) {
    return null;
  }
  if (
    !validIsoDate(value.ownerSaveCreatedAt) ||
    !validIdentifier(value.missionId) ||
    !validIdentifier(value.difficultyId) ||
    !validCounter(value.encounterRun) ||
    !validIdentifier(value.runId) ||
    !validCounter(value.sequence) ||
    !validIsoDate(value.startedAt) ||
    !validIsoDate(value.savedAt) ||
    !isPlainObject(value.configuration) ||
    !isPlainObject(value.snapshot) ||
    (value.retryCheckpoint !== null &&
      !isPlainObject(value.retryCheckpoint))
  ) {
    return null;
  }

  const configuration = cloneBoundedJsonValue(value.configuration);
  const snapshot = cloneBoundedJsonValue(value.snapshot);
  const retryCheckpoint =
    value.retryCheckpoint === null
      ? null
      : cloneBoundedJsonValue(value.retryCheckpoint);
  if (
    configuration === null ||
    snapshot === null ||
    (value.retryCheckpoint !== null && retryCheckpoint === null)
  ) {
    return null;
  }

  const normalized = {
    version: ACTIVE_HUNT_SAVE_VERSION,
    runtimeRevision: value.runtimeRevision,
    ownerSaveCreatedAt: value.ownerSaveCreatedAt,
    missionId: value.missionId,
    difficultyId: value.difficultyId,
    encounterRun: value.encounterRun,
    runId: value.runId,
    sequence: value.sequence,
    startedAt: value.startedAt,
    savedAt: value.savedAt,
    configuration,
    snapshot,
    retryCheckpoint,
  };
  const boundedEnvelope = cloneBoundedJsonValue(normalized);
  if (!boundedEnvelope || !isPlainObject(boundedEnvelope)) return null;
  return boundedEnvelope as unknown as ActiveHuntSaveV1<
    TConfiguration,
    TSnapshot,
    TRetryCheckpoint
  >;
}

export function checkActiveHuntCompatibility(
  save: ActiveHuntSaveV1<unknown, unknown, unknown>,
  requirements: ActiveHuntCompatibilityRequirements,
): ActiveHuntCompatibilityResult {
  if (
    save.runtimeRevision !==
    (requirements.runtimeRevision ?? ACTIVE_HUNT_RUNTIME_REVISION)
  ) {
    return { compatible: false, reason: "runtime-revision" };
  }
  if (save.ownerSaveCreatedAt !== requirements.ownerSaveCreatedAt) {
    return { compatible: false, reason: "save-owner" };
  }
  if (
    requirements.missionId !== undefined &&
    save.missionId !== requirements.missionId
  ) {
    return { compatible: false, reason: "mission" };
  }
  if (
    requirements.allowedMissionIds !== undefined &&
    !requirements.allowedMissionIds.includes(save.missionId)
  ) {
    return { compatible: false, reason: "mission" };
  }
  if (requirements.missionAvailable === false) {
    return { compatible: false, reason: "mission-unavailable" };
  }
  if (
    requirements.difficultyId !== undefined &&
    save.difficultyId !== requirements.difficultyId
  ) {
    return { compatible: false, reason: "difficulty" };
  }
  if (
    requirements.allowedDifficultyIds !== undefined &&
    !requirements.allowedDifficultyIds.includes(save.difficultyId)
  ) {
    return { compatible: false, reason: "difficulty" };
  }
  if (save.encounterRun !== requirements.encounterRun) {
    return { compatible: false, reason: "encounter-run" };
  }
  return { compatible: true, reason: null };
}

function browserStorage(): ActiveHuntStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function storageFromOptions(
  options: ActiveHuntStorageOptions,
): ActiveHuntStorage | null {
  return options.storage === undefined ? browserStorage() : options.storage;
}

function keyFromOptions(options: ActiveHuntStorageOptions): string {
  return options.key ?? ACTIVE_HUNT_STORAGE_KEY;
}

export function loadActiveHuntSave<
  TConfiguration = JsonObject,
  TSnapshot = JsonObject,
  TRetryCheckpoint = JsonObject,
>(
  options: ActiveHuntLoadOptions = {},
): ActiveHuntLoadResult<TConfiguration, TSnapshot, TRetryCheckpoint> {
  const storage = storageFromOptions(options);
  if (!storage) {
    return {
      save: null,
      loaded: false,
      failure: "storage-unavailable",
      incompatibilityReason: null,
    };
  }

  let serialized: string | null;
  try {
    serialized = storage.getItem(keyFromOptions(options));
  } catch {
    return {
      save: null,
      loaded: false,
      failure: "read-failed",
      incompatibilityReason: null,
    };
  }
  if (serialized === null) {
    return {
      save: null,
      loaded: false,
      failure: null,
      incompatibilityReason: null,
    };
  }
  if (serializedByteLength(serialized) > ACTIVE_HUNT_MAX_SERIALIZED_BYTES) {
    return {
      save: null,
      loaded: false,
      failure: "invalid-save",
      incompatibilityReason: null,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return {
      save: null,
      loaded: false,
      failure: "invalid-save",
      incompatibilityReason: null,
    };
  }
  const save = normalizeActiveHuntSave<
    TConfiguration,
    TSnapshot,
    TRetryCheckpoint
  >(
    parsed,
    options.expectedRuntimeRevision ?? ACTIVE_HUNT_RUNTIME_REVISION,
  );
  if (!save) {
    return {
      save: null,
      loaded: false,
      failure: "invalid-save",
      incompatibilityReason: null,
    };
  }
  if (options.compatibility) {
    const compatibility = checkActiveHuntCompatibility(
      save,
      options.compatibility,
    );
    if (!compatibility.compatible) {
      return {
        save: null,
        loaded: false,
        failure: "incompatible",
        incompatibilityReason: compatibility.reason,
      };
    }
  }
  return {
    save,
    loaded: true,
    failure: null,
    incompatibilityReason: null,
  };
}

export function writeActiveHuntSave<
  TConfiguration = JsonObject,
  TSnapshot = JsonObject,
  TRetryCheckpoint = JsonObject,
>(
  value: ActiveHuntSaveV1<TConfiguration, TSnapshot, TRetryCheckpoint>,
  options: ActiveHuntStorageOptions = {},
): ActiveHuntWriteResult<TConfiguration, TSnapshot, TRetryCheckpoint> {
  const save = normalizeActiveHuntSave<
    TConfiguration,
    TSnapshot,
    TRetryCheckpoint
  >(
    value,
    options.expectedRuntimeRevision ?? ACTIVE_HUNT_RUNTIME_REVISION,
  );
  if (!save) return { save: null, persisted: false, failure: "invalid-save" };

  const storage = storageFromOptions(options);
  if (!storage) {
    return { save, persisted: false, failure: "storage-unavailable" };
  }
  const key = keyFromOptions(options);
  try {
    const currentSerialized = storage.getItem(key);
    if (
      currentSerialized !== null &&
      serializedByteLength(currentSerialized) <=
        ACTIVE_HUNT_MAX_SERIALIZED_BYTES
    ) {
      let currentValue: unknown = null;
      try {
        currentValue = JSON.parse(currentSerialized);
      } catch {
        // A corrupt sidecar must not prevent a valid new run from replacing it.
      }
      const current = normalizeActiveHuntSave(currentValue);
      if (
        current?.runId === save.runId &&
        current.sequence >= save.sequence
      ) {
        return { save, persisted: false, failure: "stale-sequence" };
      }
    }
  } catch {
    return { save, persisted: false, failure: "read-failed" };
  }

  try {
    storage.setItem(key, JSON.stringify(save));
    return { save, persisted: true, failure: null };
  } catch {
    return { save, persisted: false, failure: "write-failed" };
  }
}

export function clearActiveHuntSave(
  options: ActiveHuntStorageOptions = {},
): ActiveHuntClearResult {
  const storage = storageFromOptions(options);
  if (!storage) return { cleared: false, failure: "storage-unavailable" };
  const key = keyFromOptions(options);
  try {
    storage.removeItem(key);
    return { cleared: true, failure: null };
  } catch {
    try {
      // Some restricted stores reject removal while still allowing writes. An
      // empty tombstone is deliberately not a valid envelope and therefore can
      // never resurrect a compatible interrupted hunt.
      storage.setItem(key, "");
      return { cleared: true, failure: null };
    } catch {
      return { cleared: false, failure: "clear-failed" };
    }
  }
}
