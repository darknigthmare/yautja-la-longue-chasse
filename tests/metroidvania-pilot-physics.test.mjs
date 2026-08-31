import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: 'export * from "./app/game/systems/metroidvaniaPilot"; export * from "./app/game/systems/explorationProgress"; export * from "./app/game/systems/platformCollision"; export {worldBlueprintFor} from "./app/game/systems/worldBlueprints";',
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, write: false, platform: "node", format: "cjs",
});
const compiled = { exports: {} };
runInNewContext(bundle.outputFiles[0].text, { module: compiled, exports: compiled.exports });
const { applyPilotWorld, pilotPlatforms, pilotClimbables, pilotInteract, defaultExplorationProgress,
  resolvePlatformMotion, overlapsSolidPlatform, worldBlueprintFor, PILOT_UPPER_FLOOR_Y,
  PILOT_GROUND_Y, PILOT_SEAL_ID, PILOT_HATCH_ID, PILOT_SECRET_ID } = compiled.exports;
const GRAVITY = 1850;
const JUMP = -720;
const SPEED = 300;
const DT = 1 / 120;
const world = (progress = defaultExplorationProgress()) => applyPilotWorld(worldBlueprintFor("jungle-vey"), progress);
const hunter = (patch = {}) => ({ x: 650, y: 508, width: 72, height: 116, velocityX: 0, velocityY: 0, grounded: true, ...patch });
const feet = (body) => body.y + body.height;
const close = (value, expected) => assert.ok(Math.abs(value - expected) < 1e-5, `${value} should equal ${expected}`);
const upper = (body) => body.grounded && Math.abs(feet(body) - PILOT_UPPER_FLOOR_Y) < 1e-5;

// Terrain and controller intentions use the runtime's actual speeds. AI and mud
// may delay this route but do not change the geometry or available jump height.
function tick(body, platforms, direction = 0, { jump = false, boost = false } = {}) {
  const velocityX = direction * SPEED;
  const velocityY = (jump || boost ? JUMP : body.velocityY) + GRAVITY * DT;
  const result = resolvePlatformMotion({ ...body, velocityX, velocityY },
    { x: body.x + velocityX * DT, y: body.y + velocityY * DT }, platforms, PILOT_GROUND_Y);
  return { ...body, ...result };
}
function frames(body, platforms, count, direction = 0, actions = {}) {
  const trace = [];
  for (let frame = 0; frame < count; frame += 1) {
    body = tick(body, platforms, direction, { jump: frame === actions.jumpFrame, boost: frame === actions.boostFrame });
    trace.push(body);
  }
  return { body, trace };
}
function walkTo(body, platforms, x) {
  const direction = Math.sign(x - body.x);
  let count = 0;
  while (Math.abs(x - body.x) > 1e-5 && count < 2000) {
    body = tick(body, platforms, direction);
    count += 1;
    if ((direction > 0 && body.x >= x) || (direction < 0 && body.x <= x)) break;
  }
  assert.ok(count < 2000, `route was blocked before x=${x}`);
  close(body.x, x);
  return body;
}
function acquireModule(progress = defaultExplorationProgress()) {
  const result = pilotInteract(progress, hunter({ x: 2520 }));
  assert.equal(result?.event, "ability");
  return result.progress;
}
function openSeal(progress = acquireModule()) {
  const result = pilotInteract(progress, hunter({ x: 1048, y: 276 }));
  assert.equal(result?.event, "gate");
  return result.progress;
}
function openHatch(progress = openSeal()) {
  const result = pilotInteract(progress, hunter({ x: 2024, y: 276 }));
  assert.equal(result?.event, "gate");
  return result.progress;
}

test("physics trials stay tied to the live gravity and jump impulse", () => {
  const runtime = readFileSync("app/game/HuntCanvas.tsx", "utf8");
  assert.match(runtime, /const GRAVITY = 1_850;/);
  assert.match(runtime, /player\.velocityY = -720;/);
  assert.equal(JUMP * JUMP / (2 * GRAVITY) < PILOT_GROUND_Y - PILOT_UPPER_FLOOR_Y, true);
});

test("single-jump approaches cannot reach the upper gallery after replacing legacy stepping stones", () => {
  const platforms = world().platforms;
  for (const x of [520, 650, 720, 790, 900]) {
    const trial = frames(hunter({ x }), platforms, 180, 1, { jumpFrame: 0 });
    assert.equal(trial.trace.some(upper), false, `single jump from ${x} reached the gallery`);
    assert.ok(trial.trace.every((body) => !overlapsSolidPlatform(body, platforms)));
  }
});

test("the acquired mid-air boost reaches and lands on the upper gallery", () => {
  const progress = acquireModule();
  const platforms = world(progress).platforms;
  const trial = frames(hunter(), platforms, 220, 1, { jumpFrame: 0, boostFrame: 46 });
  assert.ok(trial.trace.some(upper));
  assert.ok(upper(trial.body));
  close(trial.body.x, 1048);
  assert.ok(trial.trace.every((body) => !overlapsSolidPlatform(body, platforms)));
});

