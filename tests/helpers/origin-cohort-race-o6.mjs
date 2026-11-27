import assert from "node:assert/strict";
import { build } from "esbuild";
import { admittedFirstShockO6, firstShock, walkFirstShockToO6 } from "./origin-first-shock-o6.mjs";

const bundle = await build({
  stdin: { contents: `
    export * from "./app/game/save";
    export * from "./app/game/systems/cohortRaceCourseO6";
    export * from "./app/game/systems/originCohortRaceO6";
    export { startYouthCampaign } from "./app/game/systems/youthCampaign";
  `, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
export const course = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

export function courtyardHandoffO6({ partial = false } = {}) {
  const n = firstShock;
  const common = admittedFirstShockO6().completed;
  let save = common;
  let record = n.firstShockActiveO6(save);
  let x = n.firstShockResumeX(record);
  function act(order, target) {
    x = walkFirstShockToO6(x, target);
    const reply = n.applyFirstShockO6(save, order, x);
    assert.ok(reply, order);
    save = reply.save;
    record = n.firstShockActiveO6(save);
    if (reply.retryAt !== null) x = reply.retryAt;
  }
  const net = record.netX;
  act("retrieve", net);
  act("reach-harek", n.FIRST_SHOCK_HAREK_O6);
  if (partial) {
    act("choose-saar", n.FIRST_SHOCK_HAREK_O6);
    act("test-brace", net + 12);
    act("postpone", net);
    assert.equal(record.success, false);
  } else {
    act("hear-harek", n.FIRST_SHOCK_HAREK_O6);
    assert.equal(record.success, true);
  }
  const before = save;
  act("return-weapon", net);
  assert.equal(record, null);
  const armed = course.advanceFirstShockIntoCohortO6(before, "return-weapon", x).save;
  const returned = { ...save, originV151: { ...save.originV151, firstShockO6: { ...save.originV151.firstShockO6, version: 1 } } };
  return { common, before, returned, armed, incomplete: save };
}
