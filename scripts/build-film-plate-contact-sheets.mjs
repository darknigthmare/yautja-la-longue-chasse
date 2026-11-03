import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  HUNTER_FILM_GROUPS,
  hunterFilmPlatePath,
} from "../app/game/hunterLore.ts";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const OUTPUT_ROOT = path.join(ROOT, "tmp", "film-plate-contact-sheets");
const TILE_WIDTH = 320;
const TILE_HEIGHT = 480;
const ART_WIDTH = 284;
const ART_HEIGHT = 390;
const COLUMN_LIMIT = 5;

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

function compactLabel(value, maximumLength = 33) {
  return value.length > maximumLength
    ? `${value.slice(0, maximumLength - 1).trimEnd()}…`
    : value;
}

async function buildTile(preset) {
  const runtimeUrl = hunterFilmPlatePath(preset);
  if (runtimeUrl === null) {
    throw new Error(`${preset.id}: plaque film introuvable`);
  }
  const platePath = path.join(ROOT, "public", runtimeUrl);
  const plate = await sharp(platePath)
    .resize(ART_WIDTH, ART_HEIGHT, {
      fit: "contain",
      position: "south",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toBuffer();
  const label = Buffer.from(`
    <svg width="${TILE_WIDTH}" height="${TILE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" rx="8" fill="#090d0b"/>
      <rect x="1" y="1" width="${TILE_WIDTH - 2}" height="${TILE_HEIGHT - 2}" rx="8"
        fill="none" stroke="#5f4a2f" stroke-width="2"/>
      <text x="16" y="428" fill="#e0c898" font-family="Arial, sans-serif"
        font-size="17" font-weight="700">${escapeXml(compactLabel(preset.name))}</text>
      <text x="16" y="452" fill="#847968" font-family="Arial, sans-serif"
        font-size="13">${escapeXml(preset.id)}</text>
      <text x="${TILE_WIDTH - 16}" y="452" fill="#aa5f4e" text-anchor="end"
        font-family="Arial, sans-serif" font-size="12" font-weight="700">${
          preset.isArchetype ? "ARCHÉTYPE" : preset.year
        }</text>
    </svg>
  `);
  return sharp(label)
    .composite([{ input: plate, left: 18, top: 18 }])
    .png()
    .toBuffer();
}

async function buildGroupSheet(group) {
  const columns = Math.min(COLUMN_LIMIT, group.presets.length);
  const rows = Math.ceil(group.presets.length / columns);
  const headerHeight = 78;
  const width = columns * TILE_WIDTH;
  const height = headerHeight + rows * TILE_HEIGHT;
  const background = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#030504"/>
      <text x="22" y="34" fill="#d5a957" font-family="Arial, sans-serif"
        font-size="23" font-weight="700">${escapeXml(group.work)}</text>
      <text x="22" y="58" fill="#777f77" font-family="Arial, sans-serif"
        font-size="14">${group.year} · ${group.presets.length} plaque${
          group.presets.length > 1 ? "s" : ""
        }</text>
    </svg>
  `);
  const tiles = await Promise.all(group.presets.map(buildTile));
  const composites = tiles.map((tile, index) => ({
    input: tile,
    left: (index % columns) * TILE_WIDTH,
    top: headerHeight + Math.floor(index / columns) * TILE_HEIGHT,
  }));
  const sheet = await sharp(background).composite(composites).png().toBuffer();
  const outputPath = path.join(
    OUTPUT_ROOT,
    `${group.year}-${slugify(group.work)}.png`,
  );
  await writeFile(outputPath, sheet);
  return outputPath;
}

async function main() {
  await mkdir(OUTPUT_ROOT, { recursive: true });
  const manifestPath = path.join(
    ROOT,
    "public",
    "game",
    "sprites",
    "v5",
    "film-plates",
    "manifest.json",
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.entries.length !== HUNTER_FILM_GROUPS.reduce(
    (count, group) => count + group.presets.length,
    0,
  )) {
    throw new Error("Le manifeste et le catalogue film ne couvrent pas le même nombre de plaques");
  }
  const outputs = [];
  for (const group of HUNTER_FILM_GROUPS) {
    outputs.push(await buildGroupSheet(group));
  }
  console.log(
    `Contact sheets V5 : ${outputs.length} films contrôlables dans ${path.relative(ROOT, OUTPUT_ROOT)}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
