import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const residence = qa.load('app/game/systems/companionResidence.ts');
const saves = qa.load('app/game/save.ts');
const triad = qa.load('app/game/systems/planetInsertion.ts');
const ops = qa.load('app/game/systems/clanShipOperations.ts');
const docking = qa.load('app/game/systems/clanShipDocking.ts');
const personal = qa.load('app/game/systems/shipInterior25d.ts');
const clan = qa.load('app/game/systems/clanShipInterior.ts');
const { MISSION_BY_ID, MISSIONS } = qa.load('app/game/data.ts');
const OWNER = '2026-11-08T09:00:00.000Z';
const SHIP = 'classic-predator-spaceship', OTHER_SHIP = 'wolf-ship';
const PERSONAL = { kind: 'personal', shipId: SHIP };
const CLAN = { kind: 'clan', shipId: 'avp-predator-mothership' };
const clone = value => JSON.parse(JSON.stringify(value));

function rawResult(missionId = 'jungle-vey', values = {}) {
  const mission = MISSION_BY_ID[missionId];
  return { missionId, difficultyId: 'hunter', outcome: 'success', score: 80, scans: 3, elapsedSeconds: 240,
    completedObjectiveIds: mission.objectives.filter(item => item.required || item.kind === 'extract').map(item => item.id),
    honorEvents: [], trophyQuality: 'elite', trophyClaims: [{ id: `${missionId}-companion-proof`, definitionId: mission.trophy.id,
      targetName: mission.targetName, targetKind: mission.targetKind, partId: mission.trophy.partId, condition: 'pristine', quality: 'elite' }],
    kills: 3, secondWindUsed: false, completedAt: '2026-11-08T10:00:00.000Z', ...values };
}
function atDock(save, status = 'docked', roomId = 'hangar', shipId = SHIP) {
  let state = docking.createClanShipDockingState(save.createdAt, shipId);
  for (const type of ['approach', 'dock', ...(status === 'aboard' ? ['board'] : [])]) {
    const result = docking.actClanShipDocking(state, { type }, { ownerCreatedAt: save.createdAt, personalShipId: shipId });
    assert.equal(result.accepted, true, result.message); state = result.state;
  }
  if (status === 'aboard' && roomId !== 'hangar') {
    const result = docking.actClanShipDocking(state, { type: 'move-room', roomId }, { ownerCreatedAt: save.createdAt, personalShipId: shipId });
    assert.equal(result.accepted, true, result.message); state = result.state;
  }
  return { ...save, clanShipDocking: state };
}
function context(save, roomId = 'clan-archives', site = 'personal', values = {}) {
  const located = site === 'clan' ? atDock(save, 'aboard', roomId) : save;
  const position = site === 'personal' ? personal.SHIP_INTERIOR_25D_ROOMS[roomId].station.approach : clan.CLAN_SHIP_INTERIOR_ROOMS[roomId].servicePoint;
  return { save: located, selectedShipId: SHIP, ownedShipIds: [SHIP, OTHER_SHIP], active: true, site,
    observation: { site, roomId, x: position.x, y: position.y }, ...values };
}
function action(save, command) { return { ...command, ownerCreatedAt: OWNER, expectedRevision: save.companionResidence?.revision ?? 0 }; }
function perform(save, command, roomId = 'clan-archives', site = 'personal', values = {}) {
  const ctx = context(save, roomId, site, values), before = JSON.stringify(ctx.save);
  const result = residence.actCompanionResidence(action(save, command), ctx);
  assert.equal(result.accepted, true, `${command.type}: ${result.message}`);
  assert.equal(JSON.stringify(ctx.save), before, 'pure reducer leaves its campaign unchanged');
  const next = result.changed ? { ...ctx.save, companionResidence: result.state,
    profile: { ...ctx.save.profile, clanMarks: result.clanMarks }, ...(result.expeditionRoster ? { expeditionRoster: result.expeditionRoster } : {}) } : ctx.save;
  if (result.state) {
    assert.equal(residence.inspectCompanionResidence(result.state, OWNER).status, 'valid', `${command.type}: valid output`);
    assert.equal(residence.evaluateCompanionResidenceCampaign(result.state, next).allowed, true, `${command.type}: campaign evidence`);
  }
  return next;
}
function refused(save, command, roomId = 'clan-archives', site = 'personal', values = {}) {
  const ctx = context(save, roomId, site, values), before = JSON.stringify(ctx.save);
  const result = residence.actCompanionResidence(action(save, command), ctx);
  assert.equal(result.accepted, false, `${command.type} should be refused`);
  assert.equal(result.changed, false); assert.equal(result.clanMarks, save.profile.clanMarks);
  assert.equal(JSON.stringify(ctx.save), before); return result;
}
function fresh() {
  const save = saves.defaultSave(OWNER); save.profile.clanMarks = 1200;
  return atDock(save);
}
function travelled() {
  let save = fresh();
  for (const mission of MISSIONS) save = saves.applyMissionResult(save, rawResult(mission.id));
  return save;
}
function recruitTriad(save = fresh()) {
  let roster = save.expeditionRoster;
  for (const member of triad.TRIO_MEMBERS) roster = triad.recruitExpeditionMember(roster, OWNER, member.id);
  return { ...save, expeditionRoster: roster };
}
function clanAct(save, command, roomId = 'conseil', crew) {
  const state = save.clanShipOperations ?? ops.createClanShipOperations(OWNER);
  const result = ops.actClanShipOperations(state, { ...command, expectedRevision: state.revision }, {
    ownerCreatedAt: OWNER, campaign: save, docking: { ownerCreatedAt: OWNER, status: 'aboard', roomId },
    ...(crew ? { availableCrewIds: crew } : {}),
  });
  assert.equal(result.accepted, true, result.message);
  assert.equal(ops.inspectClanShipOperations(result.state, OWNER).status, 'valid');
  return { ...save, clanShipOperations: result.state, profile: { ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward } };
}
function mandate(save = fresh()) {
  for (const step of ops.CLAN_SHIP_ONBOARDING_STEPS) save = clanAct(save, { type: 'onboard-step', stepId: step.id }, step.roomId);
  return clanAct(save, { type: 'accept-mandate' });
}
function recruitClan(save = mandate(), id = 'ash-scar') {
  const npc = ops.CLAN_SHIP_RECRUITS.find(entry => entry.id === id);
  for (const contractId of npc.requiredContractIds) {
    save = clanAct(save, { type: 'accept-contract', contractId });
    for (const step of ops.clanShipContract(contractId).steps) save = clanAct(save, { type: 'interior-step', stepId: step.id }, step.roomId);
  }
  return clanAct(save, { type: 'recruit', npcId: id }, npc.roomId);
}
function refit(save, id, host = PERSONAL, site = 'personal') {
  const room = site === 'clan' ? 'hangar' : 'launch-airlock';
  save = perform(save, { type: 'plan-refit', id, host });
  save = perform(save, { type: 'fund-refit', id }, room, site);
  return perform(save, { type: 'complete-refit', id }, room, site);
}
function newHunt(save, missionId, insertion = { version: 1, method: 'ship', team: 'solo' }, values = {}) {
  const binding = { ownerCreatedAt: OWNER, missionId, encounterRun: save.missionProgress[missionId].attempts, shipId: SHIP, insertion };
  const bound = residence.bindCompanionResidenceMission(save, binding);
  assert.equal(bound.accepted, true, bound.message);
  const before = bound.changed ? { ...save, companionResidence: bound.state } : save;
  const raw = rawResult(missionId, values), progressed = saves.applyMissionResult(before, raw);
  const settled = residence.settleCompanionResidenceMission(before, progressed, raw,
    { ownerSaveCreatedAt: OWNER, missionId, encounterRun: binding.encounterRun });
  assert.equal(settled.accepted, true, settled.message);
  return settled.changed ? { ...progressed, companionResidence: settled.state } : progressed;
}
function pilot(save, id) {
  const definition = residence.companionRecruitmentDefinition(id);
  if (!save.companionResidence?.contacts.some(contact => contact.id === id)) save = perform(save, { type: 'discover' });
  save = perform(save, { type: 'accept-contact', id });
  save = newHunt(save, definition.missionId);
  for (const step of definition.steps) save = perform(save, { type: 'prepare-contact', id, stepId: step.id, choiceId: step.choices.find(choice => choice.accepted).id }, step.personalRoom);
  return perform(save, { type: 'recruit', id });
}
const member = (save, id) => save.companionResidence.members.find(entry => entry.id === id);
const presence = (save, host = PERSONAL) => residence.companionResidencePresence(save, host);

