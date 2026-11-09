/** Supplement: replay the actual checkpoint earned by native-attempt-2.
 * No completed ledger is synthesized and no game callback is invoked. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const base = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(base, '../../../..');
const out = path.join(base, 'native-replay-completed'), url = process.env.TROPHY_CAMPAIGN_QA_URL ?? 'http://127.0.0.1:3152';
await fs.mkdir(out, { recursive: true }); await fs.writeFile(path.join(out, 'run.lock'), new Date().toISOString(), { flag: 'wx' });
const sha = data => createHash('sha256').update(data).digest('hex');
const inputPath = path.join(base, 'native-attempt-2/10-completed.json'), inputBytes = await fs.readFile(inputPath), input = JSON.parse(inputBytes);
assert.equal(sha(inputBytes), '464fe01a3a7c74831e675302e14ea292a1ea529bd33d7ecd193df7ddf8bb35c5');
assert.equal(input.save.trophyTutorialV6.completedSteps, 18);
const buildId = (await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim();
const report = { scope: 'Actual earned final checkpoint restored unchanged to an isolated fresh browser origin, then native Continue/service/tutorial and keyboard walk. Separate from the first full18-gesture journey.',
  buildId, input: { path: path.relative(root, inputPath), bytes: inputBytes.length, sha256: sha(inputBytes) }, checks: [], errors: [], scripts: [] };
const check = (name, condition, detail) => { report.checks.push({ name, passed: Boolean(condition), detail }); assert.ok(condition, name); };
let browser, page; const pending = [];
try {
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  await context.addInitScript(storage => { if (localStorage.getItem('yautja-long-hunt.save') === null) for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value); }, input.storage);
  page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('response', response => {
    const pathname = new URL(response.url()).pathname;
    if (response.status() >= 400) report.errors.push(response.status() + ' ' + pathname);
    if (response.request().resourceType() === 'script' && pathname.startsWith('/_next/static/')) pending.push((async () => {
      const served = await response.body(), name = '.next/' + pathname.slice('/_next/'.length), compiled = await fs.readFile(path.join(root, name));
      report.scripts.push({ path: name, sha256: sha(served), compiledSha256: sha(compiled), matched: sha(served) === sha(compiled) });
    })().catch(error => report.errors.push(error.message)));
  });
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 }); assert.ok((await response.text()).includes(buildId));
  if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
  await page.locator('[data-menu-action="continue"]').click();
  await page.locator('[data-homeworld-hub][data-homeworld-interior-id="trophy-mausoleum"][data-homeworld-motion-ready="true"]').waitFor({ timeout: 120000 });
  await page.bringToFront(); await page.locator('[data-homeworld-viewport]').focus(); await page.keyboard.press('KeyE');
  await page.getByRole('button', { name: 'Accéder au service', exact: true }).click();
  await page.locator('[data-trophy-tutorial-open]').click();
  const scene = page.locator('[data-trophy-tutorial-v6]'); await scene.waitFor();
  check('Real Continue and physical service reopen the actual earned18 checkpoint', await scene.getAttribute('data-trophy-tutorial-step') === '18');
  const model = page.locator('[data-trophy-teaching-model]').first(), beforeBox = await model.boundingBox();
  const beforeX = Number(await scene.getAttribute('data-trophy-tutorial-x'));
  await page.locator('[data-trophy-tutorial-viewport]').focus(); await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 12; i++) await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  await page.keyboard.up('ArrowRight');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const afterX = Number(await scene.getAttribute('data-trophy-tutorial-x')), afterBox = await model.boundingBox();
  check('After native walking away, the displayed object stays fixed at the cabinet', afterX > beforeX + 35 && Math.abs(afterBox.x - beforeBox.x) < 1 && Math.abs(afterBox.y - beforeBox.y) < 1, { beforeX, afterX, beforeBox, afterBox });
  const raw = await page.evaluate(() => localStorage.getItem('yautja-long-hunt.save'));
  check('Movement after completion does not rewrite or duplicate the durable model', JSON.stringify(JSON.parse(raw).trophyTutorialV6) === JSON.stringify(input.save.trophyTutorialV6));
  await fs.writeFile(path.join(out, 'save-after-walking.json'), raw + '\n');
  const bytes = await page.screenshot({ path: path.join(out, 'exposed-model-with-clear-cabinet.png'), fullPage: true });
  report.screenshot = { path: path.relative(root, path.join(out, 'exposed-model-with-clear-cabinet.png')), bytes: bytes.length, sha256: sha(bytes) };
  report.passed = true;
} catch (error) { report.passed = false; report.failure = error.stack ?? String(error); if (page) await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => undefined); }
finally {
  await Promise.allSettled(pending);
  report.buildIdAfter = (await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim();
  report.passed = report.passed === true && report.errors.length === 0 && report.buildIdAfter === buildId && report.scripts.length > 0 && report.scripts.every(row => row.matched);
  report.browserVersion = browser?.version(); report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await fs.copyFile(fileURLToPath(import.meta.url), path.join(out, 'recipe-used.mjs'));
  await browser?.close();
}
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, out, failure: report.failure })); if (!report.passed) process.exitCode = 1;
