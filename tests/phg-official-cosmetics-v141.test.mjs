import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import source from "../app/game/data/phgOfficialCosmeticsV141.json" with {type:"json"};
import {PHG_BIOMASK_V132_CANDIDATES,
  maskClassForAppearanceV132,maskMaterialAllowedV132} from "../app/game/phgBiomaskStudiesV132.ts";
import {PHG_OGRE_BIOMASK_ID_V131} from "../app/game/phgBiomaskTintsV131.ts";
import {getChromaticMaterialV113} from "../app/game/hunterChromaticsV113.ts";
import {Y_A_U_T_J_A_CONCEPT_MASKS_V133} from "../app/game/conceptBiomasksV133.ts";

test("V141 patch 2.19 separates two armor colors, eight mask tints and Waves Gator skin",()=>{
  assert.equal(source.armorTints.length,2);
  assert.deepEqual(source.armorTints.map(x=>x.name),["Requiem","Nova"]);
  assert.deepEqual(source.armorTints[0].classes,["alpha"]);
  assert.deepEqual(source.armorTints[1].classes,
    ["alpha","scout","hunter","berserker","city-hunter-97","jungle-hunter-87","elder","samurai","viking"]);
  assert.equal(source.maskTints.length,8);
  assert.deepEqual(source.maskTints.filter(x=>x.classes.includes("samurai")).map(x=>x.name),["Requiem","Nova"]);
  assert.equal(source.skinPatternTints.length,1);
  assert.equal(source.skinPatternTints[0].name,"Waves (Gator)");
  assert.equal(source.canonicalGameUVsIncluded,false);
  assert.equal(source.visualCertification1to1,false);
  assert.equal(source.armorTints.every(x=>x.artStatus==="not-in-runtime"),true);
  assert.equal(getChromaticMaterialV113("armor","phg-study-v132-nova"),null);
  assert.equal(getChromaticMaterialV113("biomask","phg-study-v132-nova")?.channel,"biomask");
  for(const item of source.maskTints){
    assert.equal(item.artStatus,"original-study-installed");
    assert.equal(item.visualCertified1to1,false);
    assert.equal(getChromaticMaterialV113("biomask",item.materialId)?.id,item.materialId);
  }
  assert.equal(PHG_BIOMASK_V132_CANDIDATES.filter(x=>x.status==="integrated").length,7);
  assert.equal(source.maskTints.find(x=>x.name==="Ogre").materialId,PHG_OGRE_BIOMASK_ID_V131);
});
test("V141 official 3 masks and 6 warpaints are not filled with invented PHG art",()=>{
  assert.deepEqual(source.maskGeometry.map(x=>x.name),["Mr Black","City Hunter Rebreather","Saber (Dutch’s Shoulder Pauldron)"]);
  assert.deepEqual(source.warpaints.map(x=>x.name),["Waves","Sun","Erode","Cortex","Retch","Attend"]);
  assert.equal(source.warpaints.every(x=>x.artStatus==="reference-only"&&x.pixelMatchVerified===false),true);
  assert.equal(source.maskCompatibility.find(x=>x.maskId==="pirate").disallowed.includes("scar"),true);
  assert.equal(source.maskCompatibility.find(x=>x.maskId==="pirate").disallowed.includes("warpaint"),true);
  assert.equal(source.maskCompatibility.find(x=>x.maskId==="jungle").issue.includes("Scar 1"),true);
  assert.match(source.productionRules[0],/Warpaint is not a skin-pattern/);
});
test("V141 class restrictions honor real V133 catalog class hints, never arbitrary prefix",()=>{
  assert.equal(Y_A_U_T_J_A_CONCEPT_MASKS_V133.length,7);
  for(const m of Y_A_U_T_J_A_CONCEPT_MASKS_V133){
    const samurai=maskClassForAppearanceV132({presetId:"samurai",biomaskId:m.id});
    assert.equal(samurai,m.classHint==="alpha-or-samurai"?"samurai":null,m.id);
    assert.equal(maskClassForAppearanceV132({presetId:"alpha",biomaskId:m.id}),"alpha",m.id);
    if(m.classHint==="alpha"){
      assert.equal(maskMaterialAllowedV132({presetId:"samurai",biomaskId:m.id},"phg-study-v132-requiem"),false);
      assert.equal(maskMaterialAllowedV132({presetId:"alpha",biomaskId:m.id},"phg-study-v132-tyrant"),true);
    }
  }
  assert.equal(maskClassForAppearanceV132({presetId:"alpha",biomaskId:"concept-v133-nonexistent"}),null);
  assert.equal(maskClassForAppearanceV132({presetId:"samurai",biomaskId:"concept-v133-nonexistent",chromaticsV113:{maskOriginId:"samurai"}}),null);
  assert.equal(maskMaterialAllowedV132({presetId:"alpha",biomaskId:"city"},"phg-study-v132-requiem"),false);
});
test("V141 forge warns armor shader Nova/Requiem is not the same as the mask tile",()=>{
 const text=readFileSync("app/game/HunterChromaticForgeV113.tsx","utf8");
 assert.match(text,/Requiem et Nova sont aussi des/);
 assert.match(text,/teintes d’armure PHG distinctes/);
 assert.match(text,/Les six Warpaints PHG/);
});
