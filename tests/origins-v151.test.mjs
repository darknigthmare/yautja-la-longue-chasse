import test from "node:test";
import assert from "node:assert/strict";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const source = homeworldSceneSsrV78();
const O = source.load("app/game/systems/originsV151.ts");
const R = source.load("app/game/systems/residenceV149.ts");

const ctx = (atHouseId, rankId = "young-blood") => ({ rankId, atHouseId, regionAllowed: () => true });
const ok = r => { assert.equal(r.ok, true, r.ok ? "" : r.reason); return r.state; };
const field = (state, runId, actions) => actions.reduce((s, action) =>
  R.recordResidenceFieldEventV149(s, { regionId: "luminous-marshes", runId, action }).state, state);
function activeCm07() {
  let s = ok(R.acceptHouseMissionV149(R.emptyResidenceV149(), "HOME-CM07", ctx("HOME-CM07")));
  s = field(s, "r1", ["ward", "recover", "report"]);
  s = ok(R.chooseHouseRouteV149(s, "HOME-CM07", 0, ctx("HOME-CM07")));
  s = field(s, "r2", ["track", "ward", "recover"]);
  return ok(R.activateFirstResidenceV149(s, "HOME-CM07", ctx("HOME-CM07")));
}
const play = (origin, residence, choice) => {
  let state = O.createOriginV151(origin);
  for (let i = 0; i < 3; i++) state = ok(O.houseTransitionStepV151(state, residence, i, ctx("HOME-CM07")));
  const result = O.houseTransitionChooseV151(state, residence, choice, ctx("HOME-CM07"));
  assert.equal(result.ok, true, result.ok ? "" : result.reason);
  return result;
};

test("data: six origins and their six house transitions, copied from the V6 workbook", () => {
  assert.deepEqual(O.ORIGINS_V151.map(o => o.id), ["O1", "O2", "O3", "O4", "O5", "O6"]);
  assert.equal(O.originV151("O1").title, "Rejeté du clan");
  assert.equal(O.originV151("O5").title, "Dette envers l’Étranger");
  for (const id of O.ORIGIN_IDS_V151) {
    const t = O.houseTransitionV151(id);
    assert.equal(t.id, `STORY5-TR-${id}-01`);
    assert.equal(t.system, "Maison");
    assert.equal(t.steps.length, 3);
    assert.equal(t.options.length, 2);
  }
});

test("acceptance BUILD5-05: O1 and O5 play the same milestone with different scenes and reactions", () => {
  const residence = activeCm07();
  const o1 = play("O1", residence, 0), o5 = play("O5", residence, 0);
  assert.notEqual(O.houseTransitionV151("O1").title, O.houseTransitionV151("O5").title);
  assert.notDeepEqual(O.houseTransitionV151("O1").steps, O.houseTransitionV151("O5").steps);
  assert.notEqual(o1.message, o5.message);
  assert.deepEqual(o1.state.transitions["STORY5-TR-O1-01"], { steps: 3, resolved: true, success: true, choice: 0, houseId: "HOME-CM07" });
  assert.deepEqual(o5.state.transitions["STORY5-TR-O5-01"], { steps: 3, resolved: true, success: false, choice: 0, houseId: "HOME-CM07" },
    "resolved and success are distinct: Mara is not available");
  assert.match(o5.message, /préparation générale/);
  assert.deepEqual(o1.state.relations["O1:dhera"], { name: "Dhera", presence: "awaited", transitionId: "STORY5-TR-O1-01", choice: 0 });
  assert.equal(o5.state.relations["O5:mara"].presence, "absent");
  // Same residence, untouched by either origin (no rank, ending or reward change lives here).
  assert.equal(residence.activeResidenceId, "HOME-CM07");
});

test("gestures in the wrong order give the sheet's failure text and lose nothing", () => {
  const residence = activeCm07();
  let state = O.createOriginV151("O1");
  const early = O.houseTransitionStepV151(state, residence, 1, ctx("HOME-CM07"));
  assert.equal(early.ok, false);
  assert.equal(early.reason, O.houseTransitionV151("O1").failure);
  state = ok(O.houseTransitionStepV151(state, residence, 0, ctx("HOME-CM07")));
  assert.equal(O.houseTransitionChooseV151(state, residence, 1, ctx("HOME-CM07")).ok, false, "choice waits for the gestures");
  assert.equal(state.transitions["STORY5-TR-O1-01"].steps, 1);
});

test("the scene needs an active residence where the player stands, and resolves once", () => {
  const residence = activeCm07();
  assert.equal(O.houseTransitionStepV151(O.createOriginV151("O6"), R.emptyResidenceV149(), 0, ctx("HOME-CM07")).ok, false);
  assert.equal(O.houseTransitionStepV151(O.createOriginV151("O6"), residence, 0, ctx(null)).ok, false);
  const done = play("O6", residence, 1).state;
  assert.equal(O.houseTransitionChooseV151(done, residence, 0, ctx("HOME-CM07")).ok, false);
  assert.equal(O.houseTransitionStepV151(done, residence, 0, ctx("HOME-CM07")).ok, false);
  assert.deepEqual(done.consumed, ["STORY5-TR-O6-01:resolved"]);
});

test("STATE5-01: old saves get the documented default; stored values are never rewritten on load", () => {
  assert.deepEqual(O.originOfSaveV151(undefined), O.createOriginV151("O6", "legacy-default"));
  const done = play("O3", activeCm07(), 0).state;
  assert.deepEqual(O.normalizeOriginV151(JSON.parse(JSON.stringify(done))), done);
  assert.equal(O.normalizeOriginV151({ version: 2, originId: "O1" }), null);
  assert.equal(O.isFutureOriginV151({ version: 2 }), true);
  assert.equal(O.normalizeOriginV151({ version: 1, originId: "O9" }), null);
  const forged = O.normalizeOriginV151({ version: 1, originId: "O1", transitions: { "STORY5-TR-O1-01": { steps: 1, resolved: true, success: true, choice: 0 } } });
  assert.equal(forged.transitions["STORY5-TR-O1-01"].resolved, false, "a resolution without its gestures is not kept");
});

test("house gestures start again after a transfer and the choice waits for the new address", () => {
  const before = "HOME-CM07";
  const after = "HOME-CM08";
  const from = ctx(before, "blooded");
  const to = ctx(after, "blooded");
  let residence = activeCm07();
  let state = O.createOriginV151("O6");
  for (let i = 0; i < 3; i++) state = ok(O.houseTransitionStepV151(state, residence, i, from));
  residence = ok(R.acceptHouseMissionV149(residence, after, to));
  residence = field(residence, "transfer", ["ward", "recover", "report"]);
  residence = ok(R.chooseHouseRouteV149(residence, after, 0, to));
  residence = ok(R.startTransferV149(residence, after, from));
  residence = ok(R.confirmDepartureV149(residence, from));
  residence = ok(R.confirmArrivalV149(residence, to));
  assert.equal(O.houseTransitionChooseV151(state, residence, 0, to).ok, false);
  assert.equal(O.houseTransitionStepV151(state, residence, 1, to).ok, false);
  for (let i = 0; i < 3; i++) state = ok(O.houseTransitionStepV151(state, residence, i, to));
  state = ok(O.houseTransitionChooseV151(state, residence, 0, to));
  assert.equal(state.transitions["STORY5-TR-O6-01"].houseId, after);
});
