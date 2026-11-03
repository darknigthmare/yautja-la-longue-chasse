import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const target = new URL(process.env.V43_QA_URL ?? 'http://127.0.0.1:4174');
assert(['http:', 'https:'].includes(target.protocol) && !target.username && !target.password);
const output = path.resolve(process.env.V43_USER_SPRITE_QA_OUTPUT ?? 'work/v43/user-sprite-gallery-qa');
await fs.mkdir(output, { recursive: true });
const intake = JSON.parse(await fs.readFile('docs/v43-user-sprite-intake.json', 'utf8'));
const report = { passed: false, checkedAt: new Date().toISOString(), url: target.href, entries: [], errors: [], failedResponses: [],
  limits: ['Gallery only; no animated clips or runtime fighters added; exact canon fidelity not certified.'] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let page;
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.failedResponses.push({ url: response.url(), status: response.status() }); });
  await page.goto(new URL('/game/assets/v34/production-review/index.html', target).href, { waitUntil: 'networkidle' });
  await page.locator('#category').selectOption('reference');
  assert.equal(await page.locator('#asset option').count(), 8);
  for (const asset of intake.assets) {
    await page.locator('#asset').selectOption(asset.galleryId);
    await page.waitForFunction(id => {
      const canvas = document.getElementById('canvas');
      return canvas?.dataset.assetId === id && canvas.dataset.loaded === 'true';
    }, asset.galleryId);
    assert.equal(await page.locator('#error').innerText(), '');
    assert.equal(await page.locator('#digest').innerText(), 'SHA-256 ' + asset.sha256);
    assert.equal(await page.locator('#source').getAttribute('href'), asset.publicPath);
    assert.equal(await page.locator('#view').inputValue(), 'sheet');
    assert.equal(await page.locator('#facing').inputValue(), asset.nativeFacing);
    assert.equal(await page.locator('#frame').innerText(), 'Pose fixe · source intacte');
    assert.equal(await page.locator('#view option[value="frames"]').evaluate(option => option.disabled), true);
    for (const control of ['#play', '#prev', '#next', '#facing']) assert.equal(await page.locator(control).isDisabled(), true);
    assert.match(await page.locator('#notes').innerText(), /Référence utilisateur.*pose statique/s);
    await page.locator('#background').selectOption('light');
    await page.screenshot({ path: path.join(output, asset.galleryId + '.png'), fullPage: true });
    report.entries.push({ id: asset.galleryId, sha256: asset.sha256, loaded: true, staticControlsDisabled: true, sourceUnchanged: true });
  }
  await page.locator('#search').fill('Sinestro');
  assert.equal(await page.locator('#asset option').count(), 1);
  await page.waitForFunction(() => document.getElementById('canvas')?.dataset.loaded === 'true');
  assert.match(await page.locator('#notes').innerText(), /Orientation native : gauche/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(output, 'references-mobile-390.png'), fullPage: true });
  assert.deepEqual(report.errors, []); assert.deepEqual(report.failedResponses, []);
  report.mobileNoOverflow = true; report.passed = true;
} catch (error) {
  report.error = String(error); report.errorStack = error?.stack; process.exitCode = 1;
  await page?.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
} finally {
  await fs.writeFile(path.join(output, 'browser-qa.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report)); await browser.close();
}
