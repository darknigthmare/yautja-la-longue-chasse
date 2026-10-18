import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const bundle = await build({ stdin: { contents: "export * from './app/game/systems/clanWarExerciseV6'; export * from './app/game/systems/clanWarBibleV6';", resolveDir: fileURLToPath(new URL("../", import.meta.url)) }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const fresh = (rav = 12) => api.createWarExerciseV6("W3-U01", rav);
const apply = (state, action, rules = api.DEFAULT_WAR_RULES_V6) => { const result = api.applyWarExerciseV6(state, action, rules); assert.equal(result.accepted, true, result.message); return result.state; };
const travel = (state, destinationId) => { state = apply(state, { kind: "plan", destinationId }); while (state.route) state = apply(state, { kind: "advance" }); return state; };

test("exercise starts with chosen finite stock and novice members, never with territory ownership", () => {
  const state = fresh(7);
  assert.equal(state.ravStock, 7); assert.equal(state.startingRav, 7);
  assert.equal(state.territoryId, "W3-K01"); assert.equal(state.context, "free");
  assert.deepEqual(state.team.members.map(member => member.xp), [0, 0]);
  assert.deepEqual(state.observations, []); assert.equal("controllers" in state, false);
  for (const stock of [-1, 121, 0.5, Infinity]) assert.equal(fresh(stock), null);
  assert.equal(api.createWarExerciseV6("RTS-U01", 12), null);
});

test("preparing a route changes no presence, XP, fatigue, turn or stock", () => {
  const state = fresh(), before = structuredClone(state);
  const planned = apply(state, { kind: "plan", destinationId: "W3-K36" });
  assert(planned.route.passageIds.length > 1);
  assert.equal(planned.territoryId, state.territoryId); assert.equal(planned.turn, state.turn); assert.equal(planned.ravStock, state.ravStock);
  assert.deepEqual(planned.team, state.team); assert.deepEqual(planned.traversedIds, ["W3-K01"]);
  assert.deepEqual(state, before);
});

test("one resolved passage keeps the same members, consumes one upkeep and adds documented march fatigue", () => {
  const planned = apply(fresh(), { kind: "plan", destinationId: "W3-K02" }), before = structuredClone(planned);
  const moved = apply(planned, { kind: "advance" });
  assert.equal(moved.territoryId, "W3-K02"); assert.equal(moved.route, null);
  assert.equal(moved.turn, 2); assert.equal(moved.ravStock, 11); assert.equal(moved.team.fatigue, 10);
  assert.deepEqual(moved.team.members.map(member => member.id), planned.team.members.map(member => member.id));
  assert.deepEqual(moved.team.members.map(member => member.xp), [0, 0]);
  assert.deepEqual(moved.traversedIds, ["W3-K01", "W3-K02"]);
  assert.deepEqual(planned, before);
});

test("observation requires present fit members and grants each new location exactly once after return", () => {
  let state = travel(fresh(), "W3-K02");
  state.team.members[1].status = "wounded";
  state = apply(state, { kind: "observe" });
  assert.deepEqual(state.team.members.map(member => member.xp), [4, 0]); assert.equal(state.observations[0].territoryId, "W3-K02");
  const repeated = api.applyWarExerciseV6(state, { kind: "observe" });
  assert.equal(repeated.changed, false); assert.strictEqual(repeated.state, state);
  state = travel(state, "W3-K01"); state = travel(state, "W3-K02");
  const returned = api.applyWarExerciseV6(state, { kind: "observe" });
  assert.equal(returned.changed, false); assert.equal(returned.state.team.members[0].xp, 4);
  const absent = { ...fresh(), team: { ...fresh().team, members: fresh().team.members.map(member => ({ ...member, status: "wounded" })) } };
  assert.equal(api.applyWarExerciseV6(absent, { kind: "observe" }).accepted, false);
  assert.equal(api.applyWarExerciseV6(absent, { kind: "plan", destinationId: "W3-K02" }).accepted, false);
});

test("a passage closed after planning blocks execution without spending resources or moving; replanning works", () => {
  let state = apply(fresh(), { kind: "plan", destinationId: "W3-K02" });
  state = apply(state, { kind: "close-passages", ids: ["W3-L01"] });
  const blocked = api.applyWarExerciseV6(state, { kind: "advance" });
  assert.equal(blocked.accepted, false); assert.strictEqual(blocked.state, state);
  const alternative = api.applyWarExerciseV6(state, { kind: "plan", destinationId: "W3-K02" });
  assert(alternative.state.route === null || !alternative.state.route.passageIds.includes("W3-L01"));
  const reopened = apply(state, { kind: "close-passages", ids: [] });
  assert.equal(apply(reopened, { kind: "advance" }).territoryId, "W3-K02");
  assert.equal(api.applyWarExerciseV6(state, { kind: "close-passages", ids: ["CON-T09"] }).accepted, false);
});

test("zero stock causes rationing, never negative stock or an invented death; resting is equipped and localized", () => {
  let state = travel(fresh(0), "W3-K02");
  assert.equal(state.ravStock, 0); assert.equal(api.estimateWarExerciseV6(state).supplyFactor, 0.7);
  assert(state.team.members.every(member => member.status === "fit"));
  assert.equal(api.applyWarExerciseV6(state, { kind: "rest" }).accepted, false);
  state = travel(state, "W3-K01"); assert.equal(state.team.fatigue, 20);
  const rested = apply(state, { kind: "rest" });
  assert.equal(rested.team.fatigue, 0); assert.equal(rested.ravStock, 0); assert.equal(rested.turn, state.turn + 1);
  const alreadyRested = api.applyWarExerciseV6(rested, { kind: "rest" });
  assert.equal(alreadyRested.changed, false); assert.strictEqual(alreadyRested.state, rested);
});

test("actual reconnaissance journey reaches Veteran from ten unique observations and locks a single branch", () => {
  let state = fresh(120);
  for (const destination of api.DEFAULT_WAR_RULES_V6.territories.slice(0, 10)) { state = travel(state, destination.id); state = apply(state, { kind: "observe" }); }
  assert.equal(state.observations.length, 10); assert.equal(api.warTeamExperienceV6(state.team), 40);
  assert.equal(api.warTeamTierV6(api.warTeamExperienceV6(state.team)), "Vétéran");
  state = apply(state, { kind: "specialize", branch: "A" });
  assert.equal(state.team.specialization, "A");
  assert.equal(api.applyWarExerciseV6(state, { kind: "specialize", branch: "B" }).accepted, false);
  assert(state.ravStock < state.startingRav); assert(state.team.fatigue <= 100);
  assert.equal("controllers" in state, false);
});

test("unknown destinations, foreign source/campaign state and corrupt numbers cannot execute an exercise", () => {
  const state = fresh();
  assert.equal(api.applyWarExerciseV6(state, { kind: "plan", destinationId: "CON-T09" }).accepted, false);
  assert.equal(api.applyWarExerciseV6(state, { kind: "advance" }).accepted, false);
  for (const invalid of [{ ...state, context: "campaign" }, { ...state, sourceSha: "foreign" }, { ...state, ravStock: -1 }, { ...state, turn: NaN }, { ...state, team: { ...state.team, fatigue: NaN } }]) {
    const result = api.applyWarExerciseV6(invalid, { kind: "observe" }); assert.equal(result.accepted, false); assert.strictEqual(result.state, invalid);
  }
});
