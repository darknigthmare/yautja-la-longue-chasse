import assert from "node:assert/strict";
import test from "node:test";
import { p, env, owner, now, store, desert, patrolRoute } from "./helpers/youth-patrol-played-route.mjs";
const run = patrolRoute();
const step = (s, input = {}, environment = env) => p.stepYouthTraining(s, input, environment).state;
const advance = (s, ticks, input = {}, environment = env) => { for (let n = 0; n < ticks; n++) s = step(s, input, environment); return s; };

test("old desert return stays optional and a fresh choice enters the patrol without a proof", () => {
  const old = structuredClone(desert.save); delete old.youthTraining.checkpoint.patrol;
  const loaded = p.parseSaveImport(JSON.stringify(old)); assert.equal(loaded.failure, null);
  let state = loaded.save.youthTraining.checkpoint; assert.equal(state.patrol, null);
  assert.equal(advance(state, 1000).phase, "desert-complete");
  assert.equal(p.youthCampaignNeedsScene(loaded.save.youthTraining), false);
  state = step(state, { confirm: true }, { ...env, paused: true });
  assert.equal(advance(state, 200, { confirm: true }).phase, "desert-complete");
  state = step(state); const out = p.stepYouthTraining(state, { confirm: true }, env);
  assert.equal(out.state.phase, "patrol-briefing"); assert.equal(out.receipts.length, 0);
  assert(p.withYouthCheckpoint(loaded.save, out.state));
  assert.equal(p.withYouthCheckpoint(loaded.save, run.snapshots["patrol-route"].state), null);
});

test("physical patrol, three avoided charges, master assessment and return earn exactly five separate proofs", () => {
  assert.deepEqual([...run.phases], ["desert-complete", "patrol-briefing", "patrol-route", "patrol-ambush", "patrol-assessment", "patrol-return", "patrol-complete"]);
  assert.deepEqual(run.receipts.map(r => r.id), p.YOUTH_PATROL_MILESTONES);
  assert(run.receipts.every(r => r.sourceId === "youth.patrol.v52" && r.sceneId === "unblooded-patrol"));
  assert.equal(run.state.patrol.halts, 2); assert.equal(run.state.patrol.evaded, 3); assert.equal(run.state.patrol.totalHits, 0);
  assert.equal(run.save.youthTraining.receipts.length, 16); assert.equal(p.parseSaveImport(JSON.stringify(run.save)).failure, null);
  for (const key of ["inventory", "loadout", "statistics", "prologue"]) assert.deepEqual(run.save[key], desert.save[key], key);
  assert.deepEqual(run.save.youthTraining.equipment, desert.save.youthTraining.equipment);
  assert.equal(run.save.profile.honor, desert.save.profile.honor);
  assert.equal(run.save.youthTraining.completedAt, desert.save.youthTraining.completedAt);
  assert.equal(p.getChronicleRank(run.save.prologue.chronicle), "unblooded");
});

test("remote interaction, walking into basalt and insufficient waiting never validate the accompanied route", () => {
  let state = structuredClone(run.snapshots["patrol-route"].state); state = step(state);
  state = advance(state, 200, { interact: true }); assert.equal(state.patrol.halts, 0);
  while (state.player.x < 260) state = step(state, { move: 1 });
  state = advance(state, 20, { interact: true }); assert.equal(state.patrol.halts, 0); assert.equal(state.patrol.holdTicks, 20);
  state = step(state, { move: 1, interact: true }); assert.equal(state.patrol.holdTicks, 0);
  state = advance(state, 200, { move: 1 }); assert.equal(state.player.x, 330);
  assert.equal(state.patrol.halts, 0); assert.equal(state.milestones["youth-patrol-route"], undefined);
});

