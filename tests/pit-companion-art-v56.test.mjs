import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import sharp from 'sharp';

const source = JSON.parse(await readFile('app/game/data/pitCompanionArtV56.json', 'utf8'));
const bundle = await build({ stdin: { contents: `export * from './app/game/pitCompanionArt'; export * from './app/game/systems/pitCombat';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'esm' });
const p = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('four native sources preserve bytes, true alpha and every individually registered pose', async () => {
  assert.equal(source.records.length, 4);
  for (const art of source.records) {
    const bytes = await readFile('public' + art.src);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), art.sha256);
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, art.width); assert.equal(info.height, art.height);
    assert.equal(art.frames.length, art.variantId === 'tracker-hound' ? 6 : 1);
    for (const frame of art.frames) {
      const [sx, sy, width, height] = frame.rect;
      let left = width, right = -1, top = height, bottom = -1;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (data[((sy + y) * info.width + sx + x) * 4 + 3] > 16) {
          left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
      }
      assert.deepEqual([left, top, right - left + 1, bottom - top + 1], frame.alphaBounds);
      assert(Math.min(left, top, width - 1 - right, height - 1 - bottom) >= 8, art.src + '/' + frame.pose);
      assert(Math.abs(frame.pivot[1] - bottom) <= 4, 'paw pivot stays on the source support plane');
    }
  }
});

test('native atlas rectangles and paw pivots drive drawing without mirrors or state changes', () => {
  for (const art of p.PIT_COMPANION_ART) {
    const state = p.createPitCombatState('tracker', 'jungle-hunter', { houndVariantId: art.variantId });
    const effect = { id: 1, ownerSlot: 0, techniqueId: 'tracker-hound-2010', x: 360, y: 0, age: 31, direction: art.facing, phase: 'active', hitCount: 0, rehitFrames: 0 };
    const bank = { variantId: art.variantId, images: new Map([[art.facing, { src: art.src }]]), failed: false, cancelled: false };
    const before = p.serializePitCombat(state), draws = [], transforms = [];
    const context = new Proxy({ globalAlpha: 1, save() {}, restore() {}, drawImage: (...args) => draws.push(args), scale: (...args) => transforms.push(args) }, { get(target, key) { return key in target ? target[key] : () => {}; } });
    for (const patch of [
      { phase: 'arming', age: 1 }, { phase: 'active', age: 24 }, { phase: 'active', age: 30 },
      { phase: 'returning', hitCount: 1, rehitFrames: 5 }, { phase: 'returning', hitCount: 0, rehitFrames: 5 },
    ]) {
      Object.assign(effect, patch);
      assert(p.drawPitCompanion(context, state, effect, bank, 410, false, false));
      const pose = p.pitCompanionPose(effect, art.variantId), frame = art.frames.find(f => f.pose === pose);
      assert(frame); assert.deepEqual(draws.at(-1).slice(1, 5), frame.rect);
      const scale = 86 / (art.pivot[1] - art.topY), drawY = draws.at(-1)[6];
      assert.equal(drawY + frame.pivot[1] * scale, 410);
    }
    assert.equal(transforms.length, 0);
    assert.equal(p.serializePitCombat(state), before);
  }
});

test('pause gives the same frame; reduced motion holds charge and longhorn never borrows atlas poses', () => {
  const effect = { phase: 'active', age: 31, hitCount: 0, rehitFrames: 0 };
  assert.equal(p.pitCompanionPose(effect, 'tracker-hound'), 'charge-b');
  assert.equal(p.pitCompanionPose(effect, 'tracker-hound'), 'charge-b');
  assert.equal(p.pitCompanionPose(effect, 'tracker-hound', true), 'charge-a');
  for (const phase of ['arming', 'active', 'returning']) assert.equal(p.pitCompanionPose({ ...effect, phase, hitCount: 1, rehitFrames: 4 }, 'hellhound-longhorn'), 'idle');
});
