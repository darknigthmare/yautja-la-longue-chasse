import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { templeCampaignRoute } from "../tests/helpers/solo-v70-played-route.mjs";
import { homeworldSceneSsrV78 } from "../tests/helpers/homeworld-scene-ssr-v78.mjs";

const modules = homeworldSceneSsrV78();
const saves = modules.load("app/game/save.ts");
const triad = modules.load("app/game/systems/homeworldTriadM016.ts");
const interiors = modules.load("app/game/systems/homeworldInteriorsV64.ts");
const { HOMEWORLD_BUILDINGS_V77 } = modules.load("app/game/systems/homeworldWorldV77.ts");
const { homeworldBuildingDoorwayV64 } = modules.load("app/game/systems/homeworldGeometryV64.ts");
const { resolveHomeworldLocationV77 } = modules.load("app/game/systems/homeworldLocationV77.ts");
const seed = templeCampaignRoute().save;
seed.settings.masterVolume = 0;
const key = saves.SAVE_STORAGE_KEY;
const output = resolve(process.env.M016_CITY_OUTPUT ?? "outputs/qa-homeworld-triad-city-m016");
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  fixtures: "Prior native campaign reducers finish V70. Each room starts beyond service reach. Travel between rooms is not part of this test.",
  stations: [], errors: [], passed: false,
};

function approachFor(station, save) {
  const room = interiors.homeworldInteriorForBuildingV64(station.roomId);
  const building = HOMEWORLD_BUILDINGS_V77.find(building => building.id === station.roomId);
  const point = room?.points.find(point => point.pointId === station.pointId);
  assert(room && building && point);
  for (const [dx, dy, key] of [[0, 1, "ArrowUp"], [1, 0, "ArrowLeft"], [-1, 0, "ArrowRight"], [0, -1, "ArrowDown"]]) {
    const at = d => ({ x: point.x + dx * d, y: point.y + dy * d });
    const safe = Array.from({ length: 40 }, (_, i) => at(49 + i)).every(p => interiors.isHomeworldInteriorWalkableV64(room, p));
    if (!safe || interiors.nearestHomeworldInteriorTargetV64(room, at(49))?.pointId !== station.pointId ||
        interiors.nearestHomeworldInteriorTargetV64(room, at(88))) continue;
    const checkpoint = { version: 1, layoutRevision: 1, ownerCreatedAt: save.createdAt, levelId: building.levelId,
      exterior: homeworldBuildingDoorwayV64(building).approach, interiorId: station.roomId, local: at(88) };
    if (resolveHomeworldLocationV77(checkpoint, save.createdAt).restored) return { checkpoint, key };
  }
  throw Error("No walkable service approach in " + station.roomId);
}

