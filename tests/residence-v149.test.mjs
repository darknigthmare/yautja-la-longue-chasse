import assert from "node:assert/strict";
import test from "node:test";
import * as R from "../app/game/systems/residenceV149.ts";

const context = (atHouseId, rankId = "young-blood", regions = null) => ({
  rankId, atHouseId, regionAllowed: regionId => regions === null || regions.includes(regionId),
});
const ok = result => { assert.equal(result.ok, true, result.ok ? "" : result.reason); return result.state; };
const run = (state, runId, actions, regionId = "luminous-marshes") => {
  let completed = [];
  for (const action of actions) {
    const r = R.recordResidenceFieldEventV149(state, { regionId, runId, action });
    state = r.state; completed = completed.concat(r.completed);
  }
  return { state, completed };
};

test("data comes from the V6 workbook: 20 houses, 3 rooms each, HOME-CM07 thresholds 40/60/80", () => {
  assert.equal(R.RESIDENCE_HOUSES_V149.length, 20);
  for (const house of R.RESIDENCE_HOUSES_V149) assert.equal(R.roomsForHouseV149(house.id).length, 3, house.id);
  const cm07 = R.houseV149("HOME-CM07");
  assert.deepEqual(cm07.respect, { inhabit: 40, furnish: 60, receive: 80 });
  assert.equal(cm07.minimumRank, "young-blood");
  assert.equal(cm07.regionId, "luminous-marshes");
  assert.equal(cm07.mission.title, "Trois appuis avant la crue");
  assert.equal(R.houseBuildingIdV149(cm07), "house-n-0");
  assert.equal(R.houseForBuildingV149("luminous-marshes", "house-n-1").id, "HOME-CM08");
});

test("no house is given by default and the mission is accepted only at the house", () => {
  const empty = R.emptyResidenceV149();
  assert.equal(empty.activeResidenceId, null);
  assert.deepEqual(empty.rights, []);
  assert.equal(R.acceptHouseMissionV149(empty, "HOME-CM07", context(null)).ok, false);
  assert.equal(R.acceptHouseMissionV149(empty, "HOME-CM08", context("HOME-CM08")).ok, false, "Blooded required");
  assert.equal(R.acceptHouseMissionV149(empty, "HOME-CM07", context("HOME-CM07", "young-blood", [])).ok, false, "region closed");
  ok(R.acceptHouseMissionV149(empty, "HOME-CM07", context("HOME-CM07")));
});

test("respect rises once per run and action, for the region's communities only", () => {
  let state = R.emptyResidenceV149();
  state = run(state, "run-a", ["recover", "recover", "report"]).state;
  assert.equal(R.respectForV149(state, "CM07"), 10);
  assert.equal(R.respectForV149(state, "CM08"), 10);
  assert.equal(R.respectForV149(state, "CM01"), 0);
  state = run(state, "run-b", ["recover"]).state;
  assert.equal(R.respectForV149(state, "CM07"), 15);
  assert.equal(R.recordResidenceFieldEventV149(state, { regionId: "luminous-marshes", runId: "run-c", action: "dance" }).state, state);
});

test("the threshold mission needs all its actions in one run after acceptance", () => {
  let state = ok(R.acceptHouseMissionV149(R.emptyResidenceV149(), "HOME-CM07", context("HOME-CM07")));
  assert.deepEqual(R.houseMissionActionsV149(R.houseV149("HOME-CM07")), ["ward", "recover", "report"]);
  let r = run(state, "run-1", ["ward", "recover"]);
  assert.deepEqual(r.completed, []);
  r = run(r.state, "run-2", ["report"]);
  assert.deepEqual(r.completed, [], "actions of two runs do not add up");
  r = run(r.state, "run-3", ["ward", "recover", "report"]);
  assert.deepEqual(r.completed, ["HOME-CM07"]);
  state = r.state;
  assert.equal(state.missions["HOME-CM07"].status, "completed");
  assert.equal(state.objects.filter(o => o.id === R.CM07_LAMP_ID_V149).length, 1, "the lamp is one original");
  assert.deepEqual(state.rights, [], "the right comes with the route choice");
  assert.equal(R.chooseHouseRouteV149(state, "HOME-CM07", 0, context(null)).ok, false);
  state = ok(R.chooseHouseRouteV149(state, "HOME-CM07", 1, context("HOME-CM07")));
  assert.deepEqual(state.rights, ["HOME-CM07"]);
  assert.equal(R.chooseHouseRouteV149(state, "HOME-CM07", 0, context("HOME-CM07")).ok, false, "route kept");
});

