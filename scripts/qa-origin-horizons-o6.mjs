import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { homeworldNavigatorV77 } from "./homeworld-navigation-browser-v77.mjs";
import { horizons, horizonsAdmissionO6, terrain } from "../tests/helpers/origin-horizons-o6.mjs";

const port = 4291, host = "http://127.0.0.1:" + port;
const out = resolve("outputs/qa-origin-horizons-o6");
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "The common solitary hunt, Elite rite and the available residence are played through their existing production reducers. Chromium walks uphill and records every horizon through the regular controls.",
  runs: [], errors: [], passed: false,
};
await mkdir(out, { recursive: true });
let server, browser, page;

async function playRoute(full) {
  const route = full ? "coffre" : "cour-commune";
  const seed = horizonsAdmissionO6(full);
  const key = terrain.SAVE_STORAGE_KEY;
  const context = await browser.newContext({ viewport: { width: 1420, height: 940 }, reducedMotion: "reduce" });
  await context.addInitScript(({ key, seed }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(seed));
  }, { key, seed });
  page = await context.newPage();
  page.setDefaultTimeout(55000);
  page.on("pageerror", error => report.errors.push(error.message));
  await page.clock.install();
  const city = page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]');
  const hud = city.locator("[data-o6-horizons]");
  const nav = homeworldNavigatorV77(page, terrain, { waypointTolerance: 9, driverTickMs: 36, pulseInputs: true });
  const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const current = async () => (await disk()).originV151.horizonsO6;
  const shot = label => city.screenshot({ path: join(out, route + "-" + label + ".png"), animations: "disabled" });

  async function enter() {
    await page.clock.resume();
    await page.waitForSelector("[data-campaign-menu], [data-campaign-session], [data-homeworld-hub]");
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await page.locator("[data-campaign-menu]").isVisible()) {
      if (await campaign.isVisible()) await campaign.click();
      await page.locator('[data-menu-action="continue"]').click();
    }
    const play = page.getByRole("button", { name: "Jouer", exact: true });
    const planet = page.getByRole("button", { name: "Yautja Prime · monde natal", exact: true });
    await city.or(planet).or(play).first().waitFor();
    if (await play.isVisible()) await play.click();
    await city.or(planet).first().waitFor();
    if (await planet.isVisible()) await planet.click();
    await city.waitFor({ timeout: 140000 });
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 800)));
    await nav.focus();
  }

  async function act(site, kind, choice) {
    const before = await current();
    const target = horizons.horizonSiteO6(site);
    await nav.reach(target);
    await city.locator('[data-o6-horizon-action="' + site + '"]').waitFor();
    const position = await nav.position();
    await nav.release();
    await page.keyboard.press("KeyE");
    if (choice) {
      await nav.tick(60);
      assert.deepEqual(await current(), before, "Opening the responsibility choices does not write a receipt.");
      await hud.locator('[data-o6-horizon-choice="' + choice + '"]').click();
    }
    await nav.tick(148);
    const after = await current();
    assert.equal(after?.journal.length, (before?.journal.length ?? 0) + 1);
    const event = after.journal.at(-1);
    assert.equal(event.kind, kind);
    assert.equal(event.at.levelId, "+1");
    assert.ok(Math.hypot(position.x - event.at.exterior.x, position.y - event.at.exterior.y) < 16);
    assert.deepEqual((await disk()).homeworld.locationV77, event.at);
    if (kind === "prepare") assert.equal(event.horizon, site);
    if (choice) assert.equal(event.horizon, choice);
    console.log("O6_HORIZON", JSON.stringify({ route, site, ...event }));
    return after;
  }

  async function restart(expected) {
    await page.clock.resume();
    await page.reload();
    await enter();
    assert.deepEqual(await current(), expected);
    const at = expected.journal.at(-1).at;
    assert.equal(await nav.floor(), at.levelId);
    const position = await nav.position();
    assert.ok(Math.hypot(at.exterior.x - position.x, at.exterior.y - position.y) < 7);
  }

  try {
    await page.goto(host);
    await enter();
    assert.equal(await nav.floor(), "0");
    await act("saar", "listen");
    assert.ok(nav.routes.some(item => item.kind === "physical-connector" && item.from.levelId === "0" && item.to.levelId === "+1"));
    assert.equal(await city.locator("[data-o6-horizon-post]").count(), 4);
    await shot("terrasse");
    const reading = await act(full ? "exploration" : "teaching", "prepare");
    assert.equal(reading.journal.at(-1).reduced, !full);
    await restart(reading);
    const prepared = reading.journal.at(-1).horizon;
    assert.equal(await city.locator('[data-o6-horizon-post="' + prepared + '"]').getAttribute("data-o6-horizon-prepared"), "true");
    await act("circle", "prepare");
    await act(full ? "teaching" : "exploration", "prepare");
    assert.equal(await hud.locator("[data-o6-horizon-option]").count(), 3);
    await nav.reach(horizons.horizonSiteO6("saar"));
    await shot("comparaison");
    const choice = full ? "exploration" : "teaching";
    const chosen = await act("saar", "choose", choice);
    await restart(chosen);
    assert.equal(await hud.locator("[data-o6-horizon-choice]").count(), 0);
    assert.equal((await disk()).originV151.ending, seed.originV151.ending);
    assert.deepEqual((await disk()).prologue.chronicle, seed.prologue.chronicle);
    assert.equal(terrain.parseSaveImport(JSON.stringify(await disk())).failure, null);
    report.runs.push({ route, choice, receipt: chosen, transfers: nav.routes });
    await shot("reprise");
  } finally {
    await context.close();
  }
}

try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  for (const full of [true, false]) await playRoute(full);
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  if (!report.passed && page && !page.isClosed()) await page.screenshot({ path: join(out, "echec.png"), timeout: 5000 }).catch(() => null);
  await writeFile(join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server?.close();
}
