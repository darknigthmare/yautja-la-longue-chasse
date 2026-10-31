import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const folder=await mkdtemp(join(tmpdir(),"planet-surface-v135-"));
after(()=>rm(folder,{recursive:true,force:true}));
const bundle=await build({stdin:{contents:[
  'export { choosePlanetRegionalPipelineV135, planetRegionalSurfaceAtlasKeyV135 } from "./app/game/planetRegionalSurfaceAlbedoV135";',
  'export * from "./app/game/systems/clanWarRegionalMaterialKitV128";',
  'export { generateWarPlanetV115, normalizeWarPlanetRecipeV115 } from "./app/game/systems/clanWarPlanetGeneratorV115";'
].join("\n"),resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const filename=join(folder,"test.mjs");
await writeFile(filename,bundle.outputFiles[0].text);
const api=await import(pathToFileURL(filename));
const choice=(params)=>api.choosePlanetRegionalPipelineV135({
  selected:true,wantsPbr:true,hasSurface:true,samplers:8,maxTextureSize:4096,regionalRows:3,tileSize:128,...params,
});
test("mobile WebGL1 keeps local water on its 8 fragment samplers",()=>{
  assert.equal(choice({samplers:8}),"albedo-coastal-v135");
  assert.equal(choice({samplers:9}),"albedo-coastal-v135");
  assert.equal(choice({samplers:10}),"pbr-v131");
  assert.equal(choice({samplers:10,wantsPbr:false}),"albedo-coastal-v135");
  assert.equal(choice({samplers:7}),"albedo-v129");
  assert.equal(choice({samplers:10,hasSurface:false,wantsPbr:false}),"albedo-v129");
  assert.equal(choice({selected:false}),"native");
});
test("shader budget guards large atlases without invented fluid",()=>{
  assert.equal(choice({samplers:10,maxTextureSize:64,regionalRows:3,tileSize:32}),
    "albedo-v129");
  assert.equal(choice({samplers:10,maxTextureSize:128,regionalRows:3,tileSize:32}),
    "albedo-coastal-v135");
  assert.throws(()=>choice({tileSize:0}),/invalides/);
});
test("sea material and region identities invalidate the exact atlas",()=>{
  const planet=api.generateWarPlanetV115(api.normalizeWarPlanetRecipeV115({
    seed:135001,territoryCount:18,regionCount:3,landBiome:"jungle",
    surface:"water",biomeDiversity:"uniform",planetSize:"terran",
  }));
  const initial=api.createPlanetRegionalMaterialKitV128(planet), first=initial.entries[0];
  const earlier=api.planetRegionalSurfaceAtlasKeyV135(planet,initial,128,2,2);
  const alternative=api.compatibleSurfaceMaterialsV128(planet.surface.kind,first.biome)
    .find(id=>id!==first.surfaceMaterialId);
  assert(alternative);
  const next=api.editPlanetRegionalMaterialKitV128(planet,initial,first.regionId,"surface",alternative);
  assert.notEqual(api.planetRegionalSurfaceAtlasKeyV135(planet,next,128,2,2),earlier);
  assert.equal(api.planetRegionalSurfaceAtlasKeyV135(planet,initial,128,2,2),earlier);
  assert.throws(()=>api.planetRegionalSurfaceAtlasKeyV135(planet,{...initial,worldCode:"forged"},128,2,2),/incompatible/);
});
