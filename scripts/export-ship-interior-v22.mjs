import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, stat } from "node:fs/promises";
import sharp from "sharp";

// Reproducible encoding only. Transparent masters must already be prepared.
const root = "art-source/v22/ship-interior";
const pack = JSON.parse(await readFile(`${root}/generation-prompts.json`, "utf8"));
const assets = [];
const specifications = {
  "floor-edge": { key: "floorEdge", height: 20, layer: "structure", topLeft: true },
  "gantry": { key: "gantry", height: 16, layer: "structure", topLeft: true },
  "service-ladder": { key: "serviceLadder", width: 56, layer: "structure" },
  "medbay-bed": { key: "medbayBed", maxWidth: 280, maxHeight: 145, layer: "fixtures" },
  "armory-rack": { key: "armoryRack", maxWidth: 560, maxHeight: 220, layer: "fixtures" },
  "archive-terminal": { key: "archiveTerminal", maxWidth: 160, maxHeight: 250, layer: "fixtures" },
  "forge-station": { key: "forgeStation", maxWidth: 190, maxHeight: 310, layer: "fixtures" },
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const job of pack.assets) {
  const masterPath = `${root}/${job.id}.png`;
  const sourceBytes = await readFile(job.source);
  const masterBytes = await readFile(masterPath);
  const masterMeta = await sharp(masterBytes).metadata();
  assert.ok(!job.alphaRequired || masterMeta.hasAlpha, `${job.id}: actual RGBA required, never a painted checkerboard`);
  const runtimePath = `public/game/ship-interior/v22/${job.id}.webp`;
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

const registry = {};
for (const asset of assets) {
  const spec = specifications[asset.id], bounds = asset.alpha.bounds;
  const scale = spec.height ? spec.height / bounds.height : spec.width ? spec.width / bounds.width : Math.min(spec.maxWidth / bounds.width, spec.maxHeight / bounds.height);
  const width = bounds.width * scale, height = bounds.height * scale;
  registry[spec.key] = { src: asset.runtime.url, sourceWidth: asset.runtime.width, sourceHeight: asset.runtime.height, alphaBounds: bounds, width, height, pivot: spec.topLeft ? { x: 0, y: 0 } : { x: width / 2, y: height }, sizeBasis: "alpha-bounds", layer: spec.layer };
}
await writeFile("app/game/shipInteriorV22.ts", "/** Independent V22 modules. Nominal size describes painted alpha bounds; collisions remain in shipLevelLayout. */\nexport const SHIP_LEVEL_ART_V22 = " + JSON.stringify(registry, null, 2) + " as const;\n");
