import assert from "node:assert/strict";
import { test } from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const qa = homeworldSceneSsrV78();
const saves = qa.load("app/game/save.ts");
const pass = qa.load("app/game/systems/elderPassageJudgmentV168.ts");
const owner = "2026-11-21T07:00:00.000Z";

const fresh = () => {
  const save = saves.defaultSave(owner);
  save.profile = { ...save.profile, rankId: "elite", acquiredRankIdV166: "elite", honor: 8000 };
  return save;
};
const tryAction = (save, position, operation, expectedRevision = save.elderPassageJudgmentV168?.revision ?? 0) =>
  pass.commitElderPassageJudgment(save, { expectedRevision, position, operation });
function apply(save, position, operation) {
  const result = tryAction(save, position, operation);
  assert.equal(result.ok, true, result.message);
  return { ...save, elderPassageJudgmentV168: result.state };
}
function begin(save) {
  save = apply(save, pass.PASSAGE_TRACES.west, { type: "read-trace", side: "west" });
  return apply(save, pass.PASSAGE_TRACES.east, { type: "read-trace", side: "east" });
}

test("the conflict and possible arrangements use the same paths as the physical board", () => {
  assert.equal(pass.simulateElderPassage({ method: "schedule", delay: 2 }, 0).passed, false);
  assert.equal(pass.simulateElderPassage({ method: "schedule", delay: 3 }, 0).passed, true);
  assert.equal(pass.canMoveInPassage({ column: 4, row: 0 }, 1), false);
  assert.equal(pass.simulateElderPassage({ method: "bridge" }, 1).passed, false);
  assert.equal(pass.passageTile(4, 0, 3), "bridge");
  assert.equal(pass.simulateElderPassage({ method: "bridge" }, 3).passed, true);
});

test("a witnessed schedule requires both traces, a valid rerun and the witness", () => {
  let save = fresh();
  const original = JSON.stringify(save.profile);
  assert.equal(tryAction(save, pass.PASSAGE_START, { type: "read-trace", side: "west" }).ok, false);
  assert.equal(tryAction({ ...save, profile: { ...save.profile, honor: 7999 } }, pass.PASSAGE_TRACES.west,
    { type: "read-trace", side: "west" }).ok, false);
  save = begin(save);
  assert.equal(tryAction(save, pass.PASSAGE_START, { type: "replay" }, 1).ok, false);
  save = apply(save, pass.PASSAGE_START, { type: "replay" });
  save = apply(save, pass.PASSAGE_START, { type: "test", trial: { method: "schedule", delay: 0 } });
  assert.equal(tryAction(save, pass.PASSAGE_WITNESS, { type: "settle" }).ok, false);
  save = apply(save, pass.PASSAGE_START, { type: "test", trial: { method: "schedule", delay: 4 } });
  assert.equal(tryAction(save, pass.PASSAGE_START, { type: "settle" }).ok, false);
  save = apply(save, pass.PASSAGE_WITNESS, { type: "settle" });
  const imported = saves.parseSaveImport(saves.exportSave(save)).save;
  assert(imported);
  assert.deepEqual(imported.elderPassageJudgmentV168, save.elderPassageJudgmentV168);
  assert.equal(JSON.stringify(save.profile), original);
  assert.equal(imported.profile.acquiredRankIdV166, saves.normalizeSave(fresh()).profile.acquiredRankIdV166);
  assert.equal(tryAction(imported, pass.PASSAGE_WITNESS, { type: "settle" }).ok, false);
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...save, elderPassageJudgmentV168: {
    ...save.elderPassageJudgmentV168, ownerCreatedAt: "other",
  } })).failure, "invalid-save");
});

test("both bridge anchors require visits and an older write preserves a witnessed ruling", () => {
  let save = apply(begin(fresh()), pass.PASSAGE_START, { type: "replay" });
  assert.equal(tryAction(save, pass.PASSAGE_START, { type: "anchor", side: "east" }).ok, false);
  save = apply(save, pass.PASSAGE_ANCHORS.west, { type: "anchor", side: "west" });
  const stale = save;
  save = apply(save, pass.PASSAGE_ANCHORS.east, { type: "anchor", side: "east" });
  save = apply(save, pass.PASSAGE_START, { type: "test", trial: { method: "bridge" } });
  save = apply(save, pass.PASSAGE_WITNESS, { type: "settle" });
  const memory = new Map();
  const disk = { getItem: key => memory.get(key) ?? null, setItem: (key, raw) => memory.set(key, raw), removeItem: key => memory.delete(key) };
  assert.equal(saves.replaceSaveWithStatus(save, disk).persisted, true);
  assert.equal(saves.writeSaveWithStatus(stale, disk).failure, "save-conflict");
  assert.equal(saves.loadSaveWithStatus(disk).save.elderPassageJudgmentV168.resolved, true);
});
