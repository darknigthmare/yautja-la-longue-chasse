import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';

const api = homeworldQaModelV64(process.cwd(), [
  'homeworldStreetCompositionMountV92.ts', 'homeworldNavigationV99.ts',
  'homeworldNavigationV77.ts', 'homeworldWayfindingV98.ts',
  'homeworldWorldV77.ts', 'homeworldCivicWorldV80.ts',
  'homeworldStreetDecorV83.ts', 'homeworldAtlasLandmarksV83.ts', '../save.ts',
]);
const length = points => points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);
const save = api.defaultSave('2026-10-20T10:00:00.000Z');
const port = { actor: api.HOMEWORLD_SPACEPORT_V77.spawn, levelId: '0', interiorId: null };

function verify(route, from, to, authority = api) {
  assert.equal(route.status, 'reachable');
  assert.deepEqual(route.points[0], from);
  assert.deepEqual(route.points.at(-1), to);
  assert(Math.abs(length(route.points) - route.distance) < 1e-7);
  for (let index = 1; index < route.points.length; index++) {
    assert(authority.homeworldRouteSegmentV77(route.levelId, route.points[index - 1], route.points[index]), 'full live body and four-unit margin sampler');
  }
}

test('V99: fractional connector departures preserve exact endpoints and full live collision margins', () => {
  for (const connector of api.HOMEWORLD_CONNECTORS_V77) for (const socket of [connector.from, connector.to]) {
    const from = { x: socket.point.x + .375, y: socket.point.y - .25 };
    assert(api.homeworldCivicWalkableV80(socket.levelId, from));
    const route = api.homeworldWalkRouteV99(socket.levelId, from, socket.point);
    verify(route, from, socket.point);
  }
  for (const from of [{ x: NaN, y: 10 }, { x: Infinity, y: 10 }, { x: 0, y: 0 }]) {
    const route = api.homeworldWalkRouteV99('0', from, port.actor);
    assert.equal(route.status, 'unavailable');
    assert.deepEqual(route.points, []);
  }
});

test('V99: consolidated port-to-audience route keeps every real connector and immutable cached points', () => {
  const before = JSON.stringify(save);
  const plan = api.homeworldRoutePlanV98(save, port, 'point:audience-point');
  assert.equal(plan.status, 'reachable');
  assert.equal(plan.stages.filter(stage => stage.kind === 'connector').length, 2);
  assert(plan.stages[0].points.length < 50, 'the 183-point V98 street is consolidated');
  for (const stage of plan.stages.filter(stage => !stage.interiorId)) {
    verify({ ...stage, status: 'reachable' }, stage.points[0], stage.points.at(-1));
  }
  const first = plan.stages[0], from = first.points[0], to = first.points.at(-1);
  const cached = api.homeworldWalkRouteV99(first.levelId, from, to);
  const expected = structuredClone(cached);
  cached.points[0].x = -9999;
  cached.points.push({ x: 0, y: 0 });
  assert.deepEqual(api.homeworldWalkRouteV99(first.levelId, from, to), expected);
  assert.equal(JSON.stringify(save), before);
});

test('V99: every consolidated exterior segment guides its interior positions with decreasing distance', () => {
  const plan = api.homeworldRoutePlanV98(save, port, 'point:audience-point');
  let longSegments = 0;
  for (const stage of plan.stages.filter(stage => !stage.interiorId)) {
    for (let index = 1; index < stage.points.length; index++) {
      const a = stage.points[index - 1], b = stage.points[index];
      if (Math.hypot(a.x - b.x, a.y - b.y) < 300) continue;
      let previous = Infinity;
      for (const ratio of [.2, .4, .6, .8]) {
        const actor = { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
        const guidance = api.homeworldRouteGuidanceV98(plan, { actor, levelId: stage.levelId, interiorId: null });
        assert.equal(guidance?.state, 'walking');
        assert(guidance.remaining < previous, 'distance falls while walking along the same verified street');
        previous = guidance.remaining;
      }
      longSegments++;
    }
  }
  assert(longSegments > 5, 'exercise long segments inside multi-segment stages');
});

test('V99: replacing a live street registry invalidates both cached grids and routes', () => {
  // This is a separate model graph: the real V83 registry is replaced through
  // its real configuration API, leaving the game and other tests untouched.
  const isolated = homeworldQaModelV64(process.cwd(), [
    'homeworldStreetCompositionMountV92.ts', 'homeworldNavigationV77.ts',
    'homeworldNavigationV99.ts', 'homeworldStreetDecorV83.ts', 'homeworldCivicWorldV80.ts',
  ]);
  const blocked = isolated.HOMEWORLD_STREET_DECOR_PROPS_V83.map(item => {
    const polygon = isolated.homeworldStreetDecorPolygonV83(item);
    return { levelId: item.levelId, point: { x: polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length, y: polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length } };
  }).filter(({ levelId, point }) => !isolated.homeworldCivicWalkableV80(levelId, point));
  assert(blocked.length, 'real mounted solid V83 props');
  for (const { levelId, point } of blocked) {
    assert.equal(isolated.homeworldWalkRouteV77(levelId, point, point).status, 'unavailable');
    assert.equal(isolated.homeworldWalkRouteV99(levelId, point, point).status, 'unavailable');
  }
  const revision = isolated.homeworldNavigationRevisionV77();
  isolated.configureHomeworldStreetDecorV83({ reserves: [], terrain: () => false, collision: () => null });
  assert.equal(isolated.homeworldNavigationRevisionV77(), revision + 1);
  assert.equal(isolated.homeworldNavigationRevisionV77(), revision + 1, 'unchanged registry keeps its revision');
  const opened = blocked.find(({ levelId, point }) => isolated.homeworldCivicWalkableV80(levelId, point));
  assert(opened, 'removing the real registry opens at least one formerly solid position');
  const { levelId, point } = opened;
  verify(isolated.homeworldWalkRouteV77(levelId, point, point), point, point, isolated);
  verify(isolated.homeworldWalkRouteV99(levelId, point, point), point, point, isolated);
});
