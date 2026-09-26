import assert from "node:assert/strict";

import { build } from "esbuild";
const bundle = await build({ stdin: { contents: `
export * from "./app/game/save";
export * from "./app/game/systems/nurseryCampaign";
export * from "./app/game/systems/nurseryPrologue";
export * from "./app/game/systems/youthCampaign";
export * from "./app/game/systems/youthTraining";
export * from "./app/game/systems/youthPatrol";
export * from "./app/game/systems/clanChronicle";
export * from "./app/game/systems/campaignSlots";
`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const p = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const owner = "2026-09-20T10:00:00.000Z", now = "2026-09-23T10:00:00.000Z";
const env = { assetsReady: true, pageVisible: true, paused: false };
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

function desertInput(state) {
  if (!state.inputArmed) return {};
  if (state.phase === "morning") return { confirm: true };
  const objective = p.getYouthObjective(state), delta = (objective.targetX ?? state.player.x) - state.player.x;
  const move = Math.abs(delta) > 25 ? dir(delta) : 0;
  if (["desert-crossing", "desert-return"].includes(state.phase)) {
    const ahead = p.getYouthObstacles(state).find(o => move === 1 ? o.x > state.player.x && o.x - state.player.x < 65 : o.x + o.width < state.player.x && state.player.x - o.x - o.width < 65);
    return { move, jump: !!ahead && state.player.vy === 0 && !state.previousButtons.jump, interact: state.phase === "desert-return" && !move && !state.previousButtons.interact };
  }
  if (state.phase === "desert-tracks") return { move, interact: !move };
  if (["desert-briefing", "desert-report"].includes(state.phase)) return { move, interact: !move && !state.previousButtons.interact };
  return {};
}
function desertRoute({ stop = "desert-complete", restoreEvery = 0 } = {}) {
  let save = until(6), state = save.youthTraining.checkpoint; const receipts = [], phases = new Set();
  for (let n = 0; n < 15000 && state.phase !== stop; n++) {
    if (restoreEvery && n % restoreEvery === 0) { state = p.normalizeYouthTraining(JSON.parse(JSON.stringify(state))); assert(state); }
    const output = p.stepYouthTraining(state, desertInput(state), env); state = output.state; phases.add(state.phase);
    assert(p.normalizeYouthTraining(state), `desert ${state.phase} tick ${state.tick}`);
    if (output.receipts.length) { save = p.withYouthProgress(save, output.receipts, state, now); receipts.push(...output.receipts); }
    else save = p.withYouthCheckpoint(save, state);
    assert(save, `campaign checkpoint ${state.phase} tick ${state.tick}`);
  }
  assert.equal(state.phase, stop); return { state, save, receipts, phases };
}

/** Genuine input route: every previous exercise and clue is played by the motor. */
export const desert = desertRoute();
export { p, env, owner, now, store, dir };
export function patrolInput(state) {
  if (!state.inputArmed) return {};
  if (state.phase === "desert-complete") return { confirm: true };
  const objective = p.getYouthObjective(state), delta = (objective.targetX ?? state.player.x) - state.player.x;
  const move = Math.abs(delta) > 24 ? dir(delta) : 0;
  if (["patrol-route", "patrol-return"].includes(state.phase)) {
    const ahead = p.getYouthObstacles(state).find(o => move === 1 ? o.x > state.player.x && o.x - state.player.x < 65 : o.x + o.width < state.player.x && state.player.x - o.x - o.width < 65);
    return { move, jump: !!ahead && state.player.vy === 0 && !state.previousButtons.jump, interact: !move && (state.phase === "patrol-route" || !state.previousButtons.interact) };
  }
  if (["patrol-briefing", "patrol-assessment"].includes(state.phase)) return { move, interact: !move && !state.previousButtons.interact };
  if (state.phase === "patrol-ambush") {
    const g = state.patrol.grazer, approach = g.direction * (state.player.x - g.x);
    return { jump: g.phase === "charge" && approach > 0 && approach < 150 && state.player.y === 430 && !state.previousButtons.jump };
  }
  if (state.phase === "patrol-defeat") return { retry: true };
  return {};
}
export function patrolRoute({ initial = desert, stop = "patrol-complete", restoreEvery = 0, input = patrolInput } = {}) {
  let save = structuredClone(initial.save), state = structuredClone(initial.state);
  const receipts = [], phases = new Set([state.phase]), snapshots = {};
  for (let n = 0; n < 12000 && state.phase !== stop; n++) {
    if (restoreEvery && n % restoreEvery === 0) { state = p.normalizeYouthTraining(JSON.parse(JSON.stringify(state))); assert(state); }
    const output = p.stepYouthTraining(state, input(state), env); state = output.state; phases.add(state.phase);
    assert(p.normalizeYouthTraining(state), `patrol ${state.phase} tick ${state.tick}: ${JSON.stringify(state.patrol)}`);
    if (output.receipts.length) { save = p.withYouthProgress(save, output.receipts, state, now); receipts.push(...output.receipts); }
    else save = p.withYouthCheckpoint(save, state);
    assert(save, `durable ${state.phase} tick ${state.tick}`);
    snapshots[state.phase] ??= { state: structuredClone(state), save: structuredClone(save) };
  }
  assert.equal(state.phase, stop, JSON.stringify({ phase: state.phase, player: state.player, rival: state.rival, patrol: state.patrol }));
  return { state, save, receipts, phases, snapshots };
}
