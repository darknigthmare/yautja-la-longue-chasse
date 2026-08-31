import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: 'export * from "./app/game/systems/iceExplorationRegion"; export * from "./app/game/systems/jumpAssist"; export * from "./app/game/systems/platformCollision"; export {worldBlueprintFor} from "./app/game/systems/worldBlueprints";', resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, platform: "node", format: "cjs",
});
const compiled = { exports: {} };
runInNewContext(bundle.outputFiles[0].text, { module: compiled, exports: compiled.exports });
const { applyIceExplorationWorld, iceRegionPlatforms, iceRegionClimbables, iceInteract,
  freshJumpAssistState, stepJumpAssist, predictLandingWithinBuffer, resolvePlatformMotion, overlapsSolidPlatform,
  worldBlueprintFor, ICE_RELAY_ID, ICE_HATCH_ID, ICE_SECRET_ID, ICE_RELAY_FLOOR_Y, ICE_VAULT_FLOOR_Y,
} = compiled.exports;
const progress = (boost = false) => ({ abilityIds: boost ? ["aerial-boost"] : [], openedGateIds: [], secretIds: [], discoveredRoomIds: [] });
const hunter = (patch = {}) => ({ x: 650, y: 508, width: 72, height: 116, velocityX: 0, velocityY: 0, grounded: true, ...patch });
const world = (unlocks = progress()) => applyIceExplorationWorld(worldBlueprintFor("ice-cryostalker"), unlocks);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-5, `${actual} should equal ${expected}`);
const feet = (body) => body.y + body.height;
const onLevel = (body, level) => body.grounded && Math.abs(feet(body) - level) < 1e-5;

function run(body, platforms, { count = 220, direction = 0, jumpFrame = null, boostFrame = null, allowBoost = false } = {}) {
  let assist = freshJumpAssistState();
  let used = false;
  const trace = [];
  for (let tick = 0; tick < count; tick += 1) {
    const pressed = tick === jumpFrame || tick === boostFrame;
    const held = (jumpFrame !== null && tick >= jumpFrame && (boostFrame === null || tick < boostFrame - 2))
      || (boostFrame !== null && tick >= boostFrame);
    const velocityX = direction * 300;
    const result = stepJumpAssist(assist, { deltaSeconds: 1 / 120, pressed, held, grounded: body.grounded,
      climbing: false, canBoost: allowBoost && !used, velocityY: body.velocityY,
      landingSoon: pressed && body.velocityY >= 0 && predictLandingWithinBuffer({ ...body, velocityX }, platforms, 624),
    });
    assist = result.state;
    if (result.jump === "boost") used = true;
    const velocityY = result.velocityY + 1850 / 120;
    body = { ...body, ...resolvePlatformMotion({ ...body, velocityX, velocityY },
      { x: body.x + velocityX / 120, y: body.y + velocityY / 120 }, platforms, 624) };
    if (body.grounded) used = false;
    assert.equal(overlapsSolidPlatform(body, platforms), false);
    trace.push({ ...body, jump: result.jump });
  }
  return { body, trace };
}
function walkTo(body, platforms, targetX) {
  for (let tick = 0; tick < 2000 && Math.abs(body.x - targetX) > 1e-5; tick += 1) {
    const velocityX = Math.sign(targetX - body.x) * Math.min(300, Math.abs(targetX - body.x) * 120);
    const velocityY = body.velocityY + 1850 / 120;
    body = { ...body, ...resolvePlatformMotion({ ...body, velocityX, velocityY },
      { x: body.x + velocityX / 120, y: body.y + velocityY / 120 }, platforms, 624) };
    assert.equal(overlapsSolidPlatform(body, platforms), false);
  }
  close(body.x, targetX);
  return body;
}
function powered() {
  const relay = iceInteract(progress(true), hunter({ x: 1028, y: ICE_RELAY_FLOOR_Y - 116 }));
  assert.equal(relay?.event, "gate");
  return relay.progress;
}
function shortcut() {
  const hatch = iceInteract(powered(), hunter({ x: 1334, y: ICE_VAULT_FLOOR_Y - 116 }));
  assert.equal(hatch?.event, "gate");
  return hatch.progress;
}

test("the campaign floor stays open and the starter ice ledge is reachable with a normal held jump", () => {
  const platforms = world().platforms;
  const walking = walkTo(hunter({ x: 225 }), platforms, 1460);
  close(walking.y, 508);
  const firstStep = run(hunter(), platforms, { jumpFrame: 0 });
  assert.ok(onLevel(firstStep.body, 512));
});

test("the upper mining relay requires the acquired boost rather than a normal jump from the starter", () => {
  const platforms = world().platforms;
  const normal = run(hunter({ y: 396 }), platforms, { jumpFrame: 0, direction: 1 });
  assert.equal(normal.trace.some((body) => onLevel(body, ICE_RELAY_FLOOR_Y)), false);
  const boosted = run(hunter({ y: 396 }), world(progress(true)).platforms,
    { jumpFrame: 0, boostFrame: 46, direction: 1, allowBoost: true });
  assert.ok(onLevel(boosted.body, ICE_RELAY_FLOOR_Y));
  close(boosted.body.x, 1028);
  assert.equal(boosted.trace.filter((body) => body.jump === "boost").length, 1);
});

