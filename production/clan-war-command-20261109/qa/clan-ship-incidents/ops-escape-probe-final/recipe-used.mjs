import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const retained = process.argv.includes('--retained-victory');
const final = process.argv.includes('--final');
const url = process.env.CLAN_MAINTENANCE_PROBE_URL || 'http://127.0.0.1:3153';
const out = path.join(root, `production/clan-war-command-20261109/qa/clan-ship-incidents/ops-escape-probe${final ? '-final' : retained ? '-return' : ''}`);
const sha = value => createHash('sha256').update(value).digest('hex');
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'run.lock'), new Date().toISOString(), { flag: 'wx' });
await fs.copyFile(fileURLToPath(import.meta.url), path.join(out, 'recipe-used.mjs'));
const built = await build({ stdin: { contents: [
  "export * from './app/game/save.ts';", "export * from './app/game/systems/clanShipOperations.ts';",
  "export * from './app/game/systems/clanShipDocking.ts';", "export * from './app/game/systems/clanShipIncidents.ts';",
].join('\n'), resolveDir: root }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const domain = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const helpers = await import(pathToFileURL(path.join(root, 'tests/helpers/clan-ship-maintenance-fixtures-20261109.mjs')));
let save = helpers.buildMaintenanceFixture(domain);
if (retained) {
  save = helpers.maintenanceOperation(domain, save, { type: 'accept-contract', contractId: 'space-screening' });
  for (const type of ['scan', 'manoeuvre', 'brace', 'brace', 'extract']) save = helpers.maintenanceOperation(domain, save,
    { type: 'space-command', command: { type, expectedTurn: save.clanShipOperations.spaceEncounter.turn } });
  const variant = domain.clanShipIncidentVariant(save.createdAt, 'sealed-lot');
  for (const [type, branch] of [['accept'], ['inspect-witness'], ['read-reference'], ['isolate', variant.other], ['read-reference'],
    ['isolate', variant.branch], ['check-pressure'], ['close-lot']]) save = helpers.maintenanceIntervene(domain, save, 'sealed-lot', type, branch);
} else save = helpers.completeMaintenance(domain, save, 'sealed-lot');
save = helpers.maintenanceAt(domain, save, 'hangar'); save.settings.masterVolume = 0;
await fs.writeFile(path.join(out, 'initial-save.json'), JSON.stringify(save, null, 2));
const report = { scope: 'Focused read-only keyboard diagnosis in the actual Next GameClient. Completed B01 is a declared reducer-built fixture, not a newly browser-played incident.',
  url, retainedVictory: retained, buildId: (await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim(), fixtureSha256: sha(JSON.stringify(save)), stages: [], keyEvents: [], errors: [] };
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: retained });
  await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), { key: domain.SAVE_STORAGE_KEY, save });
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('[data-campaign-menu]').waitFor();
  if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
  await page.locator('[data-menu-action="continue"]').click(); await page.locator('[data-clan-interior]').waitFor(); await page.bringToFront();
  const talk = page.locator('[data-clan-crew-talk="threshold-guard"]').first(); await talk.click();
  if (!await page.locator('[data-clan-operations]').isVisible()) {
    await page.waitForFunction(() => document.querySelector('[data-interior-operations]')?.getAttribute('data-interior-operations-ready') === 'true'); await talk.click();
  }
  await page.locator('[data-clan-crew-dialogue="threshold-guard"]').waitFor();
  const read = async name => report.stages.push({ name, ...await page.evaluate(() => {
    const active = document.activeElement;
    return { documentHasFocus: document.hasFocus(), activeTag: active?.tagName, activeMarkup: active?.outerHTML.slice(0, 450),
      focusedInsideOperations: !!active?.closest('[data-clan-operations]'), operationsVisible: !!document.querySelector('[data-clan-operations]'),
      operationsInert: document.querySelector('[data-clan-operations]')?.inert,
      closeDisabled: document.querySelector('[data-clan-operations-close]')?.disabled, settingsVisible: !!document.querySelector('#settings-title') };
  }) });
  await read('panel-open'); await page.locator('[data-clan-crew-dialogue-ack="threshold-guard"]').click(); await read('ack-clicked');
  await page.locator('.toast').waitFor({ state: 'hidden' }); await read('toast-hidden');
  await page.screenshot({ path: path.join(out, 'before-escape.png') }); await read('screenshot-taken');
  await page.evaluate(() => {
    window.__opsEscapeEvents = [];
    for (const [name, target] of [['window', window], ['document', document], ['panel', document.querySelector('[data-clan-operations]')]])
      for (const capture of [true, false]) target.addEventListener('keydown', event => window.__opsEscapeEvents.push({ name, capture,
        key: event.key, repeat: event.repeat, code: event.code, defaultPrevented: event.defaultPrevented, target: event.target?.tagName, insidePanel: !!event.target?.closest?.('[data-clan-operations]') }), { capture, passive: true });
  });
  await page.keyboard.press('Escape'); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await read('escape-sent'); report.keyEvents = await page.evaluate(() => window.__opsEscapeEvents);
  if (await page.locator('[data-clan-operations]').isVisible()) {
    await page.keyboard.press('Tab'); await read('tab-after-escape'); await page.keyboard.press('Escape');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await read('escape-after-tab');
    report.keyEvents = await page.evaluate(() => window.__opsEscapeEvents);
  }
  if (!await page.locator('[data-clan-operations]').isVisible()) {
    await talk.click(); await page.locator('[data-clan-operations]').waitFor();
    await page.locator('[data-clan-operations] h2').click(); await read('plain-heading-clicked');
    await page.keyboard.press('Escape'); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await read('escape-after-plain-heading'); report.keyEvents = await page.evaluate(() => window.__opsEscapeEvents);
  }
  if (final && !await page.locator('[data-clan-operations]').isVisible()) {
    await talk.click(); await page.locator('[data-clan-operations]').waitFor();
    await page.locator('[data-clan-operations]').locator('..').click({ position: { x: 1, y: 1 } });
    await read('native-backdrop-clicked'); await page.keyboard.press('Escape');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await read('escape-after-backdrop'); report.keyEvents = await page.evaluate(() => window.__opsEscapeEvents);
  }
} catch (error) { report.errors.push({ message: error.message, stack: error.stack }); }
finally { await browser.close(); await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify(report));
