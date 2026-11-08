import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const ops = qa.load('app/game/systems/clanShipOperations.ts');
const saves = qa.load('app/game/save.ts');
const chronicle = qa.load('app/game/systems/clanChronicle.ts');
const { MISSION_BY_ID } = qa.load('app/game/data.ts');
const OWNER = '2026-11-05T12:00:00.000Z';
const OTHER = '2026-11-05T13:00:00.000Z';
const fresh = () => ops.createClanShipOperations(OWNER);
const campaign = () => saves.defaultSave(OWNER);
const context = (roomId = 'conseil', save = campaign(), status = 'aboard') => ({ ownerCreatedAt: OWNER, campaign: save,
  docking: { ownerCreatedAt: OWNER, status, roomId } });
const command = (state, type, values = {}) => ({ type, expectedRevision: state.revision, ...values });

function act(state, type, values = {}, roomId = 'conseil', save = campaign()) {
  const before = JSON.stringify(state);
  const result = ops.actClanShipOperations(state, command(state, type, values), context(roomId, save));
  assert.equal(result.accepted, true, `${type}: ${result.reason}: ${result.message}`);
  assert.equal(result.changed, true, type);
  assert.equal(JSON.stringify(state), before, 'reducers never mutate their input');
  assert.equal(result.state.revision, state.revision + 1);
  assert.equal(ops.inspectClanShipOperations(result.state, OWNER).status, 'valid', `${type}: valid output`);
  return result;
}
function denied(state, action, ctx = context(), reason) {
  const before = JSON.stringify(state);
  const result = ops.actClanShipOperations(state, action, ctx);
  assert.equal(result.accepted, false);
  assert.equal(result.changed, false);
  assert.equal(result.state, state);
  assert.equal(result.clanMarksReward, 0);
  assert.equal(JSON.stringify(state), before);
  if (reason) assert.equal(result.reason, reason);
  return result;
}
function welcomed() {
  let state = fresh();
  for (const step of ops.CLAN_SHIP_ONBOARDING_STEPS) state = act(state, 'onboard-step', { stepId: step.id }, step.roomId).state;
  return state;
}
const ready = () => act(welcomed(), 'accept-mandate').state;
const accept = (state, contractId, save = campaign()) => act(state, 'accept-contract', { contractId }, 'conseil', save).state;
function interior(state, contractId) {
  state = accept(state, contractId);
  let total = 0;
  for (const step of ops.clanShipContract(contractId).steps) {
    const result = act(state, 'interior-step', { stepId: step.id }, step.roomId);
    state = result.state; total += result.clanMarksReward;
  }
  assert.equal(total, ops.clanShipContract(contractId).clanMarksReward);
  return state;
}
function missionResult(missionId = 'jungle-vey', overrides = {}) {
  const mission = MISSION_BY_ID[missionId];
  return { missionId, difficultyId: 'hunter', outcome: 'success', score: 80, scans: 3, elapsedSeconds: 240,
    completedObjectiveIds: mission.objectives.filter(item => item.required || item.kind === 'extract').map(item => item.id),
    honorEvents: [], trophyQuality: 'elite', trophyClaims: [{ id: `${missionId}-clan-proof`, definitionId: mission.trophy.id,
      targetName: mission.targetName, targetKind: mission.targetKind, partId: mission.trophy.partId, condition: 'pristine', quality: 'elite' }],
    kills: 3, secondWindUsed: false, completedAt: '2026-11-05T14:00:00.000Z', ...overrides };
}
function bind(state, save, missionId = 'jungle-vey') {
  const result = ops.bindClanShipMission(state, { ownerCreatedAt: OWNER, missionId, encounterRun: save.missionProgress[missionId].attempts, expectedRevision: state.revision });
  assert.equal(result.accepted, true, result.message);
  assert.equal(result.changed, true);
  return result.state;
}
function settle(state, before, raw = missionResult()) {
  const progressed = saves.applyMissionResult(before, raw);
  const result = ops.settleClanShipMission(state, before, progressed, raw,
    { ownerSaveCreatedAt: OWNER, missionId: raw.missionId, encounterRun: before.missionProgress[raw.missionId].attempts });
  return { result, progressed };
}
function escort(state) {
  state = accept(state, 'space-screening');
  let total = 0;
  for (const type of ['scan', 'manoeuvre', 'brace', 'brace', 'extract']) {
    const result = act(state, 'space-command', { command: { type, expectedTurn: state.spaceEncounter.turn } });
    state = result.state; total += result.clanMarksReward;
  }
  assert.equal(state.spaceEncounter.status, 'victory');
  assert.equal(total, ops.clanShipContract('space-screening').clanMarksReward);
  return state;
}

