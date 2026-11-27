import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ops, qa, residence, saves } from './helpers/clan-ship-trophy-hearing-fixture.mjs';
import { completeLongMemoryAdmission, longMemoryAdmission } from './helpers/long-memory-r2-m055.mjs';

import { elderAssemblyBeforeRelief, narrativeLongMemoryAdmission } from './helpers/senior-rite-campaign.mjs';

const chronicle = qa.load('app/game/systems/clanChronicle.ts');
const assembly = qa.load('app/game/systems/elderAssemblyV168.ts');
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
  const nextSave = { ...save, clanShipOperations: result.state,
    ...(result.ancientChronicle ? { prologue: { ...save.prologue, chronicle: result.ancientChronicle } } : {}) };
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
    assert.deepEqual(preparation.options, [{ order: 'recover-debt', room: 'archives' }]);
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


const witnesses = [
  ['open-register', 'archives'], ['read-hunt', 'hangar'], ['read-workshop', 'armurerie'], ['read-teaching', 'archives'],
];
const debt = model.ANCIENT_DEBT_POSTS.map(post => [post.order, post.room]);

test('a historical adult can deliver the remedy for Oseris while advancement waits for a narrative Elder', () => {
  let save = completeLongMemoryAdmission();
  for (const [order, room] of [...witnesses, ['choose-local', 'archives'], ['reserve-post', 'conseil'], ...debt]) {
    save = next(save, order, room);
  }
  const view = model.ancientHearingView(save.clanShipOperations.ancientHearing.orders, false);
  assert.equal(view.debtSettled, true);
  assert.equal(view.years, 0);
  assert.equal(act(save, 'first-relief', 'conseil').accepted, false);
  assert.equal(act(save, 'recognize', 'conseil').accepted, false);
  assert.equal(save.prologue == null, true);
});

test('Elder relief persists only together with the chronicle and retains prior choices', () => {
  const initial = elderAssemblyBeforeRelief();
  const operation = { type: 'confirm-relief' };
  const command = { expectedRevision: initial.elderAssemblyV168.revision, operation };
  assert.equal(assembly.commitElderAssembly({ ...initial, elderMentoringV168: null }, command).ok, false);
  assert.equal(assembly.commitElderAssembly({ ...initial, eliteRecognitionV174: null }, command).ok, false);
  assert.equal(chronicle.getChronicleRank(initial.prologue.chronicle), 'elite');
  const result = assembly.commitElderAssembly(initial, command);
  assert.equal(result.ok, true, result.message);
  for (const isolated of [{ prologue: result.prologue }, { elderAssemblyV168: result.state }]) {
    assert.equal(saves.parseSaveImport(JSON.stringify({ ...initial, ...isolated })).failure, 'invalid-save');
  }
  const complete = { ...initial, elderAssemblyV168: result.state, prologue: result.prologue };
  const parsed = saves.parseSaveImport(saves.exportSave(complete));
  assert.ok(parsed.save, parsed.failure);
  assert.equal(chronicle.getChronicleRank(parsed.save.prologue.chronicle), 'elder');
  assert.equal(parsed.save.elderAssemblyV168.responsibility, initial.elderAssemblyV168.responsibility);
  assert.equal(assembly.commitElderAssembly(complete, command).ok, false);
});

test('Ancient requires the settled debt, three relèves, observed transmission and the chosen post', () => {
  let save = narrativeLongMemoryAdmission();
  assert.equal(chronicle.getChronicleRank(save.prologue.chronicle), 'elder');
  for (const [order, room] of [...witnesses, ['choose-intimate', 'archives'], ['reserve-post', 'archives']]) save = next(save, order, room);
  assert.equal(act(save, 'prepare-aid', 'armurerie').accepted, false);
  assert.equal(act(save, 'first-relief', 'conseil').accepted, false);
  assert.equal(act(save, 'recognize', 'archives').accepted, false);
  for (const [order, room] of debt) save = next(save, order, room);
  for (const post of model.ANCIENT_SERVICE_POSTS) {
    const wrongRoom = post.room === 'hangar' ? 'archives' : 'hangar';
    assert.equal(act(save, post.order, wrongRoom).accepted, false);
    save = next(save, post.order, post.room);
  }
  const advanced = model.ancientHearingView(save.clanShipOperations.ancientHearing.orders, false, true);
  assert.equal(advanced.years, 325);
  assert.equal(advanced.debtSettled, true);
  assert.equal(chronicle.getChronicleRank(save.prologue.chronicle), 'elder');
  assert.equal(act(save, 'recognize', 'hangar').accepted, false);
  const rite = act(save, 'recognize', 'archives');
  assert.ok(rite.ancientChronicle);
  for (const isolated of [
    { prologue: { ...save.prologue, chronicle: rite.ancientChronicle } },
    { clanShipOperations: rite.state },
    { elderAssemblyV168: { ...save.elderAssemblyV168, generationHandover: false } },
  ]) assert.equal(saves.parseSaveImport(JSON.stringify({ ...save, ...isolated })).failure, 'invalid-save');
  const final = next(save, 'recognize', 'archives');
  assert.equal(model.ancientHearingRecognized(final.clanShipOperations.ancientHearing), true);
  assert.equal(chronicle.getChronicleRank(final.prologue.chronicle), 'ancient');
  assert.equal(act(final, 'recognize', 'archives').accepted, false);
  assert.equal(model.ancientHearingSaveSuccessor(final.clanShipOperations.ancientHearing, save.clanShipOperations.ancientHearing), false);
  assert.deepEqual(final.missionProgress, save.missionProgress);
});
