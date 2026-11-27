import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { homeworldRegionNavigatorV68 } from './homeworld-region-navigation-v68.mjs';
import { HOUSE, regions, saves, trainingYardAdmissionO6, yard } from '../tests/helpers/origin-training-yard-o6.mjs';

const url = 'http://127.0.0.1:4222/';
const out = resolve('outputs/qa-origin-training-yard-o6');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const admitted = trainingYardAdmissionO6();
const report = {
  commit, passed: false, orders: [], errors: [], routes: [],
  admission: 'A Blooded archive enters a residence with rights earned through the normal reducer. Every position and yard interaction is played with native inputs.',
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
  const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saves.SAVE_STORAGE_KEY);
  const marker = root.locator('[data-o6-training-yard]');
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
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100)));
    await ground.resume();
  }


  await page.goto(url);
  await enter();
  assert.equal(await marker.getAttribute('data-o6-yard-stage'), 'support');
  for (const order of yard.TRAINING_YARD_ORDERS_O6) {
    await ground.walkTo(yard.TRAINING_YARD_POSTS_O6[order]);
    await ground.interact();
    const save = await disk();
    assert.equal(save.originV151.trainingYardO6?.houses[HOUSE]?.at(-1), order);
    report.orders.push(order);
    if (order === 'support') await root.locator('[data-o6-yard-support]').waitFor();
    if (order === 'rack') {
      await root.locator('[data-o6-yard-rack]').waitFor();
      await page.screenshot({ path: join(out, 'installed.png'), animations: 'disabled' });
      await page.clock.resume();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await enter();
      assert.equal(await marker.getAttribute('data-o6-yard-stage'), 'aisle');
      await root.locator('[data-o6-yard-rack]').waitFor();
    }
  }
  assert.equal(await marker.getAttribute('data-o6-yard-stage'), 'ready');
  const current = await disk();
  assert.deepEqual(current.originV151.transitions, admitted.originV151.transitions);
  assert.deepEqual(current.residenceV149, admitted.residenceV149);
  assert.deepEqual(current.profile, admitted.profile);
  assert.deepEqual(report.errors, []);
  report.routes = ground.routes;
  await page.screenshot({ path: join(out, 'ready.png'), animations: 'disabled' });
  report.passed = true;
} finally {
  if (!report.passed && page) await page.screenshot({ path: join(out, 'failure.png') }).catch(() => {});
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
}
console.log(JSON.stringify({ passed: report.passed, commit, orders: report.orders }));
