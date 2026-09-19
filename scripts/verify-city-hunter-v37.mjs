import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.V37_QA_URL || "http://127.0.0.1:4174";
const output = process.env.V37_QA_OUTPUT || "work/v37/browser-qa";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [], failures = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.drawImage;
    window.__cityGuardFrames = [];
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      if (this.canvas.width === 960 && this.canvas.height === 540 && args.length === 9 && args[1] === 925 && [29, 537].includes(args[2])) {
        window.__cityGuardFrames.push({ rect: args.slice(1, 5), destination: args.slice(5), at: performance.now() });
        if (window.__cityGuardFrames.length > 600) window.__cityGuardFrames.shift();
      }
      return original.apply(this, args);
    };
  });
  await page.goto(base + "/pit-lab", { waitUntil: "networkidle" });
  await page.getByLabel("Combattant", { exact: true }).selectOption("city-hunter");
  const lab = page.locator("[data-pit-production-lab]");
  await page.waitForFunction(() => document.querySelector("[data-pit-production-lab]")?.dataset.renderStatus === "ready");
  await page.locator("canvas").screenshot({ path: output + "/idle.png" });
  await page.getByLabel("Atlas validé", { exact: true }).selectOption("city-hunter-high-guard-right-v37");
  await page.waitForFunction(() => document.querySelector("[data-pit-production-lab]")?.dataset.renderStatus === "ready");
  assert.equal(await lab.getAttribute("data-clip"), "high-guard");
  assert.equal(await lab.getAttribute("data-frame-duration-ticks"), "60");
  await page.locator("canvas").screenshot({ path: output + "/guard-0.png" });
  await page.getByRole("button", { name: "+1 dessin", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("[data-pit-production-lab]")?.dataset.frameIndex === "1");
  await page.locator("canvas").screenshot({ path: output + "/guard-1.png" });
  await page.getByLabel("Orientation", { exact: true }).selectOption("left");
  assert.equal(await lab.getAttribute("data-render-status"), "missing-clip");
  assert.match(await page.getByRole("status").first().innerText(), /Aucun miroir/);
  await page.getByLabel("Orientation", { exact: true }).selectOption("right");
  await page.getByLabel("Vitesse", { exact: true }).selectOption("1");
  await page.getByRole("button", { name: "Lecture", exact: true }).click();
  await page.waitForFunction(() => new Set(window.__cityGuardFrames.map(frame => frame.rect[1])).size === 2);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const labCoverage = await page.locator("[data-pit-lab-coverage]").innerText();
  assert.match(labCoverage, /9 clips orientés/);

  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator('[data-game-content-version="V37"]').waitFor();
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await page.getByRole("button", { name: "THE PIT · combat", exact: true }).click();
  await page.getByRole("radio", { name: /Entraînement/ }).click();
  await page.getByRole("combobox", { name: "Combattant joueur", exact: true }).selectOption("city-hunter");
  await page.getByRole("combobox", { name: "Adversaire", exact: true }).selectOption("wolf");
  await page.getByRole("button", { name: /^ENTRER DANS L’ARÈNE/ }).click();
  await page.locator('canvas[data-pit-arena-art-status="bitmap"]').waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "Laboratoire", exact: true }).click();
  await page.getByRole("combobox", { name: "Comportement du mannequin", exact: true }).selectOption("idle");
  const canvas = page.locator("canvas[data-pit-arena-id]");
  await canvas.click();
  await page.evaluate(() => { window.__cityGuardFrames = []; });
  await page.keyboard.down("KeyI");
  try {
    await page.waitForFunction(() => new Set(window.__cityGuardFrames.map(frame => frame.rect[1])).size === 2, {}, { timeout: 15000 });
    assert.equal(await page.locator('[data-pit-bitmap-slot="0"]').getAttribute("data-pit-bitmap-status"), "sprite-sheet-animation");
    await canvas.screenshot({ path: output + "/combat-guard.png" });
  } finally { await page.keyboard.up("KeyI"); }
  const draws = await page.evaluate(() => window.__cityGuardFrames);
  assert(draws.every(draw => draw.destination[2] > 0 && draw.destination[3] > 0), "No mirror scale");
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: output + "/mobile.png", fullPage: true });
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  const report = { passed: true, checkedAt: new Date().toISOString(), url: base, version: "V37", labCoverage,
    distinctGuardDrawings: 2, rightGuardInRealTrainingCombat: true, leftGuardNotInvented: true,
    sourceCrops: [...new Map(draws.map(draw => [draw.rect.join(), draw.rect])).values()],
    mobileNoOverflow: true, errors, failures };
  await fs.writeFile(output + "/browser-qa.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
