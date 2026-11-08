import test from 'node:test';
import assert from 'node:assert/strict';
import { OWNER, SHIP, ID, clone, qa, incidents, hearing, saves, fixture, gathered, ready, completed,
  hearingAction, incidentAction, hearingContext, incidentContext, actHearing, actIncident, portable,
  recruit, refit, residenceAct, completeInterior, aboard } from './helpers/clan-ship-trophy-hearing-fixture.mjs';

const view = save => hearing.clanShipTrophyHearingView(save.clanShipTrophyHearing);
const caseView = save => incidents.clanShipIncidentView(save.clanShipIncidents, ID);
const inviteAsh = { type: 'invite', witnessId: 'ash-scar' }, inviteTrace = { type: 'invite', witnessId: 'cold-trace' };
const record = sampleId => ({ type: 'record-sample', sampleId });
function denyHearing(save, command, overrides = {}, commandOverrides = {}) {
  const context = hearingContext(save, command, overrides), bytes = JSON.stringify(context.save);
  const result = incidents.actClanShipTrophyHearing({ ...hearingAction(save, command), ...commandOverrides }, context);
  assert.equal(result.accepted, false, `${command.type}: ${result.message}`);
  assert.equal(result.changed, false); assert.equal(JSON.stringify(context.save), bytes);
  return result;
}
function denyIncident(save, type, values = {}, overrides = {}) {
  const context = incidentContext(save, type, overrides), bytes = JSON.stringify(context.save);
  const result = incidents.actClanShipIncident(incidentAction(save, type, values), context);
  assert.equal(result.accepted, false, `${type}: ${result.message}`); assert.equal(result.changed, false);
  assert.equal(result.clanMarksReward, 0); assert.equal(JSON.stringify(context.save), bytes);
  return result;
}
function storage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

test('the optional hearing starts only after the real C-37 evidence and leaves old saves without a new ledger', () => {
  const old = saves.defaultSave(OWNER);
  assert.equal(Object.hasOwn(saves.normalizeSave(old), 'clanShipTrophyHearing'), false);
  assert.equal(Object.hasOwn(portable(old), 'clanShipTrophyHearing'), false);
  assert.equal(portable({ ...old, clanShipTrophyHearing: null }).clanShipTrophyHearing, null);
  let save = fixture({ evidence: false });
  assert.equal(hearing.clanShipTrophyHearingNext(save), null); denyHearing(save, inviteAsh);
  for (const type of ['accept', 'examine-trophy', 'read-hunt-report', 'read-transfer-record']) save = actIncident(save, type);
  denyHearing(save, inviteAsh); assert.equal(hearing.clanShipTrophyHearingNext(save), null);
  save = actIncident(save, 'hear-veteran');
  assert.deepEqual(hearing.clanShipTrophyHearingNext(save).command, inviteAsh);
  assert.equal(hearing.clanShipTrophyHearingNext(save).target.roomId, 'entrainement');
  assert.equal(save.clanShipIncidents.version, 2);
});

test('invitation boundary rejects distance, wrong room, inactivity, another campaign and stale commands', () => {
  const save = fixture(), target = hearing.clanShipTrophyHearingTarget(save, inviteAsh);
  denyHearing(save, inviteTrace); denyHearing(save, inviteAsh, { active: false });
  denyHearing(save, inviteAsh, { observation: { roomId: target.roomId, x: target.x + 65, y: target.y } });
  denyHearing(save, inviteAsh, { observation: { roomId: 'archives', x: 790, y: 645 } });
  denyHearing(save, inviteAsh, { observation: { roomId: target.roomId, x: Number.NaN, y: target.y } });
  denyHearing(save, inviteAsh, {}, { ownerCreatedAt: 'foreign-campaign' });
  denyHearing(save, inviteAsh, {}, { expectedRevision: 1 });
  const one = actHearing(save, inviteAsh);
  denyHearing(one, inviteTrace, {}, { expectedRevision: 0 });
  assert.equal(view(one).gathered, false);
  assert.equal(hearing.isClanShipTrophyWitnessGathered(one, 'ash-scar'), false);
  denyIncident(one, 'conclude-provenance', { conclusion: 'paired-roles' });
});

