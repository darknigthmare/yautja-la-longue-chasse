import assert from "node:assert/strict";
import { homeworldSceneSsrV78 } from "./homeworld-scene-ssr-v78.mjs";
import { formationCampaignRoute } from "./solo-v90-played-route.mjs";
import { playQuatzaHunt } from "./quatza-triage-route.mjs";

export const qa = homeworldSceneSsrV78();
const engine = qa.load("app/game/systems/quatzaRij.ts");

export function bloodedTempleAdmissionV174() {
  let { save } = formationCampaignRoute();
  const run = playQuatzaHunt(engine, "triad");
  run.prepare();
  run.fight();
  run.gatherAndReturn();
  function act(command) {
    const result = engine.commitQuatzaRij(save, { ...command, mode: "triad" });
    assert.ok(result.ok, result.message);
    save = { ...save, quatzaRij: result.state };
  }
  act({ type: "begin", expectedAttempts: 0 });
  for (let offset = 0; offset < run.input.length; offset += 64) {
    act({ type: "advance", expectedAttempts: 1, expectedTick: offset, input: run.input.slice(offset, offset + 64) });
  }
  act({ type: "present-return", expectedAttempts: 1, expectedPresentations: 0, subject: "companions" });
  act({ type: "present-return", expectedAttempts: 1, expectedPresentations: 1, subject: "trophy" });
  return save;
}
