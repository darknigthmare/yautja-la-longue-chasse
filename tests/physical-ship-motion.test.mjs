import assert from "node:assert/strict";
import test from "node:test";
import { ship } from "./helpers/ship-level-runtime.mjs";

const {
  PHYSICAL_SHIP_LADDERS, PHYSICAL_SHIP_STATIONS, PHYSICAL_SHIP_WORLD, PHYSICAL_SHIP_MOVEMENT,
  SHIP_LEVEL_DOORS, SHIP_LEVEL_PLAYER,
  clearPhysicalShipControls, createPhysicalShipMotion, createShipDoorStates, stepShipDoorStates,
  gatePhysicalShipGamepad, nearestPhysicalShipStation, resolvePhysicalShipInput, stepPhysicalShipMotion,
} = ship;
const idle = { horizontal: 0, vertical: 0, jump: false };
const neutralPad = { ...idle, interact: false };
const DT = 1 / 60;
function scene(player = createPhysicalShipMotion()) { return { player, doors: createShipDoorStates(), ticks: 0, openedDoors: new Set() }; }
function tick(scene, input = idle, count = 1) {
  for (let frame = 0; frame < count; frame++) {
    scene.doors = stepShipDoorStates(scene.doors, scene.player, DT);
    scene.player = stepPhysicalShipMotion(scene.player, input, DT, false, scene.doors);
    for (const [id, state] of Object.entries(scene.doors)) if (state.openness > 0.99) scene.openedDoors.add(id);
    scene.ticks++;
  }
  return scene;
}
function walkTo(scene, targetX) {
  for (let frame = 0; frame < 2_000 && Math.abs(scene.player.x - targetX) > 0.01; frame++) {
    const horizontal = Math.max(-1, Math.min(1, (targetX - scene.player.x) / (PHYSICAL_SHIP_MOVEMENT.walkSpeed * DT)));
    tick(scene, { ...idle, horizontal });
  }
  assert.ok(Math.abs(scene.player.x - targetX) < 0.02, `walk to ${targetX}, stopped ${JSON.stringify(scene.player)}`);
  return scene;
}
function climbTo(scene, targetY) {
  for (let frame = 0; frame < 500 && Math.abs(scene.player.y - targetY) > 0.01; frame++) {
    const vertical = Math.max(-1, Math.min(1, (targetY - scene.player.y) / (PHYSICAL_SHIP_MOVEMENT.climbSpeed * DT)));
    tick(scene, { ...idle, vertical });
  }
  assert.ok(Math.abs(scene.player.y - targetY) < 0.02, `climb to ${targetY}, stopped ${JSON.stringify(scene.player)}`);
  return scene;
}
function jumpTo(scene, targetX) {
  tick(scene, { ...idle, jump: true, horizontal: Math.sign(targetX - scene.player.x) });
  walkTo(scene, targetX); tick(scene, idle, 65);
  return scene;
}

test("a returning hunter spawns at the airlock and traverses the lower hull, opening real doors", () => {
  const world = scene();
  assert.equal(nearestPhysicalShipStation(world.player)?.id, "launch-airlock");
  assert.equal(stepPhysicalShipMotion(world.player, idle, DT), world.player);
  tick(world, { ...idle, horizontal: 1 }, 300);
  assert.equal(world.player.x, 3_880 - SHIP_LEVEL_PLAYER.halfWidth);
  tick(world, { ...idle, horizontal: -1 }, 1_000);
  assert.equal(world.player.x, 120 + SHIP_LEVEL_PLAYER.halfWidth);
  assert.equal(world.player.y, PHYSICAL_SHIP_WORLD.floorY);
  assert.equal(world.player.onSurface, true);
  assert.equal(world.player.facing, -1);
  for (const door of SHIP_LEVEL_DOORS.filter((door) => door.y > 1_000)) assert.ok(world.openedDoors.has(door.id), door.id);
});

test("jumping rises and lands on the actual floor without tunnelling", () => {
  const world = scene(); const originalY = world.player.y;
  tick(world, { ...idle, jump: true });
  assert.ok(world.player.y < originalY); assert.ok(world.player.velocityY < 0); assert.equal(world.player.onSurface, false);
  tick(world, idle, 100);
  assert.equal(world.player.y, PHYSICAL_SHIP_WORLD.floorY); assert.equal(world.player.velocityY, 0); assert.equal(world.player.onSurface, true);
});

test("all four ladders support an intermediate stop, top exit and downward travel", () => {
  assert.equal(PHYSICAL_SHIP_LADDERS.length, 4);
  for (const ladder of PHYSICAL_SHIP_LADDERS) {
    const world = scene({ ...createPhysicalShipMotion(), x: ladder.x, y: ladder.bottom });
    tick(world, { ...idle, vertical: -1 }, 30);
    assert.equal(world.player.climbing, true);
    assert.ok(world.player.y > ladder.top && world.player.y < ladder.bottom);
    const stoppedAt = world.player.y; tick(world, idle, 40);
    assert.equal(world.player.y, stoppedAt); assert.equal(world.player.velocityY, 0);
    climbTo(world, ladder.top); assert.equal(world.player.onSurface, true);
    climbTo(world, ladder.bottom); assert.equal(world.player.onSurface, true);
  }
});

test("each of the eight stations is reached from the real spawn without teleportation", () => {
  assert.equal(PHYSICAL_SHIP_STATIONS.length, 8);
  assert.equal(new Set(PHYSICAL_SHIP_STATIONS.map(({ id }) => id)).size, 8);
  for (const station of PHYSICAL_SHIP_STATIONS) {
    const world = scene();
    if (station.level === "gantry") { walkTo(world, 2_980); climbTo(world, 700); }
    walkTo(world, station.x); tick(world, idle, 2);
    assert.equal(nearestPhysicalShipStation(world.player)?.id, station.id, station.id);
    assert.equal(world.player.y, station.y);
    assert.notEqual(nearestPhysicalShipStation({ ...world.player, y: station.level === "gantry" ? 1_360 : 700 })?.id, station.id);
    assert.ok(world.ticks * DT < 17, `${station.id} preparation route must remain compact`);
  }
});

