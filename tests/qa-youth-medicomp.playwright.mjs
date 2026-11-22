import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const temporary = await mkdtemp(join(tmpdir(), "yautja-courtyard-"));
const assets = resolve("public");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".ogg": "audio/ogg" };
const html = '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/entry.css"><div id="root"></div><script src="/entry.js"></script></html>';
const server = createServer(async (request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  if (path === "/") {
    response.writeHead(200, { "Content-Type": types[".html"] }).end(html);
    return;
  }
  if (path === "/entry.js" || path === "/entry.css") {
    response.writeHead(200, { "Content-Type": types[extname(path)] }).end(await readFile(join(temporary, path.slice(1))));
    return;
  }
  const filepath = resolve(assets, "." + path);
  if (!filepath.startsWith(assets + sep) || !await stat(filepath).catch(() => null)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { "Content-Type": types[extname(filepath)] ?? "application/octet-stream" });
  createReadStream(filepath).pipe(response);
});
let browser;
try {
  await build({
    stdin: {
      contents: `
        import React from "react";
        import { createRoot } from "react-dom/client";
        import YouthTrainingScreen from "./app/game/YouthTrainingScreen";
        import { DEFAULT_CONTROL_BINDINGS } from "./app/game/systems/controlBindings";
        import * as api from "./app/game/systems/youthTraining";
        import type { YouthState, YouthInput } from "./app/game/systems/youthTraining";
        const dir = (n: number): -1 | 0 | 1 => Math.abs(n) < 8 ? 0 : n < 0 ? -1 : 1;
/** A physical keyboard-style player: it reads public positions and telegraphs, never writes the state. */
function play(s: YouthState): YouthInput {
    if (!s.inputArmed)
        return {};
    const a = s.player, r = s.rival, o = api.getYouthObjective(s), d = o.targetX === null ? 0 : o.targetX - a.x;
    if (s.phase === 'dojo-move')
        return { move: dir(d) };
    if (s.phase === 'dojo-jump' || s.phase === 'camp-run') {
        const move = dir(d);
        const obstacles = api.getYouthObstacles(s);
        const ahead = obstacles.find(b => move === 1 ? b.x > a.x && b.x - a.x < 65 : b.x + b.width < a.x && a.x - b.x - b.width < 65);
        return { move, jump: !!ahead && a.vy === 0 && !s.previousButtons.jump };
    }
    if (s.phase === 'dojo-dodge') {
        if (r.action === 'jab' && r.actionTick >= 24 && r.actionTick < 32 && a.action === 'idle')
            return { dodge: true, move: -1 };
        return { move: Math.abs(r.x - a.x) > 68 ? dir(r.x - a.x) : 0 };
    }
    if (s.phase === 'dojo-strike' || s.phase === 'dojo-throw' || s.phase === 'camp-duel') {
        const throwMove = s.phase === 'dojo-throw', range = throwMove ? 46 : 59, move = Math.abs(r.x - a.x) > range ? dir(r.x - a.x) : a.facing !== (r.x < a.x ? -1 : 1) ? dir(r.x - a.x) : 0;
        if (a.action === 'idle' && Math.abs(r.x - a.x) <= range && a.facing === (r.x < a.x ? -1 : 1))
            return throwMove ? { throw: !s.previousButtons.throw } : { light: !s.previousButtons.light };
        return { move };
    }
    if (s.phase === 'blade-award' || s.phase === 'armory' || s.phase === 'barracks')
        return { move: Math.abs(d) > 35 ? dir(d) : 0, interact: Math.abs(d) <= 35 && !s.previousButtons.interact, choice: s.phase === 'armory' ? 'rust' : undefined };
    return {};
}

        let checkpoint = JSON.parse(localStorage.getItem("medicomp-archive") ?? "null");
        if (!checkpoint) {
          checkpoint = api.createYouthTraining();
          const env = { assetsReady: true, pageVisible: true, paused: false };
          for (let tick = 0; tick < 20000 && checkpoint.phase !== "barracks"; tick++) {
            checkpoint = api.stepYouthTraining(checkpoint, play(checkpoint), env).state;
          }
          if (checkpoint.phase !== "barracks") throw Error("Baraquements introuvables");
        }
        const persist = state => {
          localStorage.setItem("medicomp-archive", JSON.stringify(state));
          return true;
        };
        createRoot(document.getElementById("root")).render(<YouthTrainingScreen
          checkpoint={checkpoint} bindings={DEFAULT_CONTROL_BINDINGS} reducedMotion soundEnabled={false}
          onCheckpoint={persist} onProgress={(_, state) => Promise.resolve(persist(state))} onExit={() => {}}
        />);
      `,
      sourcefile: "entry.tsx",
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    jsx: "automatic",
    outdir: temporary,
    entryNames: "entry",
    loader: { ".module.css": "local-css" },
    logLevel: "silent",
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const base = `http://127.0.0.1:${server.address().port}`;
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base);
  const canvas = page.locator("canvas[data-youth-stage]");
  const position = async () => Number((await canvas.getAttribute("data-youth-positions")).split(",")[0]);
  await page.waitForFunction(() => document.querySelector("canvas[data-youth-stage]")?.dataset.youthAssets === "true");
  assert.equal(await canvas.getAttribute("data-youth-phase"), "barracks");
  async function walk(target) {
    await canvas.focus();
    const key = await position() <= target ? "ArrowRight" : "ArrowLeft";
    await page.keyboard.down(key);
    await page.waitForFunction(want => Math.abs(Number(document.querySelector("canvas[data-youth-stage]").dataset.youthPositions.split(",")[0]) - want) <= 10, target);
    await page.keyboard.up(key);
  }
  const interact = () => page.keyboard.press("h", { delay: 110 });
  const stage = want => page.waitForFunction(desired => {
    const data = document.querySelector("canvas[data-youth-stage]")?.dataset.youthMedicomp;
    return data && JSON.parse(data).stage === desired;
  }, want);
  await walk(334); await interact(); await stage("cover");
  await walk(753); await interact(); await stage("ready");
  await walk(844); await interact(); await stage("alert");
  await page.screenshot({ path: "medicomp-alerte.png" });
  await page.reload();
  await page.waitForFunction(() => document.querySelector("canvas[data-youth-stage]")?.dataset.youthAssets === "true");
  await stage("alert");
  await walk(490); await interact(); await stage("resume");
  await walk(844); await interact(); await stage("complete");
  await page.screenshot({ path: "medicomp-accompli.png" });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("medicomp-archive")));
  assert.equal(saved.medicompV172.stage, "complete");
  assert.equal(saved.medicompV172.route, "reactive");
  assert.equal(saved.medicompV172.treatedTicks, 96);
  await walk(680); await interact();
  await page.waitForFunction(() => document.querySelector("canvas[data-youth-stage]").dataset.youthPhase === "rest");
  assert.deepEqual(errors, []);
  console.log("R2-M013: atelier, charge, alerte, rechargement préservé, sortie, soin et repos dans Chrome.");
} finally {
  await browser?.close();
  server.close();
  await rm(temporary, { recursive: true, force: true });
}
