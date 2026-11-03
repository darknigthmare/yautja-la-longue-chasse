import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright-core";
import { campaignFixture } from "./campaign-browser-helpers.mjs";

const base = process.env.V48_QA_URL || "http://127.0.0.1:4174";
const out = process.env.V48_YOUTH_RELIABILITY_OUTPUT || "work/v48/youth-reliability-browser-qa";
const archivePath = process.env.V48_DOJO_ARCHIVE || "work/v48/youth-scene-browser-qa/dojo-start-storage.json";
// This archive is exported only after an actual nursery victory and physical chief/mentor visit.
const storage = JSON.parse(await fs.readFile(archivePath, "utf8"));
const mainKey = "yautja-long-hunt.save", original = JSON.parse(storage[mainKey]);
assert.equal(original.prologue.status, "completed"); assert.equal(original.prologue.checkpoint.winner, "player");
assert.equal(original.youthTraining.checkpoint.phase, "dojo-move"); assert.equal(original.youthTraining.receipts.length, 0);
assert(["hunt-king", "terrace-instructor"].every(id => original.homeworld.greetedNpcIds.includes(id)));
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [], errors = [], failures = []; let activePage;
const campaign = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), mainKey);
const bytes = page => page.evaluate(key => localStorage.getItem(key), mainKey);
const canvas = page => page.locator("canvas[data-youth-stage]");
const state = page => canvas(page).evaluate(node => ({ phase: node.dataset.youthPhase, tick: Number(node.dataset.youthTick), paused: node.dataset.youthPaused, x: Number(node.dataset.youthPositions.split(",")[0]) }));
async function pageFromArchive() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); activePage = page; page.setDefaultTimeout(45000);
  page.on("pageerror", error => errors.push(error.message)); page.on("response", response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  await page.evaluate(entries => { localStorage.clear(); for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value); }, storage);
  await page.reload({ waitUntil: "networkidle" }); await page.getByRole("button", { name: /^Continuer/ }).click();
  await page.locator('canvas[data-youth-assets="true"]').waitFor({ timeout: 120000 });
  assert.equal(await page.locator("[data-campaign-location]").getAttribute("data-campaign-location"), "youth-training");
  await canvas(page).focus(); return page;
}
async function pause(page) { await page.getByRole("button", { name: "Pause et commandes", exact: true }).click(); await page.getByRole("dialog", { name: "Formation en pause", exact: true }).waitFor(); }
async function resume(page) { await page.getByRole("button", { name: "Reprendre la formation", exact: true }).click(); }
async function movement(page) {
  const key = (await campaign(page)).settings.controlBindings["pit.p1MoveRight"][0], start = await state(page);
  await canvas(page).focus(); await page.waitForTimeout(80); await page.keyboard.down(key); await page.waitForTimeout(320); await page.keyboard.up(key);
  const after = await state(page); assert(after.x > start.x + 15); return after;
}
async function fault(page, mode) {
  await page.evaluate(({ key, mode }) => {
    window.__youthOriginalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(candidate, value) {
      if (candidate === key) {
        if (mode === "quota") throw new DOMException("QA full storage", "QuotaExceededError");
        window.__youthOriginalSetItem.call(this, candidate, value); throw new Error("QA write confirmed after exception");
      }
      return window.__youthOriginalSetItem.call(this, candidate, value);
    };
  }, { key: mainKey, mode });
}
async function restore(page) { await page.evaluate(() => { Storage.prototype.setItem = window.__youthOriginalSetItem; delete window.__youthOriginalSetItem; }); }
try {
  const page = await pageFromArchive(); await movement(page); await pause(page);
  const before = await state(page), saved = await campaign(page); assert.equal(saved.youthTraining.checkpoint.tick, before.tick);
  await page.waitForTimeout(500); assert.equal((await state(page)).tick, before.tick);
  const baselineTime = saved.profile.playTimeSeconds - Math.floor(before.tick / 60);
  await page.getByRole("button", { name: "Enregistrer et revenir au menu", exact: true }).click();
  await page.locator('[data-campaign-menu="main"]').waitFor(); await page.getByRole("button", { name: /^Continuer/ }).click();
  await page.locator('canvas[data-youth-assets="true"]').waitFor({ timeout: 120000 }); await pause(page);
  const resumed = await state(page), reloaded = await campaign(page);
  assert(resumed.tick >= before.tick && resumed.tick < before.tick + 180); assert.equal(reloaded.createdAt, saved.createdAt);
  assert.equal(reloaded.profile.playTimeSeconds, baselineTime + Math.floor(resumed.tick / 60)); assert.equal(reloaded.youthTraining.receipts.length, 0);
  assert.equal(await page.locator(".physical-deck-screen").count(), 0);
  await page.getByRole("button", { name: "Réglages et sauvegardes", exact: true }).click();
  await page.locator("[data-campaign-save-panel]").waitFor(); await page.locator('[data-manual-save="1"]').click();
  await page.getByRole("status").filter({ hasText: "Sauvegarde manuelle 1 confirmée." }).waitFor();
  const doc = await page.evaluate(() => JSON.parse(localStorage.getItem("yautja-long-hunt.campaign-slot.1")));
  const manual = doc.checkpoints.find(checkpoint => checkpoint.id === "manual-1"); assert.equal(manual.resumeLocation, "youth-training"); assert.equal(manual.archive.campaign.youthTraining.checkpoint.tick, resumed.tick);
  await page.screenshot({ path: out + "/resumed-manual-dojo.png" }); checks.push({ name: "resume-and-manual-checkpoint-stay-in-dojo", beforeTick: before.tick, afterTick: resumed.tick, noFalseEquipment: true, noDuplicateTime: true }); await page.close();

  const quota = await pageFromArchive(); await movement(quota); await fault(quota, "quota"); const originalBytes = await bytes(quota); await pause(quota);
  await quota.getByRole("alert").filter({ hasText: /Sauvegarde de jeunesse refusée/ }).waitFor();
  const frozen = await state(quota); await quota.waitForTimeout(400); assert.equal((await state(quota)).tick, frozen.tick);
  await quota.getByRole("button", { name: "Enregistrer et revenir au menu", exact: true }).click(); assert.equal(await quota.locator('[data-campaign-menu="main"]').count(), 0);
  await resume(quota); await quota.waitForTimeout(300); assert.equal((await state(quota)).tick, frozen.tick); assert.equal(await bytes(quota), originalBytes);
  await quota.screenshot({ path: out + "/quota-protected.png" }); await restore(quota); await resume(quota);
  await quota.waitForFunction(tick => Number(document.querySelector("canvas[data-youth-stage]").dataset.youthTick) > tick, frozen.tick); await pause(quota);
  const recovered = await campaign(quota); assert.equal(recovered.youthTraining.receipts.length, 0); assert.equal(recovered.youthTraining.equipment.wristblade, false);
  checks.push({ name: "quota-freezes-resume-and-exit-until-safe-retry", frozenTick: frozen.tick, recoveredTick: recovered.youthTraining.checkpoint.tick, originalBytesPreserved: true }); await quota.close();

  const uncertain = await pageFromArchive(); await movement(uncertain); await fault(uncertain, "after-write"); await pause(uncertain);
  const observed = await campaign(uncertain), tick = (await state(uncertain)).tick; assert.equal(observed.youthTraining.checkpoint.tick, tick);
  await restore(uncertain); await resume(uncertain); await pause(uncertain);
  const settled = await campaign(uncertain); assert.equal(settled.createdAt, observed.createdAt); assert.equal(settled.youthTraining.receipts.length, 0);
  assert.equal(settled.profile.playTimeSeconds - Math.floor(settled.youthTraining.checkpoint.tick / 60), observed.profile.playTimeSeconds - Math.floor(tick / 60));
  checks.push({ name: "uncertain-write-reconciles-without-double-time", checkpointTick: tick, settledTick: settled.youthTraining.checkpoint.tick }); await uncertain.close();

  const conflict = await pageFromArchive(); await movement(conflict); await pause(conflict);
  const foreignBytes = await conflict.evaluate(key => { const value = JSON.parse(localStorage.getItem(key)); value.profile.hunterName = "Concurrent writer preserved"; const serialized = JSON.stringify(value); localStorage.setItem(key, serialized); return serialized; }, mainKey);
  await resume(conflict); await conflict.waitForTimeout(300); assert.equal(await bytes(conflict), foreignBytes);
  await conflict.locator("[data-youth-training]").getByRole("alert").filter({ hasText: /autre session|nouvelles données/ }).waitFor();
  assert.equal(await conflict.getByRole("dialog", { name: "Formation en pause", exact: true }).count(), 1);
  await conflict.screenshot({ path: out + "/concurrent-writer-preserved.png" }); checks.push({ name: "concurrent-same-owner-writer-preserved", byteIdentical: true, resumeRefused: true }); await conflict.close();

  const legacy = await browser.newPage({ viewport: { width: 1280, height: 900 } }); activePage = legacy; legacy.setDefaultTimeout(45000);
  const fixture = structuredClone(await campaignFixture()); fixture.save.version = 8; delete fixture.save.youthTraining;
  await legacy.addInitScript(({ key, save }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save)); }, fixture);
  await legacy.goto(base, { waitUntil: "networkidle", timeout: 120000 }); await legacy.getByRole("button", { name: /^Continuer/ }).click();
  await legacy.locator('[data-campaign-location="deck"]').waitFor(); assert.equal(await legacy.locator("[data-youth-training]").count(), 0);
  await legacy.getByRole("button", { name: "THE PIT · combat", exact: true }).click(); await legacy.getByRole("radio", { name: /^Versus local/ }).waitFor();
  const adult = await campaign(legacy); assert.equal(adult.prologue ?? null, null); assert.equal(adult.youthTraining ?? null, null);
  checks.push({ name: "legacy-v8-preserves-adult-deck-and-pit", noInventedYouth: true }); await legacy.close();
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  const report = { passed: true, base, archivePath, at: new Date().toISOString(), checks, errors, failures }; await fs.writeFile(out + "/report.json", JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
} catch (error) {
  await activePage?.screenshot({ path: out + "/failure.png" }).catch(() => {});
  await fs.writeFile(out + "/report.json", JSON.stringify({ passed: false, base, archivePath, at: new Date().toISOString(), checks, errors, failures, error: String(error) }, null, 2)); throw error;
} finally { await browser.close(); }
