import assert from "node:assert/strict";
import test,{after} from "node:test";
import {readFile,mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {build} from "esbuild";
const dir=await mkdtemp(join(tmpdir(),"planet-earth-v147-"));
after(()=>rm(dir,{recursive:true,force:true}));
const b=await build({stdin:{contents:[
  'export {validEarthLandGeoJsonV147,earthLandContainsV147,earthReferenceStatsV147,EARTH_REFERENCE_SOURCE_V147} from "./app/game/planetEarthReferenceV147";',
].join("\n"),resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const f=join(dir,"earth.mjs");await writeFile(f,b.outputFiles[0].text);
const api=await import(pathToFileURL(f));
const earth=JSON.parse(await readFile("public/game/planets/earth/ne_110m_land.geojson","utf8"));

test("public-domain Natural Earth source is real geometry with stable overview identifiers",()=>{
 assert.equal(api.validEarthLandGeoJsonV147(earth),true);
 assert.deepEqual(api.earthReferenceStatsV147(earth),{
  featureCount:127,ringCount:128,vertexCount:5143,
 });
 assert.equal(api.EARTH_REFERENCE_SOURCE_V147.scale,"1:110,000,000");
 assert.match(api.EARTH_REFERENCE_SOURCE_V147.source,/natural-earth-vector/);
});

test("Earth coastline locations stay attached to actual Earth coordinates, not alien planets",()=>{
 for(const [label,lon,lat] of [
  ["Paris",2.35,48.85],["Los Angeles",-118.24,34.05],
  ["Tokyo",139.69,35.68],["Sydney",151.21,-33.87],
  ["Antarctica",0,-80],["Greenland",-42,74],
 ]){
  assert(api.earthLandContainsV147(earth,lon,lat),label+" must be land");
 }
 for(const [label,lon,lat] of [
  ["Central Pacific",-150,0],["South Atlantic",-20,-20],["North Atlantic",-40,30],
 ])assert.equal(api.earthLandContainsV147(earth,lon,lat),false,label+" must be ocean");
});

test("invalid coordinates and fabricated geography never enter the Earth reference",()=>{
 assert.throws(()=>api.earthLandContainsV147(earth,0,95),/invalides/);
 assert.throws(()=>api.earthLandContainsV147(earth,Number.NaN,0),/invalides/);
 assert.equal(api.validEarthLandGeoJsonV147({type:"FeatureCollection",features:[]}),false);
 assert.equal(api.validEarthLandGeoJsonV147({...earth,features:earth.features.slice(0,1)}),false);
 assert.equal(api.validEarthLandGeoJsonV147({...earth,features:earth.features.map((f,i)=>
  i===0?{...f,geometry:{...f.geometry,coordinates:[[[NaN,0],[1,0],[1,1],[NaN,0]]]}}:f)}),false);
});
