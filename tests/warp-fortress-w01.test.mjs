import test from "node:test";
import assert from "node:assert/strict";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const source = homeworldSceneSsrV78();
const warp = source.load("app/game/systems/warpEpochsV165.ts");
const { W01_FJORD_ROUTES } = source.load("app/game/systems/warpFjordW01.ts");
const { W01_FORTRESS_APPROACH, W01_FORTRESS_TABLE, W01_FORTRESS_TIDE_POST } =
  source.load("app/game/systems/warpFortressW01.ts");
const { defaultSave, exportSave, parseSaveImport, writeSaveWithStatus, loadSave } = source.load("app/game/save.ts");
const owner = "2026-11-28T10:00:00.000Z";
const access = { blooded: true, personalShip: true, adjutant: true };
const accept = update => { assert.equal(update.accepted && update.changed, true, update.message); return update.state; };
const visit = state => warp.branchVisitV165(state, "W-01");
const act = (state, kind, at) => warp.advanceWarpFortressW01(state, { kind, at });
const depart = state => accept(warp.departWarpV165(state, access));

function firstVoyage() {
  let state = accept(warp.startWarpCommonQuestV165(warp.createWarpEpochsV165(owner), access, "stabilite"));
  for (const { id } of warp.WARP_COMPONENTS_V165) state = accept(warp.verifyWarpComponentV165(state, id, "reparer"));
  state = accept(warp.installWarpModuleV165(state, "marge"));
  return depart(accept(warp.selectWarpBranchV165(state, "W-01")));
}

function firstReport(route) {
  const seen = accept(warp.advanceWarpFjordW01(firstVoyage(), { kind: "observe", route, at: W01_FJORD_ROUTES[route].checkpoint }));
  return accept(warp.advanceWarpFjordW01(seen, { kind: "report", route: "grotte", at: 0 }));
}

function disk() {
  const items = new Map();
  return {
    getItem: key => items.get(key) ?? null,
    setItem: (key, item) => items.set(key, item),
    removeItem: key => items.delete(key),
  };
}

for (const [route, approach] of Object.entries(W01_FORTRESS_APPROACH)) {
  test(`la forteresse par ${route} progresse par repères, reprend ses étapes et archive le retour`, () => {
    const old = firstReport(route);
    const legacy = parseSaveImport(exportSave({ ...defaultSave(owner), warpEpochsV165: old }));
    assert.ok(legacy.save, legacy.failure);
    assert.equal(visit(legacy.save.warpEpochsV165).fortressW01, undefined);
    assert.equal(act(firstVoyage(), "sounded", W01_FORTRESS_TIDE_POST).changed, false);

    const trip = depart(old);
    const store = disk();
    let save = { ...defaultSave(owner), warpEpochsV165: trip };
    assert.equal(writeSaveWithStatus(save, store).persisted, true);
    function persist(state) {
      const written = writeSaveWithStatus({ ...save, warpEpochsV165: state }, store);
      assert.equal(written.persisted, true, written.failure);
      save = loadSave(store);
      return save.warpEpochsV165;
    }

    assert.equal(act(trip, "entered", approach.gate).changed, false);
    assert.equal(act(trip, "sounded", 0).changed, false);
    const sounded = persist(accept(act(trip, "sounded", W01_FORTRESS_TIDE_POST)));
    assert.equal(act(sounded, "entered", approach.gate + 1).changed, false);
    const entered = persist(accept(act(sounded, "entered", approach.gate)));
    assert.deepEqual(visit(entered).fortressW01, { tripId: "warp-trip-2", stage: "entered" });
    assert.equal(act(entered, "returned", 0).changed, false);
    assert.equal(act(entered, "copied", approach.gate).changed, false);
    const copied = persist(accept(act(entered, "copied", W01_FORTRESS_TABLE)));
    assert.equal(act(copied, "returned", W01_FORTRESS_TABLE).changed, false);
    assert.equal(warp.isWarpFjordSuccessorW01(sounded, copied), false);
    const returned = persist(accept(act(copied, "returned", 0)));
    assert.deepEqual(visit(returned).fjordW01, visit(old).fjordW01);
    assert.deepEqual(visit(returned).fortressW01, { tripId: "warp-trip-2", stage: "returned" });
    assert.equal(returned.activeWarpTripId, null);
    assert.equal(returned.warpReturnReservation, "utilisee");
    assert.equal(visit(returned).epochCompleted, false);
    assert.equal(visit(returned).trophy, null);
    assert.deepEqual(save.profile, legacy.save.profile);
    assert.deepEqual(save.inventory, legacy.save.inventory);
    assert.equal(writeSaveWithStatus({ ...save, warpEpochsV165: copied }, store).failure, "save-conflict");

    const malformed = structuredClone(returned);
    malformed.consumedEventIds = malformed.consumedEventIds.filter(id => !id.endsWith("-entered"));
    assert.equal(warp.normalizeWarpEpochsV165(malformed, owner), null);
    const revisited = accept(warp.returnFromWarpV165(depart(returned)));
    assert.deepEqual(visit(revisited).fortressW01, visit(returned).fortressW01);
  });
}

test("le repli efface la tentative sans effacer le premier relevé ni fabriquer le second", () => {
  const old = firstReport("falaise");
  const trip = depart(old);
  const sounded = accept(act(trip, "sounded", W01_FORTRESS_TIDE_POST));
  const retreat = accept(warp.returnFromWarpV165(sounded));
  assert.equal(warp.isWarpFjordSuccessorW01(sounded, retreat), true);
  assert.equal(visit(retreat).fortressW01, undefined);
  assert.deepEqual(visit(retreat).fjordW01, visit(old).fjordW01);
  assert.equal(retreat.warpReturnReservation, "utilisee");
  const again = depart(retreat);
  const resume = accept(act(again, "sounded", W01_FORTRESS_TIDE_POST));
  assert.equal(visit(resume).fortressW01.tripId, "warp-trip-3");
  assert.ok(warp.normalizeWarpEpochsV165(resume, owner));
});
