import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';

// Independent review: destinations are checked against the live interaction
// and collision authorities, rather than a second set of expected coordinates.
const api = homeworldQaModelV64(process.cwd(), [
  // These late mounts are also loaded by the rendered scene. A worker has a
  // separate module graph, so omitting them would silently omit solid scenery.
  'homeworldStreetCompositionMountV92.ts',
  'homeworldWayfindingV98.ts', 'homeworldWorldV77.ts', 'homeworldCivicWorldV80.ts',
  'homeworldInteriorsV64.ts', 'homeworldGeometryV64.ts', 'homeworldAtlasLandmarksV83.ts',
  'homeworldStreetDecorV84.ts', '../save.ts',
]);
const save = api.defaultSave('2026-10-18T10:00:00.000Z');
const port = { actor: api.HOMEWORLD_SPACEPORT_V77.spawn, levelId: '0', interiorId: null };
const point = value => ({ x: value.x, y: value.y });
const length = points => points.slice(1).reduce((sum, p, n) => sum + Math.hypot(p.x - points[n].x, p.y - points[n].y), 0);
const records = api.homeworldAtlasLandmarksV83(save);
const plans = new Map();

function reviewPlan(plan, origin) {
  assert.equal(plan.status, 'reachable', `${plan.destinationId}: ${plan.reason}`);
  assert.equal(plan.ownerCreatedAt, save.createdAt);
  assert(plan.stages.length);
  assert(Math.abs(plan.distance - plan.stages.reduce((sum, stage) => sum + stage.distance, 0)) < 1e-7);
  let cursor = { ...origin, actor: point(origin.actor) };
  for (const stage of plan.stages) {
    assert.equal(stage.levelId, cursor.levelId, `${plan.destinationId}: physical floor seam`);
    assert.equal(stage.interiorId, cursor.interiorId, `${plan.destinationId}: physical room seam`);
    assert.deepEqual(stage.points[0], cursor.actor, `${plan.destinationId}: physical route start`);
    assert(Math.abs(length(stage.points) - stage.distance) < 1e-7);
    const room = stage.interiorId ? api.homeworldInteriorForBuildingV64(stage.interiorId) : null;
    for (let n = 0; n < stage.points.length; n++) {
      const a = stage.points[Math.max(0, n - 1)], b = stage.points[n];
      const samples = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / 4));
      for (let k = 0; k <= samples; k++) {
        const p = { x: a.x + (b.x - a.x) * k / samples, y: a.y + (b.y - a.y) * k / samples };
        assert(room ? api.isHomeworldInteriorWalkableV64(room, p) : api.homeworldCivicWalkableV80(stage.levelId, p), `${plan.destinationId}: solid scenery crossing`);
      }
    }
    const end = stage.points.at(-1);
    const guidance = api.homeworldRouteGuidanceV98(plan, { actor: end, levelId: stage.levelId, interiorId: stage.interiorId });
    assert.equal(guidance?.state, 'arrived', `${plan.destinationId}: arrived at actual stage endpoint`);
    if (stage.kind === 'connector') {
      const near = api.nearestHomeworldConnectorV77(stage.levelId, end);
      assert.equal(near?.connector.id, stage.connectorId);
      const other = near.reverse ? near.connector.from : near.connector.to;
      assert.equal(other.levelId, stage.nextLevelId);
      cursor = { actor: point(other.point), levelId: other.levelId, interiorId: null };
    } else if (stage.kind === 'exit') {
      assert.equal(api.nearestHomeworldInteriorTargetV64(room, end)?.kind, 'exit');
      const building = api.HOMEWORLD_BUILDINGS_V77.find(item => item.id === room.buildingId);
      cursor = { actor: api.homeworldBuildingDoorwayV64(building).approach, levelId: building.levelId, interiorId: null };
    } else if (stage.kind === 'enter') {
      const building = api.nearestHomeworldDoorV77(stage.levelId, end);
      assert(building, `${plan.destinationId}: endpoint really opens its door`);
      const interior = api.homeworldInteriorForBuildingV64(building.id);
      cursor = { actor: point(interior.spawn), levelId: building.levelId, interiorId: building.id };
    } else cursor = { actor: point(end), levelId: stage.levelId, interiorId: stage.interiorId };
  }
  const destination = api.homeworldAtlasTargetV83(records, plan.destinationId), last = plan.stages.at(-1);
  if (destination.pointId) {
    const reached = last.interiorId
      ? api.nearestHomeworldInteriorTargetV64(api.homeworldInteriorForBuildingV64(last.interiorId), last.points.at(-1))?.pointId
      : api.nearestHomeworldPointV77(last.levelId, last.points.at(-1))?.id;
    assert.equal(reached, destination.pointId, `${plan.destinationId}: runtime resolves the requested object`);
  }
}

