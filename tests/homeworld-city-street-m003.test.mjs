import assert from "node:assert/strict";
import test from "node:test";
import { CHILDHOOD_OWNER, childhoodStorage, qaChildhood } from "./helpers/homeworld-childhood-v175.mjs";
import { campaignAt, city, council, forgeContact } from "./helpers/homeworld-city-places-m003.mjs";

const street = qaChildhood.load("app/game/systems/youthCityStreetM003.ts");
const guide = qaChildhood.load("app/game/systems/youthCityGuideM003.ts");
const nav = qaChildhood.load("app/game/systems/homeworldNavigationV109.ts");

function atStart(route, hasStreet) {
  let start = city.startYouthCityErrandV172(CHILDHOOD_OWNER, route, true, true, true, hasStreet);
  if (route === "escort") start = city.advanceYouthCityGuideM003(city.advanceYouthCityGuideM003(start));
  return start;
}

function makeStorage() {
  const entries = new Map();
  const store = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
  const write = save => childhoodStorage.writeSaveWithStatus(save, store);
  const keep = save => {
    const result = write(save);
    assert(result.save, result.failure);
    return result.save;
  };
  return { write, keep, read: () => childhoodStorage.loadSaveWithStatus(store).save };
}

for (const route of ["escort", "archives"]) test("M003 " + route + " joins both real landmarks in order with a local recovery", () => {
  const pending = atStart(route, true);
  const first = route === "escort" ? council.from : forgeContact(pending);
  const level = first.levelId ?? first.level;
  const storage = makeStorage();
  storage.keep(campaignAt(pending, first.point, level, first.room));
  assert.equal(street.youthCityStreetPathM003(pending), null);
  assert.equal(city.actYouthCityStreetM003(pending, "directions"), null);
  let errand = city.completeYouthCityEncounterM003(pending);
  storage.keep(campaignAt(errand, first.point, level, first.room));
  assert.equal(city.acknowledgeYouthCityStopV172(errand, city.nextYouthCityStopV172(errand)), null);
  assert.equal(city.actYouthCityStreetM003(errand, "square"), null);

  for (const kind of ["workshops", "square"]) {
    const path = street.youthCityStreetPathM003(errand);
    assert.equal(path.marker.kind, kind);
    assert.equal(path.route.status, "reachable");
    const length = path.route.points.slice(1).reduce((total, p, i) =>
      total + Math.hypot(p.x - path.route.points[i].x, p.y - path.route.points[i].y), 0);
    assert(length > 180, "A landmark must follow an actual street walk");
    assert.equal(nav.homeworldWalkRouteV109(path.level, path.route.points[0], path.junction).status, "reachable");
    assert.equal(nav.homeworldWalkRouteV109(path.level, path.junction, path.marker.point).status, "reachable");
    assert.equal(guide.saarGuidePoseOnPathM003(path.route.points,
      { ...path.route.points[0], z: 0, vx: 100, vy: 0, facing: 1 }).moving, true);
    assert.equal(street.youthCityStreetContactM003(errand, "+1", path.marker.point, null), null);
    assert.equal(street.youthCityStreetContactM003(errand, path.level, path.marker.point, "deep-forge"), null);

    const recovery = city.actYouthCityStreetM003(errand, "directions");
    assert.equal(storage.write(campaignAt(recovery, path.marker.point, path.level)).failure, "save-conflict");
    assert.equal(street.youthCityStreetContactM003(errand, path.level, path.junction, null)?.kind, "directions");
    storage.keep(campaignAt(recovery, path.junction, path.level));
    assert.deepEqual(storage.read().homeworld.youthCityErrandV172.streetM003, recovery.streetM003);
    assert.equal(city.actYouthCityStreetM003(recovery, "directions"), null);

    const confirmed = city.actYouthCityStreetM003(recovery, kind);
    assert.equal(storage.write(campaignAt(confirmed, path.junction, path.level)).failure, "save-conflict");
    assert.equal(street.youthCityStreetContactM003(recovery, path.level, path.marker.point, null)?.kind, kind);
    storage.keep(campaignAt(confirmed, path.marker.point, path.level));
    errand = confirmed;
  }

  const kept = storage.read();
  assert.equal(street.youthCityStreetPathM003(errand), null);
  assert.equal(errand.reached, 0);
  assert.equal(city.youthCityCarriesPieceV172(errand), true);
  assert.equal(errand.streetM003.recovery, 3);
  assert.equal(errand.streetM003.leg, 2);
  assert.deepEqual(childhoodStorage.parseSaveImport(childhoodStorage.exportSave(kept)).save.homeworld.youthCityErrandV172, errand);
});

test("M003 leaves the existing errand format playable with its original route and no added prerequisite", () => {
  const old = city.completeYouthCityEncounterM003(atStart("archives", false));
  assert.deepEqual(city.normalizeYouthCityErrandV172(old), old);
  assert.equal(street.youthCityStreetPathM003(old), null);
  assert.notEqual(city.acknowledgeYouthCityStopV172(old, "memory-service"), null);
  assert.equal(city.normalizeYouthCityErrandV172({ ...old, streetM003: { leg: 0, recovery: 2 } }), null);
  assert.equal(city.normalizeYouthCityErrandV172({ ...old, reached: 1, streetM003: { leg: 1, recovery: 0 } }), null);
});
