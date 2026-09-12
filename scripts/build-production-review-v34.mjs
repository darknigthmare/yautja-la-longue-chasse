import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { productionCoverage } from './production-coverage-v34.mjs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
// Preserve the published V33 archive; append only new, individually recorded V34 assets.
const entries = read('public/game/assets/v33/production-review/manifest.json').entries;
const knownSources = new Set(entries.map(entry => entry.src));
const arenas = read('art-source/v33/pit-arenas/production-manifest.json');
for (const stage of arenas.stages) for (const plane of stage.planes) for (const asset of plane.assets) {
  for (const [index, frame] of asset.frames.entries()) {
    if (!frame.generation || !['reviewed', 'integrated'].includes(frame.status) || knownSources.has(frame.path)) continue;
    entries.push({ id: 'v34-' + stage.catalogueId + '-' + asset.id + '-' + index, category: 'arena',
      name: stage.name + ' · ' + plane.id + ' · ' + asset.role, src: frame.path, status: frame.status,
      width: frame.generation.width, height: frame.generation.height, sha256: frame.generation.sha256,
      transparency: { mode: 'alpha' }, notes: ['Image indépendante · plan ' + plane.id + ' · parallaxe ' + asset.parallax + '.',
        'Proposition originale de production issue du catalogue local ; la discussion dédiée aux 100 arènes reste à confirmer.'], frames: [] });
    knownSources.add(frame.path);
  }
}

function provenanceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => item.isDirectory() ? provenanceFiles(path.join(directory, item.name))
    : /provenance.*\.json$/.test(item.name) ? [path.join(directory, item.name)] : []);
}
for (const [category, directory] of [['hunter', 'art-source/v34/pit'], ['vehicle', 'art-source/v34/vehicles']]) {
  for (const file of provenanceFiles(directory).sort()) {
    const manifest = read(file);
    for (const asset of manifest.assets ?? []) {
      if (!asset.publicPath || knownSources.has(asset.publicPath)) continue;
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
const totals = Object.fromEntries(['arena', 'hunter', 'vehicle'].map(category => [category, entries.filter(entry => entry.category === category).length]));
const manifest = { schemaVersion: 1, title: 'Atelier OpenAI V34', runtimeCompletionNotImplied: true, coverage: productionCoverage(entries, arenas.stages), totals, entries };
const out = 'public/game/assets/v34/production-review';fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(out + '/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
fs.copyFileSync('scripts/production-review-v34.html', out + '/index.html');
await build({ entryPoints: ['scripts/production-review-v34.client.ts'], outfile: out + '/review.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2020', minify: true, logLevel: 'silent' });
console.log(JSON.stringify({ entries: entries.length, ...totals }));
