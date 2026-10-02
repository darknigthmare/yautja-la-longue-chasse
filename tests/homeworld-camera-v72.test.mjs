import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
const compiled = await build({ entryPoints: ['app/game/systems/homeworldCameraV72.ts'], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const { homeworldCameraV72 } = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
test('small rooms remain fully framed without oversized characters', () => {
  const c = homeworldCameraV72({ actor: { x: 260, y: 160 }, width: 538, depth: 308, viewport: { width: 1000, height: 580 }, interior: true });
  assert.equal(c.mode, 'whole-room'); assert(c.zoom <= 1.35); assert(c.x < 0);
  assert(c.x + c.viewWidth > 538); assert(c.y + c.viewHeight > 308 * Math.sin(35 * Math.PI / 180));
});
test('a mobile hall scrolls rather than shrinking the young hunter into a miniature', () => {
  const args = { width: 968, depth: 688, viewport: { width: 390, height: 320 }, interior: true };
  const left = homeworldCameraV72({ ...args, actor: { x: 80, y: 80 } });
  const right = homeworldCameraV72({ ...args, actor: { x: 850, y: 600 } });
  assert.equal(left.mode, 'follow'); assert.equal(left.zoom, .96); assert(right.x > left.x); assert(right.y > left.y);
  for (const [c, actor] of [[left, { x: 80, y: 80 }], [right, { x: 850, y: 600 }]]) {
    assert(actor.x >= c.x && actor.x <= c.x + c.viewWidth);
    const groundY = actor.y * Math.sin(35 * Math.PI / 180);
    assert(groundY >= c.y && groundY <= c.y + c.viewHeight);
  }
});
test('city projection remains unchanged and an oversized viewport centres finite bounds', () => {
  const c = homeworldCameraV72({ actor: { x: 1000, y: 1000 }, width: 6400, depth: 5100, viewport: { width: 1000, height: 580 }, interior: false });
  assert.equal(c.zoom, .96); assert.equal(c.mode, 'follow');
  assert(Math.abs(c.x - (1000 - 1000 / .96 * .5)) < 1e-8);
  const tiny = homeworldCameraV72({ actor: { x: 0, y: 0 }, width: 100, depth: 100, viewport: { width: 2000, height: 1800 }, interior: true });
  assert([tiny.x, tiny.y, tiny.zoom].every(Number.isFinite));
});

test('V75 exterior camera reveals natural shoulders without extending simulated city bounds', () => {
  const args = { width: 6400, depth: 5100, viewport: { width: 1000, height: 580 }, interior: false };
  const west = homeworldCameraV72({ ...args, actor: { x: 0, y: 800 } });
  const east = homeworldCameraV72({ ...args, actor: { x: args.width, y: 800 } });
  assert.equal(west.x, -480);
  assert.equal(east.x + east.viewWidth, args.width + 480);
  assert(west.x <= 0 && west.x + west.viewWidth >= 0);
  assert(east.x <= args.width && east.x + east.viewWidth >= args.width);
  assert.equal(west.zoom, .96); assert.equal(east.zoom, .96);
});
