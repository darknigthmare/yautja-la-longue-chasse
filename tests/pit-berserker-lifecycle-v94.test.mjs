import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

// Actual PNG alpha/readback and production resolver/draw, not anatomical QA.
const root = process.cwd(), folder = 'art-source/v94/pit/berserker';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const json = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const intake = json(folder + '/intake.json'), prompts = json(folder + '/prompts.json');
const geometry = json(folder + '/partial-native-geometry.json');
const entries = json('app/game/data/pitLifecycleBerserkerV94.json');
const loader = homeworldSceneSsrV78(), art = loader.load('app/game/pitSpriteSheetAnimation.ts');
const combat = loader.load('app/game/systems/pitCombat.ts'), atlas = loader.load('app/game/hunterSpriteAtlas.ts');
const contactApi = loader.load('app/game/spriteContact.ts');
const expected = [
  ['intro', 8, 72], ['victory', 5, 120], ['defeat', 10, 120], ['taunt', 10, 90],
];
const standing = new Map([[2, 370], [3, 384], [4, 414], [5, 404], [6, 437], [7, 443], [9, 396], [10, 385]]);
const decoded = new Map();
for (const page of entries.flatMap(entry => entry.atlas.pages)) if (!decoded.has(page.src)) {
  const bytes = fs.readFileSync(path.join(root, 'public', page.src));
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  decoded.set(page.src, { bytes, width: info.width, height: info.height, pixels: new Uint8ClampedArray(data) });
}
function crop(pixels, width, [x, y, w, h], canonical = false) {
  const result = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++) result.set(pixels.subarray(((y + row) * width + x) * 4, ((y + row) * width + x + w) * 4), row * w * 4);
  if (canonical) for (let offset = 0; offset < result.length; offset += 4) if (!result[offset + 3]) result.fill(0, offset, offset + 4);
  return result;
}
const recordFor = page => intake.archives.find(record => page.src.endsWith('/' + record.file));

test('Berserker ten real generation attempts preserve nine original PNGs and the explicit failed dizzy request', async () => {
  assert.deepEqual(intake.generationBudget, { attempts: 10, pngProduced: 9, replacements: 0 });
  assert.equal(prompts.pages.length, 10); assert.equal(intake.archives.length, 10);
  assert.equal(intake.canonicalFidelityCertified, false); assert.equal(intake.detailedDeliveryComplete, false);
  assert.deepEqual(intake.actual, { runtimeDefinitions: 4, runtimeClips: 4, runtimePngs: 8, runtimeDrawings: 33,
    completeFamilyCycles: 0, missingIdle: true, missingDizzy: true, allLeftFacingsMissing: true });
  assert.equal(digest(fs.readFileSync(path.join(root, intake.reference.path))), intake.reference.sha256);
  for (const record of intake.archives) {
    if (record.sequence === 8) {
      assert.equal(record.decision, 'generation-failed-no-png'); assert.equal(record.sourcePath, null);
      assert.equal(record.sha256, null); assert.equal(record.runtimeAcceptedDrawings, 0);
      assert.match(fs.readFileSync(path.join(root, record.errorPath), 'utf8'), /moderation_blocked/);
      assert.equal(fs.existsSync(path.join(root, folder, record.file)), false);
      continue;
    }
    const bytes = fs.readFileSync(path.join(root, record.sourcePath)), metadata = await sharp(bytes).metadata();
    assert.equal(digest(bytes), record.sha256); assert.equal(bytes.length, record.bytes);
    assert.deepEqual([metadata.width, metadata.height], [1254, 1254]); assert.equal(metadata.hasAlpha, true);
    assert(record.transparentPixels > 100_000); assert.equal(record.pixelTransformation, 'none-byte-identical-copy');
    assert(record.generatorOriginalBasename.startsWith('exec-'));
    assert.equal(record.canonicalFidelityCertified, false); assert.equal(record.detailedFamilyComplete, false);
    if (record.sequence === 1) { assert.equal(record.decision, 'refused'); assert.equal(record.runtimeAcceptedDrawings, 0); }
    else { assert.equal(record.decision, 'accepted-partial-right-only'); assert(record.runtimeAcceptedDrawings > 0); }
  }
  assert.deepEqual(fs.readdirSync(path.join(root, 'public/game/sprites/v94/pit/berserker')).sort(),
    intake.archives.filter(record => record.runtimeAcceptedDrawings > 0).map(record => record.file).sort());
});

