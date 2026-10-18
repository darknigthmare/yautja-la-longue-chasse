import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import sharp from 'sharp';

// Real native PNG bytes and production decode/resolver/draw functions.
// Headless deterministic validation; visual anatomy review is recorded separately.
const root = fileURLToPath(new URL('..', import.meta.url));
const digest = value => createHash('sha256').update(value).digest('hex');
const entries = JSON.parse(await readFile(path.join(root, 'app/game/data/pitLifecycleCelticV94.json'), 'utf8'));
const admission = JSON.parse(await readFile(path.join(root, 'art-source/v94/pit/celtic/lifecycle-admission.json'), 'utf8'));
const bundled = await build({ stdin: { contents: `export * from './app/game/pitSpriteSheetAnimation.ts';
 export * from './app/game/hunterSpriteAtlas.ts'; export {getSpriteContact} from './app/game/spriteContact.ts';
 export {createPitCombatState,stepPitCombat,PIT_FIGHTERS} from './app/game/systems/pitCombat.ts';`, resolveDir: root },
 bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const decoded = new Map();
for (const page of entries.flatMap(entry => entry.atlas.pages)) {
  const bytes = await readFile(path.join(root, 'public', page.src));
  const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4);
  decoded.set(page.src, { bytes, pixels: new Uint8ClampedArray(data), width: info.width, height: info.height });
}
function crop(pixels, pageWidth, [x0, y0, width, height], canonical = false) {
  const result = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) result.set(pixels.subarray(((y0 + y) * pageWidth + x0) * 4, ((y0 + y) * pageWidth + x0 + width) * 4), y * width * 4);
  if (canonical) for (let i = 0; i < result.length; i += 4) if (!result[i + 3]) result.fill(0, i, i + 4);
  return result;
}
const prior = { Image: globalThis.Image, document: globalThis.document };
globalThis.Image = class {
  set src(url) {
    if (!url) return;
    const source = decoded.get(url);
    if (!source) { queueMicrotask(() => this.onerror?.()); return; }
    Object.assign(this, source); this.complete = true; this.naturalWidth = source.width; this.naturalHeight = source.height;
    queueMicrotask(() => this.onload?.());
  }
};
globalThis.document = { createElement() {
  const canvas = { width: 0, height: 0, pixels: null };
  canvas.getContext = () => ({
    clearRect() { canvas.pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4); },
    drawImage(source, ...args) {
      const rect = args.length === 8 ? args.slice(0, 4) : [0, 0, source.width, source.height];
      assert.deepEqual(rect.slice(2), [canvas.width, canvas.height], 'native decoder never rescales source pixels');
      canvas.pixels = crop(source.pixels, source.width, rect);
    },
    getImageData() { return { data: canvas.pixels.slice() }; },
    putImageData(value) { canvas.pixels = value.data.slice(); },
  }); return canvas;
} };
test.after(() => Object.assign(globalThis, prior));
const variantId = 'celtic-avec-casque-0764ed4b53';
const bank = await api.loadPitSpriteSheetAnimations(['celtic'], entries, { variants: [variantId] });

test('ten original Celtic sheets are preserved and only 93 explicitly approved cells are rendered', async () => {
  assert.equal(admission.originalPages, 10); assert.equal(admission.targetDrawings, 128);
  assert.equal(admission.admittedPages, 8); assert.equal(admission.admittedDrawings, 93); assert.equal(admission.admittedClips, 12);
  assert.equal(admission.canonicalFidelityCertified, false);
  assert.equal(admission.pages.reduce((sum, page) => sum + page.excludedCells.length, 0), 35);
  for (const record of admission.pages) {
    const bytes = await readFile(path.join(root, record.sourcePath));
    assert.equal(digest(bytes), record.sha256); assert.equal(bytes.length, record.bytes);
    const meta = await sharp(bytes).metadata(); assert.equal(meta.hasAlpha, true);
    assert.ok(record.zeroAlphaFraction > .45 && record.zeroAlphaFraction < .7);
    assert.equal(record.pixelTransformation, 'none-byte-identical-copy');
    if (record.publicPath) assert.deepEqual(await readFile(path.join(root, record.publicPath)), bytes);
    else assert.ok(!entries.some(entry => entry.atlas.pages.some(page => page.id === record.pageId)));
  }
  for (const reference of admission.references) assert.equal(digest(await readFile(path.join(root, reference.path))), reference.sha256);
  const uniqueDrawings = new Set();
  for (const entry of entries) {
    assert.equal(api.validateHunterSpriteAtlas(entry.atlas).valid, true); assert.equal(entry.variantId, variantId);
    const record = admission.entries.find(item => item.atlasId === entry.atlas.id); assert.ok(record);
    for (const clip of entry.atlas.clips) for (const frame of clip.frames) {
      const page = entry.atlas.pages.find(item => item.id === frame.pageId), source = decoded.get(page.src);
      const proof = record.cells.find(cell => cell.pageId === frame.pageId && JSON.stringify(cell.rect) === JSON.stringify(frame.rect)); assert.ok(proof);
      assert.equal(proof.facing, clip.facing); assert.equal(proof.borderAlpha <= 2, true); assert.deepEqual(frame.pivot, proof.pivot);
      const processed = api.processHunterSpriteTransparency(source.pixels, source.width, source.height, page.transparency);
      const pixels = crop(processed.pixels, source.width, frame.rect, true);
      assert.equal(digest(pixels), proof.canonicalCellSha256);
      const [x0, y0, width, height] = frame.rect;
      let minX = width, minY = height, maxX = -1, maxY = -1, count = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4 + 3]) {
        assert.ok(x > 0 && y > 0 && x < width - 1 && y < height - 1);
        count++; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      assert.ok(count > 5000); assert.equal(count, proof.foregroundPixels); assert.equal(frame.pivot[1], maxY);
      assert.deepEqual(proof.visibleRect, [x0 + minX, y0 + minY, maxX - minX + 1, maxY - minY + 1]);
      uniqueDrawings.add(proof.drawingSha256);
      assert.ok(!admission.pages.find(item => item.pageId === frame.pageId).excludedCells.some(cell => cell.row === proof.row && cell.col === proof.col));
    }
  }
  assert.equal(uniqueDrawings.size, 93, 'no repeated drawing pads the requested phase counts');
  assert.doesNotMatch(JSON.stringify(entries), /generated_images|C:[\\/]|originalPath|prompt|sourcePath/);
});

