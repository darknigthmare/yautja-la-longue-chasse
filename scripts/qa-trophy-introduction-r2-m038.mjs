import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { homeworldSceneSsrV78 } from "../tests/helpers/homeworld-scene-ssr-v78.mjs";
import { playShipAcquisitionV161 } from "../tests/helpers/ship-receipt-v161.mjs";

const qa = homeworldSceneSsrV78();
const saves = qa.load("app/game/save.ts");
const { MISSION_BY_ID } = qa.load("app/game/data.ts");
const { shipInterior25dRoomRoute } = qa.load("app/game/systems/shipInterior25d.ts");
const quest = MISSION_BY_ID["jungle-vey"];
const owner = "2026-11-27T08:00:00.000Z";
const completedAt = "2026-11-27T09:00:00.000Z";
const trophyId = "m038:ship-test-claim";
const output = resolve(process.env.TROPHY_INTRO_OUTPUT ?? "outputs/qa-trophy-introduction-r2-m038");
const report = { commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "Native completion and personal hull receipts are prepared through the game reducers.",
  passages: [], errors: [], passed: false };

let seed = saves.defaultSave(owner);
seed.profile = { ...seed.profile, honor: 2000, rankId: "blooded", acquiredRankIdV166: "blooded" };
seed = saves.applyMissionResult(seed, { missionId: quest.id, difficultyId: seed.settings.difficultyId,
  outcome: "success", score: 75, elapsedSeconds: 140, completedObjectiveIds: quest.objectives.map(objective => objective.id),
  honorEvents: [], scans: 1, kills: 1, secondWindUsed: false, trophyQuality: "blooded", trophyClaims: [
    { id: trophyId, definitionId: quest.trophy.id, targetName: quest.targetName, targetKind: quest.targetKind,
      partId: "skull", condition: "intact", quality: "blooded" },
  ], completedAt });
seed = playShipAcquisitionV161(qa, seed);
seed.settings.masterVolume = 0;
assert.deepEqual(seed.trophies.map(item => item.id), [trophyId]);
const key = saves.SAVE_STORAGE_KEY;
const checked = saves.parseSaveImport(saves.exportSave(seed));
assert.ok(checked.save, checked.failure);
await mkdir(output, { recursive: true });
let server, browser, page;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"),
    server: { host: "127.0.0.1", port: 4217, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1380, height: 1000 }, reducedMotion: "reduce" });
  await context.addInitScript(({ key, save }) => {
    if (sessionStorage.getItem("trophyM038QA")) return;
    sessionStorage.setItem("trophyM038QA", "1");
    localStorage.setItem(key, JSON.stringify(save));
  }, { key, save: checked.save });
  page = await context.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  page.setDefaultTimeout(30000);
  const ship = page.locator("[data-ship-interior]:visible");
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const button = (scope, name) => scope.getByRole("button", { name, exact: true });

  async function reachHall() {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    const play = button(page, "Jouer");
    await play.or(ship).first().waitFor({ timeout: 90000 });
    if (await play.isVisible()) await play.click();
    await ship.waitFor({ timeout: 90000 });
    const before = await ship.getAttribute("data-ship-room");
    const route = shipInterior25dRoomRoute(before, "trophy-hall");
    assert.ok(route.length, before);
    await ship.locator("[data-ship-plan-toggle]").click();
    await ship.locator('[data-ship-guide="trophy-hall"]').click();
    for (const [index, next] of route.slice(1).entries()) {
      const from = route[index];
      await page.locator('[data-ship-interior][data-ship-room="' + from + '"][data-ship-nearby="door"][data-ship-navigation="false"]:visible').waitFor();
      await ship.locator("[data-ship-interact]").click();
      await page.locator('[data-ship-interior][data-ship-room="' + next + '"]:visible').waitFor();
      report.passages.push({ from, next });
    }
    await page.locator('[data-ship-interior][data-ship-room="trophy-hall"][data-ship-nearby="trophy-hall"]:visible').waitFor();
    await ship.locator("[data-ship-interact]").click();
    await page.getByRole("heading", { name: "Mur des trophées" }).waitFor();
  }

  async function prepare(name, action) {
    const original = page.locator('.trophy-card').filter({ has: page.locator('[data-trophy-introduction="support"]') });
    await button(original, name).click();
    await page.getByRole("button", { name: /Commencer la séquence/ }).click();
    const count = await page.locator('[aria-label="Séquence de gestes"] > span').count();
    assert.ok(count >= 5);
    for (let index = 0; index < count; index++) {
      await page.waitForFunction(() => {
        const dial = document.querySelector('[aria-label="Fenêtre de synchronisation"]');
        const value = Number(dial?.getAttribute("aria-valuenow"));
        return value >= 45 && value <= 65 && !!document.querySelector(".trophy-workshop-touch-controls button:not(:disabled)");
      }, {}, { timeout: 6500 });
      const glyph = await page.locator(".trophy-workshop-work-area strong").first().textContent();
      const input = { "←": "Gauche", "↑": "Haut", "↓": "Bas", "→": "Droite", "A": "Valider" }[glyph?.trim()];
      assert.ok(input, glyph);
      await button(page, "Geste " + input).click();
    }
    await page.waitForFunction(({ key, action }) => JSON.parse(localStorage.getItem(key)).trophies[0].workshop?.completedActions.includes(action), { key, action });
  }

  await page.goto("http://127.0.0.1:4217");
  await reachHall();
  await page.locator('[data-trophy-introduction-action="inspect"]').click();
  await page.locator('[data-trophy-introduction="support"]').waitFor();
  await prepare("Nettoyer", "clean");
  await prepare("Préparer", "prepare");
  await page.locator('[data-trophy-introduction-action="support"]').click();
  const reportLabel = page.locator('[data-trophy-introduction="provenance"]');
  await reportLabel.waitFor();
  const wrong = reportLabel.locator('[data-trophy-introduction-action="label"]').filter({ hasNotText: quest.planetName }).first();
  await wrong.click();
  assert.equal((await read()).trophyUsagesV147.introduction.stage, "provenance");
  await reportLabel.screenshot({ path: resolve(output, "provenance.png") });
  await button(reportLabel, quest.planetName).click();
  await button(page, "Installer au vaisseau").click();
  await page.locator("[data-trophy-introduction-receipt]").waitFor();
  const finished = await read();
  assert.equal(finished.trophyUsagesV147.introduction.stage, "complete");
  assert.equal(finished.trophyUsagesV147.assignments[trophyId].site, "ship");
  assert.equal(finished.trophies.length, 1);
  assert.equal(finished.trophies[0].claimedAt, completedAt);
  assert.ok(saves.parseSaveImport(saves.exportSave(finished)).save);
  await page.locator("[data-trophy-introduction-receipt]").screenshot({ path: resolve(output, "registre.png") });
  await page.reload();
  await reachHall();
  await page.locator("[data-trophy-introduction-receipt]").waitFor();
  assert.deepEqual((await read()).trophyUsagesV147.introduction, finished.trophyUsagesV147.introduction);
  assert.deepEqual(report.errors, []);
  report.receipt = finished.trophyUsagesV147.introduction;
  report.passed = true;
} catch (error) {
  report.failure = String(error);
  if (page) await page.screenshot({ path: resolve(output, "failure.png") }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  await server?.close();
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
