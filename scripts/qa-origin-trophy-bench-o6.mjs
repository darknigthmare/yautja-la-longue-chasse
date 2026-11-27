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
const trophyId = "o6:bench:claim";
const output = resolve("outputs/qa-origin-trophy-bench-o6");
const report = { commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "The fixture admits a saved trophy via the campaign result reducer. The route to the workshop and the three bench gestures are played in the native interface.",
  passages: [], actions: [], errors: [], passed: false };

let seed = saves.defaultSave(owner);
seed.profile = { ...seed.profile, honor: 2000, rankId: "blooded", acquiredRankIdV166: "blooded" };
seed = saves.applyMissionResult(seed, { missionId: quest.id, difficultyId: seed.settings.difficultyId,
  outcome: "success", score: 75, elapsedSeconds: 140, completedObjectiveIds: quest.objectives.map(objective => objective.id),
  honorEvents: [], scans: 1, kills: 1, secondWindUsed: false, trophyQuality: "blooded", trophyClaims: [
    { id: trophyId, definitionId: quest.trophy.id, targetName: quest.targetName, targetKind: quest.targetKind,
      partId: quest.trophy.partId, condition: "intact", quality: "blooded" },
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
    server: { host: "127.0.0.1", port: 4225, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1380, height: 1000 }, reducedMotion: "reduce" });
  await context.addInitScript(({ key, save }) => {
    if (sessionStorage.getItem("trophyO6QA")) return;
    sessionStorage.setItem("trophyO6QA", "1");
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


  await page.goto("http://127.0.0.1:4225/");
  await reachHall();
  const panel = page.locator('[data-origin-trophy-v157="STORY5-TR-O6-02"]');
  const bench = panel.locator('[data-o6-trophy-bench]');
  await bench.waitFor();
  assert.equal(await bench.getAttribute("data-o6-trophy-bench"), trophyId);
  assert.equal(await bench.getAttribute("data-o6-trophy-turned"), "false");
  const img = bench.locator("img");
  await img.waitFor();
  assert(await img.evaluate(node => node.decode().then(() => node.naturalWidth > 0)));
  report.plate = await img.getAttribute("src");
  assert.equal(report.plate, "/game/assets/v15/trophies/trophy-vey.webp");
  await panel.locator('[data-origin-step="1"]').click();
  assert.equal((await read()).originV151?.transitions["STORY5-TR-O6-02"], undefined);

  for (const index of [0, 1, 2]) {
    await panel.locator('[data-origin-step="' + index + '"]').click();
    const record = (await read()).originV151.transitions["STORY5-TR-O6-02"];
    assert.equal(record.steps, index + 1);
    assert.equal(record.trophyId, trophyId);
    report.actions.push(index);
  }
  assert.equal(await bench.getAttribute("data-o6-trophy-turned"), "true");
  await panel.locator("[data-o6-trophy-condition]").waitFor();
  await panel.locator("[data-o6-trophy-cartel]").waitFor();
  await panel.screenshot({ path: resolve(output, "trophee-au-berceau.png") });
  await panel.locator('[data-origin-choice="1"]').click();
  await panel.locator('[data-origin-resolved="success"]').waitFor();
  assert.equal(await panel.locator("[data-o6-trophy-cartel] dt").first().innerText(), "Gestes d’atelier");
  const completed = await read();
  assert.equal(completed.originV151.ending, undefined);
  assert.deepEqual(completed.originV151.consumed, ["STORY5-TR-O6-02:resolved"]);
  assert.deepEqual(completed.trophies, checked.save.trophies);
  await page.reload({ waitUntil: "domcontentloaded" });
  await reachHall();
  await panel.locator('[data-origin-resolved="success"]').waitFor();
  assert.equal(await bench.getAttribute("data-o6-trophy-bench"), trophyId);
  assert.equal(await panel.locator("[data-o6-trophy-cartel] dt").first().innerText(), "Gestes d’atelier");
  assert.deepEqual((await read()).originV151, completed.originV151);
  assert.deepEqual(report.errors, []);
  await panel.screenshot({ path: resolve(output, "cartel-repris.png") });
  report.passed = true;
} finally {
  if (!report.passed && page) await page.screenshot({ path: resolve(output, "echec.png") }).catch(() => {});
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server?.close();
}
console.log(JSON.stringify({ passed: report.passed, commit: report.commit, actions: report.actions, plate: report.plate }));
