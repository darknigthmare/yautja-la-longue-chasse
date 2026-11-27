import assert from "node:assert/strict";
import test from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const game = homeworldSceneSsrV78();
const pack = game.load("app/game/systems/homeworldPackTrialM029.ts");
const history = game.load("app/game/systems/clanChronicle.ts");
const rooms = game.load("app/game/systems/homeworldInteriorsV64.ts");
const { defaultSave } = game.load("app/game/save.ts");
const { normalizeHomeworldProgress } = game.load("app/game/systems/homeworld.ts");
const owner = "2026-11-27T00:00:00.000Z";
const post = { ...pack.PACK_POST_M029, suspended: false };

/** Admission fixture for the troop exercise. Followers and route are driven
 * exclusively by the runtime actions under test. */
function saveAdmitted() {
  const save = defaultSave(owner);
  let chronicle = history.createClanChronicle();
  for (const id of ["intro-begun", ...history.CHRONICLE_RITES.slice(0, 3).flatMap(rite => rite.requiredEvidenceIds)]) {
    const definition = history.CHRONICLE_EVIDENCE.find(evidence => evidence.id === id);
    const result = history.recordChronicleEvidence(chronicle, { id, sourceId: definition.sourceId });
    assert.ok(result.accepted);
    chronicle = result.state;
  }
  for (const { id, sourceId } of history.CHRONICLE_RITES.slice(0, 3)) {
    const result = history.performChronicleRite(chronicle, { id, sourceId });
    assert.ok(result.accepted);
    chronicle = result.state;
  }
  save.prologue = { chronicle };
  save.profile.honor = 3000;
  save.homeworld.coordinationM028 = { version: 1, ownerCreatedAt: owner, phase: "returned", role: "field", delays: 0 };
  return save;
}

test("M029 assigns a pack only at the native training hall, after narrative Blooded, honor and coordination", () => {
  const save = saveAdmitted();
  assert.equal(history.getChronicleRank(save.prologue.chronicle), "blooded");
  assert.ok(rooms.homeworldInteriorForBuildingV64(post.roomId).points.some(point => point.pointId === post.pointId));
  assert.equal(pack.actHomeworldPackTrialM029(null, save, "start", { ...post, roomId: null }).state, undefined);
  assert.equal(pack.actHomeworldPackTrialM029(null, save, "start", { ...post, suspended: true }).state, undefined);
  assert.equal(pack.actHomeworldPackTrialM029(null, { ...save, prologue: null }, "start", post).state, undefined);
  assert.equal(pack.actHomeworldPackTrialM029(null, { ...save, profile: { ...save.profile, honor: 2999 } }, "start", post).state, undefined);
  assert.equal(pack.actHomeworldPackTrialM029(null, { ...save, homeworld: {} }, "start", post).state, undefined);
  assert.ok(pack.actHomeworldPackTrialM029(null, save, "start", post).state);
});

test("M029 brings back twelve individually tracked pupils after two sheltered crossings and a reloaded checkpoint", () => {
  const save = saveAdmitted();
  let state = null;
  function apply(action) {
    const result = pack.actHomeworldPackTrialM029(state, save, action, post);
    assert.ok(result.state, result.message);
    state = result.state;
    return pack.homeworldPackViewM029(state, owner);
  }
  const view = () => pack.homeworldPackViewM029(state, owner);
  const regroup = () => {
    for (let attempt = 0; attempt < 4 && view().pupils.some(position => position !== view().player); attempt++) apply("regroup");
    assert.ok(view().pupils.every(position => position === view().player));
  };
  const walk = destination => {
    const action = destination > view().player ? "east" : "west";
    while (view().player !== destination) {
      if (!pack.homeworldPackActionsM029(view()).includes(action)) regroup();
      apply(action);
    }
  };
  assert.equal(apply("start").pupils.length, 12);
  apply("east");
  assert.ok(view().pupils.some(position => position < view().player));
  walk(6);
  assert.equal(pack.actHomeworldPackTrialM029(state, save, "east", post).state, undefined);
  assert.equal(pack.actHomeworldPackTrialM029(state, save, "shelter", post).state, undefined);
  regroup();
  assert.equal(apply("shelter").shelteredOutward, true);
  const persisted = normalizeHomeworldProgress(JSON.parse(JSON.stringify({ ...save.homeworld, packTrialM029: state })));
  assert.deepEqual(persisted.packTrialM029, state);
  state = persisted.packTrialM029;
  walk(16);
  regroup();
  assert.equal(apply("turn").phase, "returning");
  walk(12);
  assert.equal(pack.actHomeworldPackTrialM029(state, save, "west", post).state, undefined);
  regroup();
  assert.equal(apply("shelter").shelteredReturning, true);
  walk(0);
  regroup();
  const returned = apply("count");
  assert.equal(returned.phase, "returned");
  assert.deepEqual(returned.pupils, Array(12).fill(0));
  assert.equal(pack.actHomeworldPackTrialM029(state, save, "restart", post).state, undefined);
  assert.equal(pack.homeworldPackViewM029(state, "another-owner"), null);
  assert.equal(pack.normalizeHomeworldPackTrialM029({ ...state, journal: ["count"] }), null);
  assert.deepEqual(history.getChronicleFunctions(save.prologue.chronicle), []);
  assert.equal(save.prologue.chronicle.evidence.some(evidence => evidence.id === "team-extraction"), false);
});

