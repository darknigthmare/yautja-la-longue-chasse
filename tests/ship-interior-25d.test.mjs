import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../app/game/systems/shipInterior25d.ts', import.meta.url))],
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'es2022', logLevel: 'silent',
});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const rooms = api.SHIP_INTERIOR_25D_ROOMS, metrics = api.SHIP_INTERIOR_25D_METRICS;
const ids = api.SHIP_INTERIOR_25D_ROOM_ORDER;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Follow the production controller to the requested point. This catches paths
 * that are graph-reachable but impossible for the actor's collision footprint. */
function walk(roomId, from, to) {
  const path = api.planShipInterior25dPath(roomId, from, to);
  assert.ok(path, `${roomId}: no path ${JSON.stringify(from)} -> ${JSON.stringify(to)}`);
  let actor = { ...from, facing: from.facing ?? 1 }, remaining = path.points.slice(1);
  const budget = Math.ceil(path.distance / metrics.speed * 60) + path.points.length + 10;
  let previous = actor;
  for (let frame = 0; remaining.length && frame <= budget; frame++) {
    const result = api.stepShipInterior25dPath(roomId, actor, remaining, 1 / 60);
    assert.equal(result.blocked, false, `${roomId}: blocked during actual travel`);
    actor = result.actor; remaining = result.remaining;
    assert.ok(api.isShipInterior25dWalkable(roomId, actor), `${roomId}: occupied footprint`);
    assert.ok(distance(actor, previous) <= metrics.speed / 60 + 1e-5, 'no snapping or speed burst');
    previous = actor;
  }
  assert.equal(remaining.length, 0, `${roomId}: failed to arrive within physical travel time`);
  assert.ok(distance(actor, to) < 0.06);
  return actor;
}

test('ground uses the exact Homeworld 35-degree orthographic projection and reversible height offset', () => {
  assert.equal(metrics.depthScale, Math.sin(35 * Math.PI / 180));
  for (const point of [{ x: 0, y: 0 }, { x: 1200, y: 800 }, { x: 351.75, y: 460.125 }]) {
    for (const elevation of [0, 150]) {
      const projected = api.projectShipInterior25d(point, elevation);
      assert.equal(projected.x, point.x);
      assert.ok(Math.abs(projected.y - (point.y * Math.sin(35 * Math.PI / 180) - elevation)) < 1e-8);
      const back = api.unprojectShipInterior25d(projected, elevation);
      assert.ok(distance(point, back) < 1e-8);
    }
  }
});

test('eight existing station identities form two connected decks with reciprocal bulkheads and paired lifts', () => {
  assert.deepEqual([...ids].sort(), ['galaxy-map', 'wall-armory', 'clan-archives', 'appearance-forge',
    'trophy-hall', 'medical-bay', 'training-arena', 'launch-airlock'].sort());
  assert.equal(ids.filter(id => rooms[id].deck === 'upper').length, 4);
  assert.equal(ids.filter(id => rooms[id].deck === 'lower').length, 4);
  let liftEnds = 0;
  for (const room of Object.values(rooms)) {
    assert.equal(room.station.id, room.id);
    for (const door of room.doors) {
      const next = rooms[door.targetRoomId];
      const reverse = next.doors.find(candidate => candidate.id === door.targetDoorId);
      assert.ok(reverse);
      assert.equal(reverse.targetDoorId, door.id);
      assert.equal(reverse.targetRoomId, room.id);
      assert.equal(reverse.kind, door.kind);
      if (door.kind === 'lift') { liftEnds++; assert.notEqual(room.deck, next.deck); }
      else assert.equal(room.deck, next.deck);
    }
    for (const target of ids) {
      const route = api.shipInterior25dRoomRoute(room.id, target);
      assert.equal(route[0], room.id); assert.equal(route.at(-1), target);
      for (let i = 1; i < route.length; i++) assert.ok(rooms[route[i - 1]].doors.some(door => door.targetRoomId === route[i]));
    }
  }
  assert.equal(liftEnds, 4);
  assert.deepEqual(api.shipInterior25dRoomRoute('missing-room', 'galaxy-map'), []);
});

