import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { reportGithubActionsFailure } from "./lib/github-actions-annotation.mjs";
import { homeworldSceneSsrV78 } from "../tests/helpers/homeworld-scene-ssr-v78.mjs";

const base = process.env.YAUTJA_PLANET_MATERIAL_URL ?? "http://127.0.0.1:3101";
const output = path.resolve(process.env.YAUTJA_PLANET_REGIONAL_QA_OUTPUT ?? "outputs/qa-planet-regional-v102");
await fs.mkdir(output, { recursive: true });
const api = homeworldSceneSsrV78().load("app/game/systems/clanWarPlanetGeneratorV102.ts");
const world = overrides => api.generateWarPlanetV102(api.normalizeWarPlanetRecipeV102(overrides));
const original = world({ seed: 1028507, atmosphere: "clear" });
const seaChanged = world({ ...original.procedural.recipe, surface: "acid" });
const skyChanged = world({ ...original.procedural.recipe, atmosphere: "storm" });
const biomeChanged = world({ ...original.procedural.recipe, landBiome: "desert" });
const report = { base, renderer: "Chromium / software WebGL", checks: [], errors: [] };
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
    : process.env.AUDIT_CHROME_CHANNEL ? { channel: process.env.AUDIT_CHROME_CHANNEL } : {}),
  headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
});
const decode = async uri => sharp(Buffer.from(uri.split(",")[1], "base64")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const difference = (a, b) => {
  assert.equal(a.length, b.length);
  let changed = 0;
  for (let index = 0; index < a.length; index += 4) if (Math.abs(a[index] - b[index]) + Math.abs(a[index + 1] - b[index + 1]) + Math.abs(a[index + 2] - b[index + 2]) > 8) changed++;
  return changed;
};
async function review(context) {
  const page = await context.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  await page.goto(base + "/planet-materials-v101", { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => Boolean(window.__YAUTJA_PLANET_MATERIALS_V101__), undefined, { timeout: 90000 });
  return page;
}
const render = (page, planet, layer, overrides = {}) => page.evaluate(options => window.__YAUTJA_PLANET_MATERIALS_V101__.export(options), {
  planetId: planet.id, layer, projection: "map", width: 1024, height: 512, textureSize: 512, ...overrides,
});

try {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, reducedMotion: "reduce" });
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    window.__regionalQaContexts = [];
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      const result = original.call(this, type, ...args);
      if (type === "webgl" && result && !window.__regionalQaContexts.includes(result)) window.__regionalQaContexts.push(result);
      return result;
    };
  });
  const page = await review(context);
  const land = await decode(await render(page, original, "land"));
  const mask = await decode(await render(page, original, "mask"));
  let compared = 0, mismatches = 0;
  for (let y = 2; y < 510; y += 3) for (let x = 2; x < 1022; x += 3) {
    const index = (y * 1024 + x) * 4, value = mask.data[index];
    if (value !== 0 && value !== 255) continue;
    if (![-1025, -1024, -1023, -1, 1, 1023, 1024, 1025].every(offset => mask.data[index + offset * 4] === value)) continue;
    compared++;
    if (Math.abs(land.data[index + 3] - value) > 4) mismatches++;
  }
  assert.ok(compared > 40000); assert.equal(mismatches, 0);
  report.checks.push({ name: "generated land alpha follows the actual geographic coast", compared, mismatches });

  const mapUri = await render(page, original, "composite");
  const globeUri = await render(page, skyChanged, "composite", { projection: "globe", width: 768, height: 768 });
  await fs.writeFile(path.join(output, "generated-regional-map.png"), Buffer.from(mapUri.split(",")[1], "base64"));
  await fs.writeFile(path.join(output, "generated-regional-globe.png"), Buffer.from(globeUri.split(",")[1], "base64"));
  assert.equal((await decode(globeUri)).data[3], 0);
  assert.ok(difference(land.data, (await decode(await render(page, biomeChanged, "land"))).data) > 10000);
  report.checks.push({ name: "real bitmap regional materials and transparent globe render", planet: original.id, biomes: original.procedural.regions.map(region => region.biome) });

  for (const layer of ["land", "clouds", "weather", "atmosphere", "night"]) {
    const before = layer === "land" ? land : await decode(await render(page, original, layer));
    const after = await decode(await render(page, seaChanged, layer));
    assert.deepEqual(after.data, before.data, "surface must not change independent " + layer);
  }
  for (const layer of ["surface", "clouds", "weather", "atmosphere"]) {
    assert.deepEqual((await decode(await render(page, biomeChanged, layer))).data, (await decode(await render(page, original, layer))).data, "biome must not change " + layer);
  }
  for (const layer of ["land", "surface", "albedo", "mask"]) {
    assert.deepEqual((await decode(await render(page, skyChanged, layer))).data, (await decode(await render(page, original, layer))).data, "atmosphere must not change " + layer);
  }
  assert.ok(difference((await decode(await render(page, skyChanged, "composite"))).data, (await decode(mapUri)).data) > 10000);
  report.checks.push({ name: "surface, regional biomes and atmosphere are pixel-independent modules", surfaceChecks: 5, biomeChecks: 4, atmosphereChecks: 4 });

  const crystal = world({ seed: 311, landBiome: "crystal", biomeDiversity: "uniform", surface: "water" });
  const crystalSea = world({ ...crystal.procedural.recipe, surface: "radioactive" });
  assert.deepEqual((await decode(await render(page, crystal, "land"))).data, (await decode(await render(page, crystalSea, "land"))).data);
  report.checks.push({ name: "uniform exotic land tint remains independent of surface palette" });

  for (let seed = 0; seed < 28; seed++) await render(page, world({ seed: 73000 + seed, landform: "archipelago" }), "land", { width: 256, height: 128 });
  const status = await page.evaluate(() => ({ ...window.__YAUTJA_PLANET_MATERIALS_V101__.status(), actualContexts: window.__regionalQaContexts.length }));
  assert.equal(status.actualContexts, 1);
  assert.ok(status.regionalAtlases <= 3 && status.regionalMasks <= 6 && status.decodedSources <= 16 && status.masks <= 6 && status.gpuTextures <= 22);
  assert.equal(status.pendingRegionalAtlases, 0);
  report.checks.push({ name: "successive generated planets retain bounded CPU and GPU caches", ...status });
  const loss = await page.evaluate(() => {
    const extension = window.__regionalQaContexts[0].getExtension("WEBGL_lose_context");
    if (!extension) return false;
    window.__regionalQaLoss = extension; extension.loseContext(); return true;
  });
  assert.ok(loss);
  await page.waitForFunction(() => window.__YAUTJA_PLANET_MATERIALS_V101__.status().available === false);
  await page.evaluate(() => window.__regionalQaLoss.restoreContext());
  await page.waitForFunction(() => window.__YAUTJA_PLANET_MATERIALS_V101__.status().available === true);
  assert.deepEqual((await decode(await render(page, original, "land"))).data, land.data);
  report.checks.push({ name: "regional atlas and categorical mask recover after WebGL context restoration" });
  await context.close();

  // Flat diagnostic assets make every expected biome measurable. Geometry,
  // region assignment, atlas creation, projections and shader are production code.
  const palette = Object.fromEntries(api.WAR_PLANET_BIOMES_V102.map((biome, index) => [biome, [35 + index * 16, 215 - index * 12, 45 + (index * 47) % 185]]));
  for (const precision of ["native", "forced-mediump"]) {
    const diagnostic = await browser.newContext();
    if (precision === "forced-mediump") await diagnostic.addInitScript(() => {
      const original = WebGLRenderingContext.prototype.shaderSource;
      WebGLRenderingContext.prototype.shaderSource = function(shader, source) {
        if (this.getShaderParameter(shader, this.SHADER_TYPE) === this.FRAGMENT_SHADER) source = source.replaceAll("#ifdef GL_FRAGMENT_PRECISION_HIGH", "#if 0");
        return original.call(this, shader, source);
      };
    });
    await diagnostic.route("**/game/planets/v101/runtime/land-*.webp", async route => {
      const biome = /land-([a-z]+)\.webp$/.exec(route.request().url())?.[1];
      const color = palette[biome];
      assert.ok(color, "known diagnostic biome");
      const body = await sharp({ create: { width: 16, height: 16, channels: 3, background: { r: color[0], g: color[1], b: color[2] } } }).png().toBuffer();
      await route.fulfill({ contentType: "image/png", body });
    });
    const diagnosticPage = await review(diagnostic);
    const diagnosticMap = await decode(await render(diagnosticPage, original, "land"));
    let points = 0;
    for (const territory of original.territories) {
      const region = original.procedural.regions.find(item => item.regionId === territory.regionId);
      const x = Math.floor((territory.longitude + 180) / 360 * 1024), y = Math.floor((90 - territory.latitude) / 180 * 512);
      const index = (y * 1024 + x) * 4;
      assert.ok(diagnosticMap.data[index + 3] > 245, "territorial marker stays on opaque land");
      palette[region.biome].forEach((channel, component) => assert.ok(Math.abs(diagnosticMap.data[index + component] - channel) <= 3, precision + ": correct biome at " + territory.id));
      points++;
    }
    for (const region of original.regions) {
      const detail = original.procedural.regions.find(item => item.regionId === region.id);
      const globe = await decode(await render(diagnosticPage, original, "land", { projection: "globe", width: 512, height: 512, longitude: region.longitude, latitude: region.latitude }));
      const index = (256 * 512 + 256) * 4;
      palette[detail.biome].forEach((channel, component) => assert.ok(Math.abs(globe.data[index + component] - channel) <= 3, precision + ": globe correct biome at " + region.id));
    }
    report.checks.push({ name: precision + " categorical regional atlas agrees with territory definitions in both projections", mapPoints: points, globeRegions: 6, diagnosticAssets: true });
    await diagnostic.close();
  }

  const missing = await browser.newContext();
  let blocked = 0;
  await missing.route("**/game/planets/v101/runtime/land-temperate.webp", async route => {
    blocked++; await route.fulfill({ status: 404, body: "Deliberate regional texture failure" });
  });
  const missingPage = await review(missing);
  const surface = await decode(await render(missingPage, original, "surface"));
  assert.equal(surface.data[3], 255);
  const result = await missingPage.evaluate(async options => {
    try { await window.__YAUTJA_PLANET_MATERIALS_V101__.export(options); return { ok: true }; }
    catch (error) { return { ok: false, message: String(error) }; }
  }, { planetId: original.id, layer: "land", projection: "map", width: 512, height: 256, textureSize: 512 });
  assert.equal(result.ok, false); assert.ok(blocked > 0);
  assert.equal(await missingPage.evaluate(() => window.__YAUTJA_PLANET_MATERIALS_V101__.status().available), true);
  report.checks.push({ name: "a missing regional bitmap fails its land layer while surface remains exportable", blocked, message: result.message });
  await missing.close();
  assert.deepEqual(report.errors, []);
  report.ok = true;
  report.limitations = ["Software WebGL validates both precision branches; it does not certify every physical mobile GPU."];
} catch (error) {
  report.ok = false; report.failure = error.stack; process.exitCode = 1;
  reportGithubActionsFailure("Planet regional materials V102 browser journey", error);
}
finally {
  await fs.writeFile(path.join(output, "regional-material-checks.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
}
console.log(JSON.stringify({ ok: report.ok, checks: report.checks.length, failure: report.failure, report: path.join(output, "regional-material-checks.json") }, null, 2));
