import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { homeworldSceneSsrV78 } from "../tests/helpers/homeworld-scene-ssr-v78.mjs";

const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (process.env.WARP_FORTRESS_COMMIT) assert.equal(commit, process.env.WARP_FORTRESS_COMMIT);
assert.ok(process.env.WARP_FORTRESS_BROWSER_FIXTURE, "Prepare the existing M029 reducer fixture first");
const fixture = JSON.parse(await readFile(process.env.WARP_FORTRESS_BROWSER_FIXTURE, "utf8"));
const output = resolve(process.env.WARP_FORTRESS_OUTPUT ?? "outputs/qa-warp-fortress-w01");
await mkdir(output, { recursive: true });
const origin = "http://127.0.0.1:4227";
const source = homeworldSceneSsrV78();
const warp = source.load("app/game/systems/warpEpochsV165.ts");
const { W01_FJORD_ART, W01_FJORD_ROUTES } = source.load("app/game/systems/warpFjordW01.ts");
const { W01_FORTRESS_APPROACH, W01_FORTRESS_HALL_ART, W01_FORTRESS_TABLE, W01_FORTRESS_TIDE_POST } =
  source.load("app/game/systems/warpFortressW01.ts");
const saves = source.load("app/game/save.ts");
const archive = saves.parseSaveImport(saves.exportSave(fixture.save));
assert.ok(archive.save, archive.failure);
const contextAccess = warp.warpAccessContextFromSaveV165(archive.save, {});
assert.deepEqual(contextAccess, { blooded: true, personalShip: true, adjutant: true });
assert.equal(archive.save.warpEpochsV165.warpModuleInstalled, true);
assert.equal(archive.save.warpEpochsV165.activeWarpTripId, null);

