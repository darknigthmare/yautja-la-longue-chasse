import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundled=await build({stdin:{contents:await (await import("node:fs/promises"))
  .readFile("app/game/systems/clanWarPlanetReliefV150.ts","utf8"),loader:"ts"},
  bundle:true,platform:"node",format:"esm",write:false,target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(bundled.outputFiles[0].text).toString("base64"));
function mask(width=128,height=64){
 const raw=new Uint8ClampedArray(width*height*4);
 for(let y=4;y<height-4;y++)for(let x=12;x<width-12;x++){
  const o=(y*width+x)*4;
  raw[o]=x<width/2?1:2;raw[o+3]=255;
 }
 // A real inland channel is not allowed to become elevated land.
 for(let x=32;x<96;x++){const o=(height/2*width+x)*4;raw[o]=0;raw[o+3]=0;}
 return raw;
}
const encode=(raw=mask(),seed=5)=>api.encodePlanetReliefV150(raw,128,64,6371,
 ["mountain","desert"],{maxElevationMeters:8000,ruggedness:.6,seed});
const at=(a,x,y)=>a[(y*128+x)*4],pixel=(a,x,y)=>a.slice((y*128+x)*4,(y*128+x+1)*4);

test("land elevation is a genuine 16-bit RG texture: non-land, lake, river and sea are transparent zero",()=>{
 const result=encode();
 assert.equal(result.width,128);assert.equal(result.height,64);
 assert(result.landPixels>0);assert(result.waterPixels>0);
 for(const [x,y] of [[0,0],[0,20],[127,40],[50,32],[20,2]]){
  assert.deepEqual([...pixel(result.rg16,x,y)],[0,0,0,0]);
  assert.deepEqual([...pixel(result.preview,x,y)],[0,0,0,0]);
 }
 assert.equal(pixel(result.rg16,64,20)[3],255);
 assert(result.highestElevationMeters>0);
 assert(result.highestElevationMeters<=8000);
 assert.equal(result.regions.length,2);
 assert(result.regions.every(r=>r.landPixels>0&&r.averageElevationMeters>=0&&
  r.maximumElevationMeters>=r.averageElevationMeters));
});
test("relief is higher inland than the shoreline of the same actual continent",()=>{
 const result=encode();
 const value=(x,y)=>api.decodePlanetHeightPixelV150(at(result.rg16,x,y),
   result.rg16[(y*128+x)*4+1],8000);
 assert(value(22,19)>value(12,19));
 assert(value(106,19)>value(115,19));
 assert(value(30,19)>0);
});
test("longitude seam wraps; latitude edges never invent a second polar continent",()=>{
 const raw=new Uint8ClampedArray(128*64*4);
 for(let y=16;y<48;y++)for(let x=0;x<28;x++){
  const o=(y*128+x)*4;raw[o]=1;raw[o+3]=255;
 }
 // True sea at x=127 touches the land at x=0 across the antimeridian.
 const result=api.encodePlanetReliefV150(raw,128,64,6371,["temperate"],{
  maxElevationMeters:8000,ruggedness:.4,seed:1});
 const near=api.decodePlanetHeightPixelV150(result.rg16[(32*128)*4],
   result.rg16[(32*128)*4+1],8000);
 const deeper=api.decodePlanetHeightPixelV150(result.rg16[(32*128+15)*4],
   result.rg16[(32*128+15)*4+1],8000);
 assert(deeper>near);
 assert.equal(result.rg16[(0*128+15)*4+3],0);
 assert.equal(result.rg16[(63*128+15)*4+3],0);
});
test("spherical ridges are deterministic, biome-aware and require no generated war save changes",()=>{
 const first=encode(mask(),145150),again=encode(mask(),145150),other=encode(mask(),145151);
 assert.deepEqual(first.rg16,again.rg16);
 assert.notDeepEqual(first.rg16,other.rg16);
 assert(first.regions[0].maximumElevationMeters>first.regions[1].maximumElevationMeters);
 assert.equal(first.landPixels+first.waterPixels,128*64);
});
test("radius affects shoreline distance in km, not identity or count of land pixels",()=>{
 const source=mask();
 const a=api.encodePlanetReliefV150(source,128,64,1900,["mountain","desert"],{
  maxElevationMeters:8000,ruggedness:.6,seed:5});
 const b=api.encodePlanetReliefV150(source,128,64,21000,["mountain","desert"],{
  maxElevationMeters:8000,ruggedness:.6,seed:5});
 assert.equal(a.landPixels,b.landPixels);
 assert.equal(a.waterPixels,b.waterPixels);
 assert.notDeepEqual(a.rg16,b.rg16);
 assert.deepEqual([...source], [...mask()]);
});
test("invalid region IDs, options, physical dimensions and byte decoder reject corrupted input",()=>{
 assert.throws(()=>api.encodePlanetReliefV150(mask(),128,64,6371,["invalid-biome"]),/invalides/);
 const invalid=mask();invalid[(20*128+20)*4]=3;
 assert.throws(()=>api.encodePlanetReliefV150(invalid,128,64,6371,["mountain","desert"]),/incompatible/);
 assert.throws(()=>api.encodePlanetReliefV150(mask(),128,64,0,["mountain","desert"]),/invalides/);
 assert.throws(()=>api.encodePlanetReliefV150(mask(),128,64,6371,["mountain","desert"],{
  maxElevationMeters:25000,ruggedness:.6,seed:5}),/invalides/);
 assert.throws(()=>api.decodePlanetHeightPixelV150(-1,5,8000),/invalide/);
 assert.equal(api.decodePlanetHeightPixelV150(255,255,8000),8000);
});
