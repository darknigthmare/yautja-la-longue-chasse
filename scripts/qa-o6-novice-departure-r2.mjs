import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";
import { legacyCanonicalCohortFixture, legacyRegions, saves } from "../tests/helpers/legacy-finale-r2.mjs";
import { homeworldRegionNavigatorV68 } from "./homeworld-region-navigation-v68.mjs";

const output = path.resolve("outputs/qa-o6-novice-departure-r2");
const temp = path.resolve("work-local");
await mkdir(output, { recursive: true });
await mkdir(temp, { recursive: true });
const directory = await mkdtemp(path.resolve(temp, "legacy-epilogues-"));
const mount = "/" + path.relative(process.cwd(), directory).replaceAll("\\", "/") + "/";
await writeFile(path.join(directory, "index.html"), `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Le novice prend le premier pas</title><div id="root"></div><script type="module" src="${mount}app.tsx"></script></html>`);
await writeFile(path.join(directory, "app.tsx"), `
import React from "react";
import { createRoot } from "react-dom/client";
import GameClient from "/app/game/GameClient.tsx";
import "/app/globals.css";
createRoot(document.getElementById("root")).render(<GameClient />);
`);

const report = {
  source: process.env.EPILOGUE_CANDIDATE_SHA ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "La sauvegarde arrive avec la reconnaissance Ancient et la première leçon O6-E1 jouées par leurs réducteurs. Chromium joue M060 au foyer, les deux choix du départ facultatif et la reprise après report. Le même dossier conserve l’épilogue, la fin et la chronique.",
  sequences: [], errors: [],
};
const service = await createServer({ configFile: false, plugins: [react()],
  server: { host: "127.0.0.1", port: 4341, strictPort: true } });
let browser;
const url = "http://127.0.0.1:4341" + mount;
const capture = (page, name) => page.screenshot({ path: path.join(output, name + ".png"), animations: "disabled" });
async function openWorld(page, id) {
  const world = page.locator(`[data-homeworld-region-v68="${id}"]`);
  const menu = page.locator("[data-campaign-menu]");
  await world.or(menu).first().waitFor();
  if (await menu.isVisible()) {
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
  }
  await world.waitFor();
  try {
    await world.locator("[data-region-resume]").waitFor({ timeout: 24_000 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      region: document.querySelector("[data-homeworld-region-v68]")?.getAttribute("data-zone"),
      dialog: document.querySelector("[data-homeworld-region-v68] [role=dialog]")?.textContent?.slice(0, 1200),
      focus: document.hasFocus(),
      badImages: Array.from(document.images).filter(img => !img.complete || img.naturalWidth === 0)
        .map(img => img.getAttribute("src")).slice(0, 30),
    }));
    console.log("WORLD START " + JSON.stringify(state));
    await capture(page, id + "-entree-incomplete");
    throw error;
  }
  const walker = homeworldRegionNavigatorV68(page, legacyRegions);
  await walker.resume();
  return walker;
}
async function runFrom(save, check) {
  const validated = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(validated.save, validated.failure);
  const context = await browser.newContext({ viewport: { width: 1360, height: 920 }, reducedMotion: "reduce" });
  await context.addInitScript(({ key, state }) => {
    if (localStorage.length === 0) localStorage.setItem(key, JSON.stringify(state));
  }, { key: saves.SAVE_STORAGE_KEY, state: validated.save });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  await page.clock.install();
  page.on("pageerror", error => { report.errors.push(error.message); console.log(error.stack); });
  page.on("response", response => {
    if (response.status() >= 400 && response.url().includes("/game/")) {
      console.log("REGION ART " + response.status() + " " + response.url());
    }
  });
  try {
    await page.goto(url);
    await check(page);
  } catch (error) {
    report.errors.push(error.message);
    console.log("ROUTE ERROR " + error.stack);
    await capture(page, "parcours-interrompu-" + report.errors.length);
  } finally {
    await context.close();
  }
}
async function walkScene(scene, target) {
  const at = Number(await scene.getAttribute("data-legacy-at"));
  for (let i = 0; i < Math.abs(target - at); i++) {
    await scene.locator(`[data-legacy-move="${target < at ? "left" : "right"}"]`).click();
  }
  assert.equal(await scene.getAttribute("data-legacy-at"), String(target));
}
const action = (scene, id) => scene.locator(`[data-legacy-action="${id}"]`);

