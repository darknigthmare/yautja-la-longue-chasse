import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const base = process.env.V54_HOMEWORLD_QA_URL || "http://127.0.0.1:4174";
const output = process.env.V54_HOMEWORLD_QA_OUTPUT || "outputs/qa-commercial-audit/v54/homeworld-spatial-browser-qa";
const archivePath = "work/v47/nursery-scene-browser-qa/played-campaign-storage.json";
const storage = JSON.parse(await fs.readFile(archivePath, "utf8"));
const archived = JSON.parse(storage["yautja-long-hunt.save"]);
assert.equal(archived.prologue.status, "completed");
assert.equal(archived.prologue.checkpoint.winner, "player");
async function moduleAt(name) { const b = await build({ entryPoints: [`app/game/systems/${name}.ts`], bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" }); return import("data:text/javascript;base64," + Buffer.from(b.outputFiles[0].text).toString("base64")); }
const city = await moduleAt("homeworldCity"), atlas = await moduleAt("homeworldSpatialCodex");
await fs.mkdir(output, { recursive: true });
const checks = [], errors = [], failures = [], routes = [], screenshots = [];
const report = { passed: false, version: "V54", checkedAt: new Date().toISOString(), url: base, archivePath, checks, errors, failures, routes, screenshots,
  scope: "Isolated Chromium profile seeded with the archive of an actually played nursery victory. Real keyboard time, no clock, actor, progression or engine injection. One navigator.getGamepads fixture explicitly emulates controller input. District discoveries are the only intended campaign changes. This is not a physical gamepad test." };
const browser = await chromium.launch({ channel: process.env.V54_QA_BROWSER_CHANNEL || "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(30000);
page.on("pageerror", e => errors.push(e.message));
page.on("response", r => { if (r.status() >= 400) failures.push({ url: r.url(), status: r.status() }); });
const capture = async name => { await page.screenshot({ path: path.join(output, name + ".png"), fullPage: true }); screenshots.push(name + ".png"); };
const position = () => page.locator("[data-homeworld-actor]").evaluate(el => ({ x: Number(el.dataset.x), y: Number(el.dataset.y) }));
const readStorage = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage).sort(([a], [b]) => a.localeCompare(b))));
const saved = async () => JSON.parse((await readStorage())["yautja-long-hunt.save"]);
try {
  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  await page.evaluate(entries => { localStorage.clear(); for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value); }, storage);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Continuer/ }).click();
  const hub = page.locator("[data-homeworld-hub]"); await hub.waitFor();
  await page.locator('[data-game-content-version="V54"]').waitFor();
  const viewport = page.getByRole("group", { name: "Cité jouable en perspective 2.5D", exact: true });
  await page.locator('[data-unblooded-objective="chief"]').waitFor();
  await page.locator('[data-homeworld-spatial-codex="v54"]').waitFor();
  assert.equal(await hub.locator("[data-building-id]").count(), 19);
  assert.equal(await hub.locator("[data-homeworld-waymark]").count(), 12);
  const shipArt = hub.locator('[data-point-id="personal-ship"] img[data-ship-occluded]');
  assert.equal(await shipArt.getAttribute("data-ship-occluded"), "true");
  assert(Math.abs(Number(await shipArt.evaluate(el => getComputedStyle(el).opacity)) - .32) < .01, "Spawn stays visible through the occluding ship");
  checks.push("V54 city entered from a played youth archive, with 19 independent buildings and 12 waymarks");
  await capture("01-city-entry");
  const before = await saved();
  await page.getByRole("button", { name: /Atlas de la cité/ }).click();
  const modal = page.getByRole("dialog", { name: "Atlas de la cité", exact: true }); await modal.waitFor();
  assert.match(await modal.innerText(), /Parcours de jeunesse/);
  const frozen = await position(), storageBeforeModal = await readStorage();
  await page.keyboard.down("ArrowRight"); await page.waitForTimeout(400); await page.keyboard.up("ArrowRight");
  assert.deepEqual(await position(), frozen);
  const close = modal.getByRole("button", { name: "Fermer l’atlas", exact: true });
  await close.focus(); await page.keyboard.press("Shift+Tab");
  assert(await modal.evaluate(el => el.contains(document.activeElement)), "Tab remains inside atlas");
  checks.push("Atlas freezes movement and traps keyboard focus without opening youth/adult services");
  for (const site of atlas.HOMEWORLD_SPATIAL_SITES) {
    await modal.getByRole("button", { name: new RegExp(site.name) }).click();
    await modal.getByRole("button", { name: "Tracer le chemin à pied", exact: true }).click();
    await modal.locator('[data-homeworld-route-status="reachable"]').waitFor();
    assert.equal(await modal.locator('[data-homeworld-route="true"]').count(), 1);
  }
  checks.push("All fourteen district routes are calculated in the live browser and rendered on the atlas");
  await modal.getByRole("button", { name: /Ateliers des convois/ }).click();
  await modal.getByRole("button", { name: "Tracer le chemin à pied", exact: true }).click();
  await capture("02-atlas-route-south");
  await modal.getByRole("button", { name: "Plan d’implantation", exact: true }).click();
  assert.match(await modal.innerText(), /Pivot 1760, 2730/);
  assert.match(await modal.innerText(), /48 × 28 unités/);
  await capture("03-atlas-placement-contract");
  assert.deepEqual(await readStorage(), storageBeforeModal, "Atlas reading/routing cannot mutate any storage key");
  checks.push("Placement tab reads real pivots/colliders; complete storage remains byte-identical during atlas use");
  await page.keyboard.press("Escape"); await modal.waitFor({ state: "hidden" });
  await page.waitForTimeout(120);
  assert.equal(await viewport.evaluate(el => document.activeElement === el), true);
  assert.deepEqual(await position(), frozen);
  checks.push("Escape returns world focus without leaking the held arrow");

  await page.getByRole("button", { name: /Atlas de la cité/ }).click(); await modal.waitFor();
  await close.focus();
  await page.evaluate(() => {
    window.__hwNativeGamepads = navigator.getGamepads.bind(navigator);
    window.__hwPad = { id: "V54 QA emulated controller", index: 0, connected: true, mapping: "standard", timestamp: performance.now(), axes: [1, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 0, touched: i === 0, value: i === 0 ? 1 : 0 })) };
    navigator.getGamepads = () => [window.__hwPad];
  });
  await page.waitForTimeout(160); assert(await modal.isVisible()); assert.deepEqual(await position(), frozen);
  await page.evaluate(() => { window.__hwPad.axes[0] = 0; window.__hwPad.buttons[0] = { pressed: false, touched: false, value: 0 }; });
  await page.waitForTimeout(160);
  await page.evaluate(() => { window.__hwPad.buttons[13] = { pressed: true, touched: true, value: 1 }; });
  await page.waitForTimeout(160);
  assert.equal(await close.evaluate(el => document.activeElement === el), false, "Emulated down moves atlas focus");
  await page.evaluate(() => { window.__hwPad.buttons[13] = { pressed: false, touched: false, value: 0 }; });
  await page.waitForTimeout(100);
  await page.evaluate(() => { window.__hwPad.buttons[1] = { pressed: true, touched: true, value: 1 }; window.__hwPad.axes[0] = 1; });
  await modal.waitFor({ state: "hidden" }); await page.waitForTimeout(200);
  assert.deepEqual(await position(), frozen, "Held stick after closing must await neutral");
  await page.evaluate(() => { navigator.getGamepads = window.__hwNativeGamepads; delete window.__hwPad; delete window.__hwNativeGamepads; });
  await page.waitForTimeout(100);
  checks.push("Emulated controller requires neutral, navigates the atlas and closes with B without held-stick spill");

  async function walkTo(target) {
    const start = await position();
    const route = atlas.homeworldSpatialRoute(start, target);
    assert.equal(route.status, "reachable", "Cannot plan real keyboard route");
    await viewport.focus();
    let anchor = start, inputs = 0;
    for (const endpoint of route.points.slice(1)) {
      const count = Math.max(1, Math.ceil(Math.hypot(endpoint.x - anchor.x, endpoint.y - anchor.y) / 24));
      const segmentStart = anchor;
      for (let i = 1; i <= count; i++) {
        const goal = { x: segmentStart.x + (endpoint.x - segmentStart.x) * i / count, y: segmentStart.y + (endpoint.y - segmentStart.y) * i / count };
        for (let attempt = 0; attempt < 25; attempt++) {
          const actual = await position(), dx = goal.x - actual.x, dy = goal.y - actual.y;
          if (Math.hypot(dx, dy) < 10) break;
          const keys = [];
          if (Math.abs(dx) > 4) keys.push(dx > 0 ? "ArrowRight" : "ArrowLeft");
          if (Math.abs(dy) > 4) keys.push(dy > 0 ? "ArrowDown" : "ArrowUp");
          const duration = Math.max(18, Math.min(65, Math.max(Math.abs(dx) / 330, Math.abs(dy) / 260) * 1000 * (keys.length === 2 ? 1.2 : 1)));
          for (const key of keys) await page.keyboard.down(key);
          await page.waitForTimeout(duration);
          for (const key of keys) await page.keyboard.up(key);
          await page.waitForTimeout(20); inputs++;
          if (attempt === 24) throw new Error(`Keyboard blocked at ${JSON.stringify(await position())} toward ${JSON.stringify(goal)}`);
        }
      }
      anchor = endpoint;
    }
    const actual = await position();
    assert(Math.hypot(actual.x - target.x, actual.y - target.y) < 25, "Actual keyboard approach not reached");
    assert(city.isHomeworldWalkable(actual));
    routes.push({ start, target, actual, inputs, waypoints: route.points.length });
  }
  const south = atlas.HOMEWORLD_SPATIAL_SITES.find(site => site.id === "convoy-works");
  await walkTo(south.approach);
  await page.waitForTimeout(400);
  assert((await saved()).homeworld.visitedDistrictIds.includes(south.id));
  assert.equal(await page.locator('[data-homeworld-route-guidance="arrived"]').count(), 1);
  await capture("04-convoy-works-arrival");
  checks.push("Real keyboard movement reaches the southern loop, acknowledges its visit and displays arrival");
  await walkTo({ x: 1760, y: 2530 });
  await page.waitForTimeout(200);
  const faded = hub.locator('[data-building-id="convoy-workshop"]');
  assert.equal(await faded.getAttribute("data-occluded"), "true");
  assert(Math.abs(Number(await faded.evaluate(el => getComputedStyle(el).opacity)) - .32) < .01);
  await capture("05-facade-occlusion");
  checks.push("A facade really fades behind the hunter while retaining its ground collision");
  const east = atlas.HOMEWORLD_SPATIAL_SITES.find(site => site.id === "rampart-walk");
  await page.getByRole("button", { name: /Atlas de la cité/ }).click(); await modal.waitFor();
  await modal.getByRole("button", { name: /Promenade des remparts/ }).click();
  await modal.getByRole("button", { name: "Tracer le chemin à pied", exact: true }).click();
  await modal.getByRole("button", { name: "Suivre le repère", exact: true }).click(); await modal.waitFor({ state: "hidden" });
  await walkTo(east.approach);
  await page.waitForTimeout(400);
  assert((await saved()).homeworld.visitedDistrictIds.includes(east.id));
  assert.equal(await page.locator('[data-homeworld-route-guidance="arrived"]').count(), 1);
  await capture("06-rampart-walk-arrival");
  checks.push("Real keyboard route reaches eastern remparts through the continuous city");
  const after = await saved();
  for (const key of ["prologue", "loadout", "profile", "trophies", "youthTraining"]) assert.deepEqual(after[key], before[key], "Unintended campaign mutation: " + key);
  for (const key of ["inquiry", "evidenceIds", "greetedNpcIds", "expeditions", "relations", "witnessChoice", "audienceOutcome"]) assert.deepEqual(after.homeworld[key], before.homeworld[key], "Unintended Homeworld mutation: " + key);
  assert(after.homeworld.visitedDistrictIds.includes("convoy-works") && after.homeworld.visitedDistrictIds.includes("rampart-walk"));
  checks.push("Only actual district discoveries changed progression; prologue, equipment, ranks, trophies and adult access are unchanged");
  const imageChecks = await hub.locator("img[data-prop-id]").evaluateAll(async images => {
    await Promise.all(images.map(img => img.decode()));
    return images.map(img => { const style = getComputedStyle(img); return { id: img.dataset.propId, source: new URL(img.currentSrc).pathname, width: img.naturalWidth, height: img.naturalHeight, scaleX: parseFloat(style.width) / img.naturalWidth, scaleY: parseFloat(style.height) / img.naturalHeight }; });
  });
  assert(imageChecks.length >= 11);
  for (const image of imageChecks) { assert(image.width && image.height, image.id); assert(Math.abs(image.scaleX - image.scaleY) < .0001, image.id + " stretched source"); }
  checks.push({ name: "All city prop images load at uniform scale", images: imageChecks });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /Atlas de la cité/ }).click(); await modal.waitFor();
  await capture("07-mobile-atlas");
  const bounds = await modal.boundingBox(); assert(bounds.x >= 0 && bounds.x + bounds.width <= 390.5);
  assert.equal(await modal.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
  await modal.getByRole("button", { name: "Lieu et accès", exact: true }).click();
  await modal.getByRole("button", { name: /Esplanade des Trophées/ }).click();
  assert.match(await modal.innerText(), /MOTIF ATTESTÉ/);
  assert.match(await modal.innerText(), /ADAPTATION ORIGINALE/);
  await capture("08-mobile-lore-source");
  await close.click();
  checks.push("390px atlas has no horizontal overflow, readable source/adaptation separation and a working close control");
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  checks.push("No browser page error or failed HTTP response throughout the route");
  assert.equal(checks.length, 13);
  report.passed = true;
} catch (error) { report.error = String(error.stack || error); await capture("failure").catch(() => {}); throw error; }
finally { await browser.close(); report.browserClosed = true; await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n"); console.log(JSON.stringify({ passed: report.passed, checks: checks.length, errors, failures, output, browserClosed: true })); }
