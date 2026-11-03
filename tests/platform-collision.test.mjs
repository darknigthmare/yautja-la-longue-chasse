import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: 'export * from "./app/game/systems/platformCollision";', resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, platform: "node", format: "cjs",
});
const compiled = { exports: {} };
runInNewContext(bundle.outputFiles[0].text, { module: compiled, exports: compiled.exports });
const { resolvePlatformMotion, overlapsSolidPlatform } = compiled.exports;
const player = (patch = {}) => ({ x: 0, y: 0, width: 10, height: 10, velocityX: 100, velocityY: 100, ...patch });
const platform = (x, y, width, height, collision = "solid") => ({ id: `${x}:${y}`, x, y, width, height, collision, material: "stone", routeId: "ground", noiseMultiplier: 1, trackPersistence: 1 });
const move = (body, desired, platforms, floor = 624) => resolvePlatformMotion(body, desired, platforms, floor);
const close = (value, expected) => assert.ok(Math.abs(value - expected) < 1e-6, `${value} should equal ${expected}`);

test("a fast horizontal move stops at the first thin wall, independent of array order", () => {
  const near = platform(80, 0, 2, 200);
  const far = platform(200, 0, 2, 200);
  for (const walls of [[far, near], [near, far]]) {
    const result = move(player(), { x: 900, y: 0 }, walls);
    close(result.x, 70);
    assert.equal(result.hitWall, true);
    assert.equal(result.velocityX, 0);
  }
});

test("leftward motion stops at the nearest right face", () => {
  const result = move(player({ x: 300, velocityX: -500 }), { x: -300, y: 0 }, [platform(80, 0, 2, 200), platform(200, 0, 2, 200)]);
  close(result.x, 202);
  assert.equal(result.hitWall, true);
});

test("upward motion hits a solid ceiling without crossing its thickness", () => {
  const result = move(player({ x: 50, y: 150, velocityY: -900 }), { x: 50, y: -400 }, [platform(0, 60, 200, 2)]);
  close(result.y, 62);
  assert.equal(result.hitCeiling, true);
  assert.equal(result.velocityY, 0);
  assert.equal(result.grounded, false);
});

test("a large fall lands on the highest crossed surface before the floor", () => {
  const high = platform(0, 130, 200, 2, "one-way");
  const low = platform(0, 320, 200, 20);
  for (const walls of [[low, high], [high, low]]) {
    const result = move(player({ x: 50 }), { x: 50, y: 1300 }, walls);
    close(result.y, 120);
    assert.equal(result.grounded, true);
    assert.equal(result.velocityY, 0);
  }
});

test("one-way surfaces allow upward travel and side entry from below", () => {
  const ledge = platform(50, 100, 200, 30, "one-way");
  const rise = move(player({ x: 70, y: 150, velocityY: -300 }), { x: 70, y: 0 }, [ledge]);
  close(rise.y, 0);
  assert.equal(rise.hitCeiling, false);
  const side = move(player({ x: 0, y: 110 }), { x: 100, y: 120 }, [ledge]);
  close(side.x, 100);
  close(side.y, 120);
  assert.equal(side.hitWall, false);
});

test("one-way landing uses horizontal position at impact, not only at the end", () => {
  const result = move(player(), { x: 100, y: 100 }, [platform(40, 50, 20, 2, "one-way")]);
  close(result.x, 100);
  close(result.y, 40);
  assert.equal(result.velocityY, 0);
  assert.equal(result.grounded, false, "sliding off a small ledge does not leave a floating grounded player");
});

test("one-way surfaces are ignored if the body is beside them at crossing time", () => {
  const result = move(player(), { x: 100, y: 100 }, [platform(80, 50, 100, 2, "one-way")]);
  close(result.x, 100);
  close(result.y, 100);
  assert.equal(result.grounded, false);
});

test("diagonal motion slides along a wall then lands on the floor", () => {
  const result = move(player(), { x: 100, y: 100 }, [platform(50, 0, 5, 200), platform(0, 80, 200, 20)]);
  close(result.x, 40);
  close(result.y, 70);
  assert.equal(result.hitWall, true);
  assert.equal(result.grounded, true);
});

test("simultaneous corner contacts block both axes independently of ordering", () => {
  const wall = platform(50, 0, 5, 200);
  const floor = platform(0, 50, 200, 10);
  for (const walls of [[wall, floor], [floor, wall]]) {
    const result = move(player(), { x: 100, y: 100 }, walls);
    close(result.x, 40);
    close(result.y, 40);
    assert.equal(result.hitWall, true);
    assert.equal(result.grounded, true);
  }
});

