import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";

// Exercise the real component and CSS in an isolated fixture; no game assets,
// saved campaigns, production routes or application state need to be modified.
const root = process.cwd();
const output = path.resolve(process.env.YAUTJA_ATLAS_MATERIAL_QA_OUTPUT ?? "outputs/qa-planet-material-v101");
await fs.mkdir(output, { recursive: true });
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "yautja-atlas-v101-"));
const bundled = await build({
  stdin: {
    contents: `import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Atlas from "./app/game/ClanWarAtlasV95";
import { createWarSimulationV85 } from "./app/game/systems/clanWarV85";
import { warPlanetV96 } from "./app/game/systems/clanWarPlanetsV96";
function Fixture() {
  const [simulation] = useState(() => createWarSimulationV85(undefined, "korthas"));
  const [selected, setSelected] = useState("CON-T02");
  const [target, setTarget] = useState("CON-T03");
  const planet = warPlanetV96("korthas");
  useEffect(() => { window.__atlasMaterialQa = { selected, target, neighbors: planet.definitions.find(item => item.id === selected).neighbors }; }, [selected, target, planet]);
  return <Atlas simulation={simulation} selectedTerritoryId={selected} targetTerritoryId={target} onSelectTerritory={setSelected} onSelectTarget={setTarget}/>;
}
createRoot(document.getElementById("atlas-root")).render(<Fixture/>);`,
    resolveDir: root, sourcefile: "atlas-materials-qa.tsx", loader: "tsx",
  },
  outfile: path.join(temporary, "atlas.js"), bundle: true, write: false,
  format: "iife", jsx: "automatic", loader: { ".css": "local-css" },
  define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent",
});
const bundles = new Map(bundled.outputFiles.map(file => [`/${path.basename(file.path)}`, file.contents]));
const html = '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Revue de l’atlas réel</title><link rel="stylesheet" href="/atlas.css"><style>*{box-sizing:border-box}body{margin:0;background:#08131a;color:#dce7dc;font-family:Arial,sans-serif}main{max-width:1400px;margin:auto;padding:16px}@media(max-width:600px){main{padding:8px}}</style><main id="atlas-root"></main><script src="/atlas.js"></script></html>';
const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    if (pathname === "/") { response.setHeader("Content-Type", "text/html; charset=utf-8"); response.end(html); return; }
    if (bundles.has(pathname)) { response.setHeader("Content-Type", pathname.endsWith(".css") ? "text/css" : "text/javascript"); response.end(bundles.get(pathname)); return; }
    if (pathname.startsWith("/game/planets/v101/") && !pathname.includes("..")) {
      response.setHeader("Content-Type", pathname.endsWith(".webp") ? "image/webp" : "image/png");
      response.end(await fs.readFile(path.join(root, "public", pathname))); return;
    }
    response.statusCode = 404; response.end();
  } catch { response.statusCode = 404; response.end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || chromium.executablePath(), headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"] });
const report = { fixture: "Unmodified ClanWarAtlasV95 component and CSS, Korthas simulation", renderer: "Chromium / software WebGL", checks: [], errors: [] };
try {
  for (const viewport of [{ name: "desktop", width: 1440, height: 1080 }, { name: "mobile", width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: "reduce", isMobile: viewport.name === "mobile", hasTouch: viewport.name === "mobile" });
    const page = await context.newPage();
    page.on("pageerror", error => report.errors.push(error.message));
    await page.goto(base, { waitUntil: "domcontentloaded" });
    const ready = () => page.locator('canvas[data-render-status="ready"]').waitFor({ timeout: 60000 });
    const noOverflow = async projection => {
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(dimensions.scroll <= viewport.width + 1, `${viewport.name} ${projection} overflows: ${JSON.stringify(dimensions)}`);
      report.checks.push({ name: `${viewport.name} ${projection}: no horizontal overflow`, ...dimensions });
    };
    // Click actual visible SVG pixels and first verify which territory receives
    // that point. The decorative canvas must never intercept the interaction.
    const territoryPoint = async allowed => page.evaluate(ids => {
      for (const group of document.querySelectorAll('[data-territory-id][role="button"]')) {
        if (!ids.includes(group.dataset.territoryId)) continue;
        const label = group.querySelector("text");
        if (!label) continue;
        const bounds = label.getBoundingClientRect();
        const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
        if (y < 0 || y >= innerHeight) continue;
        if (document.elementFromPoint(x, y)?.closest("[data-territory-id]") === group) return { id: group.dataset.territoryId, x, y };
      }
      return null;
    }, allowed);
    await ready();
    assert.equal(await page.locator("svg[data-material-ready]").getAttribute("data-material-ready"), "true");
    await noOverflow("globe");
    await page.screenshot({ path: path.join(output, `atlas-${viewport.name}-globe.png`), fullPage: true });
    await page.locator("svg[data-material-ready]").scrollIntoViewIfNeeded();
    const others = await page.locator('[data-territory-id]:not([data-source="true"])').evaluateAll(nodes => nodes.map(node => node.dataset.territoryId));
    const origin = await territoryPoint(others);
    assert.ok(origin, "there is another clickable visible territory on the globe");
    await page.mouse.click(origin.x, origin.y);
    await page.waitForFunction(id => window.__atlasMaterialQa.selected === id, origin.id);
    report.checks.push({ name: `${viewport.name}: globe territory click`, territory: origin.id });

    await page.getByRole("button", { name: "▱ Planisphère", exact: true }).click();
    await ready();
    assert.equal(await page.locator('[data-territory-id][role="button"]').count(), 36);
    await page.getByRole("button", { name: "2 · Cible voisine", exact: true }).click();
    await page.locator("svg[data-material-ready]").scrollIntoViewIfNeeded();
    const state = await page.evaluate(() => window.__atlasMaterialQa);
    const neighbor = await territoryPoint(state.neighbors);
    assert.ok(neighbor, "planisphere exposes a clickable neighbor");
    await page.mouse.click(neighbor.x, neighbor.y);
    await page.waitForFunction(id => window.__atlasMaterialQa.target === id, neighbor.id);
    assert.equal(await page.locator(`[data-territory-id="${neighbor.id}"]`).getAttribute("data-target"), "true");
    report.checks.push({ name: `${viewport.name}: map neighbor click`, source: state.selected, target: neighbor.id, territoryCount: 36 });

    const colors = page.getByLabel("Couleurs de la carte", { exact: true });
    await colors.selectOption("control");
    assert.equal(await page.locator("svg[data-map-colors]").getAttribute("data-map-colors"), "control");
    const opacityFor = async () => page.locator('[data-territory-id]:not([data-source="true"]):not([data-target="true"]) > path').first().evaluate(node => Number(getComputedStyle(node).fillOpacity));
    await page.mouse.move(1, 1);
    const controlOpacity = await opacityFor();
    await colors.selectOption("terrain");
    const terrainOpacity = await opacityFor();
    assert.equal(controlOpacity, .6); assert.equal(terrainOpacity, .08);
    report.checks.push({ name: `${viewport.name}: natural/control colors`, terrainOpacity, controlOpacity });
    await noOverflow("map");
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, `atlas-${viewport.name}-map.png`), fullPage: true });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.stack; process.exitCode = 1; }
finally { await fs.writeFile(path.join(output, "atlas-checks.json"), JSON.stringify(report, null, 2) + "\n"); await browser.close(); await new Promise(resolve => server.close(resolve)); await fs.rm(temporary, { recursive: true, force: true }); }
console.log(JSON.stringify({ ok: report.ok, checks: report.checks.length, failure: report.failure, report: path.join(output, "atlas-checks.json") }, null, 2));
