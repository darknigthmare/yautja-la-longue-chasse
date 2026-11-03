import test from 'node:test';
import assert from 'node:assert/strict';
import { cargoRouteV108 } from './helpers/cargo-v108-route.mjs';
import { createBlockedCouncilArrivalV110 } from './helpers/cargo-council-v110-route.mjs';

const f = cargoRouteV108('2026-10-26T10:00:00.000Z');
const transitions = f.qa.load('app/game/systems/homeworldTransitionsV110.ts');
const geometry = f.qa.load('app/game/systems/homeworldGeometryV64.ts');
const council = f.world.HOMEWORLD_CONNECTORS_V77.find(row => row.id === 'council-stair');
let playedPark;

function parkedByActualWalking() {
  if (playedPark) return structuredClone(playedPark);
  playedPark = createBlockedCouncilArrivalV110(f.owner, f);
  return structuredClone(playedPark);
}

/** These other placements are declared geometry fixtures, not played journeys
 * or source progress. Keep the real operation's owner and strict save shape. */
function geometryFixture(positions) {
  const { ledger } = parkedByActualWalking();
  for (const [index, point] of positions.entries()) Object.assign(ledger.receipt.lots[index], { x: point.x, y: point.y, place: 'ground' });
  assert(f.schema.normalizeHomeworldCargoV108(ledger), 'controlled geometry retains a valid operation shape');
  return ledger;
}

function travel(step, connector, reverse, cargo) {
  const side = reverse ? connector.to : connector.from;
  let actor = { ...f.world.createHomeworldWorldActorV77(), ...side.point };
  let transit = f.world.beginHomeworldTransitV77(side.levelId, actor, true), result;
  assert(transit);
  for (let n = 0; transit && n < 1000; n++) {
    result = step(transit, actor, 1 / 30, cargo);
    actor = result.actor; transit = result.transit;
  }
  assert.equal(transit, null, 'the bounded journey terminates');
  return result;
}

test('V110: real 1418-step cargo placement no longer traps a hunter descending the council stair', () => {
  const { ledger, ticks, distance } = parkedByActualWalking(), before = JSON.stringify(ledger);
  assert.equal(ticks, 1418); assert(distance > 7100);
  assert.equal(f.api.cargoCaseCollisionV108(ledger, council.from.point), 'cargo-lot-wide-v108');
  const old = travel((transit, actor, seconds) => f.world.stepHomeworldTransitV77(transit, actor, seconds), council, true);
  assert.equal(old.done, true, 'historical API reproduces the original completed arrival');
  for (const [moveX, climb] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
    const stuck = f.api.stepHomeworldCargoActorV108(old.actor, { moveX, climb, jumpPressed: false }, 1 / 30, '0', ledger);
    assert.equal(Math.hypot(stuck.x - old.actor.x, stuck.y - old.actor.y), 0);
  }
  const result = travel(transitions.stepHomeworldTransitV110, council, true, ledger);
  assert.equal(result.done, false); assert.equal(result.levelId, '+1'); assert.match(result.error, /charge/);
  assert.deepEqual({ x: result.actor.x, y: result.actor.y }, council.to.point);
  assert.equal(result.elevation, f.world.homeworldLevelV77('+1').elevation);
  assert(transitions.homeworldExteriorArrivalAllowedV110(result.levelId, result.actor, ledger));
  const walking = f.api.stepHomeworldCargoActorV108(result.actor, { moveX: 1, climb: 0, jumpPressed: false }, 1 / 30, '+1', ledger);
  assert(Math.hypot(walking.x - result.actor.x, walking.y - result.actor.y) > 0, 'the retained departure allows ordinary egress');
  assert.equal(JSON.stringify(ledger), before, 'refusal never relocates a load, rewrites an owner or credits an operation');
});

