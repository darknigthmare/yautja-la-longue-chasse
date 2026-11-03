import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const dir = await mkdtemp(join(tmpdir(), "planet-materials-v125-"));
after(() => rm(dir, { recursive: true, force: true }));
const bundle = await build({
  stdin: {
    contents: `
      export * from "./app/game/systems/clanWarTextureLibraryV125";
      export * from "./app/game/systems/clanWarPlanetPhysicalIndexV125";
      export { describePlanetModularMasksV124 } from "./app/game/planetModularExportV124";
      export { shapedRadiusV115, warShapeTemplateV115 } from "./app/game/systems/clanWarShapeAtlasV115";
      export { normalizeWarPlanetRecipeV102, encodeWarPlanetV102 } from "./app/game/systems/clanWarPlanetGeneratorV102";
      export { normalizeWarPlanetRecipeV103, encodeWarPlanetV103, generateWarPlanetV103 } from "./app/game/systems/clanWarPlanetGeneratorV103";
      export { normalizeWarPlanetRecipeV115, encodeWarPlanetV115, generateWarPlanetV115 } from "./app/game/systems/clanWarPlanetGeneratorV115";
    `, resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const file = join(dir, "material-geometry.mjs");
await writeFile(file, bundle.outputFiles[0].text);
const api = await import(pathToFileURL(file));

test("120 unique named shapes split into three independent families and four sizes", () => {
  const shapes = api.describeWarPlanetShapeCatalogV125();
  assert.equal(shapes.length, 120);
  assert.equal(new Set(shapes.map(shape => shape.id)).size, 120);
  for (const category of ["island","continent","region"]) {
    const group = shapes.filter(shape => shape.category === category);
    assert.equal(group.length, 40);
    assert.equal(new Set(group.map(shape => shape.name)).size, 40);
    assert.equal(new Set(group.map(shape => shape.footprintScale)).size, 4);
    assert(group.every(shape => shape.description.length >= 20));
  }
});

test("all 120 shape recipes produce bounded and distinct radial contour signatures", () => {
  for(const category of ["island","continent","region"]){
    const signatures=new Set();
    for(let index=0; index<40; index++){
      const template=api.warShapeTemplateV115(category,index);
      const samples=Array.from({length:128},(_,step)=>
        api.shapedRadiusV115(.83,step*Math.PI*2/128,template,0));
      assert(samples.every(value=>Number.isFinite(value)&&value>=.23&&value<=.985));
      signatures.add(samples.map(value=>value.toFixed(4)).join(","));
    }
    assert.equal(signatures.size,40,`${category} has 40 visually differentiated geometry silhouettes`);
  }
});

test("physical size scales region and territory area and route distances without changing geography", () => {
  const sizes = ["dwarf","small","terran","large","giant","colossal"];
  const planets = sizes.map(planetSize => api.generateWarPlanetV115(api.normalizeWarPlanetRecipeV115({
    seed: 125177, planetSize, territoryCount: 18, regionCount: 3, hydrology: "mixed",
    islandShape: 13, continentShape: 27, regionShape: 39, landMaterial: 7, liquidMaterial: 9,
  })));
  const metrics = planets.map(planet => api.analyzeWarPlanetPhysicalIndexV125(planet));
  for (let index = 0; index < planets.length; index++) {
    const planet = planets[index], metric = metrics[index];
    assert(metric, "V115 planets have physical metrics");
    assert.equal(metric.territories.length,18);
    assert.equal(metric.regions.length,3);
    assert.equal(metric.landmasses.length,planet.landmasses.length);
    assert.equal(metric.territories.reduce((sum,item) => sum + item.areaKm2,0) > 0,true);
    assert(metric.regions.every(region => region.projectedAreaKm2 > 0 && region.territoryCount >= 3));
    assert.equal(metric.surfaceKm2,planet.procedural.physical.surfaceKm2);
    assert.equal(metric.landAreaKm2,planet.procedural.physical.landAreaKm2);
    assert.equal(metric.routes.length,planet.procedural.routes.length);
    assert(metric.routes.every(route => Number.isInteger(route.distanceKm) && route.distanceKm >= 0));
    const manifest=api.describePlanetModularMasksV124(planet);
    assert.equal(manifest.physicalIndex.radiusKm,metric.radiusKm);
    assert.equal(manifest.selectedShapeIds.island,"isl-14");
    assert.equal(manifest.selectedShapeIds.continent,"con-28");
    assert.equal(manifest.selectedShapeIds.region,"reg-40");
    assert.equal(manifest.shapeCatalog.length,120);
    assert.equal(manifest.supplementalMaterialCatalog.length,32);
    assert.equal(manifest.supplementalMaterialAdditionsV130.length,16);
    assert.equal(new Set([...manifest.supplementalMaterialCatalog,...manifest.supplementalMaterialAdditionsV130]
      .map(item=>item.id)).size,48);
  }
  for(let i=1;i<metrics.length;i++) {
    const a=metrics[i-1],b=metrics[i];
    assert(b.radiusKm>a.radiusKm);
    assert(b.surfaceKm2>a.surfaceKm2);
    assert(b.landAreaKm2>a.landAreaKm2);
    assert.equal(planets[i].territories.length,planets[0].territories.length);
    assert.equal(planets[i].regions.length,planets[0].regions.length);
    assert.deepEqual(planets[i].territories.map(t=>t.points),planets[0].territories.map(t=>t.points));
  }
});

test("original V102 and V103 codes remain independent of radius and supplemental material catalog", () => {
  const v102=api.normalizeWarPlanetRecipeV102({ seed: 125102 });
  const v103=api.normalizeWarPlanetRecipeV103({ seed: 125103, territoryCount: 18, regionCount: 3 });
  const planet=api.generateWarPlanetV103(v103);
  assert.equal(api.analyzeWarPlanetPhysicalIndexV125(planet),null);
  assert.equal(api.describePlanetModularMasksV124(planet).physicalIndex,null);
  assert.match(api.encodeWarPlanetV102(v102),/^proc-v102-/);
  assert.match(api.encodeWarPlanetV103(v103),/^proc-v103-/);
});

test("32 new material definitions contain 16 land and 16 liquid, each half Earthlike / alien", () => {
  const all=api.WAR_PLANET_TEXTURES_V125;
  assert.equal(all.length,32);
  assert.equal(new Set(all.map(x=>x.id)).size,32);
  for(const domain of ["land","liquid"]) {
    assert.equal(all.filter(x=>x.domain===domain).length,16);
    for(const origin of ["earthlike","alien"]) assert.equal(all.filter(x=>x.domain===domain&&x.origin===origin).length,8);
  }
  assert.deepEqual(api.WAR_PLANET_TEXTURE_CHANNELS_V125,["albedo","height","normal","roughness","emissive"]);
});

test("supplemental materials generate deterministic, opaque, distinct channels from one source", () => {
  const original=globalThis.document;
  globalThis.document={
    createElement(name) {
      assert.equal(name,"canvas");
      let data;
      const ctx={createImageData(w,h){return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)};},
        putImageData(image){data=image.data;}};
      return {width:0,height:0,getContext(type){assert.equal(type,"2d");return ctx;},get image(){return data;}};
    },
  };
  try{
    for(const id of ["land-loess","land-bioceramic","liquid-estuary","liquid-plasma-braid"]){
      const one=api.createPlanetTextureCanvasV125(id,"albedo",32,1234);
      const two=api.createPlanetTextureCanvasV125(id,"albedo",32,1234);
      assert.deepEqual(one.image,two.image);
      assert.equal(one.image.length,32*32*4);
      assert.equal(one.image.every((byte,index)=>index%4!==3||byte===255),true);
      assert(one.image.some((byte,index)=>index%4!==3&&byte>0));
      const normal=api.createPlanetTextureCanvasV125(id,"normal",32,1234);
      const height=api.createPlanetTextureCanvasV125(id,"height",32,1234);
      assert.notDeepEqual([...normal.image], [...height.image]);
      const roughness=api.createPlanetTextureCanvasV125(id,"roughness",32,1234);
      assert(roughness.image.some((byte,index)=>index%4===0&&byte>0));
    }
    assert.throws(()=>api.createPlanetTextureCanvasV125("unknown","albedo",16,1),/invalide/);
    assert.throws(()=>api.createPlanetTextureCanvasV125("land-loess","albedo",32,-1),/invalide/);
  } finally {globalThis.document=original;}
});
