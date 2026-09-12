import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// Counts describe existing evidence, never an inferred percentage of a finished game.
export function productionCoverage(entries, stages) {
  const registrySource = fs.readFileSync('app/game/pitSpriteSheetRegistry.ts', 'utf8');
  const start = registrySource.indexOf('= [');assert(start >= 0);
  const registry = JSON.parse(registrySource.slice(start + 2).trim().replace(/;$/, ''));
  const fighters = registry.filter(fighter => fighter.atlas.clips.some(clip => clip.status === 'validated'));
  const catalogue = JSON.parse(fs.readFileSync('docs/v33-vehicles-production-manifest.json', 'utf8'));
  const vehicleIds = new Set(catalogue.entries.filter(vehicle => vehicle.assets.length).map(vehicle => vehicle.id));
  const publicDraftIds = new Set(vehicleIds);
  let acceptedVehicleClips = 0;
  const root = 'art-source/v34/vehicles';
  if (fs.existsSync(root)) for (const folder of fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
    const file = path.join(root, folder.name, 'provenance.json');if (!fs.existsSync(file)) continue;
    const production = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (production.catalogueVehicle === false || production.libraryType === 'shared-vehicle-effects') continue;
    const id = production.vehicleId === 'kha-rha' ? 'kharha' : production.vehicleId;
    assert(catalogue.entries.some(entry => entry.id === id), 'Unknown production vehicle: ' + id);
    if (production.assets.length) vehicleIds.add(id);
    if (production.assets.some(asset => asset.status !== 'rejected')) publicDraftIds.add(id);
    acceptedVehicleClips += production.assets.reduce((sum, asset) => sum + (asset.runtimeClips?.length ?? 0), 0);
  }
  const reviewedKit = stage => stage.planes.length === 6 && stage.planes.every(plane =>
    plane.assets.some(asset => asset.requiredForRuntime) && plane.assets.filter(asset => asset.requiredForRuntime).every(asset =>
      asset.frames.some(frame => frame.generation && ['reviewed', 'integrated'].includes(frame.status))));
  return {
    completeGameImplied: false,
    arenas: { requested: stages.length, playable: stages.filter(stage => stage.runtimeEnabled).length,
      reviewedKits: stages.filter(reviewedKit).length, selectedSourceImages: entries.filter(entry => entry.category === 'arena').length },
    hunters: { runtimeFighters: fighters.length, validatedClips: fighters.reduce((sum, fighter) => sum + fighter.atlas.clips.filter(clip => clip.status === 'validated').length, 0),
      initialFamiliesPerDesign: 10, completeMovesets: 0 },
    vehicles: { requested: catalogue.entries.length, entriesWithSourceArt: vehicleIds.size,
      entriesWithNonRejectedDrafts: publicDraftIds.size, acceptedAnimationClips: acceptedVehicleClips, rideableVehicles: 0 },
  };
}
