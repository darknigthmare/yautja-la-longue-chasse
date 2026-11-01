import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DECAL_ANCHORS_V133,DECAL_ZONES_V133,decalProjectionV139}
 from "../app/game/yautjaDecalsV133.ts";
import {hunterHeadArtV62,HUNTER_HEAD_FAMILY_V62}
 from "../app/game/hunterHeadArtV62.ts";
import {Y_A_U_T_J_A_CONCEPT_MASKS_V133} from "../app/game/conceptBiomasksV133.ts";
import {conceptMaskRigPlacementV137}
 from "../app/game/conceptMaskFitV137.ts";

function value(s){return Number.parseFloat(s)/100}
function abs(n){return Math.abs(n)}
function project(frame,zone){
  const p=decalProjectionV139(zone,frame);
  const canvas={w:256,h:384};
  // Decal coordinates after applying its owner rectangle must match the
  // same fixed global 256×384 anchors used by decalCanvasSourceV133.
  const ownerPx={x:value(p.owner.left)*canvas.w,y:value(p.owner.top)*canvas.h,
    w:value(p.owner.width)*canvas.w,h:value(p.owner.height)*canvas.h};
  const tile={x:ownerPx.x+ownerPx.w*value(p.decal.left),
    y:ownerPx.y+ownerPx.h*value(p.decal.top),
    w:ownerPx.w*value(p.decal.width),h:ownerPx.h*value(p.decal.height)};
  const a=DECAL_ANCHORS_V133[zone];
  for(const [k,v] of [["x",a.x],["y",a.y],["w",a.width],["h",a.height]]){
    assert.ok(abs(tile[k]-v)<1e-7,k+": "+tile[k]+" should be "+v);
  }
  return {ownerPx,tile,p};
}
test("V139: V62 compact heads align face decals for all six morphological families",()=>{
  for(const morph of ["classic","elder","super","feral","huntress","young"]){
    const head=hunterHeadArtV62(morph);
    const p=project(head.placement,"face");
    assert.ok(p.ownerPx.w<120);
    assert.ok(p.ownerPx.h<130);
    assert.equal(p.p.owner.width,String(head.placement.width/256*100)+"%");
    assert.ok(p.tile.x>=p.ownerPx.x);
    assert.ok(p.tile.y>=p.ownerPx.y);
  }
  assert.equal(HUNTER_HEAD_FAMILY_V62.huntress,"classic");
  assert.equal(HUNTER_HEAD_FAMILY_V62.young,"classic");
});
test("V139: all seven V137 translated concept biomasks have real owner offset",()=>{
 assert.equal(Y_A_U_T_J_A_CONCEPT_MASKS_V133.length,7);
 for(const mask of Y_A_U_T_J_A_CONCEPT_MASKS_V133){
   const frame=conceptMaskRigPlacementV137(mask.id);
   assert.ok(frame);
   assert.equal(frame.width,256);
   assert.equal(frame.height,384);
   assert.ok(frame.x>0,"V137 uses a translated owner sprite "+mask.id);
   const translated=project(frame,"biomask");
   assert.ok(abs(translated.ownerPx.x-frame.x)<1e-7,"V137 owner x offset must be preserved");
   assert.ok(abs(translated.ownerPx.y-frame.y)<1e-7,"V137 owner y offset must be preserved");
   assert.notEqual(translated.p.owner.left,"0%");
   assert.notEqual(translated.p.decal.left,String(DECAL_ANCHORS_V133.biomask.x/256*100)+"%");
 }
});
test("V139: all four decals keep exact rig coordinates with full and compact owner frames",()=>{
 const compact={x:89,y:11,width:97,height:97};
 const shifted={x:28,y:2,width:256,height:384};
 for(const z of DECAL_ZONES_V133){
   project(undefined,z);
   project(compact,z);
   project(shifted,z);
 }
});
test("V139: CSS mask owner moves, masks at 100%, and matches Canvas normal compositing",()=>{
  const css=readFileSync("app/game/DecalSurfaceV133.tsx","utf8");
  const canvas=readFileSync("app/game/decalCanvasV133.ts","utf8");
  assert.match(css,/decalProjectionV139\(zone,placement\)/);
  assert.match(css,/data-decal-mask-owner-v139/);
  assert.match(css,/data-decal-projected-cell-v139/);
  assert.match(css,/WebkitMaskSize:"100% 100%"/);
  assert.doesNotMatch(css,/mixBlendMode:"screen"/);
  assert.match(canvas,/ctx.globalCompositeOperation="source-atop"/);
  assert.match(canvas,/ctx.globalAlpha=\.82/);
});