test("a closed seal blocks the body and an opened seal permits a continuous walk", () => {
  const progress = acquireModule();
  const closed = frames(hunter({ x: 900, y: 276 }), pilotPlatforms(progress), 180, 1);
  close(closed.body.x, 1048);
  assert.ok(upper(closed.body));
  const opened = openSeal(progress);
  const crossing = frames(closed.body, pilotPlatforms(opened), 100, 1);
  assert.ok(crossing.body.x > 1200);
  assert.ok(upper(crossing.body));
});

test("the lower corridor is traversable but jumping through its solid ceiling is impossible", () => {
  const platforms = world().platforms;
  const walk = walkTo(hunter({ x: 225 }), platforms, 2520);
  close(walk.y, 508);
  const rising = frames(hunter({ x: 1350 }), platforms, 120, 0, { jumpFrame: 0, boostFrame: 46 });
  assert.ok(rising.trace.some((body) => body.hitCeiling));
  assert.ok(rising.trace.every((body) => body.y >= 416 - 1e-5));
  assert.ok(rising.trace.every((body) => !overlapsSolidPlatform(body, platforms)));
});

test("the outer right wall cannot be bypassed by the highest nearby climb jump and a boost", () => {
  const platforms = world(acquireModule()).platforms;
  // This starts at the highest nearby vine's legal dismount height and even
  // places the body closer to the wall than the vine, favouring a bypass attempt.
  const start = hunter({ x: 2300, y: 165 - 116 * 0.38, velocityY: -560, grounded: false });
  const trial = frames(start, platforms, 220, -1, { boostFrame: 36 });
  assert.ok(trial.trace.some((body) => body.hitWall));
  assert.ok(trial.trace.every((body) => feet(body) > 0));
  assert.equal(trial.trace.some((body) => body.x < 2200 && body.y < 392), false);
  assert.ok(trial.trace.every((body) => !overlapsSolidPlatform(body, platforms)));
});

test("closed hatch supports the hunter while opening it produces a real fall", () => {
  const before = openSeal();
  const closed = frames(hunter({ x: 2024, y: 276 }), pilotPlatforms(before), 120);
  assert.ok(upper(closed.body));
  const after = openHatch(before);
  const dropped = frames(closed.body, pilotPlatforms(after), 120);
  close(dropped.body.y, 508);
  assert.equal(dropped.body.grounded, true);
  assert.ok(dropped.trace.some((body) => body.y > 416));
});

test("the opened return rope climbs through the hatch and permits walking onto the gallery", () => {
  const progress = openHatch();
  const platforms = pilotPlatforms(progress);
  const [rope] = pilotClimbables(progress);
  let body = hunter({ x: rope.x + rope.width / 2 - 36 });
  for (let frame = 0; frame < 200; frame += 1) {
    const velocityY = -235 * rope.climbSpeedMultiplier;
    const desiredY = Math.max(rope.y - body.height * 0.38, body.y + velocityY * DT);
    body = { ...body, ...resolvePlatformMotion({ ...body, velocityY }, { x: body.x, y: desiredY }, platforms, 624) };
    assert.equal(overlapsSolidPlatform(body, platforms), false);
  }
  assert.ok(feet(body) < 320, "rope must rise enough to leave the shaft without another jump");
  const exit = frames({ ...body, velocityY: 0 }, platforms, 60, -1);
  assert.ok(upper(exit.body));
  assert.ok(exit.body.x < 1980);
  assert.ok(exit.trace.every((entry) => !overlapsSolidPlatform(entry, platforms)));
});

test("physical pilot loop reaches module, backtracks, opens seal, claims cache and descends", () => {
  let progress = defaultExplorationProgress();
  let body = walkTo(hunter({ x: 225 }), world(progress).platforms, 2520);
  const abilityResult = pilotInteract(progress, body);
  assert.equal(abilityResult?.event, "ability");
  progress = abilityResult.progress;
  body = walkTo(body, world(progress).platforms, 650);
  body = frames(body, world(progress).platforms, 220, 1, { jumpFrame: 0, boostFrame: 46 }).body;
  assert.ok(upper(body));
  progress = pilotInteract(progress, body).progress;
  assert.ok(progress.openedGateIds.includes(PILOT_SEAL_ID));
  body = walkTo(body, world(progress).platforms, 1650.5);
  const secret = pilotInteract(progress, body);
  assert.equal(secret?.event, "secret");
  progress = secret.progress;
  assert.ok(progress.secretIds.includes(PILOT_SECRET_ID));
  body = walkTo(body, world(progress).platforms, 2023);
  const hatch = pilotInteract(progress, body);
  assert.equal(hatch?.event, "gate");
  progress = hatch.progress;
  assert.ok(progress.openedGateIds.includes(PILOT_HATCH_ID));
  body = frames(body, world(progress).platforms, 120).body;
  close(body.y, 508);
  assert.equal(body.grounded, true);
});
