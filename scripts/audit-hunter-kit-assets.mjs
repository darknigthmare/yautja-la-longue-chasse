import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const sourceRoot = path.join(root, "art-source", "v14", "hunter-kit");
const runtimeRoot = path.join(
  root,
  "public",
  "game",
  "assets",
  "v14",
  "hunter-kit",
);
const expectedIds = [
  "mask-feral-screen",
  "mask-boar",
  "mask-snake",
  "mask-falconer",
  "feral-speargun",
  "trophy-xenomorph-skull-p2",
];
const expectedPriority = [
  "exact-override",
  "family",
  "approximation",
  "generic",
];
const expectedMaskAssetByBiomaskId = {
  feral: "mask-feral-screen",
  boar: "mask-boar",
  snake: "mask-snake",
  falconer: "mask-falconer",
};
const expectedRigMaskIdByBiomaskId = {
  feral: "feral",
  boar: "city",
  snake: "city",
  falconer: "berserker",
};
const shardFiles = ["masks.json", "equipment.json", "trophies.json"];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function sortedIds(entries) {
  return entries.map((entry) => entry.id).sort();
}

function assertSameIds(label, entries) {
  assert.deepEqual(sortedIds(entries), [...expectedIds].sort(), `${label}: ids`);
  assert.equal(new Set(entries.map((entry) => entry.id)).size, expectedIds.length);
}

function approximateEqual(actual, expected, epsilon = 0.000002) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `${actual} differs from ${expected}`,
  );
}

async function inspectMaster(entry, shardEntry) {
  const masterPath = path.join(root, shardEntry.masterPath);
  const masterBuffer = await readFile(masterPath);
  const metadata = await sharp(masterBuffer).metadata();
  const { data, info } = await sharp(masterBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  assert.equal(masterBuffer.length, entry.sourceMetadata.bytes, `${entry.id}: source bytes`);
  assert.equal(metadata.width, entry.sourceMetadata.width, `${entry.id}: source width`);
  assert.equal(metadata.height, entry.sourceMetadata.height, `${entry.id}: source height`);
  assert.equal(sha256(masterBuffer), entry.sourceMetadata.sha256, `${entry.id}: source hash`);
  assert.ok(info.channels >= 3, `${entry.id}: source RGB channels`);

  const cornerOffsets = [
    0,
    (info.width - 1) * info.channels,
    (info.height - 1) * info.width * info.channels,
    (info.height * info.width - 1) * info.channels,
  ];
  for (const offset of cornerOffsets) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    assert.ok(
      red < 40 && green > 220 && blue < 40,
      `${entry.id}: master corner is not #00ff00-compatible`,
    );
  }

  return entry.sourceMetadata.sha256;
}

