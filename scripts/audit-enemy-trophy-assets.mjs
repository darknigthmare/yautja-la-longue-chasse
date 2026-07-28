import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const sourceRoot = path.join(root, "art-source", "v17", "enemy-trophies");
const runtimeRoot = path.join(
  root,
  "public",
  "game",
  "assets",
  "v17",
  "enemy-trophies",
);

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function parseJsonLines(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function assertUnique(label, values, expectedCount) {
  assert.equal(values.length, expectedCount, `${label}: count`);
  assert.equal(new Set(values).size, expectedCount, `${label}: uniqueness`);
}

async function inspectMaster(entry, runtimeEntry) {
  const buffer = await readFile(path.join(root, entry.masterPath));
  const metadata = await sharp(buffer).metadata();
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cornerOffsets = [
    0,
    (info.width - 1) * info.channels,
    (info.height - 1) * info.width * info.channels,
    (info.height * info.width - 1) * info.channels,
  ];

  assert.ok(metadata.width >= 512 && metadata.height >= 512, `${entry.id}: master size`);
  assert.equal(buffer.length, runtimeEntry.sourceMetadata.bytes, `${entry.id}: source bytes`);
  assert.equal(metadata.width, runtimeEntry.sourceMetadata.width, `${entry.id}: source width`);
  assert.equal(metadata.height, runtimeEntry.sourceMetadata.height, `${entry.id}: source height`);
  assert.equal(sha256(buffer), runtimeEntry.sourceMetadata.sha256, `${entry.id}: source hash`);
  for (const offset of cornerOffsets) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    assert.ok(
      green >= 210 && green >= red + 120 && green >= blue + 120,
      `${entry.id}: master corner is not chroma compatible`,
    );
  }
  return sha256(buffer);
}

async function inspectRuntime(entry) {
  const filePath = path.join(root, entry.runtimePath);
  assert.ok(filePath.startsWith(runtimeRoot), `${entry.id}: escaped V17 root`);
  const buffer = await readFile(filePath);
  const metadata = await sharp(buffer).metadata();
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  assert.equal(metadata.hasAlpha, true, `${entry.id}: missing alpha`);
  assert.equal(buffer.length, entry.metadata.bytes, `${entry.id}: runtime bytes`);
  assert.equal(metadata.width, entry.metadata.width, `${entry.id}: runtime width`);
  assert.equal(metadata.height, entry.metadata.height, `${entry.id}: runtime height`);
  assert.equal(metadata.channels, entry.metadata.channels, `${entry.id}: runtime channels`);
  assert.equal(sha256(buffer), entry.metadata.sha256, `${entry.id}: runtime hash`);

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let visiblePixels = 0;
  let transparentPixels = 0;
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

  assert.ok(visiblePixels > 0, `${entry.id}: empty cutout`);
  const totalPixels = info.width * info.height;
  const visibleRatio = visiblePixels / totalPixels;
  const transparentRatio = transparentPixels / totalPixels;
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

  assert.ok(visibleRatio >= 0.025 && visibleRatio <= 0.78, `${entry.id}: visible coverage`);
  assert.ok(transparentRatio >= 0.2, `${entry.id}: transparent coverage`);
  assert.ok(
    Math.min(padding.left, padding.top, padding.right, padding.bottom) >= 20,
    `${entry.id}: unsafe padding`,
  );
  assert.deepEqual(cornerAlpha, [0, 0, 0, 0], `${entry.id}: opaque corner`);
  assert.ok(visibleGreenRatio <= 0.001, `${entry.id}: green fringe`);
  assert.deepEqual(entry.validation.cornerAlpha, cornerAlpha, `${entry.id}: corner metadata`);
  assert.deepEqual(entry.validation.padding, padding, `${entry.id}: padding metadata`);
  assert.deepEqual(
    entry.validation.bounds,
    [minX, minY, maxX, maxY],
    `${entry.id}: bounds metadata`,
  );
  return sha256(buffer);
}

