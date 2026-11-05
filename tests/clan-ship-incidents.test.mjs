import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const incidents = qa.load('app/game/systems/clanShipIncidents.ts');
const operations = qa.load('app/game/systems/clanShipOperations.ts');
const docking = qa.load('app/game/systems/clanShipDocking.ts');
const interior = qa.load('app/game/systems/clanShipInterior.ts');
const saves = qa.load('app/game/save.ts');
const archives = qa.load('app/game/systems/completeArchive.ts');
const slots = qa.load('app/game/systems/campaignSlots.ts');
const { MISSION_BY_ID } = qa.load('app/game/data.ts');
const OWNER = '2026-11-05T12:00:00.000Z';
const OTHER = '2026-11-05T13:00:00.000Z';
const MAIN = saves.SAVE_STORAGE_KEY;
const clone = value => structuredClone(value);

function storage(values = new Map()) {
  return {
    values, writes: [], quotaKey: null, failReadback: false, pendingReadback: false,
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) {
      if (key === MAIN && this.pendingReadback) { this.pendingReadback = false; throw Error('Uncertain readback'); }
      return values.get(key) ?? null;
    },
    setItem(key, raw) {
      if (this.quotaKey === key) throw new DOMException('Full', 'QuotaExceededError');
      values.set(key, raw); this.writes.push(['set', key]);
      if (key === MAIN && this.failReadback) { this.failReadback = false; this.pendingReadback = true; }
    },
    removeItem(key) { values.delete(key); this.writes.push(['remove', key]); },
  };
}
const bytes = store => [...store.values].sort(([a], [b]) => a.localeCompare(b));
function write(save, store) {
  const result = saves.writeSaveWithStatus(save, store, MAIN);
  assert.equal(result.persisted, true, result.failure);
  return result.save;
}
function operation(save, type, values = {}, roomId = 'conseil') {
  const current = { ...save, clanShipDocking: { ...save.clanShipDocking, roomId } }, state = current.clanShipOperations;
  const result = operations.actClanShipOperations(state, { type, expectedRevision: state.revision, ...values },
    { ownerCreatedAt: OWNER, docking: current.clanShipDocking, campaign: current });
  assert.equal(result.accepted, true, `${type}: ${result.reason}: ${result.message}`);
  return { ...current, clanShipOperations: result.state,
    profile: { ...current.profile, clanMarks: current.profile.clanMarks + result.clanMarksReward } };
}
function ready() {
  let save = saves.defaultSave(OWNER);
  let visit = docking.createClanShipDockingState(OWNER, 'classic-predator-spaceship');
  for (const type of ['approach', 'dock', 'board']) visit = docking.actClanShipDocking(visit, { type },
    { ownerCreatedAt: OWNER, personalShipId: 'classic-predator-spaceship' }).state;
  save = { ...save, clanShipDocking: visit, clanShipOperations: operations.createClanShipOperations(OWNER), clanShipIncidents: incidents.createClanShipIncidents(OWNER) };
  for (const step of operations.CLAN_SHIP_ONBOARDING_STEPS) save = operation(save, 'onboard-step', { stepId: step.id }, step.roomId);
  return operation(save, 'accept-mandate');
}
function interiorContract(save, id) {
  save = operation(save, 'accept-contract', { contractId: id });
  for (const step of operations.clanShipContract(id).steps) save = operation(save, 'interior-step', { stepId: step.id }, step.roomId);
  return save;
}
function missionResult(mission, claimId = mission.id) {
  return { missionId: mission.id, difficultyId: 'hunter', outcome: 'success', score: 80, scans: 3, elapsedSeconds: 240,
    completedObjectiveIds: mission.objectives.filter(item => item.required || item.kind === 'extract').map(item => item.id),
    honorEvents: [], trophyQuality: 'elite', trophyClaims: [{ id: `${claimId}-incident-proof`, definitionId: mission.trophy.id,
      targetName: mission.targetName, targetKind: mission.targetKind, partId: mission.trophy.partId, condition: 'pristine', quality: 'elite' }],
    kills: 3, secondWindUsed: false, completedAt: '2026-11-05T14:00:00.000Z' };
}
function fieldContract(source, id) {
  const definition = operations.clanShipContract(id), mission = MISSION_BY_ID[definition.missionId];
  let save = source;
  for (const previous of Object.values(MISSION_BY_ID).filter(item => item.order < mission.order).sort((a, b) => a.order - b.order)) {
    if (save.missionProgress[previous.id].status !== 'completed') save = saves.applyMissionResult(save, missionResult(previous));
  }
  assert.notEqual(save.missionProgress[mission.id].status, 'locked', 'prerequisites are played through the campaign reducer');
  save = operation(save, 'accept-contract', { contractId: id });
  const encounterRun = save.missionProgress[mission.id].attempts;
  const bound = operations.bindClanShipMission(save.clanShipOperations, { ownerCreatedAt: OWNER, missionId: mission.id,
    encounterRun, expectedRevision: save.clanShipOperations.revision });
  assert.equal(bound.accepted, true, bound.message);
  save = { ...save, clanShipOperations: bound.state };
  const result = missionResult(mission, id);
  const progressed = saves.applyMissionResult(save, result);
  const settled = operations.settleClanShipMission(save.clanShipOperations, save, progressed, result,
    { ownerSaveCreatedAt: OWNER, missionId: mission.id, encounterRun });
  assert.equal(settled.accepted, true, settled.message);
  assert.equal(settled.clanMarksReward, definition.clanMarksReward);
  return { ...progressed, clanShipOperations: settled.state,
    profile: { ...progressed.profile, clanMarks: progressed.profile.clanMarks + settled.clanMarksReward } };
}
function spaceContract(save, id) {
  save = operation(save, 'accept-contract', { contractId: id });
  const commands = id === 'space-screening' ? ['scan', 'manoeuvre', 'brace', 'brace', 'extract']
    : ['scan', 'scan', 'manoeuvre', 'brace', 'disrupt', 'brace', 'disrupt', 'brace', 'manoeuvre', 'brace', 'board', 'brace', 'extract'];
  for (const type of commands) save = operation(save, 'space-command', { command: { type, expectedTurn: save.clanShipOperations.spaceEncounter.turn } });
  assert.equal(save.clanShipOperations.spaceEncounter.status, 'victory');
  return save;
}
const BASES = new Map();
function unlocked(id) {
  if (!BASES.has(id)) {
    let save = ready();
    if (id === 'seal-discrepancy') save = interiorContract(save, 'ship-seal-check');
    if (id === 'relay-flicker') save = interiorContract(save, 'ship-armory-audit');
    if (id === 'trophy-provenance') save = fieldContract(fieldContract(save, 'field-ice-route'), 'field-ruins-memory');
    if (id === 'return-transfer') save = spaceContract(spaceContract(save, 'space-screening'), 'space-recovery');
    assert.equal(saves.parseSaveImport(JSON.stringify(save)).failure, null, `${id}: genuine prior operations`);
    BASES.set(id, save);
  }
  return clone(BASES.get(id));
}
function context(save, roomId = save.clanShipDocking.roomId, physical = {}) {
  return { ownerCreatedAt: OWNER, campaign: save, operations: save.clanShipOperations,
    docking: { ...save.clanShipDocking, roomId }, ...physical };
}
const command = (save, type, values = {}) => ({ type, expectedRevision: save.clanShipIncidents.revision, ...values });
function perform(save, type, values = {}, ctx = context(save)) {
  const before = JSON.stringify(save), result = incidents.actClanShipIncidents(save.clanShipIncidents, command(save, type, values), ctx);
  assert.equal(result.accepted, true, `${type}: ${result.reason}: ${result.message}`);
  assert.equal(result.changed, true);
  assert.equal(JSON.stringify(save), before, 'pure proposals preserve the input campaign');
  assert.equal(result.state.revision, save.clanShipIncidents.revision + 1);
  assert.equal(incidents.inspectClanShipIncidents(result.state, OWNER).status, 'valid', 'every accepted transition has valid evidence');
  return { save: { ...save, clanShipDocking: { ...save.clanShipDocking, roomId: ctx.docking.roomId }, clanShipIncidents: result.state,
    profile: { ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward } }, result };
}
function deny(save, action, ctx = context(save), expectedReason) {
  const before = JSON.stringify(save);
  const result = incidents.actClanShipIncidents(save.clanShipIncidents, action, ctx);
  assert.equal(result.accepted, false, result.message);
  assert.equal(result.changed, false); assert.equal(result.state, save.clanShipIncidents); assert.equal(result.clanMarksReward, 0);
  assert.equal(JSON.stringify(save), before);
  if (expectedReason) assert.equal(result.reason, expectedReason);
  return result;
}
function start(id, save = unlocked(id), roomId = 'conseil') {
  return perform(save, 'start-incident', { incidentId: id }, context(save, roomId)).save;
}
function step(save, choiceId) {
  const current = incidents.getClanShipIncidentStep(save.clanShipIncidents), target = incidents.clanShipIncidentTarget(current.targetId);
  const type = current.kind === 'choice' ? 'choose' : current.kind;
  const values = type === 'choose' ? { targetId: target.id, choiceId: choiceId ?? current.correctChoiceId }
    : type === 'escort-checkpoint' ? { checkpointId: current.id } : { targetId: target.id };
  return perform(save, type, values, context(save, target.roomId, { actor: target.position,
    escort: type === 'escort-checkpoint' ? { roomId: target.roomId, position: target.position } : null }));
}
function advance(save, count) { for (let index = 0; index < count; index++) save = step(save).save; return save; }
function finish(save) { while (save.clanShipIncidents.activeIncident) save = step(save).save; return save; }

