import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const combat = qa.load('app/game/systems/wolfCastleCombat.ts');
const castle = qa.load('app/game/systems/wolfCastle.ts');
const idle = Object.freeze({ moveX: 0, moveY: 0, attack: false, parry: false, evade: false });
const context = { ownerCreatedAt: '2026-11-04T08:00:00.000Z', personalShipId: 'classic-predator-spaceship' };
const clone = value => JSON.parse(JSON.stringify(value));
const step = (state, input = {}, dt = 16) => combat.stepWolfCastleCombat(state, { ...idle, ...input }, dt);
function valid(state) { assert.equal(combat.inspectWolfCastleCombat(state).status, 'valid', combat.inspectWolfCastleCombat(state).reason); }
function court() {
  let state = castle.createWolfCastleVisit(context.ownerCreatedAt, context.personalShipId);
  state = castle.actWolfCastle(state, { type: 'board' }, context).state;
  for (const roomId of castle.wolfCastleRoute(state.roomId, 'royal-court').slice(1)) state = castle.actWolfCastle(state, { type: 'move-room', roomId }, context).state;
  return state;
}
function checkpoint(visit, state, position = state ? { x: state.player.x, y: state.player.y, facing: state.player.facing } : visit.position) {
  return { ...context, roomId: visit.roomId, expectedRevision: visit.revision, position, combat: state };
}
function telegraph(strike = 'thrust', facing = 1) {
  const state = combat.createWolfCastleCombat();
  if (strike === 'sweep') { state.encounterIndex = 1; state.enemy.health = 88; }
  Object.assign(state.player, { x: 925, y: 610, facing });
  Object.assign(state.enemy, { x: 1050, y: 610, facing: -1, phase: 'windup', phaseMs: 10, targetX: 925, targetY: 610, strike });
  valid(state); return state;
}
function play(state, dt = 20) {
  for (let frame = 0; frame < 20000 && state.status === 'active'; frame++) {
    const p = state.player, e = state.enemy, dx = e.x - p.x, dy = e.y - p.y;
    const imminent = e.phase === 'windup' && e.phaseMs < 185 && p.attackMs === 0 && p.defenseCooldownMs === 0;
    state = step(state, {
      moveX: Math.abs(dx) > 130 || Math.sign(dx) !== p.facing ? Math.sign(dx) : 0,
      moveY: Math.abs(dy) > 10 ? Math.sign(dy) : 0,
      attack: e.phase === 'recovery' && Math.abs(dx) < 145 && Math.abs(dy) < 35 && p.attackCooldownMs === 0,
      parry: imminent && e.strike === 'thrust', evade: imminent && e.strike === 'sweep',
    }, dt);
    valid(state);
  }
  assert.notEqual(state.status, 'active', 'the encounter must reach a real result');
  return state;
}

test('combat starts independently, serializes exactly and never mutates its source', () => {
  const state = combat.createWolfCastleCombat(), before = clone(state);
  valid(state); assert.deepEqual(combat.inspectWolfCastleCombat(clone(state)).state, state);
  const next = step(state, { moveX: 1 });
  assert.deepEqual(state, before); assert.notEqual(next.player, state.player); assert.ok(next.player.x > state.player.x);
  assert.throws(() => combat.createWolfCastleCombat(state), TypeError);
});

test('thrust is parried only while facing the guard; the sweep breaks a parry but an evade avoids it', () => {
  const parried = step(telegraph(), { parry: true });
  assert.equal(parried.player.health, 100); assert.equal(parried.stats.parries, 1); assert.equal(parried.event.kind, 'parry');
  const wrongFacing = step(telegraph('thrust', -1), { parry: true });
  assert.equal(wrongFacing.player.health, 80); assert.equal(wrongFacing.stats.parries, 0);
  const swept = step(telegraph('sweep'), { parry: true });
  assert.equal(swept.player.health, 74); assert.equal(swept.stats.damageTaken, 26);
  const evaded = step(telegraph('sweep'), { evade: true });
  assert.equal(evaded.player.health, 100); assert.equal(evaded.stats.evades, 1);
  for (const state of [parried, wrongFacing, swept, evaded]) valid(state);
});

test('visible strike footprints are the exact hit-test boundaries, and a locked thrust does not track a sidestep', () => {
  const thrust = telegraph(), area = combat.wolfCastleCombatStrikeArea(thrust);
  assert.equal(area.shape, 'rect');
  thrust.player.x = area.x; thrust.player.y = area.y + area.radiusY;
  assert.equal(combat.wolfCastleCombatInStrike(thrust), true);
  thrust.player.y += .01; assert.equal(combat.wolfCastleCombatInStrike(thrust), false);
  const avoided = step(thrust); assert.equal(avoided.player.health, 100); assert.equal(avoided.enemy.targetY, 610);
  const sweep = telegraph('sweep'), circle = combat.wolfCastleCombatStrikeArea(sweep);
  sweep.player.x = circle.x + circle.radiusX; sweep.player.y = circle.y;
  assert.equal(combat.wolfCastleCombatInStrike(sweep), true);
  sweep.player.x += .01; assert.equal(combat.wolfCastleCombatInStrike(sweep), false);
});

