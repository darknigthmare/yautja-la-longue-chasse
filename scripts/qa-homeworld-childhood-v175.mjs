import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { childhoodAdmissionV175, childhoodStorage, qaChildhood } from "../tests/helpers/homeworld-childhood-v175.mjs";
import { youthBarracksFromSave } from "../tests/helpers/youth-patrol-played-route.mjs";

function observeCeremonyStreams() {
  const streams = [];
  const originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function(...args) {
    if (/\/(?:ceremony-brazier|ceremony-m006)\//.test(this.src) && !streams.includes(this)) streams.push(this);
    return originalPlay.apply(this, args);
  };
  window.__m006CeremonyStreams = () => streams.map(media => ({
    src: media.src,
    playing: !media.paused && media.currentTime > 0,
    duration: media.duration,
    loop: media.loop,
  }));
}

const seed = childhoodAdmissionV175({ withLocation: true, withCeremony: true });
const verifyCohortAudio = process.env.CHILDHOOD_VERIFY_COHORT_AUDIO === "1";
const verifyCeremonyAudio = process.env.CHILDHOOD_VERIFY_CEREMONY_AUDIO === "1";
seed.settings.masterVolume = verifyCohortAudio || verifyCeremonyAudio ? .65 : 0;
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
  if (verifyCohortAudio) await context.addInitScript(({ sampleBytes }) => {
    const originalDecode = AudioContext.prototype.decodeAudioData;
    const originalStart = AudioBufferSourceNode.prototype.start;
    const recognized = new WeakSet();
    const probe = window.__m006CohortResponse = { ready: false, starts: 0 };
    AudioContext.prototype.decodeAudioData = function(bytes, ...callbacks) {
      const watched = bytes.byteLength === sampleBytes;
      return originalDecode.call(this, bytes, ...callbacks).then(buffer => {
        if (watched && Math.abs(buffer.duration - 1.42) < .001) {
          recognized.add(buffer);
          probe.ready = true;
        }
        return buffer;
      });
    };
    AudioBufferSourceNode.prototype.start = function(...args) {
      const result = originalStart.apply(this, args);
      if (recognized.has(this.buffer)) probe.starts++;
      return result;
    };
  }, { sampleBytes: 62666 });
  if (verifyCeremonyAudio) await context.addInitScript(observeCeremonyStreams);
  page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", error => report.errors.push(error.message));
  let scene = page.locator("[data-homeworld-childhood-v175]");
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
  const waitForCeremonyAudio = () => page.waitForFunction(() => {
    const streams = window.__m006CeremonyStreams?.().filter(media => media.playing) ?? [];
    return streams.length === 2 &&
      streams.some(media => media.src.includes("ceremony-brazier") && media.loop && Math.abs(media.duration - 4) < .02) &&
      streams.some(media => media.src.includes("ceremony-m006") && !media.loop && Math.abs(media.duration - 105) < .1);
  });
  const waitForCeremonySilence = () => page.waitForFunction(() =>
    window.__m006CeremonyStreams?.().every(media => !media.playing));
  await page.goto("http://127.0.0.1:4275");
  if (verifyCeremonyAudio) assert.equal(await page.evaluate(() => window.__m006CeremonyStreams?.().length), 0);
  const rackSound = await page.evaluate(async () => {
    const response = await fetch("/audio/sfx/ceremony-rack/threshold-metal.wav");
    if (!response.ok) return { status: response.status };
    const context = new OfflineAudioContext(1, 1, 22050);
    const decoded = await context.decodeAudioData(await response.arrayBuffer());
    return { status: response.status, channels: decoded.numberOfChannels, frames: decoded.length };
  });
  assert.deepEqual(rackSound, { status: 200, channels: 1, frames: 26019 });
  report.checks.push("Son de porte original décodé en PCM mono, 1,18 seconde.");
  await boot();
  await act("handoff");
  assert.equal((await view()).trial, "ring");
  if (verifyCeremonyAudio) assert.equal(await page.evaluate(() => window.__m006CeremonyStreams?.().length), 0);
  await walk(3, true);
  await act("use", "Space");
  assert.equal((await view()).position, 0);
  await walk(3, true); await act("observe", "r"); await act("use", "Space");
  await act("handoff");
  assert.equal((await view()).trial, "beam");
  await walk(3);
  await page.reload(); await boot();
  const interrupted = await view();
  assert.equal(interrupted.position, 3);
  const beforeReprise = (await read()).homeworld.childhoodV175;
  await scene.locator("[data-childhood-action=handoff]").click();
  await scene.getByRole("status").filter({ hasText: "Reprends à ta position actuelle" }).waitFor();
  assert.deepEqual((await read()).homeworld.childhoodV175, beforeReprise);
  assert.equal((await view()).drift, interrupted.drift);
  await shot("passation-reprise-appuis");
  assert.deepEqual((await view()).finished, ["ring"]);
  while ((await view()).trial === "beam") {
    if ((await view()).drift) await act("use");
    await act("east");
  }
  await act("handoff");
  assert.equal((await view()).trial, "spring");
  await walk(5); await act("observe"); await act("observe");
  await shot("cible-ouverte");
  await act("use");
  assert.deepEqual((await view()).finished, ["ring", "beam", "spring"]);
  report.checks.push("Demande anticipée vers l’anneau, la poutre et la cible. Reprise après rechargement au même appui, sans réécriture du carnet.");
  await act("handoff");
  assert.equal((await view()).trial, "track");
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
  if (verifyCeremonyAudio) {
    await waitForCeremonyAudio();
    await page.keyboard.press("Escape");
    await scene.waitFor({ state: "hidden" });
    await waitForCeremonySilence();
    const viewport = page.locator('[data-homeworld-hub] [data-homeworld-viewport]');
    await viewport.focus();
    await page.keyboard.press("KeyE");
    await scene.waitFor();
    await waitForCeremonyAudio();
    report.checks.push("Les deux sources jouent à la passation seulement, se taisent en quittant le poste et reprennent quand il est rouvert.");
  }
  await walk(2); await act("use");
  assert.equal(await scene.locator("[data-childhood-enter-dojo]").count(), 0);
  assert.equal(await scene.locator("[data-childhood-action=east]").count(), 0);
  await act("cohort-gesture");
  assert.equal(await scene.locator("[data-childhood-cohort-prop=ring]").count(), 1);
  await shot("geste-de-yena");
  await page.reload(); await boot();
  assert.equal((await view()).cohortPresentations, 1);
  assert.equal((await view()).cohortStowed, 0);
  if (verifyCeremonyAudio) await waitForCeremonyAudio();
  if (verifyCohortAudio) {
    await page.waitForFunction(() => window.__m006CohortResponse?.ready);
    assert.equal(await page.evaluate(() => window.__m006CohortResponse?.starts), 0);
  }
  await act("cohort-stow");
  if (verifyCohortAudio) await page.waitForFunction(() => window.__m006CohortResponse?.starts === 1);
  for (const [name, prop] of [["Harek", "beam"], ["Tov", "spring"]]) {
    assert((await scene.locator("[data-childhood-action=cohort-gesture]").innerText()).includes(name));
    await act("cohort-gesture");
    assert.equal(await scene.locator("[data-childhood-cohort-prop=" + prop + "]").count(), 1);
    await act("cohort-stow");
  }
  assert.equal((await view()).cohortPresentations, 3);
  assert.equal((await view()).cohortStowed, 3);
  if (verifyCohortAudio) {
    await page.waitForFunction(() => window.__m006CohortResponse?.starts === 3);
    await page.reload(); await boot();
    assert.equal((await view()).cohortStowed, 3);
    await page.waitForFunction(() => window.__m006CohortResponse?.ready);
    assert.equal(await page.evaluate(() => window.__m006CohortResponse?.starts), 0);
    report.checks.push("Three starts of the original cohort response, one per tool returned, and no replay after reloading.");
  }
  await shot("outils-de-la-cohorte");
  await walk(4); await act("use");
  await walk(7);
  assert.equal((await view()).passed, false);
  await act("use");
  assert.equal((await view()).position, 8);
  assert.equal(await scene.locator("[data-childhood-saar=inside]").count(), 1);
  assert.equal((await view()).rackAccess, "pending");
  assert.equal(await scene.locator("[data-childhood-action=first-blades], [data-childhood-enter-dojo]").count(), 0);
  await shot("seuil-avant-remise");
  const pending = await read();
  const exported = childhoodStorage.exportSave(pending);
  const foreignContext = await browser.newContext({ viewport: { width: 1360, height: 980 }, reducedMotion: "reduce" });
  if (verifyCeremonyAudio) await foreignContext.addInitScript(observeCeremonyStreams);
  page = await foreignContext.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", error => report.errors.push(error.message));
  scene = page.locator("[data-homeworld-childhood-v175]");
  await page.goto("http://127.0.0.1:4275");
  await page.locator('[data-menu-section="campaign"]').click();
  await page.locator('[data-menu-action="import"]').click();
  await page.locator("#campaign-import-file").setInputFiles({
    name: "passation-au-seuil.json", mimeType: "application/json", buffer: Buffer.from(exported),
  });
  await page.locator("[data-campaign-import-prepare]").click();
  await page.locator("[data-campaign-import-confirm]").click();
  await page.locator('[data-campaign-slot="1"][data-slot-state="ready"]').waitFor();
  await page.getByRole("button", { name: "Retour à Campagne", exact: true }).click();
  await boot();
  const imported = await read();
  assert.equal(imported.createdAt, pending.createdAt);
  assert.deepEqual(imported.homeworld.childhoodV175, pending.homeworld.childhoodV175);
  assert.equal((await view()).rackAccess, "pending");
  assert.equal(await scene.locator("[data-childhood-action=first-blades], [data-childhood-enter-dojo]").count(), 0);
  if (verifyCeremonyAudio) await waitForCeremonyAudio();
  await act("accept-rack-access");
  await scene.locator("[data-childhood-rack-receipt]").waitFor();
  if (verifyCeremonyAudio) {
    await waitForCeremonySilence();
    report.checks.push("L’épreuve rechargée retrouve sa bande-son. Les deux sources s’arrêtent après la remise de la plaque.");
  }
  await shot("plaque-remise-apres-import");
  await page.reload(); await boot();
  await scene.locator("[data-childhood-rack-receipt]").waitFor();
  assert.equal((await view()).rackAccess, "received");
  assert.deepEqual((await read()).prologue.chronicle, pending.prologue.chronicle);
  assert.equal(await scene.locator("[data-childhood-action=accept-rack-access]").count(), 0);
  await act("first-blades");
  await page.reload(); await boot();
  assert.equal((await view()).firstWorkshop, "blades");
  await shot("premier-atelier-choisi");
  await scene.locator("[data-childhood-enter-dojo]").click();
  await page.locator("[data-youth-training]").waitFor({ timeout: 90000 });
  const played = await read();
  assert.equal(rank.getChronicleRank(played.prologue.chronicle), "unblooded");
  assert.equal(played.youthTraining?.checkpoint.firstWorkshopV176, "blades");
  assert(childhoodStorage.parseSaveImport(childhoodStorage.exportSave(played)).save);
  report.checks.push("Trois gestes avec leur matériel, passage avec Saar, import JSON par le menu, remise de la plaque sans nouveau rang, reprise et choix des lames conservé au dojo.");
  const barracks = youthBarracksFromSave(played);
  report.prerequisites += " The real training reducer plays the intervening dojo milestones and walks to the barracks door.";
  await page.evaluate(({ key, archive }) => localStorage.setItem(key, JSON.stringify(archive)), { key: storageKey, archive: barracks });
  await page.reload();
  await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
  const campaign = page.locator('[data-menu-section="campaign"]');
  if (await campaign.isVisible()) await campaign.click();
  await page.locator('[data-menu-action="continue"]').click();
  const barracksScene = page.locator('[data-youth-training][data-youth-step="barracks"]');
  const stage = barracksScene.locator("[data-youth-stage]");
  await stage.waitFor({ timeout: 90000 });
  await barracksScene.getByText("Chargement du dojo…").waitFor({ state: "hidden" });
  assert.equal(await barracksScene.getByText("La formation attend ses images.").count(), 0);
  await stage.focus();
  await barracksScene.getByText("Relâchez les commandes pour reprendre la formation.").waitFor({ state: "hidden" });
  await page.keyboard.press("KeyH", { delay: 100 });
  const notes = page.locator("[data-youth-workshop-notes]");
  await notes.getByText("La distance des lames", { exact: true }).waitFor();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).youthTraining.checkpoint.workshopV174?.active?.lesson === 1, storageKey);
  await notes.screenshot({ path: resolve(output, "lames-dabord.png"), animations: "disabled" });
  report.checks.push("Porte des ateliers ouverte au clavier, M008 réellement active et enregistrée avant M007");
  assert.deepEqual(report.errors, []);
  report.passed = true;
  console.log("CHILDHOOD_BROWSER", JSON.stringify(report));
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
