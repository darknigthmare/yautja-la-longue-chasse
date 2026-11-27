/** Native GameClient proof for R2-M036 from a synthetic existing council mandate. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { fixture, docking, qa, saves } from '../tests/helpers/clan-ship-trophy-hearing-fixture.mjs';
import { playShipAcquisitionV161 } from '../tests/helpers/ship-receipt-v161.mjs';

const choice = process.env.WAR_COMMAND_INTRO_CHOICE ?? 'resupply';
assert.ok(['resupply', 'detour'].includes(choice));
const out = resolve(process.env.WAR_COMMAND_INTRO_OUTPUT ?? 'outputs/qa-war-command-r2-m036');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const key = saves.SAVE_STORAGE_KEY;
const command = qa.load('app/game/systems/warCommandIntroR2M036.ts');
const acquisition = qa.load('app/game/systems/shipAcquisitionV89.ts');
const directions = new Set(command.WAR_COMMAND_DIRECTIONS.map(item => item.id));

let initial = fixture({ evidence: false, ruins: false });
initial = playShipAcquisitionV161(qa, {
  ...initial, clanShipDocking: null, profile: { ...initial.profile, honor: 8000, rankId: 'elite', acquiredRankIdV166: 'elite' },
});
const ownerCreatedAt = initial.createdAt;
const ship = acquisition.shipAcquisitionOwnedHullV89(initial.shipAcquisitionV89, ownerCreatedAt);
assert.ok(ship);
const context = { ownerCreatedAt, personalShipId: ship.shipId };
let berth = docking.createClanShipDockingState(ownerCreatedAt, ship.shipId);
for (const type of ['approach', 'dock', 'board']) {
  const result = docking.actClanShipDocking(berth, { type }, context);
  assert.ok(result.accepted, result.message);
  berth = result.state;
}
initial = { ...initial, clanShipDocking: berth, settings: { ...initial.settings, masterVolume: 0 } };
const admitted = saves.parseSaveImport(saves.exportSave(initial));
assert.ok(admitted.save, admitted.failure);
const report = { commit, choice, passed: false, visits: [], errors: [], missing: [], captures: [],
  admission: 'A synthetic existing mandate and ship acquired through production reducers. The field and tactical commands are played in the native interface.' };
await mkdir(out, { recursive: true });
let browser, server, page;
try {
  server = await createServer({ configFile: resolve('desktop/vite.config.ts'), server: { host: '127.0.0.1', port: 4220, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
  const browserContext = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  await browserContext.addInitScript(({ key, seed }) => {
    if (!localStorage.getItem('__qaWarCommandIntro')) {
      localStorage.setItem(key, JSON.stringify(seed));
      localStorage.setItem('__qaWarCommandIntro', 'true');
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
  const field = panel.locator('[data-r2-m036]');
  const order = id => field.locator('[data-r2-m036-order="' + id + '"]');
  const view = async () => command.warCommandIntroView((await read()).clanShipOperations.warCommandIntro);
  await page.goto('http://127.0.0.1:4220');
  await enter();
  await visit('conseil');
  await open('war-command-intro');
  await durable(order('deploy'));
  assert.equal(await field.locator('[data-r2-m036-team]').count(), 3);
  await durable(order('retreat'));
  await field.locator('[data-r2-m036-recovered]').waitFor();
  assert.match(await field.locator('[data-r2-m036-recovered]').innerText(), /revenue[s]? 3/);
  await capture('retraite-avec-les-formations');
  await durable(order('retry'));
  await durable(order('cover'));
  const move = (await view()).options.find(option => directions.has(option.id));
  assert.ok(move);
  await durable(order(move.id));
  await durable(order('pull-back'));
  assert.equal(await field.locator('[data-r2-m036-team="2"]').getAttribute('data-status'), 'evacuated');
  await capture('trois-ordres-depuis-le-commandement');
  await durable(order(choice));
  let progressed = false;
  for (let n = 0; n < 35 && (await view()).step === 'field'; n++) {
    const step = (await view()).options.find(option => option.id !== 'retreat');
    assert.ok(step);
    await durable(order(step.id));
    if (progressed) continue;
    progressed = true;
    const midpoint = (await read()).clanShipOperations.warCommandIntro;
    const position = await field.getAttribute('data-r2-m036-field-position');
    await capture('au-sol-' + choice);
    await page.reload();
    await enter();
    await visit('conseil');
    await open('war-command-intro');
    assert.deepEqual((await read()).clanShipOperations.warCommandIntro, midpoint);
    assert.equal(await field.getAttribute('data-r2-m036-field-position'), position);
  }
  assert.equal(await field.getAttribute('data-r2-m036-step'), 'complete');
  await panel.locator('[data-clan-operations-tab="journal"]').click();
  await panel.locator('[data-r2-m036-receipt]').waitFor();
  await capture('recu');
  const final = await read();
  assert.equal(final.clanShipOperations.warCommandIntro.rtsIntroductionResolved, true);
  assert.deepEqual(final.missionProgress, admitted.save.missionProgress);
  assert.equal(final.profile.honor, admitted.save.profile.honor);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.missing, []);
  report.receipt = final.clanShipOperations.warCommandIntro;
  report.passed = true;
} finally {
  if (!report.passed && page) await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {});
  await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
}
console.log(JSON.stringify({ passed: report.passed, commit, choice }));
