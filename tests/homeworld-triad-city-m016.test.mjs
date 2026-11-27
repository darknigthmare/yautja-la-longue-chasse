import assert from "node:assert/strict";
import test from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";
import { templeCampaignRoute, stamp } from "./helpers/solo-v70-played-route.mjs";
import { thresholdsCampaignRoute } from "./helpers/solo-v69-played-route.mjs";

const browserModules = homeworldSceneSsrV78();
const model = browserModules.load("app/game/systems/homeworldTriadM016.ts");
const interiors = browserModules.load("app/game/systems/homeworldInteriorsV64.ts");
const { HOMEWORLD_BUILDINGS_V77 } = browserModules.load("app/game/systems/homeworldWorldV77.ts");
const { homeworldBuildingDoorwayV64 } = browserModules.load("app/game/systems/homeworldGeometryV64.ts");
const saves = browserModules.load("app/game/save.ts");
const campaign = browserModules.load("app/game/systems/campaignSoloV90.ts");
const [saar, vek] = model.TRIAD_CITY_STATIONS_M016;
let origin;
const baseSave = () => structuredClone(origin ??= templeCampaignRoute().save);

function checkpoint(station, save) {
  const building = HOMEWORLD_BUILDINGS_V77.find(building => building.id === station.roomId);
  assert(building);
  const room = interiors.homeworldInteriorForBuildingV64(station.roomId);
  assert(room);
  const point = room.points.find(point => point.pointId === station.pointId);
  assert(point);
  const approaches = [
    { x: point.x, y: point.y + 34 },
    { x: point.x, y: point.y + 45 },
    { x: point.x + 44, y: point.y + 24 },
    { x: point.x - 44, y: point.y + 24 },
  ];
  const local = approaches.find(position => interiors.isHomeworldInteriorWalkableV64(room, position) &&
    interiors.nearestHomeworldInteriorTargetV64(room, position)?.pointId === station.pointId);
  assert(local, station.roomId + " has a real walkable service approach");
  return { version: 1, layoutRevision: 1, ownerCreatedAt: save.createdAt, levelId: building.levelId,
    exterior: homeworldBuildingDoorwayV64(building).approach, interiorId: station.roomId, local };
}

test("M016 plays both city demonstrations before an invitation and preserves the gallery contract", () => {
  let save = baseSave();
  assert(campaign.canStartSoloV90(save));
  assert.equal(save.homeworld.triadCityM016, undefined);
  for (const station of [saar, vek]) {
    const at = checkpoint(station, save);
    assert.equal(model.advanceTriadCityM016(save.homeworld.triadCityM016, save.createdAt, station,
      station.demonstration.length, at), null);
    for (let step = 0; step <= station.demonstration.length; step++) {
      const prior = save.homeworld.triadCityM016;
      assert.equal(model.triadCityInvitationReadyM016(station, prior?.steps[station.partner] ?? 0), false);
      const next = model.advanceTriadCityM016(prior, save.createdAt, station, step, at);
      assert(next);
      const nextSave = { ...save, homeworld: { ...save.homeworld, triadCityM016: next, locationV77: at } };
      assert(model.triadCityMatchesWriteM016(save, nextSave));
      save = saves.parseSaveImport(saves.exportSave(nextSave)).save;
      assert(save);
      assert.deepEqual(save.homeworld.triadCityM016, next);
      assert.equal(model.advanceTriadCityM016(next, save.createdAt, station, step, at), null);
    }
  }
  assert.equal(model.triadCityRemainingM016(save.homeworld.triadCityM016).length, 0);
  const entered = campaign.startSoloV90Campaign(save, stamp);
  assert(entered);
  assert.deepEqual(entered.homeworld.triadCityM016, save.homeworld.triadCityM016);
  assert.deepEqual(entered.soloV90.checkpoint.partnerObservations, {});
  assert.deepEqual(entered.soloV90.receipts, []);
  assert.deepEqual(entered.prologue.chronicle, baseSave().prologue.chronicle);
});

