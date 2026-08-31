import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { ENVIRONMENT_PROP_SPECS } from "../app/game/environmentPropCatalogue.ts";
import { BIOME_DECOR_V19_BIOMES } from "./process-biome-decor-v19.mjs";

sharp.cache(false);

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const DEFAULT_ART_ROOT = path.join(
  projectRoot,
  "art-source",
  "v19",
  "biome-decor",
);
const DEFAULT_PUBLIC_ROOT = path.join(
  projectRoot,
  "public",
  "game",
  "assets",
  "v19",
  "biome-decor",
);
function usage() {
  return `Usage:
  node scripts/audit-biome-decor-v19.mjs [options]

Options:
  --art-root <path>             Override art-source V19 root
  --public-root <path>          Override runtime V19 root
  --expected-per-biome <count>  Expected count (default: 100)
  --minimum-padding <pixels>    Runtime safe padding (default: 24)
  --qa-report <path>            Override qa-report.json destination
  --contact-root <path>         Override contact-sheets destination
  --contact-cell-size <pixels>  Contact-sheet cell size (default: 160)
  --check-only                  Validate without writing QA artifacts`;
}

function parseArguments(argv) {
  const values = new Map();
  let writeArtifacts = true;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--check-only") {
      writeArtifacts = false;
      continue;
    }
    if (!token.startsWith("--")) {
      throw new Error(`Argument inattendu: ${token}`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Valeur manquante pour ${token}`);
    }
    values.set(token.slice(2), value);
    index += 1;
  }
  const integer = (name, fallback) => {
    const value = Number.parseInt(values.get(name) ?? String(fallback), 10);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Valeur entière invalide pour --${name}: ${value}`);
    }
    return value;
  };
  return {
    artRoot: values.get("art-root"),
    publicRoot: values.get("public-root"),
    expectedPerBiome: integer("expected-per-biome", 100),
    minimumPadding: integer("minimum-padding", 24),
    qaReportPath: values.get("qa-report"),
    contactRoot: values.get("contact-root"),
    contactCellSize: integer("contact-cell-size", 160),
    writeArtifacts,
  };
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function roundedRatio(value, total) {
  return Number((value / total).toFixed(6));
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : Math.round((ordered[middle - 1] + ordered[middle]) / 2);
}

function rgbDistance(left, right) {
  return Math.sqrt(
    (left[0] - right[0]) ** 2 +
      (left[1] - right[1]) ** 2 +
      (left[2] - right[2]) ** 2,
  );
}

function keyFamily([red, green, blue]) {
  if (
    green >= 180 &&
    green >= red + 85 &&
    green >= blue + 85
  ) {
    return "green";
  }
  if (
    red >= 160 &&
    blue >= 160 &&
    Math.min(red, blue) >= green + 70 &&
    Math.abs(red - blue) <= 96
  ) {
    return "magenta";
  }
  return "unknown";
}

function isVisibleKeyPixel(red, green, blue, alpha, family) {
  if (alpha < 48) {
    return false;
  }
  if (family === "green") {
    return (
      red <= 90 &&
      green >= 180 &&
      blue <= 120 &&
      green >= red + 85 &&
      green >= blue + 85
    );
  }
  return (
    red >= 180 &&
    blue >= 180 &&
    green <= 110 &&
    Math.min(red, blue) >= green + 80
  );
}

function sampleBorder(data, info) {
  const samples = [];
  const band = Math.max(1, Math.min(info.width, info.height, 6));
  const step = Math.max(1, Math.floor(Math.min(info.width, info.height) / 256));
  const append = (x, y) => {
    const offset = (y * info.width + x) * info.channels;
    samples.push([data[offset], data[offset + 1], data[offset + 2]]);
  };
  for (let x = 0; x < info.width; x += step) {
    for (let y = 0; y < band; y += 1) {
      append(x, y);
      append(x, info.height - 1 - y);
    }
  }
  for (let y = 0; y < info.height; y += step) {
    for (let x = 0; x < band; x += 1) {
      append(x, y);
      append(info.width - 1 - x, y);
    }
  }
  const sampledKey = [
    median(samples.map((sample) => sample[0])),
    median(samples.map((sample) => sample[1])),
    median(samples.map((sample) => sample[2])),
  ];
  const compatible = samples.filter(
    (sample) => rgbDistance(sample, sampledKey) <= 24,
  ).length;
  return {
    sampledKey,
    family: keyFamily(sampledKey),
    compatibleRatio: roundedRatio(compatible, samples.length),
  };
}

