#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const runtimePath = path.resolve("app/game/HuntCanvas.tsx");
const source = await readFile(runtimePath, "utf8");
const assetStart = "    const assets: AssetBank = {";
assert.equal(source.split(assetStart).length, 2, "exact native asset-default anchor");
const assetDefaults = source.split(assetStart)[1].split("\n    };")[0];
const effectImport = 'import { drawMudFootstep, drawWorldHazard } from "./worldHazardRendering";';
assert.equal(source.split(effectImport).length, 2, "exact native world-effects import");

const entry = String.raw`
  export { makeGameState, renderGame, updateHuntSignals, VIEW_WIDTH, VIEW_HEIGHT, hazardQaAssets, observedHazardCalls } from "./app/game/HuntCanvas";
  export { MISSION_BY_ID } from "./app/game/data";
  export { WORLD_BLUEPRINTS_BY_MISSION, hazardPhaseAt } from "./app/game/systems/worldBlueprints";
  export { drawWorldHazard } from "./app/game/worldHazardRendering";
  export { defaultSave } from "./app/game/save";
`;
const qaBoundary = String.raw`
  export const observedHazardCalls: { id: string; phase: string }[] = [];
  function drawWorldHazard(...args: Parameters<typeof renderWorldHazard>): void {
    const { id } = args[1];
    observedHazardCalls.push({ id, phase: args[2] });
    if (Reflect.get(globalThis, "hideWorldHazardForQA") !== id) renderWorldHazard(...args);
  }
`;
const native = source.replace(effectImport,
  'import { drawMudFootstep, drawWorldHazard as renderWorldHazard } from "./worldHazardRendering";'
) + "\n" + qaBoundary + "\n" +
  "export { makeGameState, renderGame, updateHuntSignals, VIEW_WIDTH, VIEW_HEIGHT };\n" +
  "export function hazardQaAssets(): AssetBank { return {" + assetDefaults + "\n}; }\n";

