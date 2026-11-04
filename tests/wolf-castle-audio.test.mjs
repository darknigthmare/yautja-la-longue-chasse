import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const castle = qa.load('app/game/systems/wolfCastle.ts');
const combat = qa.load('app/game/systems/wolfCastleCombat.ts');
const { WolfCastleAudio, WOLF_CASTLE_SOUND_CUES } = qa.load('app/game/systems/wolfCastleAudio.ts');
const context = { ownerCreatedAt: '2026-11-04T12:00:00.000Z', personalShipId: 'classic-predator-spaceship' };
const idle = { moveX: 0, moveY: 0, attack: false, parry: false, evade: false };
const step = (state, input = {}) => combat.stepWolfCastleCombat(state, { ...idle, ...input }, 20);
function court() {
  let state = castle.createWolfCastleVisit(context.ownerCreatedAt, context.personalShipId);
  state = castle.actWolfCastle(state, { type: 'board' }, context).state;
  for (const roomId of castle.wolfCastleRoute(state.roomId, 'royal-court').slice(1)) {
    state = castle.actWolfCastle(state, { type: 'move-room', roomId }, context).state;
  }
  return state;
}
function harness(saved = court()) {
  const played = [], loops = [], calls = [];
  let activeLoop = null;
  const voice = {
    loop(key) { if (activeLoop !== key) loops.push(key); activeLoop = key; },
    play(sound) { played.push(Object.entries(WOLF_CASTLE_SOUND_CUES).find(([, value]) => value === sound)?.[0]); return true; },
    unlock() { calls.push('unlock'); },
    stop() { calls.push('stop'); activeLoop = null; },
    dispose() { calls.push('dispose'); activeLoop = null; },
  };
  return { director: new WolfCastleAudio(voice, saved), saved, played, loops, calls, get activeLoop() { return activeLoop; } };
}

test('the approach and all nine connected rooms select the authored ambience without combat effects', () => {
  let visit = castle.createWolfCastleVisit(context.ownerCreatedAt, context.personalShipId);
  const h = harness(visit);
  h.director.sync(visit);
  assert.equal(h.activeLoop, 'wolf:orbit');
  visit = castle.actWolfCastle(visit, { type: 'board' }, context).state;
  h.director.sync(visit);
  const expected = ['berth', 'berth', 'gallery', 'gallery', 'audience', 'audience', 'gallery', 'court', 'service'];
  for (const [i, roomId] of castle.WOLF_CASTLE_ROOM_IDS.entries()) {
    for (const nextRoom of castle.wolfCastleRoute(visit.roomId, roomId).slice(1)) {
      visit = castle.actWolfCastle(visit, { type: 'move-room', roomId: nextRoom }, context).state;
      h.director.sync(visit);
    }
    assert.equal(h.activeLoop, `wolf:${expected[i]}`, roomId);
  }
  assert.deepEqual(h.played, []);
  h.director.dispose();
});

test('three real encounters produce attack warnings, parries, impacts and a single final victory', () => {
  const h = harness();
  let state = combat.createWolfCastleCombat();
  h.director.sync(h.saved, state);
  for (let encounter = 0; encounter < 3; encounter++) {
    for (let frame = 0; frame < 20_000 && state.status === 'active'; frame++) {
      const p = state.player, e = state.enemy, dx = e.x - p.x, dy = e.y - p.y;
      const imminent = e.phase === 'windup' && e.phaseMs < 185 && p.attackMs === 0 && p.defenseCooldownMs === 0;
      state = step(state, {
        moveX: Math.abs(dx) > 130 || Math.sign(dx) !== p.facing ? Math.sign(dx) : 0,
        moveY: Math.abs(dy) > 10 ? Math.sign(dy) : 0,
        attack: e.phase === 'recovery' && Math.abs(dx) < 145 && Math.abs(dy) < 35 && p.attackCooldownMs === 0,
        parry: imminent && e.strike === 'thrust', evade: imminent && e.strike === 'sweep',
      });
      h.director.sync(h.saved, state);
    }
    assert.equal(state.status, encounter === 2 ? 'victory' : 'intermission');
    if (encounter < 2) {
      state = combat.advanceWolfCastleCombatEncounter(state);
      h.director.sync(h.saved, state);
    }
  }
  for (const cue of ['attack', 'hit', 'parry', 'evade', 'thrust-warning', 'sweep-warning']) assert.ok(h.played.includes(cue), cue);
  assert.equal(h.played.filter(cue => cue === 'begin').length, 3);
  assert.equal(h.played.filter(cue => cue === 'intermission').length, 2);
  assert.equal(h.played.filter(cue => cue === 'victory').length, 1);
  const count = h.played.length;
  for (let i = 0; i < 10; i++) h.director.sync({ ...h.saved, revision: i + 30, combat: state }, state);
  assert.equal(h.played.length, count, 'repeated durable snapshots do not replay the result');
  h.director.dispose();
});

