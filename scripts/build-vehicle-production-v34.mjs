import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const catalogue = read('docs/v33-vehicles-production-manifest.json');
catalogue.id = 'yautja-v34-vehicles-production';catalogue.updatedAt = '2026-09-13';
catalogue.status = 'in-production';catalogue.scope = '50 requested vehicles/mounts, source images and shared effects audited separately. No complete or rideable vehicle is implied.';
delete catalogue.firstOpenAIProduction;
const moto = catalogue.entries.find(entry => entry.id === 'moto-antigrav-de-chasse');assert(moto);
for (const file of ['art-source/v33/vehicles/moto-stabilizers-repair-v33.json', 'art-source/v33/vehicles/moto-propulsion-fx-provenance-v33.json']) {
  const asset = read(file);
  if (!moto.assets.some(existing => existing.sha256 === asset.sha256)) moto.assets.push({
    id: asset.id ?? asset.asset, status: asset.status, sourcePath: asset.sourcePath, publicPath: asset.publicPath,
    sha256: asset.sha256, reviewFrames: asset.cells ?? [], runtimeClips: [],
  });
}
const sharedEffects = [];
const root = 'art-source/v34/vehicles';
for (const folder of fs.readdirSync(root, { withFileTypes: true }).filter(item => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  const file = path.join(root, folder.name, 'provenance.json');if (!fs.existsSync(file)) continue;
  const manifest = read(file);
  if (manifest.catalogueVehicle === false || manifest.libraryType === 'shared-vehicle-effects') {
    sharedEffects.push({ id: manifest.vehicleId, name: manifest.name, assets: manifest.assets });continue;
  }
  const catalogueId = manifest.vehicleId === 'kha-rha' ? 'kharha' : manifest.vehicleId;
  const entry = catalogue.entries.find(item => item.id === catalogueId);assert(entry, 'Unknown requested vehicle: ' + manifest.vehicleId);
  entry.assets = manifest.assets;entry.productionLore = manifest.lore;
}

let generatedAssets = 0, acceptedClips = 0, rejectedSources = 0, publicImages = 0;
const seen = new Set();
function auditAsset(asset) {
  assert(asset.sourcePath && asset.sha256 && !seen.has(asset.sourcePath), 'Duplicate or incomplete source receipt');seen.add(asset.sourcePath);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(asset.sourcePath)).digest('hex'), asset.sha256);
  if (asset.publicPath) {
    assert(asset.publicPath.startsWith('/game/') && !asset.publicPath.includes('..'));
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join('public', asset.publicPath))).digest('hex'), asset.sha256);publicImages++;
  }
  if (asset.status === 'rejected') rejectedSources++;
}
for (const entry of catalogue.entries) {
  entry.assets.forEach(auditAsset);entry.generatedAssetCount = entry.assets.length;
  entry.acceptedClipCount = entry.assets.reduce((sum, asset) => sum + (asset.runtimeClips?.length ?? 0), 0);
  entry.status = entry.assets.length ? 'authored-review' : 'planned';
  entry.runtimeStatus = 'planned';entry.runtimeActionsAccepted = [];
  entry.requestedActionsRemainUnvalidated = [...entry.requestedActions];
  entry.animationPlan = { status: entry.assets.length ? 'authored-review' : 'planned',
    sourceSpecRecovered: false, completeMoveset: false, acceptedClipCount: entry.acceptedClipCount,
    authoredFacings: [...new Set(entry.assets.flatMap(asset => (asset.reviewFrames ?? asset.cells ?? []).map(frame => frame.facing)).filter(Boolean))],
    note: 'Source sheets and review frames are not accepted runtime coverage; the recovered conversation gives no fixed sheet count per vehicle.' };
  generatedAssets += entry.assets.length;acceptedClips += entry.acceptedClipCount;
}
for (const library of sharedEffects) library.assets.forEach(auditAsset);
const sharedCount = sharedEffects.reduce((sum, library) => sum + library.assets.length, 0);
catalogue.sharedEffectLibraries = sharedEffects;
catalogue.totals = { entries: catalogue.entries.length, clanUtility: 24, badBloodEnforcer: 10, biologicalMounts: 16,
  vehicleEntriesWithArt: catalogue.entries.filter(entry => entry.assets.length).length,
  vehicleSourceImages: generatedAssets, sharedEffectSourceImages: sharedCount, generatedSourceImagesTotal: generatedAssets + sharedCount,
  publicReviewImages: publicImages, rejectedSourceImages: rejectedSources, acceptedAnimationClips: acceptedClips,
  integratedRideableVehicles: 0, fullyProducedVehicles: 0 };
assert.equal(catalogue.entries.length, 50);
const output = 'docs/v34-vehicles-production-manifest.json';fs.writeFileSync(output, JSON.stringify(catalogue, null, 2) + '\n');
console.log(JSON.stringify(catalogue.totals));
