import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {PHG_V129_ATLAS,PHG_V129_PATCH_MATERIALS,PHG_V129_OGRE_MASK,PHG_V129_CLASSES} from "../app/game/phgPatchStudiesV129.ts";
import {PHG_CHROMATIC_MATERIALS_V113,getChromaticMaterialV113,chromaticOverlayStyleV113} from "../app/game/hunterChromaticsV113.ts";
import {chromaticCanvasSourceV113} from "../app/game/hunterChromaticCanvasV113.ts";
test("V129 verifies 409912-byte WebP atlas, 3 save-safe IDs and no fake game UVs",()=>{
 const bytes=readFileSync(new URL("../public/game/assets/v129/phg-patches/atlas.webp",import.meta.url));
 assert.equal(bytes.length,409912);assert.equal(bytes.toString("ascii",0,4),"RIFF");
 assert.equal(bytes.toString("ascii",8,12),"WEBP");
 assert.equal(createHash("sha256").update(bytes).digest("hex"),PHG_V129_ATLAS.sha256);
 assert.equal(PHG_V129_ATLAS.authenticPHG,false);
 assert.equal(PHG_V129_PATCH_MATERIALS.length,3);
 assert.deepEqual(PHG_V129_PATCH_MATERIALS.map(x=>x.channel),["skin","skin","dreads"]);
 assert.equal(new Set(PHG_CHROMATIC_MATERIALS_V113.map(x=>x.id)).size,77);
 for(const m of PHG_V129_PATCH_MATERIALS){
  assert.equal(m.evidence,"provisional");assert.equal(m.status,"integrated");
  assert.equal(getChromaticMaterialV113(m.channel,m.id)?.src,PHG_V129_ATLAS.path);
 }
});
test("V129 official type constraints: Mottle Dread is skin, Ogre mask never armor",()=>{
 assert.equal(PHG_V129_CLASSES.mottleDread.length,3);
 assert.equal(PHG_V129_CLASSES.gatorWaves.length,7);
 assert.equal(PHG_V129_CLASSES.tankOriginalUnlockLevelAfter240,150);
 assert.equal(getChromaticMaterialV113("dreads",PHG_V129_PATCH_MATERIALS[0].id),null);
 assert.equal(PHG_V129_OGRE_MASK.type,"biomask-tint");
 assert.equal(PHG_V129_OGRE_MASK.armorAllowed,false);
 assert.equal(PHG_V129_OGRE_MASK.selectable,false);
 assert.equal(getChromaticMaterialV113("armor","phg-study-v129-alpha_ogre_biomask_tint"),null);
});
test("V129 CSS masks and hunting Canvas isolate 3 atlas quadrants",()=>{
 const image=globalThis.Image,document=globalThis.document;
 class Img{naturalWidth=1024;naturalHeight=1024;set src(value){this._src=value;this.onload?.();}get src(){return this._src;}}
 const rig={id:"original"};
 globalThis.Image=Img;
 globalThis.document={createElement(tag){assert.equal(tag,"canvas");const draws=[];
  const ctx={filter:"none",globalAlpha:1,globalCompositeOperation:"source-over",drawImage(...a){draws.push(a);},fillRect(){}};
  return {width:0,height:0,draws,getContext(){return ctx;}};}};
 try{
 for(const m of PHG_V129_PATCH_MATERIALS){
  const appearance={[m.channel==="skin"?"skinMaterialId":"dreadMaterialId"]:m.id};
  const css=chromaticOverlayStyleV113(appearance,m.channel,"/rig/source.webp");
  assert.equal(css.maskImage,'url("/rig/source.webp")');
  assert.equal(css.backgroundSize,"200% 200%");
  const c=chromaticCanvasSourceV113(rig,appearance,m.channel)??chromaticCanvasSourceV113(rig,appearance,m.channel);
  assert.ok(c);
  const crop=c.draws.find(args=>args.length===9);
  assert.deepEqual(crop.slice(1,5),[m.atlas.column*512,m.atlas.row*512,512,512]);
  assert.equal(chromaticCanvasSourceV113(rig,appearance,m.channel),c);
 }
 }finally{
  if(image===undefined)delete globalThis.Image;else globalThis.Image=image;
  if(document===undefined)delete globalThis.document;else globalThis.document=document;
 }
});
