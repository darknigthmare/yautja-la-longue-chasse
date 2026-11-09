import assert from 'node:assert/strict';

/** Declared historical admission only. The target hunt remains unplayed and
 * its Clan Ship receipt absent. Earlier missions use real campaign reducers;
 * an earlier clan contract is prepared only when the target explicitly needs
 * that receipt. No live browser/game state is changed by this helper. */
export function createNativeClanFieldFixture20261109(domain, targetId) {
  const target = domain.clanShipContract(targetId);
  assert.equal(target?.kind, 'field');
  const targetMission = domain.MISSION_BY_ID[target.missionId];
  const owner = '2026-11-09T00:00:00.000Z', shipId = 'classic-predator-spaceship';
  let save = domain.defaultSave(owner);
  save.profile.hunterName = `QA native ${targetId} · préconditions historiques déclarées`;
  save.settings.masterVolume = 0; save.settings.difficultyId = 'young-blood';
  let berth = domain.createClanShipDockingState(owner, shipId);
  for (const type of ['approach', 'dock', 'board']) {
    const result = domain.actClanShipDocking(berth, { type }, { ownerCreatedAt: owner, personalShipId: shipId });
    assert.ok(result.accepted); berth = result.state;
  }
  save.clanShipDocking = berth; save.clanShipOperations = domain.createClanShipOperations(owner);
  const act = (type, values, roomId = 'conseil') => {
    if (save.clanShipDocking.roomId !== roomId) {
      const moved = domain.actClanShipDocking(save.clanShipDocking, { type: 'move-room', roomId }, { ownerCreatedAt: owner, personalShipId: shipId });
      assert.ok(moved.accepted); save.clanShipDocking = moved.state;
    }
    const result = domain.actClanShipOperations(save.clanShipOperations,
      { type, expectedRevision: save.clanShipOperations.revision, ...values }, { ownerCreatedAt: owner, campaign: save, docking: save.clanShipDocking });
    assert.ok(result.accepted, result.message);
    save = { ...save, clanShipOperations: result.state, profile: { ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward } };
  };
  for (const step of domain.CLAN_SHIP_ONBOARDING_STEPS) act('onboard-step', { stepId: step.id }, step.roomId);
  act('accept-mandate', {});
  const historical = [];
  for (const [index, mission] of domain.MISSIONS.toSorted((a, b) => a.order - b.order).filter(mission => mission.order < targetMission.order).entries()) {
    assert.notEqual(save.missionProgress[mission.id].status, 'locked', `Historical prerequisite must be admitted: ${mission.id}`);
    const requiredContract = target.prerequisiteIds.map(id => domain.clanShipContract(id)).find(item => item?.missionId === mission.id);
    const before = save;
    let state = save.clanShipOperations;
    if (requiredContract) {
      act('accept-contract', { contractId: requiredContract.id });
      const binding = domain.bindClanShipMission(save.clanShipOperations, { ownerCreatedAt: owner, missionId: mission.id,
        encounterRun: save.missionProgress[mission.id].attempts, expectedRevision: save.clanShipOperations.revision });
      assert.ok(binding.accepted); state = binding.state; save = { ...save, clanShipOperations: state };
    }
    const result = { missionId: mission.id, difficultyId: 'young-blood', outcome: 'success', score: 80, scans: 3, elapsedSeconds: 240,
      completedObjectiveIds: mission.objectives.filter(item => item.required || item.kind === 'extract').map(item => item.id),
      honorEvents: [], trophyQuality: 'elite', trophyClaims: [{ id: `${mission.id}-disclosed-old-prerequisite`, definitionId: mission.trophy.id,
        targetName: mission.targetName, targetKind: mission.targetKind, partId: mission.trophy.partId, condition: 'pristine', quality: 'elite' }],
      kills: 3, secondWindUsed: false, completedAt: new Date(Date.UTC(2026, 10, 9, 0, 10 + index)).toISOString() };
    const progressed = domain.applyMissionResult(save, result);
    assert.equal(progressed.missionProgress[mission.id].completions, before.missionProgress[mission.id].completions + 1);
    if (requiredContract) {
      const settlement = domain.settleClanShipMission(state, save, progressed, result,
        { ownerSaveCreatedAt: owner, missionId: mission.id, encounterRun: save.missionProgress[mission.id].attempts });
      assert.ok(settlement.accepted, settlement.message);
      save = { ...progressed, clanShipOperations: settlement.state,
        profile: { ...progressed.profile, clanMarks: progressed.profile.clanMarks + settlement.clanMarksReward } };
    } else save = progressed;
    historical.push({ missionId: mission.id, preparedBy: 'applyMissionResult production reducer', result,
      clanContractReceipt: requiredContract?.id ?? null });
  }
  const parsed = domain.parseSaveImport(JSON.stringify(save));
  assert.equal(parsed.failure, null); assert.ok(parsed.save);
  save = parsed.save;
  assert.equal(save.missionProgress[target.missionId].attempts, 0);
  assert.equal(save.missionProgress[target.missionId].completions, 0);
  assert.equal(save.missionProgress[target.missionId].status, 'available');
  assert.equal(save.clanShipOperations.completedContracts.some(item => item.contractId === targetId), false);
  assert.equal(domain.evaluateClanShipContract(save.clanShipOperations, targetId, save).allowed, true);
  return { save, disclosure: { targetContractId: targetId, targetMissionId: target.missionId, targetInitialAttempts: 0, targetInitialCompletions: 0,
    targetReceiptPrepared: false, historicalPrerequisites: historical, startingEquipment: save.loadout,
    difficulty: save.settings.difficultyId, note: 'Historical admission is an explicit synthetic initial assumption. Every target acceptance, binding, objective, result and new receipt must come from real mounted GameClient inputs. No full campaign playthrough is claimed.' } };
}