async function listWebpRecursive(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await listWebpRecursive(entryPath)));
      } else if (entry.isFile() && entry.name.endsWith(".webp")) {
        files.push(entryPath);
      }
    }
    return files.sort();
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function inspectMaster(masterPath) {
  const buffer = await readFile(masterPath);
  const metadata = await sharp(buffer).metadata();
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const border = sampleBorder(data, info);
  if (metadata.format !== "webp") {
    throw new Error(`format master ${metadata.format}, WebP attendu`);
  }
  if (metadata.hasAlpha === true) {
    throw new Error("le master chroma ne doit pas conserver de canal alpha");
  }
  if (border.family === "unknown") {
    throw new Error("le bord du master n'est ni un chroma vert ni magenta");
  }
  if (border.compatibleRatio < 0.95) {
    throw new Error(
      `bord chroma insuffisamment uniforme (${(
        border.compatibleRatio * 100
      ).toFixed(2)} %)`,
    );
  }
  return {
    bytes: buffer.length,
    width: metadata.width,
    height: metadata.height,
    sha256: sha256(buffer),
    ...border,
  };
}

export async function inspectRuntime(runtimePath, master, minimumPadding) {
  const buffer = await readFile(runtimePath);
  const metadata = await sharp(buffer).metadata();
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (metadata.format !== "webp") {
    throw new Error(`format runtime ${metadata.format}, WebP attendu`);
  }
  if (metadata.hasAlpha !== true || info.channels !== 4) {
    throw new Error("runtime RGBA avec canal alpha requis");
  }
  if (Math.max(info.width, info.height) > 768) {
    throw new Error(
      `runtime ${info.width}x${info.height}, dimension maximale 768 px attendue`,
    );
  }
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let visiblePixels = 0;
  let transparentPixels = 0;
  let partialAlphaPixels = 0;
  let dirtyTransparentPixels = 0;
  let visibleKeyPixels = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const pixelIndex = offset / info.channels;
    const x = pixelIndex % info.width;
    const y = Math.floor(pixelIndex / info.width);
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const alpha = data[offset + 3];
    if (alpha === 0) {
      transparentPixels += 1;
      if (red || green || blue) {
        dirtyTransparentPixels += 1;
      }
    } else if (alpha < 255) {
      partialAlphaPixels += 1;
    }
    if (alpha <= 16) {
      continue;
    }
    visiblePixels += 1;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    if (isVisibleKeyPixel(red, green, blue, alpha, master.family)) {
      visibleKeyPixels += 1;
    }
  }
  if (visiblePixels === 0) {
    throw new Error("runtime entièrement transparent");
  }
  const totalPixels = info.width * info.height;
  const visibleRatio = visiblePixels / totalPixels;
  const transparentRatio = transparentPixels / totalPixels;
  const visibleKeyRatio = visibleKeyPixels / visiblePixels;
  const padding = {
    left: minX,
    top: minY,
    right: info.width - 1 - maxX,
    bottom: info.height - 1 - maxY,
  };
  const alphaAt = (x, y) =>
    data[(y * info.width + x) * info.channels + 3];
  const cornerAlpha = [
    alphaAt(0, 0),
    alphaAt(info.width - 1, 0),
    alphaAt(0, info.height - 1),
    alphaAt(info.width - 1, info.height - 1),
  ];

  if (visibleRatio < 0.03 || visibleRatio > 0.75) {
    throw new Error(
      `occupation anormale du cadre (${(visibleRatio * 100).toFixed(2)} %)`,
    );
  }
  if (transparentRatio < 0.25) {
    throw new Error(
      `fond insuffisamment transparent (${(
        transparentRatio * 100
      ).toFixed(2)} %)`,
    );
  }
  if (Math.min(...Object.values(padding)) < minimumPadding) {
    throw new Error(
      `marge ${Math.min(...Object.values(padding))} px, ` +
        `${minimumPadding} px attendus`,
    );
  }
  if (cornerAlpha.some((alpha) => alpha !== 0)) {
    throw new Error(`coins opaques: ${cornerAlpha.join(",")}`);
  }
  if (visibleKeyRatio > 0.0005) {
    throw new Error(
      `résidu chroma visible (${(visibleKeyRatio * 100).toFixed(4)} %)`,
    );
  }

  return {
    bytes: buffer.length,
    width: metadata.width,
    height: metadata.height,
    channels: metadata.channels,
    sha256: sha256(buffer),
    bounds: [minX, minY, maxX, maxY],
    padding,
    cornerAlpha,
    visibleRatio: Number(visibleRatio.toFixed(6)),
    transparentRatio: Number(transparentRatio.toFixed(6)),
    partialAlphaPixels,
    dirtyTransparentPixels,
    visibleKeyRatio: Number(visibleKeyRatio.toFixed(6)),
  };
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function buildContactSheet({
  biome,
  entries,
  outputPath,
  cellSize,
}) {
  const columns = Math.ceil(Math.sqrt(entries.length));
  const rows = Math.ceil(entries.length / columns);
  const width = columns * cellSize;
  const height = rows * cellSize;
  const labelHeight = Math.max(20, Math.round(cellSize * 0.16));
  const checkerSize = Math.max(8, Math.round(cellSize / 10));
  const labels = entries
    .map((entry, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = column * cellSize + cellSize / 2;
      const y = row * cellSize + cellSize - Math.round(labelHeight * 0.35);
      return `<text x="${x}" y="${y}" text-anchor="middle" ` +
        `font-family="sans-serif" font-size="${Math.max(
          9,
          Math.round(cellSize * 0.065),
        )}" fill="#ffffff">${escapeXml(entry.id)}</text>`;
    })
    .join("");
  const base = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<defs><pattern id="checker" width="${checkerSize * 2}" ` +
      `height="${checkerSize * 2}" patternUnits="userSpaceOnUse">` +
      `<rect width="${checkerSize * 2}" height="${checkerSize * 2}" fill="#25282d"/>` +
      `<rect width="${checkerSize}" height="${checkerSize}" fill="#3b3f46"/>` +
      `<rect x="${checkerSize}" y="${checkerSize}" width="${checkerSize}" ` +
      `height="${checkerSize}" fill="#3b3f46"/></pattern></defs>` +
      `<rect width="100%" height="100%" fill="url(#checker)"/>` +
      `<rect width="100%" height="${Math.max(22, labelHeight)}" fill="#101216"/>` +
      `<text x="10" y="${Math.max(16, Math.round(labelHeight * 0.72))}" ` +
      `font-family="sans-serif" font-size="${Math.max(
        12,
        Math.round(labelHeight * 0.58),
      )}" fill="#ffffff">V19 ${escapeXml(biome)} — ${entries.length} objets</text>` +
      labels +
      `</svg>`,
  );
  const composites = [];
  const availableWidth = cellSize - Math.max(12, Math.round(cellSize * 0.1));
  const availableHeight =
    cellSize - labelHeight - Math.max(12, Math.round(cellSize * 0.1));
  for (const [index, entry] of entries.entries()) {
    const { data: thumbnail, info } = await sharp(entry.runtimePath)
      .resize(availableWidth, availableHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer({ resolveWithObject: true });
    const column = index % columns;
    const row = Math.floor(index / columns);
    composites.push({
      input: thumbnail,
      left:
        column * cellSize +
        Math.max(0, Math.floor((cellSize - info.width) / 2)),
      top:
        row * cellSize +
        Math.max(0, Math.floor((availableHeight - info.height) / 2)),
    });
  }
  const output = await sharp(base)
    .composite(composites)
    .webp({ quality: 92, effort: 6 })
    .toBuffer();
  await writeFile(outputPath, output);
  return {
    biome,
    path: outputPath,
    width,
    height,
    bytes: output.length,
    sha256: sha256(output),
  };
}

