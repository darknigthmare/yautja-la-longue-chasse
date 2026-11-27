import assert from 'node:assert/strict';
import { elderWorkshopAdmissionV172 } from './elder-workshop-fixture-v172.mjs';
import { docking, ops, qa, saves } from './clan-ship-trophy-hearing-fixture.mjs';

const workshop = qa.load('app/game/systems/elderWorkshopV172.ts');
export const succession = qa.load('app/game/systems/successorTrialR2M054.ts');
export const memory = qa.load('app/game/systems/longMemoryR2M055.ts');

export function longMemoryAdmission() {
  let save = elderWorkshopAdmissionV172();
  for (const action of ['observe', 'inspect', 'repair', 'align', 'align', 'align', 'fit', 'handover']) {
    const result = workshop.commitElderWorkshopV172(save, { action, expectedRevision: save.elderWorkshopV172?.history.length ?? 0 });
    assert.ok(result.ok, result.message);
    save = { ...save, elderWorkshopV172: result.state };
  }
  const next = docking.actClanShipDocking(save.clanShipDocking, { type: 'move-room', roomId: 'hangar' }, {
    ownerCreatedAt: save.createdAt, personalShipId: save.clanShipDocking.personalShipId,
  });
  assert.ok(next.accepted, next.message);
  save = { ...save, clanShipDocking: next.state, settings: { ...save.settings, masterVolume: 0 } };
  function commit(action) {
    const result = ops.actClanShipOperations(save.clanShipOperations, {
      ...action, expectedRevision: save.clanShipOperations.revision,
    }, { ownerCreatedAt: save.createdAt, campaign: save, docking: save.clanShipDocking });
    assert.ok(result.accepted, result.message);
    save = { ...save, clanShipOperations: result.state };
  }
  for (const order of ['land', 'approach', 'compare', 'maintain', 'place-markers', 'cross-river', 'return']) {
    commit({ type: 'oseris-return', order });
  }
  const plan = succession.successorTrialPlan(save, save.clanShipOperations.legacy);
  assert.ok(plan);
  for (const order of ['deploy', 'observe-posts', 'delegate', 'observe-approach', 'intervene', 'observe-extraction', 'report']) {
    const view = succession.successorTrialView(plan, save.clanShipOperations.successorTrial?.orders ?? []);
    commit({ type: 'successor-trial', order, position: view.options.find(option => option.id === order).point });
  }
  const parsed = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(parsed.save, parsed.failure);
  assert.ok(memory.longMemoryEvidence(parsed.save.createdAt, parsed.save.elderWorkshopV172,
    parsed.save.clanShipOperations.legacy, parsed.save.clanShipOperations.successorTrial));
  return parsed.save;
}

export function completeLongMemoryAdmission() {
  let save = longMemoryAdmission();
  const path = [
    ['begin', 'archives'], ['compare-hunt', 'hangar'], ['compare-collective', 'armurerie'],
    ['compare-teaching', 'archives'], ['choose-collective', 'armurerie'],
    ['prepare', 'armurerie'], ['handover', 'armurerie'],
  ];
  for (const [order, roomId] of path) {
    if (save.clanShipDocking.roomId !== roomId) {
      const moved = docking.actClanShipDocking(save.clanShipDocking, { type: 'move-room', roomId }, {
        ownerCreatedAt: save.createdAt, personalShipId: save.clanShipDocking.personalShipId,
      });
      assert.ok(moved.accepted, moved.message);
      save = { ...save, clanShipDocking: moved.state };
    }
    const result = ops.actClanShipOperations(save.clanShipOperations, {
      type: 'long-memory', order, expectedRevision: save.clanShipOperations.revision,
    }, { ownerCreatedAt: save.createdAt, campaign: save, docking: save.clanShipDocking });
    assert.ok(result.accepted, result.message);
    save = { ...save, clanShipOperations: result.state };
  }
  return save;
}
