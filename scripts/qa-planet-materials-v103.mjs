import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import crypto from "node:crypto";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import sharp from "sharp";

// This QA serves bundled production modules and real project images directly.
// It has no dependency on a running Next server, hydration, or browser storage.
const output = path.resolve(process.env.YAUTJA_PLANET_V103_MATERIAL_QA_OUTPUT ?? "outputs/qa-planet-materials-v103");
const galleryOnly = process.argv.includes("--gallery-only");
const reportFile = galleryOnly ? "gallery-manifest.json" : "materials-qa.json";
await fs.mkdir(output, { recursive: true });
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "planet-v102-renderer-"));
const fixtureRoot = "tests/fixtures/planet-material-v102";
const fixture = JSON.parse(await fs.readFile(`${fixtureRoot}/manifest.json`, "utf8"));
for (const file of fixture.files) {
  const contents = await fs.readFile(path.join(fixtureRoot, file.fixture));
  assert.equal(crypto.createHash("sha256").update(contents).digest("hex"), file.sha256, "unchanged published renderer fixture");
  const target = path.join(temporary, file.source);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, contents);
}
const bundle = async (contents, globalName, resolveDir) => (await build({
  stdin: { contents, loader: "ts", resolveDir }, globalName,
  bundle: true, write: false, format: "iife", platform: "browser", target: "es2022", logLevel: "silent",
})).outputFiles[0].text;
const [current, baseline] = await Promise.all([
  bundle(`
    export * from "./app/game/planetMaterialRendererV101";
    export * from "./app/game/systems/clanWarPlanetGeneratorV103";
    export * from "./app/game/systems/clanWarPlanetGeneratorV102";
    export { WAR_PLANETS_V96 } from "./app/game/systems/clanWarPlanetsV96";
  `, "CurrentRenderer", process.cwd()),
  bundle('export * from "./app/game/planetMaterialRendererV101";', "BaselineRenderer", temporary),
]);
const publicRoot = path.resolve("public");
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (pathname === "/") { response.setHeader("Content-Type", "text/html"); response.end('<!doctype html><meta charset="utf-8"><title>V103 material QA</title><script src="/current.js"></script><script src="/baseline.js"></script>'); return; }
    if (pathname === "/current.js" || pathname === "/baseline.js") { response.setHeader("Content-Type", "text/javascript"); response.end(pathname === "/current.js" ? current : baseline); return; }
    const file = path.resolve(publicRoot, "." + pathname);
    if (!file.startsWith(publicRoot + path.sep)) { response.writeHead(403); response.end(); return; }
    response.setHeader("Content-Type", pathname.endsWith(".webp") ? "image/webp" : "image/png");
    response.end(await fs.readFile(file));
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const report = { mode: galleryOnly ? "gallery-only" : "full-validation", renderer: "Chromium / software WebGL", baselineCommit: fixture.commit, baselineFiles: fixture.files, checks: [], errors: [] };
let browser;
const decode = async uri => (await sharp(Buffer.from(uri.split(",")[1], "base64")).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;
const difference = (a, b) => {
  assert.equal(a.length, b.length);
  let changed = 0;
  for (let index = 0; index < a.length; index += 4) if (Math.abs(a[index] - b[index]) + Math.abs(a[index + 1] - b[index + 1]) + Math.abs(a[index + 2] - b[index + 2]) > 8) changed++;
  return changed;
};
const alpha = pixels => pixels.filter((_value, index) => index % 4 === 3);
async function review(context) {
  const page = await context.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  await page.goto(base, { waitUntil: "load" });
  await page.evaluate(() => {
    window.qaRender = async ({ planet, layer, baseline, overrides = {}, abortAfter }) => {
      const api = baseline ? window.BaselineRenderer : window.CurrentRenderer;
      const projection = overrides.projection ?? "map", width = overrides.width ?? 512, height = overrides.height ?? (projection === "map" ? 256 : width);
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      if (layer === "mask") {
        canvas.getContext("2d").drawImage(api.createPlanetLandMaskV101(planet, 1024), 0, 0, width, height);
      } else {
        const controller = new AbortController();
        if (abortAfter === 0) controller.abort();
        else if (abortAfter) setTimeout(() => controller.abort(), abortAfter);
        const ok = await api.drawPlanetMaterialV101(canvas, {
          planet, layer, projection, width, height, radius: Math.min(width, height) * .44,
          centerX: width / 2, centerY: height / 2, longitude: 0, latitude: 0, mapTop: 0, mapHeight: height,
          textureSize: 512, ...overrides, signal: controller.signal,
        });
        if (!ok) return { ok, status: api.planetMaterialRendererStatusV101(), blank: !canvas.getContext("2d").getImageData(0, 0, width, height).data.some(value => value !== 0) };
      }
      return { ok: true, uri: canvas.toDataURL("image/png") };
    };
  });
  return page;
}
const request = (page, planet, layer, overrides = {}, baseline = false, abortAfter) => page.evaluate(options => window.qaRender(options), { planet, layer, overrides, baseline, abortAfter });
async function render(page, planet, layer, overrides, baseline) {
  const result = await request(page, planet, layer, overrides, baseline);
  assert.equal(result.ok, true, JSON.stringify(result.status));
  return result.uri;
}
const world = (page, options = {}) => page.evaluate(options => window.CurrentRenderer.generateWarPlanetV103(window.CurrentRenderer.normalizeWarPlanetRecipeV103(options)), options);

try {
  browser = await chromium.launch({
    ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
      : process.env.AUDIT_CHROME_CHANNEL ? { channel: process.env.AUDIT_CHROME_CHANNEL } : {}),
    headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
  });
  report.chromium = browser.version();
  if (!galleryOnly) {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    window.qaContexts = [];
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      const result = original.call(this, type, ...args);
      if (type === "webgl" && result && !window.qaContexts.includes(result)) window.qaContexts.push(result);
      return result;
    };
  });
  const page = await review(context);

  const oldPlanets = await page.evaluate(() => [
    ...window.CurrentRenderer.WAR_PLANETS_V96,
    ...[{ seed: 1028507 }, { seed: 917, landBiome: "crystal", biomeDiversity: "uniform", surface: "radioactive" }, { seed: 3882, landform: "archipelago", atmosphere: "aurora" }]
      .map(options => window.CurrentRenderer.generateWarPlanetV102(window.CurrentRenderer.normalizeWarPlanetRecipeV102(options))),
  ]);
  assert.equal(oldPlanets.length, 33);
  const fingerprints = [];
  for (const planet of oldPlanets) {
    const proofs = [];
    for (const projection of ["map", "globe"]) for (const layer of ["land", "composite"]) {
      const dimensions = { projection, width: 384, height: projection === "map" ? 192 : 384, longitude: 37, latitude: 19 };
      const before = await decode(await render(page, planet, layer, dimensions, true));
      const after = await decode(await render(page, planet, layer, dimensions));
      assert.deepEqual(after, before, `published pixels: ${planet.id}/${projection}/${layer}`);
      proofs.push({ projection, layer, sha256: crypto.createHash("sha256").update(after).digest("hex") });
    }
    fingerprints.push({ planet: planet.id, proofs });
  }
  report.checks.push({ name: "all 30 historical planets and three V102 worlds retain identical published pixels", comparisons: 132, fingerprints });
  console.log("V103 material QA: 132 published pixel comparisons passed");

  const original = await world(page, { seed: 10317, territoryCount: 48, regionCount: 12, hydrology: "none", atmosphere: "aurora" });
  const initial = {};
  for (const layer of ["land", "surface", "clouds", "weather", "atmosphere", "aurora", "mask"]) initial[layer] = await decode(await render(page, original, layer));
  const changes = [
    { landVariant: "earthlike" }, { landVariant: "alien" }, { landScale: "fine" }, { landContrast: "strong" }, { landPalette: "violet" },
    { surfaceVariant: "earthlike" }, { surfaceVariant: "alien" }, { surfaceScale: "broad" }, { surfaceContrast: "soft" }, { surfacePalette: "amber" },
  ];
  const changesMeasured = [];
  for (const patch of changes) {
    const planet = await world(page, { ...original.procedural.recipe, ...patch });
    const own = Object.keys(patch)[0].startsWith("land") ? "land" : "surface", other = own === "land" ? "surface" : "land";
    const modified = await decode(await render(page, planet, own));
    const changedPixels = difference(initial[own], modified);
    assert.ok(changedPixels > 500, JSON.stringify({ patch, changedPixels }));
    assert.deepEqual(alpha(modified), alpha(initial[own]), "material controls preserve alpha");
    assert.deepEqual(await decode(await render(page, planet, other)), initial[other], "other material remains pixel-identical: " + JSON.stringify(patch));
    assert.deepEqual(await decode(await render(page, planet, "atmosphere")), initial.atmosphere, "scattering remains independent");
    changesMeasured.push({ patch, changedPixels });
  }
  const altered = await world(page, { ...original.procedural.recipe, landVariant: "alien", landScale: "broad", landContrast: "strong", landPalette: "violet", surfaceVariant: "alien", surfaceScale: "fine", surfaceContrast: "strong", surfacePalette: "turquoise" });
  for (const layer of ["clouds", "weather", "aurora", "mask"]) assert.deepEqual(await decode(await render(page, altered, layer)), initial[layer], layer + " independent of all eight material controls");
  report.checks.push({ name: "all eight controls produce visible changes confined to their own material", changesMeasured, atmosphericAndMaskChecks: 4 });

  const wet = await world(page, { ...altered.procedural.recipe, hydrology: "mixed" });
  const wetMask = await decode(await render(page, wet, "mask"));
  let holes = 0;
  for (let pixel = 0; pixel < wetMask.length; pixel += 4) if (initial.mask[pixel] === 255 && wetMask[pixel] < 10) holes++;
  assert.ok(wet.procedural.hydrology.features.length > 0 && holes > 30, "inland polygons cut visible holes into land");
  assert.deepEqual(await decode(await render(page, wet, "surface")), await decode(await render(page, altered, "surface")), "hydrology reveals the same independent sea material");
  const land = await decode(await render(page, wet, "land", { width: 1024, height: 512 }));
  const fullMask = await decode(await render(page, wet, "mask", { width: 1024, height: 512 }));
  let compared = 0;
  for (let y = 2; y < 510; y += 3) for (let x = 2; x < 1022; x += 3) {
    const offset = (y * 1024 + x) * 4, value = fullMask[offset];
    if (value !== 0 && value !== 255) continue;
    if (![-1025, -1024, -1023, -1, 1, 1023, 1024, 1025].every(delta => fullMask[offset + delta * 4] === value)) continue;
    assert.ok(Math.abs(land[offset + 3] - value) <= 4, "land alpha agrees with the geographic water cutouts"); compared++;
  }
  assert.ok(compared > 40000);
  report.checks.push({ name: "hydrology cuts the land layer and exposes the selected sea without altering it", features: wet.procedural.hydrology.features.length, holes, compared });

  for (const [name, planet, projection] of [["earthlike-map", await world(page, { ...wet.procedural.recipe, landVariant: "earthlike", landPalette: "verdant", surfaceVariant: "earthlike", surfacePalette: "azure" }), "map"], ["alien-globe", wet, "globe"]]) {
    const uri = await render(page, planet, "composite", { projection, width: 1024, height: projection === "map" ? 512 : 1024, textureSize: 2048, longitude: 37, latitude: 19 });
    if (projection === "globe") assert.equal((await decode(uri))[3], 0);
    await fs.writeFile(path.join(output, name + ".png"), Buffer.from(uri.split(",")[1], "base64"));
  }
  report.checks.push({ name: "source PNG exports render a twelve-region NPOT atlas and preserve transparent globe corners" });

  for (let index = 0; index < 26; index++) await render(page, await world(page, { seed: 2000 + index, regionCount: [3, 4, 6, 8, 12][index % 5], territoryCount: 48, landBiome: ["temperate", "desert", "fungal", "crystal"][index % 4], landVariant: index % 2 ? "earthlike" : "alien", surfaceVariant: index % 2 ? "alien" : "earthlike" }), "composite", { width: 128, height: 64 });
  const status = await page.evaluate(() => window.CurrentRenderer.planetMaterialRendererStatusV101());
  assert.ok(status.decodedSources <= 16 && status.detailedMaterials <= 6 && status.regionalAtlases <= 3 && status.regionalMasks <= 6 && status.masks <= 6 && status.gpuTextures <= 22 && status.programs <= 2);
  assert.ok(status.detailedMaterialPixels <= 6 * 1024 * 1024 && status.regionalAtlasPixels <= 3 * 8 * 1024 * 1024);
  assert.equal(status.pendingSources + status.pendingDetailedMaterials + status.pendingRegionalAtlases, 0);
  report.checks.push({ name: "26 successive worlds keep source, detail, mask, atlas and GPU caches bounded", ...status });
  const beforeRestore = await decode(await render(page, altered, "land"));
  assert.ok(await page.evaluate(() => { const extension = window.qaContexts.at(-1).getExtension("WEBGL_lose_context"); if (!extension) return false; window.qaLoss = extension; extension.loseContext(); return true; }));
  await page.waitForFunction(() => !window.CurrentRenderer.planetMaterialRendererStatusV101().available);
  await page.evaluate(() => window.qaLoss.restoreContext());
  await page.waitForFunction(() => window.CurrentRenderer.planetMaterialRendererStatusV101().available);
  assert.deepEqual(await decode(await render(page, altered, "land")), beforeRestore);
  report.checks.push({ name: "V103 shader, atlas and materials recover after context restoration" });
  await context.close();

  const biomeNames = ["temperate", "jungle", "tundra", "snow", "desert", "volcanic", "salt", "mountain", "ocean", "swamp", "crystal", "fungal", "irradiated"];
  const palette = Object.fromEntries(biomeNames.map((name, index) => [name, [35 + index * 16, 215 - index * 12, 45 + (index * 47) % 185]]));
  for (const precision of ["native", "forced-mediump"]) {
    const diagnostic = await browser.newContext();
    if (precision === "forced-mediump") await diagnostic.addInitScript(() => {
      const original = WebGLRenderingContext.prototype.shaderSource;
      WebGLRenderingContext.prototype.shaderSource = function (shader, source) {
        if (this.getShaderParameter(shader, this.SHADER_TYPE) === this.FRAGMENT_SHADER) source = source.replaceAll("#ifdef GL_FRAGMENT_PRECISION_HIGH", "#if 0");
        return original.call(this, shader, source);
      };
    });
    await diagnostic.route("**/game/planets/v101/runtime/land-*.webp", async route => {
      const color = palette[/land-([a-z]+)\.webp$/.exec(route.request().url())[1]];
      const body = await sharp({ create: { width: 16, height: 16, channels: 3, background: { r: color[0], g: color[1], b: color[2] } } }).png().toBuffer();
      await route.fulfill({ contentType: "image/png", body });
    });
    const diagnosticPage = await review(diagnostic);
    let markers = 0, regions = 0;
    for (const count of [3, 4, 6, 8, 12]) {
      const planet = await world(diagnosticPage, { seed: 10507, territoryCount: 48, regionCount: count, hydrology: "none" });
      planet.procedural.regions.forEach((region, index) => { region.biome = biomeNames[index]; });
      const pixels = await decode(await render(diagnosticPage, planet, "land", { width: 1024, height: 512 }));
      for (const territory of planet.territories) {
        const region = planet.procedural.regions.find(item => item.regionId === territory.regionId);
        const x = Math.floor((territory.longitude + 180) / 360 * 1024), y = Math.floor((90 - territory.latitude) / 180 * 512), offset = (y * 1024 + x) * 4;
        assert.ok(pixels[offset + 3] > 245, `${precision}/${count}: marker on land`);
        palette[region.biome].forEach((channel, component) => assert.ok(Math.abs(pixels[offset + component] - channel) <= 3, `${precision}/${count}: region ${region.regionId} samples its atlas cell`));
        markers++;
      }
      for (const region of planet.regions) {
        const description = planet.procedural.regions.find(item => item.regionId === region.id);
        const globe = await decode(await render(diagnosticPage, planet, "land", { projection: "globe", width: 256, height: 256, longitude: region.longitude, latitude: region.latitude }));
        const offset = (128 * 256 + 128) * 4;
        palette[description.biome].forEach((channel, component) => assert.ok(Math.abs(globe[offset + component] - channel) <= 3, `${precision}/${count}: globe region ${region.id}`));
        regions++;
      }
    }
    report.checks.push({ name: `${precision}: every 3/4/6/8/12-region atlas cell matches territory and globe coordinates`, markers, regions, diagnosticAssets: true });
    await diagnostic.close();
  }

  const missing = await browser.newContext();
  await missing.route("**/game/planets/v103/runtime/land-earthlike.webp", route => route.fulfill({ status: 404, body: "Deliberate material detail failure" }));
  const missingPage = await review(missing), missingPlanet = await world(missingPage, { landVariant: "earthlike", surfaceVariant: "native", biomeDiversity: "uniform" });
  assert.equal((await request(missingPage, missingPlanet, "land")).ok, false);
  assert.equal((await request(missingPage, missingPlanet, "surface")).ok, true);
  assert.equal(await missingPage.evaluate(() => window.CurrentRenderer.planetMaterialRendererStatusV101().pendingDetailedMaterials), 0);
  report.checks.push({ name: "an unavailable detail source rejects only its own layer and leaves no pending composition" });
  await missing.close();

  const cancelled = await browser.newContext();
  await cancelled.route("**/game/planets/v103/runtime/land-alien.webp", async route => { await new Promise(resolve => setTimeout(resolve, 80)); await route.continue(); });
  const cancelPage = await review(cancelled), cancelPlanet = await world(cancelPage, { landVariant: "alien", biomeDiversity: "uniform" });
  for (const abortAfter of [0, 5]) {
    const result = await request(cancelPage, cancelPlanet, "land", {}, false, abortAfter);
    assert.equal(result.ok, false); assert.equal(result.blank, true);
  }
  assert.equal((await request(cancelPage, cancelPlanet, "land")).ok, true);
  report.checks.push({ name: "pre-cancelled and in-flight cancelled renders leave their target untouched and a later render succeeds" });
  await cancelled.close();
  }

  // Capture real renderer output after validation; the contact sheet is a
  // browser layout of those PNGs, never an illustrative replacement image.
  const galleryContext = await browser.newContext({ viewport: { width: 1600, height: 1300 }, deviceScaleFactor: 1 });
  const galleryPage = await review(galleryContext);
  const specimens = [
    { name: "Petite Terre", description: "Strates et grains alluviaux · mer azur", options: { territoryCount: 18, regionCount: 3, landform: "continents", arrangement: "equatorial", landBiome: "temperate", surface: "water", landVariant: "earthlike", surfaceVariant: "earthlike", landPalette: "verdant", surfacePalette: "azure", atmosphere: "clear", hydrology: "lakes" } },
    { name: "Archipel terrestre", description: "Îles découpées · houle et écume", options: { territoryCount: 48, regionCount: 8, landform: "archipelago", arrangement: "scattered", coast: "peninsulas", landBiome: "jungle", surface: "water", landVariant: "earthlike", surfaceVariant: "earthlike", surfacePalette: "turquoise", atmosphere: "haze", hydrology: "mixed" } },
    { name: "Monde de glace", description: "Sols polaires · surface gelée", options: { territoryCount: 36, regionCount: 6, arrangement: "polar", landBiome: "snow", biomeDiversity: "uniform", surface: "ice", landVariant: "earthlike", surfaceVariant: "native", atmosphere: "clear", hydrology: "lakes" } },
    { name: "Désert minéral", description: "Sédiments ocres · plaines de sable", options: { territoryCount: 24, regionCount: 4, landform: "supercontinent", landBiome: "desert", surface: "sand", landVariant: "earthlike", landScale: "broad", landPalette: "ochre", surfacePalette: "amber", atmosphere: "haze", hydrology: "none" } },
    { name: "Fluide extraterrestre", description: "Veines ramifiées · courants filamentaires", options: { territoryCount: 48, regionCount: 8, coast: "lobed", landBiome: "fungal", surface: "acid", landVariant: "alien", surfaceVariant: "alien", landPalette: "violet", surfacePalette: "turquoise", atmosphere: "aurora", hydrology: "mixed" } },
    { name: "Monde cristallin", description: "Substrat cellulaire · reflets d’obsidienne", options: { territoryCount: 96, regionCount: 12, landform: "shattered", landBiome: "crystal", surface: "crystal", landVariant: "alien", surfaceVariant: "alien", landPalette: "violet", surfacePalette: "obsidian", atmosphere: "haze", hydrology: "lakes" } },
  ];
  const cards = [], gallery = [];
  for (const specimen of specimens) {
    const planet = await world(galleryPage, { seed: 10317, ...specimen.options });
    const view = { projection: "globe", width: 768, height: 768, longitude: planet.regions[0].longitude, latitude: Math.max(-45, Math.min(45, planet.regions[0].latitude)), textureSize: 1024, settings: { atmosphere: true, clouds: false, weather: false, lighting: true } };
    const uri = await render(galleryPage, planet, "composite", view);
    cards.push(`<figure><img src="${uri}" alt="${specimen.name}"><figcaption><strong>${specimen.name}</strong><span>${specimen.description}</span><small>${planet.territories.length} territoires · ${planet.regions.length} régions</small></figcaption></figure>`);
    gallery.push({ name: specimen.name, planetId: planet.id, recipe: planet.procedural.recipe, view });
  }
  await galleryPage.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:32px;background:#0a101a;color:#eef3fa;font-family:Arial,sans-serif}header{margin-bottom:24px}header small{color:#83c4cb;letter-spacing:3px;font-size:12px}h1{font-size:32px;margin:10px 0 8px}header p,footer{color:#a6b5c8;font-size:15px;margin:0}main{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}figure{margin:0;padding:14px 18px 20px;border:1px solid #2b394c;border-radius:14px;background:#121d2b}img{display:block;width:100%;height:420px;object-fit:contain}figcaption strong{display:block;font-size:22px;margin:5px 0 9px}figcaption span{display:block;color:#c4d1e2;font-size:15px}figcaption small{display:block;margin-top:10px;color:#7fb2bd;font-size:13px}footer{margin-top:22px;font-size:13px}</style><header><small>GÉNÉRATEUR PLANÉTAIRE V103</small><h1>Six mondes, des matières indépendantes</h1><p>Sols, surfaces et diffusion atmosphérique du moteur de jeu. Nuages et brumes masqués pour lire les textures.</p></header><main>${cards.join("")}</main><footer>Rendus WebGL de production · graine commune 10317 · recettes et angles de vue documentés · textures sources ImageGen, sans retouche des rendus.</footer>`);
  await galleryPage.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode())); });
  await galleryPage.screenshot({ path: path.join(output, "material-gallery-v103.png"), fullPage: true });
  await galleryContext.close();
  report.gallery = gallery;
  await fs.writeFile(path.join(output, "material-gallery-recipes.json"), JSON.stringify(gallery, null, 2) + "\n");
  assert.deepEqual(report.errors, []);
  report.ok = true;
  report.limitations = ["Software WebGL exercises both precision branches; arithmetic binary16 tests additionally cover the atlas border margin. Physical mobile GPU certification is outside this check.", "The new images are albedo detail maps; no normal maps, fluid simulation or physically computed scattering are claimed."];
} catch (error) { report.ok = false; report.failure = error.stack; process.exitCode = 1; }
finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  await fs.rm(temporary, { recursive: true, force: true });
  await fs.writeFile(path.join(output, reportFile), JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify({ ok: report.ok, mode: report.mode, checks: report.checks.length, failure: report.failure, report: path.join(output, reportFile) }, null, 2));
