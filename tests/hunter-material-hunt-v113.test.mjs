import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("V118: playable hunting sprites use one shared canonical RGBA composite", () => {
  const hunt = read("app/game/HuntCanvas.tsx");
  const paint = read("app/game/hunterChromaticCanvasV113.ts");
  assert.match(hunt,/chromaticCanvasSourceV113/);
  assert.match(hunt,/chromaticsV113/);
  assert.match(hunt,/channel: "skin"/);
  assert.match(hunt,/channel: "dreads"/);
  assert.match(hunt,/channel: "outfit"/);
  assert.match(hunt,/channel: "armor"/);
  assert.match(paint,/globalCompositeOperation="source-atop"/);
  assert.match(paint,/CHROMATIC_PIGMENT_OVER_TEXTURE_V117/);
  assert.doesNotMatch(hunt,/function hunterMaterialBitmapV113/);
  assert.doesNotMatch(hunt,/phgMaterialForV113/);
});
