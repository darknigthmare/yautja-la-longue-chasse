import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = await mkdtemp(join(tmpdir(), "planet-strategy-v114-"));
const bundle = await build({
  stdin: { contents: `
    export * from "./app/game/systems/clanWarPlanetDraftV103";
    export * from "./app/game/systems/clanWarPlanetGeneratorV102";
    export * from "./app/game/systems/clanWarPlanetGeneratorV103";
    export * from "./app/game/systems/clanWarPlanetStrategyV114";
    export * from "./app/game/systems/clanWarPlanetMaterialCodexV114";
    export * from "./app/game/systems/clanWarProceduralV103";
  `, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const file = join(dir, "bundle.mjs"); await writeFile(file, bundle.outputFiles[0].text);
const api = await import(pathToFileURL(file));
process.on("exit", () => { void rm(dir, { recursive: true, force: true }); });

const base = api.normalizeWarPlanetRecipeV103({ seed: 11401, territoryCount: 36, regionCount: 6 });
const strategic = Object.keys(api.WAR_PLANET_STRATEGIC_PRESETS_V114);
const ambience = Object.keys(api.WAR_PLANET_AMBIENCE_PRESETS_V114);

test("six strategic presets stay valid and preserve locked material modules", () => {
  assert.equal(strategic.length, 6);
  for (const id of strategic) {
    const next = api.applyWarPlanetStrategicPresetV114(base, id, ["landVariant", "surfaceVariant", "landPalette", "surfacePalette"]);
    assert(api.validateWarPlanetRecipeV103(next), id);
    assert.equal(next.landVariant, base.landVariant);
    assert.equal(next.surfaceVariant, base.surfaceVariant);
    assert.equal(next.landPalette, base.landPalette);
    assert.equal(next.surfacePalette, base.surfacePalette);
    assert(next.territoryCount >= next.regionCount * 3);
  }
});

test("eight ambience presets change materials without changing strategic geometry fields", () => {
  assert.equal(ambience.length, 8);
  const fields = ["territoryCount", "regionCount", "landform", "arrangement", "landCoverage", "coast", "territoryStyle", "regionBalance"];
  for (const id of ambience) {
    const next = api.applyWarPlanetAmbiencePresetV114(base, id);
    assert(api.validateWarPlanetRecipeV103(next), id);
    for (const field of fields) assert.equal(next[field], base[field], `${id}: ${field}`);
  }
});

test("strategic dossier agrees with every preset graph and public region incomes", () => {
  for (const id of strategic) {
    const recipe = api.applyWarPlanetStrategicPresetV114(base, id);
    const planet = api.generateWarPlanetV103(recipe);
    const dossier = api.analyzeWarPlanetStrategyV114(planet);
    assert.equal(dossier.territoryCount, recipe.territoryCount);
    assert.equal(dossier.regionCount, recipe.regionCount);
    assert.equal(dossier.regions.length, recipe.regionCount);
    assert(dossier.headquartersPath.length >= 2);
    assert.equal(dossier.headquartersDistance, dossier.headquartersPath.length - 1);
    const ids = new Set(planet.definitions.map(item => item.id));
    for (const point of dossier.chokepointTerritoryIds) assert(ids.has(point));
    for (const region of dossier.regions) {
      const source = planet.regions.find(item => item.id === region.regionId);
      assert(source);
      assert.equal(region.territoryCount, source.territoryIds.length);
      const expected = planet.definitions.filter(item => source.territoryIds.includes(item.id)).reduce((sum, item) => ({
        s: sum.s + item.income.s, m: sum.m + item.income.m, i: sum.i + item.income.i,
      }), { s: 0, m: 0, i: 0 });
      assert.deepEqual(region.income, expected);
      for (const neighbor of region.neighboringRegionIds) assert(dossier.regions.some(item => item.regionId === neighbor));
      const expectedCrossings = planet.procedural.routes.filter(route => route.kind === "crossing"
        && (source.territoryIds.includes(route.fromId) || source.territoryIds.includes(route.toId))).length;
      assert.equal(region.crossingLinks, expectedCrossings, "each crossing is counted once for every region it touches");
    }
  }
});

test("legacy V102 worlds also receive a public graph dossier without changing identity", () => {
  const recipe = api.normalizeWarPlanetRecipeV102({ seed: 102114, landform: "archipelago" });
  const code = api.encodeWarPlanetV102(recipe), planet = api.resolveProceduralWarPlanetV103(code);
  assert(planet);
  const dossier = api.analyzeWarPlanetStrategyV114(planet);
  assert.equal(planet.id, code);
  assert.equal(dossier.territoryCount, 36);
  assert.equal(dossier.regionCount, 6);
  assert(dossier.headquartersPath.length >= 2);
});

test("all published land and sea materials have descriptions, without introducing a new recipe field", () => {
  assert.deepEqual(Object.keys(api.WAR_PLANET_LAND_MATERIAL_CODEX_V114).sort(), [...api.WAR_PLANET_BIOMES_V103].sort());
  assert.deepEqual(Object.keys(api.WAR_PLANET_SURFACE_MATERIAL_CODEX_V114).sort(), [...api.WAR_PLANET_SURFACES_V103].sort());
  for (const material of Object.values(api.WAR_PLANET_LAND_MATERIAL_CODEX_V114)) {
    assert(material.substrate.length > 5);
    assert(material.structure.length > 5);
    assert(material.peculiarity.length > 5);
  }
  for (const material of Object.values(api.WAR_PLANET_SURFACE_MATERIAL_CODEX_V114)) {
    assert(["liquid", "solid", "particulate", "aerosol"].includes(material.state));
    assert(material.peculiarity.length > 5);
  }
});

test("regional material descriptions match exact V102/V103 region IDs without changing generation", () => {
  const recipes = [
    api.normalizeWarPlanetRecipeV103({ seed: 11442, territoryCount: 96, regionCount: 12, biomeDiversity: "varied", surface: "lava" }),
    api.normalizeWarPlanetRecipeV103({ seed: 11443, territoryCount: 18, regionCount: 3, biomeDiversity: "uniform", surface: "mist" }),
  ];
  const worlds = recipes.map(api.generateWarPlanetV103);
  const oldRecipe = api.normalizeWarPlanetRecipeV102({ seed: 102114, landform: "archipelago" });
  const oldWorld = api.resolveProceduralWarPlanetV103(api.encodeWarPlanetV102(oldRecipe));
  assert(oldWorld);
  worlds.push(oldWorld);
  for (const planet of worlds) {
    const identityBefore = planet.id;
    const recipeBefore = JSON.stringify(planet.procedural.recipe);
    const dossier = api.describeWarPlanetMaterialsV114(planet);
    assert.equal(dossier.code, identityBefore);
    assert.equal(dossier.regions.length, planet.regions.length);
    assert.equal(dossier.surface.kind, planet.surface.kind);
    for (const region of dossier.regions) {
      assert(planet.regions.some(item => item.id === region.regionId && item.name === region.regionName));
      const expected = planet.procedural.regions.find(item => item.regionId === region.regionId)?.biome ?? planet.landBiome;
      assert.equal(region.biome, expected);
      assert.equal(region.sourceTextureId, `land-${expected}`);
    }
    assert.equal(planet.id, identityBefore);
    assert.equal(JSON.stringify(planet.procedural.recipe), recipeBefore);
    assert.deepEqual(dossier, api.describeWarPlanetMaterialsV114(planet));
  }
});
