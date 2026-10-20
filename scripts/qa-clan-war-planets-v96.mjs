import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { chromium } from "playwright-core";

// Exercise the actual menu, controls, geometry, all planetary route graphs and
// independent archives. The main journey never injects gameplay state. A final
// hydration regression separately uses a coherent, validated lost-origin fixture.
const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? "http://127.0.0.1:3000";
const output = path.resolve(process.env.YAUTJA_PLANETS_QA_OUTPUT ?? "outputs/qa-clan-war-planets-v96");
const selectionKey = "yautja.clan-war.v96.selected-planet";
const bundled = await build({
  stdin: { contents: "export * from './app/game/systems/clanWarPlanetsV96'; export {warAtlasMapPathV95} from './app/game/systems/clanWarAtlasV95'; export {createWarSimulationV85,queueWarOrderV85,advanceWarTurnV85,readWarSimulationV85,warPlanetStorageKeyV96} from './app/game/systems/clanWarV85';", resolveDir: process.cwd() },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const planets = api.WAR_PLANETS_V96;
const planet = id => planets.find(item => item.id === id);
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" });
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [], checks = [], worlds = [], extraContexts = [];
const trackErrors = target => target.on("pageerror", error => errors.push(error.message));
trackErrors(page);
const check = (name, condition) => { assert(condition, name); checks.push(name); };
const atlas = target => target.getByTestId("clan-war-atlas-v95");
const selector = target => target.getByTestId("war-planet-selector-v96");
const command = target => target.getByRole("complementary", { name: "Commandement du territoire", exact: true });
const sourceZone = target => atlas(target).locator('svg g[role="button"][data-source="true"]');
const readState = (target, id) => target.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "null"), api.warPlanetStorageKeyV96(id));
const rawState = (target, id) => target.evaluate(key => localStorage.getItem(key), api.warPlanetStorageKeyV96(id));
async function enter(target) {
  await target.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await target.getByRole("button", { name: /^Guerres des clans/ }).click();
  await target.getByRole("button", { name: "Accéder malgré les spoilers", exact: true }).click();
  await atlas(target).waitFor();
}
async function chooseWorld(target, id) {
  await selector(target).getByRole("combobox", { name: "Planète active", exact: true }).selectOption(id);
  await target.waitForFunction(value => document.querySelector('[data-testid="clan-war-atlas-v95"]')?.getAttribute("data-planet-id") === value, id);
  await command(target).waitFor();
}
async function map(target) {
  await atlas(target).getByRole("button", { name: "▱ Planisphère", exact: true }).click();
}
async function selectOrigin(target, id) {
  await atlas(target).locator(`svg g[data-territory-id="${id}"]`).press("Enter");
  await target.waitForFunction(value => document.querySelector('svg g[data-territory-id="' + value + '"]')?.getAttribute("data-source") === "true", id);
}
async function activeRouteIsValid(target, definition) {
  const route = command(target).getByRole("combobox", { name: /^Route voisine/ });
  const options = await route.locator("option").evaluateAll(items => items.map(item => item.value));
  assert.deepEqual(options.slice().sort(), definition.neighbors.slice().sort());
  assert.ok(options.includes(await route.inputValue()));
  return route;
}
async function resolveTurn(target, id, turn) {
  await target.getByRole("button", { name: "Fin de préparation · relire avant résolution", exact: true }).click();
  await target.getByRole("button", { name: "Confirmer et résoudre le tour", exact: true }).click();
  await target.waitForFunction(({ key, turn }) => JSON.parse(localStorage.getItem(key) ?? "null")?.turn === turn, { key: api.warPlanetStorageKeyV96(id), turn });
  await selector(target).getByText("Archive locale confirmée", { exact: true }).waitFor();
}
async function openCatalogue(target) {
  const button = selector(target).getByRole("button", { name: "Explorer les 30 planètes", exact: true });
  if (await button.count()) await button.click();
}
function lostOriginArchive() {
  // A separate controlled hydration fixture: preserve the real initial actors,
  // move the former defenders to a friendly base and place an existing enemy
  // mobile as the occupation guard. It tests recovery after a lost origin,
  // independently from the main journey's normally played archives above.
  const world = planet("vitriol");
  const state = api.createWarSimulationV85(undefined, world.id);
  const refuge = world.definitions.find(item => item.id !== "CON-T02" && state.territories[item.id].controller === "CON-F01");
  for (const actor of state.combatants.filter(item => item.factionId === "CON-F01" && item.territoryId === "CON-T02")) {
    actor.territoryId = refuge.id;
    actor.garrison = false;
  }
  const occupant = state.combatants.find(item => item.factionId === "CON-F02" && !item.garrison && item.status === "fit");
  assert.ok(occupant);
  occupant.territoryId = "CON-T02"; occupant.garrison = true;
  state.territories["CON-T02"].controller = "CON-F02";
  state.turn = 2; state.revision = 1;
  assert.ok(api.readWarSimulationV85(state), "the controlled lost-origin fixture is accepted by the real archive reader");
  return { world, state };
}

