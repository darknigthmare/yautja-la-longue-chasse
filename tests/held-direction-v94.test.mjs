import test from 'node:test';
import assert from 'node:assert/strict';
import {createHeldDirectionV94} from '../app/game/systems/heldDirectionV94.ts';

test('no held key means no movement', () => { assert.equal(createHeldDirectionV94().direction(), 0); });
test('unrelated keyup never stops a direction', () => {
  const keys = createHeldDirectionV94(); keys.press('KeyE', 1);
  assert.equal(keys.release('KeyF'), 1); assert.equal(keys.release('KeyE'), 0);
});
test('the most recent physical direction wins; releasing it resumes the first', () => {
  const keys = createHeldDirectionV94(); keys.press('KeyQ', -1);
  assert.equal(keys.press('KeyD', 1), 1); assert.equal(keys.release('KeyD'), -1);
  assert.equal(keys.release('KeyQ'), 0);
});
test('opposite auto-repeat does not steal movement priority', () => {
  const keys = createHeldDirectionV94(); keys.press('KeyQ', -1); keys.press('KeyD', 1);
  for (let i = 0; i < 20; i++) assert.equal(keys.press('KeyQ', -1), 1);
  assert.equal(keys.release('KeyD'), -1);
});
test('two aliases for the same action are tracked independently', () => {
  const keys = createHeldDirectionV94(); keys.press('KeyD', 1); keys.press('ArrowRight', 1);
  assert.equal(keys.release('ArrowRight'), 1); assert.equal(keys.release('KeyD'), 0);
});
test('releasing an older opposite key leaves the current movement intact', () => {
  const keys = createHeldDirectionV94(); keys.press('KeyQ', -1); keys.press('KeyD', 1);
  assert.equal(keys.release('KeyQ'), 1);
});
test('blur, dialog, suspend and page reset discard all old held keys', () => {
  for (const reason of ['blur', 'dialog', 'suspend', 'page']) {
    const keys = createHeldDirectionV94(); keys.press('KeyQ', -1); keys.press('KeyD', 1);
    keys.reset(); assert.equal(keys.direction(), 0, reason);
    assert.equal(keys.release('KeyD'), 0, reason); assert.equal(keys.release('KeyQ'), 0, reason);
  }
});
test('unknown physical keys cannot create a stuck hold', () => {
  const keys = createHeldDirectionV94(); assert.equal(keys.press('', 1), 0);
});
test('separate mounted surfaces never share held state', () => {
  const a = createHeldDirectionV94(), b = createHeldDirectionV94(); a.press('KeyE', 1);
  assert.equal(b.direction(), 0); b.reset(); assert.equal(a.direction(), 1);
});
test('all permutations of three presses/releases return to neutral', () => {
  const orders = [['KeyQ','KeyD','ArrowRight'],['KeyQ','ArrowRight','KeyD'],['KeyD','KeyQ','ArrowRight'],['KeyD','ArrowRight','KeyQ'],['ArrowRight','KeyQ','KeyD'],['ArrowRight','KeyD','KeyQ']];
  for (const presses of orders) for (const releases of orders) {
    const keys = createHeldDirectionV94(), expected = new Map();
    for (const key of presses) { const direction = key === 'KeyQ' ? -1 : 1; expected.set(key, direction); keys.press(key, direction); }
    for (const key of releases) { expected.delete(key); assert.equal(keys.release(key), [...expected.values()].at(-1) ?? 0); }
  }
});

test('an auto-repeat after focus loss cannot revive a discarded hold', () => {
  const keys = createHeldDirectionV94(); keys.press('KeyD', 1); keys.reset();
  assert.equal(keys.press('KeyD', 1, true), 0);
  assert.equal(keys.press('KeyD', 1, false), 1);
});
