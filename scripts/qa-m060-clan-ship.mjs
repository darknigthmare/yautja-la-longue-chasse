import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";
import { legacyClanFixture, saves } from "../tests/helpers/legacy-finale-r2.mjs";

const output = path.resolve("outputs/qa-m060-clan-ship");
await mkdir(output, { recursive: true });
const temp = path.resolve("work-local");
await mkdir(temp, { recursive: true });
const directory = await mkdtemp(path.resolve(temp, "m060-clan-"));
const mount = "/" + path.relative(process.cwd(), directory).replaceAll("\\", "/") + "/";
await writeFile(path.join(directory, "index.html"), `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recette M060 AVP</title><div id="root"></div><script type="module" src="${mount}app.tsx"></script></html>`);
await writeFile(path.join(directory, "app.tsx"), `
import React from "react";
import { createRoot } from "react-dom/client";
import GameClient from "/app/game/GameClient.tsx";
import "/app/globals.css";
createRoot(document.getElementById("root")).render(<GameClient />);
`);

const valid = legacyClanFixture();
assert.ok(saves.parseSaveImport(saves.exportSave(valid)).save, "valid visited ship with an earned recruit");
const report = { source: "3838bae2ab40e22ff8b58a99602f9a1fd8e294db", admission: "La fin d'origine O6‑M30 est préparée pour la recette. L'amarrage, l'accueil, le mandat, l'audit et le recrutement ont été établis par leurs réducteurs. Le point natif de la galerie et tous les gestes M060 sont joués dans GameClient.", scenes: [], errors: [] };
let service, browser;
try {
  service = await createServer({ configFile: false, plugins: [react()],
    server: { host: "127.0.0.1", port: 4340, strictPort: true } });
  await service.listen();
  browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await context.addInitScript(({ key, save }) => {
    if (localStorage.length === 0) localStorage.setItem(key, JSON.stringify(save));
  }, { key: saves.SAVE_STORAGE_KEY, save: valid });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.on("pageerror", error => { report.errors.push(error.message); console.log("BROWSER ERROR: " + error.stack); });
  const url = "http://127.0.0.1:4340" + mount;
  await page.goto(url);
  const capture = name => page.screenshot({ path: path.join(output, name + ".png"), animations: "disabled" });
  const openNativeGallery = async () => {
    const before = page.locator('[data-clan-interior][data-interior-room="trophees"]');
    await before.or(page.locator("[data-campaign-menu]")).first().waitFor();
    if (await page.locator("[data-campaign-menu]").isVisible()) {
      const campaign = page.locator('[data-menu-section="campaign"]');
      if (await campaign.isVisible()) await campaign.click();
      await page.locator('[data-menu-action="continue"]').click();
    }
    await before.waitFor();
    const atService = before.locator('[data-interior-service="trophees"][data-interior-ready="true"]');
    if (!(await atService.isVisible())) await before.locator("[data-interior-approach-service]").click();
    await atService.waitFor();
    await atService.click();
    await page.locator("#trophies-title").waitFor();
    await page.locator("[data-open-clan-legacy-epilogue-r2]").click();
  };
  await openNativeGallery();
  const scene = page.locator('[data-legacy-finale="epilogue"][data-legacy-site="clan-ship"]');
  await scene.waitFor();
  const galleryArt = await page.request.get("http://127.0.0.1:4340/game/clan-ship/interiors/trophees-v1.webp");
  assert.equal(galleryArt.status(), 200);
  const walk = async target => {
    const at = Number(await scene.getAttribute("data-legacy-at"));
    for (let i = 0; i < Math.abs(target-at); i++) {
      await scene.locator('[data-legacy-move="' + (target < at ? "left" : "right") + '"]').click();
    }
  };
  const action = id => scene.locator('[data-legacy-action="' + id + '"]');
  await walk(6); await action("belongings").click();
  await scene.locator("[data-legacy-belongings]").waitFor();
  assert.match(await scene.locator("[data-legacy-belongings]").innerText(), /Relevé d’amarrage/);
  await walk(11); await action("relations").click();
  await scene.locator("[data-legacy-relations]").waitFor();
  assert.match(await scene.locator("[data-legacy-relations]").innerText(), /Griffe de Fer/);
  await capture("m060-navire-lectures");
  await scene.getByRole("button", { name: "Revenir au lieu" }).click();
  await page.locator("#trophies-title").waitFor();
  await page.reload();
  await openNativeGallery();
  await scene.waitFor();
  assert.equal(await scene.getAttribute("data-legacy-at"), "11");
  assert.match(await scene.locator("[data-legacy-relations]").innerText(), /Griffe de Fer/);
  await walk(16); await action("transmit").click();
  await walk(21); await action("act").click();
  await page.locator('[data-legacy-finale="epilogue"][data-legacy-complete="true"]').waitFor();
  await capture("m060-navire-releve-classe");
  report.scenes.push("galerie physiquement atteinte", "amarrage réellement consigné", "équipage vérifié", "reprise après rechargement", "classement final du relevé");
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
  await browser?.close();
  await service?.close();
  await rm(directory, { recursive: true, force: true });
}