test('catalogue has twelve original contracts and six distinct stationed recruits', () => {
  assert.equal(ops.CLAN_SHIP_CONTRACTS.length, 12);
  assert.equal(new Set(ops.CLAN_SHIP_CONTRACTS.map(item => item.id)).size, 12);
  assert.equal(ops.CLAN_SHIP_RECRUITS.length, 6);
  assert.equal(ops.CLAN_SHIP_ONBOARDING_STEPS.length, 3);
  for (const definition of ops.CLAN_SHIP_CONTRACTS) {
    if (definition.kind === 'field') assert.ok(MISSION_BY_ID[definition.missionId], 'real campaign mission');
    assert.ok(Number.isSafeInteger(definition.clanMarksReward) && definition.clanMarksReward >= 0);
  }
  assert.equal(new Set(ops.CLAN_SHIP_RECRUITS.map(item => item.spaceCrewRole)).size, 6);
  const rooms = new Set(ops.CLAN_SHIP_CONTRACTS.flatMap(item => item.steps.map(step => step.roomId)));
  rooms.add('conseil');
  assert.equal(rooms.size, 7, 'the concrete work reaches every existing room');
});

test('earned clan recruits fund actual quarters before lending tactical roles, with no injected marks', () => {
  const residence = qa.load('app/game/systems/companionResidence.ts');
  const docking = qa.load('app/game/systems/clanShipDocking.ts');
  const interior = qa.load('app/game/systems/clanShipInterior.ts');
  const ship = 'classic-predator-spaceship', host = { kind: 'clan', shipId: 'avp-predator-mothership' };
  const ids = ['threshold-guard', 'iron-claw', 'black-suture', 'ash-scar'];
  let save = campaign();
  assert.equal(save.profile.clanMarks, 0);
  let berth = docking.createClanShipDockingState(OWNER, ship);
  for (const type of ['approach', 'dock', 'board']) {
    const result = docking.actClanShipDocking(berth, { type }, { ownerCreatedAt: OWNER, personalShipId: ship });
    assert.equal(result.accepted, true); berth = result.state;
  }
  save = { ...save, clanShipDocking: berth };
  const move = roomId => {
    if (save.clanShipDocking.roomId === roomId) return;
    const result = docking.actClanShipDocking(save.clanShipDocking, { type: 'move-room', roomId }, { ownerCreatedAt: OWNER, personalShipId: ship });
    assert.equal(result.accepted, true); save = { ...save, clanShipDocking: result.state };
  };
  const perform = (intent, roomId = 'conseil') => {
    move(roomId);
    const state = save.clanShipOperations ?? fresh();
    const result = ops.actClanShipOperations(state, { ...intent, expectedRevision: state.revision }, {
      ownerCreatedAt: OWNER, docking: save.clanShipDocking, campaign: save, availableCrewIds: residence.availableClanResidenceCrew(save),
    });
    assert.equal(result.accepted, true, result.message); assert.equal(result.changed, true);
    let progressed = { ...save, clanShipOperations: result.state, profile: { ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward } };
    if (intent.type === 'recruit') {
      const registered = residence.registerCompanionResidenceRecruitment(save, progressed, intent.npcId);
      assert.equal(registered.accepted, true, registered.message); assert.equal(registered.changed, true);
      progressed = { ...progressed, companionResidence: registered.state };
    }
    save = progressed;
  };
  const member = id => save.companionResidence.members.find(member => member.id === id);
  const reserve = id => {
    assert.equal(member(id).assignment, null); assert.equal(member(id).installation, null); assert.equal(member(id).legacyClanPost, false);
    assert.equal(residence.availableClanResidenceCrew(save).includes(id), false);
    assert.equal(residence.companionResidencePresence(save, host).some(entry => entry.id === id), false);
  };
  const checkpoint = () => {
    const parsed = saves.parseSaveImport(saves.exportSave(save));
    assert.equal(parsed.failure, null); assert.ok(parsed.save);
    assert.deepEqual(parsed.save.clanShipOperations, save.clanShipOperations);
    assert.deepEqual(parsed.save.companionResidence, save.companionResidence);
    assert.equal(parsed.save.profile.clanMarks, save.profile.clanMarks);
    save = parsed.save;
  };
  const install = id => {
    move('hangar');
    const before = save.profile.clanMarks, cost = residence.companionResidenceDefinition(id).installationCost;
    assert.equal(cost, 20);
    for (const type of ['plan-refit', 'fund-refit', 'complete-refit']) {
      const result = residence.actCompanionResidence({ type, id, ...(type === 'plan-refit' ? { host } : {}),
        ownerCreatedAt: OWNER, expectedRevision: save.companionResidence.revision }, {
        save, selectedShipId: ship, ownedShipIds: [ship], active: true, site: 'clan',
        observation: { site: 'clan', roomId: 'hangar', ...interior.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint },
      });
      assert.equal(result.accepted, true, result.message); assert.equal(result.changed, true);
      save = { ...save, companionResidence: result.state, profile: { ...save.profile, clanMarks: result.clanMarks } };
      assert.equal(save.profile.clanMarks, before - (type === 'plan-refit' ? 0 : cost));
      if (type !== 'complete-refit') reserve(id);
      checkpoint();
    }
    assert.deepEqual(member(id).assignment, host); assert.equal(member(id).refit, null);
    assert.equal(residence.companionUsesLegacyClanPost(save, id), false);
    assert.equal(residence.companionResidencePresence(save, host).find(entry => entry.id === id)?.serviceAvailable, true);
  };
  for (const step of ops.CLAN_SHIP_ONBOARDING_STEPS) perform({ type: 'onboard-step', stepId: step.id }, step.roomId);
  perform({ type: 'accept-mandate' });
  for (const id of ids) {
    const npc = ops.CLAN_SHIP_RECRUITS.find(entry => entry.id === id);
    for (const contractId of npc.requiredContractIds) {
      perform({ type: 'accept-contract', contractId });
      for (const step of ops.clanShipContract(contractId).steps) perform({ type: 'interior-step', stepId: step.id }, step.roomId);
    }
    perform({ type: 'recruit', npcId: id }, npc.roomId); reserve(id); checkpoint();
    assert.equal(save.profile.clanMarks, id === 'threshold-guard' ? 15 : 35);
    if (id !== 'threshold-guard') install(id);
    assert.equal(save.profile.clanMarks, 15);
  }
  reserve('threshold-guard');
  assert.deepEqual(residence.availableClanResidenceCrew(save), ids.slice(1));
  perform({ type: 'accept-contract', contractId: 'space-screening' });
  assert.deepEqual(save.clanShipOperations.spaceEncounter.crewRoles, ['armorer', 'medic', 'veteran']);
  for (const type of ['scan', 'manoeuvre', 'brace', 'brace', 'extract']) {
    perform({ type: 'space-command', command: { type, expectedTurn: save.clanShipOperations.spaceEncounter.turn } });
  }
  assert.equal(save.clanShipOperations.spaceEncounter.status, 'victory');
  assert.equal(save.profile.clanMarks, 60); reserve('threshold-guard'); checkpoint();
  install('threshold-guard');
  assert.equal(save.profile.clanMarks, 40);
  assert.deepEqual(residence.availableClanResidenceCrew(save), ids);
  assert.equal(new Set(save.companionResidence.members.map(member => member.installation.berth)).size, 4);
  for (const [contractId, orders] of [
    ['space-interception', ['scan', 'manoeuvre', 'fire', 'brace', 'brace', 'fire', 'brace', 'fire']],
    ['space-recovery', ['scan', 'scan', 'manoeuvre', 'brace', 'disrupt', 'brace', 'disrupt', 'brace', 'manoeuvre', 'brace', 'board', 'brace', 'extract']],
  ]) {
    perform({ type: 'accept-contract', contractId });
    assert.deepEqual(save.clanShipOperations.spaceEncounter.crewRoles, ['armorer', 'medic', 'veteran', 'warden']);
    for (const type of orders) perform({ type: 'space-command', command: { type, expectedTurn: save.clanShipOperations.spaceEncounter.turn } });
    assert.equal(save.clanShipOperations.spaceEncounter.status, 'victory');
  }
  assert.equal(save.profile.clanMarks, 160, '75 + 45 + 65 + 55 rewards minus 80 housing costs');
  assert.equal(save.clanShipOperations.completedContracts.length, 8);
  checkpoint();
});

