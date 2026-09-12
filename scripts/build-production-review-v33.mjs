import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { build } from 'esbuild';
import assert from 'node:assert/strict';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const entries = [];
const arenas = read('art-source/v33/pit-arenas/production-manifest.json');
for (const stage of arenas.stages) for (const plane of stage.planes) for (const asset of plane.assets) {
  const ready = asset.frames.filter(frame => frame.generation && ['reviewed', 'integrated'].includes(frame.status));
  for (const [index, frame] of ready.entries()) entries.push({
    id: stage.catalogueId + '-' + asset.id + '-' + index, category: 'arena',
    name: stage.name + ' · ' + plane.id + ' · ' + asset.role + (ready.length > 1 ? ' · dessin ' + (index + 1) : ''),
    src: frame.path, status: frame.status, width: frame.generation.width, height: frame.generation.height,
    sha256: frame.generation.sha256, transparency: { mode: 'alpha' },
    notes: ['Image indépendante. Plan ' + plane.id + ', parallaxe ' + asset.parallax + '.', 'Ne certifie pas à elle seule la jouabilité du stage.'], frames: [],
  });
}
const berserkerPath = 'art-source/v33/pit/berserker/berserker-production-provenance-v33.json';
if (fs.existsSync(berserkerPath)) for (const asset of read(berserkerPath).assets) entries.push({
  id: 'berserker-' + asset.id, category: 'hunter', name: 'Berserker · ' + asset.label,
  src: asset.publicPath, status: asset.status, width: asset.width, height: asset.height,
  sha256: asset.sha256, transparency: asset.transparency, notes: asset.notes,
  // Rejected sheets stay visible as complete sheets, never as a misleading working loop.
  frames: asset.status === 'validated' ? asset.reviewFrames.map(frame => ({ ...frame, phase: frame.clipId })) : asset.status === 'rejected' ? [] : (asset.cells ?? []).filter(cell => cell.gridBorderPixels === 0).map(cell => ({
    rect: cell.alpha16Bounds, facing: cell.facing, phase: cell.phase,
    pivot: [cell.alpha16Bounds[2] / 2, cell.alpha16Bounds[3]], durationTicks: 9,
  })),
});
const vehicles = read('art-source/v33/vehicles/moto-antigrav-chasse-provenance-v33.json');
for (const asset of vehicles.assets.filter(asset => asset.public)) entries.push({
  id: 'moto-' + asset.id, category: 'vehicle', name: 'Moto antigrav · ' + asset.id,
  src: asset.publicPath, status: asset.status, width: asset.width, height: asset.height, sha256: asset.sha256,
  transparency: asset.config, notes: asset.notes, frames: [],
});
const repair = read('art-source/v33/vehicles/moto-stabilizers-repair-v33.json');
entries.push({ id: repair.asset, category: 'vehicle', name: 'Moto antigrav · stabilisateurs corrigés',
  src: repair.publicPath, status: repair.status, width: repair.width, height: repair.height,
  sha256: repair.sha256, transparency: repair.transparency,
  notes: ['Interprétation originale du jeu, pas une réplique du film.', 'Lecture de revue seulement : aucun véhicule pilotable ajouté.', '81 pixels de frange magenta résiduels mesurés. Assemblage mécanique encore à valider.'],
  frames: repair.cells.map(cell => ({ ...cell, pivot: [cell.rect[2] / 2, (cell.facing === 'left' ? 811 : 335) - cell.rect[1]] })),
});
const propulsion = read('art-source/v33/vehicles/moto-propulsion-fx-provenance-v33.json');
entries.push({ id: propulsion.id, category: 'vehicle', name: 'Moto antigrav · propulsion indépendante',
  src: propulsion.publicPath, status: propulsion.status, width: propulsion.width, height: propulsion.height,
  sha256: propulsion.sha256, transparency: propulsion.transparency, notes: propulsion.notes,
  previewAnchor: [600, 400], frames: propulsion.cells });
assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
for (const entry of entries) {
  assert(entry.src.startsWith('/game/'));
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join('public', entry.src))).digest('hex'), entry.sha256, 'Changed review source: ' + entry.src);
  for (const frame of entry.frames) {
    assert.equal(frame.rect.length, 4);
    assert(frame.rect.every(Number.isFinite));
    assert(frame.rect[0] >= 0 && frame.rect[1] >= 0 && frame.rect[0] + frame.rect[2] <= entry.width && frame.rect[1] + frame.rect[3] <= entry.height, 'Invalid review rectangle: ' + entry.id);
  }
}
const out = 'public/game/assets/v33/production-review';fs.mkdirSync(out, { recursive: true });
const manifest = { schemaVersion: 1, title: 'Atelier OpenAI V33', runtimeCompletionNotImplied: true, entries };
fs.writeFileSync(out + '/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
fs.copyFileSync('scripts/production-review-v33.html', out + '/index.html');
await build({ entryPoints: ['scripts/production-review-v33.client.ts'], outfile: out + '/review.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2020', minify: true, logLevel: 'silent' });
console.log(JSON.stringify({ entries: entries.length, arena: entries.filter(entry => entry.category === 'arena').length, hunter: entries.filter(entry => entry.category === 'hunter').length, vehicle: entries.filter(entry => entry.category === 'vehicle').length }));
