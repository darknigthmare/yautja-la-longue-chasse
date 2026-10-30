import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {
 PHG_VISUAL_STUDIES_V125, getChromaticMaterialV113, chromaticAtlasBackgroundV125,
 chromaticOverlayStyleV113, normalizeHunterChromaticsV113,
} from "../app/game/hunterChromaticsV113.ts";
import {chromaticCanvasSourceV113} from "../app/game/hunterChromaticCanvasV113.ts";
import {PHG_RECENT_RELEASES_V125,PHG_FERAL_CORRECTION_V125} from "../app/game/phgRecentReleasesV125.ts";
const atlasFile=new URL("../public/game/assets/v125/phg-studies/atlas.webp",import.meta.url);

test("V125 commits exactly one local raster atlas with 12 distinct skin swatches",()=>{
 const b=readFileSync(atlasFile);
 assert.equal(b.toString("ascii",0,4),"RIFF");
 assert.equal(b.toString("ascii",8,12),"WEBP");
 assert.ok(statSync(atlasFile).size>20000);
 assert.equal(PHG_VISUAL_STUDIES_V125.length,12);
 const ids=new Set(),coords=new Set();
 for(const m of PHG_VISUAL_STUDIES_V125){
   assert.equal(m.channel,"skin");
   assert.equal(m.evidence,"provisional");
   assert.equal(m.status,"integrated");
   assert.equal(m.src,"/game/assets/v125/phg-studies/atlas.webp");
   assert.ok(m.atlas);
   const {columns,rows,column,row}=m.atlas;
   assert.deepEqual([columns,rows],[3,4]);
   assert.ok(column>=0&&column<3&&row>=0&&row<4);
   ids.add(m.id);
   coords.add(column+":"+row);
   assert.equal(getChromaticMaterialV113("dreads",m.id),null);
 }
 assert.equal(ids.size,12);
 assert.equal(coords.size,12);
});
test("V125 CSS applies only the requested cell under the skin silhouette",()=>{
 const one=PHG_VISUAL_STUDIES_V125[0],last=PHG_VISUAL_STUDIES_V125[11];
 assert.deepEqual(chromaticAtlasBackgroundV125(one.atlas,false),{
    backgroundPosition:"0% 0%",backgroundSize:"300% 400%"
 });
 assert.deepEqual(chromaticAtlasBackgroundV125(last.atlas,true),{
    backgroundPosition:"center, 100% 100%",backgroundSize:"100% 100%, 300% 400%"
 });
 const style=chromaticOverlayStyleV113({skinMaterialId:last.id,skinHex:"#aabbcc"},"skin","/rig/head.png");
 assert.equal(style.backgroundPosition,"center, 100% 100%");
 assert.equal(style.backgroundSize,"100% 100%, 300% 400%");
 assert.equal(style.maskImage,'url("/rig/head.png")');
 assert.match(style.backgroundImage,/linear-gradient\(#aabbcc66/);
 assert.equal(normalizeHunterChromaticsV113({skinMaterialId:"phg-study-v125-untrusted"}).skinMaterialId,null);
});
test("V125 hunting Canvas crops a shared image to the chosen tile and separates cache keys",()=>{
 const oldImage=globalThis.Image,oldDoc=globalThis.document;
 class MockImage{naturalWidth=1152;naturalHeight=1536;set src(s){this._src=s;this.onload?.();}get src(){return this._src;}}
 const rig={tag:"rig"},created=[];
 globalThis.Image=MockImage;
 globalThis.document={createElement(tag){
  assert.equal(tag,"canvas");
  const draws=[];
  const ctx={filter:"none",globalAlpha:1,globalCompositeOperation:"source-over",
    drawImage(...a){draws.push(a);},fillRect(){}};
  const canvas={width:0,height:0,draws,getContext(){return ctx;}};
  created.push(canvas);return canvas;
 }};
 try{
  function render(m){
    const selection={skinMaterialId:m.id};
    return chromaticCanvasSourceV113(rig,selection,"skin")??chromaticCanvasSourceV113(rig,selection,"skin");
  }
  const a=render(PHG_VISUAL_STUDIES_V125[0]);
  const b=render(PHG_VISUAL_STUDIES_V125[11]);
  assert.ok(a&&b);assert.notEqual(a,b);
  const cropA=a.draws.filter(x=>x.length===9)[0],cropB=b.draws.filter(x=>x.length===9)[0];
  assert.ok(cropA&&cropB);
  assert.deepEqual(cropA.slice(1,5),[0,0,384,384]);
  assert.deepEqual(cropB.slice(1,5),[768,1152,384,384]);
  assert.strictEqual(render(PHG_VISUAL_STUDIES_V125[11]),b);
 }finally{
  if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;
  if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;
 }
});
test("2025–2026 patch evidence is about confirmed releases, never certified UV bytes",()=>{
 assert.equal(PHG_RECENT_RELEASES_V125.length,6);
 for(const item of PHG_RECENT_RELEASES_V125){
   assert.match(item.sourceUrl,/^https:\/\/forum\.predator\.illfonic\.com\//);
   assert.equal(item.originalUVAvailable,false);
   assert.equal(item.fidelity,"names-and-release-verified-only");
   assert.ok(item.reconstructedDriveMaterialIds.length>=2);
 }
 assert.equal(PHG_FERAL_CORRECTION_V125.update,"Default Skin Pattern adjusted");
 assert.equal(PHG_FERAL_CORRECTION_V125.uvPixelReferenceVerified,false);
 assert.equal(PHG_FERAL_CORRECTION_V125.oldDriveMaterialId,"skin_classe_feral_reference_2024_avant_3_6_0");
 assert.ok(getChromaticMaterialV113("skin",PHG_FERAL_CORRECTION_V125.candidateStudyId));
});
