import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = process.env.PIT_GAMEPAD_QA_URL || 'http://127.0.0.1:4173';
const output = process.env.PIT_GAMEPAD_QA_OUTPUT || 'work/v35/gamepad-qa';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], checks = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.pitQaPad = { id: 'V35 virtual standard pad', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.pitQaPad, null, null, null] });
  });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Jouer', exact: true }).click();
  await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  async function move(button, expected) {
    await page.waitForTimeout(120);
    await page.evaluate(index => { window.pitQaPad.buttons[index] = { pressed: true, touched: true, value: 1 }; }, button);
    await page.waitForFunction(label => document.querySelector('[role="radio"][aria-checked="true"] strong')?.textContent === label, expected);
    await page.evaluate(index => { window.pitQaPad.buttons[index] = { pressed: false, touched: false, value: 0 }; }, button);
    await page.waitForTimeout(120);
  }
  for (const fighter of ['tracker', 'greyback']) {
    await page.getByRole('combobox', { name: 'Combattant joueur', exact: true }).selectOption(fighter);
    await page.getByRole('radio', { name: /^Entraînement/ }).click();
    for (const expected of ['Duel CPU', 'Versus local', 'Entraînement']) await move(15, expected);
    for (const expected of ['Versus local', 'Duel CPU', 'Entraînement']) await move(14, expected);
    for (const name of [/^Arcade individuel/, /^Circuit du clan/, /^Descente/]) assert(await page.getByRole('radio', { name }).isDisabled());
    checks.push({ fighter, forwardWrap: true, backwardWrap: true, progressionModesDisabled: true });
  }
  await page.getByRole('combobox', { name: 'Combattant joueur', exact: true }).selectOption('jungle-hunter');
  await page.getByRole('radio', { name: /^Entraînement/ }).click();
  await move(15, 'Arcade individuel');
  await move(14, 'Entraînement');
  checks.push({ fighter: 'jungle-hunter', historicalArcadeAccessible: true });
  assert.deepEqual(errors, []);
  const result = { passed: true, checkedAt: new Date().toISOString(), url: base, input: 'virtual-standard-gamepad', physicalControllerCertified: false, checks, errors };
  await page.screenshot({ path: output + '/selection.png', fullPage: true });
  await fs.writeFile(output + '/browser-qa.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
