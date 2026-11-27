import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { homeworldNavigatorV77 } from "./homeworld-navigation-browser-v77.mjs";
import { littleTrailAdmissionO6, rival, town, trail } from "../tests/helpers/origin-little-trail-o6.mjs";

const grounds = trail.LITTLE_TRAIL_O6;
const port = 4287, host = "http://127.0.0.1:" + port;
const out = resolve("outputs/qa-origin-little-trail-o6");
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "M01–M04 and the shared prerequisites are replayed through their original reducers. Chromium starts in public Homeworld with those receipts and plays all of M05 by public controls.",
  routes: [], errors: [], passed: false,
};
await mkdir(out, { recursive: true });
let page, server, browser;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  for (const scenario of [
    { id: "carte", partial: false, loss: null, report: "map", walkFromTown: true },
    { id: "empreintes", partial: true, loss: "startled", report: "behavior", walkFromTown: false },
    { id: "choc-sec", partial: true, loss: "decoy", report: "behavior", walkFromTown: true },
  ]) {
    const prior = littleTrailAdmissionO6({ partial: scenario.partial, nurseryPolicies: !scenario.partial });
    const regroup = prior.originV151.townBellO6.journal.find(event => event.action === "regroup").at;
    const seed = { ...prior, settings: { ...prior.settings, masterVolume: .32 },
      homeworld: { ...prior.homeworld, locationV77: scenario.walkFromTown ? regroup : prior.homeworld.locationV77 } };
    assert.equal(town.parseSaveImport(JSON.stringify(seed)).failure, null);
    const context = await browser.newContext({ viewport: { width: 1360, height: 930 }, reducedMotion: "reduce" });
    await context.addInitScript(({ key, seed }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(seed));
    }, { key: town.SAVE_STORAGE_KEY, seed });
    await context.addInitScript(() => {
      window.littleTrailFrequencies = [];
      const schedule = AudioParam.prototype.setValueAtTime;
      AudioParam.prototype.setValueAtTime = function (value, time) {
        if ([2450, 1860, 780, 420].includes(value)) window.littleTrailFrequencies.push(value);
        return schedule.call(this, value, time);
      };
    });
    page = await context.newPage();
    page.setDefaultTimeout(48000);
    page.on("pageerror", error => report.errors.push(error.message));
    await page.clock.install();
    const city = page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]');
    const scene = page.locator('[data-o6-m05][data-art-ready="true"]');
    const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), town.SAVE_STORAGE_KEY);
    const receipt = async () => (await disk()).originV151.littleTrailO6;
    const snap = name => scene.screenshot({ path: join(out, scenario.id + "-" + name + ".png"), animations: "disabled" });
    const nav = homeworldNavigatorV77(page, town, { waypointTolerance: 5, driverTickMs: 16, pulseInputs: true });
    async function pauseClock() {
      await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 700)));
    }
    async function enter(wanted) {
      await page.clock.resume();
      await page.waitForSelector("[data-campaign-menu], [data-campaign-session], [data-homeworld-hub], [data-o6-m05]");
      const play = page.getByRole("button", { name: "Jouer", exact: true });
      if (!(await wanted.isVisible()) && await page.locator("[data-campaign-menu]").isVisible()) {
        const campaign = page.locator('[data-menu-section="campaign"]');
        if (await campaign.isVisible()) await campaign.click();
        await page.locator('[data-menu-action="continue"]').click();
      }
      await wanted.or(play).first().waitFor();
      if (await play.isVisible()) await play.click();
      await wanted.waitFor({ timeout: 120000 });
      await pauseClock();
    }
    async function depart() {
      await nav.focus();
      assert.equal(await nav.room(), null);
      const site = rival.RIVAL_WORKSHOP_O6;
      assert.equal(await nav.floor(), site.levelId);
      const plan = town.homeworldWalkRouteV109(site.levelId, await nav.position(), site.point);
      assert.equal(plan.status, "reachable");
      await nav.follow(plan.points);
      await city.locator("[data-o6-little-trail-admission]").waitFor();
      await page.keyboard.press("KeyE");
      await nav.tick(210);
      const started = await receipt();
      assert.equal(started.journal.length, 0);
      assert.equal(started.rival.success, !scenario.partial);
      assert.deepEqual(started.at, (await disk()).homeworld.locationV77);
      console.log("O6_M05_ADMISSION", JSON.stringify({ scenario: scenario.id, at: started.at, prior: started.rival }));
      await page.clock.resume();
      await scene.waitFor({ timeout: 120000 });
      await pauseClock();
    }
    const position = async () => Number(await scene.getAttribute("data-position"));
    const stage = () => scene.getAttribute("data-stage");
    async function press(key) {
      await scene.focus();
      await page.keyboard.press(key);
    }
    async function walk(goal, radius = 8) {
      for (let step = 0; step < 82; step++) {
        const x = await position();
        if (Math.abs(x - goal) <= radius) return x;
        await press(x < goal ? "ArrowRight" : "ArrowLeft");
      }
      assert.fail("Could not walk to " + goal);
    }
    async function assertOrder(type, anticipatedStage) {
      const state = await receipt();
      assert.equal(state.journal.at(-1)?.type, type);
      const view = trail.littleTrailViewO6(state);
      assert.equal(view.stage, anticipatedStage);
      console.log("O6_M05_ACTION", JSON.stringify({ scenario: scenario.id, type, view, confirmed: state.lastConfirmed }));
    }
    const audioSignatures = [];
    async function hear(cue, pattern) {
      const before = await page.evaluate(() => window.littleTrailFrequencies.length);
      await press("KeyE");
      await page.clock.resume();
      await page.waitForFunction(({ before, pattern }) => {
        const captured = window.littleTrailFrequencies.slice(before);
        return pattern.every(frequency => captured.includes(frequency));
      }, { before, pattern }, { timeout: 10000 });
      await pauseClock();
      await assertOrder("sample", "listen");
      audioSignatures.push({ cue, frequencies: pattern });
      console.log("O6_M05_CUE", JSON.stringify({ scenario: scenario.id, cue, frequencies: pattern }));
    }
    async function cold(expectedStage, expectedPlane, expectedNote) {
      const before = await receipt();
      await page.clock.resume();
      await page.reload({ waitUntil: "domcontentloaded" });
      await enter(scene);
      assert.equal(await stage(), expectedStage);
      assert.equal(await scene.getAttribute("data-plane"), expectedPlane);
      assert.equal(await position(), trail.littleTrailViewO6(before).x);
      assert.equal((await receipt()).lastConfirmed.x, expectedNote);
      assert.deepEqual(await receipt(), before);
      await snap("02-reprise-" + expectedStage);
    }

    await page.goto(host);
    await enter(city);
    assert.equal(await receipt(), undefined);
    await depart();
    await walk(grounds.first - 80);
    await snap("01-premier-arret");
    await press("KeyE");
    await assertOrder("observe", "listen");

    await walk(grounds.pebble);
    await hear("pebble", [2450, 1860]);
    assert.deepEqual(trail.littleTrailViewO6(await receipt()).heard, ["pebble"]);
    await walk(grounds.rub);
    await hear("rub", [780, 420]);
    assert.deepEqual(trail.littleTrailViewO6(await receipt()).heard, ["pebble", "rub"]);
    await snap("03-sons");

    await scene.getByRole("button", { name: scenario.loss === "decoy" ? "Suivre le choc sec" : "Suivre le frottement" }).press("Enter");
    await assertOrder("identify", scenario.loss === "decoy" ? "search-anchor" : "far");
    if (scenario.loss === "startled") {
      for (let strand = 0; strand < 22 && await stage() === "far"; strand++) await press("ArrowRight");
      await assertOrder("lose", "search-anchor");
      await cold("search-anchor", "trail", grounds.first);
    }
    if (scenario.loss) {
      assert.deepEqual((await receipt()).lastConfirmed, { point: "first", x: grounds.first });
      await walk(grounds.first);
      await press("KeyE");
      await assertOrder("scan-anchor", "search-old");
      await walk(grounds.old);
      await press("KeyE");
      await assertOrder("scan-old", "rise");
    } else {
      await walk(grounds.far - 80);
      await press("KeyE");
      await assertOrder("observe", "rise");
    }
    await walk(grounds.climb);
    await press("KeyE");
    await page.clock.runFor(600);
    await assertOrder("ascend", "return");
    assert.equal(await scene.getAttribute("data-plane"), "overlook");
    if (scenario.loss === null) await cold("return", "overlook", grounds.far);
    await walk(grounds.gather);
    await press("KeyE");
    await assertOrder("compare", "report");
    assert.ok(await scene.getByText(scenario.partial ? "Tov" : "Harek", { exact: true }).isVisible());
    await snap("04-restitution");
    await scene.getByRole("button", { name: scenario.report === "map" ? "Rapporter la carte de trajet" : "Expliquer le comportement" }).press("Enter");
    await assertOrder("report", "closed");
    await page.clock.resume();
    await city.waitFor({ timeout: 120000 });
    const final = await disk(), result = final.originV151.littleTrailO6;
    assert.equal(result.resolved, true);
    assert.equal(result.success, scenario.loss === null);
    assert.equal(result.choice, scenario.report);
    assert.deepEqual(result.transfers, [scenario.report === "map" ? "relevé-de-piste" : "lecture-du-comportement"]);
    assert.deepEqual(final.trophies, seed.trophies);
    assert.deepEqual(final.inventory, seed.inventory);
    assert.deepEqual(final.prologue, seed.prologue);
    assert.deepEqual(final.originV151.rivalRaceO6, seed.originV151.rivalRaceO6);
    assert.deepEqual(final.homeworld.locationV77, result.at);
    assert.equal(town.parseSaveImport(JSON.stringify(final)).failure, null);
    report.routes.push({ scenario: scenario.id, audioSignatures, receipt: result });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  if (!report.passed && page && !page.isClosed()) {
    const screen = await page.locator("body").innerText({ timeout: 2000 }).then(line => line.slice(0, 2900), () => "");
    console.log("O6_M05_FAILURE", JSON.stringify({ screen, errors: report.errors }));
    await page.clock.resume().catch(() => {});
    await page.screenshot({ path: join(out, "failure.png") }).catch(() => {});
  }
  await writeFile(join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server?.close();
}
