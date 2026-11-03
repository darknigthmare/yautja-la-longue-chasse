import assert from 'node:assert/strict';
import { test } from 'node:test';
import { thresholds as p, environment, playThresholds, thresholdsInput } from './helpers/solo-v69-played-route.mjs';

test('a physically played preparation uses sensing, three timed sas, real signal/return escort and twelve ordered proofs', () => {
  const run = playThresholds();
  assert.equal(run.state.phase, 'complete'); assert.deepEqual(run.receipts.map(r => r.id), [...p.SOLO_V69_PROOFS]);
  assert(run.state.walked > 11000); assert.equal(run.state.observedTurns, 2); assert.equal(run.state.observedTicks, 180);
  assert.equal(run.state.shadowPosts, 3); assert.equal(run.state.gatesCrossed, 3);
  assert(run.state.waitingSignal && run.state.scouted && run.state.trainee.reached); assert(run.state.escortSignals >= 3);
  assert(run.state.trainee.x >= 5300); assert(Math.abs(run.state.player.x - 160) < 38);
  assert(run.receipts.every((r, i) => r.sourceId === 'solo.thresholds.v69' && (!i || r.tick > run.receipts[i - 1].tick)));
  assert.equal('prey' in run.state, false, 'No renamed prey masquerades as a Temple xenomorph');
});

test('cold restoration clears held controls while preserving every branchless physical preparation proof', () => {
  const run = playThresholds({ restoreEvery: 83 });
  assert.equal(run.receipts.length, 12); assert.equal(run.state.trainee.reached, true);
  const restored = p.normalizeSoloV69State(JSON.parse(JSON.stringify(run.state)));
  assert(restored); assert.equal(restored.inputArmed, false); assert.equal(restored.previousInteract, false);
  assert.deepEqual(p.soloV69Receipts(restored), run.receipts);
});

test('asset failure, hidden page and pauses freeze patrol, gate expiry, observation and movement; release is mandatory', () => {
  const initial = playThresholds({ stop: 'gate-second' }).state;
  for (const env of [{ ...environment, assetsReady: false }, { ...environment, pageVisible: false }, { ...environment, paused: true }]) {
    const out = p.stepSoloV69(initial, { move: 1, interact: true, command: true }, env);
    assert.equal(out.state.tick, initial.tick); assert.equal(out.state.walked, initial.walked);
    assert.deepEqual(out.state.veteran, initial.veteran); assert.deepEqual(out.state.gateTimers, initial.gateTimers);
    assert.deepEqual(out.receipts, []); assert.equal(out.state.inputArmed, false);
    const held = p.stepSoloV69(out.state, { move: 1 }, environment); assert.equal(held.state.tick, initial.tick);
    const released = p.stepSoloV69(held.state, {}, environment); assert.equal(released.state.inputArmed, true);
  }
});

test('a real affleurement cuts the patrol sight line only at cover stance; the red alarm interrupts a post scan', () => {
  const base = playThresholds({ stop: 'stealth' }).state;
  const sight = { ...base, player: { ...base.player, x: 1580, y: 430, crouched: false }, veteran: { ...base.veteran, x: 1420, facing: 1 } };
  assert.equal(p.soloV69Detected(sight), true);
  assert.equal(p.soloV69Detected({ ...sight, player: { ...sight.player, crouched: true } }), false);
  let state = { ...base, player: { ...base.player, x: 1380, y: 430 }, veteran: { ...base.veteran, x: 1260, facing: 1 }, inputArmed: true, scan: 30 };
  const out = p.stepSoloV69(state, { interact: true }, environment);
  assert(out.state.alarm > 0); assert.equal(out.state.scan, 0); assert.equal(out.state.shadowPosts, 0); assert.deepEqual(out.receipts, []);
  state = p.stepSoloV69(out.state, { command: true, interact: true }, environment).state;
  assert.equal(state.shadowPosts, 0, 'A changed stance cannot acknowledge an outstanding alert');
});

test('portrait observation camera keeps the actual veteran in view while the player watches from the post', () => {
  const state = playThresholds({ stop: 'signals' }).transitions.find(t => t.before.phase === 'observation').before;
  for (const width of [320, 393, 960]) {
    const camera = p.soloV69CameraX(state, width);
    assert(state.veteran.x - camera >= 0 && state.veteran.x - camera <= width);
  }
});

test('a closed sas cannot be jumped, expiration preserves previous sas, and the far-side control prevents trapping', () => {
  let state = playThresholds({ stop: 'gate-second' }).state;
  // Declared physical boundary fixture: no receipt or successful crossing is injected.
  const gate = p.SOLO_V69_GATES[1];
  state = { ...state, player: { ...state.player, x: gate.x - 26, y: 430, vx: 0, vy: 0 }, inputArmed: true };
  const closed = p.stepSoloV69(state, { move: 1, jump: true }, environment);
  assert(closed.state.player.x <= gate.x - 25); assert.equal(closed.state.gatesCrossed, 1); assert.equal(closed.receipts.length, 0);
  const expired = { ...state, player: { ...state.player, x: gate.x + 45 }, gateTimers: [0, 1, 0], previousInteract: false };
  const decay = p.stepSoloV69(expired, {}, environment);
  assert.equal(decay.state.gateTimers[1], 0); assert.equal(decay.state.gatesCrossed, 1);
  const retry = p.stepSoloV69(decay.state, { interact: true }, environment);
  assert.equal(retry.state.gateTimers[1], gate.openTicks); assert.equal(retry.state.gatesCrossed, 1);
  const finished = playThresholds({ initial: retry.state }); assert.equal(finished.state.phase, 'complete');
});

test('an escort cannot be credited before waiting, scouting the calm side and actually retrieving the novice', () => {
  const start = playThresholds({ stop: 'escort' }).state;
  let state = start;
  for (let tick = 0; tick < 1200; tick++) state = p.stepSoloV69(state, { ...thresholdsInput(state), command: false }, environment).state;
  assert.equal(state.phase, 'escort'); assert.equal(state.trainee.x, 4300); assert.equal(state.trainee.following, false);
  assert.equal(state.waitingSignal, false); assert.equal(state.scouted, false); assert.equal(state.trainee.reached, false);
  assert.equal(p.soloV69Receipts(state).length, 8);
});

test('malformed future, anatomy, proof, timer and falsely completed preparation checkpoints are refused', () => {
  const completed = playThresholds().state;
  for (const mutate of [s => { s.version = 2; }, s => { s.walked = s.tick * 20; }, s => { s.trainee.reached = false; }, s => { s.observedTurns = 0; }, s => { s.gatesCrossed = 2; }, s => { s.gateTimers[0] = 999; }, s => { s.milestones['signals-read'] = s.milestones.briefed; }, s => { s.player.y = -40; }]) {
    const next = structuredClone(completed); mutate(next); assert.equal(p.normalizeSoloV69State(next), null);
  }
});