await mkdir(output, { recursive: true });
let browser, server;
try {
  server = await createServer({
    configFile: resolve("desktop/vite.config.ts"),
    server: { host: "127.0.0.1", port: 4291, strictPort: true },
  });
  await server.listen();
  browser = await chromium.launch({ args: ["--no-sandbox"] });
  let played = seed;
  for (const [index, station] of triad.TRIAD_CITY_STATIONS_M016.entries()) {
    const { checkpoint, key: walk } = approachFor(station, played);
    const scenario = { ...played, homeworld: { ...played.homeworld, locationV77: checkpoint } };
    assert(saves.parseSaveImport(saves.exportSave(scenario)).save);
    const context = await browser.newContext({ viewport: { width: 1360, height: 980 }, reducedMotion: "reduce" });
    await context.addInitScript(({ key, scenario }) => {
      if (sessionStorage.getItem("m016-city-seeded")) return;
      sessionStorage.setItem("m016-city-seeded", "1");
      localStorage.setItem(key, JSON.stringify(scenario));
    }, { key, scenario });
    const page = await context.newPage();
    const failures = [];
    page.on("pageerror", error => report.errors.push(error.message));
    page.on("response", response => {
      const url = new URL(response.url());
      if (response.status() >= 400 && url.hostname === "127.0.0.1") failures.push([response.status(), url.pathname]);
    });
    await page.clock.install();
    await page.goto("http://127.0.0.1:4291");
    const hub = page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"][data-homeworld-interior-id="' + station.roomId + '"]');
    const actor = hub.locator("[data-homeworld-actor]");
    const viewport = hub.locator("[data-homeworld-viewport]");
    const panel = page.locator('[data-homeworld-m016-station="' + station.partner + '"]');
    const advance = panel.locator("[data-homeworld-m016-advance]");
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    async function boot() {
      await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
      const campaign = page.locator('[data-menu-section="campaign"]');
      if (await campaign.isVisible()) await campaign.click();
      await page.locator('[data-menu-action="continue"]').click();
      try {
        await hub.waitFor({ timeout: 55000 });
      } catch (error) {
        const state = await page.evaluate(() => {
          const h = document.querySelector("[data-homeworld-hub]");
          const overlay = document.querySelector("[data-homeworld-motion-loading-v74]");
          return { ready: h?.getAttribute("data-homeworld-motion-ready"), room: h?.getAttribute("data-homeworld-interior-id"), motion: overlay?.textContent,
            screen: document.body.innerText.trim().split("\n").slice(0, 10) };
        });
        console.error(JSON.stringify({ state, failures: failures.slice(0, 25), pageErrors: report.errors.slice(0, 10) }));
        await page.screenshot({ path: resolve(output, station.partner + "-boot.png"), animations: "disabled" }).catch(() => {});
        throw error;
      }
      await viewport.focus();
    }
    await boot();
    await hub.locator('[data-homeworld-m016-partner="' + station.partner + '"]').waitFor({ state: "attached" });
    const start = await actor.evaluate(el => [Number(el.dataset.x), Number(el.dataset.y)]);
    assert(Math.hypot(start[0] - checkpoint.local.x, start[1] - checkpoint.local.y) <= 2);
    await page.keyboard.press("KeyE");
    assert.equal(await panel.count(), 0, "M016 requires approaching the actual room service");
    await page.keyboard.down(walk);
    try {
      for (let i = 0; i < 40 && !await hub.locator('[data-homeworld-interior-target="point"]').count(); i++) {
        await page.clock.runFor(40);
      }
    } finally {
      await page.keyboard.up(walk);
      await page.clock.runFor(110);
    }
    const stopped = await actor.evaluate(el => [Number(el.dataset.x), Number(el.dataset.y)]);
    assert(Math.hypot(start[0] - stopped[0], start[1] - stopped[1]) >= 20);
    await page.keyboard.press("KeyE");
    await panel.waitFor();
    assert.equal(await panel.getAttribute("data-phase"), "0");
    for (let step = 1; step <= station.demonstration.length + 1; step++) {
      await advance.click();
      await page.waitForFunction(({ key, station, step }) =>
        JSON.parse(localStorage.getItem(key))?.homeworld.triadCityM016?.steps[station] === step,
      { key, station: station.partner, step });
      await page.locator('[data-homeworld-m016-station="' + station.partner + '"][data-phase="' + step + '"]').waitFor();
      if (step === 1) {
        await page.reload();
        await boot();
        await page.keyboard.press("KeyE");
        await panel.waitFor();
        assert.equal(await panel.getAttribute("data-phase"), "1");
      }
    }
    await panel.getByText("Rendez-vous confirmé", { exact: true }).waitFor();
    await page.screenshot({ path: resolve(output, station.partner + "-rendezvous.png"), animations: "disabled" });
    played = await read();
    assert(!played.soloV90, "The city by itself cannot open or complete the gallery");
    assert.deepEqual(played.prologue.chronicle, scenario.prologue.chronicle);
    report.stations.push({ room: station.roomId, partner: station.partner, start, stopped,
      saved: played.homeworld.triadCityM016.steps[station.partner], coldResume: true, nativePromotion: false });
    if (index === 1) {
      const gallery = page.locator("[data-solo-v90-enter]");
      assert.match(await gallery.innerText(), /Saar et Vek/);
      await gallery.click();
      await page.locator('[data-solo-v90][data-solo-step="briefing"]').waitFor({ timeout: 90000 });
      const entered = await read();
      assert.deepEqual(entered.homeworld.triadCityM016, played.homeworld.triadCityM016);
      assert.deepEqual(entered.soloV90.checkpoint.partnerObservations, {});
      assert.deepEqual(entered.soloV90.receipts, []);
      report.gallery = { nativeEntry: true, rankUnchanged: true, playedGalleryReceipts: 0 };
    }
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  await browser?.close();
  await server?.close();
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
