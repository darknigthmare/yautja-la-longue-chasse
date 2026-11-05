import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Read-only image audit. --write updates JSON metadata, never the PNGs.
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const sourceManifest = 'production/clan-ship-20261105-incidents/generation.json';
const generationBytes = await fs.readFile(path.join(root, sourceManifest));
const generation = JSON.parse(generationBytes.toString('utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const alphaThreshold = 16;
const assets = {};
const report = [];

for (const entry of generation.assets) {
  assert.match(entry.id, /^[a-z]+(?:-[a-z]+)*$/);
  assert.equal(entry.destination, `public/game/clan-ship/incidents/${entry.id}.png`);
  const file = path.join(root, entry.destination);
  const bytes = await fs.readFile(file);
  const meta = await sharp(bytes).metadata();
  assert.equal(meta.format, 'png', `${entry.id}: preserve the original PNG`);
  assert.ok(meta.hasAlpha, `${entry.id}: alpha channel is required`);
  const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4);
  let left = info.width, top = info.height, right = -1, bottom = -1;
  let transparent = 0, visible = 0, edgeVisible = 0, minimum = 255, maximum = 0, opaque = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * 4 + 3];
    minimum = Math.min(minimum, alpha); maximum = Math.max(maximum, alpha);
    if (alpha === 0) transparent++;
    if (alpha === 255) opaque++;
    if (alpha > alphaThreshold) {
      visible++; left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
      if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) edgeVisible++;
    }
  }
  assert.ok(visible > info.width * info.height * 0.1, `${entry.id}: visible silhouette required`);
  assert.ok(transparent > info.width * info.height * 0.1, `${entry.id}: transparent surround required`);
  assert.equal(edgeVisible, 0, `${entry.id}: silhouette may not touch bitmap edge`);
  const sha256 = digest(bytes);
  assert.equal(digest(await fs.readFile(file)), sha256, `${entry.id}: file must remain byte-identical`);
  const alphaBounds = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
  assets[entry.id] = {
    src: '/' + entry.destination.replace(/^public\//, ''),
    sourceWidth: info.width, sourceHeight: info.height, alphaBounds,
    pivot: { x: alphaBounds.x + alphaBounds.width / 2, y: alphaBounds.y + alphaBounds.height },
    originalFile: entry.destination, originalWidth: info.width, originalHeight: info.height,
    sourceSha256: sha256, sha256, bytes: bytes.length, format: 'png', alpha: true,
    alphaThreshold, transparentPixels: transparent, visiblePixels: visible,
    edgeVisiblePixels: edgeVisible, layer: 'incident-prop', humanArtValidation: false,
  };
  report.push({ id: entry.id, path: entry.destination, sha256, bytes: bytes.length,
    sourceWidth: info.width, sourceHeight: info.height, alphaBounds,
    alphaRange: [minimum, maximum], transparentPixels: transparent,
    fullyOpaquePixels: opaque, partiallyTransparentPixels: info.width * info.height - transparent - opaque,
    visiblePixels: visible, edgeVisiblePixels: edgeVisible, unchangedAfterReading: true });
}

const manifest = { version: 1, createdOn: generation.createdOn, sourceManifest,
  generationTool: generation.generationTool, referenceStatus: generation.referenceStatus,
  assets, totalBytes: report.reduce((total, asset) => total + asset.bytes, 0) };
const audit = { schemaVersion: 1, createdOn: generation.createdOn, status: 'passed',
  scope: 'Technical read-only audit of the three newly generated individual PNG assets. No raster modification.',
  sourceManifest, generationSha256: digest(generationBytes),
  sourceFingerprint: digest(JSON.stringify({ generationSha256: digest(generationBytes), assets: report.map(({ id, sha256 }) => ({ id, sha256 })) })),
  method: { decoder: 'sharp', decoderVersion: sharp.versions.sharp, alphaThreshold,
    visibleDefinition: 'alpha > 16', transparentDefinition: 'alpha = 0',
    anchor: 'Horizontal center of visible alpha bounds, bottom edge of visible alpha bounds.',
    rasterEdits: 'None. Original generated PNG bytes are the runtime files.' },
  summary: { files: report.length, passed: report.length, failed: 0, bytes: manifest.totalBytes,
    alphaChannels: report.length, visibleSilhouettes: report.length,
    transparentSurrounds: report.length, silhouettesClearOfEdges: report.length },
  limitations: [
    'This technical audit does not establish in-game collision, interaction, scale, accessibility or mobile readability.',
    'Single objects, whole silhouettes, no text and material-family cohesion were inspected in the native generation output.',
    'Human artistic approval and canonical 1:1 validation remain pending. These are original gameplay adaptations.'
  ],
  assets: report };

for (const [filename, value] of [
  [path.join(root, 'public/game/clan-ship/incidents/manifest.json'), manifest],
  [path.join(directory, 'asset-audit.json'), audit],
]) {
  const serialized = JSON.stringify(value, null, 2) + '\n';
  if (process.argv.includes('--write')) await fs.writeFile(filename, serialized);
  else assert.equal(await fs.readFile(filename, 'utf8'), serialized, `Stale metadata: ${path.relative(root, filename)}`);
}
console.log(JSON.stringify({ mode: process.argv.includes('--write') ? 'write-metadata' : 'check',
  files: report.length, bytes: manifest.totalBytes, sourceFingerprint: audit.sourceFingerprint,
  assets: report.map(({ id, sourceWidth, sourceHeight, sha256 }) => ({ id, sourceWidth, sourceHeight, sha256 })) }, null, 2));