test("passive novice fails visibly; retry preserves previous proofs and total assessment mistakes", () => {
  const before = run.snapshots["patrol-ambush"];
  const failed = patrolRoute({ initial: before, stop: "patrol-defeat", input: () => ({}) });
  assert.equal(failed.state.player.composure, 0); assert.equal(failed.state.patrol.hits, 3);
  assert.equal(failed.state.patrol.totalHits, 3); assert.equal(failed.state.patrol.attempts, 1);
  assert.equal(failed.save.youthTraining.receipts.length, 13);
  assert.equal(advance(failed.state, 200).phase, "patrol-defeat");
  const recovered = patrolRoute({ initial: failed }); assert.equal(recovered.state.patrol.attempts, 2);
  assert.equal(recovered.state.patrol.hits, 0); assert.equal(recovered.state.patrol.totalHits, 3);
  assert.equal(recovered.save.youthTraining.receipts.length, 16);
  assert.match(p.youthPatrolAssessment(recovered.state.patrol), /2 tentatives/); assert.match(p.youthPatrolAssessment(recovered.state.patrol), /3 chocs/);
  assert.deepEqual(recovered.save.youthTraining.receipts.slice(0, 13), before.save.youthTraining.receipts);
});

test("pause, hidden page and missing art freeze hazard and require neutral input on return", () => {
  let state = run.snapshots["patrol-ambush"].state; state = advance(step(state), 110);
  assert.equal(state.patrol.grazer.phase, "charge");
  for (const blocked of [{ ...env, paused: true }, { ...env, pageVisible: false }, { ...env, assetsReady: false }]) {
    const stopped = advance(state, 500, { jump: true }, blocked);
    assert.equal(stopped.tick, state.tick); assert.deepEqual(stopped.patrol, state.patrol); assert.deepEqual(stopped.player, state.player);
    assert.equal(advance(stopped, 500, { jump: true }).tick, state.tick);
    assert.equal(step(stopped).tick, state.tick);
  }
});

test("reloading every 23 ticks during holds, jumps, telegraphs and charges keeps the whole patrol playable", () => {
  const restored = patrolRoute({ restoreEvery: 23 }); assert.equal(restored.state.phase, "patrol-complete");
  assert.deepEqual(restored.receipts.map(r => r.id), p.YOUTH_PATROL_MILESTONES); assert.equal(restored.state.patrol.totalHits, 0);
});

test("attack inputs cannot injure the grazer or award an evasion; only real avoidance completes the encounter", () => {
  let state = run.snapshots["patrol-ambush"].state; state = step(state);
  for (let n = 0; n < 130; n++) { state = step(state, n % 2 ? {} : { light: true, blade: true, throw: true }); assert(!["jab", "blade", "throw"].includes(state.player.action)); }
  assert.equal(state.patrol.evaded, 0); assert.equal(state.milestones["youth-patrol-encounter"], undefined);
  assert(!Object.hasOwn(state.patrol.grazer, "health"));
});

test("checkpoint imports reject missing, future, out-of-order and impossible patrol data", () => {
  for (const mutate of [s => { s.patrol = null; }, s => { s.patrol.version = 2; }, s => { s.patrol.halts = 1; }, s => { s.patrol.evaded = 2; }, s => { s.patrol.hits = 3; }, s => { s.patrol.totalHits = -1; }, s => { s.patrol.attempts = 0; }, s => { s.patrol.grazer.direction = 0; }, s => { s.patrol.grazer.x = Infinity; }, s => { delete s.milestones["youth-patrol-evaluation"]; }]) {
    const state = structuredClone(run.state); mutate(state); assert.equal(p.normalizeYouthTraining(state), null);
    const save = structuredClone(run.save); save.youthTraining.checkpoint = state; assert.equal(p.parseSaveImport(JSON.stringify(save)).failure, "invalid-save");
  }
  const state = structuredClone(run.snapshots["patrol-briefing"].state);
  state.patrol.grazer = Object.fromEntries(Object.entries(state.patrol.grazer).reverse()); assert(p.normalizeYouthTraining(state), "JSON key order is irrelevant");
});

