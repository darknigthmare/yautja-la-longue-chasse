import assert from "node:assert/strict";
import test from "node:test";
import {
  PHYSICAL_SHIP_LADDERS,
  PHYSICAL_SHIP_STATIONS,
  PHYSICAL_SHIP_WORLD,
  clearPhysicalShipControls,
  createPhysicalShipMotion,
  gatePhysicalShipGamepad,
  nearestPhysicalShipStation,
  resolvePhysicalShipInput,
  stepPhysicalShipMotion,
} from "../app/game/systems/physicalShipMotion.ts";

const idle = { horizontal: 0, vertical: 0, jump: false };
const neutralPad = { ...idle, interact: false };
const advance = (initial, input, frames = 60) => {
  let player = initial;
  for (let frame = 0; frame < frames; frame += 1) {
    player = stepPhysicalShipMotion(player, input, 1 / 60);
  }
  return player;
};

test("a new or returning hunter starts at the airlock and can walk across the whole lower deck", () => {
  const initial = createPhysicalShipMotion();
  assert.equal(nearestPhysicalShipStation(initial)?.id, "launch-airlock");
  assert.equal(stepPhysicalShipMotion(initial, idle, 1 / 60), initial);
  const atRightWall = advance(initial, { ...idle, horizontal: 1 }, 500);
  assert.equal(atRightWall.x, PHYSICAL_SHIP_WORLD.width - 28);
  assert.equal(atRightWall.y, PHYSICAL_SHIP_WORLD.floorY);
  assert.equal(atRightWall.onSurface, true);
  const atLeftWall = advance(atRightWall, { ...idle, horizontal: -1 }, 500);
  assert.equal(atLeftWall.x, 28);
  assert.equal(atLeftWall.facing, -1);
});

test("a jump rises, falls and lands without passing through the floor", () => {
  const initial = createPhysicalShipMotion();
  const jumping = stepPhysicalShipMotion(initial, { ...idle, jump: true }, 1 / 60);
  assert.ok(jumping.y < initial.y);
  assert.ok(jumping.velocityY < 0);
  assert.equal(jumping.onSurface, false);
  const landing = advance(jumping, idle, 100);
  assert.equal(landing.y, PHYSICAL_SHIP_WORLD.floorY);
  assert.equal(landing.velocityY, 0);
  assert.equal(landing.onSurface, true);
});

test("both ladders lead to the gantry and support a pause midway without falling", () => {
  for (const ladder of PHYSICAL_SHIP_LADDERS) {
    const below = { ...createPhysicalShipMotion(), x: ladder.x };
    const halfway = advance(below, { ...idle, vertical: -1 }, 30);
    assert.equal(halfway.climbing, true);
    assert.ok(halfway.y > ladder.top && halfway.y < ladder.bottom);
    const paused = advance(halfway, idle, 45);
    assert.equal(paused.y, halfway.y);
    assert.equal(paused.velocityY, 0);
    const top = advance(paused, { ...idle, vertical: -1 }, 90);
    assert.equal(top.y, ladder.top);
    assert.equal(top.onSurface, true);
    const backDown = advance(top, { ...idle, vertical: 1 }, 90);
    assert.equal(backDown.y, ladder.bottom);
    assert.equal(backDown.onSurface, true);
  }
});

test("all eight stations are reachable by walking and climbing, with no cross-floor interaction", () => {
  assert.equal(PHYSICAL_SHIP_STATIONS.length, 8);
  assert.equal(new Set(PHYSICAL_SHIP_STATIONS.map(({ id }) => id)).size, 8);
  for (const station of PHYSICAL_SHIP_STATIONS) {
    let player = createPhysicalShipMotion();
    if (station.level === "gantry") {
      player = { ...player, x: PHYSICAL_SHIP_LADDERS[0].x };
      player = advance(player, { ...idle, vertical: -1 }, 90);
    }
    const direction = Math.sign(station.x - player.x);
    const frames = Math.round(Math.abs(station.x - player.x) / 3.5);
    player = advance(player, { ...idle, horizontal: direction }, frames);
    assert.equal(nearestPhysicalShipStation(player)?.id, station.id, station.id);
    const otherLevel = { ...player, y: station.level === "gantry" ? 480 : 310 };
    assert.notEqual(nearestPhysicalShipStation(otherLevel)?.id, station.id);
  }
});

test("walking off the gantry falls to the lower deck", () => {
  const onGantry = { ...createPhysicalShipMotion(), x: 1_070, y: 310 };
  const falling = advance(onGantry, { ...idle, horizontal: 1 }, 10);
  assert.ok(falling.y > 310);
  assert.equal(falling.onSurface, false);
  const landed = advance(falling, idle, 80);
  assert.equal(landed.y, PHYSICAL_SHIP_WORLD.floorY);
  assert.equal(landed.onSurface, true);
});

test("suspension ignores all input sources and preserves an airborne hunter exactly", () => {
  const held = { left: false, right: true, up: true, down: false, jumpQueued: true };
  const pad = { horizontal: -1, vertical: 1, jump: true };
  assert.deepEqual(resolvePhysicalShipInput(held, pad, true), idle);
  const airborne = stepPhysicalShipMotion(createPhysicalShipMotion(), { ...idle, jump: true }, 1 / 60);
  const frozen = stepPhysicalShipMotion(airborne, { horizontal: 1, vertical: 1, jump: true }, 30, true);
  assert.equal(frozen, airborne);
  const cleared = clearPhysicalShipControls();
  assert.deepEqual(resolvePhysicalShipInput(cleared, idle, false), idle);
  const resumed = stepPhysicalShipMotion(frozen, idle, 1 / 60);
  assert.equal(resumed.x, frozen.x);
  assert.ok(resumed.y < frozen.y, "the existing jump resumes rather than resetting the hunter");
});

test("a held gamepad action cannot reopen a station or move the hunter when an overlay closes", () => {
  const held = { horizontal: 1, vertical: 0, jump: true, interact: true };
  const suspended = gatePhysicalShipGamepad(held, true, true);
  assert.equal(suspended.ready, false);
  assert.deepEqual(suspended.sample, neutralPad);
  const stillHeld = gatePhysicalShipGamepad(held, suspended.ready, false);
  assert.equal(stillHeld.ready, false);
  assert.deepEqual(stillHeld.sample, neutralPad);
  const released = gatePhysicalShipGamepad(neutralPad, stillHeld.ready, false);
  assert.equal(released.ready, true);
  const freshPress = gatePhysicalShipGamepad(held, released.ready, false);
  assert.deepEqual(freshPress.sample, held);
});

test("tab suspension cannot create a large simulation jump, and combined axes remain bounded", () => {
  const input = resolvePhysicalShipInput({ ...clearPhysicalShipControls(), right: true, down: true }, { horizontal: 1, vertical: 1, jump: false }, false);
  assert.deepEqual(input, { horizontal: 1, vertical: 1, jump: false });
  const initial = createPhysicalShipMotion();
  const longFrame = stepPhysicalShipMotion(initial, input, 60);
  assert.ok(longFrame.x - initial.x < 8);
  assert.equal(stepPhysicalShipMotion(initial, input, -1), initial);
});
