import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';
import { homeworldInteriorPointFixture, homeworldInteriorPointPathFixture } from './helpers/homeworld-interior-point-fixture.mjs';

const api = homeworldQaModelV64(process.cwd(), ['homeworldInteriorsV64.ts']);
const body = { halfWidth: 28, halfDepth: 18 };
function validatePath(room, path, targetId) {
  assert.deepEqual(path[0], room.spawn);
  for (let i = 0; i < path.length; i++) {
    assert(api.isHomeworldInteriorWalkableV64(room, path[i], body), room.buildingId + ' full body');
    if (!i) continue;
    const previous = path[i - 1], current = path[i], distance = Math.hypot(current.x - previous.x, current.y - previous.y);
    assert.equal(distance, 4, 'only adjacent flood cells form the route');
    for (let unit = 1; unit <= 4; unit++) assert(api.isHomeworldInteriorWalkableV64(room,
      { x: previous.x + (current.x - previous.x) * unit / 4, y: previous.y + (current.y - previous.y) * unit / 4 }, body), 'no between-cell tunnelling');
  }
  const target = api.nearestHomeworldInteriorTargetV64(room, path.at(-1));
  if (targetId === 'exit') assert.equal(target?.kind, 'exit');
  else { assert.equal(target?.kind, 'point'); assert.equal(target.pointId, targetId); }
}

test('previous exact dock poses retain the negative locally-valid island regression without replacing any collider', () => {
  const live = api.homeworldInteriorForBuildingV64('dock-control');
  // This real pre-V89 arrangement is a bounded negative fixture. Its full
  // dimensions, sources, body and collision predicate remain unchanged.
  const before = { 'dock-control-v84-control-standard': [172, 116],
    'dock-control-v84-inspection-register': [442, 116], 'dock-control-v84-inspection-case': [371, 116] };
  const restore = item => before[item.id] ? { ...item, x: before[item.id][0], y: before[item.id][1] } : item;
  const room = { ...live, furniture: live.furniture.map(restore), orientedDecorV76: live.orientedDecorV76.map(restore) }, island = { x: 108, y: 108 };
  assert(api.isHomeworldInteriorWalkableV64(room, island, body), 'regression must preserve the locally valid island');
  assert.equal(api.nearestHomeworldInteriorTargetV64(room, island)?.pointId, 'dock-officer-point');
  // Independent reverse component search: a local proximity result alone
  // must not certify this northern island as connected to public entry.
  const component = [island], visited = new Set(['108,108']);
  for (let index = 0; index < component.length; index++) {
    const current = component[index];
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const next = { x: current.x + dx * 4, y: current.y + dy * 4 }, key = next.x + ',' + next.y;
      if (visited.has(key)) continue;
      if (![1, 2, 3, 4].every(unit => api.isHomeworldInteriorWalkableV64(room,
        { x: current.x + dx * unit, y: current.y + dy * unit }, body))) continue;
      visited.add(key); component.push(next);
    }
  }
  assert(component.every(point => Math.hypot(point.x - room.spawn.x, point.y - room.spawn.y) > 8), 'the real northern component stays separate from public spawn');
  const old = { x: 108, y: 189 }; assert(!api.isHomeworldInteriorWalkableV64(room, old, body));
  const path = homeworldInteriorPointPathFixture(api, room, 'dock-officer-point');
  validatePath(room, path, 'dock-officer-point');
  assert.notDeepEqual(path.at(-1), island);
  assert.deepEqual(homeworldInteriorPointFixture(api, room, 'dock-officer-point'), path.at(-1));
  // Mutation of returned fixture/path must not poison a future cached result.
  const expected = { ...path.at(-1) }, position = homeworldInteriorPointFixture(api, room, 'dock-officer-point');
  position.x = -100; path.at(-1).y = -100;
  assert.deepEqual(homeworldInteriorPointFixture(api, room, 'dock-officer-point'), expected);
});

test('live V89 dock reconnects the formerly isolated northern approach using the unchanged complete body', () => {
  const room = api.homeworldInteriorForBuildingV64('dock-control'), north = { x: 108, y: 108 };
  assert(api.isHomeworldInteriorWalkableV64(room, north, body));
  assert.equal(api.nearestHomeworldInteriorTargetV64(room, north)?.pointId, 'dock-officer-point');
  const component = [north], visited = new Set(['108,108']);
  for (let index = 0; index < component.length; index++) for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const current = component[index], next = { x: current.x + dx * 4, y: current.y + dy * 4 }, key = next.x + ',' + next.y;
    if (visited.has(key)) continue;
    if (![1, 2, 3, 4].every(unit => api.isHomeworldInteriorWalkableV64(room,
      { x: current.x + dx * unit, y: current.y + dy * unit }, body))) continue;
    visited.add(key); component.push(next);
  }
  assert(component.some(point => Math.hypot(point.x - room.spawn.x, point.y - room.spawn.y) < 8), 'real northern floor now reconnects to public spawn');
  validatePath(room, homeworldInteriorPointPathFixture(api, room, 'dock-officer-point'), 'dock-officer-point');
});

test('all fifteen preserved interior bindings have a constructive full-body route and exact target, without mutating geometry', () => {
  const before = JSON.stringify(api.HOMEWORLD_INTERIORS_V64); let count = 0;
  for (const [buildingId, ids] of Object.entries(api.HOMEWORLD_INTERIOR_BINDINGS_V64)) {
    const room = api.homeworldInteriorForBuildingV64(buildingId); assert(room);
    for (const id of ids) { validatePath(room, homeworldInteriorPointPathFixture(api, room, id), id); count++; }
  }
  assert.equal(count, 15);
  assert.equal(JSON.stringify(api.HOMEWORLD_INTERIORS_V64), before);
});

test('all forty-three actual interiors retain a full-body path from their real spawn to the real exit resolver', () => {
  assert.equal(api.HOMEWORLD_INTERIORS_V64.length, 43);
  for (const room of api.HOMEWORLD_INTERIORS_V64) validatePath(room, homeworldInteriorPointPathFixture(api, room, 'exit'), 'exit');
});
