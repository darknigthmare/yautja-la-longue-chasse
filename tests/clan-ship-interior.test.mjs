import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const api = qa.load('app/game/systems/clanShipInterior.ts');
const { CLAN_SHIP_ROOM_IDS } = qa.load('app/game/systems/clanShipDocking.ts');
const { CLAN_SHIP_INTERIOR_ROOMS: rooms, CLAN_SHIP_INTERIOR_METRICS: metrics } = api;
const span = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pointCopy = point => ({ x: point.x, y: point.y });

function walk(roomId, from, to) {
  const plan = api.planClanShipInteriorPath(roomId, from, to);
  assert(plan, `${roomId}: route must exist from ${JSON.stringify(from)} to ${JSON.stringify(to)}`);
  assert.deepEqual(plan.points[0], pointCopy(from));
  assert.deepEqual(plan.points.at(-1), pointCopy(to));
  assert(Math.abs(plan.distance - plan.points.slice(1).reduce((sum, point, index) => sum + span(plan.points[index], point), 0)) < 1e-6);
  let actor = { ...from, facing: 1 };
  let remaining = plan.points.slice(1);
  let steps = 0;
  while (remaining.length && steps++ < 1600) {
    const next = api.stepClanShipInteriorPath(roomId, actor, remaining, 1 / 60);
    assert.equal(next.blocked, false, 'planner edges must be traversable by the actual controller');
    assert(api.isClanShipInteriorWalkable(roomId, next.actor));
    assert(api.isClanShipInteriorSegmentWalkable(roomId, actor, next.actor));
    assert(span(actor, next.actor) <= metrics.speed / 60 + 1e-6);
    actor = next.actor; remaining = next.remaining;
  }
  assert(steps < 1600, 'bounded walk must finish');
  assert(span(actor, to) < 0.06, 'the physical motor reaches the requested point');
  return { actor, steps, plan };
}

test('all seven durable rooms have an authored physical room and two reciprocal doors', () => {
  assert.deepEqual(Object.keys(rooms).sort(), [...CLAN_SHIP_ROOM_IDS].sort());
  for (const room of Object.values(rooms)) {
    assert.equal(room.doors.length, 2);
    assert.equal(new Set(room.doors.map(door => door.targetRoomId)).size, 2);
    for (const door of room.doors) {
      assert.notEqual(door.targetRoomId, room.id);
      assert(rooms[door.targetRoomId].doors.some(reverse => reverse.targetRoomId === room.id));
    }
  }
});

test('new entry, every reverse doorway spawn, door points and service approaches have full actor clearance', () => {
  for (const room of Object.values(rooms)) {
    assert(api.isClanShipInteriorWalkable(room.id, api.clanShipInteriorSpawn(room.id)));
    assert(api.isClanShipInteriorWalkable(room.id, room.servicePoint));
    for (const door of room.doors) {
      assert(api.isClanShipInteriorWalkable(room.id, door));
      const spawn = api.clanShipInteriorSpawn(room.id, door.targetRoomId);
      assert(api.isClanShipInteriorWalkable(room.id, spawn));
      assert(span(spawn, door) > metrics.interactionReach, 'held confirmation cannot immediately return through the arrival door');
    }
  }
});

test('shortest interroom routes cover all 49 pairs without invented passages or more than 3 doors', () => {
  for (const from of CLAN_SHIP_ROOM_IDS) for (const to of CLAN_SHIP_ROOM_IDS) {
    const route = api.clanShipInteriorRoomRoute(from, to);
    assert.equal(route[0], from); assert.equal(route.at(-1), to);
    assert(route.length <= 4);
    assert.equal(new Set(route).size, route.length);
    for (let i = 1; i < route.length; i++) assert(rooms[route[i - 1]].doors.some(door => door.targetRoomId === route[i]));
  }
  for (const invalid of ['castle', '__proto__', '', null, 42]) {
    assert.deepEqual(api.clanShipInteriorRoomRoute(invalid, 'hangar'), []);
    assert.deepEqual(api.clanShipInteriorRoomRoute('hangar', invalid), []);
  }
});

