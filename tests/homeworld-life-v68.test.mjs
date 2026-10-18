import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';
const api = homeworldQaModelV64(process.cwd(), ['homeworldCity.ts', 'homeworldLifeV68.ts', 'homeworldWorldV77.ts', 'homeworldCivicWorldV80.ts', 'homeworldNavigationV77.ts', 'homeworldGeometryV64.ts', 'homeworldCivilianRoutinesV84.ts']);
// V68 owns the original identities. The mounted world moves the port, assigns
// physical floors and revises routes around later native foundations.
const residents = api.HOMEWORLD_RESIDENTS_V68.map(original => {
  const current = api.HOMEWORLD_RESIDENTS_V77.find(resident => resident.id === original.id);
  assert(current, original.id + ' remains in the mounted population');
  for (const field of ['districtId', 'role', 'morphId', 'speed']) assert.equal(current[field], original[field]);
  return current;
});
test('V68 city population occupies every district and stays on current full-body walkable ground for a full routine', () => {
  assert.equal(api.HOMEWORLD_RESIDENTS_V68.length, 56);
  assert.equal(residents.length, 56);
  assert.deepEqual(new Set(residents.map(r => r.districtId)), new Set(api.HOMEWORLD_DISTRICTS_V77.map(d => d.id)));
  for (const resident of residents) {
    const routine = api.homeworldCivilianRoutineV84(resident);
    const distance = resident.path.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - resident.path[index].x, point.y - resident.path[index].y), 0);
    const cycle = distance / resident.speed * 2 + routine.endHaltSeconds + routine.startHaltSeconds;
    let moved = false;
    for (let time = 0; time <= Math.max(140, cycle); time += .25) {
      const pose = api.homeworldResidentPoseV77(resident, time);
      assert(api.homeworldCivicWalkableV80(resident.levelId, pose), resident.id + ' crosses a wall or furniture on floor ' + resident.levelId);
      assert(pose.progress >= 0 && pose.progress <= 1);
      moved ||= pose.moving;
    }
    if (resident.path.length > 1) assert(moved);
  }
});
test('V68 furniture leaves every current public door and all ten region approaches reachable through real floors and connectors', () => {
  const spawn = {levelId: '0', point: api.HOMEWORLD_SPACEPORT_V77.spawn};
  assert.equal(api.HOMEWORLD_PROPS_V77.filter(p => p.id.startsWith('life-v68-')).length, 15);
  assert.equal(api.HOMEWORLD_BUILDINGS_V77.length, 43);
  const targets = api.HOMEWORLD_BUILDINGS_V77.map(building => ({id: building.id, levelId: building.levelId, point: api.homeworldBuildingDoorwayV64(building).approach}));
  const regions = api.HOMEWORLD_POINTS_V77.filter(point => point.regionId);
  assert.equal(regions.length, 10);
  for (const point of regions) {
    const arrival = api.homeworldWorldArrivalV77(point.regionId);
    assert(arrival, point.id + ' has a supported return approach');
    targets.push({id: point.id, levelId: arrival.levelId, point: {x: arrival.actor.x, y: arrival.actor.y}});
  }
  for (const target of targets) {
    const route = api.homeworldWorldRouteV77(spawn, target);
    assert.equal(route.status, 'reachable', target.id + ' remains reachable on floor ' + target.levelId);
    let cursor = spawn;
    for (const segment of route.segments) {
      if (segment.connectorId) {
        const connector = api.HOMEWORLD_CONNECTORS_V77.find(item => item.id === segment.connectorId);
        assert(connector, target.id + ' uses a real connector');
        const from = segment.reverse ? connector.to : connector.from;
        const to = segment.reverse ? connector.from : connector.to;
        assert.equal(cursor.levelId, from.levelId);
        assert.deepEqual(cursor.point, from.point, target.id + ' reaches the connector without teleporting');
        cursor = {levelId: to.levelId, point: to.point};
      } else {
        assert.equal(segment.levelId, cursor.levelId);
        assert.equal(segment.status, 'reachable');
        assert.deepEqual(segment.points[0], cursor.point);
        for (let index = 1; index < segment.points.length; index++) assert(api.homeworldRouteSegmentV77(segment.levelId, segment.points[index - 1], segment.points[index]), target.id + ' crosses a full-body obstacle');
        cursor = {levelId: segment.levelId, point: segment.points.at(-1)};
      }
    }
    assert.deepEqual(cursor, {levelId: target.levelId, point: target.point});
  }
});
test('V68 citizen proximity and routine are deterministic and cannot replace civic services', () => {
  for (const r of residents) {
    const p = api.homeworldResidentPoseV77(r, 32);
    assert.deepEqual(p, api.homeworldResidentPoseV77(r, 32));
    const nearest = api.nearestHomeworldResidentV77(r.levelId, p, 32);
    assert(nearest);
    assert.equal(nearest.levelId, r.levelId);
    assert(api.homeworldResidentDialogueV68(r).length > 70);
  }
  assert.equal(api.nearestHomeworldResidentV77('0', {x:-10000,y:-10000}, 0), null);
});
