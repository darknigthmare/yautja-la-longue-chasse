import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("V118: each of the 44 original V85 PHG reconstructions still exists", () => {
  const raw = read("app/game/hunterMaterialsV113.ts");
  const entries = Array.from(raw.matchAll(/"src": "(\/game\/imports\/v85\/drive-latest\/[^"]+\.png)"/g),m=>m[1]);
  assert.equal(entries.length,44);
  for(const entry of entries)
    assert.ok(existsSync(new URL("../public" + entry,import.meta.url)),"Missing PNG: " + entry);
  assert.match(raw,/archived/);
});

test("V118: single chromatic save schema imports PR25 experimental fields, never re-saves them", () => {
  const types=read("app/game/types.ts");
  const save=read("app/game/save.ts");
  const model=read("app/game/hunterChromaticsV113.ts");
  const ui=read("app/game/GameClient.tsx");
  assert.match(types,/chromaticsV113\?: HunterChromaticsV113/);
  assert.match(save,/chromaticsV113:\s*migrateLegacyPhgAppearanceV115\(source\)/);
  assert.match(model,/appearance\.skinMaterialId/);
  assert.match(model,/appearance\.dreadMaterialId/);
  assert.match(model,/appearance\.outfitMaterialId/);
  assert.match(ui,/commitHunterChromaticsV116/);
  assert.match(ui,/key === "skinId"/);
  assert.doesNotMatch(save,/\bskinMaterialId:\s*phgMaterialForV113/);
});
