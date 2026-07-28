import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
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
const artRoot = path.join(
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

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function unique(label, values, expectedCount) {
  assert.equal(values.length, expectedCount, `${label}: count`);
  assert.equal(new Set(values).size, expectedCount, `${label}: uniqueness`);
}

async function inspectRuntime(entry) {
  const filePath = path.resolve(root, entry.runtimePath);
  assert.ok(
    filePath.startsWith(`${runtimeRoot}${path.sep}`),
    `${entry.id}: escaped V18 runtime root`,
  );
  const buffer = await readFile(filePath);
  const metadata = await sharp(buffer).metadata();
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  assert.equal(metadata.format, "webp", `${entry.id}: runtime format`);
  assert.equal(metadata.hasAlpha, true, `${entry.id}: missing alpha`);
  assert.equal(metadata.width, 256, `${entry.id}: runtime width`);
  assert.equal(metadata.height, 256, `${entry.id}: runtime height`);
  assert.equal(buffer.length, entry.metadata.bytes, `${entry.id}: bytes`);
  assert.equal(metadata.channels, entry.metadata.channels, `${entry.id}: channels`);
  assert.equal(sha256(buffer), entry.metadata.sha256, `${entry.id}: hash`);

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let visiblePixels = 0;
  let transparentPixels = 0;
  let visibleGreenPixels = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    const alpha = data[index + 3];
    if (alpha === 0) {
      transparentPixels += 1;
    }
    if (alpha <= 16) {
      continue;
    }
    const pixelIndex = index / info.channels;
    const x = pixelIndex % info.width;
    const y = Math.floor(pixelIndex / info.width);
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
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

  assert.ok(visiblePixels > 0, `${entry.id}: empty runtime`);
  const totalPixels = info.width * info.height;
  const transparentRatio = transparentPixels / totalPixels;
  const visibleRatio = visiblePixels / totalPixels;
  const visibleGreenRatio = visibleGreenPixels / visiblePixels;
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

  assert.ok(visibleRatio >= 0.01 && visibleRatio <= 0.78, `${entry.id}: coverage`);
  assert.ok(transparentRatio >= 0.2, `${entry.id}: transparency`);
  assert.ok(
    Math.min(padding.left, padding.top, padding.right, padding.bottom) >= 15,
    `${entry.id}: unsafe gameplay padding`,
  );
  assert.deepEqual(cornerAlpha, [0, 0, 0, 0], `${entry.id}: opaque corner`);
  assert.ok(visibleGreenRatio <= 0.001, `${entry.id}: visible chroma fringe`);
  assert.deepEqual(entry.validation.bounds, [minX, minY, maxX, maxY]);
  assert.deepEqual(entry.validation.padding, padding);
  assert.deepEqual(entry.validation.cornerAlpha, cornerAlpha);
}

async function main() {
  const [sourceManifest, policy, artManifest, runtimeManifestText] =
    await Promise.all([
      readJson(sourceManifestPath),
      readJson(path.join(artRoot, "policy.json")),
      readJson(path.join(artRoot, "manifest.json")),
      readFile(path.join(runtimeRoot, "manifest.json"), "utf8"),
    ]);
  const runtimeManifest = JSON.parse(runtimeManifestText);

  assert.equal(sourceManifest.packId, "enemy-trophies-v17");
  assert.equal(sourceManifest.packVersion, 17);
  assert.equal(sourceManifest.entries.length, 203);
  assert.equal(policy.packId, "enemy-trophy-gameplay-v18");
  assert.equal(policy.packVersion, 18);
  assert.equal(policy.sourcePolicy.sourcePackId, "enemy-trophies-v17");
  assert.deepEqual(policy.sourcePolicy.forbiddenPackIds, [
    "franchise-trophies-v16",
  ]);
  assert.deepEqual(policy.consumerPolicy.allowed, [
    "hunt-canvas",
    "trophy-wall",
    "trophy-workshop",
  ]);
  assert.deepEqual(policy.consumerPolicy.forbidden, [
    "enemy-bestiary-v7",
    "enemy-bestiary-v8",
    "franchise-archive",
  ]);
  assert.equal(policy.derivationPolicy.canvas.maxDimension, 256);
  assert.equal(policy.derivationPolicy.content.maxDimension, 224);
  assert.equal(policy.derivationPolicy.encoderEffort, 1);
  assert.equal(policy.derivationPolicy.alphaRequired, true);
  assert.equal(policy.derivationPolicy.deterministic, true);

  for (const manifest of [artManifest, runtimeManifest]) {
    assert.equal(manifest.packId, "enemy-trophy-gameplay-v18");
    assert.equal(manifest.packVersion, 18);
    assert.equal(manifest.coverage.definitions, 203);
    assert.equal(manifest.coverage.enemyIds, 228);
    assert.equal(manifest.coverage.available, 203);
    assert.equal(manifest.coverage.complete, true);
    assert.equal(manifest.entries.length, 203);
  }

  assert.equal(/art-source[\\/]/i.test(runtimeManifestText), false);
  assert.equal(/prompt/i.test(runtimeManifestText), false);
  assert.equal(/franchise-trophies-v16/i.test(runtimeManifestText), false);
  assert.equal(/[\\/]v16[\\/]/i.test(runtimeManifestText), false);

  const sourceById = new Map(
    sourceManifest.entries.map((entry) => [entry.id, entry]),
  );
  const artById = new Map(artManifest.entries.map((entry) => [entry.id, entry]));
  unique(
    "V18 definition ids",
    runtimeManifest.entries.map((entry) => entry.definitionId),
    203,
  );
  unique(
    "V18 enemy ids",
    runtimeManifest.entries.flatMap((entry) => entry.enemyIds),
    228,
  );
  unique(
    "V18 hashes",
    runtimeManifest.entries.map((entry) => entry.metadata.sha256),
    203,
  );

  const partIds = new Set([
    "skull",
    "skull-and-spine",
    "mask",
    "insignia",
  ]);
  for (const runtimeEntry of runtimeManifest.entries) {
    const sourceEntry = sourceById.get(runtimeEntry.definitionId);
    const artEntry = artById.get(runtimeEntry.definitionId);
    assert.ok(sourceEntry, `${runtimeEntry.id}: missing V17 authority`);
    assert.ok(artEntry, `${runtimeEntry.id}: missing art-source provenance`);
    assert.equal(runtimeEntry.id, sourceEntry.id);
    assert.equal(runtimeEntry.name, sourceEntry.name);
    assert.equal(runtimeEntry.objectKind, sourceEntry.objectKind);
    assert.equal(runtimeEntry.franchiseStatus, "project-original");
    assert.deepEqual(runtimeEntry.enemyIds, sourceEntry.enemyIds);
    assert.deepEqual(runtimeEntry.enemyNames, sourceEntry.enemyNames);
    assert.deepEqual(runtimeEntry.rosters, sourceEntry.rosters);
    assert.ok(partIds.has(runtimeEntry.partId), `${runtimeEntry.id}: partId`);
    if (runtimeEntry.definitionId === "enemy-trophy-optique-balistique") {
      assert.equal(runtimeEntry.name, "Optique balistique");
      assert.equal(runtimeEntry.partId, "insignia");
    }
    assert.equal(runtimeEntry.source.packId, "enemy-trophies-v17");
    assert.equal(runtimeEntry.source.definitionId, sourceEntry.id);
    assert.equal(runtimeEntry.source.sha256, sourceEntry.metadata.sha256);
    assert.deepEqual(runtimeEntry.consumers, policy.consumerPolicy.allowed);
    assert.equal(runtimeEntry.available, true);
    assert.equal(runtimeEntry.inspection.status, "passed");
    assert.equal(runtimeEntry.metadata.width <= 256, true);
    assert.equal(runtimeEntry.metadata.height <= 256, true);
    assert.equal(
      artEntry.source.runtimePath.startsWith(
        "public/game/assets/v17/enemy-trophies/",
      ),
      true,
    );
    assert.equal(
      artEntry.source.runtimePath.includes("/v16/"),
      false,
      `${runtimeEntry.id}: art provenance leaked V16`,
    );
    await inspectRuntime(runtimeEntry);
  }

  console.log(
    "Audit gameplay V18 réussi : 203 définitions, 228 enemyIds, cutouts transparents 256 px, provenance V17 et exclusion V16 valides.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
