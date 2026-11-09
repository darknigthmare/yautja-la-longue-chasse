import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptTrophyTutorialCheckpointV6, actTrophyTutorialV6, createTrophyTutorialV6,
  inspectTrophyTutorialV6, planTrophyTutorialPathV6, stepTrophyTutorialPathV6,
  stepTrophyTutorialV6, trophyTutorialInReachV6, trophyTutorialStationV6,
  trophyTutorialStepV6, trophyTutorialWalkableV6,
  trophyTutorialObservedViewsV6,
  TROPHY_TUTORIAL_STEPS_V6, TROPHY_TUTORIAL_STATIONS_V6,
} from '../app/game/systems/trophyTutorialV6.ts';

const owner = '2026-11-09T12:00:00.000Z';
const good = [
  { open: true, railsRead: true, margin: 20 },
  { frameX: 50, frameY: 50, zoom: 60 },
  { traces: ['visible-mark', 'ground-reference'] },
  { cradle: 'fitted' },
  { leftAttachment: 23, rightAttachment: 77 },
  { provenance: 'local-model', closed: true },
  { rail: 100, sourceVisible: true },
  { screening: 'unknown', handling: 'teaching-model' },
  { views: ['reverse', 'face', 'profile'] },
  { fragileObserved: true, markObserved: true, initialSaved: true },
  { fibre: 'detachable', indexed: true },
  { support: 25, pattern: 75 },
  { pieces: [1, 2, 3] },
  { base: 'compatible', balance: 50 },
  { angle: 30 },
  { plaqueFacts: ['model-provenance', 'observed-mark', 'uncertain-age'] },
  { railLocks: ['left', 'right'] },
  { cycle: ['closed', 'margin-checked', 'reopened'], margin: 20, confirm: true },
];
function walkTo(state, target) {
  let path = planTrophyTutorialPathV6(state, target), frames = 0;
  assert.ok(path.length, 'real authored floor has a continuous path');
  while (path.length && frames++ < 1500) {
    const result = stepTrophyTutorialPathV6(state, path, .05);
    state = result.state; path = result.remaining;
    assert.ok(trophyTutorialWalkableV6(state.actor));
  }
  assert.equal(path.length, 0, 'actor reaches target without teleporting');
  assert.ok(Math.hypot(state.actor.x - target.x, state.actor.y - target.y) < .5);
  return state;
}
function reach(state) { return walkTo(state, trophyTutorialStationV6(trophyTutorialStepV6(state).station).point); }
function observeViews(state, onAccepted) {
  for (const view of ['face', 'profile', 'reverse']) {
    const result = actTrophyTutorialV6(state, { step: 9, partial: 'view', values: { view } });
    assert.ok(result.accepted, result.message); state = result.state; onAccepted?.(state);
  }
  return state;
}
function play(completed, onAccepted) {
  let state = createTrophyTutorialV6(owner);
  for (let n = 1; n <= completed; n++) {
    state = reach(state);
    if (n === 9) state = observeViews(state, onAccepted);
    const result = actTrophyTutorialV6(state, { step: n, values: good[n - 1] });
    assert.ok(result.accepted, `${n}: ${result.message}`); state = result.state; onAccepted?.(state);
  }
  return state;
}
function rejectAt(number, values) {
  const state = reach(play(number - 1)), before = JSON.stringify(state);
  const result = actTrophyTutorialV6(state, { step: number, values });
  assert.equal(result.accepted, false); assert.equal(result.state, state);
  assert.equal(JSON.stringify(state), before);
}

