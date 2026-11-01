import assert from "node:assert/strict";
import test,{after} from "node:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {build} from "esbuild";
const dir=await mkdtemp(join(tmpdir(),"planet-preflight-v149-"));
after(()=>rm(dir,{recursive:true,force:true}));
const output=await build({stdin:{contents:[
 'export {auditPlanetPreflightV149} from "./app/game/systems/clanWarPlanetPreflightV149";',
 'export {generateWarPlanetV115,normalizeWarPlanetRecipeV115} from "./app/game/systems/clanWarPlanetGeneratorV115";',
 'export {createPlanetRegionalMaterialKitV128} from "./app/game/systems/clanWarRegionalMaterialKitV128";',
].join("\n"),resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const path=join(dir,"audit.mjs");await writeFile(path,output.outputFiles[0].text);
const api=await import(pathToFileURL(path));
const make=(patch={})=>api.generateWarPlanetV115(api.normalizeWarPlanetRecipeV115({
 seed:149120,territoryCount:24,regionCount:4,planetSize:"terran",surface:"water",...patch,
}));
const planet=make();

test("real canonical V115 worlds have no blocking structural defects across size and landform",()=>{
 for(const planetSize of ["dwarf","small","terran","large","giant","colossal"]){
  const world=make({planetSize});
  const before=JSON.stringify(world);
  const report=api.auditPlanetPreflightV149(world,api.createPlanetRegionalMaterialKitV128(world));
  assert.equal(report.version,149);assert.equal(report.worldCode,world.id);
  assert.equal(report.errors,0,planetSize+": "+JSON.stringify(report.issues.filter(x=>x.severity==="error")));
  assert.equal(report.checked.territories,world.territories.length);
  assert.equal(report.checked.regions,world.regions.length);
  assert.equal(report.checked.routes,world.procedural.routes.length);
  assert.equal(JSON.stringify(world),before);
 }
});

test("broken symmetric graph, unknown region and lost landmass are real blocking issues",()=>{
 const first=planet.definitions[0];
 const graph={...planet,definitions:planet.definitions.map((d,i)=>i===0?
   {...d,neighbors:[...d.neighbors,"UNKNOWN"]}:d)};
 const g=api.auditPlanetPreflightV149(graph);
 assert(g.errors>0);
 assert(g.issues.some(i=>i.code==="unknown-neighbor"));
 const missing={...planet,territories:planet.territories.map((t,i)=>i===0?
   {...t,regionId:"unknown-region",landmassId:"missing-land"}:t)};
 const t=api.auditPlanetPreflightV149(missing);
 assert(t.issues.some(i=>i.code==="orphan-territory"));
 assert(t.issues.some(i=>i.code==="orphan-landmass"));
 assert(t.issues.some(i=>i.code==="region-territory-mismatch"));
 assert.equal(first.id,planet.definitions[0].id);
});

test("invalid inland geography and incompatible region material sidecars are detected",()=>{
 const kit=api.createPlanetRegionalMaterialKitV128(planet);
 const rejected=api.auditPlanetPreflightV149(planet,{...kit,worldCode:"foreign"});
 assert(rejected.issues.some(i=>i.code==="foreign-or-invalid-material-kit"));
 const hydrology={
  ...planet,
  procedural:{...planet.procedural,
    hydrology:{...planet.procedural.hydrology,
      features:planet.procedural.hydrology.features.map((f,i)=>i===0?
        {...f,landmassId:"NOT-A-LANDMASS"}:f)}},
 };
 const result=api.auditPlanetPreflightV149(hydrology);
 assert(result.issues.some(i=>i.code==="orphan-inland-feature"));
});

test("extreme fictional climates are warnings not forced biome edits",()=>{
 const mutated={...planet,regions:planet.regions.map((r,i)=>i===0?{...r,latitude:0}:r),
  procedural:{...planet.procedural,regions:planet.procedural.regions.map((r,i)=>
    i===0?{...r,biome:"snow"}:r)}};
 const before=JSON.stringify(mutated);
 const report=api.auditPlanetPreflightV149(mutated);
 assert(report.issues.some(i=>i.code==="climate-equatorial-cold"&&i.severity==="warning"));
 assert.equal(report.errors,0);
 assert.equal(JSON.stringify(mutated),before);
});

test("report is serializable, stable and never reveals enemy stock or campaign progress",()=>{
 const a=api.auditPlanetPreflightV149(planet),b=api.auditPlanetPreflightV149(planet);
 assert.deepEqual(a,b);
 assert.equal(a.checked.landmasses,planet.landmasses.length);
 assert(!JSON.stringify(a).includes("combatants"));
 assert(!JSON.stringify(a).includes("orders"));
 assert(a.limitations.some(t=>t.includes("1:1")));
});
