/** Real gallery components in Chromium; canonical save fixtures, no played duel.
 * PIT_QA_CHROMIUM=/path/to/chromium PIT_QA_OUTPUT=/output node scripts/qa-pit-honors-gallery-v1.mjs
 * Optional PIT_QA_CHROMIUM_ARGS_JSON. Installs nothing; app code stays read-only.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { mkdtempSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.resolve(process.env.PIT_QA_OUTPUT ?? mkdtempSync(path.join(os.tmpdir(), "pit-honors-gallery-")));
mkdirSync(output, { recursive: true });
const bundle = await build({ absWorkingDir: root, entryPoints: ["tests/browser/pit-honors-gallery-v1.fixture.tsx"],
  bundle: true, write: false, outdir: "out", jsx: "automatic", platform: "browser", target: "es2022", loader: { ".module.css": "local-css" },
  define: { "process.env.NODE_ENV": '"development"' },
});
const js = bundle.outputFiles.find(file => file.path.endsWith(".js"));
const css = bundle.outputFiles.find(file => file.path.endsWith(".css"));
assert.ok(js && css);
const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>THE PIT — galerie QA</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/fixture.css"><style>html,body{margin:0;background:#07100c;color:#e9e1ca;font-family:Arial,sans-serif}*{box-sizing:border-box}button,input,select{font:inherit}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>';
const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  const data = url === "/fixture.js" ? js.contents : url === "/fixture.css" ? css.contents : url === "/" ? html : null;
  response.writeHead(data === null ? 404 : 200, { "Content-Type": url.endsWith(".js") ? "text/javascript" : url.endsWith(".css") ? "text/css" : "text/html; charset=utf-8" });
  response.end(data);
});
const sourcePaths = ["app/game/PitHonorsPanel.tsx", "app/game/PitHonorDetail.tsx", "app/game/PitHonorsPanel.module.css", "app/game/systems/pitHonorGalleryV1.ts", "app/game/systems/pitContentAccessV1.ts", "app/game/useMenuGamepad.ts", "app/game/systems/menuNavigation.ts"];
const report = {
  generatedAt: new Date().toISOString(), scope: "Actual PitHonorsPanel and PitHonorDetail, canonical fixture saves. Route callbacks are observed; the full application and combat are not mounted. No physical gamepad or screen-reader certification.",
  sourceHashes: Object.fromEntries(sourcePaths.map(file => [file, createHash("sha256").update(readFileSync(path.join(root, file))).digest("hex")])),
  browser: "", checks: [], screenshots: [], pageErrors: [], consoleErrors: [], httpFailures: [],
};
let browser;
const saveReport = () => writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
async function scenario(name, fn) {
  try { const details = await fn(); report.checks.push({ name, status: "pass", details }); console.log(`PASS ${name}`); }
  catch (error) { report.checks.push({ name, status: "fail", error: String(error) }); console.error(`FAIL ${name}: ${error}`); }
  saveReport();
}
const cards = page => page.locator("[data-pit-honor-inspect]");
const dialog = page => page.getByRole("dialog");
const storageSnapshot = page => page.evaluate(() => window.__pitHonorGalleryQa.snapshot());
async function screenshot(page, name) {
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: await dialog(page).count() === 0 });
  report.screenshots.push(`${name}.png`);
}
try {
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  browser = await chromium.launch({ headless: true,
    ...(process.env.PIT_QA_CHROMIUM ? { executablePath: process.env.PIT_QA_CHROMIUM } : {}),
    args: process.env.PIT_QA_CHROMIUM_ARGS_JSON ? JSON.parse(process.env.PIT_QA_CHROMIUM_ARGS_JSON) : ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  report.browser = browser.version();
  async function pageFor(fixture = "empty", mobile = false) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      reducedMotion: mobile ? "reduce" : "no-preference", hasTouch: mobile });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.on("pageerror", error => report.pageErrors.push(error.message));
    page.on("console", message => { if (message.type() === "error") report.consoleErrors.push(message.text()); });
    page.on("response", response => { if (response.status() >= 400) report.httpFailures.push({ status: response.status(), url: response.url() }); });
    await page.goto(`http://127.0.0.1:${address.port}/?fixture=${fixture}`);
    await page.waitForFunction(() => document.querySelector("[data-honors-status]")?.getAttribute("data-honors-status") !== "loading");
    return page;
  }
  const empty = await pageFor();
  const initial = await storageSnapshot(empty);
  await scenario("18 real cards remain inspectable; source filters show 12 / 5 / 1", async () => {
    assert.equal(await cards(empty).count(), 18);
    for (const [value, expected] of [["arcade", 12], ["circuit", 5], ["descent", 1], ["all", 18]]) {
      await empty.getByLabel("Parcours des distinctions").selectOption(value);
      assert.equal(await cards(empty).count(), expected);
    }
    await empty.getByLabel("Seulement les distinctions obtenues").check();
    assert.equal(await cards(empty).count(), 0);
    await empty.getByRole("button", { name: "Voir les conditions" }).click();
    assert.equal(await cards(empty).count(), 18);
  });
  await scenario("every locked card opens a named detail and returns focus without changing saves", async () => {
    const ids = await cards(empty).evaluateAll(elements => elements.map(element => element.getAttribute("data-pit-honor-inspect")));
    for (const id of ids) {
      const trigger = empty.locator(`[data-pit-honor-inspect="${id}"]`);
      await trigger.click();
      assert.equal(await dialog(empty).getAttribute("data-pit-honor-detail"), id);
      assert.match(await dialog(empty).locator("[data-pit-honor-detail-status]").innerText(), /À débloquer/);
      assert.equal(await dialog(empty).getByRole("heading", { level: 2 }).evaluate(element => element === document.activeElement), true);
      await dialog(empty).getByRole("button", { name: "Retour aux distinctions", exact: true }).click();
      assert.equal(await dialog(empty).count(), 0);
      assert.equal(await trigger.evaluate(element => element === document.activeElement), true);
    }
    assert.equal(await storageSnapshot(empty), initial);
    assert.deepEqual(await empty.evaluate(() => window.__pitHonorGalleryQa.writes), []);
  });
  await scenario("keyboard confirmation, modal tab focus, Escape and parent-key isolation", async () => {
    const trigger = cards(empty).first();
    await trigger.focus(); await empty.keyboard.press("Enter");
    const outsideBefore = await empty.evaluate(() => window.__pitHonorGalleryQa.outsideKeys.length);
    for (let index = 0; index < 5; index += 1) {
      await empty.keyboard.press("Tab");
      assert.equal(await dialog(empty).evaluate(element => element.contains(document.activeElement)), true, `Tab ${index + 1} must retain focus in the modal`);
    }
    await empty.keyboard.press("Escape");
    assert.equal(await dialog(empty).count(), 0);
    assert.equal(await trigger.evaluate(element => element === document.activeElement), true);
    assert.equal(await empty.evaluate(() => window.__pitHonorGalleryQa.outsideKeys.length), outsideBefore);
  });
  await scenario("Arcade, Circuit and Descente prepare exact routes without awards", async () => {
    const cases = [
      [0, { mode: "arcade", fighterId: "jungle-hunter" }],
      [15, { mode: "circuit", fighterId: "jungle-hunter", chapterId: "desecrated-pit" }],
      [17, { mode: "descent", fighterId: "jungle-hunter" }],
    ];
    for (const [index, expected] of cases) {
      await cards(empty).nth(index).click();
      await empty.locator("[data-pit-honor-open-route]").click();
      assert.equal(await dialog(empty).count(), 0);
      assert.deepEqual(await empty.evaluate(() => window.__pitHonorGalleryQa.requests.at(-1)), expected);
    }
    await empty.getByRole("button", { name: "Rejoindre THE PIT", exact: true }).click();
    assert.equal(await empty.evaluate(() => window.__pitHonorGalleryQa.requests.at(-1)), null);
    assert.equal(await storageSnapshot(empty), initial);
    assert.deepEqual(await empty.evaluate(() => window.__pitHonorGalleryQa.writes), []);
  });
  await scenario("real menu gamepad hook opens with A; held B closes only the detail", async () => {
    await empty.bringToFront();
    await cards(empty).first().focus();
    await empty.evaluate(() => window.__pitHonorGalleryQa.enablePad());
    await empty.waitForTimeout(100);
    await empty.evaluate(() => window.__pitHonorGalleryQa.pad(0, true));
    await dialog(empty).waitFor();
    await empty.waitForTimeout(180);
    assert.equal(await dialog(empty).count(), 1);
    await empty.evaluate(() => window.__pitHonorGalleryQa.pad(0, false));
    await empty.waitForTimeout(100);
    await empty.evaluate(() => window.__pitHonorGalleryQa.pad(13, true));
    await empty.waitForTimeout(100);
    assert.equal(await dialog(empty).evaluate(element => element.contains(document.activeElement)), true);
    await empty.evaluate(() => window.__pitHonorGalleryQa.pad(13, false));
    await empty.waitForTimeout(100);
    await empty.evaluate(() => window.__pitHonorGalleryQa.pad(1, true));
    await empty.waitForFunction(() => document.querySelector("dialog[open]") === null);
    await empty.waitForTimeout(250);
    assert.equal(await empty.evaluate(() => window.__pitHonorGalleryQa.parentBackCount), 0);
    assert.equal(await cards(empty).first().evaluate(element => element === document.activeElement), true);
    await empty.evaluate(() => window.__pitHonorGalleryQa.pad(1, false));
    await empty.waitForTimeout(100);
    await empty.evaluate(() => window.__pitHonorGalleryQa.pad(1, true));
    await empty.waitForFunction(() => window.__pitHonorGalleryQa.parentBackCount === 1);
    await empty.evaluate(() => window.__pitHonorGalleryQa.pad(1, false));
    assert.equal(await storageSnapshot(empty), initial);
    assert.deepEqual(await empty.evaluate(() => window.__pitHonorGalleryQa.writes), []);
    return { driver: "Actual useMenuGamepad, emulated navigator.getGamepads", heldBackLeavesParentOpen: true, separateBackAfterReleaseReachesParent: true };
  });
  await screenshot(empty, "gallery-locked-desktop");
  await empty.close();

  const progress = await pageFor("progress");
  await scenario("Circuit detail exposes all individual paths without adding progress across hunters", async () => {
    const before = await storageSnapshot(progress);
    await progress.locator('[data-pit-honor-inspect="pit-banner-three-paths"]').click();
    await dialog(progress).locator("summary").click();
    assert.equal(await dialog(progress).locator("[data-pit-honor-path]").count(), 12);
    assert.match(await progress.locator('[data-pit-honor-path="wolf"]').innerText(), /1\/3 combats de ce chapitre/);
    assert.match(await progress.locator('[data-pit-honor-path="city-hunter"]').innerText(), /2\/3 combats de ce chapitre/);
    assert.match(await dialog(progress).innerText(), /Chasseur proposé : City Hunter/);
    await screenshot(progress, "gallery-circuit-detail-desktop");
    await progress.getByRole("button", { name: "Préparer le Circuit avec Wolf", exact: true }).click();
    assert.deepEqual(await progress.evaluate(() => window.__pitHonorGalleryQa.requests.at(-1)), { mode: "circuit", fighterId: "wolf", chapterId: "three-paths" });
    assert.equal(await storageSnapshot(progress), before);
  });
  await progress.close();

  const earned = await pageFor("earned");
  await scenario("earned palette remains revealed and inspectable through the earned filter", async () => {
    await earned.getByLabel("Seulement les distinctions obtenues").check();
    assert.equal(await cards(earned).count(), 1);
    await cards(earned).first().click();
    assert.equal(await earned.locator("[data-pit-honor-detail-status]").innerText(), "Acquis");
    assert.match(await dialog(earned).innerText(), /8\/8 rencontres/);
    assert.equal(await dialog(earned).locator("span[style]").count(), 3);
    await screenshot(earned, "gallery-earned-detail-desktop");
    await dialog(earned).getByRole("button", { name: "Fermer la fiche de distinction" }).click();
    assert.equal(await cards(earned).first().evaluate(element => element === document.activeElement), true);
    assert.deepEqual(await earned.evaluate(() => window.__pitHonorGalleryQa.writes), []);
  });
  await scenario("changing campaign closes the old private detail and resets gallery filters", async () => {
    await cards(earned).first().click();
    await earned.evaluate(() => window.__pitHonorGalleryQa.switchOwner());
    await earned.waitForFunction(() => document.querySelectorAll("[data-pit-honor-inspect]").length === 18);
    assert.equal(await dialog(earned).count(), 0);
    assert.equal(await earned.getByLabel("Seulement les distinctions obtenues").isChecked(), false);
    assert.equal(await earned.locator('[data-pit-honor][data-earned="true"]').count(), 0);
  });
  await earned.close();

  for (const fixture of ["corrupt", "wrong-owner"]) {
    const failed = await pageFor(fixture);
    await scenario(`${fixture} archive exposes no card, detail or fabricated reward`, async () => {
      assert.equal(await cards(failed).count(), 0);
      assert.equal(await dialog(failed).count(), 0);
      assert.equal(await failed.getByRole("button", { name: "Réessayer la lecture" }).count(), 1);
      assert.deepEqual(await failed.evaluate(() => window.__pitHonorGalleryQa.writes), []);
    });
    await failed.close();
  }
  const liveFailure = await pageFor();
  await scenario("a storage failure while a detail is open closes it without disclosing stale data", async () => {
    await cards(liveFailure).first().click();
    await liveFailure.evaluate(() => window.__pitHonorGalleryQa.corrupt());
    await liveFailure.getByRole("button", { name: "Réessayer la lecture" }).waitFor();
    assert.equal(await dialog(liveFailure).count(), 0);
    assert.equal(await cards(liveFailure).count(), 0);
    assert.deepEqual(await liveFailure.evaluate(() => window.__pitHonorGalleryQa.writes), []);
  });
  await liveFailure.close();

  const mobile = await pageFor("earned", true);
  await scenario("touch-sized controls and reduced-motion mobile detail fit the viewport", async () => {
    await cards(mobile).first().tap();
    assert.equal(await mobile.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true);
    assert.equal(await dialog(mobile).evaluate(element => element.scrollWidth <= element.clientWidth + 1), true);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const sizes = await dialog(mobile).locator("button").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
    assert.ok(sizes.every(height => height >= 44), JSON.stringify(sizes));
    await screenshot(mobile, "gallery-earned-detail-mobile");
    await dialog(mobile).getByRole("button", { name: "Retour aux distinctions", exact: true }).tap();
    assert.equal(await dialog(mobile).count(), 0);
    assert.deepEqual(await mobile.evaluate(() => window.__pitHonorGalleryQa.writes), []);
  });
  await mobile.close();
  await scenario("no uncaught errors, React warnings or failed local resources", async () => {
    assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.consoleErrors, []); assert.deepEqual(report.httpFailures, []);
  });
} catch (error) {
  report.checks.push({ name: "browser runner completion", status: "fail", error: String(error) });
  console.error(error);
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  report.summary = { passed: report.checks.filter(check => check.status === "pass").length, failed: report.checks.filter(check => check.status === "fail").length,
    pageErrors: report.pageErrors.length, consoleErrors: report.consoleErrors.length, httpFailures: report.httpFailures.length };
  saveReport();
}
console.log(JSON.stringify({ output, ...report.summary }));
if (report.summary.failed) process.exitCode = 1;
