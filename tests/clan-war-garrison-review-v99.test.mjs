import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const bundled = await build({
  stdin: { contents: `export * from './app/game/systems/clanWarV85'; export * from './app/game/systems/clanWarPlanetsV96'; export * from './app/game/systems/clanWarCommandV98';`, resolveDir: process.cwd() },
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const change = (state, id, garrison, extra = {}) => {
  const actor = state.combatants.find(person => person.id === id);
  return api.changeWarGarrisonV99(state, { territoryId: actor.territoryId, combatantId: id, garrison, ...extra });
};
const immutableFacts = state => {
  const facts = structuredClone(state);
  delete facts.revision;
  delete facts.reports;
  for (const person of facts.combatants) delete person.garrison;
  return facts;
};

test('review: repeated local reliefs preserve every physical person and archive contract on thirty worlds', () => {
  for (const planet of api.WAR_PLANETS_V96) {
    let state = api.createWarSimulationV85(518, planet.id);
    const original = structuredClone(state), facts = immutableFacts(state);
    // P07 is physically at T02 with the existing P02 guard. Round trips test
    // state composition and report IDs, rather than reimplementing validation.
    for (let cycle = 0; cycle < 4; cycle++) {
      for (const [id, duty] of [['P07', true], ['P02', false], ['P02', true], ['P07', false]]) {
        const before = structuredClone(state), result = change(state, id, duty);
        assert.equal(result.accepted, true, `${planet.id}/${cycle}/${id}`);
        assert.deepEqual(state, before, 'accepted changes cannot mutate the caller');
        state = result.state;
        assert.deepEqual(immutableFacts(state), facts);
        const restored = api.readWarSimulationV85(JSON.parse(JSON.stringify(state)));
        assert.deepEqual(restored, state, `${planet.id}: relief remains importable`);
        assert.equal(api.validWarPlanetArchiveRawV96(JSON.stringify(state), planet.id), true);
        assert.equal(api.validWarPlanetArchiveRawV96(JSON.stringify(state), api.WAR_PLANETS_V96.find(other => other.id !== planet.id).id), false);
      }
    }
    assert.equal(state.revision, original.revision + 16);
    assert.equal(new Set(state.reports.map(report => report.id)).size, state.reports.length);
    assert.deepEqual(state.combatants, original.combatants);
    assert.deepEqual(api.warCommandV98(state), api.warCommandV98(original));
  }
});

test('review: a sealed order keeps its same person reserved through archive restore and only cancellation permits relief', () => {
  const initial = api.createWarSimulationV85(518);
  const queued = api.queueWarOrderV85(initial, { kind: 'recon', fromId: 'CON-T02', targetId: api.warTerritoryForSimulationV96(initial, 'CON-T02').neighbors[0], combatantIds: ['P07'], cargo: { s: 0, m: 0, i: 0 } });
  assert.equal(queued.accepted, true);
  const restored = api.readWarSimulationV85(JSON.parse(JSON.stringify(queued.state)));
  assert.ok(restored);
  const bytes = JSON.stringify(restored), denied = change(restored, 'P07', true);
  assert.equal(denied.accepted, false);
  assert.equal(denied.state, restored);
  assert.equal(JSON.stringify(restored), bytes);
  const cancelled = api.cancelWarOrderV85(restored, restored.orders[0].id);
  const relieved = change(cancelled, 'P07', true);
  assert.equal(relieved.accepted, true);
  assert.deepEqual(relieved.state.stocks, initial.stocks);
  assert.deepEqual(relieved.state.orders, []);
  assert.equal(api.readWarSimulationV85(relieved.state).combatants.find(actor => actor.id === 'P07').garrison, true);
});

test('review: wounded guards do not bypass the final fit guard confirmation and control changes revoke it', () => {
  const state = api.createWarSimulationV85(518);
  Object.assign(state.combatants.find(actor => actor.id === 'P07'), { garrison: true, status: 'wounded' });
  const unchanged = JSON.stringify(state), denied = change(state, 'P02', false);
  assert.equal(denied.accepted, false);
  assert.equal(denied.state, state);
  assert.equal(JSON.stringify(state), unchanged);
  const confirmed = change(state, 'P02', false, { confirmLastGuard: true });
  assert.equal(confirmed.accepted, true);
  assert.equal(api.warGarrisonV85(confirmed.state, 'CON-T02').length, 0);
  assert.equal(confirmed.state.combatants.find(actor => actor.id === 'P07').status, 'wounded');
  const captured = structuredClone(state); captured.territories['CON-T02'].controller = 'CON-F02';
  assert.equal(change(captured, 'P02', false, { confirmLastGuard: true }).accepted, false);
  assert.equal(change(captured, 'P07', false, { confirmLastGuard: true }).accepted, false);
  assert.deepEqual(api.readWarSimulationV85(confirmed.state), confirmed.state);
});

test('review: the last archive revision is writable, refusal is exact, and imported punctuation never changes identity', () => {
  const state = api.createWarSimulationV85(518);
  state.revision = 999999;
  const actor = state.combatants.find(person => person.id === 'P07');
  actor.id = 'P07"[]\\ : identité importée';
  assert.ok(api.readWarSimulationV85(state));
  const result = change(state, actor.id, true);
  assert.equal(result.accepted, true);
  assert.equal(result.state.revision, 1000000);
  assert.equal(result.state.combatants.find(person => person.id === actor.id).garrison, true);
  assert.deepEqual(api.readWarSimulationV85(result.state), result.state);
  const full = JSON.stringify(result.state), denied = change(result.state, actor.id, false);
  assert.equal(denied.accepted, false);
  assert.equal(denied.state, result.state);
  assert.equal(JSON.stringify(result.state), full);
});
