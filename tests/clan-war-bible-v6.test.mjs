import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const bundle = await build({ entryPoints: [fileURLToPath(new URL("../app/game/systems/clanWarBibleV6.ts", import.meta.url))], bundle: true, format: "esm", platform: "node", target: "es2022", write: false, logLevel: "silent" });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const workbook = JSON.parse(await readFile(new URL("../app/game/clanWarBibleV6Source.json", import.meta.url), "utf8"));
const copy = value => structuredClone(value);
const hypothesis = { unitId: "W3-U01", xp: 40, fatigue: 20, deployableMembers: 2, availableRav: 6, frontNeedRav: 6, terrainBonus: 10, nextObjectiveXp: 8 };
const cell = (source, sheet, id, column) => source.entries.find(entry => entry.sheet === sheet && entry.id === id).fields.find(field => field.column === column);
const receipt = (team, overrides = {}) => ({ operationId: "operation-1", resultId: "result-1", mode: "rts", objective: "battle", participantIds: team.members.filter(member => member.status === "fit").map(member => member.id), final: true, ...overrides });

test("published V6 source is active and complete; historical IDs never alias the new design", () => {
  const parsed = api.parsePrivateWarRulesV6(workbook);
  assert.equal(parsed.error, null);
  assert.equal(parsed.rules.entries.length, 975);
  assert.equal(parsed.rules.sections.length, 33);
  assert.equal(api.DEFAULT_WAR_RULES_V6.metadata.sha256, api.WAR_BIBLE_SOURCE_SHA_V6);
  assert.deepEqual([api.WAR_UNITS_V6.length, api.WAR_SPECIALIZATIONS_V6.length, api.WAR_TERRITORIES_V6.length, api.WAR_PASSAGES_V6.length, Object.keys(api.WAR_PARAMETERS_V6).length], [30, 30, 36, 70, 31]);
  assert.equal(api.estimateWarTeamV6({ ...hypothesis, unitId: "RTS-U01" }).valid, false);
  assert.equal(api.planWarRouteV6("CON-T01", "CON-T02", 2), null);
});

test("Excel Simuler Une équipe defaults give 12 attack, 9 defense and 48 XP", () => {
  const result = api.estimateWarTeamV6(hypothesis);
  assert.equal(result.valid, true);
  assert.deepEqual([result.attack, result.defense, result.xpAfter], [12, 9, 48]);
  assert.deepEqual([result.multiplier, result.fatigueFactor, result.supplyFactor, result.memberFactor], [1.15, 0.9, 1, 1]);
  assert.equal(api.warTeamTierV6(result.xpAfter), "Vétéran");
  assert.equal(api.warTeamTierV6(39), "Novice");
  assert.equal(api.warTeamTierV6(80), "Maître");
});

test("rationing, missing members, fatigue floor, terrain cap and XP cap match workbook values", () => {
  const rationed = api.estimateWarTeamV6({ ...hypothesis, availableRav: 0 });
  assert.deepEqual([rationed.attack, rationed.defense, rationed.xpAfter, rationed.supplyFactor], [8, 6, 48, 0.7]);
  const half = api.estimateWarTeamV6({ ...hypothesis, deployableMembers: 1 });
  assert.deepEqual([half.attack, half.defense, half.xpAfter, half.memberFactor], [6, 4, 48, 0.5]);
  const capped = api.estimateWarTeamV6({ ...hypothesis, xp: 99, fatigue: 100, availableRav: 0, terrainBonus: 100, nextObjectiveXp: 12 });
  assert.deepEqual([capped.attack, capped.defense, capped.xpAfter, capped.fatigueFactor], [5, 4, 100, 0.5]);
  const empty = api.estimateWarTeamV6({ ...hypothesis, deployableMembers: 0, frontNeedRav: 0 });
  assert.deepEqual([empty.attack, empty.defense, empty.xpAfter], [0, 0, 40]);
});

test("invalid hypotheses cannot calculate power or award XP", () => {
  for (const override of [{ deployableMembers: 3 }, { deployableMembers: 0.5 }, { frontNeedRav: 0 }, { fatigue: 101 }, { xp: 101 }, { availableRav: 121 }, { terrainBonus: -1 }, { nextObjectiveXp: 13 }, { xp: NaN }, { fatigue: Infinity }]) {
    const result = api.estimateWarTeamV6({ ...hypothesis, ...override });
    assert.equal(result.valid, false, JSON.stringify(override));
    assert.equal(result.attack, null);
    assert.equal(result.defense, null);
  }
});

