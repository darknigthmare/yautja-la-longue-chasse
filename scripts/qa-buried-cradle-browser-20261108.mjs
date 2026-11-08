/** Real browser smoke for the production component, using isolated /dev saves.
 * It never writes a campaign or grants progress. A missing image is a failure. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
const output = process.env.YAUTJA_CRADLE_QA_OUTPUT ?? '/tmp/yautja-cradle-browser';
const baseUrl = process.env.YAUTJA_CRADLE_QA_URL ?? 'http://127.0.0.1:3108';
await fs.mkdir(output, { recursive: true });
let server, browser;
let serverLog = '';
const report = { date: '2026-11-08', baseUrl, passed: false, errors: [], missing: [], checks: [],
  scope: 'Isolated dev entry uses the actual production scene; no campaign playthrough or human art validation.' };
try {
  if (!process.env.YAUTJA_CRADLE_QA_URL) {
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3108'],
      { env: { ...process.env, YAUTJA_NEXT_DIST_DIR: '.next-dev-cradle-qa', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { serverLog += chunk; });
    for (let i = 0; ; i++) {
      if (serverLog.includes('Ready in')) break;
      if (i >= 120 || server.exitCode !== null) throw new Error('Local test server did not start: ' + serverLog.slice(-3000));
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/usr/bin/chromium',
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.missing.push({ status: response.status(), url: response.url() }); });
  await page.goto(`${baseUrl}/dev?lieu=cradle-entry`, { waitUntil: 'networkidle', timeout: 120000 });
  const scene = page.locator('[data-buried-cradle]');
  await scene.waitFor({ timeout: 120000 });
  assert.equal(await scene.getAttribute('data-room'), '01');
  await page.screenshot({ path: path.join(output, 'entry.png'), fullPage: true });
  assert.equal(await page.getByText('Ressource indisponible', { exact: true }).count(), 0);
  const xBefore = Number(await scene.getAttribute('data-player-x'));
  await page.keyboard.down('KeyD'); await page.waitForTimeout(350); await page.keyboard.up('KeyD');
  assert(Number(await scene.getAttribute('data-player-x')) > xBefore + 25, 'ordinary movement advances the real player');
  report.checks.push('Entry and ordinary keyboard movement');
  await scene.getByRole('button', { name: 'Pause', exact: true }).click();
  const clock = Number(await scene.getAttribute('data-clock'));
  await page.waitForTimeout(250);
  assert(Math.abs(Number(await scene.getAttribute('data-clock')) - clock) <= 0.06);
  await scene.getByRole('button', { name: 'Reprendre la chasse', exact: true }).click();
  report.checks.push('Pause freezes the simulation and resumes');
  for (const [entry, room] of [['cradle-descent', '07'], ['cradle-basin', '11']]) {
    await page.goto(`${baseUrl}/dev?lieu=${entry}`, { waitUntil: 'networkidle', timeout: 120000 });
    await scene.waitFor(); assert.equal(await scene.getAttribute('data-room'), room);
    assert.equal(await page.getByText('Ressource indisponible', { exact: true }).count(), 0);
    await page.screenshot({ path: path.join(output, `${entry}.png`), fullPage: true });
    report.checks.push(`Production scene loads checkpoint ${room}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
  assert(await scene.locator('[data-cradle-control="interact"]').isVisible());
  report.checks.push('Mobile controls remain visible');
  assert.deepEqual(report.errors, []); assert.deepEqual(report.missing, []);
  report.passed = true;
} catch (error) {
  report.failure = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
  await fs.writeFile(path.join(output, 'browser-verification.json'), JSON.stringify(report, null, 2) + '\n');
  if (server) await fs.writeFile(path.join(output, 'server.log'), serverLog);
  console.log(JSON.stringify(report));
}
