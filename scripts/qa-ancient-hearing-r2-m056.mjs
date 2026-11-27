/** Native proof of R2-M056 preparation using a campaign established by the preceding reducers. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { qa, saves } from '../tests/helpers/clan-ship-trophy-hearing-fixture.mjs';
import { narrativeLongMemoryAdmission } from '../tests/helpers/senior-rite-campaign.mjs';
import { completeLongMemoryAdmission } from '../tests/helpers/long-memory-r2-m055.mjs';

const choice = process.env.ANCIENT_HEARING_AUDIENCE ?? 'local';
assert.ok(['local', 'intimate'].includes(choice));
const out = resolve(process.env.ANCIENT_HEARING_OUTPUT ?? 'outputs/qa-ancient-hearing-r2-m056');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const fullRite = process.env.ANCIENT_HEARING_RITE === '1';
const model = qa.load('app/game/systems/ancientHearingR2M056.ts');
const chronicle = qa.load('app/game/systems/clanChronicle.ts');
const admitted = fullRite ? narrativeLongMemoryAdmission() : completeLongMemoryAdmission();
const key = saves.SAVE_STORAGE_KEY;
const report = { commit, choice, fullRite, passed: false, visits: [], errors: [], missing: [], captures: [],
  admission: 'Earlier chapters including M055 are established through their reducers. The narrative fixture supplies career honor and receives Elder from the new assembly action. Native input plays M056.' };
await mkdir(out, { recursive: true });
let browser, server, page;
try {
  server = await createServer({ configFile: resolve('desktop/vite.config.ts'), server: { host: '127.0.0.1', port: 4221, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
  const browserContext = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  await browserContext.addInitScript(({ key, seed }) => {
    if (!localStorage.getItem('__qaAncientHearing')) {
      localStorage.setItem(key, JSON.stringify(seed));
      localStorage.setItem('__qaAncientHearing', 'true');
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
  await page.goto('http://127.0.0.1:4221');
  await enter();
  const field = panel.locator('[data-r2-m056]');
  const order = id => field.locator('[data-r2-m056-order="' + id + '"]');
  async function hearingAt(room) {
    await visit(room);
    await open('ancient-hearing');
  }

  await hearingAt('archives');
  await durable(order('open-register'));
  assert.equal(await order('choose-' + choice).count(), 0);
  await durable(order('read-teaching'));
  await hearingAt('hangar');
  await durable(order('read-hunt'));
  const collected = (await read()).clanShipOperations.ancientHearing;
  await page.reload();
  await enter();
  await hearingAt('hangar');
  assert.deepEqual((await read()).clanShipOperations.ancientHearing, collected);
  assert.equal(await field.getAttribute('data-r2-m056-count'), '2');
  await hearingAt('armurerie');
  await durable(order(choice === 'local' ? 'hear-armorer' : 'read-workshop'));
  assert.equal(await field.getAttribute('data-r2-m056-count'), '3');
  if (choice === 'local') await field.locator('[data-r2-m056-armorer]').waitFor();
  await capture('actes');
  await hearingAt('archives');
  await durable(order('choose-' + choice));
  const meetingRoom = choice === 'local' ? 'conseil' : 'archives';
  if (meetingRoom !== 'archives') {
    assert.equal(await order('reserve-post').count(), 0);
    await hearingAt(meetingRoom);
  }
  await durable(order('reserve-post'));
  assert.equal(await field.getAttribute('data-r2-m056-prepared'), 'true');
  await panel.locator('[data-clan-operations-tab="journal"]').click();
  await panel.locator('[data-r2-m056-receipt]').waitFor();
  await capture('registre');
  await page.reload();
  await enter();
  await hearingAt(meetingRoom);
  assert.equal(await field.getAttribute('data-r2-m056-prepared'), 'true');
  assert.equal(await field.getAttribute('data-r2-m056-audience'), choice);
  if (fullRite) {
    const stations = [...model.ANCIENT_DEBT_POSTS, ...model.ANCIENT_SERVICE_POSTS];
    for (const post of stations) {
      await hearingAt(post.room);
      await durable(order(post.order));
      if (post.order === 'deliver-aid') await capture('dette-reglee');
      if (post.order === 'second-relief') {
        await page.reload();
        await enter();
        await hearingAt(post.room);
        assert.equal(await field.getAttribute('data-r2-m056-years'), '225');
      }
    }
    assert.equal(await field.getAttribute('data-r2-m056-years'), '325');
    assert.equal(chronicle.getChronicleRank((await read()).prologue.chronicle), 'elder');
    await hearingAt(meetingRoom);
    await durable(order('recognize'));
    await capture('reconnaissance');
    await page.reload();
    await enter();
    await hearingAt(meetingRoom);
    assert.equal(await field.getAttribute('data-r2-m056-recognized'), 'true');
  }
  const final = await read();
  assert.deepEqual(final.clanShipOperations.longMemory, admitted.clanShipOperations.longMemory);
  assert.deepEqual(final.missionProgress, admitted.missionProgress);
  if (fullRite) {
    assert.equal(chronicle.getChronicleRank(final.prologue.chronicle), 'ancient');
    assert.ok(saves.parseSaveImport(saves.exportSave(final)).save);
  } else {
    assert.deepEqual(final.profile, admitted.profile);
    assert.deepEqual(final.prologue, admitted.prologue);
  }
  assert.deepEqual(final.originV151, admitted.originV151);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.missing, []);
  report.receipt = final.clanShipOperations.ancientHearing;
  report.passed = true;
} finally {
  if (!report.passed && page) await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {});
  await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
}
console.log(JSON.stringify({ passed: report.passed, commit, choice }));