test('V110: every unchanged connector journey has frame-by-frame no-cargo parity', () => {
  for (const connector of f.world.HOMEWORLD_CONNECTORS_V77) for (const reverse of [false, true]) {
    const side = reverse ? connector.to : connector.from;
    let actor = { ...f.world.createHomeworldWorldActorV77(), ...side.point };
    let transit = f.world.beginHomeworldTransitV77(side.levelId, actor, true);
    for (let n = 0; transit && n < 1000; n++) {
      const old = f.world.stepHomeworldTransitV77(transit, actor, 1 / 30);
      const next = transitions.stepHomeworldTransitV110(transit, actor, 1 / 30);
      assert.deepEqual(next, old, connector.id + ':' + reverse + ':' + n);
      actor = next.actor; transit = next.transit;
    }
    assert.equal(transit, null);
  }
});

test('V110: last-frame admission reads the latest placements and does not reuse a stale clear result', () => {
  const { ledger } = parkedByActualWalking(), side = council.to;
  const actor = { ...f.world.createHomeworldWorldActorV77(), ...side.point };
  const start = f.world.beginHomeworldTransitV77(side.levelId, actor, true);
  const final = { ...start, elapsed: council.duration - 1 / 60 };
  const before = JSON.stringify({ ledger, actor, final });
  assert.equal(transitions.stepHomeworldTransitV110(final, actor, 1 / 30).done, true);
  assert.equal(transitions.stepHomeworldTransitV110(final, actor, 1 / 30, ledger).done, false);
  const moved = structuredClone(ledger); moved.receipt.lots[0].x += 200;
  assert(f.schema.normalizeHomeworldCargoV108(moved));
  assert.equal(transitions.stepHomeworldTransitV110(final, actor, 1 / 30, moved).done, true);
  assert.equal(JSON.stringify({ ledger, actor, final }), before);
});

test('V110: paused and non-advancing transitions keep their exact previous objects even above an occupied arrival', () => {
  const { ledger } = parkedByActualWalking();
  const actor = { ...f.world.createHomeworldWorldActorV77(), ...council.to.point };
  const transit = { ...f.world.beginHomeworldTransitV77('+1', actor, true), elapsed: council.duration - 1 / 60 };
  for (const [seconds, suspended] of [[1 / 30, true], [0, false], [-1, false], [NaN, false], [Infinity, false]]) {
    const old = f.world.stepHomeworldTransitV77(transit, actor, seconds, suspended);
    const result = transitions.stepHomeworldTransitV110(transit, actor, seconds, ledger, suspended);
    assert.deepEqual(result, old); assert.equal(result.actor, actor); assert.equal(result.transit, transit);
  }
});

test('V110: arrival admission uses the full current body, genuine static solids and the actual floor', () => {
  const { ledger } = parkedByActualWalking(), lot = ledger.receipt.lots[0];
  assert.equal(transitions.homeworldExteriorArrivalAllowedV110('0', lot, ledger), false, 'full overlap refuses admission');
  const edge = { x: lot.x + 35, y: lot.y };
  assert(f.api.cargoCaseCollisionV108(ledger, edge), 'a body edge still touches the real load footprint');
  assert.equal(transitions.homeworldExteriorArrivalAllowedV110('0', edge, ledger), false);
  assert.equal(transitions.homeworldExteriorArrivalAllowedV110('+1', council.to.point, ledger), true, 'same XY on another floor stays independent');
  assert.equal(transitions.homeworldExteriorArrivalAllowedV110('0', { x: NaN, y: 2900 }, ledger), false);
  assert.equal(transitions.homeworldExteriorArrivalAllowedV110('0', { x: 0, y: 0 }, ledger), false);
});

test('V110: all ordinary regional returns preserve the original authored arrival', () => {
  for (const point of f.world.HOMEWORLD_POINTS_V77.filter(row => row.regionId)) {
    assert.deepEqual(transitions.homeworldWorldArrivalV110(point.regionId), f.world.homeworldWorldArrivalV77(point.regionId), point.regionId);
  }
  assert.equal(transitions.homeworldWorldArrivalV110('unknown-region'), null);
});