test('invitations follow actual managed posts and preserve their rooms without moving or recruiting a resident', () => {
  let save = fixture();
  save = refit(recruit(save, 'cold-trace'), 'cold-trace');
  save = refit(recruit(save, 'ash-scar'), 'ash-scar');
  assert.equal(hearing.clanShipTrophyWitnessPost(save, 'cold-trace'), 'entrainement');
  assert.equal(hearing.clanShipTrophyWitnessPost(save, 'ash-scar'), 'soins');
  const residence = clone(save.companionResidence), operations = clone(save.clanShipOperations), journal = clone(save.clanShipIncidents);
  const obsolete = { roomId: 'entrainement', x: 1010, y: 650 };
  denyHearing(save, inviteAsh, { save: aboard(save, obsolete.roomId), observation: obsolete });
  save = actHearing(save, inviteAsh); save = actHearing(save, inviteTrace);
  assert.deepEqual(save.clanShipTrophyHearing.events.map(event => event.observation.roomId), ['soins', 'entrainement']);
  assert.deepEqual(save.companionResidence, residence); assert.deepEqual(save.clanShipOperations, operations);
  assert.deepEqual(save.clanShipIncidents, journal);
  assert.equal(view(save).gathered, true);
  for (const npc of hearing.CLAN_SHIP_TROPHY_WITNESSES) assert.equal(hearing.isClanShipTrophyWitnessGathered(save, npc), true);
  assert.equal(incidents.clanShipIncidentTarget(ID, 'conclude-provenance', save).roomId, 'trophees');
});

test('three recorded samples require deliberate ordered confirmation at the shared support with both witnesses', () => {
  let save = gathered(), journal = clone(save.clanShipIncidents), marks = save.profile.clanMarks;
  assert.equal(view(save).ready, false); denyIncident(save, 'conclude-provenance', { conclusion: 'paired-roles' });
  denyHearing(save, record('return-match')); denyHearing(save, record('transfer-seal'));
  denyHearing(save, record('hunt-mark'), { observation: { roomId: 'trophees', x: 240, y: 645 } });
  for (const entry of hearing.CLAN_SHIP_TROPHY_TELEMETRY) {
    assert.equal(hearing.clanShipTrophyHearingNext(save).command.sampleId, entry.id);
    save = actHearing(save, record(entry.id));
    const revision = save.clanShipTrophyHearing.revision;
    save = actHearing(save, record(entry.id));
    assert.equal(save.clanShipTrophyHearing.revision, revision);
    assert.deepEqual(save.clanShipIncidents, journal); assert.equal(save.profile.clanMarks, marks);
  }
  assert.equal(view(save).ready, true); assert.equal(hearing.clanShipTrophyHearingNext(save), null);
  assert.deepEqual(hearing.CLAN_SHIP_TROPHY_TELEMETRY.map(entry => [entry.huntMark, entry.transferSeal]), [[true, false], [true, true], [true, true]]);
});

test('each supported verdict records both witnesses at the gallery and uses the existing unique reward', () => {
  for (const conclusion of ['hunt-attribution', 'paired-roles']) {
    let save = ready(), marks = save.profile.clanMarks, inventory = clone(save.inventory), rank = save.profile.rankId;
    save = actIncident(save, 'conclude-provenance', { conclusion });
    assert.equal(view(save).concluded, true); assert.equal(view(save).completed, false); assert.equal(save.profile.clanMarks, marks);
    const decision = save.clanShipTrophyHearing.events.at(-1);
    assert.equal(decision.type, 'conclude'); assert.equal(decision.observation.roomId, 'trophees');
    assert.deepEqual(decision.witnessIds, ['ash-scar', 'cold-trace']);
    assert.equal(decision.incidentRevision, save.clanShipIncidents.revision);
    const repeatedDecision = actIncident(save, 'conclude-provenance', { conclusion });
    assert.deepEqual(repeatedDecision.clanShipTrophyHearing, save.clanShipTrophyHearing);
    save = actIncident(save, 'acknowledge-provenance');
    assert.equal(view(save).completed, true); assert.equal(view(save).conclusion, conclusion);
    assert.equal(save.clanShipTrophyHearing.events.length, 7); assert.equal(save.clanShipIncidents.version, 2);
    assert.equal(save.profile.clanMarks, marks + 35); assert.deepEqual(save.inventory, inventory); assert.equal(save.profile.rankId, rank);
    const repeat = actIncident(save, 'acknowledge-provenance');
    assert.equal(repeat.profile.clanMarks, save.profile.clanMarks); assert.deepEqual(repeat.clanShipTrophyHearing, save.clanShipTrophyHearing);
    assert.equal(hearing.isClanShipTrophyWitnessGathered(save, 'ash-scar'), false);
  }
});

