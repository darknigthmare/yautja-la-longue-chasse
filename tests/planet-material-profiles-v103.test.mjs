import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import sharp from "sharp";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: `
    export * from "./app/game/systems/planetMaterialProfilesV103";
    export * from "./app/game/systems/clanWarPlanetGeneratorV103";
    export { planetMaterialRecipeV101 } from "./app/game/systems/planetMaterialV101";
    export { planetRegionalAtlasKeyV102 } from "./app/game/planetRegionalMaterialsV102";
  `, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const base = api.generateWarPlanetV103(api.normalizeWarPlanetRecipeV103({ seed: 10317, hydrology: "none" }));
const defaults = api.DEFAULT_PLANET_MATERIAL_OPTIONS_V103;
const variant = patch => ({ ...base, procedural: { ...base.procedural, recipe: { ...base.procedural.recipe, ...patch } } });
const dimensions = {
  landVariant: api.PLANET_MATERIAL_VARIANTS_V103, surfaceVariant: api.PLANET_MATERIAL_VARIANTS_V103,
  landScale: api.PLANET_MATERIAL_SCALES_V103, surfaceScale: api.PLANET_MATERIAL_SCALES_V103,
  landContrast: api.PLANET_MATERIAL_CONTRASTS_V103, surfaceContrast: api.PLANET_MATERIAL_CONTRASTS_V103,
  landPalette: api.PLANET_LAND_PALETTES_V103, surfacePalette: api.PLANET_SURFACE_PALETTES_V103,
};

test("each visual option changes its own profile without changing the other module", () => {
  const land = api.planetLandProfileV103(defaults), surface = api.planetSurfaceProfileV103(defaults);
  for (const [field, values] of Object.entries(dimensions)) {
    const signatures = new Set();
    for (const value of values) {
      const options = { ...defaults, [field]: value };
      const own = field.startsWith("land") ? api.planetLandProfileV103(options) : api.planetSurfaceProfileV103(options);
      const other = field.startsWith("land") ? api.planetSurfaceProfileV103(options) : api.planetLandProfileV103(options);
      assert.deepEqual(other, field.startsWith("land") ? surface : land, field);
      signatures.add(JSON.stringify(own));
      assert.ok(own.scale >= .65 && own.scale <= 1.6);
      assert.ok(own.contrast >= .72 && own.contrast <= 1.35);
    }
    assert.equal(signatures.size, values.length, field + " keeps every choice effective");
  }
});

test("visual options keep clouds, scattering, weather, emission rules and seed independent", () => {
  const keep = recipe => Object.fromEntries(Object.entries(recipe).filter(([key]) => key !== "id" && key !== "materials"));
  const expected = keep(api.planetMaterialRecipeV101(base));
  for (const [field, values] of Object.entries(dimensions)) for (const value of values) {
    assert.deepEqual(keep(api.planetMaterialRecipeV101(variant({ [field]: value }))), expected, field + ":" + value);
  }
});

test("atlas dimensions support every region count within hardware and the existing pixel budget", () => {
  for (let count = 3; count <= 12; count++) for (const maximum of [64, 128, 512, 1024, 2048, 4096, 8192]) {
    for (const requested of [16, 32, 128, 512, 1024, 2048]) {
      const layout = api.planetRegionalLayoutV103(count, requested, maximum);
      assert.ok(layout.columns * layout.rows >= count);
      assert.ok(layout.columns <= 4 && layout.rows <= 3);
      assert.ok(layout.width <= maximum && layout.height <= maximum);
      assert.ok(layout.width * layout.height <= 8 * 1024 * 1024);
      assert.ok(layout.tileSize <= Math.min(requested, 1024));
      assert.equal(layout.tileSize & (layout.tileSize - 1), 0);
    }
  }
  assert.deepEqual(api.planetRegionalLayoutV103(12, 1024, 4096), { columns: 4, rows: 3, tileSize: 512, width: 2048, height: 1536, regionCount: 12 });
  for (const count of [-1, 0, 2, 2.5, 13, Infinity, NaN]) assert.throws(() => api.planetRegionalLayoutV103(count, 512, 4096), RangeError);
});

