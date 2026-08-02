import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../app/game/systems/activeHuntSave.ts", import.meta.url),
  "utf8",
);
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: "activeHuntSave.ts",
  reportDiagnostics: true,
});
const errors = (transpiled.diagnostics ?? []).filter(
  (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
);
assert.deepEqual(errors, []);

const runtime = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`
);

const {
  ACTIVE_HUNT_MAX_COLLECTION_LENGTH,
  ACTIVE_HUNT_MAX_DEPTH,
  ACTIVE_HUNT_MAX_SERIALIZED_BYTES,
  ACTIVE_HUNT_RUNTIME_REVISION,
  ACTIVE_HUNT_SAVE_VERSION,
  ACTIVE_HUNT_STORAGE_KEY,
  checkActiveHuntCompatibility,
  clearActiveHuntSave,
  isBoundedJsonValue,
  loadActiveHuntSave,
  normalizeActiveHuntSave,
  writeActiveHuntSave,
} = runtime;

function activeHunt(overrides = {}) {
  return {
    version: ACTIVE_HUNT_SAVE_VERSION,
    runtimeRevision: ACTIVE_HUNT_RUNTIME_REVISION,
    ownerSaveCreatedAt: "2026-08-01T10:00:00.000Z",
    missionId: "jungle-vey",
    difficultyId: "hunter",
    encounterRun: 3,
    runId: "run-jungle-3",
    sequence: 1,
    startedAt: "2026-08-02T08:00:00.000Z",
    savedAt: "2026-08-02T08:01:00.000Z",
    configuration: {
      loadout: {
        armorId: "hunter",
        weaponIds: ["combistick", "plasma-caster"],
      },
    },
    snapshot: {
      elapsed: 60,
      completedObjectives: ["scan-traces"],
      enemies: [{ id: "wave-a-1", health: 42, alive: true }],
    },
    retryCheckpoint: {
      relayIndex: 1,
      spawnedWaves: ["wave-a"],
    },
    ...overrides,
  };
}

function memoryStorage(initial = []) {
  const values = new Map(initial);
  return {
    values,
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("normalization returns an exact, detached JSON-safe V1 envelope", () => {
  const sourceValue = activeHunt({ ignoredTransient: "not persisted" });
  const normalized = normalizeActiveHuntSave(sourceValue);

  assert.ok(normalized);
  assert.equal(normalized.ignoredTransient, undefined);
  assert.notEqual(normalized.configuration, sourceValue.configuration);
  assert.notEqual(normalized.snapshot, sourceValue.snapshot);
  assert.deepEqual(JSON.parse(JSON.stringify(normalized)), normalized);

  sourceValue.snapshot.enemies[0].health = 0;
  assert.equal(normalized.snapshot.enemies[0].health, 42);
});

test("JSON safety rejects cycles, sparse arrays, accessors and non-finite numbers", () => {
  const cycle = {};
  cycle.self = cycle;
  const sparse = Array(2);
  sparse[0] = "trace";
  const accessor = {};
  Object.defineProperty(accessor, "health", {
    enumerable: true,
    get: () => 100,
  });

  assert.equal(isBoundedJsonValue(cycle), false);
  assert.equal(isBoundedJsonValue(sparse), false);
  assert.equal(isBoundedJsonValue(accessor), false);
  assert.equal(isBoundedJsonValue({ health: Number.NaN }), false);
  assert.equal(isBoundedJsonValue({ damage: Number.POSITIVE_INFINITY }), false);
  assert.equal(normalizeActiveHuntSave(activeHunt({ snapshot: cycle })), null);
});

test("JSON safety enforces collection, recursion and serialized-size budgets", () => {
  const oversizedCollection = Array.from(
    { length: ACTIVE_HUNT_MAX_COLLECTION_LENGTH + 1 },
    (_, index) => index,
  );
  let excessiveDepth = { value: true };
  for (let index = 0; index <= ACTIVE_HUNT_MAX_DEPTH; index += 1) {
    excessiveDepth = { child: excessiveDepth };
  }
  const nearLimitStrings = Object.fromEntries(
    Array.from({ length: ACTIVE_HUNT_MAX_COLLECTION_LENGTH }, (_, index) => [
      `field-${index}`,
      "x".repeat(1_100),
    ]),
  );

  assert.equal(isBoundedJsonValue(oversizedCollection), false);
  assert.equal(isBoundedJsonValue(excessiveDepth), false);
  assert.equal(
    JSON.stringify(activeHunt({ snapshot: nearLimitStrings })).length >
      ACTIVE_HUNT_MAX_SERIALIZED_BYTES,
    true,
  );
  assert.equal(
    normalizeActiveHuntSave(activeHunt({ snapshot: nearLimitStrings })),
    null,
  );
});

test("envelope versions, runtime revisions and counters are validated", () => {
  assert.equal(normalizeActiveHuntSave(activeHunt({ version: 2 })), null);
  assert.equal(
    normalizeActiveHuntSave(activeHunt({ runtimeRevision: 2 }), 1),
    null,
  );
  assert.equal(
    normalizeActiveHuntSave(activeHunt({ encounterRun: -1 })),
    null,
  );
  assert.equal(
    normalizeActiveHuntSave(activeHunt({ sequence: 1.5 })),
    null,
  );
  assert.equal(
    normalizeActiveHuntSave(activeHunt({ savedAt: "not-a-date" })),
    null,
  );
});

test("compatibility identifies every stale campaign/configuration dimension", () => {
  const save = normalizeActiveHuntSave(activeHunt());
  assert.ok(save);
  const compatible = {
    ownerSaveCreatedAt: save.ownerSaveCreatedAt,
    missionId: save.missionId,
    difficultyId: save.difficultyId,
    encounterRun: save.encounterRun,
    missionAvailable: true,
    allowedMissionIds: [save.missionId],
    allowedDifficultyIds: [save.difficultyId],
  };

  assert.deepEqual(checkActiveHuntCompatibility(save, compatible), {
    compatible: true,
    reason: null,
  });
  for (const [change, reason] of [
    [{ runtimeRevision: 2 }, "runtime-revision"],
    [{ ownerSaveCreatedAt: "2025-01-01T00:00:00.000Z" }, "save-owner"],
    [{ missionId: "ice-cryostalker" }, "mission"],
    [{ missionAvailable: false }, "mission-unavailable"],
    [{ difficultyId: "elite" }, "difficulty"],
    [{ encounterRun: save.encounterRun + 1 }, "encounter-run"],
  ]) {
    assert.deepEqual(
      checkActiveHuntCompatibility(save, { ...compatible, ...change }),
      { compatible: false, reason },
    );
  }
});

test("write/load/clear expose successful sidecar storage statuses", () => {
  const storage = memoryStorage();
  const written = writeActiveHuntSave(activeHunt(), { storage });
  assert.equal(written.persisted, true);
  assert.equal(written.failure, null);

  const loaded = loadActiveHuntSave({
    storage,
    compatibility: {
      ownerSaveCreatedAt: written.save.ownerSaveCreatedAt,
      encounterRun: written.save.encounterRun,
      missionAvailable: true,
    },
  });
  assert.equal(loaded.loaded, true);
  assert.equal(loaded.failure, null);
  assert.deepEqual(loaded.save, written.save);

  assert.deepEqual(clearActiveHuntSave({ storage }), {
    cleared: true,
    failure: null,
  });
  assert.equal(loadActiveHuntSave({ storage }).loaded, false);
});

test("a sidecar cannot overwrite the same run with a stale sequence", () => {
  const storage = memoryStorage();
  assert.equal(
    writeActiveHuntSave(activeHunt({ sequence: 5 }), { storage }).persisted,
    true,
  );

  for (const sequence of [4, 5]) {
    const stale = writeActiveHuntSave(activeHunt({ sequence }), { storage });
    assert.equal(stale.persisted, false);
    assert.equal(stale.failure, "stale-sequence");
  }
  assert.equal(
    writeActiveHuntSave(activeHunt({ sequence: 6 }), { storage }).persisted,
    true,
  );
  assert.equal(
    writeActiveHuntSave(
      activeHunt({ runId: "new-run", sequence: 0 }),
      { storage },
    ).persisted,
    true,
  );
});

test("load reports invalid and incompatible persisted envelopes", () => {
  const invalidStorage = memoryStorage([
    ["yautja-long-hunt.active-hunt", "{not-json"],
  ]);
  assert.equal(loadActiveHuntSave({ storage: invalidStorage }).failure, "invalid-save");

  const storage = memoryStorage();
  writeActiveHuntSave(activeHunt(), { storage });
  const incompatible = loadActiveHuntSave({
    storage,
    compatibility: {
      ownerSaveCreatedAt: "2020-01-01T00:00:00.000Z",
      encounterRun: 3,
    },
  });
  assert.equal(incompatible.loaded, false);
  assert.equal(incompatible.failure, "incompatible");
  assert.equal(incompatible.incompatibilityReason, "save-owner");
});

test("storage failures are never mistaken for successful persistence", () => {
  const readBlocked = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {},
    removeItem() {},
  };
  const writeBlocked = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error("quota");
    },
    removeItem() {},
  };
  let tombstone = null;
  const removalBlocked = {
    getItem() {
      return null;
    },
    setItem(key, value) {
      tombstone = [key, value];
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  const clearBlocked = {
    ...removalBlocked,
    setItem() {
      throw new Error("blocked");
    },
  };

  assert.equal(loadActiveHuntSave({ storage: null }).failure, "storage-unavailable");
  assert.equal(loadActiveHuntSave({ storage: readBlocked }).failure, "read-failed");
  assert.equal(
    writeActiveHuntSave(activeHunt(), { storage: readBlocked }).failure,
    "read-failed",
  );
  assert.equal(
    writeActiveHuntSave(activeHunt(), { storage: writeBlocked }).failure,
    "write-failed",
  );
  assert.deepEqual(clearActiveHuntSave({ storage: removalBlocked }), {
    cleared: true,
    failure: null,
  });
  assert.deepEqual(tombstone, [ACTIVE_HUNT_STORAGE_KEY, ""]);
  assert.deepEqual(clearActiveHuntSave({ storage: clearBlocked }), {
    cleared: false,
    failure: "clear-failed",
  });
});
