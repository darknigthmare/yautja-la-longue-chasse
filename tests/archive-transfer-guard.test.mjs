import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";

const bundled = await build({
  stdin: {
    contents: [
      'export * as guard from "./app/game/systems/archiveTransferGuard";',
      'export * as campaign from "./app/game/save";',
      'export * as hunt from "./app/game/systems/activeHuntSave";',
      'export * as ship from "./app/game/systems/progression";',
      'export * as pit from "./app/game/systems/pitSave";',
      'export * as replay from "./app/game/systems/pitReplayStorage";',
    ].join("\n"),
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
const { guard, campaign, hunt, ship, pit, replay } = await import(
  "data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64")
);
const owner = "2026-09-08T12:00:00.000Z";
const journalKey = guard.ARCHIVE_TRANSFER_JOURNAL_KEY;

function memoryStorage() {
  const values = new Map();
  const faults = { journalRead: false, nextPrimaryRead: false, afterPrimaryWrite: null, beforeRead: null };
  const mutations = [];
  return {
    values, faults, mutations,
    getItem(key) {
      faults.beforeRead?.(key);
      if (key === journalKey && faults.journalRead) throw new Error("journal read denied");
      if (key === campaign.SAVE_STORAGE_KEY && faults.nextPrimaryRead) {
        faults.nextPrimaryRead = false;
        throw new Error("temporary primary read denial");
      }
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      mutations.push(["set", key]);
      values.set(key, value);
      if (key === campaign.SAVE_STORAGE_KEY) faults.afterPrimaryWrite?.();
    },
    removeItem(key) { mutations.push(["remove", key]); values.delete(key); },
  };
}
function setup({ legacyShip = false } = {}) {
  const storage = memoryStorage();
  const save = campaign.defaultSave(owner);
  const active = {
    version: hunt.ACTIVE_HUNT_SAVE_VERSION,
    runtimeRevision: hunt.ACTIVE_HUNT_RUNTIME_REVISION,
    ownerSaveCreatedAt: owner, missionId: "jungle-vey", difficultyId: "hunter",
    encounterRun: 1, runId: "archive-guard-run", sequence: 1,
    startedAt: owner, savedAt: owner, configuration: { loadout: {} },
    snapshot: { elapsed: 12 }, retryCheckpoint: null,
  };
  const shipState = ship.createDefaultShipProgression(save, owner);
  const pitSave = pit.createPitSave(owner);
  const archive = replay.createPitReplayArchive(owner);
  const pitKey = pit.pitSaveStorageKey(owner);
  const replayKey = replay.pitReplayStorageKey(owner);
  storage.values.set(campaign.SAVE_STORAGE_KEY, JSON.stringify(save));
  storage.values.set(campaign.SAVE_STORAGE_KEY + ".backup", JSON.stringify(save));
  storage.values.set(hunt.ACTIVE_HUNT_STORAGE_KEY, JSON.stringify(active));
  storage.values.set(ship.SHIP_PROGRESSION_STORAGE_KEY, JSON.stringify(
    legacyShip ? { ...shipState, version: 2, ownerSaveCreatedAt: undefined } : shipState
  ));
  storage.values.set(pitKey, JSON.stringify(pitSave));
  storage.values.set(replayKey, JSON.stringify(archive));
  return { storage, save, active, shipState, pitSave, archive, pitKey, replayKey };
}
function actions(s) {
  const pitOptions = { storage: s.storage, key: s.pitKey, expectedOwnerSaveCreatedAt: owner };
  const replayOptions = { storage: s.storage, ownerSaveCreatedAt: owner };
  return [
    ["campaign write", campaign.SAVE_STORAGE_KEY, () => campaign.writeSaveWithStatus(s.save, s.storage), "persisted", "protected-save"],
    ["campaign explicit replacement", campaign.SAVE_STORAGE_KEY, () => campaign.replaceSaveWithStatus(s.save, s.storage), "persisted", "protected-save"],
    ["campaign legacy import", campaign.SAVE_STORAGE_KEY, () => campaign.importSaveWithStatus(campaign.exportSave(s.save), s.storage), "persisted", "protected-save"],
    ["hunt write", hunt.ACTIVE_HUNT_STORAGE_KEY, () => hunt.writeActiveHuntSave({ ...s.active, sequence: 2 }, { storage: s.storage }), "persisted", "protected-save"],
    ["hunt claim", hunt.ACTIVE_HUNT_STORAGE_KEY, () => hunt.claimActiveHuntSave(s.active, "archive-resumed-run", { storage: s.storage }), "persisted", "protected-save"],
    ["hunt clear", hunt.ACTIVE_HUNT_STORAGE_KEY, () => hunt.clearActiveHuntSave({ storage: s.storage, expectedRunId: s.active.runId }), "cleared", "clear-failed"],
    ["ship write", ship.SHIP_PROGRESSION_STORAGE_KEY, () => ship.writeShipProgressionWithStatus(s.shipState, s.save, s.storage), "persisted", "protected-save"],
    ["ship reset", campaign.SAVE_STORAGE_KEY, () => ship.resetShipProgressionWithStatus(s.save, s.storage), "persisted", "protected-save"],
    ["PIT write", s.pitKey, () => pit.writePitSave({ ...s.pitSave, revision: 1 }, pitOptions), "persisted", "write-denied"],
    ["PIT clear", s.pitKey, () => pit.clearPitSave(owner, pitOptions), "cleared", "write-denied"],
    ["replay write", s.replayKey, () => replay.writePitReplayArchive({ ...s.archive, revision: 1 }, replayOptions), "persisted", "write-denied"],
    ["replay clear", s.replayKey, () => replay.clearPitReplayArchive(replayOptions), "cleared", "write-denied"],
  ];
}

test("the shared guard treats every present journal and read denial as pending without mutation", () => {
  const s = memoryStorage();
  assert.equal(journalKey, "yautja-long-hunt.archive-transfer");
  assert.equal(guard.archiveTransferPending(s), false);
  for (const value of ["", "{corrupt", '{"phase":"prepared"}', '{"phase":"committed"}']) {
    s.values.set(journalKey, value);
    assert.equal(guard.archiveTransferPending(s), true);
  }
  s.values.delete(journalKey);
  s.faults.journalRead = true;
  assert.equal(guard.archiveTransferPending(s), true);
  assert.deepEqual(s.mutations, []);
});

for (const blockedBy of ["prepared", "committed", "corrupt", "empty", "read-denied"]) {
  test("all persistence mutations preserve every byte while the journal is " + blockedBy, () => {
    const s = setup();
    if (blockedBy === "read-denied") s.storage.faults.journalRead = true;
    else s.storage.values.set(journalKey, blockedBy === "empty" ? "" : blockedBy);
    const before = [...s.storage.values];
    for (const [name, , act, field, failure] of actions(s)) {
      const result = act();
      assert.equal(result[field], false, name);
      assert.equal(result.failure, failure, name);
    }
    assert.deepEqual([...s.storage.values], before);
    assert.deepEqual(s.storage.mutations, []);
  });
}

test("ordinary readers remain available while legacy ship adoption stays read only", () => {
  for (const denied of [false, true]) {
    const s = setup({ legacyShip: true });
    s.storage.values.set(journalKey, "prepared");
    s.storage.faults.journalRead = denied;
    const before = [...s.storage.values];
    assert.equal(campaign.loadSaveWithStatus(s.storage).loaded, true);
    assert.equal(hunt.loadActiveHuntSave({ storage: s.storage }).loaded, true);
    assert.equal(ship.loadShipProgression(s.save, s.storage).ownerSaveCreatedAt, owner);
    assert.equal(pit.loadPitSave({ storage: s.storage, key: s.pitKey, expectedOwnerSaveCreatedAt: owner }).loaded, true);
    assert.equal(replay.loadPitReplayArchive({ storage: s.storage, ownerSaveCreatedAt: owner }).loaded, true);
    assert.deepEqual([...s.storage.values], before);
    assert.deepEqual(s.storage.mutations, []);
  }
});

test("each writer and clear operation works again after recovery removes the journal", () => {
  const names = actions(setup()).map(([name]) => name);
  for (const name of names) {
    const s = setup();
    s.storage.values.set(journalKey, "prepared");
    s.storage.values.delete(journalKey);
    const [, , act, field] = actions(s).find(([candidate]) => candidate === name);
    assert.equal(act()[field], true, name);
    assert.ok(s.storage.mutations.length > 0, name);
  }
  const s = setup({ legacyShip: true });
  ship.loadShipProgression(s.save, s.storage);
  assert.equal(JSON.parse(s.storage.values.get(ship.SHIP_PROGRESSION_STORAGE_KEY)).version, ship.SHIP_PROGRESSION_VERSION);
  assert.ok(s.storage.mutations.length > 0);
});

test("a journal appearing during validation blocks the imminent mutation", () => {
  const names = actions(setup()).map(([name]) => name);
  for (const name of names) {
    const s = setup();
    const [, targetKey, act, field, failure] = actions(s).find(([candidate]) => candidate === name);
    s.storage.faults.beforeRead = key => {
      if (key === targetKey) s.storage.values.set(journalKey, "prepared");
    };
    const result = act();
    assert.equal(result[field], false, name);
    assert.equal(result.failure, failure, name);
    assert.deepEqual(s.storage.mutations, [], name);
  }
});

test("reconciliation cannot acknowledge a half-imported primary or consume its prior receipt", () => {
  for (const denied of [false, true]) {
    const s = setup();
    campaign.loadSaveWithStatus(s.storage);
    s.storage.faults.afterPrimaryWrite = () => { s.storage.faults.nextPrimaryRead = true; };
    const attempt = campaign.writeSaveWithStatus({ ...s.save, homeworld: { ...s.save.homeworld, evidenceIds: ["suspect-trophy"] } }, s.storage);
    assert.equal(attempt.failure, "write-failed");
    s.storage.faults.afterPrimaryWrite = null;
    s.storage.values.set(journalKey, "prepared");
    s.storage.faults.journalRead = denied;
    const before = [...s.storage.values], writes = s.storage.mutations.length;
    assert.equal(campaign.reconcileSaveWrite(attempt, owner, s.storage).failure, "protected-save");
    assert.deepEqual([...s.storage.values], before);
    assert.equal(s.storage.mutations.length, writes);
    s.storage.faults.journalRead = false;
    s.storage.values.delete(journalKey);
    assert.equal(campaign.reconcileSaveWrite(attempt, owner, s.storage).status, "confirmed");
  }
});

test("a journal appearing after a confirmed primary prevents optional backup mutation", () => {
  const s = setup();
  const backup = s.storage.values.get(campaign.SAVE_STORAGE_KEY + ".backup");
  s.storage.faults.afterPrimaryWrite = () => { s.storage.values.set(journalKey, "prepared"); };
  const result = campaign.writeSaveWithStatus({ ...s.save, homeworld: { ...s.save.homeworld, evidenceIds: ["suspect-trophy"] } }, s.storage);
  assert.equal(result.persisted, true);
  assert.equal(s.storage.values.get(campaign.SAVE_STORAGE_KEY + ".backup"), backup);
  assert.deepEqual(s.storage.mutations, [["set", campaign.SAVE_STORAGE_KEY]]);
});

test("hunt clear and ship reset do not execute fallback mutations after a transfer begins", () => {
  const h = setup();
  h.storage.removeItem = () => {
    h.storage.values.set(journalKey, "prepared");
    throw new Error("remove rejected");
  };
  assert.equal(hunt.clearActiveHuntSave({ storage: h.storage }).cleared, false);
  assert.deepEqual(h.storage.mutations, []);
  assert.ok(h.storage.values.has(hunt.ACTIVE_HUNT_STORAGE_KEY));

  const s = setup();
  s.storage.setItem = () => {
    s.storage.values.set(journalKey, "prepared");
    throw new Error("quota rejected replacement");
  };
  assert.equal(ship.resetShipProgressionWithStatus(s.save, s.storage).persisted, false);
  assert.deepEqual(s.storage.mutations, []);
  assert.ok(s.storage.values.has(ship.SHIP_PROGRESSION_STORAGE_KEY));
});


// Isolated module realms model a fresh document; no production reset/backdoor
// can make an invalidated tab writable again.
const guardBundle = await build({
  entryPoints: [fileURLToPath(new URL("../app/game/systems/archiveTransferGuard.ts", import.meta.url))],
  bundle: true, write: false, format: "cjs", platform: "node", logLevel: "silent",
});
function tabGuard() {
  const local = memoryStorage();
  const listeners = new Map();
  const window = { localStorage: local, addEventListener: (name, listener) => listeners.set(name, listener) };
  const guardModule = { exports: {} };
  runInNewContext(guardBundle.outputFiles[0].text, { window, module: guardModule, exports: guardModule.exports });
  return {
    local, window, api: guardModule.exports,
    dispatch: properties => listeners.get("storage")({ key: journalKey, newValue: "prepared", storageArea: local, ...properties }),
  };
}
test("only another localStorage document's journal event invalidates a tab until reload", () => {
  const tab = tabGuard();
  tab.dispatch({ key: "unrelated" });
  tab.dispatch({ newValue: null });
  tab.dispatch({ storageArea: memoryStorage() });
  tab.dispatch({ storageArea: null });
  assert.equal(tab.api.archiveSessionInvalidated(), false);
  tab.dispatch({ newValue: "" });
  assert.equal(tab.api.archiveSessionInvalidated(), true);
  assert.equal(tab.local.getItem(journalKey), null);
  assert.equal(tab.api.archiveTransferPending(tab.local), true);
  tab.dispatch({ newValue: null });
  assert.equal(tab.api.archiveTransferPending(tab.local), true);
  const reloaded = tabGuard();
  assert.equal(reloaded.api.archiveSessionInvalidated(), false);
  assert.equal(reloaded.api.archiveTransferPending(reloaded.local), false);
});
test("same-tab journal writes are temporary barriers and never invalidate their importing session", () => {
  const tab = tabGuard();
  tab.local.setItem(journalKey, "prepared");
  assert.equal(tab.api.archiveTransferPending(tab.local), true);
  assert.equal(tab.api.archiveSessionInvalidated(), false);
  tab.local.removeItem(journalKey);
  assert.equal(tab.api.archiveTransferPending(tab.local), false);
});
test("an external journal event with denied storage access conservatively invalidates the document", () => {
  const tab = tabGuard();
  Object.defineProperty(tab.window, "localStorage", { get() { throw new Error("denied"); } });
  tab.dispatch({});
  assert.equal(tab.api.archiveSessionInvalidated(), true);
  assert.equal(tab.api.archiveTransferPending(tab.local), true);
});

test("reconciliation does not refresh observation if a transfer appears during its primary read", () => {
  const s = setup();
  campaign.loadSaveWithStatus(s.storage);
  s.storage.faults.afterPrimaryWrite = () => { s.storage.faults.nextPrimaryRead = true; };
  const attempt = campaign.writeSaveWithStatus({ ...s.save, homeworld: { ...s.save.homeworld, evidenceIds: ["suspect-trophy"] } }, s.storage);
  assert.equal(attempt.failure, "write-failed");
  s.storage.faults.afterPrimaryWrite = null;
  s.storage.faults.beforeRead = key => {
    if (key === campaign.SAVE_STORAGE_KEY) s.storage.values.set(journalKey, "prepared");
  };
  assert.equal(campaign.reconcileSaveWrite(attempt, owner, s.storage).failure, "protected-save");
  s.storage.faults.beforeRead = null;
  s.storage.values.delete(journalKey);
  assert.equal(campaign.reconcileSaveWrite(attempt, owner, s.storage).status, "confirmed");
});
