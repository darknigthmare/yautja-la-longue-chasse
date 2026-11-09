import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const bay = qa.load('app/game/systems/warpModuleBay.ts');
const save = qa.load('app/game/save.ts').defaultSave('2026-11-09T10:00:00.000Z');
const { createWarpBayState: initial, actWarpBay: act, stepWarpBay: step, warpBayStations: stations,
  warpBayWalkable: walkable, planWarpBayPath: plan, stepWarpBayPath: follow } = bay;
function walk(state, point) {
  let path = plan(state, point);
  assert.ok(path.length, `${state.roomId}: path to ${JSON.stringify(point)}`);
  const start = state.walked;
  for (let i = 0; path.length && i < 4000; i++) {
    const prior = state;
    const result = follow(state, path, 1 / 60);
    state = result.state; path = result.remaining;
    assert.ok(walkable(state.roomId, state.actor, state.doorOpen));
    assert.ok(Math.hypot(state.actor.x - prior.actor.x, state.actor.y - prior.actor.y) <= 230 / 60 + 1e-6, 'no teleport in route');
  }
  assert.equal(path.length, 0, 'bounded route reaches endpoint');
  assert.ok(Math.hypot(state.actor.x - point.x, state.actor.y - point.y) < 0.51);
  assert.ok(state.walked >= start);
  return state;
}
function use(state, id) {
  const station = stations(state.roomId).find(item => item.id === id);
  state = walk(state, station.approach);
  const result = act(state, id);
  assert.equal(result.accepted, true, `${id}: ${result.message}`);
  return result.state;
}

test('prototype starts on authored ground, with no campaign access or earned state', () => {
  const state = initial();
  assert.equal(state.roomId, 'bay');
  assert.equal(state.doorOpen, false);
  assert.equal(state.benchTested, false);
  assert.equal(state.walked, 0);
  assert.ok(walkable(state.roomId, state.actor, state.doorOpen));
  assert.deepEqual(Object.keys(state).sort(), ['actor','archivistHeard','benchTested','consoleRead','doorOpen','memoryRead','roomId','visited','walked']);
  assert.equal(act(state, 'calibrate').accepted, false);
});

test('reading from a distant position neither acts nor moves a hunter', () => {
  const state = initial(), before = JSON.stringify(state);
  for (const id of ['console', 'archive', 'archivist', 'door', 'cross', 'exit']) {
    const result = act(state, id);
    assert.equal(result.accepted, false);
    assert.equal(result.state, state);
  }
  assert.equal(JSON.stringify(state), before);
});

test('closed airlock prevents path and continuous motion through its aperture', () => {
  let state = walk(initial(), { x: 900, y: 500 });
  assert.deepEqual(plan(state, { x: 900, y: 450 }), []);
  for (let i = 0; i < 200; i++) state = step(state, { x: 0, y: -1 }, 0.05);
  assert.ok(state.actor.y >= 484 - 1e-6);
  assert.equal(act(state, 'cross').accepted, false);
  assert.equal(state.roomId, 'bay');
});

test('each bay station has a usable, continuous return route around the real props', () => {
  let state = initial();
  for (const id of ['console', 'archive', 'archivist', 'door', 'exit']) {
    const station = stations('bay').find(s => s.id === id);
    state = walk(state, station.approach);
    state = walk(state, initial().actor);
  }
  assert.equal(state.roomId, 'bay');
  assert.ok(state.walked > 2500);
});

test('door command, physical threshold, dry bench and two-way return form one spatial loop', () => {
  let state = initial();
  const before = JSON.stringify(state);
  state = use(state, 'console');
  state = use(state, 'archive');
  state = use(state, 'archivist');
  state = use(state, 'door');
  assert.equal(state.doorOpen, true);
  state = use(state, 'cross');
  assert.equal(state.roomId, 'synchronization');
  assert.deepEqual(state.visited, ['bay', 'synchronization']);
  state = use(state, 'calibrate');
  assert.equal(state.benchTested, true);
  state = use(state, 'door');
  assert.equal(state.doorOpen, false);
  state = use(state, 'door');
  state = use(state, 'cross');
  assert.equal(state.roomId, 'bay');
  state = walk(state, stations('bay').find(s => s.id === 'exit').approach);
  assert.equal(act(state, 'exit').exit, true);
  assert.ok(state.walked > 2200);
  assert.equal(before, JSON.stringify(initial()), 'initial state is never mutated');
});

