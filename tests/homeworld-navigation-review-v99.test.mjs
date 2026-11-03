import assert from 'node:assert/strict';
import test from 'node:test';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';

const api = homeworldQaModelV64(process.cwd(), [
  'homeworldStreetCompositionMountV92.ts', 'homeworldNavigationV77.ts',
  'homeworldNavigationV99.ts', 'homeworldWayfindingV98.ts',
  'homeworldWorldV77.ts', 'homeworldGeometryV64.ts', 'homeworldCivicWorldV80.ts',
]);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const length = points => points.slice(1).reduce((sum, point, index) => sum + distance(points[index], point), 0);
function inspect(route, from, to) {
  assert.equal(route.status, 'reachable');
  assert.deepEqual(route.points[0], from);
  assert.deepEqual(route.points.at(-1), to);
  assert.ok(Math.abs(route.distance - length(route.points)) < 1e-7);
  for (let n = 1; n < route.points.length; n++) {
    const a = route.points[n - 1], b = route.points[n], samples = Math.max(1, Math.ceil(distance(a, b) / 4));
    for (let k = 0; k <= samples; k++) {
      const point = { x: a.x + (b.x - a.x) * k / samples, y: a.y + (b.y - a.y) * k / samples };
      const margin = Math.min(12, distance(a, point), distance(b, point));
      assert.equal(api.homeworldCivicWalkableV80(route.levelId, point), true, `solid at ${JSON.stringify(point)}`);
      assert.equal(api.homeworldCivicWalkableV80(route.levelId, point, { halfWidth: 24 + margin, halfDepth: 14 + margin }), true, `margin at ${JSON.stringify(point)}`);
    }
  }
}

test('review: a real dock doorway without any safe coarse anchor retains the exact fine-grid escape in both directions', () => {
  const building = api.HOMEWORLD_BUILDINGS_V77.find(item => item.id === 'dock-control');
  const from = api.homeworldBuildingDoorwayV64(building).approach;
  const to = { x: from.x - 64, y: from.y - 64 };
  assert.equal(api.homeworldCivicWalkableV80(building.levelId, from), true);
  assert.equal(api.homeworldCivicWalkableV80(building.levelId, to), true);
  assert.equal(api.homeworldRouteSegmentV77(building.levelId, from, to), false, 'the tempting direct doorway chord crosses a real solid');
  // No coarse start or goal can exist here. This proves execution of the
  // fallback through real world geometry without mocking the search helper.
  let anchors = 0;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const point = { x: (Math.round(from.x / 96) + dx) * 96, y: (Math.round(from.y / 96) + dy) * 96 };
    if (api.homeworldCivicWalkableV80(building.levelId, point, { halfWidth: 36, halfDepth: 26 }) && api.homeworldRouteSegmentV77(building.levelId, from, point)) anchors++;
  }
  assert.equal(anchors, 0);
  for (const [a, b] of [[from, to], [to, from]]) {
    const fine = api.homeworldWalkRouteV77(building.levelId, a, b);
    inspect(fine, a, b);
    const route = api.homeworldWalkRouteV99(building.levelId, a, b);
    inspect(route, a, b);
    assert.equal(route.points.length, 3, 'the obstructed corner cannot disappear during consolidation');
    assert.deepEqual(route, api.homeworldSimplifyRouteV99(fine));
  }
});

test('review: guidance uses the actual closest segment when a different later vertex is nearer than either endpoint', () => {
  // A deliberately folded but fully walkable polyline isolates the nearest
  // segment ambiguity on the real southern causeway. It is no saved route or
  // claim that a shortest-path planner would deliberately walk this detour.
  const points = [{ x: 3500, y: 5400 }, { x: 5000, y: 5400 }, { x: 4500, y: 5460 }, { x: 4400, y: 5460 }];
  const stage = { levelId: '0', interiorId: null, points, distance: length(points), kind: 'building', radius: 24, instruction: 'Repère de revue' };
  inspect({ ...stage, status: 'reachable' }, points[0], points.at(-1));
  const plan = { ownerCreatedAt: 'review', destinationId: 'review-causeway', status: 'reachable', reason: '', distance: stage.distance, stages: [stage] };
  const actor = { x: 4500, y: 5400 };
  assert(distance(actor, points[2]) < distance(actor, points[0]));
  assert(distance(actor, points[2]) < distance(actor, points[1]));
  const guidance = api.homeworldRouteGuidanceV98(plan, { actor, levelId: '0', interiorId: null });
  assert.equal(guidance.state, 'walking');
  assert.match(guidance.direction, /est/);
  const expected = distance(actor, points[1]) + distance(points[1], points[2]) + distance(points[2], points[3]);
  assert.ok(Math.abs(guidance.remaining - expected) < 1e-7, 'remaining distance must follow the first segment and preserve the future bends');
  const later = api.homeworldRouteGuidanceV98(plan, { actor: { x: 4600, y: 5400 }, levelId: '0', interiorId: null });
  assert.ok(Math.abs(later.remaining - (expected - 100)) < 1e-7);
});

test('review: consolidating repeated endpoint samples preserves the protected dock corner and caller-owned coordinates', () => {
  const building = api.HOMEWORLD_BUILDINGS_V77.find(item => item.id === 'dock-control');
  const from = api.homeworldBuildingDoorwayV64(building).approach, to = { x: from.x - 64, y: from.y - 64 };
  const fine = api.homeworldWalkRouteV77(building.levelId, from, to);
  const repeated = { ...fine, points: fine.points.flatMap(point => [{ ...point }, { ...point }]) };
  const before = structuredClone(repeated), result = api.homeworldSimplifyRouteV99(repeated);
  inspect(result, from, to);
  assert.deepEqual(repeated, before);
  assert.equal(result.points.length, 3);
  result.points[0].x = -100;
  result.points.at(-1).y = -100;
  assert.deepEqual(repeated, before, 'every returned endpoint belongs to the returned plan');
});
