import test from 'node:test';
import assert from 'node:assert/strict';
import {cargoRouteV108} from './helpers/cargo-v108-route.mjs';

const f = cargoRouteV108('2026-10-29T12:00:00.000Z');
const load = name => f.qa.load('app/game/systems/' + name + '.ts');
const nav = load('homeworldNavigationV109');
const routes = load('homeworldWayfindingV111');
const transit = load('homeworldTransitionsV110');
const lifts = load('homeworldLiftStationV83');
const rooms = load('homeworldInteriorsV64');
const city = load('homeworldCity');
const location = load('homeworldLocationV77');
const saves = f.qa.load('app/game/save.ts');
const council = f.world.HOMEWORLD_CONNECTORS_V77.find(c => c.id === 'council-stair');
const lift = f.world.HOMEWORLD_CONNECTORS_V77.find(c => c.id === 'clan-lift');
const acropolis = f.world.HOMEWORLD_CONNECTORS_V77.find(c => c.id === 'acropolis-stair');
const inputTo = (actor, point) => {
  const span = Math.max(Math.abs(point.x - actor.x) / 330, Math.abs(point.y - actor.y) / 260, 1 / 60);
  return {moveX: (point.x - actor.x) / (330 * span), climb: (point.y - actor.y) / (260 * span), jumpPressed: false};
};
const connectorIds = plan => plan.stages.filter(s => s.kind === 'connector').map(s => s.connectorId);
const originAt = (actor, levelId = '0', interiorId = null) => ({actor, levelId, interiorId});

function saveFor(ledger) {
  const save = saves.defaultSave(f.owner);
  save.homeworld.visitedDistrictIds = ['port', 'council'];
  save.homeworld.cargoV108 = structuredClone(ledger);
  return save;
}

/** Extend the existing source-operation fixture across the actual city. Every
 * carrying step is accepted by both the native motor and the durable sampler. */
function carryWalk(point) {
  let {actor, ledger} = structuredClone(f.state());
  const route = nav.homeworldWalkRouteV109('0', actor, point, ledger);
  assert.equal(route.status, 'reachable', JSON.stringify({actor, point}));
  let ticks = 0, walked = 0;
  for (const waypoint of route.points.slice(1)) {
    while (Math.hypot(waypoint.x - actor.x, waypoint.y - actor.y) > 1 && ticks++ < 12000) {
      const before = actor;
      actor = f.api.stepHomeworldCargoActorV108(actor, inputTo(actor, waypoint), 1 / 60, '0', ledger);
      const sampled = f.api.sampleCargoWalkV108(ledger, before, actor, 1 / 60, f.context(actor));
      assert(!sampled.invalid, 'real carrying movement is durably accepted');
      ledger = sampled.ledger;
      const distance = Math.hypot(actor.x - before.x, actor.y - before.y);
      assert(distance > .000001, 'the unchanged motor reaches the next safe point');
      assert.equal(f.api.cargoCaseCollisionV108(ledger, actor), null);
      walked += distance;
    }
    assert(ticks < 12000, 'bounded native walking');
  }
  f.restore({actor, ledger});
  return {ticks, walked};
}

let played;
function occupiedCouncil() {
  if (!played) {
    f.start(); f.walkTo(f.b.lots[0].stand); f.action('take-wide');
    const movement = carryWalk({x: council.from.point.x, y: council.from.point.y + 60});
    const carried = structuredClone(f.state());
    f.action('interrupt'); f.action('park');
    assert(f.schema.normalizeHomeworldCargoV108(f.state().ledger));
    played = {...movement, carried, parked: structuredClone(f.state())};
  }
  return structuredClone(played);
}

/** Follow the public guide with the shipped exterior/interior motor. Floor
 * changes use real boarding, cabin availability and cargo-aware admission;
 * door changes require native proximity and retain the actual entrance. */
