import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './homeworld-scene-ssr-v78.mjs';

/** Domain fixture: missions are synthetic receipts delivered through their
 * actual callbacks. No fixture hunt or preparation is claimed as browser play. */
export const qa = homeworldSceneSsrV78();
export const incidents = qa.load('app/game/systems/clanShipIncidents.ts');
export const hearing = qa.load('app/game/systems/clanShipTrophyHearing.ts');
export const ops = qa.load('app/game/systems/clanShipOperations.ts');
export const residence = qa.load('app/game/systems/companionResidence.ts');
export const docking = qa.load('app/game/systems/clanShipDocking.ts');
export const motion = qa.load('app/game/systems/clanShipInterior.ts');
export const saves = qa.load('app/game/save.ts');
const { MISSION_BY_ID, MISSIONS } = qa.load('app/game/data.ts');
export const OWNER = '2026-11-08T18:00:00.000Z', SHIP = 'classic-predator-spaceship', ID = 'contested-trophy';
export const clone = value => JSON.parse(JSON.stringify(value));

export function aboard(save, roomId = 'hangar') {
  let state = docking.createClanShipDockingState(save.createdAt, SHIP);
  for (const type of ['approach', 'dock', 'board']) {
    const result = docking.actClanShipDocking(state, { type }, { ownerCreatedAt: save.createdAt, personalShipId: SHIP });
    assert.equal(result.accepted, true, result.message); state = result.state;
  }
  if (roomId !== 'hangar') {
    const result = docking.actClanShipDocking(state, { type: 'move-room', roomId }, { ownerCreatedAt: save.createdAt, personalShipId: SHIP });
    assert.equal(result.accepted, true, result.message); state = result.state;
  }
  return { ...save, clanShipDocking: state };
}
function clanAct(save, command, roomId = 'conseil') {
  const state = save.clanShipOperations ?? ops.createClanShipOperations(save.createdAt);
  const result = ops.actClanShipOperations(state, { ...command, expectedRevision: state.revision }, {
    ownerCreatedAt: save.createdAt, campaign: save, docking: { ownerCreatedAt: save.createdAt, status: 'aboard', roomId },
  });
  assert.equal(result.accepted, true, `${command.type}: ${result.message}`);
  return { ...save, clanShipOperations: result.state, profile: { ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward } };
}
function rawResult(missionId) {
  const mission = MISSION_BY_ID[missionId];
  return { missionId, difficultyId: 'hunter', outcome: 'success', score: 80, scans: 3, elapsedSeconds: 240,
    completedObjectiveIds: mission.objectives.filter(entry => entry.required || entry.kind === 'extract').map(entry => entry.id),
    honorEvents: [], trophyQuality: 'elite', trophyClaims: [{ id: `${missionId}-hearing-proof`, definitionId: mission.trophy.id,
      targetName: mission.targetName, targetKind: mission.targetKind, partId: mission.trophy.partId, condition: 'pristine', quality: 'elite' }],
    kills: 3, secondWindUsed: false, completedAt: '2026-11-08T19:00:00.000Z' };
}
export function completeInterior(save, contractId) {
  save = clanAct(save, { type: 'accept-contract', contractId });
  for (const step of ops.clanShipContract(contractId).steps) save = clanAct(save, { type: 'interior-step', stepId: step.id }, step.roomId);
  return save;
}
function completeField(save, contractId) {
  const definition = ops.clanShipContract(contractId), mission = MISSION_BY_ID[definition.missionId];
  for (const previous of MISSIONS.filter(entry => entry.order < mission.order)) {
    if (save.missionProgress[previous.id].status !== 'completed') save = saves.applyMissionResult(save, rawResult(previous.id));
  }
  save = clanAct(save, { type: 'accept-contract', contractId });
  const encounterRun = save.missionProgress[mission.id].attempts;
  const bound = ops.bindClanShipMission(save.clanShipOperations, { ownerCreatedAt: save.createdAt, missionId: mission.id,
    encounterRun, expectedRevision: save.clanShipOperations.revision });
  assert.equal(bound.accepted, true, bound.message);
  const before = { ...save, clanShipOperations: bound.state }, raw = rawResult(mission.id);
  const progressed = saves.applyMissionResult(before, raw);
  const result = ops.settleClanShipMission(bound.state, before, progressed, raw, { ownerSaveCreatedAt: save.createdAt, missionId: mission.id, encounterRun });
  assert.equal(result.accepted, true, result.message);
  return { ...progressed, clanShipOperations: result.state, profile: { ...progressed.profile, clanMarks: progressed.profile.clanMarks + result.clanMarksReward } };
}
export function fixture({ evidence = true, veteran = true, ruins = true } = {}) {
  let save = saves.defaultSave(OWNER); save.profile.clanMarks = 1000;
  for (const step of ops.CLAN_SHIP_ONBOARDING_STEPS) save = clanAct(save, { type: 'onboard-step', stepId: step.id }, step.roomId);
  save = clanAct(save, { type: 'accept-mandate' });
  if (veteran) save = completeInterior(save, 'ship-training-circuit');
  for (const id of ['field-jungle-survey', 'field-ice-route', ...(ruins ? ['field-ruins-memory'] : [])]) save = completeField(save, id);
  save = aboard(save, 'archives');
  if (evidence) for (const type of ['accept', 'examine-trophy', 'read-hunt-report', 'read-transfer-record', 'hear-veteran']) save = actIncident(save, type);
  return save;
}
export const hearingAction = (save, command) => ({ ...command, ownerCreatedAt: save.createdAt, expectedRevision: save.clanShipTrophyHearing?.revision ?? 0 });
export const incidentAction = (save, type, values = {}) => ({ incidentId: ID, type, ownerCreatedAt: save.createdAt, expectedRevision: save.clanShipIncidents?.revision ?? 0, ...values });
export function hearingContext(save, command, overrides = {}) {
  const target = hearing.clanShipTrophyHearingTarget(save, command);
  return { save: aboard(save, target.roomId), active: true, observation: { roomId: target.roomId, x: target.x, y: target.y }, ...overrides };
}
export function incidentContext(save, type, overrides = {}) {
  const target = incidents.clanShipIncidentTarget(ID, type, save); assert.ok(target);
  return { save: aboard(save, target.roomId), active: true, observation: { roomId: target.roomId, x: target.x, y: target.y }, ...overrides };
}
export function portable(save) {
  const imported = saves.parseSaveImport(saves.exportSave(save)); assert.ok(imported.save, imported.failure);
  assert.deepEqual(imported.save.clanShipIncidents, save.clanShipIncidents);
  assert.deepEqual(imported.save.clanShipTrophyHearing, save.clanShipTrophyHearing);
  return imported.save;
}
export function actHearing(save, command, contextOverrides = {}) {
  const context = hearingContext(save, command, contextOverrides), bytes = JSON.stringify(context.save);
  const result = incidents.actClanShipTrophyHearing(hearingAction(save, command), context);
  assert.equal(result.accepted, true, `${command.type}: ${result.message}`);
  assert.equal(JSON.stringify(context.save), bytes, 'hearing reducer preserves its input');
  const next = result.changed ? { ...context.save, clanShipTrophyHearing: result.state } : context.save;
  portable(next); return next;
}
export function actIncident(save, type, values = {}, contextOverrides = {}) {
  const context = incidentContext(save, type, contextOverrides), bytes = JSON.stringify(context.save);
  const result = incidents.actClanShipIncident(incidentAction(save, type, values), context);
  assert.equal(result.accepted, true, `${type}: ${result.message}`);
  assert.equal(JSON.stringify(context.save), bytes, 'incident reducer preserves its input');
  const next = result.changed ? { ...context.save, clanShipIncidents: result.state,
    ...(result.hearingState ? { clanShipTrophyHearing: result.hearingState } : {}),
    profile: { ...context.save.profile, clanMarks: context.save.profile.clanMarks + result.clanMarksReward } } : context.save;
  portable(next); return next;
}
export function recruit(save, id) {
  const before = save, npc = ops.CLAN_SHIP_RECRUITS.find(entry => entry.id === id);
  save = clanAct(save, { type: 'recruit', npcId: id }, npc.roomId);
  const registered = residence.registerCompanionResidenceRecruitment(before, save, id);
  assert.equal(registered.accepted, true, registered.message);
  return { ...save, companionResidence: registered.state };
}
export function residenceAct(save, command, roomId = 'archives') {
  const located = aboard(save, roomId), point = motion.CLAN_SHIP_INTERIOR_ROOMS[roomId].servicePoint;
  const result = residence.actCompanionResidence({ ...command, ownerCreatedAt: save.createdAt, expectedRevision: save.companionResidence?.revision ?? 0 }, {
    save: located, active: true, site: 'clan', selectedShipId: SHIP, ownedShipIds: [SHIP], observation: { site: 'clan', roomId, ...point },
  });
  assert.equal(result.accepted, true, `${command.type}: ${result.message}`);
  return { ...located, companionResidence: result.state, profile: { ...located.profile, clanMarks: result.clanMarks } };
}
export function refit(save, id, host = { kind: 'clan', shipId: 'avp-predator-mothership' }) {
  save = residenceAct(save, { type: 'plan-refit', id, host });
  save = residenceAct(save, { type: 'fund-refit', id }, 'hangar');
  return residenceAct(save, { type: 'complete-refit', id }, 'hangar');
}
export function gathered(save = fixture()) {
  for (const witnessId of hearing.CLAN_SHIP_TROPHY_WITNESSES) save = actHearing(save, { type: 'invite', witnessId });
  return save;
}
export function ready(save = gathered()) {
  for (const { id: sampleId } of hearing.CLAN_SHIP_TROPHY_TELEMETRY) save = actHearing(save, { type: 'record-sample', sampleId });
  return save;
}
export function completed(save = ready(), conclusion = 'paired-roles') {
  return actIncident(actIncident(save, 'conclude-provenance', { conclusion }), 'acknowledge-provenance');
}
