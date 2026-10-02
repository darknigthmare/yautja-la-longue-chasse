import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';
import { firstTracksCompleted, p } from './helpers/solo-v67-campaign-route.mjs';

const api = homeworldQaModelV64(process.cwd(), ['homeworldWayfindingV75.ts', 'homeworldCity.ts', 'homeworld.ts', 'homeworldSpatialCodex.ts', 'homeworldInteriorsV64.ts', 'homeworldGeometryV64.ts', 'homeworldRegionsV68.ts']);
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

test('all building plans respect the real city footprint and total physical walking length', () => {
  for (const building of api.HOMEWORLD_BUILDINGS) validatePlan(api.homeworldWayfindingPlanV75(adult, origin, null, 'building:' + building.id));
});

test('all nine currently allowed region guides end at the actual physical approach without starting a trip', () => {
  for (const destination of api.homeworldWayfindingDestinationsV75(youth).filter(d => d.category === 'regions')) {
    const plan = api.homeworldWayfindingPlanV75(youth, origin, null, destination.id); validatePlan(plan);
    assert.deepEqual(plan.stages.at(-1).route.points.at(-1), destination.approach);
    assert.equal(plan.stages.length, 1); assert(plan.stages[0].instruction.includes('ne lance aucun départ'));
  }
});

test('all staffed point plans reach a real unobstructed public interaction approach', () => {
  for (const point of api.HOMEWORLD_POINTS.filter(point => point.kind !== 'region')) {
    const plan = api.homeworldWayfindingPlanV75(adult, origin, null, 'point:' + point.id); validatePlan(plan);
    const room = api.homeworldInteriorForPointV64(point.id);
    if (room) {
      const last = plan.stages.at(-1).route.points.at(-1);
      assert.equal(api.nearestHomeworldInteriorTargetV64(room, last)?.pointId, point.id);
      assert(api.isHomeworldInteriorWalkableV64(room, last));
    }
  }
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
