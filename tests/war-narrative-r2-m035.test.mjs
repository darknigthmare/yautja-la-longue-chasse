import assert from 'node:assert/strict';
import test from 'node:test';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';
import { playShipAcquisitionV161 } from './helpers/ship-receipt-v161.mjs';

const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const war = qa.load('app/game/systems/warNarrativeR2M035.ts');
const { MISSIONS } = qa.load('app/game/data.ts');
const ships = qa.load('app/game/systems/shipAcquisitionV89.ts');
const dock = qa.load('app/game/systems/clanShipDocking.ts');
const ops = qa.load('app/game/systems/clanShipOperations.ts');
const projects = qa.load('app/game/systems/clanHullProjectV171.ts');
const owner = '2026-11-27T08:00:00.000Z';
const advances = count => Array(count).fill('right');
const approach = ['right', 'right', 'inspect', 'right', 'right'];
const coveredCrossing = ['signal', 'cover', ...advances(4)];

export function narrativeAdmission() {
  const adult = saves.defaultSave(owner);
  adult.profile.honor = 5000;
  adult.profile.rankId = 'elite';
  adult.profile.acquiredRankIdV166 = 'elite';
  let save = playShipAcquisitionV161(qa, adult);
  for (const mission of MISSIONS) {
    save = saves.applyMissionResult(save, {
      missionId: mission.id, difficultyId: 'hunter', outcome: 'success', score: 85, scans: 2, elapsedSeconds: 180,
      completedObjectiveIds: mission.objectives.filter(item => item.required || item.kind === 'extract').map(item => item.id),
      honorEvents: [], trophyQuality: 'elite', secondWindUsed: false, completedAt: '2026-11-27T08:10:00.000Z',
    });
  }
  const receipt = ships.shipAcquisitionOwnedHullV89(save.shipAcquisitionV89, owner);
  const context = { ownerCreatedAt: owner, personalShipId: receipt.shipId };
  const dockOrder = action => {
    const next = dock.actClanShipDocking(save.clanShipDocking, action, context);
    assert.ok(next.accepted, next.message);
    save = { ...save, clanShipDocking: next.state };
  };
  save.clanShipDocking = dock.createClanShipDockingState(owner, receipt.shipId);
  for (const type of ['approach', 'dock', 'board']) dockOrder({ type });
  const visit = roomId => {
    if (save.clanShipDocking.roomId !== roomId) dockOrder({ type: 'move-room', roomId });
  };
  const projectOrder = (action, contact) => {
    const next = projects.commitClanHullProject(save, { expectedRevision: save.clanHullProjectV171?.revision ?? 0, ...action }, contact);
    assert.ok(next.ok, next.message);
    save = { ...save, clanHullProjectV171: next.state };
  };
  projectOrder({ type: 'inspect' });
  projectOrder({ type: 'consult' }, 'threshold-guard');
  visit('conseil');
  projectOrder({ type: 'consult' }, 'star-watch');
  projectOrder({ type: 'pledge', pledge: 'shared-watch' });
  let opsState = ops.createClanShipOperations(owner);
  const opsOrder = action => {
    const next = ops.actClanShipOperations(opsState, { expectedRevision: opsState.revision, ...action },
      { ownerCreatedAt: owner, campaign: save, docking: save.clanShipDocking });
    assert.ok(next.accepted, next.message);
    opsState = next.state;
  };
  for (const step of ops.CLAN_SHIP_ONBOARDING_STEPS) {
    visit(step.roomId);
    opsOrder({ type: 'onboard-step', stepId: step.id });
  }
  visit('conseil');
  opsOrder({ type: 'accept-mandate' });
  save.clanShipOperations = opsState;
  const parsed = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(parsed.save, parsed.failure);
  assert.equal(war.canStartWarNarrativeR2M035(parsed.save), true);
  return parsed.save;
}

const inspect = save => war.inspectWarNarrativeR2M035(save.warNarrativeR2M035, save.createdAt);
const advance = (save, action, expectedRevision = save.warNarrativeR2M035?.orders.length ?? 0) =>
  war.advanceWarNarrativeR2M035(save, { action, expectedRevision });

function run(save, actions, storage) {
  for (const action of actions) {
    const result = advance(save, action);
    assert.ok(result.ok, action + ': ' + result.message);
    const next = { ...save, warNarrativeR2M035: result.state };
    if (storage) {
      const written = saves.writeSaveWithStatus(next, storage);
      assert.ok(written.persisted, action + ': ' + written.failure);
      save = written.save;
    } else {
      save = next;
    }
  }
  return save;
}

function memoryStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
}

test('a campaign at the actual council records ceasefire refusal, covers the wounded scout and returns to a protected site', () => {
  const start = narrativeAdmission();
  assert.equal(war.canStartWarNarrativeR2M035({ ...start, clanShipDocking: null }), false);
  assert.equal(war.canStartWarNarrativeR2M035({ ...start, clanHullProjectV171: null }), false);
  assert.equal(war.canStartWarNarrativeR2M035({ ...start, missionProgress: {} }), false);
  assert.equal(advance(start, 'rescue').ok, false);
  const storage = memoryStorage();
  assert.ok(saves.writeSaveWithStatus(start, storage).persisted);
  let save = run(start, ['diplomacy', 'rescue', ...approach], storage);
  assert.equal(inspect(save).view.scoutHealth, 1);
  assert.equal(advance(save, 'signal').ok, false);
  assert.equal(advance(save, 'stabilize', 0).ok, false);
  save = run(save, ['stabilize', ...coveredCrossing], storage);
  assert.equal(inspect(save).view.scout.x, 8);
  assert.equal(advance(save, 'protect').ok, false);
  assert.equal(advance(save, 'extract').ok, false);
  save = run(save, ['cover', 'protect', ...advances(4), 'extract'], storage);
  assert.equal(advance(save, 'left').ok, false);
  assert.equal(advance(save, 'record').ok, false);
  save = run(save, ['return', ...advances(6), 'record'], storage);
  const reloaded = saves.loadSaveWithStatus(storage).save;
  assert.deepEqual(reloaded.warNarrativeR2M035, save.warNarrativeR2M035);
  assert.equal(inspect(reloaded).view.decision, 'protect');
  assert.equal(inspect(reloaded).view.phase, 'complete');
  assert.equal(inspect(reloaded).view.scoutHealth, 2);
  assert.equal(advance(reloaded, 'retry').ok, false);
  assert.deepEqual(reloaded.profile, start.profile);
});

test('exposure forces a withdrawal and the alternative follows the trail before escorting the same scout', () => {
  const start = narrativeAdmission();
  let save = run(start, ['diplomacy', 'faction', ...approach, 'signal', 'right', 'right']);
  assert.equal(inspect(save).view.phase, 'withdrawn');
  assert.equal(inspect(save).view.scout.x, 4);
  assert.equal(advance(save, 'extract').ok, false);
  save = run(save, ['retry', ...approach, ...coveredCrossing, 'pursue']);
  assert.equal(advance(save, 'track').ok, false);
  save = run(save, ['lane', 'right', 'track', 'cover', ...advances(3)]);
  assert.equal(inspect(save).view.scout.x, 11);
  assert.equal(advance(save, 'extract').ok, false);
  save = run(save, ['wait', 'extract', 'return', ...advances(6), 'record']);
  const reloaded = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(reloaded.save, reloaded.failure);
  assert.equal(inspect(reloaded.save).view.decision, 'pursue');
  assert.equal(inspect(reloaded.save).view.phase, 'complete');
});

test('normal writes protect the journal from skipped, rolled back, foreign and future state', () => {
  const start = narrativeAdmission();
  const storage = memoryStorage();
  assert.ok(saves.writeSaveWithStatus(start, storage).persisted);
  const signalled = run(start, ['diplomacy']);
  const started = run(signalled, ['faction']);
  assert.equal(saves.writeSaveWithStatus(started, storage).failure, 'save-conflict');
  assert.ok(saves.writeSaveWithStatus(signalled, storage).persisted);
  assert.ok(saves.writeSaveWithStatus(started, storage).persisted);
  assert.equal(saves.writeSaveWithStatus(signalled, storage).failure, 'save-conflict');
  for (const [patch, failure] of [
    [{ owner: '2026-11-26T10:00:00.000Z' }, 'invalid-save'],
    [{ version: 2 }, 'future-version'],
    [{ orders: ['diplomacy', 'faction', 'extract'] }, 'invalid-save'],
  ]) {
    const data = { ...started, warNarrativeR2M035: { ...started.warNarrativeR2M035, ...patch } };
    assert.equal(saves.parseSaveImport(JSON.stringify(data)).failure, failure);
  }
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...started, clanHullProjectV171: null })).failure, 'invalid-save');
});
