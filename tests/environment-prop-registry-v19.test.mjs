import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

import { ENVIRONMENT_PROP_SPECS } from "../app/game/environmentPropCatalogue.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(
  join(tmpdir(), "yautja-environment-prop-registry-"),
);

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(
      projectRoot,
      "tests/fixtures/environment-prop-registry-entry.ts",
    ),
    rollupOptions: {
      output: { entryFileNames: "environment-prop-registry.mjs" },
    },
  },
});

const registry = await import(
  pathToFileURL(
    join(outputDirectory, "environment-prop-registry.mjs"),
  ).href
);
const bundledRegistrySource = await readFile(
  join(outputDirectory, "environment-prop-registry.mjs"),
  "utf8",
);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

test("V19 runtime projection strips source-only generation fields", () => {
  assert.equal(registry.ENVIRONMENT_PROP_RUNTIME_ASSETS.length, 800);
  for (const asset of registry.ENVIRONMENT_PROP_RUNTIME_ASSETS) {
    assert.equal(asset.version, 19);
    assert.equal(asset.provenance, "project-original");
    assert.equal(asset.generator, "OpenAI built-in image_gen");
    assert.ok(asset.runtimeUrl.startsWith("/game/assets/v19/biome-decor/"));
    assert.equal("prompt" in asset, false);
    assert.equal("masterPath" in asset, false);
    assert.equal("runtimePath" in asset, false);
    assert.equal("chroma" in asset, false);
    assert.equal("subject" in asset, false);
    assert.equal("silhouette" in asset, false);
  }
});

test("the runtime bundle excludes the source production catalogue", () => {
  assert.doesNotMatch(
    bundledRegistrySource,
    /Primary request:|Originality:|art-source\/v19\/biome-decor|masterPath/,
  );
});

test("runtime availability exactly matches complete source/runtime pairs", async () => {
  const availableIds = new Set(
    registry.ENVIRONMENT_PROP_AVAILABLE_RUNTIME_ASSETS.map(({ id }) => id),
  );
  assert.equal(
    availableIds.size,
    registry.ENVIRONMENT_PROP_AVAILABLE_RUNTIME_ASSETS.length,
  );

  for (const spec of ENVIRONMENT_PROP_SPECS) {
    const [masterExists, runtimeExists] = await Promise.all([
      pathExists(resolve(projectRoot, spec.masterPath)),
      pathExists(resolve(projectRoot, spec.runtimePath)),
    ]);
    assert.equal(
      availableIds.has(spec.id),
      masterExists && runtimeExists,
      `${spec.id}: availability projection`,
    );
  }
});

test("gameplay assignments use available compatible props or stay procedural", () => {
  for (const layout of Object.values(registry.WORLD_SCREENS_BY_MISSION)) {
    const assignments =
      registry.ENVIRONMENT_GAMEPLAY_PROP_ASSIGNMENTS.filter(
        ({ missionId }) => missionId === layout.missionId,
      );
    assert.equal(
      new Set(assignments.map(({ asset }) => asset.id)).size,
      assignments.length,
      `${layout.missionId}: available gameplay art must be distinct`,
    );

    for (const screen of layout.screens) {
      for (const feature of screen.features) {
        const compatibleAvailable =
          registry.ENVIRONMENT_PROP_AVAILABLE_RUNTIME_ASSETS.filter((asset) =>
            registry.isEnvironmentPropCompatibleWithFeature(
              layout.biome,
              feature,
              asset,
            ),
          );
        const assignment = registry.environmentGameplayPropForFeatureId(
          layout.missionId,
          feature.id,
        );
        if (compatibleAvailable.length === 0) {
          assert.equal(
            assignment,
            null,
            `${layout.missionId}/${feature.id}: procedural fallback expected`,
          );
          continue;
        }
        assert.ok(assignment, `${layout.missionId}/${feature.id}: assignment`);
        assert.equal(assignment.screenId, screen.id);
        assert.equal(assignment.geometryId, `feature-${feature.id}`);
        assert.equal(assignment.renderPass, "world-gameplay");
        assert.equal(
          registry.environmentGameplayPropForGeometryId(
            layout.missionId,
            `feature-${feature.id}`,
          ),
          assignment,
        );
        assert.equal(
          registry.isEnvironmentPropCompatibleWithFeature(
            layout.biome,
            feature,
            assignment.asset,
          ),
          true,
          `${layout.missionId}/${feature.id}: incompatible role or kind`,
        );
        assert.equal(
          registry.isEnvironmentPropRuntimeAvailable(assignment.asset),
          true,
        );
      }
    }
  }
});

