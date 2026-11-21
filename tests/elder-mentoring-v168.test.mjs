import assert from "node:assert/strict";
import { test } from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const qa = homeworldSceneSsrV78();
const saves = qa.load("app/game/save.ts");
const lesson = qa.load("app/game/systems/elderMentoringV168.ts");
const owner = "2026-11-21T07:00:00.000Z";
const stations = lesson.MENTORING_SUPPORTS;

function fresh() {
  const save = saves.defaultSave(owner);
  save.profile = { ...save.profile, rankId: "elite", acquiredRankIdV166: "elite", honor: 8000 };
  return save;
}

function command(save, position, operation, expectedRevision = save.elderMentoringV168?.revision ?? 0) {
  return lesson.commitElderMentoring(save, { expectedRevision, position, operation });
}

function apply(save, position, operation) {
  const result = command(save, position, operation);
  assert.equal(result.ok, true, result.message);
  return { ...save, elderMentoringV168: result.state };
}

function prepare(save, side) {
  return apply(save, stations[side], { type: "prepare", side });
}

function begin(first, second, choice) {
  const prepared = prepare(prepare(fresh(), first), second);
  return apply(prepared, lesson.MENTORING_POST, { type: "begin", choice });
}

test("recognition, terrain and two local supports gate the exercise", () => {
  const save = fresh();
  const west = { type: "prepare", side: "west" };
  assert.equal(command({ ...save, profile: { ...save.profile, honor: 7999 } }, stations.west, west).ok, false);
  assert.equal(command(save, { column: 0, row: 0 }, west).ok, false);
  assert.equal(command(save, stations.east, west).ok, false);
  assert.equal(command(save, lesson.MENTORING_POST, { type: "begin", choice: "alone" }).ok, false);
  const prepared = prepare(save, "west");
  assert.equal(command(prepared, stations.west, west).ok, false);
  assert.equal(command(prepared, stations.east, { type: "prepare", side: "east" }, 0).ok, false);
});

test("the novice chooses independently of the prompt and reacts to the exercise prey", () => {
  const autonomous = begin("west", "east", "alone").elderMentoringV168;
  const assisted = begin("west", "east", "hint").elderMentoringV168;
  const reversed = begin("east", "west", "alone").elderMentoringV168;
  assert.equal(lesson.mentoringNoviceSide(autonomous), lesson.mentoringNoviceSide(assisted));
  assert.notEqual(lesson.mentoringNoviceSide(autonomous), lesson.mentoringNoviceSide(reversed));
  assert.equal(lesson.mentoringFrames(autonomous, 0).length, lesson.mentoringFrames(assisted, 0).length + 1);
  assert.notEqual(lesson.mentoringFrames(autonomous, 0)[0].cue, lesson.mentoringFrames(assisted, 0)[0].cue);
  for (const state of [autonomous, assisted, reversed]) {
    const frames = [...lesson.mentoringFrames(state, 0), ...lesson.mentoringFrames(state, 1)];
    for (let index = 0; index < frames.length; index++) {
      const { novice, prey } = frames[index];
      assert(lesson.isMentoringPath(novice));
      assert(lesson.isMentoringPath(prey));
      assert.notDeepEqual(novice, prey);
      if (index === 0) continue;
      for (const actor of ["novice", "prey"]) {
        const previous = frames[index - 1][actor];
        const current = frames[index][actor];
        assert(Math.abs(current.column - previous.column) + Math.abs(current.row - previous.row) <= 1);
      }
    }
    assert.notDeepEqual(frames[0].prey, frames.at(-1).prey);
  }
});

test("both observations and the witness survive serialization without granting rank or honor", () => {
  let save = begin("east", "west", "hint");
  const originalProfile = saves.normalizeSave(save).profile;
  assert.equal(command(save, lesson.MENTORING_MENTOR, { type: "report" }).ok, false);
  assert.equal(command(save, lesson.mentoringLookout(save.elderMentoringV168), { type: "watch" }).ok, false);
  save = apply(save, lesson.MENTORING_POST, { type: "watch" });
  const halfway = saves.parseSaveImport(saves.exportSave(save));
  assert(halfway.save);
  assert.deepEqual(halfway.save.elderMentoringV168, save.elderMentoringV168);
  save = halfway.save;
  assert.equal(command(save, lesson.MENTORING_POST, { type: "watch" }).ok, false);
  save = apply(save, lesson.mentoringLookout(save.elderMentoringV168), { type: "watch" });
  assert.equal(command(save, lesson.MENTORING_POST, { type: "report" }).ok, false);
  save = apply(save, lesson.MENTORING_MENTOR, { type: "report" });
  const imported = saves.parseSaveImport(saves.exportSave(save));
  assert(imported.save);
  assert.deepEqual(imported.save.elderMentoringV168, {
    version: 1, ownerCreatedAt: owner, revision: 6, supports: ["east", "west"],
    attempt: { choice: "hint", observed: 2 }, resolved: true,
  });
  assert.equal(command(imported.save, lesson.MENTORING_MENTOR, { type: "report" }).ok, false);
  assert.deepEqual(save.profile, originalProfile);
  for (const [change, failure] of [
    [{ ownerCreatedAt: "another campaign" }, "invalid-save"],
    [{ supports: ["west", "west"] }, "invalid-save"],
    [{ attempt: { choice: "hint", observed: 1 } }, "invalid-save"],
    [{ revision: 5 }, "invalid-save"],
    [{ version: 2 }, "future-version"],
  ]) {
    const malformed = { ...save, elderMentoringV168: { ...save.elderMentoringV168, ...change } };
    assert.equal(saves.parseSaveImport(JSON.stringify(malformed)).failure, failure);
  }
});

test("a second tab cannot replace the prepared route or overwrite its choice", () => {
  const memory = new Map();
  const disk = { getItem: key => memory.get(key) ?? null, setItem: (key, raw) => memory.set(key, raw), removeItem: key => memory.delete(key) };
  assert.equal(saves.replaceSaveWithStatus(fresh(), disk).persisted, true);
  const save = saves.loadSaveWithStatus(disk).save;
  const firstTab = prepare(save, "west");
  const secondTab = prepare(save, "east");
  assert.equal(saves.writeSaveWithStatus(firstTab, disk).persisted, true);
  assert.equal(saves.writeSaveWithStatus(secondTab, disk).failure, "save-conflict");
  const both = prepare(saves.loadSaveWithStatus(disk).save, "east");
  assert.equal(saves.writeSaveWithStatus(both, disk).persisted, true);
  const ready = saves.loadSaveWithStatus(disk).save;
  const alone = apply(ready, lesson.MENTORING_POST, { type: "begin", choice: "alone" });
  const hint = apply(ready, lesson.MENTORING_POST, { type: "begin", choice: "hint" });
  assert.equal(saves.writeSaveWithStatus(alone, disk).persisted, true);
  assert.equal(saves.writeSaveWithStatus(hint, disk).failure, "save-conflict");
  assert.equal(saves.loadSaveWithStatus(disk).save.elderMentoringV168.attempt.choice, "alone");
});