const report = {
  commit, finished: false,
  fixture: "Le rang, la coque personnelle, Adjutant et le module Warp sont admis par les réducteurs de campagne. Chromium engage les deux voyages, joue les deux relevés et reprend la seconde visite à froid.",
  assets: {}, runs: [],
};
const assets = [
  [W01_FJORD_ART.shore, "4f609e1a0d735adc432bde47ca8301e67935b86efcf8d03c16edba54d7f2c306"],
  [W01_FJORD_ART.winch, "fb177940461c567d2e94f641eaa3b8696e39630e59a737d9752a32986b28edd1"],
  [W01_FORTRESS_HALL_ART, "1ff5eaa3635ea059dde6bdc75025174e179c1306e246aefd29530df20382fb44"],
];
let server, browser, page;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port: 4227, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
  report.browser = browser.version();
  for (const [path, expected] of assets) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    const bytes = Buffer.from(await response.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    assert.equal(sha256, expected);
    report.assets[path] = { bytes: bytes.length, sha256 };
  }

  for (const [route, width] of [["quai", 390], ["falaise", 1440]]) {
    const context = await browser.newContext({
      viewport: { width, height: 940 }, reducedMotion: "reduce",
      storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: fixture.key, value: JSON.stringify(archive.save) }] }] },
    });
    page = await context.newPage();
    page.setDefaultTimeout(20_000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const panel = page.locator("[data-warp-epochs-v165]");
    const first = panel.locator("[data-warp-fjord]");
    const fort = panel.locator("[data-warp-fortress]");
    const registry = panel.locator("[data-warp-fortress-register]");
    const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), fixture.key);
    const depart = () => panel.getByRole("button", { name: "Engager le voyage", exact: true }).click();
    const act = stage => fort.locator('[data-fortress-act="' + stage + '"]');
    const capture = (name, field) => field.screenshot({ path: resolve(output, route + "-" + name + ".png"), animations: "disabled" });
    const open = async () => {
      await page.locator("[data-campaign-menu]").waitFor({ timeout: 90_000 });
      const campaign = page.locator('[data-menu-section="campaign"]');
      if (await campaign.isVisible()) await campaign.click();
      await page.locator('[data-menu-action="continue"]').click();
      await page.locator("[data-campaign-session]").waitFor({ timeout: 90_000 });
      const deck = page.getByRole("button", { name: "Dossier de campagne", exact: true });
      const navigation = page.getByRole("button", { name: "Navigation", exact: true });
      await deck.or(navigation).first().waitFor({ timeout: 90_000 });
      if (await deck.isVisible()) await deck.click();
      else {
        await navigation.click();
        await page.locator("[data-open-quatza-homeworld]").click();
      }
      await page.locator("[data-warp-entry-v165]").click();
      await panel.waitFor();
    };
    async function walk(field, tag, target) {
      const at = Number(await field.getAttribute("data-" + tag + "-position"));
      const right = at < target;
      for (let step = 0; step < Math.abs(at - target); step++) {
        if (route === "falaise") await field.getByRole("group", { name: /^Sentier/ }).press(right ? "ArrowRight" : "ArrowLeft");
        else await field.locator('[data-' + tag + '-walk="' + (right ? "right" : "left") + '"]').click();
      }
      assert.equal(Number(await field.getAttribute("data-" + tag + "-position")), target);
    }

    await page.goto(origin);
    await open();
    await panel.locator('[data-warp-branch-card="W-01"] button').click();
    await depart();
    await first.waitFor();
    assert.equal(await panel.getAttribute("data-warp-trip"), "warp-trip-1");
    await walk(first, "fjord", 4);
    await first.locator('[data-fjord-enter="' + route + '"]').click();
    await walk(first, "fjord", W01_FJORD_ROUTES[route].checkpoint);
    await first.locator("[data-fjord-observe]").click();
    await walk(first, "fjord", 4);
    await first.locator('[data-fjord-enter="grotte"]').click();
    await walk(first, "fjord", 0);
    await first.locator("[data-fjord-report]").click();
    await panel.locator("[data-warp-fjord-register]").waitFor();
    const firstReceipt = (await saved()).warpEpochsV165.branchVisitState["W-01"].fjordW01;

    await depart();
    await fort.waitFor();
    assert.equal(await panel.getAttribute("data-warp-trip"), "warp-trip-2");
    assert.equal(await fort.getAttribute("data-fortress-approach"), route);
    assert.equal(await act("sounded").isDisabled(), true);
    await walk(fort, "fortress", W01_FORTRESS_TIDE_POST);
    await act("sounded").click();
    await page.reload();
    await open();
    assert.equal(await fort.getAttribute("data-fortress-stage"), "sounded");
    assert.equal(Number(await fort.getAttribute("data-fortress-position")), W01_FORTRESS_TIDE_POST);
    await walk(fort, "fortress", W01_FORTRESS_APPROACH[route].gate);
    assert.equal(await fort.locator('[data-fortress-walk="right"]').isDisabled(), true);
    await capture("acces", fort);
    await act("entered").click();
    await walk(fort, "fortress", W01_FORTRESS_TABLE);
    assert.equal(await fort.getAttribute("data-fortress-place"), "hall");
    assert.ok((await fort.getByRole("group", { name: /^Sentier/ }).getAttribute("style")).includes(W01_FORTRESS_HALL_ART));
    await page.evaluate(async path => {
      const bitmap = new Image();
      bitmap.src = path;
      await bitmap.decode();
    }, W01_FORTRESS_HALL_ART);
    await capture("halle", fort);
    await act("copied").click();
    assert.equal(await act("returned").isDisabled(), true);
    await page.reload();
    await open();
    assert.equal(await fort.getAttribute("data-fortress-stage"), "copied");
    assert.equal(Number(await fort.getAttribute("data-fortress-position")), W01_FORTRESS_TABLE);
    await walk(fort, "fortress", 0);
    await act("returned").click();
    await registry.waitFor();
    await capture("registre", registry);
    await page.reload();
    await open();
    await registry.waitFor();
    const disk = await saved();
    const visit = disk.warpEpochsV165.branchVisitState["W-01"];
    assert.deepEqual(visit.fjordW01, firstReceipt);
    assert.deepEqual(visit.fortressW01, { tripId: "warp-trip-2", stage: "returned" });
    assert.equal(visit.epochCompleted, false);
    assert.equal(visit.trophy, null);
    assert.equal(disk.warpEpochsV165.activeWarpTripId, null);
    assert.equal(disk.warpEpochsV165.warpReturnReservation, "utilisee");
    assert.deepEqual(disk.profile, archive.save.profile);
    assert.deepEqual(disk.inventory, archive.save.inventory);
    assert.deepEqual(errors, []);
    report.runs.push({ route, width, tripId: visit.fortressW01.tripId, durableReload: true, controls: route === "falaise" ? "keyboard" : "buttons" });
    await context.close();
    page = undefined;
  }
  report.finished = true;
} finally {
  if (!report.finished && page) {
    report.visible = (await page.locator("body").innerText().catch(() => "")).slice(0, 4200);
    await page.screenshot({ path: resolve(output, "failure.png"), animations: "disabled" }).catch(() => {});
    console.log("WARP_FORTRESS_BROWSER_STATE", JSON.stringify(report));
  }
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server?.close();
}
