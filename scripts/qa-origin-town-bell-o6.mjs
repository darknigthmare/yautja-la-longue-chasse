import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { homeworldNavigatorV77 } from "./homeworld-navigation-browser-v77.mjs";
import { town as n, townActorPositionO6, townAdmissionO6 } from "../tests/helpers/origin-town-bell-o6.mjs";

const host = "http://127.0.0.1:4285";
const out = resolve("outputs/qa-origin-town-bell-o6");
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "Common nursery and M01/M02 are replayed through their genuine reducers. Browser admission is on the public lower Council landing, with the O6-M03 journal absent.",
  routes: [], errors: [], passed: false,
};
await mkdir(out, { recursive: true });
let page, server, browser;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port: 4285, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  for (const partial of [false, true]) {
    const { ready: seed } = townAdmissionO6({ partial });
    const context = await browser.newContext({ viewport: { width: 1440, height: 940 }, reducedMotion: "reduce" });
    await context.addInitScript(({ key, seed }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(seed));
    }, { key: n.SAVE_STORAGE_KEY, seed });
    page = await context.newPage();
    page.setDefaultTimeout(65000);
    page.on("pageerror", error => report.errors.push(error.message));
    await page.clock.install();
    const city = page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]');
    const viewport = city.locator("[data-homeworld-viewport]");
    const nav = homeworldNavigatorV77(page, n, { waypointTolerance: 9, driverTickMs: 36, pulseInputs: true });
    const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), n.SAVE_STORAGE_KEY);
    const receipt = async () => (await disk()).originV151.townBellO6;
    const shot = name => viewport.screenshot({ path: join(out, (partial ? "deferred-" : "complete-") + name + ".png"), animations: "disabled" });
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
      await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
      await nav.focus();
    }
    async function street(action) {
      const place = townActorPositionO6(action);
      assert.equal(await nav.room(), null);
      assert.equal(await nav.floor(), place.levelId);
      const route = n.homeworldWalkRouteV109(place.levelId, await nav.position(), place.point);
      assert.equal(route.status, "reachable", JSON.stringify({ action, position: await nav.position(), place }));
      if (route.points.length > 1) await nav.follow(route.points);
    }
    async function act(action) {
      await viewport.locator(`[data-o6-town-action="${action}"]`).waitFor();
      const at = await nav.position(), prev = await receipt();
      await nav.interact();
      const next = await receipt();
      assert.equal(next.journal.length, (prev?.journal.length ?? 0) + 1, action);
      const event = next.journal.at(-1);
      assert.equal(event.action, action);
      assert.equal(event.at.interiorId, await nav.room());
      const recorded = event.at.local ?? event.at.exterior;
      assert.ok(Math.hypot(at.x - recorded.x, at.y - recorded.y) < 16, JSON.stringify({ action, at, recorded }));
      const current = await disk();
      assert.deepEqual(current.homeworld.locationV77, event.at);
      assert.deepEqual(current.originV151.cohortRaceO6, seed.originV151.cohortRaceO6);
    }
    async function visitForge(action) {
      const room = n.homeworldInteriorForBuildingV64("deep-forge");
      if (await nav.room() !== room.buildingId) await nav.enter(room.buildingId);
      const route = n.homeworldWayfindingInteriorRouteV75(room, await nav.position(), "forge-service");
      assert.equal(route.status, "reachable");
      await nav.follow(route.points);
      await act(action);
    }

    await page.goto(host);
    await enter();
    assert.equal(await receipt(), undefined);
    await viewport.locator("[data-o6-town-saar]").waitFor();
    await act("begin");
    assert.equal((await receipt()).carriesPiece, true);
    assert.equal(await viewport.locator("[data-o6-town-piece]").count(), 1);
    assert.equal(await viewport.locator("[data-o6-town-cohort]").count(), partial ? 2 : 3);
    assert.equal((await receipt()).race.success, !partial);
    assert.match(await page.locator("body").innerText(), partial ? /La manche attendra/ : /Yena te montre comment porter/);
    await street("workshops");
    await shot("01-saar-rue-ateliers");
    await act("workshops");
    if (!partial) {
      const stored = await receipt();
      await page.clock.resume();
      await page.reload({ waitUntil: "domcontentloaded" });
      await enter();
      assert.deepEqual(await receipt(), stored);
      const point = stored.journal.at(-1).at.exterior, actual = await nav.position();
      assert.ok(Math.hypot(point.x - actual.x, point.y - actual.y) < 15);
    }
    await street("square");
    await act("square");
    await street("unlatch");
    assert.equal(await viewport.locator('[data-o6-town-gate="closed"]').count(), 1);
    await act("unlatch");
    assert.equal(await viewport.locator('[data-o6-town-gate="open"]').count(), 1);
    await shot("02-grille-ouverte");
    await visitForge("deliver");
    assert.equal((await receipt()).carriesPiece, false);
    assert.equal(await viewport.locator("[data-o6-town-piece]").count(), 0);

    const room = n.homeworldInteriorForBuildingV64("deep-forge");
    const exit = n.homeworldWayfindingInteriorRouteV75(room, await nav.position(), "exit");
    assert.equal(exit.status, "reachable");
    await nav.follow(exit.points);
    const bell = townActorPositionO6("ring").point;
    await nav.follow([await nav.position(), room.spawn, bell]);
    await act("ring");
    assert.equal(await viewport.locator('[data-o6-town-bell="rung"]').count(), 1);
    await shot("03-cloche");
    await nav.exitRoom();
    await street("regroup");
    await act("regroup");

    if (!partial) {
      await visitForge("workshop");
      await shot("04-yena-atelier");
      await nav.exitRoom();
      await street("kennel");
      await act("kennel");
      assert.equal((await receipt()).choice, "workshop");
    } else {
      await street("kennel");
      await shot("04-tov-chenil");
      await act("kennel");
      assert.equal((await receipt()).choice, "kennel");
    }

    const final = await disk();
    const saved = final.originV151.townBellO6;
    assert.ok(saved.resolved && saved.success);
    assert.deepEqual(final.inventory, seed.inventory);
    assert.deepEqual(final.prologue, seed.prologue);
    assert.deepEqual(final.originV151.firstShockO6, seed.originV151.firstShockO6);
    assert.equal(n.parseSaveImport(JSON.stringify(final)).failure, null);
    report.routes.push({ prior: partial ? "partial" : "success", receipt: saved, inputRoutes: nav.routes });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  if (!report.passed && page && !page.isClosed()) {
    report.screen = await page.locator("body").innerText({ timeout: 2500 }).then(text => text.slice(0, 2500), () => "");
    console.log("O6_M03_FAILURE", JSON.stringify({ screen: report.screen, errors: report.errors }));
    await page.clock.resume().catch(() => {});
    await page.screenshot({ path: join(out, "failure.png") }).catch(() => {});
  }
  await writeFile(join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server?.close();
}