test("routine checkpoints cannot create patrol proof, relabel it or roll back completed patrol", () => {
  const before = run.snapshots["patrol-briefing"], after = run.snapshots["patrol-route"], receipt = run.receipts[0];
  assert.equal(p.withYouthCheckpoint(before.save, after.state), null);
  assert.equal(p.withYouthProgress(before.save, [{ ...receipt, sourceId: "youth.desert.v49", sceneId: "unblooded-desert" }], after.state), null);
  const saved = p.withYouthProgress(before.save, [receipt], after.state, now); assert(saved);
  const retry = p.withYouthProgress(saved, [receipt], after.state, now); assert.equal(retry.youthTraining.receipts.length, 12);
  const rollback = structuredClone(run.snapshots["patrol-return"].state); rollback.tick = run.state.tick + 10; rollback.phaseTick = rollback.tick - rollback.phaseStartedAt;
  assert.equal(p.withYouthCheckpoint(run.save, rollback), null);
});

test("failed durable write cannot falsely complete patrol; exact retry and concurrent ownership remain guarded", () => {
  const before = run.snapshots["patrol-return"].save, storage = store(before), bytes = storage.getItem(p.SAVE_STORAGE_KEY); p.loadSaveWithStatus(storage);
  const original = storage.setItem; storage.setItem = () => { throw Object.assign(new Error("quota"), { name: "QuotaExceededError" }); };
  const refused = p.writeSaveWithStatus(run.save, storage); assert.equal(refused.persisted, false); assert.equal(storage.getItem(p.SAVE_STORAGE_KEY), bytes);
  storage.setItem = original; assert.equal(p.reconcileSaveWrite(refused, owner, storage).status, "retry"); assert.equal(p.writeSaveWithStatus(run.save, storage).persisted, true);
  assert.equal(JSON.parse(storage.getItem(p.SAVE_STORAGE_KEY)).youthTraining.receipts.length, 16);
  const other = store(before); p.loadSaveWithStatus(other);
  const competing = JSON.stringify({ ...before, createdAt: "2026-09-25T10:00:00.000Z" }); other.data.set(p.SAVE_STORAGE_KEY, competing);
  assert.equal(p.writeSaveWithStatus(run.save, other).failure, "save-conflict"); assert.equal(other.getItem(p.SAVE_STORAGE_KEY), competing);
});

test("only unfinished patrol forces scene restoration; completed formation and patrol still return to the city", () => {
  assert.equal(p.youthCampaignNeedsScene(desert.save.youthTraining), false);
  for (const phase of ["patrol-briefing", "patrol-route", "patrol-ambush", "patrol-assessment", "patrol-return"]) assert.equal(p.youthCampaignNeedsScene(run.snapshots[phase].save.youthTraining), true, phase);
  assert.equal(p.youthCampaignNeedsScene(run.save.youthTraining), false);
});

Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: { async request(_name, _options, callback) { return callback({}); } } } });
test("complete-party checkpoints route real patrol progress to youth scene and return completed patrol to Homeworld", async () => {
  const storage = store(desert.save); let result = await p.migrateLegacyCampaignSlot(storage); assert(result.ok, result.message);
  const id = result.catalog.activeSlotId; assert(id);
  for (const [played, expected] of [[desert.save, "homeworld"], [run.snapshots["patrol-ambush"].save, "youth-training"], [run.save, "homeworld"]]) {
    p.loadSaveWithStatus(storage); assert(p.writeSaveWithStatus(played, storage).persisted);
    const revision = p.loadCampaignSlots(storage).slots.find(slot => slot.id === id).revision;
    result = await p.continueCampaignSlot(id, { expectedRevision: revision, location: expected === "homeworld" ? "youth-training" : "deck" }, storage);
    assert(result.ok, result.message); assert.equal(result.checkpoint.resumeLocation, expected);
    assert.equal(p.loadSaveWithStatus(storage).save.youthTraining.checkpoint.phase, played.youthTraining.checkpoint.phase);
  }
});
