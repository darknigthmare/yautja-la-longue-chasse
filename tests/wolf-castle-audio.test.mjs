import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const castle = qa.load('app/game/systems/wolfCastle.ts');
const combat = qa.load('app/game/systems/wolfCastleCombat.ts');
const dungeon = qa.load('app/game/systems/wolfCastleDungeon.ts');
const { WolfCastleAudio, WOLF_CASTLE_SOUND_CUES, WOLF_CASTLE_EXPLORATION_CUES } = qa.load('app/game/systems/wolfCastleAudio.ts');
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
function visitAt(roomId, options = {}) {
  let state = castle.createWolfCastleVisit(context.ownerCreatedAt, context.personalShipId, options);
  state = castle.actWolfCastle(state, { type: 'board' }, context).state;
  for (const next of castle.wolfCastleRoute(state.roomId, roomId).slice(1)) state = castle.actWolfCastle(state, { type: 'move-room', roomId: next }, context).state;
  return state;
}
function harness(saved = court()) {
  const played = [], loops = [], calls = [];
  let activeLoop = null;
  const voice = {
    loop(key) { if (activeLoop !== key) loops.push(key); activeLoop = key; },
    play(sound) { played.push(Object.entries({ ...WOLF_CASTLE_SOUND_CUES, ...WOLF_CASTLE_EXPLORATION_CUES }).find(([, value]) => value === sound)?.[0]); return true; },
    unlock() { calls.push('unlock'); },
    stop() { calls.push('stop'); activeLoop = null; },
    dispose() { calls.push('dispose'); activeLoop = null; },
  };
  return { director: new WolfCastleAudio(voice, saved), saved, played, loops, calls, get activeLoop() { return activeLoop; } };
}
function confirm(h, before, action, enabled = true) {
  const result = castle.actWolfCastle(before, action, context);
  assert.equal(result.accepted, true, result.message);
  h.director.sync(result.state, undefined, enabled);
  h.director.confirmedAction(before, action, result.state);
  return result.state;
}
function walk(h, visit, from, frames, input = { x: 1, y: 0 }, enabled = true) {
  let point = from;
  for (let i = 0; i < frames; i++) {
    const next = castle.stepWolfCastleActor(visit.roomId, point, input, 20);
    h.director.motion(visit, point, next, enabled);
    point = next;
  }
  return point;
}
function checkpoint(h, visit, position, dungeonCombat = visit.dungeon?.combat ?? null) {
  const result = castle.applyWolfCastleCheckpoint(visit, { ...context, roomId: visit.roomId, expectedRevision: visit.revision,
    position, combat: visit.combat, dungeonCombat }, context);
  assert.equal(result.accepted, true, result.reason);
  h.director.sync(result.state);
  return result.state;
}
function station(h, visit, kind) {
  const target = castle.wolfCastleRoom(visit.roomId).stations.find(value => value.kind === kind);
  assert.ok(target, `station ${kind}`);
  const point = [{ x: 0, y: 0 }, { x: 0, y: 40 }, { x: -40, y: 0 }, { x: 40, y: 0 }, { x: 0, y: -40 }, { x: 0, y: 80 }]
    .map(offset => ({ x: target.x + offset.x, y: target.y + offset.y, facing: 1 }))
    .find(value => castle.isWolfCastlePointWalkable(visit.roomId, value));
  assert.ok(point, `walkable access to ${kind}`);
  return checkpoint(h, visit, point);
}
function travel(h, visit, destination) {
  for (const roomId of castle.wolfCastleRoute(visit.roomId, destination).slice(1)) visit = confirm(h, visit, { type: 'move-room', roomId });
  return visit;
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
  h.director.motion(h.saved, { x: 300, y: 648 }, { x: 310, y: 648 });
  const action = { type: 'start-trial' };
  h.director.confirmedAction(h.saved, action, castle.actWolfCastle(h.saved, action, context).state);
  h.director.unlock();
  h.director.suspend();
  h.director.dispose();
  assert.deepEqual(h.calls, calls);
  assert.deepEqual(h.played, []);
  assert.equal(h.activeLoop, null);
});

