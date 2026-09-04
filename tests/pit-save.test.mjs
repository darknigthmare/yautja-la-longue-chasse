import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../app/game/systems/pitSave.ts", import.meta.url),
  "utf8",
);
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: "pitSave.ts",
  reportDiagnostics: true,
});
const diagnostics = (transpiled.diagnostics ?? []).filter(
  (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
);
assert.deepEqual(diagnostics, []);

const runtime = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`
);

const {
  PIT_SAVE_RUNTIME_REVISION,
  PIT_SAVE_STORAGE_KEY,
  PIT_SAVE_VERSION,
  applyPitResult,
  clearPitSave,
  createPitSave,
  loadPitSave,
  normalizePitSave,
  pitSaveStorageKey,
  serializePitSave,
  updatePitTrainingPreferences,
  writePitSave,
} = runtime;

const OWNER = "2026-09-04T10:00:00.000Z";

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

function result(overrides = {}) {
  return {
    id: "pit-result-001",
    mode: "cpu",
    outcome: "victory",
    fighterId: "jungle-hunter",
    roundsWon: 2,
    roundsLost: 1,
    completedAt: "2026-09-04T10:05:00.000Z",
    ...overrides,
  };
}

test("a PIT V1 save round-trips through its dedicated storage key", () => {
  const storage = memoryStorage();
  const initial = createPitSave(OWNER);
  const first = applyPitResult(initial, result()).save;
  const changed = updatePitTrainingPreferences(
    first,
    { guard: "alternating", showFrameData: true },
    "2026-09-04T10:06:00.000Z",
  );

  assert.equal(writePitSave(changed, { storage }).persisted, true);
  assert.equal(storage.values.has(PIT_SAVE_STORAGE_KEY), true);
  const loaded = loadPitSave({ storage, expectedOwnerSaveCreatedAt: OWNER });
  assert.equal(loaded.loaded, true);
  assert.equal(loaded.failure, null);
  assert.deepEqual(loaded.save, changed);
  assert.equal(loaded.save.sequence, 1);
  assert.equal(loaded.save.revision, 2);
  assert.equal(loaded.save.stats.cpu.matches, 1);
  assert.equal(loaded.save.stats.cpu.roundsPlayed, 3);
  assert.equal(loaded.save.trainingPreferences.guard, "alternating");
  assert.doesNotMatch(JSON.stringify(loaded.save), /honor|clanMarks|trophies|inventory/);
  assert.deepEqual(JSON.parse(serializePitSave(changed)), changed);
});

test("normalization migrates the V0 draft and repairs derived counters", () => {
  const migrated = normalizePitSave({
    version: 0,
    ownerSaveCreatedAt: OWNER,
    stats: {
      cpu: { wins: 3, losses: 2, matches: 1, rounds: 2, roundsWon: 6, roundsLost: 4 },
      local: { victories: 1 },
    },
    lastFighterId: "berserker",
    trainingPreferences: { opponentId: "jungle-hunter", guard: "low", showHitboxes: true },
    appliedResultIds: ["one", "one", "two", ""],
  });

  assert.ok(migrated);
  assert.equal(migrated.version, PIT_SAVE_VERSION);
  assert.equal(migrated.runtimeRevision, PIT_SAVE_RUNTIME_REVISION);
  assert.equal(migrated.createdAt, OWNER);
  assert.equal(migrated.revision, 0);
  assert.equal(migrated.sequence, 0);
  assert.deepEqual(migrated.appliedResultIds, ["one", "two"]);
  assert.equal(migrated.stats.cpu.matches, 5);
  assert.equal(migrated.stats.cpu.roundsPlayed, 10);
  assert.equal(migrated.stats.training.matches, 0);
  assert.equal(migrated.trainingPreferences.showHitboxes, true);
  assert.equal(normalizePitSave({ version: 1 }), null, "owner is mandatory");
});

test("corrupt and future sidecars have distinct load statuses", () => {
  const corrupt = memoryStorage([[PIT_SAVE_STORAGE_KEY, "{broken"]]);
  assert.equal(loadPitSave({ storage: corrupt }).failure, "corrupt-save");

  for (const payload of [
    { ...createPitSave(OWNER), version: PIT_SAVE_VERSION + 1 },
    { ...createPitSave(OWNER), runtimeRevision: PIT_SAVE_RUNTIME_REVISION + 1 },
  ]) {
    const storage = memoryStorage([[PIT_SAVE_STORAGE_KEY, JSON.stringify(payload)]]);
    assert.equal(loadPitSave({ storage }).failure, "future-version");
    assert.equal(writePitSave({ ...createPitSave(OWNER), revision: 1 }, { storage }).failure, "future-version");
    assert.equal(storage.getItem(PIT_SAVE_STORAGE_KEY), JSON.stringify(payload));
  }
});

test("load and write enforce campaign ownership", () => {
  const storage = memoryStorage();
  const save = { ...createPitSave(OWNER), revision: 1 };
  assert.equal(writePitSave(save, { storage }).persisted, true);
  assert.equal(
    loadPitSave({ storage, expectedOwnerSaveCreatedAt: "2026-09-01T00:00:00.000Z" }).failure,
    "owner-conflict",
  );
  const foreign = {
    ...createPitSave("2026-09-02T00:00:00.000Z"),
    revision: 2,
    sequence: 1,
  };
  assert.equal(writePitSave(foreign, { storage }).failure, "owner-conflict");
  assert.equal(JSON.parse(storage.getItem(PIT_SAVE_STORAGE_KEY)).ownerSaveCreatedAt, OWNER);
});

test("storage rejects stale sequence and revision while accepting preference revisions", () => {
  const storage = memoryStorage();
  const base = applyPitResult(createPitSave(OWNER), result()).save;
  assert.equal(writePitSave(base, { storage }).persisted, true);
  assert.equal(
    writePitSave({ ...base, revision: base.revision + 1, sequence: 0 }, { storage }).failure,
    "stale-sequence",
  );
  assert.equal(
    writePitSave({ ...base }, { storage }).failure,
    "stale-revision",
  );
  const preferenceOnly = updatePitTrainingPreferences(
    base,
    { showHitboxes: true },
    "2026-09-04T10:07:00.000Z",
  );
  assert.equal(preferenceOnly.sequence, base.sequence);
  assert.equal(writePitSave(preferenceOnly, { storage }).persisted, true);
});

test("quota and denied writes are reported and never claimed as persisted", () => {
  const quota = {
    getItem() { return null; },
    setItem() {
      const error = new Error("full");
      error.name = "QuotaExceededError";
      throw error;
    },
  };
  const denied = {
    getItem() { return null; },
    setItem() { throw new Error("blocked"); },
  };
  const dropped = { getItem() { return null; }, setItem() {} };
  const save = createPitSave(OWNER);

  assert.equal(writePitSave(save, { storage: null }).failure, "storage-unavailable");
  assert.equal(writePitSave(save, { storage: quota }).failure, "quota-exceeded");
  assert.equal(writePitSave(save, { storage: denied }).failure, "write-denied");
  assert.equal(writePitSave(save, { storage: dropped }).failure, "write-denied");
});

test("applying a result is idempotent and isolates statistics by mode", () => {
  const initial = createPitSave(OWNER);
  const first = applyPitResult(initial, result());
  const duplicate = applyPitResult(first.save, result({ outcome: "defeat", roundsWon: 0, roundsLost: 2 }));
  const local = applyPitResult(first.save, result({
    id: "pit-result-002",
    mode: "local",
    outcome: "draw",
    fighterId: "berserker",
    roundsWon: 1,
    roundsLost: 1,
    roundsDrawn: 1,
    completedAt: "2026-09-04T10:10:00.000Z",
  }));

  assert.equal(first.applied, true);
  assert.equal(duplicate.applied, false);
  assert.deepEqual(duplicate.save, first.save);
  assert.equal(local.save.sequence, 2);
  assert.equal(local.save.revision, 2);
  assert.equal(local.save.stats.cpu.victories, 1);
  assert.equal(local.save.stats.cpu.defeats, 0);
  assert.equal(local.save.stats.local.draws, 1);
  assert.equal(local.save.stats.local.roundsPlayed, 3);
  assert.equal(local.save.lastFighterId, "berserker");
  assert.deepEqual(local.save.appliedResultIds, ["pit-result-001", "pit-result-002"]);
  assert.equal(initial.stats.cpu.matches, 0, "the reducer does not mutate its input");
});

test("campaign owners use isolated PIT storage namespaces", () => {
  const otherOwner = "2026-09-05T10:00:00.000Z";
  const ownerKey = pitSaveStorageKey(OWNER);
  const otherKey = pitSaveStorageKey(otherOwner);
  const storage = memoryStorage();

  assert.notEqual(ownerKey, otherKey);
  assert.match(ownerKey, new RegExp(`^${PIT_SAVE_STORAGE_KEY}\.`));
  assert.equal(
    writePitSave({ ...createPitSave(OWNER), revision: 1 }, { storage, key: ownerKey }).persisted,
    true,
  );
  assert.equal(loadPitSave({
    storage,
    key: otherKey,
    expectedOwnerSaveCreatedAt: otherOwner,
  }).save, null);
  assert.equal(storage.values.has(ownerKey), true);
  assert.equal(storage.values.has(otherKey), false);
  assert.throws(() => pitSaveStorageKey("not-a-date"));
});

test("namespace validation and confirmed reset protect campaign ownership", () => {
  const ownerKey = pitSaveStorageKey(OWNER);
  const wrongKey = pitSaveStorageKey("2026-09-06T10:00:00.000Z");
  const storage = memoryStorage();
  const save = { ...createPitSave(OWNER), revision: 1 };

  assert.equal(
    writePitSave(save, {
      storage,
      key: wrongKey,
      expectedOwnerSaveCreatedAt: OWNER,
    }).failure,
    "owner-conflict",
  );
  assert.equal(
    writePitSave(save, { storage, key: wrongKey }).failure,
    "owner-conflict",
  );
  assert.equal(
    loadPitSave({
      storage,
      key: wrongKey,
      expectedOwnerSaveCreatedAt: OWNER,
    }).failure,
    "owner-conflict",
  );

  assert.equal(writePitSave(save, {
    storage,
    key: ownerKey,
    expectedOwnerSaveCreatedAt: OWNER,
  }).persisted, true);
  assert.equal(clearPitSave(OWNER, { storage }).cleared, true);
  assert.equal(storage.getItem(ownerKey), null);
  assert.equal(clearPitSave(OWNER, { storage }).cleared, true);

  storage.setItem(
    ownerKey,
    JSON.stringify(createPitSave("2026-09-07T10:00:00.000Z")),
  );
  const conflict = clearPitSave(OWNER, { storage });
  assert.equal(conflict.cleared, false);
  assert.equal(conflict.failure, "owner-conflict");
  assert.notEqual(storage.getItem(ownerKey), null);
});
