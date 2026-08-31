import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Bundle in memory: the suite needs no build output or copied asset tree.
const bundled = await build({
  entryPoints: [fileURLToPath(new URL("../app/game/save.ts", import.meta.url))],
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
const {
  SAVE_VERSION, SAVE_MAX_SERIALIZED_BYTES, defaultSave, normalizeSave,
  loadSaveWithStatus, writeSaveWithStatus, replaceSaveWithStatus,
  exportSave, parseSaveImport, importSaveWithStatus,
} = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

const key = "campaign-test";
const createdAt = "2026-01-01T00:00:00.000Z";
function storageWith(initial = []) {
  const values = new Map(initial);
  return {
    values,
    getItem: name => values.get(name) ?? null,
    setItem: (name, value) => values.set(name, value),
    removeItem: name => values.delete(name),
  };
}
function campaign(honor = 0) {
  const save = defaultSave(createdAt);
  save.profile.honor = honor;
  return save;
}

test("corrupt and future campaigns are reported and never overwritten by normal autosave", () => {
  for (const [serialized, reason] of [
    ["{broken", "invalid-save"], [JSON.stringify({ unrelated: true }), "invalid-save"],
    [JSON.stringify({ ...campaign(900), version: SAVE_VERSION + 1 }), "future-version"],
  ]) {
    const storage = storageWith([[key, serialized]]);
    const loaded = loadSaveWithStatus(storage, key);
    assert.equal(loaded.loaded, false);
    assert.equal(loaded.failure, reason);
    assert.equal(writeSaveWithStatus(loaded.save, storage, key).failure, "protected-save");
    assert.equal(storage.getItem(key), serialized);
    assert.equal(storage.values.size, 1);
  }
});

test("the previous valid campaign recovers a corrupt primary without any hydration write", () => {
  const storage = storageWith();
  const first = writeSaveWithStatus(campaign(120), storage, key);
  const next = structuredClone(first.save);
  next.profile.honor = 240;
  assert.equal(writeSaveWithStatus(next, storage, key).persisted, true);
  storage.setItem(key, "{corrupt");
  const before = [...storage.values];
  const loaded = loadSaveWithStatus(storage, key);
  assert.equal(loaded.source, "backup");
  assert.equal(loaded.failure, "backup-recovered");
  assert.equal(loaded.save.profile.honor, 120);
  assert.deepEqual([...storage.values], before);
  const repaired = writeSaveWithStatus(loaded.save, storage, key);
  assert.equal(repaired.persisted, true);
  assert.equal(loadSaveWithStatus(storage, key).failure, null);
});

test("a future primary is not silently replaced with its older backup", () => {
  const future = JSON.stringify({ ...campaign(900), version: SAVE_VERSION + 1 });
  const storage = storageWith([[key, future], [`${key}.backup`, JSON.stringify(campaign(100))]]);
  const loaded = loadSaveWithStatus(storage, key);
  assert.equal(loaded.failure, "future-version");
  assert.equal(loaded.source, "fresh");
  assert.equal(writeSaveWithStatus(campaign(150), storage, key).failure, "protected-save");
  assert.equal(storage.getItem(key), future);
});

test("quota failures retain the previous primary and optional backup cannot block a successful save", () => {
  const storage = storageWith();
  const initial = writeSaveWithStatus(campaign(100), storage, key);
  const before = [...storage.values];
  const set = storage.setItem;
  storage.setItem = () => { throw new DOMException("Full", "QuotaExceededError"); };
  assert.equal(writeSaveWithStatus({ ...initial.save, profile: { ...initial.save.profile, honor: 200 } }, storage, key).failure, "write-failed");
  assert.deepEqual([...storage.values], before);
  storage.setItem = (name, value) => { if (name.endsWith(".backup")) throw new Error("backup quota"); set(name, value); };
  const result = writeSaveWithStatus({ ...initial.save, profile: { ...initial.save.profile, honor: 300 } }, storage, key);
  assert.equal(result.persisted, true);
  assert.equal(JSON.parse(storage.getItem(key)).profile.honor, 300);
});

test("reset is explicit and its backup cannot resurrect a previous owner", () => {
  const storage = storageWith();
  writeSaveWithStatus(campaign(900), storage, key);
  const fresh = defaultSave("2026-08-31T12:00:00.000Z");
  assert.equal(writeSaveWithStatus(fresh, storage, key).failure, "save-conflict");
  assert.equal(replaceSaveWithStatus(fresh, storage, key).persisted, true);
  storage.setItem(key, "{corrupt");
  const recovered = loadSaveWithStatus(storage, key);
  assert.equal(recovered.save.createdAt, fresh.createdAt);
  assert.equal(recovered.save.profile.honor, 0);
});

test("portable exports and legacy imports preserve normalized campaign progress", () => {
  const original = campaign(700);
  original.profile.hunterName = "Chasseur été";
  const serialized = exportSave(original);
  assert.deepEqual(parseSaveImport(serialized).save, normalizeSave(original));
  assert.deepEqual(parseSaveImport("\uFEFF" + serialized).save, normalizeSave(original));
  const legacy = { ...original, version: 1 };
  const storage = storageWith();
  const imported = importSaveWithStatus(JSON.stringify(legacy), storage, key);
  assert.equal(imported.persisted, true);
  assert.equal(imported.save.version, SAVE_VERSION);
  assert.equal(imported.save.profile.honor, 700);
  assert.equal(loadSaveWithStatus(storage, key).save.profile.hunterName, "Chasseur été");
});

test("invalid, oversized and future imports cannot mutate a valid campaign", () => {
  const storage = storageWith();
  writeSaveWithStatus(campaign(700), storage, key);
  const before = [...storage.values];
  for (const [serialized, failure] of [
    ["not-json", "invalid-json"], ["{}", "invalid-save"],
    [JSON.stringify({ ...campaign(), version: -1 }), "invalid-save"],
    [JSON.stringify({ ...campaign(), version: 0.5 }), "invalid-save"],
    [JSON.stringify({ ...campaign(), version: SAVE_VERSION + 1 }), "future-version"],
    ["é".repeat(SAVE_MAX_SERIALIZED_BYTES), "too-large"],
  ]) {
    const result = importSaveWithStatus(serialized, storage, key);
    assert.equal(result.persisted, false);
    assert.equal(result.failure, failure);
    assert.deepEqual([...storage.values], before);
  }
});

test("an autosave detects another tab replacing the loaded campaign", () => {
  const storage = storageWith([[key, JSON.stringify(campaign(100))]]);
  const loaded = loadSaveWithStatus(storage, key).save;
  const external = JSON.stringify(campaign(800));
  storage.setItem(key, external);
  loaded.profile.honor = 150;
  assert.equal(writeSaveWithStatus(loaded, storage, key).failure, "save-conflict");
  assert.equal(storage.getItem(key), external);
  const refreshed = loadSaveWithStatus(storage, key).save;
  refreshed.profile.honor = 850;
  assert.equal(writeSaveWithStatus(refreshed, storage, key).persisted, true);
});

test("read errors and silently dropped writes never report durable persistence", () => {
  const readBlocked = { getItem() { throw new Error("blocked"); }, setItem() {} };
  assert.equal(loadSaveWithStatus(readBlocked, key).failure, "read-failed");
  assert.equal(writeSaveWithStatus(campaign(), readBlocked, key).failure, "read-failed");
  const dropped = { getItem() { return null; }, setItem() {} };
  assert.equal(writeSaveWithStatus(campaign(), dropped, key).failure, "write-failed");
});

test("corrupt numeric counters are normalized to safe integers", () => {
  const source = campaign(Number.MAX_VALUE);
  source.statistics.totalKills = Number.MAX_VALUE;
  const normalized = normalizeSave(source);
  assert.equal(normalized.profile.honor, Number.MAX_SAFE_INTEGER);
  assert.equal(normalized.statistics.totalKills, Number.MAX_SAFE_INTEGER);
});


test("a reset cannot revive a foreign backup when redundancy storage fails", () => {
  const storage = storageWith();
  writeSaveWithStatus(campaign(900), storage, key);
  const set = storage.setItem;
  storage.setItem = (name, value) => { if (name.endsWith(".backup")) throw new Error("backup blocked"); set(name, value); };
  const fresh = defaultSave("2026-08-31T12:00:00.000Z");
  assert.equal(replaceSaveWithStatus(fresh, storage, key).persisted, true);
  assert.equal(storage.getItem(`${key}.backup`), null);
  storage.setItem(key, "{corrupt");
  assert.equal(loadSaveWithStatus(storage, key).loaded, false);
});

test("a failed confirmation stays explicit even when the primary write actually succeeded", () => {
  const storage = storageWith();
  let reads = 0;
  const get = storage.getItem;
  storage.getItem = name => {
    reads += 1;
    if (reads === 2) throw new Error("readback blocked");
    return get(name);
  };
  const result = writeSaveWithStatus(campaign(400), storage, key);
  assert.equal(result.persisted, false);
  assert.equal(result.failure, "write-failed");
  assert.equal(JSON.parse(storage.values.get(key)).profile.honor, 400);
});


test("a failed replacement preserves the only recoverable backup of a corrupt campaign", () => {
  const backup = JSON.stringify(campaign(900));
  const storage = storageWith([[key, "{corrupt"], [`${key}.backup`, backup]]);
  const loaded = loadSaveWithStatus(storage, key);
  assert.equal(loaded.source, "backup");
  assert.equal(loaded.save.profile.honor, 900);
  const set = storage.setItem;
  storage.setItem = (name, value) => {
    if (name === key) throw new DOMException("Full", "QuotaExceededError");
    set(name, value);
  };
  const result = replaceSaveWithStatus(defaultSave("2026-08-31T00:00:00.000Z"), storage, key);
  assert.equal(result.persisted, false);
  assert.equal(result.failure, "write-failed");
  assert.equal(storage.getItem(key), "{corrupt");
  assert.equal(storage.getItem(`${key}.backup`), backup);
  assert.equal(loadSaveWithStatus(storage, key).save.profile.honor, 900);
});

test("an unconfirmed replacement never retires a recovery backup", () => {
  const backup = JSON.stringify(campaign(900));
  const storage = storageWith([[key, "{corrupt"], [`${key}.backup`, backup]]);
  const get = storage.getItem;
  let primaryReads = 0;
  storage.getItem = name => {
    if (name === key && ++primaryReads === 2) throw new Error("readback denied");
    return get(name);
  };
  const result = replaceSaveWithStatus(defaultSave("2026-08-31T00:00:00.000Z"), storage, key);
  assert.equal(result.persisted, false);
  assert.equal(storage.values.get(`${key}.backup`), backup);
});
