import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const root = process.cwd();
const fixtures = await readFile("tests/elite-recognition-v174.test.mjs", "utf8");
const end = fixtures.indexOf("\nfunction command(");
assert(end >= 0);
const fixturePath = path.join(root, "tests", ".qa-m043-admission.mjs");
let admission;
await writeFile(fixturePath, fixtures.slice(0, end) + "\nexport default admission;\n");
try { admission = (await import(pathToFileURL(fixturePath).href)).default; }
finally { await unlink(fixturePath); }
const entry = [
  'import React, { useState } from "react";',
  'import { createRoot } from "react-dom/client";',
  'import EliteRecognition from "./app/game/EliteRecognition";',
  'import { commitEliteRecognition } from "./app/game/systems/eliteRecognitionV174";',
  'const admission = ' + JSON.stringify(admission) + ';',
  'function App() {',
  '  const [save, setSave] = useState(() => JSON.parse(localStorage.getItem("eliteFixture") || "null") || admission);',
  '  function onCommand(command) {',
  '    const result = commitEliteRecognition(save, command);',
  '    if (result.ok) {',
  '      const next = { ...save, eliteRecognitionV174: result.state };',
  '      localStorage.setItem("eliteFixture", JSON.stringify(next));',
  '      setSave(next);',
  '    }',
  '    return result;',
  '  }',
  '  return <EliteRecognition save={save} onCommand={onCommand} onClose={() => {}} />;',
  '}',
  'createRoot(document.getElementById("root")).render(<App />);',
].join("\n");
const bundle = await build({ stdin: { contents: entry, resolveDir: root, loader: "tsx" },
  bundle: true, write: false, format: "iife", outfile: "m043.js", platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' }, loader: { ".module.css": "local-css" },
  jsx: "automatic",
});
const files = {
  "/m043.js": ["text/javascript", bundle.outputFiles.find(file => file.path.endsWith(".js")).contents],
  "/m043.css": ["text/css", bundle.outputFiles.find(file => file.path.endsWith(".css")).contents],
};
const server = createServer((request, response) => {
  if (request.url === "/") {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end('<!doctype html><html lang="fr"><meta charset="utf-8"><link rel="stylesheet" href="/m043.css"><div id="root"></div><script src="/m043.js"></script>');
    return;
  }
  const file = files[request.url];
  if (!file) { response.statusCode = 404; response.end(); return; }
  response.setHeader("content-type", file[0]); response.end(file[1]);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
  const out = "outputs/qa-m043-preparation-20261127";
  await mkdir(out, { recursive: true });
  const results = [];
  for (const audience of ["public", "restricted"]) {
    const viewport = audience === "public" ? { width: 1000, height: 760 } : { width: 390, height: 820 };
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    await page.goto("http://127.0.0.1:" + server.address().port);
    const board = page.locator("[data-elite-recognition-board]");
    const press = async (...keys) => {
      await board.focus();
      for (const key of keys) await page.keyboard.press("Arrow" + key);
    };
    const present = proof => page.locator('[data-elite-present="' + proof + '"]').click();
    await page.locator('[data-elite-audience="' + audience + '"]').click();
    await press("Up");
    await present("mastery");
    await page.reload();
    await board.waitFor();
    assert.equal(await page.locator("[data-elite-audience]").count(), 0, "Audience persisted");
    await press("Up", "Left", "Up");
    await present("crown");
    await press("Right", "Right");
    await present("hunt");
    await press("Up");
    if (audience === "public") await press("Left", "Left");
    await press("Up");
    assert.equal(await page.locator("[data-elite-mark]").count(), 0, "The witness precedes the gesture");
    await page.locator("[data-elite-witness]").click();
    await press("Down", audience === "public" ? "Right" : "Left");
    await page.locator("[data-elite-mark]").click();
    await page.locator("[data-elite-recognition-receipt]").waitFor();
    const archive = await page.evaluate(() => JSON.parse(localStorage.getItem("eliteFixture")));
    assert.equal(archive.eliteRecognitionV174.prepared, true);
    assert.equal(archive.eliteRecognitionV174.audience, audience);
    assert.equal(archive.eliteRecognitionV174.revision, 6);
    assert.deepEqual(archive.profile, admission.profile);
    assert.deepEqual(archive.prologue, admission.prologue);
    await page.screenshot({ path: path.join(out, audience + ".png"), fullPage: true });
    assert.deepEqual(errors, []);
    results.push({ audience, viewport, receipt: archive.eliteRecognitionV174, profileUnchanged: true });
    await context.close();
  }
  const report = { scope: "Composant de salle réel et réducteur de production. Harnais localStorage de recette, hors GameClient.",
    sha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), results };
  await writeFile(path.join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ passed: results.length, cases: results.map(x => x.audience) }));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
