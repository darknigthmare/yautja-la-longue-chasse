import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright-core";
import { campaignFixture } from "./campaign-browser-helpers.mjs";

const base = process.env.V47_QA_URL || "http://127.0.0.1:4174";
const out = process.env.V47_NURSERY_RELIABILITY_QA_OUTPUT || "work/v47/nursery-reliability-browser-qa";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [], errors = [], failures = [];
let activePage;
const watch = page => {
  activePage = page; page.setDefaultTimeout(45000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
};
const mainKey = "yautja-long-hunt.save", slotKey = id => `yautja-long-hunt.campaign-slot.${id}`;
const campaign = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), mainKey);
const slot = (page, id) => page.evaluate(key => JSON.parse(localStorage.getItem(key)), slotKey(id));
const slotBytes = (page, id) => page.evaluate(key => localStorage.getItem(key), slotKey(id));
const canvas = page => page.locator("[data-nursery-prologue] canvas");
const scene = page => canvas(page).evaluate(node => ({ phase: node.dataset.nurseryPhase, tick: Number(node.dataset.nurseryTick), paused: node.dataset.nurseryPaused }));
async function create(page, id, name) {
  await page.getByRole("button", { name: /^Nouvelle partie/ }).click();
  assert.equal(await page.locator("[data-campaign-slot]").count(), 5);
  await page.locator(`[data-campaign-slot="${id}"]`).click();
  await page.getByLabel("Nom du chasseur").fill(name);
  await page.getByRole("button", { name: new RegExp(`^Créer la partie ${id}`) }).click();
  await page.locator('canvas[data-nursery-phase="prompt"]').waitFor({ timeout: 120000 });
  assert.equal(await page.locator("[data-campaign-location]").getAttribute("data-campaign-location"), "prologue");
}
async function ready(page) {
  await page.getByRole("button", { name: "Entrer dans la nurserie", exact: true }).click();
  await page.locator('canvas[data-nursery-phase="ready"]').waitFor();
  await page.waitForFunction(() => Number(document.querySelector("[data-nursery-prologue] canvas")?.dataset.nurseryTick) >= 180);
}
async function pause(page) {
  await page.getByRole("button", { name: "Pause et commandes", exact: true }).click();
  await page.getByRole("dialog", { name: "Prologue en pause", exact: true }).waitFor();
}
async function settings(page) {
  await page.getByRole("button", { name: "Réglages et sauvegardes", exact: true }).click();
  await page.locator("[data-campaign-save-panel]").waitFor();
}
async function main(page) {
  await page.getByRole("button", { name: "Sauvegarder et revenir au menu principal", exact: true }).click();
  await page.locator('[data-campaign-menu="main"]').waitFor();
}
async function manual(page, index) {
  await page.locator(`[data-manual-save="${index}"]`).click();
  await page.getByRole("status").filter({ hasText: `Sauvegarde manuelle ${index} confirmée.` }).waitFor();
}
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); watch(page);
  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  await create(page, 1, "QA Reprise Nurserie");
  assert.equal(await page.locator("[data-new-game-identity]").count(), 0);
  assert.equal(await page.locator(".physical-deck-screen").count(), 0);
  await ready(page); await pause(page);
  const paused = await scene(page), pausedSave = await campaign(page);
  await page.waitForTimeout(450); assert.equal((await scene(page)).tick, paused.tick);
  assert.equal(pausedSave.prologue.checkpoint.tick, paused.tick);
  assert.equal(pausedSave.profile.playTimeSeconds, Math.floor(paused.tick / 60));
  assert.equal(pausedSave.prologue.chronicle.evidence.some(item => item.id === "intro-completed"), false);
  await page.getByRole("button", { name: "Enregistrer et revenir au menu", exact: true }).click();
  await page.locator('[data-campaign-menu="main"]').waitFor();
  await page.getByRole("button", { name: /^Continuer/ }).click();
  await page.locator('canvas[data-nursery-phase="ready"]').waitFor({ timeout: 120000 });
  await pause(page);
  const resumed = await scene(page);
  assert(resumed.tick >= paused.tick && resumed.tick < paused.tick + 180);
  assert.equal((await campaign(page)).createdAt, pausedSave.createdAt);
  assert.equal(await page.locator(".physical-deck-screen").count(), 0);
  await page.screenshot({ path: out + "/resumed-nursery.png" });
  checks.push({ name: "pause-save-continue", phase: resumed.phase, savedTick: paused.tick, resumedTick: resumed.tick, ownerUnchanged: true, noAdultStart: true, noCompletionProof: true });

  await settings(page);
  for (let index = 1; index <= 10; index++) await manual(page, index);
  const docA = await slot(page, 1), manualA = docA.checkpoints.find(checkpoint => checkpoint.id === "manual-1");
  assert.equal(docA.checkpoints.filter(checkpoint => checkpoint.kind === "manual").length, 10);
  assert.equal(docA.checkpoints.filter(checkpoint => checkpoint.kind === "auto").length, 2);
  assert.equal(manualA.resumeLocation, "prologue");
  await main(page); await create(page, 2, "QA Autre Youngling");
  const ownerB = (await campaign(page)).createdAt; assert.notEqual(ownerB, pausedSave.createdAt);
  await settings(page); const preservedA = await slotBytes(page, 1); await manual(page, 1);
  assert.equal(await slotBytes(page, 1), preservedA);
  await main(page);
  await page.getByRole("button", { name: /^Charger une partie/ }).click();
  await page.locator('[data-campaign-slot="1"]').click();
  await page.locator('[data-checkpoint-id="manual-1"]').click();
  await page.getByRole("dialog", { name: "Charger ce checkpoint ?", exact: true }).waitFor();
  await page.getByRole("button", { name: "Confirmer le chargement", exact: true }).click();
  await page.locator('canvas[data-nursery-phase="ready"]').waitFor({ timeout: 120000 }); await pause(page);
  const loaded = await scene(page);
  assert.equal((await campaign(page)).createdAt, pausedSave.createdAt);
  assert(loaded.tick >= manualA.archive.campaign.prologue.checkpoint.tick && loaded.tick < manualA.archive.campaign.prologue.checkpoint.tick + 180);
  checks.push({ name: "five-slots-ten-manual-two-auto-and-isolation", manualCount: 10, autoCount: 2, ownersDistinct: true, otherSlotBytesUnchanged: true, manualLoadedInNursery: true });
  await page.close();

  const quota = await browser.newPage({ viewport: { width: 1280, height: 900 } }); watch(quota);
  await quota.goto(base, { waitUntil: "networkidle", timeout: 120000 }); await create(quota, 1, "QA Quota Nurserie"); await ready(quota);
  const beforeQuota = await quota.evaluate(key => localStorage.getItem(key), mainKey);
  await quota.evaluate(key => {
    window.__nurseryOriginalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(candidate, value) {
      if (candidate === key || candidate.startsWith("yautja-long-hunt.campaign-slot.")) throw new DOMException("QA quota", "QuotaExceededError");
      return window.__nurseryOriginalSetItem.call(this, candidate, value);
    };
  }, mainKey);
  await quota.getByRole("dialog", { name: "Prologue en pause", exact: true }).waitFor({ timeout: 15000 });
  await quota.getByRole("alert").filter({ hasText: /Sauvegarde du prologue refusée/ }).waitFor();
  const frozen = await scene(quota); await quota.waitForTimeout(400); assert.equal((await scene(quota)).tick, frozen.tick);
  await quota.getByRole("button", { name: "Enregistrer et revenir au menu", exact: true }).click();
  assert.equal(await quota.locator('[data-campaign-menu="main"]').count(), 0);
  await quota.getByRole("button", { name: "Reprendre le prologue", exact: true }).click();
  await quota.waitForTimeout(300); assert.equal((await scene(quota)).tick, frozen.tick);
  assert.equal(await quota.evaluate(key => localStorage.getItem(key), mainKey), beforeQuota);
  await quota.screenshot({ path: out + "/quota-refused.png" });
  await quota.evaluate(() => { Storage.prototype.setItem = window.__nurseryOriginalSetItem; delete window.__nurseryOriginalSetItem; });
  await quota.getByRole("button", { name: "Reprendre le prologue", exact: true }).click();
  await quota.waitForFunction(tick => Number(document.querySelector("[data-nursery-prologue] canvas")?.dataset.nurseryTick) > tick, frozen.tick);
  await pause(quota); const recovered = await campaign(quota), recoveredScene = await scene(quota);
  assert.equal(recovered.prologue.checkpoint.tick, recoveredScene.tick);
  assert.equal(recovered.profile.playTimeSeconds, Math.floor(recovered.prologue.checkpoint.tick / 60));
  assert.equal(recovered.prologue.status, "active");
  assert.equal(recovered.prologue.chronicle.evidence.some(item => item.id === "intro-completed"), false);
  await quota.getByRole("button", { name: "Enregistrer et revenir au menu", exact: true }).click();
  await quota.locator('[data-campaign-menu="main"]').waitFor();
  checks.push({ name: "quota-refuses-resume-and-exit-then-recovers", frozenTick: frozen.tick, recoveredTick: recoveredScene.tick, originalBytesPreservedUntilRetry: true, duplicateTime: false, noFalseCompletion: true });
  await quota.close();

  const legacy = await browser.newPage({ viewport: { width: 1280, height: 900 } }); watch(legacy);
  const fixture = structuredClone(await campaignFixture()); fixture.save.version = 7; delete fixture.save.prologue;
  fixture.save.profile.hunterName = "QA Adulte V7";
  await legacy.addInitScript(({ key, save }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save)); }, fixture);
  await legacy.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  await legacy.getByRole("button", { name: /^Continuer/ }).click();
  await legacy.locator('[data-campaign-location="deck"]').waitFor({ timeout: 60000 });
  assert.equal(await legacy.locator("[data-nursery-prologue]").count(), 0);
  assert.equal((await campaign(legacy)).prologue ?? null, null);
  const legacySlot = await slot(legacy, 1);
  assert.equal(legacySlot.checkpoints.find(checkpoint => checkpoint.id === legacySlot.lastCheckpointId).archive.campaign.prologue, null);
  await legacy.getByRole("button", { name: "THE PIT · combat", exact: true }).click();
  await legacy.getByRole("radio", { name: /^Versus local/ }).waitFor();
  assert.equal((await campaign(legacy)).prologue ?? null, null);
  await legacy.screenshot({ path: out + "/legacy-pit-preserved.png" });
  checks.push({ name: "legacy-v7-migration-keeps-deck-and-pit", prologue: null, noRetroactiveProof: true, pitAccessible: true });
  await legacy.close();
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  const report = { passed: true, base, at: new Date().toISOString(), checks, errors, failures };
  await fs.writeFile(out + "/report.json", JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
} catch (error) {
  await activePage?.screenshot({ path: out + "/failure.png" }).catch(() => {});
  await fs.writeFile(out + "/report.json", JSON.stringify({ passed: false, base, at: new Date().toISOString(), checks, errors, failures, error: String(error) }, null, 2));
  throw error;
} finally { await browser.close(); }
