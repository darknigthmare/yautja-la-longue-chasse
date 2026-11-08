import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78(), require = createRequire(import.meta.url);
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const incidents = qa.load('app/game/systems/clanShipIncidents.ts');
const dossier = qa.load('app/game/systems/clanShipTrophyCase.ts');
const panel = qa.load('app/game/ClanShipIncidentPanel.tsx');
const ops = qa.load('app/game/systems/clanShipOperations.ts');
const residence = qa.load('app/game/systems/companionResidence.ts');
const docking = qa.load('app/game/systems/clanShipDocking.ts');
const motion = qa.load('app/game/systems/clanShipInterior.ts');
const saves = qa.load('app/game/save.ts');
const { MISSION_BY_ID, MISSIONS } = qa.load('app/game/data.ts');
const OWNER = '2026-11-08T16:00:00.000Z', SHIP = 'classic-predator-spaceship', ID = 'contested-trophy';
const clone = value => JSON.parse(JSON.stringify(value));
const view = save => incidents.clanShipIncidentView(save.clanShipIncidents, ID);
const trophy = save => view(save).trophy;
function aboard(save, roomId = 'hangar') {
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
  const state = save.clanShipOperations ?? ops.createClanShipOperations(OWNER);
  const result = ops.actClanShipOperations(state, { ...command, expectedRevision: state.revision }, {
    ownerCreatedAt: OWNER, campaign: save, docking: { ownerCreatedAt: OWNER, status: 'aboard', roomId },
  });
  assert.equal(result.accepted, true, `${command.type}: ${result.message}`);
  assert.equal(ops.inspectClanShipOperations(result.state, OWNER).status, 'valid');
  return { ...save, clanShipOperations: result.state, profile: { ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward } };
}
function rawResult(missionId) {
  const mission = MISSION_BY_ID[missionId];
  return { missionId, difficultyId: 'hunter', outcome: 'success', score: 80, scans: 3, elapsedSeconds: 240,
    completedObjectiveIds: mission.objectives.filter(entry => entry.required || entry.kind === 'extract').map(entry => entry.id),
    honorEvents: [], trophyQuality: 'elite', trophyClaims: [{ id: `${missionId}-clan-trophy-proof`, definitionId: mission.trophy.id,
      targetName: mission.targetName, targetKind: mission.targetKind, partId: mission.trophy.partId, condition: 'pristine', quality: 'elite' }],
    kills: 3, secondWindUsed: false, completedAt: '2026-11-08T17:00:00.000Z' };
}
function completeInterior(save, contractId) {
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
  const bound = ops.bindClanShipMission(save.clanShipOperations, { ownerCreatedAt: OWNER, missionId: mission.id,
    encounterRun, expectedRevision: save.clanShipOperations.revision });
  assert.equal(bound.accepted, true, bound.message);
  const before = { ...save, clanShipOperations: bound.state }, raw = rawResult(mission.id);
  const progressed = saves.applyMissionResult(before, raw);
  const result = ops.settleClanShipMission(bound.state, before, progressed, raw, { ownerSaveCreatedAt: OWNER, missionId: mission.id, encounterRun });
  assert.equal(result.accepted, true, result.message);
  return { ...progressed, clanShipOperations: result.state, profile: { ...progressed.profile, clanMarks: progressed.profile.clanMarks + result.clanMarksReward } };
}
function fixture({ veteran = true, ruins = true } = {}) {
  let save = saves.defaultSave(OWNER); save.profile.clanMarks = 1000;
  for (const step of ops.CLAN_SHIP_ONBOARDING_STEPS) save = clanAct(save, { type: 'onboard-step', stepId: step.id }, step.roomId);
  save = clanAct(save, { type: 'accept-mandate' });
  if (veteran) save = completeInterior(save, 'ship-training-circuit');
  for (const id of ['field-jungle-survey', 'field-ice-route', ...(ruins ? ['field-ruins-memory'] : [])]) save = completeField(save, id);
  return aboard(save, 'archives');
}
function action(save, type, values = {}) {
  return { incidentId: ID, type, ownerCreatedAt: save.createdAt, expectedRevision: save.clanShipIncidents?.revision ?? 0, ...values };
}
function context(save, type, values = {}) {
  const target = incidents.clanShipIncidentTarget(ID, type, save); assert.ok(target);
  return { save: aboard(save, target.roomId), active: true, observation: { roomId: target.roomId, x: target.x, y: target.y }, ...values };
}
function act(save, type, values = {}, ctxValues = {}) {
  const ctx = context(save, type, ctxValues), bytes = JSON.stringify(ctx.save);
  const result = incidents.actClanShipIncident(action(save, type, values), ctx);
  assert.equal(result.accepted, true, `${type}: ${result.message}`);
  assert.equal(JSON.stringify(ctx.save), bytes, 'the reducer preserves its input');
  const next = result.changed ? { ...ctx.save, clanShipIncidents: result.state,
    profile: { ...ctx.save.profile, clanMarks: ctx.save.profile.clanMarks + result.clanMarksReward } } : ctx.save;
  assert.equal(incidents.inspectClanShipIncidents(next.clanShipIncidents, OWNER).status, 'valid', type);
  const imported = saves.parseSaveImport(saves.exportSave(next)); assert.ok(imported.save, `${type}: ${imported.failure}`);
  assert.deepEqual(imported.save.clanShipIncidents, next.clanShipIncidents);
  return next;
}
function denied(save, type, values = {}, ctxValues = {}) {
  const ctx = context(save, type, ctxValues), bytes = JSON.stringify(ctx.save);
  const result = incidents.actClanShipIncident(action(save, type, values), ctx);
  assert.equal(result.accepted, false, `${type}: ${result.message}`); assert.equal(result.changed, false);
  assert.equal(result.clanMarksReward, 0); assert.equal(JSON.stringify(ctx.save), bytes); return result;
}
function evidence(save = fixture()) {
  for (const type of ['accept', 'examine-trophy', 'read-hunt-report', 'read-transfer-record', 'hear-veteran']) save = act(save, type);
  return save;
}
function storage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function recruit(save, id) {
  const before = save, npc = ops.CLAN_SHIP_RECRUITS.find(entry => entry.id === id);
  save = clanAct(save, { type: 'recruit', npcId: id }, npc.roomId);
  const registered = residence.registerCompanionResidenceRecruitment(before, save, id);
  assert.equal(registered.accepted, true, registered.message);
  return { ...save, companionResidence: registered.state };
}
function residenceAct(save, command, roomId = 'archives') {
  const located = aboard(save, roomId), point = motion.CLAN_SHIP_INTERIOR_ROOMS[roomId].servicePoint;
  const result = residence.actCompanionResidence({ ...command, ownerCreatedAt: OWNER, expectedRevision: save.companionResidence?.revision ?? 0 }, {
    save: located, active: true, site: 'clan', selectedShipId: SHIP, ownedShipIds: [SHIP], observation: { site: 'clan', roomId, ...point },
  });
  assert.equal(result.accepted, true, `${command.type}: ${result.message}`);
  return { ...located, companionResidence: result.state, profile: { ...located.profile, clanMarks: result.clanMarks } };
}
function refit(save, id, host = { kind: 'clan', shipId: 'avp-predator-mothership' }) {
  save = residenceAct(save, { type: 'plan-refit', id, host });
  save = residenceAct(save, { type: 'fund-refit', id }, 'hangar');
  return residenceAct(save, { type: 'complete-refit', id }, 'hangar');
}

