import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const current = qa.load('app/game/systems/homeworldWayfindingV112.ts');
const old = qa.load('app/game/systems/homeworldWayfindingV111.ts');
const rooms = qa.load('app/game/systems/homeworldInteriorsV64.ts');
const atlas = qa.load('app/game/systems/homeworldObjectivesV111.ts');
const motor = qa.load('app/game/systems/homeworldCity.ts');
const save = qa.load('app/game/save.ts').defaultSave('2026-10-28T10:00:00.000Z');
save.homeworld.visitedDistrictIds = ['port', 'market', 'forges', 'memory', 'terraces', 'temple', 'enforcers', 'citadel', 'undercity'];
const inside = atlas.homeworldAtlasLandmarksV111(save).filter(target => target.pointId && target.buildingId && target.access !== 'locked');
const originFor = target => ({actor: rooms.homeworldInteriorForBuildingV64(target.buildingId).spawn, levelId: target.levelId, interiorId: target.buildingId});

test('V112 reproduces the premature officer arrival and continues toward the actual interaction range', () => {
  const origin = {actor: {x: 173, y: 164}, levelId: '0', interiorId: 'dock-control'};
  const target = inside.find(target => target.pointId === 'dock-officer-point');
  const plan = current.homeworldRoutePlanV112(save, originFor(target), target.id);
  const before = JSON.stringify({save, plan});
  assert.equal(old.homeworldRouteGuidanceV111(plan, origin, save).state, 'arrived');
  assert.equal(rooms.nearestHomeworldInteriorTargetV64(rooms.homeworldInteriorForBuildingV64(origin.interiorId), origin.actor), null);
  const guide = current.homeworldRouteGuidanceV112(plan, origin, save);
  assert.equal(guide.state, 'walking');
  assert(guide.waypoint.x < origin.actor.x);
  assert.equal(JSON.stringify({save, plan}), before, 'guidance neither changes the plan nor the campaign');
});

test('V112 interior arrivals match the real requested target for every service and audience, including the former 24-unit halo', () => {
  let formerFalseArrivals = 0, inspected = 0;
  for (const target of inside) {
    const origin = originFor(target), room = rooms.homeworldInteriorForBuildingV64(target.buildingId);
    const plan = current.homeworldRoutePlanV112(save, origin, target.id);
    assert.equal(plan.status, 'reachable', target.id);
    const stage = plan.stages.at(-1), end = stage.points.at(-1), previous = stage.points.at(-2) ?? end;
    const length = Math.hypot(end.x - previous.x, end.y - previous.y);
    for (const before of [24, 22, 20, 16, 10, 0]) {
      const ratio = length ? Math.min(before, length) / length : 0;
      const actor = {x: end.x + (previous.x - end.x) * ratio, y: end.y + (previous.y - end.y) * ratio};
      const actual = rooms.nearestHomeworldInteriorTargetV64(room, actor);
      const oldGuide = old.homeworldRouteGuidanceV111(plan, {...origin, actor}, save);
      const guide = current.homeworldRouteGuidanceV112(plan, {...origin, actor}, save);
      if (oldGuide?.state === 'arrived' && actual?.pointId !== target.pointId) formerFalseArrivals++;
      if (guide?.state === 'arrived') assert.equal(actual?.pointId, target.pointId, target.id + ' actual interaction available');
      if (before === 0) assert.equal(guide?.state, 'arrived', target.id + ' endpoint remains actionable');
      inspected++;
    }
  }
  assert.equal(inside.length, 15);
  assert.equal(inspected, 90);
  assert(formerFalseArrivals >= 20, 'the old false-arrival defect remains reproduced across actual civic layouts');
});

test('V112 the unchanged native interior motor follows every guide until the requested interlocutor is actually in reach', () => {
  let totalSteps = 0;
  const before = JSON.stringify(save);
  for (const target of inside) {
    const room = rooms.homeworldInteriorForBuildingV64(target.buildingId), origin = originFor(target);
    const plan = current.homeworldRoutePlanV112(save, origin, target.id);
    let actor = {...motor.createHomeworldActor(), ...room.spawn, vx: 0, vy: 0}, arrived = false;
    for (let step = 0; step < 2000; step++) {
      const guide = current.homeworldRouteGuidanceV112(plan, {...origin, actor}, save);
      assert(guide, target.id);
      assert.notEqual(guide.state, 'off-route', target.id + ' remains on its verified corridor ' + JSON.stringify({actor,points:plan.stages.at(-1).points}));
      if (guide.state === 'arrived') {
        assert.equal(rooms.nearestHomeworldInteriorTargetV64(room, actor)?.pointId, target.pointId, target.id);
        arrived = true;
        break;
      }
      const point = guide.waypoint;
      assert(point);
      const span = Math.max(Math.abs(point.x - actor.x) / 330, Math.abs(point.y - actor.y) / 260, 1 / 60);
      const next = motor.stepHomeworldActorOnFloor(actor, {moveX: (point.x - actor.x) / (330 * span), climb: (point.y - actor.y) / (260 * span), jumpPressed: false}, 1 / 60,
        p => rooms.isHomeworldInteriorWalkableV64(room, p), () => { throw Error('No recovery or reset allowed on ' + target.id); });
      assert(rooms.isHomeworldInteriorWalkableV64(room, next), target.id + ' full native body');
      assert(Math.hypot(next.x - actor.x, next.y - actor.y) > .000001, target.id + ' physically progresses');
      actor = next;
      totalSteps++;
    }
    assert(arrived, target.id + ' guide terminates at the real interaction');
  }
  assert(totalSteps > 500);
  assert.equal(JSON.stringify(save), before, 'walking the test motor grants no service or progress');
});