function cm07Home() {
  let state = ok(R.acceptHouseMissionV149(R.emptyResidenceV149(), "HOME-CM07", context("HOME-CM07")));
  state = run(state, "run-1", ["ward", "recover", "report"]).state; // 15 + 10
  state = ok(R.chooseHouseRouteV149(state, "HOME-CM07", 0, context("HOME-CM07")));
  return state;
}

test("living needs respect 40, at the threshold; furnishing needs 60", () => {
  let state = cm07Home();
  assert.equal(R.respectForV149(state, "CM07"), 25);
  const refused = R.activateFirstResidenceV149(state, "HOME-CM07", context("HOME-CM07"));
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /25\/40/);
  state = run(state, "run-2", ["track", "ward", "recover"]).state; // 40
  assert.equal(R.activateFirstResidenceV149(state, "HOME-CM07", context(null)).ok, false);
  state = ok(R.activateFirstResidenceV149(state, "HOME-CM07", context("HOME-CM07")));
  assert.equal(state.activeResidenceId, "HOME-CM07");
  const lamp = state.objects.find(o => o.id === R.CM07_LAMP_ID_V149);
  assert.deepEqual(lamp.location, { kind: "room", houseId: "HOME-CM07", slotId: "chest" });
  state = ok(R.placeObjectV149(state, R.CM07_LAMP_ID_V149, "memory-1", context("HOME-CM07")));
  const display = R.placeObjectV149(state, R.CM07_LAMP_ID_V149, "display", context("HOME-CM07"));
  assert.equal(display.ok, false);
  assert.match(display.reason, /aménager/);
  state = run(state, "run-3", ["ward", "recover", "report", "track"]).state; // 60
  state = ok(R.placeObjectV149(state, R.CM07_LAMP_ID_V149, "display", context("HOME-CM07")));
  assert.equal(R.availableScenesV149(state, "HOME-CM07", context("HOME-CM07")).map(s => s.id).join(","), "V5-HOME-CM07-S1,V5-HOME-CM07-S2");
});

