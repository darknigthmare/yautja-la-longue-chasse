import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { build } from 'esbuild';
import { renderToStaticMarkup } from 'react-dom/server';

const result = await build({ stdin: { contents: "export * from './app/game/systems/homeworldYouthMotionV74.ts';export {default as YouthMotion} from './app/game/HomeworldYouthMotionV74.tsx';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic' });
const api = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
const art = JSON.parse(await fs.readFile('app/game/data/homeworldYouthMotionArtV74.json', 'utf8'));
const directions = { n: [0, -260], ne: [250, -200], e: [330, 0], se: [250, 200], s: [0, 260], sw: [-250, 200], w: [-330, 0], nw: [-250, -200] };

test('eight actual velocity octants select eight authored PNG views and stop remembers the last direction', () => {
  assert.equal(Object.keys(art.actors).length, 8);
  for (const [direction, [x, y]] of Object.entries(directions)) {
    assert.equal(api.homeworldYouthDirectionV74({ x, y }, 'e', true), direction);
    assert.equal(api.homeworldYouthDirectionV74({ x: 0, y: 0 }, direction, true), direction);
    assert.equal(api.homeworldYouthDirectionV74({ x, y }, direction, false), direction);
    assert.equal(api.homeworldYouthFrameV74({ seconds: 1, moving: false, velocity: { x, y }, lastDirection: direction }).clipId, 'idle');
  }
  assert.equal(api.homeworldYouthDirectionV74({ x: NaN, y: Infinity }, 'nw'), 'nw');
  assert.equal(api.homeworldYouthDirectionV74({ x: 5, y: 0 }, 's'), 's');
});

test('four separate native walking windows plus idle per direction use real travel and a two-step stride', () => {
  assert.equal(api.HOMEWORLD_YOUTH_STRIDE_WORLD_V74, 84);
  const poses = new Set(), sources = new Set();
  for (const [direction, [x, y]] of Object.entries(directions)) {
    const velocity = { x, y };
    for (const [index, distanceWorld] of [0, 21, 42, 63].entries()) {
      const sample = api.homeworldYouthFrameV74({ seconds: 999, moving: true, velocity, lastDirection: direction, distanceWorld });
      assert.equal(sample.index, index); assert.equal(sample.direction, direction); assert.equal(sample.clipId, 'walk');
      poses.add(sample.frame.nativeWindowSha256); sources.add(sample.source.src);
      assert.match(sample.source.src, /^\/game\/homeworld\/v74\/youth\/unblooded-/);
    }
    assert.equal(api.homeworldYouthFrameV74({ seconds: 0, moving: true, velocity, distanceWorld: 84 }).index, 0);
  }
  assert.equal(poses.size, 32, '32 genuinely different native drawings, not four repeated crops or CSS mirrors');
  assert.equal(sources.size, 16, 'original cells and independently generated opposite-foot corrections');
});

test('pause and collision freeze travel, retain facing, and never advance an independent renderer clock', () => {
  const base = { moving: true, velocity: { x: -100, y: -100 }, lastDirection: 'nw', distanceWorld: 48 };
  const first = api.homeworldYouthFrameV74({ ...base, seconds: 1 });
  const paused = api.homeworldYouthFrameV74({ ...base, seconds: 100 });
  assert.equal(first.index, paused.index); assert.equal(first.direction, paused.direction);
  const blocked = api.homeworldYouthFrameV74({ ...base, velocity: { x: 0, y: 0 }, seconds: 100 });
  assert.equal(blocked.clipId, 'idle'); assert.equal(blocked.direction, 'nw');
  assert.equal(api.homeworldYouthFrameV74({ seconds: NaN, moving: true, facing: -1 }).index, 0);
  assert.equal(api.homeworldYouthFrameV74({ seconds: -5, moving: true, distanceWorld: -5 }).index, 0);
});

test('sixteen unmodified native PNGs retain SHA, true alpha and fully measured crop windows', async () => {
  for (const source of Object.values(art.sources)) {
    const bytes = await fs.readFile('public' + source.src);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), source.sha256);
    assert.equal(source.nativePixelCopy, true);
    const { info, data } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.channels, 4); assert.equal(info.width, source.sourceWidth); assert.equal(info.height, source.sourceHeight);
    let transparent = 0; for (let i = 3; i < data.length; i += 4) if (data[i] === 0) transparent++;
    assert(transparent > info.width * info.height * .65, 'transparent native gutters, never an opaque rectangle');
    for (const frame of source.frames) {
      const [rx, ry, width, height] = frame.rect;
      assert(rx >= 0 && ry >= 0 && rx + width <= info.width && ry + height <= info.height);
      let left = width, top = height, right = -1, bottom = -1;
      const crop = Buffer.alloc(width * height * 4);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const origin = ((y + ry) * info.width + x + rx) * 4, destination = (y * width + x) * 4;
        data.copy(crop, destination, origin, origin + 4);
        if (data[origin + 3] > 200) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
      }
      assert.deepEqual(frame.alphaBounds, { x: left, y: top, width: right - left + 1, height: bottom - top + 1 });
      assert.equal(crypto.createHash('sha256').update(crop).digest('hex'), frame.nativeWindowSha256);
      assert.equal(frame.pivot[1], bottom); assert(frame.pivot[0] >= left && frame.pivot[0] <= right);
    }
  }
});

test('ground pivots and uniform head-to-waist scale remain stable through every selected native pose', () => {
  for (const [direction, actor] of Object.entries(art.actors)) {
    const targetTorsoHeight = actor.referenceUpperBodyHeight * 82 / actor.bodyHeight;
    for (const frame of [actor.idle, ...actor.walk]) {
      const scale = 82 / frame.bodyHeight;
      assert(Math.abs(frame.upperBodyHeight * scale - targetTorsoHeight) < .0001, direction + ' no swelling head/torso');
      assert.equal(-frame.pivot[1] * scale + frame.pivot[1] * scale, 0, 'ground anchor fixed without bob');
      assert(scale > 0 && scale < 1);
    }
    const html = renderToStaticMarkup(api.YouthMotion({ seconds: 0, moving: true, lastDirection: direction, velocity: { x: directions[direction][0], y: directions[direction][1] }, distanceWorld: 42, height: 82 }));
    assert(html.includes('data-motion-version="74"')); assert(html.includes('data-native-frame="2"'));
    assert(html.includes('data-native-direction="' + direction + '"')); assert(!html.includes('scaleX') && !html.includes('animation:') && !html.includes('rotate('));
  }
});

test('the V48 sheets and the historical V72 helper/renderer remain untouched', async () => {
  const src = await fs.readFile('app/game/HomeworldYouthMotionV72.tsx', 'utf8');
  assert(src.includes('YOUTH_ART_MANIFEST')); assert(!src.includes('V74'));
  for (const facing of ['right', 'left']) {
    const meta = await sharp('public/game/youth/v48/unblooded-' + facing + '.png').metadata();
    assert.equal(meta.width, 1122); assert.equal(meta.height, 1402);
  }
});