test('fresh and historical campaigns stay empty; discovery does not construct a quarter or recruit', () => {
  const initial = fresh(), before = JSON.stringify(initial);
  assert.deepEqual(presence(initial), []);
  assert.equal(Object.hasOwn(saves.normalizeSave(initial), 'companionResidence'), false);
  const noRoute = perform(initial, { type: 'discover' });
  assert.equal(Object.hasOwn(noRoute, 'companionResidence'), false);
  assert.equal(JSON.stringify(initial), before);
  const discovered = perform(travelled(), { type: 'discover' });
  assert.equal(discovered.companionResidence.contacts.length, 4);
  assert.equal(discovered.companionResidence.members.length, 0);
  assert.deepEqual(presence(discovered), []);
  assert.equal(personal.SHIP_INTERIOR_25D_ROOM_ORDER.length, 8);
});

test('owner, stale revision, physical station, active scene and explicit recruitment are required', () => {
  const save = recruitTriad();
  refused(save, { type: 'plan-refit', id: 'breche', host: PERSONAL });
  refused(save, { type: 'discover' }, 'wall-armory');
  refused(save, { type: 'discover' }, 'clan-archives', 'personal', { active: false });
  refused(save, { type: 'discover' }, 'clan-archives', 'personal', { observation: null });
  refused(save, { type: 'discover' }, 'clan-archives', 'personal', { observation: { site: 'personal', roomId: 'clan-archives', x: 40, y: 40 } });
  for (const change of [{ ownerCreatedAt: 'foreign' }, { expectedRevision: 9 }, { extra: 'ignore-me' }]) {
    const result = residence.actCompanionResidence({ ...action(save, { type: 'discover' }), ...change }, context(save));
    assert.equal(result.accepted, false);
  }
});

