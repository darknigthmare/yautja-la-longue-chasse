import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { bloodedTempleAdmissionV174, qa } from "../tests/helpers/blooded-temple-fixture-v174.mjs";

const saves = qa.load("app/game/save.ts");
const temple = qa.load("app/game/systems/bloodedTempleV174.ts");
const chronicles = qa.load("app/game/systems/clanChronicle.ts");
const output = resolve(process.env.BLOODED_TEMPLE_OUTPUT ?? "outputs/qa-blooded-temple-v174");
const report = { commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "Completed chapters V66–V90 and both M019 depositions are prepared using their existing reducers.",
  rooms: [], errors: [], passed: false };
const priorExportPath = process.env.BLOODED_TEMPLE_PREVIOUS_SAVE;
const previouslyPlayed = priorExportPath ? saves.parseSaveImport(await readFile(priorExportPath, "utf8")) : null;
if (previouslyPlayed) assert.ok(previouslyPlayed.save, previouslyPlayed.failure);
const seed = previouslyPlayed?.save ?? bloodedTempleAdmissionV174();
if (previouslyPlayed) {
  assert.equal(temple.templeAvailableV174(seed), true);
  assert.equal(seed.bloodedTempleV174 ?? null, null);
  const trial = seed.quatzaRij.expeditions.triad;
  assert.deepEqual([...trial.presentations].sort(), ["companions", "trophy"]);
  report.admission = "Export Chromium M019 : le même trio a remis sa preuve avant la reconnaissance.";
}
seed.settings.masterVolume = 0;
const checked = saves.parseSaveImport(saves.exportSave(seed));
assert.ok(checked.save, checked.failure);
const key = saves.SAVE_STORAGE_KEY;
await mkdir(output, { recursive: true });
let server, browser;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port: 4217, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1380, height: 1000 }, reducedMotion: "reduce" });
  await context.addInitScript(({ key, seed }) => {
    if (sessionStorage.getItem("bloodedTempleQA")) return;
    sessionStorage.setItem("bloodedTempleQA", "1");
    localStorage.setItem(key, JSON.stringify(seed));
  }, { key, seed: checked.save });
  const primaryPage = await context.newPage();
  const page = primaryPage;
  page.on("pageerror", error => report.errors.push(error.message));
  page.setDefaultTimeout(30000);
  const scene = page.locator("[data-blooded-temple-v174]");
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  async function openTemple(page = primaryPage) {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.locator("[data-campaign-session]").waitFor({ timeout: 90000 });
    await page.locator("[data-homeworld-viewport]").waitFor({ timeout: 90000 });
    await page.getByRole("button", { name: "Navigation", exact: true }).click();
    await page.locator("[data-open-quatza-homeworld]").click({ timeout: 30000 });
    await page.locator("[data-open-blooded-temple-v174]").click();
    await page.locator("[data-blooded-temple-v174]").scrollIntoViewIfNeeded();
  }
  async function act(action) {
    const revision = (await read()).bloodedTempleV174?.events.length ?? 0;
    await scene.locator('[data-blooded-action="' + action + '"]').click();
    await page.waitForFunction(({ key, revision }) => JSON.parse(localStorage.getItem(key)).bloodedTempleV174?.events.length === revision + 1,
      { key, revision });
  }
  await page.goto("http://127.0.0.1:4217");
  await openTemple();
  await act("present");
  for (const [index, room] of temple.BLOODED_ROOMS.entries()) {
    assert.equal(await scene.getAttribute("data-blooded-room"), String(index));
    report.rooms.push(room.name);
    if (room.lane) await act("lane");
    await act("right"); await act("right"); await act("interact");
    if (index === 0) { await act("interact"); await act("lane"); }
    await act("right");
    if ("hunter" in room) {
      await act("guard"); await act("strike"); await act("guard"); await act("strike");
    } else if (index === 4) {
      await act("interact");
      await scene.screenshot({ path: resolve(output, "purge.png"), animations: "disabled" });
    }
    await act("right"); await act("right"); await act("next");
    if (index === 2) {
      await page.reload();
      await openTemple();
      assert.equal(await scene.getAttribute("data-blooded-room"), "3");
    }
  }
  assert.equal(await scene.getAttribute("data-blooded-temple-v174"), "mark");
  for (let side = 0; side < 2; side++) {
    for (const point of [0, 1, 4, 7]) await act("mark-" + point);
    await act("seal-mark");
  }
  await act("return-tools");
  assert.equal(await scene.getAttribute("data-blooded-temple-v174"), "complete");
  const complete = await read();
  assert.equal(chronicles.getChronicleRank(complete.prologue.chronicle), "blooded");
  assert.ok(saves.parseSaveImport(saves.exportSave(complete)).save);
  await scene.screenshot({ path: resolve(output, "reconnaissance.png"), animations: "disabled" });
  const alternateStorage = await context.storageState();
  const alternateContext = await browser.newContext({ viewport: { width: 1380, height: 1000 },
    reducedMotion: "reduce", storageState: alternateStorage });
  const alternate = await alternateContext.newPage();
  alternate.on("pageerror", error => report.errors.push(error.message));
  report.ceremonies = [];
  for (const [player, action, choice] of [[page, "celebrate-cohort", "cohort"], [alternate, "visit-quietly", "quiet"]]) {
    if (player === alternate) {
      await player.goto("http://127.0.0.1:4217");
      await openTemple(player);
    }
    const court = player.locator("[data-blooded-ceremony]");
    await court.locator('[data-blooded-action="' + action + '"]').click();
    await court.locator('[data-blooded-action="right"]').press("ArrowRight");
    await player.locator('[data-blooded-court-position="1"]').waitFor();
    await player.reload();
    await openTemple(player);
    assert.equal(await court.getAttribute("data-blooded-ceremony"), choice);
    assert.equal(await court.getAttribute("data-blooded-court-position"), "1");
    await court.locator('[data-blooded-action="right"]').click();
    await court.locator('[data-blooded-action="greet-witness"]').click();
    await player.locator('[data-blooded-witness="true"]').waitFor();
    const played = await player.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(temple.inspectBloodedTempleV174(played.bloodedTempleV174, played.createdAt).view.ceremony, choice);
    assert.deepEqual(played.prologue.chronicle.rites, complete.prologue.chronicle.rites);
    assert.ok(saves.parseSaveImport(saves.exportSave(played)).save);
    await court.screenshot({ path: resolve(output, "reconnaissance-" + choice + ".png"), animations: "disabled" });
    report.ceremonies.push({ choice, witness: true, resumedAt: 1 });
  }
  await page.getByRole("button", { name: "Revenir au dossier", exact: true }).click();
  await page.locator("[data-open-blooded-temple-v174]").waitFor();
  const close = page.getByRole("button", { name: "Retour", exact: true });
  await close.click();
  await page.locator("[data-homeworld-viewport]").waitFor();
  const nav = page.getByRole("button", { name: "Navigation", exact: true });
  const shipyard = page.getByRole("button", { name: "Chantier naval · inspection", exact: true });
  if (!(await shipyard.isVisible())) await nav.click();
  await shipyard.click();
  const dock = page.locator('[data-ship-acquisition="v89"]');
  await dock.waitFor();
  await dock.screenshot({ path: resolve(output, "chantier-naval.png"), animations: "disabled" });
  report.shipyardOpened = true;
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  const page = browser?.contexts()[0]?.pages()[0];
  if (!report.passed && page) {
    report.visibleText = (await page.locator("body").innerText().catch(() => "")).slice(0, 2400);
    await page.screenshot({ path: resolve(output, "failure.png"), animations: "disabled" }).catch(() => {});
    console.log("BLOODED_BROWSER_STATE", JSON.stringify(report));
  }
  await browser?.close();
  await server?.close();
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
