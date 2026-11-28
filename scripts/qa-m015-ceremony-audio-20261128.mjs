import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { cohortCampaignRoute } from "../tests/helpers/solo-v68-played-route.mjs";
import { p } from "../tests/helpers/solo-v67-campaign-route.mjs";

const scorePath = "/audio/music/ceremony-m006/mus-06-clan-ceremonie.ogg";
const scoreHash = "6c04950f3712a1f34c89a242466ef4ac66e6bb1b7f0395cb09985f8f6c9e3035";
const key = "yautja-long-hunt.save";
const output = resolve(process.env.M015_QA_OUTPUT ?? "outputs/qa-m015-mus06");
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "Historical game reducers played all prior chapters up to the V68 debrief, with eleven receipts and no recognition.",
  checks: [], errors: [], passed: false,
};
assert.equal(createHash("sha256").update(await readFile("public" + scorePath)).digest("hex"), scoreHash);
const original = cohortCampaignRoute({ stop: "debrief" }).save;
original.settings.masterVolume = .65;
original.settings.musicVolume = .85;
assert.ok(p.parseSaveImport(JSON.stringify(original)).save);
assert.equal(original.soloV68.receipts.length, 11);
assert.equal(p.getChronicleRank(original.prologue.chronicle), "unblooded");
const fixture = new Map([[key, JSON.stringify(original)]]);
const store = {
  getItem: name => fixture.get(name) ?? null,
  setItem: (name, value) => fixture.set(name, value),
  removeItem: name => fixture.delete(name),
};
const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
Object.defineProperty(globalThis, "navigator", {
  configurable: true, value: { locks: { request: async (_name, _options, callback) => callback({}) } },
});
try {
  const migration = await p.migrateLegacyCampaignSlot(store);
  assert.ok(migration.ok, migration.message);
  const slot = JSON.parse(store.getItem(p.campaignSlotStorageKey(1)));
  const checkpoint = await p.saveCampaignCheckpoint(1, { kind: "auto", expectedRevision: slot.revision, location: "homeworld" }, store);
  assert.ok(checkpoint.ok, checkpoint.message);
} finally {
  if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
  else delete globalThis.navigator;
}

