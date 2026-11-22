/** Native M028 inputs, with a declared admission fixture for the previous hunt.
 * The saved position and all orders come from the ordinary Homeworld. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { homeworldQaModelV64 } from "./homeworld-qa-model-v64.mjs";
import { homeworldNavigatorV77 } from "./homeworld-navigation-browser-v77.mjs";

const url = process.env.YAUTJA_M028_QA_URL ?? "http://127.0.0.1:4398";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(url).hostname));
const output = process.env.YAUTJA_M028_QA_OUTPUT ?? "outputs/qa-bible-m028";
await mkdir(output, { recursive: true });
const bootstrap = await build({ stdin: {
  contents: [
    "import * as saves from './app/game/save';",
    "import * as slots from './app/game/systems/campaignSlots';",
    "import {MISSIONS} from './app/game/data';",
    "import * as campaign from './app/game/systems/buriedCradleCampaign';",
    "import * as cradle from './app/game/systems/buriedCradle';",
    "import * as snapshot from './app/game/systems/buriedCradleSnapshot';",
    "import * as returns from './app/game/systems/buriedCradleReturn';",
    "import {SHIP_INTERIOR_25D_ROOMS} from './app/game/systems/shipInterior25d';",
    "globalThis.__m028Fixture = { ...saves, ...slots, ...campaign, ...cradle, ...snapshot, ...returns, MISSIONS, SHIP_INTERIOR_25D_ROOMS };",
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
  fixture: "Blooded legacy save with eight successes. Existing Berceau reducers and the station observations create a retreat and signed workshop debrief as admission. No M028 receipt or trajectory injected." };
page.on("pageerror", error => report.pageErrors.push(String(error)));
page.on("response", response => {
  if (response.status() >= 400) report.httpErrors.push({ status: response.status(), url: response.url() });
});

const gate = '[data-homeworld-coordination-gate-m028]';
const dialogue = page.getByRole("region", { name: "Console de coordination" });
const capture = async file => {
  await page.screenshot({ path: join(output, file) });
  report.captures.push(file);
};
const disk = () => page.evaluate(() => JSON.parse(localStorage.getItem("yautja-long-hunt.save")));
let nav;
let indoorNav;
async function walkNativeTo(room, description, reached) {
  assert.ok(room, description);
  if (await nav.room() !== room.buildingId) await nav.enter(room.buildingId);
  else await nav.closeDialog();

  const start = await indoorNav.position();
  const successors = [[0, -8], [8, 0], [-8, 0], [0, 8]];
  const keyFor = point => point.x + "," + point.y;
  const walkable = point => api.isHomeworldInteriorWalkableV64(room, point, { halfWidth: 26, halfDepth: 16 });
  const queue = [start];
  const visited = new Map([[keyFor(start), null]]);
  let goal = null;
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (reached(current)) {
      goal = current;
      break;
    }
    for (const [dx, dy] of successors) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (visited.has(keyFor(next)) || !walkable(next) ||
          !walkable({ x: current.x + dx / 2, y: current.y + dy / 2 })) continue;
      visited.set(keyFor(next), current);
      queue.push(next);
    }
  }
  assert.ok(goal, "A roomy physical approach to " + description);
  const path = [];
  for (let point = goal; point; point = visited.get(keyFor(point))) path.push(point);
  await indoorNav.follow(path.reverse());
  const at = await indoorNav.position();
  assert.ok(reached(at));
  report.routes.push({ kind: "interior", target: description, roomId: room.buildingId, from: start, to: at, steps: path.length });
  return at;
}

async function openNativePoint(pointId) {
  const room = api.homeworldInteriorForPointV64(pointId);
  await walkNativeTo(room, pointId, point => {
    const target = api.nearestHomeworldInteriorTargetV64(room, point);
    return target?.pointId === pointId && Math.hypot(point.x - target.position.x, point.y - target.position.y) < 59;
  });
  await page.keyboard.press("KeyE");
  await indoorNav.tick(160);
  await page.locator("[data-homeworld-hub]").getByRole("dialog").waitFor();
}

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
  indoorNav = homeworldNavigatorV77(page, api, { waypointTolerance: 3, driverTickMs: 26, pulseInputs: true });
  await nav.focus();
}
async function action(label, phase) {
  const button = dialogue.getByRole("button", { name: label, exact: true });
  await button.press("Enter");
  await nav.tick(160);
  const save = await disk();
  assert.equal(save.homeworld.coordinationM028.phase, phase);
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
    const api = globalThis.__m028Fixture;
    let save = api.defaultSave("2026-11-22T06:00:00.000Z");
    Object.assign(save.profile, { hunterName: "Second du quai", rankId: "blooded", acquiredRankIdV166: "blooded" });
    for (const mission of api.MISSIONS) Object.assign(save.missionProgress[mission.id], { status: "completed", attempts: 1, completions: 1 });
    save.settings.difficultyId = "hunter";
    const ship = "classic-predator-spaceship";
    const context = { personalShipId: ship, ownedShipIds: [ship] };
    const apply = (action, extra = {}) => {
      const result = api.actBuriedCradleCampaign(save, action, { ...context, ...extra });
      if (!result.accepted) throw Error(result.message);
      save = { ...save, buriedCradle: result.state, prologue: result.prologue };
    };
    apply({ type: "prepare" });
    apply({ type: "depart" });
    let run = api.createBuriedCradleRun(api.createBuriedCradleProgress(), 1);
    run.player.x = 156;
    run.player.y = 508;
    run = api.stepBuriedCradle(run, { interactPressed: true }, 1 / 60).run;
    apply({ type: "extract", progress: run.progress, snapshot: api.snapshotBuriedCradleRun(run) });
    for (const type of ["treat-return", "inspect-return", "analyze-workshop"]) {
      const roomId = api.CRADLE_RETURN_STATIONS[type];
      const approach = api.SHIP_INTERIOR_25D_ROOMS[roomId].station.approach;
      apply({ type, expectedRevision: save.buriedCradle.returnVisit.revision },
        { returnActive: true, returnObservation: { roomId, ...approach } });
    }
    save.settings.masterVolume = 0;
    const normalized = api.normalizeSave(save);
    if (!api.parseSaveImport(JSON.stringify(normalized)).save) throw Error("Invalid M028 admission fixture");
    localStorage.setItem(api.SAVE_STORAGE_KEY, JSON.stringify(normalized));
    const migrated = await api.migrateLegacyCampaignSlot();
    if (!migrated.ok) throw Error(migrated.message);
    const saved = await api.saveCampaignCheckpoint(1, { kind: "manual", index: 1, location: "homeworld", expectedRevision: api.loadCampaignSlots().slots[0].revision });
    if (!saved.ok) throw Error(saved.message);
  });
  await boot();
  const initial = await disk();
  assert.equal(initial.homeworld.coordinationM028, undefined);
  await openNativePoint("dock-officer-point");
  await action("Confier le terrain à l’équipe", "briefed");
  await action("Ouvrir le passage", "jammed");
  const delayed = await action("Envoyer le signal", "delayed");
  assert.equal(delayed.homeworld.coordinationM028.delays, 1);
  await capture("01-signal-premature.png");
  await action("Reprendre depuis le passage", "jammed");

  const workshop = api.homeworldInteriorForBuildingV64("convoy-workshop");
  await walkNativeTo(workshop, "verrou de l’atelier", point => Math.hypot(point.x - 225, point.y - 205) <= 17);
  assert.equal(await page.locator(gate).getAttribute("data-homeworld-coordination-gate-m028"), "jammed");
  await page.keyboard.press("KeyE");
  await indoorNav.tick(160);
  assert.equal((await disk()).homeworld.coordinationM028.phase, "surveyed");
  await capture("02-verrou-repere.png");
  saveRoutes();

  await boot();
  assert.equal((await disk()).homeworld.coordinationM028.phase, "surveyed");
  assert.equal(await nav.room(), "convoy-workshop");
  await openNativePoint("dock-officer-point");
  await action("Ordonner de libérer le verrou repéré", "cleared");
  await action("Envoyer le signal", "recovering");
  const completed = await action("Ordonner le retour des équipes", "returned");
  assert.equal(completed.homeworld.coordinationM028.delays, 1);
  assert.deepEqual(completed.missionProgress, initial.missionProgress);
  assert.deepEqual(completed.inventory, initial.inventory);
  assert.deepEqual(completed.buriedCradle, initial.buriedCradle);
  await capture("03-caisse-et-equipes-revenues.png");
  saveRoutes();
  await boot();
  assert.equal((await disk()).homeworld.coordinationM028.phase, "returned");
  assert.deepEqual(report.pageErrors, []);
  report.passed = true;
} catch (error) {
  report.failure = String(error.stack ?? error);
  console.error(JSON.stringify({ checks: report.checks, routes: report.routes, httpErrors: report.httpErrors.slice(-8) }));
  if (nav) saveRoutes();
  await capture("failure.png").catch(() => {});
  throw error;
} finally {
  await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
}