test('old absent dossiers are distinguishable from protected future or malformed data', () => {
  for (const raw of [undefined, null]) assert.equal(ops.inspectClanShipOperations(raw, OWNER).status, 'absent');
  assert.throws(() => ops.createClanShipOperations(' owner'), TypeError);
  assert.equal(ops.inspectClanShipOperations(fresh(), OTHER).status, 'invalid-save');
  assert.equal(ops.inspectClanShipOperations({ ...fresh(), version: 2, unknown: true }, OWNER).status, 'future-version');
  for (const patch of [{ extra: true }, { revision: -1 }, { revision: 1.5 }, { onboardingStep: 4 }, { mandateAccepted: true },
    { circleConfirmed: true }, { recruitedNpcIds: ['star-watch'] }, { completedContracts: [null] }]) {
    assert.equal(ops.inspectClanShipOperations({ ...fresh(), ...patch }, OWNER).status, 'invalid-save');
  }
  const state = ready();
  const copy = ops.inspectClanShipOperations(JSON.parse(JSON.stringify(state)), OWNER).state;
  assert.deepEqual(copy, state); assert.notEqual(copy, state);
  copy.completedContracts[0].proof.stepIds.pop();
  assert.equal(state.completedContracts[0].proof.stepIds.length, 3, 'read copy owns its nested DTOs');
});

test('existing adult access remains; honor cannot replace the narrative Blooded rite', () => {
  const save = campaign();
  assert.equal(ops.evaluateClanShipAccess(save).allowed, true);
  const youth = { ...save, profile: { ...save.profile, rankId: 'elder', honor: 99999 },
    prologue: { status: 'completed', chronicle: chronicle.createClanChronicle() } };
  assert.equal(ops.evaluateClanShipAccess(youth).allowed, false);
  assert.equal(ops.evaluateClanShipOperationsPhase(youth, fresh()), 'blooded-required');
  denied(fresh(), command(fresh(), 'onboard-step', { stepId: 'berth-register' }), context('hangar', youth), 'blooded-required');
  youth.prologue.chronicle = { version: 1, evidence: chronicle.CHRONICLE_EVIDENCE.map(({ id, sourceId }) => ({ id, sourceId })),
    rites: chronicle.CHRONICLE_RITES.slice(0, 3).map(({ id, sourceId }) => ({ id, sourceId })), legacyRecognition: null };
  assert.equal(chronicle.getChronicleRank(youth.prologue.chronicle), 'blooded');
  assert.equal(ops.evaluateClanShipAccess(youth).allowed, true);
});