test('each pilot requires a fresh bound hunt, station preparations and explicit consent into reserve', () => {
  for (const id of residence.COMPANION_PILOT_IDS) {
    let save = perform(travelled(), { type: 'discover' });
    const definition = residence.companionRecruitmentDefinition(id);
    refused(save, { type: 'recruit', id });
    save = perform(save, { type: 'accept-contact', id });
    refused(save, { type: 'recruit', id });
    const old = rawResult(definition.missionId);
    const invalid = residence.settleCompanionResidenceMission(save, saves.applyMissionResult(save, old), old,
      { ownerSaveCreatedAt: OWNER, missionId: definition.missionId, encounterRun: save.missionProgress[definition.missionId].attempts });
    assert.equal(invalid.accepted, false, 'an unbound replay cannot establish the accord');
    save = newHunt(save, definition.missionId);
    for (const step of definition.steps) {
      const right = step.choices.find(choice => choice.accepted), wrong = step.choices.find(choice => !choice.accepted);
      refused(save, { type: 'prepare-contact', id, stepId: step.id, choiceId: right.id }, 'galaxy-map');
      refused(save, { type: 'prepare-contact', id, stepId: step.id, choiceId: wrong.id }, step.personalRoom);
      save = perform(save, { type: 'prepare-contact', id, stepId: step.id, choiceId: right.id }, step.personalRoom);
    }
    assert.equal(residence.companionHasRecruitment(save, id), false);
    save = perform(save, { type: 'recruit', id });
    assert.equal(residence.companionHasRecruitment(save, id), true);
    assert.equal(member(save, id).assignment, null);
    assert.equal(member(save, id).installation, null);
    assert.deepEqual(presence(save), []);
    refused(save, { type: 'recruit', id });
    assert.equal(residence.companionResidenceDefinition(id).fieldReady, false, 'no unsupported field actor is advertised');
  }
});

test('insufficient proof and failed hunt keep the contact optional, and a later new hunt can satisfy it', () => {
  let save = perform(travelled(), { type: 'discover' });
  save = perform(save, { type: 'accept-contact', id: 'lance-fendue' });
  save = newHunt(save, 'jungle-vey', undefined, { score: 20, scans: 1 });
  assert.equal(save.companionResidence.contacts.find(entry => entry.id === 'lance-fendue').stage, 'accepted');
  save = newHunt(save, 'jungle-vey', undefined, { outcome: 'failed', score: 10 });
  assert.equal(save.companionResidence.contacts.find(entry => entry.id === 'lance-fendue').stage, 'accepted');
  save = newHunt(save, 'jungle-vey');
  assert.equal(save.companionResidence.contacts.find(entry => entry.id === 'lance-fendue').stage, 'proven');
});

test('reserving supplies and completing refit are separate durable steps with a single debit', () => {
  let save = recruitTriad(), marks = save.profile.clanMarks;
  save = perform(save, { type: 'plan-refit', id: 'karhek', host: PERSONAL });
  assert.deepEqual(presence(save), []); assert.equal(save.profile.clanMarks, marks);
  refused(save, { type: 'fund-refit', id: 'karhek' }, 'clan-archives');
  save = perform(save, { type: 'fund-refit', id: 'karhek' }, 'launch-airlock');
  assert.equal(save.profile.clanMarks, marks - 20); assert.deepEqual(presence(save), []);
  save = perform(save, { type: 'fund-refit', id: 'karhek' }, 'launch-airlock');
  assert.equal(save.profile.clanMarks, marks - 20);
  save = perform(save, { type: 'complete-refit', id: 'karhek' }, 'launch-airlock');
  assert.equal(save.profile.clanMarks, marks - 20); assert.equal(presence(save).length, 1);
  assert.equal(presence(save)[0].avatarVisible, true);
  assert.equal(save.expeditionRoster.members.find(entry => entry.id === 'karhek').assignedShipId, SHIP);
  refused(save, { type: 'complete-refit', id: 'karhek' }, 'launch-airlock');
});

