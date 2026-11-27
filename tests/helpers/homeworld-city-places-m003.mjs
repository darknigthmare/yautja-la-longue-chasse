import assert from "node:assert/strict";
import { childhoodAdmissionV175, qaChildhood } from "./homeworld-childhood-v175.mjs";

export const city = qaChildhood.load("app/game/systems/youthCityErrandV172.ts");
export const places = qaChildhood.load("app/game/systems/youthCityPlacesM003.ts");
export const rooms = qaChildhood.load("app/game/systems/homeworldInteriorsV64.ts");
const world = qaChildhood.load("app/game/systems/homeworldWorldV77.ts");
const geometry = qaChildhood.load("app/game/systems/homeworldGeometryV64.ts");
const location = qaChildhood.load("app/game/systems/homeworldLocationV77.ts");
const search = qaChildhood.load("app/game/systems/homeworldWayfindingV75.ts");
export const council = world.HOMEWORLD_COUNCIL_STAIR_LANDINGS_V77;
export function campaignAt(errand, point, level, room = null) {
  const seed = childhoodAdmissionV175();
  seed.settings.masterVolume = 0;
  seed.homeworld.greetedNpcIds = ["hunt-king", "terrace-instructor"];
  seed.homeworld.youthCityErrandV172 = errand;
  const door = room ? outside(room).point : point;
  seed.homeworld.locationV77 = location.createHomeworldCheckpointV77(seed.createdAt, level, point, room?.buildingId ?? null, door);
  assert(location.resolveHomeworldLocationV77(seed.homeworld.locationV77, seed.createdAt).restored);
  return seed;
}
export function outside(room) {
  const building = world.HOMEWORLD_BUILDINGS_V77.find(candidate => candidate.id === room.buildingId);
  return { level: building.levelId, point: geometry.homeworldBuildingDoorwayV64(building).approach };
}
export function forgeContact(errand) {
  const room = rooms.homeworldInteriorForBuildingV64("deep-forge");
  const level = outside(room).level;
  const service = room.points.find(point => point.pointId === "forge-service");
  const near = Array.from({ length: 58 }, (_, index) => ({ x: service.x, y: service.y + 7 + index }))
    .find(point => places.youthCityPlaceActionM003(errand, level, point, room)?.kind === "forge");
  assert(near);
  return { room, level, point: near };
}
export function completeLandmarks(errand) {
  for (const stop of city.YOUTH_CITY_ROUTES_V172[errand.route]) {
    if (stop === "forge-service" && errand.delivery) {
      for (const command of ["east", "east", "side", "east", "east", "east", "side", "east", "east"]) {
        errand = city.walkYouthCityDeliveryV176(errand, command);
        assert(errand);
      }
    }
    errand = city.acknowledgeYouthCityStopV172(errand, stop);
    assert(errand);
  }
  return errand;
}
export function hearthContact(errand, from) {
  const room = rooms.homeworldInteriorForBuildingV64(places.YOUTH_CITY_HEARTH_M003);
  const level = outside(room).level;
  const table = places.youthCityHearthTableM003(room);
  assert(table);
  const origin = from ?? room.spawn;
  const attempts = [62, 68, 55, 72, 48].flatMap(radius => Array.from({ length: 24 }, (_, n) => {
    const angle = Math.PI * 2 * n / 24;
    return { x: table.x + Math.sin(angle) * radius, y: table.y + Math.cos(angle) * radius };
  }));
  const point = attempts.find(point => Math.hypot(point.x - origin.x, point.y - origin.y) >= 28 &&
    places.youthCityPlaceActionM003(errand, level, point, room)?.kind === "hearth" && search.homeworldWayfindingInteriorSegmentV75(room, origin, point));
  assert(point, JSON.stringify({ origin, table, room: room.buildingId }));
  return { room, level, origin, point };
}
