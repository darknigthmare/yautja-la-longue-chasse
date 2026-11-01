import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const directory = await mkdtemp(join(tmpdir(), "planet-regional-render-v129-"));
after(() => rm(directory, { recursive: true, force: true }));
const bundle = await build({
  stdin: { contents: [
    'export * from "./app/game/planetRegionalShaderAtlasV129";',
    'export * from "./app/game/systems/clanWarRegionalMaterialKitV128";',
    'export * from "./app/game/systems/clanWarShapeAtlasV115";',
    'export { generateWarPlanetV115, normalizeWarPlanetRecipeV115 } from "./app/game/systems/clanWarPlanetGeneratorV115";',
  ].join("\n"), resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const file = join(directory, "regional-v129.mjs");
await writeFile(file, bundle.outputFiles[0].text);
const api = await import(pathToFileURL(file));
const recipe = { seed: 129415, territoryCount: 18, regionCount: 3, landBiome: "jungle",
  surface: "water", biomeDiversity: "varied" };

test("physical visual density responds to all six planet radii without rewriting a shape", () => {
  const sizes = ["dwarf", "small", "terran", "large", "giant", "colossal"];
  const actual = sizes.map(planetSize => {
    const planet = api.generateWarPlanetV115(api.normalizeWarPlanetRecipeV115({ ...recipe, planetSize }));
    const factor = api.planetRegionalTextureScaleV129(planet);
    assert.equal(factor, api.PLANET_RADII_KM_V115[planetSize] / api.PLANET_RADII_KM_V115.terran);
    assert.equal(planet.procedural.recipe.planetSize, planetSize);
    return factor;
  });
  assert(actual.every((factor, index) => index === 0 || factor > actual[index - 1]));
  assert.equal(actual[2], 1);
});

test("atlas identity follows only real region assignments, and keeps a stable source world", () => {
  const planet = api.generateWarPlanetV115(api.normalizeWarPlanetRecipeV115(recipe));
  const original = api.createPlanetRegionalMaterialKitV128(planet);
  const before = api.planetRegionalShaderAtlasKeyV129(planet, original, 128, 4, 1);
  assert.equal(before, api.planetRegionalShaderAtlasKeyV129(planet, original, 128, 4, 1));
  const candidate = api.compatibleLandMaterialsV128(original.entries[0].biome)
    .find(id => id !== original.entries[0].landMaterialId);
  assert(candidate);
  const changed = api.editPlanetRegionalMaterialKitV128(planet, original, original.entries[0].regionId, "land", candidate);
  assert.notEqual(api.planetRegionalShaderAtlasKeyV129(planet, changed, 128, 4, 1), before);
  assert.deepEqual(original.entries.slice(1), changed.entries.slice(1));
  assert.equal(planet.procedural.recipe.planetSize, "terran");
  assert.throws(() => api.planetRegionalShaderAtlasKeyV129(planet, { ...original, worldCode: "foreign" }, 128, 4, 1), /incompatible/);
  assert.throws(() => api.planetRegionalShaderAtlasKeyV129(planet, original, 128, 1, 1), /invalides/);
});
