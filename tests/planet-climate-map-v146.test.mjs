import assert from "node:assert/strict";
import test,{after} from "node:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {build} from "esbuild";
const dir=await mkdtemp(join(tmpdir(),"planet-climate-raster-v146-"));
after(()=>rm(dir,{recursive:true,force:true}));
const out=await build({stdin:{contents:[
  'export {encodePlanetClimatePixelsV146,PLANET_ENV_BIOME_RGB_V146} from "./app/game/planetClimateMapV146";',
  'export {WAR_PLANET_BIOME_DESCRIPTIONS_V102} from "./app/game/systems/clanWarPlanetGeneratorV102";',
].join("\n"),resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const file=join(dir,"raster.mjs");await writeFile(file,out.outputFiles[0].text);const api=await import(pathToFileURL(file));

test("each of thirteen region biomes maps to a physical distinct RGBA palette",()=>{
 const biomes=Object.keys(api.WAR_PLANET_BIOME_DESCRIPTIONS_V102);
 assert.equal(biomes.length,13);
 const sample=new Uint8ClampedArray(biomes.length*4);
 for(let i=0;i<biomes.length;i++){sample[i*4]=i+1;sample[i*4+3]=255;}
 const encoded=api.encodePlanetClimatePixelsV146(sample,biomes);
 assert.equal(new Set([...Array(biomes.length)].map((_,i)=>
  Array.from(encoded.slice(i*4,i*4+3)).join(","))).size,13);
 assert([...Array(biomes.length)].every((_,i)=>encoded[i*4+3]===255));
});

test("actual sea, inland lakes and rivers remain transparent in ecology mask",()=>{
 const index=new Uint8ClampedArray([1,0,0,255,0,0,0,0,2,0,0,255,0,0,0,0]);
 const out=api.encodePlanetClimatePixelsV146(index,["jungle","snow"]);
 assert.deepEqual([...out.slice(4,8)],[0,0,0,0]);
 assert.deepEqual([...out.slice(12,16)],[0,0,0,0]);
 assert.equal(out[3],255);assert.equal(out[11],255);
 assert.notDeepEqual([...out.slice(0,3)],[...out.slice(8,11)]);
});

test("unknown regional indices and fictional biomes fail before creating false map colors",()=>{
 assert.throws(()=>api.encodePlanetClimatePixelsV146(new Uint8ClampedArray([3,0,0,255]),["jungle","snow"]),/hors du monde/);
 assert.throws(()=>api.encodePlanetClimatePixelsV146(new Uint8ClampedArray([1,0,0,255]),["invented-biome"]),/invalides/);
 assert.throws(()=>api.encodePlanetClimatePixelsV146(new Uint8ClampedArray([1,0,0]),["snow"]),/invalides/);
 assert.throws(()=>api.encodePlanetClimatePixelsV146(new Uint8ClampedArray([1,0,0,255]),[]),/invalides/);
});
