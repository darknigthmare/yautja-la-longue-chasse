import test from "node:test";
import assert from "node:assert/strict";
import {
  chromaticFacilityChannelsV115,
  resetChromaticFacilityV115,
  normalizeHunterChromaticsV113,
} from "../app/game/hunterChromaticsV113.ts";
test("medical service exposes only biological pigment, forge only wearable finishes",()=>{
  assert.deepEqual(chromaticFacilityChannelsV115("lab").map(c=>c.id),["skin"]);
  assert.deepEqual(chromaticFacilityChannelsV115("forge").map(c=>c.id),["dreads","outfit","armor"]);
  assert.deepEqual(chromaticFacilityChannelsV115("ship").map(c=>c.id),["skin","dreads","outfit","armor"]);
});
test("a medical reset never erases equipment and the forge reset never touches skin",()=>{
  const before=normalizeHunterChromaticsV113({
    skinHex:"#775522",dreadHex:"#123456",outfitHex:"#456789",armorHex:"#abcdef",
    skinMaterialId:"phg-skin_classe_viking_base_observee",
    armorMaterialId:"phg-samurai-red-lacquer",
  });
  const lab=resetChromaticFacilityV115(before,"lab");
  assert.equal(lab.skinHex,null);assert.equal(lab.skinMaterialId,null);
  assert.equal(lab.dreadHex,"#123456");assert.equal(lab.armorHex,"#abcdef");
  assert.equal(lab.armorMaterialId,"phg-samurai-red-lacquer");
  const forge=resetChromaticFacilityV115(before,"forge");
  assert.equal(forge.skinHex,"#775522");
  assert.equal(forge.skinMaterialId,"phg-skin_classe_viking_base_observee");
  assert.equal(forge.dreadHex,null);assert.equal(forge.armorHex,null);
  assert.equal(forge.armorMaterialId,null);
  assert.deepEqual(resetChromaticFacilityV115(before,"ship"),normalizeHunterChromaticsV113(undefined));
  assert.equal(before.skinHex,"#775522","inputs are immutable");
});
