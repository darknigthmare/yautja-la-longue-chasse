import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { build } from "esbuild";

const bundle = await build({ stdin: { contents: `
  export * from './app/game/systems/clanWarV85';
  export * from './app/game/systems/clanWarConvoyRouteV105';
  export * from './app/game/systems/clanWarPlanetsV96';
  export * from './app/game/systems/clanWarPlanetGeneratorV103';
  export * from './app/game/systems/clanWarSessionV85';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const clone = value => structuredClone(value);
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const draft = (extra = {}) => ({ territoryIds: ["CON-T02", "CON-T03", "CON-T04", "CON-T05"], combatantIds: ["P07", "P08"], cargo: { s: 0, m: 1, i: 0 }, ...extra });
function planned(extra = {}) {
  const initial = api.createWarSimulationV85(10537);
  // Freeze existing opponents at their own posts to isolate a convoy journey.
  for (const person of initial.combatants) if (person.factionId !== "CON-F01") person.garrison = true;
  const result = api.planWarConvoyV105(initial, draft(extra));
  assert.equal(result.accepted, true, result.message);
  return result.state;
}
function accepted(result) { assert.equal(result.accepted, true, result.message); return result.state; }

test("legacy fronts retain exact V104 initial and resolved bytes on all thirty historical worlds", () => {
  const fixture = JSON.parse(fs.readFileSync("tests/fixtures/clan-war-front-legacy-v105.json", "utf8"));
  assert.equal(fixture.snapshots.length, 30);
  for (const expected of fixture.snapshots) {
    const state = api.createWarSimulationV85(undefined, expected.planetId);
    assert.equal(state.version, 1);
    assert.equal(Object.hasOwn(state, "convoyRouteV105"), false);
    assert.equal(digest(state), expected.initial, expected.planetId);
    assert.equal(digest(accepted(api.advanceWarTurnV85(state))), expected.turnTwo, expected.planetId);
  }
});

test("planning records a source-backed itinerary without moving, reserving or creating any resources", () => {
  const initial = api.createWarSimulationV85(), before = JSON.stringify(initial);
  const state = accepted(api.planWarConvoyV105(initial, draft()));
  assert.equal(JSON.stringify(initial), before);
  assert.equal(state.version, 2);
  assert.deepEqual(state.stocks, initial.stocks);
  assert.deepEqual(state.combatants, initial.combatants);
  assert.deepEqual(state.orders, []);
  assert.equal(state.turn, initial.turn);
  assert.deepEqual(api.readWarSimulationV85(state), state);
  const contract = api.WAR_CONVOY_ROUTE_CONTRACT_V105;
  const source = JSON.parse(fs.readFileSync("app/game/clanWarV85Source.json", "utf8"));
  assert.equal(contract.sha256, source.sha256);
  for (const rule of contract.sources) {
    const entry = source.entries.find(item => item.id === rule.id);
    assert.equal(entry.sheet, rule.sheet);
    assert.equal(rule.cells, `C${entry.row}:H${entry.row}`);
  }
  assert.match(contract.adaptation, /six ouvrages historiques non intégrés restent ouverts/);
});

test("three consecutive deliveries use the same identified porters, one real edge and one existing slot per turn", () => {
  let state = planned();
  const route = clone(state.convoyRouteV105);
  for (let leg = 0; leg < 3; leg++) {
    const queued = accepted(api.queueWarConvoyLegV105(state));
    assert.equal(queued.orders.length, 1);
    assert.equal(api.warOrderSlotV85(queued.orders[0].kind), "logistics");
    assert.deepEqual(queued.orders[0].combatantIds, route.combatantIds);
    assert.equal(queued.orders[0].fromId, route.territoryIds[leg]);
    assert.equal(queued.orders[0].targetId, route.territoryIds[leg + 1]);
    assert.deepEqual(queued.stocks, state.stocks, "reservation does not debit a depot");
    assert.equal(api.queueWarConvoyLegV105(queued).accepted, false, "no double reservation");
    // The existing one-leg engine is the resource/accounting control group.
    const ordinary = clone(queued); ordinary.version = 1; delete ordinary.convoyRouteV105;
    const expected = accepted(api.advanceWarTurnV85(ordinary));
    state = accepted(api.advanceWarTurnV85(queued));
    assert.deepEqual(state.stocks, expected.stocks, "no extra supplies, costs, production or cargo protection");
    assert.deepEqual(state.combatants, expected.combatants, "the same existing people actually move");
    assert.equal(state.convoyRouteV105.completedOrderIds.length, leg + 1);
    assert.equal(state.convoyRouteV105.pendingOrderId, null);
    assert.equal(state.orders.length, 0, "next leg is never auto-queued");
    for (const id of route.combatantIds) assert.equal(state.combatants.find(person => person.id === id).territoryId, route.territoryIds[leg + 1]);
    assert.deepEqual(api.readWarSimulationV85(state), state);
  }
  assert.equal(api.queueWarConvoyLegV105(state).accepted, false);
  const cleared = accepted(api.removeWarConvoyV105(state));
  assert.deepEqual(cleared.stocks, state.stocks);
  assert.deepEqual(cleared.combatants, state.combatants);
  assert.equal(cleared.convoyRouteV105, null);
  assert.equal(cleared.version, 2, "no silent downgrade of an opted-in front");
});

test("illegal geography, empty cargo, unavailable people, duplicate identities and columns above eight are refused atomically", () => {
  const initial = api.createWarSimulationV85(), before = JSON.stringify(initial);
  for (const invalid of [
    draft({ territoryIds: ["CON-T02", "CON-T05"] }),
    draft({ territoryIds: ["CON-T02", "CON-T03", "CON-T02"] }),
    draft({ territoryIds: ["CON-T02", "CON-T08"] }),
    draft({ cargo: { s: 0, m: 0, i: 0 } }),
    draft({ cargo: { s: -1, m: 1, i: 0 } }),
    draft({ combatantIds: [] }), draft({ combatantIds: ["P07", "P07"] }),
    draft({ combatantIds: ["P01"] }), draft({ combatantIds: ["MISSING"] }),
    draft({ combatantIds: Array.from({ length: 9 }, (_, i) => `P${String(i + 7).padStart(2, "0")}`) }),
  ]) {
    const result = api.planWarConvoyV105(initial, invalid);
    assert.equal(result.accepted, false);
    assert.equal(result.state, initial);
    assert.equal(JSON.stringify(initial), before);
  }
  const eight = draft({ combatantIds: Array.from({ length: 8 }, (_, i) => `P${String(i + 7).padStart(2, "0")}`) });
  assert.equal(api.planWarConvoyV105(initial, eight).accepted, true);
});

test("a captured downstream depot, missing porter, local shortage or occupied logistics slot pauses without a hidden reroute", () => {
  const first = accepted(api.advanceWarTurnV85(accepted(api.queueWarConvoyLegV105(planned()))));
  const captured = clone(first); captured.territories["CON-T05"].controller = "CON-F02";
  assert.match(api.warConvoyRouteIssueV105(captured), /T05.*contrôle/);
  assert.equal(api.queueWarConvoyLegV105(captured).accepted, false);
  assert.deepEqual(api.readWarSimulationV85(captured), captured, "blocked plans remain readable");
  const wounded = clone(first); wounded.combatants.find(person => person.id === "P08").status = "wounded";
  assert.match(api.warConvoyRouteIssueV105(wounded), /pas disponible/);
  const poor = clone(first); poor.stocks["CON-T03"].m = 0;
  assert.match(api.warConvoyRouteIssueV105(poor), /stock local/);
  const busy = accepted(api.queueWarOrderV85(first, { kind: "logistics", fromId: "CON-T03", targetId: "CON-T04", combatantIds: ["P18"], cargo: { s: 0, m: 1, i: 0 } }));
  assert.match(api.warConvoyRouteIssueV105(busy), /logistiques déjà réservés/);
  for (const state of [captured, wounded, poor, busy]) {
    const before = JSON.stringify(state), result = api.queueWarConvoyLegV105(state);
    assert.equal(result.accepted, false); assert.equal(JSON.stringify(state), before);
    assert.deepEqual(state.convoyRouteV105.territoryIds, first.convoyRouteV105.territoryIds);
  }
});

test("cancelling a sealed leg releases its stock/people and preserves the uncompleted itinerary", () => {
  const state = planned(), queued = accepted(api.queueWarConvoyLegV105(state));
  const cancelled = api.cancelWarOrderV85(queued, queued.convoyRouteV105.pendingOrderId);
  assert.equal(cancelled.convoyRouteV105.pendingOrderId, null);
  assert.deepEqual(cancelled.convoyRouteV105.completedOrderIds, []);
  assert.deepEqual(cancelled.stocks, state.stocks);
  assert.deepEqual(api.readWarSimulationV85(cancelled), cancelled);
  assert.equal(api.queueWarConvoyLegV105(cancelled).accepted, true);
  const removed = accepted(api.removeWarConvoyV105(queued));
  assert.equal(removed.orders.length, 0); assert.equal(removed.convoyRouteV105, null);
  assert.deepEqual(removed.combatants, state.combatants);
});

test("a manifest invalidated during resolution cannot spend or complete its planned leg", () => {
  const queued = accepted(api.queueWarConvoyLegV105(planned()));
  queued.combatants.find(person => person.id === "P08").status = "wounded";
  const control = clone(queued); control.orders = []; control.convoyRouteV105.pendingOrderId = null;
  const expected = accepted(api.advanceWarTurnV85(control));
  const resolved = accepted(api.advanceWarTurnV85(queued));
  assert.deepEqual(resolved.stocks, expected.stocks);
  assert.deepEqual(resolved.convoyRouteV105.completedOrderIds, []);
  assert.equal(resolved.convoyRouteV105.pendingOrderId, null);
  assert.equal(resolved.combatants.find(person => person.id === "P07").territoryId, "CON-T02");
  assert.ok(resolved.reports.some(report => /Aucun lot dépensé/.test(report.text)));
});

test("all historical worlds and all 27 V103 count pairs support owned depot routes on their own graph", () => {
  const generated = [];
  for (const territoryCount of api.WAR_PLANET_TERRITORY_COUNTS_V103) for (const regionCount of api.WAR_PLANET_REGION_COUNTS_V103) {
    if (territoryCount < 3 * regionCount) continue;
    generated.push(api.encodeWarPlanetV103(api.normalizeWarPlanetRecipeV103({ seed: territoryCount * 105 + regionCount, territoryCount, regionCount, regionBalance: "uneven" })));
  }
  assert.equal(generated.length, 27);
  for (const id of [...api.WAR_PLANETS_V96.map(planet => planet.id), ...generated]) {
    const state = api.createWarSimulationV85(undefined, id);
    for (const person of state.combatants) if (person.factionId !== "CON-F01") person.garrison = true;
    const before = JSON.stringify(state);
    const origins = state.combatants.filter(person => person.factionId === "CON-F01" && person.status === "fit" && !person.garrison && state.stocks[person.territoryId].m > 0);
    let candidate;
    for (const person of origins) for (const [target, site] of Object.entries(state.territories)) {
      if (site.controller !== "CON-F01") continue;
      const path = api.warConvoyPathV105(state, person.territoryId, target);
      if (path?.length >= 2 && (!candidate || path.length > candidate.path.length)) candidate = { person, path };
    }
    assert.ok(candidate, `${id}: an owned road is available from the deployed roster`);
    const plan = accepted(api.planWarConvoyV105(state, { territoryIds: candidate.path, combatantIds: [candidate.person.id], cargo: { s: 0, m: 1, i: 0 } }));
    const queued = accepted(api.queueWarConvoyLegV105(plan));
    assert.ok(api.readWarSimulationV85(queued));
    const next = accepted(api.advanceWarTurnV85(queued));
    assert.equal(next.convoyRouteV105.completedOrderIds.length, 1);
    assert.equal(next.combatants.find(person => person.id === candidate.person.id).territoryId, candidate.path[1]);
    assert.equal(api.validWarPlanetArchiveRawV96(api.exportWarFrontV105(next), id), false, "front wrapper is distinct from raw LS state");
    assert.deepEqual(api.readWarFrontV105(api.exportWarFrontV105(next), id).state, next);
    assert.equal(JSON.stringify(state), before);
  }
});

test("lost departure stock or captured arrival after reservation cancels the leg without debit or checkpoint", () => {
  for (const mutate of [
    state => { state.stocks["CON-T02"].m = 0; },
    state => { state.territories["CON-T02"].controller = "CON-F02"; },
    state => { state.territories["CON-T03"].controller = "CON-F02"; },
  ]) {
    const queued = accepted(api.queueWarConvoyLegV105(planned())); mutate(queued);
    const control = clone(queued); control.orders = []; control.convoyRouteV105.pendingOrderId = null;
    const expected = accepted(api.advanceWarTurnV85(control));
    const resolved = accepted(api.advanceWarTurnV85(queued));
    assert.deepEqual(resolved.stocks, expected.stocks);
    assert.equal(resolved.convoyRouteV105.completedOrderIds.length, 0);
    assert.equal(resolved.convoyRouteV105.pendingOrderId, null);
    assert.equal(resolved.combatants.find(person => person.id === "P07").territoryId, "CON-T02");
  }
});

test("front transfer preserves pending reservations and checkpoints and rejects future, foreign or altered manifests", () => {
  const pending = accepted(api.queueWarConvoyLegV105(planned()));
  const raw = api.exportWarFrontV105(pending);
  assert.deepEqual(api.readWarFrontV105(raw, "korthas").state, pending);
  assert.equal(api.readWarFrontV105(raw, "thalassa").state, null);
  assert.equal(api.readWarFrontV105("{broken", "korthas").state, null);
  assert.equal(api.readWarFrontV105("x".repeat(4 * 1024 * 1024 + 1), "korthas").state, null);
  for (const mutate of [
    state => { state.version = 3; }, state => { state.version = 1; },
    state => { delete state.convoyRouteV105; },
    state => { state.convoyRouteV105.pendingOrderId = "missing-order"; },
    state => { state.convoyRouteV105.cargo.m++; },
    state => { state.convoyRouteV105.completedOrderIds.push("invented-delivery"); },
    state => { state.convoyRouteV105.territoryIds[2] = "CON-T25"; },
    state => { state.convoyRouteV105.futureField = true; },
  ]) {
    const value = clone(pending); mutate(value);
    assert.equal(api.readWarSimulationV85(value), null);
    const archive = JSON.parse(raw); archive.simulation = value;
    assert.equal(api.readWarFrontV105(JSON.stringify(archive), "korthas").state, null);
  }
  const future = JSON.parse(raw); future.version = 2;
  assert.equal(api.readWarFrontV105(JSON.stringify(future), "korthas").state, null);
  assert.deepEqual(api.readWarFrontV105(api.exportWarFrontV105(api.createWarSimulationV85()), "korthas").state, api.createWarSimulationV85());
});

test("session reload retains a plan and its pending order; future bytes remain protected against every write attempt", async () => {
  const pending = accepted(api.queueWarConvoyLegV105(planned()));
  for (const value of [pending, { ...pending, version: 3 }]) {
    const raw = JSON.stringify(value, null, 2) + "\n", data = new Map([[api.WAR_STORAGE_KEY_V85, raw]]), writes = [];
    const disk = { getItem: key => data.get(key) ?? null, setItem: (key, text) => { writes.push(key); data.set(key, text); } };
    const session = api.createWarSessionV85(() => disk, async operation => ({ acquired: true, value: await operation() }), null);
    const unsubscribe = session.subscribe(() => {}); await session.whenSettled();
    if (value.version === 2) {
      assert.deepEqual(session.getSnapshot().simulation, pending);
      assert.equal(session.getSnapshot().persistedWar, true);
    } else {
      assert.equal(session.getSnapshot().writableWar, false);
      session.setSimulation(api.createWarSimulationV85()); session.retryPersistence(); await session.whenSettled();
      assert.equal(data.get(api.WAR_STORAGE_KEY_V85), raw);
      assert.equal(writes.length, 0);
    }
    unsubscribe();
  }
});

test("archive limits keep enough revision/turn margin to resolve a reserved convoy leg", () => {
  const state = api.createWarSimulationV85();
  for (const exhausted of [{ ...state, revision: 999998 }, { ...state, turn: 4998 }]) assert.equal(api.planWarConvoyV105(exhausted, draft()).accepted, false);
  const plan = planned(); plan.revision = 999999;
  assert.equal(api.queueWarConvoyLegV105(plan).accepted, false);
  assert.ok(api.removeWarConvoyV105(plan).accepted);
  const pending = accepted(api.queueWarConvoyLegV105(planned())); pending.revision = 999998;
  const ordinary = { kind: "recon", fromId: "CON-T02", targetId: "CON-T08", combatantIds: ["P09"], cargo: { s: 0, m: 0, i: 0 } };
  assert.equal(api.queueWarOrderV85(pending, ordinary).accepted, false);
  assert.equal(api.changeWarGarrisonV99(pending, { territoryId: "CON-T01", combatantId: "P01", garrison: false, confirmLastGuard: true }).accepted, false);
  const limited = accepted(api.advanceWarTurnV85(pending));
  assert.ok(api.removeWarConvoyV105(limited).accepted, "resolution leaves one revision for withdrawing an unfinished plan");
  assert.ok(api.readWarSimulationV85(api.cancelWarOrderV85(pending, pending.convoyRouteV105.pendingOrderId)));
  assert.equal(api.readWarSimulationV85({ ...pending, revision: 999999 }), null);
  const lastPlan = planned({ territoryIds: ["CON-T02", "CON-T03"] }); lastPlan.revision = 999998;
  assert.equal(api.queueWarConvoyLegV105(lastPlan).accepted, false, "queue itself requires three remaining revisions");
  assert.equal(api.removeWarConvoyV105(lastPlan).accepted, true);
  assert.equal(api.readWarSimulationV85({ ...lastPlan, revision: 1000000 }), null, "unremovable archived plans are refused");
  lastPlan.revision = 999999;
  assert.equal(api.queueWarOrderV85(lastPlan, ordinary).accepted, false, "an unused plan retains its withdrawal revision");
  assert.equal(api.advanceWarTurnV85(lastPlan).accepted, false);
  assert.equal(api.changeWarGarrisonV99(lastPlan, { territoryId: "CON-T01", combatantId: "P01", garrison: false, confirmLastGuard: true }).accepted, false);
  assert.equal(api.removeWarConvoyV105(lastPlan).accepted, true);
  const exhausted = api.createWarSimulationV85(10537); exhausted.revision = 999997;
  assert.equal(api.planWarConvoyV105(exhausted, draft()).accepted, false, "all planned legs need revision margin");
  const boundary = api.createWarSimulationV85(10537); boundary.revision = 999992;
  for (const person of boundary.combatants) if (person.factionId !== "CON-F01") person.garrison = true;
  let journey = accepted(api.planWarConvoyV105(boundary, draft()));
  for (let leg = 0; leg < 3; leg++) journey = accepted(api.advanceWarTurnV85(accepted(api.queueWarConvoyLegV105(journey))));
  assert.equal(journey.revision, 999999);
  journey = accepted(api.removeWarConvoyV105(journey));
  assert.equal(journey.revision, 1000000);
  assert.equal(journey.convoyRouteV105, null);
});
