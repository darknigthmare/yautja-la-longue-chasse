import assert from "node:assert/strict";
import { build } from "esbuild";
import { course, courtyardHandoffO6 } from "./origin-cohort-race-o6.mjs";

const bundle = await build({
  stdin: { contents: `
    export * from "./app/game/save";
    export * from "./app/game/systems/originTownBellO6";
    export * from "./app/game/systems/originTownBellPlacesO6";
    export * from "./app/game/systems/homeworldLocationV77";
    export * from "./app/game/systems/homeworldInteriorsV64";
    export * from "./app/game/systems/homeworldWayfindingV75";
    export * from "./app/game/systems/homeworldWorldV77";
    export * from "./app/game/systems/homeworldNavigationV77";
    export * from "./app/game/systems/homeworldNavigationV109";
    export { homeworldBuildingDoorwayV64 } from "./app/game/systems/homeworldGeometryV64";
  `, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
export const town = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

export function townAdmissionO6({ partial = false } = {}) {
  const n = course, p = n.COHORT_COURSE_O6;
  const seed = courtyardHandoffO6({ partial }).armed;
  const choice = partial ? "observe" : "lead";
  function turn(save, order) {
    const next = n.playCohortRaceO6(save, order);
    assert(next, JSON.stringify(order));
    return next;
  }
  let race = turn(seed, { type: "choose", x: n.COHORT_CHOICE_POSTS_O6[choice], choice });
  race = turn(race, { type: "jump", x: p.start.launch, direction: 1 });
  race = turn(race, { type: "jump", x: p.lower.launch, direction: 1 });
  if (!partial) race = turn(race, { type: "signal", x: p.upper.launch, elapsed: n.COHORT_SIGNAL_WAIT_O6 });
  race = turn(race, { type: "jump", x: p.upper.launch, direction: 1 });
  race = partial ? turn(race, { type: "partial", x: n.COHORT_RALLY_X_O6 }) : turn(race, { type: "help", x: p.finish.launch });
  const approach = town.townBellSiteO6("begin");
  const settings = { ...race.settings, masterVolume: 0 };
  const ready = { ...race, settings, homeworld: { ...race.homeworld,
    locationV77: town.createHomeworldCheckpointV77(race.createdAt, approach.levelId, approach.point, null, approach.point) } };
  assert.equal(town.parseSaveImport(JSON.stringify(ready)).failure, null);
  return { activeRace: seed, ready };
}

export function townActorPositionO6(action) {
  const site = town.townBellSiteO6(action);
  const candidates = [site.point, ...[24, 34, 46, 58, 66].flatMap(radius => Array.from({ length: 16 }, (_, i) => {
    const angle = Math.PI * i / 8;
    return { x: site.point.x + radius * Math.cos(angle), y: site.point.y + radius * Math.sin(angle) };
  }))];
  const point = candidates.find(point => town.townBellAtSiteO6(action, site.levelId, point, site.interiorId));
  assert(point, "Walkable native station: " + action);
  return { ...site, point };
}
export function townCheckpointO6(save, action) {
  const site = townActorPositionO6(action);
  return town.createHomeworldCheckpointV77(save.createdAt, site.levelId, site.point, site.interiorId,
    site.interiorId ? town.townBellSiteO6("unlatch").point : site.point);
}

export function playTownOrderO6(save, action) {
  const at = townCheckpointO6(save, action);
  const receipt = town.recordTownBellOrderO6(save, action, at);
  assert(receipt, action);
  const next = { ...save, originV151: { ...save.originV151, townBellO6: receipt },
    homeworld: { ...save.homeworld, locationV77: at } };
  assert(town.keepsTownBellO6(save, next), action);
  const imported = town.parseSaveImport(JSON.stringify(next));
  assert.equal(imported.failure, null, action);
  return imported.save;
}
