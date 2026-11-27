import assert from "node:assert/strict";
import test from "node:test";
import { childhoodAdmissionV175, childhoodStorage, qaChildhood } from "./helpers/homeworld-childhood-v175.mjs";

const game = qaChildhood.load("app/game/systems/homeworldChildhoodV175.ts");
const ranks = qaChildhood.load("app/game/systems/clanChronicle.ts");
const youth = qaChildhood.load("app/game/systems/youthCampaign.ts");
const rooms = qaChildhood.load("app/game/systems/homeworldInteriorsV64.ts");
const post = { ...game.CHILDHOOD_POST_V175, suspended: false };
const seed = childhoodAdmissionV175();
function pilot(initial = seed) {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const read = () => childhoodStorage.loadSaveWithStatus(storage).save;
  assert(childhoodStorage.writeSaveWithStatus(initial, storage).save);
  return {
    read,
    write: campaign => childhoodStorage.writeSaveWithStatus(campaign, storage),
    view: () => { const save = read(); return game.childhoodViewV175(save.homeworld.childhoodV175, save.createdAt); },
    act(event) {
      const before = read(), previous = before.homeworld.childhoodV175;
      const result = game.actChildhoodV175(before, previous, event, post);
      assert(result.state, event + ": " + result.message);
      const next = { ...before, homeworld: { ...before.homeworld, childhoodV175: result.state } };
      const stored = childhoodStorage.writeSaveWithStatus(next, storage);
      assert(stored.save, stored.failure);
      assert.equal(stored.save.homeworld.childhoodV175.revision, (previous?.revision ?? 0) + 1);
      return read();
    }
  };
}
function walk(p, destination) {
  while (p.view().position !== destination) p.act(p.view().position < destination ? "east" : "west");
}
function finishBeam(p) {
  while (p.view().trial === "beam") {
    if (p.view().drift) p.act("use");
    p.act("east");
  }
}
function drills(p) {
  p.act("ring");
  assert.equal(p.view().companion, "Yena");
  walk(p, 3);
  p.act("use");
  assert.equal(p.view().position, 0, "The missed catch restarts only the current exercise");
  walk(p, 3);
  p.act("observe");
  p.act("use");
  p.act("beam");
  assert.equal(p.view().companion, "Harek");
  walk(p, 3);
  p.act("reset-current");
  assert.deepEqual(p.view().finished, ["ring"]);
  assert.equal(p.view().position, 0);
  finishBeam(p);
  p.act("spring");
  assert.equal(p.view().companion, "Tov");
  walk(p, 5);
  p.act("use");
  assert.deepEqual(p.view().finished, ["ring", "beam"]);
  assert.equal(p.view().position, 3);
  walk(p, 5);
  p.act("use");
  assert.deepEqual(p.view().finished, ["ring", "beam", "spring"]);
}
function observeTrail(p) {
  p.act("track");
  for (const position of [3, 6]) { walk(p, position); p.act("use"); p.act("track-sign"); }
  walk(p, 8); p.act("use"); p.act("track-decoy");
  assert.equal(p.view().position, 6);
  assert.equal(p.view().track.signs, 2);
  walk(p, 8); p.act("use"); p.act("track-sign");
  walk(p, 9); p.act("use");
  assert.equal(p.view().track.phase, "perched");
  p.act("use");
  assert.equal(p.view().track.phase, "returning");
  walk(p, 0);
}

test("M004 opens only after the real city errand and at the native training service", () => {
  const hall = rooms.homeworldInteriorForBuildingV64(post.roomId);
  assert(hall.points.some(point => point.pointId === post.pointId));
  const short = { ...seed, homeworld: { ...seed.homeworld, youthCityErrandV172: { ...seed.homeworld.youthCityErrandV172, reached: 1 } } };
  assert.equal(game.actChildhoodV175(short, undefined, "ring", post).state, undefined);
  assert.equal(game.actChildhoodV175(seed, undefined, "ring", { ...post, pointId: "outside" }).state, undefined);
  assert.equal(game.actChildhoodV175(seed, undefined, "ring", { ...post, suspended: true }).state, undefined);
  assert.equal(game.actChildhoodV175(seed, undefined, "track", post).state, undefined);
  const alternate = pilot(childhoodAdmissionV175({ route: "archives" }));
  alternate.act("spring");
  assert.equal(alternate.view().companion, "Yena");
  drills(pilot());
});

