import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright-core";

// Isolated browser profile, against a server already started by the release owner.
const projectRoot = await fs.realpath(process.cwd());
const target = new URL(process.env.V38_QA_URL || "http://127.0.0.1:4174");
assert(["http:", "https:"].includes(target.protocol) && !target.username && !target.password && !target.search && !target.hash);
const base = target.href.replace(/\/+$/, "");
const output = path.resolve(projectRoot, process.env.V38_TRAINING_QA_OUTPUT || "work/v38/pit-training-qa");
const relativeOutput = path.relative(projectRoot, output);
assert(relativeOutput && !relativeOutput.startsWith("..") && !path.isAbsolute(relativeOutput), "QA output must remain in the workspace.");
let directory = projectRoot;
for (const part of relativeOutput.split(path.sep)) {
  directory = path.join(directory, part);
  await fs.mkdir(directory).catch(error => { if (error.code !== "EEXIST") throw error; });
  const info = await fs.lstat(directory);
  assert(info.isDirectory() && !info.isSymbolicLink() && path.relative(directory, await fs.realpath(directory)) === "", "QA output cannot traverse a link.");
}

const errors = [], failures = [], availability = [];
const report = { passed: false, version: "V38", checkedAt: new Date().toISOString(), url: base, availability, errors, failures };
const browser = await chromium.launch({ channel: "chrome", headless: true });
let page;
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: false });
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
  page.on("requestfailed", request => {
    const error = request.failure()?.errorText ?? "unknown";
    if (!error.includes("ERR_ABORTED")) failures.push({ url: request.url(), error });
  });
  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  await page.locator('[data-game-content-version="V38"]').waitFor();
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await page.getByRole("button", { name: "THE PIT · combat", exact: true }).click();
  const snapshot = () => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a], [b]) => a.localeCompare(b)))));
  const before = await snapshot();
  await page.evaluate(() => {
    window.__trainingStorageWrites = [];
    window.__trainingKeyLog = [];
    window.addEventListener("keydown", event => {
      const entry = { code: event.code, target: event.target?.tagName, label: event.target?.getAttribute?.("aria-label"), frame: document.querySelector("[data-pit-frame]")?.dataset.pitFrame };
      queueMicrotask(() => window.__trainingKeyLog.push({ ...entry, prevented: event.defaultPrevented }));
    });
    for (const method of ["setItem", "removeItem", "clear"]) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        if (this === localStorage) window.__trainingStorageWrites.push({ method, key: args[0] ?? null });
        return original.apply(this, args);
      };
    }
  });
  const enterTraining = async fighterId => {
    await page.getByRole("radio", { name: /Entraînement/ }).click();
    await page.getByRole("combobox", { name: "Combattant joueur", exact: true }).selectOption(fighterId);
    await page.getByRole("combobox", { name: "Adversaire", exact: true }).selectOption(fighterId === "jungle-hunter" ? "city-hunter" : "berserker");
    await page.getByRole("button", { name: /^ENTRER DANS L’ARÈNE/ }).click();
    await page.locator('canvas[data-pit-arena-art-status="bitmap"]').waitFor({ timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll("[data-pit-bitmap-slot]")].length === 2 && [...document.querySelectorAll("[data-pit-bitmap-slot]")].every(element => !["loading", "missing"].includes(element.dataset.pitBitmapStatus)));
    const openLab = page.getByRole("button", { name: "Laboratoire", exact: true });
    if (await openLab.count()) await openLab.click();
    const lab = page.getByRole("complementary", { name: "Laboratoire d’entraînement", exact: true });
    await lab.getByRole("combobox", { name: "Comportement du mannequin", exact: true }).selectOption("idle");
    const summary = lab.locator("summary", { hasText: "Exercices guidés" });
    if (await summary.locator("..").getAttribute("open") === null) await summary.click();
    return { lab, summary };
  };
  for (const fighterId of ["tracker", "greyback", "jungle-hunter"]) {
    const { lab, summary } = await enterTraining(fighterId);
    const unsupported = fighterId !== "jungle-hunter";
    const antiAir = lab.getByRole("button", { name: "Anti-air", exact: true });
    assert.equal(await antiAir.isDisabled(), unsupported);
    assert.match(await summary.innerText(), unsupported ? /4 disponibles/ : /5 disponibles/);
    if (unsupported) {
      const reasonId = await antiAir.getAttribute("aria-describedby");
      assert.equal(reasonId, "pit-training-unavailable-anti-air");
      const reason = await lab.locator('[id="' + reasonId + '"]').innerText();
      assert.match(reason, /ne possède pas de frappe lourde anti-air/);
      assert.match(reason, fighterId === "tracker" ? /Tracker/ : /Greyback/);
      await antiAir.evaluate(button => button.click());
      assert.equal(await lab.locator('[data-status="running"]').count(), 0, "A disabled exercise must not start.");
      availability.push({ fighterId, available: 4, antiAirDisabled: true, reason });
      await page.screenshot({ path: path.join(output, fighterId + "-unavailable.png"), fullPage: true });
    } else {
      availability.push({ fighterId, available: 5, antiAirDisabled: false });
      const canvas = page.locator("canvas[data-pit-arena-id]");
      await canvas.click();
      // Hold guard across pause: the resumed keyboard attack proves stale guard was purged.
      await page.keyboard.down("KeyI");
      try {
        await page.waitForTimeout(100);
        await lab.getByRole("button", { name: "Geler la simulation", exact: true }).click();
        const frame = () => page.locator("[data-pit-frame]").getAttribute("data-pit-frame").then(Number);
        const frozenFrame = await frame();
        await page.waitForTimeout(250);
        assert.equal(await frame(), frozenFrame, "Pause freezes simulation ticks.");
        await lab.getByRole("button", { name: "Avancer d’un tick", exact: true }).click();
        await page.waitForFunction(expected => Number(document.querySelector("[data-pit-frame]")?.dataset.pitFrame) === expected, frozenFrame + 1);
        const resume = lab.getByRole("button", { name: "Reprendre la simulation", exact: true });
        await resume.focus();
        await page.keyboard.press("Enter");
        await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Combat THE PIT");
        await page.keyboard.press("KeyJ", { delay: 80 });
        await page.getByText("LAME RAPIDE", { exact: true }).waitFor();
        report.keyboardResume = { rootFocusRestored: true, staleHeldGuardPurged: true, freshAttackSimulated: true, pauseFrozen: true, manualTick: true };
      } finally { await page.keyboard.up("KeyI"); }
      await lab.getByRole("button", { name: "Garde basse", exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Combat THE PIT");
      await page.keyboard.down("KeyO");
      try { await lab.locator('[data-status="success"]').waitFor({ timeout: 12000 }); }
      finally { await page.keyboard.up("KeyO"); }
      assert.match(await lab.locator('[data-status="success"]').innerText(), /Étapes : 3\/3/);
      report.realGuidedExercise = "Three low attacks blocked in the real training simulation.";
      await page.screenshot({ path: path.join(output, "guided-success.png"), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Mobile layout must not overflow.");
      await page.screenshot({ path: path.join(output, "mobile.png"), fullPage: true });
      report.mobileNoOverflow = true;
    }
    await page.getByRole("button", { name: /^Quitter ·/ }).click();
    await page.getByRole("combobox", { name: "Combattant joueur", exact: true }).waitFor();
  }
  assert.equal(await snapshot(), before, "Training must not alter stored campaign or PIT state.");
  assert.deepEqual(await page.evaluate(() => window.__trainingStorageWrites), [], "Training must not write and restore a save either.");
  report.storageUnchanged = true;
  report.storageSha256 = createHash("sha256").update(before).digest("hex");
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  assert.equal(await page.locator('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay').count(), 0);
  report.passed = true;
  await fs.writeFile(path.join(output, "browser-qa.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (error) {
  report.error = String(error);
  if (page) report.diagnostics = await page.evaluate(() => ({ keys: window.__trainingKeyLog, body: document.body.innerText.slice(-7000), active: document.activeElement?.outerHTML.slice(0,500) })).catch(() => null);
  if (page) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
  await fs.writeFile(path.join(output, "browser-qa.json"), JSON.stringify(report, null, 2));
  throw error;
} finally { await browser.close(); }
