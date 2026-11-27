import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ops, qa, residence, saves } from './helpers/clan-ship-trophy-hearing-fixture.mjs';
import { completeLongMemoryAdmission, longMemoryAdmission } from './helpers/long-memory-r2-m055.mjs';

const model = qa.load('app/game/systems/ancientHearingR2M056.ts');

function act(save, order, roomId, context = {}) {
  const { expectedRevision = save.clanShipOperations.revision, ...flags } = context;
  return ops.actClanShipOperations(save.clanShipOperations, {
    type: 'ancient-hearing', order, expectedRevision,
  }, {
    ownerCreatedAt: save.createdAt, campaign: save, docking: { ...save.clanShipDocking, roomId },
    availableCrewIds: residence.availableClanResidenceCrew(save), crewPostRooms: residence.clanResidenceCrewPostRooms(save),
    ...flags,
  });
}

function next(save, order, room) {
  const result = act(save, order, room);
  assert.ok(result.accepted, result.message);
  assert.equal(result.clanMarksReward, 0);
  const nextSave = { ...save, clanShipOperations: result.state };
  const restored = saves.parseSaveImport(saves.exportSave(nextSave));
  assert.ok(restored.save, restored.failure);
  return restored.save;
}

for (const audience of ['local', 'intimate']) {
  test('R2-M056 prepares a ' + audience + ' hearing and preserves the past', () => {
    assert.equal(act(longMemoryAdmission(), 'open-register', 'archives').reason, 'ancient-hearing-access');
    const original = completeLongMemoryAdmission();
    assert.equal(act(original, 'open-register', 'hangar').reason, 'ancient-hearing-order');
    assert.equal(act(original, 'open-register', 'archives', {
      expectedRevision: original.clanShipOperations.revision - 1,
    }).reason, 'stale-revision');
    let save = next(original, 'open-register', 'archives');
    assert.equal(act(save, 'choose-' + audience, 'archives').reason, 'ancient-hearing-order');
    save = next(save, 'read-teaching', 'archives');
    assert.equal(act(save, 'read-teaching', 'archives').reason, 'ancient-hearing-order');
    save = next(save, 'read-hunt', 'hangar');
    const armorer = audience === 'local' ? 'hear-armorer' : 'read-workshop';
    assert.equal(act(save, 'hear-armorer', 'armurerie', { availableCrewIds: [] }).reason, 'ancient-hearing-order');
    assert.equal(act(save, 'hear-armorer', 'armurerie', { crewPostRooms: { 'iron-claw': 'conseil' } }).reason, 'ancient-hearing-order');
    save = next(save, armorer, 'armurerie');
    save = next(save, 'choose-' + audience, 'archives');
    assert.equal(act(save, 'reserve-post', 'hangar').reason, 'ancient-hearing-order');
    save = next(save, 'reserve-post', model.ANCIENT_HEARING_AUDIENCE[audience].room);
    const preparation = model.ancientHearingView(save.clanShipOperations.ancientHearing.orders, false);
    assert.deepEqual(preparation.collected, ['hunt', 'collective', 'teaching']);
    assert.equal(preparation.audience, audience);
    assert.equal(preparation.heardArmorer, audience === 'local');
    assert.equal(preparation.ready, true);
    assert.deepEqual(preparation.options, []);
    assert.equal(act(save, 'reserve-post', model.ANCIENT_HEARING_AUDIENCE[audience].room).reason, 'ancient-hearing-order');
    assert.deepEqual(save.profile, original.profile);
    assert.deepEqual(save.prologue, original.prologue);
    assert.deepEqual(save.originV151, original.originV151);
    assert.deepEqual(save.missionProgress, original.missionProgress);
    assert.deepEqual(save.clanShipOperations.longMemory, original.clanShipOperations.longMemory);
  });
}

test('R2-M056 import rejects a forged reservation or a lost founding receipt', () => {
  const before = completeLongMemoryAdmission();
  const started = next(before, 'open-register', 'archives');
  assert.equal(saves.parseSaveImport(saves.exportSave(before)).save.clanShipOperations.ancientHearing, undefined);
  for (const tamper of [
    save => { save.clanShipOperations.ancientHearing.orders.push('reserve-post'); },
    save => { delete save.clanShipOperations.longMemory; },
    save => { delete save.elderWorkshopV172; },
  ]) {
    const clone = structuredClone(started);
    tamper(clone);
    assert.equal(saves.parseSaveImport(JSON.stringify(clone)).failure, 'invalid-save');
  }
});
