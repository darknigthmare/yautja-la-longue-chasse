import { returnPitSelection, openPitLaboratory } from "./pit-selection-browser-helpers.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const root = await fs.realpath(process.cwd());
const url = new URL(process.env.V39_QA_URL || "http://127.0.0.1:4174");
assert(["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash);
const output = path.resolve(root, process.env.V39_BRIEFING_QA_OUTPUT || "work/v39/pit-flow/browser-qa");
const relative = path.relative(root, output);
assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
let directory = root;
for (const part of relative.split(path.sep)) {
  directory = path.join(directory, part);
  await fs.mkdir(directory).catch(error => { if (error.code !== "EEXIST") throw error; });
  const info = await fs.lstat(directory);
  assert(info.isDirectory() && !info.isSymbolicLink() && path.relative(directory, await fs.realpath(directory)) === "");
}
const report = { passed: false, checkedAt: new Date().toISOString(), url: url.href, version: "V39", checks: [], errors: [], failures: [], intentionallyFailedImages: [] };
const browser = await chromium.launch({ channel: "chrome", headless: true });
let page, releaseCold;
try {
  const initializeFixture = () => {
    const key = "yautja-long-hunt.save";
    if (location.protocol.startsWith("http") && localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify({
      version: 7, createdAt: "2026-09-19T12:00:00.000Z", updatedAt: "2026-09-19T12:00:00.000Z",
      profile: { hunterName: "Briefing QA V39", rankId: "elder", honor: 1900, clanMarks: 83, playTimeSeconds: 4321 },
      missionProgress: {}, statistics: { missionsStarted: 19, missionsCompleted: 17, missionsFailed: 2 },
      settings: { difficultyId: "hunter", masterVolume: 0, musicVolume: 0, effectsVolume: 0 },
    }));
    window.__briefingPad = null;
    Object.defineProperty(navigator, "getGamepads", { value: () => window.__briefingPad ? [window.__briefingPad] : [] });
  };
  let context = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: true, acceptDownloads: false });
  await context.addInitScript(initializeFixture);
  let holdCity = false, failCity = false, heldRequests = 0;
  const coldReleased = new Promise(resolve => { releaseCold = resolve; });
  const handleSprites = async route => {
    const city = new URL(route.request().url()).pathname.includes("city-hunter");
    if (city && holdCity) { heldRequests++; await coldReleased; }
    if (city && failCity) { report.intentionallyFailedImages.push(route.request().url()); await route.abort("failed"); }
    else await route.continue();
  };
  await context.route("**/game/sprites/**", handleSprites);
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  const observe = current => {
    current.on("pageerror", error => report.errors.push(error.message));
    current.on("response", response => { if (response.status() >= 400) report.failures.push({ url: response.url(), status: response.status() }); });
    current.on("requestfailed", request => {
    const error = request.failure()?.errorText ?? "unknown";
    if (!error.includes("ERR_ABORTED") && !(failCity && request.url().includes("city-hunter"))) report.failures.push({ url: request.url(), error });
  });
  };
  observe(page);
  await page.goto(url.href, { waitUntil: "networkidle", timeout: 120000 });
  await page.locator('[data-game-content-version="V39"]').waitFor();
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await page.getByRole("button", { name: "THE PIT · combat", exact: true }).click();
  const storage = () => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a], [b]) => a.localeCompare(b)))));
  const before = await storage();
  assert.match(before, /Briefing QA V39/);
  await page.evaluate(() => {
    window.__briefingWrites = [];
    for (const method of ["setItem", "removeItem", "clear"]) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        if (this === localStorage) window.__briefingWrites.push({ method, key: args[0] ?? null });
        return original.apply(this, args);
      };
    }
  });
  const enter = async (fighterId = "jungle-hunter") => {
    await page.getByRole("radio", { name: /Entraînement/ }).click();
    await page.getByRole("combobox", { name: "Combattant joueur", exact: true }).selectOption(fighterId);
    await page.getByRole("combobox", { name: "Adversaire", exact: true }).selectOption("berserker");
    await page.getByRole("button", { name: /^ENTRER DANS L’ARÈNE/ }).click();
    await page.locator('canvas[data-pit-arena-art-status="bitmap"]').waitFor({ timeout: 60000 });
    await openPitLaboratory(page);
    const lab = page.getByRole("complementary", { name: "Laboratoire d’entraînement", exact: true });
    const summary = lab.locator("summary", { hasText: "Exercices guidés" });
    if (await summary.locator("..").getAttribute("open") === null) await summary.click();
    return lab;
  };
  let lab = await enter();
  holdCity = true;
  await lab.getByRole("button", { name: "Garde basse", exact: true }).click();
  let briefing = page.getByRole("group", { name: "Préparation de l’exercice", exact: true });
  await page.locator('[data-training-briefing="loading"]').waitFor();
  assert.equal(await briefing.getByRole("button", { name: "Commencer l’exercice", exact: true }).isDisabled(), true);
  const frame = () => page.locator("[data-pit-frame]").getAttribute("data-pit-frame").then(Number);
  await briefing.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2200);
  assert(heldRequests > 0, "New dummy assets must actually be held by the cold-load fixture.");
  assert.equal(await frame(), 0);
  assert.equal(await lab.getByRole("button", { name: "Avancer d’un tick", exact: true }).isDisabled(), true);
  assert.equal(await lab.getByRole("button", { name: "Reprendre la simulation", exact: true }).isDisabled(), true);
  assert.match(await lab.locator('[data-status="briefing"]').innerText(), /0 s \/ 30 s/);
  await page.screenshot({ path: path.join(output, "cold-loading.png"), fullPage: true });
  holdCity = false; releaseCold();
  await page.locator('[data-training-briefing="ready"]').waitFor({ timeout: 30000 });
  await page.waitForTimeout(600);
  assert.equal(await frame(), 0, "Finished loading must never auto-start the lesson.");
  assert.match(await briefing.innerText(), /O \/ LT \/ GARDE ↓/);
  report.checks.push({ name: "cold-loading-and-reading", heldRequests, frameBeforeStart: 0, noManualBypass: true });
  await briefing.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Combat THE PIT");
  await page.keyboard.down("KeyO");
  try { await lab.locator('[data-status="success"]').waitFor({ timeout: 12000 }); }
  finally { await page.keyboard.up("KeyO"); }
  assert.match(await lab.locator('[data-status="success"]').innerText(), /Étapes : 3\/3/);
  report.checks.push({ name: "explicit-keyboard-start", realLowBlocks: 3, focusRestored: true });
  await page.screenshot({ path: path.join(output, "exercise-success.png"), fullPage: true });

  const pad = async (a, b = false) => page.evaluate(({ a, b }) => {
    window.__briefingPad = { axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 0 ? a : i === 1 ? b : false })) };
  }, { a, b });
  await pad(true);
  await lab.getByRole("button", { name: "Recommencer l’exercice", exact: true }).click();
  await briefing.waitFor();
  await page.waitForTimeout(350);
  assert.equal(await frame(), 0, "A already held cannot start the next exercise.");
  await pad(false); await page.waitForTimeout(100); await pad(true);
  await lab.locator('[data-status="running"]').waitFor();
  await pad(false);
  await lab.getByRole("button", { name: "Déchoppe", exact: true }).click();
  await briefing.waitFor();
  await page.waitForTimeout(100); await pad(false, true);
  await briefing.waitFor({ state: "detached" });
  await pad(false);
  report.checks.push({ name: "gamepad-rearm-retry-cancel", heldARejected: true, freshAStarts: true, bReturnsToFreeTraining: true });
  await returnPitSelection(page);

  assert.equal(await storage(), before);
  assert.deepEqual(await page.evaluate(() => window.__briefingWrites), []);
  await context.close();
  failCity = true;
  context = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: true, acceptDownloads: false });
  await context.addInitScript(initializeFixture);
  await context.route("**/game/sprites/**", handleSprites);
  page = await context.newPage();
  page.setDefaultTimeout(20000); observe(page);
  await page.goto(url.href, { waitUntil: "networkidle", timeout: 120000 });
  await page.locator('[data-game-content-version="V39"]').waitFor();
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await page.getByRole("button", { name: "THE PIT · combat", exact: true }).click();
  await page.evaluate(() => {
    window.__briefingWrites = [];
    for (const method of ["setItem", "removeItem", "clear"]) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        if (this === localStorage) window.__briefingWrites.push({ method, key: args[0] ?? null });
        return original.apply(this, args);
      };
    }
  });
  briefing = page.getByRole("group", { name: "Préparation de l’exercice", exact: true });
  lab = await enter();
  assert.equal(await lab.locator('[data-status="briefing"]').count(), 0, "Leaving and reentering must not restore an old lesson.");
  await lab.getByRole("button", { name: "Garde basse", exact: true }).click();
  await page.locator('[data-training-briefing="degraded"]').waitFor({ timeout: 20000 });
  assert.match(await briefing.innerText(), /visuels sont indisponibles|délai/);
  assert.equal(await frame(), 0);
  assert(report.intentionallyFailedImages.length > 0);
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(output, "mobile-degraded.png"), fullPage: true });
  await briefing.getByRole("button", { name: "Commencer l’exercice", exact: true }).tap();
  await page.waitForFunction(() => Number(document.querySelector("[data-pit-frame]")?.dataset.pitFrame) > 0);
  report.checks.push({ name: "failed-art-mobile-touch", explicitWarning: true, explicitTouchStart: true, noOverflowAt390: true });
  await returnPitSelection(page);
  failCity = false;
  for (const fighterId of ["theta", "machiko-noguchi"]) {
    lab = await enter(fighterId);
    await lab.getByRole("button", { name: "Garde basse", exact: true }).click();
    await page.locator('[data-training-briefing="ready"]').waitFor({ timeout: 30000 });
    assert.equal(await frame(), 0);
    const art = page.locator('[data-pit-bitmap-slot="0"][data-pit-bitmap-id="' + fighterId + '"]');
    const status = await art.getAttribute("data-pit-bitmap-status");
    assert.match(status, /^sprite-sheet-(animation|hold)$/);
    assert.equal(await briefing.getByRole("button", { name: "Commencer l’exercice", exact: true }).isEnabled(), true);
    await page.screenshot({ path: path.join(output, fighterId + "-atlas-ready.png"), fullPage: true });
    report.checks.push({ name: "atlas-only-briefing", fighterId, status, canBegin: true, frame: 0 });
    await returnPitSelection(page);
  }
  assert.equal(await storage(), before);
  assert.deepEqual(await page.evaluate(() => window.__briefingWrites), []);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.failures, []);
  report.existingSaveUnchanged = true;
  report.passed = true;
  await fs.writeFile(path.join(output, "browser-qa.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (error) {
  report.error = String(error);
  if (page) {
    report.body = await page.locator("body").innerText().catch(() => "unavailable");
    await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
  }
  await fs.writeFile(path.join(output, "browser-qa.json"), JSON.stringify(report, null, 2));
  throw error;
} finally { releaseCold?.(); await browser.close(); }
