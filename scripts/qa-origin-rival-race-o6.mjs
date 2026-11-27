import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { homeworldNavigatorV77 } from "./homeworld-navigation-browser-v77.mjs";
import { findRivalLaunchO6, rival, rivalAdmissionO6, town } from "../tests/helpers/origin-rival-race-o6.mjs";

const port = 4286, host = "http://127.0.0.1:" + port;
const out = resolve("outputs/qa-origin-rival-race-o6");
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "O6-M01/M02/M03 and their prerequisites are replayed through their reducers. Chromium starts at the actual M03 saved landmark, then walks to Harek and plays all of M04 using public controls.",
  routes: [], errors: [], passed: false,
};
await mkdir(out, { recursive: true });
let page, server, browser;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const cases = [
    { id: "poutre", route: "race", partial: false, checkpoint: "beam", fall: false },
    { id: "avertissement", route: "warn", partial: true, checkpoint: null, fall: false },
    { id: "palier", route: "warn", partial: true, checkpoint: "lower", fall: true },
  ];
  for (const scenario of cases) {
    const seed = rivalAdmissionO6({ partial: scenario.partial, nurseryPolicies: !scenario.partial });
    const context = await browser.newContext({ viewport: { width: 1360, height: 930 }, reducedMotion: "reduce" });
    await context.addInitScript(({ key, seed }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(seed));
    }, { key: town.SAVE_STORAGE_KEY, seed });
    page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.on("pageerror", error => report.errors.push(error.message));
    await page.clock.install();
    const city = page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]');
    const roof = page.locator("[data-o6-m04]");
    const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), town.SAVE_STORAGE_KEY);
    const receipt = async () => (await disk()).originV151.rivalRaceO6;
    const snap = (locator, name) => locator.screenshot({ path: join(out, scenario.id + "-" + name + ".png"), animations: "disabled" });
    const nav = homeworldNavigatorV77(page, town, { waypointTolerance: 5, driverTickMs: 16, pulseInputs: true });
    async function enter(scene) {
      await page.clock.resume();
      await page.waitForSelector("[data-campaign-menu], [data-campaign-session], [data-homeworld-hub], [data-o6-m04]");
      const play = page.getByRole("button", { name: "Jouer", exact: true });
      if (!(await scene.isVisible()) && await page.locator("[data-campaign-menu]").isVisible()) {
        const campaign = page.locator('[data-menu-section="campaign"]');
        if (await campaign.isVisible()) await campaign.click();
        await page.locator('[data-menu-action="continue"]').click();
      }
      await scene.or(play).first().waitFor();
      if (await play.isVisible()) await play.click();
      await scene.waitFor({ timeout: 120000 });
      await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 800)));
    }
    async function routeToRival() {
      await nav.focus();
      const interiorId = await nav.room();
      if (interiorId) {
        const room = town.homeworldInteriorForBuildingV64(interiorId);
        const path = town.homeworldInteriorRouteV112(room, await nav.position(), "exit");
        assert.equal(path.status, "reachable");
        await nav.follow(path.points);
        assert.equal(town.nearestHomeworldInteriorTargetV64(room, await nav.position())?.kind, "exit");
        await page.keyboard.press("KeyE");
        await nav.tick(160);
        assert.equal(await nav.room(), null);
        await nav.focus();
      }
      const site = rival.RIVAL_WORKSHOP_O6;
      assert.equal(await nav.floor(), site.levelId);
      const path = town.homeworldWalkRouteV109(site.levelId, await nav.position(), site.point);
      assert.equal(path.status, "reachable");
      await nav.follow(path.points);
      assert.ok(rival.atRivalWorkshopO6(site.levelId, await nav.position(), null));
      const actual = city.locator("[data-o6-rival-admission]");
      await actual.waitFor();
      await page.keyboard.press("KeyE");
      await nav.tick(230);
      await roof.waitFor();
      const saved = await disk();
      assert.deepEqual(saved.homeworld.locationV77, saved.originV151.rivalRaceO6.at);
      assert.deepEqual(saved.originV151.townBellO6, seed.originV151.townBellO6);
      assert.equal(saved.originV151.rivalRaceO6.journal.length, 0);
    }
    const position = async () => Number(await roof.getAttribute("data-position"));
    const surface = () => roof.getAttribute("data-platform");
    async function press(key, count = 1) {
      await roof.focus();
      for (let i = 0; i < count; i++) await page.keyboard.press(key);
    }
    async function approach(target, radius) {
      for (let step = 0; step < 87; step++) {
        const x = await position();
        if (Math.abs(x - target) <= radius) return x;
        await press(x < target ? "ArrowRight" : "ArrowLeft");
      }
      assert.fail("Could not walk to " + target);
    }
    async function checkOrder(type, after) {
      const state = await receipt();
      assert.equal(state.journal.at(-1)?.type, type);
      const view = rival.rivalRaceViewO6(state);
      if (after) assert.equal(view.platform, after);
      console.log("O6_M04_ACTION", JSON.stringify({ scenario: scenario.id, type, view, outcome: state.harek }));
      return view;
    }
    async function jump(kind, expected) {
      const platform = await surface();
      const startingBeat = Number(await roof.getAttribute("data-beat"));
      const start = await position();
      const plan = findRivalLaunchO6(platform, scenario.route, start, kind, rival.RIVAL_SUPPORTS_O6[platform].right, startingBeat);
      if (plan.steps) await press(plan.steps > 0 ? "ArrowRight" : "ArrowLeft", Math.abs(plan.steps));
      const here = await position();
      assert.equal(here, plan.order.x);
      if (await roof.getAttribute("data-facing") === "-1") {
        await press("ArrowLeft");
        await press("ArrowRight");
        assert.equal(await position(), here);
      }
      let ready = false;
      for (let ticks = 0; ticks <= rival.RIVAL_ROOF_O6.cycle; ticks++) {
        const beat = Number(await roof.getAttribute("data-beat"));
        const flight = rival.simulateRivalJumpO6(platform, scenario.route, { type: "jump", x: here, direction: 1, beat }, false);
        if (flight?.outcome === kind) { ready = true; break; }
        await page.clock.runFor(42);
      }
      assert.ok(ready, "The genuine tide of the beam never offered the planned alignment");
      const count = (await receipt()).journal.length;
      await press("Space");
      assert.equal(await roof.getAttribute("data-flight"), "true");
      await page.clock.runFor(500);
      assert.equal((await receipt()).journal.length, count + 1);
      return checkOrder("jump", expected);
    }
    async function resume(platform) {
      const before = await receipt();
      await page.clock.resume();
      await page.reload({ waitUntil: "domcontentloaded" });
      await enter(roof);
      assert.equal(await surface(), platform);
      assert.equal(await position(), rival.rivalRaceViewO6(before).x);
      assert.deepEqual(await receipt(), before);
      await snap(roof, "02-reprise-" + platform);
    }

    await page.goto(host);
    await enter(city);
    assert.equal(await receipt(), undefined);
    await routeToRival();
    await approach(rival.RIVAL_HAREK_POST_O6, 8);
    await press("KeyE");
    await checkOrder("observe", "start");
    assert.equal(await roof.locator("[data-o6-harek-pose]").getAttribute("data-o6-harek-pose"), "hesitates");
    await snap(roof, "01-hesitation");
    await roof.getByRole("button", { name: scenario.route === "warn" ? "Avertir Harek" : "Prendre la poutre" }).press("Enter");
    await checkOrder("choose", "start");
    if (scenario.route === "race") {
      await jump("land", "beam");
      if (scenario.checkpoint === "beam") await resume("beam");
      await jump("land", "flag");
    } else {
      await jump("land", "bridgeA");
      await jump("land", "bridgeB");
      await jump(scenario.fall ? "fall" : "land", scenario.fall ? "lower" : "flag");
    }
    if (scenario.fall) {
      await resume("lower");
      await approach(rival.RIVAL_LADDER_O6, 16);
      await press("KeyE");
      await page.clock.runFor(300);
      await checkOrder("climb", "flag");
    }
    await approach(rival.RIVAL_FLAG_O6, 18);
    await snap(roof, "03-fanion");
    await press("KeyE");
    await checkOrder("finish", "flag");
    await city.waitFor();
    const result = await disk(), rivalResult = result.originV151.rivalRaceO6;
    assert.equal(rivalResult.resolved, true);
    assert.equal(rivalResult.success, !scenario.fall);
    assert.equal(rivalResult.harek, scenario.route === "warn" ? "warning" : "lead");
    assert.deepEqual(result.prologue, seed.prologue);
    assert.deepEqual(result.inventory, seed.inventory);
    assert.deepEqual(result.originV151.townBellO6, seed.originV151.townBellO6);
    assert.deepEqual(result.homeworld.locationV77, rivalResult.at);
    assert.equal(town.parseSaveImport(JSON.stringify(result)).failure, null);
    report.routes.push({ scenario: scenario.id, resumedAt: scenario.checkpoint, receipt: rivalResult });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  if (!report.passed && page && !page.isClosed()) {
    const screen = await page.locator("body").innerText({ timeout: 2500 }).then(t => t.slice(0, 2800), () => "");
    console.log("O6_M04_FAILURE", JSON.stringify({ screen, errors: report.errors }));
    await page.clock.resume().catch(() => {});
    await page.screenshot({ path: join(out, "failure.png") }).catch(() => {});
  }
  await writeFile(join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server?.close();
}
