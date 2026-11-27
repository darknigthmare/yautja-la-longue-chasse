/** Review-only Greyback surface in Chromium, with actual next/image and next/link.
 * PIT_QA_CHROMIUM=/path/to/chromium PIT_QA_OUTPUT=/output node scripts/qa-pit-selection-review-v1.mjs
 * Optional PIT_QA_CHROMIUM_ARGS_JSON. No full Next server or artistic admission.
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
const assetRoot = "/game/review/the-pit/greyback-unmasked-20261127";
const assetDirectory = path.join(root, "public", assetRoot);
const manifest = JSON.parse(readFileSync(path.join(assetDirectory, "manifest.json"), "utf8"));
const output = path.resolve(process.env.PIT_QA_OUTPUT ?? mkdtempSync(path.join(os.tmpdir(), "pit-selection-review-")));
mkdirSync(output, { recursive: true });
const sourcePaths = ["app/pit-lab/selection/GreybackSelectionReview.tsx", "app/pit-lab/selection/GreybackSelectionReview.module.css", "app/pit-lab/selection/page.tsx"];
const report = {
  generatedAt: new Date().toISOString(), scope: "Actual GreybackSelectionReview and CSS with real PNGs; actual Next Image (unoptimized) and Link bundled. One CJS/ESM export shim selects next/dist/client/image-component.Image; it does not replace the image renderer. Production client environment defaults supplied. Component harness, not a full Next router/server. No combat animation, art admission or 1:1 certification.",
  sourceHashes: Object.fromEntries(sourcePaths.map(file => [file, createHash("sha256").update(readFileSync(path.join(root, file))).digest("hex")])),
  browser: "", checks: [], screenshots: [], pageErrors: [], consoleErrors: [], httpFailures: [], failedRequests: [],
};
const bundle = await build({ absWorkingDir: root, entryPoints: ["tests/browser/pit-selection-review-v1.fixture.tsx"],
  bundle: true, write: false, outdir: "out", jsx: "automatic", platform: "browser", target: "es2022", loader: { ".module.css": "local-css" },
  // Next normally substitutes client environment accesses during compilation.
  // Keep its real components; supply only the production environment defaults.
  define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "next-image-export-interop", setup(builder) {
    builder.onResolve({ filter: /^next\/image$/ }, () => ({ path: "image", namespace: "pit-review-next" }));
    builder.onLoad({ filter: /^image$/, namespace: "pit-review-next" }, () => ({
      contents: 'export { Image as default } from "next/dist/client/image-component";', loader: "js", resolveDir: root,
    }));
  } }],
});
const js = bundle.outputFiles.find(file => file.path.endsWith(".js"));
const css = bundle.outputFiles.find(file => file.path.endsWith(".css"));
assert.ok(js && css);
const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Greyback review QA</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/fixture.css"><style>html,body{margin:0}*{box-sizing:border-box}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>';
const allowedAssets = new Set(["manifest.json", ...manifest.files.map(file => file.file)]);
const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  let data = url === "/fixture.js" ? js.contents : url === "/fixture.css" ? css.contents : url === "/" ? html : null;
  const filename = url.startsWith(`${assetRoot}/`) ? url.slice(assetRoot.length + 1) : "";
  if (allowedAssets.has(filename)) data = readFileSync(path.join(assetDirectory, filename));
  response.writeHead(data === null ? 404 : 200, { "Content-Type": url.endsWith(".js") ? "text/javascript" : url.endsWith(".css") ? "text/css" : url.endsWith(".png") ? "image/png" : url.endsWith(".json") ? "application/json" : "text/html; charset=utf-8" });
  response.end(data);
});
let browser;
const saveReport = () => writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
async function scenario(name, fn) {
  try { const details = await fn(); report.checks.push({ name, status: "pass", details }); console.log(`PASS ${name}`); }
  catch (error) { report.checks.push({ name, status: "fail", error: String(error) }); console.error(`FAIL ${name}: ${error}`); }
  saveReport();
}
const review = page => page.locator("[data-pit-selection-review]");
const choices = page => page.getByRole("group", { name: "Choisir un dessin" }).getByRole("button");
const candidate = page => page.locator("[data-review-candidate]");
const overlay = page => page.locator('img[aria-hidden="true"]');
async function loaded(page) {
  await candidate(page).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll("[data-pit-selection-review] img")].every(image => image.complete && image.naturalWidth > 0));
}
async function screenshot(page, name, locator = null) {
  if (locator) await locator.screenshot({ path: path.join(output, `${name}.png`) });
  else await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
  report.screenshots.push(`${name}.png`);
}
try {
  await scenario("six public PNGs and five generated outputs match the provenance manifest", async () => {
    assert.equal(manifest.files.length, 6); assert.equal(manifest.generatedImageCount, 5);
    assert.equal(manifest.distinctPoseTargets, 4); assert.equal(manifest.equipmentCorrectionsReceived, 1);
    assert.equal(manifest.runtimeAdmitted, false); assert.equal(manifest.oneToOneCertified, false);
    assert.equal(manifest.nativeAnimationClipsEnabled, 0);
    for (const file of manifest.files) {
      const content = readFileSync(path.join(assetDirectory, file.file));
      assert.equal(content.length, file.bytes);
      assert.equal(createHash("sha256").update(content).digest("hex"), file.sha256);
      assert.equal(content.compare(readFileSync(path.join(root, file.source))), 0);
    }
    return { publicPngs: 6, generatedOutputs: 5, distinctPoses: 4, admittedClips: 0 };
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address(); assert.ok(address && typeof address === "object");
  browser = await chromium.launch({ headless: true,
    ...(process.env.PIT_QA_CHROMIUM ? { executablePath: process.env.PIT_QA_CHROMIUM } : {}),
    args: process.env.PIT_QA_CHROMIUM_ARGS_JSON ? JSON.parse(process.env.PIT_QA_CHROMIUM_ARGS_JSON) : ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  report.browser = browser.version();
  async function pageFor(mobile = false, fault = null) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, hasTouch: mobile, reducedMotion: mobile ? "reduce" : "no-preference" });
    const page = await context.newPage(); page.setDefaultTimeout(6000);
    page.on("pageerror", error => report.pageErrors.push({ fault, message: error.message }));
    page.on("console", message => { if (message.type() === "error") report.consoleErrors.push({ fault, message: message.text() }); });
    page.on("response", response => { if (response.status() >= 400) report.httpFailures.push({ fault, status: response.status(), url: response.url() }); });
    page.on("requestfailed", request => report.failedRequests.push({ fault, url: request.url(), error: request.failure()?.errorText }));
    await page.addInitScript(() => {
      window.__pitReviewWrites = [];
      for (const method of ["setItem", "removeItem", "clear"]) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (...args) { window.__pitReviewWrites.push(method); return Reflect.apply(original, this, args); };
      }
    });
    if (fault) await page.route(`**/${fault}`, route => route.abort("failed"));
    await page.goto(`http://127.0.0.1:${address.port}/`);
    await review(page).waitFor();
    return page;
  }
  const desktop = await pageFor();
  await scenario("desktop shows the exact reference and first corrected candidate as unadmitted", async () => {
    await loaded(desktop);
    assert.equal(await choices(desktop).count(), 4);
    assert.equal(await review(desktop).getAttribute("data-review-status"), "candidate-unadmitted");
    assert.equal(await review(desktop).getAttribute("data-equipment-revision"), "v2");
    assert.ok((await candidate(desktop).getAttribute("src")).endsWith("preview-calm-01-right-equipment-v2.png"));
    assert.match(await desktop.getByRole("region", { name: "État de la revue" }).innerText(), /fidélité 1:1 non certifiée/);
    assert.equal(await desktop.getByRole("link", { name: "Retour à l’atelier" }).getAttribute("href"), "/pit-lab");
    const response = await desktop.request.get(`http://127.0.0.1:${address.port}${assetRoot}/manifest.json`);
    assert.equal(response.status(), 200);
    assert.equal((await response.json()).generatedImageCount, 5);
    await screenshot(desktop, "greyback-review-desktop");
  });
  await scenario("all four poses and the first revision toggle select only the requested static file", async () => {
    await desktop.getByLabel("Voir la correction des lames et de l’arme au côté").uncheck(); await loaded(desktop);
    assert.ok((await candidate(desktop).getAttribute("src")).endsWith("preview-calm-01-right.png"));
    await desktop.getByLabel("Voir la correction des lames et de l’arme au côté").check(); await loaded(desktop);
    const files = ["preview-calm-01-right-equipment-v2.png", "preview-acknowledge-02-right.png", "deselection-rest-01-right.png", "deselection-rest-02-right.png"];
    for (let index = 0; index < files.length; index += 1) {
      await choices(desktop).nth(index).click(); await loaded(desktop);
      assert.equal(await review(desktop).getAttribute("data-frame"), String(index));
      assert.equal(await desktop.locator('fieldset button[aria-pressed="true"]').count(), 1);
      assert.ok((await candidate(desktop).getAttribute("src")).endsWith(files[index]));
    }
    await choices(desktop).first().click(); await loaded(desktop);
    assert.equal(await desktop.getByLabel("Voir la correction des lames et de l’arme au côté").isChecked(), true);
  });
  await scenario("overlay, light background and image proportions stay review-only without storage writes", async () => {
    await desktop.getByLabel("Superposer la référence au candidat").check();
    await desktop.getByLabel("Fond clair pour inspecter la transparence").check(); await loaded(desktop);
    assert.equal(await overlay(desktop).count(), 1);
    assert.equal(await desktop.locator("[data-review-background]").getAttribute("data-review-background"), "light");
    const geometry = await desktop.locator("[data-pit-selection-review] img").evaluateAll(images => images.map(image => ({ fit: getComputedStyle(image).objectFit, transform: getComputedStyle(image).transform, animation: getComputedStyle(image).animationName, ratio: image.getBoundingClientRect().width / image.getBoundingClientRect().height, naturalRatio: image.naturalWidth / image.naturalHeight })));
    assert.ok(geometry.every(image => image.fit === "contain" && image.transform === "none" && image.animation === "none" && Math.abs(image.ratio - 2 / 3) < .01));
    await desktop.waitForTimeout(350);
    assert.equal(await review(desktop).getAttribute("data-frame"), "0");
    assert.deepEqual(await desktop.evaluate(() => window.__pitReviewWrites), []);
    await screenshot(desktop, "greyback-review-overlay-light", desktop.locator("[data-review-background]"));
    return { geometry, noAutoplay: true, storageWrites: 0 };
  });
  await scenario("keyboard activation selects a pose and retains a visible focus", async () => {
    await choices(desktop).nth(2).focus(); await desktop.keyboard.press("Enter"); await loaded(desktop);
    assert.equal(await review(desktop).getAttribute("data-frame"), "2");
    assert.equal(await choices(desktop).nth(2).evaluate(element => element === document.activeElement && getComputedStyle(element).outlineStyle !== "none"), true);
  });
  await desktop.close();

  const mobile = await pageFor(true);
  await scenario("mobile touch controls, stacked comparison and reduced motion fit the viewport", async () => {
    await loaded(mobile);
    await choices(mobile).nth(3).tap(); await loaded(mobile);
    assert.equal(await review(mobile).getAttribute("data-frame"), "3");
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await mobile.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true);
    assert.ok((await choices(mobile).evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().height))).every(height => height >= 44));
    const positions = await mobile.locator("figure").evaluateAll(figures => figures.map(figure => ({ x: figure.getBoundingClientRect().x, y: figure.getBoundingClientRect().y })));
    assert.equal(positions[0].x, positions[1].x); assert.ok(positions[1].y > positions[0].y);
    assert.deepEqual(await mobile.evaluate(() => window.__pitReviewWrites), []);
    await screenshot(mobile, "greyback-review-mobile", mobile.locator("[data-review-background]"));
  });
  await mobile.close();

  const failedCandidate = await pageFor(false, "preview-calm-01-right-equipment-v2.png");
  await scenario("missing candidate shows a clear error and never substitutes the reference overlay", async () => {
    await failedCandidate.locator("figure").nth(1).scrollIntoViewIfNeeded();
    await failedCandidate.getByRole("alert").filter({ hasText: "Dessin indisponible" }).waitFor();
    await failedCandidate.getByLabel("Superposer la référence au candidat").check();
    assert.equal(await candidate(failedCandidate).count(), 0);
    assert.equal(await overlay(failedCandidate).count(), 0);
    await screenshot(failedCandidate, "greyback-review-candidate-error", failedCandidate.locator("figure").nth(1));
    await choices(failedCandidate).nth(1).click(); await loaded(failedCandidate);
    assert.equal(await failedCandidate.getByRole("alert").count(), 0);
    assert.deepEqual(await failedCandidate.evaluate(() => window.__pitReviewWrites), []);
  });
  await failedCandidate.close();

  const failedReference = await pageFor(false, "reference-original.png");
  await scenario("missing source reports that comparison cannot be validated and suppresses its overlay", async () => {
    await failedReference.locator("figure").first().scrollIntoViewIfNeeded();
    await failedReference.getByRole("alert").filter({ hasText: "Référence indisponible" }).waitFor();
    await failedReference.getByLabel("Superposer la référence au candidat").check(); await loaded(failedReference);
    assert.equal(await overlay(failedReference).count(), 0);
    assert.equal(await review(failedReference).getAttribute("data-review-status"), "candidate-unadmitted");
    assert.deepEqual(await failedReference.evaluate(() => window.__pitReviewWrites), []);
  });
  await failedReference.close();
  await scenario("no uncaught errors or resource failures beyond the two intentional image faults", async () => {
    assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.httpFailures, []);
    assert.ok(report.failedRequests.length >= 2);
    assert.ok(report.failedRequests.every(failure => failure.fault && failure.url.endsWith(failure.fault)));
    assert.ok(report.consoleErrors.every(error => error.fault && error.message.includes("net::ERR_FAILED")));
  });
} catch (error) {
  report.checks.push({ name: "browser runner completion", status: "fail", error: String(error) }); console.error(error);
} finally {
  await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  report.summary = { passed: report.checks.filter(check => check.status === "pass").length, failed: report.checks.filter(check => check.status === "fail").length,
    pageErrors: report.pageErrors.length, unexpectedHttpFailures: report.httpFailures.length, intentionalImageFailures: report.failedRequests.filter(failure => failure.fault).length };
  saveReport();
}
console.log(JSON.stringify({ output, ...report.summary }));
if (report.summary.failed) process.exitCode = 1;