test('four authored incidents have physical reachable targets and existing prerequisite evidence', () => {
  assert.deepEqual(incidents.CLAN_SHIP_INCIDENT_IDS, ['seal-discrepancy', 'relay-flicker', 'trophy-provenance', 'return-transfer']);
  const ids = new Set();
  for (const definition of incidents.CLAN_SHIP_INCIDENTS) {
    assert.ok(operations.clanShipContract(definition.prerequisiteContractId));
    assert.ok(definition.steps.length >= 5);
    assert.ok(definition.clanMarksReward > 0);
    for (const phase of definition.steps) {
      assert.ok(!ids.has(phase.id)); ids.add(phase.id);
      const target = incidents.clanShipIncidentTarget(phase.targetId);
      assert.equal(target.incidentId, definition.id);
      assert.equal(interior.isClanShipInteriorWalkable(target.roomId, target.position), true, target.id);
      assert.ok(interior.planClanShipInteriorPath(target.roomId, interior.clanShipInteriorSpawn(target.roomId), target.position), target.id);
      assert.ok(phase.evidence.length > 35, 'a collected step supplies readable evidence');
    }
  }
  assert.equal(operations.CLAN_SHIP_CONTRACT_IDS.length, 12, 'incidents do not inflate the old contract catalogue');
});

