import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = "tests/browser/environment-prop-raccords-20261120.fixture.mjs";
const scriptPath = "scripts/qa-environment-prop-raccords-20261120.mjs";
const args = process.argv.slice(2);
assert.ok(args.every((arg) => arg === "--materialize") && args.length <= 1, "Only --materialize is supported");
const materializeOnly = args.includes("--materialize");
const encounterRun = Number(process.env.ENVIRONMENT_PROP_RACCORD_ENCOUNTER_RUN ?? 0);
assert.ok(Number.isSafeInteger(encounterRun) && encounterRun >= 0);
const out = resolve(root, process.env.ENVIRONMENT_PROP_RACCORD_QA_OUTPUT ?? "outputs/qa-environment-prop-raccords-20261120");
await mkdir(out, { recursive: true });
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const git = (command, encoding = "utf8") => execFileSync("git", command, { cwd: root, encoding, maxBuffer: 64 * 1024 * 1024 });
const report = {
  schemaVersion: 1, startedAt: new Date().toISOString(),
  mode: materializeOnly ? "materialization-only" : "limited-canvas",
  scope: "Real production registry/world/draw helper in a limited Canvas2D fixture. Not GameClient, not native flexible-support rendering, not animation/collision play, and not human artistic review.",
  encounterRun, substituteAssets: false, nativeGameClient: false, humanArtReview: false,
  checks: [], captures: [], assets: [], requestedAssetUrls: [], pageErrors: [], consoleErrors: [], requestFailures: [], externalPageRequests: [],
  sourceFingerprintPhase: "After bundling, before browser; compared to Git HEAD and rechecked after browser.",
  passed: false, failure: null,
};
let server, browser;

function safeRelative(file) {
  assert.equal(typeof file, "string");
  assert.ok(file && !isAbsolute(file) && !file.includes("\\") && !file.split("/").includes(".."), "Unsafe project path: " + file);
  return file;
}
function publicPath(url) {
  assert.match(url, /^\/game\/assets\/v19\/biome-decor\/[a-z0-9/_-]+\.webp$/);
  return safeRelative("public" + url);
}
function pass(name) {
  report.checks.push({ name, passed: true });
  console.log("PASS " + name);
}
async function originalFile(file) {
  safeRelative(file);
  const path = resolve(root, file), stat = await lstat(path);
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), "Original must be a regular file: " + file);
  const bytes = await readFile(path);
  assert.deepEqual(bytes, git(["show", "HEAD:" + file], null), "Source differs from Git HEAD: " + file);
  return { path: file, bytes: bytes.length, sha256: sha(bytes), gitBlob: git(["rev-parse", "HEAD:" + file]).trim() };
}
async function fingerprints(files) {
  const rows = [];
  for (const file of [...new Set(files)].sort()) rows.push(await originalFile(file));
  return rows;
}
async function capture(name, bytes) {
  await writeFile(resolve(out, name), bytes);
  report.captures.push({ path: name, bytes: bytes.length, sha256: sha(bytes), humanPixelsInspected: false });
}

