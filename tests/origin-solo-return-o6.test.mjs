import assert from 'node:assert/strict';
import test from 'node:test';
import { enterHallO6, returnRules as rules, saves, soloReturnAdmissionO6, walkO6 } from './helpers/origin-solo-return-o6.mjs';

const view = save => rules.soloReturnViewO6(save, save.homeworldRegionV68, rules.soloReturnEvidenceO6(save));
const act = (save, order) => rules.applySoloReturnO6(save, save.homeworldRegionV68, order);

for (const choice of ['victory', 'limit']) {
  test(`O6 records the physical solo debrief and the ${choice} account with Saar`, () => {
    const admitted = soloReturnAdmissionO6();
    assert.equal(view(admitted), null);
    assert.equal(act(enterHallO6(admitted), 'pack-kit'), null);
    let save = enterHallO6(admitted);
    const memory = new Map();
    const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
    assert.ok(saves.replaceSaveWithStatus(save, storage).persisted);
    const steps = ['quiet', 'rinse-blades', 'pack-kit', choice];
    for (const order of steps) {
      save = walkO6(save, rules.SOLO_RETURN_POSTS_O6[order]);
      if (order === choice) assert.equal(view(save).saar, true);
      const originV151 = act(save, order);
      assert.ok(originV151, order);
      const written = saves.writeSaveWithStatus({ ...save, originV151 }, storage);
      assert.ok(written.persisted, written.failure);
      save = saves.parseSaveImport(saves.exportSave(written.save)).save;
      assert.ok(save);
      if (order === 'rinse-blades') assert.equal(view(save).support, 'clean');
    }
    assert.equal(view(save).final, choice);
    assert.match(view(save).account, /Saar/);
    assert.equal(view(save).options.length, 0);
    assert.deepEqual(save.originV151.soloReturnO6.orders, steps);
    assert.equal(save.originV151.soloReturnO6.evidence.response, 'mobility-used');
    assert.equal(save.originV151.version, 2);
    assert.deepEqual(save.originV151.ending, admitted.originV151.ending);
    assert.deepEqual(save.originV151.consumed, admitted.originV151.consumed);
    assert.deepEqual(save.prologue.chronicle, admitted.prologue.chronicle);
    assert.deepEqual(save.inventory, admitted.inventory);
    assert.equal(saves.writeSaveWithStatus(admitted, storage).failure, 'save-conflict');

    for (const damage of [
      state => { state.originV151.soloReturnO6.evidence.traceTicks--; },
      state => { state.originV151.soloReturnO6.evidence.saarReturn = 0; },
      state => { state.originV151.soloReturnO6.orders.splice(1, 1); },
      state => { state.originV151.version = 1; },
    ]) {
      const clone = structuredClone(save);
      damage(clone);
      assert.equal(saves.parseSaveImport(JSON.stringify(clone)).failure, 'invalid-save');
    }
    const future = structuredClone(save);
    future.originV151.soloReturnO6.version = 2;
    assert.equal(saves.parseSaveImport(JSON.stringify(future)).failure, 'future-version');
  });
}

test('O6 requires the real Elite receipt and the solo replay, and handles missing equipment or Saar', () => {
  let save = enterHallO6(soloReturnAdmissionO6());
  assert.equal(rules.soloReturnEvidenceO6({ ...save, eliteRecognitionV174: null }), null);
  const wrongWay = structuredClone(save);
  wrongWay.originV151.originId = 'O1';
  assert.equal(view(wrongWay), null);
  const pretend = structuredClone(save);
  pretend.quatzaRij.expeditions.solo.attempts.at(-1).input = [];
  assert.equal(view(pretend), null);

  delete save.quatzaRij.expeditions.triad;
  assert.equal(rules.soloReturnEvidenceO6(save).saarReturn, 0);
  save.inventory.unlockedWeaponIds = save.inventory.unlockedWeaponIds.filter(id => id !== 'wristblades');
  for (const order of ['quiet', 'empty-support', 'pack-kit', 'limit']) {
    save = walkO6(save, rules.SOLO_RETURN_POSTS_O6[order]);
    assert.equal(view(save).saar, false);
    if (order === 'empty-support') assert.equal(act(save, 'rinse-blades'), null);
    const originV151 = act(save, order);
    assert.ok(originV151, order);
    save = { ...save, originV151 };
  }
  assert.doesNotMatch(view(save).account, /Saar/);
  assert.equal(view(save).support, 'empty');
});

test('an authenticated Elite legacy campaign keeps the default O6 origin when its debrief starts', () => {
  let save = enterHallO6(soloReturnAdmissionO6());
  delete save.originV151;
  assert.ok(rules.soloReturnEvidenceO6(save));
  save = walkO6(save, rules.SOLO_RETURN_POSTS_O6.quiet);
  const originV151 = act(save, 'quiet');
  assert.equal(originV151?.source, 'legacy-default');
  assert.deepEqual(originV151?.soloReturnO6?.orders, ['quiet']);
  const archived = saves.parseSaveImport(saves.exportSave({ ...save, originV151 }));
  assert.equal(archived.save?.originV151?.source, 'legacy-default');
  assert.deepEqual(archived.save?.originV151?.soloReturnO6?.orders, ['quiet']);
});
