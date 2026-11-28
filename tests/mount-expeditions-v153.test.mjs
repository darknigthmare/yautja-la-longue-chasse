import assert from 'node:assert/strict';
import test from 'node:test';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const mounts = qa.load('app/game/systems/mobility/mountsV153.ts');
const field = qa.load('app/game/systems/mobility/mountExpeditionsV153.ts');
const riding = qa.load('app/game/systems/mobility/mountRidingV156.ts');
const saves = qa.load('app/game/save.ts');
const owner = '2026-11-28T13:00:00.000Z';

function campaign() {
  const save = saves.defaultSave(owner);
  save.profile = { ...save.profile, acquiredRankIdV166: 'blooded', rankId: 'blooded', clanMarks: 400 };
  return save;
}

function order(save, command, accepted = true) {
  const snapshot = JSON.stringify(save);
  const result = mounts.actMountsV153(save, { ownerCreatedAt: owner, expectedRevision: save.mountsV153?.revision ?? 0, ...command });
  assert.equal(result.accepted, accepted, result.message);
  assert.equal(JSON.stringify(save), snapshot);
  return !accepted ? save : { ...save, mountsV153: result.state, profile: { ...save.profile, clanMarks: result.clanMarks } };
}

function open(save, id) {
  return order(save, { type: 'begin-trial', mountId: id });
}

function move(save, position) {
  while (save.mountsV153.trial.fieldAt < position) {
    save = order(save, { type: 'step-trial', trialId: save.mountsV153.trial.id, direction: 1 });
  }
  return save;
}

function choose(save, stage, option, eventId, accepted = true) {
  return order(save, { type: 'trust-exercise', trialId: save.mountsV153.trial.id, exerciseId: stage.id, optionId: option, eventId }, accepted);
}

function acquire(save, id) {
  save = open(save, id);
  for (const [index, stage] of field.mountExpeditionV153(id).stages.entries()) {
    save = move(save, stage.position);
    save = choose(save, stage, stage.options[0].id, id.replaceAll('_', '-') + '-' + index);
  }
  assert.equal(save.mountsV153.trial.status, 'complete');
  const trialId = save.mountsV153.trial.id;
  order(save, { type: 'adopt', mountId: id, trialId, expectedCost: 180 }, false);
  return order(save, { type: 'recruit', mountId: id, trialId });
}

test('three field expeditions with separate evidence coexist alongside a legacy Kha’Rha', () => {
  let save = open(campaign(), 'kha_rha');
  for (const [index, stage] of mounts.KHA_RHA_TRUST_EXERCISES_V153.entries()) {
    save = choose(save, stage, stage.options.find(option => option.ok).id, 'kha-legacy-' + index);
  }
  save = order(save, { type: 'recruit', mountId: 'kha_rha', trialId: save.mountsV153.trial.id });
  const original = structuredClone(save.mountsV153.mounts[0]);
  assert.equal(Object.hasOwn(save.mountsV153, 'completedTrials'), false);
  for (const id of field.MOUNT_EXPEDITION_IDS_V153) save = acquire(save, id);
  const written = new Map();
  const local = { getItem: key => written.get(key) ?? null, setItem: (key, value) => written.set(key, value), removeItem: key => written.delete(key) };
  assert.ok(saves.writeSaveWithStatus(save, local).persisted);
  const restored = saves.loadSaveWithStatus(local).save;
  assert.equal(restored.mountsV153.completedTrials.length, 3);
  assert.deepEqual(restored.mountsV153.mounts[0], original);
  assert.deepEqual(restored.mountsV153.mounts.map(m => m.id), ['kha_rha', ...field.MOUNT_EXPEDITION_IDS_V153]);
  assert.deepEqual(restored.mountsV153.mounts.map(m => m.bond), [0, 0, 0, 0]);
  assert.equal(restored.profile.clanMarks, 400);
  assert.deepEqual(saves.parseSaveImport(saves.exportSave(restored)).save.mountsV153, restored.mountsV153);
  const forged = structuredClone(restored.mountsV153);
  forged.completedTrials[1].passed[0].eventId = forged.completedTrials[0].passed[0].eventId;
  assert.equal(mounts.inspectMountsV153(forged, owner).status, 'invalid-save');
  const missing = structuredClone(restored.mountsV153);
  missing.completedTrials.shift();
  assert.equal(mounts.inspectMountsV153(missing, owner).status, 'invalid-save');
});

