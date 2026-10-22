import assert from "node:assert/strict";
import test from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const ssr = homeworldSceneSsrV78();
const api = ssr.load("app/game/systems/clanWarPlanetGeneratorV103.ts");
const legacy = ssr.load("app/game/systems/clanWarPlanetGeneratorV102.ts");
const { applyWarPlanetPresetV103, prepareWarPlanetVariantV103 } = ssr.load("app/game/systems/clanWarPlanetDraftV103.ts");
const { PLANET_GENERATOR_CONTROLS_V103, PLANET_GENERATOR_SECTIONS_V103 } = ssr.load("app/game/planetGeneratorControlsV103.ts");

test("terrestrial and extraterrestrial bases respect every editor lock", () => {
  const base = api.randomizeWarPlanetRecipeV103(api.DEFAULT_WAR_PLANET_RECIPE_V103, 59031);
  const before = JSON.stringify(base);
  for (const preset of ["earthlike", "alien"]) {
    for (const field of api.WAR_PLANET_RECIPE_FIELDS_V103) {
      const next = applyWarPlanetPresetV103(base, preset, [field]);
      assert.equal(next[field], base[field], `${preset} must preserve ${field}`);
      assert.ok(api.validateWarPlanetRecipeV103(next));
      assert.equal(next.seed, base.seed, "a visual base retains the named world's seed");
    }
    assert.deepEqual(applyWarPlanetPresetV103(base, preset, api.WAR_PLANET_RECIPE_FIELDS_V103), base);
  }
  assert.equal(JSON.stringify(base), before, "preset composition never mutates its input");
  const earth = applyWarPlanetPresetV103(base, "earthlike"), alien = applyWarPlanetPresetV103(base, "alien");
  assert.equal(earth.surface, "water");
  assert.equal(earth.landVariant, "earthlike");
  assert.equal(earth.surfaceVariant, "earthlike");
  assert.equal(alien.landVariant, "alien");
  assert.equal(alien.surfaceVariant, "alien");
  assert.notEqual(earth.landPalette, alien.landPalette);
  assert.notEqual(earth.surfacePalette, alien.surfacePalette);
});

test("preset count compatibility never overrides a locked format", () => {
  for (const territoryCount of api.WAR_PLANET_TERRITORY_COUNTS_V103) {
    for (const regionCount of api.WAR_PLANET_REGION_COUNTS_V103) {
      if (territoryCount < regionCount * 3) continue;
      const base = api.normalizeWarPlanetRecipeV103({ territoryCount, regionCount });
      for (const preset of ["earthlike", "alien"]) {
        for (const locks of [[], ["territoryCount"], ["regionCount"], ["territoryCount", "regionCount"]]) {
          const next = applyWarPlanetPresetV103(base, preset, locks);
          assert.ok(next.territoryCount >= 3 * next.regionCount, `${preset}/${territoryCount}/${regionCount}/${locks}`);
          for (const field of locks) assert.equal(next[field], base[field]);
        }
      }
    }
  }
});

test("explicit legacy variant creates a new draft and leaves the old recipe and code intact", () => {
  const original = legacy.normalizeWarPlanetRecipeV102({ seed: 2891, landform: "archipelago", coast: "fjords", landBiome: "jungle", surface: "brine", atmosphere: "aurora" });
  const before = JSON.stringify(original), originalCode = legacy.encodeWarPlanetV102(original);
  const draft = prepareWarPlanetVariantV103(original);
  assert.equal(draft.version, 103);
  assert.equal(draft.territoryCount, 36);
  assert.equal(draft.regionCount, 6);
  assert.equal(draft.hydrology, "none");
  for (const key of Object.keys(original).filter(key => key !== "version")) assert.equal(draft[key], original[key]);
  assert.ok(api.validateWarPlanetRecipeV103(draft));
  assert.ok(api.encodeWarPlanetV103(draft).startsWith("proc-v103-"));
  assert.notEqual(api.encodeWarPlanetV103(draft), originalCode);
  assert.equal(JSON.stringify(original), before);
  assert.equal(legacy.encodeWarPlanetV102(original), originalCode);
});

test("the four editor sections expose every recipe module once and offer all validated defaults", () => {
  assert.equal(PLANET_GENERATOR_SECTIONS_V103.length, 4);
  const fields = PLANET_GENERATOR_SECTIONS_V103.flatMap(section => section.fields);
  assert.equal(new Set(fields).size, fields.length);
  assert.deepEqual([...fields].sort(), api.WAR_PLANET_RECIPE_FIELDS_V103.filter(field => field !== "seed").sort());
  for (const field of fields) {
    const control = PLANET_GENERATOR_CONTROLS_V103[field];
    assert.ok(control.label.length > 3);
    assert.ok(control.choices.some(choice => choice.value === api.DEFAULT_WAR_PLANET_RECIPE_V103[field]));
  }
});
