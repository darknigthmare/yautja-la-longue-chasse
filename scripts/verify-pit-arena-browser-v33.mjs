import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const root = process.cwd();
const arenaId = process.argv[2] ?? "the-pit";
const knownPlayableIds=["the-pit", "trophy-hall", "canopy-causeway", "frost-chamber", "ash-courtyard", "glass-terrace", "abyssal-bridge", "ruins-tribunal"];
const sourceManifest=JSON.parse(await fs.readFile("art-source/v33/pit-arenas/production-manifest.json","utf8"));
const extension=sourceManifest.stages.find(stage=>stage.runtimeExtension?.arenaId===arenaId&&stage.runtimeEnabled);
if(extension) knownPlayableIds.push(arenaId);
const conceptPreview=!extension&&/^arena-0(?:09|1[0-9]|20)-[a-z0-9-]+$/.test(arenaId);
assert(knownPlayableIds.includes(arenaId)||conceptPreview,"Only specified production kits may be previewed");
const v34 = !["the-pit", "trophy-hall"].includes(arenaId);
const output = path.resolve(v34 ? "work/v34/arena-browser-qa" : "work/v33/arena-browser-qa", arenaId === "the-pit" ? "." : arenaId);
await fs.mkdir(output, { recursive: true });
const compiled = await build({ stdin: { contents: 'export * from "./app/game/pitArenaProduction"; export * from "./app/game/pitArenaRendering"; export * from "./app/game/pitCombatBitmapArt"; export { createPitCombatState, serializePitCombat, PIT_ARENAS } from "./app/game/systems/pitCombat";', loader: "ts", resolveDir: root }, write: false, bundle: true, format: "iife", globalName: "arenaApi", platform: "browser", logLevel: "silent" });
const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recette renderer THE PIT V33</title><style>body{margin:0;background:#07090c;color:#eee;font:14px system-ui}h1{font:16px system-ui;margin:6px}canvas{display:block;max-width:100%;height:auto}</style></head><body><h1>THE PIT · kit indépendant V33 · harnais de recette du renderer</h1><canvas width="960" height="540"></canvas><script src="/bundle.js"></script></body></html>';
const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    if (pathname === "/") { response.setHeader("Content-Type", "text/html; charset=utf-8"); response.end(html); return; }
    if (pathname === "/bundle.js") { response.setHeader("Content-Type", "text/javascript"); response.end(compiled.outputFiles[0].contents); return; }
    if (pathname === "/favicon.ico") { response.writeHead(204); response.end(); return; }
    if (!pathname.startsWith("/game/") || pathname.includes("..")) { response.writeHead(404); response.end(); return; }
    const file = path.resolve(root, "public", "." + decodeURIComponent(pathname));
    if (!file.startsWith(path.join(root, "public") + path.sep)) { response.writeHead(403); response.end(); return; }
    const bytes = await fs.readFile(file);
    response.setHeader("Content-Type", file.endsWith(".png") ? "image/png" : "image/webp");
    response.end(bytes);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [], failedRequests = [], scenarios = [];
let page;
try {
  page = await browser.newPage({ viewport: { width: 960, height: 570 } });
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => { if (response.status() >= 400) failedRequests.push({ status: response.status(), url: response.url() }); });
  await page.goto(url, { waitUntil: "networkidle" });
  assert.equal(await page.title(), "Recette renderer THE PIT V33");
  assert.equal(await page.locator("canvas").count(), 1);
  const loaded = await page.evaluate(async ({ requestedId, conceptPreview }) => {
    const arenaId=conceptPreview?"the-pit":requestedId;
    const manifest = structuredClone(arenaApi.PIT_ARENA_PRODUCTION_MANIFEST);
    if(conceptPreview){
      const target=manifest.stages.find(stage=>stage.catalogueId===requestedId);
      if(!target||target.legacyRuntimeStatus!=="concept"||target.legacyRuntimeArenaId!==null||target.runtimeEnabled)throw new Error("Invalid concept preview boundary");
      // Local test-only geometry proxy. The source manifest and game remain unchanged.
      manifest.stages=[{...target,legacyRuntimeArenaId:arenaId,legacyRuntimeStatus:"playable",runtimeEnabled:true}];
    }else manifest.stages.find(stage => stage.legacyRuntimeArenaId === arenaId || stage.runtimeExtension?.arenaId === arenaId).runtimeEnabled = true;
    window.arenaBank = await arenaApi.loadPitArenaArt(arenaId, { productionManifest: manifest });
    window.fighterBank = await arenaApi.loadPitCombatBitmapArt(["jungle-hunter", "city-hunter"]);
    window.renderScenario = ({ centerX = 480, centerY = 270, zoom = 1, positions = [330, 630], reducedMotion = false, highContrast = false, frame = 0 } = {}) => {
      const state = arenaApi.createPitCombatState("jungle-hunter", "city-hunter", { mode: "training", arenaId });
      state.frame = frame;
      state.fighters[0].x = positions[0]; state.fighters[1].x = positions[1];
      const snapshot = arenaApi.serializePitCombat(state);
      const camera = { arenaId, centerX, centerY, zoom, targetZoom: zoom, frame, mode: "follow" };
      const beforeCamera = JSON.stringify(camera);
      const context = document.querySelector("canvas").getContext("2d");
      const options = { reducedMotion, highContrast };
      const back = arenaApi.drawPitArenaBackdrop(context, state, camera, window.arenaBank, options);
      context.save();
      context.translate(480 - centerX * zoom, 270 - centerY * zoom);
      context.scale(zoom, zoom);
      const fighters = state.fighters.map(fighter => arenaApi.drawPitCombatBitmapFighter(context, window.fighterBank, fighter, 430, { simulationFrame: frame, combat: state, highContrast }));
      context.restore();
      const front = arenaApi.drawPitArenaForeground(context, state, camera, window.arenaBank, options);
      return { planes: [...back.drawnPlanes, ...front.drawnPlanes], missing: [...back.missingPaths, ...front.missingPaths], fighters, unchangedState: snapshot === arenaApi.serializePitCombat(state), unchangedCamera: beforeCamera === JSON.stringify(camera) };
    };
    return { independentKit: Boolean(window.arenaBank.productionKit), images: window.arenaBank.images.size, expectedImages: window.arenaBank.productionKit?.paths.length, failed: [...window.arenaBank.failedPaths], fighterFailures: [...window.fighterBank.failedIds] };
  }, {requestedId:arenaId,conceptPreview});
  assert.equal(loaded.independentKit, true);
  assert.equal(loaded.images, loaded.expectedImages);
  assert(loaded.images >= 14);
  assert.deepEqual(loaded.failed, []);
  assert.deepEqual(loaded.fighterFailures, []);
  for (const [name, options] of [
    ["center", {}],
    ["close", { zoom: 1.55, centerY: 275, positions: [410, 550] }],
    ["left-corner", { centerX: 280, zoom: 1.45, positions: [110, 220] }],
    ["right-corner", { centerX: 680, zoom: 1.45, positions: [740, 850] }],
    ["wide", { zoom: .8, positions: [100, 860] }],
    ["reduced-motion", { zoom: .9, reducedMotion: true, frame: 20 }],
    ["high-contrast", { highContrast: true }],
    [arenaId === "the-pit" ? "flame-second-drawing" : "next-simulation-frame", { frame: 8 }],
  ]) {
    const report = await page.evaluate(options => window.renderScenario(options), options);
    assert.deepEqual(report.planes, ["P0", "P1", "P2", "P3", "P4", "P5"]);
    assert.deepEqual(report.missing, []);
    assert.deepEqual(report.fighters, [true, true]);
    assert(report.unchangedState && report.unchangedCamera);
    await page.locator("canvas").screenshot({ path: path.join(output, name + ".png") });
    scenarios.push({ name, ...report });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.renderScenario());
  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  assert(noOverflow);
  await page.screenshot({ path: path.join(output, "mobile.png"), fullPage: true });
  assert.deepEqual(errors, []);
  assert.deepEqual(failedRequests, []);
  const report = { result: "PASS", arenaId, conceptPreview, playablePromotion:false, checkedAt: new Date().toISOString(), surface: "isolated-renderer-with-real-game-fighters-and-images", applicationFlowVerified: false, loaded, scenarios, mobileNoOverflow: noOverflow, errors, failedRequests, evidenceDirectory: path.relative(root, output).replaceAll("\\", "/"), limit: "Controlled Chromium renderer harness. Full-app navigation, physical hardware cadence, gamepad and deployment are not certified here." };
  await fs.writeFile(extension ? `docs/v34-${arenaId}-runtime-renderer-qa.json` : v34 ? `docs/v34-${arenaId}-renderer-qa.json` : arenaId === "the-pit" ? "docs/v33-arena-renderer-qa.json" : "docs/v33-trophy-hall-renderer-qa.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
} catch (error) {
  if (page) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true });
  await fs.writeFile(path.join(output, "failure.json"), JSON.stringify({ error: String(error), errors, failedRequests }, null, 2));
  throw error;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