function follow(save, origin, destinationId, station = lifts.createHomeworldLiftStationV83(f.owner)) {
  const beforePlan = JSON.stringify(save);
  const started = performance.now();
  const plan = routes.homeworldRoutePlanV111(save, origin, destinationId);
  const planMs = performance.now() - started;
  assert.equal(JSON.stringify(save), beforePlan, 'planning does not mutate the save');
  assert.equal(plan.status, 'reachable', plan.reason);
  const cargoBefore = JSON.stringify(save.homeworld.cargoV108);
  let actor = structuredClone(origin.actor), levelId = origin.levelId, interiorId = origin.interiorId;
  let exterior = save.homeworld.locationV77?.exterior;
  let ticks = 0, walked = 0, rideTicks = 0;
  const arrivals = [];
  for (const stage of plan.stages) {
    assert.equal(levelId, stage.levelId); assert.equal(interiorId, stage.interiorId);
    while (ticks++ < 15000) {
      const guide = routes.homeworldRouteGuidanceV111(plan, originAt(actor, levelId, interiorId), save);
      assert(guide); assert.notEqual(guide.state, 'off-route', JSON.stringify({actor, stage}));
      assert.equal(guide.stage, stage, 'the guide selects the current physical stage');
      if (guide.state === 'arrived') break;
      assert(guide.waypoint);
      const before = actor, room = interiorId && rooms.homeworldInteriorForBuildingV64(interiorId);
      actor = room
        ? city.stepHomeworldActorOnFloor(actor, inputTo(actor, guide.waypoint), 1 / 60,
          p => rooms.isHomeworldInteriorWalkableV64(room, p), () => assert.fail('no interior recovery teleport'))
        : f.api.stepHomeworldCargoActorV108(actor, inputTo(actor, guide.waypoint), 1 / 60, levelId, save.homeworld.cargoV108);
      const distance = Math.hypot(actor.x - before.x, actor.y - before.y);
      assert(distance > .000001 && distance < 7, 'a guide step is an ordinary native movement');
      if (!room) assert(transit.homeworldExteriorArrivalAllowedV110(levelId, actor, save.homeworld.cargoV108, save.createdAt));
      walked += distance;
    }
    assert(ticks < 15000, 'bounded guided walking');
    if (stage.kind === 'connector') {
      const near = f.world.nearestHomeworldConnectorV77(levelId, actor);
      assert.equal(near?.connector.id, stage.connectorId, 'the suggested action is actually in reach');
      const {connector, reverse} = near, end = reverse ? connector.from : connector.to;
      assert(transit.homeworldExteriorArrivalAllowedV110(end.levelId, end.point, save.homeworld.cargoV108, save.createdAt));
      if (connector.kind === 'lift' && !lifts.homeworldLiftAtSocketV83(station, connector.id, reverse)) {
        assert.equal(f.world.beginHomeworldTransitV77(levelId, actor, false), null);
        station = lifts.callHomeworldLiftV83(station, connector, reverse);
        let calls = 0;
        while (station.journey && calls++ < 100) station = lifts.stepHomeworldLiftCallV83(station, .1).state;
        assert(calls < 100);
      }
      const ready = connector.kind !== 'lift' || lifts.homeworldLiftAtSocketV83(station, connector.id, reverse);
      let ride = f.world.beginHomeworldTransitV77(levelId, actor, ready);
      assert(ride);
      for (let n = 0; ride && n < 200; n++) {
        const moving = transit.stepHomeworldTransitV110(ride, actor, .1, save.homeworld.cargoV108, false, save.createdAt);
        assert(!moving.error, moving.error);
        if (connector.kind === 'lift') station = lifts.homeworldLiftPassengerV83(station, moving.transit ?? ride, connector, moving.done);
        actor = moving.actor; levelId = moving.levelId; ride = moving.transit; rideTicks++;
        if (!ride) assert(moving.done, 'the real arrival admits the full body');
      }
      assert.equal(ride, null); assert.equal(levelId, stage.nextLevelId);
      arrivals.push({connectorId: connector.id, levelId, point: {x: actor.x, y: actor.y}});
    } else if (stage.kind === 'enter') {
      const building = f.world.nearestHomeworldDoorV77(levelId, actor);
      assert(building, 'native doorway proximity admits the planned entry');
      const room = rooms.homeworldInteriorForBuildingV64(building.id);
      assert(room); assert(rooms.isHomeworldInteriorWalkableV64(room, room.spawn));
      exterior = {...actor, vx: 0, vy: 0};
      actor = {...actor, ...room.spawn, vx: 0, vy: 0, facing: 1}; interiorId = room.buildingId;
      save.homeworld.locationV77 = location.createHomeworldCheckpointV77(save.createdAt, levelId, actor, interiorId, exterior);
    } else if (stage.kind === 'exit') {
      const room = rooms.homeworldInteriorForBuildingV64(interiorId);
      assert.equal(rooms.nearestHomeworldInteriorTargetV64(room, actor)?.kind, 'exit');
      actor = transit.homeworldInteriorExitV110(levelId, exterior, save.homeworld.cargoV108, save.createdAt);
      assert(actor); interiorId = null;
      save.homeworld.locationV77 = location.createHomeworldCheckpointV77(save.createdAt, levelId, actor, null, actor);
    }
  }
  assert.equal(JSON.stringify(save.homeworld.cargoV108), cargoBefore, 'guidance and travel grant no cargo progress');
  return {plan, origin: originAt(actor, levelId, interiorId), station, arrivals, ticks, walked, rideTicks, planMs};
}