test("diagonal sweep catches a short wall crossed between two clear endpoints", () => {
  const result = move(player(), { x: 100, y: 100 }, [platform(50, 35, 4, 35)]);
  close(result.x, 40);
  close(result.y, 100);
  assert.equal(result.hitWall, true);
});

test("standing contact allows horizontal movement and jumping away", () => {
  const floor = platform(0, 100, 300, 20);
  const slide = move(player({ x: 30, y: 90, velocityY: 0 }), { x: 130, y: 90 }, [floor]);
  close(slide.x, 130);
  assert.equal(slide.grounded, true);
  const jump = move(player({ x: 30, y: 90, velocityY: -300 }), { x: 130, y: 50 }, [floor]);
  close(jump.y, 50);
  assert.equal(jump.grounded, false);
});

test("touching the side while moving away never catches on the wall", () => {
  const result = move(player({ x: 60, y: 40 }), { x: 150, y: 100 }, [platform(50, 0, 10, 200)]);
  close(result.x, 150);
  close(result.y, 100);
  assert.equal(result.hitWall, false);
});

test("climb attraction cannot carry a full-size hunter across a closed gate", () => {
  const result = move(player({ x: 1040, y: 250, width: 58, height: 116, velocityY: -100 }), { x: 1210, y: 200 }, [platform(1120, 0, 28, 392)]);
  close(result.x, 1062);
  close(result.y, 200);
  assert.equal(result.hitWall, true);
});

test("embedded legacy state has no automatic teleport and only exits the nearest face", () => {
  const gate = platform(100, 0, 28, 392);
  const body = player({ x: 95, y: 100, width: 58, height: 116 });
  assert.equal(overlapsSolidPlatform(body, [gate]), true);
  const still = move(body, { x: 95, y: 100 }, [gate]);
  close(still.x, 95);
  const rightExit = move(body, { x: 220, y: 100 }, [gate]);
  close(rightExit.x, 220); // This box overlaps farther to the right: nearest separating face is right.
  const leftEmbedded = player({ x: 48, y: 100, width: 58, height: 116 });
  const blocked = move(leftEmbedded, { x: 220, y: 100 }, [gate]);
  close(blocked.x, 48);
  assert.equal(blocked.hitWall, true);
  const exit = move(leftEmbedded, { x: 20, y: 100 }, [gate]);
  close(exit.x, 20);
  assert.equal(overlapsSolidPlatform({ ...leftEmbedded, ...exit }, [gate]), false);
});

test("global floor catches fast falls and a legacy position beneath it", () => {
  const fall = move(player(), { x: 70, y: 10000 }, []);
  close(fall.y, 614);
  close(fall.x, 70);
  assert.equal(fall.grounded, true);
  const embedded = move(player({ y: 900 }), { x: 0, y: 910 }, []);
  close(embedded.y, 614);
  assert.equal(embedded.grounded, true);
});

test("inputs are immutable and malformed numeric geometry fails explicitly", () => {
  const body = Object.freeze(player());
  const ledge = Object.freeze(platform(0, 100, 200, 10));
  move(body, Object.freeze({ x: 0, y: 400 }), Object.freeze([ledge]));
  for (const patch of [{ x: NaN }, { height: -1 }, { velocityY: Infinity }]) {
    assert.throws(() => move(player(patch), { x: 0, y: 100 }, []), /finite coordinates/);
  }
  assert.throws(() => move(body, { x: 0, y: 100 }, [{ ...ledge, width: 0 }]), /positive dimensions/);
});


test("extreme displacement still hits thin walls instead of treating their crossing as tangent", () => {
  const result = move(player(), { x: 1e10, y: 0 }, [platform(80, 0, 2, 200)]);
  close(result.x, 70);
  assert.equal(result.hitWall, true);
});


test("walking over adjoining solid floor tiles does not snag their shared corner", () => {
  const tiles = [platform(0, 100, 100, 20), platform(100, 100, 100, 20), platform(200, 100, 100, 20)];
  for (const x of [80, 90, 95, 100]) {
    const result = move(player({ x, y: 90 }), { x: x + 30, y: 94 }, tiles);
    close(result.x, x + 30);
    close(result.y, 90);
    assert.equal(result.hitWall, false);
    assert.equal(result.grounded, true);
  }
});
