import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, stat } from "node:fs/promises";
import sharp from "sharp";

// Reproducible encoding only. Transparent masters must already be prepared.
const root = "art-source/v21/ship-interior";
const pack = JSON.parse(await readFile(`${root}/generation-prompts.json`, "utf8"));
const assets = [];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const job of pack.assets) {
  const masterPath = `${root}/${job.id}.png`;
  const sourceBytes = await readFile(job.source);
  const masterBytes = await readFile(masterPath);
  const masterMeta = await sharp(masterBytes).metadata();
  assert.ok(!job.alphaRequired || masterMeta.hasAlpha, `${job.id}: actual RGBA required, never a painted checkerboard`);
  const runtimePath = `public/game/ship-interior/v21/${job.id}.webp`;
  await sharp(masterBytes).webp({ quality: 86, alphaQuality: 100, effort: 6 }).toFile(runtimePath);
  const runtimeBytes = await readFile(runtimePath);
  const runtimeMeta = await sharp(runtimeBytes).metadata();
  let alpha = null;
  if (job.alphaRequired) {
    const { data, info } = await sharp(runtimeBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0, opaque = 0, left = info.width, top = info.height, right = 0, bottom = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const a = data[(y * info.width + x) * info.channels + 3];
      if (a === 0) transparent++;
      if (a === 255) opaque++;
      if (a > 8) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
    }
    assert.ok(transparent > info.width * info.height * .05 && opaque > info.width * info.height * .05, `${job.id}: usable empty and solid pixels required`);
    alpha = { transparent, opaque, bounds: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 } };
  }
  assets.push({ id: job.id, generatedSource: { path: job.source, sha256: hash(sourceBytes) }, master: { path: masterPath, width: masterMeta.width, height: masterMeta.height, bytes: masterBytes.length, sha256: hash(masterBytes) }, runtime: { path: runtimePath, url: runtimePath.slice(6), width: runtimeMeta.width, height: runtimeMeta.height, bytes: (await stat(runtimePath)).size, sha256: hash(runtimeBytes), hasAlpha: runtimeMeta.hasAlpha }, alpha });
}
await writeFile(`${root}/manifest.json`, JSON.stringify({ schemaVersion: 1, date: pack.date, generator: pack.generator, conversion: { tool: "sharp", format: "webp", quality: 86, alphaQuality: 100, effort: 6, resized: false, cropped: false }, note: "Source PNGs, transparent masters, and runtime encodings are separate records. Technical alpha preparation, when performed, is documented in alpha-preparation.json.", assets }, null, 2) + "\n");
console.log(`${assets.length} ship modules exported; ${assets.reduce((sum, a) => sum + a.runtime.bytes, 0)} runtime bytes.`);
