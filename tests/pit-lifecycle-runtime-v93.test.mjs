import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';

const p = homeworldQaModelV64(process.cwd(), ['pitCombat.ts', 'pitRoundPresentation.ts', 'pitFinishersV80.ts',
  'pitLifecyclePresentationV93.ts', '../pitFighterPresentation.ts']);
const options = { mode: 'stylized', reducedGore: false, reducedMotion: false, narrative: false, replay: false, cpuWinner: false };
const fight = combat => ({ phase: 'fight', round: combat.round, elapsedMs: 650, durationMs: 650, blocksSimulation: false, resultVisible: false });
function played(winner) {
  let combat = p.createPitCombatState('jungle-hunter', 'city-hunter'), intermediate;
  for (let tick = 0; tick < 18000 && combat.phase !== 'match-over'; tick++) {
    const a = combat.fighters[winner], b = combat.fighters[1 - winner], inputs = [{}, {}];
    if (combat.phase === 'round') inputs[winner] = Math.abs(a.x - b.x) > 64 ? b.x > a.x ? { right: true } : { left: true }
      : a.phase === 'idle' && b.phase !== 'knockdown' && !b.wakeInvulnerabilityFrames ? { attack: 'heavy' } : {};
    combat = p.stepPitCombat(combat, inputs);
    if (!intermediate && combat.phase === 'round-over') intermediate = combat;
  }
  assert.equal(combat.phase, 'match-over'); assert.equal(combat.fighters[winner].roundsWon, 2);
  return { combat, intermediate };
}
const terminals = [played(0), played(1)];
function windowFor(combat, patch = {}) {
  const ready = p.observePitFinisherV80(p.createPitFinisherViewV80(), combat, 'played-terminal', { ...options, ...patch });
  return p.advancePitFinisherV80(ready, 100, true);
}
const fresh = () => p.createPitLifecyclePresentationV93();

test('voluntary gestures leave both engine ticks, opponent movement and save/replay geometry untouched', () => {
  let combat = p.createPitCombatState('jungle-hunter', 'city-hunter'), baseline = structuredClone(combat);
  const before = p.serializePitCombat(combat);
  let lifecycle = p.beginPitCombatTauntV93(fresh(), combat, fight(combat), 0, 1000, true);
  assert(lifecycle.combatTaunts[0]); assert.equal(p.serializePitCombat(combat), before);
  assert.equal(p.getPitFighterPresentationCue(0, p.pitLifecyclePresentationViewV93(fight(combat), combat, p.createPitFinisherViewV80(), lifecycle)).kind, 'taunt');
  assert.equal(p.getPitFighterPresentationCue(1, p.pitLifecyclePresentationViewV93(fight(combat), combat, p.createPitFinisherViewV80(), lifecycle)), null);
  const originalX = combat.fighters[1].x;
  for (let tick = 0; tick < 20; tick++) {
    const inputs = [{}, { left: true }];
    combat = p.stepPitCombat(combat, inputs); baseline = p.stepPitCombat(baseline, inputs);
    lifecycle = p.observePitCombatTauntsV93(lifecycle, combat, inputs);
    assert.deepEqual(combat, baseline); assert(lifecycle.combatTaunts[0]);
  }
  assert.equal(combat.frame, 20); assert(combat.fighters[1].x < originalX);
  assert.equal(combat.roundFramesRemaining, baseline.roundFramesRemaining);
  assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(combat)), combat);
  assert(!Object.keys(combat).some(key => /taunt|lifecycle|presentation/i.test(key)));
  const paused = p.pitLifecyclePresentationViewV93(fight(combat), combat, p.createPitFinisherViewV80(), lifecycle);
  assert.equal(p.getPitFighterPresentationCue(0, paused).elapsedMs, 20 * 1000 / 60);
  assert.deepEqual(p.pitLifecyclePresentationViewV93(fight(combat), combat, p.createPitFinisherViewV80(), lifecycle), paused,
    'No wall time can advance a gesture while the simulation tick is paused');
});

