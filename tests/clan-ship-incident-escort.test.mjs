import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const api = qa.load('app/game/systems/clanShipIncidentEscort.ts');
const interior = qa.load('app/game/systems/clanShipInterior.ts');
const incidents = qa.load('app/game/systems/clanShipIncidents.ts');
const span = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function follow(roomId, from, leader, frames = 600) {
  let state = api.createClanShipEscortMotion(from);
  let movingFrames = 0;
  let travelled = 0;
  for (let index = 0; index < frames; index++) {
    const before = state;
    state = api.stepClanShipEscortMotion(roomId, state, leader, 1 / 60);
    assert.equal(state.blocked, false);
    assert(interior.isClanShipInteriorWalkable(roomId, state.actor));
    assert(interior.isClanShipInteriorSegmentWalkable(roomId, before.actor, state.actor));
    assert(span(before.actor, state.actor) <= api.CLAN_SHIP_ESCORT_MOTION.speed / 60 + 1e-7);
    movingFrames += Number(state.moving);
    travelled += span(before.actor, state.actor);
  }
  return { state, movingFrames, travelled };
}

test('returning hunter physically follows to the hangar exit and stays at a readable following distance', () => {
  const leader = { x: 128, y: 635 };
  const { state, movingFrames } = follow('hangar', { x: 410, y: 650 }, leader);
  assert(movingFrames > 40, 'this is a visible traversal, not a checkpoint teleport');
  assert(span(state.actor, leader) <= 47);
  assert(span(state.actor, leader) >= 45, 'the scout does not occupy the leader feet');
  assert.equal(state.moving, false);
  assert(state.pathBuilds <= 3, 'a stationary destination does not rebuild a path every frame');
});

test('the actual motor detours around a medical fixture and reaches the station without cutting through it', () => {
  const from = { x: 900, y: 520 };
  const leader = { x: 550, y: 520 };
  assert(interior.isClanShipInteriorWalkable('soins', from));
  assert(interior.isClanShipInteriorWalkable('soins', leader));
  assert.equal(interior.isClanShipInteriorSegmentWalkable('soins', from, leader), false);
  const { state, movingFrames, travelled } = follow('soins', from, leader);
  assert(movingFrames > 60);
  assert(travelled > span(from, leader) - api.CLAN_SHIP_ESCORT_MOTION.followDistance, 'a measured detour is longer than the direct blocked segment');
  assert(span(state.actor, leader) <= 47);
  assert.equal(state.blocked, false);
});

test('medical entry to station is traversed and each endpoint permits two actors inside the 64-unit checkpoint reach', () => {
  const entry = { x: 1312, y: 635 };
  const station = { x: 920, y: 640 };
  const { state, movingFrames } = follow('soins', entry, station);
  assert(movingFrames > 65);
  assert(span(state.actor, station) < interior.CLAN_SHIP_INTERIOR_METRICS.interactionReach);
  assert(span(state.actor, station) > interior.CLAN_SHIP_INTERIOR_METRICS.actorRadius * 2);
});

test('pause, invalid time and a long resumed frame cannot advance the scout or its phase beyond the bounded motor', () => {
  const started = api.stepClanShipEscortMotion('hangar', api.createClanShipEscortMotion({ x: 410, y: 650 }), { x: 128, y: 635 }, 1 / 60);
  for (const elapsed of [0, -1, NaN, Infinity]) {
    const paused = api.stepClanShipEscortMotion('hangar', started, { x: 128, y: 635 }, elapsed);
    assert.deepEqual(paused.actor, started.actor);
    assert.equal(paused.phase, started.phase);
    assert.equal(paused.moving, false);
  }
  const suspended = api.stepClanShipEscortMotion('hangar', started, { x: 128, y: 635 }, 3, false);
  assert.deepEqual(suspended.actor, started.actor);
  assert.equal(suspended.phase, started.phase);
  const resumed = api.stepClanShipEscortMotion('hangar', suspended, { x: 128, y: 635 }, 60);
  assert(span(resumed.actor, suspended.actor) <= api.CLAN_SHIP_ESCORT_MOTION.speed * interior.CLAN_SHIP_INTERIOR_METRICS.maxFrameSeconds + 1e-7);
});

test('a moving leader triggers bounded replanning, reversals and a final stop instead of stale path chasing', () => {
  let state = api.createClanShipEscortMotion({ x: 410, y: 650 });
  for (let index = 0; index < 120; index++) {
    const target = { x: 500 + index * 2, y: 650 };
    state = api.stepClanShipEscortMotion('hangar', state, target, 1 / 60);
  }
  assert(state.pathBuilds > 3 && state.pathBuilds < 20);
  const reversal = { x: 150, y: 645 };
  const previousBuilds = state.pathBuilds;
  state = api.stepClanShipEscortMotion('hangar', state, reversal, 1 / 60);
  assert.equal(state.pathBuilds, previousBuilds + 1);
  for (let index = 0; index < 240; index++) state = api.stepClanShipEscortMotion('hangar', state, reversal, 1 / 60);
  assert(span(state.actor, reversal) <= 47);
  assert.equal(state.actor.facing, -1);
  assert.equal(state.moving, false);
});

