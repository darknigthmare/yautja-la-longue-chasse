import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {Y_A_U_T_J_A_DECALS_V133,DECAL_ATLAS_SHA256_V133,
  decalOfPaletteV133,normalizeDecalIdV133,DECAL_ANCHORS_V133,
} from "../app/game/yautjaDecalsV133.ts";
import {Y_A_U_T_J_A_CONCEPT_MASKS_V133,conceptBiomaskV133}
  from "../app/game/conceptBiomasksV133.ts";
import {normalizeHunterChromaticsV113,resetChromaticFacilityV115}
  from "../app/game/hunterChromaticsV113.ts";
import {decalCanvasSourceV133} from "../app/game/decalCanvasV133.ts";
import {V6_MASK_VISUAL_BY_ID} from "../app/game/v6Visuals.ts";

test("V133: 48 independent source-safe decals + 7 playable original masks",()=>{
  assert.equal(Y_A_U_T_J_A_DECALS_V133.length,48);
  assert.equal(new Set(Y_A_U_T_J_A_DECALS_V133.map(a=>a.id)).size,48);
  for(const zone of ["biomask","face","body","armor"]){
    const items=Y_A_U_T_J_A_DECALS_V133.filter(d=>d.zone===zone);
    assert.equal(items.length,12);
    for(const item of items){
      assert.equal(item.visualFidelity,"fan-study-unverified");
      assert.equal(item.officialPHGUV,false);
      assert.equal(decalOfPaletteV133(zone,item.id)?.id,item.id);
      assert.equal(normalizeDecalIdV133(zone,item.id),item.id);
      assert.equal(normalizeDecalIdV133(zone,"../../"+item.id),null);
    }
  }
  assert.equal(Y_A_U_T_J_A_CONCEPT_MASKS_V133.length,7);
  assert.equal(new Set(Y_A_U_T_J_A_CONCEPT_MASKS_V133.map(m=>m.id)).size,7);
  for(const mask of Y_A_U_T_J_A_CONCEPT_MASKS_V133){
    assert.ok(mask.assetPath.startsWith("/game/assets/v133/concept-masks/"));
    assert.equal(conceptBiomaskV133(mask.id)?.id,mask.id);
    assert.ok(V6_MASK_VISUAL_BY_ID[mask.id]);
    const f="public"+mask.assetPath;
    const bytes=readFileSync(f);
    assert.equal(bytes.toString("ascii",0,4),"RIFF");
    assert.equal(bytes.toString("ascii",8,12),"WEBP");
    assert.equal(createHash("sha256").update(bytes).digest("hex"),mask.fileSha256);
  }
});

test("V133: atlas is committed and matches catalog's verified fingerprint",()=>{
  const blob=readFileSync("public/game/assets/v133/decals/decal-atlas.webp");
  assert.ok(blob.byteLength>100000);
  assert.equal(blob.toString("ascii",0,4),"RIFF");
  assert.equal(blob.toString("ascii",8,12),"WEBP");
  assert.equal(createHash("sha256").update(blob).digest("hex"),DECAL_ATLAS_SHA256_V133);
  assert.deepEqual(DECAL_ANCHORS_V133.biomask,{x:122,y:36,width:45,height:39});
});

test("V133: save IDs remain per-channel and invalid data is never restored",()=>{
 const list=Y_A_U_T_J_A_DECALS_V133.filter(x=>["face","body","armor","biomask"].includes(x.zone));
 const values=Object.fromEntries(list.filter((x,i)=>i%12===0).map((x,i)=>[["maskDecalId","faceDecalId","bodyDecalId","armorDecalId"][i],x.id]));
 const first=Object.fromEntries(["maskDecalId","faceDecalId","bodyDecalId","armorDecalId"].map((key,i)=>
   [key,Y_A_U_T_J_A_DECALS_V133[i*12].id]));
 const state=normalizeHunterChromaticsV113(first);
 assert.equal(state.maskDecalId,first.maskDecalId);
 assert.equal(state.faceDecalId,first.faceDecalId);
 assert.equal(state.bodyDecalId,first.bodyDecalId);
 assert.equal(state.armorDecalId,first.armorDecalId);
 assert.equal(normalizeHunterChromaticsV113({faceDecalId:first.maskDecalId}).faceDecalId,null);
 assert.equal(normalizeHunterChromaticsV113({armorDecalId:"https://unsafe.local/fake.webp"}).armorDecalId,null);
 const lab=resetChromaticFacilityV115(state,"lab");
 assert.equal(lab.faceDecalId,null);
 assert.equal(lab.bodyDecalId,null);
 assert.equal(lab.maskDecalId,state.maskDecalId);
 assert.equal(lab.armorDecalId,state.armorDecalId);
 const forge=resetChromaticFacilityV115(state,"forge");
 assert.equal(forge.faceDecalId,state.faceDecalId);
 assert.equal(forge.bodyDecalId,state.bodyDecalId);
 assert.equal(forge.maskDecalId,null);
 assert.equal(forge.armorDecalId,null);
});

test("V133: one selected decal is painted inside original RGBA source and not full screen",()=>{
 const oldImage=globalThis.Image,oldDoc=globalThis.document;
 const artwork={kind:"original-sprite"};
 class MockImage{naturalWidth=2048;naturalHeight=1536;set src(value){this._src=value;this.onload?.()}get src(){return this._src}}
 globalThis.Image=MockImage;
 globalThis.document={createElement(kind){
  assert.equal(kind,"canvas");const calls=[];
  const ctx={filter:"none",globalAlpha:1,globalCompositeOperation:"source-over",
    drawImage(...args){calls.push({args,blend:this.globalCompositeOperation,alpha:this.globalAlpha})}};
  return {width:0,height:0,calls,getContext(){return ctx;}};
 }};
 try{
  for(const zone of ["biomask","face","body","armor"]){
   const selected=Y_A_U_T_J_A_DECALS_V133.find(x=>x.zone===zone);
   assert.ok(selected);
   const field={biomask:"maskDecalId",face:"faceDecalId",body:"bodyDecalId",armor:"armorDecalId"}[zone];
   const original=decalCanvasSourceV133(artwork,{[field]:selected.id},zone);
   assert.ok(original);
   const paint=original.calls.find(x=>x.args.length===9);
   assert.ok(paint);
   assert.equal(paint.blend,"source-atop");
   assert.equal(paint.alpha,.82);
   assert.equal(paint.args[1],selected.atlas.column*256);
   assert.equal(paint.args[2],selected.atlas.row*256);
   assert.equal(paint.args[3],256);assert.equal(paint.args[4],256);
  }
 }finally{
  if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;
  if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;
 }
});
