/** Native M039 inputs, with a declared admission fixture for the previous hunt.
 * The saved position and every repair step come from the ordinary Homeworld. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { homeworldQaModelV64 } from "./homeworld-qa-model-v64.mjs";
import { homeworldNavigatorV77 } from "./homeworld-navigation-browser-v77.mjs";

const url = process.env.YAUTJA_M039_QA_URL ?? "http://127.0.0.1:4398";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(url).hostname));
const output = process.env.YAUTJA_M039_QA_OUTPUT ?? "outputs/qa-bible-m039";
await mkdir(output, { recursive: true });
const bootstrap = await build({ stdin: {
  contents: [
    "import * as saves from './app/game/save';",
    "import * as slots from './app/game/systems/campaignSlots';",
    "globalThis.__m039Fixture = { ...saves, ...slots };",
  ].join("\n"),
  resolveDir: process.cwd(),
}, bundle: true, write: false, format: "iife", platform: "browser", logLevel: "silent" });

const api = homeworldQaModelV64(process.cwd(), [
  "homeworldWorldV77.ts", "homeworldNavigationV77.ts", "homeworldGeometryV64.ts", "homeworldInteriorsV64.ts",
]);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(120000);
const report = { passed: false, url, commit: process.env.GITHUB_SHA ?? null, checks: [], routes: [], captures: [], pageErrors: [], httpErrors: [],
  fixture: "Fixed adult legacy save, Blooded acquired and one prior successful Oseris-IV hunt, stored at the normal city entry. No M039 receipt or trajectory injected." };
page.on("pageerror", error => report.pageErrors.push(String(error)));
page.on("response", response => {
  if (response.status() >= 400) report.httpErrors.push({ status: response.status(), url: response.url() });
});

const debt = '[data-homeworld-relay-m039]';
const dialogue = page.getByRole("region", { name: "Revenir chez les siens" });
const capture = async file => {
  await page.screenshot({ path: join(output, file) });
  report.captures.push(file);
};
const disk = () => page.evaluate(() => JSON.parse(localStorage.getItem("yautja-long-hunt.save")));
let nav;
async function boot() {
  await page.clock.resume();
  assert((await page.reload({ waitUntil: "domcontentloaded" })).ok());
  await page.locator('[data-campaign-menu="main"]').waitFor();
  await page.locator('[data-menu-section="campaign"]').click();
  await page.locator('[data-menu-action="continue"]').click();
  const play = page.getByRole("button", { name: "Jouer", exact: true });
  if (await play.isVisible()) await play.click();
  await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor();
  await page.bringToFront();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 150));
  nav = homeworldNavigatorV77(page, api);
  await nav.focus();
}
async function action(label, phase) {
  const button = dialogue.getByRole("button", { name: label, exact: true });
  await button.click();
  await nav.tick(160);
  const save = await disk();
  assert.equal(save.homeworld.returnM039.phase, phase);
  report.checks.push({ phase, room: await nav.room(), position: await nav.position() });
  return save;
}
function saveRoutes() {
  report.routes.push(...nav.routes);
}

try {
  await page.clock.install();
  assert((await page.goto(url, { waitUntil: "domcontentloaded", timeout: 150000 })).ok());
  await page.locator('[data-campaign-menu="main"]').waitFor();
  await page.addScriptTag({ content: bootstrap.outputFiles[0].text });
  await page.evaluate(async () => {
    const api = globalThis.__m039Fixture;
    const save = api.defaultSave("2026-11-22T06:00:00.000Z");
    Object.assign(save.profile, { hunterName: "Retour de Oseris", rankId: "blooded", acquiredRankIdV166: "blooded" });
    Object.assign(save.missionProgress["jungle-vey"], { status: "completed", attempts: 1, completions: 1 });
    save.settings.masterVolume = 0;
    const normalized = api.normalizeSave(save);
    if (!api.parseSaveImport(JSON.stringify(normalized)).save) throw Error("Invalid M039 admission fixture");
    localStorage.setItem(api.SAVE_STORAGE_KEY, JSON.stringify(normalized));
    const migrated = await api.migrateLegacyCampaignSlot();
    if (!migrated.ok) throw Error(migrated.message);
    const saved = await api.saveCampaignCheckpoint(1, { kind: "manual", index: 1, location: "homeworld", expectedRevision: api.loadCampaignSlots().slots[0].revision });
    if (!saved.ok) throw Error(saved.message);
  });
  await boot();
  const initial = await disk();
  assert.equal(initial.homeworld.returnM039, undefined);
  await nav.openPoint("dock-officer-point");
  const observed = await dialogue.innerText();
  assert.match(observed, /Oseris-IV/);
  assert.doesNotMatch(observed, /Nivalis-K/);
  await action("Prendre en charge le relais du quai", "assigned");
  assert.equal(await page.locator(debt).getAttribute("data-homeworld-relay-m039"), "offline");
  await capture("01-quai-panne.png");

  await nav.openPoint("forge-service");
  await action("Ajuster et prendre le disjoncteur", "part-ready");
  await capture("02-piece-ajustee.png");
  saveRoutes();
  await boot();
  assert.equal((await disk()).homeworld.returnM039.phase, "part-ready");
  assert.equal(await nav.room(), "deep-forge");
  await nav.openPoint("dock-officer-point");
  await action("Monter le disjoncteur", "mounted");
  assert.equal(await page.locator(debt).getAttribute("data-homeworld-relay-m039"), "offline");
  await action("Tester le relais sous charge", "commissioned");
  assert.equal(await page.locator(debt).getAttribute("data-homeworld-relay-m039"), "online");
  const completed = await action("Rester auprès de la communauté", "reported");
  assert.equal(completed.homeworld.returnM039.link, "community");
  assert.deepEqual(completed.missionProgress, initial.missionProgress);
  assert.deepEqual(completed.inventory, initial.inventory);
  assert.equal(completed.profile.acquiredRankIdV166, initial.profile.acquiredRankIdV166);
  await capture("03-remise-et-relais.png");
  saveRoutes();
  await boot();
  assert.equal(await page.locator(debt).getAttribute("data-homeworld-relay-m039"), "online");
  assert.equal((await disk()).homeworld.returnM039.link, "community");
  assert.deepEqual(report.pageErrors, []);
  report.passed = true;
} catch (error) {
  report.failure = String(error.stack ?? error);
  if (nav) saveRoutes();
  await capture("failure.png").catch(() => {});
  throw error;
} finally {
  await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
}
