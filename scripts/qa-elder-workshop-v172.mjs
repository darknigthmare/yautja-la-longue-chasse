import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { elderWorkshopAdmissionV172 } from "../tests/helpers/elder-workshop-fixture-v172.mjs";
import { saves } from "../tests/helpers/clan-ship-trophy-hearing-fixture.mjs";

const method = process.env.ELDER_WORKSHOP_METHOD ?? "repair";
assert.ok(method === "repair" || method === "support");
const output = resolve(process.env.ELDER_WORKSHOP_OUTPUT ?? "outputs/qa-elder-workshop-v172");
const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (process.env.ASSET_RACCORDS_SOURCE_COMMIT) assert.equal(commit, process.env.ASSET_RACCORDS_SOURCE_COMMIT);
const seed = elderWorkshopAdmissionV172();
seed.settings.masterVolume = 0;
const admitted = saves.parseSaveImport(saves.exportSave(seed));
assert.ok(admitted.save, admitted.failure);
const key = saves.SAVE_STORAGE_KEY;
const report = { commit, method, admission: "Existing assembly and armorer membership prepared through production commands", commands: [], errors: [] };
await mkdir(output, { recursive: true });
let server, browser;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port: 4217, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const session = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: "reduce" });
  await session.addInitScript(({ key, save }) => {
    if (sessionStorage.getItem("qaElderWorkshop")) return;
    localStorage.setItem(key, JSON.stringify(save));
    sessionStorage.setItem("qaElderWorkshop", "true");
  }, { key, save: admitted.save });
  const page = await session.newPage();
  page.on("pageerror", (error) => report.errors.push(error.message));
  page.setDefaultTimeout(25000);
  const scene = page.locator("[data-clan-interior]");
  const zone = page.locator("[data-elder-workshop-phase]");
  async function enterWorkshop() {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    await scene.waitFor({ timeout: 90000 });
    if (await scene.getAttribute("data-interior-room") !== "armurerie") {
      await page.locator('[data-clan-ship-room-target="armurerie"]').click();
      await page.waitForFunction(() => {
        const target = document.querySelector("[data-clan-interior]");
        return target?.getAttribute("data-interior-room") === "armurerie" &&
          target.getAttribute("data-interior-moving") === "false" && !target.getAttribute("data-interior-target-room");
      }, null, { timeout: 60000 });
    }
    const control = page.locator("[data-interior-operations]");
    if (await control.getAttribute("data-interior-operations-ready") !== "true") {
      await control.click();
      await page.locator('[data-interior-operations-ready="true"]').waitFor({ timeout: 45000 });
    }
    await control.click();
    await page.locator('[data-clan-operations-tab="post"]').click();
    await zone.scrollIntoViewIfNeeded();
    await zone.waitFor();
  }
  async function act(action) {
    await zone.locator('[data-elder-workshop-action="' + action + '"]').click();
    report.commands.push(action);
    await page.waitForFunction(({ key, history }) => JSON.stringify(JSON.parse(localStorage.getItem(key))
      ?.elderWorkshopV172?.history) === JSON.stringify(history), { key, history: report.commands });
  }
  await page.goto("http://127.0.0.1:4217");
  await enterWorkshop();
  await act("observe");
  await act("inspect");
  await act(method);
  await act("align");
  await page.reload();
  await enterWorkshop();
  assert.equal(await zone.getAttribute("data-elder-workshop-phase"), "align");
  for (let index = 1; index < (method === "repair" ? 3 : 2); index++) await act("align");
  await act("fit");
  await act("handover");
  assert.equal(await zone.getAttribute("data-elder-workshop-phase"), "complete");
  assert.equal(await zone.locator("[data-elder-workshop-action]").count(), 0);
  await zone.screenshot({ path: resolve(output, "atelier.png"), animations: "disabled" });
  const persisted = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  assert.ok(saves.parseSaveImport(saves.exportSave(persisted)).save);
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  await browser?.close();
  await server?.close();
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
