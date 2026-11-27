/** Native GameClient proof for R2-M054. The prior harvest and Elder admission use a documented synthetic fixture. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { fixture, docking, ops, qa, saves } from '../tests/helpers/clan-ship-trophy-hearing-fixture.mjs';
import { playShipAcquisitionV161 } from '../tests/helpers/ship-receipt-v161.mjs';
import { recognizeElderThroughAssembly } from '../tests/helpers/elder-recognition-r2-m051.mjs';

const outcome = process.env.SUCCESSOR_OUTCOME ?? 'intervened';
assert.ok(['delegated', 'advised', 'intervened'].includes(outcome));
const out = resolve(process.env.SUCCESSOR_OUTPUT ?? 'outputs/qa-successor-trial-r2-m054');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const acquisition = qa.load('app/game/systems/shipAcquisitionV89.ts');
const terrain = qa.load('app/game/systems/oserisReturnR2M053.ts');
const trial = qa.load('app/game/systems/successorTrialR2M054.ts');
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
const route = outcome === 'advised' ? ['adapt', 'climb-bank', 'follow-canopy', 'descend-east']
  : ['maintain', 'place-markers', 'cross-river'];
for (const order of ['land', 'approach', 'compare', ...route, 'return']) {
  const result = ops.actClanShipOperations(initial.clanShipOperations, {
    type: 'oseris-return', order, expectedRevision: initial.clanShipOperations.revision,
  }, { ownerCreatedAt: owner, campaign: initial, docking: berth });
  assert.ok(result.accepted, result.message);
  initial = { ...initial, clanShipOperations: result.state };
}
const admitted = saves.parseSaveImport(saves.exportSave(initial));
assert.equal(admitted.failure, null);
assert.ok(terrain.oserisReturnAvailable(admitted.save));
assert.equal(admitted.save.elderAssemblyV168.responsibility, 'travel');
const plan = trial.successorTrialPlan(admitted.save, admitted.save.clanShipOperations.legacy);
assert.ok(plan);
const report = { commit, outcome, passed: false, visits: [], errors: [], missing: [], captures: [],
  admission: 'Synthetic eligibility using the production hunt result, acquisition, Elder assembly and return to Oseris-IV reducers. Every R2-M054 step is played in the native interface.' };
await mkdir(out, { recursive: true });
let browser, server, page;
try {
  server = await createServer({ configFile: resolve('desktop/vite.config.ts'), server: { host: '127.0.0.1', port: 4220, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
  const browserContext = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  await browserContext.addInitScript(({ key, seed }) => {
    if (!localStorage.getItem('__qaSuccessorTrial')) {
      localStorage.setItem(key, JSON.stringify(seed));
      localStorage.setItem('__qaSuccessorTrial', 'true');
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
  await open('successor-trial');
  const field = panel.locator('[data-r2-m054]');
  const board = field.getByRole('region', { name: 'Terrain d’Oseris-IV à onze colonnes' });
  const order = id => field.locator('[data-r2-m054-order="' + id + '"]');
  const position = async () => {
    const [column, row] = (await field.getAttribute('data-r2-m054-position')).split(',').map(Number);
    return { column, row };
  };
  const walkTo = async target => {
    let here = await position();
    await board.focus();
    for (let steps = 0; steps < 76 && JSON.stringify(here) !== JSON.stringify(target); steps++) {
      const next = trial.nextSuccessorStep(here, target);
      const direction = trial.SUCCESSOR_DIRECTIONS.find(item => item.column === next.column - here.column && item.row === next.row - here.row);
      assert.ok(direction, 'Path must take a legal walking step');
      await page.keyboard.press(direction.key);
      await page.waitForFunction(({ column, row }) => document.querySelector('[data-r2-m054]')?.getAttribute('data-r2-m054-position') === column + ',' + row, next);
      here = await position();
    }
    assert.deepEqual(here, target);
  };
  async function take(id) {
    const current = (await read()).clanShipOperations.successorTrial?.orders ?? [];
    const target = trial.successorTrialView(plan, current).options.find(item => item.id === id).point;
    if (current.length) await walkTo(target);
    await durable(order(id));
  }

  await take('deploy');
  assert.equal(await order('observe-posts').count(), 0, 'Observation requires walking to the first post');
  await take('observe-posts');
  await take(outcome === 'advised' ? 'advise' : 'delegate');
  assert.equal(await order('intervene').count(), 0, 'No danger before the approach');
  await take('observe-approach');
  if (outcome !== 'advised') {
    assert.equal(await field.getAttribute('data-r2-m054-danger'), 'true');
    assert.equal(await order('intervene').count(), 0, 'Intervention requires the safety position');
    await capture('danger-immediat');
  } else {
    assert.equal(await field.getAttribute('data-r2-m054-danger'), 'false');
    assert.equal(await order('intervene').count(), 0);
  }

  const midway = (await read()).clanShipOperations.successorTrial;
  await page.reload();
  await enter();
  await visit('hangar');
  await open('successor-trial');
  assert.deepEqual((await read()).clanShipOperations.successorTrial, midway);
  assert.deepEqual(await position(), trial.successorTrialView(plan, midway.orders).checkpoint);
  if (outcome !== 'advised') await take(outcome === 'intervened' ? 'intervene' : 'give-space');
  await take('observe-extraction');
  await capture('extraction-observee');
  await take('report');
  await field.locator('[data-r2-m054-outcome="' + outcome + '"]').waitFor();
  await panel.locator('[data-clan-operations-tab="journal"]').click();
  await panel.locator('[data-r2-m054-receipt]').waitFor();
  await capture('recu');
  const final = await read();
  assert.equal(final.clanShipOperations.successorTrial.transmissionTrialObserved, true);
  assert.deepEqual(final.missionProgress, admitted.save.missionProgress);
  assert.equal(final.profile.honor, admitted.save.profile.honor);
  assert.deepEqual(final.elderAssemblyV168, admitted.save.elderAssemblyV168);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.missing, []);
  report.receipt = final.clanShipOperations.successorTrial;
  report.passed = true;
} finally {
  if (!report.passed && page) await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {});
  await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
}
console.log(JSON.stringify({ passed: report.passed, commit, outcome }));