test('only a confirmed room transition sounds; saves, rejected doors and repeated confirmations remain silent', () => {
  const before = castle.createWolfCastleVisit(context.ownerCreatedAt, context.personalShipId);
  const h = harness(before);
  h.director.sync(before);
  const aboard = confirm(h, before, { type: 'board' });
  h.director.confirmedAction(before, { type: 'board' }, aboard);
  assert.deepEqual(h.played, ['door']);
  const action = { type: 'move-room', roomId: 'royal-airlock' };
  const after = castle.actWolfCastle(aboard, action, context).state;
  h.director.sync(after);
  assert.deepEqual(h.played, ['door'], 'an incoming room snapshot is not a confirmed door');
  h.director.confirmedAction(aboard, action, after);
  h.director.confirmedAction(aboard, action, after);
  assert.deepEqual(h.played, ['door', 'door']);
  for (const request of [action, { type: 'move-room', roomId: 'royal-court' }]) {
    const result = castle.actWolfCastle(after, request, context);
    assert.equal(result.changed, false);
    h.director.confirmedAction(after, request, result.state);
  }
  for (let i = 1; i <= 10; i++) h.director.sync({ ...after, revision: after.revision + i });
  assert.deepEqual(h.played, ['door', 'door']);
  const restored = harness(after);
  restored.director.sync(after);
  restored.director.confirmedAction(aboard, action, after);
  assert.deepEqual(restored.played, [], 'restoring an already confirmed transition cannot replay its sound');
  h.director.dispose(); restored.director.dispose();
});

test('audience decisions and archive acknowledgement sound once for their actual durable changes', () => {
  let visit = visitAt('royal-audience', { invitationId: 'wolf-protocol:introduction', mode: 'audience' });
  const h = harness(visit);
  h.director.sync(visit);
  visit = confirm(h, visit, { type: 'hear-audience' });
  visit = confirm(h, visit, { type: 'hear-audience' });
  for (const roomId of castle.wolfCastleRoute(visit.roomId, 'royal-council').slice(1)) visit = confirm(h, visit, { type: 'move-room', roomId });
  visit = confirm(h, visit, { type: 'decide-audience', decision: 'deferred' });
  visit = confirm(h, visit, { type: 'decide-audience', decision: 'accepted' });
  visit = confirm(h, visit, { type: 'decide-audience', decision: 'accepted' });
  for (const roomId of castle.wolfCastleRoute(visit.roomId, 'royal-archives').slice(1)) visit = confirm(h, visit, { type: 'move-room', roomId });
  visit = confirm(h, visit, { type: 'read-archive' });
  confirm(h, visit, { type: 'read-archive' });
  assert.deepEqual(h.played.filter(cue => cue !== 'door'), ['audience', 'audience', 'audience', 'archive']);
  h.director.dispose();
});

test('the ordered seals distinguish activation, an order reset and final completion without replaying a checkpoint', () => {
  const h = harness();
  let visit = h.saved;
  h.director.sync(visit);
  visit = confirm(h, visit, { type: 'start-trial' });
  visit = confirm(h, visit, { type: 'activate-seal', sealId: 'threshold' });
  visit = confirm(h, visit, { type: 'activate-seal', sealId: 'threshold' });
  visit = confirm(h, visit, { type: 'activate-seal', sealId: 'return' });
  for (const sealId of castle.WOLF_CASTLE_SEALS) visit = confirm(h, visit, { type: 'activate-seal', sealId });
  visit = confirm(h, visit, { type: 'finish-trial' });
  visit = confirm(h, visit, { type: 'finish-trial' });
  h.director.sync({ ...visit, revision: visit.revision + 1 });
  assert.deepEqual(h.played, ['trial-begin', 'seal', 'seal-reset', 'seal', 'seal', 'seal', 'trial-complete']);
  const restored = harness(visit);
  restored.director.sync(visit);
  assert.deepEqual(restored.played, []);
  h.director.dispose(); restored.director.dispose();
});

test('a confirmation completed behind a pause is consumed, while the next live seal remains audible', () => {
  const h = harness();
  h.director.sync(h.saved);
  h.director.suspend();
  const action = { type: 'start-trial' };
  const after = confirm(h, h.saved, action, false);
  h.director.sync(after);
  h.director.confirmedAction(h.saved, action, after);
  assert.deepEqual(h.played, []);
  confirm(h, after, { type: 'activate-seal', sealId: 'threshold' });
  assert.deepEqual(h.played, ['seal']);
  h.director.dispose();
});

