import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createHomeworldGamepadState, stepHomeworldGamepad } from '../app/game/systems/homeworldInput.ts';

const bundle = await build({ stdin: { contents: "export * from './app/game/systems/homeworldCity.ts'; export * from './app/game/systems/homeworldYouthMotionV74.ts';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const actor = () => ({ x: 0, y: 0, vx: 0, vy: 0, facing: 1, grounded: true });
const input = (x = 1, y = 0, sprinting = false) => ({ moveX: x, climb: y, jumpPressed: false, sprinting });
const advance = (state, controls, walkable = () => true, seconds = 1 / 30) => api.stepHomeworldActorOnFloor(state, controls, seconds, walkable, actor);

test('running moves 1.8 times faster on both axes, without diagonal acceleration or schema changes', () => {
  for (const [x, y] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1]]) {
    const walking = advance(actor(), input(x, y)), running = advance(actor(), input(x, y, true));
    assert(Math.abs(Math.hypot(running.x, running.y) / Math.hypot(walking.x, walking.y) - 1.8) < 1e-9);
    assert(Math.abs(Math.hypot(running.vx / api.HOMEWORLD_ACTOR.walkSpeed, running.vy / api.HOMEWORLD_ACTOR.depthSpeed) - 1.8) < 1e-9);
    assert.deepEqual(Object.keys(running).sort(), Object.keys(walking).sort(), 'sprint is transient input, never persisted in actor checkpoints');
  }
  const ordinary = advance(actor(), { moveX: 1, climb: 0, jumpPressed: false });
  assert.deepEqual(ordinary, advance(actor(), input()), 'old callers preserve exact walking behavior');
});

test('low FPS sprint cannot tunnel through a thin wall and cannot cross unsupported floor edges', () => {
  for (const sign of [-1, 1]) {
    // A naive 1/60 sprint step is 9.9 units: it would jump from 9.9 to 19.8,
    // over the forbidden [12,18] slab. Real actor-footprint checks add width.
    const floor = p => sign * p.x < 12 || sign * p.x > 18;
    let state = actor();
    for (let frame = 0; frame < 100; frame++) state = advance(state, input(sign, 0, true), floor, 10);
    assert(sign * state.x <= 12, 'running cannot skip the collision sample even after a 10-second frame stall');
    assert.equal(state.vx, 0);
  }
  let edge = actor();
  for (let frame = 0; frame < 100; frame++) edge = advance(edge, input(1, 0, true), p => p.x <= 37);
  assert(edge.x <= 37); assert.equal(edge.vx, 0);
});

test('running slides along a wall with its full body checks, then releasing restores walk speed immediately', () => {
  let state = actor();
  for (let frame = 0; frame < 10; frame++) state = advance(state, input(1, 1, true), p => p.x <= 12);
  assert(state.x <= 12); assert(state.y > 50); assert.equal(state.vx, 0); assert(state.vy > 0);
  const released = advance(state, input(0, 1));
  assert(Math.abs(released.vy - api.HOMEWORLD_ACTOR.depthSpeed) < 1e-9);
});

test('native walk cycle follows faster travel and collision changes it to idle without an independent timer', () => {
  const walking = advance(actor(), input()), running = advance(actor(), input(1, 0, true));
  const frame = state => api.homeworldYouthFrameV74({ seconds: 999, moving: true, velocity: { x: state.vx, y: state.vy }, distanceWorld: Math.hypot(state.x, state.y), lastDirection: 'e' });
  assert.equal(frame(walking).index, 0); assert.equal(frame(running).index, 0);
  const second = advance(running, input(1, 0, true));
  assert.equal(frame(second).index, 1, 'native pose advances by traversed floor distance');
  const stopped = advance(second, input(1, 0, true), p => p.x <= second.x);
  assert.equal(frame(stopped).clipId, 'idle'); assert.equal(stopped.vx, 0);
});

test('sprint keeps the bounded time contract, validates the boolean and never moves a zero/invalid step', () => {
  assert.deepEqual(advance(actor(), input(1, 0, true), () => true, 99), advance(actor(), input(1, 0, true)));
  for (const seconds of [0, -1, NaN, Infinity]) assert.equal(advance(actor(), input(1, 0, true), () => true, seconds).x, 0);
  assert.deepEqual(advance(actor(), input(1, 0, 'true')), advance(actor(), input()));
  assert.deepEqual(advance(actor(), input(NaN, Infinity, true)), actor());
});

test('L3 is a held world input, requires full neutral on entry and cannot move dialog/paused surfaces', () => {
  const pad = { connected: true, id: 'run-pad', index: 0, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  pad.buttons[10].pressed = true;
  let state = createHomeworldGamepadState();
  let step = stepHomeworldGamepad(state, pad, 'world'); state = step.state;
  assert.equal(step.movement.sprint, false); assert.equal(state.ready, false);
  pad.buttons[10].pressed = false; step = stepHomeworldGamepad(state, pad, 'world'); state = step.state;
  assert.equal(state.ready, true);
  pad.buttons[10].pressed = true; pad.axes[0] = 1;
  step = stepHomeworldGamepad(state, pad, 'world');
  assert.equal(step.movement.sprint, true); assert.equal(step.movement.right, true);
  for (const context of ['inactive', 'dialog', 'paused']) {
    const elsewhere = stepHomeworldGamepad(step.state, pad, context);
    assert.equal(elsewhere.movement.sprint, false); assert.equal(elsewhere.movement.right, false);
  }
});