test("M006 opens the missing native exercise and keeps an interrupted checkpoint", () => {
  const p = pilot(childhoodAdmissionV175({ withLocation: true, withCeremony: true }));
  const ask = () => p.act("handoff");
  assert.equal(youth.startYouthCampaign(p.read()), null);
  ask();
  assert.equal(p.view().trial, "ring");
  assert.deepEqual(p.read().homeworld.childhoodV175.journal, ["ring"]);
  walk(p, 3); p.act("observe"); p.act("use");
  p.act("spring"); walk(p, 5); p.act("observe"); p.act("observe"); p.act("use");

  ask();
  assert.equal(p.view().trial, "beam");
  walk(p, 3);
  const reloaded = childhoodStorage.parseSaveImport(childhoodStorage.exportSave(p.read())).save;
  const before = game.childhoodViewV175(reloaded.homeworld.childhoodV175, reloaded.createdAt);
  const revisit = game.actChildhoodV175(reloaded, reloaded.homeworld.childhoodV175, "handoff", post);
  assert.match(revisit.message, /Reprends à ta position actuelle/);
  assert.equal(revisit.state, undefined, "The request cannot rewind or complete a live exercise");
  const restored = pilot(reloaded);
  assert.deepEqual(restored.view(), before);
  assert.deepEqual(restored.view().finished, ["ring", "spring"]);
  finishBeam(restored);
  restored.act("handoff");
  assert.equal(restored.view().trial, "track");
  assert.equal(restored.view().track.signs, 0);
  assert.equal(game.actChildhoodV175(restored.read(), restored.read().homeworld.childhoodV175, "use", post).state, undefined);
  assert.equal(youth.startYouthCampaign(restored.read()), null);
});

test("M005 keeps real indices, a route under the perch and both ways of reporting", () => {
  for (const [action, report] of [["show-map", "map"], ["show-passage", "passage"]]) {
    const p = pilot();
    drills(p);
    observeTrail(p);
    p.act(action);
    const reloaded = childhoodStorage.parseSaveImport(childhoodStorage.exportSave(p.read())).save;
    assert.equal(game.childhoodViewV175(reloaded.homeworld.childhoodV175, reloaded.createdAt).report, report);
  }
});

function playCeremony(p) {
  walk(p, 2);
  p.act("use");
  for (const name of ["Yena", "Harek", "Tov"]) {
    assert.equal(game.nextCohortGestureV175(p.view()).name, name);
    p.act("cohort-gesture");
    assert.equal(game.nextCohortStowV175(p.view()).name, name);
    p.act("cohort-stow");
  }
  walk(p, 4);
  const previewInteraction = () => game.actChildhoodV175(p.read(), p.read().homeworld.childhoodV175, "use", post);
  assert.equal(previewInteraction().cue, "ceremony-rack");
  p.act("use");
  assert.equal(previewInteraction().cue, undefined);
  walk(p, 7);
  assert.equal(previewInteraction().cue, "objective");
  p.act("use");
  assert.equal(previewInteraction().cue, undefined);
  assert.equal(p.view().position, 8);
}

test("M006 binds each first workshop choice to the campaign checkpoint while preserving the historical rank", () => {
  for (const opening of ["mask", "blades"]) {
    // Both greeters must be met on the actual Homeworld entry path.
    const p = pilot(childhoodAdmissionV175({ withLocation: true, withCeremony: true }));
    assert.equal(p.read().prologue.ceremonyM006, true);
    assert.equal(youth.startYouthCampaign(p.read()), null);
    drills(p); observeTrail(p); p.act("show-map"); p.act("handoff");
    assert.equal(game.actChildhoodV175(p.read(), p.read().homeworld.childhoodV175, "first-blades", post).state, undefined);
    assert.equal(game.actChildhoodV175(p.read(), p.read().homeworld.childhoodV175, "use", post).state, undefined);
    playCeremony(p);
    assert(p.view().passed);
    assert(p.view().stowed);
    assert.equal(youth.startYouthCampaign(p.read()), null);
    p.act("first-" + opening);
    assert.equal(p.view().firstWorkshop, opening);
    assert.equal(game.actChildhoodV175(p.read(), p.read().homeworld.childhoodV175, "first-blades", post).state, undefined);
    const started = youth.startYouthCampaign(p.read());
    assert(started);
    const stored = p.write(started);
    assert(stored.save, stored.failure);
    const reopened = childhoodStorage.parseSaveImport(childhoodStorage.exportSave(stored.save)).save;
    assert.equal(reopened.youthTraining.checkpoint.firstWorkshopV176, opening);
    assert.equal(ranks.getChronicleRank(reopened.prologue.chronicle), "unblooded");
    assert.deepEqual(reopened.prologue.chronicle, seed.prologue.chronicle);
    assert.equal(reopened.homeworld.childhoodV175.version, 3);
    assert.equal(reopened.prologue.ceremonyM006, true);
    const altered = structuredClone(reopened);
    altered.youthTraining.checkpoint.firstWorkshopV176 = opening === "blades" ? "mask" : "blades";
    assert.equal(childhoodStorage.parseSaveImport(JSON.stringify(altered)).failure, "invalid-save");
    assert.equal(youth.withYouthCheckpoint(reopened, altered.youthTraining.checkpoint), null);
  }
});