async function inspectRuntime(entry) {
  const runtimePath = path.join(root, entry.runtimePath);
  assert.ok(
    runtimePath.startsWith(runtimeRoot),
    `${entry.id}: runtime escaped hunter-kit root`,
  );
  const runtimeBuffer = await readFile(runtimePath);
  const runtimeStat = await stat(runtimePath);
  const metadata = await sharp(runtimeBuffer).metadata();
  const { data, info } = await sharp(runtimeBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  assert.equal(runtimeStat.size, entry.metadata.bytes, `${entry.id}: runtime bytes`);
  assert.equal(metadata.width, entry.metadata.width, `${entry.id}: runtime width`);
  assert.equal(metadata.height, entry.metadata.height, `${entry.id}: runtime height`);
  assert.equal(metadata.channels, entry.metadata.channels, `${entry.id}: runtime channels`);
  assert.equal(metadata.hasAlpha, true, `${entry.id}: runtime alpha`);
  assert.equal(sha256(runtimeBuffer), entry.metadata.sha256, `${entry.id}: runtime hash`);
  assert.equal(info.channels, 4, `${entry.id}: decoded RGBA channels`);

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

  assert.ok(visiblePixels > 0, `${entry.id}: empty alpha subject`);
  const totalPixels = info.width * info.height;
  const visibleRatio = visiblePixels / totalPixels;
  const transparentRatio = transparentPixels / totalPixels;
  const visibleGreenRatio = visibleGreenPixels / visiblePixels;
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

  assert.ok(info.width >= 512 && info.height >= 512, `${entry.id}: resolution`);
  assert.ok(visibleRatio >= 0.08 && visibleRatio <= 0.7, `${entry.id}: coverage`);
  assert.ok(transparentRatio >= 0.35, `${entry.id}: transparent background`);
  assert.ok(
    Math.min(padding.left, padding.top, padding.right, padding.bottom) >= 24,
    `${entry.id}: safe padding`,
  );
  assert.deepEqual(cornerAlpha, [0, 0, 0, 0], `${entry.id}: transparent corners`);
  assert.ok(visibleGreenRatio <= 0.0005, `${entry.id}: green fringe`);
  assert.deepEqual(bounds, entry.validation.bounds, `${entry.id}: bounds`);
  assert.deepEqual(padding, entry.validation.padding, `${entry.id}: padding`);
  assert.deepEqual(cornerAlpha, entry.validation.cornerAlpha, `${entry.id}: corner alpha metadata`);
  assert.equal(partialAlphaPixels, entry.validation.partialAlphaPixels);
  approximateEqual(visibleRatio, entry.validation.visibleRatio);
  approximateEqual(transparentRatio, entry.validation.transparentRatio);
  approximateEqual(visibleGreenRatio, entry.validation.visibleGreenRatio);

  return entry.metadata.sha256;
}

async function main() {
  const policy = await readJson(path.join(sourceRoot, "policy.json"));
  const sources = await readJson(path.join(sourceRoot, "reference-sources.json"));
  const runtimeManifestPath = path.join(runtimeRoot, "manifest.json");
  const runtimeManifestText = await readFile(runtimeManifestPath, "utf8");
  const runtimeManifest = JSON.parse(runtimeManifestText);
  const promptLines = (
    await readFile(
      path.join(sourceRoot, "openai-hunter-kit-prompts.jsonl"),
      "utf8",
    )
  )
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  const registrySource = await readFile(
    path.join(root, "app", "game", "hunterKitRegistry.ts"),
    "utf8",
  );
  const hunterVisualsSource = await readFile(
    path.join(root, "app", "game", "hunterVisuals.ts"),
    "utf8",
  );
  const rigConsumerSources = new Map(
    await Promise.all(
      ["HunterRigPreview.tsx", "HuntCanvas.tsx"].map(async (fileName) => [
        fileName,
        await readFile(path.join(root, "app", "game", fileName), "utf8"),
      ]),
    ),
  );

  assert.equal(policy.packVersion, 14);
  assert.equal(policy.sourcePolicy.referenceRequired, true);
  assert.equal(policy.sourcePolicy.exactIncarnationRequired, true);
  assert.equal(policy.sourcePolicy.crossIncarnationMixingAllowed, false);
  assert.equal(policy.sourcePolicy.visualInspectionRequired, true);
  assert.equal(policy.sourcePolicy.generatedOriginalOnly, true);
  assert.equal(policy.artifactPolicy.masterBackground, "#00ff00");
  assert.equal(policy.artifactPolicy.runtimeFormat, "webp");
  assert.equal(policy.artifactPolicy.runtimeAlphaRequired, true);
  assert.equal(policy.artifactPolicy.downloadedReferencesAreCommitted, false);
  assert.deepEqual(policy.resolverPolicy.priority, expectedPriority);

  assertSameIds("reference sources", sources.entries);
  assertSameIds("prompts", promptLines);
  assertSameIds("runtime manifest", runtimeManifest.entries);
  assert.deepEqual(runtimeManifest.selectionPriority, expectedPriority);
  assert.equal(runtimeManifest.generator, "OpenAI ImageGen");
  assert.equal(runtimeManifest.coverage.planned, expectedIds.length);
  assert.equal(runtimeManifest.coverage.available, expectedIds.length);
  assert.equal(runtimeManifest.coverage.complete, true);

  assert.equal(/https?:\/\//i.test(runtimeManifestText), false, "public manifest contains web references");
  assert.equal(/tmp[\\/]/i.test(runtimeManifestText), false, "public manifest contains tmp references");
  assert.equal(/art-source[\\/]/i.test(runtimeManifestText), false, "public manifest exposes masters");

  for (const source of sources.entries) {
    assert.ok(source.exactIncarnation.length >= 25, `${source.id}: exact incarnation`);
    assert.ok(source.visualAnchor.length >= 80, `${source.id}: visual anchor`);
    assert.ok(source.referencePages.length >= 2, `${source.id}: page references`);
    assert.ok(source.localReferenceFiles.length >= 2, `${source.id}: local references`);
    assert.ok(source.excludedIncarnations.length >= 3, `${source.id}: exclusions`);
    for (const referencePage of source.referencePages) {
      assert.match(referencePage, /^https:\/\//, `${source.id}: https reference`);
    }
    for (const referenceFile of source.localReferenceFiles) {
      assert.match(
        referenceFile,
        /^tmp\/hunter-kit-v14-references\//,
        `${source.id}: ignored reference location`,
      );
    }
  }

  assert.equal(new Set(promptLines.map((entry) => entry.prompt)).size, expectedIds.length);
  for (const prompt of promptLines) {
    assert.equal(prompt.generator, "OpenAI ImageGen", `${prompt.id}: generator`);
    assert.equal(prompt.modelMode, "builtin-imagegen", `${prompt.id}: model mode`);
    assert.equal(prompt.chromaKey, "#00ff00", `${prompt.id}: chroma metadata`);
    assert.ok(prompt.prompt.length >= 700, `${prompt.id}: detailed prompt`);
    assert.match(prompt.prompt, /#00ff00/i, `${prompt.id}: chroma instruction`);
    assert.match(prompt.prompt, /flat uniform|flat pure|perfectly flat/i, `${prompt.id}: flat background`);
    assert.match(prompt.prompt, /no (?:floor|shadow)|no floor/i, `${prompt.id}: no shadow contract`);
    assert.ok(prompt.localReferenceFiles.length >= 2, `${prompt.id}: prompt references`);
  }

  const shardEntries = [];
  const shardById = new Map();
  for (const shardFile of shardFiles) {
    const shard = await readJson(path.join(sourceRoot, "manifests", shardFile));
    assert.equal(shard.packVersion, 14, `${shardFile}: version`);
    for (const entry of shard.entries) {
      assert.equal(shardById.has(entry.id), false, `${entry.id}: duplicate shard`);
      assert.equal(entry.sourceTier, "exact-override", `${entry.id}: source tier`);
      assert.equal(entry.planned, true, `${entry.id}: planned`);
      assert.equal(entry.available, true, `${entry.id}: available`);
      assert.equal(entry.inspection.status, "passed", `${entry.id}: visual inspection`);
      assert.deepEqual(entry.futureConsumers, ["thumbnail", "rig"]);
      shardById.set(entry.id, { entry, shardFile });
      shardEntries.push(entry);
    }
  }
  assertSameIds("source shards", shardEntries);

  const sourceHashes = [];
  const runtimeHashes = [];
  for (const entry of runtimeManifest.entries) {
    const shardRecord = shardById.get(entry.id);
    assert.ok(shardRecord, `${entry.id}: missing shard`);
    const shardEntry = shardRecord.entry;
    assert.equal(entry.shard, shardRecord.shardFile, `${entry.id}: shard name`);
    assert.equal(entry.runtimePath, shardEntry.runtimePath, `${entry.id}: runtime path`);
    assert.equal(entry.runtimeUrl, shardEntry.runtimeUrl, `${entry.id}: runtime URL`);
    assert.deepEqual(entry.selectionAliases, shardEntry.selectionAliases, `${entry.id}: aliases`);
    assert.equal(entry.planned, true, `${entry.id}: runtime planned`);
    assert.equal(entry.available, true, `${entry.id}: runtime available`);
    assert.equal(entry.validation.alpha, true, `${entry.id}: alpha metadata`);
    assert.equal(entry.inspection.status, "passed", `${entry.id}: inspection metadata`);
    assert.deepEqual(entry.futureConsumers, ["thumbnail", "rig"]);
    sourceHashes.push(await inspectMaster(entry, shardEntry));
    runtimeHashes.push(await inspectRuntime(entry));
  }

  assert.equal(new Set(sourceHashes).size, expectedIds.length, "masters must be distinct");
  assert.equal(new Set(runtimeHashes).size, expectedIds.length, "runtime cutouts must be distinct");
  for (const [biomaskId, assetId] of Object.entries(
    expectedMaskAssetByBiomaskId,
  )) {
    const entry = runtimeManifest.entries.find((asset) => asset.id === assetId);
    assert.ok(entry, `${biomaskId}: missing exact mask asset`);
    assert.equal(entry.kind, "mask", `${biomaskId}: exact asset kind`);
    assert.equal(entry.available, true, `${biomaskId}: exact asset availability`);
    assert.deepEqual(
      entry.selectionAliases.genericIds,
      [],
      `${biomaskId}: exact canon mask cannot be an arbitrary generic fallback`,
    );
    assert.ok(
      hunterVisualsSource.includes(`${biomaskId}: "${entry.runtimeUrl}"`),
      `${biomaskId}: hunterVisuals path differs from available manifest asset`,
    );

    const rigMaskId = expectedRigMaskIdByBiomaskId[biomaskId];
    const rigMaskPath = path.join(
      root,
      "public",
      "game",
      "assets",
      "v3",
      "actors",
      "yautja",
      "hunter",
      "masks",
      "registered",
      `${rigMaskId}.webp`,
    );
    const rigMetadata = await sharp(rigMaskPath).metadata();
    assert.equal(rigMetadata.width, 256, `${biomaskId}: rig mask width`);
    assert.equal(rigMetadata.height, 384, `${biomaskId}: rig mask height`);
    assert.equal(rigMetadata.hasAlpha, true, `${biomaskId}: rig mask alpha`);
  }
  const rigFunctionSource = hunterVisualsSource.match(
    /export function hunterMaskRigPath\([\s\S]*?\n\}/,
  )?.[0];
  assert.ok(rigFunctionSource, "hunterMaskRigPath helper missing");
  assert.match(rigFunctionSource, /HUNTER_ASSET_ROOT_V3/);
  assert.match(rigFunctionSource, /masks\/registered/);
  assert.doesNotMatch(rigFunctionSource, /V14|THUMBNAIL|assets\/v14/);
  for (const [biomaskId, rigMaskId] of Object.entries(
    expectedRigMaskIdByBiomaskId,
  )) {
    if (biomaskId !== rigMaskId) {
      assert.ok(
        hunterVisualsSource.includes(`${biomaskId}: "${rigMaskId}"`),
        `${biomaskId}: explicit aligned rig fallback missing`,
      );
    }
  }
  for (const [fileName, source] of rigConsumerSources) {
    assert.match(source, /\bhunterMaskRigPath\b/, `${fileName}: rig helper`);
    assert.doesNotMatch(
      source,
      /\bhunterMaskThumbnailPath\b/,
      `${fileName}: standalone thumbnail helper entered the rig`,
    );
    for (const assetId of Object.values(expectedMaskAssetByBiomaskId)) {
      const entry = runtimeManifest.entries.find(
        (asset) => asset.id === assetId,
      );
      assert.equal(
        source.includes(entry.runtimeUrl),
        false,
        `${fileName}: standalone V14 cutout ${assetId} entered the rig`,
      );
    }
  }
  assert.match(registrySource, /HUNTER_KIT_PRIORITY/);
  assert.match(registrySource, /exact-override[\s\S]+family[\s\S]+approximation[\s\S]+generic/);
  assert.match(registrySource, /resolveHunterKitAssetForConsumer/);
  assert.doesNotMatch(
    registrySource,
    /GameClient|hunterVisuals|v6Visuals|hunterLorePresets/,
    "registry must stay independent from current UI and roster",
  );

  console.log(
    "Audit hunter kit V14 reussi : cutouts exacts reserves aux vignettes, masques de rig V3 alignes en 256x384 et aucun fallback generique canonique.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
