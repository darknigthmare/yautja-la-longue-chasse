import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { choosePitFighter, choosePitStage, openPitSelectionOptions, closePitSelectionOptions, openPitPause, resumePitFight, returnPitSelection } from './pit-selection-browser-helpers.mjs';

const url = process.env.HOUND_QA_URL || 'http://127.0.0.1:4174';
const output = process.env.HOUND_QA_OUTPUT || 'work-local/v56/qa/hound-browser';
await fs.mkdir(output, { recursive: true });
const checks = [], errors = [], captures = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference' });
const fixture = structuredClone(await campaignFixture()); fixture.save.settings.screenShake = false;
await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
// Observe actual native draws after the browser performs them. No world or clock injection.
await context.addInitScript(() => {
  const draw = CanvasRenderingContext2D.prototype.drawImage;
  window.__houndDraws = [];
  CanvasRenderingContext2D.prototype.drawImage = function(...args) {
    const result = draw.apply(this, args), image = args[0];
    if (image instanceof HTMLImageElement && /\/v56\/pit\/companions\//.test(image.src) && this.canvas.matches('canvas[data-pit-fighter-positions]') && window.__houndDraws.length < 12000) {
      const matrix = this.getTransform();
      window.__houndDraws.push({ src: new URL(image.src).pathname, rect: args.slice(1, 5), destination: args.slice(5), a: matrix.a, d: matrix.d, poses: this.canvas.dataset.pitHoundPoses, phase: document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase });
    }
    return result;
  };
});
const page = await context.newPage(); page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.message));
const read = () => page.evaluate(() => {
  const root = document.querySelector('[data-pit-immersive]'), canvas = root?.querySelector('canvas[data-pit-fighter-positions]');
  return { frame: Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame), phase: root?.dataset.pitPresentationPhase,
    hounds: Number(canvas?.dataset.pitHoundCount), entities: JSON.parse(canvas?.dataset.pitHoundPositions || '[]'),
    phases: canvas?.dataset.pitHoundPhases, poses: canvas?.dataset.pitHoundPoses, art: canvas?.dataset.pitHoundArtStatus, variant: canvas?.dataset.pitHoundVariant };
});
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(55); await page.keyboard.up(key); };
const screenshot = async name => { await page.screenshot({ path: path.join(output, name + '.png') }); captures.push(name + '.png'); };
const check = (name, details = {}) => { checks.push({ name, ...details }); console.log(JSON.stringify({ passed: true, name })); };
try {
  await enterCampaignDeck(page, { url }); await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  const storageBefore = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  for (const variant of ['tracker-hound', 'hellhound-longhorn']) for (const slot of [0, 1]) {
    if (checks.length) await returnPitSelection(page);
    await closePitSelectionOptions(page); await page.getByRole('radio', { name: /^Versus local/ }).click();
    for (let index = 0; index < 2; index++) {
      await choosePitFighter(page, index === slot ? 'tracker' : 'jungle-hunter');
      await page.locator('[data-pit-selection-confirm]').click();
    }
    await openPitSelectionOptions(page); await page.locator('[data-pit-hound-picker]').selectOption(variant); await closePitSelectionOptions(page);
    await choosePitStage(page, 'the-pit');
    await page.waitForFunction(() => document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'ready');
    await page.evaluate(() => { window.__houndDraws = []; });
    await page.locator('[data-pit-selection-confirm]').click();
    await page.locator('[data-pit-immersive]').waitFor();
    const key = slot === 0 ? 'KeyU' : 'Numpad7';
    await press(key); assert.equal((await read()).hounds, 0, 'intro cannot call a creature');
    await page.waitForFunction(() => document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'fight' && Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame) >= 10);
    assert.equal((await read()).variant, variant);
    assert.equal((await read()).art, variant === 'tracker-hound' ? 'native-6-pose-atlas' : 'static-bitmap');
    await page.locator('[data-pit-immersive]').focus(); await press(key);
    await page.waitForFunction(() => Number(document.querySelector('canvas[data-pit-hound-count]')?.dataset.pitHoundCount) === 1);
    await openPitPause(page); const frozen = await read(); await page.waitForTimeout(450); assert.deepEqual(await read(), frozen, 'pause freezes entity age, position and native pose');
    await resumePitFight(page);
    await page.waitForFunction(() => document.querySelector('canvas[data-pit-hound-phases]')?.dataset.pitHoundPhases === 'active');
    await screenshot(variant + '-slot-' + slot);
    await page.waitForFunction(() => Number(document.querySelector('canvas[data-pit-hound-count]')?.dataset.pitHoundCount) === 0);
    const draws = await page.evaluate(() => window.__houndDraws);
    assert(draws.length > 10); assert(draws.every(draw => draw.a > 0 && draw.d > 0 && draw.phase === 'fight'));
    assert(draws.some(draw => draw.src.endsWith(slot === 0 ? '-right.png' : '-left.png')), 'initial attack must use the authored facing');
    assert(draws.some(draw => draw.src.endsWith(slot === 0 ? '-left.png' : '-right.png')), 'return must use the other authored side');
    if (variant === 'tracker-hound') for (const pose of ['telegraph', 'charge-a', 'charge-b', 'bite']) assert(draws.some(draw => draw.poses === pose), 'native drawing observed: ' + pose);
    else assert(draws.every(draw => draw.poses === 'idle'), 'longhorn never claims a missing gait');
    if (variant === 'tracker-hound' && slot === 0) {
      const recallStart = (await read()).frame;
      await press(key);
      await page.waitForFunction(start => Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame) >= start + 54, recallStart);
      await press(key);
      await page.waitForFunction(() => document.querySelector('canvas[data-pit-hound-phases]')?.dataset.pitHoundPhases === 'returning');
      assert.equal((await read()).hounds, 1, 'a recall must not duplicate the creature');
      await page.waitForFunction(() => Number(document.querySelector('canvas[data-pit-hound-count]')?.dataset.pitHoundCount) === 0);
      assert((await page.evaluate(() => window.__houndDraws)).some(draw => draw.poses === 'recoil'), 'manual recall must reach the native recoil drawing');
    }
    check(variant + '-slot-' + slot, { frozen, nativeSources: [...new Set(draws.map(draw => draw.src))], nativePoses: [...new Set(draws.map(draw => draw.poses))], samples: draws.length });
  }
  const storageAfter = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  assert.deepEqual(storageAfter, storageBefore, 'unfinished exhibition bouts must not recruit companions or grant campaign progress');
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: true, url, checks, errors, captures, scope: 'Four real exhibition bouts, keyboard calls, native draw observation, pause, intro locks and unchanged campaign storage. Full gait atlas remains absent for longhorn.' }, null, 2));
} catch (error) {
  await screenshot('failure').catch(() => {});
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: false, url, checks, errors, captures, error: String(error.stack || error) }, null, 2));
  throw error;
} finally { await browser.close(); }
