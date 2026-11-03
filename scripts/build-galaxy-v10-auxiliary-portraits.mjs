import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

const sourcePath =
  "art-source/v10/galaxy-navigation/openai-auxiliary-objects-12-atlas-master.png";
const outputDirectory = "public/game/celestial/v10";
const manifestPath =
  "art-source/v10/galaxy-navigation/auxiliary-portraits-manifest.json";

const portraits = Object.freeze([
  ["moon-khepri", 0],
  ["belt-saal", 7],
  ["giant-boreal", 4],
  ["moon-kite", 1],
  ["moon-pyre", 2],
  ["belt-forge-ring", 8],
  ["moon-blackwater", 1],
  ["belt-ghar-wreck-reef", 7],
  ["moon-ossuary", 0],
  ["station-pilgrim-relay", 11],
  ["giant-tempest", 3],
  ["station-watcher-platform", 6],
  ["moon-quarantine", 9],
  ["anomaly-spore-drift", 10],
  ["station-acheron-orbital-city", 5],
  ["moon-obsidian", 2],
  ["station-herd-sanctuary", 6],
  ["station-vardos-shipyard", 5],
  ["station-pulsar-beacon", 11],
  ["giant-core", 3],
]);

const hash = (buffer) =>
  createHash("sha256").update(buffer).digest("hex");

await mkdir(outputDirectory, { recursive: true });

const source = await readFile(sourcePath);
const metadata = await sharp(source).metadata();
if (metadata.width !== 1536 || metadata.height !== 1024) {
  throw new Error(
    `Expected a 1536x1024 source atlas, received ${metadata.width}x${metadata.height}`,
  );
}

const entries = [];
for (const [bodyId, atlasIndex] of portraits) {
  const column = atlasIndex % 4;
  const row = Math.floor(atlasIndex / 4);
  const top = Math.round((row * 1024) / 3);
  const bottom = Math.round(((row + 1) * 1024) / 3);
  const outputPath = join(outputDirectory, `${bodyId}.webp`);
  const output = await sharp(source)
    .extract({
      left: column * 384,
      top,
      width: 384,
      height: bottom - top,
    })
    .resize({
      width: 384,
      height: 384,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .webp({ quality: 94, smartSubsample: true })
    .toBuffer();

  await writeFile(outputPath, output);
  entries.push({
    bodyId,
    atlasIndex,
    sourceCell: { column, row, x: column * 384, y: top },
    runtime: outputPath.replaceAll("\\", "/"),
    bytes: output.byteLength,
    sha256: hash(output),
  });
}

await mkdir(dirname(manifestPath), { recursive: true });
await writeFile(
  manifestPath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      generator: "OpenAI built-in image generation + deterministic Sharp crops",
      source: sourcePath,
      sourceSha256: hash(source),
      atlas: { columns: 4, rows: 3, width: 1536, height: 1024 },
      count: entries.length,
      portraits: entries,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Galaxy V10 auxiliary portraits: ${entries.length}/20`);
console.log(manifestPath);
