import assert from 'node:assert/strict';
import test from 'node:test';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';
import { mobilityExtensionQaGuidance } from '../scripts/mobility-qa-driver.mjs';

const qa = homeworldSceneSsrV78();
const ledger = qa.load('app/game/systems/mobility/ledger.ts');
const course = qa.load('app/game/systems/mobility/course.ts');
const catalogue = qa.load('app/game/systems/mobility/catalogue.ts');
const saves = qa.load('app/game/save.ts');
const { MISSION_BY_ID } = qa.load('app/game/data.ts');
const { MobilityDriveController } = qa.load('app/game/systems/mobility/controller.ts');
const OWNER = '2026-11-28T10:00:00.000Z';
const MISSION = MISSION_BY_ID['desert-sandmaw'];
const TROPHY_ID = 'serekh-apex-run-settled';
const COMPLETED = '2026-11-28T10:30:00.000Z';
const SAND_START = { type: 'start', modelId: catalogue.SAND_SKIMMER_MODEL, loaned: false, route: 'dunes-crossing' };
const CARRIER_START = { type: 'start', modelId: catalogue.TROPHY_CARRIER_MODEL, loaned: true, route: 'trophy-convoy' };
const CLAIM = { type: 'claim-sand-skimmer', trophyId: TROPHY_ID };

function base() {
  const save = saves.defaultSave(OWNER);
  save.profile = { ...save.profile, rankId: 'blooded', acquiredRankIdV166: 'blooded', clanMarks: 800 };
  save.mobilityV1 = { ...ledger.createMobilityLedger(OWNER), circulationPermit: true };
  return save;
}

function hunted() {
  const save = base();
  for (let id = MISSION.prerequisiteMissionId; id; id = MISSION_BY_ID[id].prerequisiteMissionId) {
    const progress = save.missionProgress[id];
    Object.assign(progress, { status: 'completed', completions: 1 });
  }
  save.missionProgress[MISSION.id].status = 'available';
  const settled = saves.applyMissionResult(save, {
    missionId: MISSION.id,
    difficultyId: 'hunter',
    outcome: 'success',
    score: 78,
    elapsedSeconds: 700,
    completedAt: COMPLETED,
    completedObjectiveIds: MISSION.objectives.map(objective => objective.id),
    honorEvents: [],
    secondWindUsed: false,
    kills: 7,
    scans: 3,
    trophyQuality: 'blooded',
    trophyClaims: [{
      id: TROPHY_ID, definitionId: MISSION.trophy.id, targetName: MISSION.targetName,
      targetKind: 'beast', partId: MISSION.trophy.partId, condition: 'intact', quality: 'blooded',
    }],
  });
  assert.equal(settled.missionProgress[MISSION.id].status, 'completed');
  assert.equal(settled.trophies.find(trophy => trophy.id === TROPHY_ID)?.definitionId, MISSION.trophy.id);
  return settled;
}

function displayed() {
  const save = hunted();
  const usage = qa.load('app/game/systems/trophyUsagesV147.ts');
  const trophy = save.trophies.find(entry => entry.id === TROPHY_ID);
  trophy.workshop = { completedActions: ['prepare'], bestScore: 80, lastCompletedAt: COMPLETED };
  const result = usage.applyTrophyUsageV147(save, { kind: 'display', trophyId: trophy.id, site: 'ship' }, COMPLETED, { atPersonalTrophyHall: true });
  assert(result);
  return result;
}

function order(save, command, allowed = true) {
  const before = JSON.stringify(save);
  const result = ledger.actMobility(save, {
    ...command, ownerCreatedAt: save.createdAt, expectedRevision: command.expectedRevision ?? save.mobilityV1.revision,
  });
  assert.equal(result.accepted, allowed, result.message);
  assert.equal(JSON.stringify(save), before);
  assert.equal(result.clanMarks, save.profile.clanMarks);
  return allowed ? { ...save, mobilityV1: result.state } : save;
}

test('the personal skimmer needs the actual settled Apex claim and stays off the sales list', () => {
  order(base(), CLAIM, false);
  const completed = hunted();
  order({ ...completed, trophies: [] }, CLAIM, false);
  order(completed, { ...CLAIM, trophyId: 'another-trophy' }, false);
  order(completed, { ...CLAIM, expectedRevision: 42 }, false);
  order(completed, { type: 'buy', modelId: SAND_START.modelId, expectedCost: 0 }, false);
  order({ ...completed, mobilityV1: { ...completed.mobilityV1, circulationPermit: false } }, CLAIM, false);
  const claimed = order(completed, CLAIM);
  assert.deepEqual(claimed.mobilityV1.sandSkimmer, { trophyId: TROPHY_ID, claimedAt: COMPLETED });
  assert.equal(claimed.mobilityV1.owned[0].id, SAND_START.modelId);
  assert.equal(claimed.mobilityV1.owned[0].acquiredBy, 'quest');
  assert.equal(claimed.trophies, completed.trophies);
  order(claimed, CLAIM, false);
  order(claimed, { ...SAND_START, route: undefined }, false);
  order(claimed, { ...SAND_START, loaned: true }, false);
  const noTrophy = { ...claimed, trophies: [] };
  assert.deepEqual(saves.parseSaveImport(JSON.stringify(noTrophy)).save.mobilityV1.sandSkimmer, claimed.mobilityV1.sandSkimmer);
});

