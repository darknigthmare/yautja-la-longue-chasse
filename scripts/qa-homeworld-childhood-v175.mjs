import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { childhoodAdmissionV175, childhoodStorage, qaChildhood } from "../tests/helpers/homeworld-childhood-v175.mjs";

const seed = childhoodAdmissionV175({ withLocation: true });
seed.settings.masterVolume = 0;
const model = qaChildhood.load("app/game/systems/homeworldChildhoodV175.ts");
const rank = qaChildhood.load("app/game/systems/clanChronicle.ts");
const storageKey = childhoodStorage.SAVE_STORAGE_KEY;
const output = resolve(process.env.CHILDHOOD_OUTPUT ?? "outputs/qa-homeworld-childhood-v175");
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  prerequisites: "The nursery and M003 registry are prepared using the existing reducers. The Homeworld position is sampled next to the native training service.",
  checks: [], errors: [], passed: false,
};
await mkdir(output, { recursive: true });
let server, browser, page;
try {
  server = await createServer({
    configFile: resolve("desktop/vite.config.ts"),
    server: { host: "127.0.0.1", port: 4275, strictPort: true },
  });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1360, height: 980 }, reducedMotion: "reduce" });
  await context.addInitScript(({ key, campaign }) => {
    if (sessionStorage.getItem("childhoodV175Ready")) return;
    sessionStorage.setItem("childhoodV175Ready", "1");
    localStorage.setItem(key, JSON.stringify(campaign));
  }, { key: storageKey, campaign: seed });
  page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", error => report.errors.push(error.message));
  const scene = page.locator("[data-homeworld-childhood-v175]");
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
  const view = async () => {
    const campaign = await read();
    return model.childhoodViewV175(campaign.homeworld.childhoodV175, campaign.createdAt);
  };
  async function boot() {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    const home = page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"][data-homeworld-interior-id="training-hall"]');
    await home.waitFor({ timeout: 90000 });
    await home.locator("[data-homeworld-viewport]").focus();
    await page.keyboard.press("KeyE");
    await scene.waitFor();
  }
  async function act(action, keyboard) {
    const before = (await read()).homeworld.childhoodV175?.revision ?? 0;
    if (keyboard) {
      await scene.getByRole("group", { name: "Terrain d’exercice", exact: true }).focus();
      await page.keyboard.press(keyboard);
    } else {
      await scene.locator('[data-childhood-action="' + action + '"]').click();
    }
    await page.waitForFunction(({ key, revision }) => JSON.parse(localStorage.getItem(key)).homeworld.childhoodV175?.revision === revision,
      { key: storageKey, revision: before + 1 });
  }
  async function walk(destination, keyTravel = false) {
    for (let step = 0; step < 18; step++) {
      const actor = (await view()).position;
      if (actor === destination) return;
      await act(actor < destination ? "east" : "west", keyTravel ? actor < destination ? "ArrowRight" : "ArrowLeft" : undefined);
    }
    assert.fail("Could not reach position " + destination);
  }
  const shot = name => scene.screenshot({ path: resolve(output, name + ".png"), animations: "disabled" });
  await page.goto("http://127.0.0.1:4275");
  await boot();
  await act("ring");
  await walk(3, true);
  await act("use", "Space");
  assert.equal((await view()).position, 0);
  await walk(3, true); await act("observe", "r"); await act("use", "Space");
  await act("beam");
  await walk(3);
  await page.reload(); await boot();
  assert.equal((await view()).position, 3);
  assert.deepEqual((await view()).finished, ["ring"]);
  while ((await view()).trial === "beam") {
    if ((await view()).drift) await act("use");
    await act("east");
  }
  await act("spring"); await walk(5); await act("observe"); await act("observe");
  await shot("cible-ouverte");
  await act("use");
  assert.deepEqual((await view()).finished, ["ring", "beam", "spring"]);
  report.checks.push("Anneau au clavier, échec et reprise, poutre reprise après reload, fenêtre de cible");
  await act("track");
  for (const position of [3, 6]) { await walk(position); await act("use"); await act("track-sign"); }
  await walk(8); await act("use"); await act("track-decoy");
  assert.equal((await view()).track.signs, 2);
  assert.equal((await view()).position, 6);
  await walk(8); await act("use"); await act("track-sign");
  await walk(9); await act("use");
  assert.equal((await view()).track.phase, "perched");
  await shot("observation-du-perchoir");
  await act("use"); await walk(0); await act("show-map");
  assert.equal((await view()).report, "map");
  await page.reload(); await boot();
  assert.equal((await view()).report, "map");
  report.checks.push("Deux traces comparées à chaque indice, fausse piste, perchoir et retour par le chemin bas, carte rechargée");
  await act("handoff");
  for (const station of [2, 4, 7]) { await walk(station); await act("use"); }
  await shot("passation");
  await scene.locator("[data-childhood-enter-dojo]").click();
  await page.locator("[data-youth-training]").waitFor({ timeout: 90000 });
  const played = await read();
  assert.equal(rank.getChronicleRank(played.prologue.chronicle), "unblooded");
  assert(played.youthTraining);
  assert(childhoodStorage.parseSaveImport(childhoodStorage.exportSave(played)).save);
  report.checks.push("Démonstration et coffre à leurs postes, franchissement et entrée au vrai dojo avec rang historique conservé");
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  if (!report.passed && page) {
    report.screen = (await page.locator("body").innerText().catch(() => "")).slice(0, 2200);
    await page.screenshot({ path: resolve(output, "failure.png"), animations: "disabled" }).catch(() => {});
    console.log("CHILDHOOD_BROWSER", JSON.stringify(report));
  }
  await browser?.close();
  await server?.close();
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
