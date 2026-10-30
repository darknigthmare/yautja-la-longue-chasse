import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  PHG_OGRE_BIOMASK_ID_V131, PHG_OGRE_BIOMASK_MATERIAL_V131,
  PHG_BIOMASK_REFERENCES_V131, PHG_OGRE_BIOMASK_SOURCE_V131,
  alphaMaskEligibleV131,
} from "../app/game/phgBiomaskTintsV131.ts";
import {
  DEFAULT_CHROMATICS_V113, PHG_CHROMATIC_MATERIALS_V113,
  chromaticOverlayStyleV113, normalizeHunterChromaticsV113,
  maskChromaticsForAppearanceV131, getChromaticMaterialV113,
  migrateLegacyPhgAppearanceV115, resetChromaticFacilityV115,
} from "../app/game/hunterChromaticsV113.ts";
import {chromaticCanvasSourceV113} from "../app/game/hunterChromaticCanvasV113.ts";

test("V131: eight PHG mask-tint names, Ogre on Alpha biomask and never armor",()=>{
  assert.equal(PHG_BIOMASK_REFERENCES_V131.length,8);
  assert.deepEqual(PHG_BIOMASK_REFERENCES_V131.filter(x=>x.available).map(x=>x.name),["Ogre"]);
  assert.equal(PHG_BIOMASK_REFERENCES_V131.filter(x=>!x.available).length,7);
  assert.deepEqual(PHG_BIOMASK_REFERENCES_V131.find(x=>x.name==="Ogre")?.classes,["Alpha Predator"]);
  assert.equal(PHG_OGRE_BIOMASK_MATERIAL_V131.channel,"biomask");
  assert.equal(PHG_OGRE_BIOMASK_MATERIAL_V131.evidence,"provisional");
  assert.equal(PHG_OGRE_BIOMASK_MATERIAL_V131.src,"/game/assets/v129/phg-patches/atlas.webp");
  assert.deepEqual(PHG_OGRE_BIOMASK_MATERIAL_V131.atlas,{columns:2,rows:2,column:1,row:1});
  assert.match(PHG_OGRE_BIOMASK_SOURCE_V131,/patch-notes-2-19/);
  assert.equal(getChromaticMaterialV113("biomask",PHG_OGRE_BIOMASK_ID_V131)?.id,PHG_OGRE_BIOMASK_ID_V131);
  for(const channel of ["skin","dreads","outfit","armor"])
    assert.equal(getChromaticMaterialV113(channel,PHG_OGRE_BIOMASK_ID_V131),null);
  assert.equal(new Set(PHG_CHROMATIC_MATERIALS_V113.map(x=>x.id)).size,70);
});

test("V131: save migration, explicit resets, canonical mask ids and forge-only reset",()=>{
  assert.deepEqual(normalizeHunterChromaticsV113(undefined),DEFAULT_CHROMATICS_V113);
  const state=normalizeHunterChromaticsV113({
    skinHex:"#123456",armorMaterialId:"phg-samurai-red-lacquer",
    maskHex:"#A1B2C3",maskMaterialId:PHG_OGRE_BIOMASK_ID_V131,maskOriginId:"alpha",
  });
  assert.equal(state.maskHex,"#a1b2c3");
  assert.equal(state.maskMaterialId,PHG_OGRE_BIOMASK_ID_V131);
  assert.equal(state.maskOriginId,"alpha");
  assert.equal(state.skinHex,"#123456");
  assert.equal(state.armorMaterialId,"phg-samurai-red-lacquer");
  assert.equal(normalizeHunterChromaticsV113({maskHex:"url(unsafe)",maskOriginId:"../../alpha",
    maskMaterialId:"https://bad.invalid/paint.webp"}).maskMaterialId,null);
  assert.equal(migrateLegacyPhgAppearanceV115({chromaticsV113:null}).maskMaterialId,null);
  assert.equal(migrateLegacyPhgAppearanceV115({chromaticsV113:state}).maskMaterialId,PHG_OGRE_BIOMASK_ID_V131);
  assert.equal(resetChromaticFacilityV115(state,"lab").maskMaterialId,PHG_OGRE_BIOMASK_ID_V131);
  const result=resetChromaticFacilityV115(state,"forge");
  assert.equal(result.maskMaterialId,null);
  assert.equal(result.maskHex,null);
  assert.equal(result.maskOriginId,"alpha");
});