test("M006 preserves the old path for a youth campaign already in progress", () => {
  const seed = childhoodAdmissionV175({ withLocation: true });
  const legacyYouth = youth.startYouthCampaign(seed);
  assert(legacyYouth);
  const p = pilot(legacyYouth);
  drills(p); observeTrail(p); p.act("show-map"); p.act("handoff");
  for (const station of [2, 4, 7]) { walk(p, station); p.act("use"); }
  const played = p.read();
  assert.equal(p.view().ceremony, false);
  assert.equal(p.view().position, 7);
  assert.equal(game.actChildhoodV175(played, played.homeworld.childhoodV175, "first-blades", post).state, undefined);
  assert.equal(youth.startYouthCampaign(played).youthTraining.checkpoint.firstWorkshopV176, undefined);
});

test("the actual archive rejects foreign or impossible changes and refuses stale writes", () => {
  const p = pilot();
  p.act("ring"); p.act("east");
  const old = p.read(); p.act("west"); p.act("east");
  assert.equal(p.write(old).failure, "save-conflict");
  const withRecord = data => childhoodStorage.parseSaveImport(JSON.stringify({
    ...seed, homeworld: { ...seed.homeworld, childhoodV175: data }
  }));
  const settled = p.read().homeworld.childhoodV175;
  assert.equal(withRecord({ ...settled, ownerCreatedAt: "2025-01-01T00:00:00Z" }).failure, "invalid-save");
  assert.equal(withRecord({ ...settled, journal: ["show-map"] }).failure, "invalid-save");
  assert.equal(withRecord({ ...settled, version: 4 }).failure, "future-version");
  assert.equal(childhoodStorage.parseSaveImport(childhoodStorage.exportSave(seed)).save.homeworld.childhoodV175, undefined);
});

test("repeated missed catches keep the run writable without filling the earned checkpoint", () => {
  const p = pilot();
  p.act("ring");
  for (let attempt = 0; attempt < 103; attempt++) { walk(p, 3); p.act("use"); }
  assert.deepEqual(p.read().homeworld.childhoodV175.journal, ["ring"]);
  walk(p, 3); p.act("observe"); p.act("use");
  assert.deepEqual(p.view().finished, ["ring"]);
});

test("M006 saves three gestures and tools in order, then crosses the actual threshold", () => {
  const p = pilot(childhoodAdmissionV175({ withLocation: true }));
  drills(p);
  observeTrail(p);
  p.act("show-map");
  p.act("handoff");
  const canObserve = () => game.childhoodOptionsV175(p.view()).includes("cohort-gesture");
  assert.equal(canObserve(), false);
  walk(p, 2);
  p.act("use");
  assert.equal(game.childhoodOptionsV175(p.view()).includes("east"), false);
  for (const name of ["Yena", "Harek", "Tov"]) {
    assert.equal(game.nextCohortGestureV175(p.view()).name, name);
    assert.equal(canObserve(), true);
    p.act("cohort-gesture");
    assert.equal(canObserve(), false);
    assert.equal(game.nextCohortStowV175(p.view()).name, name);
    const interrupted = childhoodStorage.parseSaveImport(childhoodStorage.exportSave(p.read())).save;
    assert.equal(game.nextCohortStowV175(game.childhoodViewV175(interrupted.homeworld.childhoodV175, interrupted.createdAt)).name, name);
    p.act("cohort-stow");
  }
  assert.equal(canObserve(), false);
  const saved = p.read();
  const copy = childhoodStorage.parseSaveImport(childhoodStorage.exportSave(saved)).save;
  assert.equal(copy.homeworld.childhoodV175.version, 3);
  const restored = game.childhoodViewV175(copy.homeworld.childhoodV175, copy.createdAt);
  assert.equal(restored.cohortPresentations, 3);
  assert.equal(restored.cohortStowed, 3);
  const forged = structuredClone(saved);
  forged.homeworld.childhoodV175.version = 2;
  assert.equal(childhoodStorage.parseSaveImport(JSON.stringify(forged)).failure, "invalid-save");
  forged.homeworld.childhoodV175.version = 3;
  forged.homeworld.childhoodV175.journal.splice(forged.homeworld.childhoodV175.journal.indexOf("cohort-stow"), 1);
  assert.equal(childhoodStorage.parseSaveImport(JSON.stringify(forged)).failure, "invalid-save");
  walk(p, 4);
  p.act("use");
  walk(p, 7);
  assert.equal(p.view().passed, false);
  p.act("use");
  assert.equal(p.view().position, 8);
  p.act("first-mask");
  assert.equal(youth.startYouthCampaign(p.read()).youthTraining.checkpoint.firstWorkshopV176, "mask");
  const legacy = structuredClone(p.read());
  const record = legacy.homeworld.childhoodV175;
  record.version = 2;
  record.journal = record.journal.filter(event => event !== "cohort-stow")
    .map(event => event === "begin-ceremony" ? "handoff" : event);
  const historic = childhoodStorage.parseSaveImport(JSON.stringify(legacy)).save;
  const historicView = game.childhoodViewV175(historic?.homeworld.childhoodV175, historic?.createdAt);
  assert.equal(historicView.cohortPresentations, 3);
  assert.equal(historicView.position, 7);
  assert.equal(historicView.passed, true);
  assert.equal(historicView.ceremony, false);
  assert(youth.startYouthCampaign(historic));
});