test("M016 rejects imported foreign ownership and write-time skipping or a distant interaction", () => {
  const save = baseSave();
  const at = checkpoint(saar, save);
  const wrongRoom = checkpoint(vek, save);
  assert.equal(model.advanceTriadCityM016(undefined, save.createdAt, saar, 0, wrongRoom), null);
  assert.equal(model.advanceTriadCityM016(undefined, save.createdAt, saar, 0, { ...at, local: { x: 5, y: 5 } }), null);
  const ledger = model.advanceTriadCityM016(undefined, save.createdAt, saar, 0, at);
  assert(ledger);
  const valid = { ...save, homeworld: { ...save.homeworld, triadCityM016: ledger, locationV77: at } };
  assert(model.triadCityMatchesWriteM016(save, valid));
  assert(!model.triadCityMatchesWriteM016(valid, save));
  assert(!model.triadCityMatchesWriteM016(save, { ...valid, homeworld: { ...valid.homeworld, locationV77: wrongRoom } }));
  const jumped = { ...valid, homeworld: { ...valid.homeworld, triadCityM016: { ...ledger, steps: { saar: 3, vek: 0 } } } };
  assert(!model.triadCityMatchesWriteM016(save, jumped));
  const foreign = { ...valid, homeworld: { ...valid.homeworld, triadCityM016: { ...ledger, ownerCreatedAt: "2025-01-01T00:00:00Z" } } };
  assert.equal(saves.parseSaveImport(JSON.stringify(foreign)).failure, "invalid-save");
  const future = { ...valid, homeworld: { ...valid.homeworld, triadCityM016: { ...ledger, version: 2 } } };
  assert.equal(saves.parseSaveImport(JSON.stringify(future)).failure, "future-version");

  const raw = new Map([[saves.SAVE_STORAGE_KEY, JSON.stringify(save)]]);
  const storage = {
    getItem: key => raw.get(key) ?? null,
    setItem: (key, value) => raw.set(key, value),
    removeItem: key => raw.delete(key),
  };
  assert.equal(saves.writeSaveWithStatus(jumped, storage).failure, "save-conflict");
  assert.equal(saves.writeSaveWithStatus(valid, storage).persisted, true);
  assert.deepEqual(saves.loadSaveWithStatus(storage).save.homeworld.triadCityM016, ledger);
});

test("M016 resumes the next contact from a single visited room and plans the real doors in both orders", () => {
  const save = baseSave();
  const routes = browserModules.load("app/game/systems/homeworldWayfindingV112.ts");
  assert.deepEqual(model.triadCityRoutesM016().map(model.triadCityAtlasTargetM016), ["point:forge-service", "point:training-service"]);
  for (const [first, second] of [[saar, vek], [vek, saar]]) {
    const from = checkpoint(first, save);
    const ledger = { version: 1, ownerCreatedAt: save.createdAt, steps: { saar: 0, vek: 0,
      [first.partner]: first.demonstration.length + 1 } };
    const candidate = { ...save, homeworld: { ...save.homeworld, triadCityM016: ledger, locationV77: from } };
    const reloaded = saves.parseSaveImport(saves.exportSave(candidate)).save;
    assert(reloaded);
    const [next] = model.triadCityRoutesM016(reloaded.homeworld.triadCityM016, from.interiorId);
    assert.equal(next.station.partner, second.partner);
    assert.equal(next.purpose, "meeting");
    const plan = routes.homeworldRoutePlanV112(reloaded, {
      levelId: from.levelId, interiorId: from.interiorId, actor: from.local,
    }, model.triadCityAtlasTargetM016(next));
    assert.equal(plan.status, "reachable", first.partner + " to " + second.partner + ": " + plan.reason);
    assert.equal(plan.stages[0]?.kind, "exit");
    assert.equal(plan.stages[0]?.interiorId, first.roomId);
    assert(plan.stages.some(stage => stage.kind === "enter" && stage.interiorId === null));
    assert.equal(plan.stages.at(-1)?.kind, "interact");
    assert.equal(plan.stages.at(-1)?.interiorId, second.roomId);
    assert(plan.distance > 200, "The streets form an actual route between the two rooms");
  }
  const complete = { version: 1, ownerCreatedAt: save.createdAt, steps: { saar: 3, vek: 4 } };
  assert.deepEqual(model.triadCityRoutesM016(complete, vek.roomId), []);
  const [gallery] = model.triadCityRoutesM016(complete, saar.roomId);
  assert.equal(gallery.purpose, "gallery");
  assert.equal(model.triadCityAtlasTargetM016(gallery), "point:training-service");
});

test("M016 stores the real forge gesture after V69 for a new Temple order", () => {
  const previous = thresholdsCampaignRoute().save;
  assert.equal(previous.soloV69.status, "completed");
  assert.equal(previous.soloV70 ?? null, null);
  const ordered = { ...previous, prologue: { ...previous.prologue, templeTriadFirstM017: true } };
  for (const [before, shouldPersist] of [[ordered, true], [previous, false]]) {
    const at = checkpoint(saar, before);
    const gesture = model.advanceTriadCityM016(undefined, before.createdAt, saar, 0, at);
    assert(gesture);
    const next = { ...before, homeworld: { ...before.homeworld, triadCityM016: gesture, locationV77: at } };
    const raw = new Map([[saves.SAVE_STORAGE_KEY, JSON.stringify(before)]]);
    const storage = {
      getItem: key => raw.get(key) ?? null,
      setItem: (key, value) => raw.set(key, value),
      removeItem: key => raw.delete(key),
    };
    assert.equal(saves.loadSaveWithStatus(storage).loaded, true);
    assert.equal(campaign.canStartSoloV90(before), shouldPersist);
    assert.equal(saves.writeSaveWithStatus(next, storage).persisted, shouldPersist);
    const resumed = saves.loadSaveWithStatus(storage).save;
    assert.equal(resumed.soloV70 ?? null, null);
    assert.deepEqual(resumed.homeworld.triadCityM016, shouldPersist ? gesture : undefined);
    assert.deepEqual(resumed.prologue.chronicle, before.prologue.chronicle);
  }
});
