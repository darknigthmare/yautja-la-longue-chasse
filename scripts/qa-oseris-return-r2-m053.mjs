/** Native GameClient proof for R2-M053. The prior harvest and Elder admission use a documented synthetic fixture. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { fixture, docking, qa, saves } from '../tests/helpers/clan-ship-trophy-hearing-fixture.mjs';
import { playShipAcquisitionV161 } from '../tests/helpers/ship-receipt-v161.mjs';
import { recognizeElderThroughAssembly } from '../tests/helpers/elder-recognition-r2-m051.mjs';

const choice = process.env.OSERIS_RETURN_CHOICE ?? 'maintain';
assert.ok(['maintain', 'adapt'].includes(choice));
const out = resolve(process.env.OSERIS_RETURN_OUTPUT ?? 'outputs/qa-oseris-r2-m053');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const acquisition = qa.load('app/game/systems/shipAcquisitionV89.ts');
const terrain = qa.load('app/game/systems/oserisReturnR2M053.ts');
const key = saves.SAVE_STORAGE_KEY;
let initial = fixture({ evidence: false, ruins: false });
initial = playShipAcquisitionV161(qa, {
  ...initial, clanShipDocking: null, profile: { ...initial.profile, honor: 8000, rankId: 'elite', acquiredRankIdV166: 'elite' },
});
const owner = initial.createdAt;
const ship = acquisition.shipAcquisitionOwnedHullV89(initial.shipAcquisitionV89, owner);
assert.ok(ship);
const context = { ownerCreatedAt: owner, personalShipId: ship.shipId };
let berth = docking.createClanShipDockingState(owner, ship.shipId);
for (const type of ['approach', 'dock', 'board']) {
  const result = docking.actClanShipDocking(berth, { type }, context);
  assert.ok(result.accepted, result.message);
  berth = result.state;
}
initial = { ...initial, clanShipDocking: berth, settings: { ...initial.settings, masterVolume: 0 } };
assert.equal(terrain.oserisReturnAvailable(initial), false);
initial = recognizeElderThroughAssembly(qa, initial);
const admitted = saves.parseSaveImport(saves.exportSave(initial));
assert.equal(admitted.failure, null);
assert.ok(terrain.oserisReturnAvailable(admitted.save));
assert.equal(admitted.save.elderAssemblyV168.responsibility, 'travel');
const report = { commit, choice, passed: false, visits: [], errors: [], missing: [], captures: [],
  admission: 'Synthetic eligibility using the production hunt result, ship acquisition and Elder assembly reducers, before any R2-M053 action.' };
await mkdir(out, { recursive: true });
let browser, server, page;
try {
  server = await createServer({ configFile: resolve('desktop/vite.config.ts'), server: { host: '127.0.0.1', port: 4220, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
  const browserContext = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  await browserContext.addInitScript(({ key, seed }) => {
    if (!localStorage.getItem('__qaOserisReturn')) {
      localStorage.setItem(key, JSON.stringify(seed));
      localStorage.setItem('__qaOserisReturn', 'true');
    }
  }, { key, seed: admitted.save });
  page = await browserContext.newPage();
  page.setDefaultTimeout(25000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).pathname.startsWith('/game/')) report.missing.push(new URL(response.url()).pathname);
  });
  const read = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
  const panel = page.locator('[data-clan-operations]');
  const control = page.locator('[data-interior-operations]');
  const scene = page.locator('[data-clan-interior]');
  async function enter() {
    await page.locator('[data-campaign-menu]').waitFor({ timeout: 90000 });
    const menu = page.locator('[data-menu-section="campaign"]');
    if (await menu.isVisible()) await menu.click();
    await page.locator('[data-menu-action="continue"]').click();
    await scene.waitFor({ timeout: 90000 });
  }
  async function open(tab) {
    if (await control.getAttribute('data-interior-operations-ready') !== 'true') {
      await control.click();
      await page.waitForFunction(() => document.querySelector('[data-interior-operations]')?.getAttribute('data-interior-operations-ready') === 'true', null, { timeout: 45000 });
    }
    await control.click();
    await panel.locator('[data-clan-operations-tab="' + tab + '"]').click();
  }
  async function visit(roomId) {
    if (await panel.isVisible()) await panel.locator('[data-clan-operations-close]').click();
    if (await scene.getAttribute('data-interior-room') !== roomId) {
      await page.locator('[data-clan-ship-room-target="' + roomId + '"]').click();
    }
    await page.waitForFunction(room => {
      const scene = document.querySelector('[data-clan-interior]');
      return scene?.getAttribute('data-interior-room') === room && scene.getAttribute('data-interior-moving') === 'false'
        && !scene.getAttribute('data-interior-target-room');
    }, roomId, { timeout: 60000 });
    assert.equal((await read()).clanShipDocking.roomId, roomId);
    report.visits.push(roomId);
  }
  async function durable(locator) {
    const revision = (await read()).clanShipOperations.revision;
    await locator.click();
    await page.waitForFunction(({ key, revision }) =>
      JSON.parse(localStorage.getItem(key))?.clanShipOperations?.revision === revision + 1,
    { key, revision });
  }
  async function capture(name) {
    const bytes = await page.screenshot({ animations: 'disabled' });
    await writeFile(resolve(out, name + '.png'), bytes);
    report.captures.push({ name, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  await page.goto('http://127.0.0.1:4220');
  await enter();
  await visit('hangar');
  await open('oseris-return');
  const field = panel.locator('[data-oseris-return]');
  const order = id => field.locator('[data-oseris-return-order="' + id + '"]');
  for (const id of ['land', 'approach', 'compare']) await durable(order(id));
  await field.locator('[data-oseris-old-route]').waitFor();
  const westRim = Number(await field.getAttribute('data-oseris-return-pos'));
  assert.ok(westRim < terrain.OSERIS_RETURN_TERRAIN_R2_M053.trench.x);
  await capture('releve-superpose');
  await durable(order(choice));
  const branch = choice === 'maintain' ? ['place-markers', 'cross-river'] : ['climb-bank', 'follow-canopy', 'descend-east'];
  await durable(order(branch[0]));
  const midway = (await read()).clanShipOperations.legacy;
  await page.reload();
  await enter();
  await visit('hangar');
  await open('oseris-return');
  assert.deepEqual((await read()).clanShipOperations.legacy, midway);
  for (const id of branch.slice(1)) await durable(order(id));
  assert.ok(Number(await field.getAttribute('data-oseris-return-pos')) > terrain.OSERIS_RETURN_TERRAIN_R2_M053.trench.x + terrain.OSERIS_RETURN_TERRAIN_R2_M053.trench.width);
  await capture('tranchee-franchie-' + choice);
  await durable(order('return'));
  assert.equal(await field.getAttribute('data-oseris-return-complete'), 'true');
  await panel.locator('[data-clan-operations-tab="journal"]').click();
  const receipt = panel.locator('[data-oseris-return-receipt]');
  assert.match(await receipt.innerText(), choice === 'maintain' ? /Passage de rive entretenu/ : /Canopée adoptée/);
  await capture('releve-consigne');
  const final = await read();
  assert.equal(final.clanShipOperations.legacy.returnedWorldCompared, true);
  assert.deepEqual(final.missionProgress['jungle-vey'], admitted.save.missionProgress['jungle-vey']);
  assert.equal(final.profile.honor, admitted.save.profile.honor);
  assert.deepEqual(final.elderAssemblyV168, admitted.save.elderAssemblyV168);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.missing, []);
  report.receipt = final.clanShipOperations.legacy;
  report.passed = true;
} finally {
  if (!report.passed && page) await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {});
  await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
}
console.log(JSON.stringify({ passed: report.passed, commit, choice }));
