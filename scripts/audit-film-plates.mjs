import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const PLATE_ROOT = path.join(
  ROOT,
  "public",
  "game",
  "sprites",
  "v5",
  "film-plates",
);
const MANIFEST_PATH = path.join(PLATE_ROOT, "manifest.json");
const REPORT_PATH = path.join(
  ROOT,
  "art-source",
  "v5",
  "film-plates",
  "qa-report.json",
);

function fail(id, message) {
  throw new Error(`${id}: ${message}`);
}

async function inspectPlate(entry) {
  const platePath = path.join(PLATE_ROOT, `${entry.id}.png`);
  const pipeline = sharp(platePath, { failOn: "error" }).ensureAlpha();
  const { data, info } = await pipeline
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 4) {
    fail(entry.id, `4 canaux RGBA attendus, ${channels} reçus`);
  }

  let visiblePixels = 0;
  let transparentPixels = 0;
  let dirtyTransparentPixels = 0;
  let chromaEdgePixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let index = 0; index < data.length; index += channels) {
    const pixelIndex = index / channels;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = data[index + 3];

    if (alpha === 0) {
      transparentPixels += 1;
      if (red !== 0 || green !== 0 || blue !== 0) {
        dirtyTransparentPixels += 1;
      }
      continue;
    }
    if (alpha <= 16) {
      continue;
    }

    visiblePixels += 1;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);

  }

  const totalPixels = width * height;
  if (visiblePixels === 0 || maxX < minX || maxY < minY) {
    fail(entry.id, "aucun personnage visible");
  }

  const bounds = {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
  const safePadding = Math.max(
    8,
    Math.round(Math.min(width, height) * 0.0125),
  );
  const visibleRatio = visiblePixels / totalPixels;
  const transparentRatio = transparentPixels / totalPixels;
  for (let index = 0; index < data.length; index += channels) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = data[index + 3];
    if (
      alpha < 48 ||
      red > 80 ||
      green < 195 ||
      blue > 100 ||
      green < red + 100 ||
      green < blue + 100
    ) {
      continue;
    }

    const pixelIndex = index / channels;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const neighbours = [
      [x - 2, y],
      [x + 2, y],
      [x, y - 2],
      [x, y + 2],
    ];
    if (
      neighbours.some(([neighbourX, neighbourY]) => {
        if (
          neighbourX < 0 ||
          neighbourX >= width ||
          neighbourY < 0 ||
          neighbourY >= height
        ) {
          return true;
        }
        const neighbourIndex =
          (neighbourY * width + neighbourX) * channels;
        return data[neighbourIndex + 3] <= 16;
      })
    ) {
      chromaEdgePixels += 1;
    }
  }
  const chromaRatio = chromaEdgePixels / visiblePixels;
  const subjectHeightRatio = bounds.height / height;
  const subjectWidthRatio = bounds.width / width;
  const baselineRatio = maxY / (height - 1);

  if (width < 512 || height < 512) {
    fail(entry.id, `résolution insuffisante ${width}x${height}`);
  }
  if (transparentRatio < 0.25) {
    fail(
      entry.id,
      `fond insuffisamment transparent (${(transparentRatio * 100).toFixed(2)} %)`,
    );
  }
  if (visibleRatio < 0.045 || visibleRatio > 0.72) {
    fail(
      entry.id,
      `occupation anormale du cadre (${(visibleRatio * 100).toFixed(2)} %)`,
    );
  }
  if (subjectHeightRatio < 0.5 || subjectWidthRatio < 0.14) {
    fail(
      entry.id,
      `personnage trop petit (${(subjectWidthRatio * 100).toFixed(1)} % × ${(subjectHeightRatio * 100).toFixed(1)} %)`,
    );
  }
  if (
    minX < safePadding ||
    minY < safePadding ||
    maxX > width - 1 - safePadding ||
    maxY > height - 1 - safePadding
  ) {
    fail(
      entry.id,
      `corps ou équipement trop proche du bord (${minX}, ${minY})–(${maxX}, ${maxY}), marge ${safePadding}px`,
    );
  }
  if (chromaRatio > 0.0025) {
    fail(
      entry.id,
      `résidu chroma visible (${(chromaRatio * 100).toFixed(3)} %)`,
    );
  }
  if (dirtyTransparentPixels !== 0) {
    fail(
      entry.id,
      `${dirtyTransparentPixels} pixels transparents conservent une couleur cachée`,
    );
  }

  return {
    id: entry.id,
    width,
    height,
    visiblePixels,
    visibleRatio,
    transparentRatio,
    chromaRatio,
    safePadding,
    bounds,
    baselineRatio,
    subjectHeightRatio,
    subjectWidthRatio,
  };
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    throw new Error("Le manifeste V5 ne contient aucune plaque");
  }

  const entries = [];
  for (const entry of manifest.entries) {
    entries.push(await inspectPlate(entry));
  }

  const baselineRatios = entries.map((entry) => entry.baselineRatio);
  const baselineSpread =
    Math.max(...baselineRatios) - Math.min(...baselineRatios);
  if (baselineSpread > 0.12) {
    throw new Error(
      `Lignes de sol incohérentes : écart ${(baselineSpread * 100).toFixed(2)} %`,
    );
  }

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    result: "passed",
    criteria: {
      minimumResolution: 512,
      minimumTransparentRatio: 0.25,
      minimumSubjectHeightRatio: 0.5,
      minimumSafePaddingRatio: 0.0125,
      maximumVisibleChromaRatio: 0.0025,
      maximumBaselineSpread: 0.12,
      dirtyTransparentPixels: 0,
    },
    summary: {
      plates: entries.length,
      baselineSpread,
      minimumPadding: Math.min(
        ...entries.flatMap((entry) => [
          entry.bounds.x,
          entry.bounds.y,
          entry.width - entry.bounds.x - entry.bounds.width,
          entry.height - entry.bounds.y - entry.bounds.height,
        ]),
      ),
      minimumSubjectHeightRatio: Math.min(
        ...entries.map((entry) => entry.subjectHeightRatio),
      ),
      maximumChromaRatio: Math.max(
        ...entries.map((entry) => entry.chromaRatio),
      ),
    },
    entries,
  };

  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `Audit technique plaques V5 réussi : ${entries.length} exports avec alpha, marges, chroma et ligne de sol validés. L'absence de coupe et l'identité restent soumises au contrôle visuel des planches.`,
  );
  console.log(path.relative(ROOT, REPORT_PATH));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