test("one continuous preparation loop visits all stations through both shafts and returns to the airlock", () => {
  const world = scene(); const visited = new Set([nearestPhysicalShipStation(world.player).id]);
  for (const x of [2_450, 1_560, 500]) { walkTo(world, x); visited.add(nearestPhysicalShipStation(world.player)?.id); }
  walkTo(world, 1_060); climbTo(world, 700);
  for (const x of [500, 1_560, 2_450, 3_500]) { walkTo(world, x); visited.add(nearestPhysicalShipStation(world.player)?.id); }
  walkTo(world, 2_980); climbTo(world, 1_360); walkTo(world, 3_500);
  assert.equal(nearestPhysicalShipStation(world.player)?.id, "launch-airlock");
  assert.equal(visited.size, 8); assert.equal(world.openedDoors.size, 12);
  assert.ok(world.ticks * DT < 40, `complete preparation loop took ${world.ticks * DT}s`);
});

test("leaving the optional archive mezzanine falls safely onto the lower room floor", () => {
  const world = scene({ ...createPhysicalShipMotion(), x: 2_550, y: 500 });
  tick(world, { ...idle, horizontal: 1 }, 20);
  assert.ok(world.player.y > 500); assert.equal(world.player.onSurface, false);
  tick(world, idle, 80);
  assert.equal(world.player.y, 700); assert.equal(world.player.onSurface, true);
});

test("optional observation steps and training platforms are physically reachable", () => {
  const observation = scene(); walkTo(observation, 1_060); climbTo(observation, 700); walkTo(observation, 500);
  jumpTo(observation, 430); assert.equal(observation.player.y, 660);
  jumpTo(observation, 320); assert.equal(observation.player.y, 620);
  jumpTo(observation, 500); assert.equal(observation.player.y, 700);
  const training = scene(); walkTo(training, 2_270);
  jumpTo(training, 2_270); assert.equal(training.player.y, 1_300);
  jumpTo(training, 2_420); assert.equal(training.player.y, 1_240);
  jumpTo(training, 2_610); assert.equal(training.player.y, 1_180);
  walkTo(training, 2_750); tick(training, idle, 90);
  assert.equal(training.player.y, 1_360);
});

test("the narrow corridor ceiling blocks a jump and a closed bulkhead blocks horizontal movement", () => {
  const corridor = scene({ ...createPhysicalShipMotion(), x: 2_000, y: 700 });
  tick(corridor, { ...idle, jump: true });
  let highestFeet = corridor.player.y;
  for (let frame = 0; frame < 60; frame++) { tick(corridor); highestFeet = Math.min(highestFeet, corridor.player.y); }
  assert.equal(highestFeet, 520 + SHIP_LEVEL_PLAYER.height);
  let player = { ...createPhysicalShipMotion(), x: 3_300 };
  for (let frame = 0; frame < 90; frame++) player = stepPhysicalShipMotion(player, { ...idle, horizontal: -1 }, DT);
  assert.equal(player.x, 3_120 + 12 + SHIP_LEVEL_PLAYER.halfWidth);
});

test("suspension ignores every input and preserves airborne motion and motor state exactly", () => {
  const held = { left: false, right: true, up: true, down: false, jumpQueued: true };
  assert.deepEqual(resolvePhysicalShipInput(held, { horizontal: -1, vertical: 1, jump: true }, true), idle);
  const world = scene(); tick(world, { ...idle, jump: true });
  const frozen = stepPhysicalShipMotion(world.player, { horizontal: 1, vertical: 1, jump: true }, 30, true, world.doors);
  assert.equal(frozen, world.player); assert.equal(stepShipDoorStates(world.doors, world.player, 30, true), world.doors);
  assert.deepEqual(resolvePhysicalShipInput(clearPhysicalShipControls(), idle, false), idle);
  const resumed = stepPhysicalShipMotion(frozen, idle, DT, false, world.doors);
  assert.equal(resumed.x, frozen.x); assert.ok(resumed.y < frozen.y);
});

test("a held gamepad action cannot reopen a station or move the hunter after an overlay", () => {
  const held = { horizontal: 1, vertical: 0, jump: true, interact: true };
  const suspended = gatePhysicalShipGamepad(held, true, true); assert.equal(suspended.ready, false); assert.deepEqual(suspended.sample, neutralPad);
  const stillHeld = gatePhysicalShipGamepad(held, suspended.ready, false); assert.equal(stillHeld.ready, false); assert.deepEqual(stillHeld.sample, neutralPad);
  const released = gatePhysicalShipGamepad(neutralPad, stillHeld.ready, false); assert.equal(released.ready, true);
  assert.deepEqual(gatePhysicalShipGamepad(held, released.ready, false).sample, held);
});

test("long or negative frames cannot tunnel and combined axes remain bounded", () => {
  const input = resolvePhysicalShipInput({ ...clearPhysicalShipControls(), right: true, down: true }, { horizontal: 1, vertical: 1, jump: false }, false);
  assert.deepEqual(input, { horizontal: 1, vertical: 1, jump: false });
  const initial = createPhysicalShipMotion();
  assert.ok(stepPhysicalShipMotion(initial, input, 60).x - initial.x < 10);
  assert.equal(stepPhysicalShipMotion(initial, input, -1), initial);
});
