import test from "node:test";
import assert from "node:assert/strict";
import { chromaticCanvasDescriptorV113,chromaticCanvasSourceV113 } from "../app/game/hunterChromaticCanvasV113.ts";

test("Canvas descriptor never trusts arbitrary URLs from a save",()=>{
  assert.deepEqual(chromaticCanvasDescriptorV113({skinMaterialId:"https://evil.example/missing.png"},"skin"),
    {color:null,texturePath:null,opacity:.58});
});
test("Canvas registry only returns actual installed PNGs",()=>{
  const net=chromaticCanvasDescriptorV113({outfitMaterialId:"phg-fine-net"},"outfit");
  assert.equal(net.texturePath,"/game/assets/v113/phg/armor_filet_fin_noir_losanges.png");
  assert.equal(net.opacity,.78);
});
test("Legacy save does not allocate a canvas or touch DOM",()=>{
  const fake={};
  assert.equal(chromaticCanvasSourceV113(fake,undefined,"skin"),null);
});
