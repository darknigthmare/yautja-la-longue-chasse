import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import sharp from 'sharp';

const source = JSON.parse(await readFile('app/game/data/pitFalconerDroneArtV58.json', 'utf8'));
const bundle = await build({
  stdin: { contents: `export * from './app/game/pitFalconerDroneArt'; export * from './app/game/systems/pitCombat'; export * from './app/game/systems/pitFalconerDrone';`, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const p = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

function sample(facing = 1, phase = 'active') {
  const state = p.createPitCombatState('falconer', 'jungle-hunter', { mode: 'training' });
  const effect = { id: 1, ownerSlot: 0, techniqueId: p.PIT_FALCONER_RECON_DRONE.id,
    x: 360, y: 66, age: 31, direction: facing, phase, hitCount: 0, rehitFrames: 0 };
  state.techniqueEffects.push(effect);
  state.nextTechniqueEffectId = 2;
  return { state, effect };
}

function contextRecorder() {
  const draws = [], boxes = [], transforms = [], calls = [];
  const context = {
    globalAlpha: 1,
    save: () => calls.push('save'), restore: () => calls.push('restore'),
    drawImage: (...args) => draws.push(args), strokeRect: (...args) => boxes.push(args),
    scale: (...args) => transforms.push(args), rotate: (...args) => transforms.push(args),
  };
  return { context, draws, boxes, transforms, calls };
}

const readyBank = () => ({ images: new Map(p.PIT_FALCONER_DRONE_ART.map(art => [art.facing, { src: art.src }])), failed: false, cancelled: false });

test('Falconer sensor ships independent PNG sides with verified alpha and measured frame bounds', async () => {
  assert.equal(source.schemaVersion, 1);
  assert.equal(source.records.length, 2);
  assert.deepEqual(source.records.map(art => art.facing).sort(), [-1, 1]);
  const hashes = new Set();
  for (const art of source.records) {
    const bytes = await readFile('public' + art.src);
    const hash = createHash('sha256').update(bytes).digest('hex');
    assert.equal(hash, art.sha256);
    hashes.add(hash);
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, art.width);
    assert.equal(info.height, art.height);
    assert(art.referenceWidth > 0 && art.referenceWidth <= art.width);
    assert(art.frames.some(frame => frame.pose === 'flight'));
    assert.equal(new Set(art.frames.map(frame => frame.pose)).size, art.frames.length, 'one native drawing per semantic pose, no duplicated looping frames');
    for (const frame of art.frames) {
      const [sx, sy, width, height] = frame.rect;
      let left = width, right = -1, top = height, bottom = -1, transparent = false;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const alpha = data[((sy + y) * info.width + sx + x) * 4 + 3];
        transparent ||= alpha === 0;
        if (alpha > 16) {
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
      }
      assert(transparent && right >= 0);
      assert.deepEqual([left, top, right - left + 1, bottom - top + 1], frame.alphaBounds);
      assert(Math.min(left, top, width - 1 - right, height - 1 - bottom) >= 4, `${art.src}/${frame.pose}`);
      assert(frame.pivot[0] >= left && frame.pivot[0] <= right && frame.pivot[1] >= top && frame.pivot[1] <= bottom);
    }
  }
  assert.equal(hashes.size, 2, 'native sides are two files, not duplicated bytes');
});

test('native source and pivot follow the actual entity direction and centre without canvas mirroring', () => {
  for (const facing of [-1, 1]) for (const phase of ['arming', 'active', 'returning']) {
    const { state, effect } = sample(facing, phase);
    const before = JSON.stringify(state);
    const bank = readyBank(), { context, draws, boxes, transforms, calls } = contextRecorder();
    assert(p.drawPitFalconerDrone(context, state, effect, bank, 410, false, true));
    const { art, frame } = p.resolvePitFalconerDroneFrame(effect);
    const box = p.getPitTechniqueBox(state, effect), scale = source.worldWidth / art.referenceWidth;
    assert.equal(draws.length, 1);
    assert.equal(draws[0][0].src, art.src);
    assert.deepEqual(draws[0].slice(1, 5), frame.rect);
    assert.equal(draws[0][5] + frame.pivot[0] * scale, box.x + box.width / 2);
    assert.equal(draws[0][6] + frame.pivot[1] * scale, 410 - box.y - box.height / 2);
    assert.deepEqual(boxes, [[box.x, 410 - box.y - box.height, box.width, box.height]]);
    assert.equal(transforms.length, 0);
    assert.deepEqual(calls, ['save', 'restore']);
    assert.equal(JSON.stringify(state), before, 'render cannot affect marking, damage, replay or input state');
  }
});

test('held sensor poses have no wall clock, bob, pulse or fake animation when paused or reduced motion is enabled', () => {
  const { state, effect } = sample();
  const bank = readyBank();
  const first = contextRecorder(), later = contextRecorder();
  p.drawPitFalconerDrone(first.context, state, effect, bank, 410, false, false);
  const frame = p.resolvePitFalconerDroneFrame(effect);
  state.frame += 999;
  effect.age += 99;
  p.drawPitFalconerDrone(later.context, state, effect, bank, 410, true, false);
  assert.deepEqual(first.draws, later.draws);
  assert.deepEqual(frame, p.resolvePitFalconerDroneFrame(effect));
  assert.equal(first.context.globalAlpha, 1);
  assert.equal(later.context.globalAlpha, 1);
});

test('missing or cancelled art stays unavailable instead of substituting a shape or unrelated asset', () => {
  const { state, effect } = sample();
  for (const bank of [null, { ...readyBank(), failed: true }, { ...readyBank(), cancelled: true }, { ...readyBank(), images: new Map() }]) {
    const { context, draws } = contextRecorder();
    assert.equal(p.drawPitFalconerDrone(context, state, effect, bank, 410, false, false), false);
    assert.equal(draws.length, 0);
  }
  const { context, draws } = contextRecorder();
  state.fighters[0].definitionId = 'tracker';
  assert.equal(p.drawPitFalconerDrone(context, state, effect, readyBank(), 410, false, false), false);
  state.fighters[0].definitionId = 'falconer';
  effect.techniqueId = 'unrecognized-device';
  assert.equal(p.drawPitFalconerDrone(context, state, effect, readyBank(), 410, false, false), false);
  assert.equal(draws.length, 0);
});

test('old V7 drone entity can use the same native art without rewriting its state or drawing after round end', () => {
  const { state, effect } = sample(-1);
  effect.techniqueId = p.PIT_FALCONER_LEGACY_DRONE.id;
  const before = JSON.stringify(state), record = contextRecorder();
  assert(p.drawPitFalconerDrone(record.context, state, effect, readyBank(), 410, false, false));
  assert.equal(JSON.stringify(state), before);
  state.phase = 'match-over';
  assert.equal(p.drawPitFalconerDrone(record.context, state, effect, readyBank(), 410, false, false), false);
  assert.equal(record.draws.length, 1);
});

test('sensor loading handles no browser, cancellation, timeout and image errors without an unresolved promise', async () => {
  const originalImage = globalThis.Image;
  try {
    delete globalThis.Image;
    assert.equal((await p.loadPitFalconerDroneArt()).failed, true);
    const controller = new AbortController(); controller.abort();
    assert.equal((await p.loadPitFalconerDroneArt({ signal: controller.signal })).cancelled, true);
    globalThis.Image = class { set src(value) { this.value = value; } };
    assert.equal((await p.loadPitFalconerDroneArt({ timeoutMs: 2 })).failed, true);
    globalThis.Image = class { set src(value) { if (value) queueMicrotask(() => this.onerror?.()); } };
    assert.equal((await p.loadPitFalconerDroneArt()).failed, true);
    const pending = new AbortController();
    globalThis.Image = class { set src(value) { this.value = value; } };
    const promise = p.loadPitFalconerDroneArt({ signal: pending.signal });
    pending.abort();
    const cancelled = await promise;
    assert.equal(cancelled.failed, true); assert.equal(cancelled.cancelled, true);
    assert.equal(cancelled.images.size, 0);
  } finally {
    if (originalImage) globalThis.Image = originalImage;
    else delete globalThis.Image;
  }
});

test('loader accepts both real decoded PNGs together and rejects a dimension mismatch as an incomplete bank', async () => {
  const originalImage = globalThis.Image, originalDocument = globalThis.document;
  const decoded = new Map();
  for (const art of source.records) {
    const { data, info } = await sharp(await readFile('public' + art.src)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    decoded.set(art.src, { data, info });
  }
  let mismatch = false;
  try {
    globalThis.Image = class {
      set src(value) {
        this.url = value;
        if (!value) return;
        const image = decoded.get(value);
        this.naturalWidth = image.info.width + (mismatch ? 1 : 0);
        this.naturalHeight = image.info.height;
        queueMicrotask(() => this.onload?.());
      }
    };
    globalThis.document = { createElement: () => {
      let pixels;
      return { width: 0, height: 0, getContext: () => ({
        drawImage: image => { pixels = decoded.get(image.url).data; },
        getImageData: () => ({ data: pixels }),
      }) };
    } };
    const bank = await p.loadPitFalconerDroneArt();
    assert.equal(bank.failed, false); assert.equal(bank.cancelled, false);
    assert.deepEqual([...bank.images.keys()].sort(), [-1, 1]);
    mismatch = true;
    const invalid = await p.loadPitFalconerDroneArt();
    assert.equal(invalid.failed, true); assert.equal(invalid.images.size, 0);
  } finally {
    if (originalImage) globalThis.Image = originalImage;
    else delete globalThis.Image;
    if (originalDocument) globalThis.document = originalDocument;
    else delete globalThis.document;
  }
});
