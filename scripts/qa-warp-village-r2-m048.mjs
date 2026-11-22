/** Native GameClient proof for R2-M048. The installed Warp and departure are a synthetic admission fixture. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

const choice = process.env.WARP_VILLAGE_CHOICE ?? 'limited-aid';
assert.ok(['limited-aid', 'observation'].includes(choice));
const out = resolve(process.env.WARP_VILLAGE_OUTPUT ?? 'outputs/qa-warp-village-r2-m048');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const loader = homeworldSceneSsrV78();
const warp = loader.load('app/game/systems/warpEpochsV165.ts');
const saves = loader.load('app/game/save.ts');
const owner = '2026-11-22T10:00:00.000Z';
const base = saves.defaultSave(owner);
const save = { ...base, profile: { ...base.profile, rankId: 'elite', acquiredRankIdV166: 'elite', honor: 5000 },
  settings: { ...base.settings, masterVolume: 0 } };
const admission = { blooded: true, personalShip: true, adjutant: true };
let state = warp.createWarpEpochsV165(owner);
function accept(result) {
  assert.ok(result.accepted, result.message);
  state = result.state;
}
accept(warp.startWarpCommonQuestV165(state, admission, 'stabilite'));
for (const part of warp.WARP_COMPONENTS_V165) accept(warp.verifyWarpComponentV165(state, part.id, 'reparer'));
accept(warp.installWarpModuleV165(state, 'marge'));
accept(warp.selectWarpBranchV165(state, 'W-02'));
accept(warp.departWarpV165(state, admission));
const exported = saves.parseSaveImport(saves.exportSave({ ...save, warpEpochsV165: state }));
assert.equal(exported.failure, null);
assert.equal(exported.save.profile.rankId, 'elite');
const key = saves.SAVE_STORAGE_KEY;
const report = { commit, choice, passed: false, errors: [], captures: [], admission: 'Fixture using production transitions through departure, before R2-M048.' };
await mkdir(out, { recursive: true });
let browser, server, page;
try {
  server = await createServer({ configFile: resolve('desktop/vite.config.ts'), server: { host: '127.0.0.1', port: 4218, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  await context.addInitScript(({ key, seed }) => {
    if (!localStorage.getItem('__qaWarpVillage')) {
      localStorage.setItem(key, JSON.stringify(seed));
      localStorage.setItem('__qaWarpVillage', 'true');
    }
  }, { key, seed: exported.save });
  page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => report.errors.push(error.message));
  const read = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
  const panel = page.locator('[data-warp-epochs-v165]');
  const village = panel.locator('[data-warp-village]');
  async function enter() {
    await page.locator('[data-campaign-menu]').waitFor({ timeout: 90000 });
    const campaignMenu = page.locator('[data-menu-section="campaign"]');
    if (await campaignMenu.isVisible()) await campaignMenu.click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.getByRole('button', { name: 'Dossier de campagne', exact: true }).click({ timeout: 90000 });
    await page.locator('[data-warp-entry-v165]').click();
    await village.waitFor({ timeout: 90000 });
  }
  async function capture(name) {
    await village.scrollIntoViewIfNeeded();
    const bytes = await page.screenshot({ animations: 'disabled' });
    await writeFile(resolve(out, name + '.png'), bytes);
    report.captures.push({ name, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  async function order(id, count) {
    await village.locator('[data-warp-village-order="' + id + '"]').click();
    await page.waitForFunction(({ key, count }) =>
      JSON.parse(localStorage.getItem(key))?.warpEpochsV165?.branchVisitState['W-02']?.r2M048?.orders.length === count,
    { key, count });
  }

  await page.goto('http://127.0.0.1:4218');
  await enter();
  await order('meet-weavers', 1);
  await order('survey-mill', 2);
  assert.equal(await village.getAttribute('data-warp-village-place'), 'mill');
  await capture('moulin');
  await order(choice, 3);
  const midway = (await read()).warpEpochsV165.branchVisitState['W-02'].r2M048;
  await page.reload();
  await enter();
  assert.equal(await village.getAttribute('data-warp-village-choice'), choice);
  assert.deepEqual((await read()).warpEpochsV165.branchVisitState['W-02'].r2M048, midway);
  await order(choice === 'limited-aid' ? 'guide-from-bank' : 'follow-locals', 4);
  await order('verify-granary', 5);
  await capture('grenier');
  await order('record-trace', 6);
  assert.equal(await village.getAttribute('data-warp-village-completed'), 'true');
  await panel.getByRole('button', { name: 'Revenir (retour réservé)', exact: true }).click();
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k))?.warpEpochsV165?.activeWarpTripId === null, key);
  const final = await read();
  assert.equal(final.warpEpochsV165.warpReturnReservation, 'utilisee');
  assert.equal(final.warpEpochsV165.branchVisitState['W-02'].r2M048.advancedBranchResolved, true);
  assert.deepEqual(final.warpEpochsV165.branchVisitState['W-02'].takenObjectIds, []);
  assert.deepEqual(final.warpEpochsV165.echoes, []);
  assert.equal(final.profile.honor, exported.save.profile.honor);
  assert.deepEqual(final.trophies, exported.save.trophies);
  await capture('releve-de-branche');
  assert.deepEqual(report.errors, []);
  report.receipt = final.warpEpochsV165.branchVisitState['W-02'].r2M048;
  report.passed = true;
} finally {
  if (!report.passed && page) await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {});
  await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
}
console.log(JSON.stringify({ passed: report.passed, commit, choice }));
