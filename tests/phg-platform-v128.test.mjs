import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {PHG_V128_ATLAS,PHG_PLATFORM_STUDIES_V128,PHG_OGRE_MASK_CORRECTION_V128}
  from "../app/game/phgPlatformStudiesV128.ts";
import {PHG_CHROMATIC_MATERIALS_V113,getChromaticMaterialV113,chromaticOverlayStyleV113}
  from "../app/game/hunterChromaticsV113.ts";
import {chromaticCanvasSourceV113} from "../app/game/hunterChromaticCanvasV113.ts";

test("V128 validates SHA256 of committed local atlas and four save-safe material IDs",()=>{
 const file=new URL("../public/game/assets/v128/phg-platform/atlas.webp",import.meta.url);
 const data=readFileSync(file);
 assert.equal(statSync(file).size,426232);
 assert.equal(data.toString("ascii",0,4),"RIFF");
 assert.equal(data.toString("ascii",8,12),"WEBP");
 assert.equal(createHash("sha256").update(data).digest("hex"),PHG_V128_ATLAS.sha256);
 assert.equal(PHG_V128_ATLAS.authenticPHGUV,false);
 assert.equal(PHG_PLATFORM_STUDIES_V128.length,4);
 assert.deepEqual(PHG_PLATFORM_STUDIES_V128.map(x=>x.channel),["dreads","armor","armor","armor"]);
 assert.equal(new Set(PHG_CHROMATIC_MATERIALS_V113.map(x=>x.id)).size,69);
 for(const entry of PHG_PLATFORM_STUDIES_V128){
  assert.equal(entry.status,"integrated");assert.equal(entry.evidence,"provisional");
  assert.equal(entry.src,PHG_V128_ATLAS.path);
  assert.match(entry.note,/non certifiée 1:1/);
  assert.deepEqual([entry.atlas.columns,entry.atlas.rows],[2,2]);
  assert.equal(getChromaticMaterialV113(entry.channel,entry.id)?.id,entry.id);
 }
});
test("V128 four atlas quadrants are isolated by CSS rig masks and hunting Canvas",()=>{
 const oldImage=globalThis.Image,oldDoc=globalThis.document;
 class ImageStub{naturalWidth=1024;naturalHeight=1024;set src(s){this._src=s;this.onload?.();}get src(){return this._src;}}
 const rig={kind:"rig"};
 globalThis.Image=ImageStub;
 globalThis.document={createElement(tag){
  assert.equal(tag,"canvas");const draws=[];
  const ctx={filter:"none",globalAlpha:1,globalCompositeOperation:"source-over",
    drawImage(...a){draws.push(a);},fillRect(){}};
  return {width:0,height:0,draws,getContext(){return ctx;}};
 }};
 try{
  for(const m of PHG_PLATFORM_STUDIES_V128){
   const selection={ [m.channel==="dreads"?"dreadMaterialId":"armorMaterialId"]:m.id };
   const style=chromaticOverlayStyleV113(selection,m.channel,"/rig/original.webp");
   assert.equal(style?.maskImage,'url("/rig/original.webp")');
   assert.equal(style?.backgroundSize,"200% 200%");
   const composed=chromaticCanvasSourceV113(rig,selection,m.channel)??chromaticCanvasSourceV113(rig,selection,m.channel);
   assert.ok(composed);
   const crop=composed.draws.find(a=>a.length===9);
   assert.ok(crop);
   assert.deepEqual(crop.slice(1,5),[m.atlas.column*512,m.atlas.row*512,512,512]);
   assert.equal(chromaticCanvasSourceV113(rig,selection,m.channel),composed);
  }
 }finally{
  if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;
  if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;
 }
});
test("V128 Ogre is only an Alpha biomask tint; never equip as armor",()=>{
 assert.equal(PHG_OGRE_MASK_CORRECTION_V128.correctType,"biomask-tint");
 assert.equal(PHG_OGRE_MASK_CORRECTION_V128.class,"Alpha Predator");
 assert.equal(PHG_OGRE_MASK_CORRECTION_V128.renderAsArmor,false);
 assert.equal(getChromaticMaterialV113("armor","phg-ogre"),null);
 const ledger=JSON.parse(readFileSync(new URL("../app/game/data/phgVisualFidelityQueueV122.json",import.meta.url)));
 const record=ledger.records.find(x=>x.id==="armure_v2_ogre_pending");
 assert.equal(record.v128CanonicalType,"biomask-tint");
 assert.equal(record.v128DisallowArmor,true);
 assert.equal(ledger.unresolved,34);
 assert.equal(ledger.allowsOfficial1to1Claim,false);
});