test('V113 connector obstruction comes from an actual 1,421-step carry and park, with no invented placement', () => {
  const fixture = occupiedCouncil();
  assert.equal(fixture.ticks, 1421); assert(fixture.walked > 7100);
  assert.equal(fixture.parked.ledger.receipt.carrier, null);
  assert.equal(fixture.parked.ledger.receipt.phase, 'interrupted');
  assert.equal(f.api.cargoCaseCollisionV108(fixture.parked.ledger, council.from.point), 'cargo-lot-wide-v108');
  assert.equal(transit.homeworldExteriorArrivalAllowedV110('0', council.from.point, fixture.parked.ledger, f.owner), false);
  assert(transit.homeworldExteriorArrivalAllowedV110('+1', council.to.point, fixture.parked.ledger, f.owner));
  assert.equal(nav.homeworldWalkRouteV109('0', fixture.parked.actor, lift.from.point, fixture.parked.ledger).status, 'reachable');
  assert.equal(nav.homeworldWalkRouteV109('+1', lift.to.point, acropolis.from.point, fixture.parked.ledger).status, 'reachable');
});

test('V113 a carried load preserves the direct Council/acropolis chain and never becomes a ground obstruction', () => {
  const {carried} = occupiedCouncil(), save = saveFor(carried.ledger), bytes = JSON.stringify(save);
  assert.equal(f.api.cargoCaseCollisionV108(carried.ledger, council.from.point), null);
  const plan = routes.homeworldRoutePlanV111(save, originAt(carried.actor), 'point:audience-point');
  assert.equal(plan.status, 'reachable', plan.reason);
  assert.deepEqual(connectorIds(plan), ['council-stair', 'acropolis-stair']);
  assert.equal(JSON.stringify(save), bytes);
});

test('V113 a blocked departure takes the lift, reaches the real audience, and returns through an unoccupied landing', t => {
  const {parked} = occupiedCouncil(), save = saveFor(parked.ledger);
  const outward = follow(save, originAt(parked.actor), 'point:audience-point');
  assert.deepEqual(connectorIds(outward.plan), ['clan-lift', 'acropolis-stair']);
  assert.equal(outward.origin.levelId, '+2');
  const room = rooms.homeworldInteriorForBuildingV64(outward.origin.interiorId);
  assert.equal(rooms.nearestHomeworldInteriorTargetV64(room, outward.origin.actor)?.pointId, 'audience-point');
  assert(outward.walked > 3000); assert(outward.rideTicks > 160);
  const returned = follow(save, outward.origin, f.b.npcId, outward.station);
  assert.deepEqual(connectorIds(returned.plan), ['acropolis-stair', 'clan-lift']);
  assert.deepEqual(returned.arrivals.at(-1), {connectorId: 'clan-lift', levelId: '0', point: lift.from.point});
  assert.equal(returned.origin.interiorId, null); assert.equal(returned.origin.levelId, '0');
  assert(f.api.cargoPostReachedV108(f.context(returned.origin.actor), save.homeworld.cargoV108), 'the actual steward interaction is available on return');
  t.diagnostic(JSON.stringify({outward: {planMs: outward.planMs, ticks: outward.ticks, walked: outward.walked, rideTicks: outward.rideTicks},
    returned: {planMs: returned.planMs, ticks: returned.ticks, walked: returned.walked, rideTicks: returned.rideTicks}}));
});

test('V113 a free departure cannot select the Council stair when its ground arrival is occupied', () => {
  const {parked} = occupiedCouncil(), save = saveFor(parked.ledger), bytes = JSON.stringify(save);
  const plan = routes.homeworldRoutePlanV111(save, originAt({...parked.actor, ...council.to.point}, '+1'), f.b.npcId);
  assert.equal(plan.status, 'reachable', plan.reason);
  assert.deepEqual(connectorIds(plan), ['clan-lift']);
  assert.equal(JSON.stringify(save), bytes);
});

