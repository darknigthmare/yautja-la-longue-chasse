import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const directory = await mkdtemp(join(tmpdir(), "planet-region-kit-v128-"));
after(() => rm(directory, { recursive: true, force: true }));
const code = `
  export * from "./app/game/systems/clanWarRegionalMaterialKitV128";
  export * from "./app/game/systems/clanWarTextureLibraryV125";
  export * from "./app/game/systems/clanWarTextureLibraryV130";
  export { normalizeWarPlanetRecipeV102, encodeWarPlanetV102 } from "./app/game/systems/clanWarPlanetGeneratorV102";
  export { normalizeWarPlanetRecipeV103, generateWarPlanetV103, WAR_PLANET_BIOMES_V103, WAR_PLANET_SURFACES_V103 } from "./app/game/systems/clanWarPlanetGeneratorV103";
  export { normalizeWarPlanetRecipeV115, generateWarPlanetV115 } from "./app/game/systems/clanWarPlanetGeneratorV115";
  export { resolveProceduralWarPlanetV103 } from "./app/game/systems/clanWarProceduralV103";
`;
const bundle = await build({ stdin: { contents: code, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const file = join(directory, "region-kit.mjs");
await writeFile(file, bundle.outputFiles[0].text);
const api = await import(pathToFileURL(file));

test("every published land biome has compatible, real material sources", () => {
  assert.equal(api.WAR_PLANET_BIOMES_V103.length, 13);
  for (const biome of api.WAR_PLANET_BIOMES_V103) {
    const ids = api.compatibleLandMaterialsV128(biome);
    assert(ids.length > 0, biome);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.equal(api.findPlanetTextureV130(id).domain, "land");
  }
  assert(!api.compatibleLandMaterialsV128("desert").includes("land-permafrost"));
  assert(api.compatibleLandMaterialsV128("snow").includes("land-permafrost"));
});

test("ten surface kinds preserve physical meaning and reject invented liquids", () => {
  assert.equal(api.WAR_PLANET_SURFACES_V103.length, 10);
  for (const surface of api.WAR_PLANET_SURFACES_V103) {
    for (const biome of api.WAR_PLANET_BIOMES_V103) {
      const ids = api.compatibleSurfaceMaterialsV128(surface, biome);
      for (const id of ids) assert.equal(api.findPlanetTextureV130(id).domain, "liquid");
    }
  }
  for (const medium of ["sand", "spores", "mist", "crystal", "radioactive"])
    assert.equal(api.compatibleSurfaceMaterialsV128(medium, "desert").length, 0);
  assert(!api.compatibleSurfaceMaterialsV128("water", "jungle").includes("liquid-iceflow"));
  assert(api.compatibleSurfaceMaterialsV128("water", "tundra").includes("liquid-iceflow"));
  assert(!api.compatibleSurfaceMaterialsV128("water", "tundra").includes("liquid-bogwater"));
});

const worlds = [
  api.generateWarPlanetV103(api.normalizeWarPlanetRecipeV103({
    seed: 128018, territoryCount: 18, regionCount: 3, landBiome: "desert", surface: "sand", biomeDiversity: "uniform",
  })),
  api.generateWarPlanetV115(api.normalizeWarPlanetRecipeV115({
    seed: 128096, territoryCount: 96, regionCount: 12, landBiome: "crystal", surface: "acid",
    islandShape: 39, continentShape: 0, regionShape: 27, planetSize: "giant",
  })),
];

test("regional source kits are deterministic for small and large planets", () => {
  for (const planet of worlds) {
    const before = JSON.stringify(planet.procedural.recipe);
    const kit = api.createPlanetRegionalMaterialKitV128(planet);
    assert(api.validPlanetRegionalMaterialKitV128(planet, kit));
    assert.equal(kit.entries.length, planet.regions.length);
    assert.equal(kit.worldCode, planet.id);
    assert.deepEqual(kit, api.createPlanetRegionalMaterialKitV128(planet));
    assert.equal(new Set(kit.entries.map(item => item.seed)).size, kit.entries.length);
    for (const item of kit.entries) {
      assert(api.compatibleLandMaterialsV128(item.biome).includes(item.landMaterialId));
      assert(item.surfaceMaterialId === null ||
        api.compatibleSurfaceMaterialsV128(planet.surface.kind, item.biome).includes(item.surfaceMaterialId));
    }
    assert.equal(JSON.stringify(planet.procedural.recipe), before);
  }
});

test("region-specific material editing cannot corrupt another region or the planet code", () => {
  const planet = worlds[1], original = api.createPlanetRegionalMaterialKitV128(planet);
  const first = original.entries[0], candidates = api.compatibleLandMaterialsV128(first.biome);
  const selected = candidates.find(id => id !== first.landMaterialId);
  assert(selected, "each supported biome provides a distinct choice");
  const after = api.editPlanetRegionalMaterialKitV128(planet, original, first.regionId, "land", selected);
  assert(api.validPlanetRegionalMaterialKitV128(planet, after));
  assert.equal(after.entries[0].landMaterialId, selected);
  assert.deepEqual(after.entries.slice(1), original.entries.slice(1));
  assert.equal(original.entries[0].landMaterialId, first.landMaterialId);
  assert.equal(after.worldCode, planet.id);
  assert.throws(() => api.editPlanetRegionalMaterialKitV128(planet, after, first.regionId, "land", "land-permafrost"), /incompatible/);
  assert.throws(() => api.editPlanetRegionalMaterialKitV128(planet, after, "missing-region", "land", selected), /inconnue/);
  const manifest = api.describePlanetRegionAssetsV128(planet, after, first.regionId);
  assert.equal(manifest.worldCode, planet.id);
  assert.equal(manifest.land.id, selected);
  assert.equal(manifest.assignments.length, 12);
  assert(!JSON.stringify(manifest).includes("combatants"));
});

test("nonliquid worlds do not invent a liquid asset, even when edited", () => {
  const planet = worlds[0], kit = api.createPlanetRegionalMaterialKitV128(planet);
  assert(kit.entries.every(item => item.surfaceMaterialId === null));
  assert.throws(() => api.editPlanetRegionalMaterialKitV128(planet, kit, kit.entries[0].regionId,
    "surface", "liquid-estuary"), /incompatible/);
  const manifest = api.describePlanetRegionAssetsV128(planet, kit, kit.entries[0].regionId);
  assert.equal(manifest.surface, null);
});

test("foreign, reordered or forged manifests fail without altering any game world", () => {
  const planet = worlds[1], kit = api.createPlanetRegionalMaterialKitV128(planet);
  assert.equal(api.validPlanetRegionalMaterialKitV128(planet, { ...kit, worldCode: worlds[0].id }), false);
  assert.equal(api.validPlanetRegionalMaterialKitV128(planet, { ...kit, entries: [...kit.entries].reverse() }), false);
  assert.equal(api.validPlanetRegionalMaterialKitV128(planet, { ...kit, entries: [{ ...kit.entries[0], seed: -1 }, ...kit.entries.slice(1)] }), false);
  assert.equal(api.validPlanetRegionalMaterialKitV128(planet, { ...kit, entries: [{ ...kit.entries[0], materialId: "forged" }, ...kit.entries.slice(1)] }), false);
  assert.equal(api.validPlanetRegionalMaterialKitV128(planet, { ...kit, extraSave: "no" }), false);
});

test("historic V102 codes also support read-only region material exports", () => {
  const recipe = api.normalizeWarPlanetRecipeV102({ seed: 102128, landform: "archipelago" });
  const code = api.encodeWarPlanetV102(recipe), planet = api.resolveProceduralWarPlanetV103(code);
  assert(planet);
  const kit = api.createPlanetRegionalMaterialKitV128(planet);
  assert.equal(kit.entries.length, 6);
  assert(api.validPlanetRegionalMaterialKitV128(planet, kit));
  assert.equal(kit.worldCode, code);
});
