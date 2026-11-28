import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { homeworldSceneSsrV78 } from "../tests/helpers/homeworld-scene-ssr-v78.mjs";

const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (process.env.WARP_FJORD_COMMIT) assert.equal(commit, process.env.WARP_FJORD_COMMIT);
const output = resolve(process.env.WARP_FJORD_OUTPUT ?? "outputs/qa-warp-fjord-w01");
await mkdir(output, { recursive: true });
const origin = "http://127.0.0.1:4227";
const source = homeworldSceneSsrV78();
const warp = source.load("app/game/systems/warpEpochsV165.ts");
const { W01_FJORD_ART, W01_FJORD_ROUTES } = source.load("app/game/systems/warpFjordW01.ts");
const saves = source.load("app/game/save.ts");
const owner = "2026-11-28T08:00:00.000Z";
const access = { blooded: true, personalShip: true, adjutant: true };
const accept = result => { assert.equal(result.accepted, true, result.message); return result.state; };
let state = accept(warp.startWarpCommonQuestV165(warp.createWarpEpochsV165(owner), access, "stabilite"));
for (const { id } of warp.WARP_COMPONENTS_V165) state = accept(warp.verifyWarpComponentV165(state, id, "reparer"));
state = accept(warp.installWarpModuleV165(state, "marge"));
state = accept(warp.selectWarpBranchV165(state, "W-01"));
state = accept(warp.departWarpV165(state, access));
const archive = saves.parseSaveImport(saves.exportSave({ ...saves.defaultSave(owner), warpEpochsV165: state }));
assert.ok(archive.save, archive.failure);

const report = {
  commit, finished: false,
  fixture: "Archive de jeu importée avec voyage W-01 déjà engagé par les transitions réelles. Les conditions de départ sont vérifiées séparément par les tests domaine.",
  assets: {}, runs: [],
};
const assetHashes = {
  shore: "4f609e1a0d735adc432bde47ca8301e67935b86efcf8d03c16edba54d7f2c306",
  winch: "fb177940461c567d2e94f641eaa3b8696e39630e59a737d9752a32986b28edd1",
};
let server, browser, page;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port: 4227, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
  report.browser = browser.version();
  for (const [kind, path] of Object.entries(W01_FJORD_ART)) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    const bytes = Buffer.from(await response.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    assert.equal(sha256, assetHashes[kind]);
    report.assets[kind] = { path, sha256 };
  }
  for (const [route, width, entry, repli] of [
    ["quai", 390, "deck", false], ["falaise", 1440, "map", false], ["quai", 960, "chronique", true],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 }, reducedMotion: "reduce",
      storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: saves.SAVE_STORAGE_KEY, value: JSON.stringify(archive.save) }] }] },
    });
    page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const panel = page.locator("[data-warp-epochs-v165]");
    const landing = panel.locator("[data-warp-fjord]");
    const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saves.SAVE_STORAGE_KEY);
    const open = async via => {
      await page.locator("[data-campaign-menu]").waitFor({ timeout: 90_000 });
      const section = page.locator('[data-menu-section="campaign"]');
      if (await section.isVisible()) await section.click();
      await page.locator('[data-menu-action="continue"]').click();
      await page.locator("[data-campaign-session]").waitFor();
      if (via === "chronique") {
        await page.getByRole("button", { name: "Dossier de campagne", exact: true }).click();
        await page.locator("[data-warp-entry-v165]").click();
      } else {
        await page.getByRole("button", { name: "Jouer", exact: true }).click();
        if (via === "map") {
          await page.getByRole("button", { name: "Accès rapide aux installations", exact: true }).click();
          await page.getByText("Accès direct aux interfaces", { exact: true }).click();
          await page.locator('[data-ship-shortcut="galaxy-map"]').click();
          await page.locator("[data-warp-map-entry]").click();
        } else {
          await page.locator("[data-warp-deck-entry]").click();
        }
      }
      await panel.waitFor();
    };
    const walk = async target => {
      const at = Number(await landing.getAttribute("data-fjord-position"));
      const right = at < target;
      for (let step = 0; step < Math.abs(at - target); step++) {
        if (route === "falaise") await landing.getByRole("group", { name: /^Sentier/ }).press(right ? "ArrowRight" : "ArrowLeft");
        else await landing.locator('[data-fjord-walk="' + (right ? "right" : "left") + '"]').click();
      }
      assert.equal(Number(await landing.getAttribute("data-fjord-position")), target);
    };
    await page.goto(origin);
    await open(entry);
    await landing.waitFor();
    assert.equal(await panel.getAttribute("data-warp-trip"), "warp-trip-1");
    assert.equal(await landing.getAttribute("data-fjord-position"), "0");
    assert.equal(await landing.locator('[data-fjord-enter="quai"]').isDisabled(), true);
    await walk(4);
    await landing.locator('[data-fjord-enter="' + route + '"]').click();
    if (route === "quai") await page.waitForFunction(() => document.querySelector("[data-warp-fjord-winch]")?.naturalWidth === 1536);
    assert.equal(await landing.locator("[data-fjord-observe]").isDisabled(), true);
    await walk(W01_FJORD_ROUTES[route].checkpoint);
    await landing.locator("[data-fjord-observe]").click();
    await panel.locator('[data-warp-fjord][data-fjord-observed="true"]').waitFor();
    await landing.screenshot({ path: resolve(output, route + "-" + width + ".png"), animations: "disabled" });
    await page.reload();
    await open("chronique");
    assert.equal(await landing.getAttribute("data-fjord-route"), route);
    assert.equal(Number(await landing.getAttribute("data-fjord-position")), W01_FJORD_ROUTES[route].checkpoint);
    if (repli) {
      await panel.getByRole("button", { name: "Repli d’urgence (retour réservé)", exact: true }).click();
      assert.equal(await panel.locator("[data-warp-fjord-register]").count(), 0);
    } else {
      await walk(4);
      await landing.locator('[data-fjord-enter="grotte"]').click();
      assert.equal(await landing.locator("[data-fjord-report]").isDisabled(), true);
      await walk(0);
      await landing.locator("[data-fjord-report]").click();
      const registry = panel.locator("[data-warp-fjord-register]");
      await registry.waitFor();
      assert.equal(await registry.getAttribute("data-route"), route);
      await registry.screenshot({ path: resolve(output, "registre-" + route + ".png"), animations: "disabled" });
      await page.reload();
      await open("chronique");
      assert.equal(await registry.getAttribute("data-route"), route);
    }
    const disk = await saved();
    assert.equal(disk.warpEpochsV165.activeWarpTripId, null);
    assert.equal(disk.warpEpochsV165.warpReturnReservation, "utilisee");
    assert.equal(!!disk.warpEpochsV165.branchVisitState["W-01"].fjordW01?.returned, !repli);
    assert.deepEqual(disk.profile, archive.save.profile);
    assert.deepEqual(disk.inventory, archive.save.inventory);
    assert.deepEqual(errors, []);
    report.runs.push({ route, width, entry, outcome: repli ? "repli" : "rapport", durableReload: true });
    await context.close();
    page = undefined;
  }
  report.finished = true;
} finally {
  if (!report.finished && page) {
    report.visible = (await page.locator("body").innerText().catch(() => "")).slice(0, 2400);
    await page.screenshot({ path: resolve(output, "failure.png"), animations: "disabled" }).catch(() => {});
    console.log("WARP_FJORD_BROWSER_STATE", JSON.stringify(report));
  }
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server?.close();
}
