import assert from "node:assert/strict";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: `
    export * from "./app/game/save";
    export * from "./app/game/systems/nurseryCampaign";
    export * from "./app/game/systems/nurseryPrologue";
    export * from "./app/game/systems/nurseryContinuityV72";
    export * from "./app/game/systems/nurseryCohortV172";
    export * from "./app/game/systems/nurseryOpening";
    export * from "./app/game/systems/originFirstShockO6";
    export { createOriginV151 } from "./app/game/systems/originsV151";
    export { startYouthCampaign } from "./app/game/systems/youthCampaign";
  `, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
export const firstShock = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

const environment = { assetsReady: true, pageVisible: true, paused: false, nextChapterReady: true };
const date = "2026-11-27T12:14:17.000Z";

const targetOpening = (target, state, ready) => Math.abs(target - state.opening.x) > 4
  ? { move: Math.sign(target - state.opening.x) }
  : { confirm: ready };

function openingInput(n, state, assist) {
  const ready = !state.previousButtons.confirm;
  const result = state.opening;
  switch (result.stage) {
    case "tool": return targetOpening(n.NURSERY_OPENING.toolX, state, ready);
    case "cover": return targetOpening(n.NURSERY_OPENING.coverMinX + 3, state, ready);
    case "tactic": return targetOpening(n.NURSERY_OPENING.ropeX, state, ready);
    case "drive": {
      if (assist && result.rescues === 0) return { move: result.beastX - result.x > 55 ? 1 : 0 };
      return { move: result.beastX - result.x > 70 ? 1 : 0,
        light: n.nurseryOpeningCue(result).action === "Repousser la charge" && !state.previousButtons.light };
    }
    case "rescue":
    case "resolved": return { confirm: ready && Boolean(n.nurseryOpeningCue(result).action) };
    default: return {};
  }
}

export function admittedFirstShockO6({ originId = "O6", legacy = false, assist = false } = {}) {
  const n = firstShock;
  let state = n.enableNurseryOpening(n.enableNurseryCohort(n.enableNurseryContinuityV72(n.createNurseryPrologue({ readyMode: "press" }))));
  const step = input => {
    const result = n.stepNurseryPrologue(state, input, environment);
    state = result.state;
    return result.completion;
  };
  for (let tick = 0; tick < 12000 && state.phase !== "cohort"; tick++) {
    const distance = Math.abs(state.player.x - state.rival.x);
    const input = !state.inputArmed ? {} : n.nurseryStoryCardV72(state) ? { confirm: tick % 32 === 0 }
      : state.phase === "opening" ? openingInput(n, state, assist)
        : state.phase === "ready" ? { ready: tick % 32 === 0 }
          : state.phase === "duel" ? { move: distance > 44 ? Math.sign(state.rival.x - state.player.x) : 0, light: tick % 30 === 0 } : {};
    step(input);
  }
  assert.equal(state.phase, "cohort");
  assert.equal(state.opening.openingResolved, true);
  assert.equal(state.opening.openingSuccess, !assist);
  for (const [index, mark] of n.NURSERY_COHORT_STOPS.entries()) {
    step({});
    for (let tick = 0; tick < 300 && Math.abs(state.cohortV172.x - mark.x) > 6; tick++) {
      step({ move: Math.sign(mark.x - state.cohortV172.x) });
    }
    assert.ok(Math.abs(state.cohortV172.x - mark.x) <= 6);
    step({});
    step(index === 0 ? { pickup: true } : { confirm: true });
    assert.equal(state.cohortV172.steps, index + 1);
  }

  let receipt, before;
  for (let tick = 0; tick < 8000 && state.phase !== "complete"; tick++) {
    before = state;
    receipt = step({ confirm: tick % 32 === 0 });
  }
  assert.equal(state.phase, "complete");
  assert.ok(receipt);
  const start = { ...n.defaultSave(date), prologue: n.createNurseryCampaign() };
  if (legacy) delete start.originV151;
  else start.originV151 = n.createOriginV151(originId);
  const waiting = n.withNurseryCheckpoint(start, before);
  assert.ok(waiting);
  const completed = n.withNurseryCompletion(waiting, receipt, state, date);
  assert.ok(completed);
  return { waiting, completed, receipt, state };
}

export function walkFirstShockToO6(x, target) {
  for (let step = 0; step < 100 && Math.abs(x - target) > 6; step++) {
    x = firstShock.moveFirstShockO6(x, Math.sign(target - x));
  }
  assert.ok(Math.abs(x - target) <= 6);
  return x;
}
