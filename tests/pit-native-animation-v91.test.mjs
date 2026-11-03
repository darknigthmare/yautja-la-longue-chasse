import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import sharp from 'sharp';

// Real committed PNGs and the production loader/drawer, with a deterministic
// Canvas readback adapter. This is not browser playback or an anatomy review.
const root = fileURLToPath(new URL('..', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const [definitions, manifest] = await Promise.all([
  readFile(path.join(root, 'app/game/data/pitUserAnimationsV91.json'), 'utf8').then(JSON.parse),
  readFile(path.join(root, 'art-source/v91/pit/intake/manifest.json'), 'utf8').then(JSON.parse),
]);
const expectedAppearances = {
  wolf: 'wolf-avec-casque-4261aca172', falconer: 'falconer-avec-casque-f5618ed362',
  scarface: 'scarface-avec-casque-bca00052d4', enforcer: 'enforcer-avec-casque-ca164d8925',
};
const ownerKey = entry => JSON.stringify([entry.fighterId, entry.variantId, entry.atlas.clips[0].id, entry.atlas.clips[0].facing]);
const targetKeys = Object.entries(expectedAppearances).flatMap(([id, variant]) => ['left', 'right'].map(facing =>
  JSON.stringify([id, variant, 'idle', facing]))).concat(['left', 'right'].map(facing =>
  JSON.stringify(['wolf', expectedAppearances.wolf, 'crouch', facing])));
const built = await build({ stdin: { contents: `export * from './app/game/pitSpriteSheetRegistry.ts';
  export * from './app/game/pitSpriteSheetAnimation.ts'; export * from './app/game/hunterSpriteAtlas.ts';
  export {getSpriteContact} from './app/game/spriteContact.ts';
  export {describePitHunterSpriteMotion} from './app/game/hunterSpriteMotion.ts';
  export {drawPitCombatBitmapFighter} from './app/game/pitCombatBitmapArt.ts';
  export {createPitCombatState,stepPitCombat,PIT_FIGHTERS} from './app/game/systems/pitCombat.ts';`, resolveDir: root },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const selectedRegistry = api.PIT_SPRITE_SHEET_REGISTRY.filter(entry =>
  entry.variantId === expectedAppearances[entry.fighterId]);
const decoded = new Map(), nativePixels = new Map();
for (const entry of selectedRegistry) for (const page of entry.atlas.pages) {
  if (decoded.has(page.src)) continue;
  const bytes = await readFile(path.join(root, 'public', page.src));
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  decoded.set(page.src, { pixels: new Uint8ClampedArray(data), width: info.width, height: info.height, bytes });
}
function crop(pixels, pageWidth, [x, y, width, height], canonical = false) {
  const result = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    const start = ((y + row) * pageWidth + x) * 4;
    result.set(pixels.subarray(start, start + width * 4), row * width * 4);
  }
  if (canonical) for (let offset = 0; offset < result.length; offset += 4) {
    if (!result[offset + 3]) result.fill(0, offset, offset + 4);
  }
  return result;
}
function canvasReadbackBrowser() {
  const prior = { Image: globalThis.Image, document: globalThis.document }, requested = [];
  globalThis.Image = class {
    set src(url) {
      if (!url) return;
      requested.push(url); const source = decoded.get(url);
      if (!source) { queueMicrotask(() => this.onerror?.()); return; }
      Object.assign(this, source); this.complete = true;
      this.naturalWidth = source.width; this.naturalHeight = source.height;
      queueMicrotask(() => this.onload?.());
    }
  };
  globalThis.document = { createElement() {
    const canvas = { width: 0, height: 0, pixels: null };
    canvas.getContext = () => ({
      clearRect() { canvas.pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4); },
      drawImage(source, ...args) {
        const rect = args.length === 8 ? args.slice(0, 4) : [0, 0, source.width, source.height];
        assert.deepEqual(rect.slice(2), [canvas.width, canvas.height], 'readback never rescales a source cell');
        canvas.pixels = crop(source.pixels, source.width, rect);
      },
      getImageData() { return { data: canvas.pixels.slice() }; },
      putImageData(data) { canvas.pixels = data.data.slice(); },
    });
    return canvas;
  } };
  return { requested, restore() { Object.assign(globalThis, prior); } };
}
const browser = canvasReadbackBrowser();
test.after(() => browser.restore());
const banks = new Map();
for (const [fighterId, variantId] of Object.entries(expectedAppearances)) {
  banks.set(fighterId, await api.loadPitSpriteSheetAnimations([fighterId], api.PIT_SPRITE_SHEET_REGISTRY,
    { variants: [variantId] }));
}
function combatFixture(fighterId, facing) {
  let state = api.createPitCombatState(fighterId, 'jungle-hunter', { variants: [expectedAppearances[fighterId], null] });
  if (facing === 'left') { state.fighters[0].x = 700; state.fighters[1].x = 200; state.fighters[0].facing = -1; }
  return { get state() { return state; }, get fighter() { return state.fighters[0]; },
    options() { return { simulationFrame: state.frame, combat: state }; },
    step(input = {}) { state = api.stepPitCombat(state, [input, {}]); } };
}
function assertNativeDraw(fixture, entry, index) {
  const bank = banks.get(entry.fighterId), options = fixture.options(), fighter = fixture.fighter;
  const sample = api.resolvePitSpriteSheetAnimation(bank, fighter, options);
  assert.ok(sample); assert.equal(sample.definition.atlas.id, entry.atlas.id);
  assert.equal(sample.definition.variantId, entry.variantId);
  assert.equal(sample.resolved.frame.clip.facing, entry.atlas.clips[0].facing);
  assert.equal(sample.resolved.frame.frameIndex, index);
  const expected = entry.atlas.clips[0].frames[index], source = sample.source;
  assert.deepEqual(sample.resolved.frame.frame, expected);
  assert.equal(hash(crop(source.pixels, source.width, expected.rect, true)), nativePixels.get(entry.atlas.id)[index]);
  const before = JSON.stringify(fixture.state), calls = [], alphas = [];
  const forbidden = () => assert.fail('native source must not be mirrored, rotated, transformed or tweened');
  const context = { globalAlpha: 1, save() { alphas.push(this.globalAlpha); }, restore() { this.globalAlpha = alphas.pop(); },
    scale: forbidden, rotate: forbidden, transform: forbidden, setTransform: forbidden, translate: forbidden,
    drawImage(...args) { calls.push(args); } };
  // The real top-level combat consumer must select the native atlas before its
  // historical static fallback (which is allowed to mirror unavailable poses).
  assert.equal(api.drawPitCombatBitmapFighter(context, { spriteSheets: bank, cancelled: false }, fighter, 440, options), true);
  assert.equal(calls.length, 1); assert.equal(calls[0][0], source);
  assert.deepEqual(calls[0].slice(1, 5), expected.rect);
  const scale = api.PIT_FIGHTERS[entry.fighterId].bodyHeight / entry.bodyHeightPx;
  assert.equal(calls[0][7], expected.rect[2] * scale); assert.equal(calls[0][8], expected.rect[3] * scale);
  assert.ok(calls[0][7] > 0 && calls[0][8] > 0);
  const contact = api.getSpriteContact(source, expected.rect, expected.pivot[1]);
  assert.ok(contact, 'actual alpha readback establishes the ground contact');
  assert.equal(calls[0][5], fighter.x - expected.pivot[0] * scale);
  assert.equal(calls[0][6], 440 - fighter.y - (expected.pivot[1] - contact.offsetY) * scale);
  assert.equal(context.filter, 'none'); assert.equal(context.imageSmoothingEnabled, false);
  assert.equal(context.globalAlpha, 1); assert.deepEqual(alphas, []);
  assert.equal(JSON.stringify(fixture.state), before, 'rendering changes no state, collision, input or replay clock');
}

test('all ten reviewed native sheets preserve original bytes, alpha bounds and two distinct drawings', async () => {
  assert.equal(definitions.length, 10); assert.equal(manifest.entries.length, 10);
  assert.deepEqual(new Set(definitions.map(ownerKey)), new Set(targetKeys));
  const pixelHashes = new Set();
  for (const entry of definitions) {
    assert.equal(entry.atlas.sourceKind, 'authored-frames'); assert.equal(entry.atlas.status, 'validated');
    assert.equal(entry.variantId, expectedAppearances[entry.fighterId]); assert.equal(entry.heldPoseClips, undefined);
    assert.equal(api.validateHunterSpriteAtlas(entry.atlas).valid, true);
    assert.equal(entry.atlas.pages.length, 1); assert.equal(entry.atlas.clips.length, 1);
    const page = entry.atlas.pages[0], clip = entry.atlas.clips[0], source = decoded.get(page.src);
    const record = manifest.entries.find(candidate => candidate.runtimeAsset === page.src);
    assert.ok(record); assert.equal(record.fighterId, entry.fighterId); assert.equal(record.variantId, entry.variantId);
    assert.equal(record.clip, clip.id); assert.equal(record.facing, clip.facing);
    assert.equal(record.visualReview.decision, 'accept');
    assert.equal(Object.values(record.visualReview.checks).filter(value => value === true).length, 6);
    assert.equal(record.canonicalFidelityCertified, false); assert.equal(record.completeFighterAnimation, false);
    assert.equal(hash(source.bytes), record.sourceSha256); assert.equal(source.bytes.length, record.bytes);
    assert.deepEqual(await readFile(path.join(root, record.archive)), source.bytes, 'runtime is a byte-exact archived original');
    assert.deepEqual([source.width, source.height], [page.width, page.height]);
    assert.equal((await sharp(source.bytes).metadata()).hasAlpha, true);
    assert.deepEqual(page.transparency, { mode: 'alpha', noiseFloor: 2 });
    assert.equal(clip.ticksPerSecond, 60); assert.equal(clip.frames.length, 2);
    assert.equal(clip.loop, clip.id === 'idle');
    assert.deepEqual(clip.frames.map(frame => frame.durationTicks), clip.id === 'idle' ? [30, 30] : [6, 12]);
    const processed = api.processHunterSpriteTransparency(source.pixels, source.width, source.height, page.transparency);
    const hashes = clip.frames.map(frame => {
      const pixels = crop(processed.pixels, source.width, frame.rect, true), [x, y, width, height] = frame.rect;
      const bound = entry.visibleFrameBounds.find(candidate => candidate.pageId === frame.pageId &&
        candidate.rect.every((value, index) => value === frame.rect[index]));
      assert.ok(bound); const [vx, vy, vw, vh] = bound.visibleRect;
      let visible = 0;
      for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
        if (!pixels[(row * width + col) * 4 + 3]) continue;
        visible++;
        assert.ok(row > 0 && col > 0 && row < height - 1 && col < width - 1, 'native alpha never crosses the cell border');
        assert.ok(x + col >= vx && x + col < vx + vw && y + row >= vy && y + row < vy + vh,
          'camera envelope includes every visible native pixel');
      }
      assert.ok(visible > 0 && visible < width * height);
      const digest = hash(pixels); pixelHashes.add(digest); return digest;
    });
    assert.equal(new Set(hashes).size, 2, 'a transformed or shared held drawing cannot count as this two-pose sequence');
    nativePixels.set(entry.atlas.id, hashes);
  }
  assert.equal(pixelHashes.size, manifest.distinctNativeDrawings, 'measured incoming drawings only, not whole-roster completeness');
});

test('the actual registry and selected loader retain exact owner/native-side precedence without failed pages', () => {
  for (const entry of definitions) {
    const registered = api.PIT_SPRITE_SHEET_REGISTRY.find(candidate => candidate.atlas.id === entry.atlas.id);
    assert.deepEqual(registered, entry);
    const clip = entry.atlas.clips[0];
    const first = api.PIT_SPRITE_SHEET_REGISTRY.find(candidate => candidate.fighterId === entry.fighterId &&
      candidate.variantId === entry.variantId && candidate.atlas.clips.some(other => other.id === clip.id && other.facing === clip.facing));
    assert.equal(first.atlas.id, entry.atlas.id, 'older art cannot shadow the reviewed native sequence');
  }
  for (const [fighterId, bank] of banks) {
    assert.deepEqual(bank.failedAtlasIds, []); assert.equal(bank.cancelled, false);
    assert.equal(bank.readyClipCount, selectedRegistry.filter(entry => entry.fighterId === fighterId)
      .reduce((total, entry) => total + entry.atlas.clips.length, 0));
  }
  assert.ok(browser.requested.every(src => selectedRegistry.some(entry => entry.atlas.pages.some(page => page.src === src))));
});

test('eight native idles reach both real cells and loop through the actual top-level fighter renderer', () => {
  for (const entry of definitions.filter(entry => entry.atlas.clips[0].id === 'idle')) {
    const fixture = combatFixture(entry.fighterId, entry.atlas.clips[0].facing);
    assertNativeDraw(fixture, entry, 0);
    for (let tick = 0; tick < 30; tick++) fixture.step();
    assertNativeDraw(fixture, entry, 1);
    for (let tick = 0; tick < 30; tick++) fixture.step();
    assertNativeDraw(fixture, entry, 0);
  }
});

test('neutral Down enters each Wolf native crouch, holds the final drawing and releases to idle without claiming low guard', () => {
  for (const entry of definitions.filter(entry => entry.atlas.clips[0].id === 'crouch')) {
    const facing = entry.atlas.clips[0].facing, fixture = combatFixture('wolf', facing), bank = banks.get('wolf');
    fixture.step({ down: true });
    assert.equal(fixture.fighter.crouching, true); assert.equal(fixture.fighter.guard, null);
    assertNativeDraw(fixture, entry, 0);
    for (let tick = 0; tick < 6; tick++) fixture.step({ down: true });
    assertNativeDraw(fixture, entry, 1);
    for (let tick = 0; tick < 30; tick++) fixture.step({ down: true });
    assertNativeDraw(fixture, entry, 1);
    fixture.step({ down: true, guardLow: true });
    assert.equal(api.describePitHunterSpriteMotion(fixture.fighter, fixture.state.frame, undefined, fixture.state).clipId, 'low-guard');
    const guard = api.resolvePitSpriteSheetAnimation(bank, fixture.fighter, fixture.options());
    assert.ok(!guard || !definitions.some(candidate => candidate.atlas.id === guard.definition.atlas.id),
      'new neutral crouch cannot masquerade as native low-guard coverage');
    fixture.step();
    const idle = api.resolvePitSpriteSheetAnimation(bank, fixture.fighter, fixture.options());
    assert.equal(idle.resolved.frame.clip.id, 'idle'); assert.equal(idle.resolved.frame.clip.facing, facing);
  }
});

test('missing appearance or authored side cannot borrow another costume or synthesize a mirror', async () => {
  for (const entry of definitions.filter(entry => entry.atlas.clips[0].id === 'idle' && entry.atlas.clips[0].facing === 'right')) {
    const fixture = combatFixture(entry.fighterId, 'right'), bank = banks.get(entry.fighterId);
    assert.equal(api.resolvePitSpriteSheetAnimation(bank, { ...fixture.fighter, variantId: undefined }, fixture.options()), null);
    assert.equal(api.resolvePitSpriteSheetAnimation(bank, { ...fixture.fighter, variantId: 'unregistered-appearance' }, fixture.options()), null);
    const oneSideBank = await api.loadPitSpriteSheetAnimations([entry.fighterId], [entry], { variants: [entry.variantId] });
    assert.equal(api.resolvePitSpriteSheetAnimation(oneSideBank, { ...fixture.fighter, facing: -1 }, fixture.options()), null);
    assert.equal(api.drawPitSpriteSheetAnimation({ drawImage() { assert.fail('no opposite PNG exists'); } }, oneSideBank,
      { ...fixture.fighter, facing: -1 }, 440, fixture.options()), false);
  }
});
