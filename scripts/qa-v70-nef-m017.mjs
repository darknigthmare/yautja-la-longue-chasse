import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { p as archive } from "../tests/helpers/solo-v67-campaign-route.mjs";
import { templeCampaignRoute, thresholdsTemple as temple } from "../tests/helpers/solo-v70-played-route.mjs";

const initial = templeCampaignRoute({ stop: "separation" }).save;
const { leverX, upperY, regroupX, holdTicks } = temple.SOLO_V70_NEF_RELAY_M017;
const key = "yautja-long-hunt.save";
const fixture = new Map([[key, JSON.stringify(initial)]]);
const storage = { getItem: k => fixture.get(k) ?? null, setItem: (k, v) => fixture.set(k, v), removeItem: k => fixture.delete(k) };
const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: { request: async (_name, _opts, fn) => fn({}) } } });
try {
  assert((await archive.migrateLegacyCampaignSlot(storage)).ok);
  const slot = JSON.parse(storage.getItem(archive.campaignSlotStorageKey(1)));
  assert((await archive.saveCampaignCheckpoint(1, { kind: "auto", expectedRevision: slot.revision, location: "homeworld" }, storage)).ok);
} finally {
  if (descriptor) Object.defineProperty(globalThis, "navigator", descriptor);
  else delete globalThis.navigator;
}

const output = resolve("outputs/qa-v70-nef-m017");
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  fixture: "Prior chapters and the initial Nef configuration are played by the repository's existing motor.",
  checks: [], errors: [], passed: false,
};
await mkdir(output, { recursive: true });
let server, browser, page, read;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port: 4279, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  await context.addInitScript(entries => {
    if (sessionStorage.getItem("nefM017Ready")) return;
    sessionStorage.setItem("nefM017Ready", "1");
    for (const [name, value] of entries) localStorage.setItem(name, value);
  }, [...fixture]);
  page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", error => report.errors.push(error.message));
  const canvas = page.locator("[data-solo-v70] canvas");
  const bindings = initial.settings.controlBindings;
  const controls = { left: bindings["pit.p1MoveLeft"][0], right: bindings["pit.p1MoveRight"][0],
    jump: bindings["pit.p1Jump"][0], command: bindings["pit.p1AttackMedium"][0], interact: bindings["pit.p1Resource"][0] };
  read = () => canvas.evaluate(element => JSON.parse(element.dataset.soloState));
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).soloV70, key);
  const wait = time => page.clock.runFor(time);
  async function boot() {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    const play = page.getByRole("button", { name: "Jouer", exact: true });
    await play.or(canvas).first().waitFor({ timeout: 90000 });
    if (await play.isVisible()) await play.click();
    await canvas.waitFor({ timeout: 90000 });
    await page.waitForFunction(() => document.querySelector("[data-solo-v70] canvas")?.dataset.soloAssets === "true", null, { timeout: 90000 });
    await canvas.focus();
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    await wait(120);
  }
  async function hold(action, time) {
    await page.keyboard.down(controls[action]);
    await wait(time);
    await page.keyboard.up(controls[action]);
    await wait(60);
  }
  async function walk(target) {
    for (let cycle = 0; cycle < 90; cycle++) {
      const distance = target - (await read()).player.x;
      if (Math.abs(distance) < 8) return;
      await hold(distance < 0 ? "left" : "right", Math.min(170, Math.max(20, Math.abs(distance) * 1000 / 210)));
    }
    assert.fail("Could not walk to " + target + ", state " + JSON.stringify(await read()));
  }

  await page.goto("http://127.0.0.1:4279");
  await page.clock.install();
  await boot();
  assert.equal((await read()).phase, "separation");
  await hold("command", 90);
  await walk(leverX);
  await hold("interact", holdTicks * 17 + 100);
  assert.equal((await read()).nefRelayM017, undefined);
  await hold("jump", 80);
  await wait(950);
  assert.equal((await read()).player.y, upperY);
  await canvas.screenshot({ path: resolve(output, "appui-superieur.png"), animations: "disabled" });
  await hold("interact", holdTicks * 17 + 150);
  const relay = (await saved()).checkpoint.nefRelayM017;
  assert(relay);
  assert.equal((await saved()).checkpoint.companionMode, "follow");
  report.checks.push("La commande ne répond qu’après le saut jusqu’à son appui, le Signal et le maintien effectif.");

  await page.clock.resume();
  await page.reload();
  await boot();
  assert.deepEqual((await saved()).checkpoint.nefRelayM017, relay);
  await walk(800);
  await wait(1100);
  assert.equal((await read()).player.y, 430);
  await walk(regroupX);
  await wait(1350);
  assert(temple.soloV70TrioPresent(await read()));
  await canvas.screenshot({ path: resolve(output, "regroupement-aval.png"), animations: "disabled" });
  await hold("interact", 110);
  await wait(400);
  assert.equal((await saved()).checkpoint.phase, "drone");
  assert.equal((await saved()).receipts.at(-1).id, "triad-rejoined");
  report.checks.push("Après rechargement, le joueur redescend, attend les deux partenaires et consigne la sortie au point de rendez-vous.");
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  if (!report.passed && page) {
    report.state = await read?.().catch(() => null);
    report.screen = (await page.locator("body").innerText().catch(() => "")).slice(0, 2400);
    await page.screenshot({ path: resolve(output, "failure.png"), animations: "disabled" }).catch(() => {});
  }
  console.log("M017_NEF_BROWSER", JSON.stringify(report));
  await browser?.close();
  await server?.close();
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
