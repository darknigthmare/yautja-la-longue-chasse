import assert from "node:assert/strict";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import { ENVIRONMENT_PROP_SPECS } from "../app/game/environmentPropCatalogue.ts";
import {
  auditBiomeDecorV19,
  BiomeDecorV19AuditError,
} from "../scripts/audit-biome-decor-v19.mjs";
import {
  BIOME_DECOR_V19_BIOMES,
  processBiomeDecorV19,
} from "../scripts/process-biome-decor-v19.mjs";

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function keyForBiome(biome) {
  return biome === "jungle" || biome === "swamp"
    ? { r: 255, g: 0, b: 255 }
    : { r: 0, g: 255, b: 0 };
}

function specsForBiome(biome) {
  return ENVIRONMENT_PROP_SPECS.filter((spec) => spec.biomeId === biome);
}

function overriddenSpecPath(root, specPath, canonicalPrefix) {
  return path.join(root, specPath.slice(canonicalPrefix.length));
}

async function writeImageGenFixture(filePath, biomeIndex) {
  const biome = BIOME_DECOR_V19_BIOMES[biomeIndex];
  const key = keyForBiome(biome);
  const width = 640;
  const height = 640;
  const subjectWidth = 240 + biomeIndex * 9;
  const subjectHeight = 180 + biomeIndex * 7;
  const left = 170 - biomeIndex * 3;
  const top = 220 - biomeIndex * 4;
  const color = {
    r: 215 - biomeIndex * 11,
    g: 58 + biomeIndex * 9,
    b: 28 + biomeIndex * 12,
  };
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: key,
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" ` +
            `width="${width}" height="${height}">` +
            `<path d="M${left} ${top + subjectHeight} ` +
            `L${left + Math.round(subjectWidth * 0.12)} ${top + 20} ` +
            `L${left + subjectWidth - 18} ${top} ` +
            `L${left + subjectWidth} ${top + subjectHeight - 24} ` +
            `L${left + Math.round(subjectWidth * 0.55)} ${top + subjectHeight} Z" ` +
            `fill="rgb(${color.r},${color.g},${color.b})"/></svg>`,
        ),
      },
    ])
    .png()
    .toFile(filePath);
}

test("V19 processes ImageGen PNGs through the official chroma helper without deleting inputs", async (t) => {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "yautja-v19-process-test-"),
  );
  t.after(async () => {
    await rm(temporaryRoot, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  });
  const input = path.join(temporaryRoot, "imagegen-output.png");
  const artRoot = path.join(temporaryRoot, "art-source");
  const publicRoot = path.join(temporaryRoot, "public");
  await writeImageGenFixture(input, 0);
  const spec = specsForBiome("jungle")[0];

  const result = await processBiomeDecorV19({
    input,
    definitionId: spec.definitionId,
    artRoot,
    publicRoot,
  });

  assert.equal(result.generator, "OpenAI ImageGen");
  assert.equal(result.modelMode, "builtin-imagegen");
  assert.equal(result.definitionId, spec.definitionId);
  assert.equal(result.chromaKey, "#FF00FF");
  assert.equal(result.inputDeleted, false);
  assert.equal(await exists(input), true, "processor must retain its input PNG");
  assert.equal(await exists(result.master.path), true);
  assert.equal(await exists(result.runtime.path), true);
  assert.notEqual(result.master.sha256, result.runtime.sha256);
  assert.equal(result.runtimeInspection.alpha, true);
  assert.ok(result.runtimeInspection.transparentRatio >= 0.25);

  const masterMetadata = await sharp(result.master.path).metadata();
  const runtimeMetadata = await sharp(result.runtime.path).metadata();
  assert.deepEqual(
    [
      masterMetadata.format,
      masterMetadata.hasAlpha,
      runtimeMetadata.format,
      runtimeMetadata.hasAlpha,
    ],
    ["webp", false, "webp", true],
  );
  assert.ok(runtimeMetadata.width < masterMetadata.width);
  assert.ok(runtimeMetadata.height < masterMetadata.height);
  assert.ok(runtimeMetadata.width <= 768);
  assert.ok(runtimeMetadata.height <= 768);
});

