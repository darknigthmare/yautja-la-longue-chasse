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
const output = path.resolve(process.env.YAUTJA_THREE_MODES_QA_OUTPUT ?? "outputs/qa-three-modes-v99");
const modes = new Set((process.env.YAUTJA_THREE_MODES_QA_MODES ?? "clans,reserve,homeworld").split(","));
assert.ok(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname), "This recipe only exercises a local server");
await fs.mkdir(output, { recursive: true });
const hash = value => createHash("sha256").update(value).digest("hex");
const sourcePaths = ["app/game/buildInfo.ts", "app/game/ClanWarCommandV98.tsx", "app/game/ClanWarCommandV98.module.css", "app/game/ClanWarPanelV85.tsx", "app/game/systems/clanWarCommandV98.ts", "app/game/GameReserveV66.tsx", "app/game/GameReserveTacticalV98.tsx", "app/game/GameReserveV66.module.css", "app/game/systems/gameReserveV66.ts", "app/game/systems/gameReserveTacticalV98.ts", "app/game/HomeworldHub.tsx", "app/game/HomeworldWorldMapV77.tsx", "app/game/HomeworldRouteGuideV98.tsx", "app/game/HomeworldRouteGuideV98.module.css", "app/game/systems/homeworldWayfindingV98.ts", "app/game/homeworldRouteWorkerV98.ts", "app/game/systems/homeworldNavigationV77.ts"];
const sourceSnapshot = async () => Promise.all(sourcePaths.map(async file => ({ file, sha256: hash(await fs.readFile(file)) })));
sourcePaths.push("app/game/systems/clanWarV85.ts", "app/game/ClanWarGarrisonV99.tsx", "app/game/ClanWarGarrisonV99.module.css", "app/game/systems/homeworldNavigationV99.ts", "app/game/gameReserveV66Rendering.ts");
const sourceBefore = await sourceSnapshot();
const bundle = await build({ stdin: { contents: `import * as saves from './app/game/save'; import * as slots from './app/game/systems/campaignSlots'; import * as reserve from './app/game/systems/gameReserveV66'; import * as war from './app/game/systems/clanWarV85'; window.__threeModesQaV99={...saves,...slots,...reserve,...war};`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "iife", platform: "browser", target: "es2022", logLevel: "silent" });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const contexts = [], checks = [], errors = [], captures = [], fixtures = [], workers = [];
const pausedClocks = new WeakSet();
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
const paint = async page => {
  const painted = page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  if (pausedClocks.has(page)) await page.clock.runFor(40);
  await painted;
};
const renderedCanvas = async page => {
  await paint(page);
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas"), context = canvas?.getContext("2d");
    if (!canvas || !context) return false;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data, colors = new Set();
    for (let y = 0; y < canvas.height; y += Math.max(1, Math.floor(canvas.height / 20))) for (let x = 0; x < canvas.width; x += Math.max(1, Math.floor(canvas.width / 30))) {
      const at = (y * canvas.width + x) * 4; colors.add(`${pixels[at] >> 3},${pixels[at + 1] >> 3},${pixels[at + 2] >> 3},${pixels[at + 3]}`);
    }
    return colors.size > 32;
  });
};
async function menu(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.locator('[data-campaign-menu="main"]').waitFor();
  assert.equal(await page.locator("[data-game-content-version]").first().getAttribute("data-game-content-version"), "V99");
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
    const api = window.__threeModesQaV99;
    const save = fixture;
    save.profile.hunterName = "QA V99 · Homeworld";
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
async function seedReserveV99(page, kind) {
  await menu(page);
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const fixture = await page.evaluate(({ key, kind }) => {
    const api = window.__threeModesQaV99, state = api.createGameReserveV66(99);
    state.tick = 600; state.inputArmed = true; state.player.x = kind === "recovery" ? 1000 : 720;
    state.humans.forEach((human, index) => Object.assign(human, { x: 4300 + index * 20, hp: 0, status: "down", secured: true, downAt: 600 }));
    if (kind === "threatened") Object.assign(state.humans[0], { x: 850, facing: -1, hp: 70, status: "active", secured: false, downAt: null, lastSeenX: 720, lastSeenY: 393, alertUntil: 900, shotCooldown: 20 });
    if (kind === "recovery") {
      state.supplies[0] = 1;
      Object.assign(state.humans[0], { x: 1200, carrying: true });
      Object.assign(state.humans[1], { x: 1160, hp: 70, status: "active", secured: false, downAt: null });
    }
    const normalized = api.normalizeGameReserveV66(state);
    if (!normalized || api.gameReserveV66MaterialTotal(normalized) !== 16) throw Error("Invalid V99 supply fixture");
    localStorage.setItem(key, JSON.stringify({ version: 1, state: normalized }));
    return { kind, seed: normalized.seed, tick: normalized.tick, player: normalized.player, supplies: normalized.supplies, carrier: normalized.humans[0], survivor: normalized.humans[1], totalComponents: api.gameReserveV66MaterialTotal(normalized) };
  }, { key: reserveKey, kind });
  fixtures.push({ mode: `Preserve Hunt V99 ${kind}`, description: "Isolated authored model fixture accepted by the production normalizer before entry; subsequent channels, damage and recovery use the actual runtime and public inputs. Eight canonical people and sixteen physical components are conserved.", ...fixture });
  await enterReserve(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000)); pausedClocks.add(page);
  await page.getByRole("button", { name: "Reprendre la chasse", exact: true }).click();
  // Resume deliberately disarms held inputs. Let neutral public input re-arm
  // the simulation before holding an action, exactly as on the ordinary path.
  await page.clock.runFor(50);
  return fixture;
}
async function pauseReserveFixture(page) {
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.clock.resume(); pausedClocks.delete(page);
  return reserveDisk(page);
}
try {
  if (modes.has("reserve-captures")) {
    // A narrow replay for readable evidence of disclosures inside scrollable
    // dialogs. The complete functional journey remains the default recipe.
    const cache = await newPage(false, true); await seedReserveV99(cache, "cache");
    await cache.locator("canvas").focus(); await cache.keyboard.down("KeyE");
    await cache.clock.runFor(2100); await cache.keyboard.up("KeyE");
    const spent = await pauseReserveFixture(cache);
    check("Focused depot evidence: one native two second channel neutralized one conserved lot", spent.supplies[0] === 1 && spent.deniedSupplies[0] === 1);
    await cache.locator("[data-reserve-notebook-summary]").click();
    await cache.locator('[data-reserve-notebook] summary').filter({ hasText: "Dépôts de composants" }).click();
    await cache.setViewportSize({ width: 390, height: 844 });
    await cache.locator('[data-reserve-cache="0"]').scrollIntoViewIfNeeded();
    await capture(cache, "reserve-depot-notebook-mobile-focused.png");
    await cache.context().close();
    const recovery = await newPage(false, true); await seedReserveV99(recovery, "recovery");
    await recovery.clock.runFor(2200);
    const recovered = await pauseReserveFixture(recovery);
    await recovery.locator("[data-reserve-notebook-summary]").click();
    await recovery.locator('[data-reserve-notebook] summary').filter({ hasText: "Contacts actuellement visibles" }).click();
    check("Focused recovery evidence: the restored visible survivor carries the body's original component", recovered.humans[1].carrying && !recovered.humans[0].carrying && /Transporte un composant/.test(await recovery.locator('[data-reserve-contact="reserve-marek"]').innerText()));
    await recovery.locator('[data-reserve-contact="reserve-marek"]').scrollIntoViewIfNeeded();
    await capture(recovery, "reserve-carrier-component-transferred-desktop-focused.png");
    await recovery.context().close();
  }
  if (modes.has("clans")) {
  const clans = await newPage(); await enterClans(clans);
  const command = clans.getByTestId("war-command-v98"), order = clans.getByTestId("war-order-panel-v98"), preview = clans.getByTestId("war-order-preview-v98");
  const uniqueClanPanels = async step => check(`Clans: exactly one command post, slot summary and atlas ${step}`, await command.count() === 1 && await clans.getByTestId("war-command-slots-v98").count() === 1 && await clans.getByTestId("clan-war-atlas-v95").count() === 1);
  await uniqueClanPanels("on entry");
  check("Clans: the real menu opens a V98 command post with six controlled initial sites", /6 sites sous vos ordres/.test(await command.innerText()));
  await command.getByRole("button", { name: "Tous les sites", exact: true }).click();
  check("Clans: controlled site register exposes six actionable sites", await command.locator("[data-war-command-site]").count() === 6);
  const clanKey = "yautja.clan-war.v85.free.v1";
  const clanDisk = () => clans.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "null"), clanKey);
  await command.getByRole("button", { name: "Organiser la garde de T02", exact: true }).click();
  const garrison = clans.getByTestId("war-garrison-v99");
  await garrison.waitFor();
  check("Clans: managing a controlled site opens its native garrison disclosure with focus", await garrison.evaluate(element => element.open && document.activeElement === element.querySelector("summary")));
  await clans.addScriptTag({ content: bundle.outputFiles[0].text });
  const initialGarrison = await clans.evaluate(() => window.__threeModesQaV99.createWarSimulationV85());
  await garrison.getByRole("button", { name: "Affecter P07 à la garde", exact: true }).click();
  await clans.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? "null")?.combatants.find(person => person.id === "P07").garrison, clanKey);
  let currentGarrison = await clanDisk();
  check("Clans: assigning an existing mobile fighter changes only the local guard role and revision", currentGarrison.combatants.length === initialGarrison.combatants.length && currentGarrison.turn === initialGarrison.turn && currentGarrison.revision === initialGarrison.revision + 1 && JSON.stringify(currentGarrison.stocks) === JSON.stringify(initialGarrison.stocks) && currentGarrison.combatants.find(person => person.id === "P07").territoryId === "CON-T02");
  await garrison.getByRole("button", { name: "Libérer P02 de la garde", exact: true }).click();
  await garrison.getByRole("button", { name: "Libérer P07 de la garde", exact: true }).click();
  const confirmation = garrison.getByRole("group", { name: "Retrait du dernier garde", exact: true });
  await confirmation.waitFor();
  const beforeCancel = await clanDisk();
  await confirmation.getByRole("button", { name: "Conserver ce garde", exact: true }).click();
  check("Clans: cancelling the last guard warning preserves the whole simulation", JSON.stringify(await clanDisk()) === JSON.stringify(beforeCancel));
  await garrison.getByRole("button", { name: "Libérer P07 de la garde", exact: true }).click();
  await capture(clans, "clans-last-guard-warning-desktop.png", garrison);
  await confirmation.getByRole("button", { name: "Confirmer le retrait de P07", exact: true }).click();
  await clans.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? "null")?.combatants.filter(person => person.territoryId === "CON-T02" && person.garrison).length === 0, clanKey);
  check("Clans: explicit last guard confirmation leaves the site visibly unguarded", /sans garde|0 garde/i.test(await garrison.innerText()));
  await garrison.getByRole("button", { name: "Affecter P02 à la garde", exact: true }).click();
  await capture(clans, "clans-garrison-desktop.png", garrison);
  await enterClans(clans);
  await uniqueClanPanels("after garrison changes and reload");
  check("Clans: reload retains the real guard assignment without creating or moving a fighter", (await clanDisk()).combatants.find(person => person.id === "P02").garrison && !(await clanDisk()).combatants.find(person => person.id === "P07").garrison);
  await command.getByRole("button", { name: "Tous les sites", exact: true }).click();
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
  await command.getByRole("button", { name: "Organiser la garde de T02", exact: true }).click();
  check("Clans: a fighter reserved for an actual reconnaissance cannot change guard assignment", await garrison.getByRole("button", { name: "Affecter P07 à la garde", exact: true }).isDisabled() && /réserv/i.test(await garrison.locator('[data-war-garrison-person="P07"]').innerText()));
  await capture(clans, "clans-command-reserved-desktop.png", command);
  await enterClans(clans);
  await uniqueClanPanels("after reload");
  check("Clans: reload retains the real reserved order and slot count", /Opérations\s*1\/2/.test(await clans.getByTestId("war-command-slots-v98").innerText()) && await clans.getByRole("button", { name: "Retirer", exact: true }).count() === 1);
  await clans.getByRole("button", { name: "Retirer", exact: true }).click();
  await clans.waitForFunction(() => JSON.parse(localStorage.getItem("yautja.clan-war.v85.free.v1") ?? "null")?.orders?.length === 0);
  await uniqueClanPanels("after cancellation");
  check("Clans: cancelling releases the operation slot", /Opérations\s*0\/2/.test(await clans.getByTestId("war-command-slots-v98").innerText()));
  await command.getByRole("button", { name: "Tous les sites", exact: true }).click();
  await command.getByRole("button", { name: "Organiser la garde de T02", exact: true }).click();
  check("Clans: cancelling the reconnaissance frees its fighter for guard duty", await garrison.getByRole("button", { name: "Affecter P07 à la garde", exact: true }).isEnabled());
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
  await command.getByRole("button", { name: "Organiser la garde de T02", exact: true }).click();
  check("Clans: V99 command, garrison and order controls fit a 390px viewport", await noOverflow(clans));
  await capture(clans, "clans-garrison-mobile.png", garrison);
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
  await reserve.context().close();

  const interception = await newPage(); await menu(interception);
  await interception.addScriptTag({ content: bundle.outputFiles[0].text });
  const launchFixture = await interception.evaluate(key => {
    const api = window.__threeModesQaV99, state = api.createGameReserveV66(37);
    state.tick = 600; state.inputArmed = true; state.player.x = 2360;
    state.ships[0] = { parts: 3, repair: 3600, launch: 500, departedAt: null, sabotages: 0 };
    state.supplies[0] = 0; state.supplies[1] = 1;
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
  check("Preserve Hunt launch fixture: sabotage grants no teleport, damage or secured prize", Math.abs(intercepted.player.x - launchFixture.player.x) < 1 && intercepted.player.hp === launchFixture.player.hp && intercepted.humans.every(human => !human.secured));
  await interception.locator("[data-reserve-notebook-summary]").click();
  await interception.waitForFunction(() => document.querySelector("[data-reserve-notebook-summary]")?.parentElement?.open === true); await paint(interception);
  check("Preserve Hunt launch fixture: interception is recorded in the accessible notebook", /Interception consignée/.test(await interception.locator("[data-reserve-notebook]").innerText()));
  await capture(interception, "reserve-boarding-intercepted-notebook.png", interception.getByRole("dialog"));
  await enterReserve(interception);
  check("Preserve Hunt launch fixture: reload preserves the interrupted ship and disembarked opponents", (await reserveDisk(interception)).ships[0].launch === null && (await reserveDisk(interception)).humans.slice(0, 4).every(human => human.status === "active"));
  await interception.context().close();

  const cache = await newPage(false, true), cacheFixture = await seedReserveV99(cache, "cache");
  const cacheCanvas = cache.locator("canvas[data-reserve-tick]");
  await cacheCanvas.focus(); await cache.keyboard.down("KeyE"); await cache.clock.runFor(1000);
  check("Preserve Hunt cache fixture: native interact exposes an in-progress two second depot channel", await cache.locator('[data-reserve-interaction="cache"]').count() === 1 && /1\.[01] s/.test(await cache.locator('[data-reserve-interaction="cache"]').innerText()));
  await renderedCanvas(cache); await capture(cache, "reserve-depot-channel-desktop.png");
  await cache.clock.runFor(1100); await cache.keyboard.up("KeyE");
  const denied = await pauseReserveFixture(cache);
  check("Preserve Hunt cache fixture: holding interact physically neutralizes one depot lot without creating a trophy or moving the hunter", denied.supplies[0] === 1 && denied.deniedSupplies[0] === 1 && denied.player.x === cacheFixture.player.x && denied.player.hp === cacheFixture.player.hp && denied.humans.every(human => human.status === "down"));
  await cache.locator("[data-reserve-notebook-summary]").click();
  await cache.locator('[data-reserve-notebook] summary').filter({ hasText: "Dépôts de composants" }).click();
  check("Preserve Hunt cache fixture: the inspected physical depot and neutralized lot are recorded in the notebook", /1 lot restant.*1 neutralisé/.test(await cache.locator('[data-reserve-cache="0"][data-cache-inspected="true"]').innerText()));
  await cache.setViewportSize({ width: 390, height: 844 });
  check("Preserve Hunt cache fixture: depot notebook controls fit a 390px viewport", await noOverflow(cache));
  await capture(cache, "reserve-depot-notebook-mobile.png", cache.locator("[data-reserve-notebook]"));
  await enterReserve(cache);
  await cache.locator("[data-reserve-notebook-summary]").click();
  await cache.locator('[data-reserve-notebook] summary').filter({ hasText: "Dépôts de composants" }).click();
  check("Preserve Hunt cache fixture: normal reload restores the spent depot and denied components in the runtime notebook", (await reserveDisk(cache)).supplies[0] === 1 && (await reserveDisk(cache)).deniedSupplies[0] === 1 && /1 lot restant.*1 neutralisé/.test(await cache.locator('[data-reserve-cache="0"][data-cache-inspected="true"]').innerText()));
  await cache.context().close();

  const threatened = await newPage(false, true); await seedReserveV99(threatened, "threatened");
  await threatened.locator("canvas").focus(); await threatened.keyboard.down("KeyE"); await threatened.clock.runFor(2000); await threatened.keyboard.up("KeyE");
  const interrupted = await pauseReserveFixture(threatened);
  check("Preserve Hunt threatened fixture: a real opponent's projectile damages the exposed hunter and interrupts depot work", interrupted.player.hp < 100 && interrupted.supplies[0] === 2 && (interrupted.deniedSupplies?.[0] ?? 0) === 0 && interrupted.channel.ticks < 120);
  await threatened.locator("[data-reserve-notebook-summary]").click();
  await capture(threatened, "reserve-depot-interrupted-desktop.png", threatened.getByRole("dialog"));
  await threatened.context().close();

  const recovery = await newPage(false, true), recoveryFixture = await seedReserveV99(recovery, "recovery");
  await recovery.clock.runFor(600);
  await recovery.getByRole("button", { name: "Ouvrir le carnet de traque et suspendre la chasse", exact: true }).click();
  const recovering = await reserveDisk(recovery);
  check("Preserve Hunt recovery fixture: the surviving human walks to the downed carrier before channeling recovery", recovering.humans[1].x > recoveryFixture.survivor.x + 15 && recovering.humans[1].recovering?.bodyId === "reserve-veyra" && recovering.humans[0].carrying && !recovering.humans[1].carrying);
  await recovery.clock.resume(); pausedClocks.delete(recovery);
  await recovery.locator('[data-reserve-notebook] summary').filter({ hasText: "Contacts actuellement visibles" }).click();
  check("Preserve Hunt recovery fixture: the notebook describes the observed physical recovery attempt", await recovery.locator('[data-reserve-contact="reserve-marek"][data-contact-recovering="true"]').count() === 1);
  await capture(recovery, "reserve-carrier-recovery-observed-desktop.png", recovery.getByRole("dialog"));
  await recovery.clock.pauseAt(await recovery.evaluate(() => Date.now() + 1000)); pausedClocks.add(recovery);
  await recovery.getByRole("button", { name: "Reprendre la chasse", exact: true }).click();
  await recovery.clock.runFor(1600);
  const recovered = await pauseReserveFixture(recovery);
  check("Preserve Hunt recovery fixture: completed work transfers the same component while preserving the downed person's outcome", !recovered.humans[0].carrying && recovered.humans[1].carrying && recovered.humans[0].status === "down" && recovered.humans[0].hp === 0 && recovered.humans[0].secured && recovered.player.x === recoveryFixture.player.x && recovered.supplies[0] === 1 && recovered.ships.every(ship => ship.parts === 0));
  await recovery.locator("[data-reserve-notebook-summary]").click();
  await capture(recovery, "reserve-carrier-component-transferred-desktop.png", recovery.getByRole("dialog"));
  await enterReserve(recovery);
  await recovery.locator("[data-reserve-notebook-summary]").click();
  await recovery.locator('[data-reserve-notebook] summary').filter({ hasText: "Contacts actuellement visibles" }).click();
  check("Preserve Hunt recovery fixture: reload restores the transferred component in the visible runtime contact and keeps the carrier down", !(await reserveDisk(recovery)).humans[0].carrying && (await reserveDisk(recovery)).humans[1].carrying && (await reserveDisk(recovery)).humans[0].status === "down" && /Transporte un composant/.test(await recovery.locator('[data-reserve-contact="reserve-marek"]').innerText()) && await recovery.locator("canvas").getAttribute("data-reserve-secured") === "7");
  await recovery.context().close();
  console.log(JSON.stringify({ completedMode: "reserve", checks: checks.length }));
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
  const coldRouteMs = Date.now() - routeStarted;
  checks.push({ name: "Homeworld fixture: cold native route click to computed guide", status: "PASS", elapsedMs: coldRouteMs });
  await guide.getByRole("button", { name: "Carte", exact: true }).click();
  const workersBeforeWarm = workers.length, warmStarted = Date.now();
  await atlas.getByRole("button", { name: "Suivre ce repère à pied", exact: true }).click();
  await guide.waitFor({ state: "attached", timeout: 180000 });
  const warmRouteMs = Date.now() - warmStarted;
  checks.push({ name: "Homeworld fixture: warm native route click to computed guide reuses the idle worker", status: "PASS", elapsedMs: warmRouteMs, sameWorker: workers.length === workersBeforeWarm });
  check("Homeworld fixture: the warm route is faster than the cold calculation and preserves worker ownership", warmRouteMs < coldRouteMs && workers.length === workersBeforeWarm);
  await guide.getByRole("button", { name: "Carte", exact: true }).click();
  await atlas.getByRole("button", { name: "0 · Cité haute", exact: true }).click();
  const firstLeg = await atlas.locator("[data-homeworld-route-map-v98] polyline").first().getAttribute("points");
  assert.ok(firstLeg, "The selected map exposes the actual street leg");
  const walkingPoints = firstLeg.trim().split(/\s+/).map(pair => { const [x, y] = pair.split(",").map(Number); return { x, y }; });
  checks.push({ name: "Homeworld fixture: consolidated physical first leg", status: "PASS", points: walkingPoints.length });
  check("Homeworld fixture: choosing an upper-level landmark draws a real route", await atlas.locator("[data-homeworld-route-map-v98] polyline").count() > 0 || /raccord|escalier|ascenseur/i.test(await atlas.locator("[data-homeworld-route-planner-v98]").innerText()));
  await atlas.locator('svg[role="img"]').scrollIntoViewIfNeeded();
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
  await atlas.locator('svg[role="img"]').scrollIntoViewIfNeeded();
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
  check("Homeworld fixture: the mobile guide leaves the nearby interaction prompt accessible", !!mobileLayout.prompt && mobileLayout.prompt.width > 0 && mobileLayout.prompt.height > 0 && !mobileLayout.overlapsPrompt);
  await home.setViewportSize({ width: 1440, height: 1050 });
  await home.clock.pauseAt(await home.evaluate(() => Date.now() + 10000));
  pausedClocks.add(home);
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
  pausedClocks.delete(home);
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
  await home.context().close();
  }

  check("All selected actual journeys complete without browser exceptions", errors.length === 0);
  const sourceAfter = await sourceSnapshot();
  assert.deepEqual(sourceAfter, sourceBefore, "Runtime sources changed during this QA run; rerun against stable sources");
  const report = { status: "PASS", baseUrl, browser: browser.version(), modes: [...modes], scope: "Real local app UI checks for the selected modes. Explicitly identified seeded scenarios use public inputs and the production simulation; browser clock controls support physical channels and keyboard walking/connector checks. This is not a played campaign, public deployment, hardware gamepad or cloud-sync qualification.", checks, fixtures, captures, workers, errors, sourceBefore, sourceAfter, completedAt: new Date().toISOString() };
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