test('onboarding and mandate require their actual rooms and one step per fresh intent', () => {
  let state = fresh();
  assert.equal(ops.evaluateClanShipOperationsPhase(campaign(), state), 'welcome');
  denied(state, command(state, 'accept-mandate'), context(), 'mandate-unavailable');
  denied(state, command(state, 'onboard-step', { stepId: 'archive-orientation' }), context('archives'), 'wrong-step');
  const first = command(state, 'onboard-step', { stepId: 'berth-register' });
  denied(state, first, context('archives'), 'wrong-room');
  for (const status of ['free-flight', 'approach', 'docked']) denied(state, first, context('hangar', campaign(), status), 'not-aboard');
  state = act(state, 'onboard-step', { stepId: 'berth-register' }, 'hangar').state;
  denied(state, first, context('hangar'), 'stale-revision');
  for (const step of ops.CLAN_SHIP_ONBOARDING_STEPS.slice(1)) state = act(state, 'onboard-step', { stepId: step.id }, step.roomId).state;
  assert.equal(ops.evaluateClanShipOperationsPhase(campaign(), state), 'mandate');
  denied(state, command(state, 'accept-mandate'), context('archives'), 'wrong-room');
  const result = act(state, 'accept-mandate'); state = result.state;
  assert.equal(result.clanMarksReward, 0);
  assert.equal(ops.evaluateClanShipOperationsPhase(campaign(), state), 'operations');
  denied(state, command(state, 'accept-mandate'), context(), 'mandate-unavailable');
});

test('owner, stale revisions and unexpected command fields never advance progress', () => {
  const state = ready();
  denied(state, command(state, 'accept-contract', { contractId: 'ship-seal-check', force: true }), context(), 'invalid-action');
  denied(state, { type: 'accept-contract', contractId: 'ship-seal-check', expectedRevision: state.revision - 1 }, context(), 'stale-revision');
  denied(state, command(state, 'accept-contract', { contractId: 'ship-seal-check' }),
    { ...context(), ownerCreatedAt: OTHER, campaign: { ...campaign(), createdAt: OTHER } }, 'invalid-save');
  denied(state, command(state, 'accept-contract', { contractId: 'ship-seal-check' }),
    { ...context(), docking: { ...context().docking, ownerCreatedAt: OTHER } }, 'not-aboard');
});

test('one active contract and campaign availability are preserved at the council', () => {
  let state = ready();
  denied(state, command(state, 'accept-contract', { contractId: 'field-ice-route' }), context(), 'contract-unavailable');
  denied(state, command(state, 'accept-contract', { contractId: 'space-interception' }), context(), 'contract-unavailable');
  denied(state, command(state, 'accept-contract', { contractId: 'welcome-aboard' }), context(), 'contract-unavailable');
  denied(state, command(state, 'accept-contract', { contractId: 'ship-seal-check' }), context('hangar'), 'wrong-room');
  state = accept(state, 'ship-seal-check');
  denied(state, command(state, 'accept-contract', { contractId: 'ship-armory-audit' }), context(), 'contract-unavailable');
  denied(state, command(state, 'cancel-contract'), context('hangar'), 'wrong-room');
  const cancelled = act(state, 'cancel-contract');
  assert.equal(cancelled.clanMarksReward, 0); assert.equal(cancelled.state.activeContract, null);
  assert.equal(cancelled.state.completedContracts.length, 1);
});

test('interior circuit cannot be skipped or remotely completed; reward follows its last ordered action', () => {
  let state = accept(ready(), 'ship-seal-check');
  const definition = ops.clanShipContract('ship-seal-check');
  denied(state, command(state, 'interior-step', { stepId: definition.steps.at(-1).id }), context('hangar'), 'wrong-step');
  const firstIntent = command(state, 'interior-step', { stepId: definition.steps[0].id });
  for (const [index, step] of definition.steps.entries()) {
    assert.equal(ops.getClanShipActiveStep(state).id, step.id);
    denied(state, command(state, 'interior-step', { stepId: step.id }), context('conseil'), 'wrong-room');
    const result = act(state, 'interior-step', { stepId: step.id }, step.roomId);
    assert.equal(result.clanMarksReward, index === definition.steps.length - 1 ? definition.clanMarksReward : 0);
    state = result.state;
  }
  assert.equal(state.activeContract, null);
  assert.equal(state.recruitedNpcIds.length, 0, 'completion never silently recruits');
  denied(state, firstIntent, context('hangar'), 'stale-revision');
  denied(state, command(state, 'accept-contract', { contractId: definition.id }), context(), 'contract-unavailable');
});

