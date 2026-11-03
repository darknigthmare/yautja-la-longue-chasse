import assert from 'node:assert/strict';
import test from 'node:test';
import { hunt, environment, playHunt, huntInput } from './helpers/solo-v67-played-route.mjs';

for (const route of ['ridge', 'ravine']) test(`played ${route} route: physical preparation, solid jumps, two traces, nonlethal mastery and nine ordered receipts`, () => {
  const run = playHunt({ route });
  assert.equal(run.state.route, route); assert.equal(run.state.attempts, 1);
  assert.deepEqual(run.receipts.map(r => r.id), [...hunt.SOLO_V67_PROOFS]);
  assert.equal(new Set(run.receipts.map(r => r.tick)).size, 9);
  assert.equal(run.snapshots.proof.prey.touches, 3); assert(run.snapshots.proof.prey.dodges >= 2);
  assert.equal(run.snapshots.return.prey.phase, 'gone');
  assert.equal(run.snapshots.debrief.milestones['mentor-report'], undefined);
  assert(Math.abs(run.state.player.x - 160) < 40);
});

test('frequent cold restoration preserves chosen path and disarms held actions', () => {
  const run = playHunt({ route: 'ravine', restoreEvery: 31 });
  assert.equal(run.receipts.length, 9); assert.equal(run.state.route, 'ravine');
  const restored = hunt.normalizeSoloV67State(run.snapshots.encounter);
  const held = hunt.stepSoloV67(restored, { move: 1, attack: true, interact: true }, environment).state;
  assert.equal(held.tick, restored.tick); assert.deepEqual(held.player, restored.player);
});
test('pause, hidden page and missing artwork freeze charges, health, movement and all milestone clocks', () => {
  const initial = playHunt({ stop: 'encounter' }).state;
  for (const change of [{ paused: true }, { pageVisible: false }, { assetsReady: false }]) {
    let state = structuredClone(initial);
    for (let i = 0; i < 240; i++) state = hunt.stepSoloV67(state, { move: 1, jump: true, attack: true }, { ...environment, ...change }).state;
    assert.equal(state.tick, initial.tick); assert.deepEqual(state.player, initial.player); assert.deepEqual(state.prey, initial.prey);
    assert.deepEqual(state.milestones, initial.milestones); assert.equal(state.inputArmed, false);
  }
});
test('taking four real charges forces a physical retreat; retry preserves trails but resets mastery', () => {
  const initial = playHunt({ stop: 'encounter' }).state;
  const failed = playHunt({ initial, stop: 'setback', input(s) {
    if (!s.inputArmed) return {};
    const distance = s.prey.x - s.player.x;
    return { move: Math.abs(distance) > 20 ? distance < 0 ? -1 : 1 : 0 };
  } });
  assert.equal(failed.state.player.health, 0); assert.equal(failed.state.clues, 2); assert.equal(failed.state.milestones.mastered, undefined);
  const resumed = playHunt({ initial: failed.state });
  assert.equal(resumed.state.attempts, 2); assert.equal(resumed.state.milestones['first-sign'], initial.milestones['first-sign']);
  assert.equal(resumed.snapshots.encounter.prey.touches, 0); assert.equal(resumed.snapshots.encounter.player.health, 100);
});
test('solid terrain blocks walking, and attack or distant interact cannot substitute for trace reading', () => {
  let s = playHunt({ stop: 'tracks' }).state;
  s = hunt.stepSoloV67(s, {}, environment).state;
  for (let i = 0; i < 700; i++) s = hunt.stepSoloV67(s, { move: 1, interact: true, attack: true }, environment).state;
  assert.equal(s.player.x, hunt.soloV67Rocks(s.route)[0].x - 17); assert.equal(s.clues, 0);
  assert.deepEqual(Object.keys(s.milestones), ['departure', 'prepared']);
});
test('the living retreat must finish before recording, and return/report require separate input edges', () => {
  const run = playHunt(), proof = run.snapshots.proof;
  assert.equal(proof.prey.phase, 'retreat'); assert.equal(proof.milestones['proof-secured'], undefined);
  let s = structuredClone(run.snapshots.debrief);
  for (let i = 0; i < 200; i++) s = hunt.stepSoloV67(s, { interact: true }, environment).state;
  assert.equal(s.phase, 'debrief'); assert.equal(s.milestones['mentor-report'], undefined);
  s = hunt.stepSoloV67(s, {}, environment).state;
  s = hunt.stepSoloV67(s, huntInput(s), environment).state; assert.equal(s.phase, 'complete');
});

test('charges announce within the narrowest portrait camera, with a full readable warning before movement', () => {
  let announced = 0; const orientations = new Set();
  playHunt({ onStep({ state }, before) {
    if (before.prey.phase === 'watch' && state.prey.phase === 'telegraph') {
      announced++;
      orientations.add(state.prey.facing);
      assert(Math.abs(state.prey.x - state.player.x) <= hunt.SOLO_V67_ENGAGE_DISTANCE);
      const projectedX = state.prey.x - hunt.soloV67CameraX(state, 320);
      assert(projectedX >= 0 && projectedX <= 320, 'animal center visible on either side of the minimum viewport');
    }
    if (before.prey.phase === 'telegraph' && state.prey.phase === 'charge') {
      assert(before.prey.timer >= 47); assert.equal(before.prey.x, state.prey.x);
    }
  } });
  assert(announced >= 2); assert.equal(orientations.size, 2);
});

test('ordinary 50ms input sampling completes the encounter without perfect one-frame automation', () => {
  let nextInput = {}, frames = 0;
  const run = playHunt({ input(s) { if (frames++ % 3 === 0) nextInput = huntInput(s); return nextInput; } });
  assert.equal(run.state.phase, 'complete'); assert.equal(run.state.attempts, 1);
});
