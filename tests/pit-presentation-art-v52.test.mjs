import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const compiled = await build({ stdin: { contents: 'export {PIT_SPRITE_SHEET_REGISTRY} from "./app/game/pitSpriteSheetRegistry.ts"; export {processHunterSpriteTransparency,validateHunterSpriteAtlas} from "./app/game/hunterSpriteAtlas.ts";', resolveDir: root }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { PIT_SPRITE_SHEET_REGISTRY, processHunterSpriteTransparency, validateHunterSpriteAtlas } = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const appearances = [['city-hunter', 'city-hunter-avec-casque-12136078fe', 14], ['scar', 'scar-avec-casque-6a0a69930d', 12]];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

for (const [fighterId, variantId, drawings] of appearances) test(`${fighterId} V52 preserves reviewed original PNGs and never registers the contaminated first columns`, async () => {
  const definition = PIT_SPRITE_SHEET_REGISTRY.find(item => item.atlas.id === `${fighterId}-masked-round-presentation-v52`);
  const provenance = JSON.parse(await readFile(new URL(`../docs/art/v52/${fighterId}-round-presentation-provenance.json`, import.meta.url), 'utf8'));
  assert.equal(definition.fighterId, fighterId); assert.equal(definition.variantId, variantId);
  assert.equal(definition.atlas.variantId, variantId); assert.equal(validateHunterSpriteAtlas(definition.atlas).valid, true);
  assert.equal(provenance.fighterId, fighterId); assert.equal(provenance.variantId, variantId);
  assert.equal(provenance.unchangedSourceBytes, true); assert.equal(provenance.canonicalFidelityCertified, false);
  assert.equal(provenance.physicalPng, 3); assert.equal(provenance.logicalPages, 6);
  assert.equal(provenance.usedDistinctDrawings, drawings); assert.equal(provenance.clipFrameReferences, 18);
  const refBytes = await readFile(new URL('../public' + provenance.reference, import.meta.url));
  assert.equal(sha(refBytes), provenance.referenceSha256, 'The supplied costume reference stays unchanged');
  const sources = new Map();
  for (const file of provenance.files) {
    const bytes = await readFile(new URL('../' + file.path, import.meta.url));
    assert.equal(sha(bytes), file.sha256); assert.equal(file.sourceBytesUnchanged, true);
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([info.width, info.height], file.size);
    const processed = processHunterSpriteTransparency(new Uint8ClampedArray(data), info.width, info.height, { mode: 'alpha', noiseFloor: 2 });
    assert.equal(processed.keyedPixels, 0); assert.equal(processed.fringePixels, 0);
    sources.set('/' + file.path.replace(/^public\//, ''), { ...info, pixels: processed.pixels });
  }
  const frameHashes = new Set(), registeredKeys = new Set();
  for (const clip of definition.atlas.clips) {
    assert.match(clip.id, /^pit\.presentation\.(intro|victory|defeat)$/);
    assert.equal(clip.loop, false); assert.equal(clip.ticksPerSecond, 60); assert.equal(clip.frames.length, 3);
    const hashes = new Set();
    for (const frame of clip.frames) {
      assert.equal(frame.durationTicks, clip.id.endsWith('.intro') ? 24 : 40);
      const page = definition.atlas.pages.find(item => item.id === frame.pageId), source = sources.get(page.src);
      assert(page.id.includes(`-${clip.facing}-v52`), 'Opposite facing drawings may not be borrowed');
      assert.deepEqual(page.transparency, { mode: 'alpha', noiseFloor: 2 });
      assert(source); assert.deepEqual([page.width, page.height], [source.width, source.height]);
      const key = JSON.stringify([page.id, frame.rect]); registeredKeys.add(key);
      const measure = provenance.measurements.find(item => JSON.stringify([item.pageId, item.rect]) === key);
      const pivot = provenance.framePivots.find(item => JSON.stringify([item.pageId, item.rect]) === key);
      assert(measure); assert.deepEqual(pivot.pivot, frame.pivot);
      const [x, y, width, height] = frame.rect;
      assert(frame.pivot[0] > 0 && frame.pivot[0] < width && frame.pivot[1] > 0 && frame.pivot[1] < height);
      if (fighterId === 'scar' || !page.id.includes('-intro-')) assert(x >= 512, 'Rejected first-column source cells must remain unused');
      const canonical = Buffer.alloc(width * height * 4);
      let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1, visible = 0;
      for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
        const offset = ((y + row) * source.width + x + col) * 4, alpha = source.pixels[offset + 3];
        if (row === 0 || col === 0 || row === height - 1 || col === width - 1) assert.equal(alpha, 0, page.id + ' must have an empty cell border');
        if (!alpha) continue;
        visible++; minX = Math.min(minX, x + col); minY = Math.min(minY, y + row); maxX = Math.max(maxX, x + col); maxY = Math.max(maxY, y + row);
        for (let channel = 0; channel < 4; channel++) canonical[(row * width + col) * 4 + channel] = source.pixels[offset + channel];
      }
      assert(visible > 1000 && visible < width * height);
      assert.deepEqual(measure.visibleRect, [minX, minY, maxX - minX + 1, maxY - minY + 1]);
      const hash = sha(canonical); hashes.add(hash); frameHashes.add(hash);
    }
    assert.equal(hashes.size, 3, 'Each ceremony contains three distinct authored drawings');
  }
  assert.equal(definition.atlas.clips.length, 6);
  assert.equal(frameHashes.size, drawings); assert.equal(registeredKeys.size, drawings);
  assert.equal(provenance.measurements.length, drawings);
  assert.equal(new Set(definition.atlas.pages.map(page => page.src)).size, 3);
  assert.equal(PIT_SPRITE_SHEET_REGISTRY.filter(item => item.variantId === variantId && item.atlas.id.endsWith('-v52')).length, 1,
    'The historical V52 lot remains presentation-only, without borrowing legacy combat animations');
});
