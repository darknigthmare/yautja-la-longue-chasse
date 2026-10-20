/** Actual title-menu journeys in fresh Chromium contexts. Clan orders and the
 * first Preserve Hunt journey use ordinary controls. Separate, explicitly
 * labelled fixtures cover a validated Homeworld checkpoint and a launch window.
 * No existing browser profiles, real saves, scores or campaign rewards are used. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { firstTracksCompleted } from "../tests/helpers/solo-v67-campaign-route.mjs";
import { homeworldQaModelV64 } from "./homeworld-qa-model-v64.mjs";
import { homeworldNavigatorV77 } from "./homeworld-navigation-browser-v77.mjs";

const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? "http://127.0.0.1:3000";
const output = path.resolve(process.env.YAUTJA_THREE_MODES_QA_OUTPUT ?? "outputs/qa-three-modes-v98");
const modes = new Set((process.env.YAUTJA_THREE_MODES_QA_MODES ?? "clans,reserve,homeworld").split(","));
assert.ok(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname), "This recipe only exercises a local server");
await fs.mkdir(output, { recursive: true });
const hash = value => createHash("sha256").update(value).digest("hex");
const sourcePaths = ["app/game/buildInfo.ts", "app/game/ClanWarCommandV98.tsx", "app/game/ClanWarCommandV98.module.css", "app/game/ClanWarPanelV85.tsx", "app/game/systems/clanWarCommandV98.ts", "app/game/GameReserveV66.tsx", "app/game/GameReserveTacticalV98.tsx", "app/game/GameReserveV66.module.css", "app/game/systems/gameReserveV66.ts", "app/game/systems/gameReserveTacticalV98.ts", "app/game/HomeworldHub.tsx", "app/game/HomeworldWorldMapV77.tsx", "app/game/HomeworldRouteGuideV98.tsx", "app/game/HomeworldRouteGuideV98.module.css", "app/game/systems/homeworldWayfindingV98.ts", "app/game/homeworldRouteWorkerV98.ts", "app/game/systems/homeworldNavigationV77.ts"];
const sourceSnapshot = async () => Promise.all(sourcePaths.map(async file => ({ file, sha256: hash(await fs.readFile(file)) })));
const sourceBefore = await sourceSnapshot();
const bundle = await build({ stdin: { contents: `import * as saves from './app/game/save'; import * as slots from './app/game/systems/campaignSlots'; import * as reserve from './app/game/systems/gameReserveV66'; window.__threeModesQaV98={...saves,...slots,...reserve};`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "iife", platform: "browser", target: "es2022", logLevel: "silent" });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const contexts = [], checks = [], errors = [], captures = [], fixtures = [], workers = [];
const check = (name, condition) => { assert.ok(condition, name); checks.push({ name, status: "PASS" }); };
const newPage = async (mobile = false, controlledClock = false) => {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1050 }, reducedMotion: "reduce" });
  contexts.push(context);
  const page = await context.newPage(); page.setDefaultTimeout(25000);
  if (controlledClock) await page.clock.install();
  page.on("pageerror", error => errors.push({ url: page.url(), message: error.message }));
  page.on("console", message => { if (message.type() === "error") errors.push({ source: "console.error", url: page.url(), message: message.text(), location: message.location() }); });
  page.on("worker", worker => workers.push({ url: worker.url(), createdAt: new Date().toISOString() }));
  return page;
};
const capture = async (page, file, locator = page) => { await paint(page); await locator.screenshot({ path: path.join(output, file) }); captures.push({ file, viewport: page.viewportSize(), capturedAt: new Date().toISOString() }); };
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const paint = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function menu(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.locator('[data-campaign-menu="main"]').waitFor();
  assert.equal(await page.locator("[data-game-content-version]").first().getAttribute("data-game-content-version"), "V98");
}
async function enterClans(page) {
  await menu(page);
  await page.getByRole("button", { name: /^Guerres des clans/ }).click();
  await page.getByRole("button", { name: "Accéder malgré les spoilers", exact: true }).click();
  await page.getByTestId("war-command-v98").waitFor();
}
async function enterReserve(page) {
  await menu(page);
  await page.locator('[data-main-menu-mode="game-reserve"]').click();
  await page.getByRole("button", { name: "Accéder malgré les spoilers", exact: true }).click();
  await page.locator("[data-bonus-start]").click();
  await page.locator("[data-game-reserve-v66]").waitFor();
  await page.waitForFunction(() => document.querySelector("canvas[data-reserve-assets]")?.getAttribute("data-reserve-assets") === "true");
}
const reserveKey = "yautja-main-menu-bonus.v81.reserve";
const reserveDisk = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "null")?.state, reserveKey);
async function seedHomeworld(page) {
  await menu(page);
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const result = await page.evaluate(async fixture => {
    const api = window.__threeModesQaV98;
    const save = fixture;
    save.profile.hunterName = "QA V98 · Homeworld";
    save.settings.masterVolume = 0;
    if (!api.parseSaveImport(JSON.stringify(save)).save) throw Error("Invalid Homeworld fixture");
    localStorage.setItem(api.SAVE_STORAGE_KEY, JSON.stringify(save));
    const migrated = await api.migrateLegacyCampaignSlot();
    if (!migrated.ok) throw Error(migrated.message);
    const saved = await api.saveCampaignCheckpoint(1, { kind: "manual", index: 1, location: "homeworld", expectedRevision: api.loadCampaignSlots().slots[0].revision });
    if (!saved.ok) throw Error(saved.message);
    return { owner: save.createdAt, checkpoint: saved.checkpoint, profile: "Youth fixture produced through the authored cage and first-tracks model routes; not a story played in this browser" };
  }, firstTracksCompleted());
  fixtures.push({ mode: "Homeworld", ...result });
  await menu(page);
  await page.getByRole("button", { name: /^Continuer/ }).click();
  await page.locator("[data-homeworld-hub]").waitFor({ timeout: 90000 });
  await page.waitForFunction(() => document.querySelector("[data-homeworld-hub]")?.getAttribute("data-assets-ready") !== "false");
}
try {
  if (modes.has("clans")) {
  const clans = await newPage(); await enterClans(clans);
  const command = clans.getByTestId("war-command-v98"), order = clans.getByTestId("war-order-panel-v98"), preview = clans.getByTestId("war-order-preview-v98");
  const uniqueClanPanels = async step => check(`Clans: exactly one command post, slot summary and atlas ${step}`, await command.count() === 1 && await clans.getByTestId("war-command-slots-v98").count() === 1 && await clans.getByTestId("clan-war-atlas-v95").count() === 1);
  await uniqueClanPanels("on entry");
  check("Clans: the real menu opens a V98 command post with six controlled initial sites", /6 sites sous vos ordres/.test(await command.innerText()));
  await command.getByRole("button", { name: "Tous les sites", exact: true }).click();
  check("Clans: controlled site register exposes six actionable sites", await command.locator("[data-war-command-site]").count() === 6);
  await command.getByRole("button", { name: "Commander T02", exact: true }).click();
  const kind = order.locator("[data-war-order-kind-v98]");
  check("Clans: a command action focuses the actual order selector", await kind.evaluate(element => document.activeElement === element));
  check("Clans: an empty assault draft cannot be reserved", await order.getByRole("button", { name: "Réserver l’ordre", exact: true }).isDisabled() && await preview.getAttribute("data-ready") === "false");
  await kind.selectOption("recon");
  await order.getByRole("button", { name: "Sélectionner les mobiles", exact: true }).click();
  await uniqueClanPanels("after preparing the draft");
  check("Clans: selecting mobile actors produces a validated reconnaissance draft", await preview.getAttribute("data-ready") === "true" && await order.getByRole("button", { name: "Réserver l’ordre", exact: true }).isEnabled());
  await capture(clans, "clans-order-preview-desktop.png", order);
  await order.getByRole("button", { name: "Réserver l’ordre", exact: true }).click();
  await clans.waitForFunction(() => JSON.parse(localStorage.getItem("yautja.clan-war.v85.free.v1") ?? "null")?.orders?.length === 1);
  await uniqueClanPanels("after reservation");
  check("Clans: reserving updates operation slots and disables actors already assigned", /Opérations\s*1\/2/.test(await clans.getByTestId("war-command-slots-v98").innerText()) && await order.locator('input[type="checkbox"]:disabled').count() > 0);
  await capture(clans, "clans-command-reserved-desktop.png", command);
  await enterClans(clans);
  await uniqueClanPanels("after reload");
  check("Clans: reload retains the real reserved order and slot count", /Opérations\s*1\/2/.test(await clans.getByTestId("war-command-slots-v98").innerText()) && await clans.getByRole("button", { name: "Retirer", exact: true }).count() === 1);
  await clans.getByRole("button", { name: "Retirer", exact: true }).click();
  await clans.waitForFunction(() => JSON.parse(localStorage.getItem("yautja.clan-war.v85.free.v1") ?? "null")?.orders?.length === 0);
  await uniqueClanPanels("after cancellation");
  check("Clans: cancelling releases the operation slot", /Opérations\s*0\/2/.test(await clans.getByTestId("war-command-slots-v98").innerText()));
  await command.getByRole("button", { name: "Tous les sites", exact: true }).click();
  const recon = command.getByRole("button", { name: /^Reconnaître T/ }).first();
  await recon.click();
  check("Clans: frontier shortcuts open a real reconnaissance draft and focus its selector", await kind.inputValue() === "recon" && await kind.evaluate(element => document.activeElement === element));
  const objectives = clans.getByTestId("war-command-objectives-v98"); await objectives.locator("summary").click();
  check("Clans: objective ledger distinguishes all six regions from the physical continents", await objectives.locator("article").count() === 6 && /Corridor des Haltes/.test(await objectives.innerText()));
  for (const planetId of ["thalassa", "korthas"]) {
    await clans.getByTestId("war-planet-selector-v96").getByRole("combobox", { name: "Planète active", exact: true }).selectOption(planetId);
    await clans.waitForFunction(id => document.querySelector('[data-testid="clan-war-atlas-v95"]')?.getAttribute("data-planet-id") === id, planetId);
    await uniqueClanPanels(`after changing to ${planetId}`);
  }
  await clans.setViewportSize({ width: 390, height: 844 }); await paint(clans);
  check("Clans: V98 command and order controls fit a 390px viewport", await noOverflow(clans));
  await capture(clans, "clans-command-mobile.png", command);
  await capture(clans, "clans-order-mobile.png", order);
  console.log(JSON.stringify({ completedMode: "clans", checks: checks.length }));
  await clans.context().close();
  }

  if (modes.has("reserve")) {
  const reserve = await newPage(); await enterReserve(reserve);
  check("Preserve Hunt: the ordinary free-play journey exposes the accessible tracking notebook", await reserve.locator("[data-reserve-notebook]").count() === 1 && await reserve.locator("[data-reserve-notebook-summary]").count() === 1);
  check("Preserve Hunt: remote ship information remains unknown in the initial notebook", await reserve.locator('[data-reserve-escape][data-escape-phase="unknown"]').count() === 2);
  await reserve.getByRole("button", { name: "Commencer l’expédition", exact: true }).click();
  const canvas = reserve.locator("canvas[data-reserve-tick]");
  await reserve.waitForFunction(() => Number(document.querySelector("canvas[data-reserve-tick]")?.getAttribute("data-reserve-tick")) >= 20);
  const originX = Number(await canvas.getAttribute("data-reserve-x"));
  await canvas.focus(); await reserve.keyboard.down("KeyD"); await reserve.waitForTimeout(450); await reserve.keyboard.up("KeyD");
  check("Preserve Hunt: normal movement advances the actual canvas actor", Number(await canvas.getAttribute("data-reserve-x")) > originX + 15);
  await reserve.getByRole("button", { name: "Ouvrir le carnet de traque et suspendre la chasse", exact: true }).click();
  await reserve.getByRole("dialog").waitFor();
  await reserve.waitForFunction(() => document.querySelector("[data-reserve-notebook-summary]")?.parentElement?.open === true);
  const pausedTick = await canvas.getAttribute("data-reserve-tick"); await reserve.waitForTimeout(220);
  check("Preserve Hunt: opening the notebook pauses simulation and checkpoints the played position", await canvas.getAttribute("data-reserve-tick") === pausedTick && (await reserveDisk(reserve)).tick === Number(pausedTick));
  const notebookSummary = reserve.locator("[data-reserve-notebook-summary]");
  await notebookSummary.focus(); await notebookSummary.press("Space");
  await reserve.waitForFunction(() => document.querySelector("[data-reserve-notebook-summary]")?.parentElement?.open === false);
  check("Preserve Hunt: closing the notebook with Space keeps focus on its native summary", await notebookSummary.evaluate(element => document.activeElement === element));
  await notebookSummary.press("Space");
  await reserve.waitForFunction(() => document.querySelector("[data-reserve-notebook-summary]")?.parentElement?.open === true);
  check("Preserve Hunt: a second Space reopens the notebook without resuming the simulation", await canvas.getAttribute("data-reserve-tick") === pausedTick);
  await capture(reserve, "reserve-notebook-desktop.png", reserve.getByRole("dialog"));
  const persisted = await reserveDisk(reserve);
  await enterReserve(reserve);
  check("Preserve Hunt: reload resumes the exact checkpoint instead of restarting the expedition", Number(await reserve.locator("canvas").getAttribute("data-reserve-tick")) === persisted.tick && Math.abs(Number(await reserve.locator("canvas").getAttribute("data-reserve-x")) - persisted.player.x) < 1);
  await reserve.setViewportSize({ width: 390, height: 844 }); await paint(reserve);
  await reserve.locator("[data-reserve-notebook-summary]").click();
  await reserve.waitForFunction(() => document.querySelector("[data-reserve-notebook-summary]")?.parentElement?.open === true); await paint(reserve);
  check("Preserve Hunt: notebook fits a 390px viewport", await noOverflow(reserve));
  await capture(reserve, "reserve-notebook-mobile.png", reserve.locator("[data-reserve-notebook]"));
  await reserve.getByRole("button", { name: "Reprendre la chasse", exact: true }).click();
  await reserve.getByRole("button", { name: "Tactile", exact: true }).click();
  const right = reserve.locator('[data-reserve-action="right"]'), beforeTouch = Number(await reserve.locator("canvas").getAttribute("data-reserve-x"));
  const rightBounds = await right.boundingBox(); assert.ok(rightBounds);
  await reserve.mouse.move(rightBounds.x + rightBounds.width / 2, rightBounds.y + rightBounds.height / 2); await reserve.mouse.down(); await reserve.waitForTimeout(350); await reserve.mouse.up();
  check("Preserve Hunt: native pointer input on mobile controls moves the physical actor", Number(await reserve.locator("canvas").getAttribute("data-reserve-x")) > beforeTouch + 10);
  await reserve.getByRole("button", { name: "Pause", exact: true }).click();

  const interception = await newPage(); await menu(interception);
  await interception.addScriptTag({ content: bundle.outputFiles[0].text });
  const launchFixture = await interception.evaluate(key => {
    const api = window.__threeModesQaV98, state = api.createGameReserveV66(37);
    state.tick = 600; state.inputArmed = true; state.player.x = 2360;
    state.ships[0] = { parts: 3, repair: 3600, launch: 500, departedAt: null, sabotages: 0 };
    for (const human of state.humans.slice(0, 4)) { human.x = 2360; human.status = "boarded"; human.carrying = false; }
    const normalized = api.normalizeGameReserveV66(state); if (!normalized) throw Error("Launch fixture rejected by production normalizer");
    localStorage.setItem(key, JSON.stringify({ version: 1, state: normalized }));
    return { seed: 37, tick: normalized.tick, launch: normalized.ships[0].launch, player: normalized.player, aboard: normalized.humans.filter(human => human.status === "boarded").length };
  }, reserveKey);
  fixtures.push({ mode: "Preserve Hunt launch interception", description: "Isolated normalized launch-window fixture; not reached by waiting through the ordinary expedition", ...launchFixture });
  await enterReserve(interception);
  await interception.getByRole("button", { name: "Reprendre la chasse", exact: true }).click();
  const launchCanvas = interception.locator("canvas[data-reserve-tick]");
  await interception.locator("[data-reserve-launch-alert]").waitFor();
  await interception.waitForFunction(() => {
    const canvas = document.querySelector("canvas"), context = canvas?.getContext("2d");
    if (!canvas || !context) return false;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data, colors = new Set();
    for (let y = 0; y < canvas.height; y += Math.max(1, Math.floor(canvas.height / 20))) for (let x = 0; x < canvas.width; x += Math.max(1, Math.floor(canvas.width / 30))) {
      const at = (y * canvas.width + x) * 4; colors.add(`${pixels[at] >> 3},${pixels[at + 1] >> 3},${pixels[at + 2] >> 3},${pixels[at + 3]}`);
    }
    return colors.size > 32;
  });
  check("Preserve Hunt launch fixture: the native canvas contains the rendered world after viewport resize", true);
  check("Preserve Hunt launch fixture: the real scene warns of the remaining takeoff window", /Décollage|départ/i.test(await interception.locator("[data-reserve-launch-alert]").innerText()));
  await capture(interception, "reserve-boarding-interception-before.png");
  await launchCanvas.focus(); await interception.keyboard.down("KeyE");
  await interception.waitForFunction(() => document.querySelector("canvas")?.getAttribute("data-reserve-interceptions") === "1", null, { timeout: 10000 });
  await interception.keyboard.up("KeyE");
  await interception.getByRole("button", { name: "Pause", exact: true }).click();
  const intercepted = await reserveDisk(interception);
  check("Preserve Hunt launch fixture: holding interact interrupts the actual boarding ship before takeoff", intercepted.ships[0].launch === null && intercepted.ships[0].repair < 2000 && !!intercepted.ships[0].interception);
  check("Preserve Hunt launch fixture: four passengers return as physical active opponents", intercepted.humans.slice(0, 4).every(human => human.status === "active") && intercepted.humans.filter(human => human.status === "boarded").length === 0);
  check("Preserve Hunt launch fixture: sabotage grants no teleport, damage or secured prize", Math.abs(intercepted.player.x - launchFixture.player.x) < 1 && intercepted.player.hp === launchFixture.player.hp && intercepted.humans.every(human => human.status !== "secured"));
  await interception.locator("[data-reserve-notebook-summary]").click();
  await interception.waitForFunction(() => document.querySelector("[data-reserve-notebook-summary]")?.parentElement?.open === true); await paint(interception);
  check("Preserve Hunt launch fixture: interception is recorded in the accessible notebook", /Interception consignée/.test(await interception.locator("[data-reserve-notebook]").innerText()));
  await capture(interception, "reserve-boarding-intercepted-notebook.png", interception.getByRole("dialog"));
  await enterReserve(interception);
  check("Preserve Hunt launch fixture: reload preserves the interrupted ship and disembarked opponents", (await reserveDisk(interception)).ships[0].launch === null && (await reserveDisk(interception)).humans.slice(0, 4).every(human => human.status === "active"));
  console.log(JSON.stringify({ completedMode: "reserve", checks: checks.length }));
  await reserve.context().close(); await interception.context().close();
  }

  if (modes.has("homeworld")) {
  const home = await newPage(false, true); await seedHomeworld(home);
  const hub = home.locator("[data-homeworld-hub]");
  const position = () => home.locator("[data-homeworld-actor]").evaluate(element => ({ x: Number(element.getAttribute("data-x")), y: Number(element.getAttribute("data-y")) }));
  const initialPosition = await position();
  await home.locator("[data-world-atlas-button-v77]").click();
  const atlas = home.getByRole("dialog", { name: "Carte des étages de la cité", exact: true });
  await atlas.locator('[data-map-landmark-v83="point:audience-point"]').click();
  await atlas.getByRole("button", { name: "Suivre ce repère à pied", exact: true }).click();
  const cancel = atlas.getByRole("button", { name: "Annuler le calcul", exact: true });
  await cancel.waitFor();
  const cancelStarted = Date.now(); await cancel.click();
  check("Homeworld fixture: the browser remains responsive enough to cancel a cold route calculation", Date.now() - cancelStarted < 1500);
  check("Homeworld fixture: cancelling a pending route grants no active guidance", await home.locator("[data-homeworld-route-guide-v98]").count() === 0);
  await atlas.getByRole("button", { name: "Suivre ce repère à pied", exact: true }).click();
  await cancel.waitFor();
  await atlas.locator('[data-map-landmark-v83="point:dock-officer-point"]').click();
  check("Homeworld fixture: choosing another destination cancels the previous pending route", await atlas.locator('[data-homeworld-route-planner-v98="point:dock-officer-point"]').getAttribute("aria-busy") === "false" && await home.locator("[data-homeworld-route-guide-v98]").count() === 0);
  await atlas.locator('[data-map-landmark-v83="point:audience-point"]').click();
  const routeStarted = Date.now();
  await atlas.getByRole("button", { name: "Suivre ce repère à pied", exact: true }).click();
  const guide = home.locator("[data-homeworld-route-guide-v98]"); await guide.waitFor({ state: "attached", timeout: 180000 });
  checks.push({ name: "Homeworld fixture: native route click to computed guide", status: "PASS", elapsedMs: Date.now() - routeStarted });
  await guide.getByRole("button", { name: "Carte", exact: true }).click();
  await atlas.getByRole("button", { name: "0 · Cité haute", exact: true }).click();
  const firstLeg = await atlas.locator("[data-homeworld-route-map-v98] polyline").first().getAttribute("points");
  assert.ok(firstLeg, "The selected map exposes the actual street leg");
  const walkingPoints = firstLeg.trim().split(/\s+/).map(pair => { const [x, y] = pair.split(",").map(Number); return { x, y }; });
  check("Homeworld fixture: choosing an upper-level landmark draws a real route", await atlas.locator("[data-homeworld-route-map-v98] polyline").count() > 0 || /raccord|escalier|ascenseur/i.test(await atlas.locator("[data-homeworld-route-planner-v98]").innerText()));
  await capture(home, "homeworld-route-atlas-desktop.png", atlas);
  await atlas.getByRole("button", { name: "Fermer la carte", exact: true }).click();
  await guide.waitFor();
  check("Homeworld fixture: closing the map keeps the physical walking guide visible", await guide.getAttribute("data-homeworld-route-target-v98") === "point:audience-point");
  assert.deepEqual(await position(), initialPosition);
  check("Homeworld fixture: atlas route selection leaves the physical actor at the port", true);
  check("Homeworld fixture: no free floor jump occurred", await hub.getAttribute("data-homeworld-level-v77") === "0");
  await capture(home, "homeworld-route-guide-desktop.png");
  await home.setViewportSize({ width: 390, height: 844 }); await paint(home);
  check("Homeworld fixture: the walking guide fits a 390px viewport", await noOverflow(home));
  await capture(home, "homeworld-route-guide-mobile.png");
  await home.locator("[data-world-atlas-button-v77]").click();
  check("Homeworld fixture: reopening the atlas retains the selected physical route", await home.locator("[data-homeworld-route-planner-v98]").count() === 1);
  await capture(home, "homeworld-route-atlas-mobile.png");
  await atlas.getByRole("button", { name: "Fermer la carte", exact: true }).click();
  const mobileLayout = await home.evaluate(() => {
    const bounds = element => { const rect = element?.getBoundingClientRect(); return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null; };
    const guide = document.querySelector("[data-homeworld-route-guide-v98]"), actor = document.querySelector("[data-homeworld-actor]");
    const prompt = [...document.querySelectorAll("[data-homeworld-viewport] button")].find(button => button.querySelector("kbd"));
    const overlap = (a, b) => !!a && !!b && Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x) && Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y);
    const heroArt = actor?.querySelector("[data-homeworld-unblooded-v72]") ?? actor?.querySelector("img") ?? actor;
    const result = { guide: bounds(guide), actor: bounds(heroArt), prompt: bounds(prompt) };
    return { ...result, overlapsActor: overlap(result.guide, result.actor), overlapsPrompt: overlap(result.guide, result.prompt) };
  });
  checks.push({ name: "Homeworld fixture: measured mobile guide and physical scene placement", status: "PASS", layout: mobileLayout });
  check("Homeworld fixture: the mobile guide leaves the complete hunter sprite visible", !!mobileLayout.guide && !!mobileLayout.actor && mobileLayout.actor.width > 0 && mobileLayout.actor.height > 0 && !mobileLayout.overlapsActor);
  check("Homeworld fixture: the mobile guide leaves the nearby interaction prompt accessible", !mobileLayout.overlapsPrompt);
  await home.setViewportSize({ width: 1440, height: 1050 });
  await home.clock.pauseAt(await home.evaluate(() => Date.now() + 10000));
  const worldApi = homeworldQaModelV64(process.cwd(), ["homeworldWorldV77.ts"]);
  const navigator = homeworldNavigatorV77(home, worldApi, { controlledClock: true });
  await navigator.focus();
  const guideBeforeWalk = await guide.innerText();
  console.log(JSON.stringify({ mode: "homeworld", stage: "physical-keyboard-walk", waypoints: walkingPoints.length, origin: await position(), endpoint: walkingPoints.at(-1), clock: "Browser clock advanced by the existing QA driver; production physics and native keyboard inputs unchanged" }));
  await navigator.follow(walkingPoints);
  check("Homeworld fixture: actual keyboard walking follows the planned street leg", Math.hypot((await position()).x - initialPosition.x, (await position()).y - initialPosition.y) > 40 && await guide.innerText() !== guideBeforeWalk);
  const endpoint = walkingPoints.at(-1);
  const connector = worldApi.HOMEWORLD_CONNECTORS_V77.find(item => [item.from, item.to].some(side => side.levelId === "0" && Math.hypot(side.point.x - endpoint.x, side.point.y - endpoint.y) < 15));
  assert.ok(connector, "The walked leg reaches a genuine connector landing");
  const crossing = await navigator.connect(connector.id, connector.to.levelId === "0");
  check("Homeworld fixture: a public interaction crosses a physical connector continuously", crossing.samples.length > 2 && await hub.getAttribute("data-homeworld-level-v77") !== "0");
  check("Homeworld fixture: guidance persists across the real change of floor", await guide.getAttribute("data-homeworld-route-target-v98") === "point:audience-point");
  await home.clock.resume();
  await home.waitForFunction(() => {
    const guide = document.querySelector("[data-homeworld-route-guide-v98]");
    return /ÉTAGE \+1/.test(guide?.querySelector("small")?.textContent ?? "") && [...(guide?.querySelectorAll("button") ?? [])].some(button => button.textContent === "Recalculer" && !button.disabled);
  }, null, { timeout: 90000 });
  check("Homeworld fixture: the worker recomputes guidance from the physically reached upper floor", /ÉTAGE \+1/.test(await guide.locator("small").innerText()));
  await capture(home, "homeworld-route-after-physical-crossing.png");
  await hub.getByRole("button", { name: "Pause", exact: true }).click();
  check("Homeworld fixture: pausing suspends guidance and disables recalculation", await guide.getAttribute("data-homeworld-route-paused-v98") === "true" && await guide.getByRole("button", { name: "Recalculer", exact: true }).isDisabled());
  await hub.getByRole("button", { name: "Reprendre l’exploration", exact: true }).click();
  await home.waitForFunction(() => document.querySelector("[data-homeworld-route-guide-v98]")?.getAttribute("data-homeworld-route-paused-v98") === "false");
  await guide.getByRole("button", { name: "Effacer l’itinéraire à pied", exact: true }).click();
  check("Homeworld fixture: clearing the route leaves the actor on the physically reached floor", await guide.count() === 0 && await hub.getAttribute("data-homeworld-level-v77") !== "0");
  await hub.getByRole("button", { name: "Enregistrer la position", exact: true }).click();
  await home.waitForFunction(() => JSON.parse(localStorage.getItem("yautja-long-hunt.save") ?? "null")?.homeworld?.locationV77?.levelId === "+1");
  const crossedPosition = await position();
  await menu(home); await home.getByRole("button", { name: /^Continuer/ }).click();
  await hub.waitFor({ timeout: 90000 });
  check("Homeworld fixture: explicit location save and normal Continue restore the physically reached landing", await hub.getAttribute("data-homeworld-level-v77") === "+1" && Math.hypot((await position()).x - crossedPosition.x, (await position()).y - crossedPosition.y) < 4);
  console.log(JSON.stringify({ completedMode: "homeworld", checks: checks.length }));
  }

  check("All three actual journeys complete without browser exceptions", errors.length === 0);
  const sourceAfter = await sourceSnapshot();
  assert.deepEqual(sourceAfter, sourceBefore, "Runtime sources changed during this QA run; rerun against stable sources");
  const report = { status: "PASS", baseUrl, browser: browser.version(), modes: [...modes], scope: "Real local app UI, clan orders and free Preserve Hunt actions; explicitly identified seeded Homeworld fixture with native keyboard navigation and a controlled browser clock for walking/connector checks; not a played campaign, public deployment, hardware gamepad or cloud-sync qualification", checks, fixtures, captures, workers, errors, sourceBefore, sourceAfter, completedAt: new Date().toISOString() };
  await fs.writeFile(path.join(output, "result.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, checks: checks.length, captures: captures.length, errors: errors.length, report: path.join(output, "result.json") }));
} catch (error) {
  for (let index = 0; index < contexts.length; index++) {
    const failedPage = contexts[index].pages()[0];
    if (failedPage) {
      await failedPage.screenshot({ path: path.join(output, `failure-${index}.png`) }).catch(() => {});
      await fs.writeFile(path.join(output, `failure-${index}.html`), await failedPage.content()).catch(() => {});
    }
  }
  await fs.writeFile(path.join(output, "failure.json"), JSON.stringify({ status: "FAIL", message: error.message, stack: error.stack, checks, errors, captures, fixtures, workers, completedAt: new Date().toISOString() }, null, 2));
  throw error;
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
