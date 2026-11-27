import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { okavangoAdmissionV171, OWNER, qa, saves, SHIP } from "../tests/helpers/earth-okavango-fixture-v171.mjs";

const output = resolve("outputs/qa-earth-okavango-v171");
await mkdir(output, { recursive: true });
const report = { commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "The preexisting M021/M023 engines play the preparation fixture. All Earth commands are driven by the native application.",
  checks: [], errors: [], passed: false };
const hydrology = qa.load("app/game/systems/earthOkavangoV171.ts");
const storageKey = saves.SAVE_STORAGE_KEY;
let server, browser, page;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"),
    server: { host: "127.0.0.1", port: 4278, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  async function open(fixture) {
    const context = await browser.newContext({ viewport: { width: 1390, height: 980 }, reducedMotion: "reduce" });
    await context.addInitScript(({ save, fleet, fleetKey, storageKey }) => {
      if (sessionStorage.getItem("qaEarthV171")) return;
      sessionStorage.setItem("qaEarthV171", "1");
      localStorage.setItem(storageKey, JSON.stringify(save));
      localStorage.setItem(fleetKey, JSON.stringify(fleet));
    }, { ...fixture, storageKey });
    page = await context.newPage();
    await page.bringToFront();
    page.setDefaultTimeout(25000);
    page.on("pageerror", error => report.errors.push(error.message));
    await page.goto("http://127.0.0.1:4278");
    await resumeOnDeck();
    return context;
  }
  const deck = () => page.locator(".physical-deck-screen").filter({ visible: true });
  const earth = () => page.locator("[data-earth-okavango]");
  const terrain = () => earth().getByRole("group", { name: /Terrain du delta/ });
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
  const shot = name => earth().screenshot({ path: resolve(output, name + ".png"), animations: "disabled" });
  async function resumeOnDeck() {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
    const menu = page.locator('[data-menu-section="campaign"]');
    if (await menu.isVisible()) await menu.click();
    await page.locator('[data-menu-action="continue"]').click();
    await deck().locator("[data-ship-interior]").waitFor({ timeout: 45000 });
  }
  async function openMap() {
    const quick = deck().getByRole("button", { name: "Accès rapide aux installations", exact: true });
    if (await quick.getAttribute("aria-expanded") !== "true") await quick.click();
    const shortcuts = deck().locator("[data-ship-shortcuts]");
    if (await shortcuts.getAttribute("open") === null) await shortcuts.locator("summary").click();
    await shortcuts.locator('[data-ship-shortcut="galaxy-map"]').click();
    await page.locator("[data-galaxy-v10-level]").waitFor();
  }
  const awaitAt = (x, lane) => page.locator('[data-okavango-position="' + x + ':' + lane + '"]').waitFor();
  const awaitTraces = count => page.locator('[data-okavango-traces="' + count + '"]').waitFor();
  const awaitWater = level => page.locator('[data-okavango-water="' + level + '"]').waitFor();
  const walk = async (key, count = 1) => {
    for (let i = 0; i < count; i += 1) await terrain().press(key);
  };

  let context = await open(okavangoAdmissionV171({ returned: false }));
  await openMap();
  assert.equal(await page.locator("[data-galaxy-sol]").count(), 0);
  await context.close();
  report.checks.push("Sol reste absent de la carte avec une coque acquise mais aucun retour de M023.");

  const onboard = okavangoAdmissionV171();
  const access = hydrology.earthOkavangoAccessV171(onboard.save, SHIP);
  assert(access.allowed);
  let previousSurvey = { version: 1, owner: OWNER, hullInstanceId: access.hullInstanceId,
    orders: [{ kind: "choose-zone", zone: "papyrus" }] };
  for (const order of [
    { kind: "insert" }, { kind: "move", direction: "east" }, { kind: "move", direction: "east" },
    { kind: "analyse" }, { kind: "scan" }, { kind: "move", direction: "east" },
  ]) {
    const result = hydrology.commitEarthOkavangoV171(previousSurvey, order, access);
    assert(result.accepted, result.reason);
    previousSurvey = result.state;
  }
  context = await open({ ...onboard, save: { ...onboard.save, earthV171: previousSurvey } });
  await openMap();
  await page.locator("[data-galaxy-sol]").click();
  await awaitAt(3, 1);
  await awaitTraces(1);
  await awaitWater("historical");
  assert(await page.locator('[data-okavango-move="east"]').isDisabled());
  assert.match((await page.locator('[data-okavango-read="tyres"]').textContent()) ?? "", /Traces de 4×4/);
  await context.close();
  report.checks.push("Un ancien relevé V1 reprend au bord du chenal avec son indice et la géométrie d’origine.");

  context = await open(onboard);
  await openMap();
  await page.locator("[data-galaxy-sol]").click();
  await page.locator('[data-earth-okavango="registry"]').waitFor();
  await page.locator('[data-okavango-globe="ready"]').waitFor();
  await shot("01-registre-sol");
  await page.locator('[data-okavango-zone="papyrus"]').click();
  await page.locator("[data-okavango-insert]").click();
  await awaitAt(0, 1);
  await awaitWater("low");
  assert(await page.locator("[data-okavango-extract]").isDisabled());
  assert.equal((await read()).earthV171.version, 2);
  await walk("ArrowRight");
  await walk("ArrowLeft");
  await walk("ArrowRight", 4);
  await awaitAt(4, 1);
  await awaitWater("rising");
  assert(!(await page.locator('[data-okavango-move="east"]').isDisabled()));
  assert(await page.locator("[data-okavango-scan]").isDisabled());
  await terrain().press("KeyR");
  assert(!(await page.locator("[data-okavango-scan]").isDisabled()));
  await shot("02-gue-praticable");
  await walk("ArrowRight", 2);
  await awaitAt(6, 1);
  await awaitWater("high");
  assert(await page.locator('[data-okavango-move="east"]').isDisabled());
  assert(await page.locator('[data-okavango-move="west"]').isDisabled());
  assert(!(await page.locator('[data-okavango-move="north"]').isDisabled()));
  await walk("ArrowRight");
  await awaitAt(6, 1);
  await shot("03-crue-au-chenal");
  await page.reload();
  await resumeOnDeck();
  await openMap();
  await page.locator("[data-galaxy-sol]").click();
  await awaitAt(6, 1);
  await awaitWater("high");
  await awaitTraces(0);
  assert.equal(await page.locator("[data-okavango-analyse]").getAttribute("aria-pressed"), "true");
  await walk("ArrowUp");
  await awaitAt(6, 0);
  await walk("ArrowLeft", 3);
  await awaitAt(3, 0);
  await terrain().press("KeyE");
  await awaitTraces(1);
  assert.match((await page.locator('[data-okavango-read="tyres"]').textContent()) ?? "", /Ornières sur la levée/);
  report.checks.push("Gué réellement parcouru puis submergé, reprise au même pas après rechargement, remontée sur la levée et lecture des ornières qui remplacent la trace noyée.");
  await walk("ArrowRight", 2);
  await awaitAt(5, 0);
  assert(await page.locator('[data-okavango-move="south"]').isDisabled());
  await terrain().press("KeyE");
  await awaitTraces(2);
  await walk("ArrowRight", 2);
  await walk("ArrowDown");
  await walk("ArrowRight");
  await awaitAt(8, 1);
  await terrain().press("KeyE");
  await awaitTraces(3);
  assert(await page.locator("[data-okavango-extract]").isDisabled());
  await walk("ArrowUp");
  await walk("ArrowLeft", 8);
  await walk("ArrowDown");
  await awaitAt(0, 1);
  await terrain().press("KeyE");
  await page.locator('[data-earth-okavango="returned"]').waitFor();
  await shot("04-releve-crue");
  const result = await read();
  assert.deepEqual(result.firstInterstellarV173, onboard.save.firstInterstellarV173);
  assert.deepEqual(result.trophies, onboard.save.trophies);
  assert.deepEqual(result.missionProgress, onboard.save.missionProgress);
  await page.locator('[data-okavango-return="deck"]').click();
  await deck().locator("[data-ship-interior]").waitFor();
  await openMap();
  assert.match((await page.locator("[data-galaxy-sol]").textContent()) ?? "", /Consulter le relevé/);
  await page.locator("[data-galaxy-sol]").click();
  await page.locator('[data-earth-okavango="returned"][data-okavango-traces="3"]').waitFor();
  report.checks.push("Trois traces, traversée physique retour et extraction au dépôt. Le pont et le relevé se rouvrent, sans gains ni mutation de M023.");
  const orbit = () => page.locator("[data-okavango-orbit]");
  const cockpit = () => orbit().getByRole("group", { name: "Poste de pilotage du survol", exact: true });
  const fly = async (key, count = 1) => {
    for (let i = 0; i < count; i += 1) await cockpit().press(key);
  };
  await page.locator("[data-okavango-orbit-start]").click();
  await page.locator('[data-okavango-orbit="outbound"][data-okavango-flight="alignment"]').waitFor();
  await page.locator('[data-okavango-globe="ready"]').waitFor();
  await page.waitForFunction(() => {
    const ship = document.querySelector('[data-okavango-orbit] img');
    return ship instanceof HTMLImageElement && ship.complete && ship.naturalWidth > 0;
  });
  assert.equal((await read()).earthV171.version, 3);
  assert.equal((await read()).earthV171.surveyVersion, 2);
  assert.equal(await page.locator("[data-okavango-orbit-scan]").count(), 0);
  await fly("ArrowLeft", 3);
  await fly("Enter");
  await page.locator('[data-okavango-flight="approach"]').waitFor();
  await fly("Enter", 4);
  await page.locator('[data-okavango-orbit-distance="30"][data-okavango-orbit-speed="0"][data-okavango-orbit-setbacks="1"]').waitFor();
  await shot("05-reprise-orbitale");
  await page.reload();
  await resumeOnDeck();
  await openMap();
  await page.locator("[data-galaxy-sol]").click();
  await page.locator('[data-okavango-orbit="outbound"][data-okavango-orbit-distance="30"][data-okavango-orbit-speed="0"][data-okavango-orbit-setbacks="1"]').waitFor();
  assert.equal(await page.locator("[data-okavango-orbit-scan]").count(), 0);
  await fly("ArrowUp");
  await fly("Enter", 3);
  await page.locator('[data-okavango-flight="locks"]').waitFor();
  await page.locator('[data-okavango-orbit-scan="bank"]').click();
  await page.locator('[data-okavango-orbit="observed"] [data-okavango-orbit-observed="bank"]').waitFor();
  await shot("06-fenetre-observee");
  assert.equal(await page.locator("[data-okavango-orbit-finish]").count(), 0);
  await page.locator("[data-okavango-orbit-return]").click();
  await page.locator('[data-okavango-orbit="return"][data-okavango-orbit-lateral="-3"]').waitFor();
  await fly("ArrowRight", 3);
  await fly("Enter");
  await fly("ArrowDown", 2);
  await fly("Enter", 10);
  await page.locator('[data-okavango-orbit="return"][data-okavango-flight="locks"]').waitFor();
  await page.locator("[data-okavango-orbit-finish]").click();
  await page.locator('[data-earth-okavango="returned"][data-okavango-traces="3"] [data-okavango-orbit-complete="bank"]').waitFor();
  await shot("07-retour-sol");
  await page.locator('[data-okavango-return="deck"]').click();
  await deck().locator("[data-ship-interior]").waitFor();
  const afterOrbit = await read();
  assert.deepEqual(afterOrbit.earthV171.orders.slice(0, result.earthV171.orders.length), result.earthV171.orders);
  assert.deepEqual(afterOrbit.firstInterstellarV173, result.firstInterstellarV173);
  assert.deepEqual(afterOrbit.trophies, result.trophies);
  assert.deepEqual(afterOrbit.missionProgress, result.missionProgress);
  report.checks.push("Depuis le relevé extrait, survol piloté en coque d’origine, fermeture trop rapide avec recul puis reprise après rechargement, observation du banc et manœuvre de retour avant de retrouver le pont.");
  assert.deepEqual(report.errors, []);
  report.passed = true;
  await context.close();
} finally {
  if (!report.passed && page) {
    report.screen = (await page.locator("body").innerText().catch(() => "")).slice(0, 3000);
    await page.screenshot({ path: resolve(output, "failure.png") }).catch(() => {});
  }
  console.log("OKAVANGO_V171_BROWSER", JSON.stringify(report));
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server?.close();
}