test("local parser rejects forged metadata, truncated core, duplicate identities and bad cell provenance", () => {
  const cases = [null, [], {}, { ...workbook, sha256: "0".repeat(64) }, { ...workbook, workbook: "Other.xlsx" }, { ...workbook, designedAt: "2026-10-06" }];
  const truncated = copy(workbook); truncated.entries = truncated.entries.filter(entry => entry.id !== "W3-U01"); cases.push(truncated);
  const duplicate = copy(workbook); duplicate.entries.push(copy(duplicate.entries[0])); cases.push(duplicate);
  const wrongCell = copy(workbook); wrongCell.entries[0].fields[0].cell = "C999"; cases.push(wrongCell);
  const objectCell = copy(workbook); objectCell.entries[0].fields[0].value = { script: "globalThis.compromised=true" }; cases.push(objectCell);
  for (const value of cases) { const result = api.parsePrivateWarRulesV6(value); assert.equal(result.rules, null); assert.equal(typeof result.error, "string"); }
});

test("numeric formulas, nonfinite values, broken graph and string booleans are refused", () => {
  const mutations = [
    source => { cell(source, "Unités de guerre", "W3-U01", "I").value = "=SUM(1,2)"; },
    source => { cell(source, "Paramètres de guerre", "W3-PAR16", "D").value = 0; },
    source => { cell(source, "Unités de guerre", "W3-U01", "D").value = Infinity; },
    source => { cell(source, "Passages de Korthas", "W3-L01", "G").value = "false"; },
    source => { cell(source, "Passages de Korthas", "W3-L01", "C").value = "CON-T01"; },
    source => { cell(source, "Territoires de Korthas", "W3-K01", "D").value = 2; },
  ];
  for (const mutate of mutations) { const invalid = copy(workbook); mutate(invalid); assert.equal(api.parsePrivateWarRulesV6(invalid).rules, null); }
});

test("formulas and scripts in prose stay inert text; unknown properties are discarded", () => {
  const source = copy(workbook);
  source.entries[0].fields[0].value = "=HYPERLINK(\"javascript:globalThis.compromised=true\")";
  source.entries[0].script = "throw new Error('executed')";
  const result = api.parsePrivateWarRulesV6(source);
  assert.equal(result.error, null);
  assert.equal(result.rules.entries[0].fields[0].value, source.entries[0].fields[0].value);
  assert.equal("script" in result.rules.entries[0], false);
  assert.equal(globalThis.compromised, undefined);
});

test("each import owns its rules, calculator, route graph and field arrays", () => {
  const first = api.parsePrivateWarRulesV6(workbook).rules;
  const second = api.parsePrivateWarRulesV6(workbook).rules;
  const originalPower = api.estimateWarTeamV6(hypothesis).attack;
  first.units[0].attack = 120;
  first.entries[0].fields[0].value = "local replacement";
  first.passages = [];
  assert.equal(api.estimateWarTeamV6(hypothesis, first).attack, 124);
  assert.equal(api.estimateWarTeamV6(hypothesis, second).attack, originalPower);
  assert.equal(api.estimateWarTeamV6(hypothesis).attack, originalPower);
  assert.equal(api.planWarRouteV6("W3-K01", "W3-K02", 2, [], first), null);
  assert.equal(api.planWarRouteV6("W3-K01", "W3-K02", 2, [], second).cost, 1);
  assert.notEqual(second.entries[0].fields[0].value, "local replacement");
  assert.notEqual(workbook.entries[0].fields[0].value, "local replacement");
});

test("actual passage W3-L01 costs one, and closed or oversized columns cannot use it", () => {
  const direct = api.planWarRouteV6("W3-K01", "W3-K02", 12);
  assert.deepEqual(direct, { territoryIds: ["W3-K01", "W3-K02"], passageIds: ["W3-L01"], cost: 1 });
  const closed = api.planWarRouteV6("W3-K01", "W3-K02", 12, ["W3-L01"]);
  assert(closed === null || !closed.passageIds.includes("W3-L01"));
  const oversize = api.planWarRouteV6("W3-K01", "W3-K02", 18);
  assert(oversize === null || !oversize.passageIds.includes("W3-L01"));
  for (const pc of [0, 25, 1.5, Infinity]) assert.equal(api.planWarRouteV6("W3-K01", "W3-K02", pc), null);
});

test("directions and RAV permission are respected without changing the default graph", () => {
  const context = api.createWarRulesV6(workbook);
  context.passages = [{ ...context.passages[0], bidirectional: false, permitsRav: false }];
  assert.equal(api.planWarRouteV6("W3-K01", "W3-K02", 2, [], context).cost, 1);
  assert.equal(api.planWarRouteV6("W3-K02", "W3-K01", 2, [], context), null);
  assert.equal(api.planWarRouteV6("W3-K01", "W3-K02", 2, [], context, "rav"), null);
  assert.equal(api.planWarRouteV6("W3-K01", "W3-K02", 2, [], api.DEFAULT_WAR_RULES_V6, "rav").cost, 1);
  assert.deepEqual(api.planWarRouteV6("W3-K01", "W3-K01", 2), { territoryIds: ["W3-K01"], passageIds: [], cost: 0 });
});

