import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { CHILDHOOD_OWNER, childhoodStorage, qaChildhood } from "../tests/helpers/homeworld-childhood-v175.mjs";
import { campaignAt, city, council } from "../tests/helpers/homeworld-city-places-m003.mjs";

const shapes = qaChildhood.load("app/game/systems/youthCityStreetM003.ts");
const navigation = qaChildhood.load("app/game/systems/homeworldNavigationV109.ts");
const storageKey = childhoodStorage.SAVE_STORAGE_KEY;
const output = resolve("outputs/qa-homeworld-city-street-m003");
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  prerequisites: "Nursery and the two acropolis guide marks are prepared by their reducers. The native browser plays the encounter at the lower landing, both city walks and the recovery.",
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
      if (sessionStorage.getItem("m003StreetReady")) return;
      sessionStorage.setItem("m003StreetReady", "1");
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
  async function walkTo(point) {
    for (let step = 0; step < 160; step++) {
      const position = await spot(), dx = point.x - position.x, dy = point.y - position.y;
      if (Math.hypot(dx, dy) < 14) return;
      const keys = [];
      if (Math.abs(dx) > 6) keys.push([dx > 0 ? "ArrowRight" : "ArrowLeft", Math.abs(dx) * 1000 / 330]);
      if (Math.abs(dy) > 6) keys.push([dy > 0 ? "ArrowDown" : "ArrowUp", Math.abs(dy) * 1000 / 260]);
      for (const [key] of keys) await page.keyboard.down(key);
      await page.waitForTimeout(Math.max(28, Math.min(175, ...keys.map(([, duration]) => duration))));
      for (const [key] of keys) await page.keyboard.up(key);
    }
    assert.fail("Le joueur n’a pas atteint le passage " + JSON.stringify({ wanted: point, at: await spot() }));
  }
  const shot = name => viewport().screenshot({ path: resolve(output, name + ".png"), animations: "disabled" });

  async function walkStreetTo(point) {
    const route = navigation.homeworldWalkRouteV109("0", await spot(), point);
    assert.equal(route.status, "reachable", JSON.stringify({ from: await spot(), point }));
    for (const next of route.points.slice(1)) await walkTo(next);
  }
  const waitForStreet = kind => viewport().locator('[data-r2-m003-street-action="' + kind + '"]').waitFor();
  const readStreet = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).homeworld.youthCityErrandV172.streetM003, storageKey);
  async function waitForSave(leg, recovery) {
    await page.waitForFunction(({ key, leg, recovery }) => {
      const street = JSON.parse(localStorage.getItem(key)).homeworld.youthCityErrandV172.streetM003;
      return street.leg === leg && street.recovery === recovery;
    }, { key: storageKey, leg, recovery });
  }

  let escorted = city.startYouthCityErrandV172(CHILDHOOD_OWNER, "escort", true, true, true, true);
  escorted = city.advanceYouthCityGuideM003(city.advanceYouthCityGuideM003(escorted));
  const context = await open(campaignAt(escorted, council.from.point, council.from.levelId));
  await viewport().locator('[data-r2-m003-place="council"]').waitFor();
  await page.keyboard.press("KeyE");
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).homeworld.youthCityErrandV172.encounterM003 === "met", storageKey);
  assert.equal((await read()).locationV77.levelId, "0");
  const first = shapes.youthCityStreetPathM003((await read()).youthCityErrandV172);
  assert.equal(first.marker.kind, "workshops");
  assert.equal(await viewport().locator('[data-r2-m003-companion="yena"]').count(), 1);

  await walkStreetTo(first.junction);
  await waitForStreet("directions");
  await page.locator('[data-r2-m003-street="workshops"][data-r2-m003-separated="true"]').waitFor();
  await shot("01-croisement-yena");
  const before = await spot();
  await page.keyboard.press("KeyE");
  await waitForSave(0, 1);
  const after = (await read()).locationV77.exterior;
  assert(Math.hypot(after.x - before.x, after.y - before.y) < 15);
  await page.reload();
  await continueCampaign();
  assert.deepEqual(await readStreet(), { leg: 0, recovery: 1 });
  const restored = await spot();
  assert(Math.hypot(restored.x - after.x, restored.y - after.y) < 15);
  report.checks.push("Détour à pied, Saar attend et Yena renseigne au croisement sans changer la position. Le reçu et la position reviennent ensemble.");

  await walkStreetTo(first.marker.point);
  await waitForStreet("workshops");
  await shot("02-rue-des-ateliers");
  await page.keyboard.press("KeyE");
  await waitForSave(1, 1);
  const second = shapes.youthCityStreetPathM003((await read()).youthCityErrandV172);
  assert.equal(second.marker.kind, "square");

  await walkStreetTo(second.marker.point);
  await waitForStreet("square");
  await shot("03-place-du-marche");
  await page.keyboard.press("KeyE");
  await waitForSave(2, 1);
  const atSquare = await read();
  assert.equal(atSquare.youthCityErrandV172.route, "escort");
  assert.equal(atSquare.youthCityErrandV172.reached, 0);
  assert.deepEqual(atSquare.youthCityErrandV172.delivery, { revision: 0, commands: [] });
  await page.reload();
  await continueCampaign();
  assert.deepEqual(await readStreet(), { leg: 2, recovery: 1 });
  assert.equal(await viewport().locator("[data-r2-m003-street-action]").count(), 0);
  assert(await page.getByText("Pièce de forge portée.", { exact: true }).first().isVisible());
  report.checks.push("Rue et place atteintes au clavier, état repris sur la place avec la même pièce à remettre.");
  assert.deepEqual(report.errors, []);
  report.passed = true;
  await context.close();
} finally {
  if (!report.passed && page) {
    report.screen = (await page.locator("body").innerText().catch(() => "")).slice(0, 2400);
    report.phase = await page.evaluate(() => ({ focus: document.hasFocus(), active: document.activeElement?.getAttribute("data-homeworld-viewport"),
      time: document.querySelector("[data-homeworld-viewport]")?.getAttribute("data-city-seconds"),
      transit: document.querySelector("[data-homeworld-hub]")?.getAttribute("data-homeworld-transit-v77"),
      elevation: document.querySelector("[data-homeworld-hub]")?.getAttribute("data-homeworld-elevation-v77") })).catch(() => null);
    await page.screenshot({ path: resolve(output, "failure.png"), animations: "disabled" }).catch(() => {});
  }
  console.log("M003_STREET_BROWSER", JSON.stringify(report));
  await browser?.close();
  await server?.close();
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
