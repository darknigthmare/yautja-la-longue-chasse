import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { createServer } from "vite";

const output = resolve("outputs/qa-compagnons-chasse-browser");
await mkdir(output, { recursive: true });
const savedCampaign = JSON.parse(await readFile(resolve("outputs/qa-compagnons-chasse-seed.json"), "utf8"));
const bundle = await build({
  stdin: { contents: 'export * from "./app/game/systems/campaignSlots.ts"; export { SAVE_STORAGE_KEY } from "./app/game/save.ts";',
    resolveDir: process.cwd() },
  bundle: true, format: "iife", platform: "browser", globalName: "__crewProofCampaign", write: false, logLevel: "silent",
});
const server = await createServer({
  configFile: resolve("desktop/vite.config.ts"),
  server: { host: "127.0.0.1", port: 4293, strictPort: true },
});
const result = { checks: [], errors: [], badImages: [] };
let browser, page;

try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE ?? "/usr/bin/google-chrome", args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1500, height: 1050 }, reducedMotion: "reduce" });
  page = await context.newPage();
  page.setDefaultTimeout(45_000);
  page.on("pageerror", error => result.errors.push(error.message));
  page.on("response", response => {
    if (response.status() >= 400 && response.request().resourceType() === "image") result.badImages.push(new URL(response.url()).pathname);
  });
  const screenshot = name => page.screenshot({ path: resolve(output, name + ".png"), animations: "disabled" });
  const openCampaign = async () => {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 120_000 });
    const chooser = page.locator('[data-menu-section="campaign"]');
    if (await chooser.isVisible()) await chooser.click();
    await page.locator('[data-menu-action="continue"]').click();
  };
  await page.goto("http://127.0.0.1:4293", { waitUntil: "networkidle", timeout: 120_000 });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const storageKey = await page.evaluate(async initial => {
    const setup = window.__crewProofCampaign;
    const key = setup.SAVE_STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(initial));
    const migrated = await setup.migrateLegacyCampaignSlot();
    if (!migrated.ok) throw new Error(migrated.message);
    const slot = setup.loadCampaignSlots().slots.find(entry => entry.id === migrated.slotId);
    const prepared = await setup.saveCampaignCheckpoint(slot.id, { kind: "manual", index: 1, location: "new-game", expectedRevision: slot.revision });
    if (!prepared.ok) throw new Error(prepared.message);
    return key;
  }, savedCampaign);
  await page.reload();
  await openCampaign();
  await page.getByRole("button", { name: "Confirmer le chasseur et ouvrir le premier briefing" }).click();
  await page.locator('input[name="insertion-team"][value="triad"]').check();
  await page.locator('[data-expedition-slot="1"]').selectOption("cold-trace");
  await page.locator('[data-expedition-slot="2"]').selectOption("ash-scar");
  assert.equal(await page.locator('[data-expedition-slot="1"]').inputValue(), "cold-trace");
  assert.equal(await page.locator('[data-expedition-slot="2"]').inputValue(), "ash-scar");
  await screenshot("01-briefing");
  result.checks.push("Composition choisie depuis le briefing GameClient");
  await page.getByRole("button", { name: "Déployer le chasseur", exact: true }).click();
  await page.getByRole("button", { name: /Passer l’arrivée/ }).waitFor();
  const persisted = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
  assert.deepEqual(persisted.planetArrival.insertion.memberIds, ["cold-trace", "ash-scar"]);
  assert.deepEqual(persisted.planetArrivalRun.configuration.insertion.memberIds, ["cold-trace", "ash-scar"]);
  result.checks.push("Composition gelée dans les deux registres du départ");
  await page.getByRole("button", { name: /Passer l’arrivée/ }).click();
  const start = page.getByRole("button", { name: "Commencer la chasse", exact: true });
  await page.locator(".hunt-screen .hunt-canvas").waitFor({ timeout: 120_000 });
  await start.waitFor({ timeout: 35_000 }).catch(() => {});
  if (await start.isVisible()) await start.click();
  const tracker = page.locator('[data-hunt-companion-id="cold-trace"]');
  const veteran = page.locator('[data-hunt-companion-id="ash-scar"]');
  await tracker.waitFor({ timeout: 90_000 });
  await veteran.waitFor();
  assert.equal(await page.locator('[data-hunt-companion-id="karhek"], [data-hunt-companion-id="saketh"]').count(), 0);
  await tracker.getByRole("button", { name: /tenir la position/ }).click();
  await page.waitForFunction(() => document.querySelector('[data-hunt-companion-id="cold-trace"]')?.getAttribute("data-hunt-companion-order") === "hold");
  assert.equal(await veteran.getAttribute("data-hunt-companion-order"), "follow");
  await tracker.getByRole("button", { name: /suivre/ }).click();
  await page.waitForFunction(() => document.querySelector('[data-hunt-companion-id="cold-trace"]')?.getAttribute("data-hunt-companion-order") === "follow");
  await screenshot("02-ordres-en-chasse");
  result.checks.push("Les vrais acteurs entrent sur le terrain et répondent chacun à leurs ordres");
  assert.deepEqual(result.errors, []);
  result.passed = true;
} catch (error) {
  result.error = error.stack ?? String(error);
  result.scene = (await page?.locator("body").innerText({ timeout: 3000 }).catch(() => ""))?.slice(0, 1500);
  await page?.screenshot({ path: resolve(output, "failure.png"), timeout: 5000 }).catch(() => {});
  console.log("CREW_BROWSER_FAILURE", JSON.stringify(result));
  throw error;
} finally {
  await browser?.close();
  await server.close();
  await writeFile(resolve(output, "report.json"), JSON.stringify(result, null, 2) + "\n");
  if (result.passed) console.log("CREW_BROWSER_PASS", JSON.stringify(result));
}
