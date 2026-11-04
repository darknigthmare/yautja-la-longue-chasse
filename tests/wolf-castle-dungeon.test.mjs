import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const castle = qa.load('app/game/systems/wolfCastle.ts');
const combat = qa.load('app/game/systems/wolfCastleCombat.ts');
const dungeon = qa.load('app/game/systems/wolfCastleDungeon.ts');
const context = { ownerCreatedAt: '2026-11-04T08:00:00.000Z', personalShipId: 'classic-predator-spaceship' };
const idle = { moveX: 0, moveY: 0, attack: false, parry: false, evade: false };
const clone = value => JSON.parse(JSON.stringify(value));
function valid(state) {
  const result = castle.inspectWolfCastleVisit(state, context.ownerCreatedAt);
  assert.equal(result.status, 'valid', result.reason);
  assert.deepEqual(result.state, state);
}
function act(state, type, extra = {}) {
  const before = clone(state), result = castle.actWolfCastle(state, { type, ...extra }, context);
  assert.equal(result.accepted, true, `${type}: ${result.reason}`);
  assert.deepEqual(state, before); valid(result.state);
  return result.state;
}
function denied(state, type, reason) {
  const before = clone(state), result = castle.actWolfCastle(state, { type }, context);
  assert.equal(result.accepted, false, type); assert.equal(result.reason, reason);
  assert.equal(result.changed, false); assert.equal(result.state, state); assert.deepEqual(state, before);
  assert.equal(result.clanMarksReward, undefined);
}
function move(state, roomId) {
  for (const next of castle.wolfCastleRoute(state.roomId, roomId).slice(1)) state = act(state, 'move-room', { roomId: next });
  return state;
}
function checkpoint(state, live = state.dungeon?.combat ?? null, position = live && state.dungeon?.status === 'active'
  ? { x: live.player.x, y: live.player.y, facing: live.player.facing } : state.position) {
  const before = clone(state), result = castle.applyWolfCastleCheckpoint(state, {
    ...context, roomId: state.roomId, expectedRevision: state.revision, position, combat: state.combat, dungeonCombat: live,
  }, context);
  assert.equal(result.accepted, true, result.reason); assert.deepEqual(state, before); valid(result.state);
  assert.equal(result.clanMarksReward, undefined, 'combat checkpoints cannot grant campaign currency');
  return result.state;
}
function approach(state, kind) {
  const station = castle.wolfCastleRoom(state.roomId).stations.find(value => value.kind === kind);
  assert.ok(station, kind);
  let point = state.position;
  const path = castle.wolfCastleWalkPath(state.roomId, point, { x: station.x, y: station.y });
  assert.ok(path.length, `${kind} has a physical walk path`);
  for (const target of path) {
    let frames = 0;
    while (Math.hypot(target.x - point.x, target.y - point.y) > 1 && frames++ < 3000) {
      const dx = target.x - point.x, dy = target.y - point.y, distance = Math.hypot(dx, dy);
      point = castle.stepWolfCastleActor(state.roomId, point, { x: dx / Math.max(5.4, distance), y: dy / Math.max(5.4, distance) }, 20);
    }
    assert.ok(frames < 3000, 'station reached by walking');
  }
  return checkpoint(state, state.dungeon?.combat ?? null, { ...point, facing: 1 });
}
function invited() {
  let state = castle.createWolfCastleVisit(context.ownerCreatedAt, context.personalShipId, { mode: 'audience', invitationId: 'wolf-protocol:introduction' });
  state = act(state, 'board'); state = move(state, 'royal-audience'); state = act(state, 'hear-audience');
  state = move(state, 'royal-council'); state = act(state, 'decide-audience', { decision: 'accepted' });
  return approach(move(state, 'royal-audience'), 'audience');
}
function ready() {
  let state = act(invited(), 'accept-dungeon');
  for (const [room, station, action] of [
    ['royal-archives', 'archive', 'inspect-dungeon-archive'],
    ['royal-gallery', 'gallery', 'inspect-dungeon-gallery'],
    ['royal-council', 'council', 'inspect-dungeon-council'],
  ]) state = act(approach(move(state, room), station), action);
  return approach(move(state, 'royal-court'), 'combat');
}
function step(state, input = {}) { return combat.stepWolfCastleCombat(state, { ...idle, ...input }, 20); }
function play(state) {
  let frames = 0;
  while (state.status === 'active' && frames++ < 20000) {
    const p = state.player, e = state.enemy, dx = e.x - p.x, dy = e.y - p.y;
    const imminent = e.phase === 'windup' && e.phaseMs < 185 && p.attackMs === 0 && p.defenseCooldownMs === 0;
    state = step(state, { moveX: Math.abs(dx) > 130 || Math.sign(dx) !== p.facing ? Math.sign(dx) : 0,
      moveY: Math.abs(dy) > 10 ? Math.sign(dy) : 0,
      attack: e.phase === 'recovery' && Math.abs(dx) < 145 && Math.abs(dy) < 35 && p.attackCooldownMs === 0,
      parry: imminent && e.strike === 'thrust', evade: imminent && e.strike === 'sweep' });
  }
  assert.ok(frames < 20000, 'the real combat simulation must resolve');
  assert.equal(combat.inspectWolfCastleCombat(state).status, 'valid');
  return state;
}
function victory(state = ready()) {
  state = act(state, 'start-dungeon-combat');
  for (let phase = 0; phase < 3; phase++) {
    const result = play(state.dungeon.combat);
    assert.equal(result.status, phase === 2 ? 'victory' : 'intermission');
    state = checkpoint(state, result);
    if (phase < 2) state = act(state, 'next-dungeon-phase');
  }
  return state;
}

