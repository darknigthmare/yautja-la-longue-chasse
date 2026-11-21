import assert from "node:assert/strict";
import { test } from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const qa = homeworldSceneSsrV78();
const saves = qa.load("app/game/save.ts");
const mastery = qa.load("app/game/systems/eliteMasteryV170.ts");
const owner = "2026-11-21T11:40:00.000Z";

function fresh() {
  const save = saves.defaultSave(owner);
  return { ...save, profile: { ...save.profile, rankId: "blooded", acquiredRankIdV166: "blooded", honor: 2000 } };
}

function control(save, position, operation, revision = save.eliteMasteryV170?.revision ?? 0) {
  return mastery.commitEliteMastery(save, { expectedRevision: revision, position, operation });
}
function station(save, id, position = mastery.MASTERY_STATIONS.find(point => point.id === id).point) {
  return control(save, position, { type: "station", station: id });
}
function act(save, id) {
  const result = station(save, id);
  assert.equal(result.ok, true, result.message);
  return { ...save, eliteMasteryV170: result.state };
}
function submit(save, primary, secondary = null, position = mastery.MASTERY_START) {
  return control(save, position, { type: "profile", profile: { primary, secondary } });
}

test("the terrain respects rank, freeze, position, the gap and station ordering", () => {
  const save = fresh();
  const rookie = { ...save, profile: { ...save.profile, rankId: "young-blood", honor: 500 } };
  assert.equal(station(rookie, "trace").ok, false);
  assert.equal(station({ ...save, tribunalV147: { freeze: { rankId: "blooded" }, exile: null } }, "trace").ok, false);
  assert.equal(station(save, "trace", mastery.MASTERY_START).ok, false);
  for (const id of ["quarry", "descend", "lure", "counter"]) assert.equal(station(save, id).ok, false);
  assert.equal(mastery.canWalkMastery({ column: 7, row: 1 }), false);
  assert.equal(mastery.canWalkMastery({ column: 8, row: 2 }), false);
  assert.deepEqual(station(save, "vault").destination, mastery.MASTERY_LEDGE);
  assert.deepEqual(station(save, "dodge").destination, { column: 7, row: 6 });
});

test("all four staged methods accept only their own actual demonstration and selected proof", () => {
  const start = fresh();
  const track = act(act(start, "trace"), "quarry");
  assert.equal(submit(track, "track", "track").ok, false);
  assert.equal(submit(track, "track", "trap").ok, false);
  assert.equal(submit(track, "track", null, mastery.MASTERY_LEDGE).ok, false);
  const specialty = submit(track, "track");
  assert.equal(specialty.ok, true, specialty.message);
  assert.deepEqual(specialty.state.profile, { primary: "track", secondary: null });
  let save = track;
  for (const id of ["vault", "descend", "set-trap", "lure", "dodge", "counter"]) save = act(save, id);
  assert.deepEqual(save.eliteMasteryV170.stages, { track: 2, mobility: 2, trap: 2, duel: 2 });
  const combined = submit(save, "trap", "duel");
  assert.equal(combined.ok, true, combined.message);
  assert.equal(combined.state.revision, 9);
  assert.deepEqual(combined.state.profile, { primary: "trap", secondary: "duel" });
  assert.equal(submit({ ...save, eliteMasteryV170: combined.state }, "track").ok, false);
  assert.deepEqual(save.profile, start.profile);
});

test("a recorded stage survives export and stale writes cannot erase it", () => {
  const start = fresh();
  const track = act(start, "trace");
  const ledge = act(track, "vault");
  const returned = act(ledge, "descend");
  const result = submit(returned, "mobility");
  assert.equal(result.ok, true, result.message);
  const finished = { ...returned, eliteMasteryV170: result.state };
  const map = new Map();
  const disk = {
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: key => map.delete(key),
  };
  assert.equal(saves.replaceSaveWithStatus(start, disk).persisted, true);
  assert.equal(saves.writeSaveWithStatus(ledge, disk).failure, "save-conflict");
  assert.equal(saves.writeSaveWithStatus(track, disk).persisted, true);
  assert.equal(saves.writeSaveWithStatus(ledge, disk).persisted, true);
  assert.equal(saves.writeSaveWithStatus(track, disk).failure, "save-conflict");
  assert.equal(saves.writeSaveWithStatus(returned, disk).persisted, true);
  assert.equal(saves.writeSaveWithStatus(finished, disk).persisted, true);
  assert.deepEqual(saves.loadSaveWithStatus(disk).save.eliteMasteryV170, finished.eliteMasteryV170);
  assert.deepEqual(saves.parseSaveImport(saves.exportSave(finished)).save.eliteMasteryV170, finished.eliteMasteryV170);
  assert.equal(saves.parseSaveImport(JSON.stringify({
    ...finished, eliteMasteryV170: { ...result.state, ownerCreatedAt: "another" },
  })).failure, "invalid-save");
});
