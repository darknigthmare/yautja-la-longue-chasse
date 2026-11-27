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

test("Both deposits read the three real landmarks and require a physical return", () => {
  for (const zone of ["papyrus", "bank"]) {
    let state = null;
    const step = order => {
      const result = act(state, order, access(save, SHIP));
      assert(result.accepted, JSON.stringify(order) + " " + result.reason);
      state = result.state;
      return result.view;
    };
    assert.equal(step({ kind: "choose-zone", zone }).phase, "orbit");
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
  assert.equal(saves.writeSaveWithStatus({ ...save, earthV171: planned }, storage).failure, "save-conflict");
  const foreign = { ...ground, hullInstanceId: "foreign" };
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...save, earthV171: foreign })).failure, "invalid-save");
  const forged = { ...ground, orders: [...ground.orders, { kind: "scan" }] };
  assert.equal(inspect(forged, OWNER).status, "invalid");
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...save, earthV171: { ...ground, version: 2 } })).failure, "future-version");
});