test('V112 preserves the V111 street plan and owner, geometry and stale-target refusals', () => {
  const world = qa.load('app/game/systems/homeworldWorldV77.ts');
  const origin = {actor: world.createHomeworldWorldActorV77(), levelId: '0', interiorId: null};
  const target = 'point:personal-ship';
  const plan = current.homeworldRoutePlanV112(save, origin, target);
  assert.deepEqual(plan, old.homeworldRoutePlanV111(save, origin, target));
  assert.deepEqual(current.homeworldRouteGuidanceV112(plan, origin, save), old.homeworldRouteGuidanceV111(plan, origin, save));
  const request = {ownerCreatedAt: save.createdAt, destinationId: target, origin, geometryKey: plan.geometryKey, destinationKey: plan.destinationKey};
  assert(current.homeworldRouteResponseCurrentV112(request, plan, save, origin));
  const foreign = {...save, createdAt: '2026-10-29T10:00:00.000Z'};
  assert.equal(current.homeworldRouteGuidanceV112(plan, origin, foreign), null);
  assert.equal(current.homeworldRouteResponseCurrentV112(request, plan, foreign, origin), false);
  assert.equal(current.homeworldRouteGuidanceV112({...plan, geometryKey: 'changed-ground-lot'}, origin, save).state, 'off-route');
  assert.equal(current.homeworldRouteGuidanceV112({...plan, destinationKey: 'changed-target'}, origin, save).state, 'off-route');
});

test('V112 recalculates from the exact real motor position where the former market guide stopped', () => {
  const target = inside.find(target => target.pointId === 'market-service'), origin = originFor(target);
  const actor = {x: 198.4823632125863, y: 178.47060535431052};
  const plan = current.homeworldRoutePlanV112(save, {...origin, actor}, target.id);
  assert.equal(plan.status, 'reachable');
  const historicalPlan = old.homeworldRoutePlanV111(save, origin, target.id);
  assert.equal(old.homeworldRouteGuidanceV111(historicalPlan, {...origin, actor}, save).state, 'off-route');
  const guide = current.homeworldRouteGuidanceV112(plan, {...origin, actor}, save);
  assert.equal(guide.state, 'walking');
  assert(Math.hypot(guide.waypoint.x - actor.x, guide.waypoint.y - actor.y) > .000001);
  assert(rooms.isHomeworldInteriorWalkableV64(rooms.homeworldInteriorForBuildingV64(target.buildingId), guide.waypoint));
});

test('V112 rejects the native mausoleum corner missed between old four-unit samples and repairs its actual route', () => {
  const room = rooms.homeworldInteriorForBuildingV64('trophy-mausoleum');
  const from = {x: 269, y: 236}, to = {x: 353, y: 188}, corner = {x: 344, y: 193.14285714285714};
  const historical = qa.load('app/game/systems/homeworldWayfindingV75.ts');
  const navigation = qa.load('app/game/systems/homeworldInteriorNavigationV112.ts');
  assert.equal(historical.homeworldWayfindingInteriorSegmentV75(room, from, to), true, 'the old simplifier missed the corner');
  assert.equal(rooms.isHomeworldInteriorWalkableV64(room, corner), false, 'the real complete body intersects native furniture');
  assert.equal(navigation.homeworldInteriorSegmentV112(room, from, to), false);
  const target = inside.find(target => target.pointId === 'mausoleum-service'), origin = originFor(target);
  const plan = current.homeworldRoutePlanV112(save, origin, target.id);
  assert.equal(plan.status, 'reachable');
  assert.notDeepEqual(plan.stages[0].points, old.homeworldRoutePlanV111(save, origin, target.id).stages[0].points);
  for (const stage of plan.stages) for (let n = 1; n < stage.points.length; n++) {
    assert(navigation.homeworldInteriorSegmentV112(room, stage.points[n - 1], stage.points[n]));
  }
  assert.equal(navigation.homeworldInteriorSegmentV112(room, {x: NaN, y: 236}, to), false);
});