test('V113 the guide reaches a nearby safe corner when every farther candidate cuts the turn', () => {
  const {parked} = occupiedCouncil(), save = saveFor(parked.ledger);
  const plan = routes.homeworldRoutePlanV111(save, originAt(parked.actor), 'point:audience-point');
  assert.equal(plan.status, 'reachable');
  const corner = plan.stages[0].points.find(p => p.x === 3936 && p.y === 2784);
  assert(corner);
  let actor = parked.actor, ticks = 0;
  while (Math.hypot(actor.x - corner.x, actor.y - corner.y) > 2 && ticks++ < 300) {
    const guide = routes.homeworldRouteGuidanceV111(plan, originAt(actor), save);
    assert.equal(guide.state, 'walking');
    actor = f.api.stepHomeworldCargoActorV108(actor, inputTo(actor, guide.waypoint), 1 / 60, '0', save.homeworld.cargoV108);
  }
  assert(ticks < 300);
  assert(Math.hypot(actor.x - corner.x, actor.y - corner.y) > .001);
  assert(nav.homeworldRouteSegmentV109('0', actor, corner, save.homeworld.cargoV108));
  assert.equal(nav.homeworldRouteSegmentV109('0', actor, {x: corner.x - 160, y: corner.y}, save.homeworld.cargoV108), false);
  const guide = routes.homeworldRouteGuidanceV111(plan, originAt(actor), save);
  assert.equal(guide.state, 'walking', 'the real guide must retain the safe near turn');
  assert.deepEqual(guide.waypoint, corner);
  actor = f.api.stepHomeworldCargoActorV108(actor, inputTo(actor, guide.waypoint), 1 / 60, '0', save.homeworld.cargoV108);
  assert(Math.hypot(actor.x - corner.x, actor.y - corner.y) <= .001);
  const after = routes.homeworldRouteGuidanceV111(plan, originAt(actor), save);
  assert.equal(after.state, 'walking');
  assert(Math.hypot(after.waypoint.x - actor.x, after.waypoint.y - actor.y) > 5, 'reaching the corner advances the guide instead of yielding a zero-length step');
});

test('V113 the guide rejoins the nearby path after an earlier safe shortcut leaves its long lookahead blocked', () => {
  const {parked} = occupiedCouncil(), save = saveFor(parked.ledger);
  const plan = routes.homeworldRoutePlanV111(save, originAt(parked.actor), 'point:audience-point');
  assert.equal(plan.status, 'reachable');
  // This is the native position reached by the full guided round trip before
  // the fix, on the last upper-gallery segment toward the acropolis stair.
  let actor = {...parked.actor, x: 4724.029483815849, y: 2043.1140216627434, vx: 291.2757076706839, vy: 122.20622799753073, facing: 1};
  const projection = {x: 4730.851393174625, y: 2030.3410849909928};
  assert(nav.homeworldRouteSegmentV109('+1', actor, projection, save.homeworld.cargoV108));
  assert.equal(nav.homeworldRouteSegmentV109('+1', actor, {x: 4871.983444113704, y: 2105.71843037891}, save.homeworld.cargoV108), false);
  let ticks = 0, next;
  for (; ticks < 10; ticks++) {
    const guide = routes.homeworldRouteGuidanceV111(plan, originAt(actor, '+1'), save);
    assert.equal(guide.state, 'walking', 'the guide retains a verified local return to its path');
    if (Math.hypot(guide.waypoint.x - projection.x, guide.waypoint.y - projection.y) >= .001) { next = guide; break; }
    const before = Math.hypot(actor.x - projection.x, actor.y - projection.y);
    actor = f.api.stepHomeworldCargoActorV108(actor, inputTo(actor, guide.waypoint), 1 / 60, '+1', save.homeworld.cargoV108);
    assert(Math.hypot(actor.x - projection.x, actor.y - projection.y) < before);
  }
  assert(ticks > 0 && ticks < 10, 'an actual local step restores forward guidance without oscillation');
  assert(next);
  assert.equal(next.state, 'walking');
  assert(next.waypoint.x > actor.x);
  assert(Math.hypot(next.waypoint.x - actor.x, next.waypoint.y - actor.y) > 5);
  assert(nav.homeworldRouteSegmentV109('+1', actor, next.waypoint, save.homeworld.cargoV108));
});
