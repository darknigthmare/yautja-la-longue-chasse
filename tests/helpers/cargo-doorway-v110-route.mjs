import assert from 'node:assert/strict';
import {cargoRouteV108} from './cargo-v108-route.mjs';

/** Real source actions place the narrow load at a domestic doorway. Every
 * exterior approach below uses the unchanged native motor and cargo sampler;
 * the final two input legs deliberately use its ordinary full body, rather
 * than claiming the atlas's extra 12-unit route margin can fit this corner. */
export function createOccupiedDoorwayV110(owner = '2026-10-26T10:00:00.000Z', existingRoute) {
  const f = existingRoute ?? cargoRouteV108(owner); assert.equal(f.owner, owner);
  const geometry = f.qa.load('app/game/systems/homeworldGeometryV64.ts');
  const navigation = f.qa.load('app/game/systems/homeworldNavigationV109.ts');
  f.start(); f.placeWide(); f.walkTo(f.b.lots[1].stand); f.action('take-narrow');
  let {actor, ledger} = structuredClone(f.state()), ticks = 0, distance = 0;
  function walkNativeLeg(target) {
    let budget = 10000;
    while (Math.hypot(target.x - actor.x, target.y - actor.y) > .01 && budget-- > 0) {
      const before = actor, span = Math.max(Math.abs(target.x - actor.x) / 330, Math.abs(target.y - actor.y) / 260, 1 / 60);
      actor = f.api.stepHomeworldCargoActorV108(actor, {
        moveX: (target.x - actor.x) / (330 * span), climb: (target.y - actor.y) / (260 * span), jumpPressed: false,
      }, 1 / 60, '0', ledger);
      const sampled = f.api.sampleCargoWalkV108(ledger, before, actor, 1 / 60, f.context(actor));
      assert.equal(sampled.invalid, false); ledger = sampled.ledger;
      const travelled = Math.hypot(actor.x - before.x, actor.y - before.y);
      assert(travelled > .00001, 'actual body continues along this admitted input leg');
      ticks++; distance += travelled;
    }
    assert(Math.hypot(target.x - actor.x, target.y - actor.y) <= .01);
  }
  const building = f.world.HOMEWORLD_BUILDINGS_V77.find(row => row.id === 'residence-port-2');
  const approach = geometry.homeworldBuildingDoorwayV64(building).approach;
  const stand = {x: approach.x, y: approach.y + 60};
  const carriedRoute = navigation.homeworldWalkRouteV109('0', actor, stand, ledger);
  assert.equal(carriedRoute.status, 'reachable');
  for (const point of carriedRoute.points.slice(1)) walkNativeLeg(point);
  f.restore({actor, ledger}); f.action('interrupt'); f.action('park');
  ({actor, ledger} = structuredClone(f.state()));
  assert(f.schema.normalizeHomeworldCargoV108(ledger));
  assert.equal(f.api.cargoCaseCollisionV108(ledger, approach), 'cargo-lot-narrow-v108');
  // Ordinary inputs reach the safe southeast edge of the interaction radius.
  const angle = 50 * Math.PI / 180;
  const entry = {x: approach.x + Math.cos(angle) * 31.5, y: approach.y + Math.sin(angle) * 31.5};
  walkNativeLeg({x: entry.x, y: actor.y}); walkNativeLeg(entry);
  assert.equal(f.api.cargoCaseCollisionV108(ledger, actor), null);
  assert.equal(f.world.nearestHomeworldDoorV77('0', actor)?.id, building.id);
  return {actor, ledger, ticks, distance, building: structuredClone(building), approach: {...approach}, carriedDistance: carriedRoute.distance};
}