test('restoring a saved strike consumes it while the next actual action remains audible', () => {
  let state = step(combat.createWolfCastleCombat(), { attack: true });
  const saved = { ...court(), combat: state };
  const h = harness(saved);
  h.director.sync(saved);
  h.director.sync({ ...saved, revision: saved.revision + 1 });
  assert.deepEqual(h.played, []);
  for (let frame = 0; frame < 40; frame++) {
    state = step(state);
    h.director.sync(saved, state);
  }
  assert.deepEqual(h.played, ['miss'], 'the future resolution of the saved attack has its own sequence');
  state = step(state, { attack: true });
  h.director.sync(saved, state);
  assert.equal(h.played.at(-1), 'attack');
  h.director.dispose();
});

test('pause and blocked checkpoints consume changes without queuing a burst when resumed', () => {
  const h = harness();
  let state = combat.createWolfCastleCombat();
  h.director.sync(h.saved, state);
  const count = h.played.length;
  h.director.suspend();
  state = step(state, { attack: true });
  h.director.sync(h.saved, state, false);
  assert.equal(h.activeLoop, null);
  h.director.sync(h.saved, state, true);
  assert.equal(h.activeLoop, 'wolf:court');
  assert.equal(h.played.length, count);
  h.director.sync(h.saved, state, false);
  h.director.sync(h.saved, state, false);
  assert.equal(h.calls.filter(call => call === 'stop').length, 2);
  h.director.dispose();
});

test('an external time jump suppresses stale events but preserves the next timely strike', () => {
  const h = harness();
  let state = combat.createWolfCastleCombat();
  h.director.sync(h.saved, state);
  for (let i = 0; i < 50; i++) state = step(state);
  state = step(state, { attack: true });
  h.director.sync(h.saved, state);
  assert.deepEqual(h.played, ['begin']);
  for (let i = 0; i < 8; i++) { state = step(state); h.director.sync(h.saved, state); }
  assert.ok(h.played.includes('miss'));
  h.director.dispose();
});

test('changing campaign ownership consumes the incoming state and departure releases the active room', () => {
  const h = harness();
  h.director.sync(h.saved);
  const foreign = { ...h.saved, ownerCreatedAt: '2026-11-05T12:00:00.000Z', combat: step(combat.createWolfCastleCombat(), { attack: true }) };
  h.director.sync(foreign);
  assert.deepEqual(h.played, []);
  assert.equal(h.calls.filter(call => call === 'stop').length, 1);
  h.director.sync({ ...foreign, status: 'departed' });
  assert.equal(h.activeLoop, null);
  h.director.dispose();
});

test('disposing the director is final even when late input or state publications arrive', () => {
  const h = harness();
  h.director.sync(h.saved);
  h.director.unlock();
  h.director.dispose();
  const calls = [...h.calls];
  h.director.sync(h.saved, combat.createWolfCastleCombat());
  h.director.unlock();
  h.director.suspend();
  h.director.dispose();
  assert.deepEqual(h.calls, calls);
  assert.deepEqual(h.played, []);
  assert.equal(h.activeLoop, null);
});
