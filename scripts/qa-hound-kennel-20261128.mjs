import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { createServer } from "vite";

const root = process.cwd();
const output = resolve(process.env.KENNEL_QA_OUTPUT ?? "outputs/qa-hound-kennel");
await mkdir(output, { recursive: true });
const sources = [
  "save.ts", "systems/campaignSlots.ts", "systems/homeworldStreetContactsV100.ts",
  "systems/homeworldResidentContactsV110.ts", "systems/homeworldWorldV77.ts",
  "systems/homeworldLocationV77.ts", "systems/houndKennelV147.ts", "systems/huntingHoundsV147.ts",
];
const fixture = await build({
  stdin: { contents: sources.map(file => 'export * from "./app/game/' + file + '";').join("\n"), resolveDir: root },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(fixture.outputFiles[0].text).toString("base64"));
const seed = api.defaultSave("2026-11-28T10:00:00.000Z");
seed.profile.clanMarks = api.HOUND_KENNEL_ADOPTION_PRICE_V147;
seed.settings.masterVolume = 0;
const candidates = api.HOUND_CATALOGUE_V147;
const roster = api.emptyHuntingHoundsV147();
const old = api.recruitHoundV147(roster, { id: "ancien-pisteur", name: "Piste d’Aube", catalogueId: candidates[1].id }).state;
const wounded = api.woundHoundV147(old, "ancien-pisteur", seed.createdAt).state;
const beforeLoss = api.recruitHoundV147(wounded, { id: "ancien-tombe", name: "Cendre", catalogueId: candidates[2].id }).state;
seed.houndsV147 = api.killHoundV147(beforeLoss, "ancien-tombe", seed.createdAt).state;
const owner = seed.createdAt;
const kennelContacts = api.HOUND_KENNEL_CONTACT_IDS_V147.map(id => api.homeworldStreetContactV100(id));
const possibleStarts = kennelContacts.flatMap(contact => {
  const origin = api.homeworldResidentPoseV77(contact, 0);
  return Array.from({ length: 16 }, (_, i) => i * Math.PI / 8)
    .flatMap(angle => [30, 44, 58, 72].map(r => ({
      x: Math.round(origin.x + Math.cos(angle) * r), y: Math.round(origin.y + Math.sin(angle) * r), levelId: contact.levelId,
    })));
});
const seconds = [0, 0.5, 1, 2, 4, 6, 8];
const start = possibleStarts.find(({ x, y, levelId }) => {
  const actor = { ...api.createHomeworldWorldActorV77(), x, y };
  if (api.nearestHomeworldPointV77(levelId, actor) || api.nearestHomeworldDoorV77(levelId, actor) ||
      api.nearestHomeworldConnectorV77(levelId, actor)) return false;
  return seconds.every(second => {
    const context = { actor, levelId, seconds: second, ownerCreatedAt: owner, currentOwnerCreatedAt: owner, active: true };
    if (api.nearestHomeworldResidentContactV110(context)) return false;
    return api.isHoundKennelContactV147(api.nearestHomeworldStreetContactV100(context)?.id);
  }) && api.resolveHomeworldLocationV77(api.createHomeworldCheckpointV77(owner, levelId, actor, null, actor), owner).restored;
});
assert(start, "Find a walkable, unobstructed starting checkpoint in speaking range of a native kennel handler");
const actor = { ...api.createHomeworldWorldActorV77(), ...start };
seed.homeworld.locationV77 = api.createHomeworldCheckpointV77(owner, start.levelId, actor, null, actor);
const campaignKey = api.SAVE_STORAGE_KEY;
const values = new Map([[campaignKey, JSON.stringify(seed)]]);
const storage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
};
const migration = await api.migrateLegacyCampaignSlot(storage);
assert(migration.ok, migration.message);
const slot = api.loadCampaignSlots(storage).slots.find(item => item.id === migration.slotId);
const prepared = await api.saveCampaignCheckpoint(slot.id, { kind: "manual", index: 1, location: "homeworld", expectedRevision: slot.revision }, storage);
assert(prepared.ok, prepared.message);

