import test from "node:test";
import assert from "node:assert/strict";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const source = homeworldSceneSsrV78();
const warp = source.load("app/game/systems/warpEpochsV165.ts");
const { W01_FJORD_ROUTES } = source.load("app/game/systems/warpFjordW01.ts");
const { defaultSave, exportSave, parseSaveImport, writeSaveWithStatus, loadSave } = source.load("app/game/save.ts");

const owner = "2026-11-28T08:00:00.000Z";
const access = { blooded: true, personalShip: true, adjutant: true };
const accepted = update => { assert.equal(update.accepted, true, update.message); return update.state; };
const record = state => warp.branchVisitV165(state, "W-01").fjordW01;

function ready() {
  let state = accepted(warp.startWarpCommonQuestV165(warp.createWarpEpochsV165(owner), access, "stabilite"));
  for (const { id } of warp.WARP_COMPONENTS_V165) state = accepted(warp.verifyWarpComponentV165(state, id, "reparer"));
  return accepted(warp.installWarpModuleV165(state, "marge"));
}

function storage() {
  const items = new Map();
  return {
    getItem: key => items.get(key) ?? null,
    setItem: (key, item) => items.set(key, item),
    removeItem: key => items.delete(key),
  };
}

test("une ancienne campagne Warp n'invente aucun relevé du fjord", () => {
  const old = accepted(warp.selectWarpBranchV165(ready(), "W-02"));
  const legacy = parseSaveImport(exportSave({ ...defaultSave(owner), warpEpochsV165: old }));
  assert.ok(legacy.save, legacy.failure);
  assert.deepEqual(legacy.save.warpEpochsV165, old);
  assert.equal(record(legacy.save.warpEpochsV165), undefined);
  assert.equal(warp.advanceWarpFjordW01(old, { kind: "observe", route: "quai", at: 11 }).accepted, false);
});

for (const [route, site] of Object.entries(W01_FJORD_ROUTES)) {
  test("W-01 par " + route + " : admission, proximité, reprise et retour sans effet au présent", () => {
    const state = accepted(warp.selectWarpBranchV165(ready(), "W-01"));
    for (const requirement of Object.keys(access)) {
      assert.equal(warp.departWarpV165(state, { ...access, [requirement]: false }).changed, false);
    }
    const trip = accepted(warp.departWarpV165(state, access));
    assert.equal(warp.recordBranchDeathV165(trip, "W-01", "ursa").accepted, false);
    assert.equal(warp.departWarpV165(trip, access).changed, false);
    assert.equal(warp.advanceWarpFjordW01(trip, { kind: "observe", route, at: 0 }).changed, false);
    assert.equal(warp.advanceWarpFjordW01(trip, { kind: "report", route: "grotte", at: 0 }).changed, false);
    const observed = accepted(warp.advanceWarpFjordW01(trip, { kind: "observe", route, at: site.checkpoint }));
    assert.equal(warp.advanceWarpFjordW01(observed, { kind: "observe", route, at: site.checkpoint }).changed, false);
    assert.equal(warp.advanceWarpFjordW01(observed, { kind: "report", route: "grotte", at: 4 }).changed, false);

    const primary = storage();
    const baseline = defaultSave(owner);
    assert.equal(writeSaveWithStatus({ ...baseline, warpEpochsV165: trip }, primary).persisted, true);
    assert.equal(writeSaveWithStatus({ ...baseline, warpEpochsV165: observed }, primary).persisted, true);
    const reloaded = loadSave(primary);
    assert.deepEqual(record(reloaded.warpEpochsV165), { tripId: "warp-trip-1", route, returned: false });

    const returned = accepted(warp.advanceWarpFjordW01(reloaded.warpEpochsV165, { kind: "report", route: "grotte", at: 0 }));
    assert.equal(writeSaveWithStatus({ ...reloaded, warpEpochsV165: returned }, primary).persisted, true);
    const final = loadSave(primary);
    assert.equal(final.warpEpochsV165.activeWarpTripId, null);
    assert.equal(final.warpEpochsV165.warpReturnReservation, "utilisee");
    assert.deepEqual(record(final.warpEpochsV165), { tripId: "warp-trip-1", route, returned: true });
    assert.equal(warp.branchVisitV165(final.warpEpochsV165, "W-01").epochCompleted, false);
    assert.equal(warp.branchVisitV165(final.warpEpochsV165, "W-01").trophy, null);
    assert.deepEqual(final.profile, reloaded.profile);
    assert.deepEqual(final.inventory, reloaded.inventory);
    assert.equal(writeSaveWithStatus(reloaded, primary).failure, "save-conflict");

    const secondTrip = accepted(warp.departWarpV165(final.warpEpochsV165, access));
    const revisited = accepted(warp.returnFromWarpV165(secondTrip));
    assert.equal(warp.branchVisitV165(revisited, "W-01").visits, 2);
    assert.deepEqual(record(revisited), record(final.warpEpochsV165));

    const damaged = structuredClone(returned);
    damaged.consumedEventIds = damaged.consumedEventIds.filter(id => !id.endsWith(":w01-report"));
    assert.equal(warp.normalizeWarpEpochsV165(damaged, owner), null);
  });
}

test("le repli de secours laisse le passage réservé utilisable et l'archive sans relevé", () => {
  const trip = accepted(warp.departWarpV165(accepted(warp.selectWarpBranchV165(ready(), "W-01")), access));
  const observed = accepted(warp.advanceWarpFjordW01(trip, { kind: "observe", route: "quai", at: 11 }));
  const retreat = accepted(warp.returnFromWarpV165(observed));
  assert.equal(retreat.warpReturnReservation, "utilisee");
  assert.equal(record(retreat), undefined);
  assert.equal(warp.isWarpFjordSuccessorW01(observed, retreat), true);
  assert.ok(warp.normalizeWarpEpochsV165(retreat, owner));
  const nextTrip = accepted(warp.departWarpV165(retreat, access));
  assert.equal(nextTrip.activeWarpTripId, "warp-trip-2");
  assert.equal(warp.advanceWarpFjordW01(nextTrip, { kind: "observe", route: "falaise", at: 12 }).changed, true);
});