test("V19 audits a complete biome set, emits QA artifacts, and rejects duplicate hashes", async (t) => {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "yautja-v19-audit-test-"),
  );
  t.after(async () => {
    await rm(temporaryRoot, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  });
  const artRoot = path.join(temporaryRoot, "art-source");
  const publicRoot = path.join(temporaryRoot, "public");
  const qaReportPath = path.join(artRoot, "qa-report.json");
  const contactRoot = path.join(artRoot, "contact-sheets");

  for (const [index, biome] of BIOME_DECOR_V19_BIOMES.entries()) {
    const input = path.join(temporaryRoot, `${biome}-imagegen.png`);
    await writeImageGenFixture(input, index);
    const spec = specsForBiome(biome)[0];
    await processBiomeDecorV19({
      input,
      definitionId: spec.definitionId,
      artRoot,
      publicRoot,
    });
  }

  const report = await auditBiomeDecorV19({
    artRoot,
    publicRoot,
    expectedPerBiome: 1,
    qaReportPath,
    contactRoot,
    contactCellSize: 96,
  });
  assert.equal(report.valid, true);
  assert.equal(report.complete, true);
  assert.equal(report.summary.inspected, 8);
  assert.equal(report.summary.uniqueMasterHashes, 8);
  assert.equal(report.summary.uniqueRuntimeHashes, 8);
  assert.equal(report.contactSheets.length, 8);
  assert.equal(await exists(qaReportPath), true);
  const writtenReport = JSON.parse(await readFile(qaReportPath, "utf8"));
  assert.equal(writtenReport.complete, true);
  for (const biome of BIOME_DECOR_V19_BIOMES) {
    assert.equal(
      await exists(path.join(contactRoot, `${biome}-contact-sheet.webp`)),
      true,
      `${biome}: contact sheet`,
    );
    const originalId = report.entries.find(
      (entry) => entry.biome === biome,
    ).id;
    const firstSpec = ENVIRONMENT_PROP_SPECS.find(
      (spec) => spec.id === originalId,
    );
    const secondSpec = specsForBiome(biome)[1];
    const firstMaster = overriddenSpecPath(
      artRoot,
      firstSpec.masterPath,
      "art-source/v19/biome-decor/",
    );
    const secondMaster = overriddenSpecPath(
      artRoot,
      secondSpec.masterPath,
      "art-source/v19/biome-decor/",
    );
    const firstRuntime = overriddenSpecPath(
      publicRoot,
      firstSpec.runtimePath,
      "public/game/assets/v19/biome-decor/",
    );
    const secondRuntime = overriddenSpecPath(
      publicRoot,
      secondSpec.runtimePath,
      "public/game/assets/v19/biome-decor/",
    );
    await mkdir(path.dirname(secondMaster), { recursive: true });
    await mkdir(path.dirname(secondRuntime), { recursive: true });
    await copyFile(
      firstMaster,
      secondMaster,
    );
    await copyFile(
      firstRuntime,
      secondRuntime,
    );
  }

  await assert.rejects(
    auditBiomeDecorV19({
      artRoot,
      publicRoot,
      expectedPerBiome: 2,
      writeArtifacts: false,
    }),
    (error) => {
      assert.ok(error instanceof BiomeDecorV19AuditError);
      assert.ok(
        error.report.errors.some((message) =>
          message.includes("runtime identique"),
        ),
      );
      return true;
    },
  );
});

test("V19 incomplete packs fail before writing QA reports or contact sheets", async (t) => {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "yautja-v19-incomplete-test-"),
  );
  t.after(async () => {
    await rm(temporaryRoot, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  });
  const artRoot = path.join(temporaryRoot, "art-source");
  const publicRoot = path.join(temporaryRoot, "public");
  const qaReportPath = path.join(artRoot, "qa-report.json");
  const contactRoot = path.join(artRoot, "contact-sheets");

  await assert.rejects(
    auditBiomeDecorV19({
      artRoot,
      publicRoot,
      expectedPerBiome: 1,
      qaReportPath,
      contactRoot,
    }),
    BiomeDecorV19AuditError,
  );
  assert.equal(await exists(qaReportPath), false);
  assert.equal(await exists(contactRoot), false);
});
