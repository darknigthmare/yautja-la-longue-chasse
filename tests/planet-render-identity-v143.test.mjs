import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";

const source = await readFile("app/game/systems/planetRenderSignatureV143.ts","utf8");
const output = await build({stdin:{contents:source,loader:"ts"},bundle:true,write:false,
  format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const mod=await import("data:text/javascript;base64,"+Buffer.from(output.outputFiles[0].text).toString("base64"));
const sig=mod.planetCanvasRenderSignatureV143;
const base={worldCode:"proc-v115-world",projection:"globe",
  geometry:[960,620,-25,15,244,480,306,70,480,960],
  qualityPbr:true,coastKm:900,layer:"composite",switches:[true,true,false,true,true],
  regions:[
    {regionId:"r1",landMaterialId:"land-gravel",surfaceMaterialId:"liquid-estuary",seed:11},
    {regionId:"r2",landMaterialId:"land-spore-bed",surfaceMaterialId:null,seed:22},
  ],revision:0};

test("identical content and world geometry give the same render signature",()=>{
  assert.equal(sig(base),sig({...base,geometry:[...base.geometry],regions:base.regions.map(x=>({...x}))}));
});
test("all three view dimensions and PBR material changes invalidate a drawn canvas",()=>{
  const original=sig(base);
  for(const changed of [
    {...base,worldCode:"another-world"},
    {...base,projection:"map"},
    {...base,geometry:[...base.geometry.slice(0,2),40,...base.geometry.slice(3)]},
    {...base,qualityPbr:false},
    {...base,coastKm:300},
    {...base,layer:"albedo"},
    {...base,switches:[false,...base.switches.slice(1)]},
    {...base,regions:base.regions.map((x,i)=>i?x:{...x,landMaterialId:"land-karst"})},
    {...base,regions:base.regions.map((x,i)=>i?x:{...x,surfaceMaterialId:null})},
    {...base,revision:1},
    {...base,regions:null},
  ]) assert.notEqual(sig(changed),original);
});
test("invalid camera numbers, world identity and revision cannot claim a rendered frame",()=>{
  assert.throws(()=>sig({...base,geometry:[NaN]}),/invalide/);
  assert.throws(()=>sig({...base,worldCode:""}),/invalide/);
  assert.throws(()=>sig({...base,revision:-1}),/invalide/);
});