test('V1/V2 migrations add no mandate and preserve the old training record and exact V2 checkpoint', () => {
  let state = ready(); state = act(state, 'abandon-dungeon'); state = act(state, 'start-combat');
  for (let phase = 0; phase < 3; phase++) {
    const live = play(state.combat), result = castle.applyWolfCastleCheckpoint(state, { ...context, roomId: state.roomId,
      expectedRevision: state.revision, position: { x: live.player.x, y: live.player.y, facing: live.player.facing }, combat: live }, context);
    assert.equal(result.accepted, true, result.reason); state = result.state;
    if (phase < 2) state = act(state, 'next-combat');
  }
  const old = clone(state); old.version = 2; delete old.dungeon; old.combat.version = 1; delete old.combat.scenario;
  const loaded = castle.inspectWolfCastleVisit(old, context.ownerCreatedAt);
  assert.equal(loaded.status, 'valid'); assert.equal(loaded.state.version, 3); assert.equal(loaded.state.dungeon, null);
  assert.deepEqual(loaded.state.position, state.position); assert.equal(loaded.state.revision, state.revision);
  assert.deepEqual(loaded.state.combat.dossier, state.combat.dossier); assert.equal(loaded.state.combat.scenario, 'training');
  assert.deepEqual(combat.inspectWolfCastleCombat(old.combat).state, state.combat);
  const noop = castle.actWolfCastle(old, { type: 'abandon-combat' }, context);
  assert.equal(noop.changed, false); assert.equal(noop.state.version, 3); valid(noop.state);
  const refusal = castle.actWolfCastle(old, { type: 'accept-dungeon' }, context);
  assert.equal(refusal.accepted, false); assert.equal(refusal.state.version, 3); valid(refusal.state);
  const v1 = clone(old); v1.version = 1; delete v1.position; delete v1.revision; delete v1.combat;
  const migrated = castle.inspectWolfCastleVisit(v1, context.ownerCreatedAt);
  assert.equal(migrated.status, 'valid'); assert.equal(migrated.state.combat, null); assert.equal(migrated.state.dungeon, null);
});

