import assert from 'node:assert/strict';
import { qa, ops, saves, fixture, completeInterior, aboard, SHIP } from './clan-ship-trophy-hearing-fixture.mjs';
import { createCradleReturnRoute } from './buried-cradle-return-route.mjs';
const { MISSION_BY_ID } = qa.load('app/game/data.ts');
const campaign = qa.load('app/game/systems/buriedCradleCampaign.ts');
const cradle = qa.load('app/game/systems/buriedCradle.ts');
const snapshots = qa.load('app/game/systems/buriedCradleSnapshot.ts');

/** Synthetic field results are routed through production reducers. These are
 * test prerequisites, NOT hunts or Cradle battles played by a browser. */
export function huntDialogueFixture() {
  let save = ['ship-seal-check', 'ship-armory-audit', 'ship-triage-route'].reduce(completeInterior, fixture({ evidence: false }));
  const contractId = 'field-bad-blood', mission = MISSION_BY_ID['volcano-bad-blood'];
  let result = ops.actClanShipOperations(save.clanShipOperations, { type: 'accept-contract', contractId, expectedRevision: save.clanShipOperations.revision },
    { ownerCreatedAt: save.createdAt, campaign: save, docking: { ownerCreatedAt: save.createdAt, status: 'aboard', roomId: 'conseil' } });
  assert(result.accepted, result.message); save = { ...save, clanShipOperations: result.state };
  const encounterRun = save.missionProgress[mission.id].attempts;
  result = ops.bindClanShipMission(save.clanShipOperations, { ownerCreatedAt: save.createdAt, missionId: mission.id, encounterRun, expectedRevision: save.clanShipOperations.revision });
  assert(result.accepted, result.message); save = { ...save, clanShipOperations: result.state };
  const raw = { missionId: mission.id, difficultyId: 'hunter', outcome: 'success', score: 80, scans: 3, elapsedSeconds: 240,
    completedObjectiveIds: mission.objectives.filter(entry => entry.required || entry.kind === 'extract').map(entry => entry.id),
    honorEvents: [], trophyQuality: 'elite', trophyClaims: [{ id: 'hunt-dialogue-bad-blood', definitionId: mission.trophy.id,
      targetName: mission.targetName, targetKind: mission.targetKind, partId: mission.trophy.partId, condition: 'pristine', quality: 'elite' }],
    kills: 3, secondWindUsed: false, completedAt: '2026-11-09T08:00:00.000Z' };
  const next = saves.applyMissionResult(save, raw);
  result = ops.settleClanShipMission(save.clanShipOperations, save, next, raw, { ownerSaveCreatedAt: save.createdAt, missionId: mission.id, encounterRun });
  assert(result.accepted, result.message);
  return aboard({ ...next, clanShipOperations: result.state, profile: { ...next.profile, clanMarks: next.profile.clanMarks + result.clanMarksReward } }, 'armurerie');
}

export function cradleDialogueFixture(source, outcome = 'crown', choice = 'present-clan') {
  const context = { personalShipId: SHIP, ownedShipIds: [SHIP] };
  let save = { ...source, buriedCradle: undefined, clanShipDocking: null };
  for (const type of ['prepare', 'depart']) {
    const result = campaign.actBuriedCradleCampaign(save, { type }, context);
    assert(result.accepted, result.message); save = { ...save, buriedCradle: result.state, prologue: result.prologue };
  }
  const progress = { ...cradle.createBuriedCradleProgress(), visitedRoomIds: [...cradle.CRADLE_ROOM_IDS],
    rootRingCut: true, drainageOpened: true, shortcutIds: ['roots-fault'],
    bossDefeated: outcome !== 'retreat', crownClaimed: outcome === 'crown' };
  let run = cradle.createBuriedCradleRun(progress, 1);
  run.roomId = '01'; run.player.x = 156; run.player.y = 508; run.player.health = 61;
  run = cradle.stepBuriedCradle(run, { interactPressed: true }, 1 / 60).run; assert(run.extracted);
  const result = campaign.actBuriedCradleCampaign(save, { type: 'extract', progress: run.progress, snapshot: snapshots.snapshotBuriedCradleRun(run) }, context);
  assert(result.accepted, result.message); save = { ...save, buriedCradle: result.state, prologue: result.prologue };
  if (choice) save = createCradleReturnRoute(qa).complete(save, context, choice);
  return aboard(save, 'armurerie');
}
