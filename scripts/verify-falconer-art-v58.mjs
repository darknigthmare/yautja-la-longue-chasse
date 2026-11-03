import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { selectPitMatch, openPitPause, resumePitFight, returnPitSelection, closePitSelectionOptions } from './pit-selection-browser-helpers.mjs';

const url = process.env.V58_DRONE_QA_URL || 'http://localhost:4178';
const output = process.env.V58_DRONE_QA_OUTPUT || 'work-local/v58/qa/falconer-art';
const metadata = JSON.parse(await fs.readFile('app/game/data/pitFalconerDroneArtV58.json', 'utf8'));
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.V58_DRONE_QA_CHANNEL || 'chrome', headless: true });
const checks = [], captures = [], errors = [], httpFailures = [];
let context, page;
const read = () => page.evaluate(() => {
  const canvas = document.querySelector('canvas[data-pit-technique-entities]');
  return { entities: JSON.parse(canvas?.dataset.pitTechniqueEntities || '[]'),
    frame: Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame),
    life: [...document.querySelectorAll('[role="progressbar"][aria-label^="Vie de"]')].map(m => m.getAttribute('aria-valuenow')) };
});
const shot = async name => {
  await page.screenshot({ path: path.join(output, name + '.png') });
  captures.push(name + '.png');
};
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(65); await page.keyboard.up(key); };
try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion });
    const fixture = structuredClone(await campaignFixture());
    fixture.save.settings.screenShake = false;
    await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
    await context.addInitScript(records => {
      const original = CanvasRenderingContext2D.prototype.drawImage;
      window.__falconerArtV58 = [];
      CanvasRenderingContext2D.prototype.drawImage = function(...args) {
        const result = original.apply(this, args);
        const src = args[0] instanceof HTMLImageElement ? new URL(args[0].currentSrc || args[0].src, location.href).pathname : null;
        const art = records.find(record => record.src === src);
        if (art && this.canvas.matches('canvas[data-pit-technique-entities]') && window.__falconerArtV58.length < 12000) {
          const m = this.getTransform(), entities = JSON.parse(this.canvas.dataset.pitTechniqueEntities || '[]');
          window.__falconerArtV58.push({ src, facing: art.facing, rect: args.slice(1, 5), destination: args.slice(5),
            a: m.a, b: m.b, c: m.c, d: m.d, entities,
            frame: Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame) });
        }
        return result;
      };
    }, metadata.records);
    page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) httpFailures.push({ status: response.status(), url: response.url() }); });
    await enterCampaignDeck(page, { url });
    await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
    const storage = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
    for (const slot of [0, 1]) {
      if (slot) await returnPitSelection(page);
      await closePitSelectionOptions(page);
      await page.getByRole('radio', { name: /^Versus local/ }).click();
      await selectPitMatch(page, { player: slot ? 'city-hunter' : 'falconer', opponent: slot ? 'falconer' : 'city-hunter', arena: 'the-pit' });
      await page.waitForFunction(() => document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'fight');
      await page.locator('[data-pit-immersive]').focus();
      // Keep fighters far apart so the manual recall and pause are observable.
      await page.keyboard.down('ArrowLeft'); await page.keyboard.down('Numpad6');
      await page.waitForTimeout(800);
      await page.keyboard.up('ArrowLeft'); await page.keyboard.up('Numpad6');
      await page.evaluate(() => { window.__falconerArtV58 = []; });
      const initial = await read(), key = slot ? 'Numpad7' : 'KeyU';
      await press(key);
      await page.waitForFunction(() => window.__falconerArtV58.some(draw => draw.entities.some(e => e.phase === 'active')));
      const called = (await read()).entities[0];
      assert(called && called.ownerSlot === slot);
      await shot(`sensor-flight-${slot}-${reducedMotion}`);
      await openPitPause(page);
      const paused = await read();
      await page.waitForTimeout(220);
      assert.deepEqual(await read(), paused, 'pause freezes the same entity and combat frame');
      await resumePitFight(page);
      await page.locator('[data-pit-immersive]').focus();
      await press(key);
      await page.waitForFunction(id => window.__falconerArtV58.some(draw => draw.entities.some(e => e.id === id && e.phase === 'returning')), called.id);
      await shot(`sensor-return-${slot}-${reducedMotion}`);
      await page.waitForFunction(() => JSON.parse(document.querySelector('canvas[data-pit-technique-entities]')?.dataset.pitTechniqueEntities || '[]').length === 0);
      const observed = await page.evaluate(() => window.__falconerArtV58);
      assert(observed.length > 2);
      assert.deepEqual([...new Set(observed.map(draw => draw.facing))].sort(), [-1, 1]);
      assert(observed.every(draw => draw.a > 0 && draw.d > 0 && draw.b === 0 && draw.c === 0), 'native views are never mirrored or rotated');
      assert(observed.every(draw => metadata.records.find(record => record.src === draw.src).frames.some(frame => frame.rect.every((n, i) => n === draw.rect[i]))));
      assert(observed.every(draw => draw.entities.length <= 1 && draw.entities.every(e => e.id === called.id)), 'one entity, including recall');
      assert.deepEqual((await read()).life, initial.life, 'the rendered sensor causes no damage');
      assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage))), storage);
      checks.push({ slot, reducedMotion, entityId: called.id, nativeViews: [...new Set(observed.map(draw => draw.src))], samples: observed.length, pausedFrame: paused.frame });
    }
    await context.close(); context = null; page = null;
  }
  // A new context has no decoded bank: one failed native side must block the
  // entire match, and the visible retry must recover once the same URL responds.
  context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const fixture = structuredClone(await campaignFixture());
  fixture.save.settings.screenShake = false;
  await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
  const blockedPath = metadata.records[0].src;
  let intentionalFailures = 0;
  const blockNativeSide = async route => { intentionalFailures++; await route.fulfill({ status: 503, contentType: 'text/plain', body: 'Intentional native sensor QA failure' }); };
  await context.route('**' + blockedPath, blockNativeSide);
  page = await context.newPage(); page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('503')) errors.push(message.text()); });
  page.on('response', response => {
    if (response.status() >= 400 && !(response.status() === 503 && new URL(response.url()).pathname === blockedPath)) httpFailures.push({ status: response.status(), url: response.url() });
  });
  await enterCampaignDeck(page, { url });
  await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  const storage = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await closePitSelectionOptions(page);
  await page.getByRole('radio', { name: /^Versus local/ }).click();
  await selectPitMatch(page, { player: 'falconer', opponent: 'city-hunter', arena: 'the-pit' });
  await page.locator('[data-pit-falconer-retry]').waitFor();
  assert.match(await page.locator('[data-pit-match-loading]').innerText(), /IMAGE DU CAPTEUR INDISPONIBLE/);
  assert(intentionalFailures > 0);
  const blocked = await read();
  await press('KeyU'); await page.waitForTimeout(350);
  assert.deepEqual(await read(), blocked, 'an unavailable native view blocks time and sensor creation');
  assert.equal(blocked.entities.length, 0);
  await shot('sensor-native-side-unavailable');
  await context.unroute('**' + blockedPath, blockNativeSide);
  await page.locator('[data-pit-falconer-retry]').click();
  await page.waitForFunction(() => document.querySelector('canvas[data-pit-falconer-art-status]')?.dataset.pitFalconerArtStatus === 'native-held-bitmap'
    && document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'fight');
  assert.equal(await page.locator('[data-pit-match-loading]').count(), 0);
  await page.locator('[data-pit-immersive]').focus();
  await press('KeyU');
  await page.waitForFunction(() => JSON.parse(document.querySelector('canvas[data-pit-falconer-native-views]')?.dataset.pitFalconerNativeViews || '[]').some(view => view.src && view.pose === 'flight'));
  await shot('sensor-native-side-recovered');
  assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage))), storage);
  checks.push({ nativeFailure: blockedPath, intentionalFailures, blockedFrame: blocked.frame, retryRecovered: true });
  await context.close(); context = null; page = null;
  assert.deepEqual(errors, []); assert.deepEqual(httpFailures, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: true, url, checks, captures, errors, httpFailures,
    visualInspection: 'Pending independent screenshot review; native held views, not a complete animation cycle.' }, null, 2));
} catch (error) {
  if (page) await shot('failure').catch(() => {});
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ passed: false, error: String(error.stack || error), checks, captures, errors, httpFailures,
    state: page ? await read().catch(() => null) : null,
    draws: page ? await page.evaluate(() => window.__falconerArtV58).catch(() => null) : null }, null, 2));
  throw error;
} finally {
  await context?.close().catch(() => {});
  await browser.close();
}
