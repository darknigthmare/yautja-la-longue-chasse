import assert from "node:assert/strict";
import test from "node:test";
import { okavangoAdmissionV171, OWNER, qa, SHIP, saves } from "./helpers/earth-okavango-fixture-v171.mjs";

const earth = qa.load("app/game/systems/earthOkavangoV171.ts");
const { earthOkavangoAccessV171: access, commitEarthOkavangoV171: act, inspectEarthOkavangoV171: inspect } = earth;
const { save } = okavangoAdmissionV171();
const move = direction => ({ kind: "move", direction });

test("Sol depends on acquired Blooded plus the owned hull and a completed M023 return", () => {
  assert.equal(access(saves.defaultSave(OWNER), SHIP).allowed, false);
  assert.equal(access(okavangoAdmissionV171({ returned: false }).save, SHIP).allowed, false);
  assert.equal(access({ ...save, profile: { ...save.profile, honor: 9000, rankId: "unblooded" } }, SHIP).allowed, false);
  assert.equal(access(save, "serpent-hull").allowed, false);
  assert.equal(access(save, SHIP).allowed, true);
  assert.equal(act(null, { kind: "extract" }, access(save, SHIP)).accepted, false);
});

test("Both V1 deposits retain their landmarks, closed channel and physical return", () => {
  for (const zone of ["papyrus", "bank"]) {
    let state = { version: 1, owner: OWNER, hullInstanceId: access(save, SHIP).hullInstanceId,
      orders: [{ kind: "choose-zone", zone }] };
    assert.equal(inspect(state, OWNER).view.waterSteps, null);
    const step = order => {
      const result = act(state, order, access(save, SHIP));
      assert(result.accepted, JSON.stringify(order) + " " + result.reason);
      state = result.state;
      return result.view;
    };
    assert.equal(inspect(state, OWNER).view.phase, "orbit");
    const inserted = step({ kind: "insert" });
    assert.equal(inserted.lane, zone === "bank" ? 0 : 1);
    if (zone === "bank") step(move("south"));
    assert.equal(act(state, { kind: "extract" }, access(save, SHIP)).accepted, false);
    step(move("east")); step(move("east"));
    assert.equal(act(state, { kind: "scan" }, access(save, SHIP)).accepted, false);
    step({ kind: "analyse" });
    assert.deepEqual(step({ kind: "scan" }).traces, ["tyres"]);
    assert.equal(act(state, { kind: "scan" }, access(save, SHIP)).accepted, false);
    step(move("east"));
    assert.equal(act(state, move("east"), access(save, SHIP)).accepted, false);
    step(move("north")); step(move("east")); step(move("east")); step({ kind: "scan" });
    step(move("east")); step(move("east")); step(move("south")); step(move("east"));
    assert.deepEqual(step({ kind: "scan" }).traces, ["tyres", "carcass", "cases"]);
    assert.equal(act(state, { kind: "extract" }, access(save, SHIP)).accepted, false);
    step(move("north"));
    for (let i = 0; i < 8; i += 1) step(move("west"));
    if (zone === "papyrus") step(move("south"));
    assert.equal(step({ kind: "extract" }).phase, "returned");
    assert.equal(act(state, move("east"), access(save, SHIP)).accepted, false);
    const portable = saves.parseSaveImport(saves.exportSave({ ...save, earthV171: state })).save;
    assert.deepEqual(portable.earthV171, state);
    assert.deepEqual(portable.trophies, save.trophies);
    assert.deepEqual(portable.missionProgress, save.missionProgress);
    assert.deepEqual(portable.firstInterstellarV173, save.firstInterstellarV173);
  }
});

test("A durable write cannot queue orders twice or adopt a survey from another hull", () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
  assert(saves.writeSaveWithStatus(save, storage).persisted);
  assert.equal(saves.parseSaveImport(saves.exportSave(save)).save.earthV171, undefined);
  const planned = act(null, { kind: "choose-zone", zone: "papyrus" }, access(save, SHIP)).state;
  const ground = act(planned, { kind: "insert" }, access(save, SHIP)).state;
  assert.equal(saves.writeSaveWithStatus({ ...save, earthV171: ground }, storage).failure, "save-conflict");
  assert.equal(saves.writeSaveWithStatus({ ...save, earthV171: planned }, storage).persisted, true);
  assert.equal(saves.writeSaveWithStatus({ ...save, earthV171: ground }, storage).persisted, true);
  const alteredRegime = { ...ground, version: 1, orders: [...ground.orders, { kind: "analyse" }] };
  assert.equal(saves.writeSaveWithStatus({ ...save, earthV171: alteredRegime }, storage).failure, "save-conflict");
  assert.equal(saves.writeSaveWithStatus({ ...save, earthV171: planned }, storage).failure, "save-conflict");
  const foreign = { ...ground, hullInstanceId: "foreign" };
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...save, earthV171: foreign })).failure, "invalid-save");
  const forged = { ...ground, orders: [...ground.orders, { kind: "scan" }] };
  assert.equal(inspect(forged, OWNER).status, "invalid");
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...save, earthV171: { ...ground, version: 4 } })).failure, "future-version");
});

