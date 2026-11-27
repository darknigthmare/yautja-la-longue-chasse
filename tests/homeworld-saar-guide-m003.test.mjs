import assert from "node:assert/strict";
import test from "node:test";
import { childhoodAdmissionV175, childhoodStorage, qaChildhood } from "./helpers/homeworld-childhood-v175.mjs";

const city = qaChildhood.load("app/game/systems/youthCityErrandV172.ts");
const guide = qaChildhood.load("app/game/systems/youthCityGuideM003.ts");
const location = qaChildhood.load("app/game/systems/homeworldLocationV77.ts");
const rooms = qaChildhood.load("app/game/systems/homeworldInteriorsV64.ts");
const seed = childhoodAdmissionV175();
delete seed.homeworld.youthCityErrandV172;
const errand = city.startYouthCityErrandV172(seed.createdAt, "escort", true, true);
const [audience, stairs] = guide.SAAR_GUIDE_MARKS_M003;
const level = guide.SAAR_GUIDE_LEVEL_M003;

function checkpoint(point, levelId = level, interiorId = null) {
  return location.createHomeworldCheckpointV77(seed.createdAt, levelId, point, interiorId, audience.position);
}
function archive(save, progress, at) {
  return { ...save, homeworld: { ...save.homeworld, youthCityErrandV172: progress, locationV77: at } };
}

test("M003 uses the native parvis and has Saar walk towards the existing stair", () => {
  const route = guide.saarGuidePathM003();
  assert.equal(route.status, "reachable", JSON.stringify(route));
  assert.deepEqual(route.points[0], audience.position);
  assert.deepEqual(route.points.at(-1), stairs.position);
  assert(guide.saarGuidePoseM003(errand, audience.position, level, null));
  assert.equal(guide.saarGuidePoseM003(errand, audience.position, level, "throne-audience"), null);
  const underway = city.advanceYouthCityGuideM003(errand);
  const pose = guide.saarGuidePoseM003(underway, { ...audience.position, vx: 100, vy: 0 }, level, null);
  assert(pose?.moving);
  assert.notEqual(pose.y, audience.position.y);
});

test("M003 archives the two real guide landmarks and preserves their order", () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const write = save => childhoodStorage.writeSaveWithStatus(save, storage);
  const keep = proposed => {
    const result = write(proposed);
    assert(result.save, result.failure);
    return result.save;
  };
  let save = keep(seed);
  save = keep(archive(save, errand, checkpoint(audience.position)));
  assert.equal(city.walkYouthCityDeliveryV176(errand, "east"), null);
  const start = city.advanceYouthCityGuideM003(errand);
  const finished = city.advanceYouthCityGuideM003(start);
  assert.equal(write(archive(save, finished, checkpoint(stairs.position))).failure, "save-conflict");
  assert.equal(write(archive(save, start, checkpoint(audience.position, "+1"))).failure, "save-conflict");
  const room = rooms.homeworldInteriorForBuildingV64("throne-audience");
  const indoor = checkpoint(room.spawn, level, room.buildingId);
  assert(location.resolveHomeworldLocationV77(indoor, seed.createdAt).restored);
  assert.equal(write(archive(save, start, indoor)).failure, "save-conflict");
  const stale = save;
  save = keep(archive(save, start, checkpoint(audience.position)));
  const portable = childhoodStorage.parseSaveImport(childhoodStorage.exportSave(save));
  assert.equal(portable.save.homeworld.youthCityErrandV172.guideM003, 1);
  assert.equal(write(stale).failure, "save-conflict");
  assert.equal(write(archive(save, finished, checkpoint(audience.position))).failure, "save-conflict");
  assert.equal(city.normalizeYouthCityErrandV172({ ...start, reached: 1 }), null);
  save = keep(archive(save, finished, checkpoint(stairs.position)));
  assert.equal(city.walkYouthCityDeliveryV176(save.homeworld.youthCityErrandV172, "east").delivery.revision, 1);
  assert.equal(childhoodStorage.loadSaveWithStatus(storage).save.homeworld.youthCityErrandV172.guideM003, 2);
});

test("M003 keeps the chariot route and historical archives playable without an escort migration", () => {
  for (const old of [city.startYouthCityErrandV172(seed.createdAt, "escort"), city.startYouthCityErrandV172(seed.createdAt, "escort", true),
    city.startYouthCityErrandV172(seed.createdAt, "archives", true, true)]) {
    assert.equal(city.youthCityGuidePendingM003(old), false);
    assert.deepEqual(city.normalizeYouthCityErrandV172(old), old);
    assert.equal(city.advanceYouthCityGuideM003(old), null);
  }
});
