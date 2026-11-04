import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Format/size normalization only; each object was generated independently.
// The source alpha is preserved, never replaced by a color-key or repainted.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceManifest = 'art-source/clan-ship-props-v1/generation.json';
const generation = JSON.parse(await fs.readFile(path.join(root, sourceManifest), 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

function alphaReport(data, info, threshold) {
  assert.equal(info.channels, 4);
  let left = info.width, top = info.height, right = -1, bottom = -1;
  let transparent = 0, visible = 0, edgeVisible = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * 4 + 3];
    if (alpha === 0) transparent++;
    if (alpha > threshold) {
      visible++; left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
      if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) edgeVisible++;
    }
  }
  assert.ok(visible > info.width * info.height * 0.1, 'empty or undersized sprite');
  assert.ok(transparent > info.width * info.height * 0.1, 'opaque or unusable background');
  assert.equal(edgeVisible, 0, 'visible sprite touches bitmap border');
  return { alphaBounds: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 },
    visiblePixels: visible, transparentPixels: transparent, edgeVisiblePixels: edgeVisible };
}

const assets = {};
for (const entry of generation.assets) {
  assert.match(entry.id, /^[a-z]+(?:-[a-z]+)*$/);
  assert.equal(entry.sourceFile, `art-source/clan-ship-props-v1/${entry.id}-v1.png`);
  assert.equal(entry.runtimeFile, `public/game/clan-ship/props/${entry.id}-v1.webp`);
  const original = await fs.readFile(path.join(root, entry.sourceFile));
  const source = await sharp(original).metadata();
  assert.ok(source.hasAlpha, `${entry.id}: alpha channel is required`);
  const { maxEdge, quality, alphaQuality, alphaThreshold } = generation.runtime;
  const output = await sharp(original).rotate().resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
    .toColorspace('srgb').webp({ quality, alphaQuality, effort: 6 }).toBuffer();
  const meta = await sharp(output).metadata();
  assert.ok(meta.hasAlpha);
  const { data, info } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = alphaReport(data, info, alphaThreshold);
  const file = path.join(root, entry.runtimeFile);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, output);
  assets[entry.id] = {
    src: '/' + entry.runtimeFile.replace(/^public\//, ''),
    sourceWidth: meta.width, sourceHeight: meta.height,
    alphaBounds: alpha.alphaBounds,
    pivot: { x: alpha.alphaBounds.x + alpha.alphaBounds.width / 2, y: alpha.alphaBounds.y + alpha.alphaBounds.height },
    originalFile: entry.sourceFile, originalWidth: source.width, originalHeight: source.height,
    sourceSha256: digest(original), sha256: digest(output), bytes: output.length,
    format: meta.format, alpha: true, alphaThreshold,
    transparentPixels: alpha.transparentPixels, visiblePixels: alpha.visiblePixels,
    edgeVisiblePixels: alpha.edgeVisiblePixels, layer: 'fixture', humanArtValidation: false,
  };
}
const result = { version: 1, createdOn: generation.createdOn, sourceManifest,
  generationTool: generation.generationTool, referenceStatus: generation.referenceStatus,
  assets, totalBytes: Object.values(assets).reduce((total, asset) => total + asset.bytes, 0) };
await fs.writeFile(path.join(root, 'public/game/clan-ship/props/manifest.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ assets: Object.keys(assets).length, bytes: result.totalBytes,
  entries: Object.entries(assets).map(([id, a]) => ({ id, width: a.sourceWidth, height: a.sourceHeight, alphaBounds: a.alphaBounds, bytes: a.bytes })) }, null, 2));
