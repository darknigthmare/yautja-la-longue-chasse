import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const preview=readFileSync("app/game/HunterRigPreview.tsx","utf8");

test("all V116 Preview chromatic overlays use valid integer z-indexes",()=>{
  assert.match(preview,/channel="skin"[\s\S]*?zIndex: z, transform: cssMatrix\(matrix\)/);
  assert.match(preview,/channel="outfit"[\s\S]*?zIndex: z \+ 1, transform: cssMatrix\(matrix\)/);
  assert.match(preview,/channel="armor"[\s\S]*?zIndex: slot\.z, transform: cssMatrix\(matrix\)/);
  assert.doesNotMatch(preview,/zIndex:\s*(?:z|slot\.z)\s*\+\s*\d+\.\d+/);
  assert.match(preview,/registeredLayer\(hunterArmorPath\(slot\.id\), matrix, slot\.z/);
});

test("existing rig slots keep their integer depth without a global reorder",()=>{
  assert.match(preview,/const z = 20 \+ index \* 2;/);
  assert.match(preview,/const armorSlots: Array/);
  assert.match(preview,/zIndex: 4 \+ index,/);
  assert.match(preview,/zIndex: 80,/);
  assert.match(preview,/zIndex: 100,/);
});