test('acceptance requires the agreed audience, and only physical inspections fulfill independent objectives', () => {
  let state = invited();
  const pending = { ...state, audience: 'pending' };
  denied(pending, 'accept-dungeon', 'audience-agreement-required');
  state = move(state, 'royal-archives'); state = act(state, 'read-archive');
  state = move(state, 'royal-audience'); denied(state, 'accept-dungeon', 'station-too-far');
  state = act(approach(state, 'audience'), 'accept-dungeon');
  assert.deepEqual(state.dungeon.objectives, { archives: false, gallery: false, council: false });
  denied(state, 'inspect-dungeon-archive', 'wrong-room');
  state = move(state, 'royal-archives'); denied(state, 'inspect-dungeon-archive', 'station-too-far');
  state = act(approach(state, 'archive'), 'inspect-dungeon-archive');
  assert.equal(state.archiveRead, true); assert.equal(state.dungeon.objectives.archives, true);
  const duplicate = castle.actWolfCastle(state, { type: 'inspect-dungeon-archive' }, context);
  assert.equal(duplicate.changed, false); assert.equal(duplicate.state, state);
  state = approach(move(state, 'royal-court'), 'combat'); denied(state, 'start-dungeon-combat', 'dungeon-not-ready');
  const shortcut = clone(state); shortcut.audience = 'pending';
  assert.equal(castle.inspectWolfCastleVisit(shortcut, context.ownerCreatedAt).reason, 'dungeon-without-audience');
});

test('all three boss postures are beatable, preserve health between phases, and resume exactly from a live checkpoint', () => {
  let state = act(ready(), 'start-dungeon-combat');
  assert.equal(state.combat, null); assert.equal(state.dungeon.combat.scenario, 'dungeon');
  denied(state, 'start-combat', 'dungeon-active');
  const moving = castle.actWolfCastle(state, { type: 'move-room', roomId: 'royal-service-pass' }, context);
  assert.equal(moving.reason, 'dungeon-active');
  let live = state.dungeon.combat;
  for (let frame = 0; frame < 2000 && live.player.health === 100; frame++) live = step(live);
  assert.ok(live.player.health < 100 && live.player.health > 0, 'take a real hit before testing phase health');
  state = checkpoint(state, live);
  const restored = castle.inspectWolfCastleVisit(clone(state), context.ownerCreatedAt).state;
  assert.deepEqual(restored, state); assert.deepEqual(step(restored.dungeon.combat), step(state.dungeon.combat));
  for (let phase = 0; phase < 3; phase++) {
    const spec = combat.wolfCastleCombatSpec(state.dungeon.combat);
    assert.equal(spec.name, 'Sentinelle du mandat'); assert.ok(spec.phaseName);
    state = checkpoint(state, play(state.dungeon.combat));
    const health = state.dungeon.combat.player.health;
    assert.equal(state.dungeon.combat.encounterIndex, phase);
    if (phase < 2) {
      assert.equal(state.dungeon.combat.status, 'intermission');
      valid(castle.inspectWolfCastleVisit(clone(state), context.ownerCreatedAt).state);
      state = act(state, 'next-dungeon-phase'); assert.equal(state.dungeon.combat.player.health, health);
    }
  }
  assert.equal(state.dungeon.status, 'victory'); assert.equal(state.dungeon.reward.claimed, false);
  assert.equal(castle.wolfCastleActiveCombat(state).scenario, 'dungeon');
  assert.ok(state.dungeon.combat.stats.parries > 0); assert.ok(state.dungeon.combat.stats.evades > 0);
  assert.equal(state.combat, null);
});

