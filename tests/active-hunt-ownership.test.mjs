import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVE_HUNT_SAVE_VERSION, ACTIVE_HUNT_RUNTIME_REVISION, ACTIVE_HUNT_STORAGE_KEY,
  claimActiveHuntSave, clearActiveHuntSave, loadActiveHuntSave, writeActiveHuntSave,
} from "../app/game/systems/activeHuntSave.ts";

function candidate(overrides = {}) {
  return { version: ACTIVE_HUNT_SAVE_VERSION, runtimeRevision: ACTIVE_HUNT_RUNTIME_REVISION,
    ownerSaveCreatedAt: "2026-08-01T10:00:00.000Z", missionId: "jungle-vey", difficultyId: "hunter", encounterRun: 3,
    runId: "original-run", sequence: 8, startedAt: "2026-08-02T08:00:00.000Z", savedAt: "2026-08-02T08:01:00.000Z",
    configuration: { loadout: { armorId: "hunter" }, elapsedSeconds: 60 }, snapshot: { player: { health: 80 }, elapsed: 60 }, retryCheckpoint: { relay: 1 }, ...overrides };
}
function fixture(initial = candidate()) {
  const values = new Map([[ACTIVE_HUNT_STORAGE_KEY, JSON.stringify(initial)]]);
  const calls = [];
  const storage = { getItem: key => values.get(key) ?? null,
    setItem(key, value) { calls.push(["set", key]); values.set(key, value); },
    removeItem(key) { calls.push(["remove", key]); values.delete(key); } };
  return { initial, values, calls, storage };
}

test("resume claims a fresh identity while preserving the recoverable hunt payload", () => {
  const f = fixture(); const expected = loadActiveHuntSave({ storage: f.storage }).save;
  const result = claimActiveHuntSave(expected, "resumed-tab-a", { storage: f.storage });
  assert.equal(result.persisted, true); assert.equal(result.failure, null);
  assert.equal(result.save.runId, "resumed-tab-a");
  assert.equal(result.save.sequence, expected.sequence);
  assert.equal(result.save.startedAt, expected.startedAt);
  assert.equal(result.save.ownerSaveCreatedAt, expected.ownerSaveCreatedAt);
  for (const field of ["snapshot", "configuration", "retryCheckpoint"]) assert.deepEqual(result.save[field], expected[field]);
  assert.equal(expected.runId, "original-run", "the proposed candidate is not mutated");
  assert.equal(loadActiveHuntSave({ storage: f.storage }).save.runId, "resumed-tab-a");
  assert.deepEqual(f.calls.map(call => call[0]), ["set"], "claim never removes the old value first");
});

test("a second tab holding the same old proposal cannot claim, write or clear the resumed hunt", () => {
  const f = fixture();
  const tabA = loadActiveHuntSave({ storage: f.storage }).save;
  const tabB = loadActiveHuntSave({ storage: f.storage }).save;
  assert.equal(claimActiveHuntSave(tabA, "resumed-tab-a", { storage: f.storage }).persisted, true);
  assert.equal(claimActiveHuntSave(tabB, "resumed-tab-b", { storage: f.storage }).failure, "stale-run");
  assert.equal(writeActiveHuntSave({ ...tabB, sequence: 99 }, { storage: f.storage }).failure, "stale-run");
  assert.equal(clearActiveHuntSave({ storage: f.storage, expectedRunId: tabB.runId }).failure, "stale-run");
  assert.equal(loadActiveHuntSave({ storage: f.storage }).save.runId, "resumed-tab-a");
});

test("claim compares the full normalized proposal, not just its run and sequence", () => {
  for (const changed of [candidate({ sequence: 9 }), candidate({ snapshot: { elapsed: 59 } }), candidate({ configuration: { elapsedSeconds: 59 } })]) {
    const f = fixture(changed); const bytes = f.storage.getItem(ACTIVE_HUNT_STORAGE_KEY);
    const result = claimActiveHuntSave(candidate(), "resumed-tab", { storage: f.storage });
    assert.equal(result.failure, "stale-sequence");
    assert.equal(f.storage.getItem(ACTIVE_HUNT_STORAGE_KEY), bytes);
    assert.deepEqual(f.calls, []);
  }
});

test("quota failure during claim preserves the original candidate byte for byte", () => {
  const f = fixture(); const original = f.storage.getItem(ACTIVE_HUNT_STORAGE_KEY);
  f.storage.setItem = () => { throw new Error("quota"); };
  const result = claimActiveHuntSave(candidate(), "resumed-tab", { storage: f.storage });
  assert.equal(result.persisted, false); assert.equal(result.failure, "write-failed");
  assert.equal(f.storage.getItem(ACTIVE_HUNT_STORAGE_KEY), original);
  assert.equal(f.calls.length, 0);
});

