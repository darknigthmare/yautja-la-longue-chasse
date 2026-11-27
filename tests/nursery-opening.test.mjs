import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: 'export * from "./app/game/systems/nurseryPrologue";' +
      'export * from "./app/game/systems/nurseryOpening";' +
      'export * from "./app/game/systems/nurseryContinuityV72";' +
      'export * from "./app/game/systems/nurseryCampaign";' +
      'export { defaultSave } from "./app/game/save";',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
const n = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const environment = { assetsReady: true, pageVisible: true, paused: false, nextChapterReady: true };

function frame(state, action = {}) {
  const result = n.stepNurseryPrologue(state, action, environment);
  assert.equal(result.completion, null);
  assert(n.normalizeNurseryCheckpoint(result.state), "valid opening or duel checkpoint");
  return result.state;
}

function beforeBreach() {
  let state = n.enableNurseryOpening(n.enableNurseryContinuityV72(n.createNurseryPrologue({ readyMode: "press" })));
  state = frame(state);
  assert.equal(state.phase, "prompt");
  state = n.skipNurseryContextV72(state);
  for (let tick = 0; tick < 240 && state.opening.stage === "latch"; tick++) {
    state = frame(state, { confirm: state.inputArmed && state.phase === "prompt" && state.phaseTick >= 24 });
  }
  assert.equal(state.phase, "opening");
  assert.equal(state.opening.stage, "tool");
  assert.equal(state.duelStartedAt, null);
  return state;
}

function walk(state, x) {
  for (let tick = 0; tick < 240 && Math.abs(state.opening.x - x) > 3; tick++) {
    state = frame(state, { move: Math.sign(x - state.opening.x) });
  }
  assert(Math.abs(state.opening.x - x) <= 3);
  return frame(state);
}
const act = state => frame(frame(state), { confirm: true });
const until = (state, target, ticks = 120) => {
  for (let index = 0; index < ticks && state.opening.stage !== target; index++) state = frame(state);
  assert.equal(state.opening.stage, target);
  return state;
};

function choose(state, tactic) {
  const { shelterX, coverMinX, toolX, baitX, ropeX } = n.NURSERY_OPENING;
  state = act(walk(state, 190));
  assert.equal(state.opening.stage, "tool");
  state = act(walk(state, toolX));
  assert.equal(state.opening.stage, "cover");
  state = act(walk(state, shelterX + 100));
  assert.equal(state.opening.stage, "cover");
  state = act(walk(state, coverMinX));
  assert.equal(state.opening.stage, "tactic");
  state = act(walk(state, tactic === "bait" ? baitX : ropeX));
  assert.equal(state.opening.tactic, tactic);
  return state;
}

function capture(state) {
  for (let tick = 0; tick < 500 && state.opening.stage === "drive"; tick++) {
    const opening = state.opening;
    state = frame(state, { move: opening.beastX - opening.x > 70 ? 1 : 0,
      light: n.nurseryOpeningCue(opening).action === "Repousser la charge" && !state.previousButtons.light });
  }
  assert.equal(state.opening.stage, "resolved");
  return state;
}

test("M001 plays two physical tactics before the duel and persists distinct outcomes", () => {
  const initial = { ...n.defaultSave(), prologue: n.createNurseryCampaign() };
  for (const [tactic, pushes] of [["bait", 3], ["net", 2]]) {
    let state = choose(beforeBreach(), tactic);
    assert.equal(state.opening.openingResolved, false);
    const saved = n.withNurseryCheckpoint(initial, state);
    assert(saved);
    const restored = n.normalizeNurseryCampaign(JSON.parse(JSON.stringify(saved.prologue))).checkpoint;
    assert.equal(restored.inputArmed, false);
    assert.equal(restored.opening.tactic, tactic);
    const held = n.stepNurseryPrologue(restored, { move: 1, confirm: true }, environment).state;
    assert.equal(held.tick, restored.tick);
    assert.equal(held.opening.x, restored.opening.x);
    state = capture(frame(restored));
    assert.equal(state.opening.pushes, pushes);
    assert.equal(state.opening.openingResolved, true);
    assert.equal(state.opening.openingSuccess, true);
    assert.equal(state.winner, null);
    assert.equal(state.duelStartedAt, null);
    const savedCapture = n.withNurseryCheckpoint(saved, state);
    assert(savedCapture);
    const reverted = { ...state, tick: state.tick + 1, opening: restored.opening };
    assert.equal(n.withNurseryCheckpoint(savedCapture, reverted), null);
    assert.equal(n.normalizeNurseryCheckpoint({ ...state, opening: { ...state.opening, pushes: 0 } }), null);
    state = act(Array.from({ length: 30 }).reduce(current => frame(current), state));
    assert.equal(state.phase, "ready");
    assert.equal(n.enableNurseryOpening(state), state);
    state = frame(frame(state), { ready: true });
    assert.equal(state.phase, "duel");
    assert.equal(state.opening.openingSuccess, true);
  }
});

test("Saar visibly rescues a failed attempt and the reprise never rewrites the initial defeat", () => {
  let state = choose(beforeBreach(), "net");
  state = walk(state, 568);
  state = until(state, "rescue");
  assert.equal(state.opening.rescues, 1);
  assert.equal(state.opening.openingResolved, false);
  state = act(state);
  assert.equal(state.opening.stage, "rescue");
  state = n.normalizeNurseryCheckpoint(JSON.parse(JSON.stringify(state)));
  for (let tick = 0; tick < n.NURSERY_OPENING.rescueTicks; tick++) state = frame(state);
  state = act(state);
  assert.equal(state.opening.stage, "drive");
  state = capture(state);
  assert.equal(state.opening.openingResolved, true);
  assert.equal(state.opening.openingSuccess, false);
  assert.equal(state.opening.rescues, 1);
});

test("pre-existing ready, in-duel and completed checkpoints are not redirected", () => {
  let state = n.enableNurseryContinuityV72(n.createNurseryPrologue({ readyMode: "press" }));
  state = n.skipNurseryContextV72(frame(state));
  for (let tick = 0; tick < 160 && state.phase !== "ready"; tick++) {
    state = frame(state, { confirm: state.inputArmed && state.phase === "prompt" && state.phaseTick >= 24 });
  }
  assert.equal(state.phase, "ready");
  assert.equal(n.enableNurseryOpening(state), state);
  state = frame(frame(state), { ready: true });
  assert.equal(state.phase, "duel");
  assert.equal(n.enableNurseryOpening(state), state);
  assert.equal(n.normalizeNurseryCheckpoint(state).opening, undefined);
});
