import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const temporary = await mkdtemp(join(tmpdir(), "yautja-opening-"));
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
        import NurseryPrologueScreen from "./app/game/NurseryPrologueScreen";
        import { DEFAULT_CONTROL_BINDINGS } from "./app/game/systems/controlBindings";
        const checkpoint = JSON.parse(localStorage.getItem("opening-archive") ?? "null");
        const persist = state => {
          localStorage.setItem("opening-archive", JSON.stringify(state));
          return true;
        };
        createRoot(document.getElementById("root")).render(<NurseryPrologueScreen
          checkpoint={checkpoint} bindings={DEFAULT_CONTROL_BINDINGS} readyMode="press" nextChapterReady reducedMotion
          soundEnabled={false} onCheckpoint={persist} onComplete={(_, state) => Promise.resolve(persist(state))} onExit={() => {}}
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
  const canvas = page.locator("canvas");
  const interact = page.locator("[data-nursery-opening-interact]");
  async function waitStage(stage) {
    await page.waitForFunction(want => document.querySelector("canvas")?.dataset.nurseryOpening === want, stage);
  }
  async function ready() {
    await page.bringToFront();
    await page.waitForFunction(() => document.querySelector("canvas")?.dataset.nurseryAssets === "true");
    await canvas.focus();
    const tick = Number(await canvas.getAttribute("data-nursery-tick"));
    await page.waitForFunction(before => Number(document.querySelector("canvas").dataset.nurseryTick) >= before + 6, tick);
  }
  async function walk(target) {
    await canvas.focus();
    const current = Number(await canvas.getAttribute("data-nursery-opening-x"));
    if (Math.abs(current - target) <= 9) return;
    const key = current <= target ? "ArrowRight" : "ArrowLeft";
    await page.keyboard.down(key);
    try {
      await page.waitForFunction(want => Math.abs(Number(document.querySelector("canvas").dataset.nurseryOpeningX) - want) <= 9, target);
    } finally {
      await page.keyboard.up(key);
    }
  }
  await ready();
  await page.getByRole("button", { name: "Passer le contexte · garder les consignes" }).click();
  await page.getByRole("button", { name: "Rejoindre Saar dans la cour" }).click();
  await waitStage("tool");
  await walk(360);
  await interact.click();
  await waitStage("cover");
  await walk(246);
  await interact.click();
  await waitStage("tactic");
  await page.screenshot({ path: "opening-before-reload.png" });
  await page.reload();
  await ready();
  assert.equal(await canvas.getAttribute("data-nursery-opening"), "tactic");

  await walk(415);
  await page.getByRole("button", { name: "Déposer l’appât" }).click();
  await waitStage("drive");
  assert.equal(await canvas.getAttribute("data-nursery-opening-tactic"), "bait");
  for (const [index, target] of [538, 605, 672].entries()) {
    await walk(target);
    await page.getByRole("button", { name: "Repousser la charge" }).click({ timeout: 3500 });
    await page.waitForFunction(pushes => document.querySelector("canvas").dataset.nurseryOpeningPushes === pushes, String(index + 1));
  }
  await waitStage("resolved");
  await page.screenshot({ path: "opening-net-captured.png" });
  await page.getByRole("button", { name: "Poursuivre l’entraînement" }).click();
  await page.waitForFunction(() => document.querySelector("canvas").dataset.nurseryPhase === "ready");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("opening-archive")));
  assert.equal(saved.opening.openingResolved, true);
  assert.equal(saved.opening.openingSuccess, true);
  assert.equal(saved.opening.tactic, "bait");
  assert.equal(saved.winner, null);
  assert.equal(saved.duelStartedAt, null);
  assert.deepEqual(errors, []);
  console.log("R2-M001: entrée fraîche, loquet, outil, Tov, reprise, appât, trois poussées, filet et passage au duel confirmés dans Chrome.");
} finally {
      await page.keyboard.up(key);
    }
  }
  const step = async (x, ordinal) => {
    await walk(x);
    await page.locator("[data-nursery-cohort-interact]").click();
    await page.waitForFunction(want => document.querySelector("canvas").dataset.nurseryCohort === want, String(ordinal));
  };
  await step(162, 1);
  await step(278, 2);
  await page.screenshot({ path: "cour-before-reload.png" });
  await page.reload();
  await ready();
  assert.equal(await canvas.getAttribute("data-nursery-cohort"), "2");
  await step(394, 3);
  await step(510, 4);
  await step(626, 5);
  await step(741, 6);
  await walk(510);
  await page.getByRole("button", { name: "Aider Yena à ranger les cordes" }).click();
  await page.waitForFunction(() => document.querySelector("canvas").dataset.nurseryCohortChoice === "help");
  await page.screenshot({ path: "cour-yena-rangement.png" });
  await walk(857);
  await page.getByRole("button", { name: "Rendre l’outil et rejoindre le passage" }).click();
  await page.waitForFunction(() => document.querySelector("canvas").dataset.nurseryPhase === "walkout");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("opening-archive")));
  assert.equal(saved.cohortV172.steps, 7);
  assert.equal(saved.cohortV172.choice, "help");
  assert.deepEqual(errors, []);
  console.log("R2-M002: atlas décodés, marche, barrière, rechargement, cohorte, choix de Yena et sortie confirmés dans Chrome.");
} finally {
  await browser?.close();
  server.close();
  await rm(temporary, { recursive: true, force: true });
}
