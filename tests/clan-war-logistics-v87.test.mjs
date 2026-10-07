import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const bundled = await build({ stdin: { contents: "export * from './app/game/systems/clanWarWorksV6'; export * from './app/game/systems/clanWarBibleV6'; export {default as workbook} from './app/game/clanWarBibleV6Source.json';", resolveDir: fileURLToPath(new URL("../", import.meta.url)) }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`), rules = api.DEFAULT_WAR_RULES_V6;
const fresh = (unit = "W3-U19", rav = 120) => api.createWarWorksV6(rav, unit, rules, "local");
const teamId = state => state.teams[0].team.id;
function act(state, action) {
  const input = structuredClone(state), result = api.applyWarWorksV6(state, action);
  assert.deepEqual(state, input); assert(result.accepted, result.message);
  assert.equal(result.state.lots.reduce((sum, lot) => sum + lot.rav, 0), result.state.ravStock);
  assert.equal(result.state.startingRav - result.state.accounts.recruitmentReserved - result.state.accounts.kitsReserved - result.state.accounts.upkeepConsumed, result.state.ravStock);
  return result.state;
}
function denied(state, action) { const result = api.applyWarWorksV6(state, action); assert(!result.accepted); assert.strictEqual(result.state, state); }
function travel(state, destinationId) {
  state = act(state, { kind: "plan", teamId: teamId(state), destinationId });
  for (let n = 0; state.teams[0].route && n < 100; n++) state = act(state, { kind: "advance", teamId: teamId(state) });
  assert.equal(state.teams[0].territoryId, destinationId); return state;
}
function completed({ site = "W3-K02", structure = "W3-S03", unit = "W3-U19", rav = 120 } = {}) {
  let state = fresh(unit, rav);
  if (site !== state.originId) state = travel(state, site);
  state = act(state, { kind: "observe", teamId: teamId(state) });
  state = act(state, { kind: "reserve-kit", structureId: structure, territoryId: site });
  const workId = state.works[0].id;
  if (site !== state.originId) state = travel(state, state.originId);
  state = act(state, { kind: "load", teamId: teamId(state), workId });
  if (site !== state.originId) state = travel(state, site);
  state = act(state, { kind: "unload", teamId: teamId(state), workId });
  state = act(state, { kind: "work", teamId: teamId(state), workId });
  state = act(state, { kind: "work", teamId: teamId(state), workId });
  return { state, workId };
}
function supplied(rav = 120) {
  let { state, workId } = completed({ rav });
  state = act(state, { kind: "release", teamId: teamId(state) });
  state = travel(state, state.originId);
  state = act(state, { kind: "load-rav", teamId: teamId(state), rav: 20 });
  state = travel(state, "W3-K02");
  state = act(state, { kind: "deposit-rav", teamId: teamId(state), workId });
  return { state, workId };
}

test("cache and workshop use exact V6 cells and preserve the stated twenty-RAV cache envelope", () => {
  assert.equal(rules.metadata.sha256, "87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183");
  const defs = api.warWorksDefinitionsV6();
  const cache = defs.find(item => item.id === "W3-S03"), workshop = defs.find(item => item.id === "W3-S04");
  assert.deepEqual([cache.costRav, cache.upkeepRav, cache.delayTurns, cache.operatorUnitId, cache.capacityRav, cache.sourceRow], [10, 1, 2, "W3-U19", 20, 8]);
  assert.deepEqual([workshop.costRav, workshop.upkeepRav, workshop.delayTurns, workshop.operatorUnitId, workshop.sourceRow], [12, 2, 2, "W3-U20", 9]);
  assert(cache.sourceCells.includes("H8")); assert(workshop.sourceCells.includes("D9"));
});

test("remote teams are rationed even while a rich departure depot exists; only touched teams receive the source factor", () => {
  let state = fresh(); state = act(state, { kind: "recruit", unitId: "W3-U20" });
  for (let n = 0; n < 3; n++) state = act(state, { kind: "wait" });
  assert.equal(state.teams.length, 2); const other = state.teams[1].team.id;
  state = travel(state, "W3-K02");
  assert(api.warWorksDepotV87(state) > 80);
  assert.equal(api.estimateWarWorksTeamV6(state, teamId(state)).supplyFactor, 0.7);
  assert.equal(api.estimateWarWorksTeamV6(state, other).supplyFactor, 1);
  assert.equal(state.lastTeamSupply.find(item => item.teamId === teamId(state)).paid, 0);
  assert.equal(state.lastTeamSupply.find(item => item.teamId === other).paid, 2);
});

test("loading debits only existing departure RAV, has no campaign gain, and refuses inappropriate or busy porters", () => {
  let state = fresh(); const identities = structuredClone(state.teams[0].team);
  for (const rav of [-1, 0, 0.5, 21, Infinity]) denied(state, { kind: "load-rav", teamId: teamId(state), rav });
  state = act(state, { kind: "load-rav", teamId: teamId(state), rav: 20 });
  assert.equal(api.warWorksDepotV87(state), 100); assert.equal(state.ravStock, 120); assert.equal(api.warWorksCarriedRavV87(state, teamId(state)), 20);
  assert.deepEqual(state.teams[0].team, identities); denied(state, { kind: "load-rav", teamId: teamId(state), rav: 1 });
  const wrong = fresh("W3-U17"); denied(wrong, { kind: "load-rav", teamId: teamId(wrong), rav: 10 });
  const injured = fresh(); injured.teams[0].team.members[0].status = "wounded"; denied(injured, { kind: "load-rav", teamId: teamId(injured), rav: 10 });
});

test("closed or RAV-forbidden links cannot move a loaded lot; actual steps and upkeep follow the same identified porter", () => {
  let state = act(fresh(), { kind: "load-rav", teamId: "v6-works-team-1", rav: 20 });
  state = act(state, { kind: "plan", teamId: teamId(state), destinationId: "W3-K02" });
  const link = state.teams[0].route.passageIds[0], balance = state.ravStock;
  state = act(state, { kind: "close-passages", ids: [link] }); denied(state, { kind: "advance", teamId: teamId(state) });
  assert.equal(state.ravStock, balance); assert.equal(api.warWorksCarriedRavV87(state, teamId(state)), 20);
  state = act(state, { kind: "close-passages", ids: [] }); state = act(state, { kind: "advance", teamId: teamId(state) });
  assert.equal(api.warWorksCarriedRavV87(state, teamId(state)), 18); assert.equal(api.warWorksDepotV87(state), 100);
  assert.deepEqual(state.lots.find(item => item.location === "carrier").steps, [{ passageId: link, fromId: "W3-K01", toId: "W3-K02", turn: 2 }]);
});

test("delivery needs the physical cache and transfers the surviving lot once, with travel evidence preserved", () => {
  let { state, workId } = completed();
  state = act(state, { kind: "release", teamId: teamId(state) }); state = travel(state, state.originId);
  state = act(state, { kind: "load-rav", teamId: teamId(state), rav: 20 });
  denied(state, { kind: "deposit-rav", teamId: teamId(state), workId });
  state = travel(state, "W3-K02"); const before = state.ravStock;
  state = act(state, { kind: "deposit-rav", teamId: teamId(state), workId });
  assert.equal(state.ravStock, before); assert.equal(api.warWorksCacheRavV87(state, workId), 18); assert.equal(api.warWorksCarriedRavV87(state, teamId(state)), 0);
  const delivery = state.transfers.find(item => item.purpose === "deposit"); assert.equal(delivery.rav, 18); assert.equal(delivery.steps.at(-1).toId, "W3-K02");
  const repeated = api.applyWarWorksV6(state, { kind: "deposit-rav", teamId: teamId(state), workId }); assert(repeated.accepted); assert(!repeated.changed); assert.strictEqual(repeated.state, state);
});

test("full caches retain surplus on their porter; cache withdrawal and actual return conserve every ration", () => {
  let { state, workId } = completed({ site: "W3-K01" }); state = act(state, { kind: "release", teamId: teamId(state) });
  state = act(state, { kind: "load-rav", teamId: teamId(state), rav: 20 }); state = act(state, { kind: "deposit-rav", teamId: teamId(state), workId });
  state = act(state, { kind: "load-rav", teamId: teamId(state), rav: 5 }); const total = state.ravStock;
  const full = api.applyWarWorksV6(state, { kind: "deposit-rav", teamId: teamId(state), workId }); assert(!full.changed); assert.strictEqual(full.state, state);
  assert.equal(api.warWorksCacheRavV87(state, workId), 20); assert.equal(api.warWorksCarriedRavV87(state, teamId(state)), 5);
  denied(state, { kind: "withdraw-rav", teamId: teamId(state), workId, rav: 2 });
  state = act(state, { kind: "return-rav", teamId: teamId(state) });
  state = act(state, { kind: "withdraw-rav", teamId: teamId(state), workId, rav: 7 });
  assert.equal(api.warWorksCacheRavV87(state, workId), 13); assert.equal(api.warWorksCarriedRavV87(state, teamId(state)), 7);
  state = act(state, { kind: "return-rav", teamId: teamId(state) }); assert.equal(state.ravStock, total);
  const repeated = api.applyWarWorksV6(state, { kind: "return-rav", teamId: teamId(state) }); assert(!repeated.changed); assert.strictEqual(repeated.state, state);
});

test("an isolated cache pays its actual team and structure once, depletes locally, and never fabricates income or deaths", () => {
  let { state, workId } = supplied(), depot = api.warWorksDepotV87(state), members = structuredClone(state.teams[0].team.members);
  state = act(state, { kind: "assign", teamId: teamId(state), workId });
  state = act(state, { kind: "close-passages", ids: rules.passages.filter(link => link.fromId === "W3-K02" || link.toId === "W3-K02").map(link => link.id) });
  assert.equal(api.warWorksSupplyPreviewV87(state)[0].paid, 2);
  state = act(state, { kind: "wait" }); assert.equal(api.warWorksCacheRavV87(state, workId), 15); assert.equal(state.lastTurnNeed, 3); assert.equal(state.lastTurnPaid, 3);
  for (let n = 0; n < 6; n++) state = act(state, { kind: "wait" });
  assert.equal(api.warWorksCacheRavV87(state, workId), 0); assert.equal(api.warWorksDepotV87(state), depot); assert.equal(state.ravStock, depot);
  assert.equal(api.estimateWarWorksTeamV6(state, teamId(state)).supplyFactor, 0.7); assert.deepEqual(state.teams[0].team.members, members);
});

test("a remote lot does not pay recruitment or kit reservation at the departure depot", () => {
  let { state, workId } = completed({ site: "W3-K01" }); state = act(state, { kind: "release", teamId: teamId(state) });
  for (let n = 0; n < 5; n++) state = act(state, { kind: "wait" });
  const load = Math.min(20, api.warWorksDepotV87(state)); state = act(state, { kind: "load-rav", teamId: teamId(state), rav: load });
  state = act(state, { kind: "deposit-rav", teamId: teamId(state), workId });
  while (api.warWorksDepotV87(state) >= 13) state = act(state, { kind: "wait" });
  assert(state.ravStock >= 13); assert(api.warWorksDepotV87(state) < 13); denied(state, { kind: "recruit", unitId: "W3-U20" });
});

test("workshop artisans retain their exact three-turn formation and commissioning cannot repair hypothetical closed links", () => {
  let state = fresh(); state = act(state, { kind: "recruit", unitId: "W3-U20" });
  assert.equal(state.accounts.recruitmentReserved, 13); assert.equal(state.recruits[0].readyTurn, 4);
  state = act(state, { kind: "wait" }); state = act(state, { kind: "wait" }); assert.equal(state.teams.length, 1);
  state = act(state, { kind: "wait" }); assert.equal(state.teams.length, 2); assert.equal(state.teams[1].team.members.length, 2);
  let setup = completed({ structure: "W3-S04", unit: "W3-U20" });
  setup.state = act(setup.state, { kind: "close-passages", ids: ["W3-L01"] });
  assert.equal(setup.state.works[0].phase, "ready"); assert.equal(setup.state.works[0].workedTurns, 2);
  assert.deepEqual(setup.state.closedPassageIds, ["W3-L01"]); assert.deepEqual(setup.state.teams[0].team.members.map(member => member.xp), [4, 4]);
  assert.equal("repairs" in setup.state, false); assert.equal("controllers" in setup.state, false);
});

test("checkpoint round trip keeps local identities, physical stocks, routes, steps, closures and interrupted work without a campaign field", () => {
  let { state, workId } = supplied(80);
  assert.equal(state.turn, 9); assert.equal(state.ravStock, 64); assert.equal(api.warWorksDepotV87(state), 46); assert.equal(api.warWorksCacheRavV87(state, workId), 18);
  state = act(state, { kind: "close-passages", ids: ["W3-L01"] });
  const checkpoint = api.exportWarWorksV87(state); assert(checkpoint);
  const result = api.importWarWorksV87(checkpoint); assert.deepEqual(result.state, state);
  assert.equal(result.state.version, 2); assert.equal("save" in result.state, false);
  const original = act(state, { kind: "wait" }), resumed = act(result.state, { kind: "wait" }); assert.deepEqual(resumed, original);
  assert.equal(resumed.ravStock, 61); assert.equal(api.warWorksCacheRavV87(resumed, workId), 15);
  let build = fresh(); build = act(build, { kind: "observe", teamId: teamId(build) });
  build = act(build, { kind: "reserve-kit", structureId: "W3-S03", territoryId: build.originId });
  const buildingId = build.works[0].id;
  build = act(build, { kind: "load", teamId: teamId(build), workId: buildingId });
  build = act(build, { kind: "unload", teamId: teamId(build), workId: buildingId });
  build = act(build, { kind: "work", teamId: teamId(build), workId: buildingId });
  const resumedBuild = api.importWarWorksV87(api.exportWarWorksV87(build)).state;
  assert.deepEqual(resumedBuild, build); assert.equal(resumedBuild.works[0].phase, "building"); assert.equal(resumedBuild.works[0].workedTurns, 1);
  assert.equal(act(resumedBuild, { kind: "work", teamId: teamId(resumedBuild), workId: buildingId }).works[0].phase, "ready");
  let blocked = act(fresh(), { kind: "load-rav", teamId: "v6-works-team-1", rav: 20 });
  blocked = act(blocked, { kind: "plan", teamId: teamId(blocked), destinationId: "W3-K02" });
  blocked = act(blocked, { kind: "close-passages", ids: [blocked.teams[0].route.passageIds[0]] });
  const resumedBlocked = api.importWarWorksV87(api.exportWarWorksV87(blocked)).state;
  assert.deepEqual(resumedBlocked, blocked); denied(resumedBlocked, { kind: "advance", teamId: teamId(resumedBlocked) });
});

test("imports reject alien sources, future versions, duplicate identities and edited transfer totals instead of crediting stocks", () => {
  const { state } = supplied(), original = JSON.parse(api.exportWarWorksV87(state));
  const edits = [file => file.version = 99, file => file.exercise.version = 1, file => file.exercise.context = "campaign",
    file => file.exercise.sourceSha = "foreign", file => file.exercise.lots[1].rav++, file => file.exercise.save = { saveVersion: 11 },
    file => file.exercise.nextIdentity = 2, file => file.exercise.reports = [null],
    file => file.exercise.teams[0].route = { cost: 1 }, file => file.exercise.teams[0].team.members[0].name = { unexpected: true },
    file => file.exercise.teams[0].team.resultReceipts = null,
    file => file.exercise.lots.push(structuredClone(file.exercise.lots[1])), file => file.exercise.transfers.push(structuredClone(file.exercise.transfers[0])),
    file => file.exercise.teams[0].team.members[1].id = file.exercise.teams[0].team.members[0].id,
    file => file.exercise.transfers[0].rav++];
  for (const edit of edits) { const copy = structuredClone(original); edit(copy); assert.equal(api.importWarWorksV87(JSON.stringify(copy)).state, null); }
  assert.equal(api.importWarWorksV87("{bad").state, null); assert.equal(api.importWarWorksV87('{"saveVersion":11}').state, null);
});

test("unavailable cache source capacity fails closed and changed local construction price cannot use a foreign checkpoint", () => {
  const raw = structuredClone(api.workbook), cache = raw.entries.find(entry => entry.id === "W3-S03" && entry.sheet === "Structures de guerre");
  cache.fields.find(field => field.column === "H").value = "Conserve un stock non chiffré.";
  assert.equal(api.createWarWorksV6(80, "W3-U19", api.createWarRulesV6(raw), "local"), null);
  cache.fields.find(field => field.column === "H").value = "Conserve vingt RAV identifiées et fournit le point final d’une route.";
  cache.fields.find(field => field.column === "D").value = 11;
  const changedRules = api.createWarRulesV6(raw), file = api.exportWarWorksV87(fresh());
  assert.equal(api.importWarWorksV87(file, changedRules).state, null);
});
