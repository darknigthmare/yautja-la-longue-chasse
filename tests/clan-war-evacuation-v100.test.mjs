import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const bundled = await build({ stdin: { contents: "export * from './app/game/systems/clanWarV85'; export * from './app/game/systems/clanWarPlanetsV96'; export * from './app/game/systems/clanWarEvacuationV100'; export * from './app/game/systems/clanWarCommandV98'; export * from './app/game/systems/clanWarSessionV85';", resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const person = (state, id) => state.combatants.find(actor => actor.id === id);
function fixture(planetId) {
  const state = api.createWarSimulationV85(10037, planetId);
  // Fortified enemy formations isolate the transport from a second battle.
  for (const actor of state.combatants) if (actor.factionId === "CON-F02") actor.garrison = true;
  Object.assign(person(state, "P08"), { status: "wounded", garrison: false });
  const targetId = api.warTerritoryForSimulationV96(state, "CON-T02").neighbors.find(id => state.territories[id].controller === "CON-F01");
  assert.ok(targetId);
  return { state, draft: { kind: "evacuate", fromId: "CON-T02", targetId, combatantIds: ["P02", "P07", "P08"], cargo: { s: 0, m: 0, i: 0 } } };
}
function refused(state, draft) {
  const raw = JSON.stringify(state), result = api.queueWarOrderV85(state, draft);
  assert.equal(result.accepted, false); assert.equal(result.state, state);
  assert.equal(JSON.stringify(state), raw); return result.message;
}

test("thirty fronts reserve an identified evacuation without moving, healing or spending before resolution", () => {
  for (const planet of api.WAR_PLANETS_V96) {
    const { state, draft } = fixture(planet.id), raw = JSON.stringify(state);
    const queued = api.queueWarOrderV85(state, draft);
    assert.equal(queued.accepted, true, `${planet.id}: ${queued.message}`);
    assert.equal(JSON.stringify(state), raw);
    assert.deepEqual(queued.state.combatants, state.combatants);
    assert.deepEqual(queued.state.stocks, state.stocks);
    assert.equal(queued.state.turn, state.turn);
    assert.equal(queued.state.orders.length, 1);
    assert.deepEqual(api.readWarSimulationV85(JSON.parse(JSON.stringify(queued.state))), queued.state);
    const preview = api.warOrderPreviewV98(state, draft);
    assert.equal(preview.issue, null); assert.deepEqual(preview.cost, { s: 1, m: 0, i: 0 });
    assert(preview.warnings.some(text => text.includes("Tous les gardes")));
  }
});

test("resolution moves the same wounded patient and two escorts one friendly edge, then charges actual upkeep and production", () => {
  for (const planet of api.WAR_PLANETS_V96) {
    const { state, draft } = fixture(planet.id), before = api.warBudgetV85(state);
    const queued = api.queueWarOrderV85(state, draft).state, resolved = api.advanceWarTurnV85(queued);
    assert.equal(resolved.accepted, true);
    assert.deepEqual(resolved.state.combatants.map(actor => actor.id), state.combatants.map(actor => actor.id));
    for (const id of draft.combatantIds) {
      const original = person(state, id), current = person(resolved.state, id);
      assert.deepEqual(current, { ...original, territoryId: draft.targetId, garrison: false }, planet.id + id);
    }
    assert.equal(person(resolved.state, "P08").status, "wounded");
    assert.equal(person(resolved.state, "P08").trainingUntilTurn, null);
    assert.equal(resolved.state.territories[draft.fromId].controller, "CON-F01");
    assert.equal(api.warGarrisonV85(resolved.state, draft.fromId).length, 0);
    const income = api.warCommandV98(resolved.state).income, after = api.warBudgetV85(resolved.state);
    assert.equal(after.s, before.s - 1 - api.warUpkeepV85(state) + income.s);
    assert.equal(after.m, before.m + income.m); assert.equal(after.i, before.i + income.i);
    assert(resolved.state.reports.some(report => report.id === queued.orders[0].id && report.text.includes("restent blessés")));
    assert.deepEqual(api.readWarSimulationV85(resolved.state), resolved.state);
  }
});

test("evacuation owns a logistics slot and every actual patient and escort until cancelled", () => {
  const { state, draft } = fixture();
  const queued = api.queueWarOrderV85(state, draft).state;
  assert.match(refused(queued, { kind: "heal", fromId: draft.fromId, targetId: draft.fromId, combatantIds: ["P08"], cargo: { s: 0, m: 0, i: 0 } }), /logistiques/);
  assert.match(refused(queued, { ...draft, kind: "recon", combatantIds: ["P07"] }), /déjà un ordre/);
  const command = api.warCommandV98(queued), site = command.sites.find(item => item.id === draft.fromId);
  assert.equal(command.slots.find(slot => slot.kind === "logistics").used, 1);
  assert.equal(site.availableStock.s, state.stocks[draft.fromId].s - 1);
  assert.equal(api.warGarrisonIssueV99(queued, { territoryId: draft.fromId, combatantId: "P02", garrison: false, confirmLastGuard: true }).includes("ordre réservé"), true);
  const cancelled = api.cancelWarOrderV85(queued, queued.orders[0].id);
  assert.deepEqual(cancelled.combatants, state.combatants); assert.deepEqual(cancelled.stocks, state.stocks);
  assert.equal(cancelled.orders.length, 0); assert.equal(api.queueWarOrderV85(cancelled, draft).accepted, true);
});

test("missing, dead, remote, foreign, training and overloaded manifests are exact immutable refusals", () => {
  const { state, draft } = fixture();
  for (const combatantIds of [[], ["P07", "P08"], ["P02", "P07"], ["P02", "P08", "P08"], ["P02", "P07", "MISSING"], ["P02", "P07", "P01"], ["P02", "P07", "F01"], ["P02", "P07", "P08", "P09", "P10", "P11", "P12", "P13", "P14"]]) refused(state, { ...draft, combatantIds });
  for (const patch of [{ status: "dead" }, { trainingUntilTurn: 8 }, { territoryId: "CON-T01" }, { factionId: "CON-F02" }]) {
    const changed = structuredClone(state); Object.assign(person(changed, "P08"), patch); refused(changed, draft);
  }
  const overloaded = structuredClone(state); person(overloaded, "P09").status = "wounded";
  refused(overloaded, { ...draft, combatantIds: ["P02", "P07", "P08", "P09"] });
  for (const extra of [{ targetId: draft.fromId }, { targetId: "CON-T36" }, { cargo: { s: 1, m: 0, i: 0 } }]) refused(state, { ...draft, ...extra });
  const hostile = structuredClone(state); hostile.territories[draft.targetId].controller = "CON-F03"; hostile.territories[draft.targetId].transitUntilTurn = 5; refused(hostile, draft);
  const poor = structuredClone(state); poor.stocks[draft.fromId].s = 0; refused(poor, draft);
});

test("two patients require four real escorts, and automatic selection preserves the original guard", () => {
  const { state, draft } = fixture(); person(state, "P09").status = "wounded";
  const ids = api.warEvacuationSelectionV100(state, draft.fromId), manifest = api.warEvacuationManifestV100(state, { ...draft, combatantIds: ids });
  assert.equal(manifest.patients.length, 2); assert.equal(manifest.escorts.length, 4);
  assert.equal(ids.includes("P02"), false); assert.equal(ids.length, 6);
  assert.equal(api.queueWarOrderV85(state, { ...draft, combatantIds: ids }).accepted, true);
  assert.equal(api.warEvacuationLeavesUnguardedV100(state, { ...draft, combatantIds: ids }), false);
  assert.equal(api.warEvacuationLeavesUnguardedV100(state, draft), true);
  assert.deepEqual(api.warEvacuationSelectionV100(state, "CON-T36"), []);
});

test("loss of the destination or a stretcher escort before resolution cancels without an evacuation expense or movement", () => {
  for (const change of [state => { state.territories["CON-T01"].controller = "CON-F02"; }, state => { person(state, "P07").status = "wounded"; }]) {
    const { state, draft } = fixture(), queued = api.queueWarOrderV85(state, draft).state;
    change(queued);
    const resolved = api.advanceWarTurnV85(queued).state;
    for (const id of draft.combatantIds) assert.equal(person(resolved, id).territoryId, draft.fromId);
    assert(resolved.reports.some(report => report.id === queued.orders[0].id && report.text.includes("annulée avant dépense")));
    assert(resolved.appliedResultIds.includes(queued.orders[0].id));
    assert.equal(resolved.orders.length, 0);
  }
});

test("wounds acquired in a real battle require transport followed by a distinct one-turn care order", () => {
  const initial = api.createWarSimulationV85(8507);
  const attack = api.queueWarOrderV85(initial, { kind: "attack", fromId: "CON-T02", targetId: "CON-T08", combatantIds: ["P07", "P08", "P09", "P10", "P11", "P12", "P13", "P14"], cargo: { s: 0, m: 0, i: 0 } });
  assert.equal(attack.accepted, true);
  const battle = api.advanceWarTurnV85(attack.state).state;
  const patient = battle.combatants.find(actor => actor.factionId === "CON-F01" && actor.status === "wounded" && actor.territoryId === "CON-T02");
  assert.ok(patient);
  const ids = api.warEvacuationSelectionV100(battle, "CON-T02"); assert(ids.includes(patient.id));
  const evacuation = api.queueWarOrderV85(battle, { kind: "evacuate", fromId: "CON-T02", targetId: "CON-T01", combatantIds: ids, cargo: { s: 0, m: 0, i: 0 } });
  assert.equal(evacuation.accepted, true, evacuation.message);
  const arrived = api.advanceWarTurnV85(evacuation.state).state;
  assert.equal(person(arrived, patient.id).status, "wounded"); assert.equal(person(arrived, patient.id).territoryId, "CON-T01");
  const care = api.queueWarOrderV85(arrived, { kind: "heal", fromId: "CON-T01", targetId: "CON-T01", combatantIds: [patient.id], cargo: { s: 0, m: 0, i: 0 } });
  assert.equal(care.accepted, true);
  const started = api.advanceWarTurnV85(care.state).state;
  assert.equal(person(started, patient.id).status, "wounded");
  const finished = api.advanceWarTurnV85(started).state;
  assert.equal(person(finished, patient.id).status, "fit"); assert.equal(person(finished, patient.id).garrison, false);
  assert.equal(person(finished, patient.id).xp, person(battle, patient.id).xp);
});

test("new evacuation orders round-trip through the existing native session and preserve unrelated campaign bytes", async () => {
  const { state, draft } = fixture("thalassa"), key = api.warPlanetStorageKeyV96("thalassa");
  const values = new Map([[key, JSON.stringify(state)], ["yautja-long-hunt.save", "campaign-original"]]);
  const storage = { getItem: id => values.get(id) ?? null, setItem: (id, value) => values.set(id, value) };
  const lock = async operation => ({ acquired: true, value: await operation() });
  const open = () => api.createWarSessionV85(() => storage, lock, null, { planetId: "thalassa" });
  const session = open(); session.subscribe(() => {}); await session.whenSettled();
  session.setSimulation(api.queueWarOrderV85(session.getSnapshot().simulation, draft).state); await session.whenSettled();
  assert.equal(session.getSnapshot().persistedWar, true);
  const reopened = open(); reopened.subscribe(() => {}); await reopened.whenSettled();
  assert.deepEqual(reopened.getSnapshot().simulation, session.getSnapshot().simulation);
  reopened.setSimulation(api.advanceWarTurnV85(reopened.getSnapshot().simulation).state); await reopened.whenSettled();
  const arrived = open(); arrived.subscribe(() => {}); await arrived.whenSettled();
  assert.equal(person(arrived.getSnapshot().simulation, "P08").territoryId, draft.targetId);
  assert.equal(person(arrived.getSnapshot().simulation, "P08").status, "wounded");
  assert.equal(values.get("yautja-long-hunt.save"), "campaign-original");
});

test("actual React manifests describe the selected capacity, physical route, cost and absence of automatic healing", () => {
  const ssr = homeworldSceneSsrV78(), { state, draft } = fixture();
  const html = ssr.render("app/game/ClanWarEvacuationV100.tsx", { simulation: state, draft });
  assert.match(html, /Manifeste d’évacuation/); assert.match(html, /P02, P07/); assert.match(html, /P08/);
  assert.match(html, /Coût local/); assert.match(html, /S1/); assert.match(html, /Patients blessés/);
  assert.match(html, /restent blessés/); assert.match(html, /huit personnes/); assert.match(html, /site ami/);
  const command = ssr.render("app/game/ClanWarCommandV98.tsx", { simulation: state, selectedTerritoryId: draft.fromId, onPrepare() {}, onManageGarrison() {} });
  assert.match(command, /Préparer l’évacuation/); assert.doesNotMatch(html, /undefined|NaN|Infinity/);
});
