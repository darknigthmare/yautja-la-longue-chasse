import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aboard, fixture, ops, qa, saves } from './helpers/clan-ship-trophy-hearing-fixture.mjs';
import { recognizeElderThroughAssembly } from './helpers/elder-recognition-r2-m051.mjs';

const trial = qa.load('app/game/systems/successorTrialR2M054.ts');
const terrain = qa.load('app/game/systems/oserisReturnR2M053.ts');

function admitted(route) {
  const seed = aboard(fixture({ evidence: false, ruins: false }), 'hangar');
  let save = recognizeElderThroughAssembly(qa, {
    ...seed, profile: { ...seed.profile, rankId: 'elite', acquiredRankIdV166: 'elite', honor: 8000 },
  });
  const during = save;
  const start = save.clanShipOperations;
  const path = route === 'bank' ? ['maintain', 'place-markers', 'cross-river'] : ['adapt', 'climb-bank', 'follow-canopy', 'descend-east'];
  for (const order of ['land', 'approach', 'compare', ...path, 'return']) {
    const result = ops.actClanShipOperations(save.clanShipOperations, {
      type: 'oseris-return', order, expectedRevision: save.clanShipOperations.revision,
    }, { ownerCreatedAt: save.createdAt, campaign: save, docking: save.clanShipDocking });
    assert.ok(result.accepted, result.message);
    save = { ...save, clanShipOperations: result.state };
  }
  assert.equal(terrain.oserisReturnView(save.clanShipOperations.legacy.orders).complete, true);
  return { admitted: save, beforeOseris: { ...during, clanShipOperations: start } };
}

function act(save, order, position, revision = save.clanShipOperations.revision, roomId = 'hangar') {
  return ops.actClanShipOperations(save.clanShipOperations, {
    type: 'successor-trial', order, position, expectedRevision: revision,
  }, { ownerCreatedAt: save.createdAt, campaign: save, docking: { ...save.clanShipDocking, roomId } });
}

for (const [decision, route] of [['delegated', 'bank'], ['advised', 'canopy'], ['intervened', 'bank']]) {
  test('R2-M054 durable ' + decision + ' extraction at ' + route, () => {
    let { admitted: save, beforeOseris } = admitted(route);
    const starting = save;
    const point = trial.SUCCESSOR_LANDING;
    assert.equal(act(beforeOseris, 'deploy', point).reason, 'successor-trial-access');
    assert.equal(act({ ...save, elderMentoringV168: null }, 'deploy', point).reason, 'successor-trial-access');
    assert.equal(act({ ...save, elderPassageJudgmentV168: null }, 'deploy', point).reason, 'successor-trial-access');
    assert.equal(act(save, 'deploy', point, save.clanShipOperations.revision, 'conseil').reason, 'wrong-room');

    const plan = trial.successorTrialPlan(save, save.clanShipOperations.legacy);
    assert.equal(plan.route, route);
    const sequence = ['deploy', 'observe-posts', decision === 'advised' ? 'advise' : 'delegate', 'observe-approach',
      ...(decision === 'advised' ? [] : [decision === 'intervened' ? 'intervene' : 'give-space']), 'observe-extraction', 'report'];
    let previousActor = trial.SUCCESSOR_LANDING;
    for (const order of sequence) {
      const view = trial.successorTrialView(plan, save.clanShipOperations.successorTrial?.orders ?? []);
      const option = view.options.find(item => item.id === order);
      assert.ok(option, order);
      assert.equal(view.options.some(item => item.id === 'intervene'), view.danger);
      assert.equal(view.danger, order === 'intervene' || order === 'give-space');
      assert.equal(act(save, order, option.point, save.clanShipOperations.revision - 1).reason, 'stale-revision');
      const wrong = Object.values(trial.successorTrialSites(plan)).find(p => p.column !== option.point.column || p.row !== option.point.row);
      assert.equal(act(save, order, wrong).reason, 'successor-trial-order');
      if (view.successor) {
        let cursor = previousActor;
        for (let steps = 0; steps < 76 && (cursor.column !== view.successor.column || cursor.row !== view.successor.row); steps++) {
          const next = trial.nextSuccessorStep(cursor, view.successor);
          assert.ok(trial.isSuccessorTerrain(next));
          assert.equal(Math.abs(next.column - cursor.column) + Math.abs(next.row - cursor.row), 1);
          cursor = next;
        }
        assert.deepEqual(cursor, view.successor);
        previousActor = cursor;
      }
      const result = act(save, order, option.point);
      assert.ok(result.accepted, result.message);
      assert.equal(result.clanMarksReward, 0);
      const loaded = saves.parseSaveImport(saves.exportSave({ ...save, clanShipOperations: result.state }));
      assert.equal(loaded.failure, null);
      save = loaded.save;
      assert.equal(save.clanShipOperations.successorTrial.transmissionTrialObserved, order === 'report');
    }

    assert.equal(trial.successorTrialView(plan, save.clanShipOperations.successorTrial.orders).outcome, decision);
    assert.equal(act(save, 'report', point).reason, 'successor-trial-order');
    assert.deepEqual(save.missionProgress, starting.missionProgress);
    assert.deepEqual(save.elderAssemblyV168, starting.elderAssemblyV168);
    assert.equal(save.profile.honor, starting.profile.honor);
    const wrongPlan = structuredClone(save);
    wrongPlan.clanShipOperations.successorTrial.route = route === 'bank' ? 'canopy' : 'bank';
    assert.equal(saves.parseSaveImport(JSON.stringify(wrongPlan)).failure, 'invalid-save');
    const forged = structuredClone(save);
    forged.clanShipOperations.successorTrial.orders = ['deploy', 'observe-posts', 'advise', 'intervene', 'report'];
    assert.equal(saves.parseSaveImport(JSON.stringify(forged)).failure, 'invalid-save');
  });
}
