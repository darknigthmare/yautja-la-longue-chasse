import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const sourceRoot = path.join(root, "art-source", "v16", "franchise-trophies");
const runtimeRoot = path.join(
  root,
  "public",
  "game",
  "assets",
  "v16",
  "franchise-trophies",
);
const allowedLegacyRuntimeRoot = path.join(
  root,
  "public",
  "game",
  "assets",
  "v14",
  "hunter-kit",
  "trophies",
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

async function inspectMaster(sourceEntry, runtimeEntry) {
  const buffer = await readFile(path.join(root, sourceEntry.masterPath));
  const metadata = await sharp(buffer).metadata();
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const offsets = [
    0,
    (info.width - 1) * info.channels,
    (info.height - 1) * info.width * info.channels,
    (info.height * info.width - 1) * info.channels,
  ];
  assert.ok(metadata.width >= 512 && metadata.height >= 512, `${sourceEntry.id}: source size`);
  assert.equal(buffer.length, runtimeEntry.sourceMetadata.bytes, `${sourceEntry.id}: source bytes`);
  assert.equal(metadata.width, runtimeEntry.sourceMetadata.width, `${sourceEntry.id}: source width`);
  assert.equal(metadata.height, runtimeEntry.sourceMetadata.height, `${sourceEntry.id}: source height`);
  assert.equal(sha256(buffer), runtimeEntry.sourceMetadata.sha256, `${sourceEntry.id}: source hash`);
  for (const offset of offsets) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    assert.ok(
      green >= 210 && green >= red + 120 && green >= blue + 120,
      `${sourceEntry.id}: incompatible chroma corner`,
    );
  }
  return sha256(buffer);
}

async function inspectRuntime(entry) {
  const filePath = path.join(root, entry.runtimePath);
  assert.ok(
    filePath.startsWith(runtimeRoot) || filePath.startsWith(allowedLegacyRuntimeRoot),
    `${entry.id}: escaped V16/V14 trophy roots`,
  );
  const buffer = await readFile(filePath);
  const metadata = await sharp(buffer).metadata();
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(metadata.hasAlpha, true, `${entry.id}: alpha`);
  assert.equal(buffer.length, entry.metadata.bytes, `${entry.id}: runtime bytes`);
  assert.equal(metadata.width, entry.metadata.width, `${entry.id}: runtime width`);
  assert.equal(metadata.height, entry.metadata.height, `${entry.id}: runtime height`);
  assert.equal(sha256(buffer), entry.metadata.sha256, `${entry.id}: runtime hash`);

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let visible = 0;
  let transparent = 0;
  let green = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    const alpha = data[index + 3];
    if (alpha === 0) {
      transparent += 1;
    }
    if (alpha <= 16) {
      continue;
    }
    const pixelIndex = index / info.channels;
    const x = pixelIndex % info.width;
    const y = Math.floor(pixelIndex / info.width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    visible += 1;
    const red = data[index];
    const greenChannel = data[index + 1];
    const blue = data[index + 2];
    if (
      alpha >= 48 &&
      red <= 95 &&
      greenChannel >= 175 &&
      blue <= 125 &&
      greenChannel >= red + 75 &&
      greenChannel >= blue + 75
    ) {
      green += 1;
    }
  }

  const total = info.width * info.height;
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
  assert.ok(visible / total >= 0.025 && visible / total <= 0.82, `${entry.id}: coverage`);
  assert.ok(transparent / total >= 0.15, `${entry.id}: transparency`);
  assert.ok(
    Math.min(padding.left, padding.top, padding.right, padding.bottom) >= 20,
    `${entry.id}: padding`,
  );
  assert.deepEqual(cornerAlpha, [0, 0, 0, 0], `${entry.id}: corners`);
  assert.ok(green / visible <= 0.001, `${entry.id}: green fringe`);
  assert.deepEqual(entry.validation.bounds, [minX, minY, maxX, maxY]);
  assert.deepEqual(entry.validation.padding, padding);
  return sha256(buffer);
}

