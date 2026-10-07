import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const bundled = await build({ stdin: { contents: "export * from './app/game/systems/clanWarWorksV6'; export * from './app/game/systems/clanWarBibleV6';", resolveDir: fileURLToPath(new URL("../", import.meta.url)) }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`), rules = api.DEFAULT_WAR_RULES_V6;
const fresh = (unit = "W3-U17") => api.createWarWorksV6(120, unit, rules, "local");
const team = (state, unit) => state.teams.find(group => group.team.unitId === unit);
function act(state, action) {
  const before = structuredClone(state), result = api.applyWarWorksV6(state, action);
  assert.deepEqual(state, before); assert(result.accepted, result.message);
  assert.equal(result.state.lots.reduce((sum, lot) => sum + lot.rav, 0), result.state.ravStock);
  assert.equal(result.state.ravStock, result.state.startingRav - result.state.accounts.recruitmentReserved - result.state.accounts.kitsReserved - result.state.accounts.upkeepConsumed);
  assert(api.exportWarWorksV87(result.state), "Every transition must remain a valid checkpoint");
  return result.state;
}
function denied(state, action) { const result = api.applyWarWorksV6(state, action); assert(!result.accepted, result.message); assert.strictEqual(result.state, state); }
function travel(state, teamId, destinationId) {
  state = act(state, { kind: "plan", teamId, destinationId });
  for (let n = 0; state.teams.find(group => group.team.id === teamId).route && n < 100; n++) state = act(state, { kind: "advance", teamId });
  assert.equal(state.teams.find(group => group.team.id === teamId).territoryId, destinationId); return state;
}
function depot(site = "W3-K01") {
  let state = fresh(), porterId = state.teams[0].team.id;
  if (site !== state.originId) state = travel(state, porterId, site);
  state = act(state, { kind: "observe", teamId: porterId });
  state = act(state, { kind: "reserve-kit", structureId: "W3-S16", territoryId: site }); const workId = state.works[0].id;
  if (site !== state.originId) state = travel(state, porterId, state.originId);
  state = act(state, { kind: "load", teamId: porterId, workId });
  if (site !== state.originId) state = travel(state, porterId, site);
  state = act(state, { kind: "unload", teamId: porterId, workId });
  for (let n = 0; n < 3; n++) state = act(state, { kind: "work", teamId: porterId, workId });
  return { state, porterId, workId };
}
function ready({ secondPatient = false, guard = true } = {}) {
  let { state, porterId, workId } = depot(); state = act(state, { kind: "release", teamId: porterId });
  state = act(state, { kind: "recruit", unitId: "W3-U07" }); state = act(state, { kind: "recruit", unitId: "W3-U19" });
  state = act(state, { kind: "wait" }); state = act(state, { kind: "wait" });
  const originalId = team(state, "W3-U19").team.id, guardId = team(state, "W3-U07").team.id;
  state = travel(state, originalId, "W3-K02");
  const patientId = team(state, "W3-U19").team.members[0].id, otherId = team(state, "W3-U19").team.members[1].id;
  state = act(state, { kind: "declare-patient", teamId: originalId, memberId: patientId });
  if (secondPatient) state = act(state, { kind: "declare-patient", teamId: originalId, memberId: otherId });
  state = travel(state, originalId, "W3-K01");
  if (guard) state = act(state, { kind: "guard-route", teamId: guardId, passageId: "W3-L01" });
  state = travel(state, porterId, "W3-K02");
  const carrierId = team(state, "W3-U17").team.members[0].id;
  return { state, workId, porterId, originalId, patientId, otherId, guardId, carrierId };
}
const pickUp = scenario => act(scenario.state, { kind: "load-patient", teamId: scenario.porterId, memberId: scenario.patientId, carrierId: scenario.carrierId });

test("S16 and U17 use attested source costs while incomplete S11 care is neither constructed nor invented", () => {
  const def = api.warWorksDefinitionsV6().find(item => item.id === "W3-S16"), unit = rules.units.find(item => item.id === "W3-U17");
  assert.equal(rules.metadata.sha256, "87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183");
  assert.deepEqual([def.costRav, def.upkeepRav, def.delayTurns, def.operatorUnitId, def.sourceRow], [14, 2, 3, "W3-U17", 21]);
  assert.deepEqual([unit.fullMembers, unit.commandPoints, unit.recruitmentRav, unit.upkeepRav, unit.delayTurns], [3, 3, 12, 2, 2]);
  assert(def.sourceCells.includes("I21")); assert(api.warExtractionAvailableV88());
  assert(!api.warWorksDefinitionsV6().some(item => item.id === "W3-S11")); denied(fresh(), { kind: "recruit", unitId: "W3-U18" });
  const missing = structuredClone(rules); missing.entries = missing.entries.filter(entry => entry.id !== "W3-S11"); assert(!api.warExtractionAvailableV88(missing));
  const initial = api.createWarWorksV6(120, "W3-U17", rules, "front"); denied(initial, { kind: "declare-patient", teamId: initial.teams[0].team.id, memberId: initial.teams[0].team.members[0].id });
});

test("S16 requires reconnaissance, real kit delivery, U17 and three worked turns; local upkeep is exact and never draws a remote depot", () => {
  let state = fresh(), porterId = state.teams[0].team.id;
  denied(state, { kind: "reserve-kit", structureId: "W3-S16", territoryId: "W3-K01" });
  state = act(state, { kind: "observe", teamId: porterId }); state = act(state, { kind: "reserve-kit", structureId: "W3-S16", territoryId: "W3-K01" });
  const workId = state.works[0].id; assert.equal(state.accounts.kitsReserved, 14);
  const duplicate = api.applyWarWorksV6(state, { kind: "reserve-kit", structureId: "W3-S16", territoryId: "W3-K01" }); assert(!duplicate.changed); assert.strictEqual(duplicate.state, state);
  denied(state, { kind: "work", teamId: porterId, workId }); state = act(state, { kind: "wait" }); assert.equal(state.works[0].workedTurns, 0);
  state = act(state, { kind: "load", teamId: porterId, workId }); state = act(state, { kind: "unload", teamId: porterId, workId });
  for (let n = 0; n < 2; n++) state = act(state, { kind: "work", teamId: porterId, workId }); assert.equal(state.works[0].phase, "building");
  state = act(state, { kind: "work", teamId: porterId, workId }); assert.equal(state.works[0].phase, "ready"); assert(api.warWorkOccupiedV6(state, state.works[0]));
  const stock = state.ravStock; state = act(state, { kind: "wait" }); assert.equal(state.ravStock, stock - 4); assert.equal(state.lastTurnNeed, 4); assert.equal(state.lastTurnPaid, 4);
  let remote = depot("W3-K02").state; const remoteStock = remote.ravStock;
  remote = act(remote, { kind: "wait" }); assert.equal(remote.ravStock, remoteStock); assert.equal(remote.lastTurnNeed, 4); assert.equal(remote.lastTurnPaid, 0);
});

test("declared patients keep member identity, wound and individual site when their original team leaves; no death or copied roster is fabricated", () => {
  const scenario = ready({ secondPatient: true }), state = scenario.state;
  assert.equal(team(state, "W3-U19").territoryId, "W3-K01"); assert.deepEqual(state.extraction.patients.map(patient => patient.territoryId), ["W3-K02", "W3-K02"]);
  assert.deepEqual(team(state, "W3-U19").team.members.map(member => member.status), ["wounded", "wounded", "fit"]);
  assert.equal(state.teams.length, 3); assert.equal(state.extraction.patients.length, 2);
  const duplicate = api.applyWarWorksV6(state, { kind: "declare-patient", teamId: scenario.originalId, memberId: scenario.patientId }); assert(!duplicate.changed); assert.strictEqual(duplicate.state, state);
  const dead = fresh(); dead.teams[0].team.members[0].status = "dead"; denied(dead, { kind: "declare-patient", teamId: dead.teams[0].team.id, memberId: dead.teams[0].team.members[0].id });
});

test("pickup needs the identified fit U17 porter at the actual patient, forbids another patient and leaves XP/status unchanged", () => {
  const scenario = ready({ secondPatient: true }); const before = structuredClone(scenario.state.teams.map(group => group.team));
  denied(scenario.state, { kind: "load-patient", teamId: scenario.originalId, memberId: scenario.patientId, carrierId: scenario.carrierId });
  denied(scenario.state, { kind: "load-patient", teamId: scenario.porterId, memberId: scenario.patientId, carrierId: scenario.patientId });
  let state = pickUp(scenario); assert.deepEqual(state.teams.map(group => group.team), before);
  denied(state, { kind: "load-patient", teamId: scenario.porterId, memberId: scenario.otherId, carrierId: team(state, "W3-U17").team.members[1].id });
  denied(state, { kind: "observe", teamId: scenario.porterId }); denied(state, { kind: "assign", teamId: scenario.porterId, workId: scenario.workId });
  denied(state, { kind: "return-patient", teamId: scenario.porterId, memberId: scenario.patientId, workId: scenario.workId });
});

test("missing or released escort and closed passage preserve patient, porter, stocks and turn; each executed step records the real guard", () => {
  const scenario = ready({ guard: false }); let state = pickUp(scenario);
  state = act(state, { kind: "plan", teamId: scenario.porterId, destinationId: "W3-K01" }); denied(state, { kind: "advance", teamId: scenario.porterId });
  state = act(state, { kind: "guard-route", teamId: scenario.guardId, passageId: "W3-L01" });
  denied(state, { kind: "plan", teamId: scenario.guardId, destinationId: "W3-K02" });
  state = act(state, { kind: "close-passages", ids: ["W3-L01"] }); denied(state, { kind: "advance", teamId: scenario.porterId });
  state = act(state, { kind: "close-passages", ids: [] }); state = act(state, { kind: "release", teamId: scenario.guardId }); denied(state, { kind: "advance", teamId: scenario.porterId });
  state = act(state, { kind: "guard-route", teamId: scenario.guardId, passageId: "W3-L01" }); state = act(state, { kind: "advance", teamId: scenario.porterId });
  const patient = state.extraction.patients[0]; assert.equal(patient.territoryId, "W3-K01"); assert.equal(patient.arrival, null);
  assert.deepEqual(patient.steps.at(-1), { passageId: "W3-L01", fromId: "W3-K02", toId: "W3-K01", turn: state.turn, carrierId: scenario.carrierId, carrierTeamId: scenario.porterId, guardTeamId: scenario.guardId, guardTerritoryId: "W3-K01" });
});

test("arrival validates only a transported person at the commissioned S16, keeps wound/XP, and leaves stragglers in place without repeated credits", () => {
  const scenario = ready({ secondPatient: true }); let state = pickUp(scenario); state = travel(state, scenario.porterId, "W3-K01");
  const beforeTeams = structuredClone(state.teams.map(group => group.team)), beforeStock = state.ravStock, beforeReceipts = state.transfers.length;
  state = act(state, { kind: "return-patient", teamId: scenario.porterId, memberId: scenario.patientId, workId: scenario.workId });
  assert.equal(state.turn, 11); assert.equal(state.ravStock, 40); assert.deepEqual(state.accounts, { recruitmentReserved: 22, kitsReserved: 14, upkeepConsumed: 44 });
  assert.deepEqual(state.teams.map(group => group.team), beforeTeams); assert.equal(state.ravStock, beforeStock); assert.equal(state.transfers.length, beforeReceipts);
  assert.equal(state.extraction.patients[0].arrival.workId, scenario.workId); assert.equal(state.extraction.patients[0].carrierId, null);
  assert.equal(state.extraction.patients[1].territoryId, "W3-K02"); assert.equal(state.extraction.patients[1].arrival, null);
  assert(api.warWorkOccupiedV6(state, state.works[0])); assert.equal("save" in state, false); assert.equal("missionResults" in state, false);
  const repeated = api.applyWarWorksV6(state, { kind: "return-patient", teamId: scenario.porterId, memberId: scenario.patientId, workId: scenario.workId }); assert(!repeated.changed); assert.strictEqual(repeated.state, state);
});

test("putting a patient down never extracts them or makes them follow a departing porter; later pickup retains the same identity", () => {
  const scenario = ready(); let state = pickUp(scenario);
  state = act(state, { kind: "put-down-patient", teamId: scenario.porterId, memberId: scenario.patientId }); state = travel(state, scenario.porterId, "W3-K01");
  assert.equal(state.extraction.patients[0].territoryId, "W3-K02"); assert.equal(state.extraction.patients[0].arrival, null);
  denied(state, { kind: "return-patient", teamId: scenario.porterId, memberId: scenario.patientId, workId: scenario.workId });
  denied(state, { kind: "load-patient", teamId: scenario.porterId, memberId: scenario.patientId, carrierId: scenario.carrierId });
  state = travel(state, scenario.porterId, "W3-K02"); state = act(state, { kind: "load-patient", teamId: scenario.porterId, memberId: scenario.patientId, carrierId: scenario.carrierId });
  assert.equal(state.extraction.patients.length, 1); assert.equal(state.extraction.patients[0].carrierId, scenario.carrierId);
});

test("V87 checkpoint shape and key remain exact without extraction; interrupted extraction and guards round-trip without reset", () => {
  const legacy = fresh("W3-U19"), legacyText = api.exportWarWorksV87(legacy);
  assert.equal("extraction" in legacy, false); assert.deepEqual(api.importWarWorksV87(legacyText).state, legacy);
  const key = JSON.parse(legacy.rulesKey); assert.deepEqual(key.definitions.map(def => def.id), ["W3-S02", "W3-S05", "W3-S07", "W3-S03", "W3-S04"]);
  const scenario = ready(); let state = pickUp(scenario); state = act(state, { kind: "plan", teamId: scenario.porterId, destinationId: "W3-K01" });
  const resumed = api.importWarWorksV87(api.exportWarWorksV87(state)).state; assert.deepEqual(resumed, state);
  assert.deepEqual(act(resumed, { kind: "advance", teamId: scenario.porterId }), act(state, { kind: "advance", teamId: scenario.porterId }));
});

test("older five-work source and checkpoint remain playable without S16, but missing any original work still rejects", () => {
  const olderRules = structuredClone(rules); olderRules.entries = olderRules.entries.filter(entry => entry.id !== "W3-S16");
  assert.equal(api.warWorksDefinitionsV6(olderRules).length, 5); assert(!api.warExtractionAvailableV88(olderRules));
  const original = api.createWarWorksV6(80, "W3-U17", rules, "local"), checkpoint = api.exportWarWorksV87(original, rules);
  assert.deepEqual(api.createWarWorksV6(80, "W3-U17", olderRules, "local"), original);
  const resumed = api.importWarWorksV87(checkpoint, olderRules).state; assert.deepEqual(resumed, original);
  const oldTurn = api.applyWarWorksV6(resumed, { kind: "observe", teamId: resumed.teams[0].team.id }, olderRules); assert(oldTurn.accepted);
  const oldShelter = api.applyWarWorksV6(oldTurn.state, { kind: "reserve-kit", structureId: "W3-S02", territoryId: resumed.originId }, olderRules); assert(oldShelter.accepted);
  assert.equal(api.applyWarWorksV6(oldTurn.state, { kind: "reserve-kit", structureId: "W3-S16", territoryId: resumed.originId }, olderRules).accepted, false);
  assert.equal(api.applyWarWorksV6(resumed, { kind: "declare-patient", teamId: resumed.teams[0].team.id, memberId: resumed.teams[0].team.members[0].id }, olderRules).accepted, false);
  for (const id of ["W3-S02", "W3-S03", "W3-S04", "W3-S05", "W3-S07"]) {
    const broken = structuredClone(rules); broken.entries = broken.entries.filter(entry => entry.id !== id);
    assert.equal(api.createWarWorksV6(80, "W3-U17", broken, "local"), null);
    assert.equal(api.importWarWorksV87(checkpoint, broken).state, null);
  }
});

test("checkpoint rejects patient duplication, teleportation, false carrier/guard, premature return, source drift and campaign fields", () => {
  const scenario = ready(); const state = pickUp(scenario), text = api.exportWarWorksV87(state);
  const corruptions = [
    value => value.exercise.extraction.patients.push(structuredClone(value.exercise.extraction.patients[0])),
    value => value.exercise.extraction.patients[0].territoryId = "W3-K03",
    value => value.exercise.extraction.patients[0].carrierId = scenario.patientId,
    value => value.exercise.extraction.guards[0].territoryId = "W3-K06",
    value => value.exercise.extraction.patients[0].arrival = { workId: scenario.workId, turn: state.turn },
    value => value.exercise.extraction.patients[0].campaign = { reward: 100 },
  ];
  for (const corrupt of corruptions) { const value = JSON.parse(text); corrupt(value); assert.equal(api.importWarWorksV87(JSON.stringify(value)).state, null); }
  const changed = structuredClone(rules); changed.entries.find(entry => entry.id === "W3-S11").fields.find(field => field.column === "D").value += 1;
  assert.equal(api.importWarWorksV87(text, changed).state, null);
  assert.deepEqual(api.importWarWorksV87(text).state, state);
});
