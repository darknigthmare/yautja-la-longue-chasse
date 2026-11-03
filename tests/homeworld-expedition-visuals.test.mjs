import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {build} from "esbuild";
const bundle=await build({entryPoints:["app/game/systems/homeworldExpeditionVisuals.ts"],bundle:true,write:false,platform:"node",format:"esm"});
const {ASH_GRAZER_SHEET:sheet,ashGrazerVisual:visual}=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const {data,info}=await sharp("public"+sheet.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
test("V8 grazer six authored poses fit their actual alpha bounds without cutting neighbouring silhouettes",()=>{
 assert.equal(sheet.columns,6);
 assert.equal(info.width,sheet.columns*sheet.frameWidth);assert.equal(info.height,sheet.frameHeight);
 for(let frame=0;frame<sheet.columns;frame++){
  let pixels=0,x0=sheet.frameWidth,x1=-1,y1=-1;
  for(let y=0;y<info.height;y++)for(let x=0;x<sheet.frameWidth;x++){
   if(data[(y*info.width+frame*sheet.frameWidth+x)*4+3]>32){pixels++;x0=Math.min(x0,x);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  }
  assert(pixels>1000,"empty pose "+frame);
  assert(x0>=16&&x1<sheet.frameWidth-16,"pose clipped or contains an adjacent pose: "+frame);
  assert(y1<sheet.feetOffset&&y1>=sheet.feetOffset-3,"inconsistent feet anchor: "+frame);
 }
});
test("living grazer renders only locomotion or anticipation with the authored facing and grid",()=>{
 for(const phase of ["watch","telegraph","charge","recover"])for(const direction of [-1,1])for(let tick=0;tick<50;tick++){
  const v=visual({x:1880,phase,direction,ticks:0},tick);
  assert.equal(v.style.width,info.width/6);assert.equal(v.style.height,info.height);
  assert.equal(v.style.backgroundSize,`${info.width}px ${info.height}px`);
  assert.equal(v.sourceX,v.frame*info.width/6);
  assert.equal(v.style.backgroundPosition,`${-v.sourceX}px 0`);
  assert.equal(v.style.left+v.style.width/2,1880);
  assert.equal(v.style.top+sheet.feetOffset,920);
  assert(v.frame>=0&&v.frame<=3);
  assert.equal(v.flip*(v.frame===0?-1:1),direction);
  if(phase==="watch"||phase==="recover")assert.equal(v.frame,0);
  if(phase==="telegraph")assert.equal(v.frame,3);
 }
});