function pilot(zone) {
  let state = null;
  const step = order => {
    const result = act(state, order, access(save, SHIP));
    assert(result.accepted, JSON.stringify(order) + " " + result.reason);
    state = result.state;
    return result.view;
  };
  step({ kind: "choose-zone", zone }); step({ kind: "insert" });
  return { step, state: () => state, view: () => inspect(state, OWNER).view,
    refuse: order => assert.equal(act(state, order, access(save, SHIP)).accepted, false) };
}
const water = earth.earthOkavangoWaterV171;

test("The low ford is a shortcut and the log keeps the evidence actually read there", () => {
  const run = pilot("papyrus");
  assert.equal(run.state().version, 2);
  assert.equal(water(run.view()), "low");
  for (let i = 0; i < 4; i += 1) run.step(move("east"));
  assert.equal(run.view().lane, 1);
  assert.equal(earth.earthOkavangoTraceAtV171(run.view()).id, "tyres");
  run.refuse({ kind: "scan" });
  run.step({ kind: "analyse" });
  assert.equal(run.step({ kind: "scan" }).tyreReading, "ford");
  assert.equal(run.view().waterSteps, 4);
  assert.equal(water(run.step(move("east"))), "rising");
  run.step(move("east")); run.step(move("east"));
  assert.equal(water(run.step(move("east"))), "high");
  assert.equal(earth.earthOkavangoTraceLocationsV171(run.view())[0].x, 4);
  run.step({ kind: "scan" });
  run.step(move("north"));
  for (let i = 0; i < 3; i += 1) run.step(move("west"));
  run.step({ kind: "scan" });
  run.refuse(move("south"));
  for (let i = 0; i < 5; i += 1) run.step(move("west"));
  run.step(move("south"));
  const returned = run.step({ kind: "extract" });
  assert.equal(returned.phase, "returned");
  assert.equal(returned.tyreReading, "ford");
});

test("A flooded position survives reload and can reach the substitute track without teleporting", () => {
  const run = pilot("papyrus");
  for (const direction of ["east", "west", "east", "east", "east", "east", "east", "east"]) {
    run.step(move(direction));
  }
  const caught = run.view();
  assert.deepEqual([caught.x, caught.lane, water(caught)], [6, 1, "high"]);
  const resumed = saves.parseSaveImport(saves.exportSave({ ...save, earthV171: run.state() })).save;
  assert.deepEqual(inspect(resumed.earthV171, OWNER).view, caught);
  run.refuse(move("east")); run.refuse(move("west")); run.refuse(move("south")); run.refuse({ kind: "scan" });
  assert.deepEqual(run.view(), caught);
  const escaped = run.step(move("north"));
  assert.deepEqual([escaped.x, escaped.lane], [6, 0]);
  for (let i = 0; i < 3; i += 1) run.step(move("west"));
  assert.equal(earth.earthOkavangoTraceAtV171(run.view()).name, "Ornières sur la levée");
  run.step({ kind: "analyse" });
  assert.equal(run.step({ kind: "scan" }).tyreReading, "levee");
  assert.equal(run.view().waterSteps, 8);
  const stored = saves.parseSaveImport(saves.exportSave({ ...save, earthV171: run.state() })).save;
  assert.equal(inspect(stored.earthV171, OWNER).view.tyreReading, "levee");
});

function completedSurvey(version) {
  let state = { version, owner: OWNER, hullInstanceId: access(save, SHIP).hullInstanceId,
    orders: [{ kind: "choose-zone", zone: "papyrus" }] };
  const step = order => {
    const result = act(state, order, access(save, SHIP));
    assert(result.accepted, JSON.stringify(order) + " " + result.reason);
    state = result.state;
    return result.view;
  };
  const east = () => step(move("east"));
  const west = () => step(move("west"));
  const scan = () => step({ kind: "scan" });
  step({ kind: "insert" });
  step({ kind: "analyse" });
  if (version === 1) {
    east(); east(); scan(); east(); step(move("north")); east(); east(); scan();
    east(); east(); step(move("south")); east(); scan(); step(move("north"));
  } else {
    for (let i = 0; i < 4; i += 1) east();
    scan();
    for (let i = 0; i < 4; i += 1) east();
    scan(); step(move("north"));
    west(); west(); west(); scan();
  }
  const remaining = version === 1 ? 8 : 5;
  for (let i = 0; i < remaining; i += 1) west();
  step(move("south"));
  assert.equal(step({ kind: "extract" }).phase, "returned");
  return state;
}