test('recruitment needs proof and an explicit return to the correct post', () => {
  let state = ready();
  denied(state, command(state, 'recruit', { npcId: 'iron-claw' }), context('armurerie'), 'recruit-unavailable');
  state = interior(state, 'ship-armory-audit');
  assert.equal(ops.evaluateClanShipRecruit(state, 'iron-claw').allowed, true);
  denied(state, command(state, 'recruit', { npcId: 'iron-claw' }), context('conseil'), 'wrong-room');
  const joined = act(state, 'recruit', { npcId: 'iron-claw' }, 'armurerie'); state = joined.state;
  assert.equal(joined.clanMarksReward, 0);
  assert.deepEqual(state.recruitedNpcIds, ['iron-claw']);
  denied(state, command(state, 'recruit', { npcId: 'iron-claw' }), context('armurerie'), 'recruit-unavailable');
  assert.deepEqual(ops.inspectClanShipOperations(JSON.parse(JSON.stringify(state)), OWNER).state.recruitedNpcIds, ['iron-claw']);
});

test('a field receipt requires both real accepted completion and the exact bound encounter', () => {
  const save = campaign();
  let state = accept(ready(), 'field-jungle-survey', save);
  const raw = missionResult();
  let checked = settle(state, save, raw);
  assert.equal(checked.result.accepted, false, 'accepting is not launching');
  state = bind(state, save);
  const unproven = ops.settleClanShipMission(state, save, save, raw, { ownerSaveCreatedAt: OWNER, missionId: raw.missionId, encounterRun: 0 });
  assert.equal(unproven.accepted, false, 'button success without progression rejected');
  checked = settle(state, save, raw);
  assert.equal(checked.result.accepted, true); assert.equal(checked.result.clanMarksReward, 40);
  assert.equal(checked.progressed.missionProgress['jungle-vey'].completions, 1);
  assert.equal(checked.result.state.completedContracts.at(-1).proof.encounterRun, 0);
  assert.equal(checked.result.state.activeContract, null);
  assert.equal(checked.result.state.recruitedNpcIds.length, 0);
  const duplicate = ops.settleClanShipMission(checked.result.state, save, checked.progressed, raw, { ownerSaveCreatedAt: OWNER, missionId: raw.missionId, encounterRun: 0 });
  assert.equal(duplicate.changed, false); assert.equal(duplicate.clanMarksReward, 0);
});

test('a success rejected by applyMissionResult cannot settle the clan contract', () => {
  const save = campaign(), state = bind(accept(ready(), 'field-jungle-survey', save), save);
  for (const raw of [missionResult('jungle-vey', { completedObjectiveIds: [] }),
    missionResult('jungle-vey', { trophyClaims: [] }), missionResult('jungle-vey', { difficultyId: 'elder' })]) {
    const { result, progressed } = settle(state, save, raw);
    assert.equal(progressed.missionProgress['jungle-vey'].completions, 0);
    assert.equal(result.accepted, false); assert.equal(result.clanMarksReward, 0); assert.equal(result.state, state);
  }
});

test('runId rotation on resume is irrelevant, while owner and encounter mismatches are rejected', () => {
  const save = campaign(), state = bind(accept(ready(), 'field-jungle-survey', save), save);
  const raw = missionResult(), progressed = saves.applyMissionResult(save, raw);
  for (const session of [null, { ownerSaveCreatedAt: OTHER, missionId: raw.missionId, encounterRun: 0 },
    { ownerSaveCreatedAt: OWNER, missionId: raw.missionId, encounterRun: 1 }, { ownerSaveCreatedAt: OWNER, missionId: 'ice-cryostalker', encounterRun: 0 }]) {
    assert.equal(ops.settleClanShipMission(state, save, progressed, raw, session).accepted, false);
  }
  const result = ops.settleClanShipMission(state, save, progressed, raw,
    { ownerSaveCreatedAt: OWNER, missionId: raw.missionId, encounterRun: 0, runId: 'new-resumed-run' });
  assert.equal(result.clanMarksReward, 40);
  assert.equal(ops.settleClanShipMission(state, save, { ...progressed, createdAt: OTHER }, raw,
    { ownerSaveCreatedAt: OWNER, missionId: raw.missionId, encounterRun: 0 }).accepted, false);
});

test('low telemetry, defeat and abandonment keep the contract retryable without credit', () => {
  for (const patch of [{ score: 49 }, { scans: 0 }, { outcome: 'failed' }, { outcome: 'abandoned' }]) {
    const save = campaign();
    let state = bind(accept(ready(), 'field-jungle-survey', save), save);
    denied(state, command(state, 'cancel-contract'), context(), 'hunt-in-progress');
    const { result, progressed } = settle(state, save, missionResult('jungle-vey', patch));
    assert.equal(result.accepted, true); assert.equal(result.changed, true); assert.equal(result.clanMarksReward, 0);
    assert.equal(result.state.activeContract.missionEncounterRun, null);
    assert.equal(result.state.completedContracts.length, 1);
    state = bind(result.state, progressed);
    assert.equal(state.activeContract.missionEncounterRun, 1);
    const retry = settle(state, progressed);
    assert.equal(retry.result.clanMarksReward, 40);
  }
});