async function main() {
  const [
    policy,
    sourceSpecs,
    mappings,
    runtimeManifestText,
    promptsText,
    builtCorrectionsText,
    correctionAttemptsText,
  ] = await Promise.all([
      readJson(path.join(sourceRoot, "policy.json")),
      readJson(path.join(sourceRoot, "source-specs.json")),
      readJson(path.join(sourceRoot, "enemy-mappings.json")),
      readFile(path.join(runtimeRoot, "manifest.json"), "utf8"),
      readFile(path.join(sourceRoot, "openai-enemy-trophy-prompts.jsonl"), "utf8"),
      readFile(
        path.join(sourceRoot, "openai-enemy-trophy-correction-prompts.jsonl"),
        "utf8",
      ),
      readFile(
        path.join(sourceRoot, "openai-enemy-trophy-correction-attempts.jsonl"),
        "utf8",
      ),
    ]);
  const runtimeManifest = JSON.parse(runtimeManifestText);
  const prompts = parseJsonLines(promptsText);
  const builtCorrections = parseJsonLines(builtCorrectionsText);
  const correctionAttempts = parseJsonLines(correctionAttemptsText);

  assert.equal(policy.packVersion, 17);
  assert.deepEqual(policy.sourcePolicy.authority, [
    "app/game/enemyRosterV7.ts",
    "app/game/ecologyV8.ts",
  ]);
  assert.equal(policy.sourcePolicy.franchiseStatus, "project-original");
  assert.equal(policy.sourcePolicy.exactEnemyCoverageRequired, true);
  assert.equal(policy.sourcePolicy.genericAliasingAllowed, false);
  assert.deepEqual(policy.consumerPolicy.allowed, [
    "enemy-bestiary-v7",
    "enemy-bestiary-v8",
  ]);
  assert.deepEqual(policy.consumerPolicy.forbidden, [
    "franchise-archive",
    "trophy-wall",
    "hunter-rig",
    "hunt-canvas",
  ]);
  assert.equal(policy.artifactPolicy.masterBackground, "#00ff00");
  assert.equal(policy.artifactPolicy.runtimeAlphaRequired, true);

  assert.equal(sourceSpecs.coverage.enemies, 228);
  assert.equal(sourceSpecs.coverage.distinctTrophies, 203);
  assert.equal(sourceSpecs.coverage.sharedExactNames, 25);
  assertUnique("source ids", sourceSpecs.entries.map((entry) => entry.id), 203);
  assertUnique("source names", sourceSpecs.entries.map((entry) => entry.name), 203);
  assertUnique("prompt ids", prompts.map((entry) => entry.id), 203);
  assertUnique(
    "built correction ids",
    builtCorrections.map((entry) => entry.id),
    7,
  );
  assert.ok(correctionAttempts.length >= 34, "missing imported correction attempts");
  const acceptedCorrectionAttempts = correctionAttempts.filter(
    (entry) => entry.accepted,
  );
  assert.ok(acceptedCorrectionAttempts.length >= 34);
  assertUnique(
    "accepted correction attempt ids",
    acceptedCorrectionAttempts.map((entry) => entry.id),
    acceptedCorrectionAttempts.length,
  );
  assertUnique(
    "all accepted correction ids",
    [
      ...builtCorrections.map((entry) => entry.id),
      ...acceptedCorrectionAttempts.map((entry) => entry.id),
    ],
    builtCorrections.length + acceptedCorrectionAttempts.length,
  );
  assertUnique("mapping enemy ids", mappings.mappings.map((entry) => entry.enemyId), 228);
  assert.equal(runtimeManifest.packVersion, 17);
  assert.equal(runtimeManifest.generator, "OpenAI ImageGen");
  assert.equal(runtimeManifest.enemyCoverage, 228);
  assert.equal(runtimeManifest.distinctTrophyCoverage, 203);
  assert.equal(runtimeManifest.coverage.planned, 203);
  assert.equal(runtimeManifest.coverage.available, 203);
  assert.equal(runtimeManifest.coverage.complete, true);
  assertUnique("runtime ids", runtimeManifest.entries.map((entry) => entry.id), 203);

  assert.equal(/prompt/i.test(runtimeManifestText), false, "runtime leaked prompts");
  assert.equal(/art-source[\\/]/i.test(runtimeManifestText), false, "runtime leaked masters");
  assert.equal(/sprites[\\/]v[78]/i.test(runtimeManifestText), false, "runtime leaked identity refs");
  assert.equal(/definitionId/i.test(runtimeManifestText), false, "potential trophy became a claim");

  const sourceById = new Map(sourceSpecs.entries.map((entry) => [entry.id, entry]));
  const promptById = new Map(prompts.map((entry) => [entry.id, entry]));
  for (const correction of builtCorrections) {
    assert.ok(sourceById.has(correction.id), `${correction.id}: unknown built correction`);
    assert.equal(correction.recordType, "semantic-correction");
    assert.equal(correction.generator, "OpenAI ImageGen");
    assert.equal(correction.modelMode, "builtin-imagegen");
    assert.ok(correction.prompt.length >= 1_000);
    assert.match(correction.prompt, /SEMANTIC CORRECTION PASS/);
  }
  const correctionCompositeIds = [];
  for (const correction of correctionAttempts) {
    assert.ok(sourceById.has(correction.id), `${correction.id}: unknown correction attempt`);
    assert.equal(correction.recordType, "semantic-correction-attempt");
    assert.equal(correction.generator, "OpenAI ImageGen");
    assert.equal(correction.modelMode, "builtin-imagegen");
    assert.equal(correction.promptSha256, createHash("sha256").update(correction.prompt).digest("hex"));
    assert.ok(correction.prompt.length >= 900);
    assert.ok(correction.referencePaths.length >= 1);
    assert.ok(
      correction.referencePaths.every(
        (referencePath) =>
          /^(public\/game\/sprites\/v[78]|art-source\/v14\/hunter-kit\/masters)\//.test(
            referencePath,
          ),
      ),
      `${correction.id}: invalid correction reference`,
    );
    correctionCompositeIds.push(
      `${correction.id}|${correction.attempt}|${correction.promptSha256}`,
    );
  }
  assertUnique(
    "correction attempt records",
    correctionCompositeIds,
    correctionAttempts.length,
  );
  const mappedEnemyIds = [];
  const sourceHashes = [];
  const runtimeHashes = [];

  for (const runtimeEntry of runtimeManifest.entries) {
    const sourceEntry = sourceById.get(runtimeEntry.id);
    const prompt = promptById.get(runtimeEntry.id);
    assert.ok(sourceEntry, `${runtimeEntry.id}: missing source spec`);
    assert.ok(prompt, `${runtimeEntry.id}: missing prompt`);
    assert.equal(sourceEntry.available, true, `${runtimeEntry.id}: source unavailable`);
    assert.equal(sourceEntry.inspection.status, "passed", `${runtimeEntry.id}: source inspection`);
    assert.equal(runtimeEntry.available, true, `${runtimeEntry.id}: runtime unavailable`);
    assert.equal(runtimeEntry.inspection.status, "passed", `${runtimeEntry.id}: runtime inspection`);
    assert.equal(runtimeEntry.name, sourceEntry.name);
    assert.equal(runtimeEntry.franchiseStatus, "project-original");
    assert.ok(runtimeEntry.consumers.length >= 1);
    assert.ok(
      runtimeEntry.consumers.every((consumer) =>
        policy.consumerPolicy.allowed.includes(consumer),
      ),
      `${runtimeEntry.id}: forbidden consumer`,
    );
    assert.equal(Object.hasOwn(runtimeEntry, "definitionId"), false);
    assert.equal(prompt.generator, "OpenAI ImageGen");
    assert.equal(prompt.modelMode, "builtin-imagegen");
    assert.equal(prompt.chromaKey, "#00ff00");
    assert.ok(prompt.prompt.length >= 900, `${runtimeEntry.id}: shallow prompt`);
    assert.match(prompt.prompt, /#00ff00/i);
    assert.match(prompt.prompt, /no cast shadow/i);
    mappedEnemyIds.push(...runtimeEntry.enemyIds);
    sourceHashes.push(await inspectMaster(sourceEntry, runtimeEntry));
    runtimeHashes.push(await inspectRuntime(runtimeEntry));
  }

  assertUnique("runtime enemy coverage", mappedEnemyIds, 228);
  assertUnique("source hashes", sourceHashes, 203);
  assertUnique("runtime hashes", runtimeHashes, 203);

  console.log(
    "Audit trophées ennemis V17 réussi : 228 fiches du bestiaire, 203 prises originales distinctes, alpha et séparation des consommateurs valides.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
