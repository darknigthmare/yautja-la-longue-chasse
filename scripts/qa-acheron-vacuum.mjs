import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";

const root = process.cwd();
const canvasPath = "app/game/HuntCanvas.tsx";
const revision = "0663352f5ae5ab44ab743ef041b65c8ce2bcfff9";
const product = await readFile(canvasPath, "utf8");
assert.equal(product, execFileSync("git", ["show", revision + ":" + canvasPath], { encoding: "utf8" }));
const setup = `
    // Browser fixture only: position the hunter on an authored arena floor.
    // Reading the native state after this admission does not drive the simulation.
    game.phase = "target";
    game.boss.active = true;
    game.enemies = [];
    game.player.grounded = true;
    game.player.y = game.world.floorY - game.player.height;
    const probeLocations = [200, 285, 375, 480, 525];
    for (const offset of probeLocations) {
      game.boss.x = game.world.bossArena.x + offset;
      game.player.x = game.boss.x - 286;
      if (canAcheronObserveFlash(game, game.boss, {
        x: game.player.x + game.player.width / 2, y: game.player.y + game.player.height / 2,
      })) break;
    }
    game.cameraX = Math.max(0, game.player.x - 370);
    window.__observeAcheron = () => ({
      phase: game.phase, noise: game.noiseEvents.length, scent: game.scentNodes.length,
      playerX: game.player.x, grounded: game.player.grounded, bossX: game.boss.x,
      telegraph: game.boss.telegraph, paused: game.paused, elapsed: game.elapsed,
    });
`;
const anchor = "    const fixedStep = 1 / 60;";
assert.equal(product.split(anchor).length, 2);
const out = path.resolve("outputs/qa-acheron-vacuum");
const scratch = path.resolve("work-local");
await mkdir(out, { recursive: true });
await mkdir(scratch, { recursive: true });
const directory = await mkdtemp(path.join(scratch, "acheron-"));
const mount = "/" + path.relative(root, directory).replaceAll("\\", "/") + "/";
const fixture = `import React from "react";
import { createRoot } from "react-dom/client";
import HuntCanvas from "/app/game/HuntCanvas.tsx";
import { defaultSave } from "/app/game/save.ts";
import { MISSIONS } from "/app/game/data.ts";
const save = defaultSave();
const mission = MISSIONS.find(item => item.id === "ruins-ancient-guardian");
if (!mission) throw Error("Missing Achéron mission");
createRoot(document.getElementById("root")).render(
  <HuntCanvas mission={mission} encounterRun={1} loadout={save.loadout} inventory={save.inventory}
    appearance={save.appearance} difficulty="normal" reducedGore={true} screenShake={false}
    highContrastVision={false} onFinish={() => {}} onAbort={() => {}}
    onSound={id => { (window.__acheronSfx ??= []).push(id); }}/>
);
`;
await writeFile(path.join(directory, "fixture.tsx"), fixture);
await writeFile(path.join(directory, "index.html"), `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Recette du vide d’Achéron</title><body style="margin:0;background:#181e24;color:#f2f2ef;font-family:system-ui">
<div id="root"></div><script type="module" src="${mount}fixture.tsx"></script></body></html>`);
let server, browser;
const report = { revision, admission: "Starting position beside the real Guardian is prepared in the browser harness. No mission progress is granted. Scan and movement use real keyboard controls.", events: [], errors: [] };
try {
  server = await createServer({
    configFile: false,
    plugins: [{ name: "acheron-arena-start-for-recipe", enforce: "pre", transform(code, id) {
      return id.endsWith("/" + canvasPath) ? { code: code.replace(anchor, setup + anchor), map: null } : null;
    } }, react()],
    server: { host: "127.0.0.1", port: 4127, strictPort: true },
  });
  await server.listen();
  browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1240, height: 940 } });
  page.on("pageerror", error => report.errors.push(error.message));
  page.setDefaultTimeout(25_000);
  await page.goto("http://127.0.0.1:4127" + mount);
  const indicator = page.locator("[data-acheron-signal]");
  await indicator.waitFor();
  const opening = page.getByRole("button", { name: "Commencer la chasse", exact: true });
  await opening.click({ timeout: 40_000 });
  const canvas = page.locator("canvas").last();
  await canvas.focus();
  const observe = () => page.evaluate(() => window.__observeAcheron());
  await page.waitForFunction(() => window.__observeAcheron?.().elapsed > 0.25);
  const idle = await observe();
  await page.waitForFunction(() => window.__observeAcheron?.().elapsed > 0.90);
  const quiet = await observe();
  assert.equal(quiet.bossX, idle.bossX, "idle hunter stays outside Guardian acquisition");
  assert.equal(await indicator.getAttribute("data-acheron-signal"), "clear");
  assert.equal(quiet.noise, 0);
  assert.equal(quiet.scent, 0);
  report.events.push({ action: "quiet", ...quiet });

  await page.keyboard.press("v");
  await page.locator('[data-acheron-signal="energy"]').waitFor({ timeout: 8_000 });
  const runningEnergy = await observe();
  assert.equal(runningEnergy.noise, 0);
  assert.equal(runningEnergy.scent, 0);
  assert.ok(await page.evaluate(() => window.__acheronSfx?.includes("vacuum-energy")));
  await page.screenshot({ path: path.join(out, "01-signature-energetique.png"), animations: "disabled" });
  report.events.push({ action: "emission énergétique", ...runningEnergy });
  await page.locator('[data-acheron-signal="clear"]').waitFor({ timeout: 8_000 });
  await page.keyboard.down("ArrowRight");
  try {
    await page.locator('[data-acheron-signal="vibration"]').waitFor({ timeout: 8_000 });
    const vibration = await observe();
    assert.ok(vibration.playerX > quiet.playerX);
    assert.equal(vibration.grounded, true);
    assert.equal(vibration.noise, 0);
    assert.equal(vibration.scent, 0);
    assert.ok(await page.evaluate(() => window.__acheronSfx?.includes("vacuum-step")));
    await page.screenshot({ path: path.join(out, "02-vibration-du-sol.png"), animations: "disabled" });
    report.events.push({ action: "vibration de l’appui", ...vibration });
  } finally {
    await page.keyboard.up("ArrowRight");
  }
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(path.join(out, "report.json"), JSON.stringify(report, null, 2));
  await browser?.close();
  await server?.close();
  await rm(directory, { recursive: true, force: true });
}
