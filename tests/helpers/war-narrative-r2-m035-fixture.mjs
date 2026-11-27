import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './homeworld-scene-ssr-v78.mjs';
import { playShipAcquisitionV161 } from './ship-receipt-v161.mjs';

export const qa = homeworldSceneSsrV78();
export const saves = qa.load('app/game/save.ts');
export const war = qa.load('app/game/systems/warNarrativeR2M035.ts');
const { MISSIONS } = qa.load('app/game/data.ts');
const ships = qa.load('app/game/systems/shipAcquisitionV89.ts');
const dock = qa.load('app/game/systems/clanShipDocking.ts');
const ops = qa.load('app/game/systems/clanShipOperations.ts');
const projects = qa.load('app/game/systems/clanHullProjectV171.ts');
const owner = '2026-11-27T08:00:00.000Z';
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