test('old completed hunts do not become new proof just by accepting a contract', () => {
  const old = saves.applyMissionResult(campaign(), missionResult());
  let state = accept(ready(), 'field-jungle-survey', old);
  assert.equal(state.activeContract.baselineCompletions, 1);
  state = bind(state, old);
  const unchangedProgress = ops.settleClanShipMission(state, old, old, missionResult(), { ownerSaveCreatedAt: OWNER, missionId: 'jungle-vey', encounterRun: 1 });
  assert.equal(unchangedProgress.accepted, false);
  const replay = settle(state, old);
  assert.equal(replay.result.clanMarksReward, 40);
  const other = ops.bindClanShipMission(accept(ready(), 'field-jungle-survey'),
    { ownerCreatedAt: OWNER, missionId: 'ice-cryostalker', encounterRun: 0, expectedRevision: 5 });
  assert.equal(other.changed, false, 'an unrelated departure does not consume the contract');
});

test('space escort is playable immediately after mandate, requires council commands and pays once on victory', () => {
  let state = accept(ready(), 'space-screening');
  assert.deepEqual(state.spaceEncounter.crewRoles, []);
  const action = command(state, 'space-command', { command: { type: 'scan', expectedTurn: 0 } });
  denied(state, action, context('archives'), 'wrong-room');
  state = act(state, 'space-command', { command: { type: 'scan', expectedTurn: 0 } }).state;
  denied(state, command(state, 'space-command', { command: { type: 'manoeuvre', expectedTurn: 0 } }), context(), 'turn-mismatch');
  for (const type of ['manoeuvre', 'brace', 'brace', 'extract']) {
    const result = act(state, 'space-command', { command: { type, expectedTurn: state.spaceEncounter.turn } });
    assert.equal(result.clanMarksReward, type === 'extract' ? 45 : 0); state = result.state;
  }
  assert.equal(state.completedContracts.at(-1).proof.encounter.status, 'victory');
  denied(state, command(state, 'space-command', { command: { type: 'extract', expectedTurn: state.spaceEncounter.turn } }), context(), 'no-space-encounter');
  denied(state, command(state, 'accept-contract', { contractId: 'space-screening' }), context(), 'contract-unavailable');
});

test('space withdrawal creates no receipt and crew snapshots only include recruited members', () => {
  let state = interior(ready(), 'ship-armory-audit');
  state = act(state, 'recruit', { npcId: 'iron-claw' }, 'armurerie').state;
  state = accept(state, 'space-screening');
  assert.deepEqual(state.spaceEncounter.crewRoles, ['armorer']);
  const result = act(state, 'space-command', { command: { type: 'withdraw', expectedTurn: 0 } }); state = result.state;
  assert.equal(result.clanMarksReward, 0); assert.equal(state.activeContract, null);
  assert.equal(state.completedContracts.some(item => item.contractId === 'space-screening'), false);
  state = accept(state, 'space-screening');
  assert.equal(state.spaceEncounter.turn, 0);
});

test('nested space future versions and fabricated victory or duplicated proof are rejected', () => {
  const state = escort(ready());
  const future = structuredClone(state); future.completedContracts.at(-1).proof.encounter.version = 2;
  assert.equal(ops.inspectClanShipOperations(future, OWNER).status, 'future-version');
  const bad = structuredClone(state); bad.spaceEncounter.history = []; bad.completedContracts.at(-1).proof.encounter.history = [];
  assert.equal(ops.inspectClanShipOperations(bad, OWNER).status, 'invalid-save');
  const duplicate = structuredClone(state); duplicate.completedContracts.push(structuredClone(duplicate.completedContracts.at(-1)));
  assert.equal(ops.inspectClanShipOperations(duplicate, OWNER).status, 'invalid-save');
  const skipped = interior(ready(), 'ship-seal-check'); skipped.completedContracts.at(-1).proof.stepIds.reverse();
  assert.equal(ops.inspectClanShipOperations(skipped, OWNER).status, 'invalid-save');
  const space = qa.load('app/game/systems/clanShipSpaceEncounter.ts');
  const unearned = accept(ready(), 'space-screening');
  unearned.spaceEncounter = space.createClanShipSpaceEncounter('escort', ['navigator']);
  assert.equal(ops.inspectClanShipOperations(unearned, OWNER).reason, 'unearned-space-crew');
  const unreceipted = structuredClone(state); unreceipted.completedContracts.pop();
  assert.equal(ops.inspectClanShipOperations(unreceipted, OWNER).reason, 'unreceipted-space-victory');
});

test('saved receipts and active steps cannot consume revisions that never occurred', () => {
  const cases = [];
  const earlyWelcome = welcomed(); earlyWelcome.completedContracts[0].completedRevision = 1; cases.push(earlyWelcome);
  const unexplainedWelcome = welcomed(); unexplainedWelcome.revision += 1; cases.push(unexplainedWelcome);
  const earlyAccepted = accept(ready(), 'ship-seal-check'); earlyAccepted.activeContract.acceptedRevision = 4; cases.push(earlyAccepted);
  const skippedStep = accept(ready(), 'ship-seal-check'); skippedStep.activeContract.stepIndex = 1; cases.push(skippedStep);
  const earlyCompleted = interior(ready(), 'ship-seal-check'); earlyCompleted.completedContracts.at(-1).completedRevision -= 1; cases.push(earlyCompleted);
  let space = accept(ready(), 'space-screening');
  space = act(space, 'space-command', { command: { type: 'scan', expectedTurn: 0 } }).state;
  space.revision -= 1; cases.push(space);
  let withdrawn = accept(ready(), 'space-screening');
  withdrawn = act(withdrawn, 'space-command', { command: { type: 'withdraw', expectedTurn: 0 } }).state;
  withdrawn.revision -= 1; cases.push(withdrawn);
  for (const invalid of cases) assert.equal(ops.inspectClanShipOperations(invalid, OWNER).status, 'invalid-save');
  assert.equal(ops.inspectClanShipOperations({ ...fresh(), spaceEncounter: undefined }, OWNER).status, 'invalid-save', 'an own undefined field would be lost on JSON export');
});

