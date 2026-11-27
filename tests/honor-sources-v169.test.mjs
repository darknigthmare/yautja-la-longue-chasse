import assert from "node:assert/strict";
import {test} from "node:test";
import {homeworldSceneSsrV78} from "./helpers/homeworld-scene-ssr-v78.mjs";
import {createCradleReturnRoute} from "./helpers/buried-cradle-return-route.mjs";

const qa = homeworldSceneSsrV78();
const saves = qa.load("app/game/save.ts");
const {createNurseryCampaign, withNurseryCheckpoint, withNurseryCompletion} = qa.load("app/game/systems/nurseryCampaign.ts");
const {createNurseryPrologue, stepNurseryPrologue} = qa.load("app/game/systems/nurseryPrologue.ts");
const key = saves.SAVE_STORAGE_KEY;
const fresh = () => saves.defaultSave("2026-11-20T18:00:00.000Z");

function storage() {
  const values = new Map();
  let refuse = false;
  return {
    getItem: name => values.get(name) ?? null,
    setItem(name, value) {
      if (refuse && name === key) throw new Error("fixture quota");
      values.set(name, value);
    },
    removeItem: name => values.delete(name),
    refuseWrites: value => { refuse = value; },
  };
}

const env = { assetsReady: true, pageVisible: true, paused: false, nextChapterReady: true };
function realEnding() {
  let state = createNurseryPrologue({ readyMode: "press" }), before = state, receipt = null;
  for (let frame = 0; frame < 2400 && state.phase !== "complete"; frame++) {
    const distance = Math.abs(state.rival.x - state.player.x);
    const actions = !state.inputArmed ? {} : state.phase === "prompt" ? { confirm: frame % 2 === 0 } : state.phase === "ready" ? { ready: frame % 2 === 0 } : state.phase === "duel" ? { move: distance > 44 ? state.rival.x > state.player.x ? 1 : -1 : 0, light: frame % 30 === 0 } : {};
    before = state;
    const result = stepNurseryPrologue(state, actions, env); state = result.state; receipt = result.completion ?? receipt;
  }
  assert.equal(state.phase, "complete"); assert(receipt);
  return { before, state, receipt };
}
const ending = realEnding();
function completedIntro(save) {
  const active = withNurseryCheckpoint({ ...save, prologue: createNurseryCampaign() }, ending.before);
  assert(active);
  const completed = withNurseryCompletion(active, ending.receipt, ending.state, save.createdAt);
  assert(completed);
  return completed;
}