test("same-plane geometry uses available V19 props and otherwise stays procedural", () => {
  let expectedLegacyCount = 0;

  for (const layout of Object.values(registry.WORLD_SCREENS_BY_MISSION)) {
    const world = registry.WORLD_BLUEPRINTS_BY_MISSION[layout.missionId];
    const groups = [
      ["platform", world.platforms],
      ["climbable", world.climbables],
      ["cover", world.covers],
      ["hazard", world.hazards],
      ["surface", world.surfaces],
    ];
    const featuresByGeometryId = new Map(
      layout.screens.flatMap((screen) =>
        screen.features.map((feature) => [
          `feature-${feature.id}`,
          feature,
        ]),
      ),
    );

    for (const [role, geometries] of groups) {
      for (const geometry of geometries) {
        const feature = featuresByGeometryId.get(geometry.id);
        const candidates =
          registry.ENVIRONMENT_PROP_AVAILABLE_RUNTIME_ASSETS.filter(
            (asset) =>
              asset.biomeId === layout.biome &&
              (feature
                ? registry.isEnvironmentPropCompatibleWithFeature(
                    layout.biome,
                    feature,
                    asset,
                  )
                : asset.role === role),
          );
        const assignment = registry.environmentGameplayPropForGeometryId(
          layout.missionId,
          geometry.id,
        );
        if (candidates.length === 0) {
          assert.equal(
            assignment,
            null,
            `${layout.missionId}/${geometry.id}: procedural fallback expected`,
          );
          continue;
        }
        assert.ok(
          assignment,
          `${layout.missionId}/${geometry.id}: missing physical visual`,
        );
        assert.equal(assignment.missionId, layout.missionId);
        assert.equal(assignment.biomeId, layout.biome);
        assert.equal(assignment.asset.biomeId, layout.biome);
        assert.equal(assignment.asset.role, role);
        assert.equal(
          registry.isEnvironmentPropRuntimeAvailable(assignment.asset),
          true,
        );
        assert.equal(assignment.renderPass, "world-gameplay");
        assert.ok(
          layout.screens.some(({ id }) => id === assignment.screenId),
          `${layout.missionId}/${geometry.id}: unknown screen`,
        );
        if (!feature) {
          expectedLegacyCount += 1;
          assert.equal(assignment.source, "legacy-world-geometry");
          assert.equal(assignment.geometryRole, role);
        }
      }
    }
  }

  assert.equal(
    registry.ENVIRONMENT_LEGACY_GEOMETRY_PROP_ASSIGNMENTS.length,
    expectedLegacyCount,
  );
});

test("available decoration assets become deterministic non-colliding sector decor", () => {
  const availableDecor = registry.ENVIRONMENT_PROP_AVAILABLE_RUNTIME_ASSETS.filter(
    ({ role }) => role === "decoration",
  );
  assert.equal(
    registry.ENVIRONMENT_DECOR_PROP_PLACEMENTS.length,
    availableDecor.length,
  );

  for (const layout of Object.values(registry.WORLD_SCREENS_BY_MISSION)) {
    const expectedDecorCount = availableDecor.filter(
      ({ biomeId }) => biomeId === layout.biome,
    ).length;
    const decor = registry.ENVIRONMENT_DECOR_PROP_PLACEMENTS.filter(
      ({ missionId }) => missionId === layout.missionId,
    );
    const back = registry.environmentDecorPlacementsForMission(
      layout.missionId,
      "world-back",
    );
    const occluders = registry.environmentDecorPlacementsForMission(
      layout.missionId,
      "actor-occluder",
    );
    assert.equal(
      decor.length,
      expectedDecorCount,
      `${layout.missionId}: decor count`,
    );
    assert.equal(back.length + occluders.length, expectedDecorCount);
    assert.ok(
      [...back, ...occluders].every(
        (placement) => placement.missionId === layout.missionId,
      ),
    );
    assert.equal(
      new Set(decor.map(({ asset }) => asset.id)).size,
      expectedDecorCount,
      `${layout.missionId}: decor art must be distinct`,
    );
    assert.ok(
      decor.every(({ asset }) => asset.role === "decoration"),
      `${layout.missionId}: only decoration-role art may imply no collision`,
    );

    const sectorCounts = layout.screens.map((screen) => {
      const placements = registry.environmentDecorPlacementsForSector(
        layout.missionId,
        screen.id,
      );
      for (const placement of placements) {
        assert.equal(placement.screenId, screen.id);
        assert.equal(placement.collision, "none");
        assert.ok(
          placement.renderPass === "world-back" ||
            placement.renderPass === "actor-occluder",
        );
        assert.ok(
          placement.x - placement.estimatedWidth / 2 >= screen.startX,
        );
        assert.ok(
          placement.x + placement.estimatedWidth / 2 <= screen.endX,
        );
        assert.ok(placement.estimatedWidth > 0);
        assert.ok(placement.scale >= 0.48 && placement.scale <= 0.76);
        assert.ok(placement.opacity >= 0.66 && placement.opacity <= 0.94);
      }
      return placements.length;
    });
    assert.deepEqual(
      [...sectorCounts].sort((left, right) => left - right),
      Array.from({ length: 6 }, (_, screenIndex) =>
        Math.floor(expectedDecorCount / 6) +
        (screenIndex < expectedDecorCount % 6 ? 1 : 0),
      ).sort((left, right) => left - right),
      `${layout.missionId}: uneven six-sector distribution`,
    );
  }
});