test('every incoming threshold and safe spawn can reach its station and every outgoing threshold through real motion', () => {
  for (const room of Object.values(rooms)) {
    const starts = [api.shipInterior25dSpawn(room.id), ...room.doors.map(door => api.shipInterior25dSpawn(room.id, door.targetRoomId))];
    const targets = [room.station.approach, ...room.doors];
    for (const from of starts) for (const to of targets) walk(room.id, from, to);
    for (const door of room.doors) walk(room.id, room.station.approach, door);
  }
});

test('click travel reaches the far side of each installation without walking through its physical footprint', () => {
  for (const room of Object.values(rooms)) {
    const main = room.fixtures[0], box = main.footprint;
    const from = { x: main.x, y: box.y - metrics.actorHalfDepth - 28, facing: 1 };
    const to = room.station.approach;
    assert.ok(api.isShipInterior25dWalkable(room.id, from));
    assert.equal(api.isShipInterior25dSegmentWalkable(room.id, from, to), false);
    const path = api.planShipInterior25dPath(room.id, from, to);
    assert.ok(path); assert.ok(path.points.length > 2); assert.ok(path.distance > distance(from, to));
    walk(room.id, from, to);
  }
});

test('diagonal and analog motion are bounded, frame stalls cannot tunnel, and suspended movement is unchanged', () => {
  const actor = { x: 600, y: 660, facing: 1 }, step = 1 / 60;
  const straight = api.stepShipInterior25dActor('galaxy-map', actor, { x: 1, y: 0 }, step);
  const diagonal = api.stepShipInterior25dActor('galaxy-map', actor, { x: 1, y: 1 }, step);
  const analog = api.stepShipInterior25dActor('galaxy-map', actor, { x: 0.5, y: 0 }, step);
  assert.ok(Math.abs(distance(actor, straight) - distance(actor, diagonal)) < 1e-8);
  assert.ok(Math.abs(distance(actor, analog) * 2 - distance(actor, straight)) < 1e-8);
  const stall = api.stepShipInterior25dActor('galaxy-map', actor, { x: 1, y: 0 }, 100);
  assert.ok(distance(stall, actor) <= metrics.speed * metrics.maxFrameSeconds + 1e-8);
  assert.equal(api.stepShipInterior25dActor('galaxy-map', actor, { x: 1, y: 1 }, step, true), actor);
  for (const time of [-1, 0, NaN, Infinity]) assert.equal(api.stepShipInterior25dActor('galaxy-map', actor, { x: 1, y: 0 }, time), actor);
  assert.equal(api.stepShipInterior25dActor('galaxy-map', actor, { x: NaN, y: 1 }, step), actor);
});

test('held input stops at furniture and walls while preserving the full actor footprint', () => {
  let actor = { ...rooms['galaxy-map'].station.approach, facing: 1 };
  for (let i = 0; i < 120; i++) {
    actor = api.stepShipInterior25dActor('galaxy-map', actor, { x: 0, y: -1 }, 0.05);
    assert.ok(api.isShipInterior25dWalkable('galaxy-map', actor));
  }
  const main = rooms['galaxy-map'].fixtures[0];
  assert.ok(actor.y > main.footprint.y + main.footprint.depth + metrics.actorHalfDepth);
  assert.ok(actor.y < rooms['galaxy-map'].station.approach.y);
  actor = { x: 100, y: 680, facing: -1 };
  for (let i = 0; i < 120; i++) actor = api.stepShipInterior25dActor('galaxy-map', actor, { x: -1, y: 0 }, 0.05);
  assert.ok(actor.x >= metrics.floorInset + metrics.actorHalfWidth);
  assert.ok(api.isShipInterior25dWalkable('galaxy-map', actor));
});

test('door proximity never silently changes room and explicit crossing arrives outside the paired trigger', () => {
  for (const room of Object.values(rooms)) for (const door of room.doors) {
    assert.equal(api.shipInterior25dTransition(room.id, door.id, room.spawn), null);
    const arrived = walk(room.id, room.spawn, door);
    assert.equal(Object.hasOwn(arrived, 'roomId'), false);
    const interaction = api.nearbyShipInterior25dInteraction(room.id, arrived);
    assert.equal(interaction?.type, 'door'); assert.equal(interaction.door.id, door.id);
    const transition = api.shipInterior25dTransition(room.id, door.id, arrived);
    assert.ok(transition); assert.equal(transition.roomId, door.targetRoomId);
    assert.ok(api.isShipInterior25dWalkable(transition.roomId, transition.actor));
    assert.equal(api.canShipInterior25dTransition(transition.roomId, room.id, transition.actor), false, 'no immediate arrival bounce');
    assert.equal(api.shipInterior25dTransition(room.id, 'unknown-door', arrived), null);
  }
});

