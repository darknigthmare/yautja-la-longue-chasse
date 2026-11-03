import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { validateExpeditionAnimationImport } from "../app/game/systems/expeditionAnimationContract.ts";

// Read-only gate. A successful metadata/file audit still requires visual review
// and an authored runtime integration; it never changes the asset registry.
const filename = process.argv[2];
if (!filename || process.argv.length !== 3) {
  console.error("Usage: node --experimental-strip-types scripts/audit-expedition-animation-import.mjs <manifest.json>");
  process.exitCode = 2;
} else {
  try {
    const stat = await fs.stat(filename);
    if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw Error("Manifest must be a JSON file of at most 8 MiB.");
    const candidate = JSON.parse(await fs.readFile(filename, "utf8"));
    const metadata = validateExpeditionAnimationImport(candidate);
    const issues = [...metadata.issues];
    const root = await fs.realpath(fileURLToPath(new URL("../", import.meta.url)));
    let checkedAssets = 0;
    if (metadata.valid) for (const asset of candidate.assets) {
      try {
        const file = await fs.realpath(path.join(root, "public", asset.src));
        const relative = path.relative(root, file);
        if (relative.startsWith(".." + path.sep) || relative === ".." || path.isAbsolute(relative)) throw Error("Source resolves outside workspace.");
        const info = await fs.stat(file);
        if (!info.isFile() || info.size > 64 * 1024 * 1024) throw Error("Asset exceeds the 64 MiB decoded-source safety gate.");
        const bytes = await fs.readFile(file);
        if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256.toLowerCase()) throw Error("SHA-256 differs from declared source.");
        const raster = sharp(bytes, { limitInputPixels: 64 * 1024 * 1024 });
        const dimensions = await raster.metadata();
        if (dimensions.width !== asset.width || dimensions.height !== asset.height) throw Error("Decoded dimensions differ from manifest.");
        if (asset.kind !== "occlusion-mask") {
          if (!dimensions.hasAlpha) throw Error("Transparent body/equipment source required.");
          const stats = await raster.stats();
          const alpha = stats.channels.at(-1);
          if (!alpha || alpha.min === 255 || alpha.max === 0) throw Error("Source must contain both visible and transparent pixels.");
        }
        checkedAssets++;
      } catch (error) {
        issues.push({ path: "asset:" + asset.id, code: "source-file-rejected", reason: error instanceof Error ? error.message : String(error) });
      }
    }
    console.log(JSON.stringify({ valid: issues.length === 0, declaredClipCount: metadata.declaredClipCount, checkedAssets, conformingRuntimeClipCount: 0, visualReviewRequired: true, issues }, null, 2));
    if (issues.length) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
