import assert from "node:assert/strict";
import { build } from "esbuild";
import { applyRivalForTest, findRivalLaunchO6, rival, rivalAdmissionO6, town } from "./origin-rival-race-o6.mjs";

const bundle = await build({
  stdin: { contents: 'export * from "./app/game/systems/originLittleTrailO6";' +
    'export * from "./app/game/systems/littleTrailRouteO6";',
  resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
export const trail = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
export { rival, town };

export function littleTrailAdmissionO6({ partial = false, unresolved = false, nurseryPolicies = false } = {}) {
  const source = rivalAdmissionO6({ partial, nurseryPolicies });
  const x = rival.RIVAL_HAREK_POST_O6;
  let save = [null, { type: "observe", x }, { type: "choose", x, choice: partial ? "warn" : "race" }]
    .reduce(applyRivalForTest, source);
  if (unresolved) return save;
  const steps = partial ? ["land", "land", "fall"] : ["land", "land"];
  for (const kind of steps) {
    const view = rival.rivalRaceViewO6(save.originV151.rivalRaceO6);
    const surface = rival.RIVAL_SUPPORTS_O6[view.platform];
    const direction = kind === "fall" ? -1 : 1;
    const order = findRivalLaunchO6(view.platform, view.choice, view.x, kind,
      direction === 1 ? surface.right : surface.left + 24, view.beat, direction).order;
    save = applyRivalForTest(save, order);
  }
  if (partial) save = applyRivalForTest(save, { type: "climb", x: rival.RIVAL_LADDER_O6 });
  return applyRivalForTest(save, { type: "finish", x: rival.RIVAL_FLAG_O6 });
}

export function applyLittleTrailO6(save, order) {
  const at = save.homeworld.locationV77;
  const journal = order ? trail.playLittleTrailO6(save, order) : trail.beginLittleTrailO6(save, at);
  assert(journal, JSON.stringify(order));
  const next = { ...save, originV151: { ...save.originV151, littleTrailO6: journal } };
  assert(trail.keepsLittleTrailO6(save, next));
  const parsed = town.parseSaveImport(JSON.stringify(next));
  assert.equal(parsed.failure, null, JSON.stringify(order));
  return parsed.save;
}
