import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { CHILDHOOD_OWNER, childhoodStorage } from "../tests/helpers/homeworld-childhood-v175.mjs";
import { campaignAt, city, completeLandmarks, council, forgeContact, hearthContact, outside } from "../tests/helpers/homeworld-city-places-m003.mjs";

const storageKey = childhoodStorage.SAVE_STORAGE_KEY;
const output = resolve("outputs/qa-homeworld-city-places-m003");
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  prerequisites: "The real nursery reducer and the M003 reducer prepare both chosen routes. The foyer pilot starts after the delivery and regular landmarks.",
  checks: [], errors: [], passed: false,
};
await mkdir(output, { recursive: true });
let server, browser, page;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port: 4278, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const homeSelector = '[data-homeworld-hub][data-homeworld-motion-ready="true"]';
  async function open(seed) {
    const context = await browser.newContext({ viewport: { width: 1360, height: 980 }, reducedMotion: "reduce" });
    await context.addInitScript(({ key, campaign }) => {
      if (sessionStorage.getItem("m003PlacesReady")) return;
      sessionStorage.setItem("m003PlacesReady", "1");
      localStorage.setItem(key, JSON.stringify(campaign));
    }, { key: storageKey, campaign: seed });
    page = await context.newPage();
    page.setDefaultTimeout(22000);
    page.on("pageerror", error => report.errors.push(error.message));
    await page.goto("http://127.0.0.1:4278");
    await continueCampaign();
    return context;
  }
  async function continueCampaign() {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
    const menu = page.locator('[data-menu-section="campaign"]');
    if (await menu.isVisible()) await menu.click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.locator(homeSelector).waitFor({ timeout: 90000 });
    await viewport().focus();
  }
  const viewport = () => page.locator(homeSelector).locator("[data-homeworld-viewport]");
  const spot = () => viewport().locator("[data-homeworld-actor]").evaluate(node => ({ x: Number(node.dataset.x), y: Number(node.dataset.y) }));
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).homeworld, storageKey);
  async function expectPlace(kind) {
    await viewport().locator('[data-r2-m003-place="' + kind + '"]').waitFor();
  }
  async function walkTo(point) {
    for (let step = 0; step < 160; step++) {
      const position = await spot(), dx = point.x - position.x, dy = point.y - position.y;
      if (Math.hypot(dx, dy) < 12) return;
      const keys = [];
      if (Math.abs(dx) > 6) keys.push([dx > 0 ? "ArrowRight" : "ArrowLeft", Math.abs(dx) * 1000 / 330]);
      if (Math.abs(dy) > 6) keys.push([dy > 0 ? "ArrowDown" : "ArrowUp", Math.abs(dy) * 1000 / 260]);
      for (const [key] of keys) await page.keyboard.down(key);
      await page.waitForTimeout(Math.max(28, Math.min(115, ...keys.map(([, duration]) => duration))));
      for (const [key] of keys) await page.keyboard.up(key);
    }
    assert.fail("Foyer inaccessible depuis la porte " + JSON.stringify({ wanted: point, at: await spot() }));
  }
  const shot = name => viewport().screenshot({ path: resolve(output, name + ".png"), animations: "disabled" });
  const encounterSaved = () => page.waitForFunction(key =>
    JSON.parse(localStorage.getItem(key)).homeworld.youthCityErrandV172.encounterM003 === "met", storageKey);

  let escorted = city.startYouthCityErrandV172(CHILDHOOD_OWNER, "escort", true, true, true);
  escorted = city.advanceYouthCityGuideM003(city.advanceYouthCityGuideM003(escorted));
  let context = await open(campaignAt(escorted, council.to.point, council.to.levelId));
  await page.locator(homeSelector + '[data-homeworld-level-v77="+1"]').waitFor();
  await page.keyboard.press("KeyE");
  await page.locator('[data-homeworld-transit-v77="council-stair"]').waitFor();
  await expectPlace("council");
  assert(await viewport().locator("[data-homeworld-saar-m003]").count());
  await shot("saar-en-bas");
  await page.keyboard.press("KeyE");
  await encounterSaved();
  assert.equal((await read()).locationV77.levelId, council.from.levelId);
  report.checks.push("Escalier du Conseil descendu en jeu, Saar retrouvé et rencontre enregistrée au palier bas.");
  await context.close();

  const workshop = city.startYouthCityErrandV172(CHILDHOOD_OWNER, "archives", true, true, true);
  const forge = forgeContact(workshop);
  context = await open(campaignAt(workshop, forge.point, forge.level, forge.room));
  await expectPlace("forge");
  assert.equal(await viewport().locator("[data-homeworld-saar-m003]").count(), 0);
  await page.keyboard.press("KeyE");
  await encounterSaved();
  assert.equal((await read()).locationV77.interiorId, "deep-forge");
  await page.getByText(/une ligature qui se desserre/).waitFor();
  await shot("rencontre-atelier");
  report.checks.push("La variante atelier rencontre l’artisane à son vrai poste, puis mène au repère des archives.");
  await context.close();

  const cityDone = completeLandmarks(city.completeYouthCityEncounterM003(workshop));
  const sample = hearthContact(cityDone), door = outside(sample.room);
  context = await open(campaignAt(cityDone, door.point, door.level));
  await viewport().locator('[data-homeworld-door-id="' + sample.room.buildingId + '"]').waitFor();
  await page.keyboard.press("KeyE");
  await page.locator('[data-homeworld-interior-id="' + sample.room.buildingId + '"]').waitFor();
  const contact = hearthContact(cityDone, await spot());
  assert.equal((await read()).youthCityErrandV172.hearthM003, undefined);
  await walkTo(contact.point);
  await expectPlace("hearth");
  await shot("table-du-foyer");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).homeworld.youthCityErrandV172.hearthM003 === true, storageKey);
  await page.reload();
  await continueCampaign();
  assert.equal((await read()).locationV77.interiorId, sample.room.buildingId);
  assert.equal((await read()).youthCityErrandV172.hearthM003, true);
  assert.equal(await viewport().locator('[data-r2-m003-place="hearth"]').count(), 0);
  report.checks.push("Porte et marche natives jusqu’à la table, lieu et visite repris après rechargement.");
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  if (!report.passed && page) {
    report.screen = (await page.locator("body").innerText().catch(() => "")).slice(0, 2400);
    await page.screenshot({ path: resolve(output, "failure.png"), animations: "disabled" }).catch(() => {});
  }
  console.log("M003_PLACES_BROWSER", JSON.stringify(report));
  await browser?.close();
  await server?.close();
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