test('the carrier borrows a real displayed trophy route without granting owned property or a permit', () => {
  order(hunted(), CARRIER_START, false);
  const display = displayed();
  assert(ledger.mobilityTrophyConvoyAvailable(display));
  order({ ...display, trophyUsagesV147: { ...display.trophyUsagesV147,
    assignments: { [TROPHY_ID]: { ...display.trophyUsagesV147.assignments[TROPHY_ID], site: 'home' } } } }, CARRIER_START, false);
  order(display, { ...CARRIER_START, loaned: false }, false);
  order(display, { ...CARRIER_START, route: undefined }, false);
  order(display, { type: 'buy', modelId: CARRIER_START.modelId, expectedCost: 0 }, false);
  const active = order(display, CARRIER_START);
  assert.equal(active.mobilityV1.active.loaned, true);
  const recovered = order(active, { type: 'recover', runId: active.mobilityV1.active.id });
  assert.equal(recovered.mobilityV1.recoveryDebt, 0);
  assert.deepEqual(recovered.mobilityV1.owned, []);
  assert.equal(recovered.mobilityV1.trainingReward, null);
  assert.equal(recovered.trophyUsagesV147, display.trophyUsagesV147);
});

for (const scenario of [
  { start: SAND_START, initial: () => order(hunted(), CLAIM), mass: 25 },
  { start: CARRIER_START, initial: displayed, mass: 75 },
]) {
  const { start, initial, mass } = scenario;
  test(`${start.route} visits the three beacons, restores the loaded vehicle and finishes at the depot`, () => {
    let save = order(initial(), start);
    const runId = save.mobilityV1.active.id;
    let controller = new MobilityDriveController(save.mobilityV1);
    const write = command => {
      save = order(save, command);
      return { accepted: true, message: 'Confirmed', state: save.mobilityV1 };
    };
    let stage = 0;
    let resumed = false;
    for (let i = 0; i < 11000 && !course.mobilityCoursePassed(controller.predicted); i++) {
      const at = controller.predicted;
      const { throttle, steer, brake, boost, interact, advance } = mobilityExtensionQaGuidance(at, start.route, stage);
      if (advance && stage !== 5 && (stage !== 1 || at.cargoKg === mass)) stage++;
      assert(controller.step({ throttle, steer, brake, boost, interact }));
      if (controller.pending.length === 30) assert(controller.flush(write), controller.message);
      if (!resumed && controller.predicted.cargoKg === mass) {
        assert(controller.flush(write), controller.message);
        const raw = JSON.stringify(save.mobilityV1);
        const imported = saves.parseSaveImport(JSON.stringify(save));
        assert.equal(imported.failure, null);
        assert.equal(JSON.stringify(imported.save.mobilityV1), raw);
        save = imported.save;
        controller = new MobilityDriveController(save.mobilityV1);
        resumed = true;
      }
    }
    assert(controller.flush(write), controller.message);
    assert(resumed);
    assert(course.mobilityCoursePassed(controller.predicted), JSON.stringify({ stage, at: controller.predicted }));
    const after = order(save, { type: 'return', runId });
    assert.equal(after.mobilityV1.lastReport.modelId, start.modelId);
    assert.equal(after.mobilityV1.lastReport.result, 'passed');
    assert(after.mobilityV1.lastReport.distance > 1500);
    assert.equal(after.mobilityV1.trainingReward, null);
    assert.equal(after.mobilityV1.forgeDelivery, undefined);
    assert.equal(after.mobilityV1.owned.length, start.loaned ? 0 : 1);
    if (!start.loaned) assert(after.mobilityV1.owned[0].energy < 100);
    order(after, { type: 'return', runId }, false);
  });
}

test('an imported route rejects a mismatched load, an unsupported route or a forged personal carrier', () => {
  const active = order(displayed(), CARRIER_START).mobilityV1;
  for (const modified of [
    { ...active.active, route: 'wrong' },
    { ...active.active, route: 'dunes-crossing' },
    { ...active.active, loaned: false },
    { ...active.active, course: { ...active.active.course, checkpoint: 2, cargoKg: 25 } },
  ]) {
    assert.equal(ledger.inspectMobilityLedger({ ...active, active: modified }, OWNER).status, 'invalid-save');
  }
});
