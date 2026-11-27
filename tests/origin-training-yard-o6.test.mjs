import assert from 'node:assert/strict';
import test from 'node:test';
import { HOUSE, origins, regions, saves, trainingYardAdmissionO6, yard } from './helpers/origin-training-yard-o6.mjs';

const context = { rankId: 'blooded', regionAllowed: () => true };
const apply = (save, order) => yard.applyTrainingYardO6(save.originV151, save.residenceV149, save.homeworldRegionV68, context, order);

function walk(save, target) {
  let current = save.homeworldRegionV68;
  for (let i = 0; i < 900 && Math.hypot(current.actor.x - target.x, current.actor.y - target.y) > 15; i++) {
    const dx = target.x - current.actor.x, dy = target.y - current.actor.y;
    current = regions.stepHomeworldRegionV68(current, {
      x: Math.abs(dx) > 5 ? Math.sign(dx) : 0, y: Math.abs(dy) > 5 ? Math.sign(dy) : 0,
    });
  }
  assert.ok(Math.hypot(current.actor.x - target.x, current.actor.y - target.y) < 16);
  assert.ok(regions.canAdvanceHomeworldRegionV68(save.homeworldRegionV68, current));
  return { ...save, homeworldRegionV68: current };
}

test('O6 mounts both stations, walks the floor to the threshold and preserves the route after each import', () => {
  let save = trainingYardAdmissionO6();
  const original = save;
  assert.equal(apply(save, 'support'), null);
  for (const order of yard.TRAINING_YARD_ORDERS_O6) {
    assert.equal(apply(save, order), null, 'The character has not reached the next post');
    save = walk(save, yard.TRAINING_YARD_POSTS_O6[order]);
    const changed = apply(save, order);
    assert.ok(changed);
    const imported = saves.parseSaveImport(saves.exportSave({ ...save, originV151: changed }));
    assert.ok(imported.save, imported.failure);
    save = imported.save;
  }
  assert.deepEqual(save.originV151.trainingYardO6.houses[HOUSE], yard.TRAINING_YARD_ORDERS_O6);
  assert.equal(apply(save, 'threshold'), null);
  assert.deepEqual(save.originV151.transitions, original.originV151.transitions);
  assert.deepEqual(save.originV151.relations, original.originV151.relations);
  assert.equal(save.originV151.ending, original.originV151.ending);
  assert.deepEqual(save.residenceV149, original.residenceV149);
  assert.deepEqual(save.profile, original.profile);
});

test('O6 refuses a locked house, an unrelated origin and malformed markers on import', () => {
  const save = walk(trainingYardAdmissionO6(), yard.TRAINING_YARD_POSTS_O6.support);
  assert.equal(apply({ ...save, residenceV149: { ...save.residenceV149, activeResidenceId: null } }, 'support'), null);
  assert.equal(apply({ ...save, originV151: origins.createOriginV151('O2') }, 'support'), null);
  assert.equal(apply(save, 'rack'), null);
  const staged = { ...save, originV151: apply(save, 'support') };
  for (const corrupt of [
    copy => { copy.originV151.trainingYardO6.houses[HOUSE] = ['rack', 'aisle']; },
    copy => { copy.residenceV149 = null; },
    copy => { copy.originV151.originId = 'O2'; },
  ]) {
    const clone = structuredClone(staged);
    corrupt(clone);
    assert.equal(saves.parseSaveImport(JSON.stringify(clone)).failure, 'invalid-save');
  }
});
