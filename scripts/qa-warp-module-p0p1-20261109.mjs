/** Actual Next /dev session. All navigation and station use are native inputs;
 * an unrelated protected local archive is never an earned campaign fixture. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.WARP_QA_URL || 'http://127.0.0.1:3121';
const out = path.resolve(root, process.env.WARP_QA_OUTPUT || 'outputs/warp-module-p0p1-20261109');
const sha = data => createHash('sha256').update(data).digest('hex');
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'run.lock'), new Date().toISOString(), { flag: 'wx' });
async function tree(dir) {
  const names = [];
  for (const entry of await fs.readdir(path.join(root, dir), { withFileTypes: true })) {
    const file = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) names.push(...await tree(file)); else if (entry.isFile()) names.push(file);
  }
  return names.sort();
}
async function identity() {
  const files = [...await tree('app'), ...await tree('desktop'), 'package.json', 'package-lock.json'];
  const rows = [];
  for (const file of files.sort()) { const data = await fs.readFile(path.join(root, file)); rows.push({ path: file, bytes: data.length, sha256: sha(data) }); }
  return { sha256: sha(JSON.stringify(rows)), files: rows };
}
const report = { startedAt: new Date().toISOString(), url, buildId: (await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim(),
  sourceBefore: await identity(), checks: [], screenshots: [], errors: [], httpErrors: [], servedScripts: [],
  scope: 'Native Next /dev Warp pilot, two authored rooms, keyboard and emulated touch. No campaign transit, rank, reward, real gamepad or canonical visual fidelity claim.' };
const pass = (name, detail) => { report.checks.push({ name, passed: true, detail }); console.log('PASS', name); };
const responses = [];
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium', headless: true });
  report.browserVersion = browser.version();
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: width > 500 ? 1000 : 844 }, hasTouch: true });
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400) report.httpErrors.push({ status: response.status(), url: response.url() });
      const pathname = new URL(response.url()).pathname;
      if (pathname.startsWith('/_next/static/') && pathname.endsWith('.js')) responses.push((async () => {
        const bytes = await response.body(), local = path.join(root, '.next', decodeURIComponent(pathname.slice('/_next/'.length)));
        const expected = await fs.readFile(local); assert.equal(sha(bytes), sha(expected), pathname);
        report.servedScripts.push({ pathname, sha256: sha(bytes) });
      })());
    });
    await page.goto(url + '/dev?lieu=warp-module', { waitUntil: 'networkidle' });
    const bay = page.locator('[data-warp-module-bay]'), view = page.locator('[data-warp-viewport]'); await bay.waitFor();
    await page.evaluate(() => localStorage.setItem('yautja-long-hunt.save', 'existing-archive-protected-by-dev-qa'));
    const archives = () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));
    const before = await archives();
    const state = () => bay.evaluate(e => ({ room: e.dataset.warpRoom, x: +e.dataset.warpActorX, y: +e.dataset.warpActorY, walked: +e.dataset.warpWalked, door: e.dataset.warpDoorOpen, tested: e.dataset.warpBenchTested }));
    const press = async id => {
      const button = page.locator('[data-warp-action="' + id + '"]');
      const prior = await state();
      if (await button.getAttribute('data-warp-ready') !== 'true') {
        await button.click();
        assert.equal((await state()).room, prior.room, 'A remote use only starts walking in the current room');
        await page.waitForFunction(id => document.querySelector('[data-warp-action="' + id + '"]')?.getAttribute('data-warp-ready') === 'true', id);
      }
      await button.click();
    };
    const screen = async name => {
      await bay.scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
      const file = width + '-' + name + '.png'; const data = await page.screenshot({ path: path.join(out, file), fullPage: false });
      report.screenshots.push({ file, sha256: sha(data), viewport: page.viewportSize(), inspected: false });
    };
    assert.equal((await state()).room, 'bay');
    await page.locator('[data-warp-action="cross"]').click();
    await page.waitForTimeout(120); assert.equal((await state()).room, 'bay'); assert.equal((await state()).door, 'false');
    pass(width + ' closed airlock cannot switch rooms from a distant button');
    if (width === 1440) {
      await view.focus(); const start = await state();
      await page.keyboard.down('d'); await page.waitForTimeout(180); await page.keyboard.up('d');
      assert.ok((await state()).x > start.x + 5);
      await page.keyboard.down('a'); await page.waitForTimeout(100); await page.keyboard.press('Escape'); await page.keyboard.up('a');
      const stopped = await state(); await page.waitForTimeout(180); assert.equal((await state()).walked, stopped.walked);
      pass('Desktop keyboard displacement and Escape release real actor controls');
      for (const id of ['console', 'archive', 'archivist']) await press(id);
      await screen('bay-posts');
    }
    await press('door'); assert.equal((await state()).door, 'true');
    const beforeCross = await state(); await press('cross');
    assert.equal((await state()).room, 'synchronization'); assert.ok((await state()).walked > beforeCross.walked);
    assert.equal(await page.locator('[data-warp-hunter]').count(), 1);
    pass(width + ' actual walk to the open threshold reaches the second room with one hunter');
    await press('calibrate');
    if (width !== 1440) {
      assert.equal((await state()).tested, 'false');
      await press('cross'); assert.equal((await state()).room, 'bay');
      await press('console'); await press('archive'); await press('door');
      // The shared door was already open; use the actual current state, never
      // teleport an actor to satisfy the second-room prerequisites.
      if ((await state()).door === 'false') await press('door');
      await press('cross'); await press('calibrate');
    }
    assert.equal((await state()).tested, 'true');
    pass(width + ' calibration requires the console and memory reached in the first room');
    await screen('synchronization');
    await press('cross'); assert.equal((await state()).room, 'bay');
    await press('door'); assert.equal((await state()).door, 'false');
    await press('exit'); await page.locator('[data-dev-catalogue]').waitFor();
    assert.deepEqual(await archives(), before);
    await fs.writeFile(path.join(out, width + '-archives-before-after.json'), JSON.stringify({ before, after: await archives() }, null, 2));
    pass(width + ' return, door closure and physical exit preserve every existing archive byte');
    await page.getByRole('button', { name: 'Entrer : WARP · Baie expérimentale', exact: true }).click();
    await bay.waitFor(); assert.equal((await state()).room, 'bay'); assert.equal((await state()).door, 'false'); assert.equal((await state()).tested, 'false');
    pass(width + ' another temporary session restarts the prototype without campaign progress');
    await context.close();
  }
  await Promise.all(responses);
  report.sourceAfter = await identity(); assert.equal(report.sourceAfter.sha256, report.sourceBefore.sha256);
  assert.equal((await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim(), report.buildId);
  assert.equal(report.errors.length, 0); assert.equal(report.httpErrors.length, 0);
  pass('Exact application sources and served production JavaScript stay identical through the run', { buildId: report.buildId, scripts: report.servedScripts.length });
  report.passed = true;
} catch (error) { report.passed = false; report.failure = error.stack; process.exitCode = 1; console.error(error); }
finally { report.finishedAt = new Date().toISOString(); await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2)); await browser?.close(); }
