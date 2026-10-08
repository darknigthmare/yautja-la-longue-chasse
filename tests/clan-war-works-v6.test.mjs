import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const bundle = await build({ stdin: { contents: "export * from './app/game/systems/clanWarWorksV6'; export * from './app/game/systems/clanWarBibleV6'; export {default as workbook} from './app/game/clanWarBibleV6Source.json';", resolveDir: fileURLToPath(new URL("../", import.meta.url)) }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const rules = api.DEFAULT_WAR_RULES_V6;
const fresh = (unit = "W3-U17", rav = 120, context = rules) => api.createWarWorksV6(rav, unit, context);
const apply = (state, action, context = rules) => {
  const before = structuredClone(state), result = api.applyWarWorksV6(state, action, context);
  assert.deepEqual(state, before, "orders must not mutate the input snapshot");
  assert(result.accepted, result.message); return result.state;
};
const id = state => state.teams[0].team.id;
const travel = (state, teamId, destinationId, context = rules) => {
  state = apply(state, { kind: "plan", teamId, destinationId }, context);
  for (let n = 0; state.teams.find(group => group.team.id === teamId).route && n < 100; n++) state = apply(state, { kind: "advance", teamId }, context);
  assert.equal(state.teams.find(group => group.team.id === teamId).territoryId, destinationId); return state;
};
function delivered(structureId = "W3-S02", unitId = "W3-U17", context = rules) {
  let state = fresh(unitId, 120, context); state = travel(state, id(state), "W3-K02", context);
  state = apply(state, { kind: "observe", teamId: id(state) }, context);
  state = apply(state, { kind: "reserve-kit", structureId, territoryId: "W3-K02", passageId: "W3-L01" }, context);
  const workId = state.works[0].id;
  state = travel(state, id(state), state.originId, context);
  state = apply(state, { kind: "load", workId, teamId: id(state) }, context);
  state = travel(state, id(state), "W3-K02", context);
  state = apply(state, { kind: "unload", workId, teamId: id(state) }, context);
  return { state, workId };
}
function completed(structureId = "W3-S02", unitId = "W3-U17", context = rules) {
  let { state, workId } = delivered(structureId, unitId, context);
  const def = api.warWorksDefinitionsV6(context).find(item => item.id === structureId);
  for (let n = 0; n < def.delayTurns; n++) state = apply(state, { kind: "work", workId, teamId: id(state) }, context);
  return { state, workId };
}

test("eleven live workbook rows supply exact construction costs, operators, maintenance and delay", () => {
  const defs = api.warWorksDefinitionsV6();
  assert.deepEqual(defs.map(def => [def.id, def.costRav, def.upkeepRav, def.delayTurns, def.operatorUnitId]),
    [["W3-S02", 8, 1, 2, "W3-U17"], ["W3-S05", 4, 1, 2, "W3-U06"], ["W3-S07", 12, 1, 2, "W3-U07"], ["W3-S03", 10, 1, 2, "W3-U19"], ["W3-S04", 12, 2, 2, "W3-U20"], ["W3-S16", 14, 2, 3, "W3-U17"], ["W3-S12", 12, 2, 2, "W3-U28"], ["W3-S17", 16, 2, 3, "W3-U20"], ["W3-S01", 6, 1, 2, "W3-U02"], ["W3-S06", 10, 1, 2, "W3-U13"], ["W3-S08", 14, 2, 3, "W3-U12"]]);
  assert.equal(defs[2].defensePercent, 15);
  for (const def of defs) {
    const row = api.workbook.entries.find(entry => entry.id === def.id && entry.sheet === "Structures de guerre");
    assert.equal(def.sourceRow, row.row); assert.deepEqual(def.sourceCells, row.fields.map(field => field.cell));
  }
});

test("hypothetical starting budget and novice identities remain independent of campaign and V3", () => {
  const state = fresh(); assert.equal(state.context, "free-workshop"); assert.equal(state.ravStock, 120);
  assert.deepEqual(state.teams[0].team.members.map(member => member.xp), [0, 0, 0]);
  assert.equal("controllers" in state, false); assert.equal("save" in state, false); assert.equal("income" in state, false);
  for (const budget of [-1, 121, 0.25, Infinity]) assert.equal(fresh("W3-U17", budget), null);
  assert.equal(fresh("RTS-U01"), null); assert.equal(fresh("W3-U26"), null);
  assert.notStrictEqual(fresh().teams[0].team.members[0], state.teams[0].team.members[0]);
});

test("voluntary formation reserves its real price and command points but cannot spawn before its exact delay", () => {
  let state = fresh("W3-U17", 80), primaryIds = state.teams[0].team.members.map(member => member.id);
  state = apply(state, { kind: "recruit", unitId: "W3-U06" });
  assert.equal(state.ravStock, 72); assert.equal(state.teams.length, 1); assert.equal(state.turn, 1);
  assert.equal(api.warWorksCommandPointsV6(state), 5); assert.equal(state.recruits[0].readyTurn, 3);
  state = apply(state, { kind: "wait" }); assert.equal(state.teams.length, 1); assert.equal(state.ravStock, 70);
  state = apply(state, { kind: "wait" }); assert.equal(state.teams.length, 2); assert.equal(state.ravStock, 68);
  assert.equal(state.teams[1].territoryId, state.originId); assert.equal(state.teams[1].team.id, state.recruits[0].teamId);
  assert.deepEqual(state.teams[1].team.members.map(member => member.xp), [0, 0]);
  assert(state.teams[1].team.members.every(member => !primaryIds.includes(member.id)));
  const arrived = structuredClone(state.teams[1].team); state = apply(state, { kind: "wait" });
  assert.equal(state.ravStock, 65); assert.deepEqual(state.teams[1].team, arrived); assert.equal(state.teams.length, 2);
});

test("documented eighty-RAV journey commissions the shelter at turn seven and rests without replacing people", () => {
  let state = fresh("W3-U17", 80);
  const memberIds = state.teams[0].team.members.map(member => member.id);
  state = travel(state, id(state), "W3-K02");
  state = apply(state, { kind: "observe", teamId: id(state) });
  state = apply(state, { kind: "reserve-kit", structureId: "W3-S02", territoryId: "W3-K02" });
  const workId = state.works[0].id, kitId = state.works[0].kitId;
  state = travel(state, id(state), state.originId);
  state = apply(state, { kind: "load", workId, teamId: id(state) });
  state = travel(state, id(state), "W3-K02");
  state = apply(state, { kind: "unload", workId, teamId: id(state) });
  state = apply(state, { kind: "work", workId, teamId: id(state) });
  state = apply(state, { kind: "work", workId, teamId: id(state) });
  assert.equal(state.turn, 7); assert.equal(state.ravStock, 60); assert.equal(state.teams[0].team.fatigue, 30);
  assert.equal(state.works[0].phase, "ready"); assert.equal(state.works[0].kitId, kitId);
  assert.equal(state.accounts.kitsReserved, 8); assert.equal(state.accounts.upkeepConsumed, 12);
  assert.deepEqual(state.teams[0].team.members.map(member => member.xp), [4, 4, 4]);
  state = apply(state, { kind: "rest", workId, teamId: id(state) });
  assert.equal(state.turn, 8); assert.equal(state.ravStock, 57); assert.equal(state.teams[0].team.fatigue, 10);
  assert.deepEqual(state.teams[0].team.members.map(member => member.id), memberIds);
  assert.deepEqual(state.teams[0].team.members.map(member => member.xp), [4, 4, 4]);
  assert.equal(state.accounts.upkeepConsumed, 15); assert(state.teams[0].team.members.every(member => member.status === "fit"));
});

test("pending volunteers already count toward PC and unaffordable recruit orders leave every byte unchanged", () => {
  let state = fresh(); for (let n = 0; n < 3; n++) state = apply(state, { kind: "recruit", unitId: "W3-U17" });
  assert.equal(api.warWorksCommandPointsV6(state), 12); assert.equal(state.teams.length, 1);
  const denied = api.applyWarWorksV6(state, { kind: "recruit", unitId: "W3-U06" }); assert(!denied.accepted); assert.strictEqual(denied.state, state);
  const poor = fresh("W3-U17", 7), noMoney = api.applyWarWorksV6(poor, { kind: "recruit", unitId: "W3-U06" });
  assert(!noMoney.accepted); assert.strictEqual(noMoney.state, poor);
});

test("a kit requires a surveyed site, remains at origin and cannot be instantly delivered or built", () => {
  let state = fresh(); assert(!api.applyWarWorksV6(state, { kind: "reserve-kit", structureId: "W3-S02", territoryId: "W3-K02" }).accepted);
  state = travel(state, id(state), "W3-K02"); state = apply(state, { kind: "observe", teamId: id(state) });
  const stock = state.ravStock, turn = state.turn, members = structuredClone(state.teams[0].team);
  state = apply(state, { kind: "reserve-kit", structureId: "W3-S02", territoryId: "W3-K02" });
  assert.equal(state.ravStock, stock - 8); assert.equal(state.turn, turn); assert.equal(state.works[0].phase, "reserved");
  assert.deepEqual(state.teams[0].team, members);
  for (const kind of ["load", "unload", "work", "assign", "rest"]) {
    const result = api.applyWarWorksV6(state, { kind, workId: state.works[0].id, teamId: id(state) });
    assert(!result.accepted, kind); assert.strictEqual(result.state, state);
  }
  const repeated = api.applyWarWorksV6(state, { kind: "reserve-kit", structureId: "W3-S02", territoryId: "W3-K02" });
  assert.equal(repeated.changed, false); assert.strictEqual(repeated.state, state);
});

test("loaded kit follows the same real team through graph edges and closure after planning cannot move or debit it", () => {
  let state = fresh(); state = apply(state, { kind: "observe", teamId: id(state) });
  state = apply(state, { kind: "reserve-kit", structureId: "W3-S02", territoryId: state.originId });
  state = apply(state, { kind: "load", workId: state.works[0].id, teamId: id(state) });
  const kitId = state.works[0].kitId, members = state.teams[0].team.members.map(member => member.id);
  state = apply(state, { kind: "plan", teamId: id(state), destinationId: "W3-K02" });
  state = apply(state, { kind: "close-passages", ids: ["W3-L01"] });
  const denied = api.applyWarWorksV6(state, { kind: "advance", teamId: id(state) }); assert(!denied.accepted); assert.strictEqual(denied.state, state);
  state = apply(state, { kind: "close-passages", ids: [] }); state = apply(state, { kind: "advance", teamId: id(state) });
  assert.equal(state.teams[0].territoryId, "W3-K02"); assert.equal(state.works[0].kitId, kitId);
  assert.equal(state.works[0].carrierTeamId, id(state)); assert.deepEqual(state.teams[0].team.members.map(member => member.id), members);
  const wrongSite = api.applyWarWorksV6(state, { kind: "unload", workId: state.works[0].id, teamId: id(state) });
  assert(!wrongSite.accepted); assert.strictEqual(wrongSite.state, state);
});

test("RAV forbidden passages never carry kits, including a corrupt stale plan", () => {
  const raw = structuredClone(api.workbook), row = raw.entries.find(entry => entry.sheet === "Passages de Korthas" && entry.id === "W3-L01");
  row.fields.find(field => field.column === "J").value = false;
  const context = api.createWarRulesV6(raw); let state = fresh("W3-U17", 120, context);
  state = apply(state, { kind: "observe", teamId: id(state) }, context);
  state = apply(state, { kind: "reserve-kit", structureId: "W3-S02", territoryId: state.originId }, context);
  state = apply(state, { kind: "load", workId: state.works[0].id, teamId: id(state) }, context);
  state = apply(state, { kind: "close-passages", ids: context.passages.filter(passage => passage.id !== "W3-L01").map(passage => passage.id) }, context);
  const denied = api.applyWarWorksV6(state, { kind: "plan", teamId: id(state), destinationId: "W3-K02" }, context); assert(!denied.accepted);
  const forged = structuredClone(state); forged.teams[0].route = { passageIds: ["W3-L01"], territoryIds: ["W3-K01", "W3-K02"], cost: 1 };
  const advanced = api.applyWarWorksV6(forged, { kind: "advance", teamId: id(forged) }, context); assert(!advanced.accepted); assert.strictEqual(advanced.state, forged);
});

test("delivery leaves two real work turns, immobilized operators and no construction XP", () => {
  let { state, workId } = delivered(); const xp = state.teams[0].team.members.map(member => member.xp), turn = state.turn;
  assert.equal(state.works[0].phase, "delivered"); assert.equal(state.works[0].workedTurns, 0);
  state = apply(state, { kind: "wait" }); assert.equal(state.works[0].workedTurns, 0);
  state = apply(state, { kind: "work", workId, teamId: id(state) });
  assert.equal(state.works[0].phase, "building"); assert.equal(state.works[0].workedTurns, 1); assert.equal(state.teams[0].dutyWorkId, workId);
  assert(!api.applyWarWorksV6(state, { kind: "plan", teamId: id(state), destinationId: state.originId }).accepted);
  state = apply(state, { kind: "work", workId, teamId: id(state) });
  assert.equal(state.works[0].phase, "ready"); assert.equal(state.turn, turn + 3); assert(api.warWorkOccupiedV6(state, state.works[0]));
  assert.deepEqual(state.teams[0].team.members.map(member => member.xp), xp);
  const repeated = api.applyWarWorksV6(state, { kind: "work", workId, teamId: id(state) }); assert(!repeated.changed); assert.strictEqual(repeated.state, state);
});

test("upkeep charges one team and one commissioned structure, then rationing never creates losses or income", () => {
  let { state } = completed(); const before = state.ravStock;
  assert.equal(api.warWorksUpkeepV6(state), 3); state = apply(state, { kind: "wait" });
  assert.equal(state.ravStock, before - 3); assert.equal(state.lastTurnNeed, 3); assert.equal(state.lastTurnPaid, 3);
  assert.equal(state.startingRav - state.accounts.kitsReserved - state.accounts.recruitmentReserved - state.accounts.upkeepConsumed, state.ravStock);
  while (state.ravStock > 0) state = apply(state, { kind: "wait" });
  const members = structuredClone(state.teams[0].team.members); state = apply(state, { kind: "wait" });
  assert.equal(state.ravStock, 0); assert.equal(state.lastTurnPaid, 0); assert.deepEqual(state.teams[0].team.members, members);
  assert.equal(api.estimateWarWorksTeamV6(state, id(state)).supplyFactor, 0.7);
});

test("wrong, incomplete or absent operator cannot commission an otherwise delivered kit", () => {
  const setup = delivered(), injured = structuredClone(setup.state); injured.teams[0].team.members[0].status = "wounded";
  assert(!api.applyWarWorksV6(injured, { kind: "work", workId: setup.workId, teamId: id(injured) }).accepted);
  let state = setup.state; state = apply(state, { kind: "recruit", unitId: "W3-U06" });
  state = apply(apply(state, { kind: "wait" }), { kind: "wait" });
  const marker = state.teams[1].team.id;
  const absent = api.applyWarWorksV6(state, { kind: "work", workId: setup.workId, teamId: marker }); assert(!absent.accepted);
  state = travel(state, marker, "W3-K02"); const wrong = api.applyWarWorksV6(state, { kind: "work", workId: setup.workId, teamId: marker });
  assert(!wrong.accepted); assert.strictEqual(wrong.state, state);
});

test("release preserves finished work and identity but an unoccupied shelter cannot grant remote rest", () => {
  let { state, workId } = completed(); const identity = structuredClone(state.teams[0].team);
  state = apply(state, { kind: "release", teamId: id(state) }); assert.equal(state.works[0].phase, "ready"); assert(!api.warWorkOccupiedV6(state, state.works[0]));
  assert.deepEqual(state.teams[0].team, identity);
  assert(!api.applyWarWorksV6(state, { kind: "rest", teamId: id(state), workId }).accepted);
  state = apply(state, { kind: "assign", workId, teamId: id(state) });
  const before = state.teams[0].team.fatigue, stock = state.ravStock;
  state = apply(state, { kind: "rest", workId, teamId: id(state) });
  assert.equal(state.teams[0].team.fatigue, Math.max(0, before - 20)); assert.equal(state.ravStock, stock - 3);
  assert.deepEqual(state.teams[0].team.members, identity.members);
});

test("shelter rest for another present team preserves that team's wounds, XP and member identities", () => {
  let { state, workId } = completed(); state = apply(state, { kind: "recruit", unitId: "W3-U06" });
  state = apply(apply(state, { kind: "wait" }), { kind: "wait" }); const marker = state.teams[1].team.id;
  state = travel(state, marker, "W3-K02"); state.teams[1].team.members[1].status = "wounded"; state.teams[1].team.members[1].xp = 19;
  const members = structuredClone(state.teams[1].team.members);
  state = apply(state, { kind: "rest", workId, teamId: marker });
  assert.equal(state.teams[1].team.fatigue, 0); assert.deepEqual(state.teams[1].team.members, members);
});

test("occupied fortified threshold adds its documented estimate only at its actual passage; no attack or annexation", () => {
  let { state, workId } = completed("W3-S07", "W3-U07");
  const ordinary = api.estimateWarWorksTeamV6(state, id(state), "W3-L02"), protectedEstimate = api.estimateWarWorksTeamV6(state, id(state), "W3-L01");
  assert.equal(ordinary.defensePercent, 0); assert.equal(protectedEstimate.defensePercent, 15);
  assert.equal(protectedEstimate.protectedDefense, Math.floor(ordinary.defense * 115 / 100));
  assert.equal(protectedEstimate.attack, ordinary.attack); assert.equal("controllers" in state, false);
  state = apply(state, { kind: "release", teamId: id(state) });
  assert.equal(api.estimateWarWorksTeamV6(state, id(state), "W3-L01").defensePercent, 0); assert.equal(state.works[0].id, workId);
});

test("route beacon becomes an occupied actual landmark only after material delivery and real work", () => {
  let { state } = completed("W3-S05", "W3-U06"); assert(api.warWorkOccupiedV6(state, state.works[0]));
  assert.equal(state.works[0].territoryId, "W3-K02"); assert.equal(state.observed[0].territoryId, "W3-K02");
  assert.equal(state.works[0].phase, "ready"); state = apply(state, { kind: "release", teamId: id(state) });
  assert(!api.warWorkOccupiedV6(state, state.works[0])); assert.equal(state.observed.length, 1);
});

test("one front reconnaissance cannot be farmed by repeated orders or newly arrived copies", () => {
  let state = fresh(); state = apply(state, { kind: "observe", teamId: id(state) });
  assert.deepEqual(state.teams[0].team.members.map(member => member.xp), [4, 4, 4]);
  state = apply(state, { kind: "recruit", unitId: "W3-U06" }); state = apply(apply(state, { kind: "wait" }), { kind: "wait" });
  const result = api.applyWarWorksV6(state, { kind: "observe", teamId: state.teams[1].team.id });
  assert(!result.changed); assert.strictEqual(result.state, state); assert.deepEqual(state.teams[1].team.members.map(member => member.xp), [0, 0]);
});

test("imported contexts isolate prices and timing; malformed construction formulas fail closed instead of using defaults", () => {
  const raw = structuredClone(api.workbook), row = raw.entries.find(entry => entry.sheet === "Structures de guerre" && entry.id === "W3-S02");
  row.fields.find(field => field.label === "Coût RAV").value = 9; row.fields.find(field => field.label === "Délai (tours)").value = 3;
  const context = api.createWarRulesV6(raw); const { state } = completed("W3-S02", "W3-U17", context);
  assert.equal(state.works[0].costRav, 9); assert.equal(state.works[0].workedTurns, 3);
  const mixed = api.applyWarWorksV6(state, { kind: "wait" }, rules); assert(!mixed.accepted); assert.strictEqual(mixed.state, state);
  assert.equal(api.warWorksDefinitionsV6(rules)[0].costRav, 8);
  row.fields.find(field => field.label === "Coût RAV").value = "=1+7";
  assert.equal(api.createWarWorksV6(80, "W3-U17", api.createWarRulesV6(raw)), null);
});

test("copied member, forged funds, carried-kit duplication and foreign contexts cannot commit an order", () => {
  const state = fresh(), duplicate = structuredClone(state); duplicate.teams[0].team.members[1].id = duplicate.teams[0].team.members[0].id;
  for (const corrupt of [duplicate, { ...state, context: "campaign" }, { ...state, ravStock: 119 }, { ...state, turn: NaN }, { ...state, sourceSha: "other" }]) {
    const result = api.applyWarWorksV6(corrupt, { kind: "wait" }); assert(!result.accepted); assert.strictEqual(result.state, corrupt);
  }
  let loaded = apply(state, { kind: "observe", teamId: id(state) }); loaded = apply(loaded, { kind: "reserve-kit", structureId: "W3-S02", territoryId: loaded.originId });
  loaded = apply(loaded, { kind: "load", workId: loaded.works[0].id, teamId: id(loaded) });
  const forged = structuredClone(loaded); forged.works[0].carrierTeamId = "other-team";
  assert(!api.applyWarWorksV6(forged, { kind: "wait" }).accepted);
});
