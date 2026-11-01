import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const require = createRequire("/workspace/scratch/56a0bf56582d/yautja-apply-guides/package.json");
const { chromium } = require("playwright");
const baseUrl = "http://127.0.0.1:3101";
const reportPath = "/tmp/yautja-front-browser-followup.json";
const archiveBeforePath = "/tmp/yautja-front-browser-before-reload.json";
const archiveAfterPath = "/tmp/yautja-front-browser-after-reload.json";
const recipeSeed = "20261029";
const report = {
  startedAt: new Date().toISOString(),
  route: `${baseUrl}/planet-generator-v103`,
  browser: "Chromium /tmp/chromium; isolated fresh Playwright context",
  application: "local Next 16.3.5 development server, real React and game modules",
  stateSetup: "No injected simulation, graph, save, catalogue, or localStorage values. All state changes use visible UI controls.",
  checks: [], stages: [], runtimeErrors: [], consoleErrors: [], failedResources: [],
  limits: ["Limited procedural-front persistence journey; not full campaign completion.", "No production build validation in this run.", "Original runtime textures present; full PNG asset collection is absent. No artistic or full-asset claim.", "Storage inspection is read-only evidence; generated worlds and orders are created through real UI actions."],
};
const sha = raw => createHash("sha256").update(raw).digest("hex");
const stage = message => { const item = { at: new Date().toISOString(), message }; report.stages.push(item); console.log(message); };
const check = (name, condition, detail) => { assert.ok(condition, name); report.checks.push({ name, passed: true, ...(detail === undefined ? {} : { detail }) }); };
const generator = page => page.getByTestId("planet-generator-v103").filter({ visible: true });
const panel = page => page.locator('[data-clan-war-v85="free-profile"]');
const selector = page => panel(page).getByTestId("war-planet-selector-v96");
const keyFor = id => `yautja.clan-war.v96.planet.${id}.free.v1`;
const rawArchive = (page, id) => page.evaluate(key => localStorage.getItem(key), keyFor(id));

async function readyGenerator(page) {
  await generator(page).waitFor();
  await page.waitForFunction(() => {
    const root = [...document.querySelectorAll('[data-testid="planet-generator-v103"]')].find(item => !item.closest("[hidden]"));
    const quicklook = root?.querySelector('[data-testid="planet-generator-quicklook-v103"]');
    const canvas = quicklook?.querySelector("canvas");
    if (!quicklook || !canvas) return false;
    quicklook.scrollIntoView({ block: "center", behavior: "instant" });
    return ["ready", "fallback"].includes(canvas.getAttribute("data-render-status"));
  }, undefined, { timeout: 90000 });
}

async function resolveTurn(page, id, turn) {
  await panel(page).getByRole("button", { name: "Fin de préparation · relire avant résolution", exact: true }).click();
  await panel(page).getByRole("button", { name: "Confirmer et résoudre le tour", exact: true }).click();
  await page.waitForFunction(({ key, turn }) => JSON.parse(localStorage.getItem(key) ?? "null")?.turn === turn, { key: keyFor(id), turn });
  await selector(page).getByText("Archive locale confirmée", { exact: true }).waitFor();
  const label = (await selector(page).innerText()).replace(/\s+/g, " ");
  check(`Turn ${turn} is displayed and its local archive is confirmed`, new RegExp(`Tour ${String(turn).padStart(2, "0")}`).test(label));
}

