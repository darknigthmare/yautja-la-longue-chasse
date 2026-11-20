import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";
import { EXPECTED_FEATURE_CLIMB_FAMILIES, EXPECTED_LEGACY_CLIMB_FAMILIES } from "./fixtures/environment-prop-raccord-contract-20261120.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = await mkdtemp(join(tmpdir(), "yautja-prop-raccords-20261120-"));
await build({
  configFile: false, publicDir: false, logLevel: "silent",
  build: {
    emptyOutDir: true, outDir: output,
    ssr: resolve(root, "tests/fixtures/environment-prop-registry-entry.ts"),
    rollupOptions: { output: { entryFileNames: "registry.mjs" } },
  },
});
const registry = await import(pathToFileURL(join(output, "registry.mjs")).href);
after(() => rm(output, { recursive: true, force: true }));

test("room-plan climbs prefer their first independently declared available family", () => {
  let checked = 0;
  const coveredBiomes = new Set();
  for (const layout of Object.values(registry.WORLD_SCREENS_BY_MISSION)) {
    for (const feature of layout.screens.flatMap(({ features }) => features).filter(({ role }) => role === "climb")) {
      const priorities = EXPECTED_FEATURE_CLIMB_FAMILIES[layout.biome]?.[feature.kind];
      assert.ok(Array.isArray(priorities), `${layout.missionId}/${feature.id}: unreviewed room-plan support`);
      const expected = priorities.find((family) => registry.ENVIRONMENT_PROP_AVAILABLE_RUNTIME_ASSETS.some(
        (asset) => asset.biomeId === layout.biome && asset.role === "climbable" && asset.archetypeId === family,
      ));
      for (const encounterRun of [0, 1, 4, 31]) {
        const actual = registry.environmentGameplayPropForFeatureId(layout.missionId, feature.id, encounterRun);
        if (!expected) assert.equal(actual, null, feature.id);
        else {
          assert.ok(actual, feature.id);
          assert.equal(actual.asset.archetypeId, expected, `${feature.id}/run${encounterRun}`);
          assert.equal(actual.asset.role, "climbable");
          assert.equal(actual.asset.biomeId, layout.biome);
        }
      }
      checked += 1;
      coveredBiomes.add(layout.biome);
    }
  }
  assert.ok(checked > 0);
  assert.deepEqual([...coveredBiomes].sort(), Object.keys(EXPECTED_FEATURE_CLIMB_FAMILIES).sort(),
    "exercise real climbing features in all eight room plans");
});

test("the six reported raccord regressions use the intended family or explicit native fallback", () => {
  const cases = [
    ["jungle-vey", "feature-j-canopy-vine", 0, "hanging-vine"],
    ["jungle-vey", "feature-j-ruins-ladder", 0, "field-ladder"],
    ["jungle-vey", "feature-j-lake-vine", 0, "hanging-vine"],
    ["jungle-vey", "j-tree-west", 0, "buttress-trunk"],
    ["ice-cryostalker", "i-mine-ladder", 0, null],
    ["ice-cryostalker", "i-gantry-rope", 1, "maintenance-rope"],
  ];
  for (const [missionId, geometryId, encounterRun, family] of cases) {
    const geometry = registry.WORLD_BLUEPRINTS_BY_MISSION[missionId].climbables.find(({ id }) => id === geometryId);
    assert.ok(geometry, geometryId);
    const actual = registry.environmentGameplayPropForGeometryId(missionId, geometryId, encounterRun);
    if (family === null) assert.equal(actual, null, geometryId);
    else {
      assert.ok(actual, geometryId);
      assert.equal(actual.asset.archetypeId, family, geometryId);
    }
  }
});

test("every legacy climb has an explicit independent family or procedural decision", () => {
  let assigned = 0, procedural = 0;
  for (const layout of Object.values(registry.WORLD_SCREENS_BY_MISSION)) {
    const featureIds = new Set(layout.screens.flatMap(({ features }) => features.map(({ id }) => `feature-${id}`)));
    for (const geometry of registry.WORLD_BLUEPRINTS_BY_MISSION[layout.missionId].climbables) {
      if (featureIds.has(geometry.id)) continue;
      const byKind = EXPECTED_LEGACY_CLIMB_FAMILIES[layout.biome];
      assert.ok(Object.hasOwn(byKind, geometry.kind), `${layout.biome}/${geometry.kind}: missing reviewed expectation`);
      const families = byKind[geometry.kind];
      const available = registry.ENVIRONMENT_PROP_AVAILABLE_RUNTIME_ASSETS.filter(
        (asset) => asset.biomeId === layout.biome && asset.role === "climbable" && families.includes(asset.archetypeId),
      );
      for (const encounterRun of [0, 1, 4, 31]) {
        const actual = registry.environmentGameplayPropForGeometryId(layout.missionId, geometry.id, encounterRun);
        if (available.length === 0) assert.equal(actual, null, geometry.id);
        else {
          assert.ok(actual, geometry.id);
          assert.ok(families.includes(actual.asset.archetypeId), `${geometry.id}: unrelated family`);
          assert.equal(actual.asset.biomeId, layout.biome);
          assert.equal(actual.asset.role, "climbable");
          assert.equal(actual.geometryId, geometry.id);
          assert.equal(actual.source, "legacy-world-geometry");
        }
      }
      if (available.length) assigned += 1;
      else procedural += 1;
    }
  }
  assert.ok(assigned > 0 && procedural > 0, "cover both admitted artwork and unchanged native fallback geometry");
});

test("registry lookups and encounter rotation never mutate physical worlds or room plans", () => {
  const worlds = JSON.stringify(registry.WORLD_BLUEPRINTS_BY_MISSION);
  const screens = JSON.stringify(registry.WORLD_SCREENS_BY_MISSION);
  for (const [missionId, world] of Object.entries(registry.WORLD_BLUEPRINTS_BY_MISSION)) {
    for (const encounterRun of [0, 1, 4, 31, 99]) {
      for (const group of [world.platforms, world.climbables, world.covers, world.hazards, world.surfaces]) {
        for (const geometry of group) registry.environmentGameplayPropForGeometryId(missionId, geometry.id, encounterRun);
      }
      for (const screen of registry.WORLD_SCREENS_BY_MISSION[missionId].screens) {
        registry.environmentPropRuntimeUrlsForSector(missionId, screen.id, encounterRun);
      }
    }
  }
  assert.equal(JSON.stringify(registry.WORLD_BLUEPRINTS_BY_MISSION), worlds);
  assert.equal(JSON.stringify(registry.WORLD_SCREENS_BY_MISSION), screens);
});