test('cancel after portable reload returns the escrow once, leaves the old berth and never duplicates resources', () => {
  let save = refit(recruitTriad(mandate()), 'karhek');
  const old = clone(member(save, 'karhek').installation), marks = save.profile.clanMarks;
  save = perform(save, { type: 'plan-refit', id: 'karhek', host: CLAN });
  save = perform(save, { type: 'fund-refit', id: 'karhek' }, 'hangar', 'clan');
  const imported = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(imported.save, imported.failure); save = imported.save;
  assert.equal(presence(save).length, 1); assert.equal(presence(save, CLAN).length, 0);
  save = perform(save, { type: 'cancel-refit', id: 'karhek' });
  assert.equal(save.profile.clanMarks, marks);
  assert.deepEqual(member(save, 'karhek').installation, old);
  save = perform(save, { type: 'cancel-refit', id: 'karhek' });
  assert.equal(save.profile.clanMarks, marks);
});

test('personal to clan transfer commits one installation and one identity; reserve removes both hulls', () => {
  let save = refit(recruitTriad(mandate()), 'karhek');
  save = perform(save, { type: 'plan-refit', id: 'karhek', host: CLAN });
  assert.equal(presence(save).length, 1);
  save = perform(save, { type: 'fund-refit', id: 'karhek' }, 'hangar', 'clan');
  assert.equal(presence(save).length, 1); assert.equal(presence(save, CLAN).length, 0);
  save = perform(save, { type: 'complete-refit', id: 'karhek' }, 'hangar', 'clan');
  assert.equal(presence(save).length, 0); assert.equal(presence(save, CLAN).length, 1);
  assert.equal(save.expeditionRoster.members.find(entry => entry.id === 'karhek').assignedShipId, null);
  save = perform(save, { type: 'reserve', id: 'karhek' }, 'hangar', 'clan');
  assert.equal(presence(save, CLAN).length, 0); assert.equal(presence(save).length, 0);
  assert.equal(residence.companionHasRecruitment(save, 'karhek'), true);
});

test('historical clan post survives a planned or cancelled refit, then stops lending a transferred bonus', () => {
  let save = recruitClan();
  assert.deepEqual(residence.availableClanResidenceCrew(save), ['ash-scar']);
  save = perform(save, { type: 'plan-refit', id: 'ash-scar', host: PERSONAL });
  assert.deepEqual(residence.availableClanResidenceCrew(save), ['ash-scar']);
  assert.equal(residence.companionUsesLegacyClanPost(save, 'ash-scar'), true);
  save = perform(save, { type: 'cancel-refit', id: 'ash-scar' });
  assert.deepEqual(residence.availableClanResidenceCrew(save), ['ash-scar']);
  save = refit(save, 'ash-scar');
  assert.deepEqual(residence.availableClanResidenceCrew(save), []);
  assert.equal(residence.companionUsesLegacyClanPost(save, 'ash-scar'), false);
  const encounter = clanAct(save, { type: 'accept-contract', contractId: 'space-screening' }, 'conseil', residence.availableClanResidenceCrew(save));
  assert.deepEqual(encounter.clanShipOperations.spaceEncounter.crewRoles, []);
});

test('a newly accepted clan recruitment enters reserve atomically instead of acquiring a legacy post', () => {
  let before = mandate();
  before = clanAct(before, { type: 'accept-contract', contractId: 'ship-training-circuit' });
  for (const step of ops.clanShipContract('ship-training-circuit').steps) before = clanAct(before, { type: 'interior-step', stepId: step.id }, step.roomId);
  const progressed = clanAct(before, { type: 'recruit', npcId: 'ash-scar' }, 'entrainement');
  const registered = residence.registerCompanionResidenceRecruitment(before, progressed, 'ash-scar');
  assert.equal(registered.accepted, true, registered.message);
  const save = { ...progressed, companionResidence: registered.state };
  assert.equal(member(save, 'ash-scar').assignment, null);
  assert.equal(member(save, 'ash-scar').legacyClanPost, false);
  assert.equal(member(save, 'ash-scar').installation, null);
  assert.deepEqual(residence.availableClanResidenceCrew(save), []);
  assert.equal(residence.companionUsesLegacyClanPost(save, 'ash-scar'), false);
  assert.ok(saves.parseSaveImport(saves.exportSave(save)).save);
  assert.equal(residence.registerCompanionResidenceRecruitment(save, save, 'ash-scar').accepted, false);
  assert.equal(residence.registerCompanionResidenceRecruitment(before, progressed, 'black-suture').accepted, false);
  const posted = refit(save, 'ash-scar', CLAN, 'clan');
  assert.deepEqual(residence.availableClanResidenceCrew(posted), ['ash-scar']);
  assert.equal(presence(posted, CLAN).length, 1);
});

test('an active clan engagement freezes the crew post until return', () => {
  let save = recruitClan();
  save = clanAct(save, { type: 'accept-contract', contractId: 'space-screening' });
  assert.deepEqual(save.clanShipOperations.spaceEncounter.crewRoles, ['veteran']);
  refused(save, { type: 'plan-refit', id: 'ash-scar', host: PERSONAL });
  refused(save, { type: 'reserve', id: 'ash-scar' }, 'hangar', 'clan');
});