test('V110: regional return skips occupied public approaches and refuses when all authored sockets are blocked', () => {
  const region = f.world.HOMEWORLD_POINTS_V77.find(row => row.regionId === 'ash-marches');
  const first = f.world.homeworldWorldArrivalV77(region.regionId);
  const one = geometryFixture([{ x: first.actor.x, y: first.actor.y }]), before = JSON.stringify(one);
  const result = transitions.homeworldWorldArrivalV110(region.regionId, one);
  assert(result); assert.equal(result.levelId, first.levelId);
  assert.notEqual(result.actor.y, first.actor.y); assert([100, 140].includes(result.actor.y - region.y));
  assert(transitions.homeworldExteriorArrivalAllowedV110(result.levelId, result.actor, one));
  const egress = f.api.stepHomeworldCargoActorV108(result.actor, { moveX: 1, climb: 0, jumpPressed: false }, 1 / 30, result.levelId, one);
  assert(Math.hypot(egress.x - result.actor.x, egress.y - result.actor.y) > 0);
  assert.equal(JSON.stringify(one), before);
  const both = geometryFixture([{ x: region.x, y: region.y + 85 }, { x: region.x, y: region.y + 140 }]);
  for (const distance of [70, 100, 140]) assert(f.api.cargoCaseCollisionV108(both, { x: region.x, y: region.y + distance }));
  const blockedBefore = JSON.stringify(both);
  assert.equal(transitions.homeworldWorldArrivalV110(region.regionId, both), null, 'no unverified side socket is invented');
  assert.equal(JSON.stringify(both), blockedBefore);
});

test('V110: interior exits retain every exact doorway and refuse a newly occupied anchor without changing it', () => {
  for (const building of f.world.HOMEWORLD_BUILDINGS_V77) {
    const anchor = { ...f.world.createHomeworldWorldActorV77(), ...geometry.homeworldBuildingDoorwayV64(building).approach, vx: 17, vy: -9 };
    const before = structuredClone(anchor), next = transitions.homeworldInteriorExitV110(building.levelId, anchor);
    assert.deepEqual(next, { ...anchor, vx: 0, vy: 0 }, building.id); assert.deepEqual(anchor, before);
  }
  const building = f.world.HOMEWORLD_BUILDINGS_V77.find(row => row.id === 'dock-control');
  const anchor = { ...f.world.createHomeworldWorldActorV77(), ...geometry.homeworldBuildingDoorwayV64(building).approach };
  const ledger = geometryFixture([anchor]), before = JSON.stringify({ anchor, ledger });
  assert.equal(transitions.homeworldInteriorExitV110(building.levelId, anchor, ledger), null);
  assert.equal(JSON.stringify({ anchor, ledger }), before);
});

test('V110: malformed, future or foreign cargo cannot be ignored to admit an exterior arrival', () => {
  const { ledger } = parkedByActualWalking(), connector = f.world.HOMEWORLD_CONNECTORS_V77.find(row => row.id === 'clan-lift');
  const actor = { ...f.world.createHomeworldWorldActorV77(), ...connector.from.point };
  const transit = { ...f.world.beginHomeworldTransitV77('0', actor, true), elapsed: connector.duration - 1 / 60 };
  const foreign = structuredClone(ledger); foreign.ownerCreatedAt = '2026-10-25T10:00:00.000Z';
  assert(f.schema.normalizeHomeworldCargoV108(foreign));
  const malformed = { ...ledger, revision: -1 }, future = { ...ledger, version: 2 };
  const safe = f.world.createHomeworldWorldActorV77();
  for (const cargo of [malformed, future, foreign]) {
    const before = JSON.stringify(cargo);
    assert.equal(transitions.homeworldExteriorArrivalAllowedV110('0', safe, cargo, f.owner), false);
    assert.equal(transitions.homeworldWorldArrivalV110('ash-marches', cargo, f.owner), null);
    assert.equal(transitions.homeworldInteriorExitV110('0', safe, cargo, f.owner), null);
    const result = transitions.stepHomeworldTransitV110(transit, actor, 1 / 30, cargo, false, f.owner);
    assert.equal(result.done, false, 'a different floor does not authorize a foreign operation');
    assert.deepEqual({ x: result.actor.x, y: result.actor.y }, transit.source);
    assert.equal(JSON.stringify(cargo), before);
  }
  assert(transitions.homeworldExteriorArrivalAllowedV110('0', safe, ledger, f.owner));
  assert.equal(transitions.stepHomeworldTransitV110(transit, actor, 1 / 30, ledger, false, f.owner).done, true);
});
