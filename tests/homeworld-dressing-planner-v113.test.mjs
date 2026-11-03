import test from 'node:test';
import assert from 'node:assert/strict';
import {reduceHomeworldDressingV113} from '../scripts/lib/reduce-homeworld-dressing-v113.mjs';

const candidate = () => ({facades: [{id: 'closed-volume'}], fixtures: [{id: 'lamp'}, {id: 'blocked-walk'}], places: [{id: 'bench'}]});

test('a failed base or retained facade stops after two checks without destroying the source plan', () => {
  const input = candidate(), original = JSON.stringify(input); let calls = 0;
  assert.throws(() => reduceHomeworldDressingV113(input, () => {calls++; return false;}), /fails without removable dressing/);
  assert.equal(calls, 2);
  assert.equal(JSON.stringify(input), original);
});

test('an empty failing plan cannot enter an infinite reduction', () => {
  let calls = 0;
  assert.throws(() => reduceHomeworldDressingV113({fixtures: [], places: [], facades: []}, () => {calls++; return false;}), /fails without removable dressing/);
  assert.equal(calls, 2);
});

test('the reducer removes the actual obstruction and keeps independent fixtures, places and facades', () => {
  const input = candidate(), original = JSON.stringify(input);
  const {result, removed} = reduceHomeworldDressingV113(input, data => !data.fixtures.some(item => item.id === 'blocked-walk'));
  assert.deepEqual(removed, ['blocked-walk']);
  assert.deepEqual(result.fixtures, [{id: 'lamp'}]);
  assert.deepEqual(result.places, input.places); assert.deepEqual(result.facades, input.facades);
  assert.equal(JSON.stringify(input), original);
});

test('a changing runner cannot keep retrying after the initial baseline passed', () => {
  let calls = 0;
  assert.throws(() => reduceHomeworldDressingV113(candidate(), () => ++calls === 2), /no longer passes its empty baseline/);
  assert(calls < 20);
});

test('an already valid plan is retained without invoking a reduction baseline', () => {
  const input = candidate(); let calls = 0;
  const out = reduceHomeworldDressingV113(input, () => {calls++; return true;});
  assert.deepEqual(out, {result: input, removed: []}); assert.equal(calls, 1);
});
