import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { HUNTER_SKIN_FILTERS_V114, HUNTER_DREAD_FILTERS_V114, HUNTER_ARMOR_FILTERS_V114 } from "../app/game/hunterPaletteFiltersV114.ts";

const types = readFileSync(new URL("../app/game/types.ts", import.meta.url), "utf8");
const source = {
  homeworld: readFileSync(new URL("../app/game/HomeworldModularHunter.tsx", import.meta.url), "utf8"),
  preview: readFileSync(new URL("../app/game/HunterRigPreview.tsx", import.meta.url), "utf8"),
};

const declared = type => {
  const definition = types.match(new RegExp(`export type ${type}\\s*=([\\s\\S]*?);`));
  assert.ok(definition, `Missing ${type} declaration`);
  return [...definition[1].matchAll(/"([^"]+)"/g)].map(match => match[1]).sort();
};

for (const [type, filters] of [
  ["HunterSkinId", HUNTER_SKIN_FILTERS_V114],
  ["DreadTintId", HUNTER_DREAD_FILTERS_V114],
  ["ArmorTintId", HUNTER_ARMOR_FILTERS_V114],
]) test(`every declared ${type} has a finite visible filter`, () => {
  assert.deepEqual(Object.keys(filters).sort(), declared(type));
  for (const [id, value] of Object.entries(filters)) {
    assert.ok(typeof value === "string" && value.length > 0, id);
    assert.doesNotMatch(value, /url\(|expression\(|none.*none/i);
  }
});

test("both Homeworld and combat rig use the same palette source", () => {
  for (const value of Object.values(source)) {
    assert.match(value, /hunterPaletteFiltersV114/);
    assert.match(value, /HUNTER_SKIN_FILTERS_V114/);
    assert.match(value, /HUNTER_DREAD_FILTERS_V114/);
  }
  assert.match(source.preview, /HUNTER_ARMOR_FILTERS_V114/);
});

test("the three previously published family values retain their original visual filters", () => {
  assert.equal(HUNTER_SKIN_FILTERS_V114["ochre-mottle"], "none");
  assert.equal(HUNTER_DREAD_FILTERS_V114.obsidian, "saturate(.72) brightness(.68) contrast(1.22)");
  assert.equal(HUNTER_ARMOR_FILTERS_V114.bronze, "sepia(.48) saturate(1.22) hue-rotate(346deg) brightness(1.02)");
});

test("V117-compatible stack keeps PHG material layers and V114 palettes together", () => {
  assert.match(source.homeworld, /phgMaterialForV113/);
  assert.match(source.homeworld, /data-homeworld-material="dread"/);
  assert.match(source.homeworld, /data-homeworld-material="outfit"/);
  assert.match(source.preview, /phgMaterialForV113/);
  assert.match(source.preview, /registeredMaterialLayerV113/);
  assert.match(source.preview, /skinMaterial/);
  assert.match(source.preview, /outfitMaterial/);
  assert.doesNotMatch(source.homeworld, /\bconst skinFilter:/);
  assert.doesNotMatch(source.preview, /\bconst SKIN_FILTER:/);
  assert.match(source.homeworld, /HUNTER_SKIN_FILTERS_V114\[appearance\?\.skinId/);
  assert.match(source.preview, /HUNTER_DREAD_FILTERS_V114\[appearance\.dreadTintId/);
});
