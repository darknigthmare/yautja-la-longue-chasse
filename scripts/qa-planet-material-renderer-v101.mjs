import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";

const base = process.env.YAUTJA_PLANET_MATERIAL_URL ?? "http://127.0.0.1:3101";
const output = path.resolve(process.env.YAUTJA_PLANET_MATERIAL_QA_OUTPUT ?? "outputs/qa-planet-material-v101");
await fs.mkdir(output, { recursive: true });
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || chromium.executablePath();
const browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"] });
const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, reducedMotion: "reduce" });
const report = { base, renderer: "Chromium / software WebGL", checks: [], errors: [] };
try {
  // Test instrumentation exists only in this isolated browser context.
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    window.__planetQaGl = [];
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      const result = original.call(this, type, ...args);
      if ((type === "webgl" || type === "webgl2") && result && !window.__planetQaGl.includes(result)) window.__planetQaGl.push(result);
      return result;
    };
  });
  const page = await context.newPage();
  const requests = [];
  const inFlight = new Set();
  let peakLoads = 0;
  page.on("request", request => { if (request.url().includes("/planets/v101/")) { requests.push(request.url()); inFlight.add(request); peakLoads = Math.max(peakLoads, inFlight.size); } });
  page.on("requestfinished", request => inFlight.delete(request));
  page.on("requestfailed", request => inFlight.delete(request));
  page.on("pageerror", error => report.errors.push(error.message));
  await page.goto(`${base}/planet-materials-v101`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.locator('[data-preview-projection] canvas[data-render-status="ready"]').waitFor({ timeout: 90000 });
  const waiting = await page.locator('canvas[data-render-status="waiting"]').count();
  assert.ok(waiting > 0, "offscreen portraits must remain unloaded");
  assert.ok(requests.length > 0);
  assert.ok(requests.every(url => url.includes("/runtime/") && url.endsWith(".webp")), "interactive UI downloads optimized WebP only");
  report.checks.push({ name: "visible-only runtime sources", waitingPortraits: waiting, requested: [...new Set(requests)] });

  const exportLayer = (layer, planetId = "korthas", projection = "globe", settings) => page.evaluate(async options => window.__YAUTJA_PLANET_MATERIALS_V101__.export(options), { planetId, projection, layer, width: 512, height: projection === "map" ? 256 : 512, textureSize: 512, settings });
  const decode = async data => sharp(Buffer.from(data.split(",")[1], "base64")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const plain = await decode(await exportLayer("albedo"));
  const complete = await decode(await exportLayer("composite"));
  assert.equal(plain.info.width, 512);
  assert.equal(plain.data[3], 0, "globe corner must be transparent");
  assert.ok(plain.data[(256 * 512 + 256) * 4 + 3] > 250, "surface center must be opaque");
  let changed = 0;
  for (let i = 0; i < plain.data.length; i += 4) if (Math.abs(plain.data[i] - complete.data[i]) + Math.abs(plain.data[i + 1] - complete.data[i + 1]) + Math.abs(plain.data[i + 2] - complete.data[i + 2]) > 8) changed++;
  assert.ok(changed > 10000, "composite effects must change actual rendered pixels");
  const disabled = await decode(await exportLayer("composite", "korthas", "globe", { atmosphere: false, clouds: false, weather: false, lighting: false }));
  let maximumDifference = 0;
  for (let index = 0; index < plain.data.length; index++) maximumDifference = Math.max(maximumDifference, Math.abs(plain.data[index] - disabled.data[index]));
  assert.ok(maximumDifference <= 1, "disabling all four modules restores albedo within one 8-bit rounding step");
  for (const layer of ["clouds", "weather", "atmosphere", "night"]) {
    const image = await decode(await exportLayer(layer));
    let visible = 0, transparent = 0;
    for (let i = 3; i < image.data.length; i += 4) { if (image.data[i] > 0) visible++; if (image.data[i] === 0) transparent++; }
    assert.ok(visible > 500 && transparent > 500, `${layer} must contain an independent transparent effect`);
    report.checks.push({ name: `independent ${layer}`, visible, transparent });
  }
  report.checks.push({ name: "real shader compositing and reversible settings", changedPixels: changed });

  // The exported land alpha must coincide with the exported geographic mask.
  const land = await decode(await exportLayer("land", "obsidra", "map"));
  const mask = await decode(await exportLayer("mask", "obsidra", "map"));
  let compared = 0, differences = 0;
  for (let y = 4; y < 252; y += 3) for (let x = 4; x < 508; x += 3) {
    const index = (y * 512 + x) * 4;
    const region = mask.data[index];
    // Ignore antialiased edge samples; compare solid interior/exterior only.
    const neighbors = [-513, -512, -511, -1, 1, 511, 512, 513].map(delta => mask.data[index + delta * 4]);
    if (!neighbors.every(value => value === region) || (region !== 0 && region !== 255)) continue;
    if (Math.abs(land.data[index + 3] - region) > 4) differences++;
    compared++;
  }
  assert.ok(compared > 5000);
  assert.equal(differences, 0, "GPU material mask follows game coastlines in the north-up planisphere");
  report.checks.push({ name: "geographic alpha matches coast mask", compared, differences });

  for (const planetId of ["serak", "nivalis", "pyroclaste", "amethys", "nyctera", "venefra", "viridia"]) {
    await page.getByLabel("Planète", { exact: true }).selectOption(planetId);
    await page.locator(`[data-preview-projection] canvas[data-planet-id="${planetId}"][data-render-status="ready"]`).waitFor({ timeout: 30000 });
  }
  await page.locator('button[aria-pressed]').last().scrollIntoViewIfNeeded();
  await page.locator('canvas[data-planet-id="nyctera"][data-render-status="ready"]').last().waitFor({ timeout: 30000 });
  const state = await page.evaluate(() => ({ ...window.__YAUTJA_PLANET_MATERIALS_V101__.status(), actualContexts: window.__planetQaGl.length }));
  assert.equal(state.actualContexts, 1);
  assert.ok(state.decodedSources <= 16 && state.masks <= 6 && state.gpuTextures <= 22);
  assert.ok(peakLoads <= 4, `material decode queue exceeded four concurrent loads: ${peakLoads}`);
  report.checks.push({ name: "one context and bounded caches", ...state, peakLoads });

  await page.locator("h1").scrollIntoViewIfNeeded();
  const supported = await page.evaluate(() => {
    const gl = window.__planetQaGl[0], extension = gl.getExtension("WEBGL_lose_context");
    if (!extension) return false;
    window.__planetQaLoss = extension; extension.loseContext(); return true;
  });
  assert.ok(supported, "software WebGL test requires context loss extension");
  await page.waitForFunction(() => window.__YAUTJA_PLANET_MATERIALS_V101__.status().available === false);
  await page.evaluate(() => window.__planetQaLoss.restoreContext());
  await page.waitForFunction(() => window.__YAUTJA_PLANET_MATERIALS_V101__.status().available === true);
  const restored = await decode(await exportLayer("albedo"));
  assert.ok(restored.data[(256 * 512 + 256) * 4 + 3] > 250, "restored GPU draws a fresh opaque surface");
  await page.locator('[data-preview-projection] canvas[data-render-status="ready"]').waitFor({ timeout: 30000 });
  assert.equal(await page.evaluate(() => window.__planetQaGl.length), 1, "restoration reuses the original context");
  report.checks.push({ name: "context loss and restoration", restored: true });
  await page.screenshot({ path: path.join(output, "renderer-desktop.png"), fullPage: false });

  // Exercise the production fallback branch in a separate browser context.
  // SwiftShader may evaluate mediump with greater precision than required by
  // ESSL; this proves compilation and rendered behavior, not physical GPU parity.
  const mediumContext = await browser.newContext({ viewport: { width: 1400, height: 1000 }, reducedMotion: "reduce" });
  try {
    await mediumContext.addInitScript(() => {
      const original = WebGLRenderingContext.prototype.shaderSource;
      window.__planetQaPrecision = { fragments: [], gl: null };
      WebGLRenderingContext.prototype.shaderSource = function(shader, source) {
        if (this.getShaderParameter(shader, this.SHADER_TYPE) === this.FRAGMENT_SHADER && source.includes("uniform vec2 uResolution, uLogical")) {
          const branches = source.match(/#ifdef GL_FRAGMENT_PRECISION_HIGH/g) ?? [];
          const precision = this.getShaderPrecisionFormat(this.FRAGMENT_SHADER, this.MEDIUM_FLOAT);
          window.__planetQaPrecision.fragments.push({ forcedBranches: branches.length, rangeMin: precision.rangeMin, rangeMax: precision.rangeMax, precision: precision.precision });
          window.__planetQaPrecision.gl = this;
          // Do not redefine the reserved GL_ macro. Select the same #else
          // branches that a WebGL1 implementation without highp compiles.
          source = source.replaceAll("#ifdef GL_FRAGMENT_PRECISION_HIGH", "#if 0");
        }
        return original.call(this, shader, source);
      };
    });
    const mediumPage = await mediumContext.newPage();
    mediumPage.on("pageerror", error => report.errors.push(`mediump: ${error.message}`));
    await mediumPage.goto(`${base}/planet-materials-v101`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await mediumPage.locator('[data-preview-projection] canvas[data-render-status="ready"]').waitFor({ timeout: 90000 });
    const exportMedium = async options => decode(await mediumPage.evaluate(options => window.__YAUTJA_PLANET_MATERIALS_V101__.export(options), {
      planetId: "korthas", projection: "globe", layer: "albedo", width: 512, height: 512, textureSize: 512, ...options,
    }));
    const mediumPlain = await exportMedium({});
    const mediumComposite = await exportMedium({ layer: "composite" });
    const mediumDisabled = await exportMedium({ layer: "composite", settings: { atmosphere: false, clouds: false, weather: false, lighting: false } });
    assert.equal(mediumPlain.data[3], 0);
    assert.ok(mediumPlain.data[(256 * 512 + 256) * 4 + 3] > 250);
    let mediumChanged = 0, mediumMaximumDifference = 0;
    for (let i = 0; i < mediumPlain.data.length; i += 4) {
      if (Math.abs(mediumPlain.data[i] - mediumComposite.data[i]) + Math.abs(mediumPlain.data[i + 1] - mediumComposite.data[i + 1]) + Math.abs(mediumPlain.data[i + 2] - mediumComposite.data[i + 2]) > 8) mediumChanged++;
      for (let channel = 0; channel < 4; channel++) mediumMaximumDifference = Math.max(mediumMaximumDifference, Math.abs(mediumPlain.data[i + channel] - mediumDisabled.data[i + channel]));
    }
    assert.ok(mediumChanged > 10000, "mediump composite effects change actual pixels");
    assert.ok(mediumMaximumDifference <= 1, "mediump modules remain reversible");
    const effects = [];
    for (const [layer, planetId] of [["clouds", "korthas"], ["weather", "korthas"], ["atmosphere", "korthas"], ["night", "korthas"], ["aurora", "nivalis"], ["emissive", "pyroclaste"]]) {
      const image = await exportMedium({ layer, planetId });
      let visible = 0, transparent = 0;
      for (let i = 3; i < image.data.length; i += 4) { if (image.data[i] > 0) visible++; if (image.data[i] === 0) transparent++; }
      assert.ok(visible > 500 && transparent > 500, `mediump ${layer} remains an independent transparent effect`);
      effects.push({ layer, visible, transparent });
    }
    // The maximum supported width and a narrow map cover the problematic
    // coordinate products without generating a 4096-square test artifact.
    const wideMap = await exportMedium({ projection: "map", width: 4096, height: 64 });
    let opaque = 0, colored = 0;
    for (let i = 0; i < wideMap.data.length; i += 4) {
      if (wideMap.data[i + 3] === 255) opaque++;
      if (wideMap.data[i] + wideMap.data[i + 1] + wideMap.data[i + 2] > 24) colored++;
    }
    assert.equal(opaque, 4096 * 64, "mediump maximum-width map is fully covered");
    assert.ok(colored > opaque * .99, "mediump map remains colored across its full width");
    const rotated = await exportMedium({ longitude: 35 });
    const manyTurns = await exportMedium({ longitude: 360000035 });
    assert.deepEqual(manyTurns.data, rotated.data, "large finite longitude is reduced before entering the mediump shader");
    const precision = await mediumPage.evaluate(() => ({
      fragments: window.__planetQaPrecision.fragments,
      glError: window.__planetQaPrecision.gl.getError(),
      status: window.__YAUTJA_PLANET_MATERIALS_V101__.status(),
    }));
    assert.ok(precision.fragments.length > 0 && precision.fragments.every(fragment => fragment.forcedBranches > 0), "the production shader must expose and compile a mediump fallback branch");
    assert.equal(precision.glError, 0);
    assert.ok(precision.status.available);
    report.checks.push({ name: "forced mediump shader compilation and rendered modules", ...precision, changedPixels: mediumChanged, maximumDisabledDifference: mediumMaximumDifference, effects, maximumWidthMap: { width: 4096, height: 64, opaque, colored }, longitudeWrap: true, limitation: "Software WebGL exercises the mediump branch; hardware may use different rounding and texture precision." });
    await mediumPage.screenshot({ path: path.join(output, "renderer-mediump.png"), fullPage: false });
  } finally { await mediumContext.close(); }

  // Real 404 responses must affect only layers that consume the missing source.
  // Fresh contexts prevent a previously cached source from hiding a dependency.
  for (const missing of ["land", "surface"]) {
    const isolatedContext = await browser.newContext({ viewport: { width: 1400, height: 1000 }, reducedMotion: "reduce" });
    const blocked = [];
    try {
      await isolatedContext.route(`**/game/planets/v101/runtime/${missing}-*.webp`, async route => {
        blocked.push(route.request().url());
        await route.fulfill({ status: 404, body: "Missing texture for renderer regression", contentType: "text/plain" });
      });
      const isolatedPage = await isolatedContext.newPage();
      isolatedPage.on("pageerror", error => report.errors.push(`missing ${missing}: ${error.message}`));
      await isolatedPage.goto(`${base}/planet-materials-v101`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await isolatedPage.waitForFunction(() => Boolean(window.__YAUTJA_PLANET_MATERIALS_V101__));
      await isolatedPage.locator('[data-preview-projection] canvas[data-render-status="fallback"]').waitFor({ timeout: 90000 });
      assert.ok(blocked.length > 0, "the missing source must actually return 404");
      const successful = [];
      for (const layer of missing === "land" ? ["surface", "emissive"] : ["land"]) {
        const attempts = blocked.length;
        const image = await decode(await isolatedPage.evaluate(options => window.__YAUTJA_PLANET_MATERIALS_V101__.export(options), {
          planetId: "pyroclaste", projection: "globe", layer, width: 256, height: 256, textureSize: 512,
        }));
        let visible = 0;
        for (let i = 3; i < image.data.length; i += 4) if (image.data[i] > 0) visible++;
        assert.ok(visible > 500, `${layer} draws without the unrelated ${missing} texture`);
        assert.equal(blocked.length, attempts, `${layer} must not request the unrelated ${missing} source`);
        successful.push({ layer, visible });
      }
      const failed = [];
      for (const layer of [missing, "albedo", "composite"]) {
        const result = await isolatedPage.evaluate(async options => {
          try { await window.__YAUTJA_PLANET_MATERIALS_V101__.export(options); return { ok: true }; }
          catch (error) { return { ok: false, message: String(error) }; }
        }, { planetId: "pyroclaste", projection: "globe", layer, width: 256, height: 256, textureSize: 512 });
        assert.equal(result.ok, false, `${layer} must report its required ${missing} source failure`);
        assert.ok(result.message.includes("Texture unavailable:"));
        failed.push(layer);
      }
      assert.equal(await isolatedPage.evaluate(() => window.__YAUTJA_PLANET_MATERIALS_V101__.status().available), true, "a missing image does not disable the GPU renderer");
      report.checks.push({ name: `independent layers with unavailable ${missing} source`, successful, failed, blockedRequests: blocked.length });
    } finally { await isolatedContext.close(); }
  }
  assert.deepEqual(report.errors, []);
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.stack; process.exitCode = 1; }
finally { await fs.writeFile(path.join(output, "renderer-checks.json"), JSON.stringify(report, null, 2) + "\n"); await browser.close(); }
console.log(JSON.stringify({ ok: report.ok, checks: report.checks.length, failure: report.failure, report: path.join(output, "renderer-checks.json") }, null, 2));