test('a strike deals damage once, cannot hit behind the player or outside reach, and consumes endurance', () => {
  const state = telegraph(); state.enemy.phase = 'recovery'; state.enemy.phaseMs = 920;
  let next = step(state, { attack: true });
  assert.ok(next.player.stamina < 100);
  for (let frame = 0; frame < 30; frame++) next = step(next);
  assert.equal(next.stats.hits, 1); assert.equal(next.enemy.health, 42);
  for (const miss of [Object.assign(clone(state), { player: { ...state.player, facing: -1 } }), Object.assign(clone(state), { player: { ...state.player, x: 650 } })]) {
    let next = step(miss, { attack: true }); for (let f = 0; f < 30; f++) next = step(next);
    assert.equal(next.stats.hits, 0); assert.equal(next.enemy.health, 66);
  }
  const exhausted = clone(state); exhausted.player.stamina = 0;
  const refused = step(exhausted, { attack: true }); assert.equal(refused.player.attackMs, 0); assert.equal(refused.event.kind, 'exhausted');
});

test('the arena and bodies remain bounded at both walls; hidden or invalid time never catches up', () => {
  for (const side of [-1, 1]) {
    const state = combat.createWolfCastleCombat(), edge = side === -1 ? 200 : 1400;
    state.player.x = edge; state.enemy.x = edge - side * 5;
    const next = step(state, { moveX: side }, 50);
    assert.equal(next.player.x, edge); assert.ok(Math.abs(next.enemy.x - next.player.x) >= 53); valid(next);
  }
  const state = combat.createWolfCastleCombat();
  assert.deepEqual(step(state, { moveX: 1 }, 50000), step(state, { moveX: 1 }, 50));
  for (const dt of [0, -1, NaN, Infinity]) assert.equal(step(state, {}, dt), state);
  for (const input of [{ moveX: NaN }, { moveY: Infinity }]) assert.equal(step(state, input), state);
});

test('all three guards are beatable through real movement/parry/evade/attack and the dossier records one victory', () => {
  let state = combat.createWolfCastleCombat();
  for (let encounter = 0; encounter < 3; encounter++) {
    state = play(state);
    assert.equal(state.encounterIndex, encounter);
    assert.equal(state.status, encounter === 2 ? 'victory' : 'intermission');
    if (encounter < 2) state = combat.advanceWolfCastleCombatEncounter(state);
  }
  assert.equal(state.dossier.victories, 1); assert.ok(state.stats.parries > 0); assert.ok(state.stats.evades > 0);
  assert.equal(state.dossier.bestTimeMs, state.elapsedMs); assert.equal(state.dossier.bestDamageTaken, state.stats.damageTaken);
  assert.equal(step(state, { attack: true }), state); assert.equal(combat.advanceWolfCastleCombatEncounter(state), state);
  const retry = combat.createWolfCastleCombat(state); assert.equal(retry.attempt, 2); assert.deepEqual(retry.dossier, state.dossier); assert.equal(retry.player.health, 100);
});

test('remaining still causes defeat; retry, intermission and abandonment remain explicit and nonlethal to the campaign', () => {
  let state = combat.createWolfCastleCombat();
  for (let f = 0; f < 10000 && state.status === 'active'; f++) state = step(state, {}, 50);
  assert.equal(state.status, 'defeat'); assert.equal(state.player.health, 0); assert.equal(state.dossier.victories, 0); valid(state);
  const retry = combat.createWolfCastleCombat(state); assert.equal(retry.attempt, 2); assert.equal(retry.enemy.health, 66);
  const abandoned = combat.abandonWolfCastleCombat(retry); assert.equal(abandoned.status, 'abandoned'); valid(abandoned);
  assert.equal(combat.abandonWolfCastleCombat(abandoned), abandoned); assert.equal(combat.wolfCastleCombatPending(abandoned), false);
});

test('invalid and future combat data are rejected before import', () => {
  const state = combat.createWolfCastleCombat();
  assert.equal(combat.inspectWolfCastleCombat(null).status, 'absent');
  assert.equal(combat.inspectWolfCastleCombat({ ...state, version: 2 }).status, 'future-version');
  for (const patch of [{ extra: true }, { status: 'victory' }, { encounterIndex: 3 }, { attempt: 0 }, { elapsedMs: Infinity },
    { player: { ...state.player, x: 180 } }, { player: { ...state.player, evadeMs: 100, evadeX: 0, evadeY: 0 } },
    { enemy: { ...state.enemy, phase: 'down' } }, { enemy: { ...state.enemy, phase: 'windup', phaseMs: 0 } },
    { dossier: { victories: 1, bestTimeMs: null, bestDamageTaken: null } }]) assert.equal(combat.inspectWolfCastleCombat({ ...state, ...patch }).status, 'invalid-save');
});

