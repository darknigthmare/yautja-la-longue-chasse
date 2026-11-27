import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aboard, fixture, ops, qa, saves } from './helpers/clan-ship-trophy-hearing-fixture.mjs';

const command = qa.load('app/game/systems/warCommandIntroR2M036.ts');
const { DEFAULT_WAR_RULES_V6: original } = qa.load('app/game/systems/clanWarBibleV6.ts');
const rts = qa.load('app/game/systems/clanWarRtsSquadsV133.ts');
const maps = qa.load('app/game/systems/clanWarSourceMapsV128.ts');
const compact = qa.load('app/game/data/warCommandSourceR2M036.json');
const directions = new Set(command.WAR_COMMAND_DIRECTIONS.map(item => item.id));

function saveAtCouncil() {
  return aboard(fixture({ evidence: false, ruins: false }), 'conseil');
}

function act(save, order, roomId = 'conseil', revision = save.clanShipOperations.revision) {
  return ops.actClanShipOperations(save.clanShipOperations, { type: 'war-command-intro', order, expectedRevision: revision },
    { ownerCreatedAt: save.createdAt, campaign: save, docking: { ...save.clanShipDocking, roomId } });
}

function next(save, order) {
  const result = act(save, order);
  assert.ok(result.accepted, order + ': ' + result.message);
  assert.equal(result.clanMarksReward, 0);
  const imported = saves.parseSaveImport(saves.exportSave({ ...save, clanShipOperations: result.state }));
  assert.ok(imported.save, imported.failure);
  return imported.save;
}

const view = save => command.warCommandIntroView(save.clanShipOperations.warCommandIntro);

test('the compact W3 source is identical to the corresponding versioned workbook rows', () => {
  assert.deepEqual(compact.metadata, original.metadata);
  assert.deepEqual(compact.units, original.units);
  assert.equal(compact.entries.length, 3);
  for (const row of compact.entries) {
    assert.deepEqual(row, original.entries.find(item => item.sheet === row.sheet && item.id === row.id));
  }
});

test('R2-M036 requires the active council and the full sequence, with a real survivor withdrawal', () => {
  let save = saveAtCouncil();
  assert.equal(act(save, 'deploy', 'hangar').reason, 'wrong-room');
  assert.equal(act(save, 'cover').reason, 'war-command-intro-order');
  assert.equal(act(save, 'deploy', 'conseil', save.clanShipOperations.revision - 1).reason, 'stale-revision');
  save = next(save, 'deploy');
  const first = view(save);
  const native = rts.launchWarRtsSquadsV133(rts.createWarRtsSquadsV133('W3-RTS01', original));
  assert.ok(native.accepted);
  assert.deepEqual(first.rts, native.state);
  assert.equal(first.rts.squads.length, 3);
  for (const squad of first.rts.squads) {
    assert.ok(squad.unitName);
    assert.equal(squad.status, 'active');
  }
  const withdrawal = next(save, 'retreat');
  assert.equal(view(withdrawal).rts.report.outcome, 'retreat');
  assert.equal(view(withdrawal).rts.report.leftBehindSquadIds.length, 0);
  assert.equal(view(withdrawal).rts.report.downSquadIds.length, 0);
  assert.equal(withdrawal.clanShipOperations.warCommandIntro.rtsIntroductionResolved, false);
  assert.deepEqual(next(withdrawal, 'retry').clanShipOperations.warCommandIntro.orders, ['deploy']);
  assert.equal(act(withdrawal, 'observe').reason, 'war-command-intro-order');
  const forged = structuredClone(withdrawal);
  forged.clanShipOperations.warCommandIntro.rtsIntroductionResolved = true;
  assert.equal(saves.parseSaveImport(JSON.stringify(forged)).failure, 'invalid-save');
});

test('R2-M036 covers, moves, extracts a third squad and plays each alternative on the original W3 tiles', () => {
  const starting = saveAtCouncil();
  let save = next(next(starting, 'deploy'), 'cover');
  assert.equal(view(save).rts.overwatch[0].squadId, view(save).rts.squads[0].id);
  const originalSecond = view(save).rts.squads[1];
  const direction = view(save).options.find(option => directions.has(option.id)).id;
  save = next(save, direction);
  const currentSecond = view(save).rts.squads[1];
  assert.equal(Math.abs(currentSecond.x - originalSecond.x) + Math.abs(currentSecond.y - originalSecond.y), 1);
  save = next(save, 'pull-back');
  assert.equal(view(save).rts.squads[2].status, 'evacuated');
  const goals = [];
  for (const choice of ['resupply', 'detour']) {
    let current = next(save, choice);
    const field = view(current).field;
    assert.equal(field.map.id, 'W3-MAP01');
    const native = maps.createWarMapPracticeV128('W3-MAP01', original);
    assert.deepEqual(field, { ...native, scenarioId: field.scenarioId,
      map: { ...native.map, observation: field.map.observation, goal: field.map.goal } });
    const board = field.map;
    goals.push(board.goal);
    assert.equal(act(current, 'interact').reason, 'war-command-intro-order');
    for (let n = 0; n < 35 && view(current).step === 'field'; n++) {
      const before = view(current).field.player;
      const order = view(current).options.find(option => option.id !== 'retreat').id;
      current = next(current, order);
      const after = view(current).field.player;
      if (directions.has(order)) assert.equal(Math.abs(before.x - after.x) + Math.abs(before.y - after.y), 1);
    }
    assert.equal(view(current).decision, choice);
    assert.equal(view(current).step, 'complete');
    assert.equal(view(current).field.report.outcome, 'victory');
    assert.equal(view(current).rts.report.leftBehindSquadIds.length, 0);
    assert.equal(view(current).field.player.x, board.extraction.x);
    assert.equal(view(current).field.player.y, board.extraction.y);
    assert.equal(current.clanShipOperations.warCommandIntro.rtsIntroductionResolved, true);
    assert.equal(act(current, 'retry').reason, 'war-command-intro-order');
    assert.deepEqual(current.missionProgress, starting.missionProgress);
    assert.deepEqual(current.profile, starting.profile);
  }
  assert.notDeepEqual(goals[0], goals[1]);
});
