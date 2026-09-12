import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import sharp from "sharp";
import { build } from "esbuild";
import { inspectPitArenaImage } from "./pit-arena-image-metadata.mjs";

const root = process.cwd();
const compilation = await build({ stdin: { contents: 'export * from "./app/game/pitArenaProduction"; export { PIT_ARENA_CATALOGUE } from "./app/game/systems/pitArenaCatalogue";', loader: "ts", resolveDir: root }, write: false, bundle: true, platform: "node", format: "esm", logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(compilation.outputFiles[0].text).toString("base64"));
const manifest = api.PIT_ARENA_PRODUCTION_MANIFEST;
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.production, "v33-pit-independent-arena-art");
assert.equal(manifest.stages.length, 100);
const ids = new Set();
const imagePaths = new Set();
const checks = [];
for (const stage of manifest.stages) {
  assert(!ids.has(stage.catalogueId), stage.catalogueId);
  ids.add(stage.catalogueId);
  const catalogue = api.PIT_ARENA_CATALOGUE.find(entry => entry.id === stage.catalogueId);
  assert(catalogue, `Unknown catalogue ID ${stage.catalogueId}`);
  assert.equal(stage.number, catalogue.number);
  assert.equal(stage.name, catalogue.name);
  assert.equal(stage.setting, catalogue.setting);
  assert.equal(stage.legacyRuntimeArenaId, catalogue.runtimeArenaId);
  assert.equal(stage.legacyRuntimeStatus, catalogue.runtimeStatus);
  assert.deepEqual(stage.planes.map(plane => plane.id), ["P0", "P1", "P2", "P3", "P4", "P5"]);
  if (!stage.legacyRuntimeArenaId) assert.equal(stage.runtimeEnabled, false, "Concept art cannot unlock unimplemented gameplay");
  for (const plane of stage.planes) {
    assert.equal(plane.status, api.getPitArenaProductionPlaneStatus(plane.assets), `Stale aggregate status ${stage.catalogueId}/${plane.id}`);
    for (const asset of plane.assets) {
      assert(asset.frames.length > 0 && asset.placements.length > 0, asset.id);
      assert(Number.isFinite(asset.parallax) && asset.parallax >= 0 && asset.parallax <= 2, asset.id);
      assert(Number.isFinite(asset.opacity) && asset.opacity >= 0 && asset.opacity <= 1, asset.id);
      for (const box of asset.placements) assert([box.x, box.y, box.width, box.height].every(Number.isFinite) && box.width > 0 && box.height > 0, asset.id);
      if (asset.mode === "repeat-x") {
        assert.equal(plane.id, "P4");
        assert.equal(asset.parallax, 1, "The physical combat floor cannot drift with a decorative plane");
      }
      if (asset.animation) {
        assert(Number.isFinite(asset.animation.fps) && asset.animation.fps > 0 && asset.animation.fps <= 30);
        assert(Number.isInteger(asset.animation.reducedMotionFrame) && asset.animation.reducedMotionFrame >= 0 && asset.animation.reducedMotionFrame < asset.frames.length);
      }
      for (const frame of asset.frames) {
        assert.match(frame.path, /^\/game\/sprites\/v33\/pit-arenas\/[a-z0-9/-]+\.png$/);
        assert(frame.path.startsWith(stage.assetDirectory + "/") && !frame.path.includes(".."));
        assert(!imagePaths.has(frame.path), "Each requested file belongs to one independent sub-plan: " + frame.path);
        imagePaths.add(frame.path);
        assert(["planned", "generated", "reviewed", "integrated"].includes(frame.status), frame.path);
        if (frame.status === "planned") {
          assert.equal(frame.generation, null, "Record a generated file as generated instead of leaving inconsistent provenance");
          assert.equal(frame.review, null);
          assert.equal(frame.integration, null);
          continue;
        }
        assert.equal(frame.generation?.generator, "openai-imagegen", frame.path);
        assert(frame.generation.source && !path.isAbsolute(frame.generation.source) && !frame.generation.source.includes(".."), frame.path);
        await fs.access(path.resolve(root, frame.generation.source));
        const diskPath = path.resolve(root, "public", "." + frame.path);
        const bytes = await fs.readFile(diskPath);
        const metadata = await sharp(bytes).metadata();
        const measured = await inspectPitArenaImage(diskPath);
        assert.deepEqual(frame.generation.contentBounds, measured.contentBounds, "Stale measured alpha bounds: " + frame.path);
        const crop = asset.sourceCrop ?? frame.generation.contentBounds;
        assert([crop.x, crop.y, crop.width, crop.height].every(Number.isInteger));
        assert(crop.x >= 0 && crop.y >= 0 && crop.width > 0 && crop.height > 0 && crop.x + crop.width <= metadata.width && crop.y + crop.height <= metadata.height, "Source crop outside image: " + frame.path);
        if (asset.animation && asset.sourceCrop) {
          const bounds = frame.generation.contentBounds;
          assert(crop.x <= bounds.x && crop.y <= bounds.y && crop.x + crop.width >= bounds.x + bounds.width && crop.y + crop.height >= bounds.y + bounds.height, "Animation crop clips a reviewed silhouette: " + frame.path);
        }
        assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), frame.generation.sha256, frame.path);
        assert.equal(metadata.width, frame.generation.width, frame.path);
        assert.equal(metadata.height, frame.generation.height, frame.path);
        assert.equal(Boolean(metadata.hasAlpha), frame.generation.hasAlpha, frame.path);
        if (asset.alphaRequired) {
          assert(metadata.hasAlpha, "Independent module is opaque: " + frame.path);
          const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
          let transparent = 0, visible = 0;
          for (let pixel = info.channels - 1; pixel < data.length; pixel += info.channels) {
            if (data[pixel] === 0) transparent++;
            if (data[pixel] > 0) visible++;
          }
          assert(transparent > 0 && visible > 0, "Alpha must contain both actual cut-out space and visible art: " + frame.path);
          if (asset.mode === "repeat-x") {
            let opaqueTop = 0;
            for (let x = crop.x; x < crop.x + crop.width; x++) if (data[(crop.y * info.width + x) * info.channels + info.channels - 1] >= 250) opaqueTop++;
            assert(opaqueTop / crop.width >= .98, "Floor contact must begin at its top pixel, without a transparent margin: " + frame.path);
          }
        }
        if (frame.status === "reviewed" || frame.status === "integrated") {
          assert(api.isPitArenaProductionFrameReviewed(frame, asset.alphaRequired), "Missing image review: " + frame.path);
          await fs.access(path.resolve(root, frame.review.evidence));
        }
        if (frame.status === "integrated") await fs.access(path.resolve(root, frame.integration.evidence));
        checks.push({ path: frame.path, width: metadata.width, height: metadata.height, status: frame.status });
      }
      if (asset.animation && asset.frames.every(frame => frame.status !== "planned")) {
        assert.equal(new Set(asset.frames.map(frame => frame.generation.sha256)).size, asset.frames.length, "Duplicate files are not distinct animation drawings: " + asset.id);
      }
    }
  }
  if (stage.runtimeEnabled) assert(api.resolvePitArenaProductionKit(stage.legacyRuntimeArenaId), "Enabled kit lacks reviewed required frames: " + stage.catalogueId);
}
console.log(JSON.stringify({ result: "PASS", ...api.summarizePitArenaProduction(), verifiedImages: checks }, null, 2));
