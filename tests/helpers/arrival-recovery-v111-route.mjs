import assert from 'node:assert/strict';
import {cargoRouteV108} from './cargo-v108-route.mjs';
import {createOccupiedDoorwayV110} from './cargo-doorway-v110-route.mjs';

/** The load and last exterior point are obtained by the unchanged 603-step
 * motor fixture. Only the legacy indoor checkpoint reproduces the old entry
 * bug: authored centre saved instead of the actually free side approach. */
export function createLegacyArrivalRecoveryV111(owner='2026-10-26T10:00:00.000Z'){
  const route=cargoRouteV108(owner),played=createOccupiedDoorwayV110(owner,route);
  const location=route.qa.load('app/game/systems/homeworldLocationV77.ts');
  const interiors=route.qa.load('app/game/systems/homeworldInteriorsV64.ts');
  const room=interiors.homeworldInteriorForBuildingV64(played.building.id);
  assert(room);assert.equal(played.ticks,603);
  const checkpoint=location.createHomeworldCheckpointV77(owner,'0',{...played.actor,...room.spawn},room.buildingId,
    {...played.actor,...played.approach,vx:0,vy:0});
  const restored=location.resolveHomeworldLocationV77(checkpoint,owner);
  assert.equal(restored.restored,true);assert.equal(restored.interiorId,room.buildingId);
  assert.equal(route.api.cargoCaseCollisionV108(played.ledger,checkpoint.exterior),'cargo-lot-narrow-v108');
  assert.equal(route.api.cargoCaseCollisionV108(played.ledger,played.ledger.receipt.last),null);
  return {...played,owner,checkpoint,room,ledgers:{cargoV108:structuredClone(played.ledger)},
    recordedExterior:{...played.ledger.receipt.last},restoredActor:{...restored.actor}};
}
