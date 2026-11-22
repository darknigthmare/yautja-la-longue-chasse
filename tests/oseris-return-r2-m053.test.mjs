import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aboard, fixture, ops, qa, saves } from './helpers/clan-ship-trophy-hearing-fixture.mjs';

const scene = qa.load('app/game/systems/oserisReturnR2M053.ts');

test('R2-M053 revisits the original Oseris flood trench through either surveyed route', () => {
  const seed = aboard(fixture({ evidence: false, ruins: false }), 'hangar');
  const elder = { ...seed, profile: { ...seed.profile, rankId: 'elder', acquiredRankIdV166: 'elder', honor: 8000 } };
  const base = elder.clanShipOperations;
  const action = (save, state, order, roomId = 'hangar', revision = state.revision) =>
    ops.actClanShipOperations(state, { type: 'oseris-return', expectedRevision: revision, order }, {
      ownerCreatedAt: save.createdAt, campaign: save, docking: { ...save.clanShipDocking, roomId },
    });
  assert.equal(action(seed, base, 'land').reason, 'oseris-return-access');
  assert.equal(action(elder, base, 'land', 'conseil').reason, 'wrong-room');
  assert.equal(action(elder, base, 'compare').reason, 'oseris-return-order');
  assert.equal(scene.OSERIS_RETURN_TERRAIN_R2_M053.trench.id, 'j-flood-pulse');
  assert.equal(scene.OSERIS_RETURN_TERRAIN_R2_M053.canopy.id, 'j-crown-03');
  const oldHunt = elder.missionProgress['jungle-vey'];

  for (const choice of ['maintain', 'adapt']) {
    let state = base;
    const route = choice === 'maintain'
      ? ['place-markers', 'cross-river']
      : ['climb-bank', 'follow-canopy', 'descend-east'];
    const orders = ['land', 'approach', 'compare', choice, ...route, 'return'];
    for (const order of orders) {
      const result = action(elder, state, order);
      assert.ok(result.accepted, result.message);
      assert.equal(result.clanMarksReward, 0);
      state = result.state;
      assert.equal(state.legacy.returnedWorldCompared, order === 'return');
      const loaded = saves.parseSaveImport(saves.exportSave({ ...elder, clanShipOperations: state }));
      assert.equal(loaded.failure, null);
      assert.deepEqual(loaded.save.clanShipOperations.legacy, state.legacy);
      assert.deepEqual(loaded.save.missionProgress['jungle-vey'], oldHunt);
      if (order === choice) {
        assert.equal(action(elder, state, choice === 'maintain' ? 'climb-bank' : 'place-markers').reason, 'oseris-return-order');
        assert.equal(action(elder, state, route[0], 'hangar', state.revision - 1).reason, 'stale-revision');
      }
    }
    assert.deepEqual(state.legacy, { priorCompletions: oldHunt.completions, orders, returnedWorldCompared: true });
    assert.deepEqual(state.completedContracts, base.completedContracts);
    assert.equal(action(elder, state, 'return').reason, 'oseris-return-order');
    const bad = structuredClone({ ...elder, clanShipOperations: state });
    bad.clanShipOperations.legacy.orders[1] = 'return';
    assert.equal(saves.parseSaveImport(JSON.stringify(bad)).failure, 'invalid-save');
    bad.clanShipOperations.legacy = { ...state.legacy, priorCompletions: oldHunt.completions + 1 };
    assert.equal(saves.parseSaveImport(JSON.stringify(bad)).failure, 'invalid-save');
  }
});
