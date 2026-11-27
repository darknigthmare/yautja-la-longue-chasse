import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ops, saves } from './helpers/clan-ship-trophy-hearing-fixture.mjs';
import { longMemoryAdmission, memory } from './helpers/long-memory-r2-m055.mjs';

function act(save, order, roomId, rev = save.clanShipOperations.revision) {
  return ops.actClanShipOperations(save.clanShipOperations, {
    type: 'long-memory', order, expectedRevision: rev,
  }, { ownerCreatedAt: save.createdAt, campaign: save, docking: { ...save.clanShipDocking, roomId } });
}

for (const choice of memory.MEMORY_TRACKS) {
  test('R2-M055 physically compares three places and transmits ' + choice, () => {
    let save = longMemoryAdmission();
    const before = save;
    const map = memory.MEMORY_ROOMS;
    assert.equal(act({ ...save, elderWorkshopV172: null }, 'begin', 'archives').reason, 'long-memory-access');
    const noSuccession = { ...save, clanShipOperations: { ...save.clanShipOperations } };
    delete noSuccession.clanShipOperations.successorTrial;
    assert.equal(act(noSuccession, 'begin', 'archives').reason, 'long-memory-access');
    assert.equal(act(save, 'begin', 'hangar').reason, 'long-memory-order');
    assert.equal(act(save, 'handover', map[choice]).reason, 'long-memory-order');
    for (const [order, room] of [['begin', 'archives'], ['compare-hunt', map.hunt], ['compare-collective', map.collective],
      ['compare-teaching', map.teaching], ['choose-' + choice, map[choice]], ['prepare', map[choice]], ['handover', map[choice]]]) {
      const wrong = room === 'soins' ? 'conseil' : 'soins';
      assert.equal(act(save, order, wrong).reason, 'long-memory-order');
      assert.equal(act(save, order, room, save.clanShipOperations.revision - 1).reason, 'stale-revision');
      const result = act(save, order, room);
      assert.ok(result.accepted, result.message);
      assert.equal(result.clanMarksReward, 0);
      const loaded = saves.parseSaveImport(saves.exportSave({ ...save, clanShipOperations: result.state }));
      assert.equal(loaded.failure, null);
      save = loaded.save;
      assert.equal(save.clanShipOperations.longMemory.longMemorySuccess, order === 'handover');
    }
    const receipt = memory.longMemoryView(save.clanShipOperations.longMemory.orders);
    assert.equal(receipt.choice, choice);
    assert.deepEqual(receipt.comparisons, memory.MEMORY_TRACKS);
    assert.equal(act(save, 'handover', map[choice]).reason, 'long-memory-order');
    assert.deepEqual(save.missionProgress, before.missionProgress);
    assert.deepEqual(save.elderWorkshopV172, before.elderWorkshopV172);
    assert.deepEqual(save.elderAssemblyV168, before.elderAssemblyV168);
    assert.deepEqual(save.profile, before.profile);
    const garbled = structuredClone(save);
    garbled.clanShipOperations.longMemory.orders[3] = 'compare-hunt';
    assert.equal(saves.parseSaveImport(JSON.stringify(garbled)).failure, 'invalid-save');
    assert.equal(saves.parseSaveImport(JSON.stringify({ ...save, elderWorkshopV172: null })).failure, 'invalid-save');
  });
}
