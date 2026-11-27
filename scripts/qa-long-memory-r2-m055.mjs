/** Native GameClient proof for R2-M055. The previous life chapters use a documented synthetic fixture. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { saves } from '../tests/helpers/clan-ship-trophy-hearing-fixture.mjs';
import { longMemoryAdmission, memory } from '../tests/helpers/long-memory-r2-m055.mjs';

const choice = process.env.LONG_MEMORY_CHOICE ?? 'collective';
assert.ok(memory.MEMORY_TRACKS.includes(choice));
const out = resolve(process.env.LONG_MEMORY_OUTPUT ?? 'outputs/qa-long-memory-r2-m055');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const admitted = longMemoryAdmission();
const key = saves.SAVE_STORAGE_KEY;
const report = { commit, choice, passed: false, visits: [], errors: [], missing: [], captures: [],
  admission: 'Synthetic earlier campaign established through the original workshop, Oseris revisit and succession reducers. Every comparison and handover of R2-M055 is played in the native interface.' };
await mkdir(out, { recursive: true });
let browser, server, page;
try {
  server = await createServer({ configFile: resolve('desktop/vite.config.ts'), server: { host: '127.0.0.1', port: 4220, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
  const browserContext = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  await browserContext.addInitScript(({ key, seed }) => {
    if (!localStorage.getItem('__qaLongMemory')) {
      localStorage.setItem(key, JSON.stringify(seed));
      localStorage.setItem('__qaLongMemory', 'true');
    }
  }, { key, seed: admitted });
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
  const field = panel.locator('[data-r2-m055]');
  const order = id => field.locator('[data-r2-m055-order="' + id + '"]');

  async function memoryAt(room) {
    if (await field.isVisible() && await scene.getAttribute('data-interior-room') !== room) {
      await field.locator('[data-r2-m055-route="' + room + '"]').click();
      await page.waitForFunction(roomId => {
        const node = document.querySelector('[data-clan-interior]');
        return node?.getAttribute('data-interior-room') === roomId && node.getAttribute('data-interior-moving') === 'false' &&
          !node.getAttribute('data-interior-target-room');
      }, room, { timeout: 60000 });
    }
    await visit(room);
    await open('long-memory');
  }

  await memoryAt('archives');
  await durable(order('begin'));
  assert.equal(await order('prepare').count(), 0);
  for (const id of ['teaching', 'hunt', 'collective']) {
    if (id !== 'teaching') await memoryAt(memory.MEMORY_ROOMS[id]);
    await field.locator('[data-r2-m055-comparison="' + id + '"]').waitFor();
    await capture('souvenir-' + id);
    await durable(order('compare-' + id));
    if (id === 'hunt') {
      const midway = (await read()).clanShipOperations.longMemory;
      await page.reload();
      await enter();
      await memoryAt('hangar');
      assert.deepEqual((await read()).clanShipOperations.longMemory, midway);
      assert.equal(await field.getAttribute('data-r2-m055-compared'), '2');
    }
  }
  assert.equal(await field.getAttribute('data-r2-m055-compared'), '3');
  if (choice !== 'collective') await memoryAt(memory.MEMORY_ROOMS[choice]);
  await durable(order('choose-' + choice));
  assert.equal(await order('handover').count(), 0);
  await field.locator('[data-r2-m055-witness]').waitFor();
  await durable(order('prepare'));
  assert.equal(await field.locator('[data-r2-m055-witness]').getAttribute('data-r2-m055-prepared'), 'true');
  await capture('volontaire');
  await durable(order('handover'));
  assert.equal(await field.getAttribute('data-r2-m055-complete'), 'true');
  await panel.locator('[data-clan-operations-tab="journal"]').click();
  await panel.locator('[data-r2-m055-receipt]').waitFor();
  await capture('recu');
  const final = await read();
  assert.equal(final.clanShipOperations.longMemory.longMemorySuccess, true);
  assert.deepEqual(final.missionProgress, admitted.missionProgress);
  assert.equal(final.profile.honor, admitted.profile.honor);
  assert.deepEqual(final.elderAssemblyV168, admitted.elderAssemblyV168);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.missing, []);
  report.receipt = final.clanShipOperations.longMemory;
  report.passed = true;
} finally {
  if (!report.passed && page) await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {});
  await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
}
console.log(JSON.stringify({ passed: report.passed, commit, choice }));
