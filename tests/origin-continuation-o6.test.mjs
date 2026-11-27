import assert from 'node:assert/strict';
import test from 'node:test';
import { HOUSE, continuation, continuationAdmissionO6, regionContextO6, saves, walkO6 } from './helpers/origin-continuation-o6.mjs';

const view = save => continuation.continuationViewO6(save, save.originV151, save.homeworldRegionV68, regionContextO6(save));
const apply = (save, order) => continuation.applyContinuationO6(save, save.originV151, save.homeworldRegionV68, regionContextO6(save), order);

test('O6 receives a willing Yena, performs the cordage together, prepares three horizons and opens the confirmed E1 rack', () => {
  let save = continuationAdmissionO6();
  const initial = save;
  const memory = new Map();
  const disk = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
  assert.ok(saves.replaceSaveWithStatus(save, disk).persisted);
  assert.equal(view(save).visitor, null);
  assert.equal(apply(save, 'open-rack'), null);
  for (const order of continuation.continuationOrdersO6(true, true)) {
    assert.equal(view(save).next, order);
    save = walkO6(save, continuation.CONTINUATION_POSTS_O6[order]);
    const changed = apply(save, order);
    assert.ok(changed);
    const write = saves.writeSaveWithStatus({ ...save, originV151: changed.origin }, disk);
    assert.ok(write.persisted, write.failure);
    save = saves.parseSaveImport(saves.exportSave(write.save)).save;
    assert.ok(save);
    if (order === 'welcome') assert.ok(view(save).visitor);
    if (order === 'farewell') assert.equal(view(save).visitor, null);
  }
  assert.equal(view(save).next, null);
  assert.equal(view(save).rackOpen, true);
  assert.deepEqual(save.originV151.ending, initial.originV151.ending);
  assert.equal(save.originV151.ending.endingRealized, false);
  assert.deepEqual(save.originV151.relations, initial.originV151.relations);
  assert.deepEqual(save.residenceV149, initial.residenceV149);
  assert.deepEqual(save.prologue.chronicle, initial.prologue.chronicle);
  assert.equal(saves.writeSaveWithStatus(initial, disk).failure, 'save-conflict');

  for (const corrupt of [
    copy => { copy.originV151.continuationO6.ownerCreatedAt = '2026-11-27T01:00:00.000Z'; },
    copy => { copy.originV151.continuationO6.orders.splice(1, 1); },
    copy => { copy.originV151.continuationO6.helpedYena = false; },
    copy => { copy.originV151.ending.originEndingId = 'O6-E2'; },
    copy => { copy.originV151.consumed = []; },
    copy => { delete copy.originV151.trainingYardO6.houses[HOUSE]; },
  ]) {
    const clone = structuredClone(save);
    corrupt(clone);
    assert.equal(saves.parseSaveImport(JSON.stringify(clone)).failure, 'invalid-save');
  }
  const future = structuredClone(save);
  future.originV151.continuationO6.version = 2;
  assert.equal(saves.parseSaveImport(JSON.stringify(future)).failure, 'future-version');
});

test('the unchosen childhood visit stays absent and the rack requires an authentic Elite and the E1 choice', () => {
  let save = continuationAdmissionO6('review', 'O6-E2');
  assert.equal(view(save).visitor, null);
  assert.equal(view({ ...save, eliteRecognitionV174: null }), null);
  save = walkO6(save, continuation.CONTINUATION_POSTS_O6.invite);
  assert.equal(apply(save, 'invite'), null);
  for (const order of continuation.continuationOrdersO6(false, false)) {
    save = walkO6(save, continuation.CONTINUATION_POSTS_O6[order]);
    save = { ...save, originV151: apply(save, order).origin };
    assert.equal(view(save).visitor, null);
  }
  assert.equal(view(save).next, null);
  assert.equal(apply(save, 'open-rack'), null);
  assert.equal(save.originV151.ending.originEndingId, 'O6-E2');
  assert.equal(save.originV151.ending.endingRealized, false);
});
