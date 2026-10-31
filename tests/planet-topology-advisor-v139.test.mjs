import assert from "node:assert/strict";
import test,{after} from "node:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {build} from "esbuild";
const dir=await mkdtemp(join(tmpdir(),"planet-topology-v139-"));
after(()=>rm(dir,{recursive:true,force:true}));
const bundle=await build({stdin:{contents:[
'export * from "./app/game/systems/clanWarPlanetTopologyAdvisorV139";',
'export {normalizeWarPlanetRecipeV103,validateWarPlanetRecipeV103,generateWarPlanetV103} from "./app/game/systems/clanWarPlanetGeneratorV103";'
].join("\n"),resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const p=join(dir,"v139.mjs");await writeFile(p,bundle.outputFiles[0].text);
const api=await import(pathToFileURL(p));
const base={territoryCount:48,regionCount:8,landform:"archipelago"};
test("six physical sizes offer valid bounded density recommendations",()=>{
 const sizes=["dwarf","small","terran","large","giant","colossal"];
 const recommended=sizes.map(size=>api.recommendPlanetTopologyV139(size,base));
 assert.deepEqual(recommended.map(x=>x.territoryCount),[18,24,48,72,96,96]);
 assert.deepEqual(recommended.map(x=>x.regionCount),[3,4,8,12,12,12]);
 for(const x of recommended){
  assert(x.territoryCount>=x.regionCount*3);
  assert(api.validateWarPlanetRecipeV103(api.normalizeWarPlanetRecipeV103({
   seed:139000,landform:"archipelago",territoryCount:x.territoryCount,regionCount:x.regionCount
  })));
 }
});
test("locked controls are never overwritten",()=>{
 const a=api.recommendPlanetTopologyV139("dwarf",base,["territoryCount"]);
 assert.equal(a.territoryCount,48);assert.equal(a.regionCount,3);
 const b=api.recommendPlanetTopologyV139("dwarf",base,["regionCount"]);
 assert.equal(b.regionCount,8);assert(b.territoryCount>=24);
 const c=api.recommendPlanetTopologyV139("colossal",base,["territoryCount","regionCount"]);
 assert.equal(c.territoryCount,48);assert.equal(c.regionCount,8);assert.equal(c.locked,true);
});
test("predicted archipelago sizes match the real generator across physical counts",()=>{
 for(const landform of ["supercontinent","continents","archipelago","shattered"])
  for(const territoryCount of [18,36,96]){
   const regionCount=territoryCount===18?3:territoryCount===36?6:12;
   const [low,high]=api.planetLandmassCountRangeV139(landform,territoryCount);
   const planet=api.generateWarPlanetV103(api.normalizeWarPlanetRecipeV103({
    seed:139173,landform,territoryCount,regionCount
   }));
   assert(planet.landmasses.length>=low&&planet.landmasses.length<=high,
    landform+"/"+territoryCount+": "+planet.landmasses.length+" not "+low+"-"+high);
  }
});
test("invalid counts and dimensions are rejected",()=>{
 assert.throws(()=>api.planetLandmassCountRangeV139("archipelago",13),/hors catalogue/);
 assert.throws(()=>api.recommendPlanetTopologyV139("terran",{...base,regionCount:17}),/incompatible/);
});
