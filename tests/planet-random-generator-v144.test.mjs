import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const folder = await mkdtemp(join(tmpdir(), "planet-random-v144-"));
after(() => rm(folder, { recursive: true, force: true }));
const built = await build({ stdin: {
  contents: [
    'export * from "./app/game/systems/clanWarPlanetDraftRandomV144";',
    'export * from "./app/game/systems/clanWarPlanetGeneratorV103";',
    'export * from "./app/game/systems/clanWarPlanetGeneratorV115";',
    'export { PLANET_GENERATOR_SECTIONS_V103 } from "./app/game/planetGeneratorControlsV103";',
  ].join("\n"), resolveDir: process.cwd(), loader: "ts",
}, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const file = join(folder, "random.mjs");
await writeFile(file, built.outputFiles[0].text);
const api = await import(pathToFileURL(file));
const recipe = api.normalizeWarPlanetRecipeV103({
  seed: 14401, territoryCount: 48, regionCount: 8, landform: "continents", surface: "water",
});
const { version: originalVersion, ...advanced } = api.DEFAULT_WAR_PLANET_RECIPE_V115;
const advancedValues = Object.fromEntries(api.PLANET_ADVANCED_FIELDS_V144.map(field=>[field,advanced[field]]));
const request = (scope, overrides = {}) => ({
  recipe, advanced: advancedValues, advancedEnabled: true,
  lockedV103: [], lockedV115: [], scope, entropy: 0x144001,
  ...overrides,
});
const valid = result => {
  assert(api.validateWarPlanetRecipeV103(result.recipe));
  assert(api.validateWarPlanetRecipeV115({ ...result.recipe, version: 115, ...result.advanced }));
};

test("all four real V103 sections can be independently rolled without altering other fields", () => {
  const sections = api.PLANET_GENERATOR_SECTIONS_V103;
  assert.equal(sections.length, 4);
  for (const section of sections) {
    const output = api.randomizePlanetDraftV144(request(section.id));
    valid(output);
    assert(output.changedFields.length > 0, section.id);
    for (const field of api.WAR_PLANET_RECIPE_FIELDS_V103) {
      if (!section.fields.includes(field)) assert.equal(output.recipe[field], recipe[field], section.id+"/"+field);
    }
    assert.deepEqual(output.advanced, advancedValues);
    assert.equal(output.recipe.seed, recipe.seed);
    assert(output.changedFields.every(field => section.fields.includes(field)));
  }
});

test("V103 global lottery truly changes its seed and legacy sections, not the inactive V115 fields", () => {
  const output = api.randomizePlanetDraftV144(request("all", { advancedEnabled: false }));
  valid(output);
  assert.notEqual(output.recipe.seed, recipe.seed);
  assert.deepEqual(output.advanced, advancedValues);
  assert(output.changedFields.every(field => api.WAR_PLANET_RECIPE_FIELDS_V103.includes(field)));
});

test("global V115 roll includes all six advanced fields and generates an independently encoded world", () => {
  const before = JSON.stringify({ recipe, advancedValues });
  const output = api.randomizePlanetDraftV144(request("all"));
  valid(output);
  assert.notEqual(output.recipe.seed, recipe.seed);
  for (const field of api.PLANET_ADVANCED_FIELDS_V144) {
    assert.notEqual(output.advanced[field], advancedValues[field], field);
    assert(output.changedFields.includes(field));
  }
  const code = api.encodeWarPlanetV115({ ...output.recipe, version: 115, ...output.advanced });
  assert.match(code, /^proc-v115-/);
  assert.deepEqual(api.parseWarPlanetV115(code), { ...output.recipe, version: 115, ...output.advanced });
  assert.equal(JSON.stringify({ recipe, advancedValues }), before);
});

test("V115 size / shapes / textures rolls are independent and bound to the real catalog limits", () => {
  const fields = {
    "v115-size": ["planetSize"],
    "v115-shapes": ["islandShape", "continentShape", "regionShape"],
    "v115-materials": ["landMaterial", "liquidMaterial"],
    "v115": api.PLANET_ADVANCED_FIELDS_V144,
  };
  for (const [scope, selected] of Object.entries(fields)) {
    const output = api.randomizePlanetDraftV144(request(scope));
    valid(output);
    assert.deepEqual(output.recipe, recipe);
    for (const field of api.PLANET_ADVANCED_FIELDS_V144) {
      assert.equal(output.advanced[field] !== advancedValues[field], selected.includes(field), scope+"/"+field);
    }
  }
  for (let entropy=0; entropy<30; entropy++) {
    const result = api.randomizePlanetDraftV144(request("v115", { entropy }));
    valid(result);
    assert(result.advanced.islandShape >= 0 && result.advanced.islandShape < 40);
    assert(result.advanced.continentShape >= 0 && result.advanced.continentShape < 40);
    assert(result.advanced.regionShape >= 0 && result.advanced.regionShape < 40);
    assert(result.advanced.landMaterial >= 0 && result.advanced.landMaterial < 16);
    assert(result.advanced.liquidMaterial >= 0 && result.advanced.liquidMaterial < 16);
  }
});

test("every per-field roll changes exactly the requested unlocked field", () => {
  for (const field of [...api.WAR_PLANET_RECIPE_FIELDS_V103, ...api.PLANET_ADVANCED_FIELDS_V144]) {
    const output = api.randomizePlanetDraftV144(request({ field }));
    valid(output);
    assert.deepEqual(output.changedFields, [field], field);
    for (const other of api.WAR_PLANET_RECIPE_FIELDS_V103)
      if (other !== field) assert.equal(output.recipe[other], recipe[other], field+"/"+other);
    for (const other of api.PLANET_ADVANCED_FIELDS_V144)
      if (other !== field) assert.equal(output.advanced[other], advancedValues[other], field+"/"+other);
  }
});

test("locks protect the full randomizer, geography section, advanced sections and individual controls", () => {
  const locksV103 = ["seed", "territoryCount", "regionCount", "landBiome", "surface"];
  const locksV115 = ["planetSize", "continentShape", "landMaterial"];
  const output = api.randomizePlanetDraftV144(request("all", {
    lockedV103: locksV103, lockedV115: locksV115,
  }));
  valid(output);
  for (const field of locksV103) assert.equal(output.recipe[field], recipe[field]);
  for (const field of locksV115) assert.equal(output.advanced[field], advancedValues[field]);
  assert(output.changedFields.length > 0);
  const noOp = api.randomizePlanetDraftV144(request("all", {
    lockedV103: api.WAR_PLANET_RECIPE_FIELDS_V103,
    lockedV115: api.PLANET_ADVANCED_FIELDS_V144,
  }));
  assert.deepEqual(noOp.recipe, recipe);
  assert.deepEqual(noOp.advanced, advancedValues);
  assert.deepEqual(noOp.changedFields, []);
  assert.equal(api.selectablePlanetRandomFieldsV144("all", true,
    api.WAR_PLANET_RECIPE_FIELDS_V103, api.PLANET_ADVANCED_FIELDS_V144).length, 0);
});

test("explicit seed roll works independently from physical shape and all visual fields", () => {
  const output = api.randomizePlanetDraftV144(request("seed", { entropy: recipe.seed }));
  valid(output);
  assert.notEqual(output.recipe.seed, recipe.seed);
  assert.deepEqual(output.advanced, advancedValues);
  assert.deepEqual(output.changedFields, ["seed"]);
  const blocked = api.randomizePlanetDraftV144(request({ field: "landMaterial" }, {
    lockedV115: ["landMaterial"],
  }));
  assert.deepEqual(blocked.changedFields, []);
});

test("random scopes reject unknown fields, invalid entropy and invalid draft without falling back", () => {
  assert.throws(()=>api.randomizePlanetDraftV144(request("no-such-section")), /inconnue/);
  assert.throws(()=>api.randomizePlanetDraftV144(request({ field: "fakeShape" })), /inconnu/);
  assert.throws(()=>api.randomizePlanetDraftV144(request("all", { entropy: -1 })), /invalide/);
  assert.throws(()=>api.randomizePlanetDraftV144(request("all", { advanced: { ...advancedValues, islandShape: 40 } })), /invalide/);
  assert.throws(()=>api.randomizePlanetDraftV144(request("all", { lockedV115: ["unknown"] })), /invalides/);
});

test("same recipe, entropy, scopes and locks produce identical deterministic drafts", () => {
  const first = api.randomizePlanetDraftV144(request("all"));
  assert.deepEqual(first, api.randomizePlanetDraftV144(request("all")));
  assert.notDeepEqual(first, api.randomizePlanetDraftV144(request("all", { entropy: 0x144002 })));
});
