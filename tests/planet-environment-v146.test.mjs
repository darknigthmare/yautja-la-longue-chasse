import assert from "node:assert/strict";
import test,{after} from "node:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {build} from "esbuild";

const dir=await mkdtemp(join(tmpdir(),"planet-environment-v146-"));
after(()=>rm(dir,{recursive:true,force:true}));
const out=await build({stdin:{contents:[
  'export * from "./app/game/systems/clanWarPlanetEnvironmentV146";',
  'export {generateWarPlanetV115,normalizeWarPlanetRecipeV115} from "./app/game/systems/clanWarPlanetGeneratorV115";',
  'export {generateWarPlanetV103,normalizeWarPlanetRecipeV103} from "./app/game/systems/clanWarPlanetGeneratorV103";',
].join("\n"),resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const file=join(dir,"env.mjs");await writeFile(file,out.outputFiles[0].text);const a=await import(pathToFileURL(file));
const world=(size="terran",kind="water")=>a.generateWarPlanetV115(a.normalizeWarPlanetRecipeV115({
  seed:14601,regionCount:4,territoryCount:24,planetSize:size,surface:kind,landBiome:"temperate",
}));

test("real regional latitudes yield correct day/night on both solstices and equinox",()=>{
 assert.equal(a.planetDaylightFractionV146(0,23.5),.5);
 assert.equal(a.planetDaylightFractionV146(0,-23.5),.5);
 assert.equal(a.planetDaylightFractionV146(89,23.5),1);
 assert.equal(a.planetDaylightFractionV146(-89,23.5),0);
 assert.equal(a.planetDaylightFractionV146(89,-23.5),0);
 assert.equal(a.planetDaylightFractionV146(-89,-23.5),1);
 assert.equal(a.planetDaylightFractionV146(0,0),.5);
 assert.equal(a.planetDaylightFractionV146(90,0),.5);
 assert.equal(a.planetSolarDeclinationV146(23.5,"northern-solstice"),23.5);
 assert.equal(a.planetSolarDeclinationV146(23.5,"southern-solstice"),-23.5);
 assert(Math.abs(a.planetSolarDeclinationV146(23.5,"first-equinox"))<1e-5);
});

test("six physically scaled planets retain exactly their canonical biome, code and region geometry",()=>{
 const planets=["dwarf","small","terran","large","giant","colossal"].map(size=>world(size));
 for(const w of planets){
  const before=JSON.stringify(w);
  const data=a.analyzePlanetEnvironmentV146(w,{axialTiltDeg:41,season:"northern-solstice"});
  assert.equal(data.worldCode,w.id);assert.equal(data.version,146);
  assert.equal(data.regions.length,w.regions.length);
  assert(data.physical);assert.equal(data.physical.radiusKm,w.procedural.physical.radiusKm);
  assert(data.physical.escapeVelocityKmPerSecond>0);
  assert(data.physical.inferredMeanDensityKgPerM3>0);
  assert(data.physical.equatorialRotationKmPerHour>0);
  for(const region of data.regions){
   assert(Number.isFinite(region.solarNoonAltitudeDeg));
   assert(region.daylightFraction>=0&&region.daylightFraction<=1);
   assert(region.daylightPlanetaryHours>=0&&region.daylightPlanetaryHours<=data.dayLengthPlanetaryHours);
   assert(w.regions.some(r=>r.id===region.regionId));
  }
  assert.equal(JSON.stringify(w),before,"V146 diagnostics cannot rewrite world/war data");
 }
 assert(planets.at(-1).procedural.physical.radiusKm>planets[0].procedural.physical.radiusKm);
});

test("all ten real surface media retain their physical classes and do not invent water",()=>{
 const expected={water:"liquid",acid:"liquid",brine:"liquid",lava:"liquid",
  sand:"particulate",spores:"particulate",crystal:"solid",ice:"solid",
  radioactive:"radiative",mist:"aerosol"};
 for(const [kind,mediumClass] of Object.entries(expected)){
  const w=world("small",kind),d=a.analyzePlanetEnvironmentV146(w);
  assert.equal(d.surfaceKind,kind);
  assert.equal(d.mediumClass,mediumClass);
  assert.equal(d.regions.length,w.regions.length);
 }
});

test("world-building latitude warnings flag exceptions without pretending to be game rules",()=>{
 const base=world("terran","water");
 const synthetic={...base,regions:base.regions.map((r,i)=>({
   ...r,latitude:i===0?0:i===1?81:r.latitude,
 }))};
 const altered={...synthetic,procedural:{...base.procedural,regions:base.procedural.regions.map((r,i)=>({
   ...r,biome:i===0?"snow":i===1?"jungle":r.biome,
 }))}};
 const out=a.analyzePlanetEnvironmentV146(altered);
 assert(out.flags.some(flag=>flag.type==="equatorial-cold"&&flag.regionId===altered.regions[0].id));
 assert(out.flags.some(flag=>flag.type==="polar-tropical"&&flag.regionId===altered.regions[1].id));
 assert(!out.flags.some(flag=>flag.type==="frozen-hot-biome"));
 assert.equal(altered.procedural.regions[0].biome,"snow");
});

test("legacy planet without a physical radius gets no invented kilometre measurements",()=>{
 const w=a.generateWarPlanetV103(a.normalizeWarPlanetRecipeV103({
  seed:14602,regionCount:3,territoryCount:18,
 }));
 const out=a.analyzePlanetEnvironmentV146(w);
 assert.equal(out.physical,null);
 assert.equal(out.dayLengthPlanetaryHours,w.procedural.environment.dayLengthHours);
 assert.equal(out.regions.length,w.regions.length);
});

test("invalid polar/season/tilt values are rejected instead of yielding NaN",()=>{
 assert.throws(()=>a.planetDaylightFractionV146(95,23),/invalide/);
 assert.throws(()=>a.planetDaylightFractionV146(0,200),/invalide/);
 assert.throws(()=>a.planetSolarDeclinationV146(-1,"northern-solstice"),/invalide/);
 assert.throws(()=>a.analyzePlanetEnvironmentV146(world(),{axialTiltDeg:86}),/invalide/);
 assert.throws(()=>a.analyzePlanetEnvironmentV146(world(),{season:"not-a-season"}),/invalide/);
});
