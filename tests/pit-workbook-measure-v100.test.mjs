import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { measurePitWorkbookPageV100 } from '../scripts/measure-pit-workbook-native-v100.mjs';

async function withPage(change, verify, options) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pit-workbook-measure-v100-'));
  try {
    const width = 600, height = 400, pixels = Buffer.alloc(width * height * 4);
    const paint = (x, y, r = 120, alpha = 255) => { const offset = (y * width + x) * 4; pixels[offset] = r; pixels[offset + 1] = 80; pixels[offset + 2] = 50; pixels[offset + 3] = alpha; };
    for (let row = 0; row < 4; row++) for (let column = 0; column < 3; column++) {
      for (let y = row * 100 + 10; y < row * 100 + 88; y++) for (let x = column * 200 + 42; x < column * 200 + 108; x++) paint(x, y);
    }
    if (change) change({ width, height, pixels, paint });
    const file = path.join(directory, 'original.png');
    await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toFile(file);
    const before = await fs.readFile(file);
    const report = await measurePitWorkbookPageV100(file, options);
    await verify(report);
    assert.deepEqual(await fs.readFile(file), before, 'measurement cannot rewrite source pixels');
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
}

test('real alpha gutters produce twelve complete measured cells without declaring artistic admission', async () => {
  await withPage(null, report => {
    assert.equal(report.status, 'MEASURED_REQUIRES_VISUAL_REVIEW');
    assert.equal(report.frames.length, 12);
    assert(report.frames.every(frame => frame.alphaPixels === 66 * 78 && frame.borderPixels === 0));
    assert.equal(report.bodyHeightPx, null);
    assert.equal(report.bodyReferenceStatus, 'REVIEWED_BODY_REFERENCE_REQUIRED');
    assert.equal(new Set(report.frames.map(frame => frame.visiblePixelSha256)).size, 1, 'repeated drawings remain repeated');
    assert(report.frames.every(frame => frame.pivotCandidate[1] > 0));
  });
});

test('crossing an expected row boundary cannot be hidden by blindly cutting a grid', async () => {
  await withPage(({ paint }) => { for (let y = 65; y <= 135; y++) paint(75, y); }, report => {
    assert.equal(report.status, 'REJECT_CROP');
    assert(report.issues.some(issue => issue.includes('horizontal alpha gutter')));
    assert(report.frames.every(frame => frame.index !== 0 && frame.index !== 3), 'the two connected drawings are never admitted as separate cells');
  });
});

test('column-first measurement keeps staggered but actually separated source drawings', async () => {
  await withPage(({ pixels, paint }) => {
    pixels.fill(0);
    for (let column = 0; column < 3; column++) {
      const first = column === 1 ? [70, 230] : [10, 190], second = column === 1 ? [250, 390] : [210, 380];
      for (const [start, end] of [first, second]) for (let y = start; y < end; y++) for (let x = column * 200 + 40; x < column * 200 + 115; x++) paint(x, y);
    }
  }, report => {
    assert.equal(report.status, 'MEASURED_REQUIRES_VISUAL_REVIEW');
    assert.equal(report.strategy, 'column-first');
    assert.equal(report.frames.length, 6);
    assert(report.frames.every(frame => frame.borderPixels === 0));
  }, { columns: 3, rows: 2 });
});

test('two crops may share one empty source gutter without duplicating a visible pixel', async () => {
  await withPage(({ pixels, paint }) => {
    pixels.fill(0);
    for (let y = 10; y < 390; y++) if (y !== 200) for (let x = 100; x < 200; x++) paint(x, y);
  }, report => {
    assert.equal(report.status, 'MEASURED_REQUIRES_VISUAL_REVIEW');
    assert.equal(report.frames.length, 2);
    assert.equal(report.frames[0].rect[1] + report.frames[0].rect[3] - 1, report.frames[1].rect[1]);
    assert(report.frames.every(frame => frame.borderPixels === 0));
  }, { columns: 1, rows: 2 });
});

test('a column crossing rejects that row and a source touching its outer edge remains rejected', async () => {
  await withPage(({ paint }) => { for (let x = 130; x <= 270; x++) paint(x, 40); paint(0, 25); }, report => {
    assert.equal(report.status, 'REJECT_CROP');
    assert(report.issues.some(issue => issue.includes('vertical alpha gutter')));
  });
  await withPage(({ paint }) => paint(0, 25), report => {
    assert.equal(report.status, 'REJECT_CROP');
    assert(report.issues.some(issue => issue.includes('crop border')));
  });
});

test('invisible RGB and alpha2 noise do not manufacture new drawings or unsafe separators', async () => {
  await withPage(({ paint }) => { paint(20, 20, 240, 0); paint(200, 100, 230, 2); }, report => {
    assert.equal(report.status, 'MEASURED_REQUIRES_VISUAL_REVIEW');
    assert.equal(new Set(report.frames.map(frame => frame.visiblePixelSha256)).size, 1);
  }, { bodyHeightPx: 78 });
});
