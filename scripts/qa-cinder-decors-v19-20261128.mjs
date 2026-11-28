#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import sharp from "sharp";

const batch = "art-source/v19/biome-decor/batches/2026-08-31-volcano-01/manifest.json";
const manifest = JSON.parse(await readFile(batch, "utf8"));
const assets = await Promise.all(
  ["fallen-hunter-marker-01-single", "profaned-trophy-rack-04-fallen"].map(async (stem) => {
    const entry = manifest.assets.find(({ id }) => id.endsWith(stem));
    assert.ok(entry, stem);
    const files = {};
    let runtime;
    for (const name of ["source", "master", "runtime"]) {
      const receipt = entry[name];
      const raw = await readFile(receipt.path);
      assert.deepEqual(raw, execFileSync("git", ["show", "HEAD:" + receipt.path], { maxBuffer: 4 * 1024 * 1024 }));
      const sha256 = createHash("sha256").update(raw).digest("hex");
      assert.equal(sha256, receipt.sha256, receipt.path);
      const decoded = await sharp(raw).metadata();
      assert.equal(decoded.format, name === "source" ? "png" : "webp");
      files[name] = { ...receipt, width: decoded.width, height: decoded.height };
      if (name !== "runtime") continue;
      assert.equal(decoded.hasAlpha, true);
      const { data, info } = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let transparent = 0;
      let solid = 0;
      for (let i = 3; i < data.length; i += info.channels) {
        if (data[i] === 0) transparent++;
        if (data[i] >= 220) solid++;
      }
      assert.ok(Math.min(transparent, solid) > decoded.width * decoded.height * 0.02, receipt.path);
      Object.assign(files.runtime, { transparent, solid });
      runtime = "data:image/webp;base64," + raw.toString("base64");
    }
    return { id: entry.id, files, runtime, url: "/" + entry.runtime.path.slice("public/".length) };
  }),
);

const huntPath = path.resolve("app/game/HuntCanvas.tsx");
const source = await readFile(huntPath, "utf8");
const start = "    const assets: AssetBank = {";
assert.equal(source.split(start).length, 2);
const initialAssets = source.split(start)[1].split("\n    };")[0];
const fixture = source + "\nexport { makeGameState, renderGame, playerScan, VIEW_WIDTH, VIEW_HEIGHT };\n" +
  "export function decorationQaAssets(): AssetBank { return {" + initialAssets + "\n}; }\n";
