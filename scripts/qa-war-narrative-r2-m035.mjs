import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { narrativeAdmission, saves } from "../tests/helpers/war-narrative-r2-m035-fixture.mjs";

const save = narrativeAdmission();
save.settings.masterVolume = 0;
const key = saves.SAVE_STORAGE_KEY;
const output = resolve(process.env.WAR_INTRO_OUTPUT ?? "outputs/qa-war-narrative-r2-m035");
const report = { commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  steps: [], errors: [], passed: false };
await mkdir(output, { recursive: true });
let server, browser, page;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"),
    server: { host: "127.0.0.1", port: 4217, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1380, height: 1000 }, reducedMotion: "reduce" });
  await context.addInitScript(({ key, save }) => {
    if (sessionStorage.getItem("warM035QA")) return;
    sessionStorage.setItem("warM035QA", "1");
    localStorage.setItem(key, JSON.stringify(save));
  }, { key, save });
  page = await context.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  page.setDefaultTimeout(30000);
  const council = page.locator('[data-clan-interior][data-interior-room="conseil"]:visible');
  const route = page.locator("[data-m035-stage]:visible");
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const button = (scope, name) => scope.getByRole("button", { name, exact: true });
  const act = id => route.locator('[data-m035-action="' + id + '"]').click();
  async function reachCanyon() {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    const play = button(page, "Jouer");
    await play.or(council).first().waitFor({ timeout: 90000 });
    if (await play.isVisible()) await play.click();
    await council.waitFor({ timeout: 90000 });
    const service = council.locator('[data-interior-service="conseil"]');
    const ready = council.locator('[data-interior-service="conseil"][data-interior-ready="true"]');
    if (!(await ready.count())) await service.click();
    await ready.waitFor();
    await ready.click();
    await button(page, "L’éclaireur du canyon").click();
    await route.waitFor();
  }

  await page.goto("http://127.0.0.1:4217");
  await reachCanyon();
  assert.equal(await route.getAttribute("data-m035-stage"), "diplomacy");
  await act("diplomacy");
  await act("rescue");
  await route.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  assert.equal(await route.getAttribute("data-m035-x"), "2");
  for (const order of ["inspect", "right", "right", "stabilize", "signal", "cover", "right", "right", "right", "right"]) await act(order);
  assert.equal(await route.getAttribute("data-m035-scout"), "8");
  await route.screenshot({ path: resolve(output, "01-escort.png") });
  report.steps.push("Physical approach from council, diplomacy, scout stabilized and covered across the Korthas canyon.");
  for (const order of ["cover", "protect", "right", "right", "right", "right", "extract", "return",
    "right", "right", "right", "right", "right", "right", "record"]) await act(order);
  assert.equal(await route.getAttribute("data-m035-stage"), "complete");
  const written = await read();
  assert.equal(written.warNarrativeR2M035.orders.at(-1), "record");
  await page.reload();
  await reachCanyon();
  assert.equal(await route.getAttribute("data-m035-stage"), "complete");
  assert.match(await route.locator("[data-m035-receipt]").innerText(), /Sas protégé/);
  assert.deepEqual((await read()).warNarrativeR2M035, written.warNarrativeR2M035);
  await route.screenshot({ path: resolve(output, "02-return.png") });
  report.steps.push("Extraction, physical return to the moved beacon, persisted receipt after full reload.");
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.errors.push(error.stack ?? String(error));
  if (page) await page.screenshot({ path: resolve(output, "failure.png") }).catch(() => {});
  throw error;
} finally {
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server?.close();
}
