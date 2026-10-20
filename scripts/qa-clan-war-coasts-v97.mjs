import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright-core";

// Capture actual application screenshots; the neutral silhouette generator is
// a separate supplementary artifact. Never overwrite the accepted before set.
const phaseArgument = process.argv.find(value => value.startsWith("--phase="));
const phaseIndex = process.argv.indexOf("--phase");
const phase = phaseArgument?.slice("--phase=".length) ?? (phaseIndex >= 0 ? process.argv[phaseIndex + 1] : "after");
assert.ok(["before", "after"].includes(phase), "Use --phase=before or --phase=after");
const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? "http://127.0.0.1:3000";
const outputRoot = path.resolve(process.env.YAUTJA_COASTS_QA_OUTPUT ?? "outputs/qa-planet-coasts-v97");
const output = path.join(outputRoot, phase);
if (phase === "before") {
  const exists = await fs.access(path.join(output, "manifest.json")).then(() => true, () => false);
  assert.equal(exists, false, "The accepted before capture is frozen; use a different YAUTJA_COASTS_QA_OUTPUT for another baseline");
}
const ids = ["korthas", "thalassa", "vitriol", "nivalis", "serak", "amethys", "mycelia", "cryovant"];
const fingerprint = async () => Object.fromEntries(await Promise.all([
  "app/game/systems/clanWarPlanetsV96.ts", "app/game/systems/clanWarCoastlinesV97.ts", "app/game/ClanWarAtlasV95.tsx",
].map(async file => [file, await fs.readFile(file).then(buffer => createHash("sha256").update(buffer).digest("hex"), () => null)])));
const sourceBefore = await fingerprint();
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" });
await context.addInitScript(() => {
  window.__yautjaCoastLongTasksV97 = [];
  if (typeof PerformanceObserver === "function") {
    try { new PerformanceObserver(list => window.__yautjaCoastLongTasksV97.push(...list.getEntries().map(entry => ({ start: entry.startTime, duration: entry.duration })))).observe({ type: "longtask", buffered: true }); }
    catch { /* The interaction duration remains useful if long tasks are unsupported. */ }
  }
});
const page = await context.newPage(); page.setDefaultTimeout(30000);
const errors = [], steps = [], interactions = [];
page.on("pageerror", error => errors.push(error.message));
const atlas = () => page.getByTestId("clan-war-atlas-v95");
const selector = () => page.getByTestId("war-planet-selector-v96");
async function click(control) { await control.ariaSnapshot(); await control.click(); }
async function selectWorld(id) {
  const control = selector().getByRole("combobox", { name: "Planète active", exact: true });
  await control.ariaSnapshot(); await control.selectOption(id);
  await page.waitForFunction(id => document.querySelector('[data-testid="clan-war-atlas-v95"]')?.getAttribute("data-planet-id") === id, id);
}
async function measure(control, eventType, condition, value, action, label, viewport) {
  // Start inside the real browser event, excluding Playwright's pointer/focus
  // preparation. Finish after the expected DOM state and two animation frames.
  await control.evaluate((element, { eventType, condition, value }) => {
    window.__yautjaCoastPendingV97 = new Promise(resolve => {
      element.addEventListener(eventType, () => {
        const started = performance.now();
        const expected = () => condition === "world"
          ? document.querySelector('[data-testid="clan-war-atlas-v95"]')?.getAttribute("data-planet-id") === value
          : condition === "source"
            ? document.querySelector('svg g[data-source="true"]')?.getAttribute("data-territory-id") === value
            : document.querySelector('input[aria-label="Longitude du globe"]')?.value !== value;
        const wait = () => {
          if (performance.now() - started > 5000) { resolve({ timedOut: true }); return; }
          if (!expected()) { requestAnimationFrame(wait); return; }
          requestAnimationFrame(() => requestAnimationFrame(() => {
            const ended = performance.now();
            const tasks = (window.__yautjaCoastLongTasksV97 ?? []).filter(task => task.start < ended && task.start + task.duration > started);
            resolve({ durationMs: Number((ended - started).toFixed(2)), longTasks: tasks.length, longestTaskMs: Number(Math.max(0, ...tasks.map(task => task.duration)).toFixed(2)) });
          }));
        };
        requestAnimationFrame(wait);
      }, { capture: true, once: true });
    });
  }, { eventType, condition, value });
  await action();
  const result = await page.evaluate(() => window.__yautjaCoastPendingV97);
  assert.ok(!result.timedOut, `${viewport}: ${label} did not update its visible state`);
  interactions.push({ viewport, action: label, ...result });
}
async function measureViewport(viewport, width, height) {
  await page.setViewportSize({ width, height });
  await selectWorld("korthas");
  await click(atlas().getByRole("button", { name: "◎ Globe", exact: true }));
  for (let turn = 0; turn < 3; turn++) {
    const rotation = atlas().getByRole("button", { name: "Tourner vers l’est", exact: true });
    const before = await atlas().getByRole("slider", { name: "Longitude du globe", exact: true }).inputValue();
    await measure(rotation, "click", "rotation", before, () => rotation.click(), "rotation east", viewport);
  }
  await click(atlas().getByRole("button", { name: "▱ Planisphère", exact: true }));
  for (const id of ["CON-T03", "CON-T04", "CON-T02"]) {
    const zone = atlas().locator(`svg g[data-territory-id="${id}"]`);
    await measure(zone, "keydown", "source", id, () => zone.press("Enter"), `keyboard territory ${id}`, viewport);
  }
  for (const id of [viewport === "desktop" ? "uranth" : "nyctera", "korthas"]) {
    const control = selector().getByRole("combobox", { name: "Planète active", exact: true });
    await measure(control, "change", "world", id, () => control.selectOption(id), `switch world ${id}`, viewport);
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${viewport}: horizontal overflow`);
}

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await click(page.getByRole("button", { name: /^Guerres des clans/ }));
  await click(page.getByRole("button", { name: "Accéder malgré les spoilers", exact: true }));
  await atlas().waitFor();
  for (const [index, id] of ids.entries()) {
    await selectWorld(id);
    await click(atlas().getByRole("button", { name: "◎ Globe", exact: true }));
    const prefix = `${String(index + 1).padStart(2, "0")}-${id}`;
    const longitude = await atlas().getByRole("slider", { name: "Longitude du globe", exact: true }).inputValue();
    const cameraCaption = (await atlas().locator("svg").textContent()).match(/LON[^<]*?LAT -?\d+°/)?.[0] ?? "";
    await atlas().locator("svg").screenshot({ path: path.join(output, `${prefix}-globe.png`) });
    await click(atlas().getByRole("button", { name: "▱ Planisphère", exact: true }));
    assert.equal(await atlas().locator("svg g[data-territory-id]").count(), 36, `${id}: every playable territory is still visible`);
    const massCount = Number(await atlas().getAttribute("data-landmass-count"));
    const coasts = atlas().getByTestId("war-planet-coastlines");
    assert.equal(await coasts.getAttribute("pointer-events"), "none");
    assert.equal(await coasts.locator("path").count(), massCount);
    assert.ok(massCount >= 2 && massCount <= 6);
    const paths = await coasts.locator("path").evaluateAll(items => items.map(item => item.getAttribute("d")));
    assert.ok(paths.every(item => item && !/NaN|Infinity/.test(item)), `${id}: finite complete coastline`);
    await atlas().locator("svg").screenshot({ path: path.join(output, `${prefix}-map.png`) });
    await atlas().screenshot({ path: path.join(output, `${prefix}-atlas.png`) });
    const step = { step: index + 1, planetId: id, continents: massCount, regions: 6, territories: 36, longitude, cameraCaption, framing: "100% globe centered on actual T02, full global planisphere; territory geography can change the globe camera", globe: `${prefix}-globe.png`, map: `${prefix}-map.png`, atlas: `${prefix}-atlas.png` };
    if (["thalassa", "nivalis"].includes(id)) {
      await page.setViewportSize({ width: 390, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${id}: mobile overflow`);
      await atlas().screenshot({ path: path.join(output, `${prefix}-mobile-map.png`) });
      step.mobile = `${prefix}-mobile-map.png`;
      await page.setViewportSize({ width: 1440, height: 1050 });
    }
    steps.push(step);
    console.log(JSON.stringify({ captured: id, continents: massCount, territories: 36 }));
  }
  await measureViewport("desktop", 1440, 1050);
  await measureViewport("mobile viewport", 390, 844);
  assert.deepEqual(await fingerprint(), sourceBefore, "Geography changed during capture; repeat after sources have settled");
  assert.deepEqual(errors, []);
  const result = { status: "PASS", phase, capturedAt: new Date().toISOString(), source: "actual application via normal menu; no simulation or camera state injection", viewport: { width: 1440, height: 1050 }, sourceFingerprints: sourceBefore, steps, interactions, performanceLimits: "Chromium headless on the same cloud CPU for both viewport sizes; durations run from browser event to expected DOM state and two animation frames. This measures response latency, not FPS or physical phone performance.", errors };
  await fs.rm(path.join(output, "failure.png"), { force: true });
  await fs.writeFile(path.join(output, "manifest.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ status: "PASS", phase, planets: steps.length, interactions: interactions.length, maxInteractionMs: Math.max(...interactions.map(item => item.durationMs)), output }));
} catch (error) {
  await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
  await fs.writeFile(path.join(output, "manifest.json"), JSON.stringify({ status: "FAIL", phase, capturedAt: new Date().toISOString(), sourceFingerprints: sourceBefore, steps, interactions, errors, failure: String(error) }, null, 2) + "\n");
  console.error(error); process.exitCode = 1;
} finally { await context.close(); await browser.close(); }
