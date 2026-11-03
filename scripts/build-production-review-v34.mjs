import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { productionCoverage } from './production-coverage-v34.mjs';
import { appendArenaReviewEntries } from './lib/production-review-arenas-v43.mjs';
import { appendUserSpriteReferences } from './lib/production-review-user-sprites-v43.mjs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
// Preserve the published V33 archive; append only new, individually recorded V34 assets.
const entries = read('public/game/assets/v33/production-review/manifest.json').entries;
const knownSources = new Set(entries.map(entry => entry.src));
const arenas = read('art-source/v33/pit-arenas/production-manifest.json');
const screenDefinitions = read('app/game/systems/pitScreenArenasV43.generated.json').arenas;
const imported = [];
const receiptRoot = fs.realpathSync('art-source/v43/pit-arenas');
for (const definition of screenDefinitions) {
  assert(/^arena-1(?:0[1-9]|[12][0-9]|3[0-6])-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(definition.id));
  const file = path.join('art-source/v43/pit-arenas', definition.id, 'receipt-p0-depth.json');
  if (!fs.existsSync(file)) continue;
  assert.equal(fs.realpathSync(file).toLowerCase(), path.resolve(receiptRoot, definition.id, 'receipt-p0-depth.json').toLowerCase(), 'Receipt remaps its owned path');
  const receipt = read(file);
  if (receipt.accepted && !receipt.excludedFromCoverage) imported.push(receipt);
}
appendArenaReviewEntries(entries, arenas.stages, screenDefinitions, imported);
for (const entry of entries) knownSources.add(entry.src);

function provenanceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => item.isDirectory() ? provenanceFiles(path.join(directory, item.name))
    : /provenance.*\.json$/.test(item.name) ? [path.join(directory, item.name)] : []);
}
for (const [category, directory] of [['hunter', 'art-source/v34/pit'], ['vehicle', 'art-source/v34/vehicles'], ['hunter', 'docs/art/v37'], ['hunter', 'docs/art/v38'], ['hunter', 'docs/art/v39'], ['hunter', 'docs/art/v40'], ['hunter', 'docs/art/v41']]) {
  for (const file of provenanceFiles(directory).sort()) {
    const manifest = read(file);
    for (const asset of manifest.assets ?? []) {
      if (!asset.publicPath) continue;
      if (knownSources.has(asset.publicPath)) {
        // An explicit later review may qualify existing pixels without counting a new source.
        if (asset.replacesReview) {
          const existing = entries.find(entry => entry.src === asset.publicPath);
          assert(existing && existing.sha256 === asset.sha256 && existing.width === asset.width && existing.height === asset.height, 'A review override must preserve its source');
          assert(asset.status === 'integrated' && asset.reviewFrames?.length > 0, 'A review override needs accepted frames');
          Object.assign(existing, { status: asset.status, frames: asset.reviewFrames, transparency: asset.transparency, notes: asset.notes ?? [], reviewedIn: manifest.version });
        }
        continue;
      }
      const owner = manifest.fighterId ?? manifest.hunterId ?? manifest.vehicleId ?? path.basename(path.dirname(file));
      const label = manifest.name ?? manifest.fighterName ?? manifest.vehicleName ?? owner;
      const explicitFrames = asset.reviewFrames ?? [];
      const safeGridFrames = (asset.cells ?? []).filter(cell => cell.gridBorderPixels === 0 && cell.alpha16Bounds).map(cell => ({
        rect: cell.alpha16Bounds, pivot: [cell.alpha16Bounds[2] / 2, cell.alpha16Bounds[3]], facing: cell.facing, phase: cell.phase, durationTicks: 9,
      }));
      entries.push({ id: 'v34-' + owner + '-' + asset.id, category, name: label + ' · ' + (asset.label ?? asset.actionId ?? asset.id),
        src: asset.publicPath, status: asset.status, width: asset.width, height: asset.height, sha256: asset.sha256,
        transparency: asset.transparency, notes: asset.notes ?? [], ...(asset.previewAnchor ? { previewAnchor: asset.previewAnchor } : {}),
        frames: asset.status === 'rejected' ? [] : (explicitFrames.length ? explicitFrames.map(frame => ({ ...frame, phase: frame.phase ?? frame.clipId })) : safeGridFrames) });
      knownSources.add(asset.publicPath);
    }
  }
}

appendUserSpriteReferences(entries, read('docs/v43-user-sprite-intake.json'));

assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length, 'Duplicate review id');
for (const entry of entries) {
  assert(entry.src.startsWith('/game/') && !entry.src.includes('..'));
  assert(['integrated', 'reviewed', 'validated', 'authored-review', 'rejected'].includes(entry.status), 'Unknown status: ' + entry.id);
  assert(entry.transparency && ['alpha', 'color-key'].includes(entry.transparency.mode));
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join('public', entry.src))).digest('hex'), entry.sha256, 'Changed source: ' + entry.src);
  assert(entry.width > 0 && entry.height > 0);
  if (entry.status === 'rejected') assert.equal(entry.frames.length, 0);
  for (const frame of entry.frames) {
    assert.equal(frame.rect.length, 4);assert(frame.rect.every(Number.isFinite));
    const [x, y, w, h] = frame.rect;
    assert(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= entry.width && y + h <= entry.height, 'Invalid crop: ' + entry.id);
    assert(frame.pivot.length === 2 && frame.pivot.every(Number.isFinite));
    assert(['left', 'right'].includes(frame.facing));
  }
}
const totals = Object.fromEntries(['arena', 'hunter', 'vehicle', 'reference'].map(category => [category, entries.filter(entry => entry.category === category).length]));
const manifest = { schemaVersion: 1, title: 'Atelier OpenAI · production', catalogueVersion: 'V43', runtimeCompletionNotImplied: true, coverage: productionCoverage(entries, arenas.stages), totals, entries };
const out = 'public/game/assets/v34/production-review';fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(out + '/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
fs.copyFileSync('scripts/production-review-v34.html', out + '/index.html');
await build({ entryPoints: ['scripts/production-review-v34.client.ts'], outfile: out + '/review.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2020', minify: true, logLevel: 'silent' });
console.log(JSON.stringify({ entries: entries.length, ...totals }));