test('B03 requires the actual ruins contract and preserves the independent hunting and transport evidence', () => {
  const missing = fixture({ ruins: false });
  assert.equal(incidents.evaluateClanShipIncidentOffer(missing, ID).allowed, false);
  assert.match(denied(missing, 'accept').message, /field-ruins-memory/);
  const save = fixture();
  assert.equal(incidents.evaluateClanShipIncidentOffer(save, ID).allowed, true);
  assert.equal(incidents.clanShipIncidentDefinition(ID).reference, 'OPS-B03');
  assert.match(dossier.CLAN_SHIP_TROPHY_CASE.support, /B-17.*T-04/);
  assert.match(dossier.CLAN_SHIP_TROPHY_CASE.huntReport, /Balafre de Cendre.*B-17/);
  assert.match(dossier.CLAN_SHIP_TROPHY_CASE.transferRecord, /Trace Froide.*T-04/);
  assert.equal(incidents.clanShipIncidentView(null, ID).accepted, false);
});

test('a physical examination, two records and the present veteran are all necessary before deciding', () => {
  let save = fixture();
  denied(save, 'accept', {}, { active: false });
  denied(save, 'accept', {}, { observation: { roomId: 'archives', x: 128, y: 635 } });
  denied(save, 'accept', { ownerCreatedAt: 'foreign' });
  save = act(save, 'accept');
  assert.match(denied(save, 'read-hunt-report').message, /support C-37/);
  save = act(save, 'examine-trophy');
  assert.match(denied(save, 'conclude-provenance', { conclusion: 'hunt-attribution' }).message, /C-37\/01/);
  save = act(save, 'read-transfer-record');
  assert.match(denied(save, 'hear-veteran').message, /C-37\/01/);
  save = act(save, 'read-hunt-report');
  assert.match(denied(save, 'conclude-provenance', { conclusion: 'hunt-attribution' }).message, /Écoute Balafre/);
  const wrongRoom = context(save, 'hear-veteran'); wrongRoom.observation.roomId = 'archives';
  denied(save, 'hear-veteran', {}, wrongRoom);
  save = act(save, 'hear-veteran');
  assert.equal(trophy(save).testimonyHeard, true);
  assert.equal(view(save).completedRevision, null);
  assert.equal(incidents.clanShipIncidentNext(view(save), save).type, 'conclude-provenance');
});

