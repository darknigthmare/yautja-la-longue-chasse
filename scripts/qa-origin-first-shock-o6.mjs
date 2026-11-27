import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { admittedFirstShockO6, firstShock as n } from "../tests/helpers/origin-first-shock-o6.mjs";

const port = 4247;
const url = `http://127.0.0.1:${port}/`;
const output = resolve("outputs/qa-origin-first-shock-o6");
const { completed: commonPrologue } = admittedFirstShockO6();
const key = n.SAVE_STORAGE_KEY;
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  setup: "The shared prologue completion is obtained by replaying the actual opening, duel and cohort. O6-M01 is empty at Chrome admission.",
  passed: false, errors: [], routes: [],
};
assert.deepEqual(commonPrologue.originV151.firstShockO6.journal, []);
await mkdir(output, { recursive: true });

let browser, server, page;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  for (const route of ["saar", "harek"]) {
    const mobile = route === "harek";
    const context = await browser.newContext({ viewport: mobile ? { width: 440, height: 820 } : { width: 1440, height: 950 }, reducedMotion: "reduce" });
    await context.addInitScript(({ seed, key }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(seed));
    }, { seed: commonPrologue, key });
    page = await context.newPage();
    page.setDefaultTimeout(50000);
    page.on("pageerror", error => report.errors.push(error.message));
    const root = page.locator("[data-o6-m01]");
    const moveLeft = root.getByRole("button", { name: "Marcher à gauche" });
    const moveRight = root.getByRole("button", { name: "Marcher à droite" });
    const disk = () => page.evaluate(saveKey => JSON.parse(localStorage.getItem(saveKey)), key);
    const state = async () => (await disk()).originV151.firstShockO6;
    const position = async () => Number(await root.getAttribute("data-position"));
    const stage = async () => root.getAttribute("data-stage");
    const saw = (name, options) => root.getByRole("button", { name, exact: true, ...options });
    const waitReady = () => page.waitForFunction(() => {
      const button = document.querySelector('[data-o6-m01] button[aria-label="Marcher à droite"]');
      return button instanceof HTMLButtonElement && !button.disabled;
    });
    async function enter() {
      await page.waitForSelector("[data-campaign-menu], [data-campaign-session], [data-o6-m01]");
      const play = page.getByRole("button", { name: "Jouer", exact: true });
      if (!(await root.isVisible()) && await page.locator("[data-campaign-menu]").isVisible()) {
        const section = page.locator('[data-menu-section="campaign"]');
        if (await section.isVisible()) await section.click();
        await page.locator('[data-menu-action="continue"]').click();
      }
      await root.or(play).first().waitFor();
      if (await play.isVisible()) await play.click();
      await root.waitFor();
      await waitReady();
      const lit = await root.locator("canvas").evaluate(canvas => {
        const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        let lit = 0;
        for (let i = 0; i < pixels.length; i += 109 * 4) {
          if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 27) lit++;
        }
        return lit;
      });
      assert.ok(lit > 100, "The native courtyard backdrop is rendered");
    }
    async function walk(target) {
      for (let steps = 0; steps < 65 && Math.abs(await position() - target) > 6; steps++) {
        const before = await position();
        await (before < target ? moveRight : moveLeft).click();
        assert.notEqual(await position(), before);
      }
      assert.ok(Math.abs(await position() - target) <= 6);
    }

    await page.goto(url);
    await enter();
    assert.equal(await stage(), "retrieve");
    const net = (await state()).netX;
    assert.equal(await saw("Récupérer l’arme d’exercice").count(), 0);
    await walk(net);
    await saw("Récupérer l’arme d’exercice").click();
    assert.equal(await stage(), "escort");
    assert.equal(await saw("Rejoindre Harek avec Saar").count(), 0);
    await page.screenshot({ path: join(output, `${route}-escort.png`), animations: "disabled" });
    await walk(n.FIRST_SHOCK_HAREK_O6);
    await saw("Rejoindre Harek avec Saar").click();
    assert.deepEqual((await state()).observations, ["harek-cohort"]);

    if (route === "saar") {
      await saw("Revoir le geste avec Saar").click();
      await walk(net + 12);
      await saw("Caler la corde").click();
      assert.match(await root.innerText(), /L’appui a glissé/);
      const missed = await state();
      assert.equal(missed.resolved, false);
      assert.equal(missed.success, false);
      assert.deepEqual(missed.transfers, []);
      assert.equal(await position(), n.firstShockResumeX(missed));
      await page.screenshot({ path: join(output, "saar-retry.png"), animations: "disabled" });
      await page.reload({ waitUntil: "domcontentloaded" });
      await enter();
      assert.equal(await stage(), "drill");
      assert.equal(await position(), n.firstShockResumeX(missed));
      await walk(n.firstShockBraceX(missed));
      await saw("Caler la corde").click();
      assert.deepEqual((await state()).transfers, ["saar-brace"]);
    } else {
      await saw("Écouter Harek").click();
      assert.deepEqual((await state()).transfers, ["harek-lesson"]);
    }

    assert.equal(await stage(), "return");
    assert.equal((await state()).resolved, true);
    assert.equal((await state()).success, true);
    await page.screenshot({ path: join(output, `${route}-receipt.png`), animations: "disabled" });
    await walk(net);
    await saw("Rendre l’arme d’exercice").click();
    await root.waitFor({ state: "hidden" });
    await page.locator("[data-unblooded-welcome]").waitFor();
    const final = await disk();
    assert.deepEqual(final.prologue, commonPrologue.prologue);
    assert.deepEqual(final.inventory, commonPrologue.inventory);
    assert.equal(final.originV151.firstShockO6.journal.at(-1).order, "return-weapon");
    report.routes.push({ route, mobile, receipts: final.originV151.firstShockO6 });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  if (!report.passed && page && !page.isClosed()) await page.screenshot({ path: join(output, "failure.png") }).catch(() => {});
  await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server?.close();
}
