import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const output = process.env.V67_TRANSLATION_QA_OUTPUT ?? "work-local/v67/qa/translation";
await fs.mkdir(output, { recursive: true });
const source = "import React, { useState } from \"react\";\nimport { createRoot } from \"react-dom/client\";\nimport Translation from \"./app/game/YautjaTranslationV67\";\nimport Glossary from \"./app/game/YautjaGlossaryV147\";\n\nfunction App() {\n  const [text, setText] = useState(\"Xénomorphe repéré près de l’aire d’entraînement.\");\n  const [paused, setPaused] = useState(false);\n  return <>\n    <p id=\"reading\"><Translation text={text} paused={paused} /></p>\n    <button id=\"next\" type=\"button\" onClick={() => setText(\"Le moteur est prêt. Rejoins les balises.\")}>Suite</button>\n    <button id=\"line\" type=\"button\" onClick={() => setText(\"« Je ne suis la proie de personne. »\")}>Réplique de Badlands</button>\n    <button id=\"pause\" type=\"button\" onClick={() => setPaused(value => !value)}>Pause</button>\n    <Glossary />\n  </>;\n}\ncreateRoot(document.getElementById(\"app\")).render(<App />);";
const bundle = await build({
  stdin: { contents: source, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outfile: path.resolve(output, "bundle.js"),
  jsx: "automatic",
  logLevel: "silent",
});
const files = new Map(bundle.outputFiles.map(file => ["/" + path.basename(file.path), file.contents]));
const html = '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/bundle.css"><style>body{background:#162022;color:#ebe6dc;font:17px/1.5 system-ui}main{max-width:780px;margin:auto;padding:10px}button{min-height:42px;margin:4px}</style><main id="app"></main><script src="/bundle.js"></script></html>';
const server = http.createServer((req, res) => {
  const value = files.get(req.url);
  res.setHeader("Content-Type", req.url?.endsWith(".css") ? "text/css" : value ? "application/javascript" : "text/html");
  res.end(value ?? html);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
let page;
const checks = [];
const captures = [];
const errors = [];
const shot = async name => {
  const file = path.join(output, name + ".png");
  await page.screenshot({ path: file });
  captures.push(file);
};
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://127.0.0.1:" + server.address().port);
  const reading = page.locator("#reading [data-yautja-translation-v67]");
  await reading.waitFor();
  assert.equal(await reading.locator('[lang="fr"]').textContent(), "Xénomorphe repéré près de l’aire d’entraînement.");
  assert.deepEqual(await reading.locator('[lang="x-yautja"]').allTextContents(), ["Kainde Amedha", "Kehrite"]);
  assert.equal(await reading.locator("svg, button").count(), 0);
  await shot("01-lecture-et-codex");
  checks.push("Le français est visible au montage et deux notions classiques ont les lectures prévues.");

  await page.locator("#pause").click();
  assert.equal(await reading.getAttribute("data-translation-paused"), "true");
  assert.equal(await reading.getAttribute("data-translation-complete"), "true");
  await page.locator("#next").click();
  assert.equal(await reading.locator('[lang="fr"]').textContent(), "Le moteur est prêt. Rejoins les balises.");
  assert.equal(await reading.locator('[lang="x-yautja"], svg').count(), 0);
  assert.equal(await page.locator(":focus").getAttribute("id"), "next");
  checks.push("Le texte inconnu garde son français à la pause. La commande reste focusable.");

  await page.setViewportSize({ width: 320, height: 780 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#line").click();
  assert.equal(await reading.locator("[data-yautja-reading]").getAttribute("data-yautja-reading"), "line");
  assert.equal(await reading.locator('[lang="x-yautja"]').textContent(), "Ngu djei chish");
  assert.equal(await reading.locator('[lang="x-yautja"]').getAttribute("data-yautja-evidence"), "screen-transcription");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  const search = page.getByRole("searchbox", { name: "Rechercher un mot ou un sens" });
  await search.fill("mepris");
  const result = page.locator('li[data-yautja-evidence="creator"]');
  assert.equal(await result.count(), 1);
  assert.equal(await result.locator('[lang="x-yautja"]').textContent(), "wul");
  await shot("02-lecture-mobile-et-recherche");
  checks.push("À 320 px, la transcription et la recherche accentuée restent lisibles avec mouvement réduit.");
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify({ status: "PASS", checks, captures, errors }, null, 2));
  console.log(JSON.stringify({ status: "PASS", checks: checks.length, output }));
} catch (error) {
  await page?.screenshot({ path: path.join(output, "failure.png") }).catch(() => {});
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify({ status: "FAIL", error: error.stack, checks, captures, errors }, null, 2));
  throw error;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
