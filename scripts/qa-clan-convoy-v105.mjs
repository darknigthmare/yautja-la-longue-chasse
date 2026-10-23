/** Real free-front controls, normal atlas, and explicit normalized fixtures.
 * No route action is driven through a private React API. Fixture-only control
 * loss/future archives are declared separately from the played journey. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? "http://127.0.0.1:3000";
const expectedBuildId = process.env.YAUTJA_QA_BUILD_ID ?? null;
const output = path.resolve(process.env.YAUTJA_CONVOY_V105_QA_OUTPUT ?? "outputs/qa-v105/clan-convoy-dev");
assert.ok(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname));
await fs.mkdir(output, { recursive: true });
const sourceFiles = ["app/game/ClanWarPanelV85.tsx", "app/game/ClanWarAtlasV95.tsx", "app/game/ClanWarAtlasV95.module.css", "app/game/ClanWarConvoyRouteV105.tsx", "app/game/ClanWarConvoyRouteV105.module.css", "app/game/systems/clanWarV85.ts", "app/game/systems/clanWarConvoyStateV105.ts", "app/game/systems/clanWarConvoyRouteV105.ts"];
const hash = raw => createHash("sha256").update(raw).digest("hex");
const snapshot = () => Promise.all(sourceFiles.map(async file => ({ file, sha256: hash(await fs.readFile(file)) })));
const before = await snapshot();
const contentVersion = (await fs.readFile("app/game/buildInfo.ts", "utf8")).match(/GAME_CONTENT_VERSION\s*=\s*["']([^"']+)/)?.[1];
const compiled = await build({ stdin: { contents: `import * as core from './app/game/systems/clanWarV85'; import * as convoy from './app/game/systems/clanWarConvoyRouteV105'; import * as gen from './app/game/systems/clanWarPlanetGeneratorV103'; window.__convoyQaV105={...core,...convoy,...gen};`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "iife", platform: "browser", target: "es2022", logLevel: "silent" });
let browser;
const contexts = [], checks = [], captures = [], fixtures = [], errors = [];
const servedBuilds = [];
let failure = null;
const check = (name, condition, detail) => { checks.push({ name, status: condition ? "PASS" : "FAIL", ...(detail ? { detail } : {}) }); console.log(`${condition ? "PASS" : "FAIL"}: ${name}`); assert.ok(condition, name); };
const key = "yautja.clan-war.v85.free.v1";
const disk = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "null"), key);
function observe(page) {
  page.on("pageerror", error => errors.push({ type: "pageerror", message: error.message, url: page.url() }));
  page.on("console", message => { if (message.type() === "error") errors.push({ type: "console.error", message: message.text(), url: page.url() }); });
}
async function readyDisk(page, condition) {
  await page.waitForFunction(({ key, condition }) => { const state = JSON.parse(localStorage.getItem(key) ?? "null"); return state && Function("state", `return (${condition})`)(state); }, { key, condition });
  await page.getByTestId("war-convoy-v105").getByRole("button", { name: /Exporter le front/ }).count();
}
async function newPage(initial = null) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce", acceptDownloads: true }); contexts.push(context);
  await context.addInitScript({ content: compiled.outputFiles[0].text });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  observe(page);
  const response = await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  if (expectedBuildId) {
    const html = await response.text();
    servedBuilds.push({ url: response.url(), status: response.status(), expectedBuildId, foundInHtml: html.includes(expectedBuildId) });
    check("Served HTML carries the expected production build ID", html.includes(expectedBuildId));
  }
  await page.locator('[data-campaign-menu="main"]').waitFor();
  assert.equal(await page.locator('[data-campaign-menu="main"]').getAttribute("data-game-content-version"), contentVersion, "served content version matches current sources");
  if (initial) await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key, raw: typeof initial === "string" ? initial : JSON.stringify(initial) });
  else {
    const fixture = await page.evaluate(key => {
      const state = window.__convoyQaV105.createWarSimulationV85(10537);
      for (const person of state.combatants) if (person.factionId !== "CON-F01") person.garrison = true;
      localStorage.setItem(key, JSON.stringify(state)); return state;
    }, key);
    fixtures.push({ type: "played-journey-start", description: "Existing V104 Korthas people/stocks only; existing opponents retain garrison positions to isolate deliveries.", initial: fixture });
  }
  await enter(page);
  return page;
}
async function enter(page) {
  await page.getByRole("button", { name: /^Guerres des clans/ }).click();
  await page.getByRole("button", { name: "Accéder malgré les spoilers", exact: true }).click();
  await page.getByTestId("war-convoy-v105").waitFor();
}
async function reload(page) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-campaign-menu="main"]').waitFor(); await enter(page);
}
async function capture(page, file, locator = page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await locator.screenshot({ path: path.join(output, file) }); captures.push(file);
}
async function resolveTurn(page) {
  const old = await disk(page);
  const expected = await page.evaluate(state => {
    const ordinary = structuredClone(state); ordinary.version = 1; delete ordinary.convoyRouteV105;
    const result = window.__convoyQaV105.advanceWarTurnV85(ordinary);
    if (!result.accepted) throw Error(result.message); return result.state;
  }, old);
  await page.getByRole("button", { name: "Fin de préparation · relire avant résolution", exact: true }).click();
  await page.getByRole("button", { name: "Confirmer et résoudre le tour", exact: true }).click();
  await readyDisk(page, `state.turn === ${old.turn + 1} && state.orders.length === 0`);
  const state = await disk(page);
  check(`Turn ${old.turn}: physical delivery matches ordinary one-leg stock accounting`, JSON.stringify(state.stocks) === JSON.stringify(expected.stocks));
  check(`Turn ${old.turn}: every real person matches the ordinary one-leg resolver`, JSON.stringify(state.combatants) === JSON.stringify(expected.combatants));
  return state;
}
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader"] });
  const page = await newPage();
  const convoy = page.getByTestId("war-convoy-v105");
  const initial = await disk(page);
  await convoy.getByTestId("war-convoy-destination-v105").selectOption("CON-T05");
  await convoy.getByRole("checkbox", { name: /^P07 ·/ }).check();
  await convoy.getByRole("checkbox", { name: /^P08 ·/ }).check();
  check("Native preparation displays the real three-edge path and minimum duration", /T02 → T03 → T04 → T05.*3 tour/.test(await convoy.getByTestId("war-convoy-path-v105").innerText()));
  await convoy.getByTestId("war-convoy-plan-v105").click();
  await readyDisk(page, "state.version === 2 && state.convoyRouteV105?.territoryIds.length === 4");
  const plan = await disk(page);
  check("Planning preserves local stores and existing roster with no queued order", JSON.stringify(plan.stocks) === JSON.stringify(initial.stocks) && JSON.stringify(plan.combatants) === JSON.stringify(initial.combatants) && plan.orders.length === 0);
  await page.getByRole("button", { name: "▱ Planisphère", exact: true }).click();
  check("Normal atlas draws three itinerary links with a distinct next step", await page.getByTestId("war-convoy-atlas-v105").locator("[data-convoy-stage]").count() === 3 && await page.getByTestId("war-convoy-atlas-v105").locator('[data-convoy-stage="next"]').count() === 1);
  check("Itinerary has a text legend, step inspection buttons and no surface replacement", await page.getByTestId("war-convoy-atlas-legend-v105").isVisible() && await convoy.getByRole("button", { name: /^Inspecter T/ }).count() === 4 && await page.getByTestId("war-planet-surface-texture").count() === 1);
  await capture(page, "convoy-planned-desktop.png", page.getByTestId("clan-war-atlas-v95"));
  await convoy.getByTestId("war-convoy-reserve-v105").click();
  await readyDisk(page, "state.orders.length === 1 && !!state.convoyRouteV105.pendingOrderId");
  const reserved = await disk(page);
  check("First leg reserves the existing logistics slot with exactly P07/P08 and M1", reserved.orders[0].kind === "logistics" && reserved.orders[0].fromId === "CON-T02" && reserved.orders[0].targetId === "CON-T03" && JSON.stringify(reserved.orders[0].combatantIds) === '["P07","P08"]' && reserved.orders[0].cargo.m === 1);
  check("A reserved itinerary cannot reserve a second edge in the same turn", await convoy.getByTestId("war-convoy-reserve-v105").isDisabled());
  await reload(page);
  check("Reload preserves the pending manifest, orders, budgets and complete itinerary", JSON.stringify(await disk(page)) === JSON.stringify(reserved));
  const delivered = await resolveTurn(page);
  check("Only the first edge is delivered, with no automatic next order", delivered.convoyRouteV105.completedOrderIds.length === 1 && delivered.orders.length === 0 && delivered.combatants.filter(person => ["P07", "P08"].includes(person.id)).every(person => person.territoryId === "CON-T03"));
  await convoy.getByTestId("war-convoy-reserve-v105").click();
  await readyDisk(page, "state.orders.length === 1");
  const exported = await disk(page);
  const archive = convoy.getByTestId("war-front-archive-v105"); await archive.locator("summary").click();
  const downloadPromise = page.waitForEvent("download"); await archive.getByRole("button", { name: "Exporter le front", exact: true }).click();
  const download = await downloadPromise, file = path.join(output, "played-front-with-reserved-second-leg.json"); await download.saveAs(file);
  check("Downloaded front contains the exact pending second leg and delivered checkpoint", JSON.stringify(JSON.parse(await fs.readFile(file, "utf8")).simulation) === JSON.stringify(exported));
  await resolveTurn(page);
  const later = await disk(page);
  await archive.getByLabel("Fichier du front libre").setInputFiles(file);
  await archive.getByRole("button", { name: "Remplacer ce front par le fichier vérifié", exact: true }).waitFor();
  check("Import preview explains the current/replacement turns and cannot mutate the live front", JSON.stringify(await disk(page)) === JSON.stringify(later) && /tour 3.*tour 2/s.test(await archive.innerText()));
  await archive.getByRole("button", { name: "Conserver le front courant", exact: true }).click();
  check("Cancelling an import preserves the current stock and position bytes", JSON.stringify(await disk(page)) === JSON.stringify(later));
  await archive.getByLabel("Fichier du front libre").setInputFiles(file);
  await archive.getByRole("button", { name: "Remplacer ce front par le fichier vérifié", exact: true }).click();
  await readyDisk(page, "state.turn === 2 && state.orders.length === 1 && state.convoyRouteV105.completedOrderIds.length === 1");
  check("Confirmed import restores the complete snapshot without adding its cargo to existing stores", JSON.stringify(await disk(page)) === JSON.stringify(exported));
  await resolveTurn(page);
  await convoy.getByTestId("war-convoy-reserve-v105").click(); await readyDisk(page, "state.orders.length === 1");
  const final = await resolveTurn(page);
  check("The full native journey delivers three actual steps and the same manifest at T05", final.convoyRouteV105.completedOrderIds.length === 3 && final.combatants.filter(person => ["P07", "P08"].includes(person.id)).every(person => person.territoryId === "CON-T05") && /Trajet livré/.test(await convoy.innerText()));
  await page.setViewportSize({ width: 390, height: 844 }); await convoy.scrollIntoViewIfNeeded();
  check("Mobile convoy/transfer controls fit the viewport with 44px action targets", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth) && await convoy.locator("button").evaluateAll(buttons => buttons.every(button => button.getBoundingClientRect().height >= 44)));
  await capture(page, "convoy-delivered-mobile.png");

  const lost = structuredClone(delivered); lost.territories["CON-T05"].controller = "CON-F02";
  fixtures.push({ type: "control-loss", description: "Existing downstream T05 controller changed to F02 after the first real delivery; no extra stock or actor.", initial: lost });
  const blockedPage = await newPage(lost), blocked = blockedPage.getByTestId("war-convoy-v105");
  await blockedPage.getByRole("button", { name: "▱ Planisphère", exact: true }).click();
  check("A declared lost-control fixture pauses at the named downstream depot", /T05.*contrôle/.test(await blocked.innerText()) && await blocked.getByTestId("war-convoy-reserve-v105").isDisabled());
  check("Atlas marks the actual lost-control link and keeps the completed link", await blockedPage.getByTestId("war-convoy-atlas-v105").locator('[data-convoy-stage="blocked"][data-target="CON-T05"]').count() === 1 && await blockedPage.getByTestId("war-convoy-atlas-v105").locator('[data-convoy-stage="delivered"]').count() === 1);
  await capture(blockedPage, "convoy-control-loss-desktop.png", blocked);
  await reload(blockedPage);
  check("Reload retains a paused itinerary without repairing its controller or inventing a reroute", JSON.stringify(await disk(blockedPage)) === JSON.stringify(lost));

  const future = JSON.stringify({ ...exported, version: 3 }, null, 2) + "\n";
  fixtures.push({ type: "future-payload", description: "Known V105 front with an unsupported payload version3; original formatted bytes must remain protected.", sha256: hash(future) });
  const futurePage = await newPage(future);
  const protectedBefore = await futurePage.evaluate(key => localStorage.getItem(key), key);
  await futurePage.getByTestId("war-front-archive-v105").locator("summary").click();
  check("Future archive visibly blocks route and front-import mutation", await futurePage.getByTestId("war-convoy-plan-v105").isDisabled() && await futurePage.getByTestId("war-front-archive-v105").getByRole("button", { name: "Choisir un front à importer", exact: true }).isDisabled());
  await futurePage.getByRole("button", { name: "Fin de préparation · relire avant résolution", exact: true }).click();
  await futurePage.getByRole("button", { name: "Confirmer et résoudre le tour", exact: true }).click();
  check("Attempting an ordinary turn cannot overwrite the unsupported archive bytes", await futurePage.evaluate(key => localStorage.getItem(key), key) === protectedBefore && protectedBefore === future);

  // Real native UI for supported minimum and maximum generated front sizes.
  for (const options of [{ territoryCount: 18, regionCount: 3 }, { territoryCount: 96, regionCount: 12 }]) {
    const code = await page.evaluate(options => window.__convoyQaV105.encodeWarPlanetV103(window.__convoyQaV105.normalizeWarPlanetRecipeV103({ seed: 105, ...options })), options);
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" }); contexts.push(context); await context.addInitScript({ content: compiled.outputFiles[0].text });
    const generatedPage = await context.newPage(); generatedPage.setDefaultTimeout(30000); observe(generatedPage); await generatedPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
    const fixture = await generatedPage.evaluate(code => { const a = window.__convoyQaV105, state = a.createWarSimulationV85(undefined, code); for (const person of state.combatants) if (person.factionId !== "CON-F01") person.garrison = true; localStorage.setItem(a.warPlanetStorageKeyV96(code), JSON.stringify(state)); localStorage.setItem("yautja.clan-war.v96.selected-planet", code); return state; }, code);
    fixtures.push({ type: `generated-${options.territoryCount}`, description: "Real generated deployment and stocks, existing opponents held in garrison for an isolated first delivery.", planetId: code });
    await enter(generatedPage);
    const widget = generatedPage.getByTestId("war-convoy-v105"), manifest = fixture.combatants.find(person => person.factionId === "CON-F01" && !person.garrison);
    await generatedPage.getByTestId("war-command-v98").getByRole("button", { name: "Tous les sites", exact: true }).click();
    await generatedPage.getByTestId("war-command-v98").getByRole("button", { name: `Commander ${manifest.territoryId.replace("CON-", "")}`, exact: true }).click();
    const target = await generatedPage.evaluate(({ fromId, state }) => Object.keys(state.territories).filter(id => state.territories[id].controller === "CON-F01" && id !== fromId).map(id => ({ id, path: window.__convoyQaV105.warConvoyPathV105(state, fromId, id) })).filter(item => item.path).sort((a, b) => b.path.length - a.path.length)[0].id, { fromId: manifest.territoryId, state: fixture });
    await widget.getByTestId("war-convoy-destination-v105").selectOption(target); await widget.getByRole("checkbox", { name: new RegExp(`^${manifest.id} ·`) }).check();
    await widget.getByTestId("war-convoy-plan-v105").click(); await widget.getByTestId("war-convoy-reserve-v105").click();
    check(`Generated ${options.territoryCount}-territory native front displays and reserves its own graph route`, await generatedPage.getByTestId("war-convoy-atlas-v105").count() === 1 && /Étape réservée/.test(await widget.innerText()));
    await capture(generatedPage, `convoy-generated-${options.territoryCount}.png`, widget);
  }
  check("No browser runtime errors were observed", errors.length === 0, errors);
  assert.deepEqual(await snapshot(), before, "Clans source changed during this QA run");
} catch (error) {
  failure = error;
  checks.push({ name: "Complete browser journey", status: "FAIL", detail: error instanceof Error ? error.message : String(error) });
} finally {
  const after = await snapshot();
  const evidence = [];
  for (const file of [...captures, "played-front-with-reserved-second-leg.json"]) {
    try { const bytes = await fs.readFile(path.join(output, file)); evidence.push({ file, sha256: hash(bytes), bytes: bytes.length }); } catch { /* A failed earlier step may not have produced this file. */ }
  }
  const report = { version: 105, contentVersion, buildId: expectedBuildId, servedBuilds, status: failure ? "FAIL" : "PASS", failure: failure instanceof Error ? { name: failure.name, message: failure.message, stack: failure.stack } : failure, mode: process.env.YAUTJA_CONVOY_V105_QA_MODE ?? "development", baseUrl, at: new Date().toISOString(), sourceBefore: before, sourceAfter: after, sourceUnchanged: JSON.stringify(before) === JSON.stringify(after), checks, captures, evidence, fixtures, errors };
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  for (const context of contexts) await context.close(); await browser?.close();
}
if (failure) throw failure;
console.log(`V105 convoy: ${checks.length} checks passed; ${output}`);
