import assert from "node:assert/strict";
import { homeworldSceneSsrV78 } from "./homeworld-scene-ssr-v78.mjs";

export const qaChildhood = homeworldSceneSsrV78();
const nursery = qaChildhood.load("app/game/systems/nurseryPrologue.ts");
const continuity = qaChildhood.load("app/game/systems/nurseryContinuityV72.ts");
const cohort = qaChildhood.load("app/game/systems/nurseryCohortV172.ts");
const nurseryCampaign = qaChildhood.load("app/game/systems/nurseryCampaign.ts");
const city = qaChildhood.load("app/game/systems/youthCityErrandV172.ts");
const location = qaChildhood.load("app/game/systems/homeworldLocationV77.ts");

export const childhoodStorage = qaChildhood.load("app/game/save.ts");
export const CHILDHOOD_OWNER = "2026-11-27T08:00:00.000Z";
const environment = { assetsReady: true, pageVisible: true, paused: false, nextChapterReady: true };

function completeCohort(save) {
  let scene = nursery.enableNurseryCohort(continuity.enableNurseryContinuityV72(
    nursery.createNurseryPrologue({ readyMode: "press" }),
  ));
  for (let tick = 0; tick < 8400; tick++) {
    let actions = {};
    if (scene.inputArmed && scene.phase === "cohort") {
      const stop = cohort.NURSERY_COHORT_STOPS[scene.cohortV172.steps];
      const delta = stop.x - scene.cohortV172.x;
      actions = Math.abs(delta) > 8 ? { move: Math.sign(delta) } : { confirm: tick % 16 === 0 };
    } else if (scene.inputArmed) {
      const distance = Math.abs(scene.player.x - scene.rival.x);
      actions = continuity.nurseryStoryCardV72(scene) ? { confirm: tick % 32 === 0 }
        : scene.phase === "ready" ? { ready: tick % 32 === 0 }
        : scene.phase === "duel" ? {
          move: distance > 44 ? Math.sign(scene.rival.x - scene.player.x) : 0, light: tick % 30 === 0,
        } : {};
    }
    const result = nursery.stepNurseryPrologue(scene, actions, environment);
    scene = result.state;
    if (result.completion) {
      assert.equal(scene.cohortV172.steps, 7);
      const completed = nurseryCampaign.withNurseryCompletion(save, result.completion, scene, CHILDHOOD_OWNER);
      assert(completed);
      return completed;
    }
  }
  throw new Error("The existing nursery did not complete within the pilot");
}

/** Play the nursery reducer and administrative part of the existing city
 * errand. The Chromium scenario begins at the next native service. */
export function childhoodAdmissionV175({ route = "escort", withLocation = false, withCeremony = false } = {}) {
  const save = completeCohort({
    ...childhoodStorage.defaultSave(CHILDHOOD_OWNER), prologue: nurseryCampaign.createNurseryCampaign(withCeremony),
  });
  let errand = city.startYouthCityErrandV172(CHILDHOOD_OWNER, route);
  for (const stop of city.YOUTH_CITY_ROUTES_V172[route]) {
    errand = city.acknowledgeYouthCityStopV172(errand, stop);
    assert(errand);
  }
  save.homeworld.youthCityErrandV172 = errand;
  if (withLocation) {
    const world = qaChildhood.load("app/game/systems/homeworldWorldV77.ts");
    const rooms = qaChildhood.load("app/game/systems/homeworldInteriorsV64.ts");
    const geometry = qaChildhood.load("app/game/systems/homeworldGeometryV64.ts");
    const hall = rooms.homeworldInteriorForBuildingV64("training-hall");
    const building = world.HOMEWORLD_BUILDINGS_V77.find(building => building.id === hall.buildingId);
    const point = hall.points.find(point => point.pointId === "training-service");
    const nearby = Array.from({ length: 58 }, (_, index) => ({ x: point.x, y: point.y + 7 + index }))
      .find(position => rooms.isHomeworldInteriorWalkableV64(hall, position) &&
        rooms.nearestHomeworldInteriorTargetV64(hall, position)?.pointId === point.pointId);
    assert(nearby);
    const door = geometry.homeworldBuildingDoorwayV64(building).approach;
    save.homeworld.locationV77 = location.createHomeworldCheckpointV77(save.createdAt, building.levelId, nearby, hall.buildingId, door);
    assert(location.resolveHomeworldLocationV77(save.homeworld.locationV77, save.createdAt).restored);
    save.homeworld.greetedNpcIds = ["hunt-king", "terrace-instructor"];
  }
  const parsed = childhoodStorage.parseSaveImport(childhoodStorage.exportSave(save));
  assert(parsed.save, parsed.failure);
  return parsed.save;
}
