import assert from 'node:assert/strict';
import test from 'node:test';
import { HOUSE, continuation, continuationAdmissionO6, practice, regionContextO6, saves, walkO6 } from './helpers/origin-continuation-o6.mjs';

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
  future.originV151.continuationO6.version = 3;
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

test('a consenting novice chooses a tool, walks with the mentor and closes E1 by telling what to practice next', () => {
  let save = continuationAdmissionO6('review', 'O6-E1');
  assert.equal(view(save).practice, null);
  assert.equal(apply(save, 'listen-novice'), null);
  const advance = (order, post) => {
    save = walkO6(save, post);
    const changed = apply(save, order);
    assert.ok(changed, order);
    save = { ...save, originV151: changed.origin };
  };
  for (const order of continuation.continuationOrdersO6(false, true)) advance(order, continuation.CONTINUATION_POSTS_O6[order]);
  const prepared = save;
  const steps = Object.keys(practice.PRACTICE_POSTS_O6);
  const memory = new Map();
  const disk = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
  assert.ok(saves.replaceSaveWithStatus(save, disk).persisted);
  assert.ok(view(save).practice.student);
  assert.equal(apply(save, 'present-tools'), null);

  for (const order of steps) {
    assert.equal(view(save).practice.next, order);
    const post = practice.PRACTICE_POSTS_O6[order];
    if (order === 'steady-novice') {
      const start = view(save).practice.student.x;
      const approached = walkO6(save, post);
      assert.ok(start - view(approached).practice.student.x > 150);
      assert.equal(apply(save, order), null);
    }
    advance(order, post);
    const write = saves.writeSaveWithStatus(save, disk);
    assert.ok(write.persisted, write.failure);
    save = saves.parseSaveImport(saves.exportSave(write.save)).save;
    assert.ok(save);
    assert.equal(view(save).practice.hasStaff, ['present-tools', 'show-footing', 'steady-novice'].includes(order));
    assert.equal(save.originV151.ending.endingRealized, order === 'hear-lesson-outcome');
    if (order === 'return-staff') {
      assert.ok(view(save).practice.student);
      assert.equal(apply(save, 'hear-lesson-outcome'), null);
      assert.equal(continuation.canReadFirstLessonO6(save), false);
    }
  }
  assert.equal(view(save).practice.next, null);
  assert.equal(view(save).practice.student, null);
  assert.equal(save.originV151.continuationO6.version, 2);
  assert.deepEqual(save.originV151.continuationO6.practice, steps);
  assert.deepEqual(save.originV151.ending, { ...prepared.originV151.ending, endingRealized: true });
  assert.deepEqual(save.originV151.consumed, [...prepared.originV151.consumed, practice.O6_FIRST_LESSON_EVENT]);
  assert.equal(continuation.canReadFirstLessonO6(save), true);
  assert.deepEqual(save.trophies, prepared.trophies);
  assert.deepEqual(save.residenceV149, prepared.residenceV149);
  assert.deepEqual(save.originV151.relations, prepared.originV151.relations);
  assert.deepEqual(save.prologue.chronicle, prepared.prologue.chronicle);
  assert.equal(saves.writeSaveWithStatus(prepared, disk).failure, 'save-conflict');
  assert.equal(continuation.keepsContinuationO6(prepared.originV151.continuationO6, save.originV151.continuationO6), false);

  for (const change of [
    copy => { copy.originV151.ending.endingRealized = false; },
    copy => { copy.originV151.consumed.pop(); },
    copy => { copy.originV151.continuationO6.practice.pop(); },
    copy => { delete copy.originV151.continuationO6; },
  ]) {
    const clone = structuredClone(save);
    change(clone);
    assert.equal(saves.parseSaveImport(JSON.stringify(clone)).failure, 'invalid-save');
  }

  for (const damage of [
    record => { record.practice.splice(1, 1); },
    record => { record.orders.pop(); },
    record => { record.version = 1; },
  ]) {
    const clone = structuredClone(save);
    damage(clone.originV151.continuationO6);
    assert.equal(saves.parseSaveImport(JSON.stringify(clone)).failure, 'invalid-save');
  }
});