test('absence, an empty valid dossier, malformed evidence and future versions remain distinct', () => {
  for (const absent of [null, undefined]) assert.equal(incidents.inspectClanShipIncidents(absent, OWNER).status, 'absent');
  const fresh = incidents.createClanShipIncidents(OWNER);
  assert.equal(incidents.inspectClanShipIncidents(fresh, OWNER).status, 'valid');
  for (const raw of [[], {}, false, { ...fresh, revision: 0.5 }, { ...fresh, revision: -1 }, { ...fresh, revision: 1 },
    { ...fresh, extra: 1 }, { ...fresh, ownerCreatedAt: OTHER }, { ...fresh, activeIncident: {} }, { ...fresh, completedIncidents: [null] }]) {
    assert.equal(incidents.inspectClanShipIncidents(raw, OWNER).status, 'invalid-save', JSON.stringify(raw));
  }
  assert.equal(incidents.inspectClanShipIncidents({ ...fresh, version: 2 }, OWNER).status, 'future-version');
  assert.throws(() => incidents.createClanShipIncidents('  '));
  const inspected = incidents.inspectClanShipIncidents(fresh, OWNER).state;
  inspected.completedIncidents.push({});
  assert.deepEqual(fresh.completedIncidents, [], 'inspection returns detached plain data');
});

test('all four incidents are gated by their real prior contract and accept at their source without recruited staff', () => {
  const noProof = ready();
  for (const definition of incidents.CLAN_SHIP_INCIDENTS) {
    const unavailable = incidents.evaluateClanShipIncident(noProof.clanShipIncidents, definition.id, noProof);
    assert.equal(unavailable.allowed, false); assert.match(unavailable.reason, /Prérequis/);
    deny(noProof, command(noProof, 'start-incident', { incidentId: definition.id }), context(noProof, 'conseil'), 'incident-unavailable');
    const proven = unlocked(definition.id);
    assert.deepEqual(proven.clanShipOperations.recruitedNpcIds, []);
    assert.equal(incidents.evaluateClanShipIncident(proven.clanShipIncidents, definition.id, proven).allowed, true);
    assert.equal(start(definition.id, proven, definition.originRoomId).clanShipIncidents.activeIncident.incidentId, definition.id);
  }
});

test('start guards owner, docking, room and the actual Blooded chronicle instead of honor', () => {
  const source = unlocked('seal-discrepancy'), action = command(source, 'start-incident', { incidentId: 'seal-discrepancy' });
  deny(source, action, { ...context(source, 'conseil'), ownerCreatedAt: OTHER }, 'invalid-context');
  deny(source, action, { ...context(source, 'conseil'), campaign: { ...source, createdAt: OTHER } }, 'invalid-context');
  deny(source, action, { ...context(source, 'conseil'), docking: { ...source.clanShipDocking, ownerCreatedAt: OTHER } }, 'not-aboard');
  deny(source, action, { ...context(source, 'conseil'), docking: { ...source.clanShipDocking, status: 'docked' } }, 'not-aboard');
  deny(source, action, context(source, 'trophees'), 'wrong-room');
  const youth = { ...source, profile: { ...source.profile, honor: 999999 }, prologue: { status: 'active', chronicle: null } };
  deny(youth, command(youth, 'start-incident', { incidentId: 'seal-discrepancy' }), context(youth, 'conseil'), 'blooded-required');
});