test('unsupported conclusions identify the precise record to revisit without confiscation or lost clues', () => {
  let save = evidence(), inventory = clone(save.inventory), profile = clone(save.profile);
  for (const [conclusion, review, type] of [['bearer-credit', 'hunt-report', 'read-hunt-report'], ['erase-bearer', 'transfer-record', 'read-transfer-record']]) {
    save = act(save, 'conclude-provenance', { conclusion });
    assert.equal(trophy(save).reviewRequired, review); assert.equal(trophy(save).conclusion, null);
    assert.equal(trophy(save).supportRead, true); assert.equal(trophy(save).testimonyHeard, true);
    assert.equal(trophy(save).huntReportRead, true); assert.equal(trophy(save).transferRecordRead, true);
    assert.equal(incidents.clanShipIncidentNext(view(save), save).type, type);
    denied(save, 'conclude-provenance', { conclusion: 'paired-roles' });
    save = act(save, type);
    assert.equal(trophy(save).reviewRequired, null);
  }
  assert.equal(view(save).faults, 2);
  assert.deepEqual(save.inventory, inventory); assert.deepEqual(save.profile, profile);
  assert.equal(save.clanShipOperations.circleConfirmed, false);
});

test('both supported inscriptions preserve the same proven roles and require the two responses before the unique reward', () => {
  for (const conclusion of ['hunt-attribution', 'paired-roles']) {
    let save = evidence(), marks = save.profile.clanMarks, inventory = clone(save.inventory), rank = save.profile.rankId;
    save = act(save, 'conclude-provenance', { conclusion });
    assert.equal(trophy(save).conclusion, conclusion); assert.equal(trophy(save).traceReaction, true);
    assert.equal(trophy(save).veteranReaction, false); assert.equal(view(save).completedRevision, null);
    assert.equal(save.profile.clanMarks, marks, 'a decision is not the final receipt');
    const decidedRevision = save.clanShipIncidents.revision;
    const repeat = act(save, 'conclude-provenance', { conclusion: conclusion === 'paired-roles' ? 'hunt-attribution' : 'paired-roles' });
    assert.equal(repeat.clanShipIncidents.revision, decidedRevision); assert.equal(trophy(repeat).conclusion, conclusion);
    save = act(save, 'acknowledge-provenance');
    assert.equal(trophy(save).veteranReaction, true); assert.ok(view(save).completedRevision);
    assert.equal(save.profile.clanMarks, marks + 35); assert.equal(save.profile.rankId, rank); assert.deepEqual(save.inventory, inventory);
    const repeated = act(save, 'acknowledge-provenance');
    assert.equal(repeated.profile.clanMarks, marks + 35); assert.equal(repeated.clanShipIncidents.revision, save.clanShipIncidents.revision);
    assert.equal(incidents.clanShipIncidentNext(view(repeated), repeated), null);
    assert.deepEqual(save.clanShipIncidents.incidents[0].events.filter(entry => entry.interlocutor).map(entry => entry.interlocutor),
      ['cold-trace', 'ash-scar', 'cold-trace', 'ash-scar']);
  }
});

