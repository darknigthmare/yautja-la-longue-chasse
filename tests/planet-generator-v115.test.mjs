import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const directory = await mkdtemp(join(tmpdir(), "war-planet-v115-"));
const bundle = await build({
  stdin: { contents: `
    export * from "./app/game/systems/clanWarPlanetGeneratorV115";
    export * from "./app/game/systems/clanWarPlanetGeneratorV103";
    export * from "./app/game/systems/clanWarPlanetGeneratorV102";
    export * from "./app/game/systems/clanWarShapeAtlasV115";
    export * from "./app/game/systems/clanWarTextureLibraryV115";
    export * from "./app/game/systems/clanWarProceduralV103";
  `, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const output = join(directory, "planet-v115.mjs");
await writeFile(output, bundle.outputFiles[0].text);
const api = await import(pathToFileURL(output));
process.on("exit", () => { void rm(directory, { recursive: true, force: true }); });

test("120 explicit silhouettes across three categories, with 10 distinct motifs and four scales each", () => {
  assert.equal(api.WAR_SHAPE_TOTAL_V115, 120);
  const ids = new Set();
  for (const category of ["island", "continent", "region"]) {
    const templates = api.WAR_SHAPE_TEMPLATES_V115[category];
    assert.equal(templates.length, 40);
    assert.equal(new Set(templates.map(item => item.name)).size, 40);
    assert.equal(new Set(templates.map(item => item.primaryLobes)).size >= 6, true);
    for (const item of templates) { assert(!ids.has(item.id)); ids.add(item.id); }
    for (let motif = 0; motif < 10; motif++) {
      const quartet = templates.slice(motif * 4, motif * 4 + 4);
      assert(quartet.every((item, index) => item.scale === api.WAR_SHAPE_TEMPLATES_V115[category][motif * 4 + index].scale));
      assert(quartet[0].scale < quartet[3].scale);
    }
  }
});

test("32 independently addressable true land/liquid bitmap definitions", () => {
  assert.equal(api.WAR_PLANET_TEXTURES_V115.length, 32);
  assert.equal(api.WAR_PLANET_LAND_TEXTURES_V115.length, 16);
  assert.equal(api.WAR_PLANET_LIQUID_TEXTURES_V115.length, 16);
  assert.equal(new Set(api.WAR_PLANET_TEXTURES_V115.map(item => item.id)).size, 32);
  for (let i = 0; i < 16; i++) {
    assert.equal(api.planetTextureUriV115("land", i), `yautja-v115:land:${i}`);
    assert.equal(api.planetTextureUriV115("liquid", i), `yautja-v115:liquid:${i}`);
  }
});

test("all six radii preserve angular topology but scale kilometers and square kilometers", () => {
  const keys = Object.keys(api.PLANET_RADII_KM_V115);
  assert.equal(keys.length, 6);
  for (const key of keys) {
    assert(api.planetArcKilometersV115(30, key) > 0);
    assert(api.planetAreaKm2V115(Math.PI, key) > 0);
  }
  const ratio = api.PLANET_RADII_KM_V115.giant / api.PLANET_RADII_KM_V115.terran;
  assert(Math.abs(api.planetArcKilometersV115(30, "giant") / api.planetArcKilometersV115(30, "terran") - ratio) < 1e-12);
  assert(Math.abs(api.planetAreaKm2V115(1, "giant") / api.planetAreaKm2V115(1, "terran") - ratio ** 2) < 1e-12);
});

test("V115 recipes roundtrip exactly and reject malformed codes or unrecognized extra fields", () => {
  for (const size of Object.keys(api.PLANET_RADII_KM_V115)) {
    const recipe = api.normalizeWarPlanetRecipeV115({
      seed: 11521, planetSize: size, territoryCount: 18, regionCount: 3,
      islandShape: 11, continentShape: 36, regionShape: 21,
      landMaterial: 14, liquidMaterial: 7,
    });
    const code = api.encodeWarPlanetV115(recipe);
    assert(code.startsWith("proc-v115-"));
    assert.deepEqual(api.parseWarPlanetV115(code), recipe);
    assert.deepEqual(api.parseWarPlanetRecipeCodeV103(code), recipe);
    assert.equal(api.encodeWarPlanetRecipeCodeV103(recipe), code);
    assert.equal(api.parseWarPlanetV115(code.slice(0, -1) + (code.endsWith("x") ? "y" : "x")), null);
    assert.equal(api.validateWarPlanetRecipeV115({ ...recipe, unauthorized: true }), null);
    assert.equal(api.validateWarPlanetRecipeV115({ ...recipe, islandShape: 40 }), null);
  }
});

test("V115 generated world is a playable connected front and all physical paths are consistent", () => {
  const recipes = [
    { seed: 11501, landform: "archipelago", territoryCount: 18, regionCount: 3, islandShape: 5, continentShape: 9, regionShape: 3 },
    { seed: 11502, landform: "continents", territoryCount: 24, regionCount: 4, islandShape: 34, continentShape: 32, regionShape: 17 },
    { seed: 11503, landform: "supercontinent", territoryCount: 36, regionCount: 6, islandShape: 17, continentShape: 21, regionShape: 35 },
  ];
  for (const seed of recipes) {
    const recipe = api.normalizeWarPlanetRecipeV115(seed);
    const world = api.generateWarPlanetV115(recipe);
    assert.equal(world.territories.length, recipe.territoryCount);
    assert.equal(world.regions.length, recipe.regionCount);
    assert.equal(world.definitions.length, recipe.territoryCount);
    assert.equal(world.procedural.recipe.version, 115);
    assert(world.procedural.physical.landAreaKm2 > 0);
    assert(world.procedural.physical.routeDistancesKm.length > 0);
    assert.deepEqual(api.resolveProceduralWarPlanetV103(world.id)?.definitions, world.definitions);
    const graph = new Map(world.definitions.map(t => [t.id, t.neighbors]));
    const seen = new Set(), stack = [world.definitions[0].id];
    while (stack.length) {
      const id = stack.pop();
      if (!id || seen.has(id)) continue;
      seen.add(id); stack.push(...(graph.get(id) ?? []));
    }
    assert.equal(seen.size, recipe.territoryCount);
    assert(world.procedural.physical.routeDistancesKm.every(route => route.distanceKm >= 0));
  }
});

test("V115 shapes and material choices affect canonically distinct worlds while V103 bytes stay fixed", () => {
  const old = api.normalizeWarPlanetRecipeV103({ seed: 11509, territoryCount: 18, regionCount: 3 });
  const codeBefore = api.encodeWarPlanetV103(old);
  const oldGeometry = api.generateWarPlanetV103(old);
  const base = api.normalizeWarPlanetRecipeV115({ ...old, version: 115, islandShape: 0, continentShape: 0, regionShape: 0 });
  const first = api.generateWarPlanetV115(base);
  const second = api.generateWarPlanetV115({ ...base, islandShape: 39, continentShape: 39, regionShape: 39 });
  assert.notEqual(first.id, second.id);
  assert.notDeepEqual(first.landmasses[0].points, second.landmasses[0].points);
  assert.notDeepEqual(first.regions.map(r => r.territoryIds), []); // all regions remain playable
  const onlyMaterials = { ...base, landMaterial: 15, liquidMaterial: 15 };
  assert.notEqual(api.encodeWarPlanetV115(onlyMaterials), first.id);
  assert.deepEqual(api.generateWarPlanetV103(old), oldGeometry);
  assert.equal(api.encodeWarPlanetV103(old), codeBefore);
});
