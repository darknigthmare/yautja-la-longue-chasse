import { access, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { HUNTER_FILM_PRESETS } from "../app/game/hunterLore.ts";

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
const MAXIMUM_SUBJECT_DIMENSION = 1400;
const MINIMUM_PADDING = 32;
const PADDING_RATIO = 0.06;

async function normalizePlate(id) {
  const platePath = path.join(PLATE_ROOT, `${id}.png`);
  await access(platePath);

  const { data: trimmed, info: trimInfo } = await sharp(platePath, {
    failOn: "error",
  })
    .ensureAlpha()
    .trim({
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      threshold: 10,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  if (trimInfo.width === 0 || trimInfo.height === 0) {
    throw new Error(`${id}: détourage vide`);
  }

  const scale = Math.min(
    1,
    MAXIMUM_SUBJECT_DIMENSION / Math.max(trimInfo.width, trimInfo.height),
  );
  const subjectWidth = Math.max(1, Math.round(trimInfo.width * scale));
  const subjectHeight = Math.max(1, Math.round(trimInfo.height * scale));
  const padding = Math.max(
    MINIMUM_PADDING,
    Math.round(Math.max(subjectWidth, subjectHeight) * PADDING_RATIO),
  );
  const outputWidth = subjectWidth + padding * 2;
  const outputHeight = subjectHeight + padding * 2;

  const subject = await sharp(trimmed)
    .resize(subjectWidth, subjectHeight, {
      fit: "fill",
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toBuffer();
  const { data: rgba, info } = await sharp({
    create: {
      width: outputWidth,
      height: outputHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: subject, left: padding, top: padding }])
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let index = 0; index < rgba.length; index += 4) {
    if (rgba[index + 3] !== 0) continue;
    rgba[index] = 0;
    rgba[index + 1] = 0;
    rgba[index + 2] = 0;
  }

  const output = await sharp(rgba, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
      force: true,
    })
    .toBuffer();
  await writeFile(platePath, output);

  return {
    id,
    source: {
      width: trimInfo.width,
      height: trimInfo.height,
    },
    output: {
      width: outputWidth,
      height: outputHeight,
      subjectWidth,
      subjectHeight,
      padding,
    },
  };
}

async function main() {
  const results = [];
  for (const preset of HUNTER_FILM_PRESETS) {
    results.push(await normalizePlate(preset.id));
  }
  console.log(
    `Plaques V5 normalisées : ${results.length} fichiers détourés au plus près avec ${Math.round(PADDING_RATIO * 100)} % de marge de sécurité.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