test('a witness becoming unavailable after acceptance cannot be heard or acknowledge the conclusion', () => {
  let save = fixture({ veteran: false });
  for (const type of ['accept', 'examine-trophy', 'read-hunt-report', 'read-transfer-record']) save = act(save, type);
  assert.match(denied(save, 'hear-veteran').message, /ship-training-circuit/);
  save = completeInterior(save, 'ship-training-circuit');
  save = act(save, 'hear-veteran');
  const accepted = save;
  save = recruit(save, 'cold-trace');
  assert.match(denied(save, 'conclude-provenance', { conclusion: 'hunt-attribution' }).message, /présent et disponible/);
  assert.equal(trophy(save).testimonyHeard, true);
  save = act(accepted, 'conclude-provenance', { conclusion: 'hunt-attribution' });
  save = recruit(save, 'ash-scar');
  assert.match(denied(save, 'acknowledge-provenance').message, /présent et disponible/);
  assert.equal(trophy(save).conclusion, 'hunt-attribution'); assert.equal(view(save).completedRevision, null);
});

test('dialogues follow a reassigned clan resident and the saved meeting survives later transfers', () => {
  let save = fixture();
  save = refit(recruit(save, 'cold-trace'), 'cold-trace');
  save = refit(recruit(save, 'ash-scar'), 'ash-scar');
  assert.equal(incidents.clanShipIncidentNpcRoom(save, 'cold-trace'), 'entrainement');
  assert.equal(incidents.clanShipIncidentNpcRoom(save, 'ash-scar'), 'soins');
  assert.equal(incidents.clanShipIncidentTarget(ID, 'accept', save).roomId, 'entrainement');
  save = evidence(save);
  assert.equal(save.clanShipIncidents.incidents[0].events[0].observation.roomId, 'entrainement');
  assert.equal(save.clanShipIncidents.incidents[0].events.at(-1).observation.roomId, 'soins');
  save = act(save, 'conclude-provenance', { conclusion: 'paired-roles' });
  save = residenceAct(save, { type: 'suspend', id: 'ash-scar' }, 'hangar');
  denied(save, 'acknowledge-provenance');
  save = residenceAct(save, { type: 'resume', id: 'ash-scar' }, 'hangar');
  save = act(save, 'acknowledge-provenance');
  save = refit(save, 'cold-trace', { kind: 'personal', shipId: SHIP });
  assert.equal(incidents.clanShipIncidentNpcRoom(save, 'cold-trace'), null);
  const imported = saves.parseSaveImport(saves.exportSave(save)); assert.ok(imported.save, imported.failure);
  assert.deepEqual(imported.save.clanShipIncidents, save.clanShipIncidents, 'historical interlocutors are not rewritten by a new berth');
});

test('V1 maintenance journals are read unchanged and upgrade atomically on the next real action', () => {
  let save = completeInterior(fixture(), 'ship-seal-check');
  const target = incidents.clanShipIncidentTarget('sealed-lot', 'accept');
  const legacy = { version: 1, ownerCreatedAt: OWNER, revision: 1, incidents: [{ id: 'sealed-lot', events: [
    { revision: 1, type: 'accept', observation: { roomId: target.roomId, x: target.x, y: target.y } },
  ] }] };
  save = { ...save, clanShipIncidents: clone(legacy) };
  assert.deepEqual(incidents.inspectClanShipIncidents(legacy, OWNER).state, legacy);
  assert.deepEqual(saves.parseSaveImport(saves.exportSave(save)).save.clanShipIncidents, legacy);
  const progressed = act(save, 'accept');
  assert.equal(progressed.clanShipIncidents.version, 2);
  assert.deepEqual(progressed.clanShipIncidents.incidents[0], legacy.incidents[0]);
  const forgedLegacy = clone(progressed); forgedLegacy.clanShipIncidents.version = 1;
  assert.equal(saves.parseSaveImport(JSON.stringify(forgedLegacy)).failure, 'invalid-save');
  const future = clone(progressed); future.clanShipIncidents.version = 3;
  assert.equal(saves.parseSaveImport(JSON.stringify(future)).failure, 'future-version');
});

