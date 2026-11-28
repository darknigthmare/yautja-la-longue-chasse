import assert from 'node:assert/strict';
import test from 'node:test';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const runtime = homeworldSceneSsrV78();
const mounts = runtime.load('app/game/systems/mobility/mountsV153.ts');
const war = runtime.load('app/game/systems/clanWarSpecializedV107.ts');
const { defaultSave } = runtime.load('app/game/save.ts');
const owner = '2026-11-28T10:00:00.000Z';
const mountId = 'kha_rha';
const trialId = 'trial-kha-rha';

function trainedMount() {
  let save = defaultSave(owner);
  save.profile = { ...save.profile, rankId: 'blooded', honor: 300, clanMarks: 10000 };
  const perform = command => {
    const result = mounts.actMountsV153(save, {
      ownerCreatedAt: owner, expectedRevision: save.mountsV153?.revision ?? 0, ...command,
    });
    assert(result.accepted, result.message);
    save = { ...save, mountsV153: result.state, profile: { ...save.profile, clanMarks: result.clanMarks } };
  };
  perform({ type: 'begin-trial', mountId });
  const trial = [['approach-without-fire', 'no-fire'], ['shared-scent', 'scent-first'], ['short-circuit', 'stop-return']];
  let event = 1;
  for (const [exerciseId, optionId] of trial)
    perform({ type: 'trust-exercise', trialId, exerciseId, optionId, eventId: 'w3-s10-' + event++ });
  perform({ type: 'recruit', mountId, trialId });
  assert.equal(war.createSpecializedMountW3S10(save).state, null);
  for (let i = 0; i < 5; i++) {
    perform({ type: 'open-session', mountId });
    const { id: sessionId } = save.mountsV153.session;
    for (let j = 0; j < 3; j++)
      perform({ type: 'exercise', sessionId, exerciseId: 'groundwork', condition: 'calm', eventId: 'w3-s10-' + event++ });
    perform({ type: 'close-session', sessionId });
    if (i < 4) perform({ type: 'care', mountId, expectedCost: mounts.mountCareQuoteV153(save.mountsV153, mountId) });
  }
  return save;
}

test('the war workshop replays a trained campaign mount through its real guides and the wide passage', () => {
  assert.equal(war.createSpecializedMountW3S10(defaultSave(owner)).state, null);
  assert.equal(war.createSpecializedV107('W3-S10').mounts.length, 2);
  const save = trainedMount();
  const original = structuredClone(save);
  const mount = save.mountsV153.mounts[0];
  assert.equal(mount.bond, 25);
  let { state } = war.createSpecializedMountW3S10(save);
  assert(state);
  assert.deepEqual(state.mounts.map(item => item.id), [mount.id]);
  assert.equal(state.mounts[0].fatigue, mount.fatigue);
  assert.equal(state.mountAdmission.trialId, mount.proof.trialId);
  const guards = state.actors.find(actor => actor.id === 'operator').team;
  assert.equal(guards.unitId, 'W3-U21');
  const run = action => war.applySpecializedV107(state, war.specializedCommandV107(state, action));
  const send = action => {
    const next = run(action);
    assert(next.accepted, next.message);
    state = next.state;
  };
  const walk = (x, y) => {
    let left = 100;
    while (left--) {
      const actor = state.actors.find(item => item.id === 'operator');
      const dx = x - actor.x, dy = y - actor.y, distance = Math.hypot(dx, dy);
      if (distance < .1) return;
      const scale = Math.min(18, distance) / distance;
      send({ type: 'move', actor: 'operator', dx: dx * scale, dy: dy * scale });
    }
    assert.fail('The operator did not reach the target');
  };
  const lead = { type: 'operate', operation: 'lead', target: mountId };
  assert.equal(run(lead).accepted, false);
  while (state.turn < state.actors[0].readyAt) send({ type: 'wait' });
  walk(190, 100);
  send(lead);
  assert.equal(run(lead).accepted, false);
  walk(360, 227);
  assert.equal(run({ type: 'move', actor: 'operator', dx: 18, dy: 0 }).accepted, false);
  walk(360, 380);
  walk(430, 380);

  const text = war.exportSpecializedV107(state);
  assert(text);
  assert.equal(war.importSpecializedV107(text).state, null);
  assert.equal(war.importSpecializedV107(text, undefined, { ...save, createdAt: '2026-11-27T10:00:00.000Z' }).state, null);
  const tampered = JSON.parse(text);
  tampered.mountAdmission.recruitedRevision++;
  assert.equal(war.importSpecializedV107(JSON.stringify(tampered), undefined, save).state, null);
  const resumed = war.importSpecializedV107(text, undefined, save);
  assert.deepEqual(resumed.state, state);
  state = resumed.state;
  walk(480, 380);
  send({ type: 'operate', operation: 'release', target: mountId });
  assert.deepEqual(state.actors[0].team.members, guards.members);
  assert.deepEqual(state.mounts.map(({ id, x, y, leadBy }) => ({ id, x, y, leadBy })),
    [{ id: mountId, x: 480, y: 380, leadBy: null }]);
  assert.deepEqual(save, original);
});
