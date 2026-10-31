import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const folder = await mkdtemp(join(tmpdir(), "planet-physical-v136-"));
after(() => rm(folder, {recursive:true,force:true}));
const bundle = await build({ stdin: { contents: [
  'export { analyzePlanetPhysicalSurfaceV136 } from "./app/game/systems/clanWarPlanetSurfaceBudgetV136";',
  'export { generateWarPlanetV115, normalizeWarPlanetRecipeV115 } from "./app/game/systems/clanWarPlanetGeneratorV115";',
  'export { generateWarPlanetV103, normalizeWarPlanetRecipeV103 } from "./app/game/systems/clanWarPlanetGeneratorV103";',
].join("\n"), resolveDir: process.cwd(), loader: "ts" },
bundle: true, write: false, platform: "node", format: "esm", target: "es2022", logLevel: "silent" });
const pathname = join(folder, "v136.mjs");
await writeFile(pathname, bundle.outputFiles[0].text);
const api = await import(pathToFileURL(pathname));
const make = (size, hydrology = "mixed") =>
  api.generateWarPlanetV115(api.normalizeWarPlanetRecipeV115({
    seed:136202, planetSize:size, territoryCount:36, regionCount:6,
    hydrology, biomeDiversity:"varied", landform:"continents",
  }));

test("V136 accounts for all three classes of surface exactly, without subtracting lakes twice", () => {
  for (const size of ["dwarf","small","terran","large","giant","colossal"]) {
    const planet = make(size), source = JSON.stringify(planet);
    const budget = api.analyzePlanetPhysicalSurfaceV136(planet);
    assert(budget);
    assert.equal(budget.worldCode,planet.id);
    assert.equal(budget.surfaceKm2,budget.dryLandKm2+budget.inlandMediumKm2+budget.exteriorMediumKm2);
    assert.equal(budget.dryLandKm2,planet.procedural.physical.landAreaKm2);
    assert(budget.inlandMediumKm2>0);
    assert(budget.exteriorMediumKm2>0);
    assert(budget.landmasses.length===planet.landmasses.length);
    assert(budget.regions.length===planet.regions.length);
    assert(budget.regions.every(r=>r.estimatedNetDryKm2<=r.grossTerritoryKm2 && r.estimatedNetDryKm2>=0));
    assert(Math.abs(budget.regions.reduce((n,r)=>n+r.shareOfNetMappedLandPercent,0)-100)<.5);
    assert.equal(source,JSON.stringify(planet));
  }
});

test("physical areas scale quadratically with radius while angular geography stays unchanged", () => {
  const variants=["dwarf","small","terran","large","giant","colossal"].map(size => make(size));
  const surface=variants.map(api.analyzePlanetPhysicalSurfaceV136);
  for (let i=1;i<variants.length;i++) {
    assert(surface[i].surfaceKm2>surface[i-1].surfaceKm2);
    assert(surface[i].dryLandKm2>surface[i-1].dryLandKm2);
    assert(surface[i].inlandMediumKm2>surface[i-1].inlandMediumKm2);
    assert.deepEqual(variants[i].landmasses.map(m=>m.points),variants[0].landmasses.map(m=>m.points));
    assert.deepEqual(variants[i].territories.map(t=>t.points),variants[0].territories.map(t=>t.points));
  }
});

test("dry worlds have no invented inland medium and legacy V103 has no radius", () => {
  const dry = make("terran","none");
  const budget = api.analyzePlanetPhysicalSurfaceV136(dry);
  assert.equal(budget.inlandFeatureCount,0);
  assert.equal(budget.inlandMediumKm2,0);
  assert(budget.regions.every(r=>r.inlandAllocationKm2===0));
  const legacy=api.generateWarPlanetV103(api.normalizeWarPlanetRecipeV103({seed:136103}));
  assert.equal(api.analyzePlanetPhysicalSurfaceV136(legacy),null);
});

test("area tags depend on physical footprint instead of political territory counts", () => {
  const dwarf=api.analyzePlanetPhysicalSurfaceV136(make("dwarf"));
  const giant=api.analyzePlanetPhysicalSurfaceV136(make("colossal"));
  assert(dwarf.landmasses.every(m=>m.grossFootprintKm2>0));
  assert(giant.landmasses.every(m=>m.grossFootprintKm2>0));
  assert(dwarf.landmasses.some((m,i)=>m.grossFootprintKm2!==giant.landmasses[i].grossFootprintKm2));
  for (const item of [...dwarf.landmasses,...giant.landmasses])
    assert(["islet","island","subcontinental","continental","supercontinental"].includes(item.physicalBand));
});
