import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";

const output = resolve(process.env.WARP_COMMON_OUTPUT ?? "outputs/qa-warp-common-route-r2");
const fixture = JSON.parse(await readFile(process.env.WARP_COMMON_BROWSER_FIXTURE, "utf8"));
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "Blooded, V161, two completed worlds and award of Adjutant were played via the campaign reducers and saved.",
  finished: false, checks: [],
};
await mkdir(output, { recursive: true });
let server, browser, page;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port: 4224, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1380, height: 940 }, reducedMotion: "reduce" });
  await context.addInitScript(({ key, save }) => {
    if (sessionStorage.getItem("warpCommonRouteR2")) return;
    sessionStorage.setItem("warpCommonRouteR2", "1");
    localStorage.setItem(key, JSON.stringify(save));
  }, fixture);
  page = await context.newPage();
  page.setDefaultTimeout(30000);
  const common = page.locator("[data-warp-common-scene]");
  const landing = page.locator("[data-warp-survey-r2]");
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), fixture.key);
  const scene = page.locator("[data-warp-epochs-v165]");
  const open = async () => {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.locator("[data-campaign-session]").waitFor({ timeout: 90000 });
    const deck = page.getByRole("button", { name: "Dossier de campagne", exact: true });
    const navigation = page.getByRole("button", { name: "Navigation", exact: true });
    await deck.or(navigation).first().waitFor({ timeout: 90000 });
    if (await deck.isVisible()) await deck.click();
    else {
      await navigation.click();
      await page.locator("[data-open-quatza-homeworld]").click();
    }
    await page.locator("[data-warp-entry-v165]").click();
    await scene.waitFor();
  };
  const move = async (target, field = common, tag = "common") => {
    const at = Number(await field.getAttribute("data-warp-" + tag + "-position"));
    const direction = at < target ? "right" : "left";
    for (let step = 0; step < Math.abs(target - at); step++) {
      await field.locator('[data-warp-' + tag + '-walk="' + direction + '"]').click();
    }
    assert.equal(Number(await field.getAttribute("data-warp-" + tag + "-position")), target);
  };
  const act = name => common.locator('[data-warp-common-action="' + name + '"]').click();
  const expected = (select, value) => common.locator(select).selectOption(String(value));
  const checkDial = () => common.locator("[data-warp-common-check]").click();
  const download = path => page.evaluate(async path => (await fetch(path)).ok, path);
  const capture = (name, element) => element.screenshot({ path: resolve(output, name + ".png"), animations: "disabled" });

  await page.goto("http://127.0.0.1:4224");
  await open();
  assert.equal(await common.getAttribute("data-warp-common-scene"), "observatory");
  assert.equal(await common.locator('[data-warp-common-action="read"]').isDisabled(), true);
  assert.ok(await download("/game/warp-universe/20261109/200_module_salle_avatar_fond.png"));
  for (const at of [3, 8, 13]) { await move(at); await act("read"); }
  await act("energie");
  assert.equal((await read()).warpEpochsV165.questStartChoice, "energie");
  report.checks.push("Three readings in walking range, energy chosen at the device.");

  assert.ok(await download("/game/warp-universe/20261109/199_module_baie_warp_fond.png"));
  await move(3); await act("inspect"); await checkDial();
  assert.equal((await read()).warpEpochsV165.commonRouteR2.events.length, 5);
  await expected("[data-warp-common-dial]", 3); await checkDial();
  await page.reload(); await open();
  assert.equal(await common.getAttribute("data-warp-common-scene"), "workshops");
  assert.equal(await common.getAttribute("data-warp-common-position"), "3");
  await move(8); await act("inspect"); await expected("[data-warp-common-method]", "variante");
  await expected("[data-warp-common-dial]", 2); await checkDial();
  await move(13); await act("inspect"); await expected("[data-warp-common-method]", "reparer");
  await expected("[data-warp-common-dial]", 2); await checkDial();
  await capture("pieces-verifiees", common);
  assert.deepEqual((await read()).warpEpochsV165.components, {});
  await move(16); await act("haul");
  report.checks.push("Rejected bench failure, checkpoint reload, mixed repair/alternative and actual delivery.");

  await move(3); await act("align"); await move(8); await act("connect"); await move(13);
  await expected("[data-warp-common-profile]", "fenetre-courte");
  await checkDial();
  assert.equal((await read()).warpEpochsV165.warpModuleInstalled, false);
  await expected("[data-warp-common-dial]", 3); await checkDial();
  await page.locator("[data-warp-common-ready]").waitFor();
  const installed = await read();
  assert.equal(installed.warpEpochsV165.warpModuleInstalled, true);
  assert.ok(installed.prologue.chronicle.evidence.some(proof => proof.id === "warp-module-quest"));
  report.checks.push("Dry return failure preserves setup. Operation and Chronicle receipt saved together.");

  await page.locator('[data-warp-branch-card="W-02"] button').click();
  await page.getByRole("button", { name: "Engager le voyage", exact: true }).click();
  await landing.waitFor();
  assert.ok(await download("/game/warp/w02/cedar-pass-1629.webp"));
  const actLanding = name => landing.locator('[data-warp-survey-action="' + name + '"]').click();
  await move(4, landing, "survey"); await actLanding("marker");
  await move(11, landing, "survey"); await actLanding("niche");
  await capture("releve-col-cedres", landing);
  await page.reload(); await open();
  assert.equal(await landing.getAttribute("data-warp-survey-position"), "11");
  await move(0, landing, "survey"); await actLanding("return");
  await page.locator("[data-warp-survey-complete]").waitFor();
  const returned = await read();
  assert.deepEqual(returned.warpEpochsV165.firstSurveyR2, { tripId: "warp-trip-1", stage: "complete", nicheVisited: true });
  assert.equal(returned.warpEpochsV165.activeWarpTripId, null);
  assert.deepEqual(returned.prologue.chronicle, installed.prologue.chronicle);
  assert.equal(returned.profile.honor, installed.profile.honor);
  report.checks.push("W‑02 marker, alternative survey, reload and physical return preserve the chronicle.");
  report.finished = true;
} finally {
  if (!report.finished && page) {
    report.visible = (await page.locator("body").innerText().catch(() => "")).slice(0, 2400);
    await page.screenshot({ path: resolve(output, "failure.png"), animations: "disabled" }).catch(() => {});
    console.log("WARP_COMMON_BROWSER_STATE", JSON.stringify(report));
  }
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server?.close();
}