test('a field expedition requires real positions, restrictions and a unique confirmation', () => {
  for (const id of field.MOUNT_EXPEDITION_IDS_V153) {
    const [first, second, third] = field.mountExpeditionV153(id).stages;
    const initial = open(campaign(), id);
    const trialId = initial.mountsV153.trial.id;
    assert.equal(initial.mountsV153.trial.fieldAt, 0);
    order(initial, { type: 'recruit', mountId: id, trialId }, false);
    order(initial, { type: 'step-trial', trialId, direction: first.position }, false);
    choose(initial, first, first.options[0].id, 'too-early', false);
    let save = move(initial, first.position);
    order(save, { type: 'step-trial', trialId, direction: 1 }, false);
    save = choose(save, first, first.options[0].id, 'first-ok');
    choose(save, third, third.options[0].id, 'third-early', false);
    save = move(save, second.position);
    choose(save, second, second.options[0].id, 'first-ok', false);
    save = choose(save, second, second.options[1].id, 'bad-method');
    assert.equal(save.mountsV153.trial.fieldAt, 0);
    assert.equal(save.mountsV153.trial.passed.length, 0);
    order(save, { type: 'recruit', mountId: id, trialId }, false);
    const exited = order(save, { type: 'leave-trial', trialId });
    assert.equal(exited.mountsV153.trial, null);
    assert.equal(exited.mountsV153.mounts.length, 0);
  }
});

test('every new species takes actual riding inputs and resumes the same mount and fatigue', () => {
  const moved = [];
  for (const id of field.MOUNT_EXPEDITION_IDS_V153) {
    let save = acquire(campaign(), id);
    assert.match(riding.mountRideRefusalV156(save.mountsV153, id), /50/);
    for (let session = 0; session < 10; session++) {
      save = order(save, { type: 'open-session', mountId: id });
      const sessionId = save.mountsV153.session.id;
      for (let step = 0; step < 3; step++) {
        save = order(save, { type: 'exercise', sessionId, condition: 'calm', exerciseId: 'groundwork', eventId: 'session-' + session + '-' + step });
      }
      save = order(save, { type: 'close-session', sessionId });
      save = order(save, { type: 'care', mountId: id, expectedCost: mounts.mountCareQuoteV153(save.mountsV153, id) });
    }
    assert.equal(save.mountsV153.mounts[0].bond, 50);
    const start = riding.actMountRideV156(save, { type: 'mount', mountId: id, ownerCreatedAt: owner, expectedRevision: 0 });
    assert.ok(start.accepted, start.message);
    save = { ...save, mountRidesV156: start.rides };
    const driving = riding.actMountRideV156(save, {
      type: 'ride', rideId: start.rides.active.id, ownerCreatedAt: owner, expectedRevision: 1,
      inputs: Array.from({ length: 60 }, () => ({ throttle: 1, steer: 0, brake: false, boost: false })),
    });
    assert.ok(driving.accepted, driving.message);
    assert.ok(driving.rides.active.course.x > start.rides.active.course.x);
    moved.push(driving.rides.active.course.distance);
    const restored = saves.parseSaveImport(saves.exportSave({ ...save, mountRidesV156: driving.rides })).save;
    assert.deepEqual(restored.mountRidesV156.active, driving.rides.active);
    const dismount = riding.actMountRideV156(restored, { type: 'dismount', rideId: driving.rides.active.id, ownerCreatedAt: owner, expectedRevision: 2 });
    assert.ok(dismount.accepted, dismount.message);
    assert.equal(dismount.rides.lastReport.mountId, id);
    assert.equal(dismount.rides.active, null);
    assert.ok(dismount.mounts.mounts[0].fatigue > 0);
    assert.equal(dismount.mounts.mounts[0].bond, 50);
  }
  assert.equal(new Set(moved).size, 3, 'les trois profils utilisent des statistiques de pied différentes');
});
