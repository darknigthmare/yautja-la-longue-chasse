import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import sharp from 'sharp';

const compiled = await build({ stdin: { contents: 'export { PIT_SPRITE_SHEET_REGISTRY } from "./app/game/pitSpriteSheetRegistry.ts";', resolveDir: fileURLToPath(new URL('..', import.meta.url)) }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { PIT_SPRITE_SHEET_REGISTRY: registry } = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));

test('V53 rejected locomotion originals stay byte-identical outside runtime and preload coverage', async () => {
  const audit = JSON.parse(await readFile(new URL('../docs/art/v53/locomotion-candidate-audit.json', import.meta.url), 'utf8'));
  assert.equal(audit.physicalPng, 4); assert.equal(audit.sourceDrawings, 16);
  assert.equal(audit.acceptedGameplayClips, 0); assert.equal(audit.registeredPages, 0);
  assert.equal(audit.runtimeCorrection.newAnimationClips, 0);
  assert.equal(audit.canonicalFidelityCertified, false);
  const runtimePaths = registry.flatMap(entry => entry.atlas.pages.map(page => page.src));
  for (const file of audit.files) {
    assert.match(file.path, /^art-source\/v53\/pit\/locomotion-candidates\//);
    assert.equal(file.runtimeAccepted, false); assert.equal(file.sourceBytesUnchanged, true);
    const bytes = await readFile(new URL('../' + file.path, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
    assert(!runtimePaths.some(src => src.endsWith(file.path.split('/').at(-1))), 'Rejected gait cannot be preloaded or counted as animation');
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([info.width, info.height], file.size);
    assert.equal(file.cells.length, 4);
    for (const cell of file.cells) {
      const [x, y, width, height] = cell.rect;
      let visible = 0, border = 0, minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
      for (let row = y; row < y + height; row++) for (let col = x; col < x + width; col++) {
        if (data[(row * info.width + col) * 4 + 3] <= 2) continue;
        visible++; minX = Math.min(minX, col); minY = Math.min(minY, row); maxX = Math.max(maxX, col); maxY = Math.max(maxY, row);
        if (row === y || col === x || row === y + height - 1 || col === x + width - 1) border++;
      }
      assert.equal(border, cell.borderPixelsAboveNoiseFloor2); assert.equal(border, 0);
      assert.equal(visible, cell.visiblePixels);
      assert.deepEqual(cell.visibleRect, [minX, minY, maxX - minX + 1, maxY - minY + 1]);
    }
  }
});

test('V53 reviewed fighting shuffles preserve original alpha, exact costumes and both independent native poses', async () => {
  const provenance = JSON.parse(await readFile(new URL('../docs/art/v53/forward-shuffle-provenance.json', import.meta.url), 'utf8'));
  assert.equal(provenance.physicalPng, 2); assert.equal(provenance.logicalPages, 4);
  assert.equal(provenance.orientedGameplayClips, 4); assert.equal(provenance.usedDistinctDrawings, 8);
  assert.equal(provenance.unchangedSourceBytes, true); assert.equal(provenance.canonicalFidelityCertified, false);
  for (const file of provenance.files) {
    const entry = registry.find(item => item.atlas.id === `${file.fighterId}-masked-forward-shuffle-v53`);
    assert(entry); assert.equal(entry.variantId, file.variantId); assert.equal(entry.atlas.variantId, file.variantId);
    const bytes = await readFile(new URL('../' + file.path, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([info.width, info.height], file.size);
    assert.equal(entry.atlas.pages.length, 2); assert.equal(entry.atlas.clips.length, 2);
    assert.equal(new Set(entry.atlas.pages.map(page => page.src)).size, 1);
    const allHashes = new Set();
    for (const clip of entry.atlas.clips) {
      assert.equal(clip.id, 'walk'); assert.equal(clip.loop, true);
      assert.equal(clip.frames.length, 2); assert.equal(clip.ticksPerSecond, 60);
      for (const frame of clip.frames) {
        const page = entry.atlas.pages.find(item => item.id === frame.pageId);
        assert(page.id.endsWith(`-${clip.facing}-v53`));
        assert.deepEqual(page.transparency, { mode: 'alpha', noiseFloor: 2 });
        assert.equal(frame.durationTicks, 10);
        const cell = file.cells.find(item => item.facing === clip.facing && JSON.stringify(item.rect) === JSON.stringify(frame.rect));
        assert(cell); assert.deepEqual(frame.pivot, cell.pivot);
        const [x, y, width, height] = frame.rect, canonical = Buffer.alloc(width * height * 4);
        let visible = 0, border = 0;
        for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
          const offset = ((y + row) * info.width + x + col) * 4;
          if (data[offset + 3] <= 2) continue;
          visible++; data.copy(canonical, (row * width + col) * 4, offset, offset + 4);
          if (!row || !col || row === height - 1 || col === width - 1) border++;
        }
        assert.equal(border, 0); assert.equal(visible, cell.visiblePixels);
        allHashes.add(createHash('sha256').update(canonical).digest('hex'));
        assert.equal(entry.pageBodyHeightPx[page.id], file.measuredBodyReferenceByPage[page.id]);
      }
      const native = file.cells.filter(cell => cell.facing === clip.facing);
      assert(native[0].feetSpan[1] - native[0].feetSpan[0] > (native[1].feetSpan[1] - native[1].feetSpan[0]) * 1.3,
        'Wide and gathered support stances must visibly differ, not only their pixel hashes');
    }
    assert.equal(allHashes.size, 4);
  }
});