const adjudicate = game.load("app/game/systems/homeworldAdjutantM029.ts");
const at = (target, actor = { x: 1, y: 1 }) => ({ ...target, suspended: false, actor });
const officer = at(adjudicate.ADJUTANT_DOCK_M029);
const relay = at({ roomId: adjudicate.ADJUTANT_RELAY_M029.roomId, pointId: null }, adjudicate.ADJUTANT_RELAY_M029.position);
const sas = at(adjudicate.ADJUTANT_SAS_M029);
const leader = at(adjudicate.ADJUTANT_LEADER_M029);

function readyPack(save) {
  let result;
  const act = action => {
    result = pack.actHomeworldPackTrialM029(result?.state, save, action, post);
    assert.ok(result.state, result.message);
  };
  const state = () => pack.homeworldPackViewM029(result.state, owner);
  const reach = (target, direction) => {
    while (state().player !== target) {
      const actions = pack.homeworldPackActionsM029(state());
      act(actions.includes(direction) ? direction : "regroup");
    }
    while (state().pupils.some(position => position !== target)) act("regroup");
  };
  act("start"); reach(6, "east"); act("shelter"); reach(16, "east"); act("turn");
  reach(12, "west"); act("shelter"); reach(0, "west"); act("count");
  return result.state;
}

test("M029 keeps nominations behind twelve returned pupils, two worlds, a working relay and the Leader's explicit offer", () => {
  const save = saveAdmitted();
  const verify = (raw, action, place) => adjudicate.actHomeworldAdjutantM029(raw, save, action, place);
  const complete = id => Object.assign(save.missionProgress[id], { status: "completed", completions: 1, attempts: 1 });
  complete("jungle-vey");
  complete("ice-cryostalker");
  assert.equal(verify(null, "study", officer).state, undefined);
  save.homeworld.packTrialM029 = readyPack(save);
  const withoutTwoWorlds = { ...save, missionProgress: { ...save.missionProgress, "ice-cryostalker": { status: "available", completions: 0 } } };
  assert.equal(adjudicate.actHomeworldAdjutantM029(null, withoutTwoWorlds, "study", officer).state, undefined);

  const start = verify(null, "study", officer).state;
  assert.ok(start);
  assert.equal(verify(start, "accept", leader).state, undefined);
  assert.equal(verify(start, "place-relay", at(adjudicate.ADJUTANT_RELAY_M029)).state, undefined);
  const routed = verify(start, "place-relay", relay).state;
  assert.ok(routed);
  assert.equal(verify(routed, "confirm-signal", officer).state, undefined);
  const report = verify(routed, "confirm-signal", sas).state;
  const defer = verify(report, "defer", leader);
  assert.equal(defer.state.phase, "deferred");
  assert.equal(defer.prologue, undefined);
  assert.deepEqual(history.getChronicleFunctions(save.prologue.chronicle), []);
  assert.equal(verify(defer.state, "accept", officer).state, undefined);

  const deferred = normalizeHomeworldProgress(JSON.parse(JSON.stringify({ ...save.homeworld, adjutantM029: defer.state })));
  assert.deepEqual(deferred.adjutantM029, defer.state);
  const appointment = verify(deferred.adjutantM029, "accept", leader);
  assert.ok(appointment.prologue, appointment.message);
  assert.deepEqual(history.getChronicleFunctions(appointment.prologue.chronicle), ["adjutant"]);
  assert.equal(history.getChronicleRank(appointment.prologue.chronicle), "blooded");
  assert.deepEqual(appointment.state.witnessedWorlds, ["jungle-vey", "ice-cryostalker"]);
  const finalSave = { ...save, homeworld: { ...save.homeworld, adjutantM029: appointment.state }, prologue: appointment.prologue };
  assert.equal(adjudicate.homeworldAdjutantMatchesSaveM029(finalSave), true);
  assert.equal(adjudicate.homeworldAdjutantMatchesSaveM029({ ...finalSave, profile: { ...finalSave.profile, honor: 2999 } }), true);
  assert.equal(adjudicate.homeworldAdjutantMatchesSaveM029({ ...finalSave, homeworld: save.homeworld }), false);
  assert.equal(adjudicate.homeworldAdjutantMatchesSaveM029({ ...finalSave, prologue: save.prologue }), false);
  assert.equal(adjudicate.normalizeHomeworldAdjutantM029({ ...appointment.state, events: ["accept"] }), null);
  assert.equal(adjudicate.homeworldAdjutantMatchesSaveM029({
    ...finalSave, homeworld: { ...finalSave.homeworld, packTrialM029: undefined },
  }), false);
});
