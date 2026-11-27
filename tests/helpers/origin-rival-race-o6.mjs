import assert from "node:assert/strict";
import { build } from "esbuild";
import { playTownOrderO6, town, townAdmissionO6 } from "./origin-town-bell-o6.mjs";

const bundle = await build({
  stdin: { contents:
    'export * from "./app/game/systems/originRivalRaceO6";' +
    'export * from "./app/game/systems/originRivalRacePlaceO6";' +
    'export * from "./app/game/systems/rivalRaceCourseO6";',
    resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
export const rival = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
export { town };

const procession = ["begin", "workshops", "square", "unlatch", "deliver", "ring", "regroup"];
export function rivalAdmissionO6({ partial = false, unresolved = false, nurseryPolicies = false } = {}) {
  const { ready } = townAdmissionO6({ partial, nurseryPolicies });
  const atGate = procession.reduce(playTownOrderO6, ready);
  if (unresolved) return atGate;
  return playTownOrderO6(atGate, partial ? "postpone" : "workshop");
}

export function rivalCheckpointO6(save, point = rival.RIVAL_WORKSHOP_O6.point, level = rival.RIVAL_WORKSHOP_O6.levelId) {
  return town.createHomeworldCheckpointV77(save.createdAt, level, point, null, point);
}

export function applyRivalForTest(save, order) {
  const at = order ? save.homeworld.locationV77 : rivalCheckpointO6(save);
  const result = order ? rival.playRivalRaceO6(save, order) : rival.beginRivalRaceO6(save, at);
  assert(result, JSON.stringify(order));
  const next = { ...save, originV151: { ...save.originV151, rivalRaceO6: result }, homeworld: { ...save.homeworld, locationV77: at } };
  assert(rival.keepsRivalRaceO6(save, next), JSON.stringify(order));
  const loaded = town.parseSaveImport(JSON.stringify(next));
  assert.equal(loaded.failure, null, JSON.stringify(order));
  return loaded.save;
}

export function findRivalLaunchO6(platform, choice, x, kind, preferred = x, atBeat = 0) {
  const row = rival.RIVAL_SUPPORTS_O6[platform];
  const positions = new Map([[x, 0]]);
  for (const direction of [-1, 1]) {
    let next = x, steps = 0;
    for (;;) {
      const spot = rival.rivalWalkO6(platform, next, direction);
      if (next === spot) break;
      steps += direction;
      positions.set(spot, steps);
      next = spot;
    }
  }
  const nearby = [...positions].filter(([x]) => x >= row.left && x <= row.right)
    .sort(([a], [b]) => Math.abs(a - preferred) - Math.abs(b - preferred));
  for (const [x, steps] of nearby) {
    for (let n = 0; n < rival.RIVAL_ROOF_O6.cycle; n++) {
      const beat = (n + atBeat) % rival.RIVAL_ROOF_O6.cycle;
      const order = { type: "jump", x, direction: 1, beat };
      const result = rival.simulateRivalJumpO6(platform, choice, order, false);
      if (result?.outcome === kind) return { order, result, steps };
    }
  }
  assert.fail(JSON.stringify({ platform, choice, x, kind }));
}
