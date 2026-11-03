import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function roundedRatio(value, total) {
  return Number((value / total).toFixed(6));
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function inspectSource(relativePath) {
  const buffer = await readFile(path.join(root, relativePath));
  const metadata = await sharp(buffer).metadata();

  return {
    bytes: buffer.length,
    width: metadata.width,
    height: metadata.height,
    sha256: sha256(buffer),
  };
}

async function inspectRuntime(relativePath) {
  const buffer = await readFile(path.join(root, relativePath));
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
      red <= 90 &&
      green >= 180 &&
      blue <= 120 &&
      green >= red + 85 &&
      green >= blue + 85
    ) {
      visibleGreenPixels += 1;
    }
  }

  if (visiblePixels === 0) {
    throw new Error(`${relativePath}: runtime cutout is empty`);
  }

  const totalPixels = info.width * info.height;
  const bounds = [minX, minY, maxX, maxY];
  const padding = {
    left: minX,
    top: minY,
    right: info.width - 1 - maxX,
    bottom: info.height - 1 - maxY,
  };
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
      bounds,
      padding,
      visibleRatio: roundedRatio(visiblePixels, totalPixels),
      transparentRatio: roundedRatio(transparentPixels, totalPixels),
      partialAlphaPixels,
      visibleGreenRatio: roundedRatio(visibleGreenPixels, visiblePixels),
    },
  };
}

function coverageFor(entries) {
  const planned = entries.filter((entry) => entry.planned).length;
  const available = entries.filter((entry) => entry.available).length;
  return {
    planned,
    available,
    complete: planned === available,
  };
}

async function writeJson(relativePath, value) {
  const outputPath = path.join(root, relativePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function buildHunterKitV14() {
  const sourceRoot = path.join(root, "art-source", "v14", "hunter-kit");
  const shardFiles = ["masks.json", "equipment.json", "trophies.json"];
  const entries = [];

  for (const shardFile of shardFiles) {
    const shard = await readJson(path.join(sourceRoot, "manifests", shardFile));
    for (const sourceEntry of shard.entries) {
      const { masterPath, ...publicEntry } = sourceEntry;
      const sourceMetadata = await inspectSource(masterPath);
      const runtimeInspection = await inspectRuntime(sourceEntry.runtimePath);
      entries.push({
        ...publicEntry,
        sourceMetadata,
        ...runtimeInspection,
        shard: shardFile,
      });
    }
  }

  await writeJson("public/game/assets/v14/hunter-kit/manifest.json", {
    schemaVersion: 1,
    packId: "hunter-kit-v14",
    packVersion: 14,
    generator: "OpenAI ImageGen",
    assetRoot: "/game/assets/v14/hunter-kit",
    selectionPriority: [
      "exact-override",
      "family",
      "approximation",
      "generic",
    ],
    coverage: coverageFor(entries),
    entries,
  });

  return entries.length;
}

async function buildPlayableTrophiesV15() {
  const sourceManifest = await readJson(
    path.join(root, "art-source", "v15", "trophies", "source-specs.json"),
  );
  const entries = [];

  for (const sourceEntry of sourceManifest.entries) {
    const { masterPath, ...publicEntry } = sourceEntry;
    const sourceMetadata = await inspectSource(masterPath);
    const runtimeInspection = await inspectRuntime(sourceEntry.runtimePath);
    entries.push({
      ...publicEntry,
      sourceMetadata,
      ...runtimeInspection,
    });
  }

  await writeJson("public/game/assets/v15/trophies/manifest.json", {
    schemaVersion: 1,
    packId: "playable-trophies-v15",
    packVersion: 15,
    generator: "OpenAI ImageGen",
    assetRoot: "/game/assets/v15/trophies",
    coverage: coverageFor(entries),
    entries,
  });

  return entries.length;
}

async function buildFranchiseTrophiesV16() {
  const sourceManifest = await readJson(
    path.join(
      root,
      "art-source",
      "v16",
      "franchise-trophies",
      "source-specs.json",
    ),
  );
  const entries = [];

  for (const sourceEntry of sourceManifest.entries) {
    const { masterPath, ...publicEntry } = sourceEntry;
    delete publicEntry.referencePage;
    delete publicEntry.referenceImageUrl;
    delete publicEntry.assetDecision;
    const sourceMetadata = await inspectSource(masterPath);
    const runtimeInspection = await inspectRuntime(sourceEntry.runtimePath);
    entries.push({
      ...publicEntry,
      sourceMetadata,
      ...runtimeInspection,
    });
  }

  await writeJson("public/game/assets/v16/franchise-trophies/manifest.json", {
    schemaVersion: 1,
    packId: "franchise-trophies-v16",
    packVersion: 16,
    generator: "OpenAI ImageGen",
    assetRoot: "/game/assets/v16/franchise-trophies",
    coverage: coverageFor(entries),
    entries,
  });

  return entries.length;
}

async function buildEnemyTrophiesV17() {
  const sourceManifest = await readJson(
    path.join(root, "art-source", "v17", "enemy-trophies", "source-specs.json"),
  );
  const entries = [];

  for (const sourceEntry of sourceManifest.entries) {
    const { masterPath, ...publicEntry } = sourceEntry;
    delete publicEntry.referenceSheetPaths;
    delete publicEntry.enemyBehaviors;
    const sourceMetadata = await inspectSource(masterPath);
    const runtimeInspection = await inspectRuntime(sourceEntry.runtimePath);
    entries.push({
      ...publicEntry,
      sourceMetadata,
      ...runtimeInspection,
    });
  }

  await writeJson("public/game/assets/v17/enemy-trophies/manifest.json", {
    schemaVersion: 1,
    packId: "enemy-trophies-v17",
    packVersion: 17,
    generator: "OpenAI ImageGen",
    assetRoot: "/game/assets/v17/enemy-trophies",
    enemyCoverage: sourceManifest.coverage.enemies,
    distinctTrophyCoverage: sourceManifest.coverage.distinctTrophies,
    coverage: coverageFor(entries),
    entries,
  });

  return entries.length;
}

const [
  hunterKitCount,
  playableTrophyCount,
  franchiseTrophyCount,
  enemyTrophyCount,
] = await Promise.all([
  buildHunterKitV14(),
  buildPlayableTrophiesV15(),
  buildFranchiseTrophiesV16(),
  buildEnemyTrophiesV17(),
]);

console.log(
  `Manifestes cutouts reconstruits : ${hunterKitCount} assets V14, ${playableTrophyCount} trophees jouables V15, ${franchiseTrophyCount} designs franchise V16 et ${enemyTrophyCount} prises de bestiaire V17.`,
);