test('review: every accessible live destination has continuous physical stages and an actual interaction endpoint', () => {
  const before = JSON.stringify(save), initial = structuredClone(port);
  for (const destination of records.filter(record => record.access !== 'locked')) {
    const plan = api.homeworldRoutePlanV98(save, port, destination.id);
    reviewPlan(plan, port); plans.set(destination.id, plan);
  }
  assert.equal(JSON.stringify(save), before);
  assert.deepEqual(port, initial);
});

test('review: origins on both sides of every public connector keep continuous physical transitions', () => {
  for (const connector of api.HOMEWORLD_CONNECTORS_V77) for (const reverse of [false, true]) {
    const from = reverse ? connector.to : connector.from;
    const to = reverse ? connector.from : connector.to;
    // -1A is a public connecting street without a registered building. In
    // that case continue to a real ground-floor service rather than inventing
    // a waypoint in the destination catalogue.
    const destination = records.find(record => record.levelId === to.levelId && record.buildingId && record.access !== 'locked')
      ?? records.find(record => record.id === 'point:market-service');
    assert(destination);
    const origin = { actor: from.point, levelId: from.levelId, interiorId: null };
    reviewPlan(api.homeworldRoutePlanV98(save, origin, destination.id), origin);
  }
});

test('review: leaving a real room joins its own doorway and enters a different room on the correct floor', () => {
  const start = api.homeworldInteriorForBuildingV64('dock-control');
  const origin = { actor: start.spawn, levelId: '0', interiorId: start.buildingId };
  for (const id of ['point:market-service', 'point:audience-point', 'point:witness-point']) {
    const plan = api.homeworldRoutePlanV98(save, origin, id);
    reviewPlan(plan, origin);
    assert.equal(plan.stages[0].kind, 'exit');
    assert.equal(plan.stages[0].interiorId, start.buildingId);
    assert.equal(plan.stages.at(-1).kind, 'interact');
    assert.notEqual(plan.stages.at(-1).interiorId, start.buildingId);
  }
});

test('review: non-finite, solid, unknown and wrong-floor origins never produce a usable route', () => {
  const room = api.homeworldInteriorForBuildingV64('dock-control');
  const bad = [
    { ...port, actor: { x: NaN, y: 100 } },
    { ...port, actor: { x: Infinity, y: 100 } },
    { ...port, actor: { x: 0, y: 0 } },
    { ...port, levelId: '+3' },
    { ...port, interiorId: 'missing-room' },
    { actor: room.spawn, levelId: '+2', interiorId: room.buildingId },
    { actor: { x: 0, y: 0 }, levelId: '0', interiorId: room.buildingId },
    { actor: room.points[0], levelId: '0', interiorId: room.buildingId },
  ];
  for (const origin of bad) for (const id of ['point:market-service', 'building:dock-control']) {
    const plan = api.homeworldRoutePlanV98(save, origin, id);
    assert.equal(plan.status, 'unavailable', `${id}: ${JSON.stringify(origin)}`);
    assert.deepEqual(plan.stages, []);
  }
  for (const id of ['missing-place', 'region:forbidden-reserve']) {
    const plan = api.homeworldRoutePlanV98(save, port, id);
    assert.equal(plan.status, 'unavailable');
    assert.deepEqual(plan.stages, []);
    assert.equal(plan.distance, 0);
  }
});

