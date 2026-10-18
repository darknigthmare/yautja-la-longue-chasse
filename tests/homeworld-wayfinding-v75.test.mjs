import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';
import { firstTracksCompleted, p } from './helpers/solo-v67-campaign-route.mjs';

const api = homeworldQaModelV64(process.cwd(), ['homeworldWayfindingV75.ts', 'homeworldCity.ts', 'homeworld.ts', 'homeworldSpatialCodex.ts', 'homeworldInteriorsV64.ts', 'homeworldGeometryV64.ts', 'homeworldRegionsV68.ts', 'homeworldWorldV77.ts', 'homeworldNavigationV77.ts', 'homeworldAtlasLandmarksV83.ts']);
const adult = p.defaultSave(), youth = firstTracksCompleted();
const origin = api.createHomeworldActor();
const length = points => points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);
function validatePlan(plan) {
  assert.equal(plan.status, 'reachable', plan.destinationId + ': ' + plan.reason);
  assert.equal(plan.distance, plan.stages.reduce((sum, stage) => sum + stage.route.distance, 0));
  for (const stage of plan.stages) {
    assert.equal(stage.route.status, 'reachable'); assert(stage.route.points.length > 0);
    assert(Math.abs(length(stage.route.points) - stage.route.distance) < 1e-7);
    const room = stage.space === 'city' ? null : api.homeworldInteriorForBuildingV64(stage.space);
    for (let i = 1; i < stage.route.points.length; i++) assert(room
      ? api.homeworldWayfindingInteriorSegmentV75(room, stage.route.points[i - 1], stage.route.points[i])
      : api.isHomeworldRouteSegmentWalkable(stage.route.points[i - 1], stage.route.points[i]), plan.destinationId + ' obstacle crossing');
  }
}

// The mounted HomeworldWorldMapV77 uses V83 for physical coordinates/floors.
// V75 still owns narrative permission/search and indoor routing; its archived
// single-floor city routes cannot stand in for current multi-level entrances.
const liveOrigin = { levelId: '0', point: api.HOMEWORLD_SPACEPORT_V77.spawn };
function validateLiveRoute(destination) {
  const before = structuredClone(liveOrigin), target = { levelId: destination.levelId, point: destination.position };
  const route = api.homeworldWorldRouteV77(liveOrigin, target);
  assert.equal(route.status, 'reachable', destination.id + ' at floor ' + destination.levelId);
  let cursor = liveOrigin;
  for (const segment of route.segments) {
    if (segment.connectorId) {
      const connector = api.HOMEWORLD_CONNECTORS_V77.find(item => item.id === segment.connectorId); assert(connector);
      const start = segment.reverse ? connector.to : connector.from, end = segment.reverse ? connector.from : connector.to;
      assert.equal(cursor.levelId, start.levelId); assert.deepEqual(cursor.point, start.point);
      cursor = end;
    } else {
      assert.equal(segment.levelId, cursor.levelId); assert.equal(segment.status, 'reachable'); assert(segment.points.length > 0);
      assert.deepEqual(segment.points[0], cursor.point);
      assert(Math.abs(length(segment.points) - segment.distance) < 1e-7);
      for (let index = 1; index < segment.points.length; index++) assert(api.homeworldRouteSegmentV77(segment.levelId, segment.points[index - 1], segment.points[index]), destination.id + ' full body obstacle crossing');
      cursor = { levelId: segment.levelId, point: segment.points.at(-1) };
    }
  }
  assert.deepEqual(cursor, target); assert.deepEqual(liveOrigin, before);
  return route;
}

test('finder has all 43 real buildings, point IDs and door approaches, without an alternate coordinate catalogue', () => {
  const destinations = api.homeworldWayfindingDestinationsV75(adult);
  assert.equal(destinations.filter(d => d.category === 'buildings').length, 43);
  assert.equal(new Set(destinations.map(d => d.id)).size, destinations.length);
  for (const building of api.HOMEWORLD_BUILDINGS) {
    const target = destinations.find(d => d.id === 'building:' + building.id);
    assert.deepEqual(target.approach, api.homeworldBuildingDoorwayV64(building).approach);
    assert.equal(target.buildingId, building.id); assert.equal(target.access, 'open');
  }
  for (const point of api.HOMEWORLD_POINTS.filter(point => point.kind !== 'region')) {
    const target = destinations.find(d => d.id === 'point:' + point.id), room = api.homeworldInteriorForPointV64(point.id);
    assert.equal(target.pointId, point.id); assert.equal(target.buildingId, room?.buildingId ?? null);
  }
});

