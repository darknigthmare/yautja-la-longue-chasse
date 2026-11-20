#!/usr/bin/env node
/** Compiled Next W-02 menu, choice, native save, reload and reserved return.
 * Both fresh browser contexts start from the same disclosed active-trip archive.
 * The setup uses the real reducers and save round trip. Chromium performs every
 * action under test through the app's ordinary controls. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {chromium} from 'playwright-core';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

const origin = new URL(process.env.WARP_W02_QA_ORIGIN ?? 'http://127.0.0.1:4189');
assert.equal(origin.protocol, 'http:');
assert.equal(origin.hostname, '127.0.0.1', 'Use the compiled application on loopback');
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
if (process.env.WARP_W02_QA_SOURCE_COMMIT) assert.equal(sourceCommit, process.env.WARP_W02_QA_SOURCE_COMMIT);
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
assert.ok(buildId, 'Build the production app first');
const output = resolve(process.env.WARP_W02_QA_OUTPUT ?? 'outputs/qa-warp-w02-20261120');
await mkdir(output, {recursive: true});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

const actual = homeworldSceneSsrV78();
const saves = actual.load('app/game/save.ts');
const warp = actual.load('app/game/systems/warpEpochsV165.ts');
const owner = '2026-11-20T01:00:00.000Z';
const key = saves.SAVE_STORAGE_KEY;
const accept = result => {
  assert.equal(result.accepted, true, result.message);
  return result.state;
};
const departureFixture = {blooded: true, personalShip: true, adjutant: true};
let active = accept(warp.startWarpCommonQuestV165(warp.createWarpEpochsV165(owner), departureFixture, 'stabilite'));
for (const component of warp.WARP_COMPONENTS_V165) {
  active = accept(warp.verifyWarpComponentV165(active, component.id, 'reparer'));
}
active = accept(warp.installWarpModuleV165(active, 'marge'));
active = accept(warp.selectWarpBranchV165(active, 'W-02'));
active = accept(warp.departWarpV165(active, departureFixture));
const exported = saves.exportSave({...saves.defaultSave(owner), warpEpochsV165: active});
const parsed = saves.parseSaveImport(exported);
assert.ok(parsed.save, parsed.failure);
assert.deepEqual(parsed.save.warpEpochsV165, active);
assert.equal(warp.branchVisitV165(active, 'W-02').steps['WARP-M16'], undefined);

const bell = new URL(warp.WARP_W02_BONSHO_V165, origin).href;
const response = await fetch(bell);
assert.equal(response.status, 200);
const png = Buffer.from(await response.arrayBuffer());
assert.equal(hash(png), 'd636d7fd399bb2dabb1c05caec8213bf28321d4d89fba424767d0e801e1428e0');

const report = {
  sourceCommit, buildId, origin: origin.origin, passed: false, checks: [],
  setup: 'One normal exported/imported save per isolated Chromium context. Active W-02 trip prepared with the real transition functions and declared departure conditions; earning those conditions is outside this run.',
  scope: 'Native campaign menu, actual WARP-M16 choice and original bell PNG, durable save with reload, reserved return. Wave placement is verified separately by the domain test.',
  archive: {sha256: hash(exported), owner, tripId: active.activeWarpTripId, branch: 'W-02'},
  asset: {url: bell, bytes: png.length, sha256: hash(png)},
};
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
  headless: true,
});
try {
  report.browserVersion = browser.version();
  for (const [choice, label, alerted, width] of [
    ['declencher', 'Faire sonner la cloche pour détourner le guetteur', true, 390],
    ['contourner', 'Contourner les signaux', false, 1440],
  ]) {
    const context = await browser.newContext({
      viewport: {width, height: 900},
      storageState: {cookies: [], origins: [{origin: origin.origin, localStorage: [{name: key, value: JSON.stringify(parsed.save)}]}]},
    });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.setDefaultTimeout(30000);
      const panel = page.locator('[data-warp-epochs-v165]');
      const step = panel.locator('[data-warp-step="WARP-M16"]');
      const alert = panel.getByText('La cloche a détourné un garde de la terrasse vers le camp.', {exact: false});
      const saved = () => page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)), key);
      const open = async () => {
        await page.locator('[data-campaign-menu]').waitFor();
        const section = page.locator('[data-menu-section="campaign"]');
        if (await section.count()) await section.click();
        await page.locator('[data-menu-action="continue"]').click();
        await page.locator('[data-campaign-session]').waitFor();
        await page.getByRole('button', {name: 'Dossier de campagne', exact: true}).click();
        await page.locator('[data-warp-entry-v165]').click();
        await panel.waitFor();
      };
      await page.goto(origin.href, {waitUntil: 'domcontentloaded'});
      await open();
      assert.equal(await panel.getAttribute('data-warp-trip'), active.activeWarpTripId);
      assert.equal(await step.getAttribute('data-resolved'), 'false');
      const before = await saved();
      const image = step.locator('[data-warp-bonsho]');
      await image.waitFor();
      await page.waitForFunction(() => {
        const item = document.querySelector('[data-warp-bonsho]');
        return item?.complete && item.naturalWidth === 1536 && item.naturalHeight === 1024;
      });
      assert.equal(await image.evaluate(item => item.currentSrc), bell);
      await step.getByRole('button', {name: label, exact: true}).click();
      await panel.locator('[data-warp-step="WARP-M16"][data-resolved="true"]').waitFor();
      const disk = await saved();
      assert.deepEqual(disk.profile, before.profile);
      const visit = disk.warpEpochsV165.branchVisitState['W-02'];
      assert.equal(visit.steps['WARP-M16'].choice, choice);
      assert.deepEqual(visit.alertedPassages, alerted ? [warp.WARP_W02_TERRACE_ALERT_V165] : []);
      assert.equal(disk.warpEpochsV165.warpReturnReservation, 'reservee');
      assert.equal(await alert.isVisible(), alerted);
      const screenshot = `bell-${choice}-${width}.png`;
      await step.screenshot({path: join(output, screenshot)});

      await page.reload({waitUntil: 'domcontentloaded'});
      await open();
      assert.equal(await step.getAttribute('data-resolved'), 'true');
      assert.equal(await alert.isVisible(), alerted);
      assert.deepEqual((await saved()).warpEpochsV165.branchVisitState['W-02'], visit);
      await panel.getByRole('button', {name: 'Revenir (retour réservé)', exact: true}).click();
      await page.locator('[data-warp-epochs-v165][data-warp-return="utilisee"]').waitFor();
      const returned = await saved();
      assert.equal(returned.warpEpochsV165.activeWarpTripId, null);
      assert.deepEqual(returned.warpEpochsV165.branchVisitState['W-02'], visit);
      assert.deepEqual(returned.profile, before.profile);
      assert.deepEqual(errors, []);
      report.checks.push({choice, width, alertedPassages: visit.alertedPassages, screenshot, returned: true});
    } finally {
      await context.close();
    }
  }
  report.passed = true;
} catch (error) {
  report.error = String(error.stack ?? error);
  throw error;
} finally {
  await browser.close();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
