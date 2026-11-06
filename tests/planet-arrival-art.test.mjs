import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const { ARRIVAL_COMPLETION_ART, arrivalImpactArtForBiome } = qa.load('app/game/systems/planetArrivalArt.ts');
const { createPlanetArrival, planetArrivalAssets } = qa.load('app/game/systems/planetArrival.ts');
const { MISSIONS } = qa.load('app/game/data.ts');
const { defaultSave } = qa.load('app/game/save.ts');
const { DEFAULT_SHIP_ID } = qa.load('app/game/shipCatalogue.ts');
const biomes = MISSIONS.map(mission => mission.biome);
const runtimePaths = [...new Set([...Object.values(ARRIVAL_COMPLETION_ART),
  ...biomes.map(biome => arrivalImpactArtForBiome(biome).path)])];

test('every integrated cinematic part and terrain effect has a real decodable export and source', async () => {
  for (const path of runtimePaths) {
    const runtime = `public${path}`;
    const source = runtime.replace(/\.webp$/, '.png');
    assert.ok(existsSync(runtime), `Missing runtime cinematic asset: ${runtime}`);
    assert.ok(existsSync(source), `Missing editable cinematic source: ${source}`);
    const [png, webp] = await Promise.all([sharp(source).metadata(), sharp(runtime).metadata()]);
    assert.equal(webp.format, 'webp');
    assert.equal(png.format, 'png');
    assert.equal(webp.width, png.width, `${path}: export changed the calibrated image width`);
    assert.equal(webp.height, png.height, `${path}: export changed the calibrated image height`);
    assert.ok(png.hasAlpha && webp.hasAlpha, `${path}: alpha channel missing`);
    const { data, info } = await sharp(runtime).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let visible = 0, transparent = 0, edge = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * info.channels + info.channels - 1];
      if (alpha === 0) transparent++;
      if (alpha > 16) {
        visible++;
        if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) edge++;
      }
    }
    assert.ok(visible > 500, `${path}: empty or effectively invisible export`);
    assert.ok(transparent > info.width * info.height * .05, `${path}: opaque backdrop instead of a cutout`);
    assert.equal(edge, 0, `${path}: significant pixels clipped by the canvas edge`);
  }
});

test('all eight arrival preload lists include the actual new parts and correct contact material', () => {
  const save = defaultSave('2026-11-05T00:00:00.000Z');
  assert.equal(MISSIONS.length, 8);
  for (const mission of MISSIONS) {
    const state = createPlanetArrival({ ownerCreatedAt: save.createdAt, runId: `art:${mission.id}`,
      missionId: mission.id, encounterRun: 1, personalShipId: DEFAULT_SHIP_ID, hunterPresetId: save.appearance.presetId });
    const assets = planetArrivalAssets(state);
    for (const [key, path] of Object.entries(ARRIVAL_COMPLETION_ART)) assert.equal(assets[key], path);
    assert.equal(assets.impactDust, arrivalImpactArtForBiome(mission.biome).path);
    const expected = mission.biome === 'ice' ? 'ice' : ['ocean', 'swamp'].includes(mission.biome) ? 'wet' : 'dry';
    assert.equal(arrivalImpactArtForBiome(mission.biome).material, expected);
  }
});

test('outer and inner hatch exports remain registered to the same rigid panel canvas', async () => {
  const [outer, inner] = await Promise.all([ARRIVAL_COMPLETION_ART.podDoor, ARRIVAL_COMPLETION_ART.podDoorInterior]
    .map(path => sharp(`public${path}`).metadata()));
  assert.deepEqual([inner.width, inner.height], [outer.width, outer.height]);
  assert.notDeepEqual(readFileSync(`public${ARRIVAL_COMPLETION_ART.podDoor}`),
    readFileSync(`public${ARRIVAL_COMPLETION_ART.podDoorInterior}`), 'The reverse must be a distinct image, not a duplicated outer face.');
});