test("acceptance BUILD5-07: live, then move to another house with a unique object; reload mid-move keeps one location", () => {
  let state = cm07Home();
  state = run(state, "run-2", ["track", "ward", "recover"]).state;
  state = ok(R.activateFirstResidenceV149(state, "HOME-CM07", context("HOME-CM07")));
  assert.equal(R.activateFirstResidenceV149(state, "HOME-CM07", context("HOME-CM07")).ok, false);
  // Second right: HOME-CM08 (Blooded, 45).
  const blooded = at => context(at, "blooded");
  state = ok(R.acceptHouseMissionV149(state, "HOME-CM08", blooded("HOME-CM08")));
  state = run(state, "run-4", ["ward", "recover", "report"]).state;
  state = ok(R.chooseHouseRouteV149(state, "HOME-CM08", 1, blooded("HOME-CM08")));
  assert.equal(R.startTransferV149(state, "HOME-CM08", blooded("HOME-CM08")).ok, false, "packing starts in the old house");
  state = ok(R.startTransferV149(state, "HOME-CM08", blooded("HOME-CM07")));
  state = ok(R.packObjectV149(state, R.CM07_LAMP_ID_V149, blooded("HOME-CM07")));
  assert.equal(R.placeObjectV149(state, R.CM07_LAMP_ID_V149, "memory-2", blooded("HOME-CM07")).ok, false);
  state = ok(R.confirmDepartureV149(state, blooded("HOME-CM07")));
  assert.equal(state.activeResidenceId, "HOME-CM07", "old house active until arrival");
  assert.equal(R.cancelTransferV149(state, blooded("HOME-CM07")).ok, false);

  // QA5-05: reload while the charge is on the road.
  const reloaded = R.normalizeResidenceV149(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(reloaded, state);
  const lamps = reloaded.objects.filter(o => o.id === R.CM07_LAMP_ID_V149);
  assert.equal(lamps.length, 1);
  assert.equal(lamps[0].location.kind, "transfer");

  assert.equal(R.confirmArrivalV149(reloaded, blooded("HOME-CM07")).ok, false, "arrival at the new threshold");
  state = ok(R.confirmArrivalV149(reloaded, blooded("HOME-CM08")));
  assert.equal(state.activeResidenceId, "HOME-CM08");
  assert.deepEqual(state.rights.sort(), ["HOME-CM07", "HOME-CM08"], "the old right is kept");
  assert.deepEqual(state.objects.find(o => o.id === R.CM07_LAMP_ID_V149).location, { kind: "room", houseId: "HOME-CM08", slotId: "arrival" });
  assert.equal(state.objects.filter(o => o.location.kind === "transfer").length, 0);
  // The travel container stayed: it was not packed.
  assert.equal(state.objects.find(o => o.id === R.TRAVEL_CONTAINER_ID_V149).location.houseId, "HOME-CM07");
});

test("cancelling before departure puts every original back; a transfer without its house is dropped on load", () => {
  let state = cm07Home();
  state = run(state, "run-2", ["track", "ward", "recover"]).state;
  state = ok(R.activateFirstResidenceV149(state, "HOME-CM07", context("HOME-CM07")));
  state = ok(R.placeObjectV149(state, R.CM07_LAMP_ID_V149, "bench", context("HOME-CM07")));
  const blooded = at => context(at, "blooded");
  state = ok(R.acceptHouseMissionV149(state, "HOME-CM08", blooded("HOME-CM08")));
  state = run(state, "run-4", ["ward", "recover", "report"]).state;
  state = ok(R.chooseHouseRouteV149(state, "HOME-CM08", 0, blooded("HOME-CM08")));
  state = ok(R.startTransferV149(state, "HOME-CM08", blooded("HOME-CM07")));
  state = ok(R.packObjectV149(state, R.CM07_LAMP_ID_V149, blooded("HOME-CM07")));
  const cancelled = ok(R.cancelTransferV149(state, blooded("HOME-CM07")));
  assert.equal(cancelled.transfer, null);
  assert.deepEqual(cancelled.objects.find(o => o.id === R.CM07_LAMP_ID_V149).location, { kind: "room", houseId: "HOME-CM07", slotId: "bench" });
  // A tampered save with a transfer but no right to the destination: the original goes back.
  const tampered = JSON.parse(JSON.stringify(state));
  tampered.rights = ["HOME-CM07"];
  tampered.missions["HOME-CM08"].choice = null;
  const loaded = R.normalizeResidenceV149(tampered);
  assert.equal(loaded.transfer, null);
  assert.deepEqual(loaded.objects.find(o => o.id === R.CM07_LAMP_ID_V149).location, { kind: "room", houseId: "HOME-CM07", slotId: "bench" });
});

test("save reading: future version refused, unknown entries dropped, active house needs a right", () => {
  assert.equal(R.normalizeResidenceV149({ version: 2 }), null);
  assert.equal(R.isFutureResidenceV149({ version: 2 }), true);
  const loaded = R.normalizeResidenceV149({ version: 1, respect: { CM07: 250, NOPE: 10 }, rights: ["HOME-CM07"],
    activeResidenceId: "HOME-CM07", missions: {}, objects: [{ id: "x", label: "X", location: { kind: "moon" } }] });
  assert.deepEqual(loaded.respect, { CM07: 100 });
  assert.deepEqual(loaded.rights, [], "a right without a verified mission is not kept");
  assert.equal(loaded.activeResidenceId, null);
  assert.deepEqual(loaded.objects, []);
});

test("a threshold report must follow the field objectives even after reload", () => {
  const house = "HOME-CM07";
  const accepted = ok(R.acceptHouseMissionV149(R.emptyResidenceV149(), house, context(house)));
  const early = run(accepted, "r", ["ward", "report"]);
  assert.deepEqual(early.completed, []);
  assert.deepEqual(early.state.missions[house].done, ["ward"]);
  const legacy = structuredClone(early.state);
  legacy.missions[house].done.push("report");
  const recovered = run(R.normalizeResidenceV149(legacy), "r", ["recover"]);
  assert.equal(recovered.state.missions[house].status, "active");
  assert.deepEqual(recovered.completed, []);
  assert.ok(!recovered.state.objects.some(o => o.id === R.CM07_LAMP_ID_V149));
  const reported = run(recovered.state, "r", ["report"]);
  assert.deepEqual(reported.completed, [house]);
  assert.equal(reported.state.objects.filter(o => o.id === R.CM07_LAMP_ID_V149).length, 1);
});
