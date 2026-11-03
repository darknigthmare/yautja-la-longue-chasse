import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: `
    export * from "./app/game/systems/clanWarPlanetGeneratorV102";
    export { planetMaterialRecipeV101 } from "./app/game/systems/planetMaterialV101";
    export { planetRegionalBiomesV102 } from "./app/game/planetRegionalMaterialsV102";
  `, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const planet = (options = {}) => api.generateWarPlanetV102(api.normalizeWarPlanetRecipeV102({ seed: 10217, ...options }));
const material = (options = {}) => api.planetMaterialRecipeV101(planet(options));

/** IEEE binary16 rounding, including ties to even and subnormals. Round each
 * arithmetic operation: rounding only the final UV would hide the original
 * loss of the inset when it is added to atlas columns 2 and 3. */
function half(value) {
  if (!Number.isFinite(value) || value === 0) return value;
  const magnitude = Math.abs(value);
  const quantum = 2 ** Math.max(-24, Math.floor(Math.log2(magnitude)) - 10);
  const scaled = magnitude / quantum, lower = Math.floor(scaled), fraction = scaled - lower;
  const units = lower + Number(fraction > .5 || fraction === .5 && lower % 2 === 1);
  const rounded = units * quantum;
  return Math.sign(value) * (rounded > 65504 ? Infinity : rounded);
}

function halfAtlasCoordinate(uv, cell, cellsAlongAxis, tileSize, minimumInset) {
  const input = half(uv);
  const remainder = half(input - half(2 * Math.floor(half(input / 2))));
  const mirrored = half(1 - Math.abs(half(remainder - 1)));
  const inset = Math.max(half(.5 / tileSize), half(minimumInset));
  const local = Math.min(half(1 - inset), Math.max(inset, mirrored));
  return half(half(cell + local) / cellsAlongAxis);
}

test("binary16 emulation rounds the atlas's halfway additions to even", () => {
  assert.equal(half(1 + 2 ** -11), 1);
  assert.equal(half(1 + 3 * 2 ** -11), 1 + 2 ** -9);
  assert.equal(half(2 + 2 ** -10), 2);
  assert.equal(half(2 + 3 * 2 ** -10), 2 + 2 ** -8);
  assert.equal(half(2 ** -24), 2 ** -24);
  assert.equal(half(2 ** -25), 0);
  assert.equal(half(65504), 65504);
  assert.equal(half(65520), Infinity);
});

test("the old half-texel inset really reaches adjacent cells in binary16", () => {
  assert.equal(halfAtlasCoordinate(0, 2, 4, 512, 0), .5,
    "512px tile: the left edge of column 2 lands on the shared cell boundary");
  assert.equal(halfAtlasCoordinate(1, 2, 4, 512, 0), .75,
    "512px tile: the right edge of column 2 also lands on the shared boundary");
  assert.equal(halfAtlasCoordinate(0, 1, 4, 1024, 0), .25,
    "1024px tile: even column 1 loses its left half-texel margin");
});

test("the mediump margin keeps both atlas axes inside their cells from 16px to 1024px", () => {
  // This proves the minimum-precision arithmetic independently of source text.
  // Browser QA also executes the production shader with categorical textures.
  const boundaryUvs = [-8, -2, -1, 0, 1, 2, 8].flatMap(edge =>
    [-.01, -(2 ** -12), 0, 2 ** -12, .01].map(offset => edge + offset));
  const samples = [...boundaryUvs, .25, .5, .75];
  let checked = 0;
  for (const tileSize of [16, 32, 64, 128, 256, 512, 1024]) {
    for (const cellsAlongAxis of [4, 2]) for (let cell = 0; cell < cellsAlongAxis; cell++) {
      for (const uv of samples) {
        const atlas = halfAtlasCoordinate(uv, cell, cellsAlongAxis, tileSize, .004);
        const pixelWithinCell = atlas * cellsAlongAxis * tileSize - cell * tileSize;
        assert.ok(pixelWithinCell >= .5 && pixelWithinCell <= tileSize - .5,
          `tile=${tileSize}, axis=${cellsAlongAxis}, cell=${cell}, uv=${uv}: ${pixelWithinCell}px reaches a neighboring cell`);
        checked++;
      }
    }
  }
  assert.equal(checked, 1596);
});

