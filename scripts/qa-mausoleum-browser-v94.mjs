/** Actual React/domain integration on a private Vite server. Artwork is NOT qualified:
 * /game images are transparent fixtures, no account or production save is used. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../', import.meta.url));
const scratch = path.join(root, 'work-local');
await fs.mkdir(scratch, { recursive: true });
const directory = await fs.mkdtemp(path.join(scratch, 'mausoleum-browser-v94-'));
const route = '/' + path.relative(root, directory).split(path.sep).join('/') + '/';
await fs.writeFile(path.join(directory, 'index.html'), '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mausoleum integration fixture</title><body style="margin:0"><div id="root"></div><script type="module" src="/tests/browser/mausoleum-v94.fixture.tsx"></script></body></html>');
let server, browser;
const results = [], pageErrors = [];
try {
  server = await createServer({ root, configFile: false, plugins: [react()],
    server: { host: '127.0.0.1', port: 0 },
    optimizeDeps: { include: ['react', 'react-dom/client'] } });
  await server.listen();
  const port = server.httpServer.address().port, origin = `http://127.0.0.1:${port}`;
  browser = await chromium.launch(process.env.AUDIT_CHROME_CHANNEL ? { channel: process.env.AUDIT_CHROME_CHANNEL } : {});
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: true });
  // Decodeable stand-in pixels only: no fetching the many gigabytes of original art.
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  await context.route('**/*', async intercepted => {
    const url = new URL(intercepted.request().url());
    if (url.origin !== origin) return intercepted.abort('blockedbyclient');
    if (url.pathname.startsWith('/game/')) return intercepted.fulfill({ status: 200, contentType: 'image/png', body: pixel });
    return intercepted.continue();
  });
  await context.addInitScript(() => {
    window.__auditPadV94 = { index: 0, id: 'audit-emulated-pad', connected: true, axes: [0, 0],
      buttons: Array.from({length: 16}, () => ({pressed: false, value: 0, touched: false})) };
    Object.defineProperty(navigator, 'getGamepads', {value: () => [window.__auditPadV94], configurable: true});
  });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  page.setDefaultTimeout(10_000);
  await page.goto(origin + route);
  await page.waitForFunction(() => window.__mausoleumAuditV94 && document.querySelector('[data-mausoleum]'), null, { timeout: 60_000 });
  const scene = page.locator('[data-mausoleum-x]');
  const x = async () => Number(await scene.getAttribute('data-mausoleum-x'));
  const phase = async () => page.locator('[data-mausoleum]').getAttribute('data-mausoleum-phase');
  const waitPhase = async expected => page.waitForFunction(value => document.querySelector('[data-mausoleum]')?.getAttribute('data-mausoleum-phase') === value, expected);
  const events = async () => page.evaluate(() => window.__mausoleumAuditV94.events);
  async function reset(preview = false) {
    await page.evaluate(() => { window.__auditPadV94.axes = [0, 0]; window.__auditPadV94.buttons.forEach(button => {button.pressed = false;}); });
    for (const key of ['e', 'q', 'ArrowRight', 'z', 'p', 'Escape']) await page.keyboard.up(key);
    await page.evaluate(value => window.__mausoleumAuditV94.reset(value), preview);
    await waitPhase('visit'); await page.waitForFunction(() => document.querySelector('[data-mausoleum-x]')?.getAttribute('data-mausoleum-x') === '90');
    await scene.focus();
  }
  async function approach(id = 'prey', position = 180) {
    await page.locator(`[data-mausoleum-pedestal="${id}"]`).click();
    await page.waitForFunction(value => Number(document.querySelector('[data-mausoleum-x]')?.getAttribute('data-mausoleum-x')) === value, position);
  }
  async function examine() { await approach(); await scene.focus(); await page.keyboard.press('f'); await page.getByRole('dialog').waitFor(); }
  async function startRitual() { await examine(); await page.getByRole('button', { name: 'Revêtir une reproduction d’étude' }).click(); await waitPhase('take'); }
  async function check(name, body) {
    try { await reset(); await body(); results.push({ name, status: 'PASS' }); console.log('PASS ' + name); }
    catch (error) { results.push({ name, status: 'FAIL', error: error.message }); console.error('FAIL ' + name + ': ' + error.message); }
  }
  await check('remapped E moves without examining; F examines', async () => {
    await page.keyboard.down('e'); await page.waitForTimeout(180); await page.keyboard.up('e');
    assert.ok(await x() > 115); assert.equal(await page.getByRole('dialog').count(), 0);
    await scene.focus(); await page.keyboard.press('f'); await page.getByRole('dialog').waitFor();
  });
  await check('last direction wins, releasing it resumes the held direction', async () => {
    await approach('predator', 450); await page.keyboard.down('e'); await page.waitForTimeout(160);
    const right = await x(); await page.keyboard.down('q'); await page.waitForTimeout(180);
    const left = await x(); assert.ok(left < right);
    await page.keyboard.up('q'); await page.waitForTimeout(180); assert.ok(await x() > left); await page.keyboard.up('e');
  });
  await check('aliases and unrelated key releases preserve movement', async () => {
    await page.keyboard.down('e'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(120);
    const before = await x(); await page.keyboard.up('ArrowRight'); await page.keyboard.press('z'); await page.waitForTimeout(170);
    assert.ok(await x() > before); await page.keyboard.up('e'); const stopped = await x(); await page.waitForTimeout(100); assert.equal(await x(), stopped);
  });
  await check('native Enter on a focused pedestal keeps its click action', async () => {
    await page.locator('[data-mausoleum-pedestal="predator"]').focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('[data-mausoleum-x]')?.getAttribute('data-mausoleum-x') === '450');
    assert.equal(await page.getByRole('dialog').count(), 0);
  });
  await check('remapped pause exits once while Escape is not forced', async () => {
    await page.keyboard.press('Escape'); assert.equal((await events()).filter(e => e.kind === 'exit').length, 0);
    await page.keyboard.press('p'); assert.equal((await events()).filter(e => e.kind === 'exit').length, 1);
  });
  await check('ritual reaches archive, saves consultation once and returns', async () => {
    await startRitual(); await waitPhase('archive'); await page.getByRole('button', { name: 'Retirer le masque et revenir' }).click(); await waitPhase('visit');
    const log = await events(); assert.equal(log.filter(e => e.kind === 'write' && e.value.consultedIds.includes('prey')).length, 1);
    for (const sound of ['mask-on', 'scan', 'mask-off']) assert.equal(log.filter(e => e.kind === 'sound' && e.value === sound).length, 1);
    assert.equal(await x(), 180);
  });
  await check('parent suspension freezes the ritual without consuming its remaining time', async () => {
    await startRitual(); await page.waitForTimeout(100); await page.evaluate(() => window.__mausoleumAuditV94.suspend(true));
    await page.waitForTimeout(900); assert.equal(await phase(), 'take');
    await page.evaluate(() => window.__mausoleumAuditV94.suspend(false)); await page.waitForTimeout(100); assert.equal(await phase(), 'take');
    await waitPhase('archive');
  });
  await check('mask CSS animation pauses with the ritual and continues from the same frame', async () => {
    await startRitual();
    await page.evaluate(() => window.__mausoleumAuditV94.suspend(true));
    const image = page.locator('[data-ritual-pose="take"] img');
    await page.waitForFunction(() => {
      const animation = document.querySelector('[data-ritual-pose="take"] img')?.getAnimations()[0];
      return animation?.playState === 'paused' && !animation.pending;
    });
    const before = await image.evaluate(element => Number(element.getAnimations()[0].currentTime));
    await page.waitForTimeout(800);
    const after = await image.evaluate(element => Number(element.getAnimations()[0].currentTime));
    assert.ok(Math.abs(after - before) < 1, `animation advanced during pause: ${before} -> ${after}`);
    assert.equal(await phase(), 'take');
    await page.evaluate(() => window.__mausoleumAuditV94.suspend(false));
    await page.waitForFunction(() => document.querySelector('[data-ritual-pose="take"] img')?.getAnimations()[0]?.playState === 'running');
    await waitPhase('archive');
  });
  await check('parent rerenders do not duplicate ritual sounds or stall it', async () => {
    await startRitual();
    for (let i = 0; i < 18; i++) { await page.evaluate(() => window.__mausoleumAuditV94.rerender()); await page.waitForTimeout(100); }
    await waitPhase('archive'); assert.equal((await events()).filter(e => e.kind === 'sound' && e.value === 'mask-on').length, 1);
  });
  await check('refused persistence leaves a retryable archive without awarding the visit', async () => {
    await startRitual(); await waitPhase('archive'); await page.evaluate(() => { window.__mausoleumAuditV94.failWrites = true; });
    await page.getByRole('button', { name: 'Retirer le masque et revenir' }).click();
    await page.getByText('Consultation non enregistrée', { exact: false }).waitFor(); await waitPhase('archive');
    assert.equal((await events()).filter(e => e.kind === 'write' && e.value.consultedIds.includes('prey')).length, 0);
    await page.evaluate(() => { window.__mausoleumAuditV94.failWrites = false; });
    await page.getByRole('button', { name: 'Retirer le masque et revenir' }).click(); await waitPhase('visit');
    assert.equal((await events()).filter(e => e.kind === 'write' && e.value.consultedIds.includes('prey')).length, 1);
  });
  await check('preview never writes a campaign or unlocks an uninstalled DLC', async () => {
    await reset(true); await approach(); await page.keyboard.press('Enter'); await page.getByRole('dialog').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Revêtir une reproduction d’étude' }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Lancer la chronique · non installée' }).isDisabled(), true);
    assert.equal((await events()).filter(e => e.kind === 'write').length, 0);
  });
  await check('missing mask remains unavailable rather than substituting another', async () => {
    await page.getByRole('button', { name: 'Alcôves →' }).click(); await approach('jim-hopper', 180);
    await page.keyboard.press('f'); await page.getByRole('dialog').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Revêtir une reproduction d’étude' }).isDisabled(), true);
  });
  await check('unmount during ritual cannot deliver a late consultation', async () => {
    await startRitual(); await page.evaluate(() => window.__mausoleumAuditV94.reset()); await page.waitForTimeout(1400);
    assert.equal(await phase(), 'visit'); assert.equal((await events()).length, 0);
  });
  await check('emulated gamepad repeat survives ordinary parent callback changes', async () => {
    await page.waitForTimeout(80);
    await page.evaluate(() => { window.__auditPadV94.axes[1] = 1; }); await page.waitForTimeout(100);
    const focused = new Set();
    for (let i = 0; i < 6; i++) {
      focused.add(await page.evaluate(() => document.activeElement?.outerHTML));
      await page.evaluate(() => window.__mausoleumAuditV94.rerender()); await page.waitForTimeout(100);
    }
    assert.ok(focused.size > 1, 'Held navigation stalled when only the callback identity changed');
  });
  await check('emulated gamepad Back uses the current menu callback without a held replay', async () => {
    await page.waitForTimeout(80); await page.evaluate(() => { window.__auditPadV94.buttons[1].pressed = true; });
    await page.waitForTimeout(100); await page.evaluate(() => window.__mausoleumAuditV94.rerender()); await page.waitForTimeout(100);
    assert.equal((await events()).filter(e => e.kind === 'exit').length, 1);
  });
  await check('narrow touch viewport still permits approach, examine and close', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.locator('[data-mausoleum-pedestal="prey"]').tap();
    await page.waitForFunction(() => document.querySelector('[data-mausoleum-x]')?.getAttribute('data-mausoleum-x') === '180');
    await page.getByRole('button', { name: 'F · Examiner Prey', exact: false }).tap();
    await page.getByRole('dialog').waitFor(); await page.getByRole('button', { name: 'Reposer / fermer' }).tap(); await waitPhase('visit');
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  results.push({ name: 'No uncaught React/browser errors', status: pageErrors.length ? 'FAIL' : 'PASS', errors: pageErrors });
  const report = { scope: 'Actual Mausoleum React component and game domain; placeholder images; no full-game or visual-art qualification', browser: browser.version(), results };
  const destination = path.join(root, 'outputs', 'qa-audit-v94'); await fs.mkdir(destination, { recursive: true });
  await fs.writeFile(path.join(destination, 'mausoleum-browser.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (results.some(result => result.status !== 'PASS')) process.exitCode = 1;
} finally {
  await browser?.close(); await server?.close(); await fs.rm(directory, { recursive: true, force: true });
}
