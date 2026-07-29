import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  ENVIRONMENT_PROP_BIOME_IDS,
  ENVIRONMENT_PROP_ROLE_TARGETS,
  ENVIRONMENT_PROP_SPECS,
} from "../app/game/environmentPropCatalogue.ts";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const artRoot = path.join(projectRoot, "art-source", "v19", "biome-decor");
const runtimeRoot = path.join(
  projectRoot,
  "public",
  "game",
  "assets",
  "v19",
  "biome-decor",
);
const sourceSpecsPath = path.join(artRoot, "source-specs.json");
const policyPath = path.join(artRoot, "policy.json");
const publicManifestPath = path.join(runtimeRoot, "manifest.json");
const runtimeDataPath = path.join(
  projectRoot,
  "app",
  "game",
  "environmentPropRuntimeData.ts",
);
const availabilityDataPath = path.join(
  projectRoot,
  "app",
  "game",
  "environmentPropAvailabilityData.ts",
);

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

function runtimeAssetFromSpec(spec) {
  return {
    id: spec.id,
    version: spec.version,
    generator: spec.generator,
    provenance: spec.provenance,
    biomeId: spec.biomeId,
    role: spec.role,
    archetypeId: spec.archetypeId,
    variantId: spec.variantId,
    label: spec.label,
    runtimeUrl: spec.runtimeUrl,
  };
}

function runtimeDataModule(runtimeAssets) {
  return `/**
 * Generated V19 runtime-only biome prop data.
 *
 * Do not add prompts, chroma metadata, subjects or art-source paths here.
 * Regenerate with: node scripts/build-biome-decor-v19-manifests.mjs --runtime-data-only
 */

export type EnvironmentPropBiomeId =
  | "jungle"
  | "ice"
  | "volcano"
  | "swamp"
  | "desert"
  | "ocean"
  | "fungal"
  | "ruins";

export type EnvironmentPropRole =
  | "platform"
  | "climbable"
  | "cover"
  | "hazard"
  | "surface"
  | "decoration";

export interface EnvironmentPropRuntimeAsset {
  id: string;
  version: 19;
  generator: "OpenAI built-in image_gen";
  provenance: "project-original";
  biomeId: EnvironmentPropBiomeId;
  role: EnvironmentPropRole;
  archetypeId: string;
  variantId: string;
  label: string;
  runtimeUrl: string;
}

export const ENVIRONMENT_PROP_BIOME_IDS = Object.freeze(
  ${JSON.stringify(ENVIRONMENT_PROP_BIOME_IDS)},
) as readonly EnvironmentPropBiomeId[];

export const ENVIRONMENT_PROP_RUNTIME_ASSETS = Object.freeze(
  ${JSON.stringify(runtimeAssets, null, 2)},
) as readonly EnvironmentPropRuntimeAsset[];
`;
}

function availabilityDataModule(availableRuntimeIds) {
  return `/**
 * Generated V19 runtime availability projection.
 *
 * This file contains stable catalogue ids only. Source paths, prompts and
 * production metadata remain outside the runtime boundary.
 * Regenerate with: node scripts/build-biome-decor-v19-manifests.mjs --runtime-data-only
 */

export const ENVIRONMENT_PROP_AVAILABLE_RUNTIME_IDS = Object.freeze(
  ${JSON.stringify(availableRuntimeIds, null, 2)},
) as readonly string[];
`;
}

