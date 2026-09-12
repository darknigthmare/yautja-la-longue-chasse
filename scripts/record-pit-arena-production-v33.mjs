import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { inspectPitArenaImage } from "./pit-arena-image-metadata.mjs";

const manifestPath = "art-source/v33/pit-arenas/production-manifest.json";
const receiptsDirectory = "work/v33";
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const stage = manifest.stages.find(entry => entry.legacyRuntimeArenaId === "the-pit");
const args = process.argv.slice(2);
const reviewIndex = args.indexOf("--review");
const reviewIds = reviewIndex >= 0 ? args[reviewIndex + 1].split(",") : [];
const evidence = "docs/v33-arena-art-review.md";
if (reviewIds.length) await fs.access(evidence);
const receipts = [];
for (const filename of (await fs.readdir(receiptsDirectory)).filter(name => /^checked-arena-generation-receipts-\d+\.json$/.test(name)).sort()) {
  const sourcePath = path.join(receiptsDirectory, filename);
  const content = await fs.readFile(sourcePath);
  const persisted = path.join("art-source/v33/pit-arenas", filename).replaceAll("\\", "/");
  try { await fs.writeFile(persisted, content, { flag: "wx" }); }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    assert.deepEqual(await fs.readFile(persisted), content, "An immutable receipt changed: " + persisted);
  }
  for (const receipt of JSON.parse(content)) receipts.push({ ...receipt, persisted });
}
const changes = [];
for (const plane of stage.planes) for (const asset of plane.assets) for (const frame of asset.frames) {
  const id = path.basename(frame.path, ".png");
  const diskPath = path.join("public", frame.path);
  try { await fs.access(diskPath); } catch { continue; }
  const image = await inspectPitArenaImage(diskPath);
  const receipt = receipts.findLast(entry => entry.id === id && entry.pixelCheck?.sha256 === image.sha256 && !entry.pixelCheck.validation?.startsWith("rejected"));
  if (!receipt) { changes.push({ id, result: "not-recorded-missing-matching-receipt" }); continue; }
  if (asset.alphaRequired && (!image.hasAlpha || image.transparentPixels === 0)) { changes.push({ id, result: "not-recorded-missing-true-alpha" }); continue; }
  const changed = frame.generation?.sha256 !== image.sha256;
  const generation = { sha256: image.sha256, width: image.width, height: image.height, hasAlpha: image.hasAlpha, contentBounds: image.contentBounds };
  frame.generation = { generator: "openai-imagegen", source: receipt.persisted, ...generation };
  if (changed || frame.status === "planned") {
    frame.status = "generated";
    frame.review = null;
    frame.integration = null;
  }
  if (reviewIds.includes(id) || reviewIds.includes(asset.id)) {
    frame.status = "reviewed";
    frame.review = { evidence, coherence: true, layout: true, alpha: true };
    frame.integration = null;
  }
  changes.push({ id, result: frame.status, bounds: generation.contentBounds });
}
// A common animation window keeps scale and anchor stable across distinct drawings.
for (const plane of stage.planes) for (const asset of plane.assets) {
  if (!asset.animation || asset.frames.length < 2 || asset.frames.some(frame => !frame.generation)) continue;
  const frames = asset.frames.map(frame => frame.generation);
  if (new Set(frames.map(frame => `${frame.width}x${frame.height}`)).size !== 1) throw new Error("Animation frame canvases differ: " + asset.id);
  const left = Math.min(...frames.map(frame => frame.contentBounds.x));
  const top = Math.min(...frames.map(frame => frame.contentBounds.y));
  const right = Math.max(...frames.map(frame => frame.contentBounds.x + frame.contentBounds.width));
  const bottom = Math.max(...frames.map(frame => frame.contentBounds.y + frame.contentBounds.height));
  asset.sourceCrop = { x: left, y: top, width: right - left, height: bottom - top };
}
const rank = { planned: 0, generated: 1, reviewed: 2, integrated: 3 };
for (const entry of manifest.stages) for (const plane of entry.planes) {
  const frames = plane.assets.flatMap(asset => asset.frames);
  plane.status = frames.length ? frames.reduce((least, frame) => rank[frame.status] < rank[least] ? frame.status : least, "integrated") : "planned";
}
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ result: "recorded", changes }, null, 2));
