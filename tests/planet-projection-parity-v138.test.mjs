import assert from "node:assert/strict";
import test, {after} from "node:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {build} from "esbuild";

const dir=await mkdtemp(join(tmpdir(),"planet-projection-v138-"));
after(()=>rm(dir,{recursive:true,force:true}));
const bundle=await build({stdin:{contents:[
  'export { projectPlanetGeographyV138 } from "./app/game/systems/planetProjectionParityV138";',
  'export { planetPointFromPixelV101, wrapPlanetLongitudeV101 } from "./app/game/systems/planetMaterialV101";',
].join("\n"),resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const filename=join(dir,"geometry.mjs");await writeFile(filename,bundle.outputFiles[0].text);
const api=await import(pathToFileURL(filename));
const globe = (longitude,latitude) => ({
  projection:"globe",width:384,height:384,centerX:192,centerY:192,
  radius:170,longitude,latitude,mapTop:0,mapHeight:384
});
const map = {projection:"map",width:768,height:384,centerX:384,centerY:192,
  radius:164,longitude:-25,latitude:15,mapTop:0,mapHeight:384};
const distance=(a,b)=>Math.abs(api.wrapPlanetLongitudeV101(a-b));

test("the equirectangular forward and inverse projections preserve geodetic positions",()=>{
  for(const lon of [-178,-90,-25,0,45,175,200])for(const lat of [-80,-40,0,15,55,80]) {
    const pixel=api.projectPlanetGeographyV138([lon,lat],map);
    const back=api.planetPointFromPixelV101(pixel.x,pixel.y,map);
    assert(back);
    assert(distance(back[0],lon)<1e-7);
    assert(Math.abs(back[1]-lat)<1e-7);
  }
});
test("the globe forward mapper matches the playable inverse shader coordinates",()=>{
  for(const cameraLon of [-179,-25,0,120])for(const cameraLat of [-45,0,15,40]){
    const view=globe(cameraLon,cameraLat);
    for(const dLon of [-20,-5,0,5,20])for(const dLat of [-12,0,12]){
      const lon=api.wrapPlanetLongitudeV101(cameraLon+dLon),lat=cameraLat+dLat;
      const pixel=api.projectPlanetGeographyV138([lon,lat],view);
      assert(pixel,"the sampled point must face the viewer");
      const recovered=api.planetPointFromPixelV101(pixel.x,pixel.y,view);
      assert(recovered);
      assert(distance(recovered[0],lon)<1e-7);
      assert(Math.abs(recovered[1]-lat)<1e-7);
    }
  }
});
test("exact globe camera centre equals the same position sampled on the map",()=>{
  const loc=[-25,15];
  assert.deepEqual(api.projectPlanetGeographyV138(loc,globe(-25,15)),{x:192,y:192});
  const pixel=api.projectPlanetGeographyV138(loc,map);
  assert(Math.abs(pixel.x-330.66666667)<.00001);
  assert.equal(pixel.y,160);
});
test("back-facing or forged points are rejected instead of mirrored onto the front",()=>{
  assert.equal(api.projectPlanetGeographyV138([170,15],globe(-25,15)),null);
  assert.throws(()=>api.projectPlanetGeographyV138([1,92],map),/invalides/);
  assert.throws(()=>api.projectPlanetGeographyV138([Number.NaN,5],map),/invalides/);
});