try {
  report.sourceCommit = git(["rev-parse", "HEAD"]).trim();
  assert.match(report.sourceCommit, /^[a-f0-9]{40}$/);
  if (process.env.ENVIRONMENT_PROP_RACCORD_SOURCE_COMMIT) {
    assert.equal(report.sourceCommit, process.env.ENVIRONMENT_PROP_RACCORD_SOURCE_COMMIT);
  }
  report.trackedWorkingTreeBefore = git(["status", "--porcelain", "--untracked-files=no"]);
  const nodeBuild = await build({
    stdin: { contents: 'export { resolveEnvironmentPropRaccordCases20261120 } from "./' + fixturePath + '";', resolveDir: root, loader: "js" },
    bundle: true, platform: "node", format: "esm", write: false, metafile: true, logLevel: "silent",
  });
  const api = await import("data:text/javascript;base64," + Buffer.from(nodeBuild.outputFiles[0].text).toString("base64"));
  const cases = api.resolveEnvironmentPropRaccordCases20261120(encounterRun);
  assert.equal(cases.length, 8);
  assert.equal(cases.filter(({ evidence }) => evidence === "canvas-production-draw-helper").length, 4);
  assert.equal(cases.filter(({ evidence }) => evidence === "registry-only-flexible").length, 2);
  assert.equal(cases.filter(({ evidence }) => evidence === "registry-only-native-fallback").length, 2);
  report.nodeCases = cases;
  const selectedAssets = new Map(cases.filter(({ asset }) => asset).map(({ asset }) => [asset.runtimeUrl, asset]));
  const assetPaths = [...selectedAssets.keys()].map(publicPath).sort();
  if (materializeOnly) {
    let sparse = false;
    try { sparse = git(["config", "--bool", "core.sparseCheckout"]).trim() === "true"; } catch { /* Ordinary complete checkout. */ }
    if (sparse) execFileSync("git", ["sparse-checkout", "add", "--stdin"], {
      cwd: root, input: assetPaths.map((file) => "/" + file).join("\n") + "\n", stdio: ["pipe", "inherit", "inherit"],
    });
    report.sparseMaterializationRequested = sparse;
  }
  report.assets = await fingerprints(assetPaths);
  report.selectedAssetFiles = report.assets.length;
  report.selectedAssetBytes = report.assets.reduce((sum, item) => sum + item.bytes, 0);
  pass("real registry resolves all eight declared cases and original selected assets match Git");
  if (!materializeOnly) {
    const browserBuild = await build({
      entryPoints: [resolve(root, fixturePath)], bundle: true, platform: "browser", format: "esm",
      target: "es2022", write: false, metafile: true, logLevel: "silent",
    });
    const sourcePaths = new Set([fixturePath, scriptPath, "package.json", "package-lock.json"]);
    for (const metadata of [nodeBuild.metafile, browserBuild.metafile]) {
      for (const input of Object.keys(metadata.inputs)) {
        if (input === "<stdin>" || input.replaceAll("\\", "/").includes("node_modules/")) continue;
        const file = relative(root, resolve(root, input)).replaceAll("\\", "/");
        sourcePaths.add(safeRelative(file));
      }
    }
    report.sourcesBefore = await fingerprints([...sourcePaths]);
    const bundle = browserBuild.outputFiles[0].text;
    const assetByUrl = new Map(report.assets.map((asset) => [asset.path.slice("public".length), asset]));
    const requested = new Set();
    const html = '<!doctype html><meta charset="utf-8"><title>V19 raccord QA — limited Canvas</title>' +
      '<style>body{margin:24px;background:#101a22;color:#eee;font:16px system-ui}article{padding:16px;margin:20px 0;border:1px solid #52616b;width:max-content;min-width:640px}canvas{display:block;background:#172631;image-rendering:pixelated}p{max-width:1000px}</style>' +
      '<main id="fixture"></main><script type="module">import {mountEnvironmentPropRaccordCases20261120} from "/fixture.js";' +
      'mountEnvironmentPropRaccordCases20261120(document.getElementById("fixture"),' + JSON.stringify({ encounterRun }) +
      ').catch(error=>{document.documentElement.dataset.raccordError=error.message;console.error(error);});</script>';
    server = createServer(async (request, response) => {
      try {
        const path = new URL(request.url, "http://127.0.0.1").pathname;
        if (path === "/") { response.writeHead(200, { "content-type": "text/html; charset=utf-8" }); response.end(html); return; }
        if (path === "/fixture.js") { response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }); response.end(bundle); return; }
        if (path === "/favicon.ico") { response.writeHead(204); response.end(); return; }
        const asset = assetByUrl.get(path);
        if (!asset) { response.writeHead(404); response.end("Not an admitted fixture resource"); return; }
        const bytes = await readFile(resolve(root, asset.path));
        assert.equal(sha(bytes), asset.sha256, "Asset changed after fingerprint: " + asset.path);
        response.writeHead(200, { "content-type": "image/webp", "cache-control": "no-store" }); response.end(bytes);
      } catch (error) {
        report.requestFailures.push({ server: true, message: error.message });
        response.writeHead(500); response.end("Original resource check failed");
      }
    });
    await new Promise((resolveListen, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolveListen); });
    const base = "http://127.0.0.1:" + server.address().port;
    const executablePath = process.env.CHROMIUM_EXECUTABLE || "/usr/bin/chromium";
    browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    report.browserVersion = browser.version();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    await context.route("**/*", async (route) => {
      if (!route.request().url().startsWith(base + "/")) {
        report.externalPageRequests.push(route.request().url()); await route.abort(); return;
      }
      await route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => report.pageErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") report.consoleErrors.push(message.text()); });
    page.on("requestfailed", (request) => report.requestFailures.push({ url: request.url(), error: request.failure()?.errorText }));
    page.on("request", (request) => {
      if (request.url().startsWith(base + "/")) {
        const path = new URL(request.url()).pathname;
        if (assetByUrl.has(path)) requested.add(path);
      }
    });
    await page.goto(base + "/", { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector("#fixture")?.dataset.raccordReady === "true" ||
      document.documentElement.dataset.raccordError, null, { timeout: 60000 });
    const result = await page.evaluate(() => ({
      error: document.documentElement.dataset.raccordError ?? null,
      report: globalThis.__environmentPropRaccordReport20261120 ?? null,
    }));
    assert.equal(result.error, null);
    assert.ok(result.report);
    report.browser = result.report;
    assert.deepEqual(result.report.cases.map(({ rendered, image, drawPlan, canvas, ...record }) => {
      void rendered; void image; void drawPlan; void canvas; return record;
    }), cases, "browser and Node must resolve the same production data");
    pass("browser resolves the same eight real registry and physical geometry records");
    for (const item of result.report.cases.filter(({ evidence }) => evidence === "canvas-production-draw-helper")) {
      assert.equal(item.rendered, true);
      assert.equal(item.canvas.worldUnitsPerPixel, 1);
      assert.ok(item.canvas.paintedPixelsBeforeQaOverlay > 0);
      assert.ok(item.image.naturalWidth > 48 && item.image.naturalHeight > 48);
      const canvas = page.locator('[data-raccord-canvas="' + item.id + '"]');
      await capture(item.id + ".png", await canvas.screenshot());
      pass("original image painted through the production draw helper: " + item.id);
    }
    assert.ok(result.report.cases.filter(({ evidence }) => evidence !== "canvas-production-draw-helper").every(({ rendered }) => rendered === false));
    const expectedRequests = [...new Set(cases.filter(({ evidence }) => evidence === "canvas-production-draw-helper").map(({ asset }) => asset.runtimeUrl))].sort();
    report.requestedAssetUrls = [...requested].sort();
    assert.deepEqual(report.requestedAssetUrls, expectedRequests, "only the four actual Canvas cases load image pixels");
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.consoleErrors, []);
    assert.deepEqual(report.requestFailures, []);
    assert.deepEqual(report.externalPageRequests, []);
    pass("no page errors, missing original resources, substitutions or external page requests");
    await capture("overview.png", await page.screenshot({ fullPage: true }));
    report.sourcesAfter = await fingerprints([...sourcePaths]);
    assert.deepEqual(report.sourcesAfter, report.sourcesBefore);
    report.sourceBytesStable = true;
    assert.deepEqual(await fingerprints(assetPaths), report.assets);
    assert.equal(git(["rev-parse", "HEAD"]).trim(), report.sourceCommit);
    report.trackedWorkingTreeAfter = git(["status", "--porcelain", "--untracked-files=no"]);
    pass("source code and original image bytes remain identical to the reviewed Git HEAD");
  }
  report.passed = true;
} catch (error) {
  report.failure = { message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server?.listening) await new Promise((resolveClose) => server.close(resolveClose));
  report.finishedAt = new Date().toISOString();
  const name = materializeOnly ? "materialization.json" : "report.json";
  await writeFile(resolve(out, name), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ passed: report.passed, sourceCommit: report.sourceCommit, checks: report.checks.length,
    captures: report.captures.length, selectedAssets: report.assets.length, mode: report.mode,
    substituteAssets: false, nativeGameClient: false, report: resolve(out, name), failure: report.failure?.message ?? null }));
}
