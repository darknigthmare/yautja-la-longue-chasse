import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const built = await build({ stdin: { contents: `
  export * from "./app/game/systems/gameReserveV66";
  export * from "./app/game/systems/campaignSlots";
  export * from "./app/game/systems/completeArchive";
  export { defaultSave, parseSaveImport, SAVE_STORAGE_KEY } from "./app/game/save";
`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(built.outputFiles[0].text).toString("base64"));

function storage(save) {
  const values = new Map([[api.SAVE_STORAGE_KEY, JSON.stringify(save)]]);
  return { get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null, setItem: (key, raw) => values.set(key, raw), removeItem: key => values.delete(key) };
}
async function withLocks(run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: { request: async (_name, _options, callback) => callback({}) } } });
  try { await run(); } finally { if (previous) Object.defineProperty(globalThis, "navigator", previous); else delete globalThis.navigator; }
}

test("V1 and V2 active checkpoints retain their exact terrain through manual slots and integral archives", async () => withLocks(async () => {
  for (const checkpoint of [api.createGameReserveV66(104), api.createGameReserveV104(104)]) {
    const save = { ...api.defaultSave("2026-10-22T12:00:00.000Z"), gameReserveV66: checkpoint };
    assert.deepEqual(api.parseSaveImport(JSON.stringify(save)).save?.gameReserveV66, checkpoint);
    const disk = storage(save);
    assert.equal((await api.migrateLegacyCampaignSlot(disk)).ok, true);
    let slot = api.loadCampaignSlots(disk).slots[0];
    const stored = await api.saveCampaignCheckpoint(1, { kind: "manual", index: 1, expectedRevision: slot.revision, location: "game-reserve" }, disk);
    assert.equal(stored.ok, true, stored.message);
    slot = api.loadCampaignSlots(disk).slots[0];
    const loaded = await api.activateCampaignCheckpoint(1, stored.checkpoint.id, { expectedRevision: slot.revision }, disk);
    assert.equal(loaded.ok, true, loaded.message);
    assert.equal(loaded.checkpoint.resumeLocation, "game-reserve");
    assert.deepEqual(loaded.save.gameReserveV66, checkpoint);
    const exported = api.createCompleteArchive(loaded.save, disk);
    const decoded = api.parseCompleteArchive(exported.serialized);
    assert(decoded.archive);
    assert.deepEqual(decoded.archive.campaign.gameReserveV66, checkpoint);
    assert.equal(api.gameReserveV66World(decoded.archive.campaign.gameReserveV66).width, checkpoint.version === 1 ? 4800 : 6400);
  }
}));

test("a surveyed V2 fixture physically returns and preserves its observation and outcome in the archive", async () => withLocks(async () => {
  // This test targets persistence. The survey is an explicit validated fixture;
  // the separate traversal test actually walks and jumps to obtain this record.
  let state = api.createGameReserveV104(105);
  state.tick = 300; state.visited = [0, 1, 2, 3];
  state.lookout = { recordedAt: 200, hunterX: 5840, hunterY: 280 };
  assert(api.normalizeGameReserveV66(state));
  state = api.stepGameReserveV66(state);
  for (let tick = 0; tick < 60; tick++) state = api.stepGameReserveV66(state, { interact: true });
  assert.equal(state.status, "returned");
  const save = { ...api.defaultSave("2026-10-22T12:01:00.000Z"), gameReserveV66: state };
  const restored = api.parseSaveImport(JSON.stringify(save));
  assert.deepEqual(restored.save?.gameReserveV66, state);
  const disk = storage(restored.save);
  assert.equal((await api.migrateLegacyCampaignSlot(disk)).ok, true);
  const decoded = api.parseCompleteArchive(api.createCompleteArchive(restored.save, disk).serialized);
  assert.deepEqual(decoded.archive?.campaign.gameReserveV66, state);
  assert.equal(decoded.archive.campaign.gameReserveV66.version, 2);
  assert.deepEqual(decoded.archive.campaign.gameReserveV66.lookout, { recordedAt: 200, hunterX: 5840, hunterY: 280 });
}));

test("future versions and mixed terrain identities remain protected, without silently converting V1", () => {
  const source = api.defaultSave("2026-10-22T12:02:00.000Z");
  const v1 = api.createGameReserveV66(106), v2 = api.createGameReserveV104(106);
  const valid = api.parseSaveImport(JSON.stringify({ ...source, gameReserveV66: v1 }));
  assert.deepEqual(valid.save?.gameReserveV66, v1);
  assert.equal(Object.hasOwn(valid.save.gameReserveV66, "lookout"), false);
  for (const state of [{ ...v1, version: 2 }, { ...v1, lookout: v2.lookout }, { ...v2, reserveId: v1.reserveId }, { ...v2, lookout: null }]) {
    const raw = JSON.stringify({ ...source, gameReserveV66: state });
    const result = api.parseSaveImport(raw);
    assert.equal(result.save, null);
    assert.equal(result.failure, "invalid-save");
    assert.equal(JSON.parse(raw).gameReserveV66.version, state.version);
  }
  const future = api.parseSaveImport(JSON.stringify({ ...source, gameReserveV66: { ...v2, version: 5 } }));
  assert.equal(future.save, null);
  assert.equal(future.failure, "future-version");
});
