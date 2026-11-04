import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Deterministic normalization only. All artistic pixels originate in the seven
// imagegen originals; this script does not synthesize or repaint an environment.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'art-source/clan-ship-v1/generation.json'), 'utf8'));
const { width, height, quality, fit } = manifest.runtime;
const hash = data => createHash('sha256').update(data).digest('hex');
const rows = [];
for (const entry of manifest.assets) {
  assert.match(entry.id, /^[a-z]+$/);
  assert.equal(entry.sourceFile, `art-source/clan-ship-v1/${entry.id}-v1.png`);
  assert.equal(entry.runtimeFile, `public/game/clan-ship/interiors/${entry.id}-v1.webp`);
  const input = await fs.readFile(path.join(root, entry.sourceFile));
  const source = await sharp(input).metadata();
  assert.ok(source.width >= width && source.height >= height, `${entry.id}: source too small`);
  const result = await sharp(input).rotate().resize(width, height, { fit, position: 'centre' })
    .toColorspace('srgb').webp({ quality, effort: 6 }).toBuffer();
  const destination = path.join(root, entry.runtimeFile);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, result);
  const meta = await sharp(result).metadata();
  assert.equal(meta.width, width); assert.equal(meta.height, height);
  assert.equal(meta.hasAlpha, false);
  rows.push({ id: entry.id, url: '/' + entry.runtimeFile.replace(/^public\//, ''),
    sourceFile: entry.sourceFile, sourceWidth: source.width, sourceHeight: source.height,
    sourceSha256: hash(input), width, height, format: meta.format, bytes: result.length,
    sha256: hash(result), alpha: meta.hasAlpha, pivot: { x: 0, y: 0 }, layer: 'background', collision: false });
}
const output = { version: 1, createdOn: manifest.createdOn, generationTool: manifest.generationTool,
  sourceManifest: 'art-source/clan-ship-v1/generation.json',
  artDirection: manifest.artDirection, referenceStatus: manifest.referenceStatus,
  runtime: manifest.runtime, assets: rows, totalBytes: rows.reduce((total, row) => total + row.bytes, 0) };
await fs.writeFile(path.join(root, 'public/game/clan-ship/manifest.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ assets: rows.length, width, height, bytes: output.totalBytes, rows }, null, 2));
