import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const sourceManifestPath = path.join(
  root,
  "public",
  "game",
  "assets",
  "v17",
  "enemy-trophies",
  "manifest.json",
);
const sourceRuntimeRoot = path.dirname(sourceManifestPath);
const artSourceRoot = path.join(
  root,
  "art-source",
  "v18",
  "enemy-trophy-gameplay",
);
const runtimeRoot = path.join(
  root,
  "public",
  "game",
  "assets",
  "v18",
  "enemy-trophy-gameplay",
);
const policyPath = path.join(artSourceRoot, "policy.json");

const CANVAS_SIZE = 256;
const CONTENT_MAX = 224;
const SOURCE_CROP_MARGIN = 4;
const ENCODER_EFFORT = 1;
const BUILD_CONCURRENCY = 6;
const CONSUMERS = ["hunt-canvas", "trophy-wall", "trophy-workshop"];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function roundedRatio(value, total) {
  return Number((value / total).toFixed(6));
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function unique(label, values, expectedCount) {
  assert.equal(values.length, expectedCount, `${label}: count`);
  assert.equal(new Set(values).size, expectedCount, `${label}: uniqueness`);
}

function gameplayPartId(entry) {
  if (entry.id === "enemy-trophy-optique-balistique") {
    return "insignia";
  }
  if (/biomask|masque/i.test(`${entry.id} ${entry.name}`)) {
    return "mask";
  }
  if (
    entry.objectKind === "hard-anatomy" &&
    /colonne|spine|rachis/i.test(`${entry.id} ${entry.name}`)
  ) {
    return "skull-and-spine";
  }
  if (entry.objectKind === "hard-anatomy") {
    return "skull";
  }
  return "insignia";
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (cursor < values.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await mapper(values[index], index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

function expandedCrop(entry) {
  const [minX, minY, maxX, maxY] = entry.validation.bounds;
  const left = Math.max(0, minX - SOURCE_CROP_MARGIN);
  const top = Math.max(0, minY - SOURCE_CROP_MARGIN);
  const right = Math.min(entry.metadata.width - 1, maxX + SOURCE_CROP_MARGIN);
  const bottom = Math.min(entry.metadata.height - 1, maxY + SOURCE_CROP_MARGIN);
  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function targetDimensions(crop) {
  const scale = Math.min(CONTENT_MAX / crop.width, CONTENT_MAX / crop.height);
  return {
    width: Math.max(1, Math.round(crop.width * scale)),
    height: Math.max(1, Math.round(crop.height * scale)),
  };
}

async function inspectTransparent(buffer) {
  const metadata = await sharp(buffer).metadata();
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let visiblePixels = 0;
  let transparentPixels = 0;
  let partialAlphaPixels = 0;
  let visibleGreenPixels = 0;

  for (let index = 0; index < data.length; index += info.channels) {
    const pixelIndex = index / info.channels;
    const x = pixelIndex % info.width;
    const y = Math.floor(pixelIndex / info.width);
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = data[index + 3];

    if (alpha === 0) {
      transparentPixels += 1;
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
    if (
      alpha >= 48 &&
      red <= 95 &&
      green >= 175 &&
      blue <= 125 &&
      green >= red + 75 &&
      green >= blue + 75
    ) {
      visibleGreenPixels += 1;
    }
  }

  assert.ok(visiblePixels > 0, "generated gameplay cutout is empty");
  const totalPixels = info.width * info.height;
  const cornerAlpha = [
    data[3],
    data[(info.width - 1) * info.channels + 3],
    data[(info.height - 1) * info.width * info.channels + 3],
    data[(info.height * info.width - 1) * info.channels + 3],
  ];

  return {
    metadata: {
      bytes: buffer.length,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      sha256: sha256(buffer),
    },
    validation: {
      alpha: metadata.hasAlpha === true,
      cornerAlpha,
      bounds: [minX, minY, maxX, maxY],
      padding: {
        left: minX,
        top: minY,
        right: info.width - 1 - maxX,
        bottom: info.height - 1 - maxY,
      },
      visibleRatio: roundedRatio(visiblePixels, totalPixels),
      transparentRatio: roundedRatio(transparentPixels, totalPixels),
      partialAlphaPixels,
      visibleGreenRatio: roundedRatio(visibleGreenPixels, visiblePixels),
    },
  };
}

async function deriveEntry(sourceEntry) {
  assert.equal(sourceEntry.available, true, `${sourceEntry.id}: unavailable V17 source`);
  assert.equal(
    sourceEntry.inspection.status,
    "passed",
    `${sourceEntry.id}: unaudited V17 source`,
  );
  assert.match(sourceEntry.id, /^enemy-trophy-[a-z0-9-]+$/);

  const sourcePath = path.resolve(root, sourceEntry.runtimePath);
  assert.ok(
    sourcePath.startsWith(`${sourceRuntimeRoot}${path.sep}`),
    `${sourceEntry.id}: escaped V17 runtime root`,
  );
  assert.equal(
    sourcePath.toLowerCase().includes(`${path.sep}v16${path.sep}`),
    false,
    `${sourceEntry.id}: V16 is forbidden`,
  );

  const sourceBuffer = await readFile(sourcePath);
  assert.equal(
    sha256(sourceBuffer),
    sourceEntry.metadata.sha256,
    `${sourceEntry.id}: V17 source hash drift`,
  );

  const crop = expandedCrop(sourceEntry);
  const target = targetDimensions(crop);
  const left = Math.floor((CANVAS_SIZE - target.width) / 2);
  const top = Math.floor((CANVAS_SIZE - target.height) / 2);
  const right = CANVAS_SIZE - target.width - left;
  const bottom = CANVAS_SIZE - target.height - top;
  const runtimeBuffer = await sharp(sourceBuffer)
    .extract(crop)
    .resize(target.width, target.height, {
      fit: "fill",
      kernel: sharp.kernel.nearest,
    })
    .extend({
      top,
      bottom,
      left,
      right,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({
      lossless: true,
      quality: 100,
      alphaQuality: 100,
      effort: ENCODER_EFFORT,
      smartSubsample: false,
    })
    .toBuffer();

  const runtimePath = `public/game/assets/v18/enemy-trophy-gameplay/${sourceEntry.id}.webp`;
  const runtimeUrl = `/game/assets/v18/enemy-trophy-gameplay/${sourceEntry.id}.webp`;
  await writeFile(path.join(root, runtimePath), runtimeBuffer);
  const inspection = await inspectTransparent(runtimeBuffer);
  const partId = gameplayPartId(sourceEntry);

  const publicEntry = {
    id: sourceEntry.id,
    definitionId: sourceEntry.id,
    name: sourceEntry.name,
    objectKind: sourceEntry.objectKind,
    partId,
    franchiseStatus: "project-original",
    enemyIds: sourceEntry.enemyIds,
    enemyNames: sourceEntry.enemyNames,
    rosters: sourceEntry.rosters,
    runtimePath,
    runtimeUrl,
    planned: true,
    available: true,
    consumers: CONSUMERS,
    source: {
      packId: "enemy-trophies-v17",
      definitionId: sourceEntry.id,
      sha256: sourceEntry.metadata.sha256,
    },
    transform: {
      mode: "audited-bounds-resize-and-center",
      sourceCrop: crop,
      targetContent: target,
      canvas: {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
      },
      kernel: "nearest",
      format: "lossless-webp",
      encoderEffort: ENCODER_EFFORT,
    },
    ...inspection,
    inspection: {
      status: "passed",
      notes:
        "Deterministic gameplay derivative of the audited V17 bestiary cutout; no new artwork or franchise archive source used.",
    },
  };

  const artEntry = {
    id: sourceEntry.id,
    definitionId: sourceEntry.id,
    name: sourceEntry.name,
    objectKind: sourceEntry.objectKind,
    partId,
    enemyIds: sourceEntry.enemyIds,
    source: {
      packId: "enemy-trophies-v17",
      runtimePath: sourceEntry.runtimePath,
      bytes: sourceEntry.metadata.bytes,
      width: sourceEntry.metadata.width,
      height: sourceEntry.metadata.height,
      sha256: sourceEntry.metadata.sha256,
      auditedBounds: sourceEntry.validation.bounds,
    },
    output: {
      runtimePath,
      runtimeUrl,
      ...inspection.metadata,
    },
    transform: publicEntry.transform,
  };

  return { artEntry, publicEntry };
}

async function main() {
  const [sourceManifest, policy] = await Promise.all([
    readJson(sourceManifestPath),
    readJson(policyPath),
  ]);

  assert.equal(sourceManifest.packId, "enemy-trophies-v17");
  assert.equal(sourceManifest.packVersion, 17);
  assert.equal(sourceManifest.coverage.complete, true);
  assert.equal(sourceManifest.entries.length, 203);
  assert.equal(sourceManifest.enemyCoverage, 228);
  assert.equal(policy.packId, "enemy-trophy-gameplay-v18");
  assert.equal(policy.packVersion, 18);
  assert.equal(policy.sourcePolicy.sourcePackId, "enemy-trophies-v17");
  assert.deepEqual(policy.sourcePolicy.forbiddenPackIds, [
    "franchise-trophies-v16",
  ]);
  assert.equal(policy.derivationPolicy.canvas.maxDimension, CANVAS_SIZE);
  assert.equal(policy.derivationPolicy.content.maxDimension, CONTENT_MAX);
  assert.equal(policy.derivationPolicy.encoderEffort, ENCODER_EFFORT);

  unique(
    "V17 definition ids",
    sourceManifest.entries.map((entry) => entry.id),
    203,
  );
  unique(
    "V17 enemy ids",
    sourceManifest.entries.flatMap((entry) => entry.enemyIds),
    228,
  );

  await mkdir(runtimeRoot, { recursive: true });
  await mkdir(artSourceRoot, { recursive: true });

  const derivedEntries = await mapWithConcurrency(
    sourceManifest.entries,
    BUILD_CONCURRENCY,
    deriveEntry,
  );
  const artEntries = derivedEntries.map((entry) => entry.artEntry);
  const publicEntries = derivedEntries.map((entry) => entry.publicEntry);

  unique(
    "V18 runtime hashes",
    publicEntries.map((entry) => entry.metadata.sha256),
    203,
  );
  const coverage = {
    definitions: 203,
    enemyIds: 228,
    planned: 203,
    available: 203,
    complete: true,
  };
  const build = {
    kind: "mechanical-runtime-derivative",
    sourcePackId: "enemy-trophies-v17",
    sourcePackVersion: 17,
    maxDimension: CANVAS_SIZE,
    contentMaxDimension: CONTENT_MAX,
    transparentCanvas: true,
    format: "lossless-webp",
    encoderEffort: ENCODER_EFFORT,
    buildConcurrency: BUILD_CONCURRENCY,
    deterministic: true,
  };

  await writeJson(path.join(artSourceRoot, "manifest.json"), {
    schemaVersion: 1,
    packId: "enemy-trophy-gameplay-v18",
    packVersion: 18,
    authority: sourceManifestPath
      .slice(root.length + 1)
      .split(path.sep)
      .join("/"),
    coverage,
    build,
    entries: artEntries,
  });
  await writeJson(path.join(runtimeRoot, "manifest.json"), {
    schemaVersion: 1,
    packId: "enemy-trophy-gameplay-v18",
    packVersion: 18,
    generator: "mechanical-v17-alpha-resize",
    assetRoot: "/game/assets/v18/enemy-trophy-gameplay",
    coverage,
    build,
    entries: publicEntries,
  });

  const totalBytes = publicEntries.reduce(
    (sum, entry) => sum + entry.metadata.bytes,
    0,
  );
  console.log(
    `Assets gameplay V18 construits : 203 trophées, 228 enemyIds, ${totalBytes} octets, exports transparents ${CANVAS_SIZE} px.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
