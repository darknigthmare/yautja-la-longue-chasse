import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const api = homeworldSceneSsrV78().load('app/game/systems/homeworldForgeFireV113.ts');
const source = api.HOMEWORLD_FORGE_FIRE_V113;
const building = {id: 'deep-forge', art: {src: source.buildingSource, sourceRect: source.buildingCell}};

test('before native images decode the building child paints no orphan flame', () => {
  assert.equal(homeworldSceneSsrV78().render('app/game/HomeworldForgeFireV113.tsx',
    {building, width: 1040, height: 1024, seconds: .375, reducedMotion: false}), '');
});

test('six distinct native frames advance only with the supplied clock and hold in reduced motion', () => {
  assert.deepEqual([0, .125, .25, .375, .5, .625, .75].map(t => api.homeworldForgeFireFrameV113(t)), [0, 1, 2, 3, 4, 5, 0]);
  assert.equal(api.homeworldForgeFireFrameV113(3.375), api.homeworldForgeFireFrameV113(3.375));
  for (const time of [0, 1, 91, NaN, Infinity, -1]) assert.equal(api.homeworldForgeFireFrameV113(time, true), 0);
  for (const time of [NaN, Infinity, -1]) assert.equal(api.homeworldForgeFireFrameV113(time), 0);
  assert.equal(new Set(api.HOMEWORLD_FORGE_FIRE_FRAMES_V113.map(f => f.src)).size, 6);
  assert.equal(new Set(api.HOMEWORLD_FORGE_FIRE_FRAMES_V113.map(f => f.sha256)).size, 6);
});

test('binding rejects a different building, old facade, different atlas cell and nonuniform scaling', () => {
  assert.equal(api.homeworldForgeFireCompatibleV113(building, 1040, 1024), true);
  assert.equal(api.homeworldForgeFireCompatibleV113({...building, id: 'convoy-workshop'}, 1040, 1024), false);
  assert.equal(api.homeworldForgeFireCompatibleV113({...building, art: {...building.art, src: '/game/homeworld/v64/civic-forge.png'}}, 1040, 1024), false);
  assert.equal(api.homeworldForgeFireCompatibleV113({...building, art: {...building.art, sourceRect: {...source.buildingCell, y: 0}}}, 1040, 1024), false);
  for (const size of [[1040, 900], [0, 1024], [Infinity, 1024], [1040, NaN]])
    assert.equal(api.homeworldForgeFireCompatibleV113(building, ...size), false);
});

test('native frame anchors share one physical hearth and one positive uniform image scale', () => {
  for (let i = 0; i < 6; i++) {
    const image = api.homeworldForgeFireImageV113(i), frame = api.HOMEWORLD_FORGE_FIRE_FRAMES_V113[i];
    const scale = image.width / source.sourceWidth;
    assert.equal(scale, image.height / source.sourceHeight); assert(scale > 0);
    assert(Math.abs(image.x + frame.pivot.x * scale - source.hearthAnchor.x) < 1e-9);
    assert(Math.abs(image.y + frame.pivot.y * scale - source.hearthAnchor.y) < 1e-9);
  }
});

test('reused originals retain exact bytes, native dimensions and alpha without modifying Pit data', () => {
  for (const frame of api.HOMEWORLD_FORGE_FIRE_FRAMES_V113) {
    const bytes = fs.readFileSync('public' + frame.src);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), frame.sha256);
    assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
    assert.equal(bytes.readUInt32BE(16), 1536); assert.equal(bytes.readUInt32BE(20), 1024);
    assert.equal(bytes[25], 6);
  }
});
