import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { formationCampaignRoute, formationModel } from "../tests/helpers/solo-v90-played-route.mjs";
import { homeworldSceneSsrV78 } from "../tests/helpers/homeworld-scene-ssr-v78.mjs";
import { thresholdsCampaignRoute } from "../tests/helpers/solo-v69-played-route.mjs";

const modules = homeworldSceneSsrV78();
const saves = modules.load("app/game/save.ts");
const controls = modules.load("app/game/systems/youthControls.ts").YOUTH_CONTROL_ACTIONS;
const templeOrder = process.argv.includes("--temple-order");
const thresholds = templeOrder ? thresholdsCampaignRoute().save : null;
const origin = thresholds ? { ...thresholds, prologue: { ...thresholds.prologue, templeTriadFirstM017: true } } : undefined;
const seed = formationCampaignRoute({ stop: "assemble", origin }).save;
seed.settings.masterVolume = 0;
assert(saves.parseSaveImport(saves.exportSave(seed)).save);
const key = saves.SAVE_STORAGE_KEY;
const playRefusal = process.argv.includes("--refusal-rehearsal");
const plan = playRefusal ? "preference" : "complementary";
const output = resolve(process.env.M016_OUTPUT ?? "outputs/qa-triad-roles-m016");
const report = { commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  seed: "The campaign reaches assembly through the existing real chapter reducers.", errors: [], passed: false };

