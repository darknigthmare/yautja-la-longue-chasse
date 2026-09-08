import { _electron as electron } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { DESKTOP_VERSION, DESKTOP_RELEASE_TAG } from "../desktop/release.mjs";

const evidence = path.resolve("tmp/desktop-qa", DESKTOP_RELEASE_TAG);
await fs.mkdir(evidence, { recursive: true });
const profile = await fs.mkdtemp(path.join(evidence, "profile-"));
const executablePath = path.resolve("tmp/desktop-release", DESKTOP_RELEASE_TAG, "Yautja-La-Longue-Chasse-win32-x64/Yautja-La-Longue-Chasse.exe");
const checks = [];
const errors = [];
const failedLocalRequests = [];
async function launch() {
  const instance = await electron.launch({ executablePath, env: { ...process.env, YAUTJA_DESKTOP_QA_PROFILE: profile }, timeout: 60000 });
  const page = await instance.firstWindow();
  // A hidden Electron window can deliver only one compositor frame despite
  // backgroundThrottling=false. Control the browser clock for this QA profile;
  // keep real keyboard input and game/save logic unchanged. This is not a
  // hardware cadence or visible-window performance measurement.
  await page.clock.install();
  await page.reload();
  await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.setBackgroundThrottling(false));
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => { if (request.url().startsWith("yautja:")) failedLocalRequests.push({ url: request.url(), error: request.failure() }); });
  await page.getByRole("button", { name: "Jouer", exact: true }).waitFor({ timeout: 30000 });
  return { instance, page };
}
async function close(instance) {
  // Exercise the actual close handler and flush, without an unattended native dialog.
  await instance.evaluate(({ dialog, BrowserWindow }) => {
    dialog.showMessageBoxSync = () => 1;
    BrowserWindow.getAllWindows().find((win) => new URL(win.webContents.getURL()).pathname === "/")?.close();
  }).catch(() => {});
  await instance.close().catch(() => {});
}
let current;
try {
  current = await launch();
  const { instance, page } = current;
  assert.equal(page.url(), "yautja://game/");
  assert.equal(await instance.evaluate(({app})=>app.getVersion()),DESKTOP_VERSION);
  const security = await instance.evaluate(({ BrowserWindow }) => {
    const prefs = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return { sandbox: prefs.sandbox, contextIsolation: prefs.contextIsolation, nodeIntegration: prefs.nodeIntegration, webSecurity: prefs.webSecurity };
  });
  assert.deepEqual(security, { sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true });
  assert.deepEqual(await page.evaluate(() => ({ require: typeof window.require, process: typeof window.process })), { require: "undefined", process: "undefined" });
  const blocked = await instance.evaluate(async ({ session }) => {
    try { await session.defaultSession.fetch("https://example.com/yautja-offline-probe"); return false; } catch { return true; }
  });
  assert.equal(blocked, true);
  const local = await page.evaluate(async () => {
    const asset = await fetch("/game/assets/v23/pit/fighters/jungle-hunter-key-art.webp");
    const privateFile = await fetch("/.env.local");
    const audio = await fetch("/audio/manifest.json");
    const inventory = audio.ok ? await audio.json() : null;
    return { asset: asset.status, bytes: (await asset.arrayBuffer()).byteLength, privateFile: privateFile.status, audio: audio.status, audioSlots: inventory?.entries?.length };
  });
  assert.equal(local.asset, 200); assert.ok(local.bytes > 10000); assert.equal(local.privateFile, 403); assert.equal(local.audio,200); assert.equal(local.audioSlots,37);
  checks.push("Packaged EXE boots, renderer sandboxed, network blocked, bundled art readable, private paths rejected.");

  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await page.getByRole("checkbox", { name: "Violence atténuée" }).check();
  const exportPath = path.join(evidence, "exported-campaign.json");
  await instance.evaluate(({ session }, target) => {
    globalThis.yautjaQaDownload = new Promise((resolve) => {
      session.defaultSession.once("will-download", (_event, item) => {
        item.setSavePath(target);
        item.once("done", (_doneEvent, state) => resolve(state));
      });
    });
  }, exportPath);
  await page.getByRole("button", { name: "Exporter la campagne", exact: true }).click();
  assert.equal(await instance.evaluate(() => globalThis.yautjaQaDownload), "completed");
  const exportText = await fs.readFile(exportPath, "utf8");
  assert.ok(exportText.length > 500); assert.ok(JSON.parse(exportText));
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  let saved = await page.evaluate(() => localStorage.getItem("yautja-long-hunt.save"));
  assert.ok(saved && saved.length > 500);
  checks.push("Real setting persisted; campaign exported through the native download path.");

  await page.getByRole("button", { name: "Jouer", exact: true }).click();

  await page.getByRole("button", { name: "Yautja Prime · monde natal", exact: true }).click();
  await page.locator("[data-homeworld-hub]").waitFor();
  const city = page.getByRole("group", { name: "Cité jouable en deux dimensions" });
  const cityX = () => page.locator("[data-homeworld-actor]").getAttribute("data-x").then(Number);
  const walkTo = async (target) => {
    for (let attempt = 0; attempt < 40; attempt++) {
      const x = await cityX(); if (Math.abs(x - target) < 20) return;
      await city.focus(); const key = x < target ? "ArrowRight" : "ArrowLeft";
      await page.keyboard.down(key); await page.clock.runFor(Math.round(Math.min(700,Math.abs(x-target)/300*1000))); await page.keyboard.up(key);
      await page.clock.runFor(80);
    }
    throw new Error("Homeworld target was not reached: " + target);
  };
  await walkTo(440); await city.focus(); await page.keyboard.press("e");
  await page.getByRole("dialog").waitFor(); await page.getByRole("button", { name: "Revenir à la cité", exact: true }).click(); await page.getByRole("dialog").waitFor({state:"hidden"}); await page.clock.runFor(64);
  await walkTo(960); await city.focus(); await page.keyboard.press("e");
  await page.getByRole("dialog").waitFor(); await page.getByRole("button", { name: "Revenir à la cité", exact: true }).click(); await page.getByRole("dialog").waitFor({state:"hidden"}); await page.clock.runFor(64);
  const citySave = JSON.parse(await page.evaluate(() => localStorage.getItem("yautja-long-hunt.save")));
  assert.ok(citySave.homeworld.visitedDistrictIds.includes("port"));
  assert.ok(citySave.homeworld.evidenceIds.includes("suspect-trophy"));
  assert.ok(citySave.homeworld.greetedNpcIds.includes("dock-officer"));
  await page.screenshot({path:path.join(evidence,"homeworld-pc.png")});
  await walkTo(1080); await city.focus(); await page.keyboard.press("e");
  await page.getByRole("button",{name:"Partir vers les Marches de Cendre",exact:true}).click();
  await page.getByRole("region",{name:"Expédition des Marches de Cendre",exact:true}).waitFor();
  await page.getByRole("button",{name:"Retour sans rapport",exact:true}).click();
  await page.getByRole("button",{name:"Abandonner et rentrer",exact:true}).click();
  await page.locator("[data-homeworld-hub]").waitFor();
  await page.getByRole("button",{name:/^Dossier ·/}).click();
  await page.getByRole("heading",{name:"Dossier des Enforcers",exact:true}).waitFor();
  await page.getByRole("article").filter({has:page.getByRole("heading",{name:"Enquêter sur la marque falsifiée",exact:true})}).getByRole("button",{name:"Examiner ce choix",exact:true}).click();
  await page.getByRole("button",{name:"Confirmer ce choix",exact:true}).click();
  const justiceSave = JSON.parse(await page.evaluate(() => localStorage.getItem("yautja-long-hunt.save")));
  assert.equal(justiceSave.justice.originChoice,"investigator");
  assert.notEqual(justiceSave.justice.declaration,"bad-blood");
  assert.equal(justiceSave.profile.honor,citySave.profile.honor);
  await page.screenshot({path:path.join(evidence,"justice-pc.png")});
  await page.getByRole("button",{name:"Fermer le dossier",exact:true}).click();
  await page.getByRole("button",{name:"Rejoindre le vaisseau",exact:true}).click();
  checks.push("Homeworld movement, NPC greeting and first evidence persist offline; Marches introduction enters and exits; Justice investigator choice preserves honor.");
  await page.getByRole("button", { name: /THE PIT.*combat/i }).click();
  await page.getByRole("radio", { name: /Entraînement/ }).click();
  await page.getByRole("button", { name: /ENTRER DANS L’ARÈNE/ }).click();
  await page.getByRole("region", { name: "Combat THE PIT" }).waitFor();
  assert.ok(await page.locator("canvas").count() > 0);
  await page.locator('[data-pit-bitmap-slot="0"][data-pit-bitmap-id="jungle-hunter"][data-pit-bitmap-status="static-bitmap"]').waitFor();
  await page.locator('[data-pit-bitmap-slot="1"][data-pit-bitmap-id="berserker"][data-pit-bitmap-status="static-bitmap"]').waitFor();
  await page.screenshot({ path: path.join(evidence, "pit-combat-pc.png") });
  checks.push("Hub to THE PIT training arena loads locally, with the exact Jungle Hunter and Berserker fixed-pose PNGs.");

  await page.goto("yautja://game/");
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await page.getByRole("button", { name: /^Console du vaisseau$/i }).click();
  await page.getByRole("button", { name: /^Ouvrir la carte galactique/i }).click();
  for (let level = 0; level < 3; level++) {
    await page.getByRole("button", { name: /^Tracer la route$/i }).first().click();
    await page.getByRole("button", { name: /^Entrer$/i }).press("Enter");
  }
  await page.getByRole("button", { name: /^Sang dans la canopée/i }).click();
  await page.getByRole("button", { name: /^Préparer la chasse$/i }).click();
  await page.getByRole("button", { name: /^Départ rapide$/i }).click();
  await page.getByRole("group", { name: "État du chasseur" }).waitFor();
  const pause = page.getByRole("button", { name: "Mettre en pause et consulter la carte", exact: true });
  if (await pause.count()) await pause.click();
  await page.getByRole("button", { name: "Suspendre et sauvegarder", exact: true }).click();
  const suspended = await page.evaluate(() => localStorage.getItem("yautja-long-hunt.active-hunt"));
  assert.ok(suspended && suspended.length > 500);
  saved = await page.evaluate(() => localStorage.getItem("yautja-long-hunt.save"));
  checks.push("Local galaxy route to Oseris, mission briefing, deployment and suspended hunt saved.");


  await close(instance); current = undefined;
  current = await launch();
  assert.equal(await current.page.evaluate(() => localStorage.getItem("yautja-long-hunt.save")), saved);
  await current.page.getByRole("button", { name: /^Reprendre la chasse :/ }).waitFor();
  await current.page.getByRole("button", { name: "Réglages", exact: true }).click();
  assert.equal(await current.page.getByRole("checkbox", { name: "Violence atténuée" }).isChecked(), true);
  const restarted=JSON.parse(await current.page.evaluate(()=>localStorage.getItem("yautja-long-hunt.save")));
  assert.equal(restarted.justice.originChoice,"investigator"); assert.ok(restarted.homeworld.evidenceIds.includes("suspect-trophy"));
  checks.push("Campaign bytes, suspended hunt, Homeworld evidence, Justice choice and setting retained after clean process exit and cold restart.");
  await close(current.instance); current = undefined;
  assert.deepEqual(errors, []);
  assert.deepEqual(failedLocalRequests, []);
  await fs.writeFile(path.join(evidence, "verification.json"), JSON.stringify({ passed: true, executablePath, profile, checks, errors, failedLocalRequests, testedAt: new Date().toISOString(), limit: "Hidden automated session with controlled browser clock and real keyboard input; visible-window hardware cadence, physical controller, performance and full campaign are not certified." }, null, 2));
  console.log(JSON.stringify({ passed: true, checks, errors, failedLocalRequests }, null, 2));
} finally {
  if (current) await close(current.instance);
}