test('V112 requires the real archivist post range instead of the shifted landmark arrival halo', () => {
  const definition = qa.load('app/game/systems/homeworldArchiveDefinitionV106.ts').HOMEWORLD_ARCHIVE_V106;
  const archive = qa.load('app/game/systems/homeworldArchiveV106.ts');
  const cargoMotor = qa.load('app/game/systems/homeworldCargoV108.ts');
  const origin = {actor: {x: 7350, y: 5335}, levelId: '0', interiorId: null};
  const context = actor => ({ownerCreatedAt: save.createdAt, currentOwnerCreatedAt: save.createdAt,
    actor, levelId: '0', visitedDistrictIds: save.homeworld.visitedDistrictIds, active: true});
  const plan = current.homeworldRoutePlanV112(save, origin, definition.npcId);
  assert.equal(old.homeworldRouteGuidanceV111(plan, origin, save).state, 'arrived');
  assert.equal(archive.archivePostReachedV106(context(origin.actor)), false);
  const guide = current.homeworldRouteGuidanceV112(plan, origin, save);
  assert.equal(guide.state, 'walking');
  const span = Math.max(Math.abs(guide.waypoint.x - origin.actor.x) / 330, Math.abs(guide.waypoint.y - origin.actor.y) / 260, 1 / 60);
  const next = cargoMotor.stepHomeworldCargoActorV108({...motor.createHomeworldActor(), ...origin.actor}, {
    moveX: (guide.waypoint.x - origin.actor.x) / (330 * span), climb: (guide.waypoint.y - origin.actor.y) / (260 * span), jumpPressed: false,
  }, 1 / 60, '0', save.homeworld.cargoV108);
  assert(archive.archivePostReachedV106(context(next)), 'a real motor step reaches the speech range');
  assert.equal(current.homeworldRouteGuidanceV112(plan, {...origin, actor: next}, save).state, 'arrived');
});

test('V112 the actual Worker computes repaired interior paths and still refuses a mismatched live cargo snapshot', () => {
  const onmessage = globalThis.onmessage, postMessage = globalThis.postMessage, messages = [];
  try {
    globalThis.postMessage = value => messages.push(value);
    qa.load('app/game/homeworldRouteWorkerV112.ts');
    const target = inside.find(target => target.pointId === 'mausoleum-service'), origin = originFor(target);
    const geometryKey = qa.load('app/game/systems/homeworldNavigationV109.ts').homeworldCargoGeometryKeyV109(save.homeworld.cargoV108);
    globalThis.onmessage({data: {save, origin, destinationId: target.id, geometryKey}});
    assert.deepEqual(messages[0].plan, current.homeworldRoutePlanV112(save, origin, target.id));
    assert.equal(messages[0].plan.status, 'reachable');
    globalThis.onmessage({data: {save, origin, destinationId: target.id, geometryKey: 'stale-ground-cargo'}});
    assert.equal(messages.length, 2);
    assert.equal(messages[1].plan, undefined);
    assert.match(messages[1].error, /calcul du passage a échoué/);
  } finally {
    if (onmessage === undefined) delete globalThis.onmessage; else globalThis.onmessage = onmessage;
    if (postMessage === undefined) delete globalThis.postMessage; else globalThis.postMessage = postMessage;
  }
});

test('V112 a refused incoming edge does not hide an exit node reachable from another corridor', () => {
  const room = {buildingId: 'public-corner-fixture-v112', kind: 'civic', variant: 'civic', title: 'Exit around a native body', description: 'Two public approaches to one exit',
    width: 220, depth: 220, spawn: {x: 104, y: 60.1}, exit: {x: 116, y: 60.1}, points: [{pointId: 'blocking-npc', x: 110, y: 84}], props: []};
  const historical = qa.load('app/game/systems/homeworldWayfindingV75.ts');
  const navigation = qa.load('app/game/systems/homeworldInteriorNavigationV112.ts');
  assert(rooms.isHomeworldInteriorWalkableV64(room, room.spawn));
  assert(rooms.isHomeworldInteriorWalkableV64(room, room.exit));
  assert.equal(navigation.homeworldInteriorSegmentV112(room, room.spawn, room.exit), false, 'direct edge crosses the actual elliptical body');
  assert.equal(historical.homeworldWayfindingInteriorRouteV75(room, room.spawn, 'exit').status, 'unavailable', 'old visited-node rule discarded the other approach');
  const route = navigation.homeworldInteriorRouteV112(room, room.spawn, 'exit');
  assert.equal(route.status, 'reachable');
  assert.equal(rooms.nearestHomeworldInteriorTargetV64(room, route.points.at(-1))?.kind, 'exit');
  assert(route.distance > 12, 'the result walks around the body');
  for (let n = 1; n < route.points.length; n++) assert(navigation.homeworldInteriorSegmentV112(room, route.points[n - 1], route.points[n]));
});
