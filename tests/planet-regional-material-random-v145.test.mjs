import assert from "node:assert/strict";
import test,{after} from "node:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {build} from "esbuild";
const dir=await mkdtemp(join(tmpdir(),"planet-region-random-v145-"));
after(()=>rm(dir,{recursive:true,force:true}));
const packed=await build({stdin:{contents:[
  'export * from "./app/game/systems/clanWarRegionalMaterialRandomV145";',
  'export * from "./app/game/systems/clanWarRegionalMaterialKitV128";',
  'export {generateWarPlanetV115, normalizeWarPlanetRecipeV115} from "./app/game/systems/clanWarPlanetGeneratorV115";',
].join("\n"),resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const file=join(dir,"v145.mjs");await writeFile(file,packed.outputFiles[0].text);
const api=await import(pathToFileURL(file));
const planet=api.generateWarPlanetV115(api.normalizeWarPlanetRecipeV115({
  seed:14501,regionCount:3,territoryCount:18,surface:"water",landBiome:"jungle",hydrology:"mixed",
}));
const kit=api.createPlanetRegionalMaterialKitV128(planet);
const roll=(scope,selected=planet.regions[0].id,entropy=145145,locks=[]) =>
  api.randomizeRegionalMaterialKitV145(planet,kit,scope,selected,entropy,locks);

test("global randomized regional materials use all actual regions and remain V128-compatible",()=>{
 const before=JSON.stringify(kit),world=JSON.stringify(planet);
 const result=roll("all");
 assert(api.validPlanetRegionalMaterialKitV128(planet,result.kit));
 const expected=api.selectableRegionalMaterialSlotsV145(planet,kit,"all",planet.regions[0].id);
 assert.deepEqual(result.changedSlots,expected);
 assert(result.changedSlots.length>=planet.regions.length);
 assert.equal(result.kit.worldCode,planet.id);
 assert(result.kit.entries.every((entry,i)=>entry.regionId===kit.entries[i].regionId &&
   entry.seed===kit.entries[i].seed && entry.biome===kit.entries[i].biome &&
   entry.regionName===kit.entries[i].regionName));
 assert.equal(JSON.stringify(kit),before);
 assert.equal(JSON.stringify(planet),world);
 assert.deepEqual(result,roll("all"));
 assert.notDeepEqual(result,roll("all",planet.regions[0].id,145146));
});

test("each scope changes only the intended material domain and region",()=>{
 for(const scope of ["region","land","surface","region-land","region-surface"]){
  const result=roll(scope);
  assert(api.validPlanetRegionalMaterialKitV128(planet,result.kit));
  assert(result.changedSlots.length>0,scope);
  for(const changed of result.changedSlots){
    if(scope.startsWith("region"))assert.equal(changed.regionId,planet.regions[0].id);
    if(scope==="land"||scope==="region-land")assert.equal(changed.domain,"land");
    if(scope==="surface"||scope==="region-surface")assert.equal(changed.domain,"surface");
  }
  for(const [index,entry] of result.kit.entries.entries()){
    const original=kit.entries[index];
    assert.equal(entry.seed,original.seed);
    if(!result.changedSlots.some(slot=>slot.regionId===entry.regionId&&slot.domain==="land"))
      assert.equal(entry.landMaterialId,original.landMaterialId);
    if(!result.changedSlots.some(slot=>slot.regionId===entry.regionId&&slot.domain==="surface"))
      assert.equal(entry.surfaceMaterialId,original.surfaceMaterialId);
  }
 }
});

test("per-region land and sea locks survive every scope, including global",()=>{
 const first=planet.regions[0].id;
 const lock=[{regionId:first,domain:"land"},{regionId:planet.regions[1].id,domain:"surface"}];
 for(const scope of ["all","region","land","surface","region-land","region-surface"]){
  const next=roll(scope,first,145145,lock);
  assert(api.validPlanetRegionalMaterialKitV128(planet,next.kit));
  assert.equal(next.kit.entries[0].landMaterialId,kit.entries[0].landMaterialId);
  assert.equal(next.kit.entries[1].surfaceMaterialId,kit.entries[1].surfaceMaterialId);
  assert(next.changedSlots.every(slot=>!lock.some(kept=>kept.regionId===slot.regionId&&kept.domain===slot.domain)));
 }
 const fullyLocked=kit.entries.flatMap(entry=>[
  {regionId:entry.regionId,domain:"land"},{regionId:entry.regionId,domain:"surface"},
 ]);
 const frozen=roll("all",first,145145,fullyLocked);
 assert.equal(frozen.kit,kit);
 assert.deepEqual(frozen.changedSlots,[]);
});

test("non-liquid sand/spores/crystal worlds never invent fluid data",()=>{
 for(const kind of ["sand","spores","crystal","mist","radioactive"]){
  const world={...planet,surface:{...planet.surface,kind}};
  const base=api.createPlanetRegionalMaterialKitV128(world);
  const available=api.selectableRegionalMaterialSlotsV145(world,base,"surface",world.regions[0].id);
  assert.equal(available.length,0,kind);
  const next=api.randomizeRegionalMaterialKitV145(world,base,"all",world.regions[0].id,145145);
  assert(api.validPlanetRegionalMaterialKitV128(world,next.kit));
  assert(next.kit.entries.every(entry=>entry.surfaceMaterialId===null),kind);
  assert(next.changedSlots.every(item=>item.domain==="land"),kind);
 }
});

test("biome-specific material pools are respected for all 48 V125/V130 sources",()=>{
 for(const entropy of [1,2,3,123,145145,0xffffffff]){
  const next=roll("all",planet.regions[0].id,entropy);
  for(const entry of next.kit.entries){
   assert(api.compatibleLandMaterialsV128(entry.biome).includes(entry.landMaterialId));
   assert(entry.surfaceMaterialId===null ||
     api.compatibleSurfaceMaterialsV128(planet.surface.kind,entry.biome).includes(entry.surfaceMaterialId));
  }
 }
});

test("foreign sidecars, unknown regions/scopes/locks and forged entropy are rejected",()=>{
 assert.throws(()=>api.randomizeRegionalMaterialKitV145(planet,{...kit,worldCode:"fake"},"all",planet.regions[0].id,10),/incompatible/);
 assert.throws(()=>roll("region","unknown"),/inconnue/);
 assert.throws(()=>roll("not-a-scope"),/invalides/);
 assert.throws(()=>roll("all",planet.regions[0].id,-1),/invalide/);
 assert.throws(()=>roll("all",planet.regions[0].id,1,[{regionId:"stranger",domain:"land"}]),/invalides/);
});
