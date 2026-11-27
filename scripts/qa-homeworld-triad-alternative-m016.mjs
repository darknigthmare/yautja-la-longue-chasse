import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { templeCampaignRoute } from "../tests/helpers/solo-v70-played-route.mjs";
import { homeworldSceneSsrV78 } from "../tests/helpers/homeworld-scene-ssr-v78.mjs";

const modules = homeworldSceneSsrV78();
const saves = modules.load("app/game/save.ts");
const triad = modules.load("app/game/systems/homeworldTriadM016.ts");
const interiors = modules.load("app/game/systems/homeworldInteriorsV64.ts");
const { HOMEWORLD_BUILDINGS_V77 } = modules.load("app/game/systems/homeworldWorldV77.ts");
const { homeworldBuildingDoorwayV64 } = modules.load("app/game/systems/homeworldGeometryV64.ts");
const { resolveHomeworldLocationV77 } = modules.load("app/game/systems/homeworldLocationV77.ts");
const seed = templeCampaignRoute().save;
seed.settings.masterVolume = 0;
const key = saves.SAVE_STORAGE_KEY;
const output = resolve(process.env.M016_CITY_OUTPUT ?? "outputs/qa-homeworld-triad-alternative-m016");
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  fixtures: "Prior native campaign reducers finish V70. Only the first forge approach is prepared, beyond the service reach. All later crossings, walking and the reload use the same campaign.",
  stations: [], errors: [], passed: false,
};

function approachFor(station, save) {
  const room = interiors.homeworldInteriorForBuildingV64(station.roomId);
  const building = HOMEWORLD_BUILDINGS_V77.find(building => building.id === station.roomId);
  const point = room?.points.find(point => point.pointId === station.pointId);
  assert(room && building && point);
  for (const [dx, dy, key] of [[0, 1, "ArrowUp"], [1, 0, "ArrowLeft"], [-1, 0, "ArrowRight"], [0, -1, "ArrowDown"]]) {
    const at = d => ({ x: point.x + dx * d, y: point.y + dy * d });
    const safe = Array.from({ length: 40 }, (_, i) => at(49 + i)).every(p => interiors.isHomeworldInteriorWalkableV64(room, p));
    if (!safe || interiors.nearestHomeworldInteriorTargetV64(room, at(49))?.pointId !== station.pointId ||
        interiors.nearestHomeworldInteriorTargetV64(room, at(88))) continue;
    const checkpoint = { version: 1, layoutRevision: 1, ownerCreatedAt: save.createdAt, levelId: building.levelId,
      exterior: homeworldBuildingDoorwayV64(building).approach, interiorId: station.roomId, local: at(88) };
    if (resolveHomeworldLocationV77(checkpoint, save.createdAt).restored) return { checkpoint, key };
  }
  throw Error("No walkable service approach in " + station.roomId);
}