function destinationFromSpec(specPath, defaultRoot, overrideRoot) {
  const canonicalPath = path.resolve(projectRoot, specPath);
  if (!overrideRoot) {
    return canonicalPath;
  }
  const relativePath = path.relative(defaultRoot, canonicalPath);
  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`Chemin catalogue hors racine V19: ${specPath}`);
  }
  return path.resolve(overrideRoot, relativePath);
}

export class BiomeDecorV19AuditError extends Error {
  constructor(report) {
    super(
      `Audit décor V19 incomplet ou invalide: ${report.errors.length} erreur(s)`,
    );
    this.name = "BiomeDecorV19AuditError";
    this.report = report;
  }
}

export async function auditBiomeDecorV19(options = {}) {
  const {
    artRoot = DEFAULT_ART_ROOT,
    publicRoot = DEFAULT_PUBLIC_ROOT,
    expectedPerBiome = 100,
    minimumPadding = 24,
    qaReportPath = path.join(artRoot, "qa-report.json"),
    contactRoot = path.join(artRoot, "contact-sheets"),
    contactCellSize = 160,
    writeArtifacts = true,
  } = options;
  const errors = [];
  const entries = [];
  const counts = {};

  for (const biome of BIOME_DECOR_V19_BIOMES) {
    const biomeSpecs = ENVIRONMENT_PROP_SPECS.filter(
      (spec) => spec.biomeId === biome,
    ).slice(0, expectedPerBiome);
    const masterDirectory = path.join(artRoot, biome);
    const runtimeDirectory = path.join(publicRoot, biome);
    const masterFiles = await listWebpRecursive(masterDirectory);
    const runtimeFiles = await listWebpRecursive(runtimeDirectory);
    const expectedMasterPaths = new Map(
      biomeSpecs.map((spec) => [
        destinationFromSpec(spec.masterPath, DEFAULT_ART_ROOT, artRoot),
        spec,
      ]),
    );
    const expectedRuntimePaths = new Map(
      biomeSpecs.map((spec) => [
        destinationFromSpec(spec.runtimePath, DEFAULT_PUBLIC_ROOT, publicRoot),
        spec,
      ]),
    );
    counts[biome] = {
      expected: expectedPerBiome,
      catalogue: biomeSpecs.length,
      masters: masterFiles.length,
      runtimes: runtimeFiles.length,
      complete:
        biomeSpecs.length === expectedPerBiome &&
        masterFiles.length === expectedPerBiome &&
        runtimeFiles.length === expectedPerBiome,
    };
    if (biomeSpecs.length !== expectedPerBiome) {
      errors.push(
        `${biome}: ${biomeSpecs.length} définitions catalogue, ` +
          `${expectedPerBiome} attendues`,
      );
    }
    if (masterFiles.length !== expectedPerBiome) {
      errors.push(
        `${biome}: ${masterFiles.length} masters, ${expectedPerBiome} attendus`,
      );
    }
    if (runtimeFiles.length !== expectedPerBiome) {
      errors.push(
        `${biome}: ${runtimeFiles.length} runtimes, ${expectedPerBiome} attendus`,
      );
    }
    if (!counts[biome].complete) {
      continue;
    }
    const masterSet = new Set(masterFiles.map((file) => path.resolve(file)));
    const runtimeSet = new Set(runtimeFiles.map((file) => path.resolve(file)));
    for (const masterPath of expectedMasterPaths.keys()) {
      if (!masterSet.has(masterPath)) {
        errors.push(
          `${biome}: master catalogue manquant ${path.relative(
            artRoot,
            masterPath,
          )}`,
        );
      }
    }
    for (const runtimePath of expectedRuntimePaths.keys()) {
      if (!runtimeSet.has(runtimePath)) {
        errors.push(
          `${biome}: runtime catalogue manquant ${path.relative(
            publicRoot,
            runtimePath,
          )}`,
        );
      }
    }
    for (const masterPath of masterSet) {
      if (!expectedMasterPaths.has(masterPath)) {
        errors.push(
          `${biome}: master hors catalogue ${path.relative(
            artRoot,
            masterPath,
          )}`,
        );
      }
    }
    for (const runtimePath of runtimeSet) {
      if (!expectedRuntimePaths.has(runtimePath)) {
        errors.push(
          `${biome}: runtime hors catalogue ${path.relative(
            publicRoot,
            runtimePath,
          )}`,
        );
      }
    }
    for (const spec of biomeSpecs) {
      const masterPath = destinationFromSpec(
        spec.masterPath,
        DEFAULT_ART_ROOT,
        artRoot,
      );
      const runtimePath = destinationFromSpec(
        spec.runtimePath,
        DEFAULT_PUBLIC_ROOT,
        publicRoot,
      );
      try {
        const master = await inspectMaster(masterPath);
        const runtime = await inspectRuntime(
          runtimePath,
          master,
          minimumPadding,
        );
        entries.push({
          id: spec.id,
          definitionId: spec.definitionId,
          biome,
          masterPath,
          runtimePath,
          master,
          runtime,
        });
      } catch (error) {
        errors.push(`${biome}/${spec.definitionId}: ${error.message}`);
      }
    }
  }

  const masterHashes = new Map();
  const runtimeHashes = new Map();
  for (const entry of entries) {
    const identity = `${entry.biome}/${entry.id}`;
    const priorMaster = masterHashes.get(entry.master.sha256);
    const priorRuntime = runtimeHashes.get(entry.runtime.sha256);
    if (priorMaster) {
      errors.push(
        `${identity}: master identique à ${priorMaster} ` +
          `(${entry.master.sha256})`,
      );
    } else {
      masterHashes.set(entry.master.sha256, identity);
    }
    if (priorRuntime) {
      errors.push(
        `${identity}: runtime identique à ${priorRuntime} ` +
          `(${entry.runtime.sha256})`,
      );
    } else {
      runtimeHashes.set(entry.runtime.sha256, identity);
    }
  }

  const expectedTotal =
    BIOME_DECOR_V19_BIOMES.length * expectedPerBiome;
  const report = {
    schemaVersion: 1,
    packId: "biome-decor-v19",
    packVersion: 19,
    generatedAt: new Date().toISOString(),
    valid: errors.length === 0 && entries.length === expectedTotal,
    complete: errors.length === 0 && entries.length === expectedTotal,
    criteria: {
      biomes: BIOME_DECOR_V19_BIOMES.length,
      expectedPerBiome,
      expectedTotal,
      minimumPadding,
      minimumTransparentRatio: 0.25,
      minimumVisibleRatio: 0.03,
      maximumVisibleRatio: 0.75,
      maximumVisibleKeyRatio: 0.0005,
      maximumRuntimeDimension: 768,
      dirtyTransparentPixels: "informational-only-for-webp-alpha",
      uniqueMasterSha256: true,
      uniqueRuntimeSha256: true,
    },
    counts,
    summary: {
      inspected: entries.length,
      uniqueMasterHashes: masterHashes.size,
      uniqueRuntimeHashes: runtimeHashes.size,
      totalMasterBytes: entries.reduce(
        (total, entry) => total + entry.master.bytes,
        0,
      ),
      totalRuntimeBytes: entries.reduce(
        (total, entry) => total + entry.runtime.bytes,
        0,
      ),
    },
    errors,
    entries: entries.map((entry) => ({
      id: entry.id,
      definitionId: entry.definitionId,
      biome: entry.biome,
      master: entry.master,
      runtime: entry.runtime,
    })),
  };

  if (!report.complete) {
    throw new BiomeDecorV19AuditError(report);
  }
  if (writeArtifacts) {
    await mkdir(path.dirname(qaReportPath), { recursive: true });
    await mkdir(contactRoot, { recursive: true });
    const contactSheets = [];
    for (const biome of BIOME_DECOR_V19_BIOMES) {
      const biomeEntries = entries
        .filter((entry) => entry.biome === biome)
        .sort((left, right) => left.id.localeCompare(right.id));
      contactSheets.push(
        await buildContactSheet({
          biome,
          entries: biomeEntries,
          outputPath: path.join(contactRoot, `${biome}-contact-sheet.webp`),
          cellSize: contactCellSize,
        }),
      );
    }
    report.contactSheets = contactSheets;
    await writeFile(
      qaReportPath,
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
  }
  return report;
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }
  const options = parseArguments(process.argv.slice(2));
  try {
    const report = await auditBiomeDecorV19(options);
    console.log(
      `Audit décor V19 réussi: ${report.summary.inspected} WebP RGBA, ` +
        `${report.summary.uniqueRuntimeHashes} hashes runtime uniques.`,
    );
    if (options.writeArtifacts) {
      console.log(
        `QA: ${path.resolve(options.qaReportPath ?? path.join(
          options.artRoot ?? DEFAULT_ART_ROOT,
          "qa-report.json",
        ))}`,
      );
    }
  } catch (error) {
    if (error instanceof BiomeDecorV19AuditError) {
      for (const message of error.report.errors) {
        console.error(`- ${message}`);
      }
    }
    throw error;
  }
}

const invokedAsScript =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
