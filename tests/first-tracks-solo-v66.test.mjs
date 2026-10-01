import assert from 'node:assert/strict';
import test from 'node:test';
import { solo, environment, playSolo } from './helpers/solo-v66-played-route.mjs';

test('native controls traverse three solid outcrops, reject the old trail, observe and return before seven ordered receipts', () => {
  const run = playSolo();
  assert.equal(run.state.falseTrailRead, true); assert.equal(run.state.attempts, 1);
  assert.deepEqual(run.receipts.map(r => r.id), [...solo.SOLO_V66_PROOFS]);
  assert.equal(new Set(run.receipts.map(r => r.tick)).size, 7);
  assert.equal(run.snapshots.return.observationTicks, solo.SOLO_V66_OBSERVE_TICKS);
  assert.equal(run.snapshots.debrief.milestones['mentor-report'], undefined);
  assert(Math.abs(run.state.player.x - solo.SOLO_V66_WORLD.mentorX) < 42);
});

test('every 31-frame restoration disarms held input without inventing progress, then the same route completes', () => {
  const run = playSolo({ restoreEvery: 31 });
  assert.equal(run.receipts.length, 7); assert(solo.normalizeSoloV66State(run.state));
  const restored = solo.normalizeSoloV66State(run.snapshots.stalk);
  const held = solo.stepSoloV66(restored, { move: 1, interact: true }, environment);
  assert.equal(held.state.tick, restored.tick); assert.equal(held.state.player.x, restored.player.x);
});

test('pause, hidden tab or missing art freezes physics, observation, gaze and all clocks', () => {
  const initial = playSolo({ stop: 'stalk' }).state;
  for (const changes of [{ paused: true }, { pageVisible: false }, { assetsReady: false }]) {
    let state = structuredClone(initial);
    for (let n = 0; n < 300; n++) state = solo.stepSoloV66(state, { move: 1, jump: true, interact: true }, { ...environment, ...changes }).state;
    assert.equal(state.tick, initial.tick); assert.deepEqual(state.player, initial.player);
    assert.deepEqual(state.milestones, initial.milestones); assert.equal(state.inputArmed, false);
  }
});

test('running openly at the animal causes a real setback; physically retreating permits a second attempt without losing clues', () => {
  const begin = playSolo({ stop: 'stalk' }).state;
  const failed = playSolo({ initial: begin, stop: 'setback', input: s => {
    if (!s.inputArmed) return {};
    const ahead = solo.SOLO_V66_ROCKS.find(r => r.x - 17 > s.player.x && r.x - 17 - s.player.x < 70);
    return { attack: true, move: s.player.x > 2560 ? 0 : 1, jump: !!ahead && s.player.vy === 0 && !s.previousJump };
  } });
  assert.equal(failed.state.alert, 100); assert.equal(failed.state.clues, 3); assert.equal(failed.state.milestones.observed, undefined);
  const recovered = playSolo({ initial: failed.state });
  assert.equal(recovered.state.attempts, 2); assert.equal(recovered.state.milestones['last-tracks'], begin.milestones['last-tracks']);
});

test('ordinary walking meets a solid cliff and distant interaction or attack never substitutes for observations', () => {
  let state = playSolo({ stop: 'trail' }).state;
  state = solo.stepSoloV66(state, {}, environment).state;
  for (let i = 0; i < 600; i++) state = solo.stepSoloV66(state, { move: 1, interact: true, attack: true }, environment).state;
  assert.equal(state.player.x, solo.SOLO_V66_ROCKS[0].x - 17); assert.equal(state.clues, 0);
  assert.equal(state.notice, 'no-attack'); assert.deepEqual(Object.keys(state.milestones), ['departure']);
});

test('future, malformed, premature terminal and out-of-order receipt snapshots are refused', () => {
  const run = playSolo();
  for (const mutate of [s => s.version = 2, s => s.phase = 'complete', s => s.clues = 3, s => s.player.x = NaN, s => s.milestones.observed = s.tick, s => s.observationTicks = 90]) {
    const state = structuredClone(run.snapshots.trail); mutate(state); assert.equal(solo.normalizeSoloV66State(state), null);
  }
  const invalid = structuredClone(run.state); invalid.milestones.returned = invalid.milestones.observed;
  assert.equal(solo.normalizeSoloV66State(invalid), null);
  for (const facing of ['1', '-1', true, [1]]) { const state = structuredClone(run.snapshots.trail); state.player.facing = facing; assert.equal(solo.normalizeSoloV66State(state), null); }
  for (const notice of [['none'], { toString: () => 'none' }]) { const state = structuredClone(run.snapshots.trail); state.notice = notice; assert.equal(solo.normalizeSoloV66State(state), null); }
});