test("every source route agrees with an independent all-pairs shortest-distance oracle", () => {
  const context = api.DEFAULT_WAR_RULES_V6, ids = context.territories.map(zone => zone.id);
  for (const pc of [1, 12, 18, 24]) for (const cargo of ["none", "rav"]) {
    const distance = ids.map((_, i) => ids.map((_, j) => i === j ? 0 : Infinity));
    for (const passage of context.passages) if (passage.capacityPc >= pc && (cargo !== "rav" || passage.permitsRav)) {
      const i = ids.indexOf(passage.fromId), j = ids.indexOf(passage.toId);
      distance[i][j] = Math.min(distance[i][j], passage.movementCost);
      if (passage.bidirectional) distance[j][i] = Math.min(distance[j][i], passage.movementCost);
    }
    for (let k = 0; k < ids.length; k++) for (let i = 0; i < ids.length; i++) for (let j = 0; j < ids.length; j++) distance[i][j] = Math.min(distance[i][j], distance[i][k] + distance[k][j]);
    for (let i = 0; i < ids.length; i++) for (let j = 0; j < ids.length; j++) {
      const route = api.planWarRouteV6(ids[i], ids[j], pc, [], context, cargo);
      assert.equal(route?.cost ?? Infinity, distance[i][j], `${ids[i]} -> ${ids[j]} (${pc} PC, ${cargo})`);
    }
  }
});

test("a result credits present members only, caps XP and is idempotent across modes and operation IDs", () => {
  const team = api.createWarTeamV6("W3-U01");
  team.members[0].xp = 98; team.members[1].status = "wounded";
  const before = copy(team), result = api.applyWarResultV6(team, receipt(team, { objective: "campaign" }));
  assert.equal(result.changed, true);
  assert.deepEqual(result.state.members.map(member => member.xp), [100, 0]);
  assert.equal(result.state.fatigue, 20);
  assert.deepEqual(team, before);
  const repeat = api.applyWarResultV6(result.state, receipt(team, { mode: "hero" }));
  assert.equal(repeat.changed, false); assert.strictEqual(repeat.state, result.state);
  const changedOperation = api.applyWarResultV6(result.state, receipt(team, { operationId: "another-operation", mode: "strategic" }));
  assert.equal(changedOperation.changed, false); assert.strictEqual(changedOperation.state, result.state);
  const newResultSameOperation = api.applyWarResultV6(result.state, receipt(team, { resultId: "another-result" }));
  assert.equal(newResultSameOperation.changed, false);
});

test("invalid participants, unfinished results, campaign context and corrupted XP cannot grant a result", () => {
  const team = api.createWarTeamV6("W3-U01");
  for (const changes of [{ final: false }, { participantIds: [] }, { participantIds: ["someone-else"] }, { participantIds: [team.members[0].id, team.members[0].id] }, { operationId: "" }]) assert.equal(api.applyWarResultV6(team, receipt(team, changes)).accepted, false);
  assert.equal(api.applyWarResultV6({ ...team, context: "campaign" }, receipt(team)).accepted, false);
  assert.equal(api.applyWarResultV6({ ...team, members: [{ ...team.members[0], xp: NaN }, team.members[1]] }, receipt(team)).accepted, false);
});

test("death and a zero-XP replacement preserve the locked specialization but never copy mastery", () => {
  const team = api.createWarTeamV6("W3-U01");
  team.members = team.members.map(member => ({ ...member, xp: 60 }));
  const selected = api.selectWarSpecializationV6(team, "A");
  assert.equal(selected.specialization, "A");
  assert.strictEqual(api.selectWarSpecializationV6(selected, "B"), selected);
  const death = { ...selected, members: [{ ...selected.members[0], status: "dead", xp: 100 }, selected.members[1]] };
  assert.equal(api.warTeamExperienceV6(death), 60);
  const replacement = { ...death, members: [...death.members, { id: "replacement", name: "New voluntary recruit", xp: 0, status: "fit", assignmentId: team.id }] };
  assert.equal(api.warTeamExperienceV6(replacement), 30);
  assert.equal(replacement.specialization, "A");
  assert.equal(api.warTeamTierV6(api.warTeamExperienceV6(replacement)), "Novice");
  assert.strictEqual(api.selectWarSpecializationV6(replacement, "B"), replacement);
  assert.equal(api.selectWarSpecializationV6(api.createWarTeamV6("W3-U01"), "A").specialization, null);
});