test("A post-survey orbit starts from historic V1 and V2 reports without replaying them in another regime", () => {
  const admitted = access(save, SHIP);
  assert.equal(act(null, { kind: "begin-orbit" }, admitted).accepted, false);
  for (const version of [1, 2]) {
    const before = completedSurvey(version);
    const ground = inspect(before, OWNER).view;
    const start = act(before, { kind: "begin-orbit" }, admitted);
    assert(start.accepted);
    assert.equal(start.state.version, 3);
    assert.equal(start.state.surveyVersion, version);
    assert.equal(start.view.waterSteps, ground.waterSteps);
    assert.equal(start.view.tyreReading, ground.tyreReading);
    assert.deepEqual(start.view.traces, ground.traces);
    assert(earth.earthOkavangoSuccessorV171(before, start.state));
    assert.equal(earth.earthOkavangoSuccessorV171(before, { ...start.state, surveyVersion: version === 1 ? 2 : 1 }), false);
    assert.equal(inspect({ ...start.state, version }, OWNER).status, "invalid");
    assert.equal(inspect({ ...start.state, surveyVersion: 9 }, OWNER).status, "invalid");
    assert.equal(act(start.state, { kind: "scan-orbit", zone: "bank" }, admitted).accepted, false);
    assert.equal(act(start.state, { kind: "finish-orbit" }, admitted).accepted, false);
  }
});

test("The orbital approach lowers speed after a recoverable failure and logs a separate piloted return", () => {
  const previous = completedSurvey(2);
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
  assert(saves.writeSaveWithStatus({ ...save, earthV171: previous }, storage).persisted);
  let state = previous;
  const step = order => {
    const result = act(state, order, access(save, SHIP));
    assert(result.accepted, JSON.stringify(order) + " " + result.reason);
    assert(saves.writeSaveWithStatus({ ...save, earthV171: result.state }, storage).persisted);
    state = result.state;
    return result.view;
  };
  const pilot = action => step({ kind: "pilot-orbit", action });
  const denied = order => assert.equal(act(state, order, access(save, SHIP)).accepted, false);
  assert.equal(step({ kind: "begin-orbit" }).orbit.flight.lateral, 3);
  denied({ kind: "pilot-orbit", action: { type: "align" } });
  for (let i = 0; i < 3; i += 1) pilot({ type: "lateral", direction: -1 });
  pilot({ type: "align" });
  for (let i = 0; i < 4; i += 1) pilot({ type: "advance" });
  const failed = inspect(state, OWNER).view.orbit.flight;
  assert.deepEqual([failed.distance, failed.speed, failed.setbacks], [30, 0, 1]);
  state = saves.loadSaveWithStatus(storage).save.earthV171;
  assert.deepEqual(inspect(state, OWNER).view.orbit.flight, failed);
  pilot({ type: "speed", direction: 1 });
  for (let i = 0; i < 3; i += 1) pilot({ type: "advance" });
  denied({ kind: "pilot-orbit", action: { type: "berth" } });
  assert.equal(step({ kind: "scan-orbit", zone: "bank" }).orbit.stage, "observed");
  denied({ kind: "scan-orbit", zone: "papyrus" });
  assert.equal(step({ kind: "return-orbit" }).orbit.flight.lateral, -3);
  denied({ kind: "finish-orbit" });
  for (let i = 0; i < 3; i += 1) pilot({ type: "lateral", direction: 1 });
  pilot({ type: "align" });
  pilot({ type: "speed", direction: -1 });
  pilot({ type: "speed", direction: -1 });
  for (let i = 0; i < 10; i += 1) pilot({ type: "advance" });
  const returned = step({ kind: "finish-orbit" });
  assert.equal(returned.phase, "returned");
  assert.equal(returned.orbit.stage, "complete");
  assert.equal(returned.orbit.scannedZone, "bank");
  assert.deepEqual(returned.traces, inspect(previous, OWNER).view.traces);
  denied({ kind: "begin-orbit" });
  const latest = saves.loadSaveWithStatus(storage).save;
  assert.deepEqual(latest.firstInterstellarV173, save.firstInterstellarV173);
  assert.deepEqual(latest.trophies, save.trophies);
  assert.deepEqual(latest.missionProgress, save.missionProgress);
  assert.deepEqual(saves.parseSaveImport(saves.exportSave(latest)).save.earthV171, state);
});
