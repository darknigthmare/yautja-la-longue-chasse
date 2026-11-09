import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const dialogue = qa.load('app/game/systems/clanShipCrewDialogue.ts');
const operations = qa.load('app/game/systems/clanShipOperations.ts');
const docking = qa.load('app/game/systems/clanShipDocking.ts');
const residence = qa.load('app/game/systems/companionResidence.ts');
const interior = qa.load('app/game/systems/clanShipInterior.ts');
const saves = qa.load('app/game/save.ts');
const { MISSION_BY_ID } = qa.load('app/game/data.ts');
const OWNER = '2026-11-09T09:00:00.000Z';
const OTHER = '2026-11-09T10:00:00.000Z';
const SHIP = 'classic-predator-spaceship';

function initial() {
  let berth = docking.createClanShipDockingState(OWNER, SHIP);
  for (const type of ['approach', 'dock', 'board']) berth = docking.actClanShipDocking(berth, { type }, { ownerCreatedAt: OWNER, personalShipId: SHIP }).state;
  return { ...saves.defaultSave(OWNER), clanShipDocking: berth, clanShipOperations: operations.createClanShipOperations(OWNER) };
}
function at(save, roomId) {
  if (save.clanShipDocking.roomId === roomId) return save;
  const result = docking.actClanShipDocking(save.clanShipDocking, { type: 'move-room', roomId }, { ownerCreatedAt: OWNER, personalShipId: SHIP });
  assert.equal(result.accepted, true, result.message);
  return { ...save, clanShipDocking: result.state };
}
function act(save, type, values = {}, roomId = 'conseil') {
  save = at(save, roomId);
  const result = operations.actClanShipOperations(save.clanShipOperations,
    { type, expectedRevision: save.clanShipOperations.revision, ...values }, { ownerCreatedAt: OWNER, docking: save.clanShipDocking, campaign: save });
  assert.equal(result.accepted, true, `${type}: ${result.reason}: ${result.message}`);
  return { ...save, clanShipOperations: result.state, profile: { ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward } };
}
function ready() {
  let save = initial();
  for (const step of operations.CLAN_SHIP_ONBOARDING_STEPS) save = act(save, 'onboard-step', { stepId: step.id }, step.roomId);
  return act(save, 'accept-mandate');
}
function completeInterior(save, id) {
  save = act(save, 'accept-contract', { contractId: id });
  for (const step of operations.clanShipContract(id).steps) save = act(save, 'interior-step', { stepId: step.id }, step.roomId);
  return save;
}
function completeField(save, contractId) {
  save = act(save, 'accept-contract', { contractId });
  const missionId = operations.clanShipContract(contractId).missionId, mission = MISSION_BY_ID[missionId];
  const encounterRun = save.missionProgress[missionId].attempts;
  const bound = operations.bindClanShipMission(save.clanShipOperations, { ownerCreatedAt: OWNER, missionId, encounterRun, expectedRevision: save.clanShipOperations.revision });
  assert.equal(bound.accepted, true);
  save = { ...save, clanShipOperations: bound.state };
  const result = { missionId, difficultyId: 'hunter', outcome: 'success', score: 80, scans: 3, elapsedSeconds: 240,
    completedObjectiveIds: mission.objectives.filter(item => item.required || item.kind === 'extract').map(item => item.id),
    honorEvents: [], trophyQuality: 'elite', trophyClaims: [{ id: `${missionId}-crew-dialogue-proof`, definitionId: mission.trophy.id,
      targetName: mission.targetName, targetKind: mission.targetKind, partId: mission.trophy.partId, condition: 'pristine', quality: 'elite' }],
    kills: 3, secondWindUsed: false, completedAt: '2026-11-09T11:00:00.000Z' };
  const progressed = saves.applyMissionResult(save, result);
  const settled = operations.settleClanShipMission(save.clanShipOperations, save, progressed, result, { ownerSaveCreatedAt: OWNER, missionId, encounterRun });
  assert.equal(settled.accepted, true, settled.message);
  return { ...progressed, clanShipOperations: settled.state, profile: { ...progressed.profile, clanMarks: progressed.profile.clanMarks + settled.clanMarksReward } };
}
function proven() {
  let save = ready();
  for (const id of ['ship-training-circuit', 'ship-armory-audit', 'ship-triage-route', 'ship-seal-check']) save = completeInterior(save, id);
  for (const id of ['field-jungle-survey', 'field-ice-route']) save = completeField(save, id);
  assert.equal(operations.evaluateClanShipOperationsCampaign(save.clanShipOperations, save).allowed, true);
  return save;
}
function recruited() {
  let save = proven();
  // Historic appointments are deliberately exercised without inventing a
  // residence ledger. Modern refits below use the real residence reducer.
  for (const npc of operations.CLAN_SHIP_RECRUITS) save = act(save, 'recruit', { npcId: npc.id }, npc.roomId);
  return save;
}
function terminal(save, status = 'victory') {
  save = act(save, 'accept-contract', { contractId: 'space-screening' });
  const order = type => { save = act(save, 'space-command', { command: { type, expectedTurn: save.clanShipOperations.spaceEncounter.turn } }); };
  if (status === 'withdrawn') order('withdraw');
  else if (status === 'defeat') while (save.clanShipOperations.spaceEncounter.status === 'active') order(save.clanShipOperations.spaceEncounter.energy < 4 ? 'recharge' : 'manoeuvre');
  else for (const type of ['scan', 'manoeuvre', 'brace', 'brace', 'extract']) order(type);
  assert.equal(save.clanShipOperations.spaceEncounter.status, status);
  return save;
}
function select(save, id, contact = {}) {
  const npc = operations.clanShipRecruit(id), roomId = contact.roomId ?? npc.roomId;
  return dialogue.selectClanShipCrewDialogue(at(save, roomId), id, { roomId, focusedNpcId: id, ...contact });
}
function frozen(value) {
  if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) frozen(child); }
  return value;
}
function refit(save, id, host) {
  save = at(save, 'hangar');
  for (const type of ['plan-refit', 'fund-refit', 'complete-refit']) {
    const result = residence.actCompanionResidence({ type, id, ...(type === 'plan-refit' ? { host } : {}), ownerCreatedAt: OWNER,
      expectedRevision: save.companionResidence?.revision ?? 0 }, { save, selectedShipId: SHIP, ownedShipIds: [SHIP], active: true, site: 'clan',
      observation: { site: 'clan', roomId: 'hangar', ...interior.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint } });
    assert.equal(result.accepted, true, result.message);
    save = { ...save, companionResidence: result.state, profile: { ...save.profile, clanMarks: result.clanMarks } };
  }
  return save;
}
function residenceAction(save, id, type) {
  save = at(save, 'hangar');
  const result = residence.actCompanionResidence({ type, id, ownerCreatedAt: OWNER, expectedRevision: save.companionResidence?.revision ?? 0 },
    { save, selectedShipId: SHIP, ownedShipIds: [SHIP], active: true, site: 'clan',
      observation: { site: 'clan', roomId: 'hangar', ...interior.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint } });
  assert.equal(result.accepted, true, result.message);
  return { ...save, companionResidence: result.state };
}

