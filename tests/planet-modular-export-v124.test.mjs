import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const temp = await mkdtemp(join(tmpdir(), "planet-modular-v124-"));
after(() => rm(temp, { recursive: true, force: true }));
const bundle = await build({
  stdin: {
    contents: `
      export { encodePlanetRegionPixelsV124, planetInlandFeaturesV124,
        createPlanetInlandMaskV124, describePlanetModularMasksV124 } from "./app/game/planetModularExportV124";
      export { normalizeWarPlanetRecipeV103, generateWarPlanetV103 } from "./app/game/systems/clanWarPlanetGeneratorV103";
      export { normalizeWarPlanetRecipeV115, generateWarPlanetV115 } from "./app/game/systems/clanWarPlanetGeneratorV115";
      export { makePlanetStoredZipV114 } from "./app/game/systems/planetExportZipV114";
    `,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const file = join(temp, "v124.mjs");
await writeFile(file, bundle.outputFiles[0].text);
const api = await import(pathToFileURL(file));

test("region mask writes exactly one-based red indices and excludes liquids", () => {
  const regionPixels = new Uint8ClampedArray([
    0,0,0,255, 1,0,0,255, 2,0,0,255, 2,0,0,255, 0,0,0,255,
  ]);
  const landPixels = new Uint8ClampedArray([
    255,255,255,255, 255,255,255,255, 0,0,0,255, 128,128,128,255, 127,127,127,255,
  ]);
  const encoded = api.encodePlanetRegionPixelsV124(regionPixels, landPixels, 3);
  assert.deepEqual([...encoded], [
    1,0,0,255, 2,0,0,255, 0,0,0,0, 3,0,0,255, 0,0,0,0,
  ]);
  assert.deepEqual([...regionPixels.slice(0, 8)], [0,0,0,255,1,0,0,255], "original GPU categorization not modified");
  assert.throws(() => api.encodePlanetRegionPixelsV124(regionPixels, landPixels, 2), /Indice de région/);
  assert.throws(() => api.encodePlanetRegionPixelsV124(regionPixels, landPixels.subarray(0, 8), 3), /Pixels/);
});

for (const [size, regions, shape] of [[18,3,0],[36,6,3],[72,12,10],[96,12,39]]) {
  test(`V115 mask manifest mirrors real terrain / regional atlas at ${size} territories`, () => {
    const planet = api.generateWarPlanetV115(api.normalizeWarPlanetRecipeV115({
      seed: 12400 + size, territoryCount: size, regionCount: regions,
      islandShape: shape, continentShape: shape, regionShape: shape,
      landMaterial: 13, liquidMaterial: 9, hydrology: "mixed",
    }));
    const manifest = api.describePlanetModularMasksV124(planet);
    assert.equal(manifest.planetId, planet.id);
    assert.equal(manifest.regions.length, regions);
    assert.equal(manifest.atlas.tileSize, 256);
    assert.equal(manifest.atlas.landDetailMaterial, "land-14");
    assert.equal(manifest.atlas.columns * manifest.atlas.rows * 256 * 256 >= regions * 256 * 256, true);
    assert.deepEqual(manifest.regions.map(region => region.id), planet.regions.map(region => region.id));
    assert.deepEqual(manifest.regions.map(region => region.redValue), Array.from({length:regions}, (_,i) => i+1));
    assert.deepEqual(manifest.inlandFeatures.map(feature => feature.id), api.planetInlandFeaturesV124(planet).map(feature => feature.id));
    for (const region of manifest.regions) {
      assert.equal(region.biome, planet.procedural.regions.find(r => r.regionId === region.id).biome);
      assert(region.atlasColumn < manifest.atlas.columns && region.atlasRow < manifest.atlas.rows);
    }
  });
}

test("V103 keeps its historical source material identity and valid region indices", () => {
  const planet = api.generateWarPlanetV103(api.normalizeWarPlanetRecipeV103({
    seed: 103124, territoryCount: 48, regionCount: 8, hydrology: "lakes",
  }));
  const manifest = api.describePlanetModularMasksV124(planet);
  assert.equal(manifest.atlas.landDetailMaterial, null);
  assert.equal(manifest.regions.length, 8);
  assert(manifest.inlandFeatures.every(feature => feature.kind === "lake"));
});

test("independent inland paths use exactly their own features and wrap copies", () => {
  const calls = [];
  const context = {
    fillStyle: "",
    beginPath() { calls.push("begin"); },
    moveTo(x,y) { calls.push(["move",x,y]); },
    lineTo(x,y) { calls.push(["line",x,y]); },
    closePath() { calls.push("close"); },
    fill() { calls.push("fill"); },
  };
  const previous = globalThis.document;
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, "canvas");
      return { width: 0, height: 0, getContext(kind) { assert.equal(kind,"2d"); return context; } };
    },
  };
  try {
    const points = [[-15, 10], [-14, 10], [-14, 9], [-15, 9]];
    const planet = { procedural: { hydrology: { features: [
      { id:"lake-1", kind:"lake", points },
      { id:"river-1", kind:"river", points },
    ] } } };
    assert.equal(api.planetInlandFeaturesV124(planet).length, 2);
    const lake = api.createPlanetInlandMaskV124(planet, "lake", 1024);
    assert.equal(lake.width,1024); assert.equal(lake.height,512);
    assert.equal(calls.filter(call=>call==="fill").length,3);
    calls.length=0;
    api.createPlanetInlandMaskV124(planet,"river",1024);
    assert.equal(calls.filter(call=>call==="fill").length,3);
    calls.length=0;
    api.createPlanetInlandMaskV124({ procedural: null }, "lake", 1024);
    assert.equal(calls.filter(call=>call==="fill").length,0);
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document=previous;
  }
});

test("all 15 PNG layers and manifest fit deterministic ZIP32 limit of 16 files", () => {
  const entries = Array.from({length:15}, (_,i)=>({name:`layer-${i}.png`,bytes:Uint8Array.of(137,80,78,71,i)}));
  entries.push({name:"manifest.json",bytes:new TextEncoder().encode('{"version":124}')});
  const zip=api.makePlanetStoredZipV114(entries);
  const view=new DataView(zip.buffer,zip.byteOffset,zip.byteLength);
  assert.equal(view.getUint32(zip.length-22,true),0x06054b50);
  assert.equal(view.getUint16(zip.length-12,true),16);
  assert.throws(()=>api.makePlanetStoredZipV114([...entries, {name:"overflow.png",bytes:Uint8Array.of(0)}]),/nombre de fichiers/);
});
