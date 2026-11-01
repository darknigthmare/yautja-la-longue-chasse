import assert from "node:assert/strict";
import test, {after} from "node:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {build} from "esbuild";

const dir=await mkdtemp(join(tmpdir(),"atlas-visual-v142-"));
after(()=>rm(dir,{recursive:true,force:true}));
const bundled=await build({stdin:{contents:[
  'export { resolveWarAtlasVisualV142 } from "./app/game/systems/clanWarAtlasVisualV142";',
  'export { createPlanetVisualProfileV134, readPlanetVisualProfileV134, planetVisualStorageKeyV134 } from "./app/game/systems/clanWarPlanetVisualProfileV134";',
  'export { createPlanetRegionalMaterialKitV128 } from "./app/game/systems/clanWarRegionalMaterialKitV128";',
  'export { generateWarPlanetV115, normalizeWarPlanetRecipeV115 } from "./app/game/systems/clanWarPlanetGeneratorV115";',
].join("\n"),resolveDir:process.cwd(),loader:"ts"},
bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const f=join(dir,"atlas.mjs");await writeFile(f,bundled.outputFiles[0].text);
const api=await import(pathToFileURL(f));
const world=seed=>api.generateWarPlanetV115(api.normalizeWarPlanetRecipeV115({
  seed,regionCount:3,territoryCount:18,landBiome:"jungle",surface:"water",planetSize:"terran",
}));
const a=world(142001),b=world(142002);
const profile=api.createPlanetVisualProfileV134(a,api.createPlanetRegionalMaterialKitV128(a),"pbr",900);

test("battle atlas remains native until the player explicitly selects locally saved visuals",()=>{
  assert.deepEqual(api.resolveWarAtlasVisualV142(a,undefined,null),{profile:null,source:"native"});
  assert.deepEqual(api.resolveWarAtlasVisualV142(a,undefined,profile),{profile,source:"local"});
});
test("explicit generator preview overrides local materials and an explicit reset stays native",()=>{
  const other=api.createPlanetVisualProfileV134(a,api.createPlanetRegionalMaterialKitV128(a),"albedo",300);
  assert.deepEqual(api.resolveWarAtlasVisualV142(a,other,profile),{profile:other,source:"editor"});
  assert.deepEqual(api.resolveWarAtlasVisualV142(a,null,profile),{profile:null,source:"native"});
});
test("foreign or malformed visual profiles cannot modify a different world's atlas",()=>{
  assert.deepEqual(api.resolveWarAtlasVisualV142(b,undefined,profile),{profile:null,source:"native"});
  assert.deepEqual(api.resolveWarAtlasVisualV142(a,{...profile,quality:"forged"},null),{profile:null,source:"native"});
  assert.deepEqual(api.resolveWarAtlasVisualV142(a,undefined,{...profile,kit:{...profile.kit,worldCode:b.id}}),{profile:null,source:"native"});
});
test("a browser-read of an exact-world local sidecar does not alter the planet or war",()=>{
  const state=JSON.stringify(a),storage=new Map([[api.planetVisualStorageKeyV134(a),JSON.stringify(profile)]]);
  const result=api.readPlanetVisualProfileV134(a,{getItem:key=>storage.get(key)??null});
  assert.equal(result.status,"loaded");
  assert.deepEqual(api.resolveWarAtlasVisualV142(a,undefined,result.profile),{source:"local",profile});
  assert.equal(JSON.stringify(a),state);
  assert.equal(api.readPlanetVisualProfileV134(b,{getItem:key=>storage.get(key)??null}).status,"empty");
});
