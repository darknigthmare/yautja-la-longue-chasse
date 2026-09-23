import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
const bundle = await build({ stdin: { contents: `
export * from "./app/game/save";
export * from "./app/game/systems/nurseryCampaign";
export * from "./app/game/systems/nurseryPrologue";
export * from "./app/game/systems/clanChronicle";
export * from "./app/game/systems/campaignSlots";
`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const p = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const owner = "2026-09-23T10:00:00.000Z", env = { assetsReady: true, pageVisible: true, paused: false, nextChapterReady: true };
const newSave = () => ({ ...p.defaultSave(owner), prologue: p.createNurseryCampaign() });
function store(save = newSave()) {
  const data = new Map([[p.SAVE_STORAGE_KEY, JSON.stringify(save)]]);
  return { data, getItem(key) { return data.get(key) ?? null; }, setItem(key, value) { data.set(key, value); }, removeItem(key) { data.delete(key); } };
}
function realEnding() {
  let state = p.createNurseryPrologue({ readyMode: "press" }), before = state, receipt = null;
  for (let frame = 0; frame < 2400 && state.phase !== "complete"; frame++) {
    const distance = Math.abs(state.rival.x - state.player.x);
    const actions = !state.inputArmed ? {} : state.phase === "prompt" ? { confirm: frame % 2 === 0 } : state.phase === "ready" ? { ready: frame % 2 === 0 } : state.phase === "duel" ? { move: distance > 44 ? state.rival.x > state.player.x ? 1 : -1 : 0, light: frame % 30 === 0 } : {};
    before = state;
    const result = p.stepNurseryPrologue(state, actions, env); state = result.state; receipt = result.completion ?? receipt;
  }
  assert.equal(state.phase, "complete"); assert(receipt);
  return { before, state, receipt };
}
const ending = realEnding();

test("V7 adult saves preserve progression without retroactively starting or completing youth", () => {
  const old = p.defaultSave(owner); delete old.prologue; old.version = 7;
  old.profile.honor = 720; old.statistics.missionsCompleted = 3;
  const restored = p.parseSaveImport(JSON.stringify(old));
  assert.equal(restored.failure, null); assert.equal(restored.save.version, 8);
  assert.equal(restored.save.prologue, null); assert.equal(restored.save.profile.honor, 720); assert.equal(restored.save.statistics.missionsCompleted, 3);
  assert.equal(p.withNurseryCompletion(restored.save, ending.receipt, ending.state), null);
});

test("checkpoint clears held inputs and carries no nursery completion or adult rewards", () => {
  let state = p.stepNurseryPrologue(p.createNurseryPrologue(), {}, env).state;
  const save = p.withNurseryCheckpoint(newSave(), state);
  assert(save); assert.equal(p.getChronicleRank(save.prologue.chronicle), "youngling");
  assert.equal(save.prologue.checkpoint.inputArmed, false);
  assert.equal(save.prologue.chronicle.evidence.some(e => e.id === "intro-completed"), false);
  assert.deepEqual(save.statistics, newSave().statistics); assert.deepEqual(save.inventory, newSave().inventory);
  assert.equal(p.withNurseryCheckpoint(save, ending.state), null, "terminal snapshot needs its real receipt");
  state = { ...state, phase: "complete" };
  assert.equal(p.withNurseryCompletion(save, ending.receipt, state), null);
});

test("real final transition atomically includes completion and recognition and is idempotent", () => {
  const waiting = p.withNurseryCheckpoint(newSave(), ending.before);
  const complete = p.withNurseryCompletion(waiting, ending.receipt, ending.state, owner);
  assert(complete); assert.equal(complete.prologue.status, "completed");
  assert.equal(p.getChronicleRank(complete.prologue.chronicle), "unblooded");
  assert.equal(complete.prologue.chronicle.evidence.filter(e => e.id === "intro-completed").length, 1);
  assert.equal(complete.prologue.chronicle.rites.filter(e => e.id === "nursery-recognition").length, 1);
  assert.deepEqual(complete.statistics, waiting.statistics); assert.equal(complete.profile.honor, waiting.profile.honor);
  assert.equal(complete.profile.playTimeSeconds, Math.floor(ending.state.tick / 60));
  assert.equal(p.withNurseryCompletion(complete, ending.receipt, ending.state), complete);
  assert.equal(p.withNurseryCompletion(complete, { ...ending.receipt, attempt: 99 }, ending.state), null);
  assert(p.parseSaveImport(JSON.stringify(complete)).save);
});


test("prologue play time counts only new simulation seconds across repeated checkpoints and pause", () => {
  const first = p.withNurseryCheckpoint(newSave(), ending.before);
  assert.equal(first.profile.playTimeSeconds, Math.floor(ending.before.tick / 60));
  const duplicate = p.withNurseryCheckpoint(first, ending.before);
  assert.equal(duplicate.profile.playTimeSeconds, first.profile.playTimeSeconds);
  const paused = p.stepNurseryPrologue(ending.before, {}, { ...env, paused: true }).state;
  assert.equal(p.withNurseryCheckpoint(duplicate, paused).profile.playTimeSeconds, first.profile.playTimeSeconds);
});

test("quota refusal leaves the title checkpoint and no proof; exact retry commits once", () => {
  const waiting = p.withNurseryCheckpoint(newSave(), ending.before), s = store(waiting);
  p.loadSaveWithStatus(s);
  const next = p.withNurseryCompletion(waiting, ending.receipt, ending.state, owner);
  const original = s.getItem(p.SAVE_STORAGE_KEY), write = s.setItem;
  s.setItem = () => { throw Object.assign(new Error("quota"), { name: "QuotaExceededError" }); };
  const failed = p.writeSaveWithStatus(next, s); assert.equal(failed.persisted, false); assert.equal(s.getItem(p.SAVE_STORAGE_KEY), original);
  s.setItem = write;
  assert.equal(p.reconcileSaveWrite(failed, owner, s).status, "retry");
  const success = p.writeSaveWithStatus(next, s); assert.equal(success.persisted, true);
  assert.equal(JSON.parse(s.getItem(p.SAVE_STORAGE_KEY)).prologue.status, "completed");
});

test("a write completed before throwing is reconciled without replay or duplicate rewards", () => {
  const waiting = p.withNurseryCheckpoint(newSave(), ending.before), s = store(waiting);
  p.loadSaveWithStatus(s);
  const write = s.setItem;
  s.setItem = (key, value) => { write(key, value); throw new Error("after write"); };
  const failed = p.writeSaveWithStatus(p.withNurseryCompletion(waiting, ending.receipt, ending.state), s);
  assert.equal(failed.persisted, false);
  s.setItem = write;
  const result = p.reconcileSaveWrite(failed, owner, s);
  assert.equal(result.status, "confirmed"); assert.equal(result.save.prologue.status, "completed");
  assert.equal(result.save.prologue.chronicle.rites.length, 1);
});

test("foreign owner or changed primary refuses prologue writes and preserves newer bytes", () => {
  const s = store(); const current = p.loadSaveWithStatus(s).save;
  const foreign = { ...p.defaultSave("2026-09-23T11:00:00.000Z"), profile: { ...current.profile, hunterName: "Other slot" } };
  const bytes = JSON.stringify(foreign); s.data.set(p.SAVE_STORAGE_KEY, bytes);
  const next = p.withNurseryCheckpoint(current, ending.before);
  assert.equal(p.writeSaveWithStatus(next, s).failure, "save-conflict"); assert.equal(s.getItem(p.SAVE_STORAGE_KEY), bytes);
});

test("malformed or future explicit youth records are protected rather than converted into adult access", () => {
  for (const prologue of [{ ...p.createNurseryCampaign(), version: 2 }, { ...p.createNurseryCampaign(), checkpoint: { version: 2 } }, { ...p.createNurseryCampaign(), chronicle: { version: 2 } }]) {
    assert.equal(p.parseSaveImport(JSON.stringify({ ...newSave(), prologue })).failure, "future-version");
  }
  for (const prologue of [{}, { ...p.createNurseryCampaign(), status: "completed" }, { ...p.createNurseryCampaign(), checkpoint: ending.state }]) {
    assert.equal(p.parseSaveImport(JSON.stringify({ ...newSave(), prologue })).failure, "invalid-save");
  }
});

Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: { async request(_name, _options, callback) { return callback({}); } } } });
test("new slots enter prologue, checkpoint resume retains it, and real completion resolves to Homeworld", async () => {
  const s = store(); s.data.clear();
  let result = await p.createCampaignSlot(1, "Youngling QA", s); assert(result.ok, result.message); assert.equal(result.checkpoint.resumeLocation, "prologue");
  result = await p.activateCampaignCheckpoint(1, result.checkpoint.id, { expectedRevision: result.catalog.slots[0].revision }, s); assert(result.ok, result.message);
  const active = p.loadSaveWithStatus(s).save;
  assert.equal(active.prologue.status, "active");
  assert(p.writeSaveWithStatus(p.withNurseryCheckpoint(active, ending.before), s).persisted);
  result = await p.continueCampaignSlot(1, { expectedRevision: result.catalog.slots[0].revision, location: "deck" }, s);
  assert(result.ok, result.message); assert.equal(result.checkpoint.resumeLocation, "prologue", "a route hint cannot bypass the nursery");
  const latest = p.loadSaveWithStatus(s).save;
  assert(p.writeSaveWithStatus(p.withNurseryCompletion(latest, ending.receipt, ending.state), s).persisted);
  result = await p.continueCampaignSlot(1, { expectedRevision: result.catalog.slots[0].revision, location: "prologue" }, s);
  assert(result.ok, result.message); assert.equal(result.checkpoint.resumeLocation, "homeworld"); assert.equal(result.save.prologue.status, "completed");
  assert.equal(p.CAMPAIGN_SLOT_IDS.length, 5); assert.equal(p.CAMPAIGN_MANUAL_COUNT, 10); assert.equal(p.CAMPAIGN_AUTO_COUNT, 2);
});