test('confirmed combat commands never double the simulation begin cue', () => {
  const h = harness();
  h.director.sync(h.saved);
  confirm(h, h.saved, { type: 'start-combat' });
  assert.deepEqual(h.played, ['begin']);
  h.director.dispose();
});

test('exploration steps follow collision-resolved distance and select the room surface', () => {
  for (const [roomId, cue] of [['royal-berth', 'step-metal'], ['royal-archives', 'step-stone']]) {
    const visit = visitAt(roomId), h = harness(visit);
    h.director.sync(visit);
    const start = { x: 300, y: 648 };
    assert.ok(castle.isWolfCastlePointWalkable(roomId, start));
    const end = walk(h, visit, start, 40);
    assert.ok(end.x - start.x > 172, 'the fixture actually traverses the room');
    assert.deepEqual(h.played, [cue, cue]);
    walk(h, visit, end, 120, { x: 0, y: 0 });
    assert.deepEqual(h.played, [cue, cue], 'idle animation does not make footsteps');
    h.director.dispose();
  }
  const visit = visitAt('royal-berth'), h = harness(visit);
  h.director.sync(visit);
  const blocked = { x: castle.WOLF_CASTLE_WORLD.floor.x + castle.WOLF_CASTLE_WORLD.actorRadius, y: 648 };
  const end = walk(h, visit, blocked, 120, { x: -1, y: 0 });
  assert.deepEqual(end, blocked, 'the actor is held against the collision boundary');
  assert.deepEqual(h.played, [], 'held movement against a wall does not sound');
  h.director.dispose();
});

test('pause, dialog suppression, relocation and reload discard partial footsteps instead of queuing a burst', () => {
  const visit = visitAt('royal-berth'), h = harness(visit);
  h.director.sync(visit);
  let point = walk(h, visit, { x: 300, y: 648 }, 15);
  assert.deepEqual(h.played, []);
  h.director.suspend(); h.director.sync(visit);
  point = walk(h, visit, point, 1);
  assert.deepEqual(h.played, [], 'a paused partial stride is discarded');
  point = walk(h, visit, point, 30, { x: 1, y: 0 }, false);
  point = walk(h, visit, point, 1);
  assert.deepEqual(h.played, [], 'dialog-suppressed travel has no queued steps');
  h.director.motion(visit, point, { x: point.x + 400, y: point.y });
  point = { x: 300, y: 648 };
  walk(h, visit, point, 15);
  assert.deepEqual(h.played, [], 'relocation cannot produce or preserve a partial stride');
  const restored = harness(visit);
  restored.director.sync(visit);
  restored.director.sync({ ...visit, revision: visit.revision + 1, position: { x: 600, y: 648, facing: 1 } });
  walk(restored, visit, { x: 600, y: 648 }, 1);
  assert.deepEqual(restored.played, [], 'a restored position is not travelled distance');
  h.director.dispose(); restored.director.dispose();
});

test('combat movement and stale owner callbacks cannot produce exploration footsteps or confirmations', () => {
  const h = harness();
  h.director.sync(h.saved, combat.createWolfCastleCombat());
  walk(h, h.saved, { x: 300, y: 648 }, 40);
  assert.deepEqual(h.played, ['begin']);
  const foreign = { ...h.saved, ownerCreatedAt: '2026-11-05T12:00:00.000Z' };
  h.director.sync(foreign);
  walk(h, h.saved, { x: 300, y: 648 }, 40);
  const action = { type: 'start-trial' };
  h.director.confirmedAction(h.saved, action, castle.actWolfCastle(h.saved, action, context).state);
  assert.deepEqual(h.played, ['begin']);
  h.director.dispose();
});

test('training and mandate encounters with identical counters each consume their own live begin and attack', () => {
  const h = harness();
  const training = combat.createWolfCastleCombat();
  let mandate = combat.createWolfCastleCombat(null, 'dungeon');
  assert.equal(training.attempt, mandate.attempt);
  assert.equal(training.encounterIndex, mandate.encounterIndex);
  assert.equal(training.event.sequence, mandate.event.sequence);
  h.director.sync(h.saved, training);
  h.director.sync(h.saved, mandate);
  h.director.sync(h.saved, mandate);
  assert.deepEqual(h.played, ['begin', 'begin'], 'a scenario change cannot masquerade as an already consumed encounter');
  mandate = step(mandate, { attack: true });
  h.director.sync(h.saved, mandate);
  h.director.sync({ ...h.saved, revision: h.saved.revision + 1 }, mandate);
  assert.deepEqual(h.played, ['begin', 'begin', 'attack']);
  h.director.dispose();
});