test('production bank decodes all twelve exact-costume native clips without borrowing missing faces', async () => {
  assert.deepEqual(bank.failedAtlasIds, []); assert.equal(bank.readyClipCount, 12);
  assert.deepEqual(admission.entries.map(record => [record.family, record.admittedPerFacing.right, record.admittedPerFacing.left]),
    [['idle', 8, 8], ['dizzy', 8, 8], ['intro', 12, 12], ['victory', 6, 5], ['defeat', 6, 3], ['taunt', 8, 9]]);
  assert.deepEqual(admission.entries.filter(record => record.completeRequestedCount).map(record => record.family), ['idle', 'dizzy', 'intro']);
  const other = await api.loadPitSpriteSheetAnimations(['celtic'], entries, { variants: [null] });
  assert.equal(other.readyClipCount, 0);
  const lastColumn = admission.entries.find(entry => entry.family === 'defeat').cells;
  assert.ok(lastColumn.every(cell => cell.col !== 3), 'wrong native facing is excluded rather than mirrored');
  assert.ok(!admission.entries.find(entry => entry.family === 'victory').cells.some(cell => cell.row === 0 && cell.col === 3));
});

function fixture(facing) {
  const state = api.createPitCombatState('celtic', 'jungle-hunter', { mode: 'training', movesets: 'current', variants: [variantId, null] });
  state.fighters[0].facing = facing === 'right' ? 1 : -1; state.fighters[0].x = 440; state.fighters[0].y = 37;
  state.fighters[1].x = facing === 'right' ? 760 : 160;
  return { state, fighter: state.fighters[0] };
}
function options(family, tick, reducedMotion = false) {
  const phase = family === 'intro' ? 'intro-left' : family === 'dizzy' ? 'finisher-window' : family === 'taunt' ? 'taunt' : 'round-result';
  return { reducedMotion, presentation: { phase, elapsedMs: (tick + .05) * 1000 / 60,
    durationMs: family === 'dizzy' ? 5000 : family === 'intro' ? 1200 : family === 'taunt' ? 1500 : 2000,
    fighterSlot: 0, winnerSlot: family === 'defeat' || family === 'dizzy' ? 1 : 0, round: 1, blocksSimulation: true, resultVisible: false } };
}
test('actual presentation resolver and floor draw consume every native phase using fixed page stature', () => {
  for (const entry of entries) {
    const family = entry.atlas.id.replace('celtic-masked-', '').replace('-v94', '');
    if (family === 'idle') continue;
    for (const clip of entry.atlas.clips) {
      const { fighter, state } = fixture(clip.facing), before = JSON.stringify(state);
      let tick = 0;
      for (const [index, frame] of clip.frames.entries()) {
        const opts = options(family, tick), sample = api.resolvePitSpriteSheetPresentation(bank, fighter, opts);
        assert.ok(sample); assert.equal(sample.status, 'dedicated-animation'); assert.equal(sample.definition.atlas.id, entry.atlas.id);
        assert.equal(sample.frame.frameIndex, index); assert.equal(sample.frame.clip.facing, clip.facing); assert.deepEqual(sample.frame.frame, frame);
        const record = admission.entries.find(item => item.atlasId === entry.atlas.id).cells.find(cell => cell.pageId === frame.pageId && JSON.stringify(cell.rect) === JSON.stringify(frame.rect));
        assert.equal(digest(crop(sample.source.pixels, sample.source.width, frame.rect, true)), record.canonicalCellSha256);
        const calls = [], stack = [], forbidden = () => assert.fail('native poses never mirror, rotate or transform');
        const context = { globalAlpha: 1, save() { stack.push(this.globalAlpha); }, restore() { this.globalAlpha = stack.pop(); },
          scale: forbidden, rotate: forbidden, translate: forbidden, transform: forbidden, setTransform: forbidden, drawImage(...args) { calls.push(args); } };
        assert.equal(api.drawPitSpriteSheetPresentation(context, bank, fighter, 440, opts), true); assert.equal(calls.length, 1);
        const bodyHeight = entry.pageBodyHeightPx?.[frame.pageId] ?? entry.bodyHeightPx, scale = api.PIT_FIGHTERS.celtic.bodyHeight / bodyHeight;
        const contact = api.getSpriteContact(sample.source, frame.rect, frame.pivot[1]); assert.ok(contact);
        assert.deepEqual(calls[0].slice(1, 5), frame.rect);
        assert.equal(calls[0][5], fighter.x - frame.pivot[0] * scale);
        assert.equal(calls[0][6], 440 - (frame.pivot[1] - contact.offsetY) * scale);
        assert.deepEqual(calls[0].slice(7), [frame.rect[2] * scale, frame.rect[3] * scale]);
        assert.equal(context.filter, 'none'); assert.equal(context.globalAlpha, 1); assert.deepEqual(stack, []);
        assert.equal(JSON.stringify(state), before, 'theatre drawings never write combat state or corpse/KO physics');
        tick += frame.durationTicks;
      }
    }
  }
});

