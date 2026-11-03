import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: `export * from './app/game/systems/pitCombat'; export * from './app/game/systems/pitImpactFeedback';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false });
const p = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

for (const blocked of [false, true]) test(`real ${blocked ? 'guard' : 'hit'} feedback survives subsequent resource events in the same tick`, () => {
  let state = p.createPitCombatState('feral-hunter', 'jungle-hunter', { mode: 'training' });
  state.fighters[0].x = 300; state.fighters[1].x = 510;
  let contacts = 0, suppressedByOldCondition = 0;
  for (let frame = 0; frame < 95; frame++) {
    state = p.stepPitCombat(state, [{ attack: frame === 0 ? 'technique' : undefined }, blocked ? { guardHigh: true } : {}]);
    const event = state.events.findLast(event => event.type === 'hit' || event.type === 'block');
    const before = p.serializePitCombat(state), feedback = p.getPitImpactFeedback(state);
    assert.equal(p.serializePitCombat(state), before, 'presentation must not mutate replay state');
    if (!event) { assert.equal(feedback, null); continue; }
    contacts++;
    assert(feedback);
    assert.equal(feedback.blocked, blocked);
    assert.equal(feedback.frame, state.frame);
    assert.equal(feedback.x, state.fighters[1].x);
    assert.equal(feedback.y, p.PIT_ARENAS[state.arenaId].groundY - state.fighters[1].y - 64);
    if (state.events.at(-1).type === 'traque-gain') suppressedByOldCondition++;
  }
  assert(contacts > 0, 'the actual engine must emit an impact');
  assert(suppressedByOldCondition > 0, 'this test reproduces the real ordering regression');
});

test('a resource-only or empty tick cannot invent an impact or change the state', () => {
  let state = p.createPitCombatState('falconer', 'city-hunter', { mode: 'training' });
  let resources = 0;
  for (let frame = 0; frame < 70; frame++) {
    state = p.stepPitCombat(state);
    if (state.events.some(event => event.type === 'traque-gain')) resources++;
    assert.equal(p.getPitImpactFeedback(state), null);
  }
  assert(resources > 0);
});
