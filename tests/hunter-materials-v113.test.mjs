import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
test("PHG materials are backed by actual checked-in PNG paths", () => {
  const raw = read("app/game/hunterMaterialsV113.ts");
  const items = Array.from(raw.matchAll(/"src": "(\/game\/imports\/v85\/drive-latest\/[^"]+\.png)"/g), m => m[1]);
  assert.equal(items.length, 44);
  for (const item of items) assert.ok(existsSync(new URL("../public" + item, import.meta.url)), "Missing: " + item);
  assert.match(raw, /archived/);
});
test("Palette schema persists three independent material slots", () => {
  const t = read("app/game/types.ts"),s=read("app/game/save.ts"),ui=read("app/game/GameClient.tsx");
  for (const field of ["skinMaterialId","dreadMaterialId","outfitMaterialId"]) {
    assert.ok(t.includes(field));assert.ok(s.includes(field));assert.ok(ui.includes(field));
  }
  assert.match(s,/phgMaterialForV113/);
  assert.match(ui,/key === "skinId"/);
});
