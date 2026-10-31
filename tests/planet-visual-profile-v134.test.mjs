import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const dir = await mkdtemp(join(tmpdir(), "planet-visual-v134-"));
after(() => rm(dir, { recursive: true, force: true }));
const bundle = await build({ stdin: {
  contents: [
    'export * from "./app/game/systems/clanWarPlanetVisualProfileV134";',
    'export * from "./app/game/systems/clanWarRegionalMaterialKitV128";',
    'export { generateWarPlanetV115, normalizeWarPlanetRecipeV115 } from "./app/game/systems/clanWarPlanetGeneratorV115";',
  ].join("\n"), resolveDir: process.cwd(), loader: "ts",
}, bundle: true, write: false, platform: "node", format: "esm", target: "es2022", logLevel: "silent" });
const file = join(dir, "profile.mjs");
await writeFile(file, bundle.outputFiles[0].text);
const api = await import(pathToFileURL(file));
function planet(seed) {
  return api.generateWarPlanetV115(api.normalizeWarPlanetRecipeV115({
    seed, regionCount: 3, territoryCount: 18, landBiome: "jungle", surface: "water",
    biomeDiversity: "uniform", planetSize: "terran",
  }));
}
const worlds = [planet(134001), planet(134002)];
function storage() {
  const items = new Map();
  return {
    items,
    getItem(key) { return items.get(key) ?? null; },
    setItem(key, value) { items.set(key, value); },
    removeItem(key) { items.delete(key); },
  };
}

test("V134 stores independent appearance with quality and physical coast range", () => {
  const [world] = worlds, store = storage();
  const kit = api.createPlanetRegionalMaterialKitV128(world);
  const profile = api.createPlanetVisualProfileV134(world, kit, "albedo", 1800);
  assert.equal(api.readPlanetVisualProfileV134(world, store).status, "empty");
  assert.equal(api.writePlanetVisualProfileV134(world, store, profile), true);
  assert.deepEqual(api.readPlanetVisualProfileV134(world, store),
    { status: "loaded", profile });
  assert.equal(api.clearPlanetVisualProfileV134(world, store), true);
  assert.equal(api.readPlanetVisualProfileV134(world, store).status, "empty");
});

test("foreign world, invalid JSON and extra save fields never restore", () => {
  const [a,b] = worlds, store = storage(), kit = api.createPlanetRegionalMaterialKitV128(a);
  const profile = api.createPlanetVisualProfileV134(a, kit, "pbr", 900);
  store.setItem(api.planetVisualStorageKeyV134(b), JSON.stringify(profile));
  assert.equal(api.readPlanetVisualProfileV134(b, store).status, "invalid");
  store.setItem(api.planetVisualStorageKeyV134(a), "{invalid");
  assert.equal(api.readPlanetVisualProfileV134(a, store).status, "invalid");
  assert.equal(api.validPlanetVisualProfileV134(a, { ...profile, battleSave: "forged" }), false);
  assert.equal(api.validPlanetVisualProfileV134(a, { ...profile, coastalInfluenceKm: 2400 }), false);
  assert.equal(api.validPlanetVisualProfileV134(a, { ...profile, kit: { ...kit, worldCode: b.id } }), false);
  assert.throws(() => api.writePlanetVisualProfileV134(b, store, profile), /destiné/);
});

test("storage denial and quota failures do not claim success", () => {
  const [world] = worlds;
  const profile = api.createPlanetVisualProfileV134(world, api.createPlanetRegionalMaterialKitV128(world));
  const blocked = { getItem() { throw new Error("denied"); },
    setItem() { throw new Error("quota"); }, removeItem() { throw new Error("denied"); } };
  assert.equal(api.readPlanetVisualProfileV134(world, blocked).status, "unavailable");
  assert.equal(api.writePlanetVisualProfileV134(world, blocked, profile), false);
  assert.equal(api.clearPlanetVisualProfileV134(world, blocked), false);
  assert.equal(api.decodePlanetVisualProfileV134(world, "x".repeat(65537)), null);
});

test("saved profile does not modify any world source recipe or tactical data", () => {
  const [world] = worlds;
  const source = JSON.stringify(world), kit = api.createPlanetRegionalMaterialKitV128(world);
  const profile = api.createPlanetVisualProfileV134(world, kit);
  assert.equal(JSON.stringify(world), source);
  assert.equal(profile.kit.worldCode, world.id);
  assert(!JSON.stringify(profile).includes("combatants"));
});
