import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const castle = qa.load('app/game/systems/wolfCastle.ts');
const { SHIP_IDS } = qa.load('app/game/shipCatalogue.ts');
const ownerCreatedAt = '2026-11-04T08:00:00.000Z';
const personalShipId = 'classic-predator-spaceship';
const context = Object.freeze({ ownerCreatedAt, personalShipId });
const fresh = (options = {}) => castle.createWolfCastleVisit(ownerCreatedAt, personalShipId, options);

function act(state, action, current = context) {
  const before = JSON.stringify(state);
  const result = castle.actWolfCastle(state, action, current);
  assert.equal(result.accepted, true, result.message);
  assert.equal(result.reason, null);
  assert.equal(JSON.stringify(state), before, 'commands never mutate the durable source');
  assert.equal(castle.inspectWolfCastleVisit(result.state, current.ownerCreatedAt).status, 'valid');
  return result.state;
}
function move(state, destination) {
  for (const roomId of castle.wolfCastleRoute(state.roomId, destination).slice(1)) state = act(state, { type: 'move-room', roomId });
  assert.equal(state.roomId, destination);
  return state;
}
function denied(state, action, current = context, reason) {
  const before = JSON.stringify(state), result = castle.actWolfCastle(state, action, current);
  assert.equal(result.accepted, false);
  assert.equal(result.changed, false);
  assert.equal(result.state, state);
  assert.equal(JSON.stringify(state), before);
  if (reason) assert.equal(result.reason, reason);
  return result;
}

test('castle identity is separate and old saves remain absent rather than auto-starting a visit', () => {
  for (const raw of [undefined, null]) assert.equal(castle.inspectWolfCastleVisit(raw, ownerCreatedAt).status, 'absent');
  assert.equal(fresh().locationId, 'wolf-orbital-castle');
  assert.notEqual(fresh().locationId, personalShipId);
  assert.notEqual(fresh().locationId, 'avp-clan-mothership');
  assert.equal(fresh().status, 'approach');
  for (const ship of SHIP_IDS) assert.equal(castle.createWolfCastleVisit(ownerCreatedAt, ship).personalShipId, ship);
});

test('constructor requires bounded owner, catalogue hull, and invitation for an audience visit', () => {
  for (const owner of ['', ' ', ' owner', 'owner\n', 'a'.repeat(161), null, 9]) assert.throws(() => castle.createWolfCastleVisit(owner, personalShipId), TypeError);
  for (const hull of ['', '__proto__', 'avp-clan-mothership', 'wolf-orbital-castle', 7]) assert.throws(() => castle.createWolfCastleVisit(ownerCreatedAt, hull), TypeError);
  for (const options of [{ mode: 'audience' }, { mode: 'unknown' }, { invitationId: ' invitation' }, { invitationId: 'x'.repeat(161) }]) assert.throws(() => fresh(options), TypeError);
  assert.equal(fresh({ mode: 'audience', invitationId: 'wolf-protocol:introduction' }).mode, 'audience');
  assert.equal(fresh({ mode: 'trial' }).mode, 'trial');
});

test('unknown fields, future versions, foreign owners, impossible entries and corrupt progress are refused', () => {
  assert.equal(castle.inspectWolfCastleVisit({ ...fresh(), version: castle.WOLF_CASTLE_VERSION + 1, futureField: 3 }, ownerCreatedAt).status, 'future-version');
  assert.equal(castle.inspectWolfCastleVisit(fresh(), 'another-campaign').reason, 'owner-mismatch');
  const corrupt = [
    { extra: true }, { version: 0 }, { locationId: 'avp-clan-mothership' }, { status: 'hidden' },
    { roomId: 'royal-audience' }, { entryFrom: 'royal-airlock' }, { invitationId: 42 },
    { visitedRooms: [] }, { visitedRooms: ['royal-berth', 'royal-berth'] }, { visitedRooms: ['royal-berth', 'missing-room'] },
    { audience: 'pending' }, { archiveRead: true }, { archiveRead: 'yes' },
    { trial: { status: 'complete', progress: 3, attempts: 0 } },
    { trial: { status: 'idle', progress: 1, attempts: 0 } },
    { trial: { status: 'active', progress: 4, attempts: 1 } },
    { trial: { status: 'active', progress: 0, attempts: 1 } },
    { trial: { status: 'idle', progress: 0, attempts: 10000 } },
  ];
  for (const patch of corrupt) assert.equal(castle.inspectWolfCastleVisit({ ...fresh(), ...patch }, ownerCreatedAt).status, 'invalid-save', JSON.stringify(patch));
  for (const raw of [[], 'string', 5, new Date(), Object.create({ version: 1 })]) assert.equal(castle.inspectWolfCastleVisit(raw, ownerCreatedAt).status, 'invalid-save');
});

