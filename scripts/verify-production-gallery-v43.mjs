import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { enterCampaignDeck } from './campaign-browser-helpers.mjs';

const target = new URL(process.env.V43_QA_URL ?? 'http://127.0.0.1:4174');
assert(['http:', 'https:'].includes(target.protocol) && !target.username && !target.password);
const output = path.resolve(process.env.V43_GALLERY_QA_OUTPUT ?? 'work/v43/production-gallery-qa');
await fs.mkdir(output, { recursive: true });
const expected = JSON.parse(await fs.readFile('public/game/assets/v34/production-review/manifest.json', 'utf8'));
const selected = expected.entries.filter(entry => entry.src.startsWith('/game/sprites/v43/'));
const games = JSON.parse(await fs.readFile('docs/v43-game-arena-first-batch.json', 'utf8')).arenas;
for (const game of games) assert(selected.some(entry => entry.src === game.generation.publicPath), game.id);
const report = { passed: false, url: target.href, checkedAt: new Date().toISOString(),
  fixture: 'isolated legacy campaign migrated through real menu', entries: [], errors: [], failedResponses: [],
  limits: ['Only source-gallery viewing is certified, not stage collision, full animation or exact canon fidelity.'] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let page, gallery;
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: false });
  const observe = current => {
    current.on('pageerror', error => report.errors.push(error.message));
    current.on('response', response => { if (response.status() >= 400) report.failedResponses.push({ url: response.url(), status: response.status() }); });
  };
  context.on('page', observe);
  page = await context.newPage();
  await enterCampaignDeck(page, { url: target.href });
  await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  const labPromise = context.waitForEvent('page');
  await page.getByRole('link', { name: /Atelier d’animation/ }).click();
  const lab = await labPromise; await lab.waitForLoadState('domcontentloaded');
  await lab.getByRole('link', { name: /Atelier OpenAI/ }).click();
  gallery = lab; await gallery.waitForURL('**/production-review/index.html');
  const fetched = await gallery.request.get(new URL('/game/assets/v34/production-review/manifest.json', target).href);
  assert.equal(fetched.status(), 200); const manifest = await fetched.json();
  assert.deepEqual(manifest, expected, 'Server must expose the current gallery manifest');
  const ready = entry => gallery.waitForFunction(id => {
    const node = document.getElementById('canvas'); return node?.dataset.assetId === id && node.dataset.loaded === 'true';
  }, entry.id);
  for (const entry of selected) {
    await gallery.locator('#asset').selectOption(entry.id); await ready(entry);
    assert.equal(await gallery.locator('#error').innerText(), '');
    assert.equal(await gallery.locator('#digest').innerText(), 'SHA-256 ' + entry.sha256);
    assert.equal(await gallery.locator('#source').getAttribute('href'), entry.src);
    if (entry.src.endsWith('/p0-depth.png')) {
      assert.equal(await gallery.locator('#play').isDisabled(), true);
      assert.equal(await gallery.locator('#view').inputValue(), 'sheet');
    }
    report.entries.push({ id: entry.id, src: entry.src, sha256: entry.sha256, loadedAndVerified: true });
  }
  for (const work of ['Classic 2000', 'Freya', 'Excavation']) {
    await gallery.locator('#search').fill(work); assert(await gallery.locator('#asset option').count() > 0, work);
    await gallery.locator('#canvas[data-loaded="true"]').waitFor();
  }
  await gallery.locator('#search').fill('');
  const sample = selected.find(entry => entry.src.includes('arena-136-') && entry.src.endsWith('/p0-depth.png'));
  await gallery.locator('#asset').selectOption(sample.id); await ready(sample);
  assert.match(await gallery.locator('#notes').innerText(), /1:1 non certifiée/);
  await gallery.screenshot({ path: path.join(output, 'gallery-desktop-1280.png'), fullPage: true });
  await gallery.setViewportSize({ width: 390, height: 844 });
  assert(await gallery.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile overflow');
  await gallery.screenshot({ path: path.join(output, 'gallery-mobile-390.png'), fullPage: true });
  assert.deepEqual(report.errors, []); assert.deepEqual(report.failedResponses, []);
  report.passed = true; report.entryRoute = 'Continuer → pont → THE PIT → laboratoire → atelier';
  report.mobileNoOverflow = true;
} catch (error) {
  report.error = String(error); process.exitCode = 1;
  await (gallery ?? page)?.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
} finally {
  await fs.writeFile(path.join(output, 'browser-qa.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report)); await browser.close();
}