test('real movement, guard, jump, attack and resource input interrupt only the gesturing side', () => {
  for (const input of [{ left: true }, { right: true }, { down: true }, { jump: true }, { attack: 'light' },
    { throw: true }, { resource: true }, { guardHigh: true }, { guardLow: true }]) {
    const combat = p.createPitCombatState('jungle-hunter', 'city-hunter');
    let lifecycle = p.beginPitCombatTauntV93(fresh(), combat, fight(combat), 0, 1000, true);
    lifecycle = p.beginPitCombatTauntV93(lifecycle, combat, fight(combat), 1, 1000, true);
    const inputs = [input, {}], next = p.stepPitCombat(combat, inputs);
    lifecycle = p.observePitCombatTauntsV93(lifecycle, next, inputs);
    assert.equal(lifecycle.combatTaunts[0], null, JSON.stringify(input)); assert(lifecycle.combatTaunts[1]);
    const view = p.pitLifecyclePresentationViewV93(fight(next), next, p.createPitFinisherViewV80(), lifecycle);
    assert.equal(p.getPitFighterPresentationCue(0, view), null); assert.equal(p.getPitFighterPresentationCue(1, view).kind, 'taunt');
  }
});

test('a real opponent hit interrupts the native gesture and applies exactly the normal damage', () => {
  let combat = p.createPitCombatState('jungle-hunter', 'city-hunter');
  for (let tick = 0; tick < 500 && combat.fighters[1].x - combat.fighters[0].x > 64; tick++) combat = p.stepPitCombat(combat, [{ right: true }, { left: true }]);
  for (let tick = 0; tick < 10; tick++) combat = p.stepPitCombat(combat, [{}, {}]);
  let baseline = structuredClone(combat), lifecycle = p.beginPitCombatTauntV93(fresh(), combat, fight(combat), 0, 1000, true);
  assert(lifecycle.combatTaunts[0]); const health = combat.fighters[0].health;
  for (let tick = 0; tick < 80 && combat.fighters[0].health === health; tick++) {
    const inputs = [{}, tick === 0 ? { attack: 'heavy' } : {}];
    combat = p.stepPitCombat(combat, inputs); baseline = p.stepPitCombat(baseline, inputs);
    lifecycle = p.observePitCombatTauntsV93(lifecycle, combat, inputs);
    assert.deepEqual(combat, baseline);
  }
  assert(combat.fighters[0].health < health); assert.equal(lifecycle.combatTaunts[0], null);
  assert.equal(p.getPitFighterPresentationCue(0, p.pitLifecyclePresentationViewV93(fight(combat), combat, p.createPitFinisherViewV80(), lifecycle)), null);
});

test('gesture eligibility respects real neutral state, loaded dedicated art, pause, duration and round boundaries', () => {
  const combat = p.createPitCombatState('jungle-hunter', 'city-hunter'), current = fresh();
  for (const duration of [0, -1, Infinity, NaN, 10001]) assert.strictEqual(p.beginPitCombatTauntV93(current, combat, fight(combat), 0, duration, true), current);
  assert.strictEqual(p.beginPitCombatTauntV93(current, combat, fight(combat), 0, 1000, false), current);
  assert.strictEqual(p.beginPitCombatTauntV93(current, combat, fight(combat), 0, 1000, true, {}, true), current);
  assert.strictEqual(p.beginPitCombatTauntV93(current, combat, p.createPitRoundPresentation(combat), 0, 1000, true), current);
  assert.strictEqual(p.beginPitCombatTauntV93(current, combat, fight(combat), 0, 1000, true, { attack: 'heavy' }), current);
  for (const patch of [{ health: 0 }, { grounded: false }, { phase: 'hitstun' }, { guard: 'high' }, { crouching: true }, { velocityX: 1 }, { cloakPhase: 'active' }]) {
    const blocked = structuredClone(combat); Object.assign(blocked.fighters[0], patch);
    assert.strictEqual(p.beginPitCombatTauntV93(current, blocked, fight(blocked), 0, 1000, true), current);
  }
  let lifecycle = p.beginPitCombatTauntV93(current, combat, fight(combat), 0, 50, true), next = combat;
  assert.strictEqual(p.beginPitCombatTauntV93(lifecycle, combat, fight(combat), 0, 1000, true), lifecycle, 'No restart while active');
  for (let tick = 0; tick < 3; tick++) next = p.stepPitCombat(next, [{}, {}]);
  assert.equal(p.observePitCombatTauntsV93(lifecycle, next, [{}, {}]).combatTaunts[0], null);
  assert.equal(p.observePitCombatTauntsV93(lifecycle, terminals[0].intermediate, [{}, {}]).combatTaunts[0], null);
});

