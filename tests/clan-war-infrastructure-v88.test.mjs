import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const bundled = await build({ stdin: { contents: "export * from './app/game/systems/clanWarWorksV6'; export * from './app/game/systems/clanWarBibleV6';", resolveDir: fileURLToPath(new URL("../", import.meta.url)) }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`), rules = api.DEFAULT_WAR_RULES_V6;
const fresh = unit => api.createWarWorksV6(120, unit, rules, "local");
const group = (state, unit) => state.teams.find(item => item.team.unitId === unit);
function act(state, action, context = rules) {
  const before = structuredClone(state), result = api.applyWarWorksV6(state, action, context);
  assert.deepEqual(state, before); assert(result.accepted, result.message);
  assert.equal(result.state.ravStock, result.state.lots.reduce((sum, lot) => sum + lot.rav, 0));
  assert.equal(result.state.ravStock, result.state.startingRav - result.state.accounts.recruitmentReserved - result.state.accounts.kitsReserved - result.state.accounts.upkeepConsumed);
  assert(api.exportWarWorksV87(result.state, context), "Every real transition remains a valid checkpoint");
  return result.state;
}
function denied(state, action) { const result = api.applyWarWorksV6(state, action); assert(!result.accepted, result.message); assert.strictEqual(result.state, state); }
function travel(state, teamId, destinationId) {
  state = act(state, { kind: "plan", teamId, destinationId });
  while (state.teams.find(item => item.team.id === teamId).route) state = act(state, { kind: "advance", teamId });
  assert.equal(state.teams.find(item => item.team.id === teamId).territoryId, destinationId); return state;
}
function install(state, teamId, structureId, territoryId, passageId) {
  state = act(state, { kind: "reserve-kit", structureId, territoryId, passageId }); const workId = state.works.at(-1).id;
  state = act(state, { kind: "load", teamId, workId }); state = act(state, { kind: "unload", teamId, workId });
  const def = api.warWorksDefinitionsV6().find(item => item.id === structureId);
  for (let n = 0; n < def.delayTurns; n++) state = act(state, { kind: "work", teamId, workId });
  return { state, workId };
}
function relay({ toured = true } = {}) {
  let state = fresh("W3-U28"), messengerId = state.teams[0].team.id;
  state = act(state, { kind: "observe", teamId: messengerId });
  state = act(state, { kind: "reserve-kit", structureId: "W3-S12", territoryId: "W3-K01", passageId: "W3-L01" }); const workId = state.works[0].id;
  if (toured) { state = travel(state, messengerId, "W3-K02"); state = act(state, { kind: "observe", teamId: messengerId }); state = travel(state, messengerId, "W3-K01"); }
  state = act(state, { kind: "load", teamId: messengerId, workId }); state = act(state, { kind: "unload", teamId: messengerId, workId });
  state = act(state, { kind: "work", teamId: messengerId, workId }); state = act(state, { kind: "work", teamId: messengerId, workId });
  state = act(state, { kind: "recruit", unitId: "W3-U19" }); state = act(state, { kind: "wait" }); state = act(state, { kind: "wait" });
  const recipientId = group(state, "W3-U19").team.id; state = travel(state, recipientId, "W3-K02");
  return { state, messengerId, recipientId, workId };
}
function hoist() {
  let state = fresh("W3-U20"), artisanId = state.teams[0].team.id;
  state = act(state, { kind: "observe", teamId: artisanId }); state = travel(state, artisanId, "W3-K07");
  state = act(state, { kind: "observe", teamId: artisanId }); state = travel(state, artisanId, "W3-K01");
  const installed = install(state, artisanId, "W3-S17", "W3-K01", "W3-L31"); state = installed.state;
  state = act(state, { kind: "reserve-kit", structureId: "W3-S02", territoryId: "W3-K07" });
  return { state, artisanId, workId: installed.workId, kitWorkId: state.works.at(-1).id };
}

test("S12/S17 source rows bind prices, true operators and effect constraints; unsupported care/energy remains unavailable", () => {
  const defs = api.warWorksDefinitionsV6();
  for (const [id, row, cost, upkeep, delay, unitId] of [["W3-S12", 17, 12, 2, 2, "W3-U28"], ["W3-S17", 22, 16, 2, 3, "W3-U20"]]) {
    const def = defs.find(item => item.id === id); assert.deepEqual([def.sourceRow, def.costRav, def.upkeepRav, def.delayTurns, def.operatorUnitId], [row, cost, upkeep, delay, unitId]);
    assert(def.sourceCells.includes(`H${row}`)); assert(def.sourceCells.includes(`I${row}`));
  }
  assert.deepEqual([rules.units.find(unit => unit.id === "W3-U28").fullMembers, rules.units.find(unit => unit.id === "W3-U20").fullMembers], [2, 2]);
  assert(!defs.some(def => ["W3-S11", "W3-S13"].includes(def.id)));
  const broken = structuredClone(rules); broken.entries.find(entry => entry.id === "W3-S17").fields.find(field => field.column === "I").value = "missing operators";
  assert(!api.warWorksDefinitionsV6(broken).some(def => def.id === "W3-S17"));
});

test("relay construction is real, and a recipient gets dated personally observed intel without moving people, stocks or XP", () => {
  const scenario = relay(), before = scenario.state, identities = structuredClone(before.teams.map(item => item.team));
  const state = act(before, { kind: "relay-intel", teamId: scenario.messengerId, workId: scenario.workId, recipientTeamId: scenario.recipientId });
  assert.equal(state.turn, 11); assert.equal(state.ravStock, 82); assert.deepEqual(state.accounts, { recruitmentReserved: 10, kitsReserved: 12, upkeepConsumed: 16 });
  assert.deepEqual(state.teams.map(item => item.team), identities); assert.deepEqual(state.teams.map(item => item.territoryId), ["W3-K01", "W3-K02"]);
  const receipt = state.infrastructure.relayReceipts[0]; assert.deepEqual(receipt.observations, before.observed);
  assert.deepEqual(receipt.observations.map(item => item.turn), [2, 4]); assert.equal(receipt.turn, 11);
  assert.deepEqual(state.observed, before.observed); assert.equal(receipt.recipientTeamId, scenario.recipientId); assert.equal(receipt.passageId, "W3-L01");
  assert.deepEqual(group(state, "W3-U28").team.members.map(member => member.xp), [8, 8]); assert.deepEqual(group(state, "W3-U19").team.members.map(member => member.xp), [0, 0, 0]);
  const repeated = api.applyWarWorksV6(state, { kind: "relay-intel", teamId: scenario.messengerId, workId: scenario.workId, recipientTeamId: scenario.recipientId }); assert(!repeated.changed); assert.strictEqual(repeated.state, state);
});

test("untraversed signal, absent recipient, released operator or closed link refuses with no time, cost or fresh visibility", () => {
  const scenario = relay({ toured: false }); denied(scenario.state, { kind: "relay-intel", teamId: scenario.messengerId, workId: scenario.workId, recipientTeamId: scenario.recipientId });
  const ready = relay(); let state = act(ready.state, { kind: "close-passages", ids: ["W3-L01"] });
  denied(state, { kind: "relay-intel", teamId: ready.messengerId, workId: ready.workId, recipientTeamId: ready.recipientId });
  state = act(state, { kind: "close-passages", ids: [] }); state = travel(state, ready.recipientId, "W3-K01");
  denied(state, { kind: "relay-intel", teamId: ready.messengerId, workId: ready.workId, recipientTeamId: ready.recipientId });
  state = travel(state, ready.recipientId, "W3-K02"); state = act(state, { kind: "release", teamId: ready.messengerId });
  denied(state, { kind: "relay-intel", teamId: ready.messengerId, workId: ready.workId, recipientTeamId: ready.recipientId });
});

test("hoist demands two recognized levels and a genuine relief link; three worked turns commission it without XP", () => {
  let state = fresh("W3-U20"), teamId = state.teams[0].team.id; state = act(state, { kind: "observe", teamId });
  denied(state, { kind: "reserve-kit", structureId: "W3-S17", territoryId: "W3-K01", passageId: "W3-L01" });
  denied(state, { kind: "reserve-kit", structureId: "W3-S17", territoryId: "W3-K01", passageId: "W3-L31" });
  const scenario = hoist(), work = scenario.state.works.find(item => item.id === scenario.workId);
  assert.equal(work.phase, "ready"); assert.equal(work.workedTurns, 3); assert.equal(work.costRav, 16); assert(api.warWorkOccupiedV6(scenario.state, work));
  assert.deepEqual(group(scenario.state, "W3-U20").team.members.map(member => member.xp), [8, 8]);
});

test("occupied hoist moves one existing kit only, debits local upkeep once and preserves its planned site and all people", () => {
  const scenario = hoist(), before = scenario.state, kitBefore = structuredClone(before.works.find(item => item.id === scenario.kitWorkId));
  const state = act(before, { kind: "lift-kit", teamId: scenario.artisanId, workId: scenario.workId, kitWorkId: scenario.kitWorkId });
  assert.equal(state.turn, 9); assert.equal(state.ravStock, 82); assert.deepEqual(state.accounts, { recruitmentReserved: 0, kitsReserved: 24, upkeepConsumed: 14 });
  assert.deepEqual(state.teams, before.teams); assert.deepEqual(state.works.find(item => item.id === scenario.kitWorkId), kitBefore);
  assert.equal(api.warKitSiteV88(state, kitBefore), "W3-K07"); assert.equal(state.works.length, 2); assert.equal(state.infrastructure.lifts.length, 1);
  assert.deepEqual(state.infrastructure.lifts[0].memberIds, before.teams[0].team.members.map(member => member.id));
  denied(state, { kind: "load", teamId: scenario.artisanId, workId: scenario.kitWorkId });
  denied(state, { kind: "lift-kit", teamId: scenario.artisanId, workId: scenario.workId, kitWorkId: scenario.kitWorkId });
});

test("lifting interruption and missing operator preserve ground cargo, while an actual arriving recipient can collect and deliver it", () => {
  const scenario = hoist(); let state = act(scenario.state, { kind: "close-passages", ids: ["W3-L31"] });
  denied(state, { kind: "lift-kit", teamId: scenario.artisanId, workId: scenario.workId, kitWorkId: scenario.kitWorkId });
  state = act(state, { kind: "close-passages", ids: [] }); state = act(state, { kind: "release", teamId: scenario.artisanId });
  denied(state, { kind: "lift-kit", teamId: scenario.artisanId, workId: scenario.workId, kitWorkId: scenario.kitWorkId });
  state = act(state, { kind: "assign", teamId: scenario.artisanId, workId: scenario.workId });
  state = act(state, { kind: "lift-kit", teamId: scenario.artisanId, workId: scenario.workId, kitWorkId: scenario.kitWorkId });
  state = act(state, { kind: "recruit", unitId: "W3-U17" }); state = act(state, { kind: "wait" }); state = act(state, { kind: "wait" });
  const recipientId = group(state, "W3-U17").team.id; denied(state, { kind: "load", teamId: recipientId, workId: scenario.kitWorkId });
  state = travel(state, recipientId, "W3-K07"); state = act(state, { kind: "load", teamId: recipientId, workId: scenario.kitWorkId });
  assert.equal(state.infrastructure.groundKits.length, 0); assert.equal(state.infrastructure.lifts.length, 1);
  state = act(state, { kind: "unload", teamId: recipientId, workId: scenario.kitWorkId }); assert.equal(state.works.find(item => item.id === scenario.kitWorkId).phase, "delivered");
  assert.equal(group(state, "W3-U20").territoryId, "W3-K01"); assert.equal(group(state, "W3-U17").territoryId, "W3-K07");
});

test("a dropped real kit stays put after its carrier leaves, and cannot be loaded simultaneously or auto-installed", () => {
  const scenario = hoist(); let state = act(scenario.state, { kind: "release", teamId: scenario.artisanId });
  state = act(state, { kind: "load", teamId: scenario.artisanId, workId: scenario.kitWorkId }); state = travel(state, scenario.artisanId, "W3-K02");
  state = act(state, { kind: "put-down-kit", teamId: scenario.artisanId, workId: scenario.kitWorkId }); state = travel(state, scenario.artisanId, "W3-K01");
  assert.equal(api.warKitSiteV88(state, state.works.find(item => item.id === scenario.kitWorkId)), "W3-K02");
  denied(state, { kind: "load", teamId: scenario.artisanId, workId: scenario.kitWorkId }); assert.equal(state.works.find(item => item.id === scenario.kitWorkId).phase, "reserved");
});

test("depleted local upkeep stops an installed hoist or relay without moving cargo or producing intel", () => {
  const scenario = hoist(); let state = scenario.state;
  while (state.ravStock > 0) state = act(state, { kind: "wait" });
  const before = structuredClone(state); denied(state, { kind: "lift-kit", teamId: scenario.artisanId, workId: scenario.workId, kitWorkId: scenario.kitWorkId }); assert.deepEqual(state, before);
  const noPower = relay(); let signal = noPower.state; while (signal.ravStock > 0) signal = act(signal, { kind: "wait" });
  denied(signal, { kind: "relay-intel", teamId: noPower.messengerId, workId: noPower.workId, recipientTeamId: noPower.recipientId });
});

test("a remote occupied hoist cannot draw the existing origin stock across a link", () => {
  let state = fresh("W3-U20"), artisanId = state.teams[0].team.id;
  state = act(state, { kind: "observe", teamId: artisanId }); state = travel(state, artisanId, "W3-K07"); state = act(state, { kind: "observe", teamId: artisanId });
  state = act(state, { kind: "reserve-kit", structureId: "W3-S17", territoryId: "W3-K07", passageId: "W3-L31" }); const workId = state.works[0].id;
  state = travel(state, artisanId, "W3-K01"); state = act(state, { kind: "load", teamId: artisanId, workId }); state = travel(state, artisanId, "W3-K07"); state = act(state, { kind: "unload", teamId: artisanId, workId });
  for (let n = 0; n < 3; n++) state = act(state, { kind: "work", teamId: artisanId, workId });
  state = act(state, { kind: "reserve-kit", structureId: "W3-S02", territoryId: "W3-K01" }); const kitWorkId = state.works[1].id;
  state = act(state, { kind: "release", teamId: artisanId }); state = travel(state, artisanId, "W3-K01"); state = act(state, { kind: "load", teamId: artisanId, workId: kitWorkId });
  state = travel(state, artisanId, "W3-K07"); state = act(state, { kind: "put-down-kit", teamId: artisanId, workId: kitWorkId }); state = act(state, { kind: "assign", teamId: artisanId, workId });
  assert(api.warWorksDepotV87(state) > 50); assert.equal(api.warKitSiteV88(state, state.works[1]), "W3-K07");
  denied(state, { kind: "lift-kit", teamId: artisanId, workId, kitWorkId }); assert.equal(state.infrastructure.lifts.length, 0);
});

test("optional extensions round-trip interrupted cargo and dated messages; older six-work sources/checkpoints keep their exact state", () => {
  const scenario = hoist(), moved = act(scenario.state, { kind: "lift-kit", teamId: scenario.artisanId, workId: scenario.workId, kitWorkId: scenario.kitWorkId });
  assert.deepEqual(api.importWarWorksV87(api.exportWarWorksV87(moved)).state, moved);
  const sent = relay(), delivered = act(sent.state, { kind: "relay-intel", teamId: sent.messengerId, workId: sent.workId, recipientTeamId: sent.recipientId });
  assert.deepEqual(api.importWarWorksV87(api.exportWarWorksV87(delivered)).state, delivered);
  const older = structuredClone(rules); older.entries = older.entries.filter(entry => !["W3-S12", "W3-S17", "W3-S01", "W3-S06", "W3-S08"].includes(entry.id)); assert.equal(api.warWorksDefinitionsV6(older).length, 6);
  const legacy = api.createWarWorksV6(120, "W3-U17", older, "local"); assert.equal("infrastructure" in legacy, false);
  assert.deepEqual(api.createWarWorksV6(120, "W3-U17", rules, "local"), legacy); assert.deepEqual(api.importWarWorksV87(api.exportWarWorksV87(legacy, older)).state, legacy);
  assert.equal(api.importWarWorksV87(api.exportWarWorksV87(moved), older).state, null);
  for (const field of ["save", "account", "campaign", "missionResults"]) assert.equal(field in moved, false);
});

test("checkpoint rejects forged lift identity, copied kit, wrong link, fresher invented intel and source drift", () => {
  const scenario = hoist(), state = act(scenario.state, { kind: "lift-kit", teamId: scenario.artisanId, workId: scenario.workId, kitWorkId: scenario.kitWorkId });
  const checkpoint = api.exportWarWorksV87(state);
  for (const corrupt of [file => file.exercise.infrastructure.lifts[0].memberIds[1] = file.exercise.infrastructure.lifts[0].memberIds[0],
    file => file.exercise.infrastructure.groundKits.push(structuredClone(file.exercise.infrastructure.groundKits[0])),
    file => file.exercise.infrastructure.lifts[0].passageId = "W3-L01", file => file.exercise.infrastructure.lifts[0].toId = "W3-K36",
    file => file.exercise.infrastructure.groundKits[0].territoryId = "W3-K36",
    file => file.exercise.infrastructure.campaign = {}]) {
    const file = JSON.parse(checkpoint); corrupt(file); assert.equal(api.importWarWorksV87(JSON.stringify(file)).state, null);
  }
  const signal = relay(), sent = act(signal.state, { kind: "relay-intel", teamId: signal.messengerId, workId: signal.workId, recipientTeamId: signal.recipientId });
  const fake = JSON.parse(api.exportWarWorksV87(sent)); fake.exercise.infrastructure.relayReceipts[0].observations[0].turn = sent.turn;
  assert.equal(api.importWarWorksV87(JSON.stringify(fake)).state, null);
  const changed = structuredClone(rules); changed.entries.find(entry => entry.id === "W3-S17").fields.find(field => field.column === "D").value += 1;
  assert.equal(api.importWarWorksV87(checkpoint, changed).state, null);
});