test('boarding, every room, departure and return retain the exact owner and hull', () => {
  let state = act(fresh(), { type: 'board' });
  for (const destination of castle.WOLF_CASTLE_ROOM_IDS) {
    state = move(state, destination);
    assert.equal(state.personalShipId, personalShipId);
    assert.equal(state.ownerCreatedAt, ownerCreatedAt);
    const roundtrip = castle.inspectWolfCastleVisit(JSON.parse(JSON.stringify(state)), ownerCreatedAt);
    assert.deepEqual(roundtrip.state, state);
    assert.notEqual(roundtrip.state.visitedRooms, state.visitedRooms);
    assert.notEqual(roundtrip.state.trial, state.trial);
  }
  assert.equal(state.visitedRooms.length, 9);
  state = move(state, 'royal-berth');
  state = act(state, { type: 'depart' });
  assert.equal(state.status, 'departed');
  assert.equal(state.entryFrom, null);
  assert.equal(state.visitedRooms.length, 9);
  const hull = SHIP_IDS.find(ship => ship !== personalShipId);
  state = act(state, { type: 'approach' }, { ownerCreatedAt, personalShipId: hull });
  assert.equal(state.personalShipId, hull);
  assert.equal(state.status, 'approach');
});

test('room transitions follow the physical graph, cannot depart from a distant room, and do not skip boarding', () => {
  denied(fresh(), { type: 'move-room', roomId: 'royal-audience' }, context, 'not-aboard');
  const aboard = act(fresh(), { type: 'board' });
  denied(aboard, { type: 'move-room', roomId: 'royal-audience' }, context, 'not-connected');
  denied(aboard, { type: 'board' }, context, 'invalid-transition');
  const gallery = move(aboard, 'royal-gallery');
  denied(gallery, { type: 'depart' }, context, 'return-to-berth');
  const same = castle.actWolfCastle(gallery, { type: 'move-room', roomId: gallery.roomId }, context);
  assert.equal(same.accepted, true); assert.equal(same.changed, false); assert.equal(same.state, gallery);
});

test('commands reject foreign campaign, changed hull, unknown payload and future state before modifying anything', () => {
  const state = act(fresh(), { type: 'board' });
  denied(state, { type: 'depart' }, { ...context, ownerCreatedAt: 'foreign' }, 'owner-mismatch');
  denied(state, { type: 'depart' }, { ...context, personalShipId: SHIP_IDS.find(ship => ship !== personalShipId) }, 'personal-ship-mismatch');
  denied(state, { type: 'depart' }, { ...context, personalShipId: 'unknown' }, 'invalid-context');
  denied({ ...state, version: castle.WOLF_CASTLE_VERSION + 1 }, { type: 'depart' }, context, 'unsupported-version');
  for (const action of [null, [], 'board', { type: 'depart', extra: 1 }, { type: 'move-room', roomId: '__proto__' }, { type: 'activate-seal', sealId: 'fake' }, { type: 'teleport' }]) denied(state, action, context, 'invalid-action');
});

test('an invitation gates only the audience; all nine rooms and the return path remain open in hub mode', () => {
  let state = act(fresh(), { type: 'board' });
  state = move(state, 'royal-audience');
  denied(state, { type: 'hear-audience' }, context, 'invitation-required');
  state = move(state, 'royal-council');
  denied(state, { type: 'decide-audience', decision: 'accepted' }, context, 'audience-required');
  for (const id of castle.WOLF_CASTLE_ROOM_IDS) {
    const outward = castle.wolfCastleRoute('royal-berth', id), homeward = castle.wolfCastleRoute(id, 'royal-berth');
    assert.equal(outward.at(-1), id); assert.equal(homeward.at(-1), 'royal-berth');
    assert.ok(homeward.length <= 6);
  }
});

test('audience can be deferred then accepted once, with no fabricated reward or mission launch', () => {
  let state = act(fresh({ mode: 'audience', invitationId: 'wolf-protocol:introduction' }), { type: 'board' });
  denied(state, { type: 'hear-audience' }, context, 'wrong-room');
  state = move(state, 'royal-audience');
  state = act(state, { type: 'hear-audience' });
  assert.equal(state.audience, 'pending');
  const repeat = castle.actWolfCastle(state, { type: 'hear-audience' }, context);
  assert.equal(repeat.changed, false); assert.equal(repeat.state, state);
  state = move(state, 'royal-council');
  state = act(state, { type: 'decide-audience', decision: 'deferred' });
  assert.equal(state.audience, 'deferred');
  state = act(state, { type: 'decide-audience', decision: 'accepted' });
  const before = JSON.stringify(state);
  assert.equal(castle.actWolfCastle(state, { type: 'decide-audience', decision: 'accepted' }, context).changed, false);
  denied(state, { type: 'decide-audience', decision: 'deferred' }, context, 'decision-final');
  assert.equal(JSON.stringify(state), before);
  assert.equal(Object.hasOwn(state, 'rewards'), false); assert.equal(Object.hasOwn(state, 'missionId'), false);
});

