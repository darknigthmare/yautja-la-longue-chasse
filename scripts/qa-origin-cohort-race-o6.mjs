import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { course as n, courtyardHandoffO6 } from "../tests/helpers/origin-cohort-race-o6.mjs";

const port = 4251, base = `http://127.0.0.1:${port}/`;
const output = resolve("outputs/qa-origin-cohort-race-o6");
const report = { commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "The common prologue and old M01 receipts are replayed through their game rules. The spear is still held in the desktop starting save, and the legacy mobile save has no M02 record.",
  passed: false, errors: [], routes: [] };
await mkdir(output, { recursive: true });

let server, browser, page;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });

  for (const legacy of [false, true]) {
    const proof = courtyardHandoffO6({ partial: legacy });
    const seed = legacy ? proof.returned : proof.before;
    assert.equal(seed.originV151.cohortRaceO6, undefined);
    const context = await browser.newContext({ viewport: legacy ? { width: 440, height: 820 } : { width: 1440, height: 950 },
      reducedMotion: "reduce", ...(legacy ? { hasTouch: true, isMobile: true } : {}) });
    await context.addInitScript(({ initial, key }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(initial));
    }, { initial: seed, key: n.SAVE_STORAGE_KEY });
    page = await context.newPage();
    page.setDefaultTimeout(55000);
    page.on("pageerror", error => report.errors.push(error.message));
    const first = page.locator("[data-o6-m01]");
    const course = page.locator("[data-o6-m02]");
    const city = page.locator('[data-homeworld-hub="true"]');
    const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), n.SAVE_STORAGE_KEY);
    const saved = async () => (await disk()).originV151.cohortRaceO6;
    const named = (scope, name) => scope.getByRole("button", { name, exact: true });
    async function enter(target) {
      await page.waitForSelector("[data-campaign-menu], [data-campaign-session]");
      const play = page.getByRole("button", { name: "Jouer", exact: true });
      if (!(await target.isVisible()) && await page.locator("[data-campaign-menu]").isVisible()) {
        const section = page.locator('[data-menu-section="campaign"]');
        if (await section.isVisible()) await section.click();
        await page.locator('[data-menu-action="continue"]').click();
      }
      await target.or(play).first().waitFor();
      if (await play.isVisible()) await play.click();
      await target.waitFor();
    }
    async function walk(scope, x) {
      const position = async () => Number(await scope.getAttribute("data-position"));
      for (let step = 0; step < 70 && Math.abs(await position() - x) > 6; step++) {
        const previous = await position();
        await named(scope, previous < x ? "Marcher à droite" : "Marcher à gauche").click();
        assert.notEqual(await position(), previous);
      }
      assert.ok(Math.abs(await position() - x) <= 6);
    }
    async function stage(value) {
      await course.and(page.locator(`[data-stage="${value}"]`)).waitFor();
      await page.waitForFunction(() => {
        const button = document.querySelector('[data-o6-m02] button[aria-label="Marcher à droite"]');
        return button instanceof HTMLButtonElement && !button.disabled;
      });
    }
    async function firstTwoJumps() {
      await stage("start");
      await walk(course, n.COHORT_COURSE_O6.start.launch);
      await named(course, "Sauter").click();
      await stage("lower");
      await walk(course, n.COHORT_COURSE_O6.lower.launch);
      await named(course, "Sauter").click();
      await stage("upper");
      const steps = (await saved()).round;
      assert.equal(steps.length, 2);
      assert.equal(steps.every(step => step.type === "jump"), true);
      await walk(course, n.COHORT_COURSE_O6.upper.launch);
    }
    async function capture(name) {
      await page.screenshot({ path: join(output, (legacy ? "mobile-" : "desktop-") + name + ".png"), animations: "disabled" });
    }

    await page.goto(base);
    if (legacy) {
      await enter(city);
      assert.equal(await course.count(), 0);
      await named(city, "Navigation").click();
      await city.locator("[data-o6-cohort-entry]").click();
    } else {
      await enter(first);
      const net = (await disk()).originV151.firstShockO6.netX;
      assert.equal(await course.count(), 0);
      await walk(first, net);
      await named(first, "Rendre l’arme d’exercice").click();
      await first.waitFor({ state: "hidden" });
    }
    await stage("choice");
    assert.deepEqual((await saved()).round, []);
    assert.equal((await saved()).opening.success, !legacy);
    const pixels = await course.locator("canvas").evaluate(canvas => {
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let lit = 0;
      for (let i = 0; i < data.length; i += 437 * 4) if (data[i] + data[i + 1] + data[i + 2] > 80) lit++;
      return lit;
    });
    assert.ok(pixels > 100, "The native backdrop, bags and younglings are drawn.");
    if (legacy) assert.match(await course.innerText(), /corde de sécurité/);
    await walk(course, n.COHORT_CHOICE_POSTS_O6[legacy ? "observe" : "lead"]);
    await named(course, legacy ? "Observer depuis l’arrière" : "Prendre la tête").click();
    await firstTwoJumps();

    if (!legacy) {
      assert.equal(await course.getAttribute("data-signalled"), "false");
      await named(course, "Sauter").click();
      await stage("rally");
      assert.match(await course.innerText(), /Yena, Tov et Harek t’attendent/);
      assert.equal((await saved()).roundsLost, 1);
      assert.deepEqual((await saved()).observations, ["fall"]);
      await capture("early-jump-rally");
      await page.reload({ waitUntil: "domcontentloaded" });
      await enter(course);
      await stage("rally");
      await walk(course, n.COHORT_RALLY_X_O6);
      await named(course, "Reprendre avec la cohorte").click();
      await firstTwoJumps();
    }

    await course.and(page.locator('[data-signalled="true"]')).waitFor();
    const signal = (await saved()).round.at(-1);
    assert.equal(signal.type, "signal");
    assert.ok(signal.elapsed >= n.COHORT_SIGNAL_WAIT_O6);
    assert.match(await course.innerText(), legacy ? /Yena montre la main ouverte/ : /Tov montre la main ouverte/);
    await capture("upper-signal");
    if (!legacy) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await enter(course);
      await stage("upper");
      assert.equal(await course.getAttribute("data-signalled"), "true");
    }
    await named(course, "Sauter").click();
    await stage("finish");
    await walk(course, n.COHORT_COURSE_O6.finish.launch);
    await capture("finish-help");
    await named(course, legacy ? "Montrer l’appui à Harek" : "Stabiliser le nœud avec Yena").click();
    await course.waitFor({ state: "hidden" });
    await city.getByRole("heading", { name: "La Cité des Premiers Trophées", exact: true }).waitFor();

    const final = await disk();
    const receipt = final.originV151.cohortRaceO6;
    assert.deepEqual(final.prologue, seed.prologue);
    assert.deepEqual(final.inventory, seed.inventory);
    assert.deepEqual(final.originV151.firstShockO6, proof.returned.originV151.firstShockO6);
    assert.ok(receipt.resolved && receipt.success);
    const partner = legacy ? "harek" : "yena";
    assert.equal(receipt.relation.partner, partner);
    assert.deepEqual(receipt.observations, legacy ? ["signal-yena"] : ["fall", "signal-tov"]);
    report.routes.push({ legacy, platform: legacy ? "mobile" : "desktop", receipt });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  if (!report.passed && page && !page.isClosed()) {
    report.screen = await page.locator("body").innerText({ timeout: 3000 }).then(value => value.slice(0, 1800), () => "");
    console.log("O6_M02_FAILURE", JSON.stringify({ errors: report.errors, screen: report.screen }));
    await page.screenshot({ path: join(output, "failure.png") }).catch(() => {});
  }
  await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server?.close();
}