const bundled = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "ts" },
  write: false, bundle: true, platform: "browser", format: "iife",
  globalName: "hazardProof", jsx: "automatic", logLevel: "silent",
  plugins: [{
    name: "observe-native-hazard-boundary",
    setup(builder) {
      builder.onLoad({ filter: /HuntCanvas\.tsx$/ }, (args) => args.path === runtimePath
        ? { contents: native, loader: "tsx", resolveDir: path.dirname(runtimePath) }
        : null);
      builder.onLoad({ filter: /\.css$/ }, () => ({ contents: "", loader: "empty" }));
    },
  }],
  define: { "process.env.NODE_ENV": '"production"' },
});
const output = process.env.HAZARD_QA_OUTPUT ?? "outputs/qa-world-hazard-vfx-20261128";
await mkdir(output, { recursive: true });
const revision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE ?? "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const cases = {
  "jungle-vey": "flash-flood",
  "ice-cryostalker": "falling-ice",
  "volcano-bad-blood": "steam-vent",
  "swamp-hydra": "tidal-surge",
  "desert-sandmaw": "glass-storm",
  "ocean-leviathan": "electrical-surge",
  "fungal-hivemind": "spore-cloud",
  "ruins-ancient-guardian": "laser-grid",
};
const report = {
  revision, chromium: browser.version(), viewport: { width: 1280, height: 720 },
  scope: "Production renderGame and contact signals with authored worlds and native unloaded-asset fallback. Observed draw boundary and deliberate scenic camera placement.",
  cases: {}, captures: [],
};
try {
  const page = await browser.newPage({ viewport: report.viewport, deviceScaleFactor: 1 });
  page.on("pageerror", error => { (report.pageErrors ??= []).push(error.message); });
  await page.setContent('<body style="margin:0;background:#0c1011"><canvas id="hunt"></canvas></body>');
  await page.addScriptTag({ content: bundled.outputFiles[0].text });
  for (const [missionId, kind] of Object.entries(cases)) {
    const stats = await page.evaluate(({ missionId, kind }) => {
      const r = window.hazardProof;
      const mission = r.MISSION_BY_ID[missionId];
      const save = r.defaultSave("2026-11-28T00:00:00.000Z");
      const game = r.makeGameState(mission, save.loadout, save.inventory, "hunter", save.appearance,
        true, false, "hazard-vfx-browser-proof", save.exploration);
      const hazard = game.world.hazards.find(item => item.kind === kind);
      if (!hazard?.cycle) throw Error("No authored cycle for " + missionId + "/" + kind);
      const { periodSeconds, phaseSeconds, activeSeconds } = hazard.cycle;
      const begin = periodSeconds * 2 - phaseSeconds;
      const warning = begin - hazard.telegraphSeconds * 0.38;
      const active = begin + activeSeconds * 0.29;
      const inactive = begin - (periodSeconds - activeSeconds + hazard.telegraphSeconds) / 2;
      const canvas = document.getElementById("hunt");
      canvas.width = r.VIEW_WIDTH;
      canvas.height = r.VIEW_HEIGHT;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const assets = r.hazardQaAssets();
      game.cameraX = Math.max(0, hazard.x + hazard.width / 2 - canvas.width / 2);
      game.cameraY = hazard.y + hazard.height - (canvas.height - 85);
      game.player.maskOn = false;
      game.player.x = Math.max(0, hazard.x - game.player.width - 24);
      game.player.y = hazard.y + hazard.height - game.player.height;
      const paint = (time, reducedMotion = false, hide = false) => {
        game.elapsed = time;
        r.observedHazardCalls.length = 0;
        window.hideWorldHazardForQA = hide ? hazard.id : null;
        r.renderGame(ctx, game, mission, save.loadout, save.appearance, assets, 0, 1, reducedMotion);
        window.hideWorldHazardForQA = null;
        return r.observedHazardCalls.find(item => item.id === hazard.id)?.phase ?? null;
      };
      const x = Math.max(0, Math.floor(hazard.x - game.cameraX));
      const y = Math.max(0, Math.floor(hazard.y - game.cameraY));
      const width = Math.min(canvas.width - x, Math.ceil(hazard.width));
      const height = Math.min(canvas.height - y, Math.ceil(hazard.height));
      const image = () => ctx.getImageData(x, y, width, height).data;
      const diff = (a, b) => {
        let changed = 0;
        for (let i = 0; i < a.length; i += 4) {
          if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) changed++;
        }
        return changed;
      };
      const warningPhase = paint(warning);
      const warningPixels = image();
      paint(warning, false, true);
      const warningPixelsChanged = diff(warningPixels, image());
      const activePhase = paint(active);
      const activePixels = image();
      paint(active, false, true);
      const activePixelsChanged = diff(activePixels, image());
      const inactivePhase = paint(inactive);
      const inactivePixels = image();
      paint(inactive, false, true);
      const inactivePixelsChanged = diff(inactivePixels, image());

      // Keep the photographed frame in the native scene. Timings isolate CPU calls
      // for the hazard layer plus forced RGBA readback on a separate canvas below.
      let contact = null;
      if (missionId === "jungle-vey") {
        game.player.x = hazard.x + hazard.width / 2 - game.player.width / 2;
        game.player.y = hazard.y + hazard.height / 3 - game.player.height / 2;
        game.player.cloaked = true;
        game.player.invulnerability = 0;
        const health = game.player.health;
        game.elapsed = warning;
        r.updateHuntSignals(game, mission, 0.2);
        const before = { health: game.player.health, cloaked: game.player.cloaked, damage: game.environmentDamage };
        game.elapsed = active;
        r.updateHuntSignals(game, mission, 0.2);
        contact = { health, before, active: { health: game.player.health, cloaked: game.player.cloaked } };
        game.player.x = Math.max(0, hazard.x - game.player.width - 24);
        game.player.y = hazard.y + hazard.height - game.player.height;
      }
      window.paintHazardCapture = phase => paint(phase === "telegraph" ? warning : active);
      return {
        kind, hazard: hazard.id, width, height, warningPhase, activePhase, inactivePhase,
        warningPixelsChanged, activePixelsChanged, inactivePixelsChanged,
        phasePixelsChanged: diff(warningPixels, activePixels), contact,
      };
    }, { missionId, kind });
    report.cases[missionId] = stats;
    assert.equal(stats.warningPhase, "telegraph", missionId);
    assert.equal(stats.activePhase, "active", missionId);
    assert.equal(stats.inactivePhase, null, missionId);
    assert.ok(stats.warningPixelsChanged > 200 && stats.activePixelsChanged > 200, JSON.stringify(stats));
    assert.ok(stats.phasePixelsChanged > 500, JSON.stringify(stats));
    assert.equal(stats.inactivePixelsChanged, 0, missionId);
    if (stats.contact) {
      assert.deepEqual(stats.contact.before, { health: stats.contact.health, cloaked: true, damage: 0 });
      assert.ok(stats.contact.active.health < stats.contact.health);
      assert.equal(stats.contact.active.cloaked, false);
    }
    for (const phase of ["telegraph", "active"]) {
      await page.evaluate(current => window.paintHazardCapture(current), phase);
      const name = missionId + "-" + phase + ".png";
      await page.locator("#hunt").screenshot({ path: path.join(output, name) });
      report.captures.push(name);
    }
  }

  report.layer = await page.evaluate(() => {
    const r = window.hazardProof;
    const hazards = new Map(Object.values(r.WORLD_BLUEPRINTS_BY_MISSION)
      .flatMap(world => world.hazards).map(hazard => [hazard.kind, hazard]));
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const latencies = [];
    const stableKinds = [];
    for (const [kind, hazard] of hazards) {
      const worldHazard = { ...hazard, x: 20, y: 20 };
      const start = hazard.cycle ? hazard.cycle.periodSeconds * 2 - hazard.cycle.phaseSeconds : 0;
      const draw = (time, reduce, windX) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        r.drawWorldHazard(ctx, worldHazard, r.hazardPhaseAt(worldHazard, time), time, reduce, windX);
      };
      const a = start + 0.09;
      const b = start + 0.16;
      draw(a, true, -42);
      const first = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      draw(b, true, 37);
      const ctxData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      if (first.every((value, index) => value === ctxData[index])) stableKinds.push(kind);
      for (let i = 0; i < 30; i++) {
        const before = performance.now();
        draw(a + i * 0.004, false, 15);
        ctx.getImageData(0, 0, 1, 1);
        const duration = performance.now() - before;
        if (i >= 5) latencies.push(duration);
      }
    }
    latencies.sort((a, b) => a - b);
    return { kinds: hazards.size, stableKinds, samples: latencies.length,
      medianMs: latencies[Math.floor(latencies.length * 0.50)],
      p95Ms: latencies[Math.floor(latencies.length * 0.95)],
      maximumMs: latencies.at(-1),
      scope: "Isolated 1280x720 effect, Canvas 2D commands plus 1px synchronous readback. This is not whole-game frame time.",
    };
  });
  assert.equal(report.layer.kinds, 22);
  assert.equal(report.layer.stableKinds.length, 22);
  assert.ok(report.layer.p95Ms < 12, JSON.stringify(report.layer));
  assert.equal(report.pageErrors?.length ?? 0, 0);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.message;
  throw error;
} finally {
  await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
  await browser.close();
}
