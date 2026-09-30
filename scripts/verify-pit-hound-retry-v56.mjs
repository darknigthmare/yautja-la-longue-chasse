import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { choosePitFighter, choosePitStage, openPitSelectionOptions, closePitSelectionOptions } from './pit-selection-browser-helpers.mjs';

const url = process.env.HOUND_QA_URL || 'http://127.0.0.1:4174', output = 'work-local/v56/qa/hound-retry';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage(); page.setDefaultTimeout(30000);
const blocked = '**/game/sprites/v56/pit/companions/hellhound-longhorn-left.png';
let denied = 0; await page.route(blocked, route => { denied++; return route.abort('failed'); });
const read = () => page.evaluate(() => ({ frame: Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame), count: Number(document.querySelector('canvas[data-pit-hound-count]')?.dataset.pitHoundCount), phase: document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase }));
try {
  await enterCampaignDeck(page, { url }); await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  await page.getByRole('radio', { name: /^Versus local/ }).click();
  for (const id of ['tracker', 'jungle-hunter']) { await choosePitFighter(page, id); await page.locator('[data-pit-selection-confirm]').click(); }
  await openPitSelectionOptions(page); await page.locator('[data-pit-hound-picker]').selectOption('hellhound-longhorn'); await closePitSelectionOptions(page);
  await choosePitStage(page, 'the-pit'); await page.waitForFunction(() => document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'ready');
  await page.locator('[data-pit-selection-confirm]').click();
  await page.getByText('IMAGE DU CHIEN INDISPONIBLE', { exact: true }).waitFor(); assert(denied > 0);
  const before = await read(); await page.waitForTimeout(700); assert.deepEqual(await read(), before); assert.equal(before.frame, 0); assert.equal(before.count, 0);
  await page.screenshot({ path: output + '/blocked.png' });
  await page.unroute(blocked); await page.locator('[data-pit-hound-retry]').click();
  await page.waitForFunction(() => document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'fight' && Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame) >= 10);
  await page.locator('[data-pit-immersive]').focus(); await page.keyboard.down('KeyU'); await page.waitForTimeout(55); await page.keyboard.up('KeyU');
  await page.waitForFunction(() => Number(document.querySelector('canvas[data-pit-hound-count]')?.dataset.pitHoundCount) === 1);
  await page.screenshot({ path: output + '/recovered.png' });
  await fs.writeFile(output + '/report.json', JSON.stringify({ passed: true, url, denied, before, recovered: await read(), scope: 'One native longhorn image failed at the request layer; real UI retry restores the duel and a keyboard call. No simulation injection.' }, null, 2));
  console.log('PASS: missing native view blocks frame0; retry restores a real Hellhound.');
} catch (error) {
  await page.screenshot({ path: output + '/failure.png' }).catch(() => {});
  await fs.writeFile(output + '/report.json', JSON.stringify({ passed: false, denied, error: String(error.stack || error) }, null, 2)); throw error;
} finally { await browser.close(); }
