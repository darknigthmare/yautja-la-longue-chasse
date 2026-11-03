import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const OUTPUT_ROOT = path.join(ROOT, "tmp", "trophy-contact-sheets");
const TILE_WIDTH = 260;
const TILE_HEIGHT = 310;
const ART_WIDTH = 226;
const ART_HEIGHT = 214;
const HEADER_HEIGHT = 72;
const COLUMN_LIMIT = 5;
const BATCH_SIZE = 25;

const packs = [
  {
    id: "v16-franchise",
    title: "V16 · Archive franchise",
    manifestPath:
      "public/game/assets/v16/franchise-trophies/manifest.json",
    sourceSpecPath:
      "art-source/v16/franchise-trophies/source-specs.json",
    detail(entry) {
      const appearance = entry.appearances[0];
      return `${appearance.medium} · ${appearance.work} (${appearance.year})`;
    },
  },
  {
    id: "v17-enemies",
    title: "V17 · Prises potentielles du bestiaire",
    manifestPath: "public/game/assets/v17/enemy-trophies/manifest.json",
    sourceSpecPath: "art-source/v17/enemy-trophies/source-specs.json",
    detail(entry) {
      return `${entry.objectKind} · ${entry.enemyIds.length} ennemi${
        entry.enemyIds.length > 1 ? "s" : ""
      }`;
    },
  },
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function compactLabel(value, maximumLength) {
  return value.length > maximumLength
    ? `${value.slice(0, maximumLength - 1).trimEnd()}…`
    : value;
}

async function buildTile(entry, detail) {
  const art = await sharp(path.join(ROOT, entry.runtimePath))
    .resize(ART_WIDTH, ART_HEIGHT, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toBuffer();
  const frame = Buffer.from(`
    <svg width="${TILE_WIDTH}" height="${TILE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="checker" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#101411"/>
          <rect width="8" height="8" fill="#171c18"/>
          <rect x="8" y="8" width="8" height="8" fill="#171c18"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" rx="8" fill="#080a08"/>
      <rect x="12" y="12" width="236" height="222" rx="5" fill="url(#checker)"
        stroke="#4a3a26" stroke-width="1"/>
      <text x="14" y="258" fill="#dec894" font-family="Arial, sans-serif"
        font-size="15" font-weight="700">${escapeXml(compactLabel(entry.name, 32))}</text>
      <text x="14" y="280" fill="#7e7566" font-family="Arial, sans-serif"
        font-size="11">${escapeXml(compactLabel(detail(entry), 41))}</text>
      <text x="14" y="298" fill="#5f675f" font-family="Arial, sans-serif"
        font-size="9">${escapeXml(compactLabel(entry.id, 48))}</text>
    </svg>
  `);
  return sharp(frame)
    .composite([{ input: art, left: 17, top: 16 }])
    .png()
    .toBuffer();
}

async function buildSheet(pack, entries, batchIndex) {
  const columns = Math.min(COLUMN_LIMIT, entries.length);
  const rows = Math.ceil(entries.length / columns);
  const width = columns * TILE_WIDTH;
  const height = HEADER_HEIGHT + rows * TILE_HEIGHT;
  const first = batchIndex * BATCH_SIZE + 1;
  const last = first + entries.length - 1;
  const background = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#030504"/>
      <text x="20" y="31" fill="#d5a957" font-family="Arial, sans-serif"
        font-size="22" font-weight="700">${escapeXml(pack.title)}</text>
      <text x="20" y="54" fill="#777f77" font-family="Arial, sans-serif"
        font-size="13">Assets ${first}–${last} · ${entries.length} silhouettes</text>
    </svg>
  `);
  const tiles = await Promise.all(
    entries.map((entry) => buildTile(entry, pack.detail)),
  );
  const composites = tiles.map((tile, index) => ({
    input: tile,
    left: (index % columns) * TILE_WIDTH,
    top: HEADER_HEIGHT + Math.floor(index / columns) * TILE_HEIGHT,
  }));
  const outputPath = path.join(
    OUTPUT_ROOT,
    `${pack.id}-${String(batchIndex + 1).padStart(2, "0")}.png`,
  );
  await writeFile(
    outputPath,
    await sharp(background).composite(composites).png().toBuffer(),
  );
  return outputPath;
}

async function main() {
  await mkdir(OUTPUT_ROOT, { recursive: true });
  const outputs = [];
  for (const pack of packs) {
    const manifest = JSON.parse(
      await readFile(path.join(ROOT, pack.manifestPath), "utf8"),
    );
    const candidates = manifest.coverage.complete
      ? manifest.entries
      : JSON.parse(
          await readFile(path.join(ROOT, pack.sourceSpecPath), "utf8"),
        ).entries;
    const entries = (
      await Promise.all(
        candidates.map(async (entry) => {
          try {
            await access(path.join(ROOT, entry.runtimePath));
            return entry;
          } catch {
            return null;
          }
        }),
      )
    ).filter(Boolean);
    if (entries.length === 0) {
      throw new Error(`${pack.id}: aucun asset disponible`);
    }
    for (let offset = 0; offset < entries.length; offset += BATCH_SIZE) {
      outputs.push(
        await buildSheet(
          pack,
          entries.slice(offset, offset + BATCH_SIZE),
          offset / BATCH_SIZE,
        ),
      );
    }
  }
  console.log(
    `Contact sheets trophées : ${outputs.length} planches dans ${path.relative(
      ROOT,
      OUTPUT_ROOT,
    )}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