await mkdir(output, { recursive: true });
let browser, server, page;
const assetFailures = [];
try {
  server = await createServer({
    configFile: resolve("desktop/vite.config.ts"),
    server: { host: "127.0.0.1", port: 4291, strictPort: true },
  });
  await server.listen();
  browser = await chromium.launch({ args: ["--no-sandbox"] });
  const tov = triad.triadCityStationsM016("deep-forge").find(station => station.partner === "tov");
  const yena = triad.triadCityStationsM016("training-hall").find(station => station.partner === "yena");
  assert(tov && yena);
  const { checkpoint, key: initialWalk } = approachFor(tov, seed);
  seed.homeworld.locationV77 = checkpoint;
  assert(saves.parseSaveImport(saves.exportSave(seed)).save);
  const context = await browser.newContext({ viewport: { width: 1360, height: 980 }, reducedMotion: "reduce" });
  await context.addInitScript(({ key, campaign }) => {
    if (sessionStorage.getItem("m016-transit-seeded")) return;
    sessionStorage.setItem("m016-transit-seeded", "1");
    localStorage.setItem(key, JSON.stringify(campaign));
  }, { key, campaign: seed });
  page = await context.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  page.on("response", response => {
    const url = new URL(response.url());
    if (response.status() >= 400 && url.hostname === "127.0.0.1") assetFailures.push([response.status(), url.pathname]);
  });
  await page.clock.install();
  await page.goto("http://127.0.0.1:4291");
  const hub = page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]');
  const viewport = hub.locator("[data-homeworld-viewport]");
  const guideTarget = "point:training-service";
  const guide = page.locator('[data-homeworld-route-target-v98="' + guideTarget + '"]');
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const tick = ms => page.clock.runFor(ms);
  const location = () => page.evaluate(() => {
    const hub = document.querySelector("[data-homeworld-hub]");
    const actor = document.querySelector("[data-homeworld-actor]");
    const guide = document.querySelector('[data-homeworld-route-target-v98="point:training-service"]');
    return {
      room: hub?.getAttribute("data-homeworld-interior-id") ?? null,
      level: hub?.getAttribute("data-homeworld-level-v77") ?? "",
      transit: hub?.getAttribute("data-homeworld-transit-v77") ?? null,
      actor: [Number(actor?.getAttribute("data-x")), Number(actor?.getAttribute("data-y"))],
      motionReady: hub?.getAttribute("data-homeworld-motion-ready") === "true",
      route: guide && {
        state: guide.getAttribute("data-homeworld-route-guide-v109"),
        paused: guide.getAttribute("data-homeworld-route-paused-v98") === "true",
        current: guide.getAttribute("data-homeworld-route-current-v109") === "true",
        x: Number(guide.getAttribute("data-homeworld-route-next-x-v109") ?? NaN),
        y: Number(guide.getAttribute("data-homeworld-route-next-y-v109") ?? NaN),
      },
    };
  });
  async function boot() {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    await hub.waitFor({ timeout: 65000 });
    await page.bringToFront();
    await viewport.focus();
  }
  async function beginRoute() {
    const atlas = page.getByRole("dialog", { name: "Carte des étages de la cité", exact: true });
    const planner = atlas.locator('[data-homeworld-route-planner-v98="' + guideTarget + '"]');
    await planner.getByRole("button", { name: "Suivre ce repère à pied", exact: true }).click();
    try {
      await guide.waitFor({ timeout: 30000 });
    } catch (error) {
      console.error(JSON.stringify({ guideFailure: await atlas.innerText().catch(() => null) }));
      throw error;
    }
    await viewport.focus();
  }
  async function meet(station) {
    const panel = page.locator('[data-homeworld-m016-station="' + station.partner + '"]');
    await page.keyboard.press("KeyE");
    await panel.waitFor();
    assert.equal(await panel.getAttribute("data-phase"), "0");
    for (let step = 1; step <= station.demonstration.length + 1; step++) {
      await panel.locator("[data-homeworld-m016-advance]").click();
      await page.waitForFunction(({ key, partner, step }) =>
        JSON.parse(localStorage.getItem(key))?.homeworld.triadCityM016?.alternates?.[partner] === step,
      { key, partner: station.partner, step });
      await page.locator('[data-homeworld-m016-station="' + station.partner + '"][data-phase="' + step + '"]').waitFor();
    }
    await panel.getByText("Rendez-vous confirmé", { exact: true }).waitFor();
    report.stations.push({ partner: station.partner, room: station.roomId, phase: station.demonstration.length + 1 });
    return panel;
  }

  const trace = [];
  let exteriorWalked = 0;
  let last, noRoute = 0, stuck = 0, transitions = 0;
  async function walkGuided({ untilStreet = false } = {}) {
    for (let iteration = 0; iteration < 2400; iteration++) {
      const state = await location();
      if (last && state.room === null && last.room === null && state.level === last.level) {
        const distance = Math.hypot(state.actor[0] - last.actor[0], state.actor[1] - last.actor[1]);
        if (distance < 55) exteriorWalked += distance;
      }
      const previous = last;
      last = state;
      trace.push(state);
      if (trace.length > 36) trace.shift();
      if (!state.room && untilStreet) return state;
      if (state.transit || !state.motionReady || !state.route?.current || state.route.paused || state.route.state === "off-route") {
        if (++noRoute > 95) throw Error("Guide did not reconnect: " + JSON.stringify(trace));
        await tick(45);
        continue;
      }
      noRoute = 0;
      if (state.route.state === "arrived") {
        if (state.room === yena.roomId) return state;
        assert(++transitions <= 12, JSON.stringify(trace));
        await viewport.focus();
        await page.keyboard.press("KeyE");
        await tick(160);
        continue;
      }
      const [x, y] = state.actor, dx = state.route.x - x, dy = state.route.y - y;
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
        await tick(45);
        continue;
      }
      if (previous && x === previous.actor[0] && y === previous.actor[1]) stuck++; else stuck = 0;
      if (stuck > 65) throw Error("Actual walking stalled: " + JSON.stringify(trace));
      const keys = [];
      const distance = Math.hypot(dx, dy);
      if (Math.abs(dx) >= 1) keys.push(dx > 0 ? "ArrowRight" : "ArrowLeft");
      if (Math.abs(dy) >= 1) keys.push(dy > 0 ? "ArrowDown" : "ArrowUp");
      await viewport.focus();
      for (const key of keys) await page.keyboard.down(key);
      await tick(distance < 34 ? 17 : 48);
      for (const key of keys) await page.keyboard.up(key);
      await tick(34);
    }
    throw Error("Bounded walk did not arrive: " + JSON.stringify(trace));
  }

  await boot();
  const start = await location();
  assert.equal(start.room, tov.roomId);
  assert(Math.hypot(start.actor[0] - checkpoint.local.x, start.actor[1] - checkpoint.local.y) <= 2);
  await page.keyboard.down(initialWalk);
  try {
    for (let i = 0; i < 40 && !await hub.locator('[data-homeworld-interior-target="point"]').count(); i++) await tick(40);
  } finally {
    await page.keyboard.up(initialWalk);
    await tick(110);
  }
  const forgePanel = await meet(tov);
  await forgePanel.locator('[data-homeworld-m016-onward="yena"]').click();
  await beginRoute();
  const doorway = await walkGuided({ untilStreet: true });
  const departed = await read();
  assert.equal(departed.homeworld.locationV77.interiorId, null);
  assert.deepEqual(departed.homeworld.triadCityM016.alternates, { yena: 0, tov: 3 });
  await page.screenshot({ path: resolve(output, "sortie-forge.png"), animations: "disabled" });

  await page.reload();
  await boot();
  const resumed = await location();
  assert.equal(resumed.room, null);
  assert(Math.hypot(resumed.actor[0] - doorway.actor[0], resumed.actor[1] - doorway.actor[1]) <= 2);
  assert.deepEqual((await read()).homeworld.triadCityM016.alternates, { yena: 0, tov: 3 });
  await page.locator('[data-homeworld-m016-route="yena"]').click();
  await beginRoute();
  const destination = await walkGuided();
  assert.equal(destination.room, yena.roomId);
  assert(exteriorWalked > 200);
  await meet(yena);
  await page.screenshot({ path: resolve(output, "arrivee-terrasses.png"), animations: "disabled" });
  const played = await read();
  assert.deepEqual(played.homeworld.triadCityM016.alternates, { yena: 4, tov: 3 });
  assert.deepEqual(played.prologue.chronicle, seed.prologue.chronicle);
  assert.deepEqual(played.homeworld.triadCityM016.steps, { saar: 0, vek: 0 });
  const choosePair = page.locator('[data-homeworld-m016-roster-choice="yena-tov"]');
  await choosePair.click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.homeworld.triadCityM016?.roster === "yena-tov", key);
  const selected = (await read()).homeworld.triadCityM016;
  await page.reload();
  await boot();
  assert.equal((await location()).room, yena.roomId);
  await page.keyboard.press("KeyE");
  await choosePair.waitFor();
  assert.equal(await choosePair.getAttribute("aria-pressed"), "true");
  const gallery = page.locator("[data-solo-v90-enter]");
  assert.match(await gallery.innerText(), /Yena et Tov/);
  await gallery.click();
  const canvas = page.locator("[data-solo-v90] canvas");
  const model = modules.load("app/game/systems/firstHuntSoloV90.ts");
  const controls = modules.load("app/game/systems/youthControls.ts").YOUTH_CONTROL_ACTIONS;
  const interaction = seed.settings.controlBindings[controls.interact][0];
  async function readyGallery() {
    await page.locator('[data-solo-v90] canvas[data-solo-assets="true"]').waitFor({ timeout: 90000 });
    await canvas.focus();
    await tick(160);
  }
  async function waitForStored(test) {
    for (let i = 0; i < 100; i++) {
      if (test((await read()).soloV90.checkpoint)) return;
      await tick(120);
    }
    throw Error("Expected played gallery checkpoint: " + JSON.stringify((await read()).soloV90.checkpoint));
  }
  const live = () => canvas.evaluate(el => JSON.parse(el.dataset.soloState));
  async function walkTo(x) {
    await canvas.focus();
    const direction = (await live()).player.x < x ? 1 : -1;
    const key = seed.settings.controlBindings[direction === 1 ? controls.right : controls.left].at(-1);
    assert(key);
    await page.keyboard.down(key);
    try {
      for (let i = 0; i < 160 && (x - (await live()).player.x) * direction > 18; i++) await tick(80);
    } finally {
      await page.keyboard.up(key);
      await tick(160);
    }
    assert(Math.abs((await live()).player.x - x) < 34);
  }
  async function interactUntil(test) {
    await page.keyboard.down(interaction);
    try {
      await waitForStored(test);
    } finally {
      await page.keyboard.up(interaction);
      await tick(160);
    }
  }
  await readyGallery();
  const entered = await read();
  assert.deepEqual(entered.homeworld.triadCityM016, selected);
  assert.deepEqual(entered.soloV90.checkpoint.companions.map(partner => partner.id), ["yena", "tov"]);
  assert.deepEqual(entered.soloV90.checkpoint.partnerObservations, {});
  assert.deepEqual(entered.soloV90.receipts, []);
  await interactUntil(state => state.phase === "arsenal");
  await walkTo(780);
  await interactUntil(state => state.phase === "assemble");
  for (const partner of model.soloV90PartnerActivities(entered.soloV90.checkpoint)) {
    await walkTo(partner.x);
    await interactUntil(state => typeof state.partnerObservations[partner.id] === "number");
  }
  await walkTo(2590);
  const opposed = page.locator('[data-solo-v90-plan="complementary"]');
  const accepted = page.locator('[data-solo-v90-plan="preference"]');
  assert.match(await opposed.innerText(), /Tov approche, Yena ouvre/);
  await opposed.click();
  await waitForStored(state => typeof state.formationRefusedAt === "number");
  await page.locator('[data-solo-v90-rehearsal="pending"]').waitFor();
  assert(await opposed.isDisabled());
  await page.screenshot({ path: resolve(output, "objection-yena.png"), animations: "disabled" });

  await page.reload();
  await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
  const campaign = page.locator('[data-menu-section="campaign"]');
  if (await campaign.isVisible()) await campaign.click();
  await page.locator('[data-menu-action="continue"]').click();
  await readyGallery();
  await page.locator('[data-solo-v90-rehearsal="pending"]').waitFor();
  await accepted.click();
  await waitForStored(state => state.formationPlan === "preference");
  const signal = seed.settings.controlBindings[controls.blade][0];
  await page.keyboard.down(signal);
  await tick(120);
  await page.keyboard.up(signal);
  await interactUntil(state => state.phase === "observe");
  const positioned = await read();
  assert.deepEqual(positioned.soloV90.checkpoint.companions.map(partner => [partner.id, Math.round(partner.x / 10) * 10]),
    [["yena", 2360], ["tov", 2800]]);
  assert.equal(typeof positioned.soloV90.checkpoint.milestones["roles-positioned"], "number");
  assert.deepEqual(positioned.soloV90.checkpoint.contributions, { player: 0, yena: 0, tov: 0 });
  assert.deepEqual(positioned.homeworld.triadCityM016, selected);
  assert.deepEqual(positioned.prologue.chronicle, seed.prologue.chronicle);
  await page.screenshot({ path: resolve(output, "postes-yena-tov.png"), animations: "disabled" });
  report.transit = { doorway, resumed, destination, exteriorWalked, interactions: transitions };
  report.gallery = { roster: "yena-tov", partners: positioned.soloV90.checkpoint.companions,
    observations: positioned.soloV90.checkpoint.partnerObservations, refusal: positioned.soloV90.checkpoint.formationRefusedAt,
    rolesPositioned: positioned.soloV90.checkpoint.milestones["roles-positioned"] };
  assert.deepEqual(report.errors, []);
  report.passed = true;
  await context.close();
} catch (error) {
  report.failure = String(error);
  const state = await page?.evaluate(() => {
    const h = document.querySelector("[data-homeworld-hub]");
    return { ready: h?.getAttribute("data-homeworld-motion-ready"), room: h?.getAttribute("data-homeworld-interior-id"),
      motion: document.querySelector("[data-homeworld-motion-loading-v74]")?.textContent,
      screen: document.body.innerText.trim().split("\n").slice(0, 10) };
  }).catch(() => null);
  console.error(JSON.stringify({ state, assets: assetFailures.slice(0, 20), errors: report.errors.slice(0, 10) }));
  await page?.screenshot({ path: resolve(output, "failure.png"), animations: "disabled" }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  await server?.close();
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