test('review: guidance follows intermediate route positions and never announces an arrival in another room or floor', () => {
  const plan = plans.get('point:audience-point') ?? api.homeworldRoutePlanV98(save, port, 'point:audience-point');
  let inspected = 0;
  for (const stage of plan.stages) {
    for (let n = 1; n < stage.points.length; n++) {
      const a = stage.points[n - 1], b = stage.points[n];
      const actor = { x: a.x + (b.x - a.x) * .57, y: a.y + (b.y - a.y) * .57 };
      const guidance = api.homeworldRouteGuidanceV98(plan, { actor, levelId: stage.levelId, interiorId: stage.interiorId });
      assert(guidance && guidance.state !== 'off-route', 'a point on the verified route must remain usable');
      assert(Number.isFinite(guidance.remaining) && guidance.remaining >= 0);
      inspected++;
    }
    const actor = stage.points.at(-1);
    const wrongRoom = api.homeworldRouteGuidanceV98(plan, { actor, levelId: stage.levelId, interiorId: 'missing-room' });
    assert.equal(wrongRoom?.state, 'off-route');
    const wrongFloor = api.homeworldRouteGuidanceV98(plan, { actor, levelId: '-1C', interiorId: stage.interiorId });
    assert.equal(wrongFloor?.state, 'off-route');
  }
  assert(inspected > 10);
  assert.equal(api.homeworldRouteGuidanceV98(plan, { ...port, actor: { x: NaN, y: 10 } }), null);
});

test('review: a long clear two-point route remains useful between endpoints with a decreasing walking distance', () => {
  const origins = api.HOMEWORLD_CONNECTORS_V77.flatMap(connector => [connector.from, connector.to]);
  let specimen;
  for (const from of origins) {
    for (const destination of records.filter(record => record.levelId === from.levelId && record.buildingId)) {
      const origin = { actor: from.point, levelId: from.levelId, interiorId: null };
      const plan = api.homeworldRoutePlanV98(save, origin, destination.id);
      const stage = plan.stages[0];
      if (stage?.points.length === 2 && stage.distance > 500) { specimen = { plan, stage }; break; }
    }
    if (specimen) break;
  }
  assert(specimen, 'at least one real straight street should exercise a long two-point stage');
  const { plan, stage } = specimen, [a, b] = stage.points;
  let previous = Infinity;
  for (const ratio of [.2, .4, .6, .8]) {
    const actor = { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
    const guidance = api.homeworldRouteGuidanceV98(plan, { actor, levelId: stage.levelId, interiorId: null });
    assert.equal(guidance?.state, 'walking');
    assert(guidance.remaining < previous);
    previous = guidance.remaining;
  }
});

test('review: an isolated wayfinding import mounts the same late solid scenery as the visible scene', () => {
  // The route worker has no React scene or neighbourhood component to perform
  // these mounts for it. Loading only its model entry must establish parity.
  const isolated = homeworldQaModelV64(process.cwd(), [
    'homeworldWayfindingV98.ts', 'homeworldStreetCompositionV92.ts', 'homeworldStreetDecorV84.ts',
    'homeworldCivicWorldV80.ts',
  ]);
  assert(api.HOMEWORLD_STREET_DECOR_PROPS_V84.length > 0);
  assert(api.HOMEWORLD_STREET_COMPOSITION_PROPS_V92.length > 0);
  assert.deepEqual(isolated.HOMEWORLD_STREET_DECOR_PROPS_V84, api.HOMEWORLD_STREET_DECOR_PROPS_V84);
  assert.deepEqual(isolated.HOMEWORLD_STREET_COMPOSITION_PROPS_V92, api.HOMEWORLD_STREET_COMPOSITION_PROPS_V92);
  let checked = 0;
  for (const item of [...api.HOMEWORLD_STREET_DECOR_PROPS_V84, ...api.HOMEWORLD_STREET_COMPOSITION_PROPS_V92]) {
    for (const dx of [-24, 0, 24]) for (const dy of [-14, 0, 14]) {
      const p = { x: item.x + dx, y: item.y + dy };
      assert.equal(isolated.homeworldCivicWalkableV80(item.levelId, p), api.homeworldCivicWalkableV80(item.levelId, p), item.id);
      checked++;
    }
  }
  assert(checked > 100);
});
