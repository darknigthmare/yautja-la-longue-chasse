import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { homeworldSceneSsrV78 } from "../tests/helpers/homeworld-scene-ssr-v78.mjs";
import { playShipAcquisitionV161 } from "../tests/helpers/ship-receipt-v161.mjs";

const qa = homeworldSceneSsrV78();
const saves = qa.load("app/game/save.ts");
const { shipAcquisitionOwnedHullV89 } = qa.load("app/game/systems/shipAcquisitionV89.ts");
const { actClanShipDocking, createClanShipDockingState } = qa.load("app/game/systems/clanShipDocking.ts");
const owner = "2026-11-27T09:00:00.000Z";
const seed = saves.defaultSave(owner);
seed.profile.honor = 5000;
seed.profile.rankId = "elite";
seed.profile.acquiredRankIdV166 = "elite";
seed.settings.masterVolume = 0;
const admitted = playShipAcquisitionV161(qa, seed);
const hull = shipAcquisitionOwnedHullV89(admitted.shipAcquisitionV89, owner);
assert.ok(hull);
const context = { ownerCreatedAt: owner, personalShipId: hull.shipId };
let docking = createClanShipDockingState(owner, hull.shipId);
for (const type of ["approach", "dock", "board"]) {
  const result = actClanShipDocking(docking, { type }, context);
  assert.ok(result.accepted);
  docking = result.state;
}
const imported = saves.parseSaveImport(saves.exportSave({ ...admitted, clanShipDocking: docking }));
assert.ok(imported.save, imported.failure);

const origin = "http://127.0.0.1:4397";
const key = saves.SAVE_STORAGE_KEY;
const output = resolve(process.env.HULL_EXTERIOR_QA_OUTPUT ?? "outputs/qa-hull-exterior-m044");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const page = await browser.newPage({
  viewport: { width: 1366, height: 900 }, reducedMotion: "reduce",
  storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: key, value: JSON.stringify(imported.save) }] }] },
});
page.setDefaultTimeout(45_000);
const report = { steps: [], errors: [] };
page.on("pageerror", error => report.errors.push(error.message));
const button = (name) => page.getByRole("button", { name, exact: true });
const panel = page.locator("[data-clan-operations]");
const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const take = name => page.screenshot({ path: resolve(output, name), animations: "disabled" });

async function openProject(roomId = "hangar") {
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-campaign-menu], [data-campaign-session]");
  if (await page.locator("[data-campaign-menu]").isVisible()) {
    const menu = page.locator('[data-menu-section="campaign"]');
    if (await menu.isVisible()) await menu.click();
    await page.locator('[data-menu-action="continue"]').click();
  }
  const interior = page.locator(`[data-clan-interior][data-interior-room="${roomId}"]`);
  const play = button("Jouer");
  await interior.or(play).first().waitFor();
  if (await play.isVisible()) await play.click();
  await interior.waitFor();
  await atPost(interior);
  await interior.locator("[data-interior-operations]").click();
  await projectTab();
}
async function atPost(interior) {
  const control = interior.locator("[data-interior-operations]");
  if (await control.getAttribute("data-interior-operations-ready") !== "true") {
    await control.click();
    await interior.locator('[data-interior-operations-ready="true"]').waitFor();
  }
}
const projectTab = () => panel.locator('[data-clan-operations-tab="project"]').click();
const closeProject = () => panel.locator("[data-clan-operations-close]").click();
async function talkTo(roomId, npcId) {
  const interior = page.locator(`[data-clan-interior][data-interior-room="${roomId}"]`);
  await atPost(interior);
  await interior.locator(`[data-clan-crew-talk="${npcId}"]`).click();
  await projectTab();
}
const track = page.locator("[data-hull-exterior-board]");
const inspect = () => page.locator("[data-hull-exterior-inspect]").click();
const walk = async (direction, count = 1) => {
  for (let step = 0; step < count; step++) await track.press("Arrow" + direction);
};
const openExterior = () => page.locator("[data-open-clan-hull-exterior]").click();