test('operations and incidents exclude each other in both directions and a second incident cannot replace an active one', () => {
  let source = unlocked('seal-discrepancy');
  source = operation(source, 'accept-contract', { contractId: 'ship-training-circuit' });
  deny(source, command(source, 'start-incident', { incidentId: 'seal-discrepancy' }), context(source), 'incident-unavailable');
  const active = start('seal-discrepancy');
  const rejected = operations.actClanShipOperations(active.clanShipOperations,
    { type: 'accept-contract', contractId: 'ship-training-circuit', expectedRevision: active.clanShipOperations.revision },
    { ownerCreatedAt: OWNER, docking: { ...active.clanShipDocking, roomId: 'conseil' }, campaign: active });
  assert.equal(rejected.accepted, false); assert.equal(rejected.clanMarksReward, 0);
  deny(active, command(active, 'start-incident', { incidentId: 'seal-discrepancy' }), context(active, 'conseil'), 'incident-unavailable');
  const smuggled = { ...active, clanShipOperations: source.clanShipOperations };
  assert.equal(saves.parseSaveImport(JSON.stringify(smuggled)).failure, 'invalid-save');
  assert.equal(incidents.evaluateClanShipIncidentsCampaign(smuggled.clanShipIncidents, smuggled).allowed, false);
});

test('interactions require the current room, a finite walkable actor position and the exact reach', () => {
  const source = start('seal-discrepancy'), target = incidents.clanShipIncidentTarget('seal-cargo');
  const action = command(source, 'interact', { targetId: target.id });
  deny(source, action, context(source, 'archives', { actor: target.position }), 'wrong-room');
  for (const actor of [undefined, null, { x: NaN, y: 650 }, { x: Infinity, y: 650 }, { x: '410', y: 650 }, { x: 410, y: 490 }, { x: 475, y: 650 }]) {
    deny(source, action, context(source, 'hangar', { actor }), 'too-far');
  }
  const edge = perform(source, 'interact', { targetId: target.id }, context(source, 'hangar', { actor: { x: 474, y: 650 } }));
  assert.equal(edge.save.clanShipIncidents.activeIncident.stepIndex, 1);
});

test('stale, unsupported and malformed commands never change evidence or return a reward', () => {
  const source = start('seal-discrepancy');
  const base = command(source, 'interact', { targetId: 'seal-cargo' });
  deny(source, { ...base, expectedRevision: 0 }, context(source), 'stale-revision');
  for (const action of [{ ...base, owner: OWNER }, { ...base, expectedRevision: NaN }, { ...base, targetId: 'absent' },
    { ...base, type: 'complete' }, { type: 'escort-checkpoint', checkpointId: 'skip-to-report', expectedRevision: 1 }, null]) {
    deny(source, action, context(source), 'invalid-action');
  }
  const exhausted = { ...source, clanShipIncidents: { ...source.clanShipIncidents, revision: Number.MAX_SAFE_INTEGER - 1 } };
  deny(exhausted, command(exhausted, 'cancel-incident'), context(exhausted), 'revision-overflow');
});

test('seal evidence gates the isolator; a wrong diagnostic persists without losing the collected marks', () => {
  let save = start('seal-discrepancy');
  const isolator = incidents.clanShipIncidentTarget('seal-isolator');
  deny(save, command(save, 'choose', { targetId: isolator.id, choiceId: 'upstream' }), context(save, 'hangar', { actor: isolator.position }), 'wrong-step');
  save = advance(save, 2);
  const before = incidents.getClanShipIncidentEvidence(save.clanShipIncidents), initialMarks = save.profile.clanMarks;
  assert.match(before[0].evidence, /trois traits/); assert.match(before[1].evidence, /amont/);
  const wrong = step(save, 'downstream'); save = wrong.save;
  assert.equal(wrong.result.reason, 'diagnostic-rejected'); assert.equal(wrong.result.clanMarksReward, 0);
  assert.equal(save.profile.clanMarks, initialMarks); assert.equal(save.clanShipIncidents.activeIncident.stepIndex, 2);
  assert.deepEqual(incidents.getClanShipIncidentEvidence(save.clanShipIncidents), before);
  assert.deepEqual(save.clanShipIncidents.activeIncident.lastRejectedChoice, { stepId: 'seal-isolation', choiceId: 'downstream' });
  deny(save, command(save, 'choose', { targetId: isolator.id, choiceId: 'downstream' }), context(save, 'hangar', { actor: isolator.position }), 'same-rejected-choice');
  save = step(save, 'upstream').save;
  assert.equal(save.clanShipIncidents.activeIncident.lastRejectedChoice, null);
  const cargo = incidents.clanShipIncidentTarget('seal-cargo');
  deny(save, command(save, 'interact', { targetId: cargo.id }), context(save, 'hangar', { actor: cargo.position }), 'wrong-step');
  const completed = finish(save);
  assert.equal(completed.profile.clanMarks, initialMarks + 8);
  assert.equal(completed.clanShipIncidents.completedIncidents[0].proof.stepIds.at(-1), 'seal-closure');
});

