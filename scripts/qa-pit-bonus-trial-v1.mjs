/** Actual PitCanvas, actual 60 Hz combat and keyboard play. No injected victories or objective progress.
 * PIT_QA_CHROMIUM=/path/to/chromium PIT_QA_ASSETS=/path/to/public node scripts/qa-pit-bonus-trial-v1.mjs
 * PIT_QA_MATERIALIZE_ASSETS=1 optionally reads missing original asset bytes from HEAD into the temporary harness.
 * PIT_QA_OUTPUT selects the report/capture directory. No installs or application source edits.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import crypto from "node:crypto";

const repo = path.resolve(process.env.PIT_QA_REPO || path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const require = createRequire(repo + "/package.json"), { build } = require("esbuild"), { chromium } = require("playwright-core");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "pit-bonus-qa-"));
const output = path.resolve(process.env.PIT_QA_OUTPUT || temporary + "/output");
fs.mkdirSync(output, { recursive: true });
const report = { schema: "pit-bonus-real-canvas-v1", startedAt: new Date().toISOString(),
  scope: "Real PitCanvas selection and combat, original assets; bonus progress is earned through keyboard input. Synthetic Gamepad snapshots only exercise real navigator polling and menu routing.",
  checks: [], pageErrors: [], httpFailures: [], assetsMaterialized: [], screenshots: [], sourceHashes: {} };
for (const name of ["app/game/PitCanvas.tsx", "app/game/PitBonusTrialPanelV1.tsx", "app/game/PitBonusTrialPanelV1.module.css", "app/game/systems/pitBonusTrialV1.ts", "app/game/systems/pitBonusRecordsV1.ts"]) {
  report.sourceHashes[name] = crypto.createHash("sha256").update(fs.readFileSync(path.join(repo, name))).digest("hex");
}
const fixture = `import React from 'react';
import {createRoot} from 'react-dom/client';
import PitCanvas from '${repo}/app/game/PitCanvas';
import {DEFAULT_CONTROL_BINDINGS} from '${repo}/app/game/systems/controlBindings';
import {loadPitArenaArt} from '${repo}/app/game/pitArenaRendering';
const params=new URLSearchParams(location.search);
window.__pitBonusQa={matchResults:[],runTransitions:[],exits:0,pad:null,inspectArena:()=>loadPitArenaArt('the-pit')};
Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__pitBonusQa.pad?[window.__pitBonusQa.pad]:[]});
createRoot(document.getElementById('root')).render(<PitCanvas controlBindings={DEFAULT_CONTROL_BINDINGS}
  highContrast={false} reducedGore={true} screenShake={false}
  bonusRecordOwnerCreatedAt="2026-11-27T08:00:00.000Z"
  initialHonorRoute={params.get('route')==='circuit'?{mode:'circuit',fighterId:'wolf',chapterId:'judgment'}:undefined}
  onExit={()=>{window.__pitBonusQa.exits++}}
  onMatchComplete={result=>{window.__pitBonusQa.matchResults.push(result);return {persisted:false,message:'QA must not receive bonus duel results'}}}
  onRunTransition={result=>{window.__pitBonusQa.runTransitions.push(result);return {persisted:false,message:'QA must not receive bonus route transitions'}}}
/>);`;
fs.writeFileSync(temporary + "/App.tsx", fixture);
await build({ entryPoints: [temporary + "/App.tsx"], bundle: true, platform: "browser", format: "iife", target: "es2022",
  outfile: temporary + "/app.js", jsx: "automatic", loader: { ".module.css": "local-css" },
  external: ["/game/*"], nodePaths: [repo + "/node_modules"], define: { "process.env.NODE_ENV": '"production"' }, logLevel: "warning" });
fs.writeFileSync(temporary + "/index.html", '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>THE PIT — bonus QA</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/app.css"><style>html,body,#root{margin:0;min-width:0;min-height:100%;background:#07100c;color:#e9e1ca;font-family:Arial,sans-serif}*{box-sizing:border-box}button{font:inherit}</style><div id="root"></div><script src="/app.js"></script></html>');
const assetRoot = path.resolve(process.env.PIT_QA_ASSETS || repo + "/public");
// Cold git blob retrieval is outside browser timeouts, never part of the image server.
if (process.env.PIT_QA_MATERIALIZE_ASSETS === "1") {
  const assetBundle = await build({ stdin: { contents: `export {PIT_SPRITE_SHEET_REGISTRY} from '${repo}/app/game/pitSpriteSheetRegistry'; export {getPitArenaArtPaths} from '${repo}/app/game/pitArenaRendering'; export {getPitCombatBitmapArtDefinition} from '${repo}/app/game/pitCombatBitmapArt';`, resolveDir: repo }, bundle: true, write: false, platform: "node", format: "esm" });
  const registry = await import("data:text/javascript;base64," + Buffer.from(assetBundle.outputFiles[0].text).toString("base64"));
  const fighters = ["jungle-hunter", "berserker", "city-hunter", "wolf"];
  const paths = new Set([...registry.getPitArenaArtPaths("the-pit"),
    ...fighters.map(id => registry.getPitCombatBitmapArtDefinition(id)?.src).filter(Boolean),
    ...registry.PIT_SPRITE_SHEET_REGISTRY.filter(entry => fighters.includes(entry.fighterId) && entry.variantId === undefined).flatMap(entry => entry.atlas.pages.map(page => page.src))]);
  for (const src of paths) {
    if (fs.existsSync(path.join(assetRoot, src))) continue;
    const bytes = execFileSync("git", ["show", "HEAD:public" + src], { cwd: repo, maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
    const target = path.join(temporary, "public", src);
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes);
    report.assetsMaterialized.push({ path: src, bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
  }
  console.log("Original arena/fighter assets prepared before browser launch.");
}
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };
const server = http.createServer(async (request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); } catch { response.writeHead(400).end(); return; }
  if (pathname.includes("..")) { response.writeHead(400).end(); return; }
  try {
    let target = path.join(pathname.startsWith("/game/") ? assetRoot : temporary, pathname === "/" ? "index.html" : pathname);
    if (pathname.startsWith("/game/") && !fs.existsSync(target) && fs.existsSync(path.join(temporary, "public", pathname))) target = path.join(temporary, "public", pathname);
    if (pathname.startsWith("/game/") && !fs.existsSync(target) && process.env.PIT_QA_MATERIALIZE_ASSETS === "1") {
      target = path.join(temporary, "public", pathname);
      if (!fs.existsSync(target)) {
        const bytes = execFileSync("git", ["show", "HEAD:public" + pathname], { cwd: repo, maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
        fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes);
        report.assetsMaterialized.push({ path: pathname, bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
      }
    }
    const bytes = await fs.promises.readFile(target);
    response.writeHead(200, { "content-type": mime[path.extname(target)] || "application/octet-stream" }); response.end(bytes);
  } catch { response.writeHead(404).end("Original QA asset unavailable: " + pathname); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = "http://127.0.0.1:" + server.address().port;
let browser, diagnosticPage;
const writeReport = () => fs.writeFileSync(output + "/report.json", JSON.stringify(report, null, 2));
async function check(name, run) {
  try { const details = await run(); report.checks.push({ name, status: "pass", details }); console.log("PASS " + name); }
  catch (error) {
    const state = diagnosticPage ? await diagnosticPage.evaluate(() => ({ panel: document.querySelector("[data-pit-bonus]")?.outerHTML,
      activeElement: document.activeElement?.outerHTML?.slice(0, 250), frame: document.querySelector("[data-pit-frame]")?.getAttribute("data-pit-frame") })).catch(() => null) : null;
    report.checks.push({ name, status: "fail", error: error.message, state }); console.log("FAIL " + name + ": " + error.message);
  }
  writeReport();
}
try {
  browser = await chromium.launch({ executablePath: process.env.PIT_QA_CHROMIUM || chromium.executablePath(), headless: true,
    args: process.env.PIT_QA_CHROMIUM_ARGS_JSON ? JSON.parse(process.env.PIT_QA_CHROMIUM_ARGS_JSON) : ["--no-sandbox", "--disable-dev-shm-usage"] });
  report.browserVersion = await browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  diagnosticPage = page;
  page.on("pageerror", error => report.pageErrors.push(error.message));
  page.on("response", response => { if (response.status() >= 400) report.httpFailures.push({ url: response.url(), status: response.status() }); });
  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  const panel = page.locator("[data-pit-bonus]");
  const snapshot = () => panel.evaluate(element => ({ status: element.dataset.pitBonus, stage: element.dataset.bonusStage,
    ticks: Number(element.dataset.bonusTicks), completed: Number(element.dataset.bonusCompleted), mistakes: Number(element.dataset.bonusErrors) }));
  const capture = async name => { await page.screenshot({ path: output + "/" + name + ".png", fullPage: true }); report.screenshots.push(name + ".png"); };
  await check("actual selection confirms player, opponent and arena before training", async () => {
    await page.getByRole("radio", { name: /Entraînement/ }).click();
    await page.locator("[data-pit-selection-confirm]").click();
    await page.locator("[data-pit-selection-confirm]").click();
    await page.waitForFunction(() => document.querySelector("[data-pit-stage-preview]")?.getAttribute("data-preview-status") === "ready", null, { timeout: 120000 });
    if (await page.locator("[data-pit-selection-confirm]").isDisabled()) {
      report.arenaProbe = await page.evaluate(async () => { const bank = await window.__pitBonusQa.inspectArena(); return { images: bank.images.size, requested: [...bank.requestedPaths], failed: [...bank.failedPaths], cancelled: bank.cancelled, unavailable: bank.unavailable, notice: document.querySelector("[data-pit-scene-assets]")?.textContent }; });
      writeReport();
    }
    await page.locator("[data-pit-selection-confirm]:enabled").waitFor({ timeout: 30000 });
    await page.locator("[data-pit-selection-confirm]").click();
    await page.locator("[data-bonus-launch]").waitFor({ timeout: 120000 });
    await page.waitForFunction(() => document.querySelector("[data-pit-immersive]")?.getAttribute("data-pit-simulation-blocked") === "false", null, { timeout: 120000 });
    assert.equal(await page.locator("[data-pit-immersive]").getAttribute("data-pit-combat-phase"), "round");
  });
  if (report.checks.at(-1)?.status === "fail") { await capture("bonus-selection-blocked"); throw new Error("Training launch blocked; inspect arenaProbe and screenshot before dependent scenarios."); }
  await check("bonus briefing stays frozen and requires explicit keyboard start", async () => {
    await page.locator("[data-bonus-launch]").click();
    await page.locator("[data-bonus-begin]:enabled").waitFor({ timeout: 120000 });
    const before = await snapshot(); await page.waitForTimeout(800); assert.deepEqual(await snapshot(), before);
    assert.equal(before.status, "briefing"); assert.equal(before.ticks, 0);
    await capture("bonus-briefing-desktop");
    await panel.focus(); await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("[data-pit-bonus]")?.getAttribute("data-pit-bonus") === "running");
    await page.keyboard.down("o"); await capture("bonus-running-desktop"); await page.keyboard.up("o");
  });
  await check("pause, blur and restart discard elapsed wall time and held inputs", async () => {
    await page.keyboard.down("o"); await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelector("[data-pit-immersive]")?.getAttribute("data-pit-paused") === "true");
    const paused = await snapshot(); await page.waitForTimeout(700); assert.deepEqual(await snapshot(), paused);
    await page.keyboard.up("o"); await page.locator("[data-pit-resume]").click();
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.waitForFunction(() => document.querySelector("[data-pit-immersive]")?.getAttribute("data-pit-paused") === "true");
    const blurred = await snapshot(); await page.waitForTimeout(500); assert.deepEqual(await snapshot(), blurred);
    await page.locator("[data-pit-resume]").click();
    await page.locator("[data-bonus-restart]").click();
    assert.deepEqual(await snapshot(), { status: "briefing", stage: "signal", ticks: 0, completed: 0, mistakes: 0 });
  });
  await check("four real keyboard blocks and counters produce success with no duel callback", async () => {
    await panel.focus(); await page.keyboard.press("Enter"); await page.keyboard.down("o");
    for (let step = 0; step < 4; step++) {
      await page.waitForFunction(() => document.querySelector("[data-pit-bonus]")?.getAttribute("data-bonus-stage") === "counter");
      const openingTick = (await snapshot()).ticks;
      await page.keyboard.up("o"); await page.keyboard.down("d");
      await page.waitForFunction(tick => Number(document.querySelector("[data-pit-bonus]")?.getAttribute("data-bonus-ticks")) >= tick + 24, openingTick);
      await page.keyboard.press("j", { delay: 80 }); await page.keyboard.up("d");
      await page.waitForFunction(completed => Number(document.querySelector("[data-pit-bonus]")?.getAttribute("data-bonus-completed")) === completed, step + 1);
      if (step < 3) await page.keyboard.down("o");
    }
    assert.equal((await snapshot()).status, "success"); assert.equal((await snapshot()).mistakes, 0);
    assert.equal(await page.evaluate(() => window.__pitBonusQa.matchResults.length + window.__pitBonusQa.runTransitions.length), 0);
    assert.equal(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith("yautja-long-hunt.the-pit")).length), 0);
    await capture("bonus-success-desktop"); return await snapshot();
  });
  await check("record opt-in, idempotence and reload preserve only the separate personal best", async () => {
    await page.locator("[data-bonus-save]").click(); assert.equal(await page.locator("[data-bonus-save]").isDisabled(), true);
    const saved = await page.evaluate(() => Object.entries(localStorage)); assert.equal(saved.length, 1);
    assert.match(saved[0][0], /the-pit-bonus\.v1\./); assert.equal(JSON.parse(saved[0][1]).best.standard.mistakes, 0);
    await page.locator("[data-bonus-restart]").click(); assert.equal((await snapshot()).completed, 0);
    assert.match(await panel.innerText(), /Record standard/);
    await page.locator("[data-bonus-abandon]").click(); assert.equal(await panel.count(), 0);
    assert.equal(await page.locator("[data-bonus-launch]").isEnabled(), true);
    assert.deepEqual(await page.evaluate(() => Object.entries(localStorage)), saved);
    await page.reload({ waitUntil: "networkidle" });
    assert.deepEqual(await page.evaluate(() => Object.entries(localStorage)), saved);
    assert.equal(await page.locator("[data-pit-selection-immersive]").count(), 1);
  });
  await check("honor route preselects the real circuit without launching or skipping to its goal", async () => {
    await page.goto(base + "/?route=circuit", { waitUntil: "networkidle" });
    assert.equal(await page.getByRole("radio", { name: /Circuit du clan/ }).getAttribute("aria-checked"), "true");
    assert.match(await page.locator("[data-pit-honor-route-goal]").innerText(), /Jugement/);
    assert.equal(await page.locator("[data-pit-immersive]").count(), 0);
    assert.equal(await page.evaluate(() => window.__pitBonusQa.matchResults.length + window.__pitBonusQa.runTransitions.length), 0);
  });
  await check("mobile briefing remains within viewport with reachable native buttons", async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto(base, { waitUntil: "networkidle" });
    await page.getByRole("radio", { name: /Entraînement/ }).click();
    await page.locator("[data-pit-selection-confirm]").click(); await page.locator("[data-pit-selection-confirm]").click();
    await page.waitForFunction(() => document.querySelector("[data-pit-stage-preview]")?.getAttribute("data-preview-status") === "ready");
    await page.locator("[data-pit-selection-confirm]").click(); await page.locator("[data-bonus-launch]").click();
    await page.locator("[data-bonus-begin]:enabled").waitFor();
    const box = await panel.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= 391 && box.height <= 844, JSON.stringify(box));
    assert.ok((await page.locator("[data-bonus-begin]").boundingBox()).height >= 44);
    await capture("bonus-briefing-mobile");
    await page.getByRole("button", { name: /Timing accompagné/ }).click();
    assert.equal(await panel.getAttribute("data-bonus-difficulty"), "assisted");
  });
  await check("neutral gamepad polling starts briefing with A and returns with B after restart", async () => {
    const setPad = async button => page.evaluate(button => { window.__pitBonusQa.pad = { id: "QA standard pad", index: 0, connected: true, mapping: "standard", timestamp: performance.now(), axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, index) => ({ pressed: index === button, touched: index === button, value: index === button ? 1 : 0 })) }; }, button);
    await panel.focus(); await setPad(-1); await page.waitForTimeout(100); await setPad(0); await page.waitForTimeout(80); await setPad(-1);
    assert.equal((await snapshot()).status, "running");
    await page.locator("[data-bonus-restart]").click(); await page.waitForTimeout(100);
    await setPad(1); await page.waitForTimeout(80); await setPad(-1); assert.equal(await panel.count(), 0);
    assert.equal(await page.evaluate(() => window.__pitBonusQa.matchResults.length + window.__pitBonusQa.runTransitions.length), 0);
  });
  await context.close();
} finally {
  report.finishedAt = new Date().toISOString();
  report.summary = { passed: report.checks.filter(check => check.status === "pass").length, failed: report.checks.filter(check => check.status === "fail").length, pageErrors: report.pageErrors.length, httpFailures: report.httpFailures.length };
  writeReport(); await browser?.close(); await new Promise(resolve => server.close(resolve));
  console.log(JSON.stringify({ output, ...report.summary }));
}
if (report.summary.failed || report.pageErrors.length || report.httpFailures.length) process.exitCode = 1;