test('old V1 castle saves migrate once to safe V2 positions while preserving their exploration', () => {
  const state = court(), v1 = clone(state); v1.version = 1;
  delete v1.revision; delete v1.position; delete v1.combat;
  const loaded = castle.inspectWolfCastleVisit(v1, context.ownerCreatedAt);
  assert.equal(loaded.status, 'valid'); assert.equal(loaded.state.version, 2); assert.equal(loaded.state.revision, 0); assert.equal(loaded.state.combat, null);
  assert.deepEqual(loaded.state.visitedRooms, state.visitedRooms); assert.ok(castle.isWolfCastlePosition(state.roomId, loaded.state.position));
  assert.deepEqual(castle.inspectWolfCastleVisit(clone(loaded.state), context.ownerCreatedAt).state, loaded.state);
});

test('exact position checkpoints use a lease and refuse obsolete rooms, blocked ground and owner changes', () => {
  const state = court(), point = { x: 701.25, y: 613.5, facing: -1 };
  const value = checkpoint(state, null, point), saved = castle.applyWolfCastleCheckpoint(state, value, context);
  assert.equal(saved.accepted, true); assert.equal(saved.state.revision, state.revision + 1); assert.deepEqual(saved.state.position, point);
  assert.equal(castle.applyWolfCastleCheckpoint(saved.state, value, context).reason, 'stale-revision');
  assert.equal(castle.applyWolfCastleCheckpoint(saved.state, checkpoint(saved.state, null), context).changed, false);
  for (const patch of [{ roomId: 'royal-berth' }, { ownerCreatedAt: 'foreign' }, { position: { x: 0, y: 0, facing: 1 } }]) {
    const result = castle.applyWolfCastleCheckpoint(state, { ...value, ...patch }, context); assert.equal(result.accepted, false); assert.equal(result.state, state);
  }
});

test('a real result checkpoints once, locks departures until resolved, then permits the next encounter', () => {
  let visit = court(); visit = castle.actWolfCastle(visit, { type: 'start-combat' }, context).state;
  assert.equal(castle.actWolfCastle(visit, { type: 'move-room', roomId: 'royal-service-pass' }, context).reason, 'combat-active');
  const result = play(visit.combat);
  const stored = castle.applyWolfCastleCheckpoint(visit, checkpoint(visit, result), context);
  assert.equal(stored.accepted, true); visit = stored.state;
  assert.equal(castle.applyWolfCastleCheckpoint(visit, checkpoint(visit, result), context).changed, false);
  const next = castle.actWolfCastle(visit, { type: 'next-combat' }, context);
  assert.equal(next.accepted, true); assert.equal(next.state.combat.encounterIndex, 1);
  assert.equal(castle.applyWolfCastleCheckpoint(next.state, checkpoint(next.state, result), context).reason, 'combat-regression');
  const abandoned = castle.actWolfCastle(next.state, { type: 'abandon-combat' }, context);
  assert.equal(abandoned.state.combat.status, 'abandoned');
  assert.equal(castle.actWolfCastle(abandoned.state, { type: 'move-room', roomId: 'royal-service-pass' }, context).accepted, true);
});

test('seals and fighting do not overwrite each other, and snapshots cannot fabricate victories or reverse damage', () => {
  const state = court(), seals = castle.actWolfCastle(state, { type: 'start-trial' }, context).state;
  assert.equal(castle.actWolfCastle(seals, { type: 'start-combat' }, context).reason, 'seals-active');
  const fighting = castle.actWolfCastle(state, { type: 'start-combat' }, context).state;
  assert.equal(castle.actWolfCastle(fighting, { type: 'start-trial' }, context).reason, 'combat-active');
  const forged = clone(fighting.combat); forged.enemy.health -= 24;
  assert.equal(castle.applyWolfCastleCheckpoint(fighting, checkpoint(fighting, forged), context).reason, 'combat-regression');
  const mismatch = checkpoint(fighting, step(fighting.combat, { moveX: 1 }), fighting.position);
  assert.equal(castle.applyWolfCastleCheckpoint(fighting, mismatch, context).reason, 'combat-position-mismatch');
  assert.equal(castle.applyWolfCastleCheckpoint(state, checkpoint(state, combat.createWolfCastleCombat()), context).reason, 'combat-lifecycle');
});
