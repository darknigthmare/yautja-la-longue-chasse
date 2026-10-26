import assert from 'node:assert/strict';
import { cargoRouteV108 } from './cargo-v108-route.mjs';

/** A declared browser precondition produced by real source actions and every
 * admitted native motor step. No lot coordinates or progress flags are forged.
 * The optional existing graph lets model tests share their isolated loader. */
export function createBlockedCouncilArrivalV110(owner = '2026-10-26T10:00:00.000Z', existingRoute) {
  const f = existingRoute ?? cargoRouteV108(owner);
  assert.equal(f.owner, owner);
  const navigation = f.qa.load('app/game/systems/homeworldNavigationV109.ts');
  const council = f.world.HOMEWORLD_CONNECTORS_V77.find(row => row.id === 'council-stair');
  f.start(); f.walkTo(f.b.lots[0].stand); f.action('take-wide');
  let { actor, ledger } = structuredClone(f.state()), ticks = 0;
  const target = { x: council.from.point.x, y: council.from.point.y + 60 };
  const route = navigation.homeworldWalkRouteV109('0', actor, target, ledger);
  assert.equal(route.status, 'reachable');
  for (const point of route.points.slice(1)) {
    let budget = 10000;
    while (Math.hypot(point.x - actor.x, point.y - actor.y) > 2 && budget-- > 0) {
      const before = actor;
      const span = Math.max(Math.abs(point.x - actor.x) / 330, Math.abs(point.y - actor.y) / 260, 1 / 60);
      actor = f.api.stepHomeworldCargoActorV108(actor, {
        moveX: (point.x - actor.x) / (330 * span), climb: (point.y - actor.y) / (260 * span), jumpPressed: false,
      }, 1 / 60, '0', ledger);
      const sampled = f.api.sampleCargoWalkV108(ledger, before, actor, 1 / 60, f.context(actor));
      assert.equal(sampled.invalid, false, 'every distance comes from an admitted native motor step');
      assert(Math.hypot(actor.x - before.x, actor.y - before.y) > .0001, 'real motor continues along the verified route');
      ledger = sampled.ledger; ticks++;
    }
    assert(Math.hypot(point.x - actor.x, point.y - actor.y) <= 2);
  }
  f.restore({ actor, ledger }); f.action('interrupt'); f.action('park');
  const result = { ...structuredClone(f.state()), ticks, distance: route.distance, council: structuredClone(council) };
  assert(f.schema.normalizeHomeworldCargoV108(result.ledger));
  return result;
}