test("read denial, disappeared candidates and future or corrupt values are never replaced", () => {
  const missing = fixture(); missing.values.clear();
  assert.equal(claimActiveHuntSave(candidate(), "resumed-tab", { storage: missing.storage }).failure, "stale-run");
  assert.equal(claimActiveHuntSave(candidate(), "resumed-tab", { storage: null }).failure, "storage-unavailable");
  const denied = fixture(); denied.storage.getItem = () => { throw new Error("blocked"); };
  assert.equal(claimActiveHuntSave(candidate(), "resumed-tab", { storage: denied.storage }).failure, "read-failed");
  for (const bytes of ["{corrupt", JSON.stringify(candidate({ version: ACTIVE_HUNT_SAVE_VERSION + 1 })), JSON.stringify(candidate({ runtimeRevision: ACTIVE_HUNT_RUNTIME_REVISION + 1 }))]) {
    const f = fixture(); f.values.set(ACTIVE_HUNT_STORAGE_KEY, bytes);
    assert.equal(claimActiveHuntSave(candidate(), "resumed-tab", { storage: f.storage }).failure, "protected-save");
    assert.equal(f.storage.getItem(ACTIVE_HUNT_STORAGE_KEY), bytes);
    assert.deepEqual(f.calls, []);
  }
});

test("failed claim readback remains inconclusive without deleting a successfully written identity", () => {
  const f = fixture(); let reads = 0;
  const get = f.storage.getItem;
  f.storage.getItem = key => { reads += 1; if (reads === 2) throw new Error("readback blocked"); return get(key); };
  const result = claimActiveHuntSave(candidate(), "resumed-tab", { storage: f.storage });
  assert.equal(result.persisted, false); assert.equal(result.failure, "write-failed");
  assert.equal(JSON.parse(f.values.get(ACTIVE_HUNT_STORAGE_KEY)).runId, "resumed-tab");
  assert.equal(f.calls.some(call => call[0] === "remove"), false);
});

test("a same-run cleanup requires the expected autosave sequence when supplied", () => {
  const f = fixture(candidate({ sequence: 9 }));
  assert.equal(clearActiveHuntSave({ storage: f.storage, expectedRunId: "original-run", expectedSequence: 8 }).failure, "stale-run");
  assert.equal(loadActiveHuntSave({ storage: f.storage }).save.sequence, 9);
  assert.equal(clearActiveHuntSave({ storage: f.storage, expectedRunId: "original-run", expectedSequence: 9 }).cleared, true);
  assert.equal(f.values.has(ACTIVE_HUNT_STORAGE_KEY), false);
});

test("conditional cleanup preserves future and invalid envelopes even when ownership fields match", () => {
  const values = [
    candidate({ version: ACTIVE_HUNT_SAVE_VERSION + 1 }),
    candidate({ runtimeRevision: ACTIVE_HUNT_RUNTIME_REVISION + 1 }),
    candidate({ ownerSaveCreatedAt: "not-a-date" }),
    candidate({ snapshot: null }),
    { runId: "original-run", sequence: 8 },
  ].map(value => JSON.stringify(value)).concat(["{corrupt", ""]);
  for (const bytes of values) {
    for (const guard of [
      { expectedRunId: "original-run" },
      { expectedSequence: 8 },
      { expectedRunId: "original-run", expectedSequence: 8 },
    ]) {
      const f = fixture(); f.values.set(ACTIVE_HUNT_STORAGE_KEY, bytes);
      const result = clearActiveHuntSave({ storage: f.storage, ...guard });
      assert.deepEqual(result, { cleared: false, failure: "stale-run" });
      assert.equal(f.storage.getItem(ACTIVE_HUNT_STORAGE_KEY), bytes, "unrecognized data must remain byte-for-byte intact");
      assert.deepEqual(f.calls, [], "conditional cleanup must neither remove nor overwrite unrecognized data");
    }
  }
});

test("explicit discard can remove future or invalid values and a missing guarded key stays idempotent", () => {
  for (const bytes of [JSON.stringify(candidate({ version: ACTIVE_HUNT_SAVE_VERSION + 1 })), JSON.stringify({ runId: "original-run", sequence: 8 }), "{corrupt", ""]) {
    const f = fixture(); f.values.set(ACTIVE_HUNT_STORAGE_KEY, bytes);
    assert.deepEqual(clearActiveHuntSave({ storage: f.storage }), { cleared: true, failure: null });
    assert.equal(f.values.has(ACTIVE_HUNT_STORAGE_KEY), false);
    assert.deepEqual(f.calls, [["remove", ACTIVE_HUNT_STORAGE_KEY]]);
  }
  const missing = fixture(); missing.values.clear();
  assert.deepEqual(clearActiveHuntSave({ storage: missing.storage, expectedRunId: "original-run", expectedSequence: 8 }), { cleared: true, failure: null });
});

test("claim requires a genuinely new valid run id and can transfer ownership again from a refreshed proposal", () => {
  const f = fixture();
  for (const id of ["", "original-run"]) assert.equal(claimActiveHuntSave(candidate(), id, { storage: f.storage }).failure, "invalid-save");
  const first = claimActiveHuntSave(candidate(), "resumed-a", { storage: f.storage });
  assert.equal(writeActiveHuntSave({ ...first.save, sequence: first.save.sequence + 1 }, { storage: f.storage }).persisted, true);
  const refreshed = loadActiveHuntSave({ storage: f.storage }).save;
  assert.equal(claimActiveHuntSave(refreshed, "resumed-b", { storage: f.storage }).persisted, true);
  assert.equal(clearActiveHuntSave({ storage: f.storage, expectedRunId: first.save.runId }).failure, "stale-run");
});