let browser, page;
try {
  browser = await chromium.launch({ executablePath: "/tmp/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"] });
  report.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, reducedMotion: "reduce" });
  page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", error => report.runtimeErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") report.consoleErrors.push(message.text()); });
  page.on("response", response => { if (response.status() >= 400) report.failedResources.push({ url: response.url(), status: response.status() }); });

  stage("Open the real generator in a fresh browser context");
  const response = await page.goto(report.route, { waitUntil: "domcontentloaded", timeout: 90000 });
  check("The dedicated generator route responds successfully", response?.status() === 200);
  await readyGenerator(page);
  report.initialStorageKeys = await page.evaluate(() => Object.keys(localStorage));
  check("The context starts with no existing generated front", !report.initialStorageKeys.some(key => key.startsWith("yautja.clan-war.v96.planet.")));

  stage("Create a fixed-seed world through the 3-region, 18-territory editor controls");
  await generator(page).getByRole("combobox", { name: "Nombre de régions", exact: true }).selectOption("3");
  await generator(page).getByRole("combobox", { name: "Nombre de territoires", exact: true }).selectOption("18");
  await generator(page).getByRole("textbox", { name: "Graine du monde", exact: true }).fill(recipeSeed);
  await generator(page).getByRole("button", { name: "Générer l’aperçu", exact: true }).press("Enter");
  await page.waitForFunction(() => document.querySelector('[data-testid="planet-generator-v103"]')?.getAttribute("data-draft-modified") === "false");
  const worldCode = await generator(page).getAttribute("data-preview-planet-code");
  report.world = { code: worldCode, recipeSeed: Number(recipeSeed), recipeVersion: 103, territories: 18, regions: 3 };
  check("The visible editor keeps the requested numeric recipe seed", await generator(page).getByRole("textbox", { name: "Graine du monde", exact: true }).inputValue() === recipeSeed);
  check("The generated preview has three regional dossiers", await generator(page).locator("article[data-region-id]").count() === 3);
  check("The generated code uses the V103 recipe", worldCode?.startsWith("proc-v103-"));
  await generator(page).getByRole("button", { name: "Mémoriser ce monde", exact: true }).click();
  await page.waitForFunction(id => JSON.parse(localStorage.getItem("yautja.clan-war.v103.generated-catalog") ?? "null")?.ids?.includes(id), worldCode);
  check("Remembering the world stores its exact code in the real catalogue", true);
  await generator(page).getByRole("button", { name: "Ouvrir ce front", exact: true }).click();
  await selector(page).waitFor();
  check("The opened strategic front owns the generated world code", await selector(page).getAttribute("data-active-planet") === worldCode);

  stage("Resolve the real front to turn 2, then reserve a mobile combatant's reconnaissance order");
  await resolveTurn(page, worldCode, 2);
  const turn2 = JSON.parse(await rawArchive(page, worldCode));
  check("The saved turn-2 front contains exactly 18 territory states", turn2.turn === 2 && Object.keys(turn2.territories).length === 18 && turn2.planetId === worldCode);
  const actor = turn2.combatants.find(item => item.factionId === "CON-F01" && !item.garrison && item.status === "fit" && item.trainingUntilTurn === null && turn2.territories[item.territoryId].controller === "CON-F01" && turn2.stocks[item.territoryId].s >= 1 && turn2.stocks[item.territoryId].i >= 1);
  assert.ok(actor, "a real eligible mobile actor exists in the UI-generated deployment");
  report.mobileActor = { id: actor.id, territoryId: actor.territoryId, factionId: actor.factionId, status: actor.status, garrison: actor.garrison, trainingUntilTurn: actor.trainingUntilTurn };
  const atlas = panel(page).getByTestId("clan-war-atlas-v95");
  await atlas.getByRole("button", { name: "▱ Planisphère", exact: true }).press("Enter");
  await atlas.locator(`svg g[data-territory-id="${actor.territoryId}"]`).press("Enter");
  const command = panel(page).getByRole("complementary", { name: "Commandement du territoire", exact: true });
  await command.getByRole("combobox", { name: "Ordre", exact: true }).selectOption("recon");
  await command.getByRole("checkbox", { name: new RegExp(`^${actor.id} ·`) }).check();
  await command.getByRole("button", { name: "Réserver l’ordre", exact: true }).click();
  await page.waitForFunction(({ key, actorId }) => JSON.parse(localStorage.getItem(key) ?? "null")?.orders.some(order => order.kind === "recon" && order.combatantIds.includes(actorId)), { key: keyFor(worldCode), actorId: actor.id });
  const reserved = JSON.parse(await rawArchive(page, worldCode));
  report.reservedRecon = reserved.orders.find(order => order.kind === "recon" && order.combatantIds.includes(actor.id));
  check("The reconnaissance order was reserved through the real command panel", report.reservedRecon?.fromId === actor.territoryId);

  stage("Resolve reconnaissance to turn 3 and record the exact archived bytes");
  await resolveTurn(page, worldCode, 3);
  const beforeRaw = await rawArchive(page, worldCode);
  const before = JSON.parse(beforeRaw);
  check("Reconnaissance produced an observation on the ordered neighbor", before.observations.some(item => item.territoryId === report.reservedRecon.targetId));
  check("The resolved order is no longer pending", before.orders.length === 0);
  await fs.writeFile(archiveBeforePath, beforeRaw);
  report.beforeReload = { code: before.planetId, archiveSeed: before.seed, turn: before.turn, territories: Object.keys(before.territories).length, observations: before.observations.length, bytes: Buffer.byteLength(beforeRaw), sha256: sha(beforeRaw), archivePath: archiveBeforePath, selectorText: (await selector(page).innerText()).replace(/\s+/g, " ") };

  stage("Reload, import the same code through UI, and reopen its existing front");
  await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
  await readyGenerator(page);
  check("Reload itself preserves the archived bytes", await rawArchive(page, worldCode) === beforeRaw);
  await generator(page).getByRole("textbox", { name: "Importer un code de monde", exact: true }).fill(worldCode);
  await generator(page).getByRole("button", { name: "Retrouver le monde", exact: true }).press("Enter");
  await page.waitForFunction(id => document.querySelector('[data-testid="planet-generator-v103"]')?.getAttribute("data-preview-planet-code") === id, worldCode);
  check("The shared code reconstructs the same recipe seed after reload", await generator(page).getByRole("textbox", { name: "Graine du monde", exact: true }).inputValue() === recipeSeed);
  await generator(page).getByRole("button", { name: "Ouvrir ce front", exact: true }).click();
  await selector(page).waitFor();
  await page.waitForFunction(({ id, key, raw }) => {
    const panel = document.querySelector('[data-clan-war-v85="free-profile"]');
    const selector = panel?.querySelector('[data-testid="war-planet-selector-v96"]');
    const atlas = panel?.querySelector('[data-testid="clan-war-atlas-v95"]');
    return selector?.getAttribute("data-active-planet") === id && atlas?.getAttribute("data-planet-id") === id && localStorage.getItem(key) === raw && /Tour 03/.test(selector.textContent.replace(/\s+/g, " ")) && selector.textContent.includes("Archive locale confirmée");
  }, { id: worldCode, key: keyFor(worldCode), raw: beforeRaw });
  const afterRaw = await rawArchive(page, worldCode);
  const after = JSON.parse(afterRaw);
  await fs.writeFile(archiveAfterPath, afterRaw);
  report.afterReload = { code: after.planetId, archiveSeed: after.seed, turn: after.turn, territories: Object.keys(after.territories).length, observations: after.observations.length, bytes: Buffer.byteLength(afterRaw), sha256: sha(afterRaw), archivePath: archiveAfterPath, selectorText: (await selector(page).innerText()).replace(/\s+/g, " "), liveAtlasCode: await panel(page).getByTestId("clan-war-atlas-v95").getAttribute("data-planet-id") };
  check("Reopening retains the complete save byte for byte", afterRaw === beforeRaw, { sha256: sha(afterRaw), bytes: Buffer.byteLength(afterRaw) });
  check("The visible restored front and its live atlas own the exact world and turn 3", report.afterReload.liveAtlasCode === worldCode && /Tour 03/.test(report.afterReload.selectorText));
  check("The restored world retains its simulation seed and actual reconnaissance observations", after.seed === before.seed && after.observations.length === before.observations.length && after.turn === 3);
  check("No JavaScript page error occurred during this real UI journey", report.runtimeErrors.length === 0, report.runtimeErrors);
  report.passed = true;
  stage("PASS: real reconnaissance front reopened at turn 3 with identical archive bytes");
} catch (error) {
  report.passed = false;
  report.failure = { name: error.name, message: error.message, stack: error.stack };
  if (page) {
    try { report.failurePage = { url: page.url(), text: (await page.locator("body").innerText({ timeout: 5000 })).slice(-18000) }; } catch {}
  }
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  report.completedAt = new Date().toISOString();
  report.consoleErrorCount = report.consoleErrors.length;
  report.failedResourceCount = report.failedResources.length;
  report.consoleErrors = [...new Set(report.consoleErrors)];
  report.failedResources = [...new Map(report.failedResources.map(item => [`${item.status}:${item.url}`, item])).values()];
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser?.close();
  console.log(JSON.stringify({ report: reportPath, passed: report.passed, checks: report.checks.length, failure: report.failure?.message, runtimeErrors: report.runtimeErrors.length, consoleErrors: report.consoleErrorCount, failedResources: report.failedResourceCount }));
}
