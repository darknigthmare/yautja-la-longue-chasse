import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { build } from 'esbuild';
import { firstTracksCompleted, p } from './helpers/solo-v67-campaign-route.mjs';
const compiled = await build({ stdin: { contents: `export * from './app/game/systems/homeworldAtlasRoutesV70';export * from './app/game/systems/homeworldSpatialCodex';export * from './app/game/systems/homeworldCity';`, resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const atlas = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));

test('all ten village thresholds have safe walking routes around actual solids and native previews', () => {
  const actor = atlas.createHomeworldActor();
  assert.equal(atlas.HOMEWORLD_ATLAS_ROUTES_V70.length, 10);
  assert.equal(new Set(atlas.HOMEWORLD_ATLAS_ROUTES_V70.map(r => r.id)).size, 10);
  for (const destination of atlas.HOMEWORLD_ATLAS_ROUTES_V70) {
    const route = atlas.homeworldSpatialRoute(actor, destination.approach);
    assert.equal(route.status, 'reachable', destination.regionId);
    assert.deepEqual(route.points.at(-1), destination.approach);
    assert(atlas.isHomeworldWalkable(destination.approach));
    for (let i = 1; i < route.points.length; i++) assert(atlas.isHomeworldRouteSegmentWalkable(route.points[i - 1], route.points[i]), destination.regionId + ' segment ' + i);
    assert(destination.corridorMetres > 400 && destination.corridorMetres < 450);
    assert(existsSync('public' + destination.panorama), destination.panorama);
    assert.equal(destination.lore, 'original-adaptation');
    assert.equal(destination.sourceId, null);
    assert.equal(destination.buildingId, null, 'a biome marker is not a house door');
  }
});
test('reading routes cannot unlock young, reserve or exploration access, or move the actor', () => {
  const trained = firstTracksCompleted();
  const notTrained = p.defaultSave('2026-10-01T10:00:00Z');
  notTrained.prologue = structuredClone(trained.prologue);
  notTrained.profile.rankId = 'ancient';
  notTrained.homeworld.visitedDistrictIds = atlas.HOMEWORLD_DISTRICTS.map(d => d.id);
  for (const save of [trained, notTrained]) {
    const before = JSON.stringify(save);
    for (const destination of atlas.HOMEWORLD_ATLAS_ROUTES_V70) {
      const result = atlas.homeworldAtlasRouteAccessV70(save, destination.regionId);
      assert.equal(result.allowed, save === trained && destination.regionId !== 'forbidden-reserve');
      if (!result.allowed) assert(result.reason.length > 0);
    }
    assert.equal(JSON.stringify(save), before);
  }
  assert.equal(atlas.HOMEWORLD_SPATIAL_SITES.length, 14, 'the old district catalogue remains intact');
});