test("available physical variants rotate across persistent hunt attempts", () => {
  for (const layout of Object.values(registry.WORLD_SCREENS_BY_MISSION)) {
    const expectedIds = new Set(
      registry.ENVIRONMENT_PROP_AVAILABLE_RUNTIME_ASSETS.filter(
        ({ biomeId, role }) =>
          biomeId === layout.biome && role !== "decoration",
      ).map(({ id }) => id),
    );
    const seenIds = new Set();
    const world = registry.WORLD_BLUEPRINTS_BY_MISSION[layout.missionId];
    const geometries = [
      ...world.platforms,
      ...world.climbables,
      ...world.covers,
      ...world.hazards,
      ...world.surfaces,
    ];

    for (let encounterRun = 0; encounterRun < 100; encounterRun += 1) {
      for (const geometry of geometries) {
        const assignment = registry.environmentGameplayPropForGeometryId(
          layout.missionId,
          geometry.id,
          encounterRun,
        );
        if (assignment) seenIds.add(assignment.asset.id);
      }
    }

    assert.deepEqual(
      [...seenIds].filter((id) => expectedIds.has(id)).sort(),
      [...expectedIds].sort(),
      `${layout.missionId}: every available physical variant must be reachable`,
    );
  }
});

test("sector URL lists are unique, available, local and limited to that sector", async () => {
  for (const layout of Object.values(registry.WORLD_SCREENS_BY_MISSION)) {
    for (const screen of layout.screens) {
      const urls = registry.environmentPropRuntimeUrlsForSector(
        layout.missionId,
        screen.id,
      );
      const expectedUrls = new Set([
        ...registry.ENVIRONMENT_GAMEPLAY_PROP_ASSIGNMENTS,
        ...registry.ENVIRONMENT_LEGACY_GEOMETRY_PROP_ASSIGNMENTS,
      ].filter(
        (assignment) =>
          assignment.missionId === layout.missionId &&
          assignment.screenId === screen.id,
      ).map((assignment) => assignment.asset.runtimeUrl));
      for (const placement of registry.environmentDecorPlacementsForSector(
        layout.missionId,
        screen.id,
      )) {
        expectedUrls.add(placement.asset.runtimeUrl);
      }
      assert.deepEqual(new Set(urls), expectedUrls);
      assert.equal(new Set(urls).size, urls.length);
      assert.ok(
        urls.every((url) =>
          url.startsWith(
            `/game/assets/v19/biome-decor/${layout.biome}/`,
          ),
        ),
      );
      for (const url of urls) {
        assert.equal(
          await pathExists(resolve(projectRoot, "public", url.slice(1))),
          true,
          `${layout.missionId}/${screen.id}: missing ${url}`,
        );
      }
    }
  }
});

test("decor culling observes sprite width, overscan and render passes", () => {
  const layout = registry.WORLD_SCREENS_BY_MISSION["jungle-vey"];
  const screen = layout.screens[0];
  const placements = registry.environmentDecorPlacementsForSector(
    layout.missionId,
    screen.id,
  );
  const back = registry.environmentDecorPlacementsForSector(
    layout.missionId,
    screen.id,
    "world-back",
  );
  const occluders = registry.environmentDecorPlacementsForSector(
    layout.missionId,
    screen.id,
    "actor-occluder",
  );
  assert.equal(back.length + occluders.length, placements.length);

  const first = placements[0];
  assert.deepEqual(
    registry.cullEnvironmentDecorPlacements(placements, {
      left: first.x,
      right: first.x,
      overscan: 0,
    }).includes(first),
    true,
  );
  assert.deepEqual(
    registry.cullEnvironmentDecorPlacements(placements, {
      left: -10_000,
      right: -9_000,
      overscan: 0,
    }),
    [],
  );
  assert.throws(
    () =>
      registry.cullEnvironmentDecorPlacements(placements, {
        left: 10,
        right: 0,
      }),
    /cull window is invalid/,
  );
});
