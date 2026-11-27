import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: `
      export * from "./app/game/systems/nurseryPrologue";
      export * from "./app/game/systems/nurseryContinuityV72";
      export * from "./app/game/systems/nurseryCohortV172";
      export * from "./app/game/systems/nurseryCampaign";
      export * from "./app/game/save";
    `,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  logLevel: "silent",
});
const nursery = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const environment = { assetsReady: true, pageVisible: true, paused: false, nextChapterReady: true };

function opening() {
  let state = nursery.enableNurseryCohort(nursery.enableNurseryContinuityV72(nursery.createNurseryPrologue({ readyMode: "press" })));
  for (let tick = 0; tick < 7000 && state.phase !== "cohort"; tick++) {
    const card = nursery.nurseryStoryCardV72(state);
    const distance = Math.abs(state.player.x - state.rival.x);
    const actions = !state.inputArmed ? {} : card ? { confirm: tick % 32 === 0 } :
      state.phase === "ready" ? { ready: tick % 32 === 0 } : state.phase === "duel" ?
        { move: distance > 44 ? Math.sign(state.rival.x - state.player.x) : 0, light: tick % 30 === 0 } : {};
    state = nursery.stepNurseryPrologue(state, actions, environment).state;
    assert(nursery.normalizeNurseryCheckpoint(state), `valid ${state.phase} checkpoint`);
  }
  assert.equal(state.phase, "cohort");
  return state;
}

function press(state, action) {
  const neutral = nursery.stepNurseryPrologue(state, {}, environment).state;
  const result = nursery.stepNurseryPrologue(neutral, action, environment);
  assert(nursery.normalizeNurseryCheckpoint(result.state));
  assert.equal(result.completion, null, "Courtyard actions must never grant rank on their own.");
  return result.state;
}

function walk(state, x) {
  state = nursery.stepNurseryPrologue(state, {}, environment).state;
  while (Math.abs(state.cohortV172.x - x) > 8) {
    state = nursery.stepNurseryPrologue(state, { move: Math.sign(x - state.cohortV172.x) }, environment).state;
  }
  return state;
}

test("the actual nursery ends in a playable courtyard with saved, ordered physical interactions", () => {
  let state = opening();
  assert.equal(state.winner, "player");
  assert.equal(state.cohortV172.steps, 0);
  assert.equal(press(state, { confirm: true }).cohortV172.steps, 0);
  state = walk(state, nursery.NURSERY_COHORT_STOPS[6].x - 2);
  assert.equal(press(state, { confirm: true }).cohortV172.steps, 0);

  for (const [index, stop] of nursery.NURSERY_COHORT_STOPS.slice(0, 6).entries()) {
    state = walk(state, stop.x);
    const raw = JSON.parse(JSON.stringify(state));
    state = nursery.normalizeNurseryCheckpoint(raw);
    assert.equal(state.cohortV172.steps, index);
    assert.equal(state.inputArmed, false);
    state = press(state, index === 0 ? { pickup: true } : { confirm: true });
    assert.equal(state.cohortV172.steps, index + 1);
  }

  for (const choice of ["review", "help"]) {
    const candidate = nursery.NURSERY_COHORT_CHOICES[choice];
    let branch = press(walk(state, candidate.x), { confirm: true });
    assert.equal(branch.cohortV172.choice, choice);
    branch = press(walk(branch, nursery.NURSERY_COHORT_CHOICES[choice === "review" ? "help" : "review"].x), { confirm: true });
    assert.equal(branch.cohortV172.choice, choice);
    const departure = press(walk(branch, nursery.NURSERY_COHORT_STOPS[6].x), { confirm: true });
    assert.equal(departure.phase, "walkout");
    assert.equal(departure.cohortV172.steps, 7);
    assert.equal(departure.cohortV172.choice, choice);
    assert.equal(nursery.enableNurseryCohort(departure), departure);
  }

  const noOptionalChoice = press(walk(state, nursery.NURSERY_COHORT_STOPS[6].x), { confirm: true });
  assert.equal(noOptionalChoice.phase, "walkout");
  assert.equal(noOptionalChoice.cohortV172.choice, null);
});

test("the existing campaign checkpoint retains cohort state and rejects fabricated or regressing progress", () => {
  const first = opening();
  const pickedUp = press(walk(first, nursery.NURSERY_COHORT_STOPS[0].x), { confirm: true });
  const initial = { ...nursery.defaultSave(), prologue: nursery.createNurseryCampaign() };
  const saved = nursery.withNurseryCheckpoint(initial, pickedUp);
  assert(saved);
  assert.deepEqual(nursery.normalizeNurseryCampaign(JSON.parse(JSON.stringify(saved.prologue))).checkpoint.cohortV172, pickedUp.cohortV172);

  assert.equal(nursery.withNurseryCheckpoint(saved, { ...first, tick: pickedUp.tick + 1 }), null);
  const impossible = structuredClone(saved.prologue.checkpoint);
  impossible.cohortV172.choice = "help";
  assert.equal(nursery.normalizeNurseryCheckpoint(impossible), null);
  delete impossible.cohortV172;
  assert.equal(nursery.normalizeNurseryCheckpoint(impossible), null);
  const held = nursery.stepNurseryPrologue(pickedUp, { move: 1, confirm: true }, { ...environment, paused: true }).state;
  assert.equal(held.tick, pickedUp.tick);
  assert.deepEqual(held.cohortV172, pickedUp.cohortV172);
});