test('round defeat stays defeat; only the actual decisive KO choice window makes the loser dizzy', () => {
  for (const { combat, intermediate } of terminals) {
    const before = p.serializePitCombat(combat), winner = combat.fighters.find(fighter => fighter.roundsWon === 2).slot, loser = 1 - winner;
    const round = p.createPitRoundPresentation(intermediate), window = windowFor(combat);
    const intermediateView = p.pitLifecyclePresentationViewV93(round, intermediate, window, fresh());
    assert.strictEqual(intermediateView, round); assert.equal(p.getPitFighterPresentationCue(loser, round).kind, 'defeat');
    assert.equal(p.getPitFighterPresentationCue(loser, round).sourcePhase, 'round-result');
    const ceremony = p.createPitRoundPresentation(combat);
    assert.strictEqual(p.pitLifecyclePresentationViewV93(ceremony, combat, window, fresh()), ceremony);
    const ready = { ...ceremony, elapsedMs: ceremony.durationMs, resultVisible: true };
    const view = p.pitLifecyclePresentationViewV93(ready, combat, window, fresh());
    assert.equal(view.phase, 'finisher-window'); assert.equal(p.getPitFighterPresentationCue(winner, view).kind, 'finisher-ready');
    assert.equal(p.getPitFighterPresentationCue(loser, view).kind, 'dizzy'); assert.equal(combat.fighters[loser].health, 0);
    assert.equal(p.serializePitCombat(combat), before);
    for (const patch of [{ mode: 'off' }, { replay: true }]) {
      const excluded = windowFor(combat, patch);
      assert.strictEqual(p.pitLifecyclePresentationViewV93(ready, combat, excluded, fresh()), ready);
    }
    for (const patch of [{ matchWinnerId: null }, { lastRoundResult: { ...combat.lastRoundResult, reason: 'timeout' } }])
      assert.equal(p.pitLifecycleWindowWinnerV93({ ...combat, ...patch }, window), null);
  }
});

test('terminal winner taunt uses a separate native clock, never resets dizzy or the five-second choice window', () => {
  const combat = terminals[1].combat, before = p.serializePitCombat(combat);
  let finisher = windowFor(combat), lifecycle = fresh();
  for (let tick = 0; tick < 8; tick++) finisher = p.advancePitFinisherV80(finisher, 100, true);
  const original = finisher, round = { ...p.createPitRoundPresentation(combat), resultVisible: true };
  assert.strictEqual(p.beginPitLifecycleTauntV93(lifecycle, combat, finisher, 0, 1000, true), lifecycle);
  assert.strictEqual(p.beginPitLifecycleTauntV93(lifecycle, combat, finisher, 1, 1000, false), lifecycle);
  assert.strictEqual(p.beginPitLifecycleTauntV93(lifecycle, combat, finisher, 1, 1000, true, true), lifecycle);
  lifecycle = p.beginPitLifecycleTauntV93(lifecycle, combat, finisher, 1, 1000, true);
  assert(lifecycle.taunt); assert.strictEqual(p.beginPitLifecycleTauntV93(lifecycle, combat, finisher, 1, 1000, true), lifecycle);
  let view = p.pitLifecyclePresentationViewV93(round, combat, finisher, lifecycle);
  assert.equal(p.getPitFighterPresentationCue(1, view).elapsedMs, 0); assert.equal(p.getPitFighterPresentationCue(0, view).elapsedMs, 800);
  assert.strictEqual(p.advancePitLifecyclePresentationV93(lifecycle, combat, finisher, 60000, true), lifecycle);
  finisher = p.advancePitFinisherV80(finisher, 60000, true);
  lifecycle = p.advancePitLifecyclePresentationV93(lifecycle, combat, finisher, 60000);
  view = p.pitLifecyclePresentationViewV93(round, combat, finisher, lifecycle);
  assert.equal(p.getPitFighterPresentationCue(1, view).elapsedMs, 100); assert.equal(p.getPitFighterPresentationCue(0, view).elapsedMs, 900);
  assert.equal(original.elapsedMs, 800); assert.equal(finisher.durationMs, 5000);
  const selected = p.triggerPitFinisherV80(finisher, 1, 2);
  assert.equal(selected.phase, 'approach'); assert.equal(p.advancePitLifecyclePresentationV93(lifecycle, combat, selected, 100).taunt, null);
  assert.strictEqual(p.pitLifecyclePresentationViewV93(round, combat, selected, lifecycle), round);
  while (finisher.phase === 'window') finisher = p.advancePitFinisherV80(finisher, 100, true);
  assert.equal(finisher.phase, 'complete'); assert.equal(p.advancePitLifecyclePresentationV93(lifecycle, combat, finisher, 100).taunt, null);
  assert.equal(p.serializePitCombat(combat), before); assert.deepEqual(p.deserializePitCombat(before), combat);
});