const harnessPath = "/__hound-proof";
const harnessId = "virtual:hound-proof";
const statusKey = "hound-proof-runtime";
const sourceFile = file => JSON.stringify(join(root, "app/game", file));
const mount = [
  'import React from "react";',
  'import { createRoot } from "react-dom/client";',
  "import HuntCanvas from " + sourceFile("HuntCanvas.tsx") + ";",
  "import { MISSION_BY_ID } from " + sourceFile("data.ts") + ";",
  "import { activeHoundV147 } from " + sourceFile("systems/huntingHoundsV147.ts") + ";",
  'const save = JSON.parse(localStorage.getItem(' + JSON.stringify(campaignKey) + '));',
  'const key = ' + JSON.stringify(statusKey) + ';',
  'const resume = JSON.parse(sessionStorage.getItem(key));',
  'const mission = MISSION_BY_ID["jungle-vey"];',
  'createRoot(document.getElementById("hound-proof")).render(React.createElement(HuntCanvas, {',
  '  mission, encounterRun: save.missionProgress[mission.id].attempts, loadout: save.loadout, inventory: save.inventory,',
  '  difficulty: save.settings.difficultyId, appearance: save.appearance, reducedGore: save.settings.reducedGore,',
  '  screenShake: false, highContrastVision: false, controlBindings: save.settings.controlBindings,',
  '  houndV147: activeHoundV147(save.houndsV147), resumeSnapshot: resume?.snapshot ?? null,',
  '  resumeRetryCheckpoint: resume?.retryCheckpoint ?? null,',
  '  onPersistHunt: payload => sessionStorage.setItem(key, JSON.stringify(payload)),',
  '  onResumeFailure: () => { document.body.dataset.houndProofResume = "failed"; },',
  '  onFinish: () => {}, onAbort: () => {},',
  '}));',
].join("\n");
const plugin = {
  name: "hound-proof-harness",
  resolveId: id => id === harnessId ? "\0" + harnessId : null,
  load: id => id === "\0" + harnessId ? mount : null,
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (request.url !== harnessPath) return next();
      try {
        const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width"></head>' +
          '<body><div id="hound-proof"></div><script type="module" src="/@id/' + harnessId + '"></script></body></html>';
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end(await server.transformIndexHtml(harnessPath, html));
      } catch (error) {
        next(error);
      }
    });
  },
};
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  setup: "Sauvegarde historique avec deux chiens V147, le montant exact d’une adoption et un point de départ praticable à portée du dresseur. HOMEWORLD et sa sauvegarde sont joués dans GameClient. Pour la commande en chasse, un banc monte HuntCanvas avec la campagne enregistrée et conserve son checkpoint natif dans la session navigateur.",
  start, checks: [], errors: [], passed: false,
};
const url = "http://127.0.0.1:4291";
let server, browser, page;

