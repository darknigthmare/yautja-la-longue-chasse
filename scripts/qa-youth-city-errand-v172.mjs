/** Native M003 input from a Youngling checkpoint.
 * The saved position and every repair step come from the ordinary Homeworld. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { homeworldQaModelV64 } from "./homeworld-qa-model-v64.mjs";
import { homeworldNavigatorV77 } from "./homeworld-navigation-browser-v77.mjs";

const url = process.env.YAUTJA_M003_QA_URL ?? "http://127.0.0.1:4398";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(url).hostname));
const output = process.env.YAUTJA_M003_QA_OUTPUT ?? "outputs/qa-bible-m003";
await mkdir(output, { recursive: true });
const bootstrap = await build({ stdin: {
  contents: [
    "import * as saves from './app/game/save';",
    "import * as slots from './app/game/systems/campaignSlots';",
    "import * as nursery from './app/game/systems/nurseryPrologue';",
    "import * as continuity from './app/game/systems/nurseryContinuityV72';",
    "import * as campaign from './app/game/systems/nurseryCampaign';",
    "import { NURSERY_COHORT_STOPS } from './app/game/systems/nurseryCohortV172';",
    "globalThis.__m003Fixture = { ...saves, ...slots, ...nursery, ...continuity, ...campaign, NURSERY_COHORT_STOPS };",
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
  fixture: "Initial Unblooded save with an actual simulated M002 checkout. All M003 actions and city positions use native controls." };
page.on("pageerror", error => report.pageErrors.push(String(error)));
page.on("response", response => {
  if (response.status() >= 400) report.httpErrors.push({ status: response.status(), url: response.url() });
});

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
async function action(selector, reached) {
  await page.locator(selector).click();
  await nav.tick(160);
  const save = await disk();
  assert.equal(save.homeworld.youthCityErrandV172.reached, reached);
  report.checks.push({ reached, room: await nav.room(), position: await nav.position() });
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
    const api = globalThis.__m003Fixture;
    const at = "2026-11-22T06:00:00.000Z";
    const initial = { ...api.defaultSave(at), prologue: api.createNurseryCampaign() };
    let state = api.enableNurseryCohort(api.enableNurseryContinuityV72(api.createNurseryPrologue({ readyMode: "press" })));
    let receipt;
    const env = { assetsReady: true, pageVisible: true, paused: false, nextChapterReady: true };
    for (let tick = 0; tick < 10000 && !receipt; tick++) {
      const card = api.nurseryStoryCardV72(state);
      const delta = state.rival.x - state.player.x;
      const stop = api.NURSERY_COHORT_STOPS[state.cohortV172.steps];
      const distance = stop ? stop.x - state.cohortV172.x : 0;
      const input = !state.inputArmed ? {} : card ? { confirm: tick % 32 === 0 } :
        state.phase === "ready" ? { ready: tick % 32 === 0 } : state.phase === "duel" ?
          { move: Math.abs(delta) > 44 ? Math.sign(delta) : 0, light: tick % 30 === 0 } :
          state.phase === "cohort" ? Math.abs(distance) > 15 ? { move: Math.sign(distance) } : { confirm: tick % 12 === 0 } : {};
      const result = api.stepNurseryPrologue(state, input, env);
      state = result.state;
      receipt = result.completion;
    }
    if (!receipt || state.cohortV172.steps !== 7) throw Error("Nursery route failed");
    const save = api.withNurseryCompletion(initial, receipt, state, at);
    if (!save) throw Error("Nursery checkpoint failed");
    save.settings.masterVolume = 0;
    const normalized = api.normalizeSave(save);
    if (!api.parseSaveImport(JSON.stringify(normalized)).save) throw Error("Invalid M003 admission fixture");
    localStorage.setItem(api.SAVE_STORAGE_KEY, JSON.stringify(normalized));
    const migrated = await api.migrateLegacyCampaignSlot();
    if (!migrated.ok) throw Error(migrated.message);
    const saved = await api.saveCampaignCheckpoint(1, { kind: "manual", index: 1, location: "homeworld", expectedRevision: api.loadCampaignSlots().slots[0].revision });
    if (!saved.ok) throw Error(saved.message);
  });
  await boot();
  const initial = await disk();
  assert.equal(initial.homeworld.youthCityErrandV172, undefined);
  await nav.openPoint("audience-point");
  await action('[data-r2-m003-route="escort"]', 0);
  await capture("01-piece-confiee.png");
  await nav.openPoint("forge-service");
  await action('[data-r2-m003-stop="forge-service"]', 1);
  await capture("02-remise-forge.png");
  saveRoutes();
  await boot();
  assert.equal((await disk()).homeworld.youthCityErrandV172.reached, 1);
  await nav.openPoint("memory-service");
  await action('[data-r2-m003-stop="memory-service"]', 2);
  await nav.reach({ levelId: "0", point: { x: 7380, y: 5500 } });
  await nav.release();
  await page.keyboard.press("KeyE");
  await nav.tick(160);
  await action('[data-r2-m003-stop="kennel"]', 3);
  await nav.openPoint("training-service");
  const completed = await action('[data-r2-m003-stop="training-service"]', 4);
  assert.deepEqual(completed.inventory, initial.inventory);
  await capture("03-reperes-consignes.png");
  saveRoutes();
  await boot();
  assert.equal((await disk()).homeworld.youthCityErrandV172.reached, 4);
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
