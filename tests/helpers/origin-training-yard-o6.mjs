import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
export const saves = qa.load('app/game/save.ts');
export const homes = qa.load('app/game/systems/residenceV149.ts');
export const regions = qa.load('app/game/systems/homeworldRegionsV68.ts');
export const origins = qa.load('app/game/systems/originsV151.ts');
export const yard = qa.load('app/game/systems/originTrainingYardO6.ts');
export const HOUSE = 'HOME-CM07';
export const REGION = 'luminous-marshes';

export function trainingYardAdmissionO6() {
  const save = saves.defaultSave('2026-11-27T10:30:00.000Z');
  save.profile = { ...save.profile, rankId: 'blooded', acquiredRankIdV166: 'blooded', honor: 2000 };
  save.settings.masterVolume = 0;
  return withResidenceO6(save);
}

export function withResidenceO6(save) {
  save.originV151 = origins.createOriginV151('O6');
  const context = { rankId: save.profile.rankId, atHouseId: HOUSE,
    regionAllowed: id => regions.canEnterHomeworldRegionV68(save, id).allowed };
  let residence = homes.emptyResidenceV149();
  const accept = result => { assert.ok(result.ok, result.reason); residence = result.state; };
  accept(homes.acceptHouseMissionV149(residence, HOUSE, context));
  for (const run of ['threshold', 'residence', 'furnish']) {
    for (const action of ['ward', 'recover', 'report', 'track']) {
      residence = homes.recordResidenceFieldEventV149(residence, { regionId: REGION, runId: run, action }).state;
    }
  }
  accept(homes.chooseHouseRouteV149(residence, HOUSE, 0, context));
  accept(homes.activateFirstResidenceV149(residence, HOUSE, context));
  assert.ok(homes.residenceAccessV149(residence, HOUSE, context).furnish);
  const start = regions.createHomeworldRegionV68(REGION, 'residence-training-yard', true);
  const buildingId = homes.houseBuildingIdV149(homes.houseV149(HOUSE));
  save.homeworldRegionV68 = { ...start, zone: 'interior', buildingId, visitedBuildings: [buildingId],
    actor: { ...start.actor, ...regions.HOMEWORLD_REGION_INTERIOR_V68.entry } };
  save.residenceV149 = residence;
  const loaded = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(loaded.save, loaded.failure);
  return loaded.save;
}
