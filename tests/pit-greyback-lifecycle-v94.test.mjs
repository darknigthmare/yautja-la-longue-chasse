import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const root = process.cwd(), digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const intake = readJson('art-source/v94/pit/greyback/intake.json');
const entries = readJson('app/game/data/pitLifecycleGreybackV94.json'), entry = entries[0], page = entry.atlas.pages[0];
const loader = homeworldSceneSsrV78(), art = loader.load('app/game/pitSpriteSheetAnimation.ts');
const combat = loader.load('app/game/systems/pitCombat.ts'), atlas = loader.load('app/game/hunterSpriteAtlas.ts');
const publicBytes = fs.readFileSync(path.join(root, 'public', page.src));
const decoded = await sharp(publicBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const source = { width: decoded.info.width, height: decoded.info.height, pixels: new Uint8ClampedArray(decoded.data) };
const crop = (pixels, width, [x, y, w, h], canonical = false) => {
  const result = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++) result.set(pixels.subarray(((y + row) * width + x) * 4, ((y + row) * width + x + w) * 4), row * w * 4);
  if (canonical) for (let offset = 0; offset < result.length; offset += 4) if (!result[offset + 3]) result.fill(0, offset, offset + 4);
  return result;
};

test('Greyback ten originals retain native RGBA bytes and explicit partial/refused provenance', async () => {
  assert.equal(intake.archives.length, 10); assert.equal(intake.generationBudget.actualInitial, 10); assert.equal(intake.generationBudget.replacements, 0);
  assert.equal(intake.canonicalFidelityCertified, false); assert.equal(intake.actual.completeFamilyCycles, 0);
  assert.equal(digest(fs.readFileSync(path.join(root, intake.reference.path))), 'eda4af4a7d6b975b26301ca7cd00a1b0e8c913de6f22d012e0434caed46d5763');
  for (const record of intake.archives) {
    const bytes = fs.readFileSync(path.join(root, record.sourcePath)), metadata = await sharp(bytes).metadata();
    assert.equal(digest(bytes), record.sha256); assert.equal(bytes.length, record.bytes);
    assert.equal(metadata.hasAlpha, true); assert.deepEqual([metadata.width, metadata.height], [1024, 1536]);
    assert(record.transparentPixels > 100_000); assert.equal(record.pixelTransformation, 'none-byte-identical-copy');
    assert(record.generatorOriginalBasename.startsWith('exec-'));
    if (!record.sourcePath.includes('/05-')) { assert.equal(record.decision, 'refused'); assert.equal(record.runtimeAcceptedDrawings, 0); }
  }
  assert.equal(readJson('art-source/v94/pit/greyback/prompts.json').pages.length, 10);
  assert.deepEqual(fs.readdirSync(path.join(root, 'public/game/sprites/v94/pit/greyback')), ['05-greyback-masked-victory-right-partial-v94.png']);
});

test('only the six reviewed right-facing victory cells have safe alpha windows, equipment review and one fixed scale', () => {
  assert.equal(entries.length, 1); assert.equal(entry.fighterId, 'greyback'); assert.equal(entry.variantId, intake.variantId);
  assert.equal(entry.atlas.variantId, entry.variantId); assert.equal(entry.bodyHeightPx, 478);
  assert.deepEqual(entry.pageBodyHeightPx, { [page.id]: 478 });
  assert.equal(atlas.validateHunterSpriteAtlas(entry.atlas).valid, true);
  assert.equal(digest(publicBytes), intake.admission.sha256);
  assert.deepEqual(publicBytes, fs.readFileSync(path.join(root, intake.admission.sourcePath)));
  assert.equal(entry.atlas.clips.length, 1); const clip = entry.atlas.clips[0];
  assert.equal(clip.id, 'pit.presentation.victory'); assert.equal(clip.facing, 'right'); assert.equal(clip.loop, false);
  assert.equal(clip.frames.length, 6); assert.equal(clip.ticksPerSecond, 60); assert.equal(clip.frames.reduce((sum, frame) => sum + frame.durationTicks, 0), 120);
  assert.equal(intake.admission.excludedCells.length, 6); assert(intake.admission.excludedCells.every(cell => cell.facing === 'left'));
  const hashes = new Set();
  const processed = atlas.processHunterSpriteTransparency(source.pixels, source.width, source.height, page.transparency);
  for (const [index, frame] of clip.frames.entries()) {
    const review = intake.admission.acceptedCells[index]; assert.equal(review.facing, 'right'); assert(review.column < 2);
    assert.deepEqual(frame.rect, review.rect); assert.deepEqual(frame.pivot, review.pivot); assert(review.borderAlpha <= 2);
    const [x, y, w, h] = frame.rect, pixels = crop(processed.pixels, source.width, frame.rect, true);
    for (let row = 0; row < h; row++) for (let column = 0; column < w; column++) {
      if (!pixels[(row * w + column) * 4 + 3]) continue;
      assert(row > 0 && row < h - 1 && column > 0 && column < w - 1, 'native foreground must not reach a neighboring drawing or rectangle edge');
    }
    assert.equal(digest(crop(processed.pixels, source.width, review.visibleRect, true)), review.drawingSha256);
    hashes.add(digest(pixels)); assert(x >= 0 && y >= 0 && x + w <= 512 && y + h <= 1536);
  }
  assert.equal(hashes.size, 6, 'actual native pixels differ in all six retained drawings');
});