test('relay retains its reference and the single recovered component when a permutation is rejected', () => {
  let save = advance(start('relay-flicker'), 2);
  save = step(save, 'branch-a').save;
  assert.equal(save.clanShipIncidents.activeIncident.stepIndex, 2);
  save = step(save, 'branch-b').save;
  const component = incidents.clanShipIncidentTarget('relay-component');
  save = step(save).save;
  const collected = incidents.getClanShipIncidentEvidence(save.clanShipIncidents);
  assert.equal(collected.filter(item => item.stepId === 'relay-component').length, 1);
  assert.match(collected.find(item => item.stepId === 'relay-reference').evidence, /trois-traits précède.*cercle/);
  const marks = save.profile.clanMarks;
  save = step(save, 'circle-marks').save;
  assert.equal(save.clanShipIncidents.activeIncident.stepIndex, 4);
  assert.deepEqual(incidents.getClanShipIncidentEvidence(save.clanShipIncidents), collected);
  assert.deepEqual(save.clanShipIncidents.activeIncident.choices, [{ stepId: 'relay-isolate', choiceId: 'branch-b' }]);
  deny(save, command(save, 'interact', { targetId: component.id }), context(save, 'armurerie', { actor: component.position }), 'wrong-step');
  save = step(save, 'marks-circle').save;
  assert.equal(save.profile.clanMarks, marks, 'installing the module is not the final signal test');
  save = step(save).save;
  assert.equal(save.profile.clanMarks, marks + 10);
});

test('trophy provenance requires both records and the witness before a supported conclusion', () => {
  let save = advance(start('trophy-provenance'), 2);
  const support = incidents.clanShipIncidentTarget('provenance-support');
  deny(save, command(save, 'choose', { targetId: support.id, choiceId: 'distinct-roles' }), context(save, 'trophees', { actor: support.position }), 'wrong-step');
  save = advance(save, 2);
  const evidence = incidents.getClanShipIncidentEvidence(save.clanShipIncidents);
  assert.equal(evidence.length, 4);
  assert.match(evidence[1].evidence, /ne nomme pas le porteur/);
  assert.match(evidence[2].evidence, /Trace Froide/);
  assert.match(evidence[3].evidence, /deux rôles distincts/);
  const trophies = clone(save.trophies), marks = save.profile.clanMarks;
  save = step(save, 'replace-hunter').save;
  save = step(save, 'erase-transfer').save;
  assert.equal(save.clanShipIncidents.activeIncident.stepIndex, 4);
  assert.deepEqual(save.trophies, trophies);
  assert.equal(save.profile.clanMarks, marks);
  save = finish(save);
  assert.deepEqual(save.trophies, trophies);
  assert.equal(save.profile.clanMarks, marks + 10);
});

test('return transfer cannot skip preparation, the pickup, a door or the physical companion', () => {
  let save = start('return-transfer');
  const entry = incidents.clanShipIncidentTarget('return-medical-entry');
  deny(save, command(save, 'escort-checkpoint', { checkpointId: 'medical-entry' }), context(save, 'soins', { actor: entry.position, escort: { roomId: 'soins', position: entry.position } }), 'wrong-step');
  assert.equal(incidents.getClanShipIncidentEscort(save.clanShipIncidents), null);
  save = step(save).save;
  save = step(save, 'freight-lane').save;
  assert.equal(save.clanShipIncidents.activeIncident.stepIndex, 1);
  save = step(save, 'near-medical').save;
  assert.equal(incidents.getClanShipIncidentEscort(save.clanShipIncidents), null, 'choosing a point does not pick up the companion');
  save = step(save).save;
  assert.deepEqual(incidents.getClanShipIncidentEscort(save.clanShipIncidents), { checkpointId: 'hangar-pickup', roomId: 'hangar', position: { x: 410, y: 650 }, follows: true, arrived: false });
  const door = incidents.clanShipIncidentTarget('return-hangar-door'), action = command(save, 'escort-checkpoint', { checkpointId: 'hangar-door' });
  for (const escort of [null, { roomId: 'soins', position: door.position }, { roomId: 'hangar', position: { x: 410, y: 650 } }, { roomId: 'hangar', position: { x: NaN, y: 635 } }]) {
    deny(save, action, context(save, 'hangar', { actor: door.position, escort }), 'escort-not-present');
  }
  deny(save, action, context(save, 'hangar', { actor: { x: 410, y: 650 }, escort: { roomId: 'hangar', position: door.position } }), 'too-far');
  save = step(save).save;
  assert.equal(incidents.getClanShipIncidentEscort(save.clanShipIncidents).checkpointId, 'hangar-door');
  deny(save, command(save, 'escort-checkpoint', { checkpointId: 'medical-entry' }), context(save, 'hangar', { actor: door.position, escort: { roomId: 'hangar', position: door.position } }), 'wrong-room');
  save = step(save).save;
  assert.equal(incidents.getClanShipIncidentEscort(save.clanShipIncidents).checkpointId, 'medical-entry');
  const report = incidents.clanShipIncidentTarget('return-report'), marks = save.profile.clanMarks;
  deny(save, command(save, 'interact', { targetId: report.id }), context(save, 'conseil', { actor: report.position }), 'wrong-step');
  save = step(save).save;
  assert.equal(save.profile.clanMarks, marks, 'the physical arrival must be reported before the reward');
  assert.equal(incidents.getClanShipIncidentEscort(save.clanShipIncidents).arrived, true);
  assert.equal(incidents.getClanShipIncidentEscort(save.clanShipIncidents).follows, false);
  save = step(save).save;
  assert.equal(save.profile.clanMarks, marks + 12);
  assert.equal(incidents.getClanShipIncidentEscort(save.clanShipIncidents), null);
});

