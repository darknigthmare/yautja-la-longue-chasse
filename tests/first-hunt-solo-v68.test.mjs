import assert from 'node:assert/strict';
import test from 'node:test';
import { cohort, playCohort, environment, cohortInput } from './helpers/solo-v68-played-route.mjs';

const ridge = playCohort(), ravine = playCohort({ route: 'ravine', restoreEvery: 103 });
test('both real routes bring a triad through the relay, charges, medical rescue and physical return', () => {
  for (const route of [ridge, ravine]) {
    assert.equal(route.state.phase, 'complete'); assert.deepEqual(route.receipts.map(r => r.id), cohort.SOLO_V68_PROOFS);
    assert(route.walked > 10_000, 'the outbound journey and physical return were played without teleportation');
    assert(route.state.companions.every(c => c.joined && !c.injured && Math.abs(c.x - route.state.player.x) < 300));
    assert.equal(route.state.prey.phase, 'gone'); assert.equal(route.state.prey.touches, 2); assert(route.state.prey.dodges >= 2);
    assert.equal(route.state.medicine, false); assert(route.snapshots.rescue.medicine); assert(route.snapshots.rescue.companions[0].injured);
    assert.equal(route.transitions.find(t => t.receipts[0]?.id === 'companion-stabilized').after.companions[0].injured, false);
  }
  assert.equal(ridge.state.route, 'ridge'); assert.equal(ravine.state.route, 'ravine');
});
test('no movement or proofs accrue during hidden, unloaded or paused scenes; held controls must be released', () => {
  const before = ridge.snapshots.encounter;
  for (const environment of [{ assetsReady: false, pageVisible: true, paused: false }, { assetsReady: true, pageVisible: false, paused: false }, { assetsReady: true, pageVisible: true, paused: true }]) {
    const out = cohort.stepSoloV68(before, { move: 1, jump: true, attack: true, interact: true }, environment);
    assert.equal(out.state.tick, before.tick); assert.deepEqual(out.state.player, before.player); assert.deepEqual(out.state.companions, before.companions); assert.deepEqual(out.receipts, []);
    const held = cohort.stepSoloV68(out.state, { move: 1 }, { assetsReady: true, pageVisible: true, paused: false }); assert.equal(held.state.tick, before.tick);
  }
});
test('an absent or waiting companion prevents the relay and final regrouping', () => {
  let state = structuredClone(ridge.snapshots.relay);
  state.companions[1].following = false;
  state = playCohort({ initial: state, stop: 'relay', input: () => ({}) }).state;
  for (let i = 0; i < 1500; i++) state = cohort.stepSoloV68(state, cohortInput(state), environment).state;
  assert.equal(state.phase, 'relay'); assert.equal(state.formationTicks, 0);
  // A held command is edge-triggered and cannot alternate the partner every tick.
  let near = structuredClone(ridge.snapshots.rescue); near.inputArmed = true;
  const out = cohort.stepSoloV68(near, { command: true }, environment).state;
  assert.equal(out.companions[0].injured, true, 'injured partner cannot be ordered to follow before treatment');
});
test('a nearby companion responds once to a fresh follow/wait command, and actually waits while the player moves', () => {
  let s = cohort.stepSoloV68(ridge.snapshots.route, {}, environment).state;
  assert(Math.abs(s.companions[1].x - s.player.x) < 85);
  s = cohort.stepSoloV68(s, { command: true }, environment).state; assert.equal(s.companions[1].following, false);
  const stoppedX = s.companions[1].x;
  for (let i = 0; i < 40; i++) s = cohort.stepSoloV68(s, { command: true, move: 1 }, environment).state;
  assert.equal(s.companions[1].following, false, 'holding the command never toggles the partner each frame');
  assert.equal(s.companions[1].x, stoppedX); assert(s.player.x > stoppedX + 100);
});
test('a refused confrontation can be retried at the physical regrouping marker without losing earned trail receipts', () => {
  let state = structuredClone(ridge.snapshots.encounter);
  state.player.health = 25;
  for (let i = 0; i < 4000 && state.phase !== 'setback'; i++) {
    const move = Math.abs(state.prey.x - 130 - state.player.x) > 6 ? state.player.x > state.prey.x - 130 ? -1 : 1 : 0;
    state = cohort.stepSoloV68(state, state.inputArmed ? { move } : {}, environment).state;
  }
  assert.equal(state.phase, 'setback'); assert.equal(state.player.health, 0);
  const run = playCohort({ initial: state, stop: 'encounter' }); assert.equal(run.state.attempts, 2); assert.equal(run.state.player.health, 100);
  assert.deepEqual(run.state.milestones, state.milestones); assert.equal(run.state.prey.touches, 0);
});
test('future, coercible, contradictory and physically embedded checkpoints are refused', () => {
  for (const change of [s => s.version = 2, s => s.phase = ['complete'], s => s.route = ['ridge'], s => s.player.facing = '1', s => s.companions[0].id = 'vek', s => s.companions[0].joined = false, s => s.medicine = true, s => s.formationTicks = 0, s => s.milestones.returned = 0, s => { s.player.x = 1080; s.player.y = 430; }]) {
    const copy = structuredClone(ridge.state); change(copy); assert.equal(cohort.normalizeSoloV68State(copy), null);
  }
});
