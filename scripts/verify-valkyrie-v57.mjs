import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { selectPitMatch, openPitPause, resumePitFight, returnPitSelection } from './pit-selection-browser-helpers.mjs';

const url = process.env.V57_ART_QA_URL || 'http://localhost:4176';
const output = process.env.V57_ART_QA_OUTPUT || 'work-local/v57/qa/valkyrie-dev';
await fs.mkdir(output, { recursive: true });
const art = JSON.parse(await fs.readFile('app/game/data/pitValkyrieArtV57.json', 'utf8'));
const mappings = art.records.flatMap(record => record.frames.map((frame, index) => ({ facing: record.facing, index, rect: frame.rect })));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const errors = [], checks = [], captures = [];
const page = await context.newPage(); page.setDefaultTimeout(45000);
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const shot = async name => {
  const canvas = page.locator('[data-pit-production-lab] canvas').first();
  if (await canvas.count()) await canvas.screenshot({ path: path.join(output, name + '.png') });
  else await page.screenshot({ path: path.join(output, name + '.png') });
  captures.push(name + '.png');
};
try {
  await page.goto(url + '/pit-lab', { waitUntil: 'networkidle' });
  await page.getByLabel('Combattant', { exact: true }).selectOption('valkyrie');
  await page.getByLabel('Atlas validé', { exact: true }).selectOption('valkyrie-hammer-v57');
  const lab = page.locator('[data-pit-production-lab]');
  for (const facing of ['right', 'left']) {
    await page.getByLabel('Orientation', { exact: true }).selectOption(facing);
    for (const phase of ['startup', 'active', 'recovery']) {
      const clip = 'pit.stand.technique.valkyrie-norse-hammer.' + phase;
      await page.getByLabel('Clip / phase', { exact: true }).selectOption(clip);
      await page.waitForFunction(() => document.querySelector('[data-pit-production-lab]')?.dataset.renderStatus === 'ready');
      await page.getByRole('button', { name: 'Début', exact: true }).click();
      await shot(facing + '-' + phase + '-0');
      if (phase !== 'active') {
        await page.getByRole('button', { name: '+1 dessin', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('[data-pit-production-lab]')?.dataset.frameIndex === '1');
        await shot(facing + '-' + phase + '-1');
      }
      assert.equal(await lab.getAttribute('data-held-stance'), 'false');
      checks.push({ kind: 'native-phase', facing, phase });
    }
    await page.getByLabel('Clip / phase', { exact: true }).selectOption('idle');
    await page.waitForFunction(() => document.querySelector('[data-pit-production-lab]')?.dataset.heldStance === 'true');
    checks.push({ kind: 'honest-held-stance', facing });
  }
  const fixture = structuredClone(await campaignFixture()); fixture.save.settings.screenShake = false;
  await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
  await context.addInitScript(mappings => {
    const original = CanvasRenderingContext2D.prototype.drawImage;
    window.__v57Draws = [];
    CanvasRenderingContext2D.prototype.drawImage = function(...args) {
      const result = original.apply(this, args);
      if (this.canvas.matches('canvas[data-pit-fighter-positions]') && args.length === 9) {
        const match = mappings.find(value => value.rect.every((n, i) => n === args[i + 1]));
        if (match && window.__v57Draws.length < 12000) window.__v57Draws.push({ ...match,
          destination: args.slice(5), scaleX: this.getTransform().a,
          status: document.querySelector('[data-pit-bitmap-id="valkyrie"]')?.dataset.pitBitmapStatus });
      }
      return result;
    };
  }, mappings);
  await enterCampaignDeck(page, { url });
  await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  const storage = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  for (const slot of [0, 1]) {
    if (slot) await returnPitSelection(page);
    await page.getByRole('radio', { name: /^Versus local/ }).click();
    await selectPitMatch(page, { player: slot ? 'jungle-hunter' : 'valkyrie', opponent: slot ? 'valkyrie' : 'jungle-hunter', arena: 'the-pit' });
    await page.waitForFunction(() => document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'fight');
    await page.locator('[data-pit-immersive]').focus();
    await page.evaluate(() => { window.__v57Draws = []; });
    const key = slot ? 'Numpad7' : 'KeyU';
    await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key);
    await page.waitForFunction(() => new Set(window.__v57Draws.filter(d => d.status === 'sprite-sheet-animation').map(d => d.index)).size === 4);
    await shot('combat-slot-' + slot);
    await openPitPause(page);
    const frozenCount = await page.evaluate(() => window.__v57Draws.length);
    await page.waitForTimeout(180);
    const draws = await page.evaluate(() => window.__v57Draws);
    assert(draws.every(d => d.scaleX > 0), 'native orientations never mirror Canvas');
    assert(draws.every(d => d.facing === (slot ? 'left' : 'right')));
    assert.equal(new Set(draws.filter(d => d.status === 'sprite-sheet-animation').map(d => d.index)).size, 4);
    assert(frozenCount > 0);
    checks.push({ kind: 'real-combat', slot, drawings: [...new Set(draws.map(d => d.index))], samples: draws.length });
    await resumePitFight(page);
  }
  assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage))), storage);
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: true, url, checks, errors, captures }, null, 2));
} catch (error) {
  await shot('failure').catch(() => {});
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: false, url, checks, errors, captures, error: String(error.stack || error) }, null, 2));
  throw error;
} finally { await browser.close(); }
