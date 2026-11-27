import assert from 'node:assert/strict';
import { qa } from './elite-recognition-played-v175.mjs';
import { playedElite, walkO6 } from './origin-continuation-o6.mjs';
import { REGION, origins, regions, saves } from './origin-training-yard-o6.mjs';

const geometry = qa.load('app/game/systems/homeworldGeometryV64.ts');
export const returnRules = qa.load('app/game/systems/originSoloReturnO6.ts');
export { regions, saves, walkO6 };

export function soloReturnAdmissionO6() {
  const save = playedElite();
  save.originV151 = origins.createOriginV151('O6');
  const village = regions.createHomeworldRegionV68(REGION, 'solo-return-o6', true);
  const hall = regions.HOMEWORLD_REGIONS_V68[REGION].buildings.find(building => building.id === 'hall');
  const door = geometry.homeworldBuildingDoorwayV64(hall).approach;
  save.homeworldRegionV68 = { ...village, actor: { ...village.actor, ...door } };
  const action = regions.homeworldRegionInteractionV68(save.homeworldRegionV68);
  assert.equal(action?.kind, 'door');
  assert.equal(action.id, 'hall');
  const parsed = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(parsed.save, parsed.failure);
  return parsed.save;
}

export function enterHallO6(save) {
  const region = regions.stepHomeworldRegionV68(save.homeworldRegionV68, { interact: true });
  assert.equal(region.zone, 'interior');
  assert.equal(region.buildingId, 'hall');
  return { ...save, homeworldRegionV68: region };
}
