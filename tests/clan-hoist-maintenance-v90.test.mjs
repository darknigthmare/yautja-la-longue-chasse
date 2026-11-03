import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import crypto from "node:crypto";
import { api, rules, act, denied, travel, hoistScenarioV90, sectionReservedV90, repairStartedV90 } from "./helpers/clan-hoist-scenario-v90.mjs";

test("regional exercise is explicit, finite and isolated; ordinary and historical checkpoints remain unchanged", () => {
  const old = api.createWarWorksV6(120, "W3-U20", rules, "local"), regional = api.createWarWorksRegionalV90(120, "W3-U20");
  assert.equal("deploymentV90" in old, false); assert.equal("maintenance" in old, false); assert.equal(old.originId, "W3-K01");
  assert.equal(regional.originId, "W3-K25"); assert.equal(regional.ravStock, 120); assert.equal(regional.turn, 1);
  assert.deepEqual(regional.teams[0].team, old.teams[0].team); assert.deepEqual(regional.observed, []); assert.deepEqual(regional.works, []);
  assert.equal(regional.deploymentV90.regionId, "W3-KR05"); assert(api.exportWarWorksV87(regional));
  assert.equal(api.createWarWorksRegionalV90(121), null);
  for (const field of ["save", "missionResults", "ownedShip", "income", "account"]) assert.equal(field in regional, false);
  for (const name of ["relay-played-checkpoint.json", "hoist-played-checkpoint.json", "hoist-delivered-checkpoint.json"]) {
    const path = `work-local/v88/qa/${name}`;
    if (!fs.existsSync(path)) { assert(!process.env.YAUTJA_REQUIRE_LOCAL_CLAN_PROOFS, `Required historical proof missing: ${path}`); continue; }
    const bytes = fs.readFileSync(path), imported = api.importWarWorksV87(bytes.toString("utf8")); assert(imported.state, imported.message);
    assert.equal("maintenance" in imported.state, false); assert.equal("deploymentV90" in imported.state, false);
    assert.deepEqual(api.importWarWorksV87(api.exportWarWorksV87(imported.state)).state, imported.state);
    assert.deepEqual(fs.readFileSync(path), bytes, `Historical bytes preserved: ${crypto.createHash("sha256").update(bytes).digest("hex")}`);
  }
});

test("real third lift opens one dated source event; upkeep rations do not count as mechanical service", () => {
  const scenario = hoistScenarioV90(), before = scenario.beforeFault;
  assert.equal(before.maintenance.faults.length, 0); assert(before.accounts.upkeepConsumed > 0);
  const fault = scenario.state.maintenance.faults[0]; assert.equal(fault.sourceId, "W5-EV25"); assert.equal(fault.phase, "open");
  assert.deepEqual(fault.liftIds, scenario.state.infrastructure.lifts.map(lift => lift.id)); assert.equal(fault.triggerTurn, scenario.state.turn);
  assert.equal(api.hoistBlockedV90(scenario.state, scenario.hoistId), true);
  assert.equal(api.warWorkOccupiedV6(scenario.state, scenario.state.works.find(work => work.id === scenario.hoistId)), false);
  assert.deepEqual(scenario.state.teams, before.teams); assert.equal(scenario.state.ravStock, 32);
  denied(scenario.state, { kind: "lift-kit", workId: scenario.hoistId, teamId: scenario.teamId, kitWorkId: scenario.kitIds[2] });
});

test("opening mechanical tracking before commissioning refuses and cannot poison an otherwise valid checkpoint", () => {
  let state = api.createWarWorksRegionalV90(120, "W3-U20"), teamId = state.teams[0].team.id;
  state = act(state, { kind: "observe", teamId }); state = travel(state, teamId, "W3-K19");
  state = act(state, { kind: "observe", teamId }); state = travel(state, teamId, "W3-K25");
  state = act(state, { kind: "reserve-kit", structureId: "W3-S17", territoryId: "W3-K25", passageId: "W3-L49" });
  const workId = state.works[0].id;
  const rejected = snapshot => {
    const checkpoint = api.exportWarWorksV87(snapshot); assert(checkpoint);
    denied(snapshot, { kind: "enable-hoist-wear", workId });
    assert.equal(api.exportWarWorksV87(snapshot), checkpoint); assert.equal("maintenance" in snapshot, false);
  };
  rejected(state);
  state = act(state, { kind: "load", workId, teamId }); rejected(state);
  state = act(state, { kind: "unload", workId, teamId }); rejected(state);
  state = act(state, { kind: "work", workId, teamId }); rejected(state);
  state = act(state, { kind: "work", workId, teamId }); rejected(state);
  state = act(state, { kind: "work", workId, teamId });
  state = act(state, { kind: "enable-hoist-wear", workId }); assert.equal(state.maintenance.tracked.length, 1);
});