test('archives can be consulted only in their room and their acknowledgement is idempotent', () => {
  let state = act(fresh(), { type: 'board' });
  denied(state, { type: 'read-archive' }, context, 'wrong-room');
  state = move(state, 'royal-archives'); state = act(state, { type: 'read-archive' });
  assert.equal(state.archiveRead, true);
  assert.equal(castle.actWolfCastle(state, { type: 'read-archive' }, context).changed, false);
  state = move(state, 'royal-berth'); state = act(state, { type: 'depart' });
  assert.equal(state.archiveRead, true);
});

test('three seals form a playable ordered puzzle; wrong next seal resets and finishing needs the final console', () => {
  let state = move(act(fresh({ mode: 'trial' }), { type: 'board' }), 'royal-court');
  denied(state, { type: 'activate-seal', sealId: 'threshold' }, context, 'trial-not-active');
  state = act(state, { type: 'start-trial' });
  assert.equal(state.trial.attempts, 1);
  state = act(state, { type: 'activate-seal', sealId: 'threshold' });
  assert.equal(state.trial.progress, 1);
  assert.equal(castle.actWolfCastle(state, { type: 'activate-seal', sealId: 'threshold' }, context).changed, false);
  state = act(state, { type: 'activate-seal', sealId: 'return' });
  assert.equal(state.trial.progress, 0);
  denied(state, { type: 'finish-trial' }, context, 'seals-incomplete');
  for (const sealId of castle.WOLF_CASTLE_SEALS) state = act(state, { type: 'activate-seal', sealId });
  assert.equal(state.trial.status, 'active'); assert.equal(state.trial.progress, 3);
  state = act(state, { type: 'finish-trial' });
  assert.equal(state.trial.status, 'complete');
  state = move(state, 'royal-berth'); state = act(state, { type: 'depart' });
  assert.equal(state.trial.status, 'complete');
});

test('leaving a running trial preserves its checkpoint and cancelling never locks a return door', () => {
  let state = move(act(fresh(), { type: 'board' }), 'royal-court');
  state = act(state, { type: 'start-trial' }); state = act(state, { type: 'activate-seal', sealId: 'threshold' });
  state = move(state, 'royal-service-pass');
  assert.equal(state.trial.progress, 1);
  denied(state, { type: 'activate-seal', sealId: 'zenith' }, context, 'wrong-room');
  state = castle.inspectWolfCastleVisit(JSON.parse(JSON.stringify(state)), ownerCreatedAt).state;
  state = move(state, 'royal-court'); state = act(state, { type: 'activate-seal', sealId: 'zenith' });
  assert.equal(state.trial.progress, 2);
  state = act(state, { type: 'cancel-trial' });
  assert.equal(state.trial.status, 'idle'); assert.equal(state.trial.progress, 0); assert.equal(state.trial.attempts, 1);
  state = act(state, { type: 'start-trial' }); assert.equal(state.trial.attempts, 2);
  state = move(state, 'royal-berth'); state = act(state, { type: 'depart' });
  assert.equal(state.status, 'departed');
});

test('every physical doorway is reciprocal and each saved room entrance is safe', () => {
  for (const room of castle.WOLF_CASTLE_ROOMS) {
    const neighbours = castle.wolfCastleNeighbours(room.id);
    assert.equal(new Set(room.stations.map(station => station.id)).size, room.stations.length);
    for (const neighbour of neighbours) {
      assert.ok(castle.wolfCastleNeighbours(neighbour).includes(room.id), `${room.id} -> ${neighbour} return door`);
      const spawn = castle.wolfCastleEntryPoint(room.id, neighbour);
      assert.ok(castle.isWolfCastlePointWalkable(room.id, spawn), `${room.id} from ${neighbour}: ${JSON.stringify(spawn)}`);
    }
    for (const station of room.stations) assert.ok(castle.isWolfCastlePointWalkable(room.id, station), `${room.id}: ${station.id} must have a free use position`);
  }
});

