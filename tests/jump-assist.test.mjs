import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: 'export * from "./app/game/systems/jumpAssist"; export {resolvePlatformMotion} from "./app/game/systems/platformCollision"; export {pilotPlatforms} from "./app/game/systems/metroidvaniaPilot";', resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, platform: "node", format: "cjs",
});
const compiled = { exports: {} };
runInNewContext(bundle.outputFiles[0].text, { module: compiled, exports: compiled.exports });
const { freshJumpAssistState, stepJumpAssist, predictLandingWithinBuffer, resolvePlatformMotion,
  pilotPlatforms, COYOTE_SECONDS, JUMP_BUFFER_SECONDS, JUMP_VELOCITY, CLIMB_JUMP_VELOCITY } = compiled.exports;
const frame = (patch = {}) => ({ deltaSeconds: 1 / 120, pressed: false, held: false, grounded: false, climbing: false, canBoost: false, velocityY: 0, ...patch });
const hunter = (patch = {}) => ({ x: 650, y: 508, width: 72, height: 116, velocityX: 0, velocityY: 0, grounded: true, ...patch });
const platform = (x, y, width, height, collision = "solid") => ({ id: "ledge", x, y, width, height, collision, routeId: "ground", material: "stone", noiseMultiplier: 1, trackPersistence: 1 });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} should equal ${expected}`);
const plain = (value) => JSON.parse(JSON.stringify(value));

function simulate({ releaseFrame = Infinity, boostFrame = null, releaseBoostFrame = Infinity, platforms = [], count = 220, direction = 0 } = {}) {
  let state = freshJumpAssistState();
  let body = hunter();
  let boostUsed = false;
  const trace = [];
  for (let tick = 0; tick < count; tick += 1) {
    const boostPress = tick === boostFrame;
    const held = tick < releaseFrame || (boostFrame !== null && tick >= boostFrame && tick < releaseBoostFrame);
    const velocityX = direction * 300;
    const result = stepJumpAssist(state, frame({ pressed: tick === 0 || boostPress, held,
      grounded: body.grounded, velocityY: body.velocityY, canBoost: boostFrame !== null && !boostUsed,
      landingSoon: boostPress && predictLandingWithinBuffer({ ...body, velocityX }, platforms, 624),
    }));
    state = result.state;
    if (result.jump === "boost") boostUsed = true;
    const velocityY = result.velocityY + 1850 / 120;
    const motion = resolvePlatformMotion({ ...body, velocityX, velocityY },
      { x: body.x + velocityX / 120, y: body.y + velocityY / 120 }, platforms, 624);
    body = { ...body, ...motion };
    if (body.grounded) boostUsed = false;
    trace.push({ ...body, jump: result.jump, cut: result.cut });
  }
  return { body, trace, state };
}

test("a held jump retains its original maximum height and an early release produces a shorter real trajectory", () => {
  const long = simulate();
  const short = simulate({ releaseFrame: 3 });
  const longHeight = 508 - Math.min(...long.trace.map((body) => body.y));
  const shortHeight = 508 - Math.min(...short.trace.map((body) => body.y));
  assert.ok(longHeight > 130 && longHeight <= 141);
  assert.ok(shortHeight > 25 && shortHeight < 65);
  assert.ok(longHeight > shortHeight * 2);
  assert.equal(short.trace.filter((body) => body.cut).length, 1);
  assert.equal(long.trace.filter((body) => body.jump).length, 1, "holding never retriggers after landing");
  close(long.body.y, 508);
  close(short.body.y, 508);
});

test("release after the apex leaves falling velocity unchanged", () => {
  const launched = stepJumpAssist(freshJumpAssistState(), frame({ pressed: true, held: true, grounded: true }));
  const falling = stepJumpAssist(launched.state, frame({ held: false, velocityY: 130 }));
  assert.equal(falling.velocityY, 130);
  assert.equal(falling.cut, false);
  assert.equal(falling.state.cutArmed, false);
});

test("coyote jump accepts the 100ms boundary but rejects a later press", () => {
  const supported = stepJumpAssist(freshJumpAssistState(), frame({ grounded: true }));
  for (const deltaSeconds of [0.099, COYOTE_SECONDS]) {
    const result = stepJumpAssist(supported.state, frame({ deltaSeconds, pressed: true, held: true, velocityY: 30 }));
    assert.equal(result.jump, "coyote");
    assert.equal(result.velocityY, JUMP_VELOCITY);
  }
  const late = stepJumpAssist(supported.state, frame({ deltaSeconds: 0.10001, pressed: true, held: true, velocityY: 30 }));
  assert.equal(late.jump, null);
  assert.equal(late.velocityY, 30);
});

test("a deliberate ground jump consumes coyote allowance instead of granting a free double jump", () => {
  const launched = stepJumpAssist(freshJumpAssistState(), frame({ pressed: true, held: true, grounded: true }));
  const second = stepJumpAssist(launched.state, frame({ pressed: true, held: true, velocityY: -690 }));
  assert.equal(second.jump, null);
  assert.equal(second.velocityY, -690);
  assert.equal(second.state.coyoteSeconds, 0);
});

test("an already buffered press never turns into a boost when the airborne capability later becomes available", () => {
  const waiting = stepJumpAssist(freshJumpAssistState(), frame({ pressed: true, held: true, velocityY: 200 }));
  const later = stepJumpAssist(waiting.state, frame({ held: true, canBoost: true, velocityY: 220 }));
  assert.equal(later.jump, null);
  assert.equal(later.velocityY, 220);
  assert.ok(later.state.bufferSeconds > 0);
});

test("a descending press near landing buffers a ground jump instead of spending an available boost", () => {
  let body = hunter({ x: 0, y: 485, velocityY: 160, grounded: false });
  assert.equal(predictLandingWithinBuffer(body, [], 624), true);
  let state = freshJumpAssistState();
  const events = [];
  for (let tick = 0; tick < 24; tick += 1) {
    const result = stepJumpAssist(state, frame({ pressed: tick === 0, held: tick < 3,
      grounded: body.grounded, velocityY: body.velocityY, canBoost: true,
      landingSoon: tick === 0 && predictLandingWithinBuffer(body, [], 624),
    }));
    state = result.state;
    if (result.jump) events.push(result.jump);
    const velocityY = result.velocityY + 1850 / 120;
    body = { ...body, ...resolvePlatformMotion({ ...body, velocityY }, { x: body.x, y: body.y + velocityY / 120 }, [], 624) };
  }
  assert.deepEqual(events, ["ground"]);
});

test("the landing buffer accepts 120ms exactly and expires immediately beyond it", () => {
  const waiting = stepJumpAssist(freshJumpAssistState(), frame({ pressed: true, held: true, velocityY: 100 }));
  const timely = stepJumpAssist(waiting.state, frame({ deltaSeconds: JUMP_BUFFER_SECONDS, grounded: true }));
  assert.equal(timely.jump, "ground");
  const late = stepJumpAssist(waiting.state, frame({ deltaSeconds: JUMP_BUFFER_SECONDS + 0.00001, grounded: true }));
  assert.equal(late.jump, null);
});

test("fresh airborne presses use only the external once-per-flight boost allowance", () => {
  let state = freshJumpAssistState();
  let used = false;
  const events = [];
  for (let press = 0; press < 15; press += 1) {
    const result = stepJumpAssist(state, frame({ pressed: true, held: true, canBoost: !used, velocityY: -100 }));
    state = result.state;
    if (result.jump === "boost") used = true;
    if (result.jump) events.push(result.jump);
  }
  assert.deepEqual(events, ["boost"]);
  assert.equal(used, true);
});

test("climb jumps retain their existing impulse and never reset the caller's boost allowance", () => {
  const climb = stepJumpAssist(freshJumpAssistState(), frame({ climbing: true, pressed: true, held: true, canBoost: false }));
  assert.equal(climb.jump, "climb");
  assert.equal(climb.velocityY, CLIMB_JUMP_VELOCITY);
  const airborne = stepJumpAssist(climb.state, frame({ pressed: true, held: true, canBoost: false, velocityY: -520 }));
  assert.equal(airborne.jump, null);
});

test("suspension clears pending jumps and requires neutral input before accepting a fresh press", () => {
  const waiting = stepJumpAssist(freshJumpAssistState(), frame({ pressed: true, held: true, velocityY: 100 }));
  const paused = stepJumpAssist(waiting.state, frame({ suspended: true, held: true, velocityY: 100, deltaSeconds: 30 }));
  assert.equal(paused.state.bufferSeconds, 0);
  assert.equal(paused.state.coyoteSeconds, 0);
  assert.equal(paused.state.cutArmed, false);
  const held = stepJumpAssist(paused.state, frame({ pressed: true, held: true, grounded: true }));
  assert.equal(held.jump, null);
  const neutral = stepJumpAssist(held.state, frame({ grounded: true }));
  const fresh = stepJumpAssist(neutral.state, frame({ pressed: true, held: true, grounded: true }));
  assert.equal(fresh.jump, "ground");
});

test("retry state neither inherits a release cut nor accepts the action held through restart", () => {
  const reset = freshJumpAssistState({ requireRelease: true });
  const held = stepJumpAssist(reset, frame({ pressed: true, held: true, velocityY: -720, canBoost: true }));
  assert.equal(held.jump, null);
  assert.equal(held.velocityY, -720);
  const neutral = stepJumpAssist(held.state, frame({ velocityY: -690 }));
  assert.equal(neutral.cut, false);
  assert.equal(neutral.velocityY, -690);
});

test("action locks discard both immediate and buffered requests without storing an unlock-time jump", () => {
  const waiting = stepJumpAssist(freshJumpAssistState(), frame({ pressed: true, held: true, velocityY: 100 }));
  const locked = stepJumpAssist(waiting.state, frame({ actionLocked: true, climbing: true, grounded: true, pressed: true, held: true }));
  assert.equal(locked.jump, null);
  assert.equal(locked.state.bufferSeconds, 0);
  const unlock = stepJumpAssist(locked.state, frame({ grounded: true, held: true }));
  assert.equal(unlock.jump, null);
});

test("landing prediction uses actual thin platforms and ignores one-way undersides and distant ground", () => {
  const ledge = platform(0, 350, 100, 1, "one-way");
  assert.equal(predictLandingWithinBuffer(hunter({ x: 0, y: 220, velocityY: 200 }), [ledge], 624), true);
  assert.equal(predictLandingWithinBuffer(hunter({ x: 0, y: 350, velocityY: -200 }), [ledge], 624), false);
  assert.equal(predictLandingWithinBuffer(hunter({ x: 200, y: 100, velocityY: 10 }), [ledge], 624), false);
});

test("full-height assisted jump plus one boost still reaches the authored pilot gallery", () => {
  const progress = { abilityIds: ["aerial-boost"], openedGateIds: [], secretIds: [], discoveredRoomIds: [] };
  const trial = simulate({ platforms: pilotPlatforms(progress), direction: 1, releaseFrame: 44, boostFrame: 46 });
  assert.ok(trial.trace.some((body) => body.grounded && Math.abs(body.y + body.height - 392) < 1e-5));
  assert.equal(trial.trace.filter((body) => body.jump === "boost").length, 1);
  close(trial.body.x, 1048);
  close(trial.body.y, 276);
});

test("jump assistance is pure and refuses invalid elapsed time or velocity", () => {
  const state = Object.freeze(freshJumpAssistState());
  const input = Object.freeze(frame({ pressed: true, held: true, grounded: true }));
  stepJumpAssist(state, input);
  assert.deepEqual(plain(state), plain(freshJumpAssistState()));
  for (const patch of [{ deltaSeconds: -1 }, { deltaSeconds: NaN }, { velocityY: Infinity }]) {
    assert.throws(() => stepJumpAssist(state, frame(patch)), /finite velocity/);
  }
});