const fixtures = {
  'missing-proof': ready(), 'recent-proof': proven(), agreement: recruited(),
};
fixtures['operation-return'] = terminal(fixtures.agreement);
fixtures['circle-confirmed'] = act(fixtures['operation-return'], 'confirm-circle');

for (const context of dialogue.CLAN_SHIP_CREW_DIALOGUE_CONTEXTS) {
  for (const npc of operations.CLAN_SHIP_RECRUITS) test(`${context}: ${npc.name} speaks only from the current facts`, () => {
    const save = frozen(at(structuredClone(fixtures[context]), npc.roomId)), before = JSON.stringify(save);
    const view = dialogue.selectClanShipCrewDialogue(save, npc.id, { roomId: npc.roomId, focusedNpcId: npc.id });
    assert.equal(view.status, 'spoken'); assert.equal(view.context, context);
    assert.equal(view.speakerId, npc.id); assert.equal(view.speakerName, npc.name);
    assert.equal(view.targetRoomId, npc.roomId); assert.ok(view.line.length > 35);
    assert.equal(JSON.stringify(save), before, 'no rank, recruitment, reward, progress, revision or residence write');
    assert.deepEqual(dialogue.selectClanShipCrewDialogue(save, npc.id, { roomId: npc.roomId, focusedNpcId: npc.id }), view, 'repeat reading is deterministic');
  });
}

