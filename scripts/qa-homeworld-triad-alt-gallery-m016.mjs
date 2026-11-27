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
const output = resolve(process.env.M016_CITY_OUTPUT ?? "outputs/qa-homeworld-triad-alt-gallery-m016");
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  fixtures: "Prior native campaign reducers finish V70. Each room starts beyond service reach. Native invitations and the selected roster persist on the same campaign owner. This recipe covers V90 independently of the street transit.",
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
let browser, server;
try {
  server = await createServer({
    configFile: resolve("desktop/vite.config.ts"),
    server: { host: "127.0.0.1", port: 4291, strictPort: true },
  });
  await server.listen();
  browser = await chromium.launch({ args: ["--no-sandbox"] });
  let played = seed;
  const recruits = [
    triad.triadCityStationsM016("deep-forge").find(station => station.partner === "tov"),
    triad.triadCityStationsM016("training-hall").find(station => station.partner === "yena"),
  ];
  assert(recruits.every(Boolean));
  for (const [index, station] of recruits.entries()) {
    const { checkpoint, key: walk } = approachFor(station, played);
    const scenario = { ...played, homeworld: { ...played.homeworld, locationV77: checkpoint } };
    assert(saves.parseSaveImport(saves.exportSave(scenario)).save);
    const context = await browser.newContext({ viewport: { width: 1360, height: 980 }, reducedMotion: "reduce" });
    await context.addInitScript(({ key, scenario }) => {
      if (sessionStorage.getItem("m016-city-seeded")) return;
      sessionStorage.setItem("m016-city-seeded", "1");
      localStorage.setItem(key, JSON.stringify(scenario));
    }, { key, scenario });
    const page = await context.newPage();
    const failures = [];
    page.on("pageerror", error => report.errors.push(error.message));
    page.on("response", response => {
      const url = new URL(response.url());
      if (response.status() >= 400 && url.hostname === "127.0.0.1") failures.push([response.status(), url.pathname]);
    });
    await page.clock.install();
    await page.goto("http://127.0.0.1:4291");
    const hub = page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"][data-homeworld-interior-id="' + station.roomId + '"]');
    const actor = hub.locator("[data-homeworld-actor]");
    const viewport = hub.locator("[data-homeworld-viewport]");
    const panel = page.locator('[data-homeworld-m016-station="' + station.partner + '"]');
    const advance = panel.locator("[data-homeworld-m016-advance]");
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    async function boot() {
      await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
      const campaign = page.locator('[data-menu-section="campaign"]');
      if (await campaign.isVisible()) await campaign.click();
      await page.locator('[data-menu-action="continue"]').click();
      try {
        await hub.waitFor({ timeout: 55000 });
      } catch (error) {
        const state = await page.evaluate(() => {
          const h = document.querySelector("[data-homeworld-hub]");
          const overlay = document.querySelector("[data-homeworld-motion-loading-v74]");
          return { ready: h?.getAttribute("data-homeworld-motion-ready"), room: h?.getAttribute("data-homeworld-interior-id"), motion: overlay?.textContent,
            screen: document.body.innerText.trim().split("\n").slice(0, 10) };
        });
        console.error(JSON.stringify({ state, failures: failures.slice(0, 25), pageErrors: report.errors.slice(0, 10) }));
        await page.screenshot({ path: resolve(output, station.partner + "-boot.png"), animations: "disabled" }).catch(() => {});
        throw error;
      }
      await viewport.focus();
    }
    await boot();
    await hub.locator('[data-homeworld-m016-partner="' + station.partner + '"]').waitFor({ state: "attached" });
    const start = await actor.evaluate(el => [Number(el.dataset.x), Number(el.dataset.y)]);
    assert(Math.hypot(start[0] - checkpoint.local.x, start[1] - checkpoint.local.y) <= 2);
    await page.keyboard.press("KeyE");
    assert.equal(await panel.count(), 0, "M016 requires approaching the actual room service");
    await page.keyboard.down(walk);
    try {
      for (let i = 0; i < 40 && !await hub.locator('[data-homeworld-interior-target="point"]').count(); i++) {
        await page.clock.runFor(40);
      }
    } finally {
      await page.keyboard.up(walk);
      await page.clock.runFor(110);
    }
    const stopped = await actor.evaluate(el => [Number(el.dataset.x), Number(el.dataset.y)]);
    assert(Math.hypot(start[0] - stopped[0], start[1] - stopped[1]) >= 20);
    await page.keyboard.press("KeyE");
    await panel.waitFor();
    assert.equal(await panel.getAttribute("data-phase"), "0");
    for (let step = 1; step <= station.demonstration.length + 1; step++) {
      await advance.click();
      await page.waitForFunction(({ key, station, step }) =>
        JSON.parse(localStorage.getItem(key))?.homeworld.triadCityM016?.alternates?.[station] === step,
      { key, station: station.partner, step });
      await page.locator('[data-homeworld-m016-station="' + station.partner + '"][data-phase="' + step + '"]').waitFor();
      if (step === 1) {
        await page.reload();
        await boot();
        await page.keyboard.press("KeyE");
        await panel.waitFor();
        assert.equal(await panel.getAttribute("data-phase"), "1");
      }
    }
    await panel.getByText("Rendez-vous confirmé", { exact: true }).waitFor();
    await page.screenshot({ path: resolve(output, station.partner + "-rendezvous.png"), animations: "disabled" });
    played = await read();
    assert(!played.soloV90, "The city by itself cannot open or complete the gallery");
    assert.deepEqual(played.prologue.chronicle, scenario.prologue.chronicle);
    report.stations.push({ room: station.roomId, partner: station.partner, start, stopped,
      saved: played.homeworld.triadCityM016.alternates[station.partner], coldResume: true, nativePromotion: false });
    if (index === 1) {
      const tick = ms => page.clock.runFor(ms);
      assert.deepEqual(played.homeworld.triadCityM016.steps, { saar: 0, vek: 0 });
      const choosePair = page.locator('[data-homeworld-m016-roster-choice="yena-tov"]');
      await choosePair.click();
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.homeworld.triadCityM016?.roster === "yena-tov", key);
      const selected = (await read()).homeworld.triadCityM016;
      await page.reload();
      await boot();
      assert.equal(await hub.getAttribute("data-homeworld-interior-id"), station.roomId);
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
        try {
          await page.locator('[data-solo-v90] canvas[data-solo-assets="true"]').waitFor({ timeout: 65000 });
        } catch (error) {
          const scene = await page.locator("body").innerText().catch(() => "");
          console.error(JSON.stringify({ scene: scene.slice(0, 2500), failures: failures.slice(0, 30), errors: report.errors }));
          await page.screenshot({ path: resolve(output, "gallery-boot.png"), animations: "disabled" }).catch(() => {});
          throw error;
        }
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
      report.gallery = { roster: "yena-tov", partners: positioned.soloV90.checkpoint.companions,
        observations: positioned.soloV90.checkpoint.partnerObservations, refusal: positioned.soloV90.checkpoint.formationRefusedAt,
        rolesPositioned: positioned.soloV90.checkpoint.milestones["roles-positioned"] };
    }
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  await browser?.close();
  await server?.close();
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
