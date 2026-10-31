import assert from "node:assert/strict";
import test,{after} from "node:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {build} from "esbuild";
const dir=await mkdtemp(join(tmpdir(),"planet-studies-v151-"));
after(()=>rm(dir,{recursive:true,force:true}));
const bundle=await build({stdin:{contents:[
 'export {planetStudyManifestV151,planetStudyReportsV151,planetHasPhysicalReliefV151} from "./app/game/planetAssetStudiesV151";',
 'export {generateWarPlanetV115,normalizeWarPlanetRecipeV115} from "./app/game/systems/clanWarPlanetGeneratorV115";',
 'export {generateWarPlanetV103,normalizeWarPlanetRecipeV103} from "./app/game/systems/clanWarPlanetGeneratorV103";',
].join("\n"),resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const name=join(dir,"studies.mjs");await writeFile(name,bundle.outputFiles[0].text);
const api=await import(pathToFileURL(name));

test("V151 packs real V115 height-map descriptors and complete world reports without saving war data",()=>{
 const planet=api.generateWarPlanetV115(api.normalizeWarPlanetRecipeV115({
  seed:15101,territoryCount:24,regionCount:4,planetSize:"terran",
 }));
 const original=JSON.stringify(planet);
 const manifest=api.planetStudyManifestV151(planet),reports=api.planetStudyReportsV151(planet);
 assert.equal(manifest.version,151);
 assert.equal(manifest.worldCode,planet.id);
 assert.equal(manifest.environmentFile,"environment-study-v146.json");
 assert.equal(manifest.preflightFile,"world-preflight-v149.json");
 assert.equal(manifest.relief.heightFile,"relief-height-rg16-map.png");
 assert.equal(manifest.relief.previewFile,"relief-preview-map.png");
 assert.equal(manifest.relief.width,512);
 assert.equal(manifest.relief.maxElevationMeters,8000);
 assert.equal(manifest.relief.seed,planet.seed);
 assert.equal(reports.environment.worldCode,planet.id);
 assert.equal(reports.preflight.worldCode,planet.id);
 assert.equal(reports.preflight.errors,0);
 assert.equal(JSON.stringify(planet),original);
});

test("V103 worlds export truthful audit and environment but no fabricated measured heights",()=>{
 const planet=api.generateWarPlanetV103(api.normalizeWarPlanetRecipeV103({
  seed:15102,territoryCount:18,regionCount:3,
 }));
 assert.equal(api.planetHasPhysicalReliefV151(planet),false);
 assert.equal(api.planetStudyManifestV151(planet).relief,null);
 assert.equal(api.planetStudyReportsV151(planet).environment.physical,null);
 assert.equal(api.planetStudyReportsV151(planet).preflight.errors,0);
});

test("six world size variants never lose their original canonical identities in a ZIP study receipt",()=>{
 for(const planetSize of ["dwarf","small","terran","large","giant","colossal"]){
  const planet=api.generateWarPlanetV115(api.normalizeWarPlanetRecipeV115({
   seed:15103,territoryCount:24,regionCount:4,planetSize,
  }));
  const receipt=api.planetStudyManifestV151(planet);
  assert.equal(api.planetHasPhysicalReliefV151(planet),true);
  assert.equal(receipt.relief.seed,planet.seed);
  assert(receipt.relief.heightFile.endsWith("-map.png"));
  assert.match(planet.id,/^proc-v115-/);
 }
});