test('four explicitly partial families own only reviewed right cells and fixed standing references per page', () => {
  assert.equal(entries.length, 4);
  for (const [index, entry] of entries.entries()) {
    const [family, drawings, ticks] = expected[index], clip = entry.atlas.clips[0];
    assert.equal(entry.fighterId, 'berserker'); assert.equal(entry.variantId, 'berserker-avec-casque-ba1f7a7b1e');
    assert.equal(entry.atlas.variantId, entry.variantId); assert.equal(entry.atlas.characterId, entry.fighterId);
    assert.equal(entry.atlas.sourceKind, 'authored-frames'); assert.equal(atlas.validateHunterSpriteAtlas(entry.atlas).valid, true);
    assert(entry.atlas.id.includes('-right-partial-')); assert.equal(entry.atlas.clips.length, 1);
    assert.equal(clip.id, 'pit.presentation.' + family); assert.equal(clip.facing, 'right'); assert.equal(clip.loop, false);
    assert.equal(clip.ticksPerSecond, 60); assert.equal(clip.frames.length, drawings);
    assert.equal(clip.frames.reduce((sum, frame) => sum + frame.durationTicks, 0), ticks);
    assert(drawings < 12, 'metadata never promotes this partial delivery to detailed twelve-drawing coverage');
    assert.deepEqual(Object.keys(entry.pageBodyHeightPx).sort(), entry.atlas.pages.map(page => page.id).sort());
    for (const page of entry.atlas.pages) {
      const record = recordFor(page), proof = intake.bodyReference.pageStandingReferences.find(value => value.sequence === record.sequence);
      assert.equal(entry.pageBodyHeightPx[page.id], standing.get(record.sequence));
      const witness = geometry.pages.find(value => value.file === record.file).cells.find(cell => cell.row === proof.row && cell.col === proof.col);
      assert.equal(witness.visibleRect[3], proof.height); assert.equal(proof.height, entry.pageBodyHeightPx[page.id]);
      assert.equal(proof.usedAsRuntimeFrame, record.acceptedCells.some(cell => cell.row === proof.row && cell.col === proof.col));
      for (const frame of clip.frames.filter(value => value.pageId === page.id)) {
        const cell = record.acceptedCells.find(value => JSON.stringify(value.rect) === JSON.stringify(frame.rect));
        assert(cell); assert.equal(cell.facing, 'right'); assert(cell.col < 2);
        assert.deepEqual(cell.pivot, frame.pivot); assert(cell.borderAlpha <= 2);
        assert.equal(record.excludedCells.some(value => value.row === cell.row && value.col === cell.col), false);
      }
    }
  }
  const defeatB = intake.archives.find(record => record.sequence === 7);
  assert(defeatB.excludedCells.some(cell => cell.row === 0 && cell.col === 0));
  assert.equal(intake.bodyReference.pageStandingReferences.find(value => value.sequence === 7).usedAsRuntimeFrame, false,
    'excluded upright witness establishes scale without reintroducing the discontinuous pose');
  const lowPose = defeatB.acceptedCells.find(cell => cell.row === 2 && cell.col === 1);
  assert.equal(lowPose.visibleRect[3], 304); assert.equal(standing.get(7), 443, 'kneeling pose cannot be fit to standing size');
  assert.doesNotMatch(JSON.stringify(entries), /generated_images|C:[\\/]|prompt|sourceArchive/);
  assert.equal(entries.some(entry => entry.atlas.clips.some(clip => clip.id === 'idle' || clip.id === 'pit.presentation.dizzy' || clip.facing === 'left')), false);
});

