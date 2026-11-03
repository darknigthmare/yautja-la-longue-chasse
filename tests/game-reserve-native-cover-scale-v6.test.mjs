import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {build} from 'esbuild';

const built = await build({stdin: {contents: "export * from './app/game/gameReserveV66Rendering';export * from './app/game/systems/gameReserveV66';export * from './app/game/systems/gameReserveGrandHunt';", resolveDir: process.cwd()}, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const api = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));

async function actualNativeImages(run) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  class NativeImage {
    set src(value) {
      this._src = value;
      sharp('public' + value).metadata().then(metadata => {
        this.naturalWidth = metadata.width; this.naturalHeight = metadata.height; this.onload?.();
      }, () => this.onerror?.());
    }
    get src() {return this._src;}
  }
  Object.defineProperty(globalThis, 'Image', {configurable: true, value: NativeImage});
  try {await run();} finally {if (original) Object.defineProperty(globalThis, 'Image', original); else delete globalThis.Image;}
}

for (const definition of api.GAME_RESERVE_GRAND_CATALOGUE) test(definition.id + ': real native crop uses one scale and keeps its ground foot without mutating physics', async () => actualNativeImages(async () => {
  const state = api.createGameReserveV109(113, definition.id), before = JSON.stringify({state, cover: api.gameReserveV66Cover(state)});
  const bank = await api.loadGameReserveV66Art(state), calls = [];
  const context = new Proxy({canvas: {width: 1280}}, {get(target, key) {
    if (key in target) return target[key];
    if (key === 'measureText') return text => ({width: text.length * 7});
    if (key === 'createLinearGradient') return () => ({addColorStop() {}});
    if (key === 'drawImage') return (...args) => calls.push(args);
    return () => {};
  }});
  api.drawGameReserveV66(context, state, bank, true);
  const sourcePaths = new Set(definition.nativeArt.covers.map(item => item.src));
  const covers = calls.filter(call => sourcePaths.has(call[0].src));
  assert.equal(covers.length, definition.cover.length, 'Every real cover is observed through renderer drawImage calls');
  assert(covers.length > 0);
  for (const [index, call] of covers.entries()) {
    const [image, sx, sy, sw, sh, x, y, width, height] = call, physics = definition.cover[index];
    assert.deepEqual([sx, sy, sw, sh], [24, 24, image.naturalWidth - 48, image.naturalHeight - 48]);
    if (index === 0) console.log(JSON.stringify({reserve: definition.id, source: image.src, bitmap: [image.naturalWidth, image.naturalHeight], crop: [sw, sh], destination: [x, y, width, height], scaleX: width / sw, scaleY: height / sh}));
    assert(Math.abs(width / sw - height / sh) < 1e-12, 'The actual native crop must retain its aspect ratio');
    assert.equal(x, physics.x); assert.equal(width, physics.w);
    assert(Math.abs(y + height - (definition.world.ground + 6)) < 1e-9, 'Existing six-unit foot embedding moves the image, never stretches it');
  }
  assert.equal(JSON.stringify({state, cover: api.gameReserveV66Cover(state)}), before, 'Rendering changes neither simulation nor collision geometry');
}));
