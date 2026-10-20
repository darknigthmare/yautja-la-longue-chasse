import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const compiled = await build({ entryPoints: ['app/game/systems/gameReserveV66.ts'], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const run = (initial, count, input = {}) => {
  let state = initial;
  for (let n = 0; n < count; n++) state = api.stepGameReserveV66(state, input);
  return state;
};
function quiet() {
  const state = api.stepGameReserveV66(api.createGameReserveV66(37));
  state.humans.forEach((human, n) => Object.assign(human, { x: 4200 + n * 30, status: 'down', hp: 0, downAt: 0, carrying: false }));
  assert.equal(api.gameReserveV66MaterialTotal(state), 16);
  assert.ok(api.normalizeGameReserveV66(state));
  return state;
}
function recovery() {
  const state = quiet();
  state.supplies[0]--;
  Object.assign(state.humans[0], { x: 2200, carrying: true, secured: true });
  Object.assign(state.humans[1], { x: 2180, status: 'active', hp: 70, downAt: null });
  Object.assign(state.humans[2], { x: 2220, status: 'active', hp: 70, downAt: null });
  assert.ok(api.normalizeGameReserveV66(state));
  return state;
}
const validTransition = (before, after) => {
  assert.ok(api.normalizeGameReserveV66(after));
  assert.ok(api.canAdvanceGameReserveV66(before, after), `${before.tick} → ${after.tick}`);
  assert.equal(api.gameReserveV66MaterialTotal(after), api.gameReserveV66MaterialTotal(before));
};

test('review: a secured fallen carrier has one physical recovery claimant and one eventual delivery across sparse checkpoints', () => {
  const initial = recovery();
  let state = initial, checkpoint = initial, sawClaim = false, sawRecovered = false;
  for (let n = 0; n < 500; n++) {
    state = api.stepGameReserveV66(state);
    const claimants = state.humans.filter(person => person.recovering?.bodyId === initial.humans[0].id);
    assert.ok(claimants.length <= 1);
    if (claimants.length) sawClaim = true;
    if (!state.humans[0].carrying) sawRecovered = true;
    assert.equal(api.gameReserveV66MaterialTotal(state), 16);
    if (n % 47 === 0 || n === 499) { validTransition(checkpoint, state); checkpoint = state; }
    if (state.ships[0].parts === 1) break;
  }
  assert.equal(sawClaim, true);
  assert.equal(sawRecovered, true);
  assert.equal(state.ships[0].parts, 1);
  assert.equal(state.humans[0].status, 'down');
  assert.equal(state.humans[0].secured, true);
  assert.equal(state.humans.filter(person => person.carrying).length, 0);
  validTransition(initial, state);
});

test('review: the final recovery frame is interrupted by a real projectile and a surviving ally restarts the physical channel', () => {
  const initial = recovery();
  Object.assign(initial.humans[1], { x: 2195, hp: 36, recovering: { bodyId: initial.humans[0].id, ticks: 89 } });
  initial.projectiles.push({ x: 2191, y: 390, vx: 4, vy: 0, owner: 'hunter', life: 4 });
  assert.ok(api.normalizeGameReserveV66(initial));
  const interrupted = api.stepGameReserveV66(initial);
  assert.equal(interrupted.humans[1].status, 'down');
  assert.equal(interrupted.humans[1].recovering, undefined);
  assert.equal(interrupted.humans[0].carrying, true);
  assert.equal(interrupted.humans[2].carrying, false);
  validTransition(initial, interrupted);
  const restarted = api.stepGameReserveV66(interrupted);
  assert.equal(restarted.humans[2].recovering?.bodyId, initial.humans[0].id);
  assert.equal(restarted.humans[2].recovering?.ticks, 0);
  const recovered = run(restarted, 120);
  assert.equal(recovered.humans[0].carrying, false);
  assert.equal(recovered.humans[2].carrying, true);
  assert.equal(recovered.humans[1].status, 'down');
  validTransition(initial, recovered);
});

test('review: full aircraft retain late components through boarding and departure, including a readable historical deficit', () => {
  const initial = quiet();
  // Historical V66 checkpoints may contain less than sixteen lots. Read them
  // exactly, then preserve that historical total on every new runtime step.
  initial.supplies = [0, 0, 0, 0, 0, 2, 2, 2];
  initial.ships[0] = { parts: 4, repair: 3600, launch: 0, departedAt: null, sabotages: 0 };
  Object.assign(initial.humans[0], { x: 2360, status: 'active', hp: 70, downAt: null, carrying: true });
  assert.equal(api.gameReserveV66MaterialTotal(initial), 11);
  assert.deepEqual(api.normalizeGameReserveV66(initial), initial);
  const boarded = api.stepGameReserveV66(initial);
  assert.equal(boarded.humans[0].status, 'boarded');
  assert.equal(boarded.humans[0].carrying, true);
  validTransition(initial, boarded);
  const escaped = run(boarded, 899);
  assert.equal(escaped.humans[0].status, 'escaped');
  assert.equal(escaped.humans[0].carrying, true);
  assert.equal(api.gameReserveV66MaterialTotal(escaped), 11);
  validTransition(initial, escaped);
});

test('review: ground depot sabotage is atomic at 120 frames and a hit on the final frame discards progress', () => {
  const initial = quiet(); initial.player.x = api.GAME_RESERVE_V66_SUPPLIES[0];
  const almost = run(initial, 119, { interact: true });
  assert.equal(almost.channel.kind, 'cache');
  assert.equal(almost.channel.ticks, 119);
  assert.equal(almost.deniedSupplies, undefined);
  assert.equal(api.stepGameReserveV66(almost, { interact: true }, true), almost);
  const hit = structuredClone(almost);
  hit.projectiles.push({ x: hit.player.x - 4, y: 390, vx: 4, vy: 0, owner: 'human', life: 4 });
  const interrupted = api.stepGameReserveV66(hit, { interact: true });
  assert.equal(interrupted.player.hp, 92);
  assert.equal(interrupted.channel.ticks, 0);
  assert.equal(interrupted.supplies[0], 2);
  assert.equal(interrupted.deniedSupplies, undefined);
  validTransition(initial, interrupted);
  const once = run(interrupted, 120, { interact: true });
  assert.equal(once.supplies[0], 1);
  assert.equal(once.deniedSupplies[0], 1);
  const twice = run(once, 120, { interact: true });
  assert.equal(twice.supplies[0], 0);
  assert.equal(twice.deniedSupplies[0], 2);
  assert.equal(api.gameReserveV66Interaction(twice).kind, 'none');
  validTransition(initial, twice);
  for (const mutate of [
    state => { delete state.deniedSupplies; },
    state => { state.deniedSupplies[0]--; },
    state => { state.supplies[0]++; },
    state => { state.humans[0].carrying = true; },
  ]) {
    const forged = structuredClone(twice); forged.tick++; mutate(forged);
    assert.equal(api.canAdvanceGameReserveV66(twice, forged), false);
  }
});

test('review: a last depot lot taken by a survivor on the completion frame cannot also be neutralized', () => {
  const initial = quiet(); initial.player.x = 720;
  initial.supplies[0] = 1;
  initial.channel = { kind: 'cache', target: 0, ticks: 119 };
  Object.assign(initial.humans[0], { x: 732, facing: 1, status: 'active', hp: 70, downAt: null, work: 149 });
  // Cloak plus facing away keeps the local worker out of combat for this
  // single completion frame; the actor remains physically at the same depot.
  initial.player.x = 676; initial.player.cloak = true;
  initial.humans[0].facing = 1;
  assert.ok(api.normalizeGameReserveV66(initial));
  const next = api.stepGameReserveV66(initial, { interact: true });
  assert.equal(next.humans[0].carrying, true);
  assert.equal(next.supplies[0], 0);
  assert.equal(next.deniedSupplies, undefined);
  assert.equal(next.channel.kind, 'none');
  validTransition(initial, next);
});