test('imports reject fabricated witness names, impossible positions, omitted evidence and wrong verdicts', () => {
  let save = evidence(); save = act(save, 'conclude-provenance', { conclusion: 'paired-roles' }); save = act(save, 'acknowledge-provenance');
  for (const mutate of [
    state => { state.incidents[0].events[0].interlocutor = 'iron-claw'; },
    state => { delete state.incidents[0].events[4].interlocutor; },
    state => { state.incidents[0].events[4].observation = { roomId: 'conseil', x: 50, y: 50 }; },
    state => { state.incidents[0].events[2].type = 'read-transfer-record'; },
    state => { state.incidents[0].events[5].conclusion = 'bearer-credit'; },
    state => { state.incidents[0].events[5].conclusion = 'invented-verdict'; },
    state => { state.incidents[0].events[5].branch = 'A'; },
    state => { state.incidents[0].events[6].revision = 5; },
  ]) {
    const bad = clone(save); mutate(bad.clanShipIncidents);
    assert.equal(saves.parseSaveImport(JSON.stringify(bad)).failure, 'invalid-save');
  }
  const noContract = clone(save); noContract.clanShipOperations = null;
  assert.equal(saves.parseSaveImport(JSON.stringify(noContract)).failure, 'invalid-save');
});

test('confirmed writes and reloads retain evidence, re-reading, both reactions and the single reward', () => {
  let save = fixture(), disk = storage();
  for (const [type, values] of [['accept'], ['examine-trophy'], ['read-hunt-report'], ['read-transfer-record'], ['hear-veteran'],
    ['conclude-provenance', { conclusion: 'bearer-credit' }], ['read-hunt-report'],
    ['conclude-provenance', { conclusion: 'hunt-attribution' }], ['acknowledge-provenance']]) {
    save = act(save, type, values);
    const written = saves.writeSaveWithStatus(save, disk); assert.equal(written.persisted, true, written.failure);
    const loaded = saves.loadSaveWithStatus(disk); assert.equal(loaded.loaded, true, loaded.failure);
    assert.deepEqual(loaded.save.clanShipIncidents, save.clanShipIncidents); assert.equal(loaded.save.profile.clanMarks, save.profile.clanMarks);
    save = loaded.save;
  }
  assert.equal(view(save).faults, 1); assert.ok(view(save).completedRevision);
  const marks = save.profile.clanMarks; save = act(save, 'acknowledge-provenance'); assert.equal(save.profile.clanMarks, marks);
});

test('storage failure does not confirm an attribution or pay an unacknowledged receipt', () => {
  for (const final of [false, true]) {
    let save = evidence();
    if (final) save = act(save, 'conclude-provenance', { conclusion: 'paired-roles' });
    const type = final ? 'acknowledge-provenance' : 'conclude-provenance', command = { incidentId: ID, type, ...(final ? {} : { conclusion: 'paired-roles' }) };
    const ctx = context(save, type), disk = storage(); let acknowledged = ctx.save;
    assert.equal(saves.writeSaveWithStatus(acknowledged, disk).persisted, true);
    const bytes = [...disk.values], marks = acknowledged.profile.clanMarks;
    disk.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
    const result = panel.submitClanShipIncident({ save: acknowledged, onAction(action, observation) {
      const reduced = incidents.actClanShipIncident(action, { save: acknowledged, active: true, observation });
      assert.equal(reduced.accepted, true);
      const written = saves.writeSaveWithStatus({ ...acknowledged, clanShipIncidents: reduced.state,
        profile: { ...acknowledged.profile, clanMarks: acknowledged.profile.clanMarks + reduced.clanMarksReward } }, disk);
      if (!written.persisted) return false; acknowledged = written.save; return true;
    } }, command, ctx.observation, true);
    assert.equal(result.accepted, false); assert.deepEqual([...disk.values], bytes); assert.equal(acknowledged.profile.clanMarks, marks);
    assert.equal(view(acknowledged).completedRevision, null);
    assert.equal(trophy(acknowledged).conclusion, final ? 'paired-roles' : null);
  }
});

test('excess wrong proposals leave enough journal capacity for the supported conclusion and the physical return', () => {
  let save = evidence();
  while (save.clanShipIncidents.incidents[0].events.length < 88) {
    save = act(save, 'conclude-provenance', { conclusion: 'bearer-credit' });
    save = act(save, 'read-hunt-report');
  }
  denied(save, 'conclude-provenance', { conclusion: 'bearer-credit' });
  save = act(save, 'conclude-provenance', { conclusion: 'hunt-attribution' });
  save = act(save, 'acknowledge-provenance');
  assert.ok(view(save).completedRevision); assert.ok(save.clanShipIncidents.incidents[0].events.length <= 96);
});

