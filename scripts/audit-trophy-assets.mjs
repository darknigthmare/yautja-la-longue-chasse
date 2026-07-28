import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const sourceRoot = path.join(root, "art-source", "v15", "trophies");
const runtimeRoot = path.join(
  root,
  "public",
  "game",
  "assets",
  "v15",
  "trophies",
);
const expectedIds = [
  "trophy-vey",
  "trophy-cryostalker",
  "trophy-bad-blood",
  "trophy-swamp-hydra",
  "trophy-desert-sandmaw",
  "trophy-ocean-leviathan",
  "trophy-fungal-hivemind",
  "trophy-ruins-ancient-guardian",
];

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

async function inspectSource(runtimeEntry, sourceEntry) {
  const sourceBuffer = await readFile(path.join(root, sourceEntry.masterPath));
  const sourceMetadata = await sharp(sourceBuffer).metadata();

  assert.equal(
    sourceBuffer.length,
    runtimeEntry.sourceMetadata.bytes,
    `${runtimeEntry.id}: source bytes`,
  );
  assert.equal(
    sourceMetadata.width,
    runtimeEntry.sourceMetadata.width,
    `${runtimeEntry.id}: source width`,
  );
  assert.equal(
    sourceMetadata.height,
    runtimeEntry.sourceMetadata.height,
    `${runtimeEntry.id}: source height`,
  );
  assert.equal(
    sha256(sourceBuffer),
    runtimeEntry.sourceMetadata.sha256,
    `${runtimeEntry.id}: source hash`,
  );

  const { data, info } = await sharp(sourceBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cornerOffsets = [
    0,
    (info.width - 1) * info.channels,
    (info.height - 1) * info.width * info.channels,
    (info.height * info.width - 1) * info.channels,
  ];
  for (const offset of cornerOffsets) {
    assert.ok(
      data[offset + 1] >= 220 &&
        data[offset + 1] >= data[offset] + 170 &&
        data[offset + 1] >= data[offset + 2] + 170,
      `${runtimeEntry.id}: master corner is not #00ff00-compatible`,
    );
  }

  return runtimeEntry.sourceMetadata.sha256;
}

async function inspectRuntime(entry) {
  const runtimePath = path.join(root, entry.runtimePath);
  assert.ok(
    runtimePath.startsWith(runtimeRoot),
    `${entry.id}: runtime escaped V15 trophy root`,
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
  assert.equal(metadata.channels, entry.metadata.channels, `${entry.id}: channels`);
  assert.equal(metadata.hasAlpha, true, `${entry.id}: alpha`);
  assert.equal(sha256(runtimeBuffer), entry.metadata.sha256, `${entry.id}: runtime hash`);

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
  assert.ok(transparentRatio >= 0.35, `${entry.id}: transparency`);
  assert.ok(
    Math.min(padding.left, padding.top, padding.right, padding.bottom) >= 24,
    `${entry.id}: safe padding`,
  );
  assert.deepEqual(cornerAlpha, [0, 0, 0, 0], `${entry.id}: corners`);
  assert.ok(visibleGreenRatio <= 0.0005, `${entry.id}: visible green fringe`);
  assert.deepEqual(bounds, entry.validation.bounds, `${entry.id}: bounds`);
  assert.deepEqual(padding, entry.validation.padding, `${entry.id}: padding`);
  assert.deepEqual(cornerAlpha, entry.validation.cornerAlpha, `${entry.id}: corners metadata`);
  assert.equal(partialAlphaPixels, entry.validation.partialAlphaPixels);
  approximateEqual(visibleRatio, entry.validation.visibleRatio);
  approximateEqual(transparentRatio, entry.validation.transparentRatio);
  approximateEqual(visibleGreenRatio, entry.validation.visibleGreenRatio);

  return entry.metadata.sha256;
}

async function main() {
  const policy = await readJson(path.join(sourceRoot, "policy.json"));
  const sourceSpecs = await readJson(path.join(sourceRoot, "source-specs.json"));
  const runtimeManifestText = await readFile(
    path.join(runtimeRoot, "manifest.json"),
    "utf8",
  );
  const runtimeManifest = JSON.parse(runtimeManifestText);
  const prompts = (
    await readFile(path.join(sourceRoot, "openai-trophy-prompts.jsonl"), "utf8")
  )
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  const registrySource = await readFile(
    path.join(root, "app", "game", "trophyVisualRegistry.ts"),
    "utf8",
  );
  const gameClientSource = await readFile(
    path.join(root, "app", "game", "GameClient.tsx"),
    "utf8",
  );
  const forbiddenConsumerSources = new Map(
    await Promise.all(
      ["HunterRigPreview.tsx", "HuntCanvas.tsx", "hunterVisuals.ts"].map(
        async (fileName) => [
          fileName,
          await readFile(path.join(root, "app", "game", fileName), "utf8"),
        ],
      ),
    ),
  );

  assert.equal(policy.packVersion, 15);
  assert.equal(policy.sourcePolicy.authority, "app/game/data.ts");
  assert.equal(policy.sourcePolicy.projectCanonRequired, true);
  assert.equal(policy.sourcePolicy.webReferenceRequired, false);
  assert.equal(policy.sourcePolicy.franchiseStatus, "project-original");
  assert.equal(policy.sourcePolicy.genericAliasingAllowed, false);
  assert.deepEqual(policy.consumerPolicy.allowed, ["trophy-wall"]);
  assert.deepEqual(policy.consumerPolicy.forbidden, [
    "hunter-rig",
    "hunt-canvas",
    "registered-layer",
  ]);
  assert.equal(policy.consumerPolicy.fallback, "v6-aligned-atlas");
  assert.equal(policy.artifactPolicy.masterBackground, "#00ff00");
  assert.equal(policy.artifactPolicy.runtimeAlphaRequired, true);

  assert.equal(sourceSpecs.authority, "app/game/data.ts");
  assert.equal(
    /https?:\/\//i.test(JSON.stringify(sourceSpecs)),
    false,
    "project-original source specs must not fake web provenance",
  );
  assertSameIds("source specs", sourceSpecs.entries);
  assertSameIds("prompts", prompts);
  assertSameIds("runtime manifest", runtimeManifest.entries);
  assert.equal(runtimeManifest.generator, "OpenAI ImageGen");
  assert.equal(runtimeManifest.coverage.planned, expectedIds.length);
  assert.equal(runtimeManifest.coverage.available, expectedIds.length);
  assert.equal(runtimeManifest.coverage.complete, true);
  assert.equal(/https?:\/\//i.test(runtimeManifestText), false);
  assert.equal(/tmp[\\/]/i.test(runtimeManifestText), false);
  assert.equal(/art-source[\\/]/i.test(runtimeManifestText), false);

  const sourceById = new Map(sourceSpecs.entries.map((entry) => [entry.id, entry]));
  for (const sourceEntry of sourceSpecs.entries) {
    assert.equal(sourceEntry.id, sourceEntry.definitionId);
    assert.equal(sourceEntry.franchiseStatus, "project-original");
    assert.deepEqual(sourceEntry.consumers, ["trophy-wall"]);
    assert.equal(sourceEntry.planned, true);
    assert.equal(sourceEntry.available, true);
    assert.equal(sourceEntry.inspection.status, "passed");
  }

  assert.equal(new Set(prompts.map((entry) => entry.prompt)).size, expectedIds.length);
  for (const prompt of prompts) {
    assert.equal(prompt.generator, "OpenAI ImageGen");
    assert.equal(prompt.modelMode, "builtin-imagegen");
    assert.equal(prompt.chromaKey, "#00ff00");
    assert.equal(prompt.authority, "app/game/data.ts");
    assert.ok(
      ["primary-prompt-exact", "production-spec-reconstructed"].includes(
        prompt.recordType,
      ),
      `${prompt.id}: prompt provenance`,
    );
    assert.ok(prompt.prompt.length >= 700, `${prompt.id}: detailed prompt`);
    assert.match(prompt.prompt, /#00ff00/i);
    assert.match(prompt.prompt, /flat (?:solid |uniform |pure |perfectly )|perfectly flat/i);
    assert.match(
      prompt.prompt,
      /(?:no|without) (?:floor|gradient|contact shadow)/i,
    );
  }

  const sourceHashes = [];
  const runtimeHashes = [];
  for (const runtimeEntry of runtimeManifest.entries) {
    const sourceEntry = sourceById.get(runtimeEntry.id);
    assert.ok(sourceEntry, `${runtimeEntry.id}: missing source spec`);
    assert.equal(runtimeEntry.definitionId, sourceEntry.definitionId);
    assert.equal(runtimeEntry.name, sourceEntry.name);
    assert.equal(runtimeEntry.description, sourceEntry.description);
    assert.equal(runtimeEntry.targetName, sourceEntry.targetName);
    assert.equal(runtimeEntry.partId, sourceEntry.partId);
    assert.equal(runtimeEntry.franchiseStatus, "project-original");
    assert.deepEqual(runtimeEntry.consumers, ["trophy-wall"]);
    assert.equal(runtimeEntry.validation.alpha, true);
    assert.equal(runtimeEntry.inspection.status, "passed");
    sourceHashes.push(await inspectSource(runtimeEntry, sourceEntry));
    runtimeHashes.push(await inspectRuntime(runtimeEntry));

    for (const [fileName, source] of forbiddenConsumerSources) {
      assert.equal(
        source.includes(runtimeEntry.runtimeUrl),
        false,
        `${fileName}: V15 trophy entered a forbidden consumer`,
      );
    }
  }
  assert.equal(new Set(sourceHashes).size, expectedIds.length);
  assert.equal(new Set(runtimeHashes).size, expectedIds.length);

  assert.match(registrySource, /visualsByDefinitionId/);
  assert.match(registrySource, /trophyWallVisualForDefinitionId/);
  assert.match(registrySource, /consumers\.includes\("trophy-wall"\)/);
  assert.doesNotMatch(
    registrySource,
    /HuntCanvas|HunterRigPreview|hunterVisuals|drawRegisteredLayer/,
  );
  assert.match(gameClientSource, /trophyWallVisualForDefinitionId/);
  assert.match(
    gameClientSource,
    /trophyWallVisualForDefinitionId\([\s\S]*?trophy\.definitionId/,
  );
  assert.match(
    gameClientSource,
    /exactVisual \?[\s\S]*?src=\{exactVisual\.runtimeUrl\}[\s\S]*?: \([\s\S]*?<V6AtlasSprite/,
  );
  assert.match(
    gameClientSource,
    /const missionTrophy =[\s\S]*?mission\?\.trophy\.id === trophy\.definitionId/,
  );
  assert.match(gameClientSource, /missionTrophy\?\.name/);
  assert.match(gameClientSource, /missionTrophy\?\.description/);

  console.log(
    "Audit trophees V15 reussi : 8 recompenses originales exactes, alpha valide, fallback V6 aligne et aucun asset haute resolution dans le rig ou le canvas.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
