import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

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

test("exactly 18 distinct compatible gameplay props resolve for every biome", () => {
  assert.equal(registry.ENVIRONMENT_GAMEPLAY_PROP_ASSIGNMENTS.length, 144);

  for (const layout of Object.values(registry.WORLD_SCREENS_BY_MISSION)) {
    const assignments =
      registry.ENVIRONMENT_GAMEPLAY_PROP_ASSIGNMENTS.filter(
        ({ missionId }) => missionId === layout.missionId,
      );
    assert.equal(assignments.length, 18, `${layout.missionId}: assignment count`);
    assert.equal(
      new Set(assignments.map(({ asset }) => asset.id)).size,
      18,
      `${layout.missionId}: gameplay art must be distinct`,
    );

    for (const screen of layout.screens) {
      for (const feature of screen.features) {
        const assignment = registry.environmentGameplayPropForFeatureId(
          layout.missionId,
          feature.id,
        );
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
      }
    }
  }
});

test("every same-plane physical geometry resolves to a biome-compatible V19 prop", () => {
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
    const featureGeometryIds = new Set(
      registry.ENVIRONMENT_GAMEPLAY_PROP_ASSIGNMENTS.filter(
        ({ missionId }) => missionId === layout.missionId,
      ).map(({ geometryId }) => geometryId),
    );

    for (const [role, geometries] of groups) {
      for (const geometry of geometries) {
        const assignment = registry.environmentGameplayPropForGeometryId(
          layout.missionId,
          geometry.id,
        );
        assert.ok(
          assignment,
          `${layout.missionId}/${geometry.id}: missing physical visual`,
        );
        assert.equal(assignment.missionId, layout.missionId);
        assert.equal(assignment.biomeId, layout.biome);
        assert.equal(assignment.asset.biomeId, layout.biome);
        assert.equal(assignment.asset.role, role);
        assert.equal(assignment.renderPass, "world-gameplay");
        assert.ok(
          layout.screens.some(({ id }) => id === assignment.screenId),
          `${layout.missionId}/${geometry.id}: unknown screen`,
        );
        if (!featureGeometryIds.has(geometry.id)) {
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

test("20 distinct decoration-role assets are deterministic non-colliding sector decor", () => {
  assert.equal(registry.ENVIRONMENT_DECOR_PROP_PLACEMENTS.length, 160);

  for (const layout of Object.values(registry.WORLD_SCREENS_BY_MISSION)) {
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
    assert.equal(decor.length, 20, `${layout.missionId}: decor count`);
    assert.equal(back.length + occluders.length, 20);
    assert.ok(
      [...back, ...occluders].every(
        (placement) => placement.missionId === layout.missionId,
      ),
    );
    assert.equal(
      new Set(decor.map(({ asset }) => asset.id)).size,
      20,
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
      [3, 3, 3, 3, 4, 4],
      `${layout.missionId}: uneven six-sector distribution`,
    );
  }
});

test("sector URL lists are unique, local and limited to that sector", () => {
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
