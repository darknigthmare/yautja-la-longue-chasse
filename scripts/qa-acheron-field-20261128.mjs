#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const runtimePath = path.resolve("app/game/HuntCanvas.tsx");
const source = await readFile(runtimePath, "utf8");
const assetAnchor = "    const assets: AssetBank = {";
const lensImport = 'import { drawAcheronRefraction } from "./acheronRefraction";';
assert.equal(source.split(assetAnchor).length, 2);
assert.equal(source.split(lensImport).length, 2);
const defaults = source.split(assetAnchor)[1].split("\n    };")[0];
const native = source.replace(lensImport, 'import { drawAcheronRefraction as refract } from "./acheronRefraction";') + [
  "\nexport { makeGameState, renderGame, updateBoss, VIEW_WIDTH, VIEW_HEIGHT };",
  "\nexport function nativeAssets(): AssetBank { return {" + defaults + "\n}; }",
  '\nfunction drawAcheronRefraction(...args: Parameters<typeof refract>): void {',
  '  if (!Reflect.get(globalThis, "hideLensForComparison")) refract(...args);',
  "}\n",
].join("");
const bundle = await build({
  stdin: { contents: [
    'export {makeGameState, renderGame, updateBoss, VIEW_WIDTH, VIEW_HEIGHT, nativeAssets} from "./app/game/HuntCanvas";',
    'export {MISSION_BY_ID} from "./app/game/data";',
    'export {GUARDIAN_ADAPTATION} from "./app/game/systems/huntSystems";',
    'export {defaultSave} from "./app/game/save";',
    'export {GameAudio} from "./app/game/sound";',
  ].join("\n"), resolveDir: process.cwd(), loader: "ts" },
  write: false, bundle: true, platform: "browser", format: "iife",
  globalName: "acheronProof", jsx: "automatic", logLevel: "silent",
  plugins: [{
    name: "compare-native-lens",
    setup(builder) {
      builder.onLoad({ filter: /HuntCanvas\.tsx$/ }, ({ path: file }) => file === runtimePath
        ? { contents: native, loader: "tsx", resolveDir: path.dirname(runtimePath) } : null);
      builder.onLoad({ filter: /\.css$/ }, () => ({ contents: "", loader: "empty" }));
    },
  }],
  define: { "process.env.NODE_ENV": '"production"' },
});
const output = process.env.ACHERON_FIELD_OUTPUT ?? "outputs/qa-acheron-field";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE ?? "/usr/bin/google-chrome", args: ["--no-sandbox"],
});
const report = {
  revision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  browser: browser.version(), errors: [], passed: false,
  scope: "Native Guardian decision, HuntCanvas framebuffer and Web Audio. Deliberate nearby battle setup with native weapon-signal inputs and fallback visuals, not a complete hunt.",
};
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 780 } });
  page.on("pageerror", error => report.errors.push(error.message));
  await page.setContent('<body style="margin:0;background:#090a11"><button type="button">Activer la combinaison</button><canvas></canvas></body>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.evaluate(() => {
    const r = window.acheronProof;
    const synth = new r.GameAudio();
    document.querySelector("button").addEventListener("click", async () => {
      await synth.unlock();
      document.body.dataset.audioReady = "true";
    });
    window.acheronSynth = synth;
  });
  await page.getByRole("button").click();
  await page.locator("body[data-audio-ready=true]").waitFor();
  report.checks = await page.evaluate(() => {
    const r = window.acheronProof;
    const synth = window.acheronSynth;
    const save = r.defaultSave("2026-11-28T00:00:00.000Z");
    const mission = r.MISSION_BY_ID["ruins-ancient-guardian"];
    const state = r.makeGameState(mission, save.loadout, save.inventory, "hunter", save.appearance,
      true, false, "acheron-field-proof", save.exploration);
    const boss = state.boss;
    boss.active = true;
    boss.y = state.world.floorY - boss.height;
    state.player.x = boss.x - 115;
    state.player.y = state.world.floorY - state.player.height;
    state.player.grounded = true;
    state.player.cloaked = false;
    state.player.maskOn = false;
    state.cameraX = boss.x + boss.width / 2 - 1000;
    state.screenShake = 0;
    const canvas = document.querySelector("canvas");
    canvas.width = r.VIEW_WIDTH;
    canvas.height = r.VIEW_HEIGHT;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const assets = r.nativeAssets();
    const revision = () => state.bossMechanics.guardianAdaptation;
    const tick = (seconds, shot = false) => {
      state.elapsed += seconds;
      state.scanPulse = 0.36;
      state.playerUsedEnergyWeapon = shot;
      state.playerUsedRangedWeapon = shot;
      r.updateBoss(state, mission, "hunter", seconds);
    };
    const paint = (hidden, reduced = false) => {
      window.hideLensForComparison = hidden;
      r.renderGame(context, state, mission, save.loadout, save.appearance, assets, 0, 1, reduced);
      return context.getImageData(0, 0, canvas.width, canvas.height).data;
    };
    const difference = (a, b, endX = canvas.width) => {
      let changed = 0;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < endX; x++) {
          const offset = (y * canvas.width + x) * 4;
          if (a[offset] !== b[offset] || a[offset + 1] !== b[offset + 1] || a[offset + 2] !== b[offset + 2]) changed++;
        }
      }
      return changed;
    };
    const warning = () => {
      for (let count = 0; count < r.GUARDIAN_ADAPTATION.energyUsesBeforeWarning; count++) tick(1 / 120, true);
      if (!(revision()?.warningSeconds > 0)) {
        throw Error("Native pressure did not arm the warning " + JSON.stringify(revision()));
      }
    };
    const sounds = () => state.soundEvents.splice(0).filter(id => id.startsWith("vacuum-field-"));
    warning();
    const warningPixels = difference(paint(true), paint(false));
    const warningAudio = sounds();
    state.player.cloaked = true;
    tick(1 / 120);
    const evasionAudio = sounds();
    const evaded = revision().warningSeconds === 0 && revision().fieldSeconds === 0;
    state.player.cloaked = false;
    warning();
    sounds();
    tick(r.GUARDIAN_ADAPTATION.warningSeconds + 0.04);
    const activeSeconds = revision().fieldSeconds;
    const activeAudio = sounds();
    const base = paint(true);
    const warped = paint(false);
    const activePixels = difference(base, warped);
    const outsidePixels = difference(base, warped, 135);
    const reducedPixels = difference(paint(true, true), paint(false, true));
    paint(false);
    const counts = [];
    const audio = AudioContext.prototype.createOscillator;
    let tones = 0;
    AudioContext.prototype.createOscillator = function (...args) {
      tones++;
      return audio.apply(this, args);
    };
    try {
      for (const id of [...warningAudio, ...evasionAudio, ...activeAudio]) {
        const before = tones;
        synth.playSfx(id);
        counts.push([id, tones - before]);
      }
      synth.setPaused(true);
      const before = tones;
      synth.playSfx("vacuum-field-warning");
      counts.push(["paused", tones - before]);
    } finally {
      AudioContext.prototype.createOscillator = audio;
      synth.dispose();
    }
    return { warningPixels, evaded, warningAudio, evasionAudio, activeAudio, activeSeconds, activePixels, outsidePixels, reducedPixels, counts };
  });
  assert.equal(report.checks.warningPixels, 0);
  assert.equal(report.checks.evaded, true);
  assert.deepEqual(report.checks.warningAudio, ["vacuum-field-warning"]);
  assert.deepEqual(report.checks.evasionAudio, ["vacuum-field-clear"]);
  assert.deepEqual(report.checks.activeAudio, ["vacuum-field-active"]);
  assert.ok(report.checks.activeSeconds > 4);
  assert.ok(report.checks.activePixels > 500, JSON.stringify(report.checks));
  assert.equal(report.checks.outsidePixels, 0);
  assert.equal(report.checks.reducedPixels, 0);
  assert.deepEqual(report.checks.counts.map(([, count]) => count), [2, 2, 2, 0]);
  assert.deepEqual(report.errors, []);
  await page.locator("canvas").screenshot({ path: path.join(output, "champ-actif.png") });
  report.passed = true;
} catch (error) {
  report.failure = String(error);
  throw error;
} finally {
  await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log("ACHERON_FIELD", JSON.stringify(report));
  await browser.close();
}
