import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

// Real GameClient, campaign slots, storage and input loops in an isolated browser.
// No service, scene or save callback is replaced by a test double.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.env.CLAN_SHIP_QA_OUTPUT || 'outputs/qa-clan-ship');
await fs.mkdir(out, { recursive: true });
const bundle = await build({
  stdin: { contents: "export {defaultSave,SAVE_STORAGE_KEY} from './app/game/save.ts';", resolveDir: root },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const { defaultSave, SAVE_STORAGE_KEY } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const seed = defaultSave('2026-11-04T10:00:00.000Z');
seed.profile.hunterName = 'QA Clan Ship';
seed.settings.masterVolume = 0;
const report = { startedAt: new Date().toISOString(), runtime: 'actual desktop GameClient via Vite', checks: [], errors: [], missingAssets: [], screenshots: [] };
const missing = new Set();
let server, browser, page;
try {
  server = await createServer({ configFile: path.join(root, 'desktop/vite.config.ts'), server: { host: '127.0.0.1', port: 4186, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.addInitScript(({ key, save }) => {
    if (!localStorage.getItem('__clanShipQaSeeded')) {
      localStorage.setItem(key, JSON.stringify(save));
      localStorage.setItem('__clanShipQaSeeded', '1');
    }
    window.__clanShipQaPad = { index: 0, id: 'isolated-clan-ship-qa', connected: true, axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__clanShipQaPad] });
  }, { key: SAVE_STORAGE_KEY, save: seed });
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/game/') && (response.status() >= 400 || (response.request().resourceType() === 'image' && response.headers()['content-type']?.includes('text/html')))) missing.add(new URL(response.url()).pathname);
  });
  const check = async (name, run) => {
    try { await run(); report.checks.push({ name, passed: true }); console.log('PASS', name); }
    catch (error) { report.checks.push({ name, passed: false, message: error.message }); throw error; }
  };
  const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_STORAGE_KEY);
  const waitVisit = (status, room = 'hangar') => page.waitForFunction(({ key, status, room }) => {
    const visit = JSON.parse(localStorage.getItem(key))?.clanShipDocking;
    return visit?.status === status && visit.roomId === room;
  }, { key: SAVE_STORAGE_KEY, status, room });
  const clan = () => page.locator('[data-clan-ship-status]');
  const action = type => page.locator(`[data-clan-ship-action="${type}"]`).click();
  const move = async room => { await page.locator(`[data-clan-ship-room-target="${room}"]`).click(); await waitVisit('aboard', room); };
  const continueCampaign = async () => {
    await page.locator('[data-campaign-menu]').waitFor();
    if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.locator('[data-campaign-session]').waitFor({ timeout: 60000 });
  };
  const openClan = async () => {
    await page.getByRole('button', { name: /^Clan Ship AVP ·/ }).click();
    await clan().waitFor();
  };
  const pad = async (button, pressed) => {
    await page.evaluate(({ button, pressed }) => { window.__clanShipQaPad.buttons[button] = { pressed, touched: pressed, value: pressed ? 1 : 0 }; }, { button, pressed });
    await page.waitForTimeout(240);
  };
  const screenshot = async filename => {
    await page.screenshot({ path: path.join(out, filename), fullPage: true });
    report.screenshots.push(filename);
  };
  await check('Legacy campaign migrates through the real main menu to the personal deck', async () => {
    await page.goto('http://127.0.0.1:4186', { waitUntil: 'networkidle', timeout: 120000 });
    await continueCampaign();
    await page.locator('[data-campaign-location="deck"]').waitFor();
  });
  await check('A held gamepad confirmation advances only one docking stage', async () => {
    await openClan();
    await waitVisit('free-flight');
    await page.locator('[data-clan-ship-action="approach"]').focus();
    await pad(0, false); await pad(0, true);
    await waitVisit('approach');
    await page.waitForTimeout(650);
    assert.equal((await stored()).clanShipDocking.status, 'approach');
    await pad(0, false);
    await screenshot('01-approach-desktop.png');
  });
  await check('Dock and board preserve the selected personal hull', async () => {
    await action('dock'); await waitVisit('docked');
    assert.equal(await page.locator('[data-clan-ship-room-target]:not(:disabled)').count(), 0);
    await action('board'); await waitVisit('aboard');
    assert.equal((await stored()).clanShipDocking.personalShipId, 'classic-predator-spaceship');
    await screenshot('02-hangar-desktop.png');
  });
  await check('Seven rooms and six existing services return to their own clan room', async () => {
    const services = { conseil: 'clan-war', armurerie: 'armory', trophees: 'trophies', soins: 'medbay', archives: 'codex', entrainement: 'training' };
    for (const [room, service] of Object.entries(services)) {
      await move(room);
      await page.locator(`[data-clan-ship-service="${service}"]`).click();
      if (service === 'clan-war') {
        await page.locator('[data-clan-war-v85]').waitFor();
        await page.keyboard.press('Escape');
      } else {
        const dialog = page.locator(`[data-station-screen="${service}"]`);
        await dialog.waitFor();
        if (service === 'medbay' || service === 'training') {
          assert.equal(await dialog.getByRole('navigation', { name: 'Salles du vaisseau' }).isVisible(), false);
        }
        await dialog.getByRole('button', { name: '← Retour au Clan Ship · Échap', exact: true }).click();
      }
      await clan().waitFor();
      await waitVisit('aboard', room);
    }
    await move('hangar');
  });
  await check('Settings suspend the clan controller and a manual checkpoint preserves its room', async () => {
    await move('archives');
    await clan().getByRole('button', { name: 'Ouvrir les paramètres', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Réglages du biomask' });
    await settings.waitFor();
    await page.locator('[data-manual-save="1"]').click();
    await page.getByText('Sauvegarde manuelle 1 confirmée.', { exact: true }).waitFor();
    assert.equal((await stored()).clanShipDocking.roomId, 'archives');
    await pad(1, false); await pad(1, true);
    await settings.waitFor({ state: 'hidden' });
    await page.waitForTimeout(400);
    assert.equal((await stored()).clanShipDocking.roomId, 'archives');
    assert.equal((await stored()).clanShipDocking.status, 'aboard');
    await pad(1, false);
  });
  await check('Save, main menu, reload and Continue restore the exact clan room', async () => {
    await clan().getByRole('button', { name: 'Ouvrir les paramètres', exact: true }).click();
    await page.getByRole('button', { name: 'Sauvegarder et revenir au menu principal', exact: true }).click();
    await page.locator('[data-campaign-menu]').waitFor();
    await page.reload({ waitUntil: 'networkidle' });
    await continueCampaign();
    await page.locator('[data-campaign-location="clan-ship"]').waitFor();
    await waitVisit('aboard', 'archives');
    assert.equal(await clan().getAttribute('data-clan-ship-room'), 'archives');
    await screenshot('03-archives-resumed.png');
  });
  await check('Returning to the personal ship keeps the berth and blocks travel until undocking', async () => {
    await move('hangar'); await action('return-to-personal');
    await page.locator('[data-campaign-location="deck"]').waitFor();
    await waitVisit('docked');
    await page.getByRole('button', { name: 'Yautja Prime · monde natal', exact: true }).click();
    await page.locator('[data-campaign-location="deck"]').waitFor();
    assert.equal((await stored()).clanShipDocking.status, 'docked');
    await page.getByRole('button', { name: 'Pause / réglages', exact: true }).click();
    await page.getByRole('button', { name: 'Sauvegarder et revenir au menu principal', exact: true }).click();
    await continueCampaign();
    await page.locator('[data-campaign-location="deck"]').waitFor();
    await waitVisit('docked');
    await openClan(); await action('undock'); await waitVisit('free-flight');
    await page.locator('[data-campaign-location="deck"]').waitFor();
  });
  await check('Approach cancellation is durable and never boards the clan ship', async () => {
    await openClan(); await action('approach'); await waitVisit('approach');
    await action('cancel-approach'); await waitVisit('free-flight');
    await page.locator('[data-campaign-location="deck"]').waitFor();
  });
  await check('Mobile room navigation works at 390px and 320px without horizontal overflow', async () => {
    await openClan(); await action('approach'); await action('dock'); await action('board');
    await waitVisit('aboard');
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await move('conseil'); await move('hangar');
      const dimensions = await clan().evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
      assert.ok(dimensions.scroll <= dimensions.client + 2, `Clan Ship overflow at ${width}px: ${JSON.stringify(dimensions)}`);
    }
    await screenshot('04-hangar-mobile-320.png');
  });
  await check('Clan ship artwork loads and no browser exception occurs', async () => {
    const images = await clan().locator('img').evaluateAll(elements => elements.map(image => ({ src: image.getAttribute('src'), complete: image.complete, width: image.naturalWidth })));
    assert.ok(images.length >= 2, 'Both clan and personal vessels must remain identifiable');
    assert.ok(images.every(image => image.complete && image.width > 0), JSON.stringify(images));
    assert.deepEqual(report.errors, []);
  });
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack || String(error);
  if (page) {
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    await fs.writeFile(path.join(out, 'failure-page.txt'), await page.locator('body').innerText().catch(() => 'Unavailable'));
  }
  console.error(error);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  report.missingAssets = [...missing].sort();
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close();
  if (server) await server.close();
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, output: out, missingAssets: missing.size }));
}
