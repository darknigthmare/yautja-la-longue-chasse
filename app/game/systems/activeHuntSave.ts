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
  | "future-version"
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
  | "stale-run"
  | "protected-save"
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
  | "stale-run"
  | "clear-failed";

export interface ActiveHuntClearOptions extends ActiveHuntStorageOptions {
  /** A terminal callback from an old tab must not remove a newer hunt. */
  expectedRunId?: string;
  /** Preserve a newer autosave even when it still uses the same run id. */
  expectedSequence?: number;
}

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
        Reflect.ownKeys(value).length !== value.length + 1
      ) {
        return false;
      }
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor?.enumerable || !("value" in descriptor) ||
            !validateJsonValue(descriptor.value, depth + 1, budget)) return false;
      }
      return true;
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
  try {
    return validateJsonValue(value, 0, {
      totalNodes: 0,
      ancestors: new Set(),
    });
  } catch {
    // Reject hostile getters/proxies without letting validation crash a hunt.
    return false;
  }
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
  try {
    try {
      if (!isPlainObject(value) || !hasOnlyJsonObjectProperties(value)) return null;
    } catch {
      return null;
    }
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
  } catch {
    return null;
  }
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
  if (isPlainObject(parsed) &&
      (Number(parsed.version) > ACTIVE_HUNT_SAVE_VERSION ||
       Number(parsed.runtimeRevision) > (options.expectedRuntimeRevision ?? ACTIVE_HUNT_RUNTIME_REVISION))) {
    return { save: null, loaded: false, failure: "future-version", incompatibilityReason: null };
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
      if (isPlainObject(currentValue) &&
          (Number(currentValue.version) > ACTIVE_HUNT_SAVE_VERSION ||
           Number(currentValue.runtimeRevision) > (options.expectedRuntimeRevision ?? ACTIVE_HUNT_RUNTIME_REVISION))) {
        return { save, persisted: false, failure: "protected-save" };
      }
      const current = normalizeActiveHuntSave(currentValue);
      // A new run is explicitly cleared by the launch flow. A different run
      // still occupying the key belongs to another session, even if clocks
      // were adjusted or two launches happened in the same millisecond.
      if (current && current.runId !== save.runId) {
        return { save, persisted: false, failure: "stale-run" };
      }
      if (current?.runId === save.runId &&
          (current.ownerSaveCreatedAt !== save.ownerSaveCreatedAt ||
           current.missionId !== save.missionId ||
           current.difficultyId !== save.difficultyId ||
           current.encounterRun !== save.encounterRun ||
           current.startedAt !== save.startedAt)) {
        return { save, persisted: false, failure: "stale-run" };
      }
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
    const serialized = JSON.stringify(save);
    storage.setItem(key, serialized);
    if (storage.getItem(key) !== serialized) return { save, persisted: false, failure: "write-failed" };
    return { save, persisted: true, failure: null };
  } catch {
    return { save, persisted: false, failure: "write-failed" };
  }
}

/**
 * Resume ownership without erasing the recoverable snapshot first. The caller
 * gets a fresh run identity; writers and terminal callbacks from an older tab
 * can no longer update or clear it. This is compare-then-write, not a cross-tab
 * atomic CAS: callers must still recheck ownership before settling a mission.
 */
export function claimActiveHuntSave<
  TConfiguration = JsonObject,
  TSnapshot = JsonObject,
  TRetryCheckpoint = JsonObject,
>(
  expectedCandidate: ActiveHuntSaveV1<TConfiguration, TSnapshot, TRetryCheckpoint>,
  newRunId: string,
  options: ActiveHuntStorageOptions = {},
): ActiveHuntWriteResult<TConfiguration, TSnapshot, TRetryCheckpoint> {
  const expectedRuntimeRevision = options.expectedRuntimeRevision ?? ACTIVE_HUNT_RUNTIME_REVISION;
  const expected = normalizeActiveHuntSave<TConfiguration, TSnapshot, TRetryCheckpoint>(expectedCandidate, expectedRuntimeRevision);
  if (!expected || !validIdentifier(newRunId) || newRunId === expected.runId) {
    return { save: null, persisted: false, failure: "invalid-save" };
  }
  const save = normalizeActiveHuntSave<TConfiguration, TSnapshot, TRetryCheckpoint>({
    ...expected,
    runId: newRunId,
    savedAt: new Date().toISOString(),
  }, expectedRuntimeRevision);
  if (!save) return { save: null, persisted: false, failure: "invalid-save" };
  const storage = storageFromOptions(options);
  if (!storage) return { save, persisted: false, failure: "storage-unavailable" };
  const key = keyFromOptions(options);
  try {
    const serialized = storage.getItem(key);
    if (serialized === null) return { save, persisted: false, failure: "stale-run" };
    if (serializedByteLength(serialized) > ACTIVE_HUNT_MAX_SERIALIZED_BYTES) {
      return { save, persisted: false, failure: "protected-save" };
    }
    let currentValue: unknown;
    try { currentValue = JSON.parse(serialized); }
    catch { return { save, persisted: false, failure: "protected-save" }; }
    const current = normalizeActiveHuntSave(currentValue, expectedRuntimeRevision);
    if (!current) return { save, persisted: false, failure: "protected-save" };
    if (current.runId !== expected.runId) return { save, persisted: false, failure: "stale-run" };
    if (current.sequence !== expected.sequence || JSON.stringify(current) !== JSON.stringify(expected)) {
      return { save, persisted: false, failure: "stale-sequence" };
    }
  } catch {
    return { save, persisted: false, failure: "read-failed" };
  }
  try {
    const serialized = JSON.stringify(save);
    storage.setItem(key, serialized);
    if (storage.getItem(key) !== serialized) return { save, persisted: false, failure: "write-failed" };
    return { save, persisted: true, failure: null };
  } catch {
    // A failed readback is inconclusive; never delete either observed value.
    return { save, persisted: false, failure: "write-failed" };
  }
}

export function clearActiveHuntSave(
  options: ActiveHuntClearOptions = {},
): ActiveHuntClearResult {
  const storage = storageFromOptions(options);
  if (!storage) return { cleared: false, failure: "storage-unavailable" };
  const key = keyFromOptions(options);
  if (options.expectedRunId !== undefined || options.expectedSequence !== undefined) {
    try {
      const serialized = storage.getItem(key);
      if (serialized !== null) {
        if (serializedByteLength(serialized) > ACTIVE_HUNT_MAX_SERIALIZED_BYTES) {
          return { cleared: false, failure: "stale-run" };
        }
        let parsed: unknown;
        try { parsed = JSON.parse(serialized); }
        catch { return { cleared: false, failure: "stale-run" }; }
        // Matching ownership fields cannot authorize an old runtime to erase
        // an envelope it cannot validate, including future formats/revisions.
        const current = normalizeActiveHuntSave(
          parsed,
          options.expectedRuntimeRevision ?? ACTIVE_HUNT_RUNTIME_REVISION,
        );
        if (!current ||
            (options.expectedRunId !== undefined && current.runId !== options.expectedRunId) ||
            (options.expectedSequence !== undefined && current.sequence !== options.expectedSequence)) {
          return { cleared: false, failure: "stale-run" };
        }
      }
    } catch {
      return { cleared: false, failure: "clear-failed" };
    }
  }
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
