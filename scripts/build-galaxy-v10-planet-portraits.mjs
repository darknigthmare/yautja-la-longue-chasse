import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

const sourcePath =
  "art-source/v10/galaxy-navigation/openai-planets-24-atlas-master.png";
const outputDirectory = "public/game/planets/v10";
const manifestPath =
  "art-source/v10/galaxy-navigation/planet-portraits-manifest.json";

const portraits = Object.freeze([
  ["planet-oseris-iv", 0],
  ["planet-oseris-ii", 21],
  ["planet-nivalis-k", 1],
  ["planet-nivalis-c", 14],
  ["planet-cinder-12", 2],
  ["planet-ferrum-6", 13],
  ["planet-naraka-delta", 4],
  ["planet-naraka-theta", 12],
  ["planet-serekh-9", 3],
  ["planet-serekh-prime", 16],
  ["planet-pelagos-m", 5],
  ["planet-thalassa-8", 19],
  ["planet-mycora-v", 6],
  ["planet-mycora-nox", 10],
  ["planet-acheron-sigma", 7],
  ["planet-acheron-tau", 20],
  ["planet-kaail-prime", 8],
  ["planet-kaail-rook", 9],
  ["planet-vardos-iii", 15],
  ["planet-carcer-7", 18],
  ["planet-umbra-terminus", 22],
  ["planet-noctis-4", 17],
  ["planet-aeris", 23],
  ["planet-fulmen", 11],
]);

const hash = (buffer) =>
  createHash("sha256").update(buffer).digest("hex");

await mkdir(outputDirectory, { recursive: true });

const source = await readFile(sourcePath);
const sourceMetadata = await sharp(source).metadata();
if (sourceMetadata.width !== 1536 || sourceMetadata.height !== 1024) {
  throw new Error(
    `Expected a 1536x1024 source atlas, received ${sourceMetadata.width}x${sourceMetadata.height}`,
  );
}

const entries = [];
for (const [planetId, atlasIndex] of portraits) {
  const column = atlasIndex % 6;
  const row = Math.floor(atlasIndex / 6);
  const outputPath = join(outputDirectory, `${planetId}.webp`);
  const output = await sharp(source)
    .extract({
      left: column * 256,
      top: row * 256,
      width: 256,
      height: 256,
    })
    .webp({ quality: 94, smartSubsample: true })
    .toBuffer();

  await writeFile(outputPath, output);
  entries.push({
    planetId,
    atlasIndex,
    sourceCell: { column, row, x: column * 256, y: row * 256 },
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
      atlas: { columns: 6, rows: 4, cellWidth: 256, cellHeight: 256 },
      count: entries.length,
      portraits: entries,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Galaxy V10 planet portraits: ${entries.length}/24`);
console.log(manifestPath);
