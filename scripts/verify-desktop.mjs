import { _electron as electron } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { DESKTOP_VERSION, DESKTOP_RELEASE_TAG } from "../desktop/release.mjs";
import { desktopBuildPaths, assertDesktopOutputSafety } from "../desktop/build-paths.mjs";

import { campaignFixture } from "./campaign-browser-helpers.mjs";
import { selectPitMatch, returnPitSelection } from "./pit-selection-browser-helpers.mjs";
import { verifyDesktopNewCampaign, verifyDesktopPitIntro, advanceDesktopUntil } from "./desktop-current-flows.mjs";
import { verifyDesktopYouthPatrol, createDesktopHomeworldDriver } from "./desktop-youth-patrol-v52.mjs";

const EXPECTED_CONTENT_VERSION = DESKTOP_RELEASE_TAG.toUpperCase();

const paths = desktopBuildPaths();
await assertDesktopOutputSafety(paths);
const evidence = paths.evidence;
await fs.mkdir(evidence, { recursive: true });
const profiles = {
  fresh: await fs.mkdtemp(path.join(evidence, "profile-new-")),
  adult: await fs.mkdtemp(path.join(evidence, "profile-legacy-")),
  youth: await fs.mkdtemp(path.join(evidence, "profile-patrol-")),
};
// Never seed or clear the user's normal PC profile. Every scenario owns its directory.
const profile = profiles.adult;
const executablePath = path.join(paths.directory, "Yautja-La-Longue-Chasse.exe");
const checks = [];
const errors = [];
const recordCheck = check => { checks.push(check); console.log(JSON.stringify({ checkpoint: check })); };
const failedLocalRequests = [];
async function launch(qaProfile = profile) {
  const instance = await electron.launch({ executablePath, env: { ...process.env, YAUTJA_DESKTOP_QA_PROFILE: qaProfile }, timeout: 60000 });
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
  await page.locator('[data-campaign-menu="main"]').waitFor({ timeout: 30000 });
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
async function captureWindow(instance, fileName) {
  // Playwright's page screenshot can stall on the hidden Electron compositor.
  // Capture through Electron itself so visual evidence remains deterministic.
  const pngBase64 = await instance.evaluate(async ({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    if (!window) throw new Error("Desktop window is unavailable for capture.");
    const image = await window.webContents.capturePage();
    return image.toPNG().toString("base64");
  });
  const bytes = Buffer.from(pngBase64, "base64");
  assert.ok(bytes.length > 1_000, `Desktop capture ${fileName} is unexpectedly empty.`);
  await fs.writeFile(path.join(evidence, fileName), bytes);
  if (fileName.startsWith("pit-")) {
    // Hidden-window compositor captures can lag behind the DOM. Read the real
    // combat canvas pixels and their runtime markers as independent evidence.
    const gamePage = instance.windows().find(candidate => candidate.url() === "yautja://game/");
    assert(gamePage, "The packaged game page must exist for combat capture.");
    const canvas = await gamePage.evaluate(() => {
      const element = document.querySelector("canvas[data-pit-arena-id]");
      if (!element) return null;
      return { png: element.toDataURL("image/png"), arena: { ...element.dataset }, simulationFrame: document.querySelector("[data-pit-frame]")?.dataset.pitFrame, fighters: [...document.querySelectorAll("[data-pit-bitmap-slot]")].map(node => ({ ...node.dataset })) };
    });
    assert(canvas && canvas.arena.pitArenaArtStatus === "bitmap", "Combat capture must contain the active bitmap arena.");
    const stem = fileName.replace(/\.png$/, "");
    await fs.writeFile(path.join(evidence, stem + "-canvas.png"), Buffer.from(canvas.png.split(",")[1], "base64"));
    const state = { arena: canvas.arena, simulationFrame: canvas.simulationFrame, fighters: canvas.fighters };
    await fs.writeFile(path.join(evidence, stem + "-state.json"), JSON.stringify({ ...state, combatPixelsSource: "HTMLCanvasElement.toDataURL", windowCompositorMayLagWhenHidden: true }, null, 2));
  } else if (fileName.startsWith("patrol-")) {
    const gamePage = instance.windows().find(candidate => candidate.url() === "yautja://game/");
    const canvas = await gamePage.evaluate(() => {
      const element = document.querySelector("canvas[data-youth-stage]");
      return element ? { png: element.toDataURL("image/png"), state: { ...element.dataset } } : null;
    });
    assert(canvas && canvas.state.youthAssets === "true", "Patrol capture requires the real loaded youth Canvas.");
    const stem = fileName.replace(/\.png$/, "");
    await fs.writeFile(path.join(evidence, stem + "-canvas.png"), Buffer.from(canvas.png.split(",")[1], "base64"));
    await fs.writeFile(path.join(evidence, stem + "-state.json"), JSON.stringify({ ...canvas.state, pixelsSource: "HTMLCanvasElement.toDataURL", windowCompositorMayLagWhenHidden: true }, null, 2));
  }

}
let current;
try {
  current = await launch(profiles.fresh);
  await verifyDesktopNewCampaign(current.page, name => captureWindow(current.instance, name), checks);
  await close(current.instance); current = undefined;
  current = await launch(profiles.adult);
  const { instance, page } = current;
  const fixture = await campaignFixture();
  await page.evaluate(({key, save}) => {
    if (Object.keys(localStorage).length) throw new Error("Adult fixture requires an empty isolated QA profile");
    localStorage.setItem(key, JSON.stringify(save));
  }, fixture);
  await page.reload();
  await page.getByRole("button", { name: /^Continuer/ }).click();
  await page.locator('[data-campaign-location="deck"]').waitFor();
  assert.equal(page.url(), "yautja://game/");
  assert.equal(await instance.evaluate(({app})=>app.getVersion()),DESKTOP_VERSION);
  assert.equal(
    await page.locator("[data-game-content-version]").first().getAttribute("data-game-content-version"),
    EXPECTED_CONTENT_VERSION,
  );
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
  recordCheck("Packaged EXE boots with the expected release content marker, renderer sandboxed, network blocked, bundled art readable, private paths rejected.");

  const gallerySaveBefore = await page.evaluate(() => localStorage.getItem("yautja-long-hunt.save"));
  await page.getByRole("button", { name: "Dossier de campagne", exact: true }).click();
  await page.getByRole("button", { name: "Mondes et réserves", exact: true }).click();
  const gallery = page.locator('[data-tribe-source-gallery="v37"]');
  await gallery.waitFor();
  await gallery.getByRole("searchbox").fill("Mycora");
  const originalLink = gallery.getByRole("link", { name: "Ouvrir en pleine résolution", exact: true });
  const originalUrl = new URL(await originalLink.getAttribute("href"), page.url()).href;
  const originalWindow = instance.waitForEvent("window");
  await originalLink.click();
  const imagePage = await originalWindow;
  await imagePage.waitForLoadState("domcontentloaded");
  await imagePage.waitForFunction(() => document.querySelector("img")?.complete && document.querySelector("img").naturalWidth > 0);
  assert.equal(imagePage.url(), originalUrl);
  const dimensions = await imagePage.locator("img").evaluate(image => ({ width: image.naturalWidth, height: image.naturalHeight }));
  assert(dimensions.width >= 1000 && dimensions.height >= 1000);
  const imageSecurity = await instance.evaluate(({ BrowserWindow }, url) => {
    const prefs = BrowserWindow.getAllWindows().find(win => win.webContents.getURL() === url).webContents.getLastWebPreferences();
    return { sandbox: prefs.sandbox, contextIsolation: prefs.contextIsolation, nodeIntegration: prefs.nodeIntegration, webSecurity: prefs.webSecurity };
  }, originalUrl);
  assert.deepEqual(imageSecurity, security);
  const windowCount = await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  await originalLink.click();
  assert.equal(await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), windowCount, "Repeated image link reuses its auxiliary window");
  for (const denied of ["yautja://game/game/unknown/index.html", "yautja://game/game/test.svg", "yautja://game/game/test.js", "https://example.com/desktop-denied"]) {
    await page.evaluate(url => { window.open(url, "_blank"); }, denied);
    await page.clock.runFor(32);
    assert.equal(await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), windowCount, "Denied auxiliary URL: " + denied);
  }
  const imageCapture = await instance.evaluate(async ({ BrowserWindow }, url) => (await BrowserWindow.getAllWindows().find(win => win.webContents.getURL() === url).webContents.capturePage()).toPNG().toString("base64"), originalUrl);
  await fs.writeFile(path.join(evidence, "gallery-original-pc.png"), Buffer.from(imageCapture, "base64"));
  await imagePage.close();
  assert.equal(await page.evaluate(() => localStorage.getItem("yautja-long-hunt.save")), gallerySaveBefore);
  await page.locator("[data-clan-chronicle]").getByRole("button", { name: "Retour", exact: true }).click();
  recordCheck("Offline gallery opens a decoded full-resolution local raster in a sandboxed auxiliary window, reuses it, rejects HTML/SVG/JS/external windows and preserves the save.");

  await page.getByRole("button", { name: "Pause / réglages", exact: true }).click();
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
  await page.getByRole("button", { name: "Exporter la campagne légère", exact: true }).click();
  assert.equal(await instance.evaluate(() => globalThis.yautjaQaDownload), "completed");
  const exportText = await fs.readFile(exportPath, "utf8");
  assert.ok(exportText.length > 500); assert.ok(JSON.parse(exportText));
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  let saved = await page.evaluate(() => localStorage.getItem("yautja-long-hunt.save"));
  assert.ok(saved && saved.length > 500);
  recordCheck("Real setting persisted; campaign exported through the native download path.");

  await page.getByRole("button", { name: "Yautja Prime · monde natal", exact: true }).click();
  await page.locator("[data-homeworld-hub]").waitFor();
  const city = page.getByRole("group", { name: "Cité jouable en perspective 2.5D" });
  await city.waitFor();
  await page.locator("[data-homeworld-hub]").evaluate(root => Promise.all([...root.querySelectorAll("img")].map(image => image.decode())));
  const cityComposition = await page.locator("[data-homeworld-hub]").evaluate((root) => ({
    districts: root.querySelectorAll("[data-texture]").length,
    buildings: root.querySelectorAll("[data-variant]").length,
    playerBodies: root.querySelectorAll('[data-homeworld-actor] [data-homeworld-layer="body"], [data-homeworld-actor] [data-whole-character-plate="true"]').length,
    npcs: [...root.querySelectorAll('[data-has-npc="true"]')].map(point => ({ id: point.dataset.pointId, bodies: point.querySelectorAll('[data-homeworld-layer="body"]').length, decoded: [...point.querySelectorAll('img')].every(image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) })),
  }));
  assert.equal(cityComposition.districts, 12);
  assert.equal(cityComposition.buildings, 13);
  assert.equal(cityComposition.playerBodies, 1, "One real bitmap player body is mounted");
  assert.equal(cityComposition.npcs.length, 12, "All twelve NPCs use their actual modular bitmap compositions");
  assert.equal(new Set(cityComposition.npcs.map(npc => npc.id)).size, cityComposition.npcs.length);
  assert(cityComposition.npcs.every(npc => npc.bodies === 1 && npc.decoded), "All NPC body/clothing/dread images decode locally");
  await fs.writeFile(path.join(evidence, "homeworld-composition.json"), JSON.stringify(cityComposition, null, 2));
  const cityDriver = await createDesktopHomeworldDriver(page);
  const walkTo = (x, y, tolerance = 65) => cityDriver.walkTo({ x, y }, tolerance);
  await walkTo(690, 2080); await city.focus(); await page.keyboard.press("e");
  await page.getByRole("dialog").waitFor(); await page.getByRole("button", { name: "Revenir à la cité", exact: true }).click(); await page.getByRole("dialog").waitFor({state:"hidden"}); await page.clock.runFor(64);
  await walkTo(1040, 1970); await city.focus(); await page.keyboard.press("e");
  await page.getByRole("dialog").waitFor(); await page.getByRole("button", { name: "Revenir à la cité", exact: true }).click(); await page.getByRole("dialog").waitFor({state:"hidden"}); await page.clock.runFor(64);
  const citySave = JSON.parse(await page.evaluate(() => localStorage.getItem("yautja-long-hunt.save")));
  assert.ok(citySave.homeworld.visitedDistrictIds.includes("port"));
  assert.ok(citySave.homeworld.evidenceIds.includes("suspect-trophy"));
  assert.ok(citySave.homeworld.greetedNpcIds.includes("dock-officer"));
  await captureWindow(instance, "homeworld-pc.png");
  await walkTo(970, 1770, 95); await city.focus(); await page.keyboard.press("e");
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
  await captureWindow(instance, "justice-pc.png");
  await page.getByRole("button",{name:"Fermer le dossier",exact:true}).click();
  await page.getByRole("button",{name:"Rejoindre le vaisseau",exact:true}).click();
  recordCheck("Homeworld movement, NPC greeting and first evidence persist offline; Marches introduction enters and exits; Justice investigator choice preserves honor.");
  await page.getByRole("button", { name: /THE PIT.*combat/i }).click();
  await page.getByRole("radio", { name: /^Versus local/ }).click();
  await selectPitMatch(page, { player: "jungle-hunter", opponent: "berserker", arena: "the-pit" });
  await verifyDesktopPitIntro(page, name => captureWindow(instance, name), checks);
  await page.getByRole("region", { name: "Combat THE PIT" }).waitFor();
  assert.ok(await page.locator("canvas").count() > 0);
  const pitCanvas = page.getByRole("region", { name: "Combat THE PIT" }).locator("canvas");
  await page.clock.runFor(64);
  const pitCameraZoom = Number(await pitCanvas.getAttribute("data-pit-camera-zoom"));
  assert.ok(Number.isFinite(pitCameraZoom) && pitCameraZoom >= 1);
  await page.locator('[data-pit-bitmap-slot="0"][data-pit-bitmap-id="jungle-hunter"][data-pit-bitmap-status="sprite-sheet-animation"]').waitFor({ state: "attached" });
  await page.locator('[data-pit-bitmap-slot="1"][data-pit-bitmap-id="berserker"][data-pit-bitmap-status="sprite-sheet-animation"]').waitFor({ state: "attached" });
  await pitCanvas.locator('xpath=self::*[@data-pit-arena-planes="P0,P1,P2,P3,P4,P5"]').waitFor();
  assert.equal(await pitCanvas.getAttribute("data-pit-arena-missing-assets"), "0");
  await captureWindow(instance, "pit-combat-pc.png");
  recordCheck("Hub to THE PIT loads locally with authored Jungle Hunter and Berserker animations.");

  for (const scenario of [
    { arenaId: "arena-009-quais-du-premier-sang", player: "tracker", opponent: "greyback" },
    { arenaId: "arena-020-trone-fracture", player: "greyback", opponent: "tracker" },
    { arenaId: "arena-009-quais-du-premier-sang", player: "theta", opponent: "machiko-noguchi" },
  ]) {
    await returnPitSelection(page);
    await selectPitMatch(page, { player: scenario.player, opponent: scenario.opponent, arena: scenario.arenaId, launch: false });
    for (const modeLabel of [/Arcade individuel/, /Circuit du clan/, /Descente/]) {
      assert.equal(await page.getByRole("radio", { name: modeLabel }).isDisabled(), true);
    }
    await page.locator('[data-pit-selection-confirm]').click();
    await advanceDesktopUntil(page, () => page.locator('[data-pit-immersive]').evaluate(node => node.dataset.pitPresentationPhase === 'fight' && node.dataset.pitPresentationBlocked === 'false'), 'extension fight phase');
    await page.clock.runFor(100);
    const extensionCanvas = page.locator('canvas[data-pit-arena-id="' + scenario.arenaId + '"]');
    await extensionCanvas.locator('xpath=self::*[@data-pit-arena-art-status="bitmap"]').waitFor();
    assert.equal(await extensionCanvas.getAttribute("data-pit-arena-loaded-images"), "14");
    assert.equal(await extensionCanvas.getAttribute("data-pit-arena-planes"), "P0,P1,P2,P3,P4,P5");
    assert.equal(await extensionCanvas.getAttribute("data-pit-arena-missing-assets"), "0");
    for (const [slot, fighterId] of [scenario.player, scenario.opponent].entries()) {
      await page.locator('[data-pit-bitmap-slot="' + slot + '"][data-pit-bitmap-id="' + fighterId + '"][data-pit-bitmap-status="sprite-sheet-animation"]').waitFor({ state: "attached" });
    }
    const before = Number(await page.locator("[data-pit-frame]").first().getAttribute("data-pit-frame"));
    await page.keyboard.down("ArrowRight");
    await page.clock.runFor(350);
    await page.keyboard.up("ArrowRight");
    assert(Number(await page.locator("[data-pit-frame]").first().getAttribute("data-pit-frame")) > before);
    await captureWindow(instance, "pit-pc-" + scenario.player + "-" + scenario.arenaId + ".png");
    recordCheck("Packaged extension duel " + scenario.player + "/" + scenario.opponent + " on " + scenario.arenaId + ": 14 bitmaps, six planes, both authored idle facings and advancing keyboard simulation; no borrowed progression.");
  }


  await page.goto("yautja://game/");
  await page.getByRole("button", { name: /^Continuer/ }).click();
  await page.getByRole("button", { name: /^Console du vaisseau$/i }).click();
  await page.getByRole("button", { name: /^Ouvrir la carte galactique/i }).click();
  for (let level = 0; level < 3; level++) {
    await page.getByRole("button", { name: /^Tracer la route$/i }).first().click();
    await advanceDesktopUntil(page, async () => await page.getByRole("button", { name: /^Entrer$/i }).count() > 0, "galaxy autopilot arrival", { step: 100, maxMs: 120000 });
    await page.getByRole("button", { name: /^Entrer$/i }).press("Enter");
  }
  await page.getByRole("button", { name: /^Sang dans la canopée/i }).click();
  await page.getByRole("button", { name: /^Préparer la chasse$/i }).click();
  await page.getByRole("button", { name: /^Départ rapide$/i }).click();
  await page.getByRole("group", { name: "État du chasseur" }).waitFor();
  const pause = page.getByRole("button", { name: "Mettre en pause et consulter la carte", exact: true });
  if (await pause.count()) {
    await pause.click();
    const pilotMap = page.locator('[data-pilot-map="jungle-vey"]');
    await pilotMap.waitFor();
    assert.equal(await pilotMap.locator("[data-pilot-room]").count(), 12);
  }
  await page.getByRole("button", { name: "Suspendre et sauvegarder", exact: true }).click();
  const suspended = await page.evaluate(() => localStorage.getItem("yautja-long-hunt.active-hunt"));
  assert.ok(suspended && suspended.length > 500);
  saved = await page.evaluate(() => localStorage.getItem("yautja-long-hunt.save"));
  recordCheck("Local galaxy route to Oseris, mission briefing, deployment and suspended hunt saved.");


  await close(instance); current = undefined;
  current = await launch();
  assert.equal(await current.page.evaluate(() => localStorage.getItem("yautja-long-hunt.save")), saved);
  assert.equal(await current.page.evaluate(() => localStorage.getItem("yautja-long-hunt.active-hunt")), suspended);
  await current.page.getByRole("button", { name: /^Continuer/ }).click();
  await current.page.getByRole("group", { name: "État du chasseur" }).waitFor();
  await current.page.getByRole("dialog", { name: "Chasse en pause", exact: true }).getByRole("button", { name: "Reprendre", exact: true }).click();
  await current.page.clock.runFor(150);
  await current.page.getByRole("button", { name: "Mettre en pause et consulter la carte", exact: true }).click();
  await current.page.getByRole("button", { name: "Suspendre et sauvegarder", exact: true }).click();
  await current.page.getByRole("button", { name: "Réglages", exact: true }).click();
  assert.equal(await current.page.getByRole("checkbox", { name: "Violence atténuée" }).isChecked(), true);
  const restarted=JSON.parse(await current.page.evaluate(()=>localStorage.getItem("yautja-long-hunt.save")));
  assert.equal(restarted.justice.originChoice,"investigator"); assert.ok(restarted.homeworld.evidenceIds.includes("suspect-trophy"));
  recordCheck("Campaign bytes, suspended hunt, Homeworld evidence, Justice choice and setting retained after clean process exit and cold restart.");
  await close(current.instance); current = undefined;

  current = await launch(profiles.youth);
  const youthSave = await verifyDesktopYouthPatrol(current.page, { output: evidence, capture: name => captureWindow(current.instance, name), checks });
  await close(current.instance); current = undefined;
  current = await launch(profiles.youth);
  assert.equal(await current.page.evaluate(() => localStorage.getItem("yautja-long-hunt.save")), youthSave);
  await current.page.getByRole("button", { name: /^Continuer/ }).click();
  await current.page.locator('[data-unblooded-objective="patrol-returned"]').waitFor();
  recordCheck("V52 patrol completed through real keys from a physically played V49 archive; 16 proofs and city return survive a cold EXE restart.");
  await close(current.instance); current = undefined;
  assert.deepEqual(errors, []);
  assert.deepEqual(failedLocalRequests, []);
  await fs.writeFile(path.join(evidence, "verification.json"), JSON.stringify({ passed: true, desktopVersion: DESKTOP_VERSION, contentVersion: EXPECTED_CONTENT_VERSION, executablePath, profiles, checks, errors, failedLocalRequests, testedAt: new Date().toISOString(), limit: "Hidden automated session with controlled browser clock and real keyboard input; visible-window hardware cadence, physical controller, performance and full campaign are not certified." }, null, 2));
  console.log(JSON.stringify({ passed: true, desktopVersion: DESKTOP_VERSION, contentVersion: EXPECTED_CONTENT_VERSION, checks, errors, failedLocalRequests }, null, 2));
} catch (error) {
  if (current) await captureWindow(current.instance, "failure.png").catch(() => {});
  await fs.writeFile(path.join(evidence, "failure.json"), JSON.stringify({ error: error.stack || String(error), checks, errors, failedLocalRequests }, null, 2));
  throw error;
} finally {
  if (current) await close(current.instance);
}