test("V131: original Alpha ownership remains save-safe after becoming a customized hunter",()=>{
  const chromatics=normalizeHunterChromaticsV113({
    maskHex:"#aabbcc",maskOriginId:"alpha",maskMaterialId:PHG_OGRE_BIOMASK_ID_V131,
  });
  assert.equal(alphaMaskEligibleV131({presetId:"alpha",biomaskId:"feral"}),true);
  assert.equal(alphaMaskEligibleV131({presetId:"custom",biomaskId:"feral",chromaticsV113:chromatics}),true);
  assert.equal(alphaMaskEligibleV131({presetId:"alpha",biomaskId:"city",chromaticsV113:chromatics}),false);
  assert.equal(alphaMaskEligibleV131({presetId:"feral-hunter",biomaskId:"feral"}),false);
  assert.equal(maskChromaticsForAppearanceV131({presetId:"feral-hunter",biomaskId:"feral",
    chromaticsV113:{maskMaterialId:PHG_OGRE_BIOMASK_ID_V131}}).maskMaterialId,null);
  assert.equal(maskChromaticsForAppearanceV131({presetId:"custom",biomaskId:"city",
    chromaticsV113:chromatics}).maskMaterialId,null);
});

test("V131: real biomask image is source alpha and only V129 lower-right atlas tile is painted",()=>{
  const oldImage=globalThis.Image,oldDoc=globalThis.document;
  const rig={kind:"authored-mask"};
  class LocalImage {naturalWidth=1024;naturalHeight=1024;set src(value){this._src=value;this.onload?.();}get src(){return this._src;}}
  globalThis.Image=LocalImage;
  globalThis.document={createElement(tag){
    assert.equal(tag,"canvas");const draws=[];
    const ctx={filter:"none",globalAlpha:1,globalCompositeOperation:"source-over",fillStyle:"",
      drawImage(...args){draws.push({args,composite:this.globalCompositeOperation,alpha:this.globalAlpha});},
      fillRect(){}};
    return {width:0,height:0,draws,getContext(){return ctx;}};
  }};
  try{
    const appearance={presetId:"custom",biomaskId:"feral",
      chromaticsV113:normalizeHunterChromaticsV113({
        maskMaterialId:PHG_OGRE_BIOMASK_ID_V131,maskOriginId:"alpha",maskHex:"#c1a990",
      })};
    const safe=maskChromaticsForAppearanceV131(appearance);
    const css=chromaticOverlayStyleV113(safe,"biomask","/rig/real-mask.webp");
    assert.equal(css.maskImage,'url("/rig/real-mask.webp")');
    assert.equal(css.backgroundSize,"100% 100%, 200% 200%");
    assert.equal(css.backgroundPosition,"center, 100% 100%");
    assert.match(css.backgroundImage,/phg-patches\/atlas\.webp/);
    const first=chromaticCanvasSourceV113(rig,safe,"biomask");
    assert.ok(first);
    const second=chromaticCanvasSourceV113(rig,safe,"biomask");
    assert.ok(second);assert.notEqual(second,first);
    const crop=second.draws.find(draw=>draw.args.length===9);
    assert.ok(crop);assert.deepEqual(crop.args.slice(1,5),[512,512,512,512]);
    assert.equal(crop.composite,"source-atop");
    assert.equal(chromaticCanvasSourceV113(rig,safe,"biomask"),second);
  }finally{
    if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;
    if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;
  }
});

test("V131: rendered Yautja uses independent mask channel on rig, Homeworld and hunt",()=>{
  const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
  for(const file of ["app/game/HunterRigPreview.tsx","app/game/HomeworldModularHunter.tsx",
                     "app/game/HuntCanvas.tsx"]){
    const source=read(file);
    assert.match(source,/maskChromaticsForAppearanceV131/,file);
    assert.match(source,/hunterMaskRigPlacement/,file);
    assert.match(source,/biomask/,file);
  }
  assert.match(read("app/game/HunterRigPreview.tsx"),/data-rig-biomask-pigment-v131/);
  assert.match(read("app/game/HomeworldModularHunter.tsx"),/data-homeworld-biomask-pigment-v131/);
  assert.match(read("app/game/HuntCanvas.tsx"),/channel: "biomask"/);
  const ui=read("app/game/HunterChromaticForgeV113.tsx");
  assert.match(ui,/data-phg-biomask-workshop-v131/);
  assert.match(ui,/Ogre réservé au biomask Alpha/);
  assert.match(ui,/PHG_OGRE_BIOMASK_SOURCE_V131/);
});
