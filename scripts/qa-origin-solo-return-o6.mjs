import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { homeworldRegionNavigatorV68 } from './homeworld-region-navigation-v68.mjs';
import { returnRules, regions, saves, soloReturnAdmissionO6 } from '../tests/helpers/origin-solo-return-o6.mjs';

const url = 'http://127.0.0.1:4222/';
const out = resolve('outputs/qa-origin-solo-return-o6');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const admitted = soloReturnAdmissionO6();
const report = {
  commit, passed: false, orders: [], errors: [], routes: [],
  admission: 'The fixture includes the replayed solo hunt, the living triad return and the Elite rite. The player enters the shared hall and takes each post in the native scene.',
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
  const marker = root.locator('[data-o6-solo-return]');
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
  assert.equal(await root.getAttribute('data-zone'), 'village');
  await ground.interact();
  await root.locator('[data-o6-return-post="quiet"]').waitFor();
  assert.equal(await root.getAttribute('data-interior-building'), 'hall');

  for (const order of ['quiet', 'rinse-blades', 'pack-kit', 'limit']) {
    await ground.walkTo(returnRules.SOLO_RETURN_POSTS_O6[order]);
    await ground.interact();
    const saved = await disk();
    assert.equal(saved.originV151.soloReturnO6.orders.at(-1), order);
    assert.deepEqual(saved.originV151.ending, admitted.originV151.ending);
    assert.deepEqual(saved.originV151.consumed, admitted.originV151.consumed);
    assert.deepEqual(saved.inventory, admitted.inventory);
    report.orders.push(order);
    if (order === 'rinse-blades') {
      await root.locator('[data-o6-return-blades="clean"]').waitFor();
      await page.screenshot({ path: join(out, 'clean-blades.png'), animations: 'disabled' });
    }
    if (order === 'pack-kit') {
      await root.locator('[data-o6-return-kit]').waitFor();
      await root.locator('[data-o6-return-saar]').waitFor();
      await root.locator('[data-o6-return-post="victory"]').waitFor();
      await root.locator('[data-o6-return-post="limit"]').waitFor();
      await page.screenshot({ path: join(out, 'saar-and-account.png'), animations: 'disabled' });
      await page.clock.resume();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await enter();
      await root.locator('[data-o6-return-saar]').waitFor();
      await root.locator('[data-o6-return-post="limit"]').waitFor();
    }
  }
  assert.equal(await marker.getAttribute('data-o6-solo-return'), 'limit');
  assert.match(await marker.innerText(), /Saar/);
  assert.deepEqual(report.errors, []);
  await page.screenshot({ path: join(out, 'limited-motion-account.png'), animations: 'disabled' });
  report.passed = true;
} finally {
  if (!report.passed && page) await page.screenshot({ path: join(out, 'failure.png') }).catch(() => {});
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
}
console.log(JSON.stringify({ passed: report.passed, commit, orders: report.orders }));