test('TR-M01..03 define exactly six gestures each, with physical posts', () => {
  assert.deepEqual(TROPHY_TUTORIAL_STEPS_V6.map(s => s.number), Array.from({ length: 18 }, (_, i) => i + 1));
  for (const mission of ['TR-M01', 'TR-M02', 'TR-M03']) assert.equal(TROPHY_TUTORIAL_STEPS_V6.filter(s => s.mission === mission).length, 6);
  for (const step of TROPHY_TUTORIAL_STEPS_V6) assert.ok(TROPHY_TUTORIAL_STATIONS_V6.some(s => s.id === step.station));
});
test('old absent activity, explicit null, foreign owner and future ledgers remain distinct', () => {
  assert.equal(inspectTrophyTutorialV6(undefined, owner).status, 'absent');
  for (const legacyOwner of ['', 'not-an-iso-owner']) {
    assert.equal(inspectTrophyTutorialV6(undefined, legacyOwner).status, 'absent');
    for (const raw of [null, {}, { version: 2 }, createTrophyTutorialV6(owner)]) {
      assert.equal(inspectTrophyTutorialV6(raw, legacyOwner).status, 'invalid');
    }
  }
  assert.equal(inspectTrophyTutorialV6(null, owner).status, 'invalid');
  assert.equal(inspectTrophyTutorialV6(createTrophyTutorialV6(owner), '2026-11-10T12:00:00Z').status, 'invalid');
  assert.equal(inspectTrophyTutorialV6({ version: 2 }, owner).status, 'future');
  assert.throws(() => createTrophyTutorialV6('not-a-campaign'));
});
test('18 actual floor journeys and gestures end with one unique pedagogical model at the cabinet', () => {
  const state = play(18);
  assert.equal(state.completedSteps, 18); assert.equal(state.revision, 21);
  assert.equal(state.events.filter(event => !event.partial).length, 18); assert.equal(state.objectLocation, 'cabinet');
  assert.equal(state.objectId, `tutorial-model:${owner}`); assert.ok(state.walked > 1800);
  assert.equal(trophyTutorialStepV6(state), null);
  assert.equal(actTrophyTutorialV6(state, { step: 18, values: good[17] }).accepted, false);
  for (const forbidden of ['trophies', 'rank', 'xp', 'reward', 'marks']) assert.equal(Object.hasOwn(state, forbidden), false);
});
test('a good gesture from a distant point cannot manipulate the physical niche', () => {
  const state = createTrophyTutorialV6(owner);
  assert.equal(trophyTutorialInReachV6(state), false);
  const result = actTrophyTutorialV6(state, { step: 1, values: good[0] });
  assert.equal(result.accepted, false); assert.equal(result.state, state);
  assert.equal(reach(state).completedSteps, 0, 'walking does not auto-complete a gesture');
});
test('skipped or repeated gestures preserve the last stable checkpoint', () => {
  const state = reach(play(2));
  for (const n of [1, 2, 4, 19]) assert.equal(actTrophyTutorialV6(state, { step: n, values: good[2] }).accepted, false);
});
test('a closed niche or insufficient margin cannot be passed', () => {
  rejectAt(1, { ...good[0], open: false }); rejectAt(1, { ...good[0], margin: 8 });
});
test('source observation requires object, ground and fixed reference in one frame', () => {
  rejectAt(2, { frameX: 10, frameY: 50, zoom: 60 });
  rejectAt(2, { frameX: 50, frameY: 50, zoom: 95 });
});
test('an unobserved kill cannot be smuggled into the discovery record', () => {
  rejectAt(3, { traces: ['visible-mark', 'ground-reference', 'invented-kill'] });
  rejectAt(3, { traces: ['visible-mark'] });
});
test('cradle and attachments must preserve the model and its central mark', () => {
  rejectAt(4, { cradle: 'narrow' }); rejectAt(4, { cradle: 'oversize' });
  rejectAt(5, { leftAttachment: 45, rightAttachment: 55 });
});
test('transport starts only after a real local provenance and closed container', () => {
  rejectAt(6, { provenance: 'invented-hunt', closed: true });
  rejectAt(6, { provenance: 'local-model', closed: false });
  const state = play(6); assert.equal(state.objectLocation, 'carried-to-admission');
});
test('all six object transfers require a walked distance, even if a test changes only the actor point', () => {
  for (const n of [4, 7, 9, 12, 15, 17]) {
    const previous = play(n - 1), target = trophyTutorialStationV6(TROPHY_TUTORIAL_STEPS_V6[n - 1].station).point;
    const forged = { ...previous, actor: { ...target, facing: 1 } };
    assert.equal(actTrophyTutorialV6(forged, { step: n, values: good[n - 1] }).accepted, false, String(n));
    const walked = n === 9 ? observeViews(reach(previous)) : reach(previous);
    assert.ok(actTrophyTutorialV6(walked, { step: n, values: good[n - 1] }).accepted);
  }
});
test('rail admission cannot hide the source or leave the crate halfway', () => {
  rejectAt(7, { rail: 50, sourceVisible: true }); rejectAt(7, { rail: 100, sourceVisible: false });
});
test('the unknown screen never grants fictional clearance to open an original', () => {
  rejectAt(8, { screening: 'safe', handling: 'teaching-model' });
  rejectAt(8, { screening: 'unknown', handling: 'open-original' });
});
test('three distinct views and an intact initial observation are required', () => {
  rejectAt(9, { views: ['face', 'face', 'reverse'] });
  rejectAt(10, { fragileObserved: true, markObserved: true, initialSaved: false });
});
test('only the indexed detachable fibre can be lifted', () => {
  rejectAt(11, { fibre: 'attached-mark', indexed: true });
  rejectAt(11, { fibre: 'detachable', indexed: false });
});
test('stabilizer, numbered pieces and base each have a distinct rejection', () => {
  rejectAt(12, { support: 25, pattern: 25 }); rejectAt(13, { pieces: [2, 1, 3] });
  rejectAt(14, { base: 'unstable', balance: 50 }); rejectAt(14, { base: 'compatible', balance: 10 });
});
test('light and plaque never turn an unknown history into a trophy claim', () => {
  rejectAt(15, { angle: 70 });
  rejectAt(16, { plaqueFacts: ['model-provenance', 'observed-mark', 'invented-kill'] });
  rejectAt(16, { plaqueFacts: ['model-provenance'] });
});
test('the cabinet requires both locks and close/check/reopen in that order', () => {
  rejectAt(17, { railLocks: ['left'] }); rejectAt(18, { ...good[17], cycle: ['closed', 'reopened'] });
  rejectAt(18, { ...good[17], margin: 4 }); rejectAt(18, { ...good[17], confirm: false });
});
test('three interruptions restore a discovery, a partial face inspection and a ready plaque without replay', () => {
  for (const count of [3, 8, 16]) {
    const state = play(count), raw = JSON.stringify(state);
    const restored = inspectTrophyTutorialV6(JSON.parse(raw), owner);
    assert.equal(restored.status, 'valid'); assert.deepEqual(restored.state, state);
    let next = reach(restored.state);
    if (count === 8) {
      next = actTrophyTutorialV6(next, { step: 9, partial: 'view', values: { view: 'face' } }).state;
      const mid = inspectTrophyTutorialV6(JSON.parse(JSON.stringify(next)), owner);
      assert.equal(mid.status, 'valid'); assert.deepEqual(trophyTutorialObservedViewsV6(mid.state), ['face']);
      next = mid.state;
      for (const view of ['profile', 'reverse']) next = actTrophyTutorialV6(next, { step: 9, partial: 'view', values: { view } }).state;
    }
    const result = actTrophyTutorialV6(next, { step: count + 1, values: good[count] });
    assert.equal(result.accepted, true); assert.equal(result.state.completedSteps, count + 1);
    assert.equal(result.state.objectId, state.objectId);
  }
});
test('face observations are individually durable, cannot repeat and do not prematurely complete gesture9', () => {
  const before = reach(play(8));
  assert.equal(actTrophyTutorialV6(before, { step: 9, values: good[8] }).accepted, false);
  const face = actTrophyTutorialV6(before, { step: 9, partial: 'view', values: { view: 'face' } });
  assert.ok(face.accepted); assert.equal(face.state.completedSteps, 8);
  assert.equal(face.state.objectLocation, 'inspection');
  assert.equal(actTrophyTutorialV6(face.state, { step: 9, partial: 'view', values: { view: 'face' } }).accepted, false);
  assert.equal(actTrophyTutorialV6(face.state, { step: 9, partial: 'view', values: { view: 'invented-back' } }).accepted, false);
});
test('the campaign checkpoint accepts one next event but refuses stale, skipped and forked histories', () => {
  let stored;
  play(18, candidate => {
    const accepted = acceptTrophyTutorialCheckpointV6(stored, candidate, owner);
    assert.ok(accepted); assert.deepEqual(accepted, candidate);
    assert.equal(acceptTrophyTutorialCheckpointV6(accepted, candidate, owner), null, 'a repeated confirmation is not a new commit');
    stored = accepted;
  });
  assert.equal(acceptTrophyTutorialCheckpointV6(undefined, play(2), owner), null);
  const current = play(2), fork = structuredClone(play(3)); fork.events[0].values.margin = 21;
  assert.equal(inspectTrophyTutorialV6(fork, owner).status, 'valid');
  assert.equal(acceptTrophyTutorialCheckpointV6(current, fork, owner), null);
});
test('tampered progression, unsupported source facts, duplicate object and out-of-floor saves are not normalized away', () => {
  const valid = play(10);
  for (const mutate of [s => s.completedSteps++, s => s.revision++, s => s.objectId = 'another-model', s => s.objectLocation = 'cabinet', s => s.events[2].values.traces.push('invented-kill'), s => s.actor.x = -40]) {
    const raw = structuredClone(valid); mutate(raw);
    assert.equal(inspectTrophyTutorialV6(raw, owner).status, 'invalid');
  }
});
test('movement clamps frame gaps, rejects nonfinite input and cannot cross a bench footprint', () => {
  const state = createTrophyTutorialV6(owner);
  for (const seconds of [-1, 0, NaN, Infinity]) assert.equal(stepTrophyTutorialV6(state, { x: 1, y: 0 }, seconds), state);
  assert.equal(stepTrophyTutorialV6(state, { x: Infinity, y: 0 }, .05), state);
  const normal = stepTrophyTutorialV6(state, { x: 1, y: 0 }, .05), stalled = stepTrophyTutorialV6(state, { x: 1, y: 0 }, 10);
  assert.deepEqual(stalled, normal);
  let below = { ...state, actor: { x: 550, y: 430, facing: 1 } };
  for (let n = 0; n < 50; n++) below = stepTrophyTutorialV6(below, { x: 0, y: -1 }, .05);
  assert.ok(below.actor.y >= 408); assert.ok(trophyTutorialWalkableV6(below.actor));
});
test('each workstation has continuous outbound and return paths on the authored floor', () => {
  let state = createTrophyTutorialV6(owner);
  for (const station of TROPHY_TUTORIAL_STATIONS_V6) state = walkTo(state, station.point);
  state = walkTo(state, { x: 140, y: 535 });
  assert.equal(state.completedSteps, 0); assert.equal(state.objectLocation, 'field');
});