test("six local RAV reserve exactly one section; a click does not repair and an occupied carrier cannot load it", () => {
  const scenario = sectionReservedV90(), fault = scenario.state.maintenance.faults[0];
  assert.equal(fault.phase, "section-reserved"); assert.equal(scenario.state.maintenance.reservedRav, 6); assert.equal(scenario.state.ravStock, 26);
  assert.equal(fault.section.territoryId, "W3-K25"); assert.equal(fault.section.carrierTeamId, null); assert.equal(fault.section.consumedTurn, null);
  const repeat = api.applyWarWorksV6(scenario.state, { kind: "reserve-chain-section", eventId: scenario.eventId, workshopWorkId: scenario.workshopId, teamId: scenario.teamId });
  assert(repeat.accepted); assert(!repeat.changed); assert.strictEqual(repeat.state, scenario.state);
  denied(scenario.state, { kind: "load-chain-section", eventId: scenario.eventId, teamId: scenario.teamId });
});

test("identified section follows actual permitted passages; no simultaneous kit, post or foreign delivery", () => {
  const scenario = repairStartedV90({ excursion: true }), fault = scenario.state.maintenance.faults[0];
  assert.equal(fault.section.loadedByTeamId, scenario.teamId); assert.equal(fault.section.territoryId, "W3-K25");
  assert.equal(scenario.state.infrastructure.traversals.filter(step => step.turn > fault.section.loadedTurn).length, 2);
  assert.equal(scenario.state.ravStock, 16);
  denied(scenario.carried, { kind: "load", workId: scenario.kitIds[0], teamId: scenario.teamId });
  const away = travel(scenario.carried, scenario.teamId, "W3-K26"); assert.equal(away.maintenance.faults[0].section.territoryId, "W3-K26");
  denied(away, { kind: "unload-chain-section", eventId: scenario.eventId, teamId: scenario.teamId });
  denied(scenario.carried, { kind: "assign", workId: scenario.workshopId, teamId: scenario.teamId });
});

test("two real worked turns immobilize the same artisans, consume the section once and preserve a separately closed link", () => {
  const scenario = repairStartedV90(); let state = scenario.state, identities = structuredClone(state.teams[0].team);
  denied(state, { kind: "plan", teamId: scenario.teamId, destinationId: "W3-K26" });
  denied(state, { kind: "release", teamId: scenario.teamId }); denied(state, { kind: "observe", teamId: scenario.teamId });
  state = act(state, { kind: "close-passages", ids: ["W3-L49"] });
  const beforeWork = state.turn; state = act(state, { kind: "wait" });
  assert.equal(state.maintenance.faults[0].repair.workedTurns.length, 0); assert.equal(state.turn, beforeWork + 1);
  state = act(state, { kind: "work-chain-repair", eventId: scenario.eventId, teamId: scenario.teamId });
  assert.equal(state.maintenance.faults[0].phase, "repairing");
  state = act(state, { kind: "work-chain-repair", eventId: scenario.eventId, teamId: scenario.teamId });
  const fault = state.maintenance.faults[0]; assert.equal(fault.phase, "repaired"); assert.equal(fault.section.consumedTurn, state.turn);
  assert.deepEqual(state.closedPassageIds, ["W3-L49"]); assert.deepEqual(state.teams[0].team, identities); assert.equal(state.maintenance.reservedRav, 6);
  const repeat = api.applyWarWorksV6(state, { kind: "work-chain-repair", eventId: scenario.eventId, teamId: scenario.teamId });
  assert(repeat.accepted); assert(!repeat.changed); assert.strictEqual(repeat.state, state);
  assert.equal(api.hoistBlockedV90(state, scenario.hoistId), false);
});

