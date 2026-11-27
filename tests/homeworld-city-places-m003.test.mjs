import assert from "node:assert/strict";
import test from "node:test";
import { CHILDHOOD_OWNER, childhoodStorage, qaChildhood } from "./helpers/homeworld-childhood-v175.mjs";
import { campaignAt, city, completeLandmarks, council, forgeContact, hearthContact, places } from "./helpers/homeworld-city-places-m003.mjs";

const childhood = qaChildhood.load("app/game/systems/homeworldChildhoodV175.ts");
const campaign = qaChildhood.load("app/game/systems/youthCampaign.ts");
function pilot(initial) {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const write = save => childhoodStorage.writeSaveWithStatus(save, storage);
  const keep = save => {
    const result = write(save);
    assert(result.save, result.failure);
    return result.save;
  };
  keep(initial);
  return { write, keep, load: () => childhoodStorage.loadSaveWithStatus(storage).save };
}

for (const route of ["escort", "archives"]) test("M003 records the distinct " + route + " meeting and the native hearth", () => {
  let errand = city.startYouthCityErrandV172(CHILDHOOD_OWNER, route, true, true, true);
  if (route === "escort") {
    assert.equal(city.completeYouthCityEncounterM003(errand), null);
    errand = city.advanceYouthCityGuideM003(city.advanceYouthCityGuideM003(errand));
  }
  const contact = route === "escort"
    ? { ...council.from, level: council.from.levelId, room: null }
    : forgeContact(errand);
  const initial = campaignAt(errand, contact.point, contact.level, contact.room);
  const storage = pilot(initial);
  assert.equal(city.acknowledgeYouthCityStopV172(errand, city.nextYouthCityStopV172(errand)), null);
  assert.equal(places.youthCityPlaceActionM003(errand, contact.level, contact.point, contact.room)?.kind,
    route === "escort" ? "council" : "forge");
  const met = city.completeYouthCityEncounterM003(errand);
  assert(met);
  assert.equal(storage.write(campaignAt(met, council.to.point, council.to.levelId)).failure, "save-conflict");
  assert.equal(storage.keep(campaignAt(met, contact.point, contact.level, contact.room)).homeworld.youthCityErrandV172.encounterM003, "met");
  assert.equal(storage.write(initial).failure, "save-conflict");
  let advanced = met;
  for (const stop of city.YOUTH_CITY_ROUTES_V172[route]) {
    if (stop === "forge-service") for (const command of ["east", "east", "side", "east", "east", "east", "side", "east", "east"]) {
      advanced = city.walkYouthCityDeliveryV176(advanced, command);
      assert(advanced);
      storage.keep(campaignAt(advanced, contact.point, contact.level, contact.room));
    }
    advanced = city.acknowledgeYouthCityStopV172(advanced, stop);
    assert(advanced);
    storage.keep(campaignAt(advanced, contact.point, contact.level, contact.room));
  }
  assert.deepEqual(advanced, completeLandmarks(met));
  const hearth = hearthContact(advanced);
  const before = storage.keep(campaignAt(advanced, hearth.origin, hearth.level, hearth.room));
  assert.equal(childhood.hasChildhoodFoundationV175(before), false);
  assert.equal(campaign.startYouthCampaign(before, CHILDHOOD_OWNER), null);
  const visited = city.visitYouthCityHearthM003(advanced);
  assert(visited);
  assert.equal(storage.write(campaignAt(visited, council.from.point, council.from.levelId)).failure, "save-conflict");
  const after = storage.keep(campaignAt(visited, hearth.point, hearth.level, hearth.room));
  assert(childhood.hasChildhoodFoundationV175(after));
  assert(campaign.startYouthCampaign(after, CHILDHOOD_OWNER));
  assert.equal(storage.load().homeworld.youthCityErrandV172.hearthM003, true);
  assert.equal(childhoodStorage.parseSaveImport(childhoodStorage.exportSave(after)).save.homeworld.youthCityErrandV172.hearthM003, true);
});

test("M003 preserves admission in historical campaigns and writes an optional foyer visit", () => {
  const old = completeLandmarks(city.startYouthCityErrandV172(CHILDHOOD_OWNER, "escort"));
  const contact = hearthContact(old);
  const before = campaignAt(old, contact.point, contact.level, contact.room);
  const storage = pilot(before);
  assert(childhood.hasChildhoodFoundationV175(before));
  assert.deepEqual(storage.load().homeworld.youthCityErrandV172, old);
  const visit = city.visitYouthCityHearthM003(old);
  assert.equal(storage.keep(campaignAt(visit, contact.point, contact.level, contact.room)).homeworld.youthCityErrandV172.encounterM003, undefined);
});
