import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
const bundle = await build({ stdin: { contents: `
export * from "./app/game/save";
export * from "./app/game/systems/nurseryCampaign";
export * from "./app/game/systems/nurseryPrologue";
export * from "./app/game/systems/youthCampaign";
export * from "./app/game/systems/youthTraining";
export * from "./app/game/systems/clanChronicle";
export * from "./app/game/systems/campaignSlots";
`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const p = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const owner = "2026-09-20T10:00:00.000Z", now = "2026-09-23T10:00:00.000Z";
const env = { assetsReady: true, pageVisible: true, paused: false };
const clone = value => structuredClone(value);
const dir = n => Math.abs(n) < 8 ? 0 : n < 0 ? -1 : 1;
// Route copied from the motor QA: observes positions, never writes actor coordinates or milestones.
/** A physical keyboard-style player: it reads public positions and telegraphs, never writes the state. */
function play(s) {
    if (!s.inputArmed)
        return {};
    const a = s.player, r = s.rival, o = p.getYouthObjective(s), d = o.targetX === null ? 0 : o.targetX - a.x;
    if (s.phase === 'dojo-move')
        return { move: dir(d) };
    if (s.phase === 'dojo-jump' || s.phase === 'camp-run') {
        const move = dir(d);
        const obstacles = p.getYouthObstacles(s);
        const ahead = obstacles.find(b => move === 1 ? b.x > a.x && b.x - a.x < 65 : b.x + b.width < a.x && a.x - b.x - b.width < 65);
        return { move, jump: !!ahead && a.vy === 0 && !s.previousButtons.jump };
    }
    if (s.phase === 'dojo-dodge') {
        if (r.action === 'jab' && r.actionTick >= 24 && r.actionTick < 32 && a.action === 'idle')
            return { dodge: true, move: -1 };
        return { move: Math.abs(r.x - a.x) > 68 ? dir(r.x - a.x) : 0 };
    }
    if (s.phase === 'dojo-strike' || s.phase === 'dojo-throw' || s.phase === 'camp-duel') {
        const throwMove = s.phase === 'dojo-throw', range = throwMove ? 46 : 59, move = Math.abs(r.x - a.x) > range ? dir(r.x - a.x) : a.facing !== (r.x < a.x ? -1 : 1) ? dir(r.x - a.x) : 0;
        if (a.action === 'idle' && Math.abs(r.x - a.x) <= range && a.facing === (r.x < a.x ? -1 : 1))
            return throwMove ? { throw: !s.previousButtons.throw } : { light: !s.previousButtons.light };
        return { move };
    }
    if (s.phase === 'blade-award' || s.phase === 'armory' || s.phase === 'barracks')
        return { move: Math.abs(d) > 35 ? dir(d) : 0, interact: Math.abs(d) <= 35 && !s.previousButtons.interact, choice: s.phase === 'armory' ? 'rust' : undefined };
    return {};
}
function nurseryEnding() {
  let state = p.createNurseryPrologue({ readyMode: "press" }), receipt = null;
  for (let frame = 0; frame < 2400 && state.phase !== "complete"; frame++) {
    const distance = Math.abs(state.rival.x - state.player.x);
    const actions = !state.inputArmed ? {} : state.phase === "prompt" ? { confirm: frame % 2 === 0 } : state.phase === "ready" ? { ready: frame % 2 === 0 } : state.phase === "duel" ? { move: distance > 44 ? state.rival.x > state.player.x ? 1 : -1 : 0, light: frame % 30 === 0 } : {};
    const result = p.stepNurseryPrologue(state, actions, { ...env, nextChapterReady: true }); state = result.state; receipt = result.completion ?? receipt;
  }
  assert.equal(state.phase, "complete"); assert(receipt); return { state, receipt };
}
const ending = nurseryEnding();
function welcome() {
  const fresh = { ...p.defaultSave(owner), prologue: p.createNurseryCampaign() };
  const save = p.withNurseryCompletion(fresh, ending.receipt, ending.state, owner);
  save.homeworld.greetedNpcIds = ["hunt-king", "terrace-instructor"];
  return save;
}
function route() {
  let state = p.createYouthTraining(); const transitions = [], phases = {};
  for (let i = 0; i < 20000 && state.phase !== "morning"; i++) {
    const before = state, out = p.stepYouthTraining(state, play(state), env); state = out.state;
    if (!phases[state.phase]) phases[state.phase] = state;
    assert(p.normalizeYouthTraining(state), `${state.phase}:${state.tick}`);
    if (out.receipts.length) transitions.push({ before, state, receipts: out.receipts });
  }
  assert.equal(state.phase, "morning"); assert.equal(transitions.length, 6); return { transitions, phases, state };
}
const path = route();
const start = () => p.startYouthCampaign(welcome(), owner);
function until(index) { let save = start(); for (const transition of path.transitions.slice(0, index)) { save = p.withYouthProgress(save, transition.receipts, transition.state, now); assert(save); } return save; }
function store(save = start()) {
  const data = new Map([[p.SAVE_STORAGE_KEY, JSON.stringify(save)]]);
  return { data, getItem(key) { return data.get(key) ?? null; }, setItem(key, value) { data.set(key, value); }, removeItem(key) { data.delete(key); } };
}

test("V8 adult and completed nursery migrate without inventing youth exercise proof", () => {
  const adult = p.defaultSave(owner); adult.version = 8; delete adult.youthTraining;
  const restored = p.parseSaveImport(JSON.stringify(adult));
  assert.equal(restored.failure, null); assert.equal(restored.save.version, 9); assert.equal(restored.save.prologue, null); assert.equal(restored.save.youthTraining, null);
  const oldYouth = welcome(); oldYouth.version = 8; delete oldYouth.youthTraining;
  const migrated = p.parseSaveImport(JSON.stringify(oldYouth));
  assert.equal(migrated.failure, null); assert.equal(migrated.save.prologue.status, "completed"); assert.equal(migrated.save.youthTraining, null);
  assert.equal(p.getChronicleRank(migrated.save.prologue.chronicle), "unblooded");
});

test("the dojo requires the nursery, chief and mentor and awards no equipment on entry", () => {
  assert.equal(p.startYouthCampaign(p.defaultSave(owner)), null);
  for (const greeted of [[], ["hunt-king"], ["terrace-instructor"]]) { const save = welcome(); save.homeworld.greetedNpcIds = greeted; assert.equal(p.startYouthCampaign(save), null); }
  const save = start(); assert.equal(save.youthTraining.checkpoint.phase, "dojo-move"); assert.equal(save.youthTraining.receipts.length, 0);
  assert.deepEqual(save.youthTraining.equipment, { wristblade: false, biomask: false, accent: null });
  assert.deepEqual(save.inventory, welcome().inventory); assert.deepEqual(save.statistics, welcome().statistics);
  assert.equal(p.startYouthCampaign(save), save);
});

test("six real scene transitions commit proof and equipment without XP, adult loadout or premature rank", () => {
  let save = start(); const base = clone(save);
  for (let i = 0; i < path.transitions.length; i++) {
    const step = path.transitions[i]; save = p.withYouthProgress(save, step.receipts, step.state, now); assert(save);
    assert.equal(save.youthTraining.receipts.length, i + 1);
    assert.equal(save.youthTraining.equipment.wristblade, i >= 1); assert.equal(save.youthTraining.equipment.biomask, i >= 2);
    assert.equal(save.youthTraining.equipment.accent, i >= 2 ? "rust" : null);
    assert.equal(save.prologue.chronicle.evidence.some(item => item.id === "training-completed"), i >= 4);
    assert.equal(p.getChronicleRank(save.prologue.chronicle), "unblooded");
    assert.equal(save.youthTraining.status, i === 5 ? "completed" : "active");
    assert(p.parseSaveImport(JSON.stringify(save)).save);
    assert.deepEqual(save.inventory, base.inventory); assert.deepEqual(save.loadout, base.loadout); assert.deepEqual(save.statistics, base.statistics);
    assert.equal(save.profile.honor, base.profile.honor);
    assert.equal(save.profile.playTimeSeconds, base.profile.playTimeSeconds + Math.floor(step.state.tick / 60));
  }
  assert.equal(save.prologue.chronicle.evidence.filter(item => item.id === "training-completed").length, 1);
  assert(!save.prologue.chronicle.evidence.some(item => ["first-tracks", "unguided-hunt"].includes(item.id)));
  assert.equal(save.prologue.chronicle.rites.length, 1);
});

test("routine checkpoints cannot mint a milestone or accept a foreign or mistimed receipt", () => {
  const step = path.transitions[0], save = start();
  assert.equal(p.withYouthCheckpoint(save, step.state), null);
  assert.equal(p.withYouthProgress(save, [], step.state), null);
  for (const receipt of [{ ...step.receipts[0], tick: step.receipts[0].tick + 1 }, { ...step.receipts[0], sceneId: "pit" }, { ...step.receipts[0], sourceId: "button" }]) assert.equal(p.withYouthProgress(save, [receipt], step.state), null);
  assert.equal(p.withYouthProgress(save, [step.receipts[0], step.receipts[0]], step.state), null);
  const noProof = { id: "youth-first-rest", sourceId: "youth.training.v48", sceneId: "unblooded-training" };
  assert.equal(p.withYouthProgress(save, [noProof], save.youthTraining.checkpoint), null);
});

test("pause, repeated checkpoints and completion retry count only new simulation seconds", () => {
  const save = start(), step = path.transitions[0];
  const before = p.withYouthCheckpoint(save, step.before); assert(before);
  assert.equal(p.withYouthCheckpoint(before, step.before).profile.playTimeSeconds, before.profile.playTimeSeconds);
  const paused = p.stepYouthTraining(step.before, { move: 1 }, { ...env, paused: true }).state;
  assert.equal(p.withYouthCheckpoint(before, paused).profile.playTimeSeconds, before.profile.playTimeSeconds);
  const finished = until(6), last = path.transitions[5];
  const retry = p.withYouthProgress(finished, last.receipts, last.state, "2026-09-24T00:00:00.000Z");
  assert(retry); assert.equal(retry.profile.playTimeSeconds, finished.profile.playTimeSeconds); assert.equal(retry.youthTraining.completedAt, finished.youthTraining.completedAt);
  assert.equal(retry.youthTraining.receipts.length, 6); assert.equal(p.withYouthCheckpoint(finished, step.before), null);
});

test("quota refusal cannot grant the first blade; exact retry commits it once", () => {
  const save = until(1), s = store(save), step = path.transitions[1]; p.loadSaveWithStatus(s);
  const next = p.withYouthProgress(save, step.receipts, step.state, now), bytes = s.getItem(p.SAVE_STORAGE_KEY), original = s.setItem;
  s.setItem = () => { throw Object.assign(new Error("quota"), { name: "QuotaExceededError" }); };
  const failed = p.writeSaveWithStatus(next, s); assert.equal(failed.persisted, false); assert.equal(s.getItem(p.SAVE_STORAGE_KEY), bytes);
  assert.equal(JSON.parse(bytes).youthTraining.equipment.wristblade, false); s.setItem = original;
  assert.equal(p.reconcileSaveWrite(failed, owner, s).status, "retry"); assert.equal(p.writeSaveWithStatus(next, s).persisted, true);
  const durable = JSON.parse(s.getItem(p.SAVE_STORAGE_KEY)); assert.equal(durable.youthTraining.receipts.length, 2); assert.equal(durable.youthTraining.equipment.wristblade, true);
});

test("write completed before throwing reconciles its exact checkpoint and idempotent retry", () => {
  const save = until(2), s = store(save), step = path.transitions[2]; p.loadSaveWithStatus(s);
  const next = p.withYouthProgress(save, step.receipts, step.state, now), original = s.setItem;
  s.setItem = (key, value) => { original(key, value); throw new Error("after-write"); };
  const failed = p.writeSaveWithStatus(next, s); assert.equal(failed.persisted, false); s.setItem = original;
  const result = p.reconcileSaveWrite(failed, owner, s); assert.equal(result.status, "confirmed");
  const retry = p.withYouthProgress(result.save, step.receipts, step.state, now); assert(retry);
  assert.equal(retry.profile.playTimeSeconds, result.save.profile.playTimeSeconds); assert.equal(retry.youthTraining.receipts.length, 3);
});

test("same-owner and foreign newer campaign bytes cannot be overwritten by a stale youth stage", () => {
  for (const other of [owner, "2026-09-21T00:00:00.000Z"]) {
    const s = store(), current = p.loadSaveWithStatus(s).save, next = p.withYouthProgress(current, path.transitions[0].receipts, path.transitions[0].state, now);
    const newer = { ...current, createdAt: other, profile: { ...current.profile, hunterName: "Newer writer" } }, bytes = JSON.stringify(newer); s.data.set(p.SAVE_STORAGE_KEY, bytes);
    assert.equal(p.writeSaveWithStatus(next, s).failure, "save-conflict"); assert.equal(s.getItem(p.SAVE_STORAGE_KEY), bytes);
  }
});

test("malformed, excess, future and cross-campaign youth proofs stay protected", () => {
  const complete = until(6);
  for (const mutation of [save => { save.youthTraining.version = 2; }, save => { save.youthTraining.checkpoint.version = 2; }]) {
    const save = clone(complete); mutation(save); assert.equal(p.parseSaveImport(JSON.stringify(save)).failure, "future-version");
  }
  for (const mutation of [save => { save.youthTraining.receipts.pop(); }, save => { save.youthTraining.equipment.wristblade = false; }, save => { save.youthTraining.equipment.accent = "blue"; }, save => { save.youthTraining.completedAt = null; }, save => { save.youthTraining.receipts[0].tick++; }, save => { save.youthTraining.receipts.push(save.youthTraining.receipts[0]); }, save => { save.prologue = null; }, save => { save.homeworld.greetedNpcIds = ["hunt-king"]; }, save => { save.prologue.chronicle.evidence = save.prologue.chronicle.evidence.filter(item => item.id !== "training-completed"); }, save => { save.youthTraining = {}; }]) {
    const save = clone(complete); mutation(save); assert.equal(p.parseSaveImport(JSON.stringify(save)).failure, "invalid-save");
  }
  const premature = start(); premature.prologue.chronicle = p.recordChronicleEvidence(premature.prologue.chronicle, { id: "training-completed", sourceId: "chronicle.training.completed" }).state;
  assert.equal(p.parseSaveImport(JSON.stringify(premature)).failure, "invalid-save");
});

test("unsupported future hunt or rite receipts cannot unlock a youth campaign through import", () => {
  for (const [id, sourceId] of [["first-tracks", "chronicle.first-tracks.completed"], ["unguided-hunt", "chronicle.unguided-hunt.completed"], ["invented-future-proof", "unknown"]]) {
    const save = welcome(); save.prologue.chronicle.evidence.push({ id, sourceId });
    assert.equal(p.parseSaveImport(JSON.stringify(save)).failure, "invalid-save");
  }
  const duplicate = welcome(); duplicate.prologue.chronicle.evidence.push(duplicate.prologue.chronicle.evidence[0]);
  assert.equal(p.parseSaveImport(JSON.stringify(duplicate)).failure, "invalid-save");
  const rite = welcome(); rite.prologue.chronicle.rites.push({ id: "blooding-mark", sourceId: "chronicle.rite.blooding" });
  assert.equal(p.parseSaveImport(JSON.stringify(rite)).failure, "invalid-save");
  const adult = p.defaultSave(owner); adult.profile.honor = 300;
  assert.equal(p.parseSaveImport(JSON.stringify(adult)).failure, null);
});

test("acknowledged milestone dates cannot be rewritten by a later otherwise plausible checkpoint", () => {
  const save = until(1), step = clone(path.transitions[1]); step.state.milestones["youth-dojo-completed"]--;
  assert(p.normalizeYouthTraining(step.state)); assert.equal(p.withYouthProgress(save, step.receipts, step.state, now), null);
});

test("later checkpoints cannot regress practice, return to earlier phases or change an awarded mask", () => {
  let state = p.createYouthTraining();
  for (let i = 0; i < 500 && state.progress.moveMarkers === 0; i++) state = p.stepYouthTraining(state, play(state), env).state;
  assert.equal(state.progress.moveMarkers, 1);
  const first = p.withYouthCheckpoint(start(), state); assert(first);
  const reset = clone(state); reset.progress.moveMarkers = 0; reset.tick++; reset.phaseTick++;
  assert(p.normalizeYouthTraining(reset)); assert.equal(p.withYouthCheckpoint(first, reset), null);
  const afterJump = p.withYouthCheckpoint(start(), path.phases["dojo-dodge"]); assert(afterJump);
  const older = clone(path.phases["dojo-jump"]); older.tick = afterJump.youthTraining.checkpoint.tick + 20; older.phaseTick = older.tick - older.phaseStartedAt;
  assert(p.normalizeYouthTraining(older)); assert.equal(p.withYouthCheckpoint(afterJump, older), null);
  const masked = until(3), changed = clone(masked.youthTraining.checkpoint); changed.cosmetic = "ash";
  assert(p.normalizeYouthTraining(changed)); assert.equal(p.withYouthCheckpoint(masked, changed), null);
  const corrupted = welcome(); corrupted.prologue.chronicle = p.recordChronicleEvidence(corrupted.prologue.chronicle, { id: "training-completed", sourceId: "chronicle.training.completed" }).state;
  assert.equal(p.startYouthCampaign(corrupted), null);
});

test("real course timeout and real defeated-duel retry preserve acknowledged progress", () => {
  let save = until(3), state = save.youthTraining.checkpoint;
  for (let i = 0; i < 2200; i++) state = p.stepYouthTraining(state, {}, env).state;
  assert.equal(state.progress.courseAttempts, 2); save = p.withYouthCheckpoint(save, state); assert(save);
  // Continue this actual retry rather than resetting its recorded attempt counter.
  for (let i = 0; i < 10000 && state.phase !== "camp-duel"; i++) { const out = p.stepYouthTraining(state, play(state), env); state = out.state; if (out.receipts.length) { save = p.withYouthProgress(save, out.receipts, state, now); assert(save); } }
  assert.equal(state.phase, "camp-duel");
  for (let i = 0; i < 15000 && state.phase !== "camp-defeat"; i++) state = p.stepYouthTraining(state, {}, env).state;
  assert.equal(state.phase, "camp-defeat"); save = p.withYouthCheckpoint(save, state); assert(save);
  state = p.stepYouthTraining(state, {}, env).state; state = p.stepYouthTraining(state, { retry: true }, env).state;
  assert.equal(state.phase, "camp-duel"); assert.equal(state.progress.duelAttempts, 2); assert(p.withYouthCheckpoint(save, state));
});

Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: { async request(_name, _options, callback) { return callback({}); } } } });
test("active training forces its own checkpoint resume while a real morning returns to Homeworld", async () => {
  const s = store(); s.data.clear(); let result = await p.createCampaignSlot(1, "Youth QA", s); assert(result.ok, result.message);
  result = await p.activateCampaignCheckpoint(1, result.checkpoint.id, { expectedRevision: result.catalog.slots[0].revision }, s); assert(result.ok, result.message);
  const initial = p.loadSaveWithStatus(s).save, completed = p.withNurseryCompletion(initial, ending.receipt, ending.state);
  completed.homeworld.greetedNpcIds = ["hunt-king", "terrace-instructor"];
  const youth = p.startYouthCampaign(completed); assert(youth); assert(p.writeSaveWithStatus(youth, s).persisted);
  result = await p.continueCampaignSlot(1, { expectedRevision: result.catalog.slots[0].revision, location: "deck" }, s); assert(result.ok, result.message); assert.equal(result.checkpoint.resumeLocation, "youth-training");
  let current = p.loadSaveWithStatus(s).save; for (const step of path.transitions) current = p.withYouthProgress(current, step.receipts, step.state);
  assert(current); assert(p.writeSaveWithStatus(current, s).persisted);
  result = await p.continueCampaignSlot(1, { expectedRevision: result.catalog.slots[0].revision, location: "youth-training" }, s); assert(result.ok, result.message); assert.equal(result.checkpoint.resumeLocation, "homeworld");
});
