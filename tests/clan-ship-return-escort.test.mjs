import test from 'node:test';
import assert from 'node:assert/strict';
import { escort, motion, saves, OWNER, clone, fixture, started, medical, medicalApproach, act, action, context, point, walk, settle } from './helpers/clan-ship-return-escort-fixture.mjs';

import { recruit } from './helpers/clan-ship-trophy-hearing-fixture.mjs';

function deny(save, command, { ctx = {}, cmd = {} } = {}) {
  const observed = context(save, command, null, ctx), before = JSON.stringify(observed.save);
  const result = escort.actClanShipReturnEscort({ ...action(save, command), ...cmd }, observed);
  assert.equal(result.accepted, false, result.message); assert.equal(result.changed, false);
  assert.equal(JSON.stringify(observed.save), before); return result;
}
test('B04 starts only from a genuine recovery receipt and available return officers, never from a catalogue', () => {
  for (const save of [fixture({ recovery: false }), fixture({ medical: false })]) {
    assert.equal(escort.evaluateClanShipReturnEscortOffer(save).allowed, false); deny(save, { type: 'accept' });
  }
  const save = fixture(), before = clone(save), accepted = act(save, { type: 'accept' });
  assert.equal(accepted.clanShipReturnEscort.sourceRecoveryRevision, save.clanShipOperations.completedContracts.find(x => x.contractId === 'space-recovery').completedRevision);
  assert.equal(accepted.clanShipReturnEscort.phase, 'accepted'); assert.deepEqual(save, before);
  assert.equal(accepted.clanShipReturnEscort.actors.length, 2);
  assert.deepEqual(accepted.expeditionRoster, save.expeditionRoster); assert.deepEqual(accepted.profile, save.profile);
});
test('return commands reject another owner, stale revision, inactive scene, distant feet and wrong room', () => {
  const save = fixture();
  deny(save, { type: 'accept' }, { cmd: { ownerCreatedAt: 'another-campaign' } });
  deny(save, { type: 'accept' }, { cmd: { expectedRevision: 1 } });
  deny(save, { type: 'accept' }, { ctx: { active: false } });
  deny(save, { type: 'accept' }, { ctx: { observation: { roomId: 'hangar', x: 240, y: 645 } } });
  deny(save, { type: 'accept' }, { ctx: { observation: { roomId: 'soins', x: 740, y: 655 } } });
  const accepted = act(save, { type: 'accept' }); deny(accepted, { type: 'start' }); deny(accepted, { type: 'report' });
});
test('preparing the real doorway and a chosen medical post is required before the group can follow', () => {
  const accepted = act(fixture(), { type: 'accept' });
  deny(accepted, { type: 'prepare-route', post: 'medical-bed' }, { ctx: { observation: point('hangar', motion.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint) } });
  for (const post of ['medical-bed', 'medical-terminal']) {
    const save = started(post); assert.equal(save.clanShipReturnEscort.phase, 'escorting'); assert.equal(save.clanShipReturnEscort.post, post);
    deny(save, { type: 'transfer-room', roomId: 'soins' }); deny(save, { type: 'confirm-medical' });
  }
});
test('the group really walks through clear geometry, waits for a distant leader and cannot leave an unjoined threshold', () => {
  const save = started(), original = clone(save.clanShipReturnEscort), leader = { roomId: 'hangar', x: 240, y: 645 };
  const waiting = escort.stepClanShipReturnEscort(original, leader, 1 / 60);
  assert.deepEqual(waiting.actors, original.actors, 'far leader cannot teleport the returnees');
  const moved = walk(save, motion.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint, { x: 128, y: 635 }, 60);
  assert.equal(moved.arrived, false);
  assert.notDeepEqual(moved.save.clanShipReturnEscort.actors, original.actors);
  for (const member of moved.save.clanShipReturnEscort.actors) assert.ok(motion.isClanShipInteriorWalkable(member.roomId, member));
  deny(moved.save, { type: 'transfer-room', roomId: 'soins' });
  assert.deepEqual(save.clanShipReturnEscort, original);
});
test('each simulated group step is bounded and collision-safe; pause, invalid time and wrong scene advance nothing', () => {
  const state = started().clanShipReturnEscort, leader = { roomId: 'hangar', x: 750, y: 650 };
  for (const seconds of [0, -1, NaN, Infinity]) assert.equal(escort.stepClanShipReturnEscort(state, leader, seconds), state);
  assert.equal(escort.stepClanShipReturnEscort(state, leader, 0.05, false), state);
  assert.equal(escort.stepClanShipReturnEscort(state, { ...leader, roomId: 'soins' }, 0.05), state);
  const large = escort.stepClanShipReturnEscort(state, leader, 1000), short = escort.stepClanShipReturnEscort(state, leader, 0.05);
  assert.deepEqual(large, short);
  for (let i = 0; i < short.actors.length; i++) {
    const before = state.actors[i], next = short.actors[i];
    assert.ok(motion.isClanShipInteriorSegmentWalkable(next.roomId, before, next));
    assert.ok(Math.hypot(next.x-before.x, next.y-before.y) <= motion.CLAN_SHIP_INTERIOR_METRICS.speed * 0.05 + 1e-7);
  }
  deny(started(), { type: 'advance', frames: [{ seconds: 3, leader }] });
  deny(started(), { type: 'advance', frames: Array.from({ length: 121 }, () => ({ seconds: 1 / 60, leader })) });
});
test('the doorway transfers docking and both nearby actors together; neither wrong exits nor a split group are accepted', () => {
  let save = started(), walked = walk(save, motion.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint, { x: 128, y: 635 });
  save = settle(walked.save, walked.leader);
  for (const member of save.clanShipReturnEscort.actors) assert.ok(motion.canClanShipInteriorTransition('hangar', 'soins', member));
  deny(save, { type: 'transfer-room', roomId: 'armurerie' });
  const ctx = context(save, { type: 'transfer-room', roomId: 'soins' }, point('hangar', walked.leader));
  const result = escort.actClanShipReturnEscort(action(save, { type: 'transfer-room', roomId: 'soins' }), ctx);
  assert.equal(result.accepted, true, result.message); assert.equal(result.dockingState.roomId, 'soins');
  assert.ok(result.state.actors.every(actor => actor.roomId === 'soins' && motion.isClanShipInteriorWalkable('soins', actor)));
  assert.equal(save.clanShipDocking.roomId, 'hangar', 'preview cannot mutate a persisted doorway');
});
test('both medical posts finish after actual leader/group travel and the final report never creates healing, rank or currency', () => {
  for (const post of ['medical-bed', 'medical-terminal']) {
    const baseline = fixture(), save = medical(post), reported = act(save, { type: 'report' });
    assert.equal(save.clanShipReturnEscort.phase, 'at-medical'); assert.equal(reported.clanShipReturnEscort.phase, 'reported');
    for (const key of ['profile', 'inventory', 'expeditionRoster', 'companionResidence', 'clanShipOperations', 'clanShipIncidents', 'clanShipTrophyHearing'])
      assert.deepEqual(reported[key], baseline[key], key + ' must retain its original meaning');
    assert.deepEqual(act(reported, { type: 'report' }), reported, 'repeated report grants nothing');
  }
});
test('the inspector rejects split rooms, impossible feet, phases, hidden properties and missing recovery evidence', () => {
  const save = started();
  for (const edit of [
    s => s.actors[0].roomId = 'soins', s => s.actors[0].x = 7000,
    s => s.actors[0].id = 'invented-recruit', s => s.actors[0].x = NaN,
    s => s.phase = 'reported', s => s.post = null, s => s.version = 0,
    s => s.actors[0].x -= 50,
    s => s.actors.forEach(actor => { actor.roomId = 'soins'; actor.x = 740; actor.y = 655; }),
  ]) { const state = clone(save.clanShipReturnEscort); edit(state); assert.equal(escort.inspectClanShipReturnEscort(state, OWNER).status, 'invalid-save'); }
  const raw = clone(save.clanShipReturnEscort); Object.defineProperty(raw, 'secret', { value: true });
  assert.equal(escort.inspectClanShipReturnEscort(raw, OWNER).status, 'invalid-save');
  const changed = clone(save); changed.clanShipOperations.completedContracts = changed.clanShipOperations.completedContracts.filter(x => x.contractId !== 'space-recovery');
  assert.equal(escort.evaluateClanShipReturnEscortCampaign(changed.clanShipReturnEscort, changed).allowed, false);
  assert.equal(saves.parseSaveImport(JSON.stringify(changed)).save, null);
});