async function main() {
  const [
    policy,
    census,
    sourceSpecs,
    runtimeManifestText,
    promptText,
    referenceReport,
    gameClientSource,
    registrySource,
    correctionAttemptsText,
  ] = await Promise.all([
    readJson(path.join(sourceRoot, "policy.json")),
    readJson(path.join(sourceRoot, "media-census.json")),
    readJson(path.join(sourceRoot, "source-specs.json")),
    readFile(path.join(runtimeRoot, "manifest.json"), "utf8"),
    readFile(path.join(sourceRoot, "openai-franchise-trophy-prompts.jsonl"), "utf8"),
    readJson(path.join(sourceRoot, "reference-fetch-report.json")),
    readFile(path.join(root, "app", "game", "GameClient.tsx"), "utf8"),
    readFile(path.join(root, "app", "game", "franchiseTrophyRegistry.ts"), "utf8"),
    readFile(
      path.join(sourceRoot, "openai-franchise-trophy-correction-attempts.jsonl"),
      "utf8",
    ),
  ]);
  const runtimeManifest = JSON.parse(runtimeManifestText);
  const prompts = parseJsonLines(promptText);
  const correctionAttempts = parseJsonLines(correctionAttemptsText);

  assert.equal(policy.packVersion, 16);
  assert.match(policy.scope, /officially released or licensed/i);
  assert.match(policy.namingRule, /Unnamed species remain descriptive/i);
  assert.equal(policy.sourcePolicy.sourcePageRequired, true);
  assert.equal(policy.sourcePolicy.visualAnchorRequired, true);
  assert.equal(policy.sourcePolicy.downloadedReferenceTemporary, true);
  assert.equal(policy.sourcePolicy.originalFanArtOnly, true);
  assert.deepEqual(policy.consumerPolicy.allowed, ["franchise-archive"]);
  assert.equal(policy.artifactPolicy.masterBackground, "#00ff00");
  assert.equal(policy.artifactPolicy.runtimeAlphaRequired, true);

  assertUnique("physical census ids", census.physicalEntries.map((entry) => entry.id), 92);
  assertUnique(
    "census-only ids",
    census.censusOnlyEntries.map((entry) => entry.id),
    14,
  );
  assertUnique("source ids", sourceSpecs.entries.map((entry) => entry.id), 92);
  assertUnique("prompt ids", prompts.map((entry) => entry.id), 86);
  assert.ok(correctionAttempts.length >= 18, "missing imported V16 correction attempts");
  const acceptedCorrectionAttempts = correctionAttempts.filter(
    (entry) => entry.accepted,
  );
  assert.ok(acceptedCorrectionAttempts.length >= 16);
  assertUnique(
    "accepted correction attempt ids",
    acceptedCorrectionAttempts.map((entry) => entry.id),
    acceptedCorrectionAttempts.length,
  );
  assert.equal(
    sourceSpecs.entries.filter((entry) => entry.assetDecision === "reuse-v14").length,
    6,
  );
  assert.equal(referenceReport.groups.some((group) => group.status === "failed"), false);
  for (const group of referenceReport.groups) {
    assert.match(
      group.localReferencePath,
      /^tmp\/franchise-trophy-references\/source-[a-f0-9]{12}\.webp$/,
    );
    assert.ok(group.assetIds.length >= 1);
  }

  assert.equal(runtimeManifest.packVersion, 16);
  assert.equal(runtimeManifest.generator, "OpenAI ImageGen");
  assert.equal(runtimeManifest.coverage.planned, 92);
  assert.equal(runtimeManifest.coverage.available, 92);
  assert.equal(runtimeManifest.coverage.complete, true);
  assertUnique("runtime ids", runtimeManifest.entries.map((entry) => entry.id), 92);
  assert.equal(/prompt/i.test(runtimeManifestText), false, "runtime leaked prompts");
  assert.equal(/art-source[\\/]|tmp[\\/]franchise/i.test(runtimeManifestText), false);
  assert.equal(/referenceImageUrl|referencePage/i.test(runtimeManifestText), false);

  const sourceById = new Map(sourceSpecs.entries.map((entry) => [entry.id, entry]));
  const promptById = new Map(prompts.map((entry) => [entry.id, entry]));
  const correctionCompositeIds = [];
  for (const correction of correctionAttempts) {
    const sourceEntry = sourceById.get(correction.id);
    assert.ok(sourceEntry, `${correction.id}: unknown correction attempt`);
    assert.equal(sourceEntry.assetDecision, "create");
    assert.equal(correction.recordType, "semantic-correction-attempt");
    assert.equal(correction.generator, "OpenAI ImageGen");
    assert.equal(correction.modelMode, "builtin-imagegen");
    assert.equal(
      correction.promptSha256,
      createHash("sha256").update(correction.prompt).digest("hex"),
    );
    assert.ok(correction.prompt.length >= 500);
    assert.ok(correction.referencePaths.length >= 1);
    assert.ok(
      correction.referencePaths.every(
        (referencePath) =>
          /^tmp\/franchise-trophy-references\/.+\.(webp|png|jpg|jpeg)$/.test(
            referencePath,
          ) ||
          referencePath ===
            "art-source/v14/hunter-kit/masters/trophy-xenomorph-skull-p2-chroma.png",
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
  const sourceHashes = [];
  const runtimeHashes = [];
  for (const runtimeEntry of runtimeManifest.entries) {
    const sourceEntry = sourceById.get(runtimeEntry.id);
    assert.ok(sourceEntry, `${runtimeEntry.id}: missing source`);
    assert.equal(runtimeEntry.available, true);
    assert.equal(runtimeEntry.inspection.status, "passed");
    assert.equal(runtimeEntry.visualAnchor, sourceEntry.visualAnchor);
    assert.equal(runtimeEntry.guardrail, sourceEntry.guardrail);
    assert.deepEqual(runtimeEntry.consumers, ["franchise-archive"]);
    assert.ok(runtimeEntry.appearances.length >= 1);
    for (const appearance of runtimeEntry.appearances) {
      assert.match(appearance.sourcePage, /^https?:\/\//);
      assert.ok(appearance.work);
      assert.ok(appearance.year >= 1987 && appearance.year <= 2026);
    }
    if (sourceEntry.assetDecision === "create") {
      const prompt = promptById.get(runtimeEntry.id);
      assert.ok(prompt, `${runtimeEntry.id}: missing prompt`);
      assert.ok(prompt.prompt.length >= 1000);
      assert.match(prompt.prompt, /source lock/i);
      assert.match(prompt.prompt, /#00ff00/i);
      assert.match(prompt.prompt, /original fan-made pixel art/i);
    }
    sourceHashes.push(await inspectMaster(sourceEntry, runtimeEntry));
    runtimeHashes.push(await inspectRuntime(runtimeEntry));
  }
  assertUnique("source hashes", sourceHashes, 92);
  assertUnique("runtime hashes", runtimeHashes, 92);

  assert.doesNotMatch(gameClientSource, /Archive canonique|Référence écran|ARCHIVE V14/);
  assert.match(gameClientSource, /FRANCHISE_TROPHY_ARCHIVE_ASSETS/);
  assert.match(gameClientSource, /<details className="franchise-trophy-archive">/);
  assert.match(gameClientSource, /FRANCHISE_TROPHY_MANIFEST_SUMMARY\.planned/);
  assert.match(gameClientSource, /ARCHIVE V16/);
  assert.match(registrySource, /Hors continuité principale/);
  assert.match(registrySource, /Continuité comics licenciée/);
  assert.match(registrySource, /Produit licencié/);

  console.log(
    "Audit trophées franchise V16 réussi : 92 designs physiques sourcés, 14 exclusions explicites, statuts de continuité honnêtes et alpha valide.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
