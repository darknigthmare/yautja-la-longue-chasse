import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { appendUserSpriteReferences } from '../scripts/lib/production-review-user-sprites-v43.mjs';

const intake = JSON.parse(fs.readFileSync('docs/v43-user-sprite-intake.json', 'utf8'));

test('Eight user references preserve PNG bytes and native alpha without becoming animations', () => {
  assert.equal(intake.assets.length, 8);
  const entries = appendUserSpriteReferences([], intake);
  assert.equal(new Set(entries.map(entry => entry.src)).size, 8);
  for (const entry of entries) {
    const png = fs.readFileSync('public' + entry.src);
    assert.equal(crypto.createHash('sha256').update(png).digest('hex'), entry.sha256);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), entry.width);
    assert.equal(png.readUInt32BE(20), entry.height);
    assert.equal(png[25], 6, 'PNG is RGBA, not an opaque/checkerboard stand-in');
    assert.equal(entry.category, 'reference');
    assert.equal(entry.sourceGenerator, 'user-supplied');
    assert.equal(entry.frameCount, 1);
    assert.equal(entry.animated, false);
    assert.deepEqual(entry.frames, []);
  }
  assert.equal(entries.find(entry => entry.id.endsWith('sinestro-corps-predator')).nativeFacing, 'left');
  assert.equal(entries.find(entry => entry.id.endsWith('batman-vs-predator')).nativeFacing, 'right');
});

test('User reference import rejects unsupported animation or canon promotion', () => {
  for (const patch of [{ animated: true }, { frameCount: 10 }, { canonicalIdentityVerified: true }, { sourceGenerator: 'openai-imagegen' }]) {
    const altered = structuredClone(intake);
    Object.assign(altered.assets[0], patch);
    assert.throws(() => appendUserSpriteReferences([], altered));
  }
});

test('User reference import rejects unsafe paths and duplicate gallery identities', () => {
  const altered = structuredClone(intake);
  altered.assets[0].publicPath = '/game/sprites/v43/user-packs/../../outside.png';
  assert.throws(() => appendUserSpriteReferences([], altered));
  const entries = appendUserSpriteReferences([], intake);
  assert.throws(() => appendUserSpriteReferences(entries, intake));
});

test('Historical runtime coverage remains separate from static gallery references', () => {
  const anchor = { id: 'existing-hunter', src: '/game/existing.png', category: 'hunter', frames: [{ facing: 'right' }] };
  const original = structuredClone(anchor);
  const entries = appendUserSpriteReferences([anchor], intake);
  assert.deepEqual(entries[0], original);
  assert.equal(entries.filter(entry => entry.category === 'hunter').length, 1);
  assert.equal(entries.filter(entry => entry.category === 'reference').length, 8);
});