await mkdir(output, { recursive: true });
let server, browser, page;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port: 4277, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, channel: process.env.CHROMIUM_EXECUTABLE ? undefined : "chrome" });
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 }, reducedMotion: "reduce" });
  await context.addInitScript(({ entries, scorePath }) => {
    if (sessionStorage.getItem("m015Prepared") === null) {
      sessionStorage.setItem("m015Prepared", "true");
      for (const [name, value] of entries) localStorage.setItem(name, value);
    }
    const streams = new Map();
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function(...args) {
      if (this.src.includes(scorePath)) streams.set(this, this.src);
      return play.apply(this, args);
    };
    window.__m015Audio = () => Array.from(streams, ([media, source]) => ({
      source, paused: media.paused, time: media.currentTime, duration: media.duration, loop: media.loop,
    }));
  }, { entries: [...fixture], scorePath });
  page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on("pageerror", error => report.errors.push(error.message));
  const scene = page.locator("[data-solo-v68]");
  const canvas = scene.locator("canvas");
  const chapter = name => page.locator('[data-solo-v68][data-solo-step="' + name + '"]');
  const button = name => scene.getByRole("button", { name, exact: true });
  const saved = () => page.evaluate(name => JSON.parse(localStorage.getItem(name)), key);
  const audio = () => page.evaluate(() => window.__m015Audio());
  const playing = () => page.waitForFunction(() => {
    return window.__m015Audio().some(track => !track.paused && track.time > .05 &&
      Math.abs(track.duration - 105) < .1 && !track.loop);
  });
  const silent = () => page.waitForFunction(() => window.__m015Audio().every(track => track.paused));
  const shot = name => page.screenshot({ path: resolve(output, name + ".png"), animations: "disabled" });
  const start = async phase => {
    await page.locator("[data-campaign-menu]").waitFor();
    const continueButton = page.locator('[data-menu-action="continue"]');
    if (!await continueButton.isVisible()) await page.locator('[data-menu-section="campaign"]').click();
    await continueButton.click();
    await chapter(phase).waitFor();
    await page.locator('[data-solo-v68] canvas[data-solo-assets="true"][data-solo-armed="true"]').waitFor();
  };
  const interact = original.settings.controlBindings["pit.p1Resource"][0];

  await page.goto("http://127.0.0.1:4277");
  await start("debrief");
  assert.deepEqual(await audio(), []);
  await canvas.focus();
  await page.keyboard.down(interact);
  await chapter("recognition").waitFor();
  await page.keyboard.up(interact);
  await playing();
  const [opened] = await audio();
  assert.ok(opened.source.endsWith("?v=" + scoreHash.slice(0, 16)), opened.source);
  assert.equal((await saved()).soloV68.receipts.at(-1).id, "mentor-report");
  const browserHash = await page.evaluate(async url => {
    const response = await fetch(url);
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await response.arrayBuffer())),
      byte => byte.toString(16).padStart(2, "0")).join("");
  }, opened.source);
  assert.equal(browserHash, scoreHash);
  await shot("reconnaissance-mus06");
  report.checks.push({ checkpoint: "Mentor report entered through the existing binding", duration: opened.duration, scoreHash: browserHash });

  await button("Pause").click();
  await silent();
  const [stopped] = await audio();
  await button("Réglages").click();
  const settings = page.getByRole("dialog", { name: "Réglages du biomask" });
  await settings.waitFor();
  await page.waitForTimeout(250);
  assert.equal((await audio())[0].time, stopped.time);
  await settings.getByRole("button", { name: "Fermer", exact: true }).click();
  await button("Reprendre").click();
  await page.waitForFunction(time => {
    const tracks = window.__m015Audio();
    return tracks.length === 1 && !tracks[0].paused && tracks[0].time > time + .05;
  }, stopped.time);
  report.checks.push({ checkpoint: "Pause and settings retained the same stream at its current playhead", pausedAt: stopped.time });

  await button("Pause").click();
  await button("Sauvegarder et quitter").click();
  await scene.waitFor({ state: "detached" });
  await silent();
  assert.equal((await saved()).soloV68.checkpoint.phase, "recognition");
  await page.reload();
  await start("recognition");
  await playing();
  assert.equal((await saved()).soloV68.receipts.length, 12);
  await shot("reprise-reconnaissance");
  report.checks.push({ checkpoint: "Cold resume reopened the same saved phase with the registered score", receipts: 12 });

  await canvas.focus();
  await page.keyboard.down(interact);
  await chapter("complete").waitFor();
  await page.keyboard.up(interact);
  await scene.locator("[data-solo-return]").waitFor();
  const completed = await saved();
  assert.equal(completed.soloV68.receipts.length, 13);
  assert.equal(p.getChronicleRank(completed.prologue.chronicle), "young-blood");
  assert.equal(completed.soloV68.receipts.at(-1).id, "aspirant-recognition");
  report.checks.push({ checkpoint: "The final native interaction granted the Young Blood receipt", receipts: 13 });
  await button("Sauvegarder et quitter").click();
  await scene.waitFor({ state: "detached" });
  await silent();
  assert.equal((await saved()).soloV68.status, "completed");
  report.checks.push({ checkpoint: "The native save-and-exit stops the registered score with the final receipt persisted", activeStreams: 0 });
  assert.deepEqual(report.errors, []);
  report.passed = true;
  console.log(JSON.stringify(report));
} catch (error) {
  report.failure = String(error.stack ?? error);
  report.scene = await page?.locator("[data-solo-v68]").getAttribute("data-solo-step", { timeout: 1500 }).catch(() => null);
  report.audio = await page?.evaluate(() => window.__m015Audio?.()).catch(() => null);
  report.visible = await page?.locator("body").innerText({ timeout: 1500 }).then(text => text.slice(0, 2200)).catch(() => "");
  console.error(JSON.stringify(report));
  await page?.screenshot({ path: resolve(output, "echec.png") }).catch(() => {});
  throw error;
} finally {
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server?.close();
}