test('the production controller reaches all B03 objects, both interlocutors and the safe hangar return', () => {
  let save = fixture(), roomId = 'hangar', actor = motion.clanShipInteriorSpawn(roomId);
  function walk(target) {
    const route = motion.planClanShipInteriorPath(roomId, actor, target); assert.ok(route);
    let waypoints = route.points.slice(1), arrived = false;
    for (let frame = 0; frame < 1200; frame++) {
      const step = motion.stepClanShipInteriorPath(roomId, actor, waypoints, 1 / 60);
      assert.equal(step.blocked, false); actor = step.actor; waypoints = step.remaining;
      if (step.arrived) { arrived = true; break; }
    }
    assert.equal(arrived, true);
  }
  function travel(target) {
    for (const next of motion.clanShipInteriorRoomRoute(roomId, target.roomId).slice(1)) {
      const door = motion.CLAN_SHIP_INTERIOR_ROOMS[roomId].doors.find(entry => entry.targetRoomId === next);
      walk(door); assert.equal(motion.canClanShipInteriorTransition(roomId, next, actor), true);
      const previous = roomId; roomId = next; actor = motion.clanShipInteriorSpawn(roomId, previous);
    }
    walk(target); assert.equal(incidents.clanShipIncidentInReach({ roomId, x: actor.x, y: actor.y }, target), true);
  }
  for (const type of ['accept', 'examine-trophy', 'read-hunt-report', 'read-transfer-record', 'hear-veteran', 'conclude-provenance', 'acknowledge-provenance']) {
    const target = incidents.clanShipIncidentTarget(ID, type, save); travel(target);
    save = act(save, type, type === 'conclude-provenance' ? { conclusion: 'paired-roles' } : {}, { observation: { roomId, x: actor.x, y: actor.y } });
  }
  travel(incidents.CLAN_SHIP_INCIDENT_TARGETS['hangar-briefing']);
  assert.equal(roomId, 'hangar'); assert.ok(view(save).completedRevision);
});

test('rendered evidence names separate records, shows all motivated choices and updates the actual support inscription', () => {
  let save = evidence();
  const html = renderToStaticMarkup(React.createElement(panel.ClanShipTrophyEvidence, { view: view(save) }));
  assert.match(html, /C-37\/01/); assert.match(html, /C-37\/02/); assert.match(html, /Témoignage conservé/);
  const choices = renderToStaticMarkup(React.createElement(panel.ClanShipIncidentActions, { view: view(save), disabled: false, onAction() {} }));
  for (const choice of dossier.CLAN_SHIP_TROPHY_CONCLUSIONS) assert.match(choices, new RegExp(`data-incident-action="contested-trophy:conclude-provenance:${choice.id}"`));
  const props = () => ({ save, roomId: 'trophees', position: { roomId: 'trophees', x: 830, y: 650 }, suspended: false, onNavigate() {}, onAction() {} });
  let scene = qa.render('app/game/ClanShipIncidentScene.tsx', props());
  assert.match(scene, /data-trophy-plaque="disputed"/); assert.match(scene, /Strie B-17/); assert.match(scene, /data-trophy-record="transfer"/);
  assert.doesNotMatch(scene, /twin-circuit-relay\.png|sealed-isolator\.png/, 'B03 does not accidentally render a maintenance prop');
  save = act(save, 'conclude-provenance', { conclusion: 'paired-roles' }); save = act(save, 'acknowledge-provenance');
  scene = qa.render('app/game/ClanShipIncidentScene.tsx', props());
  assert.match(scene, /data-trophy-plaque="paired-roles"/); assert.match(scene, /Inscription confirmée/);
  const chronicle = renderToStaticMarkup(React.createElement(panel.ClanShipTrophyEvidence, { view: view(save) }));
  assert.match(chronicle, /data-trophy-reaction="cold-trace"/); assert.match(chronicle, /data-trophy-reaction="ash-scar"/);
  assert.match(chronicle, /Réponse enregistrée/);
});
