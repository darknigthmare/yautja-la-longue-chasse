import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { okavangoAdmissionV171, saves } from "../tests/helpers/earth-okavango-fixture-v171.mjs";

const output = resolve("outputs/qa-earth-okavango-v171");
await mkdir(output, { recursive: true });
const report = { commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "The preexisting M021/M023 engines play the preparation fixture. All Earth commands are driven by the native application.",
  checks: [], errors: [], passed: false };
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
  const walk = async (key, count = 1) => {
    for (let i = 0; i < count; i += 1) await terrain().press(key);
  };

  let context = await open(okavangoAdmissionV171({ returned: false }));
  await openMap();
  assert.equal(await page.locator("[data-galaxy-sol]").count(), 0);
  await context.close();
  report.checks.push("Sol reste absent de la carte avec une coque acquise mais aucun retour de M023.");

  const onboard = okavangoAdmissionV171();
  context = await open(onboard);
  await openMap();
  await page.locator("[data-galaxy-sol]").click();
  await page.locator('[data-earth-okavango="registry"]').waitFor();
  await page.locator('[data-okavango-globe="ready"]').waitFor();
  await shot("01-registre-sol");
  await page.locator('[data-okavango-zone="papyrus"]').click();
  await page.locator("[data-okavango-insert]").click();
  await awaitAt(0, 1);
  assert(await page.locator("[data-okavango-extract]").isDisabled());
  await walk("ArrowRight", 2);
  await awaitAt(2, 1);
  assert(await page.locator("[data-okavango-scan]").isDisabled());
  await terrain().press("KeyR");
  await terrain().press("KeyE");
  await awaitTraces(1);
  await walk("ArrowRight");
  await awaitAt(3, 1);
  assert(await page.locator('[data-okavango-move="east"]').isDisabled());
  await walk("ArrowRight");
  await awaitAt(3, 1);
  await shot("02-chenal-et-trace");
  await page.reload();
  await resumeOnDeck();
  await openMap();
  await page.locator("[data-galaxy-sol]").click();
  await awaitAt(3, 1);
  await awaitTraces(1);
  assert.equal(await page.locator("[data-okavango-analyse]").getAttribute("aria-pressed"), "true");
  report.checks.push("Globe géographique, insertion côté papyrus, lecture au biomask et chenal bloquant. Rechargement au bord du chenal avec le même indice.");
  await walk("ArrowUp");
  await walk("ArrowRight", 2);
  await awaitAt(5, 0);
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
  await shot("03-releve-terrestre");
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