test('eight public native PNGs are original bytes and all thirty-three declared drawings stay isolated and distinct', () => {
  const drawings = new Set();
  for (const entry of entries) for (const page of entry.atlas.pages) {
    const source = decoded.get(page.src), record = recordFor(page);
    assert.equal(digest(source.bytes), record.sha256);
    assert.deepEqual(source.bytes, fs.readFileSync(path.join(root, record.sourcePath)));
    assert.deepEqual(page.transparency, { mode: 'alpha', noiseFloor: 2 });
    const processed = atlas.processHunterSpriteTransparency(source.pixels, source.width, source.height, page.transparency);
    for (const frame of entry.atlas.clips[0].frames.filter(value => value.pageId === page.id)) {
      const cell = record.acceptedCells.find(value => JSON.stringify(value.rect) === JSON.stringify(frame.rect));
      const pixels = crop(processed.pixels, source.width, frame.rect, true), [x, y, width, height] = frame.rect;
      let minX = width, minY = height, maxX = -1, maxY = -1, count = 0;
      for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) if (pixels[(row * width + col) * 4 + 3]) {
        assert(row > 0 && row < height - 1 && col > 0 && col < width - 1, 'no foreground reaches a native border or adjacent drawing');
        minX = Math.min(minX, col); minY = Math.min(minY, row); maxX = Math.max(maxX, col); maxY = Math.max(maxY, row); count++;
      }
      assert.equal(count, cell.foregroundPixels); assert.deepEqual([x + minX, y + minY, maxX - minX + 1, maxY - minY + 1], cell.visibleRect);
      assert.equal(frame.pivot[1], maxY); assert(frame.pivot[0] >= minX && frame.pivot[0] <= maxX);
      assert.equal(digest(crop(processed.pixels, source.width, cell.visibleRect, true)), cell.drawingSha256);
      drawings.add(cell.drawingSha256);
      assert.deepEqual(entry.visibleFrameBounds.find(value => value.pageId === page.id && JSON.stringify(value.rect) === JSON.stringify(frame.rect)).visibleRect, cell.visibleRect);
    }
  }
  assert.equal(drawings.size, 33, 'thirty-three real distinct drawings, not repeated poses or software mirrors');
});

function options(clip, elapsedTicks, reducedMotion = false, resultPhase = 'round-result') {
  const family = clip.id.replace('pit.presentation.', ''), total = clip.frames.reduce((sum, frame) => sum + frame.durationTicks, 0);
  return { reducedMotion, presentation: { phase: family === 'intro' ? 'intro-left' : family === 'taunt' ? 'fight' : resultPhase,
    fighterSlot: 0, winnerSlot: family === 'defeat' ? 1 : 0, fighterTaunts: family === 'taunt' ? [true, false] : undefined,
    round: 1, elapsedMs: (elapsedTicks + .05) * 1000 / 60, durationMs: total * 1000 / 60,
    blocksSimulation: family !== 'taunt', resultVisible: false } };
}

