import test from "node:test";
import assert from "node:assert/strict";
import { migrateLegacyPhgAppearanceV115, normalizeHunterChromaticsV113 } from "../app/game/hunterChromaticsV113.ts";
test("PR25 experimental tints survive as V113 colors, without separate source fields",()=>{
  const c=migrateLegacyPhgAppearanceV115({
    skinId:"moss-mottle",dreadTintId:"blue-black",armorTintId:"jade",
    skinMaterialId:"skin_classe_viking_base_observee",
    dreadMaterialId:"dread_anubis_gris_motif_ecaille",
    outfitMaterialId:"armor_classe_wolf_tablier_gris_brun",
  });
  assert.deepEqual([c.skinHex,c.dreadHex,c.armorHex],["#677b4b","#343e53","#466f5b"]);
  assert.equal(c.skinMaterialId,"phg-skin_classe_viking_base_observee");
  assert.equal(c.dreadMaterialId,"phg-dread_anubis_gris_motif_ecaille");
  assert.equal(c.outfitMaterialId,"phg-armor_classe_wolf_tablier_gris_brun");
  assert.equal("skinId" in c,false);
  assert.equal("outfitId" in c,false);
});
test("special-case old V85 ids map to their existing V113 save IDs",()=>{
  const a=migrateLegacyPhgAppearanceV115({
    skinMaterialId:"skin_shatter_demon_provisoire",
    outfitMaterialId:"armor_filet_fin_noir_losanges",
  });
  assert.equal(a.skinMaterialId,"phg-shatter-demon-study");
  assert.equal(a.outfitMaterialId,"phg-fine-net");
  const lacquer=migrateLegacyPhgAppearanceV115({outfitMaterialId:"armor_classe_samurai_laque_rouge_volutes"});
  assert.equal(lacquer.outfitMaterialId,null);
  assert.equal(lacquer.armorMaterialId,"phg-samurai-red-lacquer");
});
test("explicit null or newly selected modern material overrides any conflicting old PR25 field",()=>{
  const b=migrateLegacyPhgAppearanceV115({
    skinId:"ivory-mottle",skinMaterialId:"skin_classe_viking_base_observee",
    chromaticsV113:{skinHex:null,skinMaterialId:null,armorMaterialId:"phg-samurai-red-lacquer"},
  });
  assert.equal(b.skinHex,null);assert.equal(b.skinMaterialId,null);
  assert.equal(b.armorMaterialId,"phg-samurai-red-lacquer");
});
test("unregistered or malicious legacy input never turns into an asset URL",()=>{
  const old=migrateLegacyPhgAppearanceV115({
    skinMaterialId:"https://external.test/evil.png",
    dreadMaterialId:"anneau_ligature_fil_rouge_observe_2022",
    outfitMaterialId:"armor_classe_father_masque_beige_strie",
  });
  assert.deepEqual(old,normalizeHunterChromaticsV113(undefined));
});