test('actual youth progress protects regions and equipment while leaving physical visits possible', () => {
  const locked = structuredClone(youth); locked.soloV66 = null;
  const list = api.homeworldWayfindingDestinationsV75(locked);
  const regions = list.filter(d => d.category === 'regions'); assert.equal(regions.length, 9);
  assert(regions.every(d => d.access === 'locked' && !d.canGuide && d.reason.includes('Premières Pistes')));
  for (const id of ['market-service', 'forge-service', 'training-service', 'medbay-service', 'pit-service']) {
    const station = list.find(d => d.id === 'point:' + id); assert.equal(station.access, 'restricted'); assert.equal(station.canGuide, true);
  }
  assert.equal(list.find(d => d.id === 'point:audience-point').label, 'Chef du clan · consignes personnelles');
  const passed = api.homeworldWayfindingDestinationsV75(youth).filter(d => d.category === 'regions');
  assert(passed.every(d => d.canGuide && d.access === 'open'));
  assert.equal(api.homeworldWayfindingPlanV75(locked, origin, null, 'region:ash-marches').status, 'locked');
});

test('Reserve visibility delegates to actual permission and unknown targets do not leak coordinates', () => {
  for (const save of [adult, youth]) {
    assert.equal(api.homeworldWayfindingRegionVisibilityV75(save, 'forbidden-reserve').visible, false);
    assert(!api.homeworldWayfindingDestinationsV75(save).some(d => d.id === 'region:forbidden-reserve'));
    assert.deepEqual(api.homeworldWayfindingPlanV75(save, origin, null, 'region:forbidden-reserve').stages, []);
  }
  assert.deepEqual(api.homeworldWayfindingRegionVisibilityV75(adult, 'invented'), { visible: false, allowed: false, reason: 'Territoire inconnu.' });
  // This policy consumes already-normalized expedition state. It does not
  // mint a proof; parser validation and actual expedition play have their own gates.
  const reportState = structuredClone(adult); reportState.homeworld.expeditions['glass-desert'] = { alreadyValidated: true };
  const permission = api.canEnterHomeworldRegionV68(reportState, 'forbidden-reserve');
  assert.deepEqual(api.homeworldWayfindingRegionVisibilityV75(reportState, 'forbidden-reserve'), { visible: permission.allowed, ...permission });
});

test('all 43 live atlas building plans respect their real floor, full body footprint and walking length', () => {
  const before = JSON.stringify(adult), records = api.homeworldAtlasLandmarksV83(adult);
  assert.equal(api.HOMEWORLD_BUILDINGS_V77.length, 43);
  for (const building of api.HOMEWORLD_BUILDINGS_V77) {
    const destination = api.homeworldAtlasTargetV83(records, 'building:' + building.id); assert(destination);
    assert.equal(destination.buildingId, building.id); assert.equal(destination.levelId, building.levelId);
    assert.deepEqual(destination.position, api.homeworldBuildingDoorwayV64(building).approach);
    validateLiveRoute(destination);
  }
  assert.equal(JSON.stringify(adult), before);
});

test('all nine permitted live atlas region guides end at the actual physical threshold without starting a trip', () => {
  const before = JSON.stringify(youth), destinations = api.homeworldAtlasLandmarksV83(youth).filter(record => record.category === 'region');
  assert.equal(destinations.length, 9);
  for (const destination of destinations) {
    assert.equal(destination.access, 'open');
    const point = api.HOMEWORLD_POINTS_V77.find(item => item.id === destination.pointId); assert(point);
    assert.equal(destination.regionId, point.regionId); assert.equal(destination.levelId, point.levelId);
    assert.deepEqual(destination.position, { x: point.x, y: point.y });
    validateLiveRoute(destination);
  }
  assert.equal(JSON.stringify(youth), before);
});

test('all staffed live atlas points reach their current floor and actual indoor interaction without owner mutation', () => {
  const before = JSON.stringify(adult), records = api.homeworldAtlasLandmarksV83(adult);
  for (const point of api.HOMEWORLD_POINTS_V77.filter(point => point.kind !== 'region')) {
    const destination = api.homeworldAtlasTargetV83(records, 'point:' + point.id); assert(destination);
    assert.equal(destination.pointId, point.id);
    const room = api.homeworldInteriorForPointV64(point.id);
    assert.equal(destination.buildingId, room?.buildingId ?? null);
    if (room) {
      validateLiveRoute(destination);
      const building = api.HOMEWORLD_BUILDINGS_V77.find(item => item.id === room.buildingId); assert(building);
      assert.equal(destination.levelId, building.levelId); assert.deepEqual(destination.position, api.homeworldBuildingDoorwayV64(building).approach);
      const route = api.homeworldWayfindingInteriorRouteV75(room, room.spawn, point.id);
      assert.equal(route.status, 'reachable', point.id + ' inside actual room');
      assert(Math.abs(length(route.points) - route.distance) < 1e-7);
      for (let index = 1; index < route.points.length; index++) assert(api.homeworldWayfindingInteriorSegmentV75(room, route.points[index - 1], route.points[index]), point.id + ' indoor body obstacle crossing');
      const last = route.points.at(-1);
      assert.equal(api.nearestHomeworldInteriorTargetV64(room, last)?.pointId, point.id);
      assert(api.isHomeworldInteriorWalkableV64(room, last));
    } else {
      assert.equal(destination.levelId, point.levelId); assert.deepEqual(destination.position, { x: point.x, y: point.y });
      // An exterior marker names the object, not its solid centre as a place
      // for the hunter. Keep the public +55 approach used by the finder and
      // prove that runtime proximity resolves this exact point, not a neighbour.
      const approach = { x: point.x, y: point.y + 55 };
      validateLiveRoute({ ...destination, position: approach });
      assert.equal(api.nearestHomeworldPointV77(point.levelId, approach)?.id, point.id);
    }
  }
  assert.equal(JSON.stringify(adult), before);
});

