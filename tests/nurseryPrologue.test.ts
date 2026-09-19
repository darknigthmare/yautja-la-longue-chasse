import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import type { NurseryActions, NurseryEnvironment, NurseryState } from "../app/game/systems/nurseryPrologue";
const bundle = await build({ entryPoints: [fileURLToPath(new URL("../app/game/systems/nurseryPrologue.ts", import.meta.url))],
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022" });
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64")) as typeof import("../app/game/systems/nurseryPrologue");
const env: NurseryEnvironment = { assetsReady: true, pageVisible: true, paused: false, nextChapterReady: false };
const tick = (state: NurseryState, actions: NurseryActions = {}, context: NurseryEnvironment = env) => api.stepNurseryPrologue(state, actions, context).state;
function advance(state: NurseryState, count: number, actions: NurseryActions = {}, context = env): NurseryState {
  for (let i = 0; i < count; i++) state = tick(state, actions, context);
  return state;
}
function atReady(mode: "hold" | "press" = "hold"): NurseryState {
  let state = tick(api.createNurseryPrologue({ readyMode: mode }));
  state = tick(state); // neutral release at the prompt
  state = tick(state, { confirm: true });
  assert.equal(state.phase, "arrival");
  state = advance(state, api.NURSERY_TIMING.arrivalTicks);
  assert.equal(state.phase, "ready");
  return tick(state); // neutral release before the ready gesture
}
function duel(): NurseryState {
  const state = tick(atReady("press"), { ready: true });
  assert.equal(state.phase, "duel");
  return tick(state);
}
/** A contact fixture isolates collision/timing from CPU tactics, without a debug API. */
function contact(): NurseryState {
  const state = duel();
  state.player.x = 400; state.rival.x = 440; state.rivalDecisionTicks = 600;
  return state;
}
function victory(): NurseryState {
  let state = contact(); state.rival.composure = 12;
  state = tick(state, { light: true });
  state = advance(state, 7);
  assert.equal(state.phase, "ko");
  return state;
}

test("loading never reveals a missing scene and a held confirmation cannot skip the prompt", () => {
  let state = api.createNurseryPrologue();
  state = advance(state, 500, { confirm: true }, { ...env, assetsReady: false });
  assert.equal(state.tick, 0); assert.equal(state.phase, "loading");
  state = tick(state, { confirm: true });
  assert.equal(state.phase, "prompt");
  state = advance(state, 5, { confirm: true });
  assert.equal(state.phase, "prompt");
  state = tick(state); state = tick(state, { confirm: true });
  assert.equal(state.phase, "arrival");
  assert.equal(api.getNurseryPresentation(state).hud, false);
});

test("readiness needs 120 consecutive visible active ticks and release cancels it", () => {
  let state = advance(atReady(), 119, { ready: true });
  assert.equal(state.phase, "ready"); assert.equal(state.readyTicks, 119);
  state = tick(state); assert.equal(state.readyTicks, 0);
  state = advance(state, 119, { ready: true });
  assert.equal(state.phase, "ready");
  state = tick(state, { ready: true });
  assert.equal(state.phase, "duel");
  assert.equal(state.player.composure, 100); assert.equal(state.rival.composure, 100);
});

test("simple-press accessibility mode is an explicit alternative, not an automatic ready", () => {
  let state = atReady("press");
  state = advance(state, 300);
  assert.equal(state.phase, "ready");
  state = tick(state, { ready: true });
  assert.equal(state.phase, "duel");
});

test("pause, hidden page or lost art cancels charge and cannot secretly resume a held gesture", () => {
  for (const blocked of [{ paused: true }, { pageVisible: false }, { assetsReady: false }]) {
    let state = advance(atReady(), 110, { ready: true });
    const before = state.tick;
    state = advance(state, 10000, { ready: true }, { ...env, ...blocked });
    assert.equal(state.tick, before); assert.equal(state.readyTicks, 0);
    state = advance(state, 180, { ready: true });
    assert.equal(state.phase, "ready"); assert.equal(state.readyTicks, 0);
    state = tick(state); state = advance(state, 120, { ready: true });
    assert.equal(state.phase, "duel");
  }
});

test("hidden or paused duel freezes actors, attack frames, CPU and sequence clocks", () => {
  let state = tick(contact(), { throw: true });
  state = advance(state, 14);
  const expected = JSON.stringify({ player: state.player, rival: state.rival, tick: state.tick, phaseTick: state.phaseTick, ai: state.rivalDecisionTicks });
  for (const context of [{ ...env, paused: true }, { ...env, pageVisible: false }]) {
    const paused = advance(state, 900, { light: true }, context);
    assert.equal(JSON.stringify({ player: paused.player, rival: paused.rival, tick: paused.tick, phaseTick: paused.phaseTick, ai: paused.rivalDecisionTicks }), expected);
    assert.equal(paused.inputArmed, false);
  }
});

test("jab connects only at contact timing/range and a held button does not repeat", () => {
  let state = tick(contact(), { light: true });
  assert.equal(state.rival.composure, 100);
  state = advance(state, 6, { light: true });
  assert.equal(state.rival.composure, 100);
  state = tick(state, { light: true });
  assert.equal(state.rival.composure, 88);
  state = advance(state, 90, { light: true });
  assert.equal(state.rival.composure, 88);
  let distant = contact(); distant.rival.x = 800;
  distant = advance(tick(distant, { light: true }), 15);
  assert.equal(distant.rival.composure, 100);
});

test("a detached blade must physically be picked up and never duplicates between hand and ground", () => {
  let state = contact(); state.blade.x = 650;
  state = tick(state, { pickup: true }); assert.equal(state.blade.holder, null);
  state = tick(state); state.blade.x = state.player.x;
  state = tick(state, { pickup: true }); assert.equal(state.blade.holder, "player");
  assert.equal(api.getNurseryPresentation(state).actors[0].holdsDetachedBlade, true);
  assert.equal(api.getNurseryPresentation(state).actors[1].holdsDetachedBlade, false);
  state = tick(state); state = tick(state, { blade: true });
  state = advance(state, 11); assert.equal(state.rival.composure, 86);
  const unarmed = tick(contact(), { blade: true });
  assert.equal(unarmed.player.action, "idle");
});

test("a throw produces velocity, flight, travel and landing rather than teleportation", () => {
  let state = contact(); const startX = state.rival.x;
  state = tick(state, { throw: true }); state = advance(state, 13);
  assert.equal(state.rival.action, "thrown");
  assert.equal(state.rival.composure, 82);
  assert.ok(state.rival.vy < 0);
  assert.ok(Math.abs(state.rival.x - startX) < 2);
  const early = advance(state, 10);
  assert.ok(early.rival.x > startX + 30); assert.ok(early.rival.y < api.NURSERY_ARENA.groundY - 20);
  state = advance(early, 50);
  assert.equal(state.rival.y, api.NURSERY_ARENA.groundY); assert.equal(state.rival.vy, 0);
  assert.ok(state.rival.x <= api.NURSERY_ARENA.right);
});

test("a dodge avoids a telegraphed strike during its intended window", () => {
  const state = contact(); state.rival.action = "jab"; state.rival.actionTick = 4;
  const dodged = advance(tick(state, { dodge: true, move: -1 }), 3);
  assert.equal(dodged.player.composure, 100);
  assert.equal(dodged.player.action, "dodge");
  const hit = advance(state, 4);
  assert.equal(hit.player.composure, 88);
});

test("ring boundaries cannot cause lethal harm or let bodies leave the safe arena", () => {
  let state = contact(); state.player.x = api.NURSERY_ARENA.left; state.rival.x = api.NURSERY_ARENA.left + 40;
  state = advance(state, 100, { move: -1 });
  assert.ok(state.player.x >= api.NURSERY_ARENA.left);
  assert.ok(state.rival.x <= api.NURSERY_ARENA.right);
  assert.equal(state.player.composure, 100);
  assert.ok(Math.abs(state.player.x - state.rival.x) >= api.NURSERY_ARENA.halfWidth * 2 - 0.001);
});

test("KO alone cannot hand out an intro proof; reveal/title must finish and next chapter be ready", () => {
  let state = victory();
  assert.equal(state.rival.composure, 0); assert.equal(state.rival.action, "ko");
  assert.equal(api.getNurseryPresentation(state).controlEnabled, false);
  const phases: string[] = [];
  for (let i = 0; i < 900; i++) {
    const result = api.stepNurseryPrologue(state, { light: true, move: 1 }, env);
    assert.equal(result.completion, null); state = result.state;
    for (const event of result.events) if (event.type === "phase") phases.push(event.phase);
  }
  assert.deepEqual(phases, ["village-reveal", "moon-title"]);
  assert.equal(state.phase, "moon-title");
  assert.equal(api.getNurseryPresentation(state).awaitingNextChapter, true);
  const final = api.stepNurseryPrologue(state, {}, { ...env, nextChapterReady: true });
  assert.equal(final.state.phase, "complete");
  assert.deepEqual(final.completion, { id: "intro-completed", sourceId: "chronicle.intro.completed", sceneId: "nursery-prologue", attempt: 1 });
  assert.equal(api.stepNurseryPrologue(final.state, {}, { ...env, nextChapterReady: true }).completion, null);
});

test("a losing player retries the non-lethal duel without unlocking a chapter", () => {
  let state = contact(); state.player.composure = 12; state.rival.action = "jab"; state.rival.actionTick = 7;
  let result = api.stepNurseryPrologue(state, {}, env); state = result.state;
  assert.equal(state.phase, "defeat"); assert.equal(result.completion, null);
  state = tick(state); result = api.stepNurseryPrologue(state, { retry: true }, env); state = result.state;
  assert.equal(state.phase, "ready"); assert.equal(state.attempt, 2);
  assert.equal(state.player.composure, 100); assert.equal(state.rival.composure, 100);
  assert.equal(state.winner, null); assert.equal(state.duelStartedAt, null);
  assert.equal(result.completion, null);
});

test("paused camera/title cannot complete in the background", () => {
  let state = advance(victory(), 350);
  const phaseTick = state.phaseTick; const simTick = state.tick;
  state = advance(state, 1000, {}, { ...env, paused: true, nextChapterReady: true });
  assert.equal(state.phaseTick, phaseTick); assert.equal(state.tick, simTick);
  assert.notEqual(state.phase, "complete");
});

test("mid-throw checkpoint round trip preserves physics but clears held input", () => {
  let state = advance(tick(contact(), { throw: true }), 20);
  const saved = JSON.parse(JSON.stringify(state));
  const savedBytes = JSON.stringify(saved);
  const restored = api.normalizeNurseryCheckpoint(saved);
  assert.ok(restored);
  assert.deepEqual(restored.player, state.player); assert.deepEqual(restored.rival, state.rival);
  assert.equal(restored.inputArmed, false);
  let resumed = restored;
  for (let i = 0; i < 90; i++) { state = tick(state); resumed = tick(resumed); }
  assert.deepEqual(resumed, state);
  assert.equal(JSON.stringify(saved), savedBytes);
});

test("restoring a ready checkpoint cannot retain a nearly completed held gesture", () => {
  const partial = advance(atReady(), 119, { ready: true });
  let state = api.normalizeNurseryCheckpoint(JSON.parse(JSON.stringify(partial)))!;
  assert.equal(state.readyTicks, 0); assert.equal(state.inputArmed, false);
  state = advance(state, 121, { ready: true }); assert.equal(state.phase, "ready");
});

test("malformed checkpoints reject invented wins, invalid time/physics and unsupported versions", () => {
  const valid = contact();
  const invalids = [null, true, [], { ...valid, version: 2 }, { ...valid, tick: NaN }, { ...valid, phase: "complete" },
    { ...valid, phase: "ko", winner: "player", knockoutAt: valid.tick },
    { ...valid, player: { ...valid.player, x: Infinity } }, { ...valid, player: { ...valid.player, composure: -1 } },
    { ...valid, player: { ...valid.player, action: "ko" } }, { ...valid, player: { ...valid.player, y: 99999 } },
    { ...valid, rival: { ...valid.rival, id: "player" } }, { ...valid, duelStartedAt: valid.tick + 1 }];
  for (const invalid of invalids) assert.equal(api.normalizeNurseryCheckpoint(invalid), null);
  assert.ok(api.normalizeNurseryCheckpoint(valid));
  const win = victory(); assert.ok(api.normalizeNurseryCheckpoint(win));
  assert.equal(api.normalizeNurseryCheckpoint({ ...win, phase: "moon-title", titleStartedAt: win.tick }), null);
});

test("presentation never provides a health HUD or an adult stand-in", () => {
  for (const state of [api.createNurseryPrologue(), atReady(), contact(), victory()]) {
    const model = api.getNurseryPresentation(state);
    assert.equal(model.hud, false);
    assert.equal(model.vision, "natural-red-orange-yellow");
    assert.ok(model.actors.every(actor => actor.actorKind === "youngling"));
    assert.ok(model.actors.every(actor => !("composure" in actor)));
    assert.equal(model.title, "Yautja: The Long Hunt");
  }
});

test("fixed identical input produces identical outcomes without mutating prior states", () => {
  const initial = contact(); const before = JSON.stringify(initial);
  let a = initial; let b = initial;
  for (let i = 0; i < 450; i++) {
    const action: NurseryActions = { move: i % 80 < 40 ? 1 : -1, light: i % 30 === 0, dodge: i % 95 === 50, throw: i % 150 === 80 };
    a = tick(a, action); b = tick(b, action);
  }
  assert.deepEqual(a, b); assert.equal(JSON.stringify(initial), before);
});


test("a full unmodified CPU duel can be won through abstract movement and timed punches", () => {
  let state = api.createNurseryPrologue({ readyMode: "press" });
  for (let frame = 0; frame < 2000 && state.phase !== "ko" && state.phase !== "defeat"; frame++) {
    const distance = Math.abs(state.rival.x - state.player.x);
    const input: NurseryActions = state.phase === "prompt" ? { confirm: frame % 2 === 0 } :
      state.phase === "ready" ? { ready: frame % 2 === 0 } : state.phase === "duel" ?
        { move: distance > 44 ? state.rival.x > state.player.x ? 1 : -1 : 0, light: frame % 30 === 0 } : {};
    state = tick(state, input);
  }
  assert.equal(state.phase, "ko");
  assert.equal(state.winner, "player");
  assert.ok(state.player.composure > 0);
});

test("frame adapter discards background time and never fast-forwards a nearly ready gesture", () => {
  let adapter = api.createNurseryFrameAdapter(advance(atReady(), 110, { ready: true }));
  adapter = api.advanceNurseryFrame(adapter, { ready: true }, env, 1000).adapter;
  const before = adapter.state.tick;
  let result = api.advanceNurseryFrame(adapter, { ready: true }, { ...env, pageVisible: false }, 2000);
  assert.equal(result.steps, 0); assert.equal(result.state.readyTicks, 0);
  result = api.advanceNurseryFrame(result.adapter, { ready: true }, env, 9000000);
  assert.equal(result.steps, 0); assert.equal(result.state.tick, before);
  result = api.advanceNurseryFrame(result.adapter, { ready: true }, env, 9000017);
  assert.equal(result.state.phase, "ready"); assert.equal(result.state.readyTicks, 0);
});

test("frame adapter caps visible catch-up, discards long stalls and emits completion once", () => {
  let adapter = api.createNurseryFrameAdapter(contact());
  adapter = api.advanceNurseryFrame(adapter, {}, env, 1000).adapter;
  let result = api.advanceNurseryFrame(adapter, {}, env, 1100);
  assert.equal(result.steps, 6);
  const before = result.state.tick;
  result = api.advanceNurseryFrame(result.adapter, {}, env, 10000);
  assert.equal(result.steps, 0); assert.equal(result.state.tick, before);
  const title = advance(victory(), 800);
  adapter = api.createNurseryFrameAdapter(title);
  const ready = { ...env, nextChapterReady: true };
  adapter = api.advanceNurseryFrame(adapter, {}, ready, 2000).adapter;
  result = api.advanceNurseryFrame(adapter, {}, ready, 2100);
  assert.equal(result.completion?.id, "intro-completed"); assert.equal(result.steps, 1);
  assert.equal(api.advanceNurseryFrame(result.adapter, {}, ready, 2200).completion, null);
  const restored = api.normalizeNurseryCheckpoint(result.state);
  assert.ok(restored);
  assert.equal(api.stepNurseryPrologue(restored, {}, ready).completion, null);
});