test('unsupported conclusions retain the meeting and require physical rereading before a supported verdict', () => {
  let save = ready(); const meeting = clone(save.clanShipTrophyHearing);
  for (const [conclusion, reread] of [['bearer-credit', 'read-hunt-report'], ['erase-bearer', 'read-transfer-record']]) {
    save = actIncident(save, 'conclude-provenance', { conclusion });
    assert.deepEqual(save.clanShipTrophyHearing, meeting); assert.equal(caseView(save).trophy.conclusion, null);
    denyIncident(save, 'conclude-provenance', { conclusion: 'paired-roles' });
    assert.equal(incidents.clanShipIncidentNext(caseView(save), save).type, reread);
    save = actIncident(save, reread);
  }
  save = completed(save); assert.equal(caseView(save).faults, 2); assert.equal(view(save).completed, true);
  let legacyMistake = actIncident(fixture(), 'conclude-provenance', { conclusion: 'bearer-credit' });
  assert.equal(hearing.clanShipTrophyHearingNext(legacyMistake), null); denyHearing(legacyMistake, inviteAsh);
  legacyMistake = actIncident(legacyMistake, 'read-hunt-report');
  assert.deepEqual(hearing.clanShipTrophyHearingNext(legacyMistake).command, inviteAsh);
});

test('unavailable, suspended or transferred witnesses cannot participate after invitations or after a decision', () => {
  let save = gathered();
  save = recruit(save, 'cold-trace');
  assert.equal(hearing.isClanShipTrophyWitnessGathered(save, 'cold-trace'), false);
  assert.equal(hearing.isClanShipTrophyWitnessGathered(save, 'ash-scar'), true);
  denyHearing(save, record('hunt-mark')); denyIncident(save, 'conclude-provenance', { conclusion: 'paired-roles' });
  save = refit(save, 'cold-trace'); save = ready(save);
  save = residenceAct(save, { type: 'suspend', id: 'cold-trace' }, 'hangar');
  denyIncident(save, 'conclude-provenance', { conclusion: 'paired-roles' });
  save = residenceAct(save, { type: 'resume', id: 'cold-trace' }, 'hangar');
  save = actIncident(save, 'conclude-provenance', { conclusion: 'paired-roles' });
  save = refit(save, 'cold-trace', { kind: 'personal', shipId: SHIP });
  assert.equal(hearing.isClanShipTrophyWitnessGathered(save, 'cold-trace'), false);
  denyIncident(save, 'acknowledge-provenance');
  assert.equal(view(save).concluded, true); assert.equal(view(save).completed, false);
  save = refit(save, 'cold-trace'); save = actIncident(save, 'acknowledge-provenance');
  assert.equal(view(save).completed, true);
});

test('completed and partly decided V2 cases keep their historical sequential meaning and reward', () => {
  let save = actIncident(fixture(), 'conclude-provenance', { conclusion: 'paired-roles' });
  const decided = clone(save.clanShipIncidents);
  assert.equal(hearing.clanShipTrophyHearingNext(save), null); denyHearing(save, inviteAsh);
  assert.deepEqual(portable(save).clanShipIncidents, decided);
  save = actIncident(save, 'acknowledge-provenance'); const marks = save.profile.clanMarks;
  assert.equal(Object.hasOwn(portable(save), 'clanShipTrophyHearing'), false);
  assert.equal(hearing.clanShipTrophyHearingNext(save), null); denyHearing(save, inviteAsh);
  save = actIncident(save, 'acknowledge-provenance'); assert.equal(save.profile.clanMarks, marks);
});

