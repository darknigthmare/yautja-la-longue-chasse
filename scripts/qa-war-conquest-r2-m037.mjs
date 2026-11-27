import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { saves } from "../tests/helpers/first-interstellar-fixture-v173.mjs";
import { conquestAdmissionR2M037 } from "../tests/helpers/war-conquest-r2-m037.mjs";

const { traveled: save, fleetKey, fleet } = conquestAdmissionR2M037();
save.settings.masterVolume = 0;
const output = resolve(process.env.WAR_CONQUEST_OUTPUT ?? "outputs/qa-war-conquest-r2-m037");
const report = { commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  steps: [], errors: [], passed: false };
await mkdir(output, { recursive: true });
let server, browser, page;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"),
    server: { host: "127.0.0.1", port: 4218, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1360, height: 940 }, reducedMotion: "reduce" });
  await context.addInitScript(({ save, fleet, fleetKey, saveKey }) => {
    if (!sessionStorage.getItem("conquestM037Fixture")) {
      sessionStorage.setItem("conquestM037Fixture", "1");
      localStorage.setItem(saveKey, JSON.stringify(save));
      localStorage.setItem(fleetKey, JSON.stringify(fleet));
    }
  }, { save, fleet, fleetKey, saveKey: saves.SAVE_STORAGE_KEY });
  page = await context.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  page.setDefaultTimeout(35000);
  const button = (node, name) => node.getByRole("button", { name, exact: true });
  const entry = button(page, "Guerres des clans · carte et mandats");
  const route = page.getByTestId("war-campaign-m037");
  const key = saves.SAVE_STORAGE_KEY;
  const read = () => page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)), key);
  const archive = () => page.evaluate(() => Object.keys(localStorage).filter(key => /^yautja\.clan-war\./.test(key))
    .sort().map(key => [key, localStorage.getItem(key)]));
  async function enter() {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    const play = button(page, "Jouer");
    await entry.or(play).first().waitFor({ timeout: 90000 });
    if (await play.isVisible()) await play.click();
    await entry.click();
    await page.locator('[data-command-section="m037"]').click();
    await route.waitFor();
  }
  const act = name => route.locator('[data-conquest-action="' + name + '"]').click();
  async function steps(count, direction) {
    for (let i = 0; i < count; i++) {
      await button(route, "Marcher à " + direction).click();
    }
  }

  await page.goto("http://127.0.0.1:4218");
  await enter();
  const before = await archive();
  for (const action of ["reserve-guard", "resolve-cession", "plan-convoy", "reserve-convoy", "deliver-convoy"]) await act(action);
  assert.match(await route.innerText(), /Matériel livré/);
  assert.equal(await route.locator('[data-held="true"]').count(), 1);
  await route.screenshot({ path: resolve(output, "01-link-and-convoy.png") });
  report.steps.push("Owned ship and actual voyage record admit campaign strategy from the bridge. Cession and convoy are resolved.");

  await act("enter");
  await route.getByRole("img", { name: /Canyon/ }).focus();
  await page.keyboard.press("ArrowUp");
  await steps(7, "droite");
  await route.getByRole("img", { name: /Canyon/ }).focus();
  await page.keyboard.press("Enter");
  assert.match(await route.innerText(), /1 \/ 2 balises vérifiées/);
  const checkpoint = (await read()).warConquestR2M037;
  await page.reload();
  await enter();
  assert.deepEqual((await read()).warConquestR2M037, checkpoint);
  assert.match(await route.innerText(), /Corniche nord · 1 \/ 2 balises vérifiées/);
  await steps(4, "gauche");
  await button(route, "Descendre au fond").click();
  await steps(13, "droite");
  await button(route, "Vérifier la balise").click();
  await route.screenshot({ path: resolve(output, "02-visited-canyon.png") });
  await steps(7, "droite");
  await act("exit-canyon");
  assert.equal(await route.getAttribute("data-phase"), "report");
  await act("debrief");
  assert.equal(await route.getAttribute("data-phase"), "complete");
  const finished = (await read()).warConquestR2M037;
  await page.reload();
  await enter();
  assert.equal(await route.getAttribute("data-phase"), "complete");
  assert.deepEqual((await read()).warConquestR2M037, finished);
  assert.match(await route.getByTestId("war-campaign-m037-report").innerText(), /Progression recommandée/);
  assert.deepEqual(await archive(), before);
  await route.screenshot({ path: resolve(output, "03-campaign-debrief.png") });
  report.steps.push("Both signs physically inspected. East exit and report written. Full reload keeps the report and leaves free archives untouched.");
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.errors.push(error.stack ?? String(error));
  if (page) {
    report.visibleControls = await page.getByRole("button").allTextContents().catch(() => []);
    await page.screenshot({ path: resolve(output, "failure.png") }).catch(() => {});
  }
  throw error;
} finally {
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server?.close();
}