function walk(roomId, start, target) {
  let point = { ...start };
  const path = castle.wolfCastleWalkPath(roomId, point, target);
  assert.ok(path.length, `${roomId}: path from ${JSON.stringify(start)} to ${JSON.stringify(target)}`);
  for (const waypoint of path) {
    let iterations = 0;
    while (Math.hypot(waypoint.x - point.x, waypoint.y - point.y) >= 4 && iterations < 2000) {
      const distance = Math.hypot(waypoint.x - point.x, waypoint.y - point.y);
      const divisor = Math.max(distance, castle.WOLF_CASTLE_WORLD.actorSpeed * .016);
      point = castle.stepWolfCastleActor(roomId, point, { x: (waypoint.x - point.x) / divisor, y: (waypoint.y - point.y) / divisor }, 16);
      assert.ok(castle.isWolfCastlePointWalkable(roomId, point));
      iterations++;
    }
    assert.ok(iterations < 2000, `${roomId} actor must reach each waypoint`);
  }
  assert.ok(Math.hypot(point.x - target.x, point.y - target.y) < 5);
  return point;
}

test('the real movement motor reaches every station from every safe entry without crossing a solid', () => {
  for (const room of castle.WOLF_CASTLE_ROOMS) {
    for (const entry of [null, ...castle.wolfCastleNeighbours(room.id)]) {
      const spawn = castle.wolfCastleEntryPoint(room.id, entry);
      assert.ok(castle.isWolfCastlePointWalkable(room.id, spawn));
      for (const station of room.stations) walk(room.id, spawn, station);
    }
  }
});

test('pointer routes go around an obstacle instead of moving through the painted prop footprint', () => {
  const roomId = 'royal-council', start = { x: 600, y: 520 }, target = { x: 1000, y: 520 };
  const path = castle.wolfCastleWalkPath(roomId, start, target);
  assert.ok(path.length >= 3);
  assert.ok(path.some(point => point.y >= 578), 'route uses the free lane in front of the table');
  walk(roomId, start, target);
  assert.deepEqual(castle.wolfCastleWalkPath(roomId, start, { x: 800, y: 525 }), []);
});

test('movement is bounded, normalized diagonally, frame-rate stable and cannot tunnel through solids', () => {
  const roomId = 'royal-court', start = { x: 800, y: 612 };
  const diagonal = castle.stepWolfCastleActor(roomId, start, { x: 1, y: 1 }, 16);
  const straight = castle.stepWolfCastleActor(roomId, start, { x: 1, y: 0 }, 16);
  assert.ok(Math.abs(Math.hypot(diagonal.x - start.x, diagonal.y - start.y) - (straight.x - start.x)) < 1e-8);
  const slowFrames = Array.from({ length: 30 }).reduce(point => castle.stepWolfCastleActor(roomId, point, { x: 1, y: 0 }, 1000 / 30), start);
  const fastFrames = Array.from({ length: 60 }).reduce(point => castle.stepWolfCastleActor(roomId, point, { x: 1, y: 0 }, 1000 / 60), start);
  assert.ok(Math.abs(slowFrames.x - fastFrames.x) < 1e-7);
  const wake = castle.stepWolfCastleActor(roomId, start, { x: 1, y: 0 }, 500000);
  assert.ok(wake.x - start.x <= castle.WOLF_CASTLE_WORLD.actorSpeed * .05 + 1e-7);
  let blocked = { x: 620, y: 520 };
  for (let frame = 0; frame < 100; frame++) blocked = castle.stepWolfCastleActor('royal-council', blocked, { x: 1, y: 0 }, 5000);
  assert.ok(blocked.x < 627, 'the expanded table footprint stops the actor');
  for (const input of [{ x: NaN, y: 0 }, { x: 0, y: Infinity }, { x: 0, y: 0 }]) assert.equal(castle.stepWolfCastleActor(roomId, start, input, 16), start);
  for (const delta of [NaN, Infinity, -10, 0]) assert.equal(castle.stepWolfCastleActor(roomId, start, { x: 1, y: 0 }, delta), start);
});

test('interaction radius is physical and the room owns all of its station identities', () => {
  for (const room of castle.WOLF_CASTLE_ROOMS) {
    for (const station of room.stations) assert.equal(castle.wolfCastleNearestStation(room.id, station)?.id, station.id);
    assert.equal(castle.wolfCastleNearestStation(room.id, { x: -1000, y: -1000 }), null);
  }
});

test('objective text follows durable audience and trial progress', () => {
  let state = act(fresh({ mode: 'audience', invitationId: 'wolf-protocol:introduction' }), { type: 'board' });
  assert.match(castle.wolfCastleObjective(state), /invitation/);
  state = move(state, 'royal-audience'); state = act(state, { type: 'hear-audience' });
  assert.match(castle.wolfCastleObjective(state), /conseil/);
  state = move(state, 'royal-court'); state = act(state, { type: 'start-trial' });
  assert.match(castle.wolfCastleObjective(state), /Seuil/);
  for (const sealId of castle.WOLF_CASTLE_SEALS) state = act(state, { type: 'activate-seal', sealId });
  assert.match(castle.wolfCastleObjective(state), /pupitre/);
});
