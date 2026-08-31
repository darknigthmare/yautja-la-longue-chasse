import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const bundled = await build({
  stdin: {
    contents: 'export * from "./app/game/systems/progression"; export { defaultSave, SAVE_STORAGE_KEY } from "./app/game/save";',
    resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "ts",
  },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
const {
  SHIP_PROGRESSION_VERSION, SHIP_PROGRESSION_STORAGE_KEY, SAVE_STORAGE_KEY,
  defaultSave, createDefaultShipProgression, normalizeShipProgression,
  loadShipProgression, writeShipProgressionWithStatus, resetShipProgressionWithStatus,
} = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const oldSave = () => defaultSave("2026-01-01T00:00:00.000Z");
const newSave = () => defaultSave("2026-08-31T12:00:00.000Z");
const key = SHIP_PROGRESSION_STORAGE_KEY;
function memoryStorage(initial = []) {
  const values = new Map(initial);
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function earnedSidecar(save) {
  const state = createDefaultShipProgression(save, "2026-07-01T12:00:00.000Z");
  state.unlockedShipIds.push("advanced-predator-ship");
  state.selectedShipId = "advanced-predator-ship";
  state.completedRiteIds = ["first-trophy", "elder-ascension"];
  state.training.targeting.attempts = 99;
  state.training.targeting.bestScore = 100;
  state.loadoutPresets[1].name = "Ancien équipement";
  return state;
}
function assertFresh(state, save) {
  assert.equal(state.version, SHIP_PROGRESSION_VERSION);
  assert.equal(state.ownerSaveCreatedAt, save.createdAt);
  assert.equal(state.selectedShipId, "classic-predator-spaceship");
  assert.equal(state.unlockedShipIds.includes("advanced-predator-ship"), false);
  assert.equal(state.completedRiteIds.includes("elder-ascension"), false);
  assert.equal(state.training.targeting.attempts, 0);
  assert.notEqual(state.loadoutPresets[1].name, "Ancien équipement");
}

test("V3 sidecars ignore every foreign owner's unlock, rite, training and preset", () => {
  const previous = earnedSidecar(oldSave());
  const current = newSave();
  const before = structuredClone(previous);
  assertFresh(normalizeShipProgression(previous, current), current);
  assert.deepEqual(previous, before);
  const missingOwner = { ...previous };
  delete missingOwner.ownerSaveCreatedAt;
  assertFresh(normalizeShipProgression(missingOwner, oldSave()), oldSave());
});

test("legacy V1 and V2 retain the current campaign's progress and persist their owner binding", () => {
  for (const version of [1, 2]) {
    const save = oldSave();
    const legacy = { ...earnedSidecar(save), version };
    delete legacy.ownerSaveCreatedAt;
    const storage = memoryStorage([[key, JSON.stringify(legacy)], [SAVE_STORAGE_KEY, JSON.stringify(save)]]);
    const migrated = loadShipProgression(save, storage);
    assert.equal(migrated.version, 3);
    assert.equal(migrated.ownerSaveCreatedAt, save.createdAt);
    assert.equal(migrated.selectedShipId, "advanced-predator-ship");
    assert.equal(migrated.training.targeting.attempts, 99);
    assert.equal(JSON.parse(storage.getItem(key)).ownerSaveCreatedAt, save.createdAt);
    assertFresh(loadShipProgression(newSave(), storage), newSave());
  }
});

test("a legacy sidecar predating a new campaign cannot be adopted after reset", () => {
  const legacy = { ...earnedSidecar(oldSave()), version: 2 };
  delete legacy.ownerSaveCreatedAt;
  const serialized = JSON.stringify(legacy);
  const storage = memoryStorage([[key, serialized]]);
  assertFresh(loadShipProgression(newSave(), storage), newSave());
  assert.equal(storage.getItem(key), serialized);
});

test("foreign V3 progress stays ignored when both replacement and deletion fail", () => {
  const previous = JSON.stringify(earnedSidecar(oldSave()));
  const save = newSave();
  const storage = memoryStorage([[key, previous], [SAVE_STORAGE_KEY, JSON.stringify(save)]]);
  storage.setItem = () => { throw new Error("quota"); };
  storage.removeItem = () => { throw new Error("blocked"); };
  const reset = resetShipProgressionWithStatus(save, storage);
  assert.equal(reset.persisted, false);
  assert.equal(reset.failure, "write-failed");
  assertFresh(reset.state, save);
  assertFresh(loadShipProgression(save, storage), save);
  assert.equal(storage.getItem(key), previous);
});

test("a stale campaign tab cannot write or reset the current owner's sidecar", () => {
  const save = oldSave(), current = newSave();
  const previous = JSON.stringify(createDefaultShipProgression(current));
  const storage = memoryStorage([[key, previous], [SAVE_STORAGE_KEY, JSON.stringify(current)]]);
  assert.equal(writeShipProgressionWithStatus(earnedSidecar(save), save, storage).failure, "save-owner");
  assert.equal(resetShipProgressionWithStatus(save, storage).failure, "save-owner");
  assert.equal(storage.getItem(key), previous);
  assert.equal(writeShipProgressionWithStatus(earnedSidecar(save), current, storage).failure, "save-owner");
});

test("explicit reset can retire a sidecar by removal when a quota rejects writing", () => {
  const save = oldSave();
  const storage = memoryStorage([[key, JSON.stringify(earnedSidecar(save))], [SAVE_STORAGE_KEY, JSON.stringify(save)]]);
  storage.setItem = () => { throw new Error("quota"); };
  assert.equal(resetShipProgressionWithStatus(save, storage).persisted, true);
  assert.equal(storage.getItem(key), null);
  assertFresh(loadShipProgression(save, storage), save);
});

test("a failed reset for the same owner is explicit and does not promise erased old data", () => {
  const save = oldSave();
  const previous = JSON.stringify(earnedSidecar(save));
  const storage = memoryStorage([[key, previous], [SAVE_STORAGE_KEY, JSON.stringify(save)]]);
  storage.setItem = () => { throw new Error("quota"); };
  storage.removeItem = () => { throw new Error("blocked"); };
  const reset = resetShipProgressionWithStatus(save, storage);
  assert.equal(reset.persisted, false);
  assertFresh(reset.state, save);
  assert.equal(storage.getItem(key), previous);
  assert.equal(loadShipProgression(save, storage).training.targeting.attempts, 99);
});

test("future sidecars are protected from ordinary writes", () => {
  const save = oldSave();
  const future = JSON.stringify({ ...earnedSidecar(save), version: SHIP_PROGRESSION_VERSION + 1 });
  const storage = memoryStorage([[key, future]]);
  assertFresh(loadShipProgression(save, storage), save);
  assert.equal(writeShipProgressionWithStatus(createDefaultShipProgression(save), save, storage).failure, "protected-save");
  assert.equal(storage.getItem(key), future);
  assert.equal(resetShipProgressionWithStatus(save, storage).persisted, true);
});

test("storage errors are visible through ship write and reset results", () => {
  const save = oldSave(), state = createDefaultShipProgression(save);
  assert.equal(writeShipProgressionWithStatus(state, save, null).failure, "storage-unavailable");
  assert.equal(resetShipProgressionWithStatus(save, null).failure, "storage-unavailable");
  const blocked = { getItem() { throw new Error("blocked"); } };
  assert.equal(writeShipProgressionWithStatus(state, save, blocked).failure, "read-failed");
  const dropped = { getItem() { return null; }, setItem() {} };
  assert.equal(writeShipProgressionWithStatus(state, save, dropped).failure, "write-failed");
});


test("an unreadable or future campaign cannot bind a legacy sidecar to a temporary fresh profile", () => {
  const temporary = newSave();
  const legacy = { ...earnedSidecar(oldSave()), version: 2, updatedAt: "2030-01-01T00:00:00.000Z" };
  delete legacy.ownerSaveCreatedAt;
  const sidecar = JSON.stringify(legacy);
  for (const primary of ["{corrupt", JSON.stringify({ ...oldSave(), version: 999 })]) {
    const storage = memoryStorage([[key, sidecar], [SAVE_STORAGE_KEY, primary]]);
    let writes = 0;
    storage.setItem = () => { writes += 1; };
    loadShipProgression(temporary, storage);
    assert.equal(writes, 0);
    assert.equal(storage.getItem(key), sidecar);
    assert.equal(storage.getItem(SAVE_STORAGE_KEY), primary);
  }
});