test('all six voices remain distinct in each of the five contexts', () => {
  for (const context of dialogue.CLAN_SHIP_CREW_DIALOGUE_CONTEXTS) {
    const lines = operations.CLAN_SHIP_RECRUITS.map(npc => select(fixtures[context], npc.id).line);
    assert.equal(new Set(lines).size, 6, context);
  }
});
test('only the focused NPC at its real occupied room can emit a quote', () => {
  const save = fixtures.agreement;
  for (const npc of operations.CLAN_SHIP_RECRUITS) {
    for (const contact of [{ focusedNpcId: null }, { focusedNpcId: operations.CLAN_SHIP_RECRUITS.find(other => other.id !== npc.id).id },
      { roomId: npc.roomId === 'hangar' ? 'conseil' : 'hangar' }]) {
      const view = select(save, npc.id, contact);
      assert.equal(view.status, 'route'); assert.equal(view.line, null); assert.equal(view.context, null); assert.deepEqual(view.facts, []);
    }
    const located = at(save, npc.roomId);
    const view = dialogue.selectClanShipCrewDialogue({ ...located, clanShipDocking: { ...located.clanShipDocking, status: 'docked', roomId: 'hangar' } }, npc.id,
      { roomId: npc.roomId, focusedNpcId: npc.id });
    assert.equal(view.status, 'route'); assert.equal(view.line, null);
  }
});
test('an unconfirmed proof and an unbound field aggregate never create recent-proof', () => {
  const save = fixtures['recent-proof'];
  const withoutReceipt = structuredClone(fixtures['missing-proof']);
  withoutReceipt.missionProgress = structuredClone(save.missionProgress);
  assert.equal(select(withoutReceipt, 'cold-trace').context, 'missing-proof');
  const corrupted = structuredClone(save);
  corrupted.missionProgress['jungle-vey'].completions = 0;
  assert.equal(select(corrupted, 'cold-trace').status, 'invalid-save');
  const altered = structuredClone(save);
  altered.clanShipOperations.completedContracts.find(receipt => receipt.contractId === 'field-jungle-survey').proof.scans = 0;
  assert.equal(select(altered, 'cold-trace').status, 'invalid-save');
});
test('foreign owners, unsupported versions and unreadable data yield no invented fresh dialogue', () => {
  for (const [key, status] of [['clanShipOperations', 'invalid-save'], ['clanShipDocking', 'invalid-save'], ['companionResidence', 'invalid-save']]) {
    const save = at(structuredClone(fixtures.agreement), 'armurerie');
    if (key === 'companionResidence') save[key] = residence.createCompanionResidence(OTHER);
    else save[key].ownerCreatedAt = OTHER;
    const view = select(save, 'iron-claw'); assert.equal(view.status, status); assert.equal(view.line, null);
  }
  for (const key of ['clanShipOperations', 'clanShipDocking', 'companionResidence', 'clanShipTrophyHearing']) {
    const save = at(structuredClone(fixtures.agreement), 'armurerie');
    save[key] = { ...(save[key] ?? {}), version: 999 };
    const view = select(save, 'iron-claw'); assert.equal(view.status, 'future-version', key); assert.equal(view.line, null);
  }
  const located = at(fixtures.agreement, 'armurerie');
  Object.defineProperty(located, 'clanShipOperations', { get() { throw Error('read refused'); } });
  const view = dialogue.selectClanShipCrewDialogue(located, 'iron-claw', { roomId: 'armurerie', focusedNpcId: 'iron-claw' });
  assert.equal(view.status, 'invalid-save'); assert.equal(view.line, null);
});
test('reserve, suspension and another hull do not leave a voice at the historic post', () => {
  const host = { kind: 'personal', shipId: SHIP };
  const cases = [residenceAction(fixtures.agreement, 'iron-claw', 'reserve'), residenceAction(fixtures.agreement, 'iron-claw', 'suspend'),
    refit(fixtures.agreement, 'iron-claw', host)];
  for (const save of cases) {
    assert.equal(residence.inspectCompanionResidence(save.companionResidence, OWNER).status, 'valid');
    assert.equal(operations.evaluateClanShipOperationsCampaign(save.clanShipOperations, save).allowed, true);
    const view = select(save, 'iron-claw');
    assert.equal(view.status, 'unavailable'); assert.equal(view.line, null); assert.deepEqual(view.facts, []);
  }
});
test('a managed available resident speaks at its actual berth, with no duplicate old post', () => {
  const save = refit(fixtures.agreement, 'iron-claw', { kind: 'clan', shipId: 'avp-predator-mothership' });
  const presence = residence.companionResidencePresence(save, { kind: 'clan', shipId: 'avp-predator-mothership' }).find(member => member.id === 'iron-claw');
  assert.equal(presence.serviceAvailable, true); assert.notEqual(presence.avatarRoomId, 'armurerie');
  const old = select(save, 'iron-claw'); assert.equal(old.status, 'route'); assert.equal(old.line, null); assert.equal(old.targetRoomId, presence.avatarRoomId);
  const actual = select(save, 'iron-claw', { roomId: presence.avatarRoomId });
  assert.equal(actual.status, 'spoken'); assert.equal(actual.context, 'agreement');
});
test('C37 witnesses gathered in the gallery cannot speak from their old stations', () => {
  const save = structuredClone(fixtures.agreement);
  save.clanShipTrophyHearing = { version: 1, ownerCreatedAt: OWNER, revision: 2, events: [
    { type: 'invite', witnessId: 'ash-scar', revision: 1, incidentRevision: 1, observation: { roomId: 'entrainement', ...interior.CLAN_SHIP_INTERIOR_ROOMS.entrainement.servicePoint } },
    { type: 'invite', witnessId: 'cold-trace', revision: 2, incidentRevision: 1, observation: { roomId: 'archives', ...interior.CLAN_SHIP_INTERIOR_ROOMS.archives.servicePoint } },
  ] };
  const hearing = qa.load('app/game/systems/clanShipTrophyHearing.ts');
  assert.equal(hearing.inspectClanShipTrophyHearing(save.clanShipTrophyHearing, OWNER).status, 'valid');
  for (const id of ['ash-scar', 'cold-trace']) {
    const view = select(save, id); assert.equal(view.status, 'unavailable'); assert.equal(view.line, null); assert.match(view.reason, /audience/);
  }
  assert.equal(select(save, 'iron-claw').status, 'spoken');
});
test('victory, defeat and voluntary retreat remain distinct and preserve observed tactical statistics', () => {
  for (const [status, label] of [['victory', 'victoire'], ['withdrawn', 'repli'], ['defeat', 'défaite']]) {
    const save = status === 'victory' ? fixtures['operation-return'] : terminal(fixtures.agreement, status);
    const encounter = save.clanShipOperations.spaceEncounter;
    for (const npc of operations.CLAN_SHIP_RECRUITS) {
      const view = select(save, npc.id);
      assert.equal(view.context, 'operation-return');
      assert.ok(view.facts.some(fact => fact.includes(` : ${label}.`)));
      assert.ok(view.facts.some(fact => fact.includes(`formation : ${encounter.formationIntegrity}/100`)));
      assert.ok(view.facts.some(fact => fact.includes(`Énergie restante : ${encounter.energy}/8`)));
      assert.ok(view.facts.some(fact => fact.includes(`analyses : ${encounter.scanLevel}/2`)));
      assert.doesNotMatch(view.line, /blessé|blessure|mort|perdu|Elite|nouveau rang/i);
    }
    if (status === 'withdrawn') assert.match(select(save, 'ash-scar').line, /repli/);
    if (status !== 'victory') assert.equal(save.clanShipOperations.completedContracts.some(receipt => receipt.proof.kind === 'space'), false);
  }
});
test('circle is always the primary context and retains the last actual return as secondary facts', () => {
  for (const npc of operations.CLAN_SHIP_RECRUITS) {
    const view = select(fixtures['circle-confirmed'], npc.id);
    assert.equal(view.context, 'circle-confirmed'); assert.match(view.line, /cercle/i);
    assert.ok(view.facts.some(fact => fact.includes('victoire')));
  }
  const next = act(fixtures['circle-confirmed'], 'accept-contract', { contractId: 'space-interception' });
  const view = select(next, 'star-watch');
  assert.equal(view.context, 'circle-confirmed'); assert.equal(view.facts.some(fact => fact.includes('victoire')), false, 'no older victory becomes the active return');
});
test('an active encounter never masquerades as a completed return and new contracts clear old retained returns', () => {
  const active = act(fixtures.agreement, 'accept-contract', { contractId: 'space-screening' });
  assert.equal(select(active, 'iron-claw').context, 'agreement');
  const after = act(fixtures['operation-return'], 'accept-contract', { contractId: 'space-interception' });
  assert.equal(select(after, 'iron-claw').context, 'agreement');
});
test('the scout and navigator retain actual scans and ice proof separately from tactical observations', () => {
  for (const id of ['cold-trace', 'star-watch']) {
    const view = select(fixtures['operation-return'], id);
    assert.ok(view.facts.some(fact => fact.includes('score 80/100, 3 scans')));
    assert.ok(view.facts.some(fact => fact.startsWith('Ordres consignés :')));
    assert.ok(view.facts.some(fact => fact.includes('9 novembre 2026') && fact.includes('11:00 UTC')));
  }
});
test('a tactical return without an ice proof never invents observations under the ice', () => {
  const save = terminal(ready(), 'withdrawn'), view = select(save, 'star-watch');
  assert.equal(view.context, 'operation-return'); assert.match(view.line, /reste à rapporter/);
  assert.equal(view.facts.some(fact => fact.includes('score')), false);
  assert.equal(save.clanShipOperations.recruitedNpcIds.length, 0, 'reacting is not an agreement');
});
test('boarding and successful recovery are described only after their actual tactical orders', () => {
  let save = act(fixtures['operation-return'], 'accept-contract', { contractId: 'space-recovery' });
  const order = type => { save = act(save, 'space-command', { command: { type, expectedTurn: save.clanShipOperations.spaceEncounter.turn } }); };
  order('scan'); order('manoeuvre');
  while (save.clanShipOperations.spaceEncounter.hostileDrive > 0) order(save.clanShipOperations.spaceEncounter.energy < 3 ? 'recharge' : 'disrupt');
  if (save.clanShipOperations.spaceEncounter.energy < 1) order('recharge');
  order('board');
  if (save.clanShipOperations.spaceEncounter.energy < 2) order('recharge');
  order('extract');
  assert.equal(save.clanShipOperations.spaceEncounter.status, 'victory');
  assert.match(select(save, 'ash-scar').line, /abordage/);
  assert.match(select(save, 'threshold-guard').line, /récupération et son extraction sont confirmées/);
  assert.ok(select(save, 'threshold-guard').facts.some(fact => fact.includes('abordage') && fact.includes('extraction')));
});
test('the dialogue reader has no wall clock or offline simulation', () => {
  const save = at(fixtures.agreement, 'armurerie'), now = Date.now;
  Date.now = () => { throw Error('No wall-clock contract'); };
  try { assert.equal(dialogue.selectClanShipCrewDialogue(save, 'iron-claw', { roomId: 'armurerie', focusedNpcId: 'iron-claw' }).context, 'agreement'); }
  finally { Date.now = now; }
});
test('reading after a real export/import keeps save bytes, ranks, marks and agreements unchanged', () => {
  const encoded = saves.exportSave(fixtures['circle-confirmed']), loaded = saves.parseSaveImport(encoded);
  assert.equal(loaded.failure, null); assert.ok(loaded.save);
  const save = at(loaded.save, 'armurerie');
  const before = JSON.stringify(save), exportedPayload = JSON.stringify(JSON.parse(saves.exportSave(save)).save), profile = structuredClone(save.profile), state = structuredClone(save.clanShipOperations);
  for (let visit = 0; visit < 4; visit++) assert.equal(dialogue.selectClanShipCrewDialogue(save, 'iron-claw', { roomId: 'armurerie', focusedNpcId: 'iron-claw' }).context, 'circle-confirmed');
  assert.equal(JSON.stringify(save), before); assert.equal(JSON.stringify(JSON.parse(saves.exportSave(save)).save), exportedPayload);
  assert.deepEqual(save.profile, profile); assert.deepEqual(save.clanShipOperations, state);
  const first = dialogue.selectClanShipCrewDialogue(save, 'iron-claw', { roomId: 'armurerie', focusedNpcId: 'iron-claw' });
  first.facts.push('external consumer text');
  assert.equal(dialogue.selectClanShipCrewDialogue(save, 'iron-claw', { roomId: 'armurerie', focusedNpcId: 'iron-claw' }).facts.includes('external consumer text'), false);
});
