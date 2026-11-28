import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { admitEliteCampaign, qa } from "../tests/helpers/elite-recognition-played-v175.mjs";
import { openCampaignDossier } from "./qa-elder-mentoring-v168.mjs";

const url = new URL(process.env.ELITE_L06_QA_URL ?? "http://127.0.0.1:4396/");
assert.equal(url.origin, "http://127.0.0.1:4396");
const audience = process.env.ELITE_M043_QA_AUDIENCE ?? "restricted";
assert.ok(audience === "restricted" || audience === "public");
const output = resolve(process.env.ELITE_L06_QA_OUTPUT ?? "outputs/qa-elite-l06-v175");
await mkdir(output, { recursive: true });
const { SAVE_STORAGE_KEY, exportSave, parseSaveImport } = qa.load("app/game/save.ts");
const { ELITE_CLAN_TRIALS } = qa.load("app/game/systems/eliteClanRitesV175.ts");
const { createTrainingDrill } = qa.load("app/game/systems/trainingDrill.ts");
const { getChronicleRank } = qa.load("app/game/systems/clanChronicle.ts");
const candidate = admitEliteCampaign();
candidate.settings.controlBindings = { ...candidate.settings.controlBindings, "training.primary": ["KeyP"] };
const admission = parseSaveImport(exportSave(candidate));
assert.ok(admission.save, admission.failure);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  storageState: { cookies: [], origins: [{ origin: url.origin,
    localStorage: [{ name: SAVE_STORAGE_KEY, value: JSON.stringify(admission.save) }] }] },
});
const report = { audience, checkpoints: [], pageErrors: [] };
page.on("pageerror", error => report.pageErrors.push(error.message));
const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "null"), SAVE_STORAGE_KEY);
const boot = async () => {
  await page.goto(url.href, { waitUntil: "domcontentloaded" });
  await openCampaignDossier(page);
};
const openTrials = () => page.locator("[data-open-elite-clan-rites]").click();
const snap = (name) => page.screenshot({ path: resolve(output, name), animations: "disabled" });
const playTrial = async (trial, unsafe = false) => {
  await page.locator("[data-elite-clan-trial=" + trial.id + "]").click();
  const dialog = page.getByRole("dialog", { name: /Kata wristblades|Maîtrise du plasma|Simulation de chasse du clan/i });
  const start = dialog.getByRole("button", { name: /Commencer l’épreuve/ });
  await start.click();
  const state = createTrainingDrill(trial.disciplineId, trial.seed, trial.clanPlasma);
  for (const [i, action] of state.sequence.entries()) {
    const command = unsafe && i === 3 ? "primary" : action;
    if (command === "primary") await dialog.press("p", { timeout: 5000 });
    else await dialog.locator("[data-training-drill-action=" + command + "]").press("Enter", { timeout: 5000 });
  }
  await dialog.getByRole("button", { name: "Consigner le résultat" }).click();
  await dialog.waitFor({ state: "hidden" });
};
try {
  await boot();
  await openTrials();
  await playTrial(ELITE_CLAN_TRIALS[0]);
  const blades = await disk();
  assert.deepEqual(blades.eliteRecognitionV174.trials.map(trial => trial.id), ["blades"]);
  report.checkpoints.push("lames écrites");
  await boot();
  await openTrials();
  assert.deepEqual((await disk()).eliteRecognitionV174.trials, blades.eliteRecognitionV174.trials);
  await playTrial(ELITE_CLAN_TRIALS[1], true);
  await page.getByText("Épreuve à reprendre.", { exact: false }).waitFor();
  assert.equal((await disk()).eliteRecognitionV174.trials.length, 1);
  report.checkpoints.push("tir devant une silhouette refusé après rechargement");
  await playTrial(ELITE_CLAN_TRIALS[1]);
  await playTrial(ELITE_CLAN_TRIALS[2]);
  await page.locator("[data-elite-clan-rites=complete]").waitFor();
  const complete = await disk();
  assert.equal(getChronicleRank(complete.prologue.chronicle), "blooded");
  assert.equal(complete.eliteRecognitionV174.trials.length, 3);
  await snap("01-rites-du-clan.png");

  await page.getByRole("button", { name: "Rejoindre les témoins" }).click();
  const ceremony = page.locator("[data-elite-recognition-v174]");
  await ceremony.locator("[data-elite-audience=" + audience + "]").click();
  const board = ceremony.locator("[data-elite-recognition-board]");
  const move = async (...arrows) => { for (const arrow of arrows) await board.press("Arrow" + arrow); };
  await move("Up");
  await ceremony.locator("[data-elite-present=mastery]").click();
  await move("Up", "Left");
  await ceremony.locator("[data-elite-present=crown]").click();
  await move("Right", "Right");
  await ceremony.locator("[data-elite-present=hunt]").click();
  await move("Up", "Up");
  await ceremony.locator("[data-elite-witness]").click();
  await move("Down", "Left");
  await ceremony.locator("[data-elite-mark]").click();
  await ceremony.locator("[data-elite-recognize]").click();
  await page.locator("[data-elite-recognition-v174=recognized]").waitFor();
  await snap("02-reconnaissance-elite.png");
  await boot();
  await page.locator("[data-open-elite-recognition-v174]").click();
  await page.locator("[data-elite-recognition-v174=recognized]").waitFor();
  const recognized = await disk();
  assert(recognized.eliteRecognitionV174.recognized);
  assert.equal(recognized.eliteRecognitionV174.audience, audience);
  assert.equal(getChronicleRank(recognized.prologue.chronicle), "elite");
  assert(parseSaveImport(exportSave(recognized)).save);
  assert.equal(recognized.eliteRecognitionV174.revision, 10);
  assert.deepEqual(report.pageErrors, []);
  report.checkpoints.push("reconnaissance au socle, chronique Elite et rechargement confirmé");
} finally {
  await writeFile(resolve(output, "parcours.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