test('complete intro spans both real pages within 72 ticks and each page keeps one stature for all poses', () => {
  const entry = entries.find(item => item.atlas.id === 'celtic-masked-intro-v94');
  assert.deepEqual(entry.pageBodyHeightPx, { 'celtic-masked-intro-a-v94': 429, 'celtic-masked-intro-b-v94': 411 });
  for (const clip of entry.atlas.clips) {
    const { fighter } = fixture(clip.facing);
    assert.equal(clip.frames.reduce((sum, frame) => sum + frame.durationTicks, 0), 72);
    for (const [tick, index] of [[0, 0], [35, 5], [36, 6], [66, 11], [72, 11]]) {
      const sample = api.resolvePitSpriteSheetPresentation(bank, fighter, options('intro', tick));
      assert.equal(sample.frame.frameIndex, index);
      assert.equal(sample.frame.page.id, index < 6 ? 'celtic-masked-intro-a-v94' : 'celtic-masked-intro-b-v94');
    }
    assert.equal(api.resolvePitSpriteSheetPresentation(bank, fighter, options('intro', 0, true)).frame.frameIndex, 11);
  }
  for (const entry of entries) for (const clip of entry.atlas.clips) {
    assert.equal(clip.loop, clip.id === 'idle' || clip.id === 'pit.presentation.dizzy');
    const expected = clip.id === 'pit.presentation.intro' ? 72 : clip.id === 'pit.presentation.taunt' ? 90 : 120;
    assert.equal(clip.frames.reduce((sum, frame) => sum + frame.durationTicks, 0), expected);
    assert.ok(clip.frames.every(frame => Number.isInteger(frame.durationTicks) && frame.durationTicks > 0));
  }
});

test('eight-frame idle and dizzy loops use their own clocks; partial taunt capability lasts 1500ms on either real face', () => {
  const idle = entries.find(entry => entry.atlas.id === 'celtic-masked-idle-v94');
  const dizzy = entries.find(entry => entry.atlas.id === 'celtic-masked-dizzy-v94');
  for (const facing of ['right', 'left']) {
    const { fighter, state } = fixture(facing), before = JSON.stringify(state); fighter.y = 0;
    const unchanged = JSON.stringify(state);
    for (let index = 0; index < 8; index++) {
      const sample = api.resolvePitSpriteSheetAnimation(bank, fighter, { simulationFrame: index * 15, combat: { ...state, frame: index * 15 } });
      assert.ok(sample); assert.equal(sample.definition.atlas.id, idle.atlas.id); assert.equal(sample.resolved.frame.frameIndex, index);
    }
    const secondLoop = api.resolvePitSpriteSheetAnimation(bank, fighter, { simulationFrame: 121, combat: { ...state, frame: 121 } });
    assert.equal(secondLoop.resolved.frame.frameIndex, 0);
    for (const tick of [0, 15, 119, 120, 135, 299]) {
      const sample = api.resolvePitSpriteSheetPresentation(bank, fighter, options('dizzy', tick));
      assert.equal(sample.definition.atlas.id, dizzy.atlas.id); assert.equal(sample.frame.frameIndex, Math.floor((tick % 120) / 15));
    }
    assert.equal(api.pitNativeTauntDurationV93(bank, fighter), 1500);
    assert.equal(JSON.stringify(state), unchanged); assert.notEqual(before, unchanged, 'only test fixture intentionally moves y to zero');
  }
});