test("the closed relay door cannot be crossed or jumped over from its own upper floor", () => {
  const platforms = world(progress(true)).platforms;
  const walk = run(hunter({ x: 1000, y: ICE_RELAY_FLOOR_Y - 116 }), platforms, { direction: 1 });
  close(walk.body.x, 1028);
  const attack = run(walk.body, platforms, { direction: 1, jumpFrame: 0, boostFrame: 46, allowBoost: true });
  assert.ok(attack.trace.every((body) => body.x <= 1028 + 1e-5));
  assert.ok(attack.trace.every((body) => feet(body) > 20), "leave a real clearance margin above the maximum jump arc");
  assert.ok(ICE_RELAY_FLOOR_Y > 2 * 720 * 720 / (2 * 1850) + 20);
});

test("the far wall also blocks an airborne approach from the nearby external ladder", () => {
  const platforms = world(progress(true)).platforms;
  // Nearest remaining external ladder starts at y196, but this attempt is
  // placed much closer to the wall than that ladder, making bypass easier.
  const outside = hunter({ x: 1510, y: 196 - 116 * 0.38, velocityY: -560, grounded: false });
  const trial = run(outside, platforms, { direction: -1, boostFrame: 36, allowBoost: true });
  assert.equal(trial.trace.some((body) => body.x < 1430 && body.y < 392), false);
  assert.ok(trial.trace.every((body) => feet(body) > 0));
});

test("opening the relay deploys a real bridge and permits descent into the vault", () => {
  const unlocked = powered();
  const platforms = world(unlocked).platforms;
  let body = walkTo(hunter({ x: 1028, y: ICE_RELAY_FLOOR_Y - 116 }), platforms, 1228);
  body = run(body, platforms, { count: 90 }).body;
  assert.ok(onLevel(body, ICE_VAULT_FLOOR_Y));
  assert.ok(unlocked.openedGateIds.includes(ICE_RELAY_ID));
});

test("the hatch supports a hunter until opened and its ladder permits the return trip", () => {
  const before = powered();
  const held = run(hunter({ x: 1334, y: 276 }), iceRegionPlatforms(before), { count: 90 });
  assert.ok(onLevel(held.body, 392));
  const after = shortcut();
  const platforms = iceRegionPlatforms(after);
  let body = run(held.body, platforms, { count: 90 }).body;
  assert.ok(onLevel(body, 624));
  const [ladder] = iceRegionClimbables(after);
  for (let tick = 0; tick < 200; tick += 1) {
    const velocityY = -235 * ladder.climbSpeedMultiplier;
    const y = Math.max(ladder.y - body.height * 0.38, body.y + velocityY / 120);
    body = { ...body, ...resolvePlatformMotion({ ...body, velocityY }, { x: body.x, y }, platforms, 624) };
    assert.equal(overlapsSolidPlatform(body, platforms), false);
  }
  body.velocityY = 0;
  const exit = run(body, platforms, { count: 36, direction: -1 });
  const landing = run(exit.body, platforms, { count: 90 });
  assert.ok(onLevel(landing.body, 392));
  assert.ok(landing.body.x < 1320);
});

test("a continuous mine traversal climbs, powers the bridge, claims its secret and unlocks a permanent return", () => {
  let unlocks = progress(true);
  let platforms = world(unlocks).platforms;
  let body = run(hunter(), platforms, { jumpFrame: 0 }).body;
  assert.ok(onLevel(body, 512));
  body = run(body, platforms, { direction: 1, jumpFrame: 0, boostFrame: 46, allowBoost: true }).body;
  assert.ok(onLevel(body, ICE_RELAY_FLOOR_Y));
  unlocks = iceInteract(unlocks, body).progress;
  assert.ok(unlocks.openedGateIds.includes(ICE_RELAY_ID));
  platforms = world(unlocks).platforms;
  body = walkTo(body, platforms, 1228);
  body = run(body, platforms, { count: 90 }).body;
  const cache = iceInteract(unlocks, body);
  assert.equal(cache?.event, "secret");
  unlocks = cache.progress;
  assert.ok(unlocks.secretIds.includes(ICE_SECRET_ID));
  body = walkTo(body, world(unlocks).platforms, 1334);
  const hatch = iceInteract(unlocks, body);
  assert.equal(hatch?.event, "gate");
  unlocks = hatch.progress;
  assert.ok(unlocks.openedGateIds.includes(ICE_HATCH_ID));
  body = run(body, world(unlocks).platforms, { count: 90 }).body;
  assert.ok(onLevel(body, 624));
  assert.equal(iceRegionClimbables(unlocks).length, 1);
});