test('a valid imported spatial receipt is independent of object key insertion order', () => {
  const state = escort(ready());
  const reordered = structuredClone(state);
  for (const holder of [reordered, reordered.completedContracts.at(-1).proof]) {
    const key = holder === reordered ? 'spaceEncounter' : 'encounter';
    holder[key] = Object.fromEntries(Object.entries(holder[key]).reverse());
  }
  const checked = ops.inspectClanShipOperations(JSON.parse(JSON.stringify(reordered)), OWNER);
  assert.equal(checked.status, 'valid', checked.reason);
  assert.deepEqual(checked.state, state);
});

test('retiring an exact hunt recovery releases only its binding and preserves a retryable contract', () => {
  const save = campaign(), initial = bind(accept(ready(), 'field-jungle-survey'), save);
  const binding = { ownerCreatedAt: OWNER, missionId: 'jungle-vey', encounterRun: 0, expectedRevision: initial.revision };
  const bytes = JSON.stringify(initial);
  for (const patch of [{ ownerCreatedAt: OTHER }, { expectedRevision: initial.revision - 1 }, { encounterRun: 1 }, { force: true }]) {
    const denied = ops.releaseClanShipMissionBinding(initial, { ...binding, ...patch });
    assert.equal(denied.accepted, false); assert.equal(denied.changed, false);
    assert.equal(denied.state, initial); assert.equal(denied.clanMarksReward, 0);
  }
  const unrelated = ops.releaseClanShipMissionBinding(initial, { ...binding, missionId: 'ice-cryostalker' });
  assert.equal(unrelated.accepted, true); assert.equal(unrelated.changed, false);
  const released = ops.releaseClanShipMissionBinding(initial, binding);
  assert.equal(released.accepted, true); assert.equal(released.changed, true); assert.equal(released.clanMarksReward, 0);
  assert.equal(JSON.stringify(initial), bytes);
  assert.equal(released.state.activeContract.missionEncounterRun, null);
  assert.equal(released.state.activeContract.baselineCompletions, 0);
  assert.deepEqual(released.state.completedContracts, initial.completedContracts);
  assert.equal(ops.inspectClanShipOperations(released.state, OWNER).status, 'valid');
  const repeated = ops.releaseClanShipMissionBinding(released.state, { ...binding, expectedRevision: released.state.revision });
  assert.equal(repeated.accepted, true); assert.equal(repeated.changed, false); assert.equal(repeated.clanMarksReward, 0);
  // The retired recovery did not count as an attempt. Its replacement may
  // reuse encounterRun, then only the real accepted result earns the reward.
  const rebound = bind(released.state, save);
  const settled = settle(rebound, save);
  assert.equal(settled.result.clanMarksReward, 40);
  const lateRetirement = ops.releaseClanShipMissionBinding(settled.result.state,
    { ...binding, expectedRevision: settled.result.state.revision });
  assert.equal(lateRetirement.changed, false); assert.equal(lateRetirement.clanMarksReward, 0);
  assert.equal(lateRetirement.state, settled.result.state);
});

test('settlement rejects a failure that unexpectedly changes mission completion status', () => {
  const save = campaign(), state = bind(accept(ready(), 'field-jungle-survey'), save);
  const raw = missionResult('jungle-vey', { outcome: 'failed' });
  const progressed = saves.applyMissionResult(save, raw);
  progressed.missionProgress['jungle-vey'].status = 'completed';
  const changedStatus = ops.settleClanShipMission(state, save, progressed, raw,
    { ownerSaveCreatedAt: OWNER, missionId: raw.missionId, encounterRun: 0 });
  assert.equal(changedStatus.accepted, false); assert.equal(changedStatus.clanMarksReward, 0);
  assert.equal(changedStatus.state, state, 'a rejected result leaves the exact binding available for a real retry');
});