test('real PNG readback loader and presentation draw consume all six Greyback cells without mirroring or altering simulation', async () => {
  const prior = { Image: globalThis.Image, document: globalThis.document }, requests = [];
  globalThis.Image = class {
    set src(url) {
      if (!url) return; requests.push(url);
      if (url !== page.src) { queueMicrotask(() => this.onerror?.()); return; }
      Object.assign(this, source); this.naturalWidth = source.width; this.naturalHeight = source.height; this.complete = true;
      queueMicrotask(() => this.onload?.());
    }
  };
  globalThis.document = { createElement() {
    const canvas = { width: 0, height: 0, pixels: null };
    canvas.getContext = () => ({ clearRect() { canvas.pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4); },
      drawImage(image, ...args) {
        const rect = args.length === 8 ? args.slice(0, 4) : [0, 0, image.width, image.height];
        assert.deepEqual(rect.slice(2), [canvas.width, canvas.height]); canvas.pixels = crop(image.pixels, image.width, rect);
      }, getImageData() { return { data: canvas.pixels.slice() }; }, putImageData(value) { canvas.pixels = value.data.slice(); } });
    return canvas;
  } };
  try {
    const bank = await art.loadPitSpriteSheetAnimations(['greyback'], entries, { variants: [entry.variantId] });
    assert.equal(bank.readyClipCount, 1); assert.deepEqual(bank.failedAtlasIds, []); assert.deepEqual(requests, [page.src]);
    const state = combat.createPitCombatState('greyback', 'jungle-hunter', { variants: [entry.variantId, null] });
    const fighter = state.fighters[0], before = combat.serializePitCombat(state);
    const options = elapsedMs => ({ presentation: { phase: 'round-result', winnerSlot: 0, round: 1,
      elapsedMs, durationMs: 2000, blocksSimulation: true, resultVisible: false } });
    for (let index = 0; index < 6; index++) {
      const opts = options(index * 20 * 1000 / 60), presentation = art.resolvePitSpriteSheetPresentation(bank, fighter, opts);
      assert(presentation); assert.equal(presentation.status, 'dedicated-animation'); assert.equal(presentation.frame.frameIndex, index);
      assert.deepEqual(presentation.frame.frame, entry.atlas.clips[0].frames[index]);
      const calls = [], forbidden = () => assert.fail('cannot mirror/rotate/transform a native original');
      const context = { globalAlpha: 1, save() {}, restore() {}, scale: forbidden, rotate: forbidden, translate: forbidden,
        transform: forbidden, setTransform: forbidden, drawImage(...args) { calls.push(args); } };
      assert.equal(art.drawPitSpriteSheetPresentation(context, bank, fighter, 440, opts), true);
      assert.equal(calls.length, 1); assert.deepEqual(calls[0].slice(1, 5), presentation.frame.frame.rect);
      const scale = combat.PIT_FIGHTERS.greyback.bodyHeight / 478;
      assert.deepEqual(calls[0].slice(7), [presentation.frame.frame.rect[2] * scale, presentation.frame.frame.rect[3] * scale]);
      const contact = loader.load('app/game/spriteContact.ts').getSpriteContact(presentation.source, presentation.frame.frame.rect, presentation.frame.frame.pivot[1]);
      assert(contact);
      assert.equal(calls[0][6], 440 - (presentation.frame.frame.pivot[1] - contact.offsetY) * scale, 'native feet stay aligned to real scene floor');
      assert.equal(combat.serializePitCombat(state), before);
    }
    assert.equal(art.resolvePitSpriteSheetPresentation(bank, fighter, { ...options(0), reducedMotion: true }).frame.frameIndex, 5);
    assert.equal(art.resolvePitSpriteSheetPresentation(bank, { ...fighter, facing: -1 }, options(0)), null, 'no unreviewed left clip or software mirror');
    assert.equal(art.resolvePitSpriteSheetPresentation(bank, { ...fighter, variantId: null }, options(0)), null, 'no borrowing default/unmasked appearance');
    assert.equal(art.pitNativeTauntDurationV93(bank, fighter), null, 'this partial victory never authorizes an absent taunt');
    assert.equal(art.resolvePitSpriteSheetPresentation(bank, fighter, options(2500)).frame.frameIndex, 5, 'non-looping clip holds last native pose');
  } finally { Object.assign(globalThis, prior); }
});
