import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("V118: preview and Homeworld share four masked V117 chromatic channels", () => {
  for (const path of ["app/game/HunterRigPreview.tsx","app/game/HomeworldModularHunter.tsx"]) {
    const source = read(path);
    assert.match(source,/ChromaticSurfaceV113/);
    for (const channel of ["skin","dreads","outfit","armor"])
      assert.ok(source.includes('channel="' + channel + '"'),path + " missing " + channel);
    assert.match(source,/maskPath=/);
    assert.doesNotMatch(source,/registeredMaterialLayerV113/);
    assert.doesNotMatch(source,/phgMaterialForV113/);
  }
  const component = read("app/game/ChromaticSurfaceV113.tsx");
  assert.match(component,/chromaticOverlayStyleV113/);
});