test('defeat retries at the fallen position; abandonment and reacceptance retain objectives without any reward', () => {
  let state = act(ready(), 'start-dungeon-combat'), live = state.dungeon.combat;
  for (let frame = 0; frame < 10000 && live.status === 'active'; frame++) live = step(live);
  assert.equal(live.status, 'defeat'); state = checkpoint(state, live);
  assert.equal(state.dungeon.status, 'failed');
  const station = castle.wolfCastleRoom(state.roomId).stations.find(entry => entry.kind === 'combat');
  assert.ok(Math.hypot(state.position.x - station.x, state.position.y - station.y) > 94);
  state = act(state, 'retry-dungeon'); assert.equal(state.dungeon.attempts, 2); assert.equal(state.dungeon.combat.player.health, 100);
  const objectives = clone(state.dungeon.objectives);
  state = act(state, 'abandon-dungeon'); assert.equal(state.dungeon.combat.status, 'abandoned'); assert.equal(castle.wolfCastleActiveCombat(state), null);
  state = approach(move(state, 'royal-audience'), 'audience'); denied(state, 'extract-dungeon', 'dungeon-not-victorious');
  state = act(state, 'accept-dungeon'); assert.equal(state.dungeon.status, 'ready'); assert.deepEqual(state.dungeon.objectives, objectives);
  state = approach(move(state, 'royal-court'), 'combat'); state = act(state, 'start-dungeon-combat');
  assert.equal(state.dungeon.attempts, 3); assert.equal(state.dungeon.reward.receipt, null); assert.equal(state.combat, null);
});

test('the mandate can suspend exploration, survive departure and resume its accepted objectives', () => {
  let state = act(invited(), 'accept-dungeon');
  state = act(approach(move(state, 'royal-gallery'), 'gallery'), 'inspect-dungeon-gallery');
  const goals = clone(state.dungeon.objectives);
  state = act(move(state, 'royal-berth'), 'depart');
  state = castle.inspectWolfCastleVisit(clone(state), context.ownerCreatedAt).state;
  state = act(act(state, 'approach'), 'board'); assert.deepEqual(state.dungeon.objectives, goals);
  state = act(state, 'abandon-dungeon'); assert.equal(state.dungeon.status, 'abandoned');
  state = act(approach(move(state, 'royal-audience'), 'audience'), 'accept-dungeon');
  assert.equal(state.dungeon.status, 'accepted'); assert.deepEqual(state.dungeon.objectives, goals); assert.equal(state.dungeon.attempts, 0);
});

test('a terminal mandate keeps its result until resolution, then training is available after abandonment or completion', () => {
  let failed = act(ready(), 'start-dungeon-combat'), live = failed.dungeon.combat;
  for (let frame = 0; frame < 10000 && live.status === 'active'; frame++) live = step(live);
  failed = checkpoint(failed, live); assert.equal(failed.dungeon.status, 'failed');
  denied(failed, 'start-combat', 'dungeon-unresolved');
  assert.equal(castle.wolfCastleActiveCombat(failed), failed.dungeon.combat);
  failed = act(act(failed, 'abandon-dungeon'), 'start-combat');
  assert.equal(failed.dungeon.status, 'abandoned'); assert.equal(failed.combat.scenario, 'training');
  assert.equal(castle.wolfCastleActiveCombat(failed), failed.combat);

  let won = victory(); denied(won, 'start-combat', 'dungeon-unresolved');
  assert.equal(castle.wolfCastleActiveCombat(won), won.dungeon.combat);
  won = act(approach(move(won, 'royal-audience'), 'audience'), 'extract-dungeon');
  won = act(move(won, 'royal-court'), 'start-combat');
  assert.equal(won.dungeon.status, 'completed'); assert.equal(won.dungeon.reward.claimed, true);
  assert.equal(castle.wolfCastleActiveCombat(won), won.combat); assert.equal(won.combat.scenario, 'training');
});

