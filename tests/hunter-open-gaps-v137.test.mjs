import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {conceptMaskRigPlacementV137,conceptMaskAlignedBoundsV137,
  CONCEPT_MASK_ALPHA_BOUNDS_V137} from "../app/game/conceptMaskFitV137.ts";
import {Y_A_U_T_J_A_CONCEPT_MASKS_V133} from "../app/game/conceptBiomasksV133.ts";
import {hunterMaskRigPlacement,hunterMaskRigPath} from "../app/game/hunterVisuals.ts";
import {DEFAULT_CHROMATICS_V113,normalizeHunterChromaticsV113,
  migrateLegacyPhgAppearanceV115} from "../app/game/hunterChromaticsV113.ts";
import {commitHunterChromaticsV116} from "../app/game/systems/hunterChromaticPersistenceV116.ts";
import {maskMaterialAllowedV132} from "../app/game/phgBiomaskStudiesV132.ts";
const owner="2026-10-31T09:00:00Z";

test("V137: 7 real mask alphas aligned to V62 historic head socket without rescaling",()=>{
 assert.equal(Y_A_U_T_J_A_CONCEPT_MASKS_V133.length,7);
 for(const mask of Y_A_U_T_J_A_CONCEPT_MASKS_V133){
  assert.ok(CONCEPT_MASK_ALPHA_BOUNDS_V137[mask.id]);
  const p=conceptMaskRigPlacementV137(mask.id),b=conceptMaskAlignedBoundsV137(mask.id);
  assert.deepEqual(p,hunterMaskRigPlacement(mask.id));
  assert.equal(p.width,256);assert.equal(p.height,384);
  assert.ok(Math.abs((b.left+b.right)/2-147)<=.5);
  assert.ok(Math.abs((b.top+b.bottom)/2-60)<=.5);
  assert.equal(hunterMaskRigPath(mask.id),mask.assetPath);
  const blob=readFileSync("public"+mask.assetPath);
  assert.equal(createHash("sha256").update(blob).digest("hex"),mask.fileSha256);
 }
 assert.equal(conceptMaskRigPlacementV137("feral"),null);
 assert.equal(conceptMaskRigPlacementV137("../concept-v133-nova"),null);
});

test("V137: malformed material ids, colors and decals never become trusted URLs",()=>{
 const attacks=["../../secret.webp","https://evil.test/x.webp","data:image/png;base64,AA",
  "javascript:alert(1)","__proto__","constructor","toString",
  "<img src=x onerror=1>","phg-study-v132-unknown", "Z".repeat(2048)];
 for(const value of attacks){
  const draft=Object.fromEntries(["skinHex","maskHex","skinMaterialId",
    "dreadMaterialId","outfitMaterialId","armorMaterialId","maskMaterialId",
    "maskDecalId","faceDecalId","bodyDecalId","armorDecalId","maskOriginId"]
    .map(field=>[field,value]));
  const normalized=normalizeHunterChromaticsV113(draft);
  for(const name of Object.keys(draft))assert.equal(normalized[name],null,name);
  const imported=migrateLegacyPhgAppearanceV115({skinId:value,
    dreadTintId:value,armorTintId:value,chromaticsV113:null});
  assert.deepEqual(imported,DEFAULT_CHROMATICS_V113);
 }
});

test("V137: class-restricted mask paints are removed before durable write",()=>{
 const cases=[
  ["jungle-hunter","jungle",null,null],
  ["alpha","feral","alpha","phg-study-v132-instinct"],
  ["samurai","celtic","samurai","phg-study-v132-requiem"],
  ["samurai","celtic","samurai",null],
 ];
 for(const [preset,biomask,origin,allowed] of cases){
  const current={createdAt:owner,appearance:{
   presetId:preset,biomaskId:biomask,chromaticsV113:{...DEFAULT_CHROMATICS_V113}},
   profile:{honor:17}};
  const draft={...DEFAULT_CHROMATICS_V113,maskOriginId:"alpha",
    maskMaterialId:allowed??"phg-study-v132-tyrant",faceDecalId:"../x.png"};
  const result=commitHunterChromaticsV116({current,expectedOwnerCreatedAt:owner,draft,
   write(next){return {save:next,persisted:true,failure:null}},
   reconcile(){throw Error("unexpected reconciliation")}});
  assert.equal(result.ok,true);
  assert.equal(result.save.appearance.chromaticsV113.maskOriginId,origin);
  assert.equal(result.save.appearance.chromaticsV113.maskMaterialId,allowed);
  assert.equal(result.save.appearance.chromaticsV113.faceDecalId,null);
  assert.equal(result.save.profile.honor,17);
  if(allowed)assert.equal(maskMaterialAllowedV132(result.save.appearance,allowed),true);
 }
});

test("V137: foreign campaign cannot persist and does not reach the writer",()=>{
 let writes=0;
 const current={createdAt:owner,appearance:{presetId:"alpha",biomaskId:"feral",
  chromaticsV113:{...DEFAULT_CHROMATICS_V113}}};
 const result=commitHunterChromaticsV116({current,expectedOwnerCreatedAt:"other",
  draft:{...DEFAULT_CHROMATICS_V113,maskMaterialId:"phg-study-v132-tyrant"},
  write(){writes++;throw Error("should not write")},
  reconcile(){throw Error("should not recover")}});
 assert.deepEqual(result,{ok:false,failure:"save-conflict"});
 assert.equal(writes,0);
});
