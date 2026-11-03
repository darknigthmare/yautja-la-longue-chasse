import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const art = JSON.parse(readFileSync('app/game/data/templeModularArtV70.json', 'utf8'));
test('the integrated OpenAI atlas retains native bytes, transparent openings and six isolated bases', async () => {
  const file = readFileSync('public/game/homeworld/v70/temple-modules.png');
  assert.equal(createHash('sha256').update(file).digest('hex'), art.sha256);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, art.sourceWidth); assert.equal(info.height, art.sourceHeight);
  const alpha = (x, y) => data[(y * info.width + x) * 4 + 3];
  for (const [x, y] of [[0, 0], [1535, 0], [0, 1023], [1535, 1023], [700, 300]]) assert.equal(alpha(x, y), 0, 'native transparent corner/arch opening');
  assert.equal(Object.keys(art.modules).length, 6);
  const rects = [];
  for (const [id, module] of Object.entries(art.modules)) {
    const { rect: r, alphaBounds: a, pivot: p } = module;
    assert(r.x >= 0 && r.y >= 0 && r.x + r.width <= info.width && r.y + r.height <= info.height);
    for (const other of rects) assert(r.x >= other.x + other.width || other.x >= r.x + r.width || r.y >= other.y + other.height || other.y >= r.y + r.height, id + ' overlaps another module');
    rects.push(r);
    let left = r.width, top = r.height, right = 0, bottom = 0;
    for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) if (alpha(x + r.x, y + r.y) >= 16) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1); }
    assert.deepEqual({ x: left, y: top, width: right - left, height: bottom - top }, a, id + ' measured alpha support');
    assert.equal(p.y, bottom); assert(p.x >= left && p.x <= right);
    assert(module.heightWorld > 0);
  }
});