test('only return to the audience after victory creates the stable receipt and one atomic reward delta', () => {
  let state = victory(); denied(state, 'extract-dungeon', 'wrong-room');
  state = move(state, 'royal-audience'); denied(state, 'extract-dungeon', 'station-too-far');
  state = approach(state, 'audience');
  const before = clone(state), result = castle.actWolfCastle(state, { type: 'extract-dungeon' }, context);
  assert.equal(result.accepted, true); assert.equal(result.changed, true); assert.equal(result.clanMarksReward, 2);
  assert.deepEqual(state, before); valid(result.state);
  assert.equal(result.state.dungeon.reward.receipt, dungeon.wolfCastleDungeonReceipt(context.ownerCreatedAt));
  assert.equal(castle.wolfCastleDungeonRewardDelta(state, result.state), 2);
  state = castle.inspectWolfCastleVisit(clone(result.state), context.ownerCreatedAt).state;
  const again = castle.actWolfCastle(state, { type: 'extract-dungeon' }, context);
  assert.equal(again.changed, false); assert.equal(again.clanMarksReward, undefined);
  assert.equal(castle.wolfCastleDungeonRewardDelta(state, state), 0);
  assert.equal(act(state, 'accept-dungeon').dungeon.status, 'completed');
  assert.equal(act(state, 'abandon-dungeon').dungeon.status, 'completed');
  state = move(state, 'royal-court'); denied(state, 'retry-dungeon', 'dungeon-not-ready');
  state = act(state, 'start-combat'); assert.equal(state.combat.scenario, 'training'); assert.equal(state.dungeon.reward.claimed, true);
  assert.equal(castle.wolfCastleActiveCombat(state).scenario, 'training');
});

test('foreign, future, inconsistent and forged receipts are rejected before import', () => {
  const state = victory();
  const corruptions = [
    value => { value.dungeon.status = 'completed'; },
    value => { value.dungeon.reward = { claimed: true, receipt: dungeon.wolfCastleDungeonReceipt(context.ownerCreatedAt) }; },
    value => { value.dungeon.objectives.gallery = false; },
    value => { value.dungeon.combat.scenario = 'training'; },
    value => { value.dungeon.attempts++; },
    value => { value.dungeon.status = 'completed'; value.dungeon.reward = { claimed: true, receipt: dungeon.wolfCastleDungeonReceipt('foreign-campaign') }; },
  ];
  for (const change of corruptions) { const bad = clone(state); change(bad); assert.equal(castle.inspectWolfCastleVisit(bad, context.ownerCreatedAt).status, 'invalid-save'); }
  for (const change of [value => { value.version++; }, value => { value.dungeon.version++; }, value => { value.dungeon.combat.version++; }]) {
    const future = clone(state); change(future); assert.equal(castle.inspectWolfCastleVisit(future, context.ownerCreatedAt).status, 'future-version');
  }
  assert.equal(castle.inspectWolfCastleVisit(state, 'foreign-campaign').reason, 'owner-mismatch');
});

test('checkpoint leases cannot create a mandate, switch scenario, skip a phase or overwrite campaign objectives', () => {
  const base = ready(), state = act(base, 'start-dungeon-combat');
  const payload = { ...context, roomId: state.roomId, expectedRevision: state.revision, position: state.position, combat: state.combat, dungeonCombat: state.dungeon.combat };
  for (const patch of [{ expectedRevision: state.revision - 1 }, { ownerCreatedAt: 'foreign' }, { roomId: 'royal-gallery' },
    { dungeon: { ...state.dungeon, reward: { claimed: true, receipt: 'fake' } } },
    { dungeonCombat: { ...state.dungeon.combat, scenario: 'training' } },
    { dungeonCombat: { ...state.dungeon.combat, encounterIndex: 2 } }, { dungeonCombat: null },
    { combat: state.dungeon.combat },
  ]) {
    const before = clone(state), result = castle.applyWolfCastleCheckpoint(state, { ...payload, ...patch }, context);
    assert.equal(result.accepted, false); assert.equal(result.changed, false); assert.equal(result.state, state); assert.deepEqual(state, before);
    assert.equal(result.clanMarksReward, undefined);
  }
  const create = castle.applyWolfCastleCheckpoint(base, { ...payload, expectedRevision: base.revision }, context);
  assert.equal(create.reason, 'dungeon-combat-lifecycle');
  const unchanged = castle.applyWolfCastleCheckpoint(state, { ...payload }, context);
  assert.equal(unchanged.accepted, true); assert.equal(unchanged.changed, false);
  const fallback = { ...payload }; delete fallback.dungeonCombat;
  assert.deepEqual(castle.applyWolfCastleCheckpoint(state, fallback, context).state.dungeon, state.dungeon);
});