test('bench refuses out-of-order testing while preserving the physical route home', () => {
  let state = use(initial(), 'door');
  state = use(state, 'cross');
  state = walk(state, stations('synchronization').find(s => s.id === 'calibrate').approach);
  const denied = act(state, 'calibrate');
  assert.equal(denied.accepted, false);
  assert.equal(denied.state, state);
  assert.equal(state.benchTested, false);
  state = use(state, 'cross');
  assert.equal(state.roomId, 'bay');
});

test('low frame rates, invalid input and diagonal motion respect one bounded movement clock', () => {
  const state = initial();
  assert.equal(step(state, { x: NaN, y: 0 }, 1), state);
  assert.equal(step(state, { x: 1, y: 0 }, NaN), state);
  assert.equal(step(state, { x: 1, y: 0 }, -1), state);
  assert.equal(step(state, { x: 0, y: 0 }, 1), state);
  const largeGap = step(state, { x: 1, y: 0 }, 60);
  assert.ok(Math.hypot(largeGap.actor.x - state.actor.x, largeGap.actor.y - state.actor.y) <= 11.500001);
  const diagonal = step(state, { x: 1, y: 1 }, 0.01);
  assert.ok(Math.abs(diagonal.walked - 2.3) < 0.000001);
});

test('every authored footprint and exterior floor remain solid with open and closed doors', () => {
  for (const room of ['bay', 'synchronization']) for (const open of [true, false]) {
    for (const p of [{ x: -1, y: 490 }, { x: 1001, y: 490 }, { x: 500, y: 420 }, { x: 500, y: 530 }, { x: Infinity, y: 490 }]) assert.equal(walkable(room, p, open), false);
  }
  assert.equal(walkable('bay', { x: 625, y: 450 }, true), false, 'memory plinth');
  assert.equal(walkable('bay', { x: 730, y: 450 }, true), false, 'archivist footprint');
  for (const room of ['bay', 'synchronization']) {
    const x = bay.WARP_BAY_ROOMS[room].doorX;
    assert.equal(walkable(room, { x, y: 450 }, false), false);
    assert.equal(walkable(room, { x, y: 450 }, true), true);
  }
});

test('real component exposes accessible posts and the current closed door without writing saves', () => {
  const original = JSON.stringify(save);
  const html = qa.render('app/game/WarpModuleBay.tsx', { save, onExit: () => assert.fail('SSR must not exit') });
  assert.match(html, /data-warp-module-bay/);
  assert.match(html, /data-warp-room="bay"/);
  assert.match(html, /data-warp-door-state="closed"/);
  for (const id of ['console','archive','archivist','door','cross','exit']) assert.ok(html.includes(`data-warp-action="${id}"`));
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /Aucun rang, recrutement ou transit de campagne/);
  assert.equal(JSON.stringify(save), original);
});

test('runtime assets preserve three originals and declare two new unvalidated single images', () => {
  const manifest = JSON.parse(fs.readFileSync('public/game/warp-universe/20261109/manifest.json', 'utf8'));
  assert.equal(manifest.assets.length, 5);
  for (const asset of manifest.assets) {
    const raw = fs.readFileSync(asset.path);
    assert.equal(createHash('sha256').update(raw).digest('hex'), asset.sha256);
    assert.equal(asset.artisticValidated, false);
    assert.equal(asset.animationFrames, 1);
    if (asset.origin === 'existing-source-candidate') assert.deepEqual(raw, fs.readFileSync(asset.source));
  }
  const door = manifest.assets.find(asset => asset.id === 202);
  assert.deepEqual(door.alphaRange, [0,255]);
  assert.equal(door.centerAlpha, 0, 'aperture is genuine alpha');
});
