import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? 'http://127.0.0.1:3121';
const origin = new URL(baseUrl);
assert.ok(['127.0.0.1', 'localhost'].includes(origin.hostname));
const buildId = process.env.YAUTJA_QA_BUILD_ID;
const source = process.env.YAUTJA_QA_RUNTIME_COMMIT;
assert.ok(buildId, 'Provide the production Next BUILD_ID.');
assert.match(source ?? '', /^[0-9a-f]{40}$/);
const output = process.env.YAUTJA_WAR_STEALTH_OUTPUT ?? 'outputs/qa-stealth-accessibility-v114';
await mkdir(output, { recursive: true });
const report = { source, buildId, passed: false, checks: [], errors: [],
  scope: 'Compiled Next GameClient and keyboard-driven V114 infiltration. No injected war state, physical touch, gamepad or screen-reader evidence.' };
const record = (name, value) => { assert.ok(value, name); report.checks.push(name); };
const browser = await chromium.launch({ headless: true, executablePath:
  process.env.CHROMIUM_EXECUTABLE_PATH ?? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/usr/bin/google-chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => report.errors.push(error.message));
  const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  record('Real production GameClient is served', response?.ok() && (await response.text()).includes(buildId));
  await page.locator('button[data-menu-section="modes"]').click();
  await page.getByRole('button', { name: /^Guerres des clans/ }).click();
  await page.getByRole('button', { name: 'Accéder malgré les spoilers', exact: true }).click();
  await page.getByRole('button', { name: 'Opérations multi-modes V114', exact: true }).click();
  const missions = page.getByTestId('war-mission-modes-v114');
  await missions.getByRole('button', { name: 'Infiltration et sabotage', exact: true }).click();
  const start = missions.getByRole('button', { name: 'Lancer la mission', exact: true });
  await start.waitFor();
  const from = missions.getByRole('combobox', { name: 'Départ', exact: true });
  const target = missions.getByRole('combobox', { name: 'Objectif voisin', exact: true });
  if (!(await start.isEnabled())) {
    const origins = await from.locator('option').evaluateAll(items => items.map(item => item.value));
    for (const candidate of origins) {
      await from.selectOption(candidate);
      const destinations = await target.locator('option').evaluateAll(items => items.map(item => item.value));
      for (const destination of destinations) {
        await target.selectOption(destination);
        if (await start.isEnabled()) break;
      }
      if (await start.isEnabled()) break;
    }
  }
  record('A disclosed hostile neighbor can be selected through the public controls', await start.isEnabled());
  await start.click();
  const field = page.getByTestId('war-stealth-v114');
  const terrain = field.getByRole('group', { name: 'Terrain d’infiltration', exact: true });
  const status = field.getByRole('status');
  const storage = async () => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))));
  const before = await storage();
  record('The map gives a named focus target with an accessible description and initial readout',
    Boolean(await terrain.getAttribute('aria-describedby')) &&
    (await status.innerText()).includes('colonne 2, ligne 7') &&
    (await status.innerText()).includes('Sentinelles visibles'));
  await terrain.focus();
  const initial = await status.innerText();
  await terrain.press('Control+ArrowUp');
  await terrain.press('Shift+ArrowUp');
  record('Modified arrows leave position and patrol unchanged', initial === await status.innerText());
  await terrain.press('ArrowUp');
  await page.waitForFunction(() => document.querySelector('[data-testid="war-stealth-v114"] [role="status"]')?.textContent.includes('Vous êtes en colonne 2, ligne 6.'));
  const afterArrow = await status.innerText();
  record('A simple arrow updates the live position and preserves focus', await terrain.evaluate(node => node === document.activeElement));
  await terrain.press('e');
  await page.waitForFunction(before => document.querySelector('[data-testid="war-stealth-v114"] [role="status"]')?.innerText !== before, afterArrow);
  record('E advances the visible patrol through the existing gameplay command', afterArrow !== await status.innerText() &&
    (await status.innerText()).includes('colonne 2, ligne 6'));
  const pad = field.getByRole('group', { name: 'Déplacements d’infiltration', exact: true });
  const buttons = await pad.getByRole('button').all();
  record('All four movement targets reach 44 pixels', buttons.length === 4 &&
    (await Promise.all(buttons.map(button => button.boundingBox()))).every(rect => rect && rect.height >= 44 && rect.width >= 44));
  await pad.getByRole('button', { name: 'Bas', exact: true }).click();
  record('The directional button uses the same movement and creates no durable side effects in the exercise',
    (await status.innerText()).includes('colonne 2, ligne 7') && before === await storage());
  await field.screenshot({ path: join(output, 'infiltration-controls.png') });
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  await writeFile(join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
console.log(JSON.stringify(report));
