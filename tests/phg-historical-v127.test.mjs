import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {
 PHG_HISTORICAL_STUDIES_V127,PHG_V127_ATLAS_SHA256,
 PHG_CLASS_PATTERN_EVIDENCE_V127,PHG_HISTORICAL_UNLOCKS_V127,PHG_MENU_SCREENSHOTS_V127,
} from "../app/game/phgHistoricalMaterialsV127.ts";
import {
 PHG_CHROMATIC_MATERIALS_V113,getChromaticMaterialV113,
 chromaticOverlayStyleV113,
} from "../app/game/hunterChromaticsV113.ts";
import {chromaticCanvasSourceV113} from "../app/game/hunterChromaticCanvasV113.ts";

test("V127 committed atlas matches known original-study SHA, without claiming official UVs",()=>{
 const path=new URL("../public/game/assets/v127/phg-historical/atlas.webp",import.meta.url);
 const bytes=readFileSync(path);
 assert.ok(statSync(path).size > 40000);
 assert.equal(bytes.toString("ascii",0,4),"RIFF");
 assert.equal(bytes.toString("ascii",8,12),"WEBP");
 assert.equal(createHash("sha256").update(bytes).digest("hex"),PHG_V127_ATLAS_SHA256);
 assert.equal(PHG_HISTORICAL_STUDIES_V127.length,4);
 for(const m of PHG_HISTORICAL_STUDIES_V127){
   assert.equal(m.channel,"skin");
   assert.equal(m.status,"integrated");
   assert.equal(m.evidence,"provisional");
   assert.match(m.note,/non certifiés 1:1/);
   assert.deepEqual([m.atlas.columns,m.atlas.rows],[2,2]);
   assert.equal(getChromaticMaterialV113("skin",m.id)?.src,m.src);
   assert.equal(getChromaticMaterialV113("dreads",m.id),null);
 }
 assert.equal(new Set(PHG_CHROMATIC_MATERIALS_V113.map(m=>m.id)).size,69);
});
test("V127 classes and historical unlocks match the relevant official patches",()=>{
 assert.equal(PHG_CLASS_PATTERN_EVIDENCE_V127.length,5);
 for(const item of PHG_CLASS_PATTERN_EVIDENCE_V127){
  assert.equal(item.classes.length,item.name==="Mottle Dread"?3:8);
 }
 assert.deepEqual(PHG_CLASS_PATTERN_EVIDENCE_V127[4].classes,["Scout","Hunter","Berserker"]);
 const names=Object.fromEntries(PHG_HISTORICAL_UNLOCKS_V127.map(x=>[x.id,x]));
 assert.equal(names.aurora.level,500);
 assert.equal(names["tank-predlocks-v239"].level,500);
 assert.equal(names["tank-predlocks-v240"].level,150);
 assert.equal(names["tank-mask-v240"].level,87);
 assert.equal(names["exiled-predlock-tint"].level,null);
 assert.ok(PHG_MENU_SCREENSHOTS_V127.every(x=>x.uvReference===false));
});
test("V127 skin atlas is cropped per class of pattern by CSS and actual hunt Canvas",()=>{
 const oldImage=globalThis.Image,oldDoc=globalThis.document;
 class MockImage{naturalWidth=1024;naturalHeight=1024;
   set src(src){this._src=src;this.onload?.();}get src(){return this._src;}}
 const rig={kind:"rig"};
 globalThis.Image=MockImage;
 globalThis.document={createElement(tag){
   assert.equal(tag,"canvas");
   const draws=[];
   const ctx={filter:"none",globalAlpha:1,globalCompositeOperation:"source-over",
     drawImage(...args){draws.push(args);},fillRect(){}};
   return {width:0,height:0,draws,getContext(){return ctx;}};
 }};
 try{
  for(const [index,material] of PHG_HISTORICAL_STUDIES_V127.entries()){
    const selection={skinMaterialId:material.id};
    const overlay=chromaticOverlayStyleV113(selection,"skin","/game/rig/skin.webp");
    assert.equal(overlay?.maskImage,'url("/game/rig/skin.webp")');
    assert.equal(overlay?.backgroundSize,"200% 200%");
    const image=chromaticCanvasSourceV113(rig,selection,"skin")
      ?? chromaticCanvasSourceV113(rig,selection,"skin");
    assert.ok(image);
    const crop=image.draws.find(args=>args.length===9);
    assert.ok(crop);
    assert.deepEqual(crop.slice(1,5),[index%2*512,Math.floor(index/2)*512,512,512]);
    assert.equal(chromaticCanvasSourceV113(rig,selection,"skin"),image);
  }
 }finally{
   if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;
   if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;
 }
});