for (const definition of incidents.CLAN_SHIP_INCIDENTS) {
  test(`${definition.id}: evidence, decisions and its unique reward survive every save/reload boundary`, () => {
    const store = storage();
    let save = write(start(definition.id), store);
    const baseline = save.profile.clanMarks;
    while (save.clanShipIncidents.activeIncident) {
      const expected = step(save);
      save = write(expected.save, store);
      const loaded = saves.loadSaveWithStatus(storage(new Map(bytes(store))), MAIN);
      assert.equal(loaded.loaded, true, loaded.failure);
      assert.deepEqual(loaded.save.clanShipIncidents, save.clanShipIncidents);
      assert.deepEqual(incidents.getClanShipIncidentEscort(loaded.save.clanShipIncidents), incidents.getClanShipIncidentEscort(save.clanShipIncidents));
      assert.equal(saves.parseSaveImport(saves.exportSave(save)).failure, null);
      save = loaded.save;
    }
    assert.equal(save.profile.clanMarks, baseline + definition.clanMarksReward);
    assert.equal(save.clanShipIncidents.completedIncidents.length, 1);
    deny(save, command(save, 'start-incident', { incidentId: definition.id }), context(save, 'conseil'), 'incident-unavailable');
    deny(save, command(save, 'interact', { targetId: definition.steps.at(-1).targetId }), context(save), 'no-active-incident');
    const full = archives.createCompleteArchive(save, store, OWNER);
    const parsed = archives.parseCompleteArchive(full.serialized);
    assert.ok(parsed.archive, parsed.failure);
    assert.deepEqual(parsed.archive.campaign.clanShipIncidents, save.clanShipIncidents);
  });
}

test('cancel affects only the current incident and never repays or deletes an older completed receipt', () => {
  let save = finish(start('seal-discrepancy'));
  const receipt = clone(save.clanShipIncidents.completedIncidents);
  save = interiorContract(save, 'ship-armory-audit');
  save = advance(start('relay-flicker', save), 4);
  const marks = save.profile.clanMarks;
  const cancelled = perform(save, 'cancel-incident'); save = cancelled.save;
  assert.equal(cancelled.result.clanMarksReward, 0);
  assert.equal(save.clanShipIncidents.activeIncident, null);
  assert.deepEqual(save.clanShipIncidents.completedIncidents, receipt);
  save = start('relay-flicker', save);
  assert.equal(save.clanShipIncidents.activeIncident.stepIndex, 0);
  save = finish(save);
  assert.equal(save.profile.clanMarks, marks + 10);
  assert.equal(save.clanShipIncidents.completedIncidents.length, 2);
});

test('old saves retain absent or null incidents without inventing progress in portable and complete archives', () => {
  for (const source of [saves.defaultSave(OWNER), { ...saves.defaultSave(OWNER), clanShipIncidents: null }]) {
    const present = Object.hasOwn(source, 'clanShipIncidents'), store = storage();
    const saved = write(source, store);
    const imported = saves.parseSaveImport(saves.exportSave(saved));
    assert.ok(imported.save, imported.failure);
    assert.equal(Object.hasOwn(imported.save, 'clanShipIncidents'), present);
    if (present) assert.equal(imported.save.clanShipIncidents, null);
    assert.deepEqual(imported.save.profile, saved.profile);
    const full = archives.parseCompleteArchive(archives.createCompleteArchive(saved, store, OWNER).serialized);
    assert.ok(full.archive, full.failure);
    assert.equal(Object.hasOwn(full.archive.campaign, 'clanShipIncidents'), present);
  }
});

test('invalid and future incident payloads survive normalization for diagnosis and never overwrite durable progress', () => {
  const store = storage(), saved = write(advance(start('seal-discrepancy'), 2), store);
  const originalBytes = bytes(store), originalWrites = store.writes.length;
  const cases = [
    ['future-version', data => { data.version = 2; }],
    ['invalid-save', data => { data.ownerCreatedAt = OTHER; }],
    ['invalid-save', data => { data.revision = 0; }],
    ['invalid-save', data => { data.activeIncident.stepIndex = 4; }],
    ['invalid-save', data => { data.activeIncident.choices = [{ stepId: 'seal-isolation', choiceId: 'upstream' }]; }],
    ['invalid-save', data => { data.activeIncident.lastRejectedChoice = { stepId: 'seal-isolation', choiceId: 'upstream' }; }],
    ['invalid-save', data => { data.activeIncident.extra = 1; }],
  ];
  for (const [failure, corrupt] of cases) {
    const source = clone(saved); corrupt(source.clanShipIncidents);
    const payload = clone(source.clanShipIncidents), raw = JSON.stringify(source);
    assert.equal(saves.parseSaveImport(raw).failure, failure);
    assert.deepEqual(saves.normalizeSave(source).clanShipIncidents, payload, 'normalization keeps explicit bad evidence');
    assert.equal(saves.importSaveWithStatus(raw, store, MAIN).persisted, false);
    assert.equal(saves.writeSaveWithStatus(source, store, MAIN).persisted, false);
    assert.throws(() => saves.exportSave(source));
    assert.deepEqual(bytes(store), originalBytes); assert.equal(store.writes.length, originalWrites);
    const broken = storage(new Map([[MAIN, raw]])), beforeLoad = bytes(broken);
    assert.equal(saves.loadSaveWithStatus(broken, MAIN).failure, failure);
    assert.deepEqual(bytes(broken), beforeLoad, 'failed loading does not replace incompatible bytes');
  }
});

