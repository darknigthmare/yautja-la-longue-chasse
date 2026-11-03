import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const bundle = await build({
  stdin: { contents: `export * from './app/game/systems/clanWarV85'; export * from './app/game/systems/clanWarEvacuationV100'; export * from './app/game/systems/clanWarPlanetsV96'; export * from './app/game/systems/clanWarSessionV85';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const person = (state, id) => state.combatants.find(actor => actor.id === id);
const noCargo = { s: 0, m: 0, i: 0 };
function scenario(planetId) {
  const state = api.createWarSimulationV85(100, planetId);
  for (const actor of state.combatants) if (actor.factionId === 'CON-F02') actor.garrison = true;
  person(state, 'P07').status = 'wounded';
  const destination = api.warTerritoryForSimulationV96(state, 'CON-T02').neighbors.find(id => state.territories[id].controller === 'CON-F01');
  assert.ok(destination, planetId + ': an actual friendly road exists');
  return { state, draft: { kind: 'evacuate', fromId: 'CON-T02', targetId: destination, combatantIds: ['P08', 'P09', 'P07'], cargo: { ...noCargo } } };
}

test('review: thirty real planetary routes preserve each patient and charge only the local evacuation cost', () => {
  for (const planet of api.WAR_PLANETS_V96) {
    const { state, draft } = scenario(planet.id);
    const original = JSON.stringify(state);
    const reserved = api.queueWarOrderV85(state, draft);
    assert.equal(reserved.accepted, true, planet.id + ': ' + reserved.message);
    assert.equal(JSON.stringify(state), original, 'reservation must not mutate its caller');
    assert.deepEqual(reserved.state.combatants, state.combatants, 'reservation neither transports nor heals');
    assert.deepEqual(reserved.state.stocks, state.stocks, 'reservation spends no immediate supply');
    const imported = api.readWarSimulationV85(JSON.parse(JSON.stringify(reserved.state)));
    assert.deepEqual(imported, reserved.state, planet.id + ': reservation survives actual archive validation');
    const baseline = api.advanceWarTurnV85(state).state;
    const resolved = api.advanceWarTurnV85(imported).state;
    const expected = structuredClone(baseline.combatants);
    for (const actor of expected) if (draft.combatantIds.includes(actor.id)) { actor.territoryId = draft.targetId; actor.garrison = false; }
    assert.deepEqual(resolved.combatants, expected, planet.id + ': only the actual selected people move');
    const expectedStocks = structuredClone(baseline.stocks);
    expectedStocks[draft.fromId].s--;
    assert.deepEqual(resolved.stocks, expectedStocks, planet.id + ': S1 spent locally, no resource creation');
    assert.deepEqual(resolved.territories, baseline.territories, 'transport cannot transfer sovereignty');
    assert.deepEqual(api.readWarSimulationV85(resolved), resolved);
    assert.equal(resolved.appliedResultIds.filter(id => id === reserved.state.orders[0].id).length, 1);
    assert.equal(person(resolved, 'P07').status, 'wounded');
    assert.equal(person(resolved, 'P07').trainingUntilTurn, null);
  }
});

test('review: arrival requires the existing care cycle before the same patient can return to guard duty', () => {
  const { state, draft } = scenario('korthas');
  assert.equal(draft.targetId, 'CON-T01');
  const arrived = api.advanceWarTurnV85(api.queueWarOrderV85(state, draft).state).state;
  const patientAtArrival = structuredClone(person(arrived, 'P07'));
  assert.equal(api.changeWarGarrisonV99(arrived, { territoryId: draft.targetId, combatantId: 'P07', garrison: true }).accepted, false);
  const care = api.queueWarOrderV85(arrived, { kind: 'heal', fromId: draft.targetId, targetId: draft.targetId, combatantIds: ['P07'], cargo: { ...noCargo } });
  assert.equal(care.accepted, true, care.message);
  const treating = api.advanceWarTurnV85(care.state).state;
  assert.equal(person(treating, 'P07').status, 'wounded');
  assert.equal(person(treating, 'P07').trainingUntilTurn, arrived.turn + 1);
  const healed = api.advanceWarTurnV85(treating).state;
  assert.equal(person(healed, 'P07').status, 'fit');
  assert.equal(person(healed, 'P07').territoryId, patientAtArrival.territoryId);
  assert.equal(person(healed, 'P07').xp, patientAtArrival.xp);
  const returned = api.changeWarGarrisonV99(healed, { territoryId: draft.targetId, combatantId: 'P07', garrison: true });
  assert.equal(returned.accepted, true);
  assert.equal(returned.state.combatants.filter(actor => actor.id === 'P07').length, 1);
  assert.equal(person(returned.state, 'P07').garrison, true);
});

test('review: patients and escorts share the real exclusive order reservations and cancellation releases both', () => {
  const { state, draft } = scenario('korthas');
  const reserved = api.queueWarOrderV85(state, draft);
  assert.equal(reserved.accepted, true);
  const before = JSON.stringify(reserved.state);
  for (const [kind, id] of [['heal', 'P07'], ['recon', 'P08']]) {
    const other = api.queueWarOrderV85(reserved.state, { kind, fromId: draft.fromId, targetId: kind === 'heal' ? draft.fromId : draft.targetId, combatantIds: [id], cargo: { ...noCargo } });
    assert.equal(other.accepted, false);
    assert.equal(other.state, reserved.state);
  }
  assert.equal(api.changeWarGarrisonV99(reserved.state, { territoryId: draft.fromId, combatantId: 'P08', garrison: true }).accepted, false);
  assert.equal(JSON.stringify(reserved.state), before);
  const cancelled = api.cancelWarOrderV85(reserved.state, reserved.state.orders[0].id);
  assert.deepEqual(cancelled.combatants, state.combatants);
  assert.deepEqual(cancelled.stocks, state.stocks);
  assert.deepEqual(cancelled.orders, []);
  assert.equal(api.queueWarOrderV85(cancelled, draft).accepted, true);
});

test('review: losing the receiving site or an escort aborts the order before transport and expenditure', () => {
  for (const invalidate of [
    state => { state.territories['CON-T01'].controller = 'CON-F02'; },
    state => { person(state, 'P08').status = 'dead'; },
    state => { person(state, 'P08').status = 'wounded'; },
    state => { person(state, 'P08').trainingUntilTurn = state.turn + 1; },
  ]) {
    const { state, draft } = scenario('korthas');
    const reserved = api.queueWarOrderV85(state, draft);
    const changed = structuredClone(reserved.state); invalidate(changed);
    const empty = structuredClone(changed); empty.orders = [];
    const baseline = api.advanceWarTurnV85(empty).state;
    const resolved = api.advanceWarTurnV85(changed).state;
    assert.deepEqual(resolved.combatants, baseline.combatants);
    assert.deepEqual(resolved.stocks, baseline.stocks);
    assert.equal(person(resolved, 'P07').territoryId, draft.fromId);
    assert.match(resolved.reports.find(report => report.id === reserved.state.orders[0].id).text, /évacuation annulée avant dépense/);
    assert.equal(resolved.appliedResultIds.filter(id => id === reserved.state.orders[0].id).length, 1);
  }
});

test('review: persisted sessions retain the exact pending and arrived people without touching the other fronts', async () => {
  const { state, draft } = scenario('korthas');
  const queued = api.queueWarOrderV85(state, draft).state;
  const key = api.warPlanetStorageKeyV96('korthas');
  const foreignKey = api.warPlanetStorageKeyV96('thalassa');
  const foreignBytes = JSON.stringify(api.createWarSimulationV85(99, 'thalassa'));
  const values = new Map([[key, JSON.stringify(queued)], [foreignKey, foreignBytes], ['unrelated-campaign', '{"sentinel":true}']]);
  const storage = { getItem: name => values.get(name) ?? null, setItem: (name, value) => values.set(name, value) };
  const lock = async operation => ({ acquired: true, value: await operation() });
  const first = api.createWarSessionV85(() => storage, lock, null, { planetId: 'korthas' });
  first.subscribe(() => {}); await first.whenSettled();
  assert.deepEqual(first.getSnapshot().simulation, queued);
  const resolved = api.advanceWarTurnV85(first.getSnapshot().simulation).state;
  first.setSimulation(resolved); await first.whenSettled();
  const second = api.createWarSessionV85(() => storage, lock, null, { planetId: 'korthas' });
  second.subscribe(() => {}); await second.whenSettled();
  assert.deepEqual(second.getSnapshot().simulation, resolved);
  assert.deepEqual(second.getSnapshot().simulation.combatants, resolved.combatants);
  assert.equal(values.get(foreignKey), foreignBytes);
  assert.equal(values.get('unrelated-campaign'), '{"sentinel":true}');
});

test('review: at the archive revision limit an accepted evacuation never resolves to an unreadable archive', () => {
  const { state, draft } = scenario('korthas');
  state.revision = 999999;
  const result = api.queueWarOrderV85(state, draft);
  if (!result.accepted) {
    assert.equal(result.state, state);
    assert.deepEqual(api.readWarSimulationV85(state), state);
    return;
  }
  for (const next of [api.advanceWarTurnV85(result.state).state, api.cancelWarOrderV85(result.state, result.state.orders[0].id)]) {
    assert.ok(api.readWarSimulationV85(next), 'a promised action must not create revision 1000001');
  }
});

test('review: the last reservable revision supports a readable resolution and cancellation', () => {
  const { state, draft } = scenario('korthas');
  state.revision = 999998;
  const reserved = api.queueWarOrderV85(state, draft);
  assert.equal(reserved.accepted, true);
  assert.equal(reserved.state.revision, 999999);
  for (const next of [api.advanceWarTurnV85(reserved.state).state, api.cancelWarOrderV85(reserved.state, reserved.state.orders[0].id)]) {
    assert.equal(next.revision, 1000000);
    assert.deepEqual(api.readWarSimulationV85(next), next);
    const before = JSON.stringify(next);
    assert.equal(api.advanceWarTurnV85(next).accepted, false);
    assert.equal(JSON.stringify(next), before);
  }
});

test('review: a nearly full journal never turns an evacuation into an unreadable archive', () => {
  const { state, draft } = scenario('korthas');
  state.reports = Array.from({ length: 99999 }, (_, index) => ({ id: `review-${index}`, turn: state.turn, text: 'Historique conservé.', sourceIds: [] }));
  assert.ok(api.readWarSimulationV85(state));
  const reserved = api.queueWarOrderV85(state, draft);
  if (!reserved.accepted) {
    assert.equal(reserved.state, state);
    return;
  }
  const before = JSON.stringify(reserved.state);
  const resolved = api.advanceWarTurnV85(reserved.state);
  assert.ok(api.readWarSimulationV85(resolved.state), 'the entire result must remain serializable under the same journal limit');
  assert.equal(JSON.stringify(reserved.state), before);
  if (!resolved.accepted) assert.equal(resolved.state, reserved.state, 'overflow refusal keeps every pending person and report');
});