test('restoring a mandate consumes its own saved begin even when the training slot is empty', () => {
  let state = combat.createWolfCastleCombat(null, 'dungeon');
  const saved = {
    ...visitAt('royal-court', { invitationId: 'wolf-protocol:introduction' }),
    visitedRooms: [...castle.WOLF_CASTLE_ROOM_IDS],
    audience: 'accepted',
    position: { x: state.player.x, y: state.player.y, facing: state.player.facing },
    dungeon: { ...dungeon.createWolfCastleDungeon(), status: 'active', objectives: { archives: true, gallery: true, council: true }, attempts: state.attempt, combat: state },
  };
  assert.equal(castle.inspectWolfCastleVisit(saved, context.ownerCreatedAt).status, 'valid');
  const h = harness(saved);
  h.director.sync(saved);
  h.director.sync({ ...saved, revision: saved.revision + 1 });
  assert.deepEqual(h.played, []);
  state = step(state, { attack: true });
  h.director.sync(saved, state);
  assert.deepEqual(h.played, ['attack']);
  h.director.suspend();
  state = step(state);
  h.director.sync(saved, state, false);
  h.director.sync(saved, state, true);
  assert.deepEqual(h.played, ['attack']);
  h.director.dispose();
});

test('the mandate acknowledges each confirmed clue and its single extraction after the real three-phase fight', () => {
  let visit = visitAt('royal-audience', { invitationId: 'wolf-protocol:introduction', mode: 'audience' });
  const h = harness(visit);
  h.director.sync(visit);
  visit = confirm(h, visit, { type: 'hear-audience' });
  visit = travel(h, visit, 'royal-council');
  visit = confirm(h, visit, { type: 'decide-audience', decision: 'accepted' });
  visit = station(h, travel(h, visit, 'royal-audience'), 'audience');
  visit = confirm(h, visit, { type: 'accept-dungeon' });
  visit = confirm(h, visit, { type: 'accept-dungeon' });
  for (const [roomId, kind, type] of [
    ['royal-archives', 'archive', 'inspect-dungeon-archive'],
    ['royal-gallery', 'gallery', 'inspect-dungeon-gallery'],
    ['royal-council', 'council', 'inspect-dungeon-council'],
  ]) {
    visit = station(h, travel(h, visit, roomId), kind);
    visit = confirm(h, visit, { type });
    visit = confirm(h, visit, { type });
  }
  assert.equal(h.played.filter(cue => cue === 'audience').length, 3);
  assert.equal(h.played.filter(cue => cue === 'archive').length, 3);
  visit = station(h, travel(h, visit, 'royal-court'), 'combat');
  visit = confirm(h, visit, { type: 'start-dungeon-combat' });
  let state = visit.dungeon.combat;
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
      h.director.sync(visit, state);
    }
    assert.equal(state.status, encounter === 2 ? 'victory' : 'intermission');
    visit = checkpoint(h, visit, { x: state.player.x, y: state.player.y, facing: state.player.facing }, state);
    if (encounter < 2) { visit = confirm(h, visit, { type: 'next-dungeon-phase' }); state = visit.dungeon.combat; }
  }
  assert.equal(h.played.filter(cue => cue === 'begin').length, 3);
  assert.equal(h.played.filter(cue => cue === 'victory').length, 1);
  visit = station(h, travel(h, visit, 'royal-audience'), 'audience');
  visit = confirm(h, visit, { type: 'extract-dungeon' });
  visit = confirm(h, visit, { type: 'extract-dungeon' });
  assert.equal(h.played.filter(cue => cue === 'mandate-complete').length, 1);
  const restored = harness(visit);
  restored.director.sync(visit);
  confirm(restored, visit, { type: 'extract-dungeon' });
  assert.deepEqual(restored.played, [], 'a restored receipt cannot replay its acknowledgement');
  h.director.dispose(); restored.director.dispose();
});
