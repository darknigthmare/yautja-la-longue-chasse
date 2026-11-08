import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const incidents = qa.load('app/game/systems/clanShipIncidents.ts');
const ops = qa.load('app/game/systems/clanShipOperations.ts');
const residence = qa.load('app/game/systems/companionResidence.ts');
const motion = qa.load('app/game/systems/clanShipInterior.ts');
const docking = qa.load('app/game/systems/clanShipDocking.ts');
const saves = qa.load('app/game/save.ts');
const OWNER = '2026-11-08T14:00:00.000Z', SHIP = 'classic-predator-spaceship';
const clone = value => JSON.parse(JSON.stringify(value));
const actions = (save, id, type, branch) => ({ incidentId: id, type, ownerCreatedAt: save.createdAt, expectedRevision: save.clanShipIncidents?.revision ?? 0, ...(branch ? { branch } : {}) });
function clanAction(save, command, roomId = 'conseil') {
  const before = save.clanShipOperations ?? ops.createClanShipOperations(OWNER);
  const result = ops.actClanShipOperations(before, { ...command, expectedRevision: before.revision }, {
    ownerCreatedAt: OWNER, campaign: save, docking: { ownerCreatedAt: OWNER, status: 'aboard', roomId },
  });
  assert.equal(result.accepted, true, result.message);
  return { ...save, clanShipOperations: result.state, profile: { ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward } };
}
function aboard(save, roomId = 'hangar') {
  let state = docking.createClanShipDockingState(save.createdAt, SHIP);
  for (const type of ['approach', 'dock', 'board']) {
    const result = docking.actClanShipDocking(state, { type }, { ownerCreatedAt: save.createdAt, personalShipId: SHIP });
    assert.equal(result.accepted, true); state = result.state;
  }
  if (roomId !== 'hangar') {
    const result = docking.actClanShipDocking(state, { type: 'move-room', roomId }, { ownerCreatedAt: save.createdAt, personalShipId: SHIP });
    assert.equal(result.accepted, true); state = result.state;
  }
  return { ...save, clanShipDocking: state };
}
function fixture() {
  let save = saves.defaultSave(OWNER); save.profile.clanMarks = 100;
  for (const step of ops.CLAN_SHIP_ONBOARDING_STEPS) save = clanAction(save, { type: 'onboard-step', stepId: step.id }, step.roomId);
  save = clanAction(save, { type: 'accept-mandate' });
  for (const contractId of ['ship-seal-check', 'ship-armory-audit']) {
    save = clanAction(save, { type: 'accept-contract', contractId });
    for (const step of ops.clanShipContract(contractId).steps) save = clanAction(save, { type: 'interior-step', stepId: step.id }, step.roomId);
  }
  return aboard(save);
}
function context(save, id, type, extra = {}) {
  const target = incidents.clanShipIncidentTarget(id, type);
  assert.ok(target, 'test action has a physical object');
  return { save: aboard(save, target.roomId), active: true,
    observation: { roomId: target.roomId, x: target.x, y: target.y }, ...extra };
}
function act(save, id, type, branch, extra = {}) {
  const ctx = context(save, id, type, extra), before = JSON.stringify(ctx.save);
  const result = incidents.actClanShipIncident(actions(save, id, type, branch), ctx);
  assert.equal(result.accepted, true, `${id}/${type}: ${result.message}`);
  assert.equal(JSON.stringify(ctx.save), before, 'input save is not mutated');
  const next = result.changed ? { ...ctx.save, clanShipIncidents: result.state,
    profile: { ...ctx.save.profile, clanMarks: ctx.save.profile.clanMarks + result.clanMarksReward } } : ctx.save;
  if (result.state) {
    assert.equal(incidents.inspectClanShipIncidents(result.state, OWNER).status, 'valid');
    assert.equal(incidents.evaluateClanShipIncidentsCampaign(result.state, next).allowed, true);
    const portable = saves.parseSaveImport(saves.exportSave(next));
    assert.ok(portable.save, `${type}: ${portable.failure}`);
    assert.deepEqual(portable.save.clanShipIncidents, next.clanShipIncidents);
  }
  return next;
}
function denied(save, id, type, branch, extra = {}) {
  const ctx = context(save, id, type, extra), before = JSON.stringify(ctx.save);
  const result = incidents.actClanShipIncident(actions(save, id, type, branch), ctx);
  assert.equal(result.accepted, false, `${id}/${type}: should be refused`); assert.equal(result.changed, false);
  assert.equal(result.clanMarksReward, 0); assert.equal(JSON.stringify(ctx.save), before); return result;
}
const view = (save, id) => incidents.clanShipIncidentView(save.clanShipIncidents, id);
function clues(save, id) {
  save = act(save, id, 'accept'); save = act(save, id, 'inspect-witness'); return act(save, id, 'read-reference');
}
function repairedRelay(save = fixture()) {
  const id = 'relay-fault', variant = incidents.clanShipIncidentVariant(OWNER, id);
  save = clues(save, id); save = act(save, id, 'isolate', variant.branch);
  save = act(save, id, 'collect-component'); return act(save, id, 'install-component');
}
function storage(initial = []) {
  const values = new Map(initial);
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

test('the three incidents reuse named contracts, characters and fourteen walkable physical interaction points', () => {
  assert.deepEqual(incidents.CLAN_SHIP_INCIDENTS.map(entry => entry.reference), ['OPS-B01', 'OPS-B02', 'OPS-B03']);
  for (const definition of incidents.CLAN_SHIP_INCIDENTS) {
    assert.ok(ops.clanShipContract(definition.prerequisite)); assert.ok(ops.CLAN_SHIP_RECRUITS.some(npc => npc.id === definition.npcId));
  }
  assert.equal(Object.keys(incidents.CLAN_SHIP_INCIDENT_TARGETS).length, 14);
  for (const target of Object.values(incidents.CLAN_SHIP_INCIDENT_TARGETS)) {
    assert.equal(motion.isClanShipInteriorWalkable(target.roomId, target), true, target.id);
    assert.ok(motion.planClanShipInteriorPath(target.roomId, motion.clanShipInteriorSpawn(target.roomId), target), target.id);
    for (const door of motion.CLAN_SHIP_INTERIOR_ROOMS[target.roomId].doors) assert.ok(motion.planClanShipInteriorPath(target.roomId, target, door), `${target.id}: safe return`);
  }
});

test('legacy saves stay absent/null and mere access to the board creates neither incident nor prop', () => {
  for (const save of [saves.defaultSave(OWNER), { ...saves.defaultSave(OWNER), clanShipIncidents: null }]) {
    assert.equal(Object.hasOwn(saves.normalizeSave(save), 'clanShipIncidents'), Object.hasOwn(save, 'clanShipIncidents'));
    const imported = saves.parseSaveImport(saves.exportSave(save)); assert.ok(imported.save);
    assert.equal(Object.hasOwn(imported.save, 'clanShipIncidents'), Object.hasOwn(save, 'clanShipIncidents'));
    assert.equal(qa.render('app/game/ClanShipIncidentScene.tsx', { save, roomId: 'hangar', position: { roomId: 'hangar', x: 820, y: 650 }, suspended: false, onNavigate() {}, onAction() {} }), '');
  }
  assert.equal(incidents.inspectClanShipIncidents(undefined, OWNER).status, 'absent');
  denied(aboard(saves.defaultSave(OWNER)), 'sealed-lot', 'accept');
});

test('acceptance and every object command require owner, current revision, actual room and close physical coordinates', () => {
  const save = fixture();
  denied(save, 'sealed-lot', 'accept', undefined, { active: false });
  denied(save, 'sealed-lot', 'accept', undefined, { observation: null });
  denied(save, 'sealed-lot', 'accept', undefined, { observation: { roomId: 'hangar', x: 128, y: 635 } });
  denied(save, 'sealed-lot', 'accept', undefined, { observation: { roomId: 'archives', x: 820, y: 650 } });
  for (const values of [{ ownerCreatedAt: 'foreign' }, { expectedRevision: 5 }, { hiddenTeleport: true }]) {
    const result = incidents.actClanShipIncident({ ...actions(save, 'sealed-lot', 'accept'), ...values }, context(save, 'sealed-lot', 'accept'));
    assert.equal(result.accepted, false);
  }
  const accepted = act(save, 'sealed-lot', 'accept');
  denied(accepted, 'sealed-lot', 'isolate', incidents.clanShipIncidentVariant(OWNER, 'sealed-lot').branch);
  denied(accepted, 'sealed-lot', 'read-reference');
});

test('a clan recruit in reserve cannot speak or offer a maintenance case from an absent post', () => {
  const before = fixture(), progressed = clanAction(before, { type: 'recruit', npcId: 'threshold-guard' }, 'hangar');
  const registered = residence.registerCompanionResidenceRecruitment(before, progressed, 'threshold-guard');
  assert.equal(registered.accepted, true);
  const save = { ...progressed, companionResidence: registered.state };
  assert.equal(incidents.evaluateClanShipIncidentOffer(save, 'sealed-lot').allowed, false);
  denied(save, 'sealed-lot', 'accept');
});

test('sealed lot uses the two clues; a wrong isolator requires archive diagnosis again and never closes the passage', () => {
  const id = 'sealed-lot', variant = incidents.clanShipIncidentVariant(OWNER, id);
  let save = clues(fixture(), id), marks = save.profile.clanMarks;
  save = act(save, id, 'isolate', variant.other);
  assert.equal(view(save, id).faults, 1); assert.equal(view(save, id).chosenBranch, variant.other);
  assert.equal(view(save, id).diagnosticCurrent, false); assert.equal(view(save, id).reference, true); assert.equal(view(save, id).witness, true);
  assert.equal(view(save, id).isolatedBranch, null); assert.equal(view(save, id).completedRevision, null);
  denied(save, id, 'isolate', variant.branch); denied(save, id, 'check-pressure'); denied(save, id, 'close-lot');
  save = act(save, id, 'read-reference'); save = act(save, id, 'isolate', variant.branch);
  denied(save, id, 'close-lot');
  save = act(save, id, 'check-pressure');
  assert.equal(save.profile.clanMarks, marks);
  save = act(save, id, 'close-lot'); assert.equal(save.profile.clanMarks, marks + 25);
  assert.ok(view(save, id).completedRevision);
  const repeated = act(save, id, 'close-lot'); assert.equal(repeated.profile.clanMarks, marks + 25);
  assert.equal(repeated.clanShipIncidents.revision, save.clanShipIncidents.revision);
  for (const door of motion.CLAN_SHIP_INTERIOR_ROOMS.hangar.doors) assert.ok(motion.planClanShipInteriorPath('hangar', incidents.CLAN_SHIP_INCIDENT_TARGETS['seal-controls'], door));
});

test('relay measures two readable cycles and preserves the identified component through a wrong branch and permutation', () => {
  const id = 'relay-fault', variant = incidents.clanShipIncidentVariant(OWNER, id);
  assert.notEqual(variant.cycles.A, variant.cycles.B);
  let save = clues(fixture(), id), marks = save.profile.clanMarks;
  save = act(save, id, 'isolate', variant.other); assert.equal(view(save, id).faults, 1);
  denied(save, id, 'collect-component');
  save = act(save, id, 'isolate', variant.branch); denied(save, id, 'install-component');
  save = act(save, id, 'collect-component'); const receiptRevision = save.clanShipIncidents.revision;
  save = act(save, id, 'collect-component'); assert.equal(save.clanShipIncidents.revision, receiptRevision);
  save = act(save, id, 'install-component'); assert.equal(view(save, id).component, 'installed');
  save = act(save, id, 'restore-circuit', variant.branch);
  assert.equal(view(save, id).faults, 2); assert.deepEqual(view(save, id).restored, []); assert.equal(view(save, id).component, 'installed');
  const afterError = saves.parseSaveImport(saves.exportSave(save)); assert.ok(afterError.save); save = afterError.save;
  save = act(save, id, 'install-component'); assert.equal(view(save, id).component, 'installed');
  denied(save, id, 'verify-signal');
  save = act(save, id, 'restore-circuit', variant.other); assert.deepEqual(view(save, id).restored, [variant.other]);
  denied(save, id, 'verify-signal');
  save = act(save, id, 'restore-circuit', variant.branch); assert.equal(view(save, id).restored.length, 2);
  save = act(save, id, 'verify-signal'); assert.equal(save.profile.clanMarks, marks + 30);
  save = act(save, id, 'verify-signal'); assert.equal(save.profile.clanMarks, marks + 30);
});

test('independent cases can interleave without stale revisions or duplicate receipt numbers', () => {
  let save = fixture();
  save = act(save, 'sealed-lot', 'accept'); const stale = actions(save, 'sealed-lot', 'inspect-witness');
  save = act(save, 'relay-fault', 'accept');
  assert.equal(incidents.actClanShipIncident(stale, context(save, 'sealed-lot', 'inspect-witness')).accepted, false);
  save = act(save, 'sealed-lot', 'inspect-witness'); save = act(save, 'relay-fault', 'inspect-witness');
  save = act(save, 'sealed-lot', 'read-reference'); save = act(save, 'relay-fault', 'read-reference');
  assert.equal(save.clanShipIncidents.incidents.length, 2);
  assert.equal(save.clanShipIncidents.revision, 6);
  assert.equal(incidents.inspectClanShipIncidents(save.clanShipIncidents, OWNER).status, 'valid');
  assert.equal(view(save, 'sealed-lot').witness, true); assert.equal(view(save, 'relay-fault').reference, true);
});

test('the archive rejects forged history, skipped clues, foreign positions, future schemas and missing source contracts', () => {
  const save = repairedRelay();
  for (const mutate of [
    state => { state.ownerCreatedAt = 'foreign'; }, state => { state.extra = true; },
    state => { state.incidents[0].events[1].observation.roomId = 'hangar'; },
    state => { state.incidents[0].events[1].observation.x = 10; },
    state => { state.incidents[0].events[1].observation = { roomId: 'conseil', x: 350, y: 530 }; },
    state => { state.incidents[0].events[1].type = 'verify-signal'; },
    state => { state.incidents[0].events[2].revision = 1; },
    state => { state.incidents[0].events.pop(); },
    state => { state.incidents.push(clone(state.incidents[0])); },
  ]) {
    const invalid = clone(save); mutate(invalid.clanShipIncidents);
    assert.equal(saves.parseSaveImport(JSON.stringify(invalid)).failure, 'invalid-save');
  }
  const future = clone(save); future.clanShipIncidents.version = incidents.CLAN_SHIP_INCIDENT_VERSION + 1;
  assert.equal(saves.parseSaveImport(JSON.stringify(future)).failure, 'future-version');
  const missing = clone(save); missing.clanShipOperations = null;
  assert.equal(saves.parseSaveImport(JSON.stringify(missing)).failure, 'invalid-save');
});

test('a refused storage write cannot acknowledge a component pickup or grant the same physical piece twice', () => {
  const id = 'relay-fault', variant = incidents.clanShipIncidentVariant(OWNER, id), submit = qa.load('app/game/ClanShipIncidentPanel.tsx').submitClanShipIncident;
  let save = clues(fixture(), id); save = act(save, id, 'isolate', variant.branch);
  const confirmed = context(save, id, 'collect-component').save, disk = storage();
  assert.equal(saves.writeSaveWithStatus(confirmed, disk).persisted, true);
  const bytes = [...disk.values]; let acknowledged = confirmed;
  disk.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
  const result = submit({ save: confirmed, onAction(command, observation) {
    const reduced = incidents.actClanShipIncident(command, { save: acknowledged, active: true, observation });
    if (!reduced.accepted) return false;
    const write = saves.writeSaveWithStatus({ ...acknowledged, clanShipIncidents: reduced.state, profile: { ...acknowledged.profile, clanMarks: acknowledged.profile.clanMarks + reduced.clanMarksReward } }, disk);
    if (!write.persisted) return false;
    acknowledged = write.save; return true;
  } }, { incidentId: id, type: 'collect-component' }, context(confirmed, id, 'collect-component').observation, true);
  assert.equal(result.accepted, false); assert.deepEqual([...disk.values], bytes); assert.equal(view(acknowledged, id).component, 'absent');
  const resumed = saves.loadSaveWithStatus(disk); assert.equal(resumed.loaded, true); assert.equal(view(resumed.save, id).component, 'absent');
  const picked = act(resumed.save, id, 'collect-component'); assert.equal(view(picked, id).component, 'carried');
  const duplicate = act(picked, id, 'collect-component'); assert.equal(duplicate.clanShipIncidents.revision, picked.clanShipIncidents.revision);
});

test('all saved steps, failure history and installed component survive ordinary writer reloads', () => {
  let save = repairedRelay(), disk = storage();
  const variant = incidents.clanShipIncidentVariant(OWNER, 'relay-fault');
  for (const command of [
    ['restore-circuit', variant.branch], ['restore-circuit', variant.other], ['restore-circuit', variant.branch], ['verify-signal'],
  ]) {
    save = act(save, 'relay-fault', command[0], command[1]);
    const written = saves.writeSaveWithStatus(save, disk); assert.equal(written.persisted, true, written.failure);
    const loaded = saves.loadSaveWithStatus(disk); assert.equal(loaded.loaded, true, loaded.failure);
    assert.deepEqual(loaded.save.clanShipIncidents, save.clanShipIncidents);
    assert.equal(loaded.save.profile.clanMarks, save.profile.clanMarks);
    save = loaded.save;
  }
});

test('the actual controller walks between every required object and returns through real thresholds', () => {
  let save = fixture(), roomId = 'hangar', actor = motion.clanShipInteriorSpawn('hangar');
  function walk(point) {
    const route = motion.planClanShipInteriorPath(roomId, actor, point); assert.ok(route, `${roomId}: route`);
    let waypoints = route.points.slice(1), arrived = false;
    for (let frame = 0; frame < 1000; frame++) {
      const step = motion.stepClanShipInteriorPath(roomId, actor, waypoints, 1 / 60);
      assert.equal(step.blocked, false); actor = step.actor; waypoints = step.remaining;
      if (step.arrived) { arrived = true; break; }
    }
    assert.equal(arrived, true); assert.equal(motion.isClanShipInteriorWalkable(roomId, actor), true);
  }
  function travel(target) {
    const rooms = motion.clanShipInteriorRoomRoute(roomId, target.roomId);
    for (const next of rooms.slice(1)) {
      const door = motion.CLAN_SHIP_INTERIOR_ROOMS[roomId].doors.find(entry => entry.targetRoomId === next);
      walk(door); assert.equal(motion.canClanShipInteriorTransition(roomId, next, actor), true);
      const previous = roomId; roomId = next; actor = motion.clanShipInteriorSpawn(roomId, previous);
    }
    walk(target);
    assert.equal(incidents.clanShipIncidentInReach({ roomId, x: actor.x, y: actor.y }, target), true);
  }
  for (const id of ['sealed-lot', 'relay-fault']) {
    const variant = incidents.clanShipIncidentVariant(OWNER, id);
    const commands = id === 'sealed-lot' ? [['accept'], ['inspect-witness'], ['read-reference'], ['isolate', variant.branch], ['check-pressure'], ['close-lot']]
      : [['accept'], ['inspect-witness'], ['read-reference'], ['isolate', variant.branch], ['collect-component'], ['install-component'], ['restore-circuit', variant.other], ['restore-circuit', variant.branch], ['verify-signal']];
    for (const [type, branch] of commands) {
      const target = incidents.clanShipIncidentTarget(id, type); travel(target);
      save = act(save, id, type, branch, { observation: { roomId, x: actor.x, y: actor.y } });
    }
  }
  travel(incidents.CLAN_SHIP_INCIDENT_TARGETS['hangar-briefing']);
  assert.equal(roomId, 'hangar');
  assert.ok(view(save, 'sealed-lot').completedRevision); assert.ok(view(save, 'relay-fault').completedRevision);
});

test('world rendering changes the exact prop and each circuit independently, with no art or powers granted by a label', () => {
  let save = repairedRelay(); const variant = incidents.clanShipIncidentVariant(OWNER, 'relay-fault');
  const props = source => ({ save: source, roomId: 'conseil', position: { roomId: 'conseil', x: 350, y: 620 }, suspended: false, onNavigate() {}, onAction() {} });
  let html = qa.render('app/game/ClanShipIncidentScene.tsx', props(save));
  assert.match(html, /twin-circuit-relay\.png/); assert.doesNotMatch(html, /data-stable="true"/);
  save = act(save, 'relay-fault', 'restore-circuit', variant.other);
  html = qa.render('app/game/ClanShipIncidentScene.tsx', props(save));
  assert.equal((html.match(/data-stable="true"/g) ?? []).length, 1);
  save = act(save, 'relay-fault', 'restore-circuit', variant.branch);
  html = qa.render('app/game/ClanShipIncidentScene.tsx', props(save));
  assert.equal((html.match(/data-stable="true"/g) ?? []).length, 2);
  assert.equal(save.clanShipOperations.spaceEncounter, null, 'repair does not fabricate an interception modifier');
  const sealed = clues(save, 'sealed-lot');
  const box = qa.render('app/game/ClanShipIncidentScene.tsx', { ...props(sealed), roomId: 'hangar', position: { roomId: 'hangar', x: 1060, y: 620 } });
  assert.match(box, /sealed-isolator\.png/); assert.match(box, /Isolateur A/); assert.match(box, /Isolateur B/); assert.match(box, /coursive libre/);
});

test('repeated wrong relay tests cannot consume the journal slots needed for a successful recovery', () => {
  let save = repairedRelay(), variant = incidents.clanShipIncidentVariant(OWNER, 'relay-fault');
  while (save.clanShipIncidents.incidents[0].events.length < 88) save = act(save, 'relay-fault', 'restore-circuit', variant.branch);
  denied(save, 'relay-fault', 'restore-circuit', variant.branch);
  save = act(save, 'relay-fault', 'restore-circuit', variant.other);
  save = act(save, 'relay-fault', 'restore-circuit', variant.branch);
  save = act(save, 'relay-fault', 'verify-signal');
  assert.ok(view(save, 'relay-fault').completedRevision); assert.equal(view(save, 'relay-fault').component, 'installed');
});

test('portable import rejects a fabricated error beyond the runtime journal guard and accepts its reserved successful finish', () => {
  let save = repairedRelay(), variant = incidents.clanShipIncidentVariant(OWNER, 'relay-fault');
  while (save.clanShipIncidents.incidents[0].events.length < 88) save = act(save, 'relay-fault', 'restore-circuit', variant.branch);
  const forged = clone(save);
  forged.clanShipIncidents.revision += 1;
  forged.clanShipIncidents.incidents[0].events.push({ revision: forged.clanShipIncidents.revision,
    type: 'restore-circuit', branch: variant.branch, observation: { roomId: 'conseil', x: 350, y: 620 } });
  assert.equal(incidents.inspectClanShipIncidents(forged.clanShipIncidents, OWNER).status, 'invalid-save');
  assert.equal(saves.parseSaveImport(JSON.stringify(forged)).failure, 'invalid-save');
  const validCheckpoint = saves.parseSaveImport(saves.exportSave(save)); assert.ok(validCheckpoint.save);
  save = act(validCheckpoint.save, 'relay-fault', 'restore-circuit', variant.other);
  save = act(save, 'relay-fault', 'restore-circuit', variant.branch);
  save = act(save, 'relay-fault', 'verify-signal');
  const finished = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(finished.save); assert.ok(view(finished.save, 'relay-fault').completedRevision);
  assert.equal(view(finished.save, 'relay-fault').component, 'installed');
});