test('save inspection rejects impossible receipt order, proof omissions, invented decisions and duplicate rewards', () => {
  const saved = finish(start('relay-flicker'));
  const alterations = [
    data => { data.completedIncidents.push(clone(data.completedIncidents[0])); },
    data => { data.completedIncidents[0].proof.stepIds.splice(3, 1); },
    data => { data.completedIncidents[0].proof.stepIds.reverse(); },
    data => { data.completedIncidents[0].proof.choices[0].choiceId = 'branch-a'; },
    data => { data.completedIncidents[0].proof.choices.reverse(); },
    data => { data.completedIncidents[0].completedRevision = 3; },
    data => { data.completedIncidents[0].proof.reward = 999; },
    data => { data.activeIncident = { incidentId: 'relay-flicker', acceptedRevision: data.revision, stepIndex: 0, choices: [], lastRejectedChoice: null }; },
  ];
  for (const alter of alterations) {
    const source = clone(saved); alter(source.clanShipIncidents);
    assert.equal(incidents.inspectClanShipIncidents(source.clanShipIncidents, OWNER).status, 'invalid-save');
    assert.equal(saves.parseSaveImport(JSON.stringify(source)).failure, 'invalid-save');
  }
});

test('cross-module inspection rejects absent, foreign or erased prerequisites instead of accepting isolated incident receipts', () => {
  for (const finished of [false, true]) {
    const source = finished ? finish(start('seal-discrepancy')) : start('seal-discrepancy');
    for (const brokenOperations of [undefined, null, ready().clanShipOperations,
      { ...source.clanShipOperations, ownerCreatedAt: OTHER }]) {
      const broken = { ...source, clanShipOperations: brokenOperations };
      assert.equal(saves.parseSaveImport(JSON.stringify(broken)).failure, 'invalid-save');
      assert.deepEqual(saves.normalizeSave(broken).clanShipIncidents, source.clanShipIncidents, 'cross validation does not erase valid incident evidence');
    }
  }
  const source = finish(start('trophy-provenance'));
  const broken = clone(source); broken.missionProgress['ruins-ancient-guardian'].completions = 0;
  assert.equal(saves.parseSaveImport(JSON.stringify(broken)).failure, 'invalid-save');
});

test('completed incidents remain valid as the operation dossier grows and another contract begins', () => {
  let source = finish(start('seal-discrepancy'));
  const completed = clone(source.clanShipIncidents);
  source = operation(source, 'recruit', { npcId: 'threshold-guard' }, 'hangar');
  source = interiorContract(source, 'ship-armory-audit');
  source = operation(source, 'accept-contract', { contractId: 'ship-training-circuit' });
  assert.equal(saves.parseSaveImport(JSON.stringify(source)).failure, null);
  assert.deepEqual(source.clanShipIncidents, completed);
  assert.equal(incidents.evaluateClanShipIncidentsCampaign(source.clanShipIncidents, source).allowed, true);
});

test('a failed final reward write preserves both the last incident step and the campaign balance', () => {
  const store = storage();
  const current = write(advance(start('seal-discrepancy'), 4), store), baseline = current.profile.clanMarks;
  const result = step(current), before = bytes(store);
  store.quotaKey = MAIN;
  const failed = saves.writeSaveWithStatus(result.save, store, MAIN);
  assert.equal(failed.persisted, false); assert.deepEqual(bytes(store), before);
  const old = saves.loadSaveWithStatus(store, MAIN).save;
  assert.equal(old.clanShipIncidents.activeIncident.stepIndex, 4); assert.equal(old.profile.clanMarks, baseline);
  store.quotaKey = null;
  const retried = write(step(old).save, store);
  assert.equal(retried.profile.clanMarks, baseline + 8); assert.equal(retried.clanShipIncidents.completedIncidents.length, 1);
});

