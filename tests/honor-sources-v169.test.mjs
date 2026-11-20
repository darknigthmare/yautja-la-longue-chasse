import assert from "node:assert/strict";
import {test} from "node:test";
import {homeworldSceneSsrV78} from "./helpers/homeworld-scene-ssr-v78.mjs";

const qa = homeworldSceneSsrV78();
const saves = qa.load("app/game/save.ts");
const {createNurseryCampaign} = qa.load("app/game/systems/nurseryCampaign.ts");
const {CHRONICLE_EVIDENCE} = qa.load("app/game/systems/clanChronicle.ts");
const key = saves.SAVE_STORAGE_KEY;
const fresh = () => saves.defaultSave("2026-11-20T18:00:00.000Z");

function storage() {
  const values = new Map();
  return {
    getItem: name => values.get(name) ?? null,
    setItem: (name, value) => values.set(name, value),
    removeItem: name => values.delete(name),
  };
}

function withEvidence(save, ids) {
  return {
    ...save,
    prologue: {
      ...createNurseryCampaign(),
      chronicle: {
        version: 1, rites: [], legacyRecognition: null,
        evidence: ids.map(id => ({ id, sourceId: CHRONICLE_EVIDENCE.find(item => item.id === id).sourceId })),
      },
    },
  };
}

test("a saved chapter adds honour once while preserving the acquired rank through a reload", () => {
  const disk = storage();
  const save = fresh();
  save.profile.honor = 1499;
  const initial = saves.writeSaveWithStatus(save, disk);
  assert.equal(initial.persisted, true);
  const first = saves.writeSaveWithStatus(withEvidence(initial.save, ["intro-completed"]), disk);
  assert.equal(first.persisted, true);
  assert.equal(first.save.profile.honor, 1599);
  assert.equal(first.save.profile.rankId, "young-blood");
  const current = saves.loadSave(disk);
  assert.equal(current.profile.honor, 1599);
  assert.equal(current.profile.rankId, "young-blood");
  const retried = saves.writeSaveWithStatus(current, disk);
  assert.equal(retried.save.profile.honor, 1599);
  assert.deepEqual(retried.save.honorSourcesV169.entries.map(({id, delta}) => [id, delta]), [
    ["chronicle:intro-completed", 100],
  ]);
});

test("legacy receipts receive no retroactive credit and a later chapter is paid normally", () => {
  const disk = storage();
  disk.setItem(key, JSON.stringify(withEvidence(fresh(), ["intro-completed"])));
  const migrated = saves.writeSaveWithStatus(saves.loadSave(disk), disk);
  assert.equal(migrated.persisted, true);
  assert.equal(migrated.save.profile.honor, 0);
  const next = saves.writeSaveWithStatus(withEvidence(migrated.save, ["intro-completed", "training-completed"]), disk);
  assert.equal(next.persisted, true);
  assert.equal(next.save.profile.honor, 50);
  assert.deepEqual(next.save.honorSourcesV169.entries.map(({id, delta}) => [id, delta]), [
    ["chronicle:intro-completed", 0],
    ["chronicle:training-completed", 50],
  ]);
});

test("an incompatible honor ledger stays intact through backup recovery and an ordinary write", () => {
  for (const archive of [{ version: 2, entries: [], future: ["keep"] }, { version: 1, entries: "incomplete" }]) {
    const disk = storage();
    const save = fresh();
    assert.equal(saves.writeSaveWithStatus(save, disk).persisted, true);
    const primary = JSON.stringify({ ...save, honorSourcesV169: archive });
    const backup = disk.getItem(key + ".backup");
    assert.ok(backup);
    disk.setItem(key, primary);
    assert.deepEqual(saves.normalizeSave(JSON.parse(primary)).honorSourcesV169, archive);
    const loaded = saves.loadSaveWithStatus(disk);
    assert.equal(loaded.loaded, false);
    assert.equal(loaded.failure, archive.version > 1 ? "future-version" : "invalid-save");
    assert.equal(saves.writeSaveWithStatus(save, disk).failure, "protected-save");
    assert.equal(disk.getItem(key), primary);
    assert.equal(disk.getItem(key + ".backup"), backup);
  }
});
