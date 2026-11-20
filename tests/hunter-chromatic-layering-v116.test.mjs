import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const preview=readFileSync("app/game/HunterRigPreview.tsx","utf8");

test("all V116 Preview chromatic overlays use valid integer z-indexes",()=>{
  assert.match(preview,/const layerStyle = \{ \.\.\.fullCanvasImage, zIndex: z, transform: cssMatrix\(matrix\), clipPath \};/);
  assert.match(preview,/channel="skin"[^>]*style=\{layerStyle\}/);
  assert.match(preview,/channel="outfit"[^>]*style=\{\{ \.\.\.layerStyle, zIndex: z \+ 1 \}\} zoneStyle=\{\{ \.\.\.layerStyle, zIndex: z \+ 1,/);
  assert.match(preview,/channel="armor"[^>]*zIndex: slot\.z, transform: cssMatrix\(matrix\)/);
  assert.doesNotMatch(preview,/zIndex:\s*(?:z|slot\.z)\s*\+\s*\d+\.\d+/);
  assert.match(preview,/base=\{registeredLayerBase\(path, matrix, slot\.z, rigSlot,/);
});

test("existing rig slots keep their integer depth without a global reorder",()=>{
  assert.match(preview,/const z = 20 \+ index \* 2;/);
  assert.match(preview,/const armorSlots: Array/);
  assert.match(preview,/zIndex: 4 \+ index,/);
  assert.match(preview,/zIndex: 80,/);
  assert.match(preview,/zIndex: 100,/);
});