const atmosphericFields = ["clouds", "weather", "aurora", "atmosphereColor", "weatherColor",
  "cloudOpacity", "weatherOpacity", "auroraOpacity", "atmosphereDensity"];
const atmosphericPart = recipe => Object.fromEntries(atmosphericFields.map(field => [field, recipe[field]]));
const landPart = recipe => ({ land: recipe.land, landColor: recipe.landColor, mapping: recipe.mapping });

test("each generated atmospheric profile remains independent of all terrestrial biomes and surfaces", () => {
  const signatures = new Set();
  for (const atmosphere of api.WAR_PLANET_ATMOSPHERES_V102) {
    const baseline = atmosphericPart(material({ atmosphere }));
    signatures.add(JSON.stringify(baseline));
    for (const landBiome of api.WAR_PLANET_BIOMES_V102) {
      assert.deepEqual(atmosphericPart(material({ atmosphere, landBiome })), baseline,
        `${atmosphere}: changing the terrestrial biome to ${landBiome} must not alter clouds, weather or sky`);
    }
    for (const surface of api.WAR_PLANET_SURFACES_V102) {
      assert.deepEqual(atmosphericPart(material({ atmosphere, surface })), baseline,
        `${atmosphere}: changing the surrounding surface to ${surface} must not recolor atmospheric modules`);
    }
    assert.ok(baseline.atmosphereDensity > 0);
    assert.ok(baseline.cloudOpacity > 0 && baseline.cloudOpacity < 1);
    assert.equal(baseline.auroraOpacity > 0, atmosphere === "aurora");
  }
  assert.equal(signatures.size, 4, "Independent profiles still produce four distinct atmospheric recipes");
});

test("generated land sources and colors survive changes to every surface and atmospheric profile", () => {
  for (const landBiome of api.WAR_PLANET_BIOMES_V102) {
    const baseline = landPart(material({ landBiome, biomeDiversity: "uniform" }));
    const surroundingSources = new Set();
    for (const surface of api.WAR_PLANET_SURFACES_V102) {
      const recipe = material({ landBiome, biomeDiversity: "uniform", surface });
      assert.deepEqual(landPart(recipe), baseline,
        `${landBiome}/${surface}: a surrounding surface must not retint the land, including crystalline and irradiated biomes`);
      surroundingSources.add(recipe.surface);
    }
    assert.equal(surroundingSources.size, 10, "Surface changes remain effective on their own material");
    for (const atmosphere of api.WAR_PLANET_ATMOSPHERES_V102) {
      assert.deepEqual(landPart(material({ landBiome, biomeDiversity: "uniform", atmosphere })), baseline,
        `${landBiome}/${atmosphere}: sky settings must leave the terrestrial material intact`);
    }
  }
});

test("regional material cells follow region identities even when descriptions are reordered", () => {
  const varied = planet({ landBiome: "fungal", biomeDiversity: "varied" });
  const expected = varied.procedural.regions.map(region => region.biome);
  assert.ok(new Set(expected).size > 1);
  assert.equal(api.planetMaterialRecipeV101(varied).mapping, "world-space-triplanar-regional");
  assert.deepEqual(api.planetRegionalBiomesV102(varied), expected);
  const reordered = { ...varied, procedural: { ...varied.procedural, regions: [...varied.procedural.regions].reverse() } };
  assert.deepEqual(api.planetRegionalBiomesV102(reordered), expected,
    "Descriptions are matched by region ID, not by their position in imported metadata");
  const uniform = planet({ landBiome: "crystal", biomeDiversity: "uniform" });
  assert.deepEqual(api.planetRegionalBiomesV102(uniform), Array(6).fill("crystal"));
  assert.equal(api.planetMaterialRecipeV101(uniform).mapping, "world-space-triplanar-mirrored");
});

test("historical material inputs retain surface-based tinting when no procedural profile exists", () => {
  for (const landBiome of ["crystal", "irradiated"]) {
    const generated = planet({ landBiome, surface: "acid" });
    const historicalInput = { ...generated, procedural: undefined };
    const historical = api.planetMaterialRecipeV101(historicalInput);
    assert.equal(historical.landColor, generated.surface.accent);
    assert.equal(historical.weatherColor, generated.surface.accent);
    assert.notEqual(api.planetMaterialRecipeV101(generated).landColor, generated.surface.accent);
  }
});