try {
  await service.listen();
  browser = await chromium.launch({ args: ["--no-sandbox"] });
  for (const outcome of ["escorted", "stayed"]) {
    await runFrom(legacyCanonicalCohortFixture(), async page => {
      const region = page.locator('section[data-homeworld-region-v68="luminous-marshes"]');
      const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saves.SAVE_STORAGE_KEY);
      let ground = await openWorld(page, "luminous-marshes");
      const interior = legacyRegions.HOMEWORLD_REGION_INTERIOR_V68;
      const phase = (name, latestStage) => region.locator(`[data-o6-departure="${name}"]`).waitFor({ timeout: latestStage ?? 12_000 });
      const step = async (order, targetStage, click = false) => {
        const post = region.locator(`[data-o6-departure-post="${order}"]`);
        const [x, y] = await Promise.all([post.getAttribute("data-x"), post.getAttribute("data-y")]);
        assert.ok(x && y, order);
        await ground.walkTo({ x: Number(x), y: Number(y) });
        if (click) await region.locator(`[data-o6-departure-alternative="${order}"]`).click();
        else await ground.interact();
        await phase(targetStage);
      };
      assert.equal(await region.locator("[data-o6-departure]").count(), 0);
      await ground.walkTo({ x: interior.service.x, y: interior.service.y + 70 });
      await ground.interact();
      await page.locator("[data-open-legacy-epilogue-r2]").click();
      const scene = page.locator('[data-legacy-finale="epilogue"][data-legacy-site="residence"]');
      await scene.waitFor();
      await walkScene(scene, 6); await action(scene, "belongings").click();
      await walkScene(scene, 11); await action(scene, "relations").click();
      await walkScene(scene, 16); await action(scene, "welcome").click();
      await walkScene(scene, 14); await action(scene, "act").click();
      await scene.locator("[data-o6-novice-at-threshold]").waitFor();
      const baseline = await read();
      assert.equal(baseline.legacyFinaleR2.departureO6, undefined);
      assert.equal(baseline.originV151.ending.endingRealized, true);
      if (outcome === "escorted") await capture(page, "m060-novice-attendu-au-seuil");
      await scene.getByRole("button", { name: "Revenir au lieu" }).click();
      ground = await openWorld(page, "luminous-marshes");
      await phase("waiting");
      await step("departure-listen", "heard");
      await step("departure-advise", "ready");
      if (outcome === "escorted") {
        await step("departure-defer", "deferred", true);
        assert.match(await region.locator('[data-o6-departure="deferred"]').innerText(), /garde ton conseil/);
        assert.equal(await region.locator('[data-o6-departure="deferred"]').getAttribute("data-o6-departure-success"), "false");
        await capture(page, "novice-report-et-conseil-conserve");
        await page.reload();
        ground = await openWorld(page, "luminous-marshes");
        await phase("deferred");
        assert.deepEqual((await read()).legacyFinaleR2.departureO6.events, ["departure-listen", "departure-advise", "departure-defer"]);
        await step("departure-resume", "ready");
      }
      await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100)));
      await step("departure-let-pass", "crossed");
      const cross = region.locator('[data-o6-departure="crossed"]');
      assert.equal(await cross.getAttribute("data-o6-departure-passing"), "true");
      assert.equal(await region.getAttribute("data-zone"), "interior");
      assert.ok(await region.locator("[data-region-interact]").isDisabled());
      if (outcome === "escorted") await capture(page, "novice-franchit-le-seuil-le-premier");
      await page.clock.runFor(900);
      assert.equal(await cross.getAttribute("data-o6-departure-passing"), "false");

      if (outcome === "escorted") {
        await ground.walkTo(interior.entry);
        await ground.interact();
        assert.equal(await region.getAttribute("data-zone"), "village");
        const novice = region.locator("[data-o6-departure-actor]");
        await novice.getByText("Novice", { exact: true }).waitFor();
        await novice.locator('[data-region-resident="origin-o6-departing-novice"]').waitFor({ state: "attached" });
        await capture(page, "novice-guide-vers-le-croisement");
        await step("departure-escort", "escorted");
        await capture(page, "novice-au-croisement");
      } else {
        await step("departure-stay", "stayed");
        assert.equal(await region.getAttribute("data-zone"), "interior");
        await capture(page, "mentor-reste-au-banc");
      }
      const complete = region.locator(`[data-o6-departure="${outcome}"]`);
      assert.equal(await complete.getAttribute("data-o6-departure-resolved"), "true");
      assert.equal(await complete.getAttribute("data-o6-departure-success"), "true");
      const final = await read();
      assert.deepEqual(final.originV151, baseline.originV151);
      assert.deepEqual(final.prologue.chronicle, baseline.prologue.chronicle);
      assert.deepEqual(final.trophies, baseline.trophies);
      assert.deepEqual(final.legacyFinaleR2.epilogue, baseline.legacyFinaleR2.epilogue);
      await page.clock.resume();
      await page.reload();
      ground = await openWorld(page, "luminous-marshes");
      await phase(outcome);
      assert.deepEqual((await read()).legacyFinaleR2.departureO6, final.legacyFinaleR2.departureO6);
      report.sequences.push(outcome === "escorted"
        ? "M060 au foyer → conseil → départ reporté → reprise après rechargement → le novice franchit le seuil → le mentor le rejoint au croisement"
        : "M060 au foyer → conseil → le novice franchit le seuil → le mentor retourne au banc → succès relu au rechargement");
    });
  }
  console.log(JSON.stringify(report));
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
  await browser?.close();
  await service.close();
  await rm(directory, { recursive: true, force: true });
}