test('actual readback bank, round cues and floor drawing consume every native frame with page-specific scale and no simulation writes', async () => {
  const prior = { Image: globalThis.Image, document: globalThis.document }, requests = [];
  globalThis.Image = class { set src(url) {
    if (!url) return; requests.push(url); const source = decoded.get(url);
    if (!source) { queueMicrotask(() => this.onerror?.()); return; }
    Object.assign(this, source); this.naturalWidth = source.width; this.naturalHeight = source.height; this.complete = true;
    queueMicrotask(() => this.onload?.());
  } };
  globalThis.document = { createElement() {
    const canvas = { width: 0, height: 0, pixels: null };
    canvas.getContext = () => ({ clearRect() { canvas.pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4); },
      drawImage(image, ...args) {
        const rect = args.length === 8 ? args.slice(0, 4) : [0, 0, image.width, image.height];
        assert.deepEqual(rect.slice(2), [canvas.width, canvas.height], 'real native readback is never resized');
        canvas.pixels = crop(image.pixels, image.width, rect);
      }, getImageData() { return { data: canvas.pixels.slice() }; }, putImageData(value) { canvas.pixels = value.data.slice(); } });
    return canvas;
  } };
  try {
    const bank = await art.loadPitSpriteSheetAnimations(['berserker'], entries, { variants: [intake.variantId] });
    assert.equal(bank.readyClipCount, 4); assert.deepEqual(bank.failedAtlasIds, []);
    assert.deepEqual([...new Set(requests)].sort(), [...decoded.keys()].sort());
    const state = combat.createPitCombatState('berserker', 'jungle-hunter', { mode: 'training', movesets: 'current', variants: [intake.variantId, null] });
    const fighter = state.fighters[0]; fighter.x = 440; fighter.y = 37; fighter.facing = 1;
    const before = combat.serializePitCombat(state);
    for (const entry of entries) {
      const clip = entry.atlas.clips[0]; let elapsed = 0;
      for (const [index, frame] of clip.frames.entries()) {
        const opts = options(clip, elapsed), sample = art.resolvePitSpriteSheetPresentation(bank, fighter, opts);
        assert(sample); assert.equal(sample.status, 'dedicated-animation'); assert.equal(sample.definition.atlas.id, entry.atlas.id);
        assert.equal(sample.frame.frameIndex, index); assert.deepEqual(sample.frame.frame, frame);
        const calls = [], stack = [], forbidden = () => assert.fail('no native drawing can be mirrored, rotated or transformed');
        const context = { globalAlpha: 1, save() { stack.push(this.globalAlpha); }, restore() { this.globalAlpha = stack.pop(); },
          scale: forbidden, rotate: forbidden, translate: forbidden, transform: forbidden, setTransform: forbidden,
          drawImage(...args) { calls.push(args); } };
        assert.equal(art.drawPitSpriteSheetPresentation(context, bank, fighter, 440, opts), true); assert.equal(calls.length, 1);
        assert.equal(calls[0][0], sample.source); assert.deepEqual(calls[0].slice(1, 5), frame.rect);
        const scale = combat.PIT_FIGHTERS.berserker.bodyHeight / entry.pageBodyHeightPx[frame.pageId];
        const contact = contactApi.getSpriteContact(sample.source, frame.rect, frame.pivot[1]); assert(contact);
        assert.equal(calls[0][5], fighter.x - frame.pivot[0] * scale);
        assert.equal(calls[0][6], 440 - (frame.pivot[1] - contact.offsetY) * scale, 'feet stay on the floor despite airborne simulation y');
        assert.deepEqual(calls[0].slice(7), [frame.rect[2] * scale, frame.rect[3] * scale]);
        assert.equal(context.filter, 'none'); assert.equal(context.globalAlpha, 1); assert.deepEqual(stack, []);
        assert.equal(combat.serializePitCombat(state), before); elapsed += frame.durationTicks;
      }
      assert.equal(art.resolvePitSpriteSheetPresentation(bank, fighter, options(clip, 0, true)).frame.frameIndex, clip.frames.length - 1);
      assert.equal(art.resolvePitSpriteSheetPresentation(bank, fighter, options(clip, elapsed + 300)).frame.frameIndex, clip.frames.length - 1,
        'partial non-looping ceremonies hold their final native drawing');
      if (clip.id === 'pit.presentation.victory' || clip.id === 'pit.presentation.defeat') {
        assert.equal(art.resolvePitSpriteSheetPresentation(bank, fighter, options(clip, 0, false, 'match-result')).definition.atlas.id, entry.atlas.id);
      }
      assert.equal(art.resolvePitSpriteSheetPresentation(bank, { ...fighter, facing: -1 }, options(clip, 0)), null);
      assert.equal(art.resolvePitSpriteSheetPresentation(bank, { ...fighter, variantId: 'berserker-sans-casque-1939be2d31' }, options(clip, 0)), null);
    }
    assert.equal(art.pitNativeTauntDurationV93(bank, fighter), 1500);
    assert.equal(art.pitNativeTauntDurationV93(bank, { ...fighter, facing: -1 }), null);
    const wrong = await art.loadPitSpriteSheetAnimations(['berserker'], entries, { variants: ['berserker-sans-casque-1939be2d31'] });
    assert.equal(wrong.readyClipCount, 0); assert.equal(art.pitNativeTauntDurationV93(wrong, fighter), null);
    assert.equal(art.resolvePitSpriteSheetPresentation(bank, fighter, { presentation: { phase: 'finisher-window', winnerSlot: 1,
      elapsedMs: 100, durationMs: 5000, round: 1, blocksSimulation: true, resultVisible: false } }), null, 'failed dizzy generation cannot authorize an invented waiting pose');
    assert.equal(art.resolvePitSpriteSheetAnimation(bank, fighter, { simulationFrame: 0, combat: state }), null, 'refused idle source cannot authorize an idle animation');
    assert.equal(combat.serializePitCombat(state), before);
  } finally { Object.assign(globalThis, prior); }
});