test('only the reachable station approach in the correct room enables a service or preparation observation', () => {
  for (const room of Object.values(rooms)) {
    assert.equal(api.isNearShipInterior25dStation(room.id, room.station.approach, room.id), true);
    assert.equal(api.nearbyShipInterior25dInteraction(room.id, room.station.approach)?.type, 'service');
    assert.equal(api.isNearShipInterior25dStation(room.id, room.spawn, room.id), false);
    assert.equal(api.isNearShipInterior25dStation(room.id, room.station.approach, ids.find(id => id !== room.id)), false);
    assert.equal(api.isNearShipInterior25dStation(room.id, room.fixtures[0], room.id), false, 'cannot inspect while embedded in a fixture');
    assert.equal(api.isNearShipInterior25dStation(room.id, { x: room.station.approach.x, y: room.station.approach.y + 65 }, room.id), false);
  }
});

test('invalid targets and stale routes are refused without teleporting or mutating inputs', () => {
  const from = api.shipInterior25dSpawn('galaxy-map'), before = structuredClone(from);
  for (const target of [{ x: -10, y: 100 }, { x: 600, y: 300 }, { x: NaN, y: 200 }, { x: 600, y: Infinity }]) {
    assert.equal(api.planShipInterior25dPath('galaxy-map', from, target), null);
  }
  assert.equal(api.planShipInterior25dPath('not-a-room', from, { x: 100, y: 600 }), null);
  const waypoints = [{ x: 600, y: 180 }], waypointBefore = structuredClone(waypoints);
  const blocked = api.stepShipInterior25dPath('galaxy-map', from, waypoints, 1 / 60);
  assert.equal(blocked.blocked, true); assert.equal(blocked.actor, from);
  const paused = api.stepShipInterior25dPath('galaxy-map', from, [{ x: 900, y: 660 }], 1, true);
  assert.equal(paused.actor, from); assert.equal(paused.arrived, false);
  assert.deepEqual(waypoints, waypointBefore); assert.deepEqual(from, before);
});

test('a complete tour uses all eight real services and both inter-deck links', () => {
  const circuit = ['galaxy-map', 'wall-armory', 'clan-archives', 'appearance-forge',
    'launch-airlock', 'training-arena', 'medical-bay', 'trophy-hall', 'galaxy-map'];
  let roomId = circuit[0], actor = api.shipInterior25dSpawn(roomId);
  const visited = new Set();
  for (const targetId of circuit.slice(1)) {
    const current = rooms[roomId];
    actor = walk(roomId, actor, current.station.approach);
    assert.equal(api.isNearShipInterior25dStation(roomId, actor), true); visited.add(roomId);
    const door = current.doors.find(candidate => candidate.targetRoomId === targetId);
    actor = walk(roomId, actor, door);
    const transition = api.shipInterior25dTransition(roomId, door.id, actor);
    assert.ok(transition); ({ roomId, actor } = transition);
  }
  assert.equal(visited.size, 8); assert.equal(roomId, 'galaxy-map');
});

test('camera remains finite and keeps actor feet inside desktop and narrow viewports', () => {
  for (const viewport of [{ width: 1440, height: 800 }, { width: 390, height: 500 }, { width: 320, height: 352 }]) {
    for (const actor of [rooms['galaxy-map'].spawn, { x: 60, y: 100 }, { x: 1130, y: 740 }]) {
      const camera = api.shipInterior25dCamera({ roomId: 'galaxy-map', actor, viewport });
      const feet = api.projectShipInterior25d(actor);
      for (const key of ['x', 'y', 'zoom', 'viewWidth', 'viewHeight']) assert.ok(Number.isFinite(camera[key]));
      assert.ok(feet.x >= camera.x && feet.x <= camera.x + camera.viewWidth);
      assert.ok(feet.y >= camera.y && feet.y <= camera.y + camera.viewHeight);
    }
  }
});