test('campaign evidence matches the bound attempt and completion baseline without inventing legacy attempts', () => {
  const save = campaign(), state = bind(accept(ready(), 'field-jungle-survey'), save);
  assert.equal(ops.evaluateClanShipOperationsCampaign(state, save).allowed, true);
  for (const patch of [{ attempts: 1 }, { completions: 1 }, { status: 'locked' }, { attempts: -1 }, { completions: 0.5 }]) {
    const invalid = structuredClone(save); Object.assign(invalid.missionProgress['jungle-vey'], patch);
    assert.equal(ops.evaluateClanShipOperationsCampaign(state, invalid).allowed, false);
  }
  const legacy = campaign();
  legacy.missionProgress['jungle-vey'].status = 'completed'; legacy.missionProgress['jungle-vey'].completions = 3;
  const legacyBound = bind(accept(ready(), 'field-jungle-survey', legacy), legacy);
  assert.equal(ops.evaluateClanShipOperationsCampaign(legacyBound, legacy).allowed, true);
  assert.equal(legacy.missionProgress['jungle-vey'].attempts, 0, 'the operations system does not manufacture legacy attempts');
  const settled = settle(legacyBound, legacy);
  assert.equal(settled.result.clanMarksReward, 40);
  assert.equal(ops.evaluateClanShipOperationsCampaign(settled.result.state, settled.progressed).allowed, true);
  assert.equal(ops.evaluateClanShipOperationsCampaign(settled.result.state, legacy).allowed, false, 'a receipt cannot predate its accepted attempt');
});

test('circle recognition requires six earned agreements, field and space proofs, then a council action', () => {
  let state = ready(), save = campaign();
  denied(state, command(state, 'confirm-circle'), context(), 'circle-incomplete');
  for (const id of ['ship-seal-check', 'ship-armory-audit', 'ship-triage-route', 'ship-training-circuit']) state = interior(state, id);
  for (const [id, missionId] of [['field-jungle-survey', 'jungle-vey'], ['field-ice-route', 'ice-cryostalker']]) {
    state = bind(accept(state, id, save), save, missionId);
    const settled = settle(state, save, missionResult(missionId));
    assert.equal(settled.result.accepted, true); state = settled.result.state; save = settled.progressed;
  }
  for (const npc of ops.CLAN_SHIP_RECRUITS) state = act(state, 'recruit', { npcId: npc.id }, npc.roomId).state;
  denied(state, command(state, 'confirm-circle'), context(), 'circle-incomplete');
  state = escort(state);
  assert.equal(ops.evaluateClanShipOperationsPhase(save, state), 'operations');
  denied(state, command(state, 'confirm-circle'), context('trophees'), 'wrong-room');
  const recognized = act(state, 'confirm-circle'); state = recognized.state;
  assert.equal(recognized.clanMarksReward, 0);
  assert.equal(ops.evaluateClanShipOperationsPhase(save, state), 'circle-confirmed');
  denied(state, command(state, 'confirm-circle'), context(), 'circle-incomplete');
  assert.deepEqual(ops.inspectClanShipOperations(JSON.parse(JSON.stringify(state)), OWNER).state, state);
});

test('all twelve contracts remain completable through real campaign unlocks and the three crewed space objectives', () => {
  let state = ready(), save = campaign();
  for (const definition of ops.CLAN_SHIP_CONTRACTS.filter(item => item.kind === 'interior')) state = interior(state, definition.id);
  for (const definition of ops.CLAN_SHIP_CONTRACTS.filter(item => item.kind === 'field')) {
    const target = MISSION_BY_ID[definition.missionId];
    for (const mission of Object.values(MISSION_BY_ID).filter(item => item.order < target.order).sort((a, b) => a.order - b.order)) {
      if (save.missionProgress[mission.id].status !== 'completed') save = saves.applyMissionResult(save, missionResult(mission.id));
    }
    assert.notEqual(save.missionProgress[target.id].status, 'locked', target.title);
    state = bind(accept(state, definition.id, save), save, target.id);
    const settled = settle(state, save, missionResult(target.id));
    assert.equal(settled.result.clanMarksReward, definition.clanMarksReward);
    state = settled.result.state; save = settled.progressed;
  }
  for (const npc of ops.CLAN_SHIP_RECRUITS) state = act(state, 'recruit', { npcId: npc.id }, npc.roomId, save).state;
  for (const [id, orders] of [
    ['space-screening', ['scan', 'manoeuvre', 'brace', 'brace', 'extract']],
    ['space-interception', ['scan', 'manoeuvre', 'disrupt', 'brace', 'brace', 'disrupt', 'board']],
    ['space-recovery', ['scan', 'manoeuvre', 'disrupt', 'brace', 'brace', 'disrupt', 'board', 'brace', 'extract']],
  ]) {
    state = accept(state, id, save);
    assert.equal(state.spaceEncounter.crewRoles.length, 6);
    let reward = 0;
    for (const type of orders) {
      const result = act(state, 'space-command', { command: { type, expectedTurn: state.spaceEncounter.turn } }, 'conseil', save);
      state = result.state; reward += result.clanMarksReward;
    }
    assert.equal(state.spaceEncounter.status, 'victory', id);
    assert.equal(reward, ops.clanShipContract(id).clanMarksReward, id);
  }
  assert.equal(state.completedContracts.length, ops.CLAN_SHIP_CONTRACTS.length);
  assert.deepEqual(new Set(state.completedContracts.map(receipt => receipt.contractId)), new Set(ops.CLAN_SHIP_CONTRACT_IDS));
  const recognized = act(state, 'confirm-circle', {}, 'conseil', save).state;
  assert.equal(ops.evaluateClanShipOperationsPhase(save, recognized), 'circle-confirmed');
  assert.deepEqual(ops.inspectClanShipOperations(JSON.parse(JSON.stringify(recognized)), OWNER).state, recognized);
});