test('ordinary writes and reloads preserve every new step and do not infer progress from time or a room visit', () => {
  let save = fixture(); const disk = storage(), beforeMarks = save.profile.clanMarks;
  const steps = [s => actHearing(s, inviteAsh), s => actHearing(s, inviteTrace),
    ...hearing.CLAN_SHIP_TROPHY_TELEMETRY.map(({ id }) => s => actHearing(s, record(id))),
    s => actIncident(s, 'conclude-provenance', { conclusion: 'paired-roles' }), s => actIncident(s, 'acknowledge-provenance')];
  for (const [index, step] of steps.entries()) {
    save = step(save);
    const written = saves.writeSaveWithStatus(save, disk); assert.equal(written.persisted, true, written.failure);
    const loaded = saves.loadSaveWithStatus(disk); assert.equal(loaded.loaded, true, loaded.failure);
    assert.deepEqual(loaded.save.clanShipTrophyHearing, save.clanShipTrophyHearing);
    assert.deepEqual(loaded.save.clanShipIncidents, save.clanShipIncidents);
    save = loaded.save; assert.equal(save.clanShipTrophyHearing.revision, index + 1);
    assert.equal(view(aboard(save, 'trophees')).ready, index >= 4);
  }
  assert.equal(save.profile.clanMarks, beforeMarks + 35);
});

test('portable import rejects fabricated attendance, skipped evidence and split decision receipts while protecting future versions', () => {
  const full = completed();
  for (const mutate of [
    s => { s.clanShipTrophyHearing.ownerCreatedAt = 'foreign'; },
    s => { s.clanShipTrophyHearing.events[0].witnessId = 'cold-trace'; },
    s => { s.clanShipTrophyHearing.events[2].sampleId = 'return-match'; },
    s => { s.clanShipTrophyHearing.events[0].incidentRevision = 1; },
    s => { s.clanShipTrophyHearing.events[2].observation = { roomId: 'archives', x: 790, y: 645 }; },
    s => { s.clanShipTrophyHearing.events[0].observation.x = 0; },
    s => { s.clanShipTrophyHearing.events[5].witnessIds = ['ash-scar', 'ash-scar']; },
    s => { s.clanShipTrophyHearing.events[5].conclusion = 'bearer-credit'; },
    s => { s.clanShipTrophyHearing.events[5].incidentRevision -= 1; },
    s => { s.clanShipTrophyHearing.events[5].observation.x += 1; },
    s => { s.clanShipTrophyHearing.events.pop(); s.clanShipTrophyHearing.revision -= 1; },
    s => { s.clanShipIncidents.incidents[0].events.pop(); s.clanShipIncidents.revision -= 1; },
    s => { s.clanShipOperations = null; },
  ]) {
    const bad = clone(full); mutate(bad);
    assert.equal(saves.parseSaveImport(JSON.stringify(bad)).failure, 'invalid-save');
  }
  const future = clone(full); future.clanShipTrophyHearing.version = 2;
  assert.equal(saves.parseSaveImport(JSON.stringify(future)).failure, 'future-version');
  assert.equal(hearing.isClanShipTrophyWitnessGathered(future, 'ash-scar'), false);
});