test('funded slots cannot collide and incompatible craft cannot receive quarters', () => {
  let save = recruitTriad();
  save = perform(save, { type: 'plan-refit', id: 'karhek', host: PERSONAL });
  save = perform(save, { type: 'plan-refit', id: 'saketh', host: PERSONAL });
  save = perform(save, { type: 'fund-refit', id: 'karhek' }, 'launch-airlock');
  save = perform(save, { type: 'fund-refit', id: 'saketh' }, 'launch-airlock');
  assert.notEqual(member(save, 'karhek').refit.berth, member(save, 'saketh').refit.berth);
  const invalid = clone(save.companionResidence); invalid.members[1].refit.berth = invalid.members[0].refit.berth;
  assert.equal(residence.inspectCompanionResidence(invalid, OWNER).status, 'invalid-save');
  let free = recruitTriad();
  refused(free, { type: 'plan-refit', id: 'karhek', host: { kind: 'personal', shipId: 'emergency-escape-pod' } }, 'clan-archives', 'personal', { ownedShipIds: [SHIP, 'emergency-escape-pod'] });
  refused(free, { type: 'plan-refit', id: 'karhek', host: { kind: 'personal', shipId: OTHER_SHIP } }, 'clan-archives', 'personal', { ownedShipIds: [SHIP] });
  free = perform(free, { type: 'plan-refit', id: 'karhek', host: PERSONAL });
  refused({ ...free, clanShipDocking: null }, { type: 'fund-refit', id: 'karhek' }, 'launch-airlock');
  refused({ ...free, profile: { ...free.profile, clanMarks: 1 } }, { type: 'fund-refit', id: 'karhek' }, 'launch-airlock');
});

test('compatible quarters use the declared room budget; expansion adds empty capacity only', () => {
  let save = recruitTriad(recruitClan(mandate(travelled())));
  for (const id of residence.COMPANION_PILOT_IDS) save = pilot(save, id);
  for (const id of ['eclisse', 'opale', 'karhek', 'saketh', 'lance-fendue', 'breche']) save = refit(save, id, CLAN, 'clan');
  assert.equal(presence(save, CLAN).length, 6);
  assert.equal(new Set(presence(save, CLAN).map(entry => entry.installation.berth)).size, 6);
  refused(save, { type: 'plan-refit', id: 'ash-scar', host: CLAN });
  const marks = save.profile.clanMarks;
  save = perform(save, { type: 'expand-clan-quarters' }, 'hangar', 'clan');
  assert.equal(save.companionResidence.clanCapacity, 13);
  assert.equal(save.profile.clanMarks, marks - 120);
  assert.equal(presence(save, CLAN).length, 6, 'empty slots never summon extra occupants');
  refused(save, { type: 'expand-clan-quarters' }, 'hangar', 'clan');
  save = refit(save, 'ash-scar', CLAN, 'clan');
  assert.equal(presence(save, CLAN).length, 7);
});

test('the 19-person tier requires a real recognized circle and never automatically fills its 18 berths', () => {
  let save = mandate(travelled());
  for (const contractId of ['ship-seal-check', 'ship-armory-audit', 'ship-triage-route', 'ship-training-circuit']) {
    save = clanAct(save, { type: 'accept-contract', contractId });
    for (const step of ops.clanShipContract(contractId).steps) save = clanAct(save, { type: 'interior-step', stepId: step.id }, step.roomId);
  }
  for (const [contractId, missionId] of [['field-jungle-survey', 'jungle-vey'], ['field-ice-route', 'ice-cryostalker']]) {
    save = clanAct(save, { type: 'accept-contract', contractId });
    const bound = ops.bindClanShipMission(save.clanShipOperations, { ownerCreatedAt: OWNER, missionId,
      encounterRun: save.missionProgress[missionId].attempts, expectedRevision: save.clanShipOperations.revision });
    assert.equal(bound.accepted, true, bound.message);
    const before = { ...save, clanShipOperations: bound.state }, raw = rawResult(missionId), progressed = saves.applyMissionResult(before, raw);
    const settled = ops.settleClanShipMission(bound.state, before, progressed, raw,
      { ownerSaveCreatedAt: OWNER, missionId, encounterRun: before.missionProgress[missionId].attempts });
    assert.equal(settled.accepted, true, settled.message);
    save = { ...progressed, clanShipOperations: settled.state, profile: { ...progressed.profile, clanMarks: progressed.profile.clanMarks + settled.clanMarksReward } };
  }
  for (const npc of ops.CLAN_SHIP_RECRUITS) save = clanAct(save, { type: 'recruit', npcId: npc.id }, npc.roomId);
  save = clanAct(save, { type: 'accept-contract', contractId: 'space-screening' });
  for (const type of ['scan', 'manoeuvre', 'brace', 'brace', 'extract']) save = clanAct(save, { type: 'space-command', command: { type, expectedTurn: save.clanShipOperations.spaceEncounter.turn } });
  save = clanAct(save, { type: 'confirm-circle' });
  const balance = save.profile.clanMarks;
  save = perform(save, { type: 'expand-clan-quarters' }, 'hangar', 'clan');
  save = perform(save, { type: 'expand-clan-quarters' }, 'hangar', 'clan');
  assert.equal(save.companionResidence.clanCapacity, 19);
  assert.equal(residence.companionBerthCapacity(CLAN, save.companionResidence), 18);
  assert.equal(save.profile.clanMarks, balance - 120 - 240);
  assert.deepEqual(save.companionResidence.members, []);
  assert.deepEqual(presence(save, CLAN), []);
  const repeated = perform(save, { type: 'expand-clan-quarters' }, 'hangar', 'clan');
  assert.equal(repeated.profile.clanMarks, save.profile.clanMarks);
  assert.ok(saves.parseSaveImport(saves.exportSave(save)).save);
});