test('the actual movement controller traverses every room service and both door directions', () => {
  for (const room of Object.values(rooms)) {
    const points = [api.clanShipInteriorSpawn(room.id), room.servicePoint, ...room.doors];
    for (const from of points) for (const to of points) walk(room.id, from, to);
  }
});

test('cross-ship routes walk to each threshold and from the paired spawn, ending within reach of the real service', () => {
  for (const from of CLAN_SHIP_ROOM_IDS) for (const to of CLAN_SHIP_ROOM_IDS) {
    let occupied = from;
    let actor = api.clanShipInteriorSpawn(from);
    const route = api.clanShipInteriorRoomRoute(from, to);
    let steps = 0;
    for (const nextRoom of route.slice(1)) {
      const door = rooms[occupied].doors.find(candidate => candidate.targetRoomId === nextRoom);
      assert(!api.canClanShipInteriorTransition(occupied, nextRoom, actor));
      const result = walk(occupied, actor, door); steps += result.steps; actor = result.actor;
      assert(api.canClanShipInteriorTransition(occupied, nextRoom, actor));
      actor = api.clanShipInteriorSpawn(nextRoom, occupied); occupied = nextRoom;
    }
    const arrived = walk(occupied, actor, rooms[to].servicePoint); steps += arrived.steps;
    assert.equal(api.nearbyClanShipInteriorInteraction(to, arrived.actor).type, 'service');
    if (from !== to) assert(steps > 20, 'room targeting has a physical journey, not an instantaneous teleport');
    assert(steps / 60 < 25, 'all authored routes fit the real-browser wait budget');
  }
});

test('route planner refuses occupied and off-deck targets instead of silently snapping or claiming arrival', () => {
  for (const room of Object.values(rooms)) {
    const origin = api.clanShipInteriorSpawn(room.id);
    for (const { footprint } of room.fixtures) {
      const blocked = { x: footprint.x + footprint.width / 2, y: footprint.y + footprint.height / 2 };
      assert.equal(api.isClanShipInteriorWalkable(room.id, blocked), false);
      assert.equal(api.planClanShipInteriorPath(room.id, origin, blocked), null);
      assert.equal(api.planClanShipInteriorPath(room.id, blocked, origin), null);
    }
    for (const point of [{ x: 0, y: 645 }, { x: 1440, y: 645 }, { x: 900, y: 480 }, { x: 900, y: 799 }, { x: NaN, y: 640 }, { x: 900, y: Infinity }]) {
      assert.equal(api.planClanShipInteriorPath(room.id, origin, point), null);
    }
  }
});

test('a route across an actual fixture uses clear corners and is followed without cutting through its footprint', () => {
  const from = { x: 560, y: 560 };
  const to = { x: 910, y: 560 };
  assert(api.isClanShipInteriorWalkable('conseil', from));
  assert(api.isClanShipInteriorWalkable('conseil', to));
  assert.equal(api.isClanShipInteriorSegmentWalkable('conseil', from, to), false);
  const { plan, steps } = walk('conseil', from, to);
  assert(plan.points.length > 2);
  assert(plan.distance > span(from, to));
  assert(steps > 60);
});

test('direct movement cannot leave any of the four floor boundaries, including a very long resumed frame', () => {
  const { floor, actorRadius } = metrics;
  const cases = [
    [{ x: floor.x + actorRadius, y: 650 }, { x: -1, y: 0 }],
    [{ x: floor.x + floor.width - actorRadius, y: 650 }, { x: 1, y: 0 }],
    [{ x: 200, y: floor.y + actorRadius }, { x: 0, y: -1 }],
    [{ x: 200, y: floor.y + floor.height - actorRadius }, { x: 0, y: 1 }],
  ];
  for (const roomId of CLAN_SHIP_ROOM_IDS) for (const [point, direction] of cases) {
    const actor = { ...point, facing: 1 };
    assert(api.isClanShipInteriorWalkable(roomId, actor));
    assert.deepEqual(api.stepClanShipInteriorActor(roomId, actor, direction, 120), actor);
  }
});

