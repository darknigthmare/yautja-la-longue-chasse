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

        let checkpoint = JSON.parse(localStorage.getItem("workshop-archive") ?? "null");
        if (!checkpoint) {
          checkpoint = api.createYouthTraining();
          const env = { assetsReady: true, pageVisible: true, paused: false };
          for (let tick = 0; tick < 20000 && checkpoint.phase !== "barracks"; tick++) {
            checkpoint = api.stepYouthTraining(checkpoint, play(checkpoint), env).state;
          }
          if (checkpoint.phase !== "barracks") throw Error("Baraquements introuvables");
          const assert = {
  ok(value: unknown, message = "checkpoint attendu") { if (!value) throw Error(message); },
  equal(actual: unknown, expected: unknown) { if (actual !== expected) throw Error(JSON.stringify({actual, expected})); },
  deepEqual(actual: unknown, expected: unknown) { this.equal(JSON.stringify(actual), JSON.stringify(expected)); },
};
const tick = (state: YouthState, input: YouthInput) => api.stepYouthTraining(state, input, env).state;
          
    let s: YouthState = checkpoint;
    const run = (input: YouthInput = {}) => {
        s = tick(s, input);
        assert.ok(api.normalizeYouthTraining(s), 'replayable checkpoint at ' + JSON.stringify(s.workshopV174?.active));
    };
    const wait = (frames: number) => { for (let frame = 0; frame < frames; frame++) run(); };
    const act = (input: YouthInput) => { run(); run(input); run(); };
    const walk = (target: number, { jump = true, quiet = false } = {}) => {
        run();
        for (let frame = 0; frame < 700 && (Math.abs(s.player.x - target) > 5 || s.player.y < 429); frame++) {
            const move = Math.abs(s.player.x - target) <= 5 ? 0 : target < s.player.x ? -1 : 1;
            const hurdle = jump && api.getYouthObstacles(s).some(item => move === 1
                ? item.x - s.player.x >= 20 && item.x - s.player.x < 59
                : move === -1 && s.player.x - item.x - item.width >= 20 && s.player.x - item.x - item.width < 59);
            run({ move, jump: hurdle && s.player.vy === 0 && !s.previousButtons.jump, dodge: quiet });
        }
        assert.ok(Math.abs(s.player.x - target) <= 6 && s.player.y === 430, 'reachable ' + target + ' from ' + s.player.x);
        run();
    };
    const state = () => {
        const active = s.workshopV174?.active;
        assert.ok(active);
        return active;
    };
    const restore = () => {
        const saved = JSON.parse(JSON.stringify(s));
        const restored = api.normalizeYouthTraining(saved);
        assert.ok(restored);
        assert.deepEqual(restored.workshopV174, s.workshopV174);
        s = restored;
        const before = s.tick;
        run({ interact: true });
        assert.equal(s.tick, before);
        run();
    };
    const open = (lesson: number) => {
        walk(112);
        act({ interact: true });
        assert.equal(state().lesson, lesson);
    };
    const report = (reports: number) => {
        walk(844);
        act({ interact: true });
        assert.equal(s.workshopV174?.reports.length, reports);
        assert.equal(s.workshopV174.active, null);
        restore();
    };

    // M007: fit, choose contrast, miss a moving target, recalibrate and read four real stations.
    open(0); walk(196); act({ interact: true }); act({ light: true }); walk(315); act({ interact: true });
    wait(15); act({ interact: true });
    assert.equal(state().notice, 'calibration');
    restore();
    act({ interact: true }); act({ interact: true }); assert.equal(state().stage, 3);
    for (const x of [384, 503, 624, 746]) { walk(x); act({ interact: true }); }
    walk(844); act({ blade: true }); assert.equal(state().notice, 'certainty');
    act({ light: true }); report(1);
    act({ blade: true }); assert.equal(s.workshopV174?.maskProfile, 'wide');

    // M008: right distance, telegraphed counter, physical barrier while blades are extended.
    open(1); act({ blade: true }); act({ light: true }); assert.equal(state().notice, 'reach');
    walk(484); act({ light: true }); wait(9); act({ dodge: true }); assert.equal(state().route, 'parry');
    for (let frame = 0; frame < 95; frame++) run({ move: 1 });
    assert.equal(s.player.x, 671); assert.equal(state().stage, 3);
    act({ blade: true }); walk(789); report(2);


          checkpoint = s;
        }
        const persist = state => {
          localStorage.setItem("workshop-archive", JSON.stringify(state));
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
    const initial = await position();
    if (Math.abs(initial - target) <= 10) return;
    const forward = initial < target;
    const key = forward ? "ArrowRight" : "ArrowLeft";
    await page.keyboard.down(key);
    try {
      await page.waitForFunction(({ want, forward }) => {
        const x = Number(document.querySelector("canvas[data-youth-stage]").dataset.youthPositions.split(",")[0]);
        return forward ? x >= want - 8 : x <= want + 8;
      }, { want: target, forward }, { timeout: 8000 });
    } finally {
      await page.keyboard.up(key);
    }
  }
  const press = async key => {
    await page.keyboard.press(key, { delay: 82 });
    await page.waitForTimeout(46);
  };
  const interact = () => press("h");
  const state = () => canvas.evaluate(node => JSON.parse(node.dataset.youthWorkshop || "null"));
  const waitState = (lesson, stage) => page.waitForFunction(({l,s}) => {
    const a = JSON.parse(document.querySelector("canvas[data-youth-stage]")?.dataset.youthWorkshop || "null")?.active;
    return a?.lesson === l && a?.stage === s;
  }, {l: lesson, s: stage});
  const ready = () => page.waitForFunction(() => document.querySelector("canvas[data-youth-stage]")?.dataset.youthArmed === "true");
  const getOut = async count => {
    await walk(844);
    await interact();
    await page.waitForFunction(n => {
      const w = JSON.parse(document.querySelector("canvas[data-youth-stage]")?.dataset.youthWorkshop || "null");
      return w?.active === null && w?.reports.length === n;
    }, count);
  };
  await ready();
  await walk(112); await interact(); await waitState(2, 0);
  await press("k"); await walk(430); await waitState(2, 1);
  assert.equal((await state()).active.notice, "water");
  await page.screenshot({ path: "youth-workshop-cloak-trail.png" });
  await page.reload();
  await page.waitForFunction(() => document.querySelector("canvas[data-youth-stage]")?.dataset.youthAssets === "true");
  await ready(); await waitState(2, 1);
  await walk(464); await interact(); await waitState(2, 2);
  await walk(527); await interact(); await waitState(2, 3);
  await page.waitForFunction(() => {
    const c = document.querySelector("canvas[data-youth-stage]");
    const a = JSON.parse(c.dataset.youthWorkshop)?.active;
    return a?.stage === 3 && Number(c.dataset.youthTick) - a.stageAt >= 43;
  });
  await page.keyboard.down("u");
  await walk(793);
  await page.keyboard.up("u");
  await waitState(2, 4); await getOut(3);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("workshop-archive")));
  assert.deepEqual(saved.workshopV174.reports.map(r => r.route), ["contrast", "parry", "wait"]);
  assert.deepEqual(errors, []);
  console.log("R2-M009: l’eau révèle le joueur, reprise au couvert, trace lue sur l’écran, attente et déplacement discret, rapport conservé après vraie recharge.");
} finally {
  await browser?.close();
  server.close();
  await rm(temporary, { recursive: true, force: true });
}
