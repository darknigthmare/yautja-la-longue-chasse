import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
const folder = await mkdtemp(join(tmpdir(), "planet-materials-v130-"));
after(() => rm(folder, { recursive: true, force: true }));
const b = await build({ stdin: {
  contents: [
    'export * from "./app/game/systems/clanWarTextureLibraryV125";',
    'export * from "./app/game/systems/clanWarTextureLibraryV130";',
    'export * from "./app/game/systems/clanWarRegionalMaterialKitV128";',
    'export { generateWarPlanetV115, normalizeWarPlanetRecipeV115 } from "./app/game/systems/clanWarPlanetGeneratorV115";',
  ].join("\n"), resolveDir: process.cwd(), loader: "ts",
}, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const target = join(folder, "module.mjs");
await writeFile(target, b.outputFiles[0].text);
const api = await import(pathToFileURL(target));
function fakeCanvas() {
  let pixels = null;
  return { width: 0, height: 0, get pixels() { return pixels; }, getContext() {
    return { createImageData(width, height) { return { data: new Uint8ClampedArray(width * height * 4) }; },
      putImageData(image) { pixels = new Uint8ClampedArray(image.data); },
      getImageData() { return { data: new Uint8ClampedArray(pixels) }; } };
  } };
}
globalThis.document = { createElement: () => fakeCanvas() };
test("V130 adds 16 materials without reordering V125", () => {
  assert.equal(api.WAR_PLANET_TEXTURES_V125.length, 32);
  assert.equal(api.WAR_PLANET_TEXTURES_V130.length, 48);
  assert.deepEqual(api.WAR_PLANET_TEXTURES_V130.slice(0, 32), api.WAR_PLANET_TEXTURES_V125);
  assert.equal(new Set(api.WAR_PLANET_TEXTURES_V130.map(x => x.id)).size, 48);
  for (const domain of ["land", "liquid"]) for (const origin of ["earthlike", "alien"])
    assert.equal(api.WAR_PLANET_TEXTURES_V130.slice(32).filter(x => x.domain === domain && x.origin === origin).length, 4);
});
test("new renderer preserves every legacy byte across all five channels", () => {
  for (const id of ["land-gravel", "land-bioceramic", "liquid-tidal-foam", "liquid-black-resin"])
    for (const channel of api.WAR_PLANET_TEXTURE_CHANNELS_V125) {
      const original = api.createPlanetTextureCanvasV125(id, channel, 32, 42).pixels;
      const expanded = api.createPlanetTextureCanvasV130(id, channel, 32, 42).pixels;
      assert.deepEqual(expanded, original, id + "/" + channel);
    }
});
test("16 studies provide deterministic opaque albedo and independent PBR sources", () => {
  const digests = new Set();
  for (const item of api.WAR_PLANET_TEXTURES_V130.slice(32)) {
    const image = api.createPlanetTextureCanvasV130(item.id, "albedo", 32, 132).pixels;
    assert.equal(image.length, 4096);
    assert(image.every((value, index) => index % 4 !== 3 || value === 255));
    digests.add(Array.from(image.slice(0, 96)).join(","));
    for (const channel of api.WAR_PLANET_TEXTURE_CHANNELS_V125.slice(1))
      assert.equal(api.createPlanetTextureCanvasV130(item.id, channel, 16, 132).pixels.length, 1024);
  }
  assert.equal(digests.size, 16);
  assert.throws(() => api.createPlanetTextureCanvasV130("invalid"), /invalide/);
});
test("V130 optional sources respect the original default recommendations and biome", () => {
  const planet = api.generateWarPlanetV115(api.normalizeWarPlanetRecipeV115({
    seed: 1301, territoryCount: 18, regionCount: 3, landBiome: "jungle",
    surface: "water", biomeDiversity: "uniform", planetSize: "terran",
  }));
  const initial = api.createPlanetRegionalMaterialKitV128(planet);
  assert(initial.entries.every(x => Boolean(api.findPlanetTextureV125(x.landMaterialId))));
  const first = initial.entries[0];
  assert(api.compatibleLandMaterialsV128(first.biome).includes("land-mangrove-silt"));
  const selected = api.editPlanetRegionalMaterialKitV128(planet, initial, first.regionId, "land", "land-mangrove-silt");
  const result = api.editPlanetRegionalMaterialKitV128(planet, selected, first.regionId, "surface", "liquid-mangrove-tide");
  assert(api.validPlanetRegionalMaterialKitV128(planet, result));
  assert.deepEqual(initial.entries.slice(1), result.entries.slice(1));
  assert.equal(api.describePlanetRegionAssetsV128(planet, result, first.regionId).surface.id, "liquid-mangrove-tide");
  assert(!api.compatibleSurfaceMaterialsV128("water", "snow").includes("liquid-mangrove-tide"));
  assert(!api.compatibleSurfaceMaterialsV128("water", "jungle").includes("liquid-glacial-melt"));
});
