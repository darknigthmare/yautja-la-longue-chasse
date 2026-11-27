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
