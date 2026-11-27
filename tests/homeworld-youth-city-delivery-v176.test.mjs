import assert from "node:assert/strict";
import test from "node:test";
import { childhoodAdmissionV175, childhoodStorage, qaChildhood } from "./helpers/homeworld-childhood-v175.mjs";

const city = qaChildhood.load("app/game/systems/youthCityErrandV172.ts");
const seed = childhoodAdmissionV175();
delete seed.homeworld.youthCityErrandV172;
const journey = ["east", "east", "side", "east", "east", "east", "side", "east", "east"];
const errand = save => save.homeworld.youthCityErrandV172;
const updated = (save, value) => ({ ...save, homeworld: { ...save.homeworld, youthCityErrandV172: value } });
const walk = (save, direction) => updated(save, city.walkYouthCityDeliveryV176(errand(save), direction));
const position = save => city.youthCityDeliveryPositionV176(errand(save));
const readBack = save => childhoodStorage.parseSaveImport(childhoodStorage.exportSave(save));

for (const route of ["escort", "archives"]) test("M003 blocks the cart lane and resumes the " + route + " delivery at the saved detour", () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const write = save => childhoodStorage.writeSaveWithStatus(save, storage);
  const keep = proposed => {
    const result = write(proposed);
    assert(result.save, result.failure);
    return result.save;
  };
  const load = () => childhoodStorage.loadSaveWithStatus(storage).save;
  let save = keep(seed);
  save = keep(updated(save, city.startYouthCityErrandV172(save.createdAt, route, true)));
  if (route === "archives") {
    assert.equal(city.walkYouthCityDeliveryV176(errand(save), "east"), null);
    save = keep(updated(save, city.acknowledgeYouthCityStopV172(errand(save), "memory-service")));
  }
  assert.equal(city.acknowledgeYouthCityStopV172(errand(save), "forge-service"), null);
  assert.equal(readBack(updated(save, { ...errand(save), reached: errand(save).reached + 1 })).save, null);
  assert.equal(readBack(updated(save, { ...errand(save), ownerCreatedAt: "2026-11-18T08:00:00.000Z" })).save, null);
  save = keep(walk(save, "east"));
  const stale = save;
  save = keep(walk(save, "east"));
  assert.equal(city.walkYouthCityDeliveryV176(errand(save), "east"), null);
  save = keep(walk(save, "side"));
  assert.equal(write(walk(stale, "west")).failure, "save-conflict");
  assert.equal(write(updated(save, { ...errand(save), delivery: undefined })).failure, "save-conflict");
  const rewound = keep(walk(save, "side"));
  assert.deepEqual(position(rewound), { x: 2, lane: "main" });
  assert.equal(errand(rewound).delivery.revision, 4);
  assert.deepEqual(errand(rewound).delivery.commands, ["east", "east"]);
  save = keep(walk(rewound, "side"));
  save = readBack(load()).save;
  assert(save);
  assert.deepEqual(position(save), { x: 2, lane: "side" });
  for (const step of journey.slice(3)) save = keep(walk(save, step));
  assert.deepEqual(position(save), { x: 7, lane: "main" });
  assert(city.youthCityDeliveryClearedV176(errand(save)));
  assert(city.youthCityCarriesPieceV172(errand(save)));
  save = keep(updated(save, city.acknowledgeYouthCityStopV172(errand(save), "forge-service")));
  assert(!city.youthCityCarriesPieceV172(errand(save)));
  assert.equal(city.acknowledgeYouthCityStopV172(errand(save), "forge-service"), null);
  assert(readBack(load()).save);
});

test("M003 retains the original hand-in on a city errand from a historical archive", () => {
  const previous = city.startYouthCityErrandV172(seed.createdAt, "escort");
  const save = readBack(updated(seed, previous)).save;
  assert(save);
  assert.deepEqual(errand(save), previous);
  assert(city.acknowledgeYouthCityStopV172(errand(save), "forge-service"));
});
