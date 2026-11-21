/** Native GameClient proof for the first collective escort. Admission is a
 * declared synthetic campaign prepared through the production state machines. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { fixture, completeInterior, docking, ops, qa, saves } from '../tests/helpers/clan-ship-trophy-hearing-fixture.mjs';
import { playShipAcquisitionV161 } from '../tests/helpers/ship-receipt-v161.mjs';

const role = process.env.CLAN_COLLECTIVE_ROLE ?? 'field';
assert.ok(['field', 'coordination'].includes(role));
const out = resolve(process.env.CLAN_COLLECTIVE_OUTPUT ?? 'outputs/qa-collective-return');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.ASSET_RACCORDS_SOURCE_COMMIT) assert.equal(commit, process.env.ASSET_RACCORDS_SOURCE_COMMIT);
const hull = qa.load('app/game/systems/clanHullProjectV171.ts');
const acquisition = qa.load('app/game/systems/shipAcquisitionV89.ts');
const key = saves.SAVE_STORAGE_KEY;
let initial = ['ship-seal-check', 'ship-armory-audit', 'ship-triage-route']
  .reduce(completeInterior, fixture({ evidence: false, ruins: false }));
initial = playShipAcquisitionV161(qa, {
  ...initial, clanShipDocking: null, profile: { ...initial.profile, honor: 5000, rankId: 'elite' },
});
const owner = initial.createdAt;
const ship = acquisition.shipAcquisitionOwnedHullV89(initial.shipAcquisitionV89, owner);
assert.ok(ship);
const context = { ownerCreatedAt: owner, personalShipId: ship.shipId };
let berth = docking.createClanShipDockingState(owner, ship.shipId);
function dock(command) {
  const result = docking.actClanShipDocking(berth, command, context);
  assert.ok(result.accepted, result.message);
  berth = result.state;
  initial = { ...initial, clanShipDocking: berth };
}
for (const type of ['approach', 'dock', 'board']) dock({ type });
function project(command, contact = null) {
  const result = hull.commitClanHullProject(initial, { ...command, expectedRevision: initial.clanHullProjectV171?.revision ?? 0 }, contact);
  assert.ok(result.ok, result.message);
  initial = { ...initial, clanHullProjectV171: result.state };
}
project({ type: 'inspect' });
project({ type: 'consult' }, 'threshold-guard');
dock({ type: 'move-room', roomId: 'conseil' });
project({ type: 'consult' }, 'star-watch');
project({ type: 'pledge', pledge: 'shared-watch' });
for (const member of ops.CLAN_SHIP_RECRUITS) {
  dock({ type: 'move-room', roomId: member.roomId });
  const state = initial.clanShipOperations;
  const result = ops.actClanShipOperations(state, { type: 'recruit', npcId: member.id, expectedRevision: state.revision }, {
    ownerCreatedAt: owner, docking: berth, campaign: initial,
  });
  assert.ok(result.accepted, result.message);
  initial = { ...initial, clanShipOperations: result.state };
}
dock({ type: 'move-room', roomId: 'conseil' });
initial.settings.masterVolume = 0;
const admitted = saves.parseSaveImport(saves.exportSave(initial));
assert.equal(admitted.failure, null);
assert.equal(admitted.save.clanShipOperations.spaceEncounter, null);
assert.ok(ops.evaluateClanShipContract(admitted.save.clanShipOperations, ops.CLAN_SHIP_COLLECTIVE_ID, admitted.save).allowed);
const report = {
  commit, role, passed: false,
  admission: 'Preconditions and recruitment are synthetic fixtures exercised with production reducers, before any escort order.',
  visits: [], errors: [], missing: [], captures: [],
};
await mkdir(out, { recursive: true });
let browser, server, page;
try {
  server = await createServer({ configFile: resolve('desktop/vite.config.ts'), server: { host: '127.0.0.1', port: 4217, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
  const browserContext = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  await browserContext.addInitScript(({ key, seed }) => {
    if (!localStorage.getItem('__qaCollective')) {
      localStorage.setItem(key, JSON.stringify(seed));
      localStorage.setItem('__qaCollective', 'true');
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
  await page.goto('http://127.0.0.1:4217');
  await enter();
  await visit('conseil');
  await open('contracts');
  await panel.locator('[data-clan-contract-card="' + ops.CLAN_SHIP_COLLECTIVE_ID + '"]').click();
  await durable(panel.locator('[data-clan-accept-contract="' + ops.CLAN_SHIP_COLLECTIVE_ID + '"]'));
  await durable(panel.locator('[data-collective-role="' + role + '"]'));
  assert.equal(await panel.locator('[data-collective-launch]').count(), 0);
  for (const member of ops.CLAN_SHIP_RECRUITS) {
    await visit(member.roomId);
    await open('contracts');
    await durable(panel.locator('[data-collective-check="' + member.id + '"]'));
  }
  assert.deepEqual((await read()).clanShipOperations.activeContract.collective.checkedNpcIds, ops.CLAN_SHIP_RECRUITS.map(member => member.id));
  await visit('hangar');
  await open('contracts');
  await durable(panel.locator('[data-collective-launch]'));
  const station = ops.clanShipCollectiveStation(role);
  if (station !== 'hangar') {
    await visit(station);
    await open('contracts');
  }
  const orders = ['scan', 'manoeuvre', 'brace', 'brace', 'extract'];
  for (const order of orders) await durable(panel.locator('[data-clan-space-order="' + order + '"]'));
  const won = await read();
  const receipt = won.clanShipOperations.completedContracts.at(-1);
  assert.equal(receipt.contractId, ops.CLAN_SHIP_COLLECTIVE_ID);
  assert.equal(receipt.proof.encounter.status, 'victory');
  assert.deepEqual(receipt.proof.encounter.history, orders);
  assert.equal(receipt.proof.collective.role, role);
  assert.equal(receipt.proof.collective.capacity, 7);
  assert.deepEqual(receipt.proof.collective.checkedNpcIds, ops.CLAN_SHIP_RECRUITS.map(member => member.id));
  assert.equal(won.profile.clanMarks, admitted.save.profile.clanMarks);
  const tactical = panel.locator('[data-clan-space-report][data-collective-report-role="' + role + '"]');
  await tactical.waitFor({ state: 'visible' });
  await capture('tactical-report-' + role);
  await page.reload();
  await enter();
  await visit(station);
  await open('contracts');
  await tactical.waitFor({ state: 'visible' });
  await panel.locator('[data-clan-operations-tab="journal"]').click();
  const journal = panel.locator('[data-collective-completed]');
  assert.match(await journal.innerText(), /Transport extrait.*7\/7/);
  const restored = await read();
  assert.deepEqual(restored.clanShipOperations.completedContracts.at(-1), receipt);
  assert.equal(restored.clanShipOperations.completedContracts.filter(entry => entry.contractId === receipt.contractId).length, 1);
  await capture('reloaded-chronicle-' + role);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.missing, []);
  report.receipt = receipt;
  report.passed = true;
} finally {
  if (!report.passed && page) await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {});
  await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
}
console.log(JSON.stringify({ passed: report.passed, role, physicalVisits: report.visits.length, recordedStation: ops.clanShipCollectiveStation(role) }));
