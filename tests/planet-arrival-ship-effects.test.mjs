import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import sharp from 'sharp';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const { ARRIVAL_SHIP_ENGINE_ART, arrivalShipEngineAperture, arrivalShipEffectAssetPaths,
  arrivalShipEngineFrame } = qa.load('app/game/systems/planetArrivalShipEffects.ts');
const { ARRIVAL_SHIP_MOTION_HULL, ARRIVAL_CLASSIC_SHIP_VIEWS } = qa.load('app/game/systems/planetArrivalShipMotion.ts');
const { SHIP_IDS } = qa.load('app/game/shipCatalogue.ts');

test('engine sources decode with real transparent margins and their measured light origins are occupied', async () => {
  for (const [name, art] of Object.entries(ARRIVAL_SHIP_ENGINE_ART)) {
    const image = sharp(path.join(process.cwd(), 'public', art.path));
    const metadata = await image.metadata();
    assert.equal(metadata.width, art.width); assert.equal(metadata.height, art.height);
    assert.equal(metadata.hasAlpha, true, name);
    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const x = Math.round(art.origin.x * info.width), y = Math.round(art.origin.y * info.height);
    const offset = (y * info.width + x) * 4;
    assert.ok(data[offset + 3] > 128 && data[offset] > 150 && data[offset + 1] > 100,
      `${name}: the registered source origin must touch the luminous emitter`);
    let visible = 0, clear = 0;
    for (let row = 0; row < info.height; row++) for (let column = 0; column < info.width; column++) {
      const alpha = data[(row * info.width + column) * 4 + 3];
      if (alpha > 16) visible++;
      if (alpha < 2) clear++;
      if (row === 0 || row === info.height - 1 || column === 0 || column === info.width - 1)
        assert.ok(alpha <= 16, `${name}: the light must not be clipped at a canvas edge`);
    }
    assert.ok(visible > info.width * info.height * .02, `${name}: nonempty source`);
    assert.ok(clear > info.width * info.height * .3, `${name}: transparent background`);
  }
});

test('only inspected visible aft apertures accept the independent engine effects', () => {
  for (const view of Object.values(ARRIVAL_CLASSIC_SHIP_VIEWS)) {
    const aperture = arrivalShipEngineAperture(view.id);
    assert.equal(Boolean(aperture), view.exhaust.some(socket => socket.visibility > 0), view.id);
    if (aperture) assert.ok(aperture.width > 0 && aperture.height > aperture.width);
  }
  assert.equal(arrivalShipEngineAperture('profile'), null);
  for (const ship of SHIP_IDS) {
    assert.equal(arrivalShipEffectAssetPaths(ship).length, ship === ARRIVAL_SHIP_MOTION_HULL ? 2 : 0);
  }
});

test('reduced motion removes time modulation while ordinary departure builds thrust', () => {
  for (const method of ['pod', 'ship']) {
    const reduced = arrivalShipEngineFrame(14_630, method, true);
    for (const time of [24_480, 26_480, 42_000]) assert.deepEqual(arrivalShipEngineFrame(time, method, true), reduced);
  }
  assert.ok(arrivalShipEngineFrame(28_300, 'pod').power > arrivalShipEngineFrame(14_630, 'pod').power,
    'The existing departure should visibly build thrust after release');
});

test('optical camouflage attenuates light without changing power, time or source size', () => {
  const exposed = arrivalShipEngineFrame(26_700, 'ship');
  const cloaked = arrivalShipEngineFrame(26_700, 'ship', false, .8);
  assert.equal(cloaked.power, exposed.power); assert.equal(cloaked.plumeWidth, exposed.plumeWidth);
  assert.ok(cloaked.coreOpacity > 0 && cloaked.coreOpacity < exposed.coreOpacity);
  assert.ok(cloaked.plumeOpacity > 0 && cloaked.plumeOpacity < exposed.plumeOpacity);
});

test('no thrust is painted outside flight and malformed time cannot create a nonfinite transform', () => {
  for (const time of [-10, 0, 12_999, 50_000, 62_000, NaN, Infinity]) {
    const frame = arrivalShipEngineFrame(time, 'pod');
    assert.equal(frame.power, 0); assert.equal(frame.coreOpacity, 0); assert.equal(frame.plumeOpacity, 0);
    assert.ok(Object.values(frame).every(Number.isFinite));
  }
});