test('a failed storage write acknowledges neither an invitation nor the common verdict and final reward', () => {
  const panel = qa.load('app/game/ClanShipIncidentPanel.tsx');
  for (const stage of ['invite', 'conclude-provenance', 'acknowledge-provenance']) {
    let save = stage === 'invite' ? fixture() : ready();
    if (stage === 'acknowledge-provenance') save = actIncident(save, 'conclude-provenance', { conclusion: 'paired-roles' });
    const context = stage === 'invite' ? hearingContext(save, inviteAsh) : incidentContext(save, stage);
    let acknowledged = context.save; const disk = storage();
    assert.equal(saves.writeSaveWithStatus(acknowledged, disk).persisted, true);
    const bytes = [...disk.values], marks = acknowledged.profile.clanMarks, journal = clone(acknowledged.clanShipIncidents);
    const meeting = acknowledged.clanShipTrophyHearing && clone(acknowledged.clanShipTrophyHearing);
    disk.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
    const controlled = { save: acknowledged, onAction(action, observation) {
      const reduced = incidents.actClanShipIncident(action, { save: acknowledged, active: true, observation });
      assert.equal(reduced.accepted, true, reduced.message);
      const written = saves.writeSaveWithStatus({ ...acknowledged, clanShipIncidents: reduced.state,
        ...(reduced.hearingState ? { clanShipTrophyHearing: reduced.hearingState } : {}),
        profile: { ...acknowledged.profile, clanMarks: acknowledged.profile.clanMarks + reduced.clanMarksReward } }, disk);
      if (!written.persisted) return false; acknowledged = written.save; return true;
    }, onHearingAction(action, observation) {
      const reduced = incidents.actClanShipTrophyHearing(action, { save: acknowledged, active: true, observation });
      assert.equal(reduced.accepted, true, reduced.message);
      const written = saves.writeSaveWithStatus({ ...acknowledged, clanShipTrophyHearing: reduced.state }, disk);
      if (!written.persisted) return false; acknowledged = written.save; return true;
    } };
    const result = stage === 'invite' ? panel.submitClanShipTrophyHearing(controlled, inviteAsh, context.observation, true)
      : panel.submitClanShipIncident(controlled, { incidentId: ID, type: stage, ...(stage === 'conclude-provenance' ? { conclusion: 'paired-roles' } : {}) }, context.observation, true);
    assert.equal(result.accepted, false); assert.deepEqual([...disk.values], bytes); assert.equal(acknowledged.profile.clanMarks, marks);
    assert.deepEqual(acknowledged.clanShipIncidents, journal); assert.deepEqual(acknowledged.clanShipTrophyHearing, meeting);
    const reloaded = saves.loadSaveWithStatus(disk); assert.equal(reloaded.loaded, true, reloaded.failure);
    save = stage === 'invite' ? actHearing(reloaded.save, inviteAsh) : actIncident(reloaded.save, stage, stage === 'conclude-provenance' ? { conclusion: 'paired-roles' } : {});
    assert.equal(save.profile.clanMarks, marks + (stage === 'acknowledge-provenance' ? 35 : 0));
  }
});

test('the separate hearing journal coexists with maintenance revisions and survives later residence changes', () => {
  let save = completeInterior(fixture(), 'ship-seal-check'); save = actHearing(save, inviteAsh);
  const target = incidents.clanShipIncidentTarget('sealed-lot', 'accept', save);
  const maintenance = incidents.actClanShipIncident({ type: 'accept', incidentId: 'sealed-lot', ownerCreatedAt: OWNER, expectedRevision: save.clanShipIncidents.revision },
    { save: aboard(save, target.roomId), active: true, observation: { roomId: target.roomId, x: target.x, y: target.y } });
  assert.equal(maintenance.accepted, true, maintenance.message);
  save = { ...save, clanShipIncidents: maintenance.state }; portable(save);
  save = actHearing(save, inviteTrace); assert.equal(save.clanShipTrophyHearing.revision, 2);
  assert.ok(save.clanShipTrophyHearing.events[1].incidentRevision > save.clanShipTrophyHearing.events[0].incidentRevision);
  save = completed(ready(save)); const journal = clone(save.clanShipTrophyHearing);
  save = refit(recruit(save, 'cold-trace'), 'cold-trace', { kind: 'personal', shipId: SHIP });
  assert.deepEqual(portable(save).clanShipTrophyHearing, journal);
  assert.equal(incidents.evaluateClanShipTrophyHearingCampaign(journal, save).allowed, true);
});