function half(value) {
  if (!Number.isFinite(value) || value === 0) return value;
  const quantum = 2 ** Math.max(-24, Math.floor(Math.log2(Math.abs(value))) - 10);
  const scaled = Math.abs(value) / quantum, lower = Math.floor(scaled), fraction = scaled - lower;
  return Math.sign(value) * quantum * (lower + Number(fraction > .5 || fraction === .5 && lower % 2 === 1));
}
function coordinate(uv, cell, count, tile, extra) {
  const input = half(uv), remainder = half(input - half(2 * Math.floor(half(input / 2))));
  const mirrored = half(1 - Math.abs(half(remainder - 1)));
  const inset = Math.max(half(half(.5 / tile) + half(extra)), half(.004));
  const local = Math.min(half(1 - inset), Math.max(inset, mirrored));
  return half(half(cell + local) / count) * count * tile - cell * tile;
}

test("the three-row atlas adds a rounding margin that remains inside cells in binary16", () => {
  assert.ok(coordinate(1, 1, 3, 128, 0) > 127.5, "the old power-of-two inset loses part of its half texel after division by three");
  let checked = 0;
  const samples = [-8, -2, -1, 0, 1, 2, 8].flatMap(edge => [-.01, -(2 ** -12), 0, 2 ** -12, .01].map(offset => edge + offset));
  for (const count of [2, 3, 4]) for (let cell = 0; cell < count; cell++) for (const tile of [16, 32, 64, 128, 256, 512, 1024]) {
    for (const uv of samples) {
      const pixel = coordinate(uv, cell, count, tile, .002);
      assert.ok(pixel >= .5 && pixel <= tile - .5, `axis=${count}, cell=${cell}, tile=${tile}, uv=${uv}: ${pixel}`);
      checked++;
    }
  }
  assert.equal(checked, 2205);
});

test("atlas identities share only equivalent bitmaps and ignore unrelated visual controls", () => {
  const key = planet => api.planetRegionalAtlasKeyV102(planet, 512, 512);
  const expected = key(base);
  for (const field of ["landScale", "landContrast", "landPalette", "surfaceVariant", "surfaceScale", "surfaceContrast", "surfacePalette"]) {
    for (const value of dimensions[field]) assert.equal(key({ ...variant({ [field]: value }), id: `different-${field}-${value}` }), expected);
  }
  assert.notEqual(key(variant({ landVariant: "earthlike" })), expected);
  assert.notEqual(key({ ...base, procedural: { ...base.procedural, regions: base.procedural.regions.map((region, index) => index === 0 ? { ...region, biome: "salt" } : region) } }), expected);
});

test("the four generated source images and runtime derivatives have recorded provenance and distinct pixels", async () => {
  const root = "public/game/planets/v103";
  const manifest = JSON.parse(await fs.readFile(`${root}/manifest.json`, "utf8"));
  assert.equal(manifest.materials.length, 4);
  const hashes = new Set();
  for (const asset of manifest.materials) {
    assert.ok(asset.prompt.length > 300);
    const source = await fs.readFile(`${root}/${asset.source}`), runtime = await fs.readFile(`${root}/${asset.runtime}`);
    assert.equal(crypto.createHash("sha256").update(source).digest("hex"), asset.sha256);
    assert.equal(crypto.createHash("sha256").update(runtime).digest("hex"), asset.runtimeSha256);
    const sourceMeta = await sharp(source).metadata(), runtimeMeta = await sharp(runtime).metadata();
    assert.equal(sourceMeta.width, asset.width); assert.equal(sourceMeta.height, asset.height);
    assert.ok(sourceMeta.width >= 1024); assert.equal(runtimeMeta.width, 512); assert.equal(runtimeMeta.height, 512);
    assert.equal((await sharp(source).stats()).isOpaque, true);
    assert.equal((await sharp(runtime).stats()).isOpaque, true);
    hashes.add(asset.sha256);
  }
  assert.equal(hashes.size, 4);
});
