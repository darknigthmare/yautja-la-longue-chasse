/** Local V100 functional journeys. Explicit normalized fixtures isolate a
 * wounded free-front roster and a youth checkpoint near an existing resident.
 * Every subsequent action uses the real app's public controls. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { firstTracksCompleted } from "../tests/helpers/solo-v67-campaign-route.mjs";

const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? "http://127.0.0.1:3000";
const output = path.resolve(process.env.YAUTJA_V100_QA_OUTPUT ?? "outputs/qa-v100/worlds");
const domains = new Set((process.env.YAUTJA_V100_QA_DOMAINS ?? "clans,homeworld").split(","));
assert.ok(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname), "Local QA target required");
await fs.mkdir(output, { recursive: true });
const hash = data => createHash("sha256").update(data).digest("hex");
const sources = ["app/game/buildInfo.ts", "app/game/ClanWarPanelV85.tsx", "app/game/ClanWarEvacuationV100.tsx", "app/game/ClanWarEvacuationV100.module.css", "app/game/systems/clanWarV85.ts", "app/game/systems/clanWarEvacuationV100.ts", "app/game/ClanWarCommandV98.tsx", "app/game/systems/clanWarCommandV98.ts", "app/game/HomeworldHub.tsx", "app/game/HomeworldStreetConversationV100.tsx", "app/game/HomeworldStreetConversationV100.module.css", "app/game/systems/homeworldStreetContactsV100.ts", "app/game/systems/homeworldResidentVisibilityV100.ts", "app/game/HomeworldWorldSceneV77.tsx"];
const snapshot = async () => Promise.all(sources.map(async file => ({ file, sha256: hash(await fs.readFile(file)) })));
const sourceBefore = await snapshot();
const version = (await fs.readFile("app/game/buildInfo.ts", "utf8")).match(/GAME_CONTENT_VERSION\s*=\s*["']([^"']+)/)?.[1];
const bundle = await build({ stdin: { contents: `import * as saves from './app/game/save'; import * as slots from './app/game/systems/campaignSlots'; import * as war from './app/game/systems/clanWarV85'; import * as city from './app/game/systems/homeworldCity'; import * as location from './app/game/systems/homeworldLocationV77'; window.__worldsQaV100={...saves,...slots,...war,...city,...location};`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "iife", platform: "browser", target: "es2022", logLevel: "silent" });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const contexts = [], checks = [], captures = [], fixtures = [], errors = [];
const paused = new WeakSet();
const check = (name, condition, detail) => { checks.push({ name, status: condition ? "PASS" : "FAIL", ...(detail ? { detail } : {}) }); assert.ok(condition, name); };
async function newPage(clock = false) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" });
  contexts.push(context);
  const page = await context.newPage(); page.setDefaultTimeout(25000);
  if (clock) await page.clock.install();
  page.on("pageerror", error => errors.push({ type: "pageerror", message: error.message, url: page.url() }));
  page.on("console", message => { if (message.type() === "error") errors.push({ type: "console.error", message: message.text(), url: page.url() }); });
  return page;
}
async function paint(page) {
  const frame = page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  if (paused.has(page)) await page.clock.runFor(40);
  await frame;
}
async function capture(page, file, locator = page) {
  await paint(page); await locator.screenshot({ path: path.join(output, file) });
  captures.push({ file, viewport: page.viewportSize(), at: new Date().toISOString() });
}
async function menu(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.locator('[data-campaign-menu="main"]').waitFor();
  assert.equal(await page.locator("[data-game-content-version]").first().getAttribute("data-game-content-version"), version);
}
async function enterClans(page) {
  await menu(page); await page.getByRole("button", { name: /^Guerres des clans/ }).click();
  await page.getByRole("button", { name: "Accéder malgré les spoilers", exact: true }).click();
  await page.getByTestId("war-command-v98").waitFor();
}
const warKey = "yautja.clan-war.v85.free.v1";
const warDisk = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "null"), warKey);
const actorPosition = page => page.locator("[data-homeworld-actor]").evaluate(element => ({ x: Number(element.dataset.x), y: Number(element.dataset.y), level: element.dataset.homeworldLevelV77 }));
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

async function clansJourney() {
  const page = await newPage(); await menu(page); await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const fixture = await page.evaluate(key => {
    const api = window.__worldsQaV100, state = api.createWarSimulationV85(10037);
    Object.assign(state.combatants.find(person => person.id === "P08"), { status: "wounded", garrison: false });
    for (const person of state.combatants) if (person.factionId !== "CON-F01") person.garrison = true;
    const normalized = api.readWarSimulationV85(state);
    if (!normalized) throw Error("Invalid evacuation fixture");
    localStorage.setItem(key, JSON.stringify(normalized));
    return normalized;
  }, warKey);
  fixtures.push({ domain: "clans", description: "Authored free Korthas fixture: existing P08 wounded at T02, existing opponents left in garrison to isolate evacuation. No new person or resource.", initial: fixture });
  await enterClans(page);
  const command = page.getByTestId("war-command-v98"), order = page.getByTestId("war-order-panel-v98");
  await command.getByRole("button", { name: "Tous les sites", exact: true }).click();
  await command.getByRole("button", { name: "Commander T02", exact: true }).click();
  await order.locator("[data-war-order-kind-v98]").selectOption("evacuate");
  await order.getByLabel(/Route voisine/).selectOption("CON-T01");
  const manifest = page.getByTestId("war-evacuation-v100"), reserve = order.getByRole("button", { name: "Réserver l’ordre", exact: true });
  await manifest.waitFor();
  check("Clans: the real order selector exposes a physical evacuation manifest and rejects an empty draft", await reserve.isDisabled() && /Deux escortes aptes par blessé/.test(await manifest.innerText()));
  await order.getByRole("button", { name: "Préparer une évacuation sans dégarnir", exact: true }).click();
  check("Clans: the native suggestion reserves actual mobile escorts and a patient while keeping P02 in guard", !(await order.getByRole("checkbox", { name: /^P02 ·/ }).isChecked()) && await order.getByRole("checkbox", { name: /^P08 ·/ }).isChecked() && await reserve.isEnabled());
  await order.getByRole("button", { name: "Tout effacer", exact: true }).click();
  for (const id of ["P02", "P07", "P08"]) await order.getByRole("checkbox", { name: new RegExp("^" + id + " ·") }).check();
  check("Clans: selected escort and patient identities are explicit and the local advertised cost is S1", /P02/.test(await page.getByTestId("war-evacuation-escorts-v100").innerText()) && /P07/.test(await page.getByTestId("war-evacuation-escorts-v100").innerText()) && (await page.getByTestId("war-evacuation-patients-v100").innerText()) === "P08" && /Coût local\s*:\s*S1/.test(await manifest.innerText()));
  const original = await warDisk(page);
  await reserve.click();
  const warning = page.getByTestId("war-evacuation-warning-v100"); await warning.waitFor();
  check("Clans: committing the final guard first requests confirmation without mutation", JSON.stringify(await warDisk(page)) === JSON.stringify(original));
  await capture(page, "clans-evacuation-warning-desktop.png", order);
  check("Clans: the final-guard warning receives actual keyboard focus", await warning.evaluate(element => element.contains(document.activeElement)));
  await page.setViewportSize({ width: 390, height: 844 }); await warning.scrollIntoViewIfNeeded();
  check("Clans: the evacuation warning fits mobile and its confirmation targets are at least 44px", await noOverflow(page) && await warning.getByRole("button", { name: "Confirmer l’évacuation sans garde", exact: true }).evaluate(element => element.getBoundingClientRect().height >= 44));
  await capture(page, "clans-evacuation-warning-mobile.png");
  await warning.getByRole("button", { name: "Conserver la garde", exact: true }).click();
  check("Clans: cancelling the last-guard warning preserves every stored byte", JSON.stringify(await warDisk(page)) === JSON.stringify(original));
  await paint(page);
  check("Clans: cancelling the warning returns keyboard focus to the native reserve button", await reserve.evaluate(element => document.activeElement === element));
  await page.setViewportSize({ width: 1440, height: 1050 });
  await reserve.click(); await warning.getByRole("button", { name: "Confirmer l’évacuation sans garde", exact: true }).click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? "null")?.orders.some(order => order.kind === "evacuate"), warKey);
  const queued = await warDisk(page);
  check("Clans: reservation keeps people, locations, injuries, stock and turn unchanged", queued.turn === original.turn && JSON.stringify(queued.combatants) === JSON.stringify(original.combatants) && JSON.stringify(queued.stocks) === JSON.stringify(original.stocks));
  check("Clans: the real logistics slot is occupied and all three existing people are reserved", queued.orders.length === 1 && queued.orders[0].combatantIds.join(",") === "P02,P07,P08" && await order.getByRole("checkbox", { name: /^P08 ·/ }).isDisabled());
  await enterClans(page);
  const restored = await warDisk(page);
  check("Clans: normal reload restores the exact evacuation order and real patient", JSON.stringify(restored) === JSON.stringify(queued) && restored.combatants.find(person => person.id === "P08").status === "wounded");
  await page.getByRole("button", { name: "Fin de préparation · relire avant résolution", exact: true }).click();
  await page.getByRole("button", { name: "Confirmer et résoudre le tour", exact: true }).click();
  await page.waitForFunction(({ key, turn }) => JSON.parse(localStorage.getItem(key) ?? "null")?.turn === turn + 1, { key: warKey, turn: queued.turn });
  const resolved = await warDisk(page), patient = resolved.combatants.find(person => person.id === "P08");
  check("Clans: the resolved public turn moves the same three people exactly one edge", ["P02", "P07", "P08"].every(id => resolved.combatants.find(person => person.id === id).territoryId === "CON-T01") && resolved.orders.length === 0 && resolved.turn === queued.turn + 1);
  check("Clans: evacuation never heals, trains or duplicates the wounded patient", patient.status === "wounded" && patient.trainingUntilTurn === null && resolved.combatants.length === fixture.combatants.length && new Set(resolved.combatants.map(person => person.id)).size === fixture.combatants.length);
  check("Clans: escorts leave their previous guard duty and the controlled departure stays unguarded", ["P02", "P07"].every(id => resolved.combatants.find(person => person.id === id).garrison === false) && resolved.territories["CON-T02"].controller === "CON-F01" && resolved.combatants.filter(person => person.territoryId === "CON-T02" && person.status === "fit" && person.garrison).length === 0);
  check("Clans: the stored turn contains the actual patient-and-escort report and normal resource ledger", resolved.reports.some(report => /P08 évacué\(s\), avec P02, P07 en escorte/.test(report.text)) && Object.values(resolved.stocks).every(stock => [stock.s, stock.m, stock.i].every(value => Number.isInteger(value) && value >= 0)), { before: queued.stocks, after: resolved.stocks });
  check("Clans: this isolated departure pays exactly S1 and preserves its metal and intelligence", queued.stocks["CON-T02"].s === 8 && resolved.stocks["CON-T02"].s === 7 && resolved.stocks["CON-T02"].m === queued.stocks["CON-T02"].m && resolved.stocks["CON-T02"].i === queued.stocks["CON-T02"].i);
  await page.getByRole("button", { name: "Tous les sites", exact: true }).click();
  await page.getByRole("button", { name: "Commander T01", exact: true }).click();
  await page.getByTestId("war-order-panel-v98").locator("[data-war-order-kind-v98]").selectOption("heal");
  check("Clans: the arrived patient is available only through a separate real local healing order", await page.getByTestId("war-order-panel-v98").getByRole("checkbox", { name: /^P08 ·/ }).isVisible() && (await warDisk(page)).combatants.find(person => person.id === "P08").status === "wounded");
  await capture(page, "clans-evacuated-patient-desktop.png", page.getByTestId("war-order-panel-v98"));
  await page.setViewportSize({ width: 390, height: 844 });
  check("Clans: evacuation result and local healing controls fit 390px", await noOverflow(page));
  await capture(page, "clans-evacuated-patient-mobile.png", page.getByTestId("war-order-panel-v98"));
  await enterClans(page);
  const again = await warDisk(page);
  check("Clans: reload retains the resolved arrival and unhealed state", again.turn === resolved.turn && again.combatants.find(person => person.id === "P08").territoryId === "CON-T01" && again.combatants.find(person => person.id === "P08").status === "wounded");
  const journal = page.getByRole("list", { name: "Journal stratégique", exact: true });
  const evacuationReport = again.reports.find(report => /P08 évacué\(s\), avec P02, P07 en escorte/.test(report.text)).text;
  check("Clans: the actual strategic journal shows the archived evacuation after reload", (await journal.innerText()).includes(evacuationReport));
  const planetSelector = page.getByTestId("war-planet-selector-v96").getByLabel(/^Planète active/), originalPlanet = await planetSelector.inputValue();
  const otherPlanet = await planetSelector.locator("option").evaluateAll((options, original) => options.map(option => option.value).find(value => value !== original), originalPlanet);
  assert.ok(otherPlanet, "A second real planet is required for archive isolation");
  await planetSelector.selectOption(otherPlanet);
  await page.waitForFunction(({ planet, report }) => document.querySelector('[data-testid="war-planet-selector-v96"] select')?.value === planet && !document.querySelector('ol[aria-label="Journal stratégique"]')?.textContent.includes(report), { planet: otherPlanet, report: evacuationReport });
  check("Clans: switching to another real planet keeps this evacuation out of its independent journal", !(await journal.innerText()).includes(evacuationReport) && JSON.stringify(await warDisk(page)) === JSON.stringify(again));
  await planetSelector.selectOption(originalPlanet);
  await page.waitForFunction(report => document.querySelector('ol[aria-label="Journal stratégique"]')?.textContent.includes(report), evacuationReport);
  check("Clans: returning to the original planet restores its exact archived front and wounded patient", JSON.stringify(await warDisk(page)) === JSON.stringify(again) && (await journal.innerText()).includes(evacuationReport));
  await capture(page, "clans-evacuation-archive-mobile.png", journal);
  fixtures.push({ domain: "clans", resolved: { turn: resolved.turn, combatants: resolved.combatants, stocks: resolved.stocks, reports: resolved.reports } });
  await page.context().close();
}

async function homeworldJourney() {
  const page = await newPage(true); await menu(page); await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const seeded = await page.evaluate(async fixture => {
    const api = window.__worldsQaV100, save = fixture;
    const actor = { ...api.createHomeworldActor(), x: 3520, y: 5010 };
    save.profile.hunterName = "QA V100 · habitant"; save.settings.masterVolume = 0;
    save.homeworld.visitedDistrictIds = ["port"];
    save.homeworld.locationV77 = api.createHomeworldCheckpointV77(save.createdAt, "0", actor, null, actor);
    if (!api.parseSaveImport(JSON.stringify(save)).save) throw Error("Invalid street contact fixture");
    localStorage.setItem(api.SAVE_STORAGE_KEY, JSON.stringify(save));
    const migrated = await api.migrateLegacyCampaignSlot(); if (!migrated.ok) throw Error(migrated.message);
    const checkpoint = await api.saveCampaignCheckpoint(1, { kind: "manual", index: 1, location: "homeworld", expectedRevision: api.loadCampaignSlots().slots[0].revision });
    if (!checkpoint.ok) throw Error(checkpoint.message);
    return { checkpoint: checkpoint.checkpoint, location: save.homeworld.locationV77, marks: save.profile.clanMarks, visits: save.homeworld.visitedDistrictIds };
  }, firstTracksCompleted());
  fixtures.push({ domain: "homeworld", description: "Youth profile obtained through authored cage/first-tracks model routes, then an explicit accepted checkpoint near an existing port inhabitant. Not a story played from the beginning in this browser.", ...seeded });
  await menu(page); await page.getByRole("button", { name: /^Continuer/ }).click();
  await page.locator("[data-homeworld-hub]").waitFor({ timeout: 90000 });
  await page.waitForFunction(() => document.querySelector("[data-homeworld-hub]")?.getAttribute("data-homeworld-motion-ready") === "true");
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000)); paused.add(page);
  const viewport = page.locator("[data-homeworld-viewport]"); await page.bringToFront(); await viewport.focus(); await page.clock.runFor(64);
  const initial = await actorPosition(page);
  check("Homeworld: the authored checkpoint restores the real actor on the correct floor near the resident", initial.x === 3520 && initial.y === 5010 && initial.level === "0");
  await page.keyboard.down("ArrowUp"); await page.clock.runFor(150); await page.keyboard.up("ArrowUp"); await page.clock.runFor(50);
  const approached = await actorPosition(page);
  check("Homeworld: native keyboard movement physically approaches the existing inhabitant", approached.x === initial.x && approached.y < initial.y && Math.abs(approached.y - 4970) < Math.abs(initial.y - 4970), { initial, approached });
  const prompt = page.getByRole("button", { name: /Parler · Palefrenier des montures/ }); await prompt.waitFor();
  check("Homeworld: only the physically nearby rendered inhabitant gets a local conversation prompt", await prompt.isVisible() && await page.locator('[data-homeworld-street-label-v100="urban-v84:stable-supplies"]').count() === 1);
  await capture(page, "homeworld-street-prompt-desktop.png");
  await viewport.focus(); await page.keyboard.press("KeyE"); await page.clock.runFor(50);
  const conversation = page.locator('[data-homeworld-street-conversation-v100="urban-v84:stable-supplies"]'), dialog = page.getByRole("dialog", { name: "Palefrenier des montures", exact: true });
  await conversation.waitFor();
  check("Homeworld: the actual interact key opens the local resident dialogue with focus", await dialog.isVisible() && await dialog.evaluate(element => element.contains(document.activeElement)));
  check("Homeworld: work dialogue describes that existing resident instead of granting an animal", /fournitures des montures/.test(await conversation.innerText()) && /ne remet pas une monture/.test(await conversation.innerText()));
  const stopped = await actorPosition(page); await page.keyboard.down("ArrowDown"); await page.clock.runFor(300); await page.keyboard.up("ArrowDown");
  check("Homeworld: movement inputs cannot move the actor behind the modal", JSON.stringify(await actorPosition(page)) === JSON.stringify(stopped));
  await conversation.getByRole("button", { name: "Ta prochaine halte", exact: true }).click();
  check("Homeworld: the selected routine topic presents the existing local pause or path", await conversation.getByRole("button", { name: "Ta prochaine halte", exact: true }).getAttribute("aria-pressed") === "true" && await conversation.locator('[data-homeworld-street-topic-v100="rhythm"]').count() === 1);
  await capture(page, "homeworld-street-conversation-desktop.png", dialog);
  await conversation.getByRole("button", { name: "Mes repères du quartier", exact: true }).click();
  const landmark = conversation.locator('[data-homeworld-street-landmark-v100="building:dock-control"]');
  check("Homeworld: resident advice contains only a landmark from the acknowledged port district", await landmark.isVisible() && await conversation.locator("[data-homeworld-street-landmark-v100]").count() === 1);
  await page.setViewportSize({ width: 390, height: 844 });
  check("Homeworld: dialogue topics and known landmark controls fit 390px", await noOverflow(page) && await conversation.getByRole("button", { name: "Mes repères du quartier", exact: true }).evaluate(element => element.getBoundingClientRect().height >= 44));
  await capture(page, "homeworld-street-conversation-mobile.png");
  const beforeMap = await actorPosition(page); await landmark.click(); await page.clock.runFor(50);
  const map = page.getByRole("dialog", { name: "Carte des étages de la cité", exact: true }); await map.waitFor();
  check("Homeworld: asking about a known place opens its real atlas detail and leaves the actor in place", await map.locator('[data-map-landmark-detail-v83="building:dock-control"]').count() === 1 && JSON.stringify(await actorPosition(page)) === JSON.stringify(beforeMap));
  await capture(page, "homeworld-resident-landmark-mobile.png");
  await map.getByRole("button", { name: "Fermer la carte", exact: true }).click();
  await map.waitFor({ state: "hidden" }); await page.clock.runFor(64); await page.bringToFront(); await viewport.focus(); await page.clock.runFor(64);
  // The arch blocks the southern line. Its verified open courtyard is west;
  // use public input there instead of requiring motion through the building.
  await page.keyboard.down("ArrowLeft");
  for (let step = 0; step < 50; step++) { await page.clock.runFor(32); if ((await actorPosition(page)).x < beforeMap.x - 120) break; }
  await page.keyboard.up("ArrowLeft"); await page.clock.runFor(50);
  const away = await actorPosition(page);
  check("Homeworld: public walking moves away from the resident rather than a map teleport", away.x < beforeMap.x - 96 && away.level === "0", { beforeMap, away });
  check("Homeworld: the previous contact prompt disappears outside its actual interaction radius", await page.getByRole("button", { name: /Parler · Palefrenier des montures/ }).count() === 0);
  await viewport.focus(); await page.keyboard.press("KeyE"); await page.clock.runFor(50);
  check("Homeworld: interact outside range does not reopen the old street conversation", await conversation.count() === 0);
  await page.clock.resume(); paused.delete(page);
  await page.getByRole("button", { name: "Enregistrer la position", exact: true }).click();
  await menu(page); await page.getByRole("button", { name: /^Continuer/ }).click();
  await page.locator("[data-homeworld-hub]").waitFor({ timeout: 90000 });
  const resumed = await actorPosition(page);
  check("Homeworld: explicit save and ordinary Continue retain the reached position without resuming a stale dialog", resumed.x === away.x && resumed.y === away.y && resumed.level === away.level && await conversation.count() === 0);
  await page.context().close();
}

let failure = null;
try {
  if (domains.has("clans")) await clansJourney();
  if (domains.has("homeworld")) await homeworldJourney();
  check("Both world journeys finish without browser exceptions", errors.length === 0);
} catch (error) {
  failure = error;
  if (checks.at(-1)?.status !== "FAIL") checks.push({ name: error.message, status: "FAIL" });
  for (const context of contexts) for (const page of context.pages()) await page.screenshot({ path: path.join(output, `failure-${contexts.indexOf(context)}.png`), timeout: 5000 }).catch(() => {});
} finally {
  const sourceAfter = await snapshot();
  const unchanged = JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter);
  if (!unchanged && process.env.YAUTJA_QA_REQUIRE_FROZEN !== "0") { failure ??= Error("Runtime source changed during QA"); checks.push({ name: "Runtime source unchanged during recipe", status: "FAIL" }); }
  const report = { status: failure ? "FAIL" : "PASS", baseUrl, contentVersion: version, browser: browser.version(), domains: [...domains], scope: "Actual local game UI and public controls after explicitly normalized fixtures. Homeworld movement uses a controlled browser clock; no private actor setter or campaign reward qualification.", checks, captures, fixtures, errors, sourceBefore, sourceAfter, sourceUnchanged: unchanged, completedAt: new Date().toISOString() };
  await fs.writeFile(path.join(output, "result.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  console.log(JSON.stringify({ status: report.status, checks: checks.filter(check => check.status === "PASS").length, captures: captures.length, errors: errors.length, sourceUnchanged: unchanged, output }));
}
if (failure) throw failure;