try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), plugins: [plugin],
    server: { host: "127.0.0.1", port: 4291, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce",
    storageState: { cookies: [], origins: [{ origin: url, localStorage: [...values].map(([name, value]) => ({ name, value })) }] },
  });
  page = await context.newPage();
  page.setDefaultTimeout(40_000);
  page.on("pageerror", error => report.errors.push(error.message));
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), campaignKey);
  const kennel = page.locator('[data-hound-kennel-v147="CITY-28"]');
  const home = page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]');
  const screenshot = name => page.screenshot({ path: join(output, name + ".png"), animations: "disabled" });
  async function openKennel() {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90_000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    await home.waitFor({ timeout: 90_000 });
    await home.locator("[data-homeworld-viewport]").focus();
    await page.keyboard.press("KeyE");
    await kennel.waitFor();
  }
  await page.goto(url);
  await openKennel();
  assert.equal(await kennel.locator('[data-hound-kennel-candidate="' + candidates[2].id + '"]').count(), 0);
  await kennel.locator("[data-hound-kennel-archive] > summary").click();
  assert(await kennel.locator('[data-hound-id="ancien-tombe"][data-condition="dead"]').isVisible());
  await kennel.locator("input").fill("Trace-de-Cendre");
  const portrait = kennel.locator("figure img");
  await portrait.waitFor();
  await portrait.evaluate(image => image.decode());
  await screenshot("01-adoption");
  await kennel.locator('[data-hound-kennel-action="recruit"]').click();
  const adopted = await saved();
  assert.equal(adopted.profile.clanMarks, 0);
  assert.equal(adopted.houndsV147.activeHoundId, candidates[0].id);
  assert.equal(adopted.houndsV147.hounds.find(item => item.id === candidates[0].id).name, "Trace-de-Cendre");
  assert.equal(await kennel.locator('[data-hound-kennel-action="recruit"]').count(), 0);
  await kennel.locator("[data-hound-kennel-candidate]").first().click();
  assert(await kennel.locator('[data-hound-kennel-action="recruit"]').isDisabled());
  await kennel.locator('[data-hound-id="ancien-pisteur"] [data-hound-kennel-action="heal"]').click();
  const cared = await saved();
  assert.equal(cared.profile.clanMarks, 0);
  assert.equal(cared.houndsV147.hounds.find(item => item.id === "ancien-pisteur").condition, "ready");
  await kennel.locator('[data-hound-id="ancien-pisteur"] [data-hound-kennel-action="choose"]').click();
  assert.equal((await saved()).houndsV147.activeHoundId, "ancien-pisteur");
  await kennel.locator('[data-hound-id="' + candidates[0].id + '"] [data-hound-kennel-action="choose"]').click();
  await page.reload();
  await openKennel();
  assert.equal((await saved()).houndsV147.activeHoundId, candidates[0].id);
  assert.equal((await saved()).profile.clanMarks, 0);
  report.checks.push("Adoption au vrai chenil, débit exact, solde insuffisant, registre des morts, soins gratuits et reprise du chien choisi.");
  await screenshot("02-chenil-repris");

  await page.goto(url + harnessPath);
  const briefing = page.getByRole("button", { name: "Commencer la chasse", exact: true });
  await briefing.click();
  const commands = page.locator("[data-hound-current-order]");
  await commands.waitFor();
  assert.equal(await commands.getAttribute("data-hound-orders-completed"), "0");
  assert(await commands.locator('[data-hound-field-order="track"]').isDisabled());
  await commands.locator('[data-hound-field-order="recall"]').click();
  await page.locator('[data-hound-current-order="recall"][data-hound-orders-completed="1"]').waitFor();
  await screenshot("03-rappel");
  await page.getByRole("button", { name: "Mettre en pause, consulter la carte et le sac", exact: true }).click();
  const checkpoint = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), statusKey);
  const field = checkpoint.snapshot.checkpoint.houndFieldV147;
  assert.equal(field.ordersCompleted, 1);
  assert.equal(field.houndId, candidates[0].id);
  await page.reload();
  const resume = page.getByRole("button", { name: "Reprendre la chasse", exact: true }).first();
  await resume.or(commands).first().waitFor();
  if (await resume.isVisible()) await resume.click();
  await page.locator('[data-hound-current-order="recall"][data-hound-orders-completed="1"]').waitFor();
  assert.equal(await page.locator('[data-hound-proof-resume="failed"]').count(), 0);
  report.checks.push("Le chien adopté rejoint HuntCanvas. Le bouton de rappel exécute l’ordre, le pistage attend le lien requis et le rappel revient après rechargement du checkpoint.");
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  if (!report.passed && page) {
    report.screen = (await page.locator("body").innerText().catch(() => "")).slice(0, 2400);
    await page.screenshot({ path: join(output, "failure.png") }).catch(() => {});
  }
  await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server?.close();
  console.log("HOUND_KENNEL_QA", JSON.stringify(report));
}
