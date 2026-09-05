import { _electron as electron } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const evidence = path.resolve("tmp/desktop-qa");
await fs.mkdir(evidence, { recursive: true });
const profile = await fs.mkdtemp(path.join(evidence, "profile-"));
const executablePath = path.resolve("tmp/desktop-release/Yautja-La-Longue-Chasse-win32-x64/Yautja-La-Longue-Chasse.exe");
const checks = [];
const errors = [];
const failedLocalRequests = [];
async function launch() {
  const instance = await electron.launch({ executablePath, env: { ...process.env, YAUTJA_DESKTOP_QA_PROFILE: profile }, timeout: 60000 });
  const page = await instance.firstWindow();
  // Keep automated hidden-window simulation ticking; this is not a performance benchmark.
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
    return { asset: asset.status, bytes: (await asset.arrayBuffer()).byteLength, privateFile: privateFile.status };
  });
  assert.equal(local.asset, 200); assert.ok(local.bytes > 10000); assert.equal(local.privateFile, 403);
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
  await page.getByRole("button", { name: /THE PIT.*combat/i }).click();
  await page.getByRole("radio", { name: /Entraînement/ }).click();
  await page.getByRole("button", { name: /ENTRER DANS L’ARÈNE/ }).click();
  await page.getByRole("region", { name: "Combat THE PIT" }).waitFor();
  assert.ok(await page.locator("canvas").count() > 0);
  checks.push("Hub to THE PIT training arena loads locally.");

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
  checks.push("Campaign bytes, suspended hunt and setting retained after clean process exit and cold restart.");
  await close(current.instance); current = undefined;
  assert.deepEqual(errors, []);
  assert.deepEqual(failedLocalRequests, []);
  await fs.writeFile(path.join(evidence, "verification.json"), JSON.stringify({ passed: true, executablePath, profile, checks, errors, failedLocalRequests, testedAt: new Date().toISOString(), limit: "Hidden automated session; not a physical controller, performance or full campaign certification." }, null, 2));
  console.log(JSON.stringify({ passed: true, checks, errors, failedLocalRequests }, null, 2));
} finally {
  if (current) await close(current.instance);
}
