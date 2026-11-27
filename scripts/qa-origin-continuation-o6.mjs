import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { homeworldRegionNavigatorV68 } from './homeworld-region-navigation-v68.mjs';
import { HOUSE, continuation, continuationAdmissionO6, practice, regions, saves } from '../tests/helpers/origin-continuation-o6.mjs';

const url = 'http://127.0.0.1:4222/';
const out = resolve('outputs/qa-origin-continuation-o6');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const admitted = continuationAdmissionO6();
const report = {
  commit, passed: false, orders: [], practice: [], errors: [], routes: [],
  admission: 'The fixture combines the played nursery help, authentic Elite rite and earned residence. Every continuation post is reached in the native interface.',
};
await mkdir(out, { recursive: true });
let browser, server, page;
try {
  server = await createServer({ configFile: resolve('desktop/vite.config.ts'), server: { host: '127.0.0.1', port: 4222, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
  const browserContext = await browser.newContext({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' });
  await browserContext.addInitScript(({ seed, key }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(seed));
  }, { seed: admitted, key: saves.SAVE_STORAGE_KEY });
  page = await browserContext.newPage();
  page.setDefaultTimeout(40000);
  page.on('pageerror', error => report.errors.push(error.message));
  await page.clock.install();
  const root = page.locator('[data-homeworld-region-v68]');
  const ground = homeworldRegionNavigatorV68(page, regions);
  report.routes = ground.routes;
  const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saves.SAVE_STORAGE_KEY);
  const marker = root.locator('[data-o6-origin-continuation]');
  async function enter() {
    await page.waitForSelector('[data-campaign-menu], [data-campaign-session]');
    if (await page.locator('[data-campaign-menu]').isVisible()) {
      const campaign = page.locator('[data-menu-section="campaign"]');
      if (await campaign.isVisible()) await campaign.click();
      await page.locator('[data-menu-action="continue"]').click();
      await page.locator('[data-campaign-session]').waitFor();
    }
    const play = page.getByRole('button', { name: 'Jouer', exact: true });
    await root.or(play).first().waitFor();
    if (await play.isVisible()) await play.click();
    await root.waitFor();
    await root.locator('[data-region-player]').waitFor({ state: 'attached' });
    const resume = root.locator('[data-region-resume]');
    const artError = root.getByRole('button', { name: 'Recharger le décor' });
    await resume.or(artError).first().waitFor();
    if (await artError.isVisible()) throw new Error(await root.getByRole('dialog').innerText());
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 8000)));
    await ground.resume();
  }


  await page.goto(url);
  await enter();
  assert.equal(await marker.getAttribute('data-o6-origin-stage'), 'invite');
  assert.equal(await root.locator('[data-o6-yena-visit]').count(), 0);
  for (const order of continuation.continuationOrdersO6(true, true)) {
    await ground.walkTo(continuation.CONTINUATION_POSTS_O6[order]);
    await ground.interact();
    const save = await disk();
    assert.equal(save.originV151.continuationO6?.orders?.at(-1), order);
    assert.equal(save.originV151.continuationO6?.houseId, HOUSE);
    report.orders.push(order);
    if (order === 'invite') await root.locator('[data-o6-yena-visit]').waitFor();
    if (order === 'lift') {
      await root.locator('[data-o6-yena-visit]').waitFor();
      await root.locator('[data-o6-cordage="raised"]').waitFor();
      await page.screenshot({ path: join(out, 'yena-and-net.png'), animations: 'disabled' });
      await page.clock.resume();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await enter();
      assert.equal(await marker.getAttribute('data-o6-origin-stage'), 'stow');
      await root.locator('[data-o6-yena-visit]').waitFor();
    }
    if (order === 'farewell') assert.equal(await root.locator('[data-o6-yena-visit]').count(), 0);
  }
  assert.equal(await marker.getAttribute('data-o6-origin-stage'), 'ready');
  await root.locator('[data-o6-rack-open="true"]').waitFor();
  await root.locator('[data-o6-plan-transmission]').waitFor();
  await root.locator('[data-o6-cordage="folded"]').waitFor();
  const current = await disk();
  assert.deepEqual(current.originV151.ending, admitted.originV151.ending);
  assert.deepEqual(current.originV151.relations, admitted.originV151.relations);
  assert.deepEqual(current.residenceV149, admitted.residenceV149);
  assert.equal(current.originV151.ending.endingRealized, false);
  await page.screenshot({ path: join(out, 'ready.png'), animations: 'disabled' });
  const participant = root.locator('[data-o6-practice-novice]');
  const practiceMarker = root.locator('[data-o6-practice-stage]');
  const staff = root.locator('[data-o6-practice-staff]');
  await participant.waitFor();
  for (const order of Object.keys(practice.PRACTICE_POSTS_O6)) {
    assert.equal(await practiceMarker.getAttribute('data-o6-practice-stage'), order);
    const participantX = () => participant.getAttribute('data-student-x').then(Number);
    const from = order === 'steady-novice' ? await participantX() : null;
    await ground.walkTo(practice.PRACTICE_POSTS_O6[order]);
    if (from !== null) assert.ok(from - await participantX() > 150);
    await ground.interact();
    const snapshot = await disk();
    assert.equal(snapshot.originV151.continuationO6.practice.at(-1), order);
    const closed = order === 'hear-lesson-outcome';
    assert.deepEqual(snapshot.originV151.ending, { ...admitted.originV151.ending, endingRealized: closed });
    assert.deepEqual(snapshot.originV151.consumed, closed
      ? [...admitted.originV151.consumed, practice.O6_FIRST_LESSON_EVENT]
      : admitted.originV151.consumed);
    report.practice.push(order);
    if (order === 'show-footing') {
      await staff.waitFor();
      await page.screenshot({ path: join(out, 'novice-first-stance.png'), animations: 'disabled' });
      await page.clock.resume();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await enter();
      assert.equal(await practiceMarker.getAttribute('data-o6-practice-stage'), 'steady-novice');
      await staff.waitFor();
    }
  }
  assert.equal(await practiceMarker.getAttribute('data-o6-practice-stage'), 'complete');
  assert.equal(await participant.count(), 0);
  assert.equal(await staff.count(), 0);
  assert.deepEqual(report.errors, []);
  await page.screenshot({ path: join(out, 'practice-complete.png'), animations: 'disabled' });
  report.passed = true;
} finally {
  if (!report.passed && page) await page.screenshot({ path: join(out, 'failure.png') }).catch(() => {});
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
}
console.log(JSON.stringify({ passed: report.passed, commit, orders: report.orders, practice: report.practice }));
