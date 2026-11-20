import assert from "node:assert/strict";
import {test} from "node:test";
import {homeworldSceneSsrV78} from "./helpers/homeworld-scene-ssr-v78.mjs";

const qa = homeworldSceneSsrV78();
const saves = qa.load("app/game/save.ts");
const {createNurseryCampaign, withNurseryCheckpoint, withNurseryCompletion} = qa.load("app/game/systems/nurseryCampaign.ts");
const {createNurseryPrologue, stepNurseryPrologue} = qa.load("app/game/systems/nurseryPrologue.ts");
const {CHRONICLE_EVIDENCE, recordChronicleEvidence} = qa.load("app/game/systems/clanChronicle.ts");
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

function withEvidence(save, ids) {
  const completed = save.prologue?.status === "completed" ? save : completedIntro(save);
  const chronicle = ids.reduce((state, id) => {
    const receipt = CHRONICLE_EVIDENCE.find(item => item.id === id);
    const result = recordChronicleEvidence(state, receipt);
    assert(result.accepted);
    return result.state;
  }, completed.prologue.chronicle);
  return { ...completed, prologue: { ...completed.prologue, chronicle } };
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