function assertInsideProject(filePath) {
  const resolved = path.resolve(projectRoot, filePath);
  assert.ok(
    resolved.startsWith(`${projectRoot}${path.sep}`),
    `Path escapes project root: ${filePath}`,
  );
  return resolved;
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function availableRuntimeIds() {
  const availability = await mapWithConcurrency(
    ENVIRONMENT_PROP_SPECS,
    16,
    async (spec) => {
      const [masterAvailable, runtimeAvailable] = await Promise.all([
        pathExists(assertInsideProject(spec.masterPath)),
        pathExists(assertInsideProject(spec.runtimePath)),
      ]);
      return masterAvailable && runtimeAvailable ? spec.id : null;
    },
  );
  return availability.filter(Boolean);
}

async function inspectAsset(filePath) {
  const buffer = await readFile(filePath);
  const metadata = await sharp(buffer).metadata();
  return {
    bytes: buffer.length,
    width: metadata.width,
    height: metadata.height,
    channels: metadata.channels,
    hasAlpha: metadata.hasAlpha === true,
    format: metadata.format,
    sha256: sha256(buffer),
  };
}

async function buildEntry(spec) {
  const masterFile = assertInsideProject(spec.masterPath);
  const runtimeFile = assertInsideProject(spec.runtimePath);
  const [master, runtime] = await Promise.all([
    inspectAsset(masterFile),
    inspectAsset(runtimeFile),
  ]);

  assert.equal(master.format, "webp", `${spec.id}: master format`);
  assert.equal(runtime.format, "webp", `${spec.id}: runtime format`);
  assert.equal(runtime.hasAlpha, true, `${spec.id}: runtime alpha`);

  const sourceEntry = {
    id: spec.id,
    definitionId: spec.definitionId,
    biomeId: spec.biomeId,
    planetName: spec.planetName,
    role: spec.role,
    archetypeId: spec.archetypeId,
    variantId: spec.variantId,
    label: spec.label,
    subject: spec.subject,
    silhouette: spec.silhouette,
    generator: spec.generator,
    provenance: spec.provenance,
    chroma: spec.chroma,
    prompt: spec.prompt,
    promptSha256: sha256(Buffer.from(spec.prompt, "utf8")),
    master: {
      path: relativeProjectPath(masterFile),
      ...master,
    },
    runtime: {
      path: relativeProjectPath(runtimeFile),
      url: spec.runtimeUrl,
      ...runtime,
    },
    inspection: {
      status: "passed",
      separation:
        "OpenAI chroma master remains under art-source; only the project-created alpha WebP is public.",
    },
  };

  const publicEntry = {
    id: spec.id,
    definitionId: spec.definitionId,
    biomeId: spec.biomeId,
    role: spec.role,
    archetypeId: spec.archetypeId,
    variantId: spec.variantId,
    label: spec.label,
    generator: spec.generator,
    provenance: spec.provenance,
    runtimePath: relativeProjectPath(runtimeFile),
    runtimeUrl: spec.runtimeUrl,
    planned: true,
    available: true,
    metadata: runtime,
    inspection: {
      status: "passed",
      notes:
        "Original OpenAI-generated project prop, locally separated from its chroma source and audited for runtime use.",
    },
  };

  return { sourceEntry, publicEntry };
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

function coverageFor(entries) {
  const byBiome = Object.fromEntries(
    ENVIRONMENT_PROP_BIOME_IDS.map((biomeId) => {
      const biomeEntries = entries.filter(
        (entry) => entry.biomeId === biomeId,
      );
      return [
        biomeId,
        {
          planned: 100,
          available: biomeEntries.length,
          complete: biomeEntries.length === 100,
          byRole: Object.fromEntries(
            Object.keys(ENVIRONMENT_PROP_ROLE_TARGETS).map((role) => [
              role,
              biomeEntries.filter((entry) => entry.role === role).length,
            ]),
          ),
        },
      ];
    }),
  );
  return {
    biomes: ENVIRONMENT_PROP_BIOME_IDS.length,
    planned: ENVIRONMENT_PROP_SPECS.length,
    available: entries.length,
    complete: entries.length === ENVIRONMENT_PROP_SPECS.length,
    byBiome,
  };
}

async function main() {
  assert.equal(ENVIRONMENT_PROP_BIOME_IDS.length, 8);
  assert.equal(ENVIRONMENT_PROP_SPECS.length, 800);
  assert.equal(new Set(ENVIRONMENT_PROP_SPECS.map(({ id }) => id)).size, 800);

  const runtimeAssets = ENVIRONMENT_PROP_SPECS.map(runtimeAssetFromSpec);
  const availableIds = await availableRuntimeIds();
  await Promise.all([
    writeFile(runtimeDataPath, runtimeDataModule(runtimeAssets), "utf8"),
    writeFile(
      availabilityDataPath,
      availabilityDataModule(availableIds),
      "utf8",
    ),
  ]);
  if (process.argv.includes("--runtime-data-only")) {
    console.log(
      `Biome decor V19 runtime data: ${runtimeAssets.length} sanitized entries, ${availableIds.length} available pairs written.`,
    );
    return;
  }

  const built = await mapWithConcurrency(
    ENVIRONMENT_PROP_SPECS,
    8,
    buildEntry,
  );
  const sourceEntries = built.map(({ sourceEntry }) => sourceEntry);
  const publicEntries = built.map(({ publicEntry }) => publicEntry);
  assert.equal(
    new Set(publicEntries.map(({ metadata }) => metadata.sha256)).size,
    800,
    "Every runtime prop must have a unique hash",
  );

  const coverage = coverageFor(publicEntries);
  assert.equal(coverage.complete, true);
  for (const biomeId of ENVIRONMENT_PROP_BIOME_IDS) {
    assert.deepEqual(
      coverage.byBiome[biomeId].byRole,
      ENVIRONMENT_PROP_ROLE_TARGETS,
      `${biomeId}: role coverage`,
    );
  }

  await writeJson(policyPath, {
    schemaVersion: 1,
    packId: "biome-decor-v19",
    packVersion: 19,
    authority: "app/game/environmentPropCatalogue.ts",
    generator: "OpenAI built-in image_gen",
    sourcePolicy: {
      projectOriginalOnly: true,
      officialRuntimeAssetsForbidden: true,
      downloadedReferencesPubliclyForbidden: true,
      promptsAndMastersPubliclyForbidden: true,
    },
    runtimePolicy: {
      format: "WebP",
      alpha: true,
      camera: "strict-orthographic-side-view",
      playerPlane: true,
    },
  });
  await writeJson(sourceSpecsPath, {
    schemaVersion: 1,
    packId: "biome-decor-v19",
    packVersion: 19,
    generator: "OpenAI built-in image_gen",
    coverage,
    entries: sourceEntries,
  });
  await writeJson(publicManifestPath, {
    schemaVersion: 1,
    packId: "biome-decor-v19",
    packVersion: 19,
    generator: "OpenAI built-in image_gen",
    assetRoot: "/game/assets/v19/biome-decor",
    coverage,
    entries: publicEntries,
  });

  console.log(
    `Biome decor V19: ${publicEntries.length} assets, 100 per biome, manifests written.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