test('a failed escort checkpoint write cannot acknowledge the next safe position or the report', () => {
  const store = storage();
  let current = write(advance(start('return-transfer'), 3), store);
  for (const expected of ['hangar-door', 'medical-entry', 'medical-station']) {
    const next = step(current).save, before = bytes(store), anchor = incidents.getClanShipIncidentEscort(current.clanShipIncidents);
    store.quotaKey = MAIN;
    assert.equal(saves.writeSaveWithStatus(next, store, MAIN).persisted, false);
    assert.deepEqual(bytes(store), before);
    const loaded = saves.loadSaveWithStatus(storage(new Map(before)), MAIN).save;
    assert.deepEqual(incidents.getClanShipIncidentEscort(loaded.clanShipIncidents), anchor);
    assert.equal(incidents.getClanShipIncidentStep(loaded.clanShipIncidents).id, expected);
    assert.equal(loaded.clanShipIncidents.completedIncidents.length, 0);
    store.quotaKey = null;
    current = write(step(loaded).save, store);
  }
  assert.equal(incidents.getClanShipIncidentEscort(current.clanShipIncidents).arrived, true);
});

test('uncertain readback confirms the existing reward snapshot without replaying the closing interaction', () => {
  const store = storage(), current = write(advance(start('seal-discrepancy'), 4), store);
  const proposed = step(current).save, baseline = current.profile.clanMarks;
  store.failReadback = true;
  const pending = saves.writeSaveWithStatus(proposed, store, MAIN);
  assert.equal(pending.persisted, false);
  const written = bytes(store), writeCount = store.writes.length;
  const recovered = saves.reconcileSaveWrite(pending, OWNER, store, MAIN);
  assert.equal(recovered.status, 'confirmed', recovered.failure);
  assert.equal(recovered.save.profile.clanMarks, baseline + 8);
  assert.equal(recovered.save.clanShipIncidents.completedIncidents.length, 1);
  assert.deepEqual(bytes(store), written); assert.equal(store.writes.length, writeCount);
  const stale = command(current, 'interact', { targetId: 'seal-cargo' });
  deny(recovered.save, stale, context(recovered.save), 'stale-revision');
});

test('two storage views cannot overwrite a reward or escort checkpoint with a stale campaign snapshot', () => {
  for (const [id, count] of [['seal-discrepancy', 4], ['return-transfer', 3]]) {
    const shared = new Map(), first = storage(shared), second = storage(shared);
    write(advance(start(id), count), first);
    const a = saves.loadSaveWithStatus(first, MAIN).save, b = saves.loadSaveWithStatus(second, MAIN).save;
    const accepted = write(step(a).save, first), confirmed = bytes(first);
    const rejected = saves.writeSaveWithStatus(step(b).save, second, MAIN);
    assert.equal(rejected.persisted, false); assert.equal(rejected.failure, 'save-conflict');
    assert.deepEqual(bytes(first), confirmed);
    const reloaded = saves.loadSaveWithStatus(second, MAIN).save;
    assert.deepEqual(reloaded.clanShipIncidents, accepted.clanShipIncidents);
    assert.equal(reloaded.profile.clanMarks, accepted.profile.clanMarks);
  }
});

test('rejected choices and safe escort checkpoints survive complete archive reconstruction without fine positions', () => {
  const sources = [step(advance(start('relay-flicker'), 4), 'circle-marks').save,
    ...[3, 4, 5, 6].map(count => advance(start('return-transfer'), count))];
  for (const source of sources) {
    const store = storage(), saved = write(source, store);
    const full = archives.parseCompleteArchive(archives.createCompleteArchive(saved, store, OWNER).serialized);
    assert.ok(full.archive, full.failure);
    assert.deepEqual(full.archive.campaign.clanShipIncidents, saved.clanShipIncidents);
    const active = full.archive.campaign.clanShipIncidents.activeIncident;
    assert.equal(Object.hasOwn(active, 'actor'), false); assert.equal(Object.hasOwn(active, 'escortPosition'), false);
    assert.deepEqual(incidents.getClanShipIncidentEscort(full.archive.campaign.clanShipIncidents), incidents.getClanShipIncidentEscort(saved.clanShipIncidents));
  }
});

test('campaign slot checkpoints retain an incident diagnostic and its safe escort step', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (_name, _options, callback) => callback({}) } } });
  try {
    const store = storage(), source = write(advance(start('return-transfer'), 4), store);
    const migrated = await slots.migrateLegacyCampaignSlot(store);
    assert.equal(migrated.ok, true, migrated.message);
    const document = JSON.parse(store.getItem(slots.campaignSlotStorageKey(1)));
    const checkpoint = await slots.saveCampaignCheckpoint(1, { kind: 'auto', expectedRevision: document.revision,
      location: 'clan-ship' }, store);
    assert.equal(checkpoint.ok, true, checkpoint.message);
    const saved = JSON.parse(store.getItem(slots.campaignSlotStorageKey(1)));
    const retained = saved.checkpoints.find(item => item.id === saved.lastCheckpointId);
    assert.ok(retained, 'slot keeps its committed checkpoint');
    const serialized = JSON.stringify(retained);
    assert.ok(serialized.includes('return-transfer'));
    assert.equal(saves.loadSaveWithStatus(store, MAIN).save.clanShipIncidents.activeIncident.stepIndex, source.clanShipIncidents.activeIncident.stepIndex);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous); else delete globalThis.navigator;
  }
});