test('indoor routes tolerate non-grid starts, leave an actual exit and re-enter the next real room', () => {
  for (const room of api.HOMEWORLD_INTERIORS_V64) {
    const route = api.homeworldWayfindingInteriorRouteV75(room, { x: room.spawn.x + .137, y: room.spawn.y - .213 }, 'exit');
    assert.equal(route.status, 'reachable', room.buildingId);
    assert.equal(api.nearestHomeworldInteriorTargetV64(room, route.points.at(-1))?.kind, 'exit');
  }
  const room = api.homeworldInteriorForPointV64('dock-officer-point');
  const plan = api.homeworldWayfindingPlanV75(adult, room.spawn, room.buildingId, 'point:market-service'); validatePlan(plan);
  assert.deepEqual(plan.stages.map(s => s.space), [room.buildingId, 'city', 'market-armory']);
  const same = api.homeworldWayfindingPlanV75(adult, room.spawn, room.buildingId, 'point:dock-officer-point'); validatePlan(same);
  assert.deepEqual(same.stages.map(s => s.space), [room.buildingId]);
});

test('invalid actor coordinates and solid NPC centres never become invented indoor routes', () => {
  const room = api.homeworldInteriorForPointV64('dock-officer-point');
  for (const from of [{ x: NaN, y: 20 }, { x: 0, y: 0 }, room.points[0]]) {
    assert.equal(api.homeworldWayfindingInteriorRouteV75(room, from, 'dock-officer-point').status, 'unavailable');
  }
  assert.equal(api.homeworldWayfindingPlanV75(adult, origin, 'not-a-room', 'point:market-service').status, 'unavailable');
  assert.equal(api.homeworldWayfindingPlanV75(adult, { x: Infinity, y: 50 }, null, 'point:market-service').status, 'unavailable');
});

test('search handles French accents, combined tokens, categories and honest empty results', () => {
  const list = api.homeworldWayfindingDestinationsV75(adult);
  assert(api.homeworldWayfindingSearchV75(list, 'memoire').some(d => d.id === 'point:memory-service'));
  for (const [word, id] of [['soins', 'medbay-service'], ['armurerie', 'market-service'], ['dojo', 'training-service'], ['amarrage', 'dock-officer-point']])
    assert(api.homeworldWayfindingSearchV75(list, word).some(d => d.id === 'point:' + id), word + ' locates the actual service rather than a fabricated destination');
  const services = api.homeworldWayfindingSearchV75(list, '', 'services'); assert(services.length > 0); assert(services.every(d => d.category === 'services'));
  assert.deepEqual(api.homeworldWayfindingSearchV75(list, 'not present 172943'), []);
  assert(api.homeworldWayfindingSearchV75(list, 'mémoire registre').every(d => /registre/i.test(d.label + d.detail + d.district)));
});

test('guidance follows safe visible corners, physical arrival and correct room identity without mutation', () => {
  const before = JSON.stringify(adult), actor = { ...origin }, plan = api.homeworldWayfindingPlanV75(adult, actor, null, 'point:market-service');
  const first = api.homeworldWayfindingGuidanceV75(plan, actor, null); assert.equal(first.state, 'walking'); assert(first.remaining > 0);
  assert.equal(api.homeworldWayfindingGuidanceV75(plan, actor, 'deep-forge').state, 'off-route');
  const cityStage = plan.stages.find(s => s.space === 'city'), approach = cityStage.route.points.at(-1);
  assert.equal(api.homeworldWayfindingGuidanceV75(plan, approach, null).state, 'arrived');
  const last = plan.stages.at(-1); assert.equal(api.homeworldWayfindingGuidanceV75(plan, last.route.points.at(-1), last.space).state, 'arrived');
  for (let i = 0; i < 100; i++) assert.deepEqual(api.homeworldWayfindingGuidanceV75(plan, actor, null), first);
  api.homeworldWayfindingSearchV75(api.homeworldWayfindingDestinationsV75(adult), 'mémoire');
  assert.equal(JSON.stringify(adult), before); assert.deepEqual(actor, origin);
  assert.equal(api.homeworldWayfindingMetresV75(100), 2); assert.equal(api.homeworldWayfindingMetresV75(NaN), 0);
});