try {
  await enter(page);
  check("the normal menu opens the original Korthas globe", await atlas(page).getAttribute("data-planet-id") === "korthas");
  const allOptions = await selector(page).getByRole("combobox", { name: "Planète active", exact: true }).locator("option").allTextContents();
  check("the active selector lists all 30 planets with descriptive biomes", allOptions.length === 30 && allOptions.some(text => /jungle/i.test(text)) && allOptions.some(text => /toundra/i.test(text)));
  await openCatalogue(page);
  const cards = selector(page).locator("button[data-planet-card]");
  check("the expanded catalogue exposes 30 keyboard operable world cards", await cards.count() === 30);
  await selector(page).getByRole("combobox", { name: "Type de monde", exact: true }).selectOption("classic");
  check("the classic filter exposes sixteen natural worlds", await cards.count() === 16);
  await selector(page).getByRole("searchbox", { name: "Rechercher une planète", exact: true }).fill("toundra");
  check("search finds a natural tundra world by its biome", await cards.count() > 0 && await cards.filter({ hasText: "Cryovant" }).count() === 1);
  await selector(page).getByRole("searchbox", { name: "Rechercher une planète", exact: true }).fill("");
  await selector(page).getByRole("combobox", { name: "Type de monde", exact: true }).selectOption("exotic");
  check("the exotic filter exposes fourteen alien worlds", await cards.count() === 14);
  await selector(page).getByRole("combobox", { name: "Milieu de surface", exact: true }).selectOption("acid");
  check("surface filtering retains only alien acid worlds", await cards.count() === planets.filter(item => item.style === "exotic" && item.surface.kind === "acid").length);
  await selector(page).getByRole("combobox", { name: "Type de monde", exact: true }).selectOption("");
  await selector(page).getByRole("combobox", { name: "Milieu de surface", exact: true }).selectOption("");
  await selector(page).screenshot({ path: path.join(output, "desktop-catalogue-30.png") });
  await selector(page).getByRole("button", { name: "Ouvrir Thalassa", exact: true }).press("Enter");
  await page.waitForFunction(() => document.querySelector('[data-testid="clan-war-atlas-v95"]')?.getAttribute("data-planet-id") === "thalassa");
  check("opening a card selects its actual planet and returns focus to the active selector", await selector(page).getByRole("combobox", { name: "Planète active", exact: true }).evaluate(element => document.activeElement === element));

  const geometry = new Set(), representative = new Set(["korthas", "thalassa", "vitriol", "nivalis", "serak", "uranth", "amethys", "cryovant"]);
  for (const world of planets) {
    await chooseWorld(page, world.id);
    if (representative.has(world.id)) await atlas(page).screenshot({ path: path.join(output, `desktop-${world.id}-globe.png`) });
    await map(page);
    const zones = atlas(page).locator('svg g[role="button"][data-territory-id]');
    const drawn = await zones.evaluateAll(items => items.map(item => ({ id: item.getAttribute("data-territory-id"), landmassId: item.getAttribute("data-landmass-id"), name: item.getAttribute("aria-label"), d: item.querySelector("path")?.getAttribute("d") })));
    assert.equal(drawn.length, 36, `${world.id}: complete map`);
    for (const cell of world.territories) {
      assert.equal(drawn.find(item => item.id === cell.id)?.d, api.warAtlasMapPathV95(cell.points, 960, 480), `${world.id}: actual surface ${cell.id}`);
      assert.equal(drawn.find(item => item.id === cell.id)?.landmassId, cell.landmassId, `${world.id}: actual continent ${cell.id}`);
    }
    assert.equal(Number(await atlas(page).getAttribute("data-landmass-count")), world.landmasses.length);
    const coastlines = atlas(page).getByTestId("war-planet-coastlines");
    assert.equal(await coastlines.getAttribute("pointer-events"), "none");
    const drawnCoasts = await coastlines.locator("path").evaluateAll(items => items.map(item => ({ id: item.getAttribute("data-landmass-id"), d: item.getAttribute("d") })));
    assert.equal(drawnCoasts.length, world.landmasses.length);
    for (const mass of world.landmasses) assert.equal(drawnCoasts.find(item => item.id === mass.id)?.d, api.warAtlasMapPathV95(mass.points, 960, 480), `${world.id}: complete physical coastline ${mass.id}`);
    for (const definition of world.definitions) assert.ok(drawn.find(item => item.id === definition.id)?.name.includes(definition.name), `${world.id}: own names ${definition.id}`);
    geometry.add(digest(drawn.map(item => item.d)));
    assert.equal(await atlas(page).getAttribute("data-surface-kind"), world.surface.kind);
    assert.equal(await atlas(page).getByTestId("war-planet-land-texture").getAttribute("data-land-biome"), world.landBiome);
    assert.equal(await atlas(page).locator('radialGradient[id$="-ocean"] stop').first().getAttribute("stop-color"), world.surface.base);
    const surface = atlas(page).getByTestId("war-planet-surface-texture");
    assert.match(await surface.getAttribute("clip-path"), /-surface-clip\)$/);
    assert.equal(await surface.getAttribute("aria-hidden"), "true");
    let edges = 0;
    for (const definition of world.definitions) {
      await selectOrigin(page, definition.id);
      const neighbors = await atlas(page).locator('svg g[data-neighbor="true"]').evaluateAll(items => items.map(item => item.getAttribute("data-territory-id")).sort());
      assert.deepEqual(neighbors, definition.neighbors.slice().sort(), `${world.id}: complete route graph at ${definition.id}`);
      const routes = await atlas(page).getByTestId("war-planet-neighbor-routes").locator("path").evaluateAll(items => items.map(item => ({ from: item.getAttribute("data-from"), to: item.getAttribute("data-target"), d: item.getAttribute("d") })));
      assert.deepEqual(routes.map(item => item.to).sort(), definition.neighbors.slice().sort());
      assert.ok(routes.every(item => item.from === definition.id && item.d && !/NaN|Infinity/.test(item.d)));
      edges += routes.length;
    }
    await selectOrigin(page, "CON-T02");
    await activeRouteIsValid(page, world.definitions.find(item => item.id === "CON-T02"));
    worlds.push({ id: world.id, style: world.style, surface: world.surface.kind, landBiome: world.landBiome, continents: world.landmasses.length, territories: drawn.length, routeOrigins: 36, directedEdges: edges, geometry: digest(drawn.map(item => item.d)) });
    check(`${world.name}: physical coasts, all 36 territories, terrain, palette and every keyboard selected route origin match its own theatre`, true);
    if (worlds.length % 10 === 0) console.log(JSON.stringify({ verifiedPlanets: worlds.length, routeOrigins: worlds.length * 36 }));
  }
  check("all thirty actual maps have different rendered geometry", geometry.size === 30);
  await chooseWorld(page, "thalassa");
  const thalassa = planet("thalassa");
  const origin = thalassa.definitions.find(item => item.id === "CON-T02");
  const route = await activeRouteIsValid(page, origin);
  const destination = origin.neighbors.find(id => thalassa.definitions.find(item => item.id === id).initialController !== "CON-F01") ?? origin.neighbors[0];
  await route.selectOption(destination);
  await command(page).getByRole("combobox", { name: /^Ordre/ }).selectOption("recon");
  await command(page).getByRole("checkbox", { name: /^P08 ·/ }).check();
  await command(page).getByRole("button", { name: "Réserver l’ordre", exact: true }).click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? "null")?.orders.length === 1, api.warPlanetStorageKeyV96("thalassa"));
  check("a real reconnaissance reservation uses a route of Thalassa", (await readState(page, "thalassa")).orders[0].targetId === destination);
  await resolveTurn(page, "thalassa", 2);
  const thalassaRaw = await rawState(page, "thalassa");
  check("Thalassa writes its played turn and dated reconnaissance to its own archive", JSON.parse(thalassaRaw).observations.some(item => item.territoryId === destination && item.turn === 1));
  await chooseWorld(page, "korthas");
  check("Korthas retains its initial turn after Thalassa advances", /Tour 01/.test((await selector(page).innerText()).replace(/\s+/g, " ")));
  await resolveTurn(page, "korthas", 2);
  await resolveTurn(page, "korthas", 3);
  check("advancing Korthas never changes the saved Thalassa bytes", await rawState(page, "thalassa") === thalassaRaw && (await readState(page, "korthas")).turn === 3);
  await chooseWorld(page, "vitriol");
  await enter(page);
  check("reloading the normal menu restores the chosen alien planet", await atlas(page).getAttribute("data-planet-id") === "vitriol");
  const vitriolOrigin = await sourceZone(page).getAttribute("data-territory-id");
  const vitriolRoute = await activeRouteIsValid(page, planet("vitriol").definitions.find(item => item.id === vitriolOrigin));
  check("Vitriol reload chooses a real neighbour rather than forcing the legacy T08 target", await vitriolRoute.inputValue() !== "CON-T08" || planet("vitriol").definitions.find(item => item.id === vitriolOrigin).neighbors.includes("CON-T08"));
  await chooseWorld(page, "thalassa");
  check("returning to Thalassa restores its independent played turn", /Tour 02/.test((await selector(page).innerText()).replace(/\s+/g, " ")) && await rawState(page, "thalassa") === thalassaRaw);
  await map(page);
  const enemy = thalassa.definitions.find(item => JSON.parse(thalassaRaw).territories[item.id].controller !== "CON-F01");
  await selectOrigin(page, enemy.id);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Nouvel exercice", exact: true }).click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? "null")?.turn === 1, api.warPlanetStorageKeyV96("thalassa"));
  const resetOrigin = await sourceZone(page).getAttribute("data-territory-id");
  check("reset after inspecting an enemy chooses a controlled origin and keeps other planets", (await readState(page, "thalassa")).territories[resetOrigin].controller === "CON-F01" && (await readState(page, "korthas")).turn === 3);
  await activeRouteIsValid(page, thalassa.definitions.find(item => item.id === resetOrigin));

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" }); extraContexts.push(mobile);
  const mobilePage = await mobile.newPage(); mobilePage.setDefaultTimeout(20000); trackErrors(mobilePage);
  await enter(mobilePage);
  await selector(mobilePage).getByRole("button", { name: "Planète suivante", exact: true }).press("Enter");
  await mobilePage.waitForFunction(() => document.querySelector('[data-testid="clan-war-atlas-v95"]')?.getAttribute("data-planet-id") === "thalassa");
  check("keyboard navigation to a new mobile planet restores focus to its active selector", await selector(mobilePage).getByRole("combobox", { name: "Planète active", exact: true }).evaluate(element => document.activeElement === element));
  await map(mobilePage);
  await selectOrigin(mobilePage, "CON-T02");
  await activeRouteIsValid(mobilePage, thalassa.definitions.find(item => item.id === "CON-T02"));
  check("mobile keyboard map selection exposes all 36 zones without page overflow", await atlas(mobilePage).locator('svg g[role="button"][tabindex="0"]').count() === 36 && await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await atlas(mobilePage).screenshot({ path: path.join(output, "mobile-thalassa-map.png") });
  await chooseWorld(mobilePage, "cryovant");
  await atlas(mobilePage).screenshot({ path: path.join(output, "mobile-cryovant-globe.png") });
  await openCatalogue(mobilePage);
  check("the thirty card mobile catalogue fits and uses readable 16px form text", await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth) && await selector(mobilePage).getByRole("searchbox", { name: "Rechercher une planète", exact: true }).evaluate(element => parseFloat(getComputedStyle(element).fontSize) >= 16));
  await selector(mobilePage).screenshot({ path: path.join(output, "mobile-catalogue.png") });

  const hydration = lostOriginArchive();
  const recovery = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" }); extraContexts.push(recovery);
  await recovery.addInitScript(({ key, value, selectionKey, id }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); localStorage.setItem(selectionKey, id); }, { key: api.warPlanetStorageKeyV96(hydration.world.id), value: JSON.stringify(hydration.state), selectionKey, id: hydration.world.id });
  const recoveryPage = await recovery.newPage(); recoveryPage.setDefaultTimeout(20000); trackErrors(recoveryPage);
  await enter(recoveryPage);
  const hydratedOrigin = await sourceZone(recoveryPage).getAttribute("data-territory-id");
  check("hydrating a coherent archive with T02 lost selects another surviving controlled origin", hydratedOrigin !== "CON-T02" && hydration.state.territories[hydratedOrigin].controller === "CON-F01");
  await activeRouteIsValid(recoveryPage, hydration.world.definitions.find(item => item.id === hydratedOrigin));

  // A second fresh context proves the complete new-world conquest loop through
  // real UI orders: move eight existing people with supplies, attack from the
  // connected base, occupy, change the map color and restore that conquest.
  const conquestWorld = planets.find(item => item.id !== "korthas"
    && item.definitions.find(territory => territory.id === "CON-T02").neighbors.includes("CON-T01")
    && item.definitions.find(territory => territory.id === "CON-T01").neighbors.some(id => item.definitions.find(territory => territory.id === id).initialController === "CON-F02"));
  assert.ok(conquestWorld, "a new theatre supports the convoy and connected assault route");
  const conquestInitial = api.createWarSimulationV85(undefined, conquestWorld.id);
  const conquestTarget = conquestWorld.definitions.find(item => item.id === "CON-T01").neighbors.find(id => conquestInitial.territories[id].controller === "CON-F02");
  const convoyPeople = conquestInitial.combatants.filter(actor => actor.factionId === "CON-F01" && actor.territoryId === "CON-T02" && !actor.garrison).slice(0, 8).map(actor => actor.id);
  const conquestContext = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" }); extraContexts.push(conquestContext);
  const conquestPage = await conquestContext.newPage(); conquestPage.setDefaultTimeout(20000); trackErrors(conquestPage);
  await enter(conquestPage);
  await chooseWorld(conquestPage, conquestWorld.id);
  await map(conquestPage);
  await selectOrigin(conquestPage, "CON-T02");
  const convoyRoute = await activeRouteIsValid(conquestPage, conquestWorld.definitions.find(item => item.id === "CON-T02"));
  await convoyRoute.selectOption("CON-T01");
  await command(conquestPage).getByRole("combobox", { name: /^Ordre/ }).selectOption("logistics");
  for (const id of convoyPeople) await command(conquestPage).getByRole("checkbox", { name: new RegExp(`^${id} ·`) }).check();
  await command(conquestPage).getByRole("spinbutton", { name: "Lots S", exact: true }).fill("8");
  await command(conquestPage).getByRole("spinbutton", { name: "Lots M", exact: true }).fill("3");
  await command(conquestPage).getByRole("button", { name: "Réserver l’ordre", exact: true }).click();
  await conquestPage.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? "null")?.orders.length === 1, api.warPlanetStorageKeyV96(conquestWorld.id));
  const convoyReservation = (await readState(conquestPage, conquestWorld.id)).orders[0];
  check("a new planet reserves a real convoy with eight existing people and local supplies", convoyReservation.kind === "logistics" && convoyReservation.fromId === "CON-T02" && convoyReservation.targetId === "CON-T01" && convoyReservation.combatantIds.length === 8 && convoyReservation.cargo.s === 8 && convoyReservation.cargo.m === 3);
  await resolveTurn(conquestPage, conquestWorld.id, 2);
  const delivered = await readState(conquestPage, conquestWorld.id);
  check("the confirmed convoy actually delivers its people to the connected assault base", convoyPeople.every(id => delivered.combatants.find(actor => actor.id === id)?.territoryId === "CON-T01"));
  await selectOrigin(conquestPage, "CON-T01");
  await atlas(conquestPage).getByRole("button", { name: "2 · Cible voisine", exact: true }).click();
  const targetCell = () => atlas(conquestPage).locator(`svg g[data-territory-id="${conquestTarget}"]`);
  check("the target initially displays the defending faction color", await targetCell().locator("path").first().getAttribute("fill") === "#f1816b");
  await targetCell().press("Enter");
  await command(conquestPage).getByRole("combobox", { name: /^Ordre/ }).selectOption("attack");
  for (const id of convoyPeople) await command(conquestPage).getByRole("checkbox", { name: new RegExp(`^${id} ·`) }).check();
  await command(conquestPage).getByRole("button", { name: "Réserver l’ordre", exact: true }).click();
  await conquestPage.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? "null")?.orders.length === 1, api.warPlanetStorageKeyV96(conquestWorld.id));
  check("an assault reservation alone never grants a conquest", (await readState(conquestPage, conquestWorld.id)).territories[conquestTarget].controller === "CON-F02");
  await resolveTurn(conquestPage, conquestWorld.id, 3);
  const conquered = await readState(conquestPage, conquestWorld.id);
  check("the played new-planet assault captures its real target with a living occupation guard", conquered.territories[conquestTarget].controller === "CON-F01" && conquered.combatants.some(actor => actor.territoryId === conquestTarget && actor.factionId === "CON-F01" && actor.status === "fit" && actor.garrison));
  check("a confirmed conquest changes the Risk territory to the player color", await targetCell().locator("path").first().getAttribute("fill") === "#63dcc5");
  await atlas(conquestPage).screenshot({ path: path.join(output, `desktop-${conquestWorld.id}-conquest.png`) });
  const conquestRaw = await rawState(conquestPage, conquestWorld.id);
  await enter(conquestPage);
  await map(conquestPage);
  check("reload restores the newly conquered planet, turn and territory color from its actual archive", await atlas(conquestPage).getAttribute("data-planet-id") === conquestWorld.id && (await readState(conquestPage, conquestWorld.id)).turn === 3 && await rawState(conquestPage, conquestWorld.id) === conquestRaw && await targetCell().locator("path").first().getAttribute("fill") === "#63dcc5");
  check("the conquest journey writes no Korthas exercise archive", await rawState(conquestPage, "korthas") === null);
  await selectOrigin(conquestPage, conquestTarget);
  check("the conquered site becomes a usable keyboard selected command origin", await command(conquestPage).getByRole("combobox", { name: /^Ordre/ }).count() === 1);
  await conquestPage.setViewportSize({ width: 390, height: 844 });
  check("the played conquest also fits the mobile atlas without horizontal overflow", await conquestPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await atlas(conquestPage).screenshot({ path: path.join(output, `mobile-${conquestWorld.id}-conquest.png`) });
  check("all integrated browser journeys complete without runtime errors", errors.length === 0);
  await fs.rm(path.join(output, "failure.png"), { force: true });
  await fs.writeFile(path.join(output, "result.json"), JSON.stringify({ status: "PASS", checks, worlds, errors, conquest: { planetId: conquestWorld.id, targetId: conquestTarget, turn: conquered.turn, source: "normal menu and actual convoy and assault orders, without state injection" }, hydrationRegression: { planetId: hydration.world.id, turn: hydration.state.turn, source: "separate controlled lost-origin fixture validated by the real archive reader" }, completedAt: new Date().toISOString() }, null, 2) + "\n");
  console.log(JSON.stringify({ status: "PASS", checks: checks.length, planets: worlds.length, routeOrigins: worlds.reduce((total, item) => total + item.routeOrigins, 0), output }));
} catch (error) {
  await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
  await fs.writeFile(path.join(output, "result.json"), JSON.stringify({ status: "FAIL", checks, worlds, errors, failure: String(error), completedAt: new Date().toISOString() }, null, 2) + "\n");
  console.error(error); process.exitCode = 1;
} finally {
  for (const extra of extraContexts) await extra.close();
  await context.close(); await browser.close();
}