test('manual motion stops at a fixture and can slide along its side without tunnelling', () => {
  let actor = { x: 550, y: 555, facing: 1 };
  for (let index = 0; index < 90; index++) {
    const before = actor;
    actor = api.stepClanShipInteriorActor('conseil', actor, { x: 1, y: 0 }, 1 / 60);
    assert(api.isClanShipInteriorWalkable('conseil', actor));
    assert(api.isClanShipInteriorSegmentWalkable('conseil', before, actor));
  }
  assert(actor.x < 590 - metrics.actorRadius);
  const stopped = actor;
  for (let index = 0; index < 90; index++) actor = api.stepClanShipInteriorActor('conseil', actor, { x: 1, y: 1 }, 1 / 60);
  assert(actor.x > stopped.x + 100, 'foreground lane permits a genuine detour');
  assert(api.isClanShipInteriorWalkable('conseil', actor));
});

test('diagonal input cannot move faster than cardinal input and analog input preserves low speed', () => {
  const actor = { x: 250, y: 645, facing: 1 };
  const straight = api.stepClanShipInteriorActor('hangar', actor, { x: 1, y: 0 }, 1 / 60);
  const diagonal = api.stepClanShipInteriorActor('hangar', actor, { x: 1, y: -1 }, 1 / 60);
  const slow = api.stepClanShipInteriorActor('hangar', actor, { x: 0.25, y: 0 }, 1 / 60);
  assert(Math.abs(span(straight, actor) - 5) < 1e-8);
  assert(Math.abs(span(diagonal, actor) - 5) < 1e-8);
  assert(Math.abs(span(slow, actor) - 1.25) < 1e-8);
  const huge = api.stepClanShipInteriorActor('hangar', actor, { x: 1e8, y: 0 }, 500);
  assert(span(huge, actor) <= metrics.speed * metrics.maxFrameSeconds + 1e-8);
});

test('zero, negative and nonfinite time or inputs cannot move the hunter', () => {
  const actor = Object.freeze({ x: 250, y: 645, facing: 1 });
  for (const delta of [0, -1, NaN, Infinity]) assert.equal(api.stepClanShipInteriorActor('hangar', actor, { x: 1, y: 0 }, delta), actor);
  for (const vector of [{ x: NaN, y: 0 }, { x: 0, y: Infinity }]) assert.equal(api.stepClanShipInteriorActor('hangar', actor, vector, 1 / 60), actor);
  const path = [{ x: 900, y: 645 }];
  const pause = api.stepClanShipInteriorPath('hangar', actor, path, 0);
  assert.equal(pause.actor, actor); assert.deepEqual(pause.remaining, path); assert.equal(pause.arrived, false);
});

test('service and door interactions require measured physical proximity; a distant or unrelated door never transitions', () => {
  for (const room of Object.values(rooms)) {
    assert.equal(api.nearbyClanShipInteriorInteraction(room.id, api.clanShipInteriorSpawn(room.id)), null);
    assert.equal(api.nearbyClanShipInteriorInteraction(room.id, room.servicePoint).type, 'service');
    for (const door of room.doors) {
      const interaction = api.nearbyClanShipInteriorInteraction(room.id, door);
      assert.equal(interaction.type, 'door');
      assert.equal(interaction.point.targetRoomId, door.targetRoomId);
      assert(api.canClanShipInteriorTransition(room.id, door.targetRoomId, door));
      for (const destination of CLAN_SHIP_ROOM_IDS.filter(id => id !== door.targetRoomId)) {
        assert.equal(api.canClanShipInteriorTransition(room.id, destination, door), false);
      }
    }
  }
});