test('an unavailable medical officer cannot acknowledge a distant return, while the stopped group remains recoverable', () => {
  const { save: approach, leader } = medicalApproach();
  // The actual recruitment transaction puts a newly managed member in reserve;
  // it does not silently keep an old service appointment after reassignment.
  const reserved = recruit(approach, 'black-suture');
  assert.equal(escort.evaluateClanShipReturnEscortOffer(reserved).allowed, false);
  deny(reserved, { type: 'confirm-medical' }, { ctx: { observation: point('soins', leader) } });
  assert.equal(escort.inspectClanShipReturnEscort(reserved.clanShipReturnEscort, reserved.createdAt).status, 'valid');
  assert.ok(saves.parseSaveImport(saves.exportSave(reserved)).save, 'unavailability cannot corrupt a safely paused group');
});
test('JSON property order never changes the meaning of an accepted return dossier', () => {
  const accepted = act(fixture(), { type: 'accept' }).clanShipReturnEscort;
  const reordered = { ...accepted, actors: accepted.actors.map(actor => ({ facing: actor.facing, y: actor.y, x: actor.x, roomId: actor.roomId, id: actor.id })) };
  assert.equal(escort.inspectClanShipReturnEscort(reordered, OWNER).status, 'valid');
});

test('separate flanks keep both returnees clear of the leader at the doorway and at either medical destination, including after resume', () => {
  const assertFormation = (save, leader) => {
    const actors = save.clanShipReturnEscort.actors;
    for (const [index, actor] of actors.entries()) {
      const target = { x: leader.x + (index === 0 ? -40 : 40), y: leader.y - 40 };
      assert.ok(motion.isClanShipInteriorWalkable(actor.roomId, target), 'authored flank must not fall back onto the leader');
      assert.ok(motion.isClanShipInteriorWalkable(actor.roomId, actor));
      assert.ok(Math.hypot(actor.x - target.x, actor.y - target.y) < 1, 'the real controller must reach its distinct flank');
      const span = Math.hypot(actor.x - leader.x, actor.y - leader.y);
      assert.ok(span > motion.CLAN_SHIP_INTERIOR_METRICS.actorRadius * 2, 'returnee feet must not overlap the player footprint');
      assert.ok(span <= motion.CLAN_SHIP_INTERIOR_METRICS.interactionReach, 'spacing must preserve real interaction/door reach');
    }
    assert.ok(Math.hypot(actors[0].x - actors[1].x, actors[0].y - actors[1].y) > motion.CLAN_SHIP_INTERIOR_METRICS.actorRadius * 2);
  };
  let save = started(), marched = walk(save, motion.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint, { x: 128, y: 635 });
  save = settle(marched.save, marched.leader);
  assertFormation(save, marched.leader);
  assert.ok(save.clanShipReturnEscort.actors.every(actor => motion.canClanShipInteriorTransition('hangar', 'soins', actor)), 'separated returnees must still enter through the actual threshold');
  for (const post of ['medical-bed', 'medical-terminal']) {
    const arrival = medicalApproach(post);
    assertFormation(arrival.save, arrival.leader);
    const resumed = saves.parseSaveImport(saves.exportSave(arrival.save)).save;
    assert.ok(resumed);
    assert.deepEqual(resumed.clanShipReturnEscort, arrival.save.clanShipReturnEscort);
    assertFormation(resumed, arrival.leader);
    const stopped = escort.stepClanShipReturnEscort(resumed.clanShipReturnEscort, point('soins', arrival.leader), 1 / 60);
    assert.deepEqual(stopped.actors, resumed.clanShipReturnEscort.actors, 'resuming cannot collapse settled actors onto the player');
    const admitted = act(resumed, { type: 'confirm-medical' }, point('soins', arrival.leader));
    assert.equal(admitted.clanShipReturnEscort.phase, 'at-medical');
  }
});