const entry = [
  'export { makeGameState, renderGame, playerScan, VIEW_WIDTH, VIEW_HEIGHT, decorationQaAssets } from "./app/game/HuntCanvas";',
  'export { environmentDecorPlacementsForSector } from "./app/game/environmentPropRegistry";',
  'export { defaultSave } from "./app/game/save";',
  'export { MISSION_BY_ID } from "./app/game/data";',
].join("\n");
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "ts" },
  write: false, bundle: true, format: "iife", platform: "browser", jsx: "automatic",
  globalName: "cinderDecorProof",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{
    name: "expose-native-render-and-scan",
    setup(builder) {
      builder.onLoad({ filter: /HuntCanvas\.tsx$/ }, ({ path: filename }) =>
        filename === huntPath ? { contents: fixture, loader: "tsx", resolveDir: path.dirname(filename) } : null);
      builder.onLoad({ filter: /\.css$/ }, () => ({ contents: "", loader: "empty" }));
    },
  }],
});
const out = process.env.CINDER_DECOR_QA_OUTPUT ?? "outputs/qa-cinder-decors-v19-20261128";
await mkdir(out, { recursive: true });
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  batch, assets: assets.map(({ id, files, url }) => ({ id, files, url })), cases: [], captures: [],
  scope: "Original tracked source, chroma master and WebP bytes. Production HuntCanvas renders and scans authored positions using exact Cinder images. Scenic camera placement and unloaded fallback for surrounding art.",
};
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE ?? "/usr/bin/google-chrome", headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  report.chromium = browser.version();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on("pageerror", error => { (report.pageErrors ??= []).push(error.message); });
  await page.setContent('<body style="margin:0"><canvas id="hunt"></canvas></body>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.evaluate(async (inputs) => {
    const r = window.cinderDecorProof;
    const mission = r.MISSION_BY_ID["volcano-bad-blood"];
    const save = r.defaultSave("2026-11-28T00:00:00.000Z");
    const game = r.makeGameState(mission, save.loadout, save.inventory, "hunter", save.appearance, true,
      false, "v19-cinder-objectives", save.exploration);
    const canvas = document.getElementById("hunt");
    canvas.width = r.VIEW_WIDTH;
    canvas.height = r.VIEW_HEIGHT;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const [marker, rack] = inputs;
    const bank = r.decorationQaAssets();
    const pictures = new Map();
    for (const asset of inputs) {
      const image = new Image();
      image.src = asset.runtime;
      await image.decode();
      pictures.set(asset.url, image);
      bank.environmentProps[asset.url] = image;
    }
    const rackPlacement = r.environmentDecorPlacementsForSector(mission.id, "volcano-sanctum", "world-back")
      .find(({ asset }) => asset.id === rack.id);
    if (!rackPlacement) throw Error("Missing authored rack placement");
    const draws = [];
    const original = ctx.drawImage;
    ctx.drawImage = function (image, ...args) {
      const entry = inputs.find(item => pictures.get(item.url) === image);
      if (entry) draws.push({ id: entry.id, args: args.slice(-4), transform: this.getTransform().toJSON() });
      return original.call(this, image, ...args);
    };
    const paint = () => {
      draws.length = 0;
      r.renderGame(ctx, game, mission, save.loadout, save.appearance, bank, 0, 1, false);
    };
    const renderAt = (x, art) => {
      game.cameraX = Math.max(0, x - canvas.width / 2);
      game.player.x = x - game.player.width / 2 - 92;
      game.player.y = game.world.floorY - game.player.height;
      paint();
      const rendered = draws.filter(({ id }) => id === art.id);
      if (rendered.length !== 1) throw Error("Expected one visible " + art.id + ": " + JSON.stringify(rendered));
      const draw = rendered[0];
      const [localX, localY, naturalWidth, naturalHeight] = draw.args;
      const sx = localX + draw.transform.e;
      const sy = localY + draw.transform.f;
      const crop = [
        Math.max(0, Math.floor(sx)), Math.max(0, Math.floor(sy)),
        Math.ceil(naturalWidth), Math.ceil(naturalHeight),
      ];
      const expected = ctx.getImageData(...crop).data;
      delete bank.environmentProps[art.url];
      paint();
      const hidden = ctx.getImageData(...crop).data;
      bank.environmentProps[art.url] = pictures.get(art.url);
      paint();
      let paintedPixels = 0;
      for (let i = 0; i < expected.length; i += 4) {
        if (expected[i] !== hidden[i] || expected[i + 1] !== hidden[i + 1] || expected[i + 2] !== hidden[i + 2]) paintedPixels++;
      }
      return { draw, centerX: sx + naturalWidth / 2 + game.cameraX, floor: sy + naturalHeight, paintedPixels };
    };
    window.cinderPaintTrace = (index, scan) => {
      const node = game.scanNodes[index];
      const observed = renderAt(node.x, marker);
      const snapshot = () => ({ scanned: node.scanned, traces: game.scanNodes.filter(item => item.scanned).map(item => item.id), energy: game.player.energy });
      const before = snapshot();
      if (scan) {
        game.player.scanCooldown = 0;
        r.playerScan(game, mission);
        paint();
      }
      return { ...observed, id: node.id, x: node.x, y: node.y, before,
        after: snapshot(),
        stillDrawn: draws.some(({ id }) => id === marker.id) };
    };
    window.cinderPaintSanctum = () => ({
      ...renderAt(rackPlacement.x, rack),
      x: rackPlacement.x,
      authoredFloor: game.world.floorY,
      screenId: rackPlacement.screenId,
    });
  }, assets);
  const capture = async (filename) => {
    await page.locator("#hunt").screenshot({ path: path.join(out, filename) });
    report.captures.push(filename);
  };
  for (let index = 0; index < 3; index++) {
    const initial = await page.evaluate(i => window.cinderPaintTrace(i, false), index);
    assert.equal(initial.before.scanned, false);
    assert.ok(Math.abs(initial.centerX - initial.x) < 1, JSON.stringify(initial));
    assert.ok(initial.paintedPixels > 200, JSON.stringify(initial));
    await capture(initial.id + "-before.png");
    const result = await page.evaluate(i => window.cinderPaintTrace(i, true), index);
    assert.equal(result.after.scanned, true);
    assert.deepEqual(result.after.traces, [...result.before.traces, result.id]);
    assert.equal(result.before.energy - result.after.energy, 8);
    assert.equal(result.stillDrawn, true);
    await capture(result.id + "-scanned.png");
    report.cases.push(result);
  }
  const sanctum = await page.evaluate(() => window.cinderPaintSanctum());
  assert.equal(sanctum.screenId, "volcano-sanctum");
  assert.ok(Math.abs(sanctum.centerX - sanctum.x) < 1);
  assert.ok(Math.abs(sanctum.floor - sanctum.authoredFloor) < 1);
  assert.ok(sanctum.paintedPixels > 200);
  await capture("sanctuaire-profaned.png");
  report.cases.push(sanctum);
  assert.equal(report.pageErrors?.length ?? 0, 0);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.message;
  throw error;
} finally {
  await writeFile(path.join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
  await browser.close();
}
