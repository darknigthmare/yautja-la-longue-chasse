import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(
  join(tmpdir(), "yautja-enemy-trophy-gameplay-v18-"),
);

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "app/game/enemyTrophyGameplayV18.ts"),
    rollupOptions: {
      output: { entryFileNames: "enemy-trophy-gameplay-v18.mjs" },
    },
  },
});

const {
  ENEMY_TROPHY_GAMEPLAY_V18_ASSETS,
  ENEMY_TROPHY_GAMEPLAY_V18_COVERAGE,
  ENEMY_TROPHY_GAMEPLAY_V18_SUMMARY,
  enemyTrophyGameplayForDefinitionId,
  enemyTrophyGameplayForEnemyId,
} = await import(
  pathToFileURL(join(outputDirectory, "enemy-trophy-gameplay-v18.mjs")).href
);

const sourceManifest = JSON.parse(
  await readFile(
    resolve(
      projectRoot,
      "public/game/assets/v17/enemy-trophies/manifest.json",
    ),
    "utf8",
  ),
);
const runtimeManifestText = await readFile(
  resolve(
    projectRoot,
    "public/game/assets/v18/enemy-trophy-gameplay/manifest.json",
  ),
  "utf8",
);
const runtimeManifest = JSON.parse(runtimeManifestText);
const artManifest = JSON.parse(
  await readFile(
    resolve(
      projectRoot,
      "art-source/v18/enemy-trophy-gameplay/manifest.json",
    ),
    "utf8",
  ),
);
const policy = JSON.parse(
  await readFile(
    resolve(
      projectRoot,
      "art-source/v18/enemy-trophy-gameplay/policy.json",
    ),
    "utf8",
  ),
);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

test("V18 exposes complete gameplay coverage for V17 identities", () => {
  assert.equal(ENEMY_TROPHY_GAMEPLAY_V18_SUMMARY.packVersion, 18);
  assert.equal(
    ENEMY_TROPHY_GAMEPLAY_V18_SUMMARY.sourcePackId,
    "enemy-trophies-v17",
  );
  assert.equal(ENEMY_TROPHY_GAMEPLAY_V18_SUMMARY.definitions, 203);
  assert.equal(ENEMY_TROPHY_GAMEPLAY_V18_SUMMARY.enemyIds, 228);
  assert.equal(ENEMY_TROPHY_GAMEPLAY_V18_SUMMARY.available, 203);
  assert.equal(ENEMY_TROPHY_GAMEPLAY_V18_SUMMARY.complete, true);
  assert.equal(ENEMY_TROPHY_GAMEPLAY_V18_SUMMARY.maxDimension, 256);
  assert.equal(ENEMY_TROPHY_GAMEPLAY_V18_SUMMARY.transparentCanvas, true);
  assert.equal(ENEMY_TROPHY_GAMEPLAY_V18_SUMMARY.deterministic, true);
  assert.deepEqual(ENEMY_TROPHY_GAMEPLAY_V18_COVERAGE, {
    definitions: 203,
    enemyIds: 228,
    planned: 203,
    available: 203,
    complete: true,
  });
  assert.equal(ENEMY_TROPHY_GAMEPLAY_V18_ASSETS.length, 203);
  assert.equal(
    enemyTrophyGameplayForDefinitionId(
      "enemy-trophy-optique-balistique",
    )?.partId,
    "insignia",
  );
});

test("V18 resolvers cover every definition and every enemyId exactly", () => {
  const definitionIds = ENEMY_TROPHY_GAMEPLAY_V18_ASSETS.map(
    (entry) => entry.definitionId,
  );
  const enemyIds = ENEMY_TROPHY_GAMEPLAY_V18_ASSETS.flatMap(
    (entry) => entry.enemyIds,
  );
  assert.equal(new Set(definitionIds).size, 203);
  assert.equal(enemyIds.length, 228);
  assert.equal(new Set(enemyIds).size, 228);

  for (const asset of ENEMY_TROPHY_GAMEPLAY_V18_ASSETS) {
    assert.equal(
      enemyTrophyGameplayForDefinitionId(asset.definitionId)?.runtimeUrl,
      asset.runtimeUrl,
    );
    for (const enemyId of asset.enemyIds) {
      assert.equal(
        enemyTrophyGameplayForEnemyId(enemyId)?.definitionId,
        asset.definitionId,
      );
    }
  }

  assert.equal(enemyTrophyGameplayForDefinitionId("missing"), null);
  assert.equal(enemyTrophyGameplayForDefinitionId(null), null);
  assert.equal(enemyTrophyGameplayForEnemyId("missing"), null);
  assert.equal(enemyTrophyGameplayForEnemyId(undefined), null);
});

test("V18 preserves V17 identity while using gameplay-sized alpha exports", () => {
  const sourceById = new Map(
    sourceManifest.entries.map((entry) => [entry.id, entry]),
  );
  const allowedPartIds = new Set([
    "skull",
    "skull-and-spine",
    "mask",
    "insignia",
  ]);

  for (const asset of ENEMY_TROPHY_GAMEPLAY_V18_ASSETS) {
    const source = sourceById.get(asset.definitionId);
    assert.ok(source, `${asset.definitionId}: missing V17 source`);
    assert.equal(asset.id, source.id);
    assert.equal(asset.name, source.name);
    assert.equal(asset.objectKind, source.objectKind);
    assert.deepEqual(asset.enemyIds, source.enemyIds);
    assert.deepEqual(asset.enemyNames, source.enemyNames);
    assert.deepEqual(asset.rosters, source.rosters);
    assert.equal(asset.franchiseStatus, "project-original");
    assert.ok(allowedPartIds.has(asset.partId));
    assert.equal(asset.source.packId, "enemy-trophies-v17");
    assert.equal(asset.source.definitionId, source.id);
    assert.equal(asset.source.sha256, source.metadata.sha256);
    assert.equal(asset.metadata.width <= 256, true);
    assert.equal(asset.metadata.height <= 256, true);
    assert.equal(asset.validation.alpha, true);
    assert.deepEqual(asset.validation.cornerAlpha, [0, 0, 0, 0]);
    assert.equal(
      Math.min(
        asset.validation.padding.left,
        asset.validation.padding.top,
        asset.validation.padding.right,
        asset.validation.padding.bottom,
      ) >= 15,
      true,
    );
    assert.deepEqual(asset.consumers, [
      "hunt-canvas",
      "trophy-wall",
      "trophy-workshop",
    ]);
  }
});

test("V18 policy and manifests exclude the V16 franchise archive", () => {
  assert.deepEqual(policy.sourcePolicy.forbiddenPackIds, [
    "franchise-trophies-v16",
  ]);
  assert.equal(policy.sourcePolicy.newImageGenerationAllowed, false);
  assert.equal(policy.sourcePolicy.genericAliasingAllowed, false);
  assert.equal(policy.derivationPolicy.deterministic, true);
  assert.equal(artManifest.coverage.definitions, 203);
  assert.equal(artManifest.coverage.enemyIds, 228);
  assert.equal(runtimeManifest.coverage.definitions, 203);
  assert.equal(runtimeManifest.coverage.enemyIds, 228);
  assert.equal(/art-source[\\/]/i.test(runtimeManifestText), false);
  assert.equal(/prompt/i.test(runtimeManifestText), false);
  assert.equal(/franchise-trophies-v16/i.test(runtimeManifestText), false);
  assert.equal(/[\\/]v16[\\/]/i.test(runtimeManifestText), false);
});
