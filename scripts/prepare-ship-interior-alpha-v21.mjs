import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Technical extraction explicitly authorized by the user on 2026-08-31.
// Only bright neutral background connected to an image edge is removed.
// Interior highlights stay intact; the source RGB bytes are never overwritten.
const root = "art-source/v21/ship-interior";
const ids = ["door-frame", "door-leaf", "foreground-rib", "console-navigation"];
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const results = [];
for (const id of ids) {
  const sourcePath = `${root}/${id}.generated.png`;
  const outputPath = `${root}/${id}.png`;
  const source = await readFile(sourcePath);
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 3);
  const { width, height } = info;
  const pixels = width * height;
  const removed = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  let head = 0, tail = 0;
  const add = index => {
    if (removed[index]) return;
    const offset = index * 3;
    const r = data[offset], g = data[offset + 1], b = data[offset + 2];
    const min = Math.min(r, g, b), max = Math.max(r, g, b);
    if (min < 155 || max - min > 36) return;
    removed[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width, y = Math.floor(index / width);
    if (x > 0) add(index - 1);
    if (x + 1 < width) add(index + 1);
    if (y > 0) add(index - width);
    if (y + 1 < height) add(index + width);
  }
  assert.ok(tail > pixels * .05 && tail < pixels * .95, `${id}: unexpected extraction area`);
  const rgba = Buffer.alloc(pixels * 4);
  let left = width, top = height, right = 0, bottom = 0;
  for (let index = 0; index < pixels; index++) {
    const rgb = index * 3, pixel = index * 4;
    rgba[pixel] = data[rgb]; rgba[pixel + 1] = data[rgb + 1]; rgba[pixel + 2] = data[rgb + 2];
    rgba[pixel + 3] = removed[index] ? 0 : 255;
    if (!removed[index]) {
      const x = index % width, y = Math.floor(index / width);
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  if (id === "door-frame") assert.equal(rgba[((height >> 1) * width + (width >> 1)) * 4 + 3], 0, "Frame interior still contains a painted checkerboard");
  await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toFile(outputPath);
  const sourceAfter = await readFile(sourcePath);
  assert.equal(sha(sourceAfter), sha(source), "Source was altered");
  results.push({ id, source: sourcePath, sourceSha256: sha(source), master: outputPath, width, height, transparentPixels: tail, opaquePixels: pixels - tail, alphaBounds: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }, rgbUnchanged: true, sourceUnchanged: true });
}
await writeFile(`${root}/alpha-preparation.json`, JSON.stringify({ schemaVersion: 1, date: "2026-08-31", status: "prepared", authorization: "Explicit user reply Oui to local technical extraction and publication", tool: "scripts/prepare-ship-interior-alpha-v21.mjs + sharp", method: "Four-connected border flood fill of bright neutral background (minimum RGB 155, maximum channel spread 36); replace background alpha with zero, retain all other RGB pixels and opaque alpha. No repaint, resizing, crop, erode or silhouette substitution.", threshold: { minimumChannel: 155, maximumChannelSpread: 36 }, sourcesPreserved: true, runtimeExportsCreated: false, assets: results }, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