test('paths and actor stepping do not mutate room definitions, caller positions or previous routes', () => {
  const before = JSON.stringify(rooms);
  const from = Object.freeze({ x: 560, y: 560 });
  const to = Object.freeze({ x: 910, y: 560 });
  const route = api.planClanShipInteriorPath('conseil', from, to);
  const original = structuredClone(route);
  api.stepClanShipInteriorPath('conseil', { ...from, facing: 1 }, route.points, 1 / 60);
  assert.deepEqual(route, original);
  route.points[0].x = -999;
  assert.deepEqual(api.planClanShipInteriorPath('conseil', from, to), original);
  assert.equal(JSON.stringify(rooms), before);
});

const neutral = { identity: '0:controller', x: 0, y: 0, confirm: false, back: false, start: false };
function padRun(samples, state = api.freshClanShipInteriorPad()) {
  return samples.map(sample => { const result = api.stepClanShipInteriorPad(state, sample); state = result.state; return result; });
}

test('a gamepad held while boarding must become completely neutral before movement or confirmation is admitted', () => {
  const results = padRun([
    { ...neutral, x: 1, confirm: true }, { ...neutral, x: 1 }, { ...neutral, confirm: true }, neutral,
    { ...neutral, x: 1, confirm: true }, { ...neutral, x: 1, confirm: true },
  ]);
  for (const result of results.slice(0, 4)) {
    assert.equal(result.x, 0); assert.equal(result.y, 0); assert.equal(result.interact, false);
  }
  assert.equal(results[4].x, 1); assert.equal(results[4].interact, true);
  assert.equal(results[5].x, 1); assert.equal(results[5].interact, false);
});

test('confirm, Back and Start fire on edges, with settings then Back taking priority over an ambiguous confirm', () => {
  const results = padRun([neutral, { ...neutral, confirm: true }, { ...neutral, confirm: true }, neutral,
    { ...neutral, confirm: true, back: true }, neutral, { ...neutral, confirm: true, back: true, start: true }]);
  assert.equal(results[1].interact, true); assert.equal(results[2].interact, false);
  assert.equal(results[4].back, true); assert.equal(results[4].interact, false);
  assert.equal(results[6].settings, true); assert.equal(results[6].back, false); assert.equal(results[6].interact, false);
});

test('controller replacement, missing device and every new context reset the neutral gate', () => {
  const ready = api.stepClanShipInteriorPad(api.freshClanShipInteriorPad(), neutral).state;
  const swapped = api.stepClanShipInteriorPad(ready, { ...neutral, identity: '1:other', confirm: true, x: -1 });
  assert.equal(swapped.interact, false); assert.equal(swapped.x, 0); assert.equal(swapped.state.ready, false);
  assert.deepEqual(api.stepClanShipInteriorPad(ready, null).state, api.freshClanShipInteriorPad());
  const invalid = api.stepClanShipInteriorPad(ready, { ...neutral, x: Infinity });
  assert.deepEqual(invalid.state, api.freshClanShipInteriorPad());
  const resumed = api.stepClanShipInteriorPad(api.freshClanShipInteriorPad(), { ...neutral, back: true });
  assert.equal(resumed.back, false);
});

test('analog dead zone removes jitter, keeps partial travel and clamps over-range axes', () => {
  const ready = api.stepClanShipInteriorPad(api.freshClanShipInteriorPad(), neutral).state;
  const quiet = api.stepClanShipInteriorPad(ready, { ...neutral, x: .19, y: -.2 });
  assert.equal(quiet.x, 0); assert.equal(quiet.y, 0);
  const half = api.stepClanShipInteriorPad(ready, { ...neutral, x: .6, y: -.6 });
  assert(Math.abs(half.x - .5) < 1e-8); assert(Math.abs(half.y + .5) < 1e-8);
  const clamped = api.stepClanShipInteriorPad(ready, { ...neutral, x: 10, y: -10 });
  assert.equal(clamped.x, 1); assert.equal(clamped.y, -1);
});