await mkdir(output, { recursive: true });
let browser, page, server;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port: 4269, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1340, height: 920 }, reducedMotion: "reduce" });
  await context.addInitScript(({ key, seed }) => {
    if (sessionStorage.getItem("triadRolesQANative")) return;
    sessionStorage.setItem("triadRolesQANative", "yes");
    localStorage.setItem(key, JSON.stringify(seed));
  }, { key, seed });
  page = await context.newPage();
  page.on("pageerror", err => report.errors.push(err.message));
  page.setDefaultTimeout(30000);
  const canvas = page.locator("[data-solo-v90] canvas");
  const roleButton = page.locator(`[data-solo-v90-plan="${plan}"]`);
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const live = () => canvas.evaluate(item => JSON.parse(item.dataset.soloState));
  async function boot(chapter = "v90") {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    const active = page.locator(`[data-solo-${chapter}] canvas[data-solo-assets="true"]`);
    await active.waitFor({ timeout: 90000 });
    await active.focus();
  }
  // Initialize the clock before the game records its first animation frame.
  await page.clock.install();
  await page.goto("http://127.0.0.1:4269");
  await boot();
  await page.clock.runFor(150);
  const right = seed.settings.controlBindings[controls.right].at(-1);
  const left = seed.settings.controlBindings[controls.left].at(-1);
  const interaction = seed.settings.controlBindings[controls.interact][0];
  assert(right && left && interaction);
  async function approach(x) {
    const direction = (await live()).player.x < x ? 1 : -1;
    const walking = direction === 1 ? right : left;
    await page.keyboard.down(walking);
    for (let i = 0; i < 150 && (x - (await live()).player.x) * direction > 18; i++) await page.clock.runFor(80);
    await page.keyboard.up(walking);
    await page.clock.runFor(130);
    assert(Math.abs((await live()).player.x - x) < 35);
  }
  async function observe(activity) {
    await approach(activity.x);
    assert.equal(await roleButton.count(), 0);
    await page.keyboard.down(interaction);
    for (let i = 0; i < 75 && !(await saved()).soloV90.checkpoint.partnerObservations[activity.id]; i++) {
      await page.clock.runFor(100);
    }
    await page.keyboard.up(interaction);
    // Storage commits immediately, while the interface updates every 90 ms.
    await page.clock.runFor(160);
    const stamp = (await saved()).soloV90.checkpoint.partnerObservations[activity.id];
    assert.equal(typeof stamp, "number");
    assert.equal((await live()).partnerObservations[activity.id], stamp);
    await page.locator(`[data-solo-v90-activity="${activity.id}"][data-observed="true"]`).waitFor({ timeout: 5000 });
    await page.screenshot({ path: resolve(output, "observation-" + activity.id + ".png"), animations: "disabled" });
    return stamp;
  }
  const [saar, vek] = formationModel.SOLO_V90_PARTNER_ACTIVITIES;
  const saarTick = await observe(saar);
  await page.reload(); await boot(); await page.clock.runFor(160);
  assert.equal((await saved()).soloV90.checkpoint.partnerObservations.saar, saarTick);
  const vekTick = await observe(vek);
  assert(vekTick > saarTick);
  report.observations = { saar: saarTick, vek: vekTick };
  await approach(2590);
  assert(formationModel.soloV90RoleBoardReady(await live()));
  if (playRefusal) {
    await roleButton.click();
    await page.clock.runFor(180);
    await page.locator('[data-solo-v90-rehearsal="pending"]').waitFor();
    const refused = (await saved()).soloV90.checkpoint.formationRefusedAt;
    assert.equal(typeof refused, "number");
    assert.equal((await saved()).soloV90.checkpoint.formationPlan, undefined);
    assert(await roleButton.isDisabled());
    await page.screenshot({ path: resolve(output, "refus-vek.png"), animations: "disabled" });
    await page.reload(); await boot(); await page.clock.runFor(160);
    assert.equal((await saved()).soloV90.checkpoint.formationRefusedAt, refused);

    await approach(formationModel.SOLO_V90_REHEARSAL.x);
    assert.equal((await saved()).soloV90.checkpoint.formationRehearsedAt, undefined);
    await page.keyboard.down(interaction);
    for (let i = 0; i < 75 && !(await saved()).soloV90.checkpoint.formationRehearsedAt; i++) {
      await page.clock.runFor(100);
    }
    await page.keyboard.up(interaction); await page.clock.runFor(160);
    await page.locator('[data-solo-v90-rehearsal="complete"]').waitFor();
    const rehearsed = (await saved()).soloV90.checkpoint.formationRehearsedAt;
    assert(rehearsed >= refused + formationModel.SOLO_V90_REHEARSAL.ticks);
    assert.equal((await saved()).soloV90.checkpoint.formationPlan, undefined);
    await page.screenshot({ path: resolve(output, "repetition-trois-signaux.png"), animations: "disabled" });
    report.rehearsal = { refused, rehearsed };
    await approach(2590);
  }
  await roleButton.click();
  await page.clock.runFor(180);
  assert.equal((await saved()).soloV90.checkpoint.formationPlan, plan);
  await page.screenshot({ path: resolve(output, "repartition.png"), animations: "disabled" });

  await page.reload(); await boot();
  await page.clock.runFor(160);
  assert.equal(await roleButton.getAttribute("aria-pressed"), "true");
  assert.equal((await saved()).soloV90.checkpoint.milestones["roles-positioned"], undefined);
  await page.keyboard.down(seed.settings.controlBindings[controls.blade][0]);
  await page.clock.runFor(100);
  await page.keyboard.up(seed.settings.controlBindings[controls.blade][0]);
  assert.equal((await live()).roleMode, "posts");
  await page.keyboard.down(seed.settings.controlBindings[controls.interact][0]);
  for (let i = 0; i < 48 && (await saved()).soloV90.checkpoint.phase === "assemble"; i++) await page.clock.runFor(120);
  await page.keyboard.up(seed.settings.controlBindings[controls.interact][0]);
  const complete = await saved();
  assert.equal(complete.soloV90.checkpoint.phase, "observe");
  assert.deepEqual(complete.soloV90.checkpoint.companions.map(c => Math.abs(c.x - 2800) < 5 ? "opening" : "approach"),
    playRefusal ? ["approach", "opening"] : ["opening", "approach"]);
  assert.deepEqual(complete.prologue.chronicle, seed.prologue.chronicle);
  assert(saves.parseSaveImport(saves.exportSave(complete)).save);
  await page.screenshot({ path: resolve(output, "postes-rejoins.png"), animations: "disabled" });
  if (templeOrder) {
    const handoff = page.locator("[data-solo-v90-enter-temple]");
    const preparedAt = complete.soloV90.checkpoint.milestones["roles-positioned"];
    assert.equal(complete.soloV70 ?? null, null);
    assert.equal(typeof preparedAt, "number");
    await handoff.waitFor();
    await page.clock.runFor(1800);
    assert.equal((await live()).tick, preparedAt);
    assert.equal((await live()).observedCycles, 0);
    await page.reload();
    await boot();
    await handoff.waitFor();
    assert.equal((await live()).tick, preparedAt);
    await page.screenshot({ path: resolve(output, "triade-depart-temple.png"), animations: "disabled" });
    await handoff.click();
    const temple = page.locator('[data-solo-v70] canvas[data-solo-assets="true"]');
    await temple.waitFor({ timeout: 90000 });
    assert.equal((await saved()).soloV70.checkpoint.phase, "briefing");
    await temple.focus();
    await page.clock.runFor(180);
    await page.keyboard.down(interaction);
    await page.clock.runFor(120);
    await page.keyboard.up(interaction);
    await page.clock.runFor(240);
    assert.equal((await saved()).soloV70.receipts.at(-1).id, "briefed");
    assert.deepEqual((await saved()).soloV90, complete.soloV90);
    await page.reload();
    await boot("v70");
    assert.equal((await saved()).soloV70.receipts.at(-1).id, "briefed");
    assert.equal(await handoff.count(), 0);
    await page.screenshot({ path: resolve(output, "temple-apres-rechargement.png"), animations: "disabled" });
    report.templeOrder = { preparedAt, localOpening: "briefed", resumedScene: "v70" };
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  if (!report.passed && page) {
    report.screen = (await page.locator("body").innerText().catch(() => "")).slice(0, 2000);
    console.log("TRIAD_ROLES_BROWSER", JSON.stringify(report));
    await page.screenshot({ path: resolve(output, "failure.png"), animations: "disabled" }).catch(() => {});
  }
  await browser?.close();
  await server?.close();
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
