import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { homeworldNavigatorV77 } from "./homeworld-navigation-browser-v77.mjs";
import { town, twilight, twilightAdmissionO6 } from "../tests/helpers/origin-twilight-return-o6.mjs";

const port = 4289, host = "http://127.0.0.1:" + port;
const out = resolve("outputs/qa-origin-twilight-return-o6");
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "The O6 M01–M05 receipts and nursery prerequisites are replayed through their actual reducers. Chromium walks to both real ground posts and the upper council terrace, then records all M06 actions through public controls.",
  routes: [], errors: [], passed: false,
};
await mkdir(out, { recursive: true });
let page, server, browser;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  for (const partial of [false, true]) {
    const seed = twilightAdmissionO6(partial);
    assert.equal(seed.originV151.littleTrailO6.success, !partial);
    const context = await browser.newContext({ viewport: { width: 1440, height: 940 }, reducedMotion: "reduce" });
    await context.addInitScript(({ key, seed }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(seed));
    }, { key: town.SAVE_STORAGE_KEY, seed });
    page = await context.newPage();
    page.setDefaultTimeout(65000);
    page.on("pageerror", error => report.errors.push(error.message));
    const missing = [];
    page.on("response", response => {
      const url = new URL(response.url());
      if (response.status() >= 400 && (/props-atlas|homeworld\/v84\/npcs/.test(url.pathname))) missing.push(url.pathname);
    });
    await page.clock.install();
    const city = page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]');
    const nav = homeworldNavigatorV77(page, town, { waypointTolerance: 9, driverTickMs: 36, pulseInputs: true });
    const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), town.SAVE_STORAGE_KEY);
    const receipt = async () => (await disk()).originV151.twilightReturnO6;
    const routeId = partial ? "actes" : "ambition";
    const shot = name => city.screenshot({ path: join(out, routeId + "-" + name + ".png"), animations: "disabled" });
    async function enter() {
      await page.clock.resume();
      await page.waitForSelector("[data-campaign-menu], [data-campaign-session], [data-homeworld-hub]");
      const play = page.getByRole("button", { name: "Jouer", exact: true });
      if (!(await city.isVisible()) && await page.locator("[data-campaign-menu]").isVisible()) {
        const campaign = page.locator('[data-menu-section="campaign"]');
        if (await campaign.isVisible()) await campaign.click();
        await page.locator('[data-menu-action="continue"]').click();
      }
      await city.or(play).first().waitFor();
      if (await play.isVisible()) await play.click();
      await city.waitFor({ timeout: 140000 });
      await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 850)));
      await nav.focus();
    }
    async function act(action, choice) {
      const target = twilight.twilightSiteO6(action);
      await nav.reach(target);
      await city.locator('[data-o6-twilight-action="' + action + '"]').waitFor();
      const at = await nav.position(), before = await receipt();
      await nav.release();
      await page.keyboard.press("KeyE");
      if (choice) {
        assert.deepEqual(await receipt(), before, "Focusing the intention makes no receipt.");
        await city.locator('[data-o6-twilight-choice="' + choice + '"]').click();
      }
      await nav.tick(120);
      const after = await receipt(), event = after?.journal.at(-1);
      assert.equal(after?.journal.length, (before?.journal.length ?? 0) + 1);
      assert.equal(event?.action, action);
      assert.equal(event.at.levelId, target.levelId);
      assert.ok(Math.hypot(at.x - event.at.exterior.x, at.y - event.at.exterior.y) < 16);
      assert.deepEqual((await disk()).homeworld.locationV77, event.at);
      console.log("O6_M06_ACTION", JSON.stringify({ routeId, action, at: event.at, choice }));
      return after;
    }
    async function reload(before) {
      await page.clock.resume();
      await page.reload();
      await enter();
      assert.deepEqual(await receipt(), before);
      const at = before.journal.at(-1).at;
      assert.equal(await nav.floor(), at.levelId);
      const position = await nav.position();
      assert.ok(Math.hypot(at.exterior.x - position.x, at.exterior.y - position.y) < 6);
    }

    await page.goto(host);
    await enter();
    await act("lift-marker");
    assert.ok(await city.locator("[data-o6-twilight-carry]").isVisible());
    await shot("portage");
    await reload(await receipt());
    assert.ok(await city.locator("[data-o6-twilight-carry]").isVisible());
    for (const action of ["stow-marker", "lift-rope", "stow-rope"]) await act(action);
    assert.ok(!(await city.locator("[data-o6-twilight-carry]").isVisible()));
    const first = partial ? "yena" : "tov";
    let record = await act(first);
    assert.equal(await nav.floor(), "+1");
    assert.equal(await city.locator("[data-o6-twilight-companion]").count(), 4);
    assert.ok(nav.routes.some(route => route.kind === "physical-connector" && route.from.levelId === "0" && route.to.levelId === "+1"));
    await shot("terrasse");
    assert.equal(record.resolved, false);
    await reload(record);
    await nav.focus();
    await page.keyboard.press("KeyE");
    await nav.tick(120);
    assert.deepEqual(await receipt(), record, "Listening again does not earn another receipt.");
    for (const speaker of ["saar", "yena", "harek", "tov"].filter(id => id !== first)) record = await act(speaker);
    const choice = partial ? "defer" : "exploration";
    record = await act("declare", choice);
    assert.deepEqual(record.transfers, ["marker", "rope"]);
    assert.equal(record.observations.length, 4);
    assert.equal(record.choice, choice);
    assert.equal(record.resolved, true);
    assert.equal(record.success, true);
    assert.deepEqual(record.trail, { success: !partial, choice: partial ? "behavior" : "map" });
    const after = await disk();
    for (const field of ["profile", "prologue", "youthTraining", "trophies", "loadout"]) assert.deepEqual(after[field], seed[field]);
    assert.deepEqual(after.originV151.littleTrailO6, seed.originV151.littleTrailO6);
    await reload(record);
    assert.equal(await city.locator("[data-o6-twilight-quest]").count(), 0);
    const replayed = [];
    for (const id of ["saar", "harek", "tov", "yena"]) {
      await nav.reach(twilight.twilightSiteO6(id));
      await city.locator('[data-o6-twilight-action="' + id + '"]').waitFor();
      await nav.release();
      await page.keyboard.press("KeyE");
      await nav.tick(120);
      const expected = twilight.twilightReplyO6(await disk(), { action: id });
      assert.ok((await city.locator('[aria-live="polite"][aria-atomic="true"]').allTextContents()).includes(expected));
      assert.deepEqual(await receipt(), record, "A conversation after the choice leaves the completed receipt intact.");
      replayed.push(id);
    }
    assert.deepEqual(missing, []);
    report.routes.push({ routeId, record, replayed, navigation: nav.routes });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.failure = String(error);
  if (page && !page.isClosed()) {
    report.screen = (await page.locator("body").innerText().catch(() => "")).slice(0, 3000);
    await page.screenshot({ path: join(out, "failure.png"), animations: "disabled" }).catch(() => {});
  }
  console.log("O6_M06_FAILURE", JSON.stringify({ error: report.failure, screen: report.screen, errors: report.errors }));
  throw error;
} finally {
  await browser?.close();
  await server?.close();
  await writeFile(join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
