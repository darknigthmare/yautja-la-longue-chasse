import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';

const url = process.env.NARRATIVE_QA_URL || 'http://127.0.0.1:4176';
const output = process.env.NARRATIVE_QA_OUTPUT || 'work-local/v57/qa/narrative-trials';
const callbackOnly = process.env.NARRATIVE_QA_SCOPE === 'callback';
await fs.mkdir(output, { recursive: true });
const trials = [
  ['berserker-classic-rival', 'berserker', 'user-classic-2010', 'arena-107-predators-2010-hunting-camp'],
  ['enforcer-bad-blood-rival', 'enforcer', 'user-bad-blood', 'arena-140-bad-blood-pine-barrens'],
  ['greyback-city-rival', 'greyback', 'city-hunter', 'arena-106-predator-2-1990-trophy-ship'],
  ['machiko-tichinde-rival', 'machiko-noguchi', 'user-tichinde', 'arena-138-avp-ryushi-prosperity-wells'],
];
const checks = [], errors = [], consoleErrors = [], captures = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference' });
const fixture = structuredClone(await campaignFixture()); fixture.save.settings.screenShake = false;
await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
const page = await context.newPage(); page.setDefaultTimeout(45000);
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
const record = (name, detail = {}) => { checks.push({ name, ...detail }); console.log(JSON.stringify({ passed: true, name })); };
const shot = async name => { await page.screenshot({ path: path.join(output, name + '.png') }); captures.push(name + '.png'); };
const savedProgress = () => page.evaluate(key => Object.fromEntries(Object.entries(localStorage).filter(([name]) => name === key || /the-pit|pit-save|pit-replay/i.test(name))), fixture.key);
const waitForPhase = phase => page.waitForFunction(expected => {
  if (document.querySelector('#error-title')) throw new Error('The game error boundary interrupted the real duel');
  return document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === expected;
}, phase);
const read = () => page.evaluate(() => {
  const root = document.querySelector('[data-pit-immersive]'), canvas = root?.querySelector('canvas[data-pit-fighter-positions]');
  return { phase: root?.dataset.pitPresentationPhase, frame: Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame),
    positions: JSON.parse(canvas?.dataset.pitFighterPositions || '[]'), arena: canvas?.dataset.pitSceneArenaId, art: canvas?.dataset.pitArenaArtStatus,
    fighters: [...document.querySelectorAll('[data-pit-bitmap-id]')].map(el => el.dataset.pitBitmapId),
    hp: [...root?.querySelectorAll('[role="progressbar"][aria-label^="Vie de"]') || []].map(el => Number(el.getAttribute('aria-valuenow'))) };
});
async function launch(id) {
  await page.locator(`[data-narrative-choice="${id}"]`).click();
  await page.waitForFunction(() => document.querySelector('[data-narrative-primary]')?.disabled === false);
  await page.locator('[data-narrative-primary]').click();
  await page.locator('[data-pit-immersive]').waitFor();
}
async function finishWithKeys(active) {
  const held = new Set();
  const apply = async keys => {
    for (const key of held) if (!keys.includes(key)) { await page.keyboard.up(key); held.delete(key); }
    for (const key of keys) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
  };
  await page.locator('[data-pit-immersive]').focus();
  try {
    for (let step = 0; step < 1500; step++) {
      if (await page.locator('#error-title').count()) throw new Error('The game error boundary interrupted the keyboard duel');
      const state = await read();
      if (await page.getByRole('button', { name: 'Lire l’issue de l’épreuve', exact: true }).isVisible()) return state;
      const keys = [];
      if (active && state.phase === 'fight' && state.positions.length === 2) {
        const delta = state.positions[1].x - state.positions[0].x;
        if (Math.abs(delta) > 80) keys.push(delta > 0 ? 'ArrowRight' : 'ArrowLeft');
        else keys.push('KeyJ');
      }
      await apply(keys); await page.clock.runFor(100);
      // Attacks use a rising-edge latch, as a real controller does. Release each
      // strike before the next press; holding a key is one attack, not auto-fire.
      if (keys.includes('KeyJ')) await apply([]);
      await page.clock.runFor(100);
    }
    throw new Error('The real-input duel did not finish within the simulated session budget');
  } finally { for (const key of held) await page.keyboard.up(key); }
}
try {
  await enterCampaignDeck(page, { url });
  await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  await page.locator('[data-pit-narrative-open]').click();
  await page.locator('[data-pit-narrative-trials]').waitFor();
  const before = await savedProgress();
  assert.equal(await page.locator('[data-narrative-choice]').count(), 4);
  await shot('narrative-briefing-desktop');
  for (const [id, left, right, arena] of callbackOnly ? [] : trials) {
    await launch(id);
    await waitForPhase('intro-left');
    assert.equal(await page.locator('[data-pit-roster-search], [data-pit-selection-options], [role="radio"]').count(), 0);
    await waitForPhase('fight');
    const state = await read(); assert.equal(state.arena, arena); assert.equal(state.art, 'bitmap'); assert.deepEqual(state.fighters, [left, right]);
    await shot(id + '-fight');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Retour au récit', exact: true }).click();
    await page.locator('[data-narrative-outcome="abandoned"]').waitFor();
    record(id + '-launch-and-abandon', { arena, fighters: state.fighters, positions: state.positions });
  }
  // Run real key inputs with Playwright's controlled animation clock; no combat fields are patched.
  await page.clock.install();
  if (!callbackOnly) {
  await page.locator('[data-narrative-choice="berserker-classic-rival"]').click();
  await page.locator('[data-narrative-primary]').click(); await page.locator('[data-pit-immersive]').waitFor();
  const wonState = await finishWithKeys(true); await shot('rival-match-result');
  await page.getByRole('button', { name: 'Lire l’issue de l’épreuve', exact: true }).click();
  const outcome = await page.locator('[data-pit-narrative-trials]').getAttribute('data-narrative-outcome');
  assert.equal(outcome, 'victory', 'the keyboard driver must really win; no result is injected');
  await shot('rival-narrative-victory'); record('actual-victory-and-conclusion', { outcome, state: wonState });
  await page.locator('[data-narrative-primary]').click(); await page.locator('[data-pit-immersive]').waitFor();
  const lostState = await finishWithKeys(false);
  await page.getByRole('button', { name: 'Lire l’issue de l’épreuve', exact: true }).click();
  assert.equal(await page.locator('[data-pit-narrative-trials]').getAttribute('data-narrative-outcome'), 'defeat');
  record('actual-defeat-and-retry', { state: lostState });
  await page.locator('[data-narrative-primary]').click(); await page.locator('[data-pit-immersive]').waitFor();
  assert.equal((await read()).arena, trials[0][3]); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Retour au récit', exact: true }).click();
  }
  // Complete every other encounter too. Greyback and Machiko are extension
  // fighters: their callback must resolve a defeat, never mislabel it abandon.
  for (const [id] of trials.slice(callbackOnly ? 2 : 1)) {
    await launch(id);
    const state = await finishWithKeys(false);
    await page.getByRole('button', { name: 'Lire l’issue de l’épreuve', exact: true }).click();
    assert.equal(await page.locator('[data-pit-narrative-trials]').getAttribute('data-narrative-outcome'), 'defeat');
    await shot(id + '-resolved-defeat'); record(id + '-actual-terminal-callback', {state});
  }
  if (callbackOnly) {
    await page.locator('[data-narrative-primary]').click(); await page.locator('[data-pit-immersive]').waitFor();
    assert.equal((await read()).arena, trials[3][3]); await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Retour au récit', exact: true }).click();
    assert.equal(await page.locator('[data-pit-narrative-trials]').getAttribute('data-narrative-outcome'), 'abandoned');
    record('extension-retry-and-explicit-abandon');
  }
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport); await page.clock.runFor(50);
    const fits = await page.locator('[data-pit-narrative-trials]').evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
    assert(fits.scroll <= fits.width + 1, 'no horizontal overflow'); await shot('narrative-' + viewport.width + 'x' + viewport.height);
    record('layout-' + viewport.width + 'x' + viewport.height, fits);
  }
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.locator('[data-pit-narrative-open]').waitFor();
  assert.deepEqual(await savedProgress(), before, 'trial results must not write campaign/Pit rewards or change historic runs');
  assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []); record('return-to-pit-and-progress-unchanged');
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: true, url, checks, captures, errors, consoleErrors, scope: callbackOnly
    ? 'Targeted final callback check: real completed Greyback and Machiko CPU defeats, extension retry/abandon, responsive layouts and unchanged progress. Controlled clock; no gameplay state/result injection.'
    : 'Four real imposed encounters, abandon paths and completed CPU defeats; one real keyboard victory and retry; responsive layouts. Controlled clock for completed bouts, no gameplay state/result injection. Campaign and Pit progress bytes unchanged.' }, null, 2));
} catch (error) {
  await shot('failure').catch(() => {});
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: false, url, checks, captures, errors, consoleErrors, error: String(error.stack || error), state: await read().catch(() => null), body: await page.locator('body').innerText().catch(() => '') }, null, 2));
  throw error;
} finally { await browser.close(); }