test('invalid positions cannot produce a made-up route or silently teleport the returning hunter', () => {
  const before = api.createClanShipEscortMotion({ x: 410, y: 650 });
  for (const leader of [{ x: NaN, y: 635 }, { x: 0, y: 0 }, { x: 620, y: 550 }]) {
    const next = api.stepClanShipEscortMotion('hangar', before, leader, 1 / 60);
    assert.deepEqual(next.actor, before.actor);
    assert.equal(next.blocked, true);
    assert.equal(next.moving, false);
  }
});

function returnAt(stepIndex) {
  return { ...incidents.createClanShipIncidents('escort-scene-owner'), revision: stepIndex + 2,
    activeIncident: { incidentId: 'return-transfer', acceptedRevision: 1, stepIndex,
      choices: stepIndex >= 2 ? [{ stepId: 'return-transfer-choice', choiceId: 'near-medical' }] : [], lastRejectedChoice: null } };
}

test('door access keeps the companion present, ordered and in the medical route until its station is recorded', () => {
  const hangarDoor = { x: 128, y: 635 };
  assert.equal(api.clanShipIncidentEscortDoorAccess(returnAt(3), 'hangar', 'soins', hangarDoor, hangarDoor).allowed, false, 'physical arrival alone cannot skip its saved checkpoint');
  assert.equal(api.clanShipIncidentEscortDoorAccess(returnAt(4), 'hangar', 'soins', hangarDoor, null).allowed, false);
  assert.equal(api.clanShipIncidentEscortDoorAccess(returnAt(4), 'hangar', 'soins', hangarDoor, { x: 410, y: 650 }).allowed, false);
  assert.equal(api.clanShipIncidentEscortDoorAccess(returnAt(4), 'hangar', 'armurerie', hangarDoor, hangarDoor).allowed, false);
  assert.equal(api.clanShipIncidentEscortDoorAccess(returnAt(4), 'hangar', 'soins', hangarDoor, { x: 174, y: 635 }).allowed, true);
  for (const step of [4, 5]) assert.equal(api.clanShipIncidentEscortDoorAccess(returnAt(step), 'soins', 'trophees', { x: 128, y: 635 }, { x: 174, y: 635 }).allowed, false);
  assert.equal(api.clanShipIncidentEscortDoorAccess(returnAt(6), 'soins', 'trophees', { x: 128, y: 635 }, { x: 920, y: 640 }).allowed, true);
});

test('reloading uses the saved escort anchor and permits the paired medical threshold only after the hangar checkpoint', () => {
  const waiting = api.clanShipIncidentEscortScene(returnAt(2), 'hangar');
  assert.equal(waiting.follows, false);
  assert.equal(waiting.checkpointId, 'waiting');
  const pickedUp = api.clanShipIncidentEscortScene(returnAt(3), 'hangar');
  assert.equal(pickedUp.follows, true);
  assert.deepEqual(pickedUp.position, { x: 410, y: 650 });
  assert.equal(api.clanShipIncidentEscortScene(returnAt(3), 'soins'), null);
  const atThreshold = api.clanShipIncidentEscortScene(returnAt(4), 'hangar');
  assert.deepEqual(atThreshold.position, { x: 128, y: 635 });
  const paired = api.clanShipIncidentEscortScene(returnAt(4), 'soins');
  assert.deepEqual(paired.position, { x: 1312, y: 635 });
  assert.equal(paired.checkpointId, 'hangar-door', 'entering a room does not invent the medical checkpoint');
  assert.equal(api.clanShipIncidentEscortScene(returnAt(5), 'hangar'), null);
  const arrived = api.clanShipIncidentEscortScene(returnAt(6), 'soins');
  assert.equal(arrived.follows, false);
  assert.equal(arrived.arrived, true);
  assert.deepEqual(arrived.position, { x: 920, y: 640 });
});

test('all incident usage points are reachable from real room entries, services and doors with the new fixture footprints', () => {
  for (const target of incidents.CLAN_SHIP_INCIDENT_TARGETS) {
    const room = interior.CLAN_SHIP_INTERIOR_ROOMS[target.roomId];
    for (const from of [interior.clanShipInteriorSpawn(target.roomId), room.servicePoint, ...room.doors]) {
      const path = interior.planClanShipInteriorPath(target.roomId, from, target.position);
      assert(path, `${target.id}: physical route exists`);
      let actor = { ...from, facing: 1 };
      let points = path.points.slice(1);
      let frames = 0;
      while (points.length && frames++ < 900) {
        const next = interior.stepClanShipInteriorPath(target.roomId, actor, points, 1 / 60);
        assert.equal(next.blocked, false, target.id);
        assert(interior.isClanShipInteriorSegmentWalkable(target.roomId, actor, next.actor));
        actor = next.actor; points = next.remaining;
      }
      assert(frames < 900, `${target.id}: bounded real traversal`);
      assert(span(actor, target.position) < 0.1);
    }
  }
});
