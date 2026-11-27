/** Checks a native M034 route after the declared M023 admission fixture. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { homeworldQaModelV64 } from "./homeworld-qa-model-v64.mjs";
import { homeworldNavigatorV77 } from "./homeworld-navigation-browser-v77.mjs";
import { firstVoyageAdmissionV173, OWNER, qa, saves, SHIP } from "../tests/helpers/first-interstellar-fixture-v173.mjs";


const url = process.env.YAUTJA_M034_QA_URL ?? "http://127.0.0.1:4398";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(url).hostname));
const output = process.env.YAUTJA_M034_QA_OUTPUT ?? "outputs/qa-bible-m034";
await mkdir(output, { recursive: true });
const bootstrap = await build({ stdin: {
  contents: [
    "import * as saves from './app/game/save';",
    "import * as slots from './app/game/systems/campaignSlots';",
    "globalThis.__m034Fixture = { ...saves, ...slots };",
  ].join("\n"),
  resolveDir: process.cwd(),
}, bundle: true, write: false, format: "iife", platform: "browser", logLevel: "silent" });
const voyage = qa.load("app/game/systems/firstInterstellarV173.ts");
const { save: owned } = firstVoyageAdmissionV173({ prepared: true });
const cleared = voyage.firstInterstellarAccessV173(owned, SHIP, true, null);
assert.equal(cleared.allowed, true);

const walk = direction => ({ kind: "walk", direction });
const steer = direction => ({ kind: "steer", direction });
const mooring = action => ({ kind: "mooring", action });
const repeat = (count, action) => Array.from({ length: count }, () => action);
const beacon = { kind: "beacon" };

function firstTrip() {
  let state = null;
  const run = (...commands) => {
    for (const command of commands) {
      const result = voyage.commitFirstInterstellarV173(state, command, cleared);
      assert.ok(result.accepted, result.message);
      state = result.state;
    }
  };
  run({ kind: "plan", route: "direct" }, ...repeat(4, walk(1)), { kind: "launch" },
    steer(-1), beacon, steer(1), steer(1), beacon, steer(-1), beacon);
  run(...repeat(3, mooring({ type: "lateral", direction: -1 })), mooring({ type: "align" }));
  const flight = voyage.inspectFirstInterstellarV173(state, OWNER).view.flight;
  assert.ok(flight);
  run(...repeat(flight.speed - 1, mooring({ type: "speed", direction: -1 })),
    ...repeat(flight.distance / 10, mooring({ type: "advance" })),
    mooring({ type: "lock", index: 0 }), mooring({ type: "lock", index: 1 }),
    ...repeat(2, mooring({ type: "ring", direction: 1 })), mooring({ type: "berth" }));
  run(...repeat(5, walk(1)));
  const alongside = state;
  run(...repeat(5, walk(-1)));
  return { alongside, returned: state };
}


const ready = { ...owned, firstInterstellarV173: firstTrip().returned };
ready.settings.masterVolume = 0;
const seed = saves.parseSaveImport(saves.exportSave(ready)).save;
assert.ok(seed);
const api = homeworldQaModelV64(process.cwd(), [
  "homeworldWorldV77.ts", "homeworldNavigationV77.ts", "homeworldNavigationV109.ts", "homeworldGeometryV64.ts", "homeworldInteriorsV64.ts",
]);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(120000);
const report = { passed: false, url, commit: process.env.GITHUB_SHA ?? null, checks: [], routes: [], captures: [], pageErrors: [], httpErrors: [],
  fixture: "Owned Blooded adult campaign. Acquisition and M023 are prepared through their native reducers. No M034 choice or travel is injected." };
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
  const exterior = {
    ...api,
    homeworldWorldRouteV77(from, to) {
      if (from.levelId !== to.levelId) return api.homeworldWorldRouteV77(from, to);
      const walk = api.homeworldWalkRouteV109(from.levelId, from.point, to.point);
      return { status: walk.status, segments: walk.status === "reachable" ? [walk] : [] };
    },
  };
  nav = homeworldNavigatorV77(page, exterior, { waypointTolerance: 3, driverTickMs: 26, pulseInputs: true });
  indoorNav = homeworldNavigatorV77(page, api, { waypointTolerance: 3, driverTickMs: 26, pulseInputs: true });
  await nav.focus();
}
async function dockRoute() {
  await openNativePoint("dock-officer-point");
  const comparison = page.locator("[data-homeworld-route-m034-officer]");
  await comparison.waitFor();
  assert.match(await comparison.innerText(), /Chasse.*Oseris-IV/s);
  assert.match(await comparison.innerText(), /Exploration.*Kaail-Prime/s);
  assert.match(await comparison.innerText(), /Service.*Relais du Pèlerin/s);
  assert.equal(await comparison.locator("[data-homeworld-route-m034-choice=nivalis-hunt]").isDisabled(), true);
  await comparison.locator("[data-homeworld-route-m034-choice=kaail-survey]").press("Enter");
  await nav.tick(160);
  assert.equal((await disk()).homeworld.nextRouteM034?.phase, "planned");
  report.checks.push({ action: "compare and choose", room: await nav.room(), position: await nav.position() });
  await capture("01-dock-route-comparison.png");
}

async function walkToSas() {
  await nav.closeDialog();
  if (await nav.room()) await nav.exitRoom();
  await nav.focus();
  const target = api.HOMEWORLD_POINTS_V77.find(point => point.id === "personal-ship");
  assert.equal(await nav.floor(), target.levelId);
  const start = await nav.position();
  const near = [0, 40, 80, 115].flatMap(offset =>
    [[0, offset], [offset, 0], [-offset, 0], [0, -offset]].map(([dx, dy]) => ({ x: target.x + dx, y: target.y + dy })));
  const approach = near.find(point => api.homeworldWalkableV77(target.levelId, point) &&
    !api.nearestHomeworldDoorV77(target.levelId, point) &&
    !api.nearestHomeworldConnectorV77(target.levelId, point) &&
    api.nearestHomeworldPointV77(target.levelId, point)?.id === target.id &&
    api.homeworldWalkRouteV109(target.levelId, start, point).status === "reachable");
  assert.ok(approach, "Walkable exterior approach to the orbital transfer");
  await nav.reach({ levelId: target.levelId, point: approach });
  await page.keyboard.press("KeyE");
  await nav.tick(160);
  const manifest = page.locator("[data-homeworld-route-m034-manifest=planned]");
  await manifest.waitFor();
  await manifest.locator("[data-homeworld-route-m034-seal]").press("Enter");
  await nav.tick(160);
  assert.equal((await disk()).homeworld.nextRouteM034?.phase, "prepared");
  await page.locator("[data-homeworld-route-m034-manifest=prepared]").waitFor();
  report.checks.push({ action: "walk to orbital transfer and seal", room: await nav.room(), position: await nav.position() });
  await capture("02-manifest-sealed.png");
}

try {
  await page.clock.install();
  assert((await page.goto(url, { waitUntil: "domcontentloaded", timeout: 150000 })).ok());
  await page.locator('[data-campaign-menu="main"]').waitFor();
  await page.addScriptTag({ content: bootstrap.outputFiles[0].text });
  await page.evaluate(async save => {
    const api = globalThis.__m034Fixture;
    if (!api.parseSaveImport(JSON.stringify(save)).save) throw Error("Invalid M034 admission fixture");
    localStorage.setItem(api.SAVE_STORAGE_KEY, JSON.stringify(save));
    const migrated = await api.migrateLegacyCampaignSlot();
    if (!migrated.ok) throw Error(migrated.message);
    const saved = await api.saveCampaignCheckpoint(1, { kind: "manual", index: 1, location: "homeworld", expectedRevision: api.loadCampaignSlots().slots[0].revision });
    if (!saved.ok) throw Error(saved.message);
  }, seed);
  await boot();
  const initial = await disk();
  assert.equal(initial.homeworld.nextRouteM034, undefined);
  await dockRoute();
  report.routes.push(...nav.routes);
  await boot();
  assert.equal((await disk()).homeworld.nextRouteM034?.destinationId, "kaail-survey");
  await walkToSas();
  report.routes.push(...nav.routes);
  await boot();
  const final = await disk();
  assert.equal(final.homeworld.nextRouteM034?.phase, "prepared");
  assert.deepEqual(final.firstInterstellarV173, initial.firstInterstellarV173);
  assert.deepEqual(final.spaceRoutesV159, initial.spaceRoutesV159);
  assert.deepEqual(final.missionProgress, initial.missionProgress);
  assert.deepEqual(final.loadout, initial.loadout);
  assert.equal(final.profile.honor, initial.profile.honor);
  assert.deepEqual(report.pageErrors, []);
  report.passed = true;
} catch (error) {
  report.failure = String(error.stack ?? error);
  console.error(JSON.stringify({ checks: report.checks, routes: report.routes, httpErrors: report.httpErrors.slice(-8) }));
  if (nav) report.routes.push(...nav.routes);
  await capture("failure.png").catch(() => {});
  throw error;
} finally {
  await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
}
