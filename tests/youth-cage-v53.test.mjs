import assert from "node:assert/strict";
import test from "node:test";
import { p, env, now, patrol, cageRoute } from "./helpers/youth-cage-played-route.mjs";
const run = cageRoute();
const step = (s, input = {}, environment = env) => p.stepYouthTraining(s, input, environment).state;
const advance = (s, ticks, input = {}, environment = env) => { for (let n = 0; n < ticks; n++) s = step(s, input, environment); return s; };
test("V52 return stays optional; no later cage checkpoint can open an unstarted chapter", () => {
  const old = structuredClone(patrol.save); delete old.youthTraining.checkpoint.cage;
  const loaded = p.parseSaveImport(JSON.stringify(old)); assert.equal(loaded.failure, null);
  assert.equal(advance(loaded.save.youthTraining.checkpoint, 600).phase, "patrol-complete");
  assert.equal(p.youthCampaignNeedsScene(loaded.save.youthTraining), false);
  assert(p.withYouthCheckpoint(loaded.save, run.snapshots["cage-briefing"].state));
  assert.equal(p.withYouthProgress(loaded.save, run.receipts, run.state), null);
});
test("physical entry, countdown, nonlethal victory, reward and exit produce four ordered unique proofs", () => {
  assert.deepEqual([...run.phases], ["patrol-complete", "cage-briefing", "cage-intro", "cage-countdown", "cage-duel", "cage-victory", "cage-reward", "cage-return", "cage-complete"]);
  assert.deepEqual(run.receipts.map(r => r.id), p.YOUTH_CAGE_MILESTONES);
  assert(run.receipts.every(r => r.sourceId === "youth.cage.v53" && r.sceneId === "unblooded-cage"));
  assert.equal(run.save.youthTraining.receipts.length, 20); assert.equal(run.state.cage.insignia, true);
  assert.equal(p.parseSaveImport(JSON.stringify(run.save)).failure, null);
  for (const key of ["inventory", "loadout", "statistics", "prologue"]) assert.deepEqual(run.save[key], patrol.save[key]);
  assert.deepEqual(run.save.youthTraining.equipment, patrol.save.youthTraining.equipment);
  assert.equal(run.save.profile.honor, patrol.save.profile.honor); assert.equal(p.getChronicleRank(run.save.prologue.chronicle), "unblooded");
  assert.equal(run.save.youthTraining.completedAt, patrol.save.youthTraining.completedAt);
  assert.equal(p.youthCampaignNeedsScene(run.save.youthTraining), false);
});
test("passive defeat, visible result and retry keep all validated evidence and count attempts", () => {
  const failed = cageRoute({ initial: run.snapshots["cage-duel"], stop: "cage-defeat", input: () => ({}) });
  assert.equal(failed.state.player.composure, 0); assert.equal(failed.state.cage.totalDamageTaken, 100);
  assert.equal(failed.save.youthTraining.receipts.length, 17); assert.equal(advance(failed.state, 500).phase, "cage-defeat");
  const retry = cageRoute({ initial: failed }); assert.equal(retry.state.cage.attempts, 2); assert(retry.state.cage.totalDamageTaken >= 100);
  assert.deepEqual(retry.save.youthTraining.receipts.slice(0, 17), failed.save.youthTraining.receipts);
  assert(retry.phases.has("cage-intro")); assert(retry.phases.has("cage-countdown"));
});
test("intro and countdown reject attacks, movement and held input across the fight boundary", () => {
  let s = step(run.snapshots["cage-intro"].state);
  for (let n = 0; n < 119; n++) { s = step(s, { light: true, blade: true, throw: true, move: 1 }); assert.equal(s.cage.damageDealt, 0); }
  s = step(s); assert.equal(s.phase, "cage-countdown"); s = step(s);
  const before = structuredClone(s);
  s = advance(s, 179, { light: true, move: 1 }); assert.deepEqual(s.player, before.player); assert.deepEqual(s.rival, before.rival);
  s = step(s, { light: true }); assert.equal(s.phase, "cage-duel"); const frozenTick = s.tick;
  s = advance(s, 100, { light: true }); assert.equal(s.tick, frozenTick); assert.equal(s.player.action, "idle");
  s = step(s); s = step(s, { light: true }); assert.equal(s.player.action, "jab");
});
test("pause, blur, missing art and reload freeze exact duel and require neutral controls", () => {
  const active = advance(step(run.snapshots["cage-duel"].state), 45, { move: 1 });
  for (const blocked of [{ ...env, paused: true }, { ...env, pageVisible: false }, { ...env, assetsReady: false }]) {
    const paused = advance(active, 300, { light: true }, blocked);
    assert.equal(paused.tick, active.tick); assert.deepEqual(paused.cage, active.cage); assert.deepEqual(paused.player, active.player); assert.deepEqual(paused.rival, active.rival);
    assert.equal(advance(paused, 60, { light: true }).tick, active.tick);
  }
  const restored = p.normalizeYouthTraining(JSON.parse(JSON.stringify(active))); assert(restored); assert.deepEqual(restored.cage, active.cage);
  assert.equal(advance(restored, 60, { move: 1 }).tick, active.tick);
});
test("roof and side cage limits are solid and blade input is harmless", () => {
  let s = step(run.snapshots["cage-duel"].state); s = advance(s, 100, { move: -1 }); assert.equal(s.player.x, p.YOUTH_CAGE.left);
  let minY = 430; s = step(s); s = step(s, { jump: true });
  for (let n = 0; n < 60; n++) { s = step(s); minY = Math.min(minY, s.player.y); }
  assert.equal(minY, p.YOUTH_CAGE.roofY + p.YOUTH_ARENA.actorHeight);
  for (let n = 0; n < 40; n++) { s = step(s, n % 2 ? {} : { blade: true }); assert.notEqual(s.player.action, "blade"); }
});
test("reloading every 23 ticks preserves the playable duel, reward and all previous chapters", () => {
  const restored = cageRoute({ restoreEvery: 23 }); assert.equal(restored.state.phase, "cage-complete"); assert.equal(restored.save.youthTraining.receipts.length, 20);
  assert.deepEqual(restored.save.youthTraining.receipts.slice(0, 16), patrol.save.youthTraining.receipts);
});
test("reward proofs cannot be duplicated, forged through routine saves, relabeled or rolled back", () => {
  const before = run.snapshots["cage-reward"], after = run.snapshots["cage-return"], reward = run.receipts[2];
  assert.equal(p.withYouthCheckpoint(before.save, after.state), null);
  assert.equal(p.withYouthProgress(before.save, [{ ...reward, sourceId: "youth.patrol.v52" }], after.state), null);
  const saved = p.withYouthProgress(before.save, [reward], after.state, now); assert(saved);
  assert.equal(p.withYouthProgress(saved, [reward], after.state, now).youthTraining.receipts.length, 19);
  const replay = p.withYouthProgress(run.save, run.receipts, run.state, now); assert.equal(replay.youthTraining.receipts.length, 20);
  for (const mutate of [s => { s.cage.insignia = false; }, s => { s.cage.damageDealt = 99; }, s => { s.cage.attempts++; }, s => { s.cage.totalDamageTaken++; }, s => { s.patrol = null; }, s => { delete s.milestones["youth-cage-victory"]; }, s => { s.player.x = 100; }, s => { s.player.y = 300; }]) {
    const bad = structuredClone(run.state); mutate(bad); assert.equal(p.normalizeYouthTraining(bad), null);
  }
});
