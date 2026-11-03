import assert from 'node:assert/strict';
import test from 'node:test';
import { measureSpriteContact, getSpriteContact, drawActorContactShadow } from '../app/game/spriteContact.ts';

function pixels(width, height, bottom, alpha = 255) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 10; y <= bottom; y++) for (let x = 20; x < 60; x++) data[(y * width + x) * 4 + 3] = alpha;
  return data;
}

test('ground edge excludes faint padding and isolated pixels without mutating RGBA', () => {
  const data = pixels(100, 100, 94);
  for (let x = 20; x < 60; x++) data[(96 * 100 + x) * 4 + 3] = 32;
  data[(99 * 100 + 80) * 4 + 3] = 255;
  const before = data.slice();
  assert.deepEqual(measureSpriteContact(data, 100, 100, 97), { left: 20, right: 59, supportY: 95, offsetY: 2 });
  assert.deepEqual(data, before);
});

test('raised poses and an already registered edge keep authored origins', () => {
  const data = pixels(100, 100, 70);
  assert.equal(measureSpriteContact(data, 100, 100, 97).offsetY, 0);
  assert.equal(measureSpriteContact(data, 100, 100, 71).offsetY, 0);
  assert.equal(measureSpriteContact(data, 100, 100, 60).offsetY, 0);
  assert.equal(measureSpriteContact(new Uint8Array(400), 10, 10, 9), null);
  assert.equal(measureSpriteContact(data, NaN, 100, 97), null);
});

test('readback and failed readback are cached per source/cell; scratch memory is released', () => {
  const previous = globalThis.document;
  const data = pixels(100, 100, 94), canvases = []; let reads = 0, fail = false;
  globalThis.document = { createElement: () => {
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage() {}, getImageData() { reads++; if (fail) throw Error('tainted'); return { data }; } }) };
    canvases.push(canvas); return canvas;
  } };
  try {
    const source = {}, badSource = {};
    assert.equal(getSpriteContact(source, [0, 0, 100, 100], 97).offsetY, 2);
    getSpriteContact(source, [0, 0, 100, 100], 97);
    assert.equal(reads, 1);
    fail = true;
    assert.equal(getSpriteContact(badSource, [0, 0, 100, 100], 97), null);
    assert.equal(getSpriteContact(badSource, [0, 0, 100, 100], 97), null);
    assert.equal(reads, 2);
    assert.ok(canvases.every(canvas => canvas.width === 0 && canvas.height === 0));
  } finally { globalThis.document = previous; }
});

test('jump shadows stay on floor and shrink, grounded actors get contact shadow', () => {
  const ellipses = [];
  const context = { globalAlpha: 1, save() {}, restore() {}, beginPath() {}, fill() {}, ellipse(...args) { ellipses.push(args); } };
  drawActorContactShadow(context, 160, 430, 30, 0);
  assert.equal(ellipses.length, 2);
  const base = ellipses[0]; ellipses.length = 0;
  drawActorContactShadow(context, 160, 430, 30, 100);
  assert.equal(ellipses.length, 1);
  assert.equal(ellipses[0][1], base[1]);
  assert.ok(ellipses[0][2] < base[2]);
  drawActorContactShadow(context, NaN, 430, 30, 0);
  assert.equal(ellipses.length, 1);
});