try {
  await openProject();
  await button("Inspecter les plans des ponts scellés").click();
  await openExterior();
  await walk("Up", 2);
  await walk("Right", 4);
  await walk("Right");
  assert.equal(await track.getAttribute("data-column"), "5");
  assert.equal(await track.getAttribute("data-row"), "4");
  report.steps.push("passerelle bloquée avant intervention");
  // Descendre jusqu'au contrôleur puis traverser réellement la passerelle.
  await walk("Down", 2); await inspect(); await walk("Up", 2);
  await walk("Right", 5); await walk("Up", 3); await inspect();
  await take("01-scellé-veille.png");
  await walk("Down", 3); await walk("Left", 5); await walk("Up", 3); await walk("Left", 2); await inspect();
  await take("02-scellé-relève.png");
  await walk("Left", 2); await walk("Down", 5);
  await page.locator("[data-hull-exterior-return]").click();
  await page.locator("[data-clan-hull-exterior-receipt]").waitFor();
  const finished = await disk();
  assert.equal(finished.clanHullProjectV171.hullInstanceId, hull.instanceId);
  assert.equal(finished.clanHullProjectV171.pledge, null);
  assert.equal(finished.clanHullProjectV171.consultations, 0);
  assert.equal(finished.clanHullProjectV171.exteriorSurvey.route.at(-1), "report");
  assert.ok(saves.parseSaveImport(saves.exportSave(finished)).save);
  assert.equal(finished.clanShipDocking.roomId, "hangar");
  await openProject();
  await page.locator("[data-clan-hull-exterior-receipt]").waitFor();
  assert.deepEqual((await disk()).clanHullProjectV171, finished.clanHullProjectV171);
  assert.deepEqual(report.errors, []);
  report.steps.push("relevé propriétaire des deux scellés pour la même coque après recharge et réimport");
  await take("03-relevé-enregistré.png");

  // Le poste d’accueil fait entrer les détenteurs dans le registre de bord.
  await panel.locator('[data-clan-operations-tab="post"]').click();
  await panel.locator('[data-clan-onboard-step="berth-register"]').click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.clanShipOperations?.onboardingStep === 1, key);
  await closeProject();
  await talkTo("hangar", "threshold-guard");
  await button("Écouter Garde du Seuil sur les droits").click();
  await panel.getByText(/L’accès au hangar ne donne aucun droit/).first().waitFor();
  assert.equal((await disk()).clanHullProjectV171.consultations, 1);
  assert.equal(await button("Conserver le vaisseau personnel").count(), 0);
  await take("04-droits-au-hangar.png");

  await closeProject();
  await page.locator('[data-clan-ship-room-target="conseil"]').click();
  const council = page.locator('[data-clan-interior][data-interior-room="conseil"][data-interior-moving="false"]');
  await council.waitFor();
  await page.waitForFunction(() => !document.querySelector("[data-interior-target-room]"));
  await talkTo("conseil", "star-watch");
  await button("Écouter Veille des Astres sur les droits").click();
  const shared = button("Viser la Veille Partagée");
  const personal = button("Conserver le vaisseau personnel");
  await shared.waitFor();
  await personal.waitFor();
  assert.equal((await disk()).clanHullProjectV171.consultations, 3);
  await take("05-choix-au-conseil.png");
  await personal.click();
  await page.locator("[data-clan-hull-project-pledged]").filter({ hasText: "Conserver le vaisseau personnel" }).waitFor();
  const chosen = await disk();
  assert.equal(chosen.clanHullProjectV171.pledge, "personal");
  assert.equal(chosen.clanHullProjectV171.consultations, 3);
  assert.equal(chosen.clanHullProjectV171.hullInstanceId, hull.instanceId);
  assert.deepEqual(chosen.clanHullProjectV171.exteriorSurvey, finished.clanHullProjectV171.exteriorSurvey);
  assert.equal(chosen.clanShipDocking.roomId, "conseil");
  assert.deepEqual(saves.parseSaveImport(saves.exportSave(chosen)).save.clanHullProjectV171, chosen.clanHullProjectV171);
  report.steps.push("consultation physique des deux détenteurs et confirmation du choix au conseil");

  await button("Consulter les opérations du clan").click();
  await panel.locator('[data-clan-operations-tab="contracts"][aria-pressed="true"]').waitFor();
  await panel.getByRole("region", { name: "Contrats du clan" }).waitFor();
  await openProject("conseil");
  await page.locator("[data-clan-hull-project-pledged]").waitFor();
  assert.deepEqual((await disk()).clanHullProjectV171, chosen.clanHullProjectV171);
  assert.deepEqual(report.errors, []);
  report.steps.push("ouverture de la liste des opérations et choix récupéré depuis la campagne rechargée");
  await take("06-intention-consignée.png");
} catch (error) {
  report.failure = String(error.stack ?? error);
  await take("failure.png").catch(() => {});
  throw error;
} finally {
  await writeFile(resolve(output, "parcours.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
