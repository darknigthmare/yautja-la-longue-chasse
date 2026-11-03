import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";

const root=fileURLToPath(new URL("../",import.meta.url));
const read=path=>readFileSync(root+path,"utf8");
const bundle=await build({stdin:{
  contents:"export {WAR_PLANETS_V96} from './app/game/systems/clanWarPlanetsV96'; export {warPlanetStorageKeyV96} from './app/game/systems/clanWarV85';",
  resolveDir:root,
},bundle:true,write:false,format:"esm",platform:"node",logLevel:"silent"});
const {WAR_PLANETS_V96,warPlanetStorageKeyV96}=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));

test("V146 all thirty registered real world theaters have unique source IDs and archive keys",()=>{
 assert.equal(WAR_PLANETS_V96.length,30);
 const ids=new Set(),keys=new Set(),biomes=new Set();
 for(const world of WAR_PLANETS_V96){
   assert.ok(!ids.has(world.id));ids.add(world.id);
   const key=warPlanetStorageKeyV96(world.id);
   assert.ok(!keys.has(key),key);keys.add(key);
   assert.equal(world.territories.length,36);
   assert.equal(world.regions.length,6);
   assert.ok(world.landmasses.length>0);
   assert.ok(Number.isFinite(world.landFraction)&&world.landFraction>0&&world.landFraction<1);
   biomes.add(world.landBiome);
   for(const t of world.territories){
     assert.ok(t.points.length>=3,`missing polygon ${world.id}/${t.id}`);
     for(const p of t.points)assert.ok(p.every(Number.isFinite));
   }
 }
 assert.equal(ids.size,30);assert.equal(keys.size,30);assert.ok(biomes.size>=8);
 assert.equal(warPlanetStorageKeyV96("korthas"),"yautja.clan-war.v85.free.v1");
 assert.equal(warPlanetStorageKeyV96("thalassa"),"yautja.clan-war.v96.planet.thalassa.free.v1");
});
test("V146 production panel uses real UI selector and retains only 24 extra live sessions",()=>{
 const panel=read("app/game/ClanWarPanelV85.tsx");
 const ui=read("app/game/ClanWarPlanetsV96.tsx");
 const engine=read("app/game/systems/clanWarSessionV85.ts");
 assert.match(panel,/function selectPlanet\(id: string\)/);
 assert.match(panel,/Object\.keys\(planetSessions\)\.filter\(key => key !== "korthas"\)\.length >= 24/);
 assert.match(panel,/setPlanetSessions\(current =>/);
 assert.match(ui,/data-testid="war-planet-selector-v96"/);
 assert.match(ui,/label htmlFor=\{\x60\$\{unique\}-selection\x60\}>Planète active/);
 assert.match(ui,/WAR_PLANETS_V96\.map\(item => <option/);
 assert.match(engine,/createWarSessionV85\(/);
 assert.match(engine,/observeExternalStorageChange/);
 assert.match(engine,/staleWar/);
 assert.equal((panel.match(/<ClanWarAtlasV95\b/g)||[]).length,1);
});
test("V146 Chrome is a genuine 30-world UI/IDB audit, not a 2-world fixture or fabricated archive",()=>{
 const source=read("scripts/qa-clan-war-30-planets-v146.mjs");
 assert.match(source,/\[\...ids\]\.reverse\(\)/);
 assert.match(source,/assert\.equal\(ids\.length,30\)/);
 assert.match(source,/await selection\.selectOption\(id\)/);
 assert.match(source,/await commitTurn\(page,key\)/);
 assert.match(source,/getFence|readFence/);
 assert.match(source,/indexedDB\.open\("yautja\.clan-war\.v94\.fences",1\)/);
 assert.match(source,/assert\.equal\(JSON\.parse\(fence\.after\)\.turn,2,id\)/);
 assert.match(source,/war-end-turn-commit-v143/);
 assert.match(source,/revisit|Revisit|re-open/);
 assert.doesNotMatch(source,/setItem\(key,JSON\.stringify\(/);
 assert.doesNotMatch(source,/oneToOneArtApproved:[1-9]/);
});