test("strict checkpoint resumes cargo and interrupted work but rejects copied pieces, false receipts, timelines and source drift", () => {
  for (const state of [sectionReservedV90().state, repairStartedV90().carried, repairStartedV90().state]) {
    const text = api.exportWarWorksV87(state); assert.deepEqual(api.importWarWorksV87(text).state, state);
  }
  const scenario = repairStartedV90(), checkpoint = api.exportWarWorksV87(scenario.state);
  for (const corrupt of [s => s.maintenance.reservedRav = 0, s => s.maintenance.faults[0].section.id = "copied-section",
    s => s.maintenance.faults[0].section.transactionId = s.transfers[0].id,
    s => s.maintenance.faults[0].liftIds[1] = s.maintenance.faults[0].liftIds[0],
    s => s.maintenance.faults[0].phase = "repaired", s => s.maintenance.faults[0].repair.memberIds[1] = s.maintenance.faults[0].repair.memberIds[0],
    s => s.maintenance.faults[0].section.deliveredTurn = 1, s => s.deploymentV90.originId = "W3-K01", s => s.maintenance.campaign = {}]) {
    const file = JSON.parse(checkpoint); corrupt(file.exercise); assert.equal(api.importWarWorksV87(JSON.stringify(file)).state, null);
  }
  const changed = structuredClone(rules); changed.entries.find(entry => entry.id === "W5-EV25").fields.find(field => field.column === "G").value = 1;
  assert.equal(api.importWarWorksV87(checkpoint, changed).state, null); assert.equal(api.hoistMaintenanceAvailableV90(changed), false);
});

test("two-RAV rail choice reserves an existing charge and resolves only after two real passages; hoist and closures remain untouched", () => {
  const scenario = hoistScenarioV90({ railsRecon: true }); let state = act(scenario.state, { kind: "release", teamId: scenario.teamId });
  state = act(state, { kind: "reserve-kit", structureId: "W3-S05", territoryId: "W3-K26" }); const kitWorkId = state.works.at(-1).id;
  const before = state, identities = structuredClone(state.teams[0].team);
  state = act(state, { kind: "reserve-rail-route", eventId: scenario.eventId, teamId: scenario.teamId, kitWorkId });
  assert.equal(state.turn, before.turn); assert.equal(state.ravStock, before.ravStock - 2); assert.equal(state.maintenance.reservedRav, 2);
  assert.equal(state.maintenance.faults[0].phase, "rails-reserved"); assert.equal(state.teams[0].territoryId, "W3-K25");
  denied(state, { kind: "plan", teamId: scenario.teamId, destinationId: "W3-K19" });
  state = act(state, { kind: "close-passages", ids: ["W3-L21", "W3-L49"] }); denied(state, { kind: "advance", teamId: scenario.teamId });
  state = act(state, { kind: "close-passages", ids: ["W3-L49"] });
  state = act(state, { kind: "advance", teamId: scenario.teamId }); assert.equal(state.maintenance.faults[0].phase, "rails-reserved");
  const interrupted = api.exportWarWorksV87(state); assert.deepEqual(api.importWarWorksV87(interrupted).state, state);
  state = act(state, { kind: "advance", teamId: scenario.teamId });
  assert.equal(state.teams[0].territoryId, "W3-K27"); assert.equal(state.maintenance.faults[0].phase, "rails-completed");
  assert.equal(state.turn, before.turn + 2); assert(api.hoistBlockedV90(state, scenario.hoistId)); assert.deepEqual(state.closedPassageIds, ["W3-L49"]);
  assert.deepEqual(state.teams[0].team.members, identities.members); assert.deepEqual(state.teams[0].team.resultReceipts, identities.resultReceipts);
  const repeat = api.applyWarWorksV6(state, { kind: "reserve-rail-route", eventId: scenario.eventId, teamId: scenario.teamId, kitWorkId });
  assert(repeat.accepted); assert(!repeat.changed); assert.strictEqual(repeat.state, state);
});

test("no local means or workshop leaves repair open without any debit, automatic piece or remote stock", () => {
  const scenario = hoistScenarioV90();
  denied(scenario.state, { kind: "reserve-chain-section", eventId: scenario.eventId, workshopWorkId: scenario.workshopId, teamId: scenario.teamId });
  let state = act(scenario.state, { kind: "release", teamId: scenario.teamId });
  state = act(state, { kind: "assign", workId: scenario.workshopId, teamId: scenario.teamId });
  while (state.ravStock > 0) state = act(state, { kind: "wait" });
  denied(state, { kind: "reserve-chain-section", eventId: scenario.eventId, workshopWorkId: scenario.workshopId, teamId: scenario.teamId });
  assert.equal(state.maintenance.faults[0].phase, "open"); assert.equal(state.maintenance.reservedRav, 0);
});