test("a saved chapter adds honour once while preserving the acquired rank through a reload", () => {
  const disk = storage();
  const save = fresh();
  save.profile.honor = 1499;
  const initial = saves.writeSaveWithStatus(save, disk);
  assert.equal(initial.persisted, true);
  const first = saves.writeSaveWithStatus(completedIntro(initial.save), disk);
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

test("saving a V168 pilot archive preserves its rank trial receipts for a compatible version", () => {
  const disk = storage();
  const old = fresh();
  assert.equal(saves.writeSaveWithStatus(old, disk).persisted, true);
  const archive = { version: 1, attempts: [{ id: "trial-original", receipts: ["keep"] }] };
  const byteProof = JSON.stringify({ ...old, profile: { ...old.profile, rankTrialsV168: archive } });
  disk.setItem(key, byteProof);
  assert.deepEqual(saves.normalizeSave(JSON.parse(byteProof)).profile.rankTrialsV168, archive);
  assert.equal(saves.parseSaveImport(byteProof).failure, "future-version");
  assert.equal(saves.loadSaveWithStatus(disk).failure, "future-version");
  assert.equal(saves.writeSaveWithStatus(old, disk).failure, "protected-save");
  assert.equal(disk.getItem(key), byteProof);
});

test("a quota error exposes the uncredited request, so a retry earns the chapter once", () => {
  const disk = storage();
  const initial = saves.writeSaveWithStatus(fresh(), disk);
  assert(initial.persisted);
  const before = disk.getItem(key);
  disk.refuseWrites(true);
  const refused = saves.writeSaveWithStatus(completedIntro(initial.save), disk);
  assert.equal(refused.persisted, false);
  assert.equal(refused.save.profile.honor, 0);
  assert.equal(disk.getItem(key), before);
  disk.refuseWrites(false);
  const retried = saves.writeSaveWithStatus(refused.save, disk);
  assert.equal(retried.persisted, true);
  assert.equal(retried.save.profile.honor, 100);
  assert.equal(saves.loadSave(disk).honorSourcesV169.entries.length, 1);
});

test("a copy without the confirmed ledger cannot turn supplementary points into a rank", () => {
  const disk = storage();
  const save = fresh();
  save.profile.honor = 1499;
  const initial = saves.writeSaveWithStatus(save, disk);
  const first = saves.writeSaveWithStatus(completedIntro(initial.save), disk);
  assert(first.persisted);
  const bytes = disk.getItem(key);
  const stale = { ...first.save, honorSourcesV169: undefined };
  const refusal = saves.writeSaveWithStatus(stale, disk);
  assert.equal(refusal.failure, "save-conflict");
  assert.equal(refusal.save.profile.rankId, "young-blood");
  assert.equal(disk.getItem(key), bytes);
});

test("lost supplementary points do not count against the later campaign rank", () => {
  const disk = storage();
  const initial = saves.writeSaveWithStatus(fresh(), disk);
  const credited = saves.writeSaveWithStatus(completedIntro(initial.save), disk);
  assert(credited.persisted);
  const afterLoss = saves.writeSaveWithStatus({ ...credited.save, profile: { ...credited.save.profile, honor: 0 } }, disk);
  assert(afterLoss.persisted);
  assert.equal(afterLoss.save.honorSourcesV169.outsideBalance, 0);
  assert.equal(afterLoss.save.honorSourcesV169.entries[0].delta, 100);
  const later = saves.writeSaveWithStatus({ ...afterLoss.save, profile: { ...afterLoss.save.profile, honor: 1500 } }, disk);
  assert(later.persisted);
  assert.equal(later.save.profile.rankId, "blooded");
  assert.equal(saves.loadSave(disk).profile.rankId, "blooded");
});

test("the adult Cradle debrief credits the actual returned queen once", () => {
  const campaign = qa.load("app/game/systems/buriedCradleCampaign.ts");
  const cradle = qa.load("app/game/systems/buriedCradle.ts");
  const {snapshotBuriedCradleRun} = qa.load("app/game/systems/buriedCradleSnapshot.ts");
  const {MISSIONS} = qa.load("app/game/data.ts");
  const context = {personalShipId:"classic-predator-spaceship", ownedShipIds:["classic-predator-spaceship"]};
  let save = fresh();
  for (const mission of MISSIONS) save.missionProgress[mission.id] = {
    ...save.missionProgress[mission.id], status:"completed", attempts:1, completions:1,
  };
  const doAction = action => {
    const result = campaign.actBuriedCradleCampaign(save, action, context);
    assert(result.accepted, result.message);
    save = {...save, buriedCradle:result.state, prologue:result.prologue};
  };
  doAction({type:"prepare"});
  doAction({type:"depart"});
  const run = cradle.createBuriedCradleRun({...save.buriedCradle.progress, rootRingCut:true,
    bossDefeated:true, visitedRoomIds:[...cradle.CRADLE_ROOM_IDS]}, 1);
  run.roomId = "12";
  run.player.x = 1620;
  const pickup = cradle.stepBuriedCradle(run, {interactPressed:true}, 1/60);
  assert(pickup.events.some(event => event.type === "crown-claimed"));
  pickup.run.player.x = 1788;
  const exit = cradle.stepBuriedCradle(pickup.run, {interactPressed:true}, 1/60).run;
  assert.equal(exit.extracted, true);
  doAction({type:"extract", progress:exit.progress, snapshot:snapshotBuriedCradleRun(exit)});
  const disk = storage();
  const waiting = saves.writeSaveWithStatus(save, disk);
  assert(waiting.persisted);
  assert.equal(waiting.save.profile.honor, 0);
  const presented = createCradleReturnRoute(qa).complete(waiting.save, context);
  assert.equal(presented.buriedCradle.crownDelivered, true);
  disk.refuseWrites(true);
  assert.equal(saves.writeSaveWithStatus(presented, disk).persisted, false);
  assert.equal(saves.loadSave(disk).profile.honor, 0);
  disk.refuseWrites(false);
  const settled = saves.writeSaveWithStatus(presented, disk);
  assert(settled.persisted);
  assert.equal(settled.save.profile.honor, 400);
  assert.equal(settled.save.profile.rankId, waiting.save.profile.rankId);
  const reloaded = saves.loadSave(disk);
  assert.equal(reloaded.profile.honor, 400);
  const settledAgain = saves.writeSaveWithStatus(reloaded, disk);
  assert(settledAgain.persisted);
  assert.deepEqual(settledAgain.save.honorSourcesV169.entries.map(({id, delta}) => [id, delta]),
    [["chronicle:first-queen-hunt",400]]);
  const historical = storage();
  assert(saves.writeSaveWithStatus(presented, historical).persisted);
  assert.equal(saves.loadSave(historical).profile.honor, 0);
});