test('field deployment keeps the berth, suppresses aboard duplicates, and settles from the bound encounter', () => {
  let save = refit(refit(recruitTriad(), 'karhek'), 'saketh');
  const binding = { ownerCreatedAt: OWNER, missionId: 'jungle-vey', encounterRun: 0, shipId: SHIP, insertion: { version: 1, method: 'ship', team: 'triad' } };
  const bound = residence.bindCompanionResidenceMission(save, binding);
  assert.equal(bound.accepted, true); assert.equal(bound.changed, true);
  save = { ...save, companionResidence: bound.state };
  for (const entry of presence(save)) { assert.equal(entry.quarterVisible, true); assert.equal(entry.avatarVisible, false); assert.equal(entry.serviceAvailable, false); assert.equal(entry.location, 'mission'); }
  refused(save, { type: 'reserve', id: 'karhek' }, 'launch-airlock');
  const repeated = residence.bindCompanionResidenceMission(save, binding);
  assert.equal(repeated.accepted, true); assert.equal(repeated.changed, false);
  const raw = rawResult(), progressed = saves.applyMissionResult(save, raw);
  const wrong = residence.settleCompanionResidenceMission(save, progressed, raw, { ownerSaveCreatedAt: 'foreign', missionId: 'jungle-vey', encounterRun: 0 });
  assert.equal(wrong.accepted, false);
  const done = residence.settleCompanionResidenceMission(save, progressed, raw, { ownerSaveCreatedAt: OWNER, missionId: 'jungle-vey', encounterRun: 0 });
  assert.equal(done.accepted, true);
  assert.equal(presence({ ...progressed, companionResidence: done.state }).every(entry => entry.avatarVisible), true);
});

test('a deployment is bound to its campaign attempt and source hull even after the arrival is retired', () => {
  let save = refit(refit(recruitTriad(), 'karhek'), 'saketh');
  const bound = residence.bindCompanionResidenceMission(save, { ownerCreatedAt: OWNER, missionId: 'jungle-vey', encounterRun: 0, shipId: SHIP,
    insertion: { version: 1, method: 'pod', team: 'triad' } });
  save = { ...save, companionResidence: bound.state, planetArrival: null };
  assert.equal(residence.evaluateCompanionResidenceCampaign(save.companionResidence, save).allowed, true);
  assert.ok(saves.parseSaveImport(saves.exportSave(save)).save, 'arrival may already have been removed while the hunt is active');
  for (const change of [
    invalid => { invalid.companionResidence.members[0].deployment.encounterRun += 1; },
    invalid => { invalid.companionResidence.members[0].deployment.shipId = OTHER_SHIP; },
    invalid => { invalid.expeditionRoster.members[0].assignedShipId = OTHER_SHIP; },
    invalid => { invalid.expeditionRoster.members[0].availability = 'missing'; },
  ]) {
    const invalid = clone(save); change(invalid);
    assert.equal(residence.evaluateCompanionResidenceCampaign(invalid.companionResidence, invalid).allowed, false);
    assert.equal(saves.parseSaveImport(JSON.stringify(invalid)).failure, 'invalid-save');
  }
  const forgedPilot = clone(save); forgedPilot.companionResidence.members[0].id = 'lance-fendue';
  assert.equal(residence.inspectCompanionResidence(forgedPilot.companionResidence, OWNER).status, 'invalid-save');
  assert.equal(residence.companionHasRecruitment(forgedPilot, 'lance-fendue'), false);
});

test('retired recovery releases its matching mission without granting proof or recruitment', () => {
  let save = perform(travelled(), { type: 'discover' });
  save = perform(save, { type: 'accept-contact', id: 'breche' });
  const binding = { ownerCreatedAt: OWNER, missionId: 'jungle-vey', encounterRun: save.missionProgress['jungle-vey'].attempts, shipId: SHIP, insertion: { version: 1, method: 'ship', team: 'solo' } };
  const bound = residence.bindCompanionResidenceMission(save, binding); save = { ...save, companionResidence: bound.state };
  assert.equal(residence.releaseCompanionResidenceMission(save, { ...binding, encounterRun: 999 }).accepted, false);
  const retired = residence.releaseCompanionResidenceMission(save, binding);
  assert.equal(retired.accepted, true); assert.equal(retired.changed, true);
  const contact = retired.state.contacts.find(entry => entry.id === 'breche');
  assert.equal(contact.stage, 'accepted'); assert.equal(contact.encounterRun, null); assert.equal(contact.proof, null);
});

