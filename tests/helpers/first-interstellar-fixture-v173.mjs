import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './homeworld-scene-ssr-v78.mjs';
import { playShipAcquisitionV161 } from './ship-receipt-v161.mjs';

export const qa = homeworldSceneSsrV78();
export const saves = qa.load('app/game/save.ts');
const progression = qa.load('app/game/systems/progression.ts');
const preparation = qa.load('app/game/systems/shipPreparationV88.ts');
const layout = qa.load('app/game/systems/shipLevelLayout.ts');
export const OWNER = '2026-11-22T12:00:00.000Z';
export const SHIP = 'classic-predator-spaceship';

export function firstVoyageAdmissionV173({ prepared = false } = {}) {
  const start = saves.defaultSave(OWNER);
  // Existing adult campaign, following the V161 compatibility path.
  start.profile.honor = 1500;
  start.profile.rankId = 'blooded';
  start.profile.acquiredRankIdV166 = 'blooded';
  let save = playShipAcquisitionV161(qa, start);
  const fleet = progression.createDefaultShipProgression(save, OWNER);
  assert.equal(fleet.selectedShipId, SHIP);
  if (prepared) {
    const context = { save, shipId: SHIP, selectedMissionId: 'R2-M023', fleet, active: true, focused: true, suspended: false };
    const stations = [...layout.SHIP_LEVEL_STATIONS.filter(station => station.id !== 'launch-airlock'),
      layout.SHIP_LEVEL_STATIONS.find(station => station.id === 'launch-airlock')];
    let preflight;
    for (const { id, x, y } of stations) {
      const result = preparation.inspectShipPreparationV88(preflight, { stationId: id, x, y }, context);
      assert.equal(result.accepted, true, result.message);
      preflight = result.state;
    }
    assert.equal(preparation.evaluateShipPreparationV88(preflight, context).ready, true);
    save = { ...save, shipPreparationV88: preflight };
  }
  const normalized = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(normalized.save, normalized.failure);
  return { save: normalized.save, fleet, fleetKey: progression.SHIP_PROGRESSION_STORAGE_KEY };
}