test('medical, missing and suspended states cannot lend services or create duplicate actors', () => {
  let save = refit(recruitTriad(), 'karhek');
  save = { ...save, expeditionRoster: { ...save.expeditionRoster, members: save.expeditionRoster.members.map(entry => ({ ...entry, availability: entry.id === 'karhek' ? 'recovering' : 'ready' })) } };
  assert.equal(presence(save)[0].location, 'medical'); assert.equal(presence(save)[0].avatarRoomId, 'medical-bay'); assert.equal(presence(save)[0].serviceAvailable, false);
  let html = qa.render('app/game/CompanionQuartersScene.tsx', { save, site: 'personal', shipId: SHIP, roomId: 'wall-armory' });
  assert.match(html, /data-companion-module="karhek"/); assert.doesNotMatch(html, /data-companion-avatar/);
  html = qa.render('app/game/CompanionQuartersScene.tsx', { save, site: 'personal', shipId: SHIP, roomId: 'medical-bay' });
  assert.equal((html.match(/data-companion-avatar="karhek"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /data-companion-module/);
  save.expeditionRoster.members[0].availability = 'missing';
  assert.equal(presence(save)[0].avatarVisible, false); assert.equal(presence(save)[0].quarterVisible, true);
  refused(save, { type: 'plan-refit', id: 'karhek', host: { kind: 'personal', shipId: OTHER_SHIP } });
  save = perform(save, { type: 'suspend', id: 'karhek' }, 'launch-airlock');
  assert.equal(presence(save)[0].quarterVisible, false); assert.equal(presence(save)[0].avatarVisible, false); assert.equal(presence(save)[0].serviceAvailable, false);
  save = perform(save, { type: 'resume', id: 'karhek' }, 'launch-airlock');
  assert.equal(presence(save)[0].availability, 'missing', 'resuming an agreement never heals or rescues');
});

test('legacy hull suspension also blocks a triad departure before its first new installation', () => {
  let save = recruitTriad();
  for (const id of ['karhek', 'saketh']) save.expeditionRoster = triad.assignExpeditionMember(save.expeditionRoster, OWNER, SHIP, id);
  save = perform(save, { type: 'suspend', id: 'karhek' }, 'launch-airlock');
  const result = residence.bindCompanionResidenceMission(save, { ownerCreatedAt: OWNER, missionId: 'jungle-vey', encounterRun: 0, shipId: SHIP, insertion: { version: 1, method: 'ship', team: 'triad' } });
  assert.equal(result.accepted, false);
});

test('strict portable saves reject future, foreign, malformed, impossible and unattributed residence records', () => {
  const save = refit(recruitTriad(), 'karhek');
  for (const mutate of [
    state => { state.ownerCreatedAt = 'foreign'; }, state => { state.clanCapacity = '7'; },
    state => { state.members.push(clone(state.members[0])); }, state => { state.members[0].installation.module = 'humanCabin'; },
    state => { state.members[0].refit = { host: CLAN, stage: 'funded', reservedMarks: 999, berth: 0 }; },
    state => { state.members[0].installation.host = { kind: 'personal', shipId: 'emergency-escape-pod' }; state.members[0].assignment = state.members[0].installation.host; },
    state => { state.members[0].legacyClanPost = true; }, state => { state.clanCapacity = 19; },
  ]) {
    const invalid = clone(save); mutate(invalid.companionResidence);
    const parsed = saves.parseSaveImport(JSON.stringify(invalid));
    assert.equal(parsed.save, null, JSON.stringify(invalid.companionResidence)); assert.equal(parsed.failure, 'invalid-save');
  }
  const future = clone(save); future.companionResidence.version = 2;
  assert.equal(saves.parseSaveImport(JSON.stringify(future)).failure, 'future-version');
  const noAgreement = clone(save); noAgreement.expeditionRoster.members = [];
  assert.equal(saves.parseSaveImport(JSON.stringify(noAgreement)).failure, 'invalid-save');
});

test('ordinary campaign write, export and reload preserve planned, funded, occupied and closed states', () => {
  const states = []; let save = recruitTriad();
  for (const command of [
    { type: 'plan-refit', id: 'karhek', host: PERSONAL }, { type: 'fund-refit', id: 'karhek' },
    { type: 'complete-refit', id: 'karhek' }, { type: 'suspend', id: 'karhek' }, { type: 'resume', id: 'karhek' }, { type: 'reserve', id: 'karhek' },
  ]) { save = perform(save, command, 'launch-airlock'); states.push(save); }
  for (const source of states) {
    const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    const write = saves.writeSaveWithStatus(source, storage);
    assert.equal(write.persisted, true, write.failure);
    const reloaded = saves.loadSaveWithStatus(storage);
    assert.equal(reloaded.loaded, true, reloaded.failure);
    assert.deepEqual(reloaded.save.companionResidence, source.companionResidence);
    assert.equal(reloaded.save.profile.clanMarks, source.profile.clanMarks);
    const imported = saves.parseSaveImport(saves.exportSave(reloaded.save));
    assert.ok(imported.save, imported.failure); assert.deepEqual(imported.save.companionResidence, source.companionResidence);
  }
});

test('an unavailable storage writer cannot replace the confirmed campaign or acknowledge a refit', () => {
  const confirmed = recruitTriad(), values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  assert.equal(saves.writeSaveWithStatus(confirmed, storage).persisted, true);
  const bytes = [...values];
  const next = perform(confirmed, { type: 'plan-refit', id: 'karhek', host: PERSONAL });
  storage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
  const failed = saves.writeSaveWithStatus(next, storage);
  assert.equal(failed.persisted, false); assert.deepEqual([...values], bytes);
  assert.equal(Object.hasOwn(saves.loadSaveWithStatus(storage).save, 'companionResidence'), false);
});

test('rendered scene draws no habitat before assignment and exactly one actor and quarter after refit', () => {
  let save = recruitTriad();
  const empty = qa.render('app/game/CompanionQuartersScene.tsx', { save, site: 'personal', shipId: SHIP, roomId: 'wall-armory' });
  assert.equal(empty, '');
  save = refit(save, 'karhek');
  const html = qa.render('app/game/CompanionQuartersScene.tsx', { save, site: 'personal', shipId: SHIP, roomId: 'wall-armory' });
  assert.equal((html.match(/data-companion-avatar="karhek"/g) ?? []).length, 1);
  assert.equal((html.match(/data-companion-module="karhek"/g) ?? []).length, 1);
  assert.match(html, /hunter-alcove\.png/);
  assert.equal(qa.render('app/game/CompanionQuartersScene.tsx', { save, site: 'clan', shipId: CLAN.shipId, roomId: 'entrainement' }), '');
  const deployed = clone(save); deployed.companionResidence.members[0].deployment = { missionId: 'jungle-vey', encounterRun: 0, shipId: SHIP };
  const absent = qa.render('app/game/CompanionQuartersScene.tsx', { save: deployed, site: 'personal', shipId: SHIP, roomId: 'wall-armory' });
  assert.match(absent, /data-companion-module/); assert.doesNotMatch(absent, /data-companion-avatar/);
});

test('each original pilot uses its own static native drawing only after an assigned quarter exists', () => {
  const { COMPANION_PILOT_ART } = qa.load('app/game/companionPilotArt.ts');
  for (const id of residence.COMPANION_PILOT_IDS) {
    let save = pilot(travelled(), id);
    assert.equal(COMPANION_PILOT_ART[id].humanArtValidation, false);
    assert.equal(COMPANION_PILOT_ART[id].motionStatus, 'static-draft');
    assert.deepEqual(presence(save), []);
    save = refit(save, id);
    const occupant = presence(save)[0];
    const html = qa.render('app/game/CompanionQuartersScene.tsx', { save, site: 'personal', shipId: SHIP, roomId: occupant.roomId });
    assert.equal((html.match(new RegExp(`data-companion-avatar="${id}"`, 'g')) ?? []).length, 1);
    assert.ok(html.includes(COMPANION_PILOT_ART[id].src));
    assert.doesNotMatch(html, /scaleX\(-1\)/, 'a static original pose is not mirrored into an invented second view');
    save = perform(save, { type: 'reserve', id }, 'launch-airlock');
    assert.equal(qa.render('app/game/CompanionQuartersScene.tsx', { save, site: 'personal', shipId: SHIP, roomId: occupant.roomId }), '');
  }
});

test('quarter sockets and medical actors stand outside walkable floor without replacing base services', () => {
  const scene = qa.load('app/game/CompanionQuartersScene.tsx');
  for (let berth = 0; berth < 18; berth++) {
    const socket = scene.companionQuarterSocket('clan', berth);
    assert.ok(socket.y < clan.CLAN_SHIP_INTERIOR_METRICS.floor.y);
    assert.ok(socket.x - socket.width / 2 > 128 && socket.x + socket.width / 2 < 1312, 'rear berths stay clear of side doors');
  }
  for (let berth = 0; berth < 4; berth++) {
    const socket = scene.companionQuarterSocket('personal', berth);
    assert.ok(socket.y < personal.SHIP_INTERIOR_25D_METRICS.floorInset);
    assert.ok(socket.x - socket.width / 2 > 190 && socket.x + socket.width / 2 < 1010, 'rear modules avoid existing lift shafts');
  }
  assert.equal(personal.SHIP_INTERIOR_25D_ROOM_ORDER.length, 8);
  assert.equal(clan.CLAN_SHIP_INTERIOR_ROOM_ORDER.length, 7);
});
