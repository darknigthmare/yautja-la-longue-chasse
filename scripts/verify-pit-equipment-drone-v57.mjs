import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { choosePitFighter, choosePitStage, closePitSelectionOptions, returnPitSelection } from './pit-selection-browser-helpers.mjs';

// Synthetic QA save in a new browser context only, never a user's browser profile.
const url = process.env.V57_EQUIPMENT_QA_URL || 'http://localhost:4176';
const output = process.env.V57_EQUIPMENT_QA_OUTPUT || 'work-local/v57/qa/equipment-drone';
const variant = 'jungle-hunter-final-duel-v57';
const droneId = 'falconer-reconnaissance-v57';
const pressureBundle = await build({ stdin: { contents: 'export { PIT_PRESSURE_GAIN_INTERVAL, PIT_PRESSURE_MIN_DISTANCE, PIT_PRESSURE_MAX_DISTANCE, PIT_MAX_TRAQUE } from "./app/game/systems/pitCombat";', resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const pressure = await import('data:text/javascript;base64,' + Buffer.from(pressureBundle.outputFiles[0].text).toString('base64'));
const checks = [], captures = [], errors = [], consoleErrors = [], httpFailures = [];
let browser, context, page;
await fs.mkdir(output, { recursive: true });
const record = (name, details = {}) => { checks.push({ name, ...details }); console.log(JSON.stringify({ passed: true, name })); };
const storage = () => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a], [b]) => a.localeCompare(b)))));
const read = () => page.evaluate(() => {
  const root = document.querySelector('[data-pit-immersive]'), canvas = root?.querySelector('canvas[data-pit-fighter-positions]');
  return { frame: Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame), phase: root?.dataset.pitPresentationPhase,
    plasma: Number(canvas?.dataset.pitPlasmaCount), entities: JSON.parse(canvas?.dataset.pitTechniqueEntities || '[]'),
    positions: JSON.parse(canvas?.dataset.pitFighterPositions || '[]'),
    meters: [...root?.querySelectorAll('[role="progressbar"]') || []].map(n => ({ label: n.getAttribute('aria-label'), value: Number(n.getAttribute('aria-valuenow')) })),
    variants: [...document.querySelectorAll('[data-pit-bitmap-variant]')].map(n => n.dataset.pitBitmapVariant),
    art: [...document.querySelectorAll('[data-pit-bitmap-status]')].map(n => n.dataset.pitBitmapStatus),
    statuses: [...root?.querySelectorAll('[aria-label^="États de"]') || []].map(n => n.textContent),
  };
});
const shot = async name => { await page.screenshot({ path: path.join(output, name + '.png') }); captures.push(name + '.png'); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(70); await page.keyboard.up(key); };
const clearEvidence = () => page.evaluate(() => { window.__equipmentV57 = { draws: [], samples: [] }; });
const evidence = () => page.evaluate(() => window.__equipmentV57);

function verifyNoCombatGain(before, after, pressureSinceRoundStart) {
  assert.deepEqual(after.positions, before.positions, 'no movement or knockback during resource observation');
  const distance = Math.abs(before.positions[1].x - before.positions[0].x);
  const inPressureRange = distance >= pressure.PIT_PRESSURE_MIN_DISTANCE && distance <= pressure.PIT_PRESSURE_MAX_DISTANCE;
  assert.equal(inPressureRange, pressureSinceRoundStart);
  // These bouts either stay at their pressure-active spawn since tick 0, or
  // remain outside the range throughout the measured recall. No unknown remainder.
  const passiveGain = pressureSinceRoundStart
    ? Math.floor(after.frame / pressure.PIT_PRESSURE_GAIN_INTERVAL) - Math.floor(before.frame / pressure.PIT_PRESSURE_GAIN_INTERVAL) : 0;
  assert.deepEqual(after.meters, before.meters.map(meter => ({ ...meter, value: meter.label.startsWith('Traque de ')
    ? Math.min(pressure.PIT_MAX_TRAQUE, meter.value + passiveGain) : meter.value })), 'HP unchanged; Traque equals only the exact passive pressure ticks');
  return { fromFrame: before.frame, toFrame: after.frame, distance, passiveGain, interval: pressure.PIT_PRESSURE_GAIN_INTERVAL };
}

/** Passive draw and DOM observations; engine, input handling and timing remain untouched. */
function observeDraws() {
  const original = CanvasRenderingContext2D.prototype.drawImage, sources = new WeakMap();
  window.__equipmentV57 = { draws: [], samples: [] };
  CanvasRenderingContext2D.prototype.drawImage = function (...args) {
    const result = original.apply(this, args), image = args[0];
    const source = image instanceof HTMLImageElement ? image.currentSrc || image.src : sources.get(image);
    if (source && args.length === 3) sources.set(this.canvas, source);
    if (!this.canvas.matches?.('canvas[data-pit-fighter-positions]')) return result;
    const e = window.__equipmentV57, root = document.querySelector('[data-pit-immersive]');
    const frame = Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame), phase = root?.dataset.pitPresentationPhase;
    if (e.samples.at(-1)?.frame !== frame && e.samples.length < 8000) e.samples.push({ frame, phase,
      plasma: Number(this.canvas.dataset.pitPlasmaCount), entities: JSON.parse(this.canvas.dataset.pitTechniqueEntities || '[]') });
    if (source && source.includes('/game/sprites/v57/pit/jungle-hunter/') && e.draws.length < 16000) {
      const m = this.getTransform(); e.draws.push({ src: new URL(source, location.href).pathname, frame, phase, a: m.a, b: m.b, c: m.c, d: m.d });
    }
    return result;
  };
}

async function open(mobile = false) {
  context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 720 }, hasTouch: mobile, isMobile: mobile, reducedMotion: 'no-preference' });
  const fixture = structuredClone(await campaignFixture()); fixture.save.settings.screenShake = false;
  await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
  await context.addInitScript(observeDraws);
  page = await context.newPage(); page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', r => { if (r.status() >= 400) httpFailures.push({ status: r.status(), url: r.url() }); });
  await enterCampaignDeck(page, { url }); await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  await closePitSelectionOptions(page); await page.getByRole('radio', { name: /^Versus local/ }).click();
  return storage();
}
async function select(fighters, finalDuelSlot = null) {
  await closePitSelectionOptions(page);
  for (const [slot, fighter] of fighters.entries()) {
    await choosePitFighter(page, fighter);
    if (slot === finalDuelSlot) {
      await page.locator('[data-pit-variant-select]').selectOption(variant);
      const side = slot === 0 ? 'player' : 'opponent';
      const card = page.locator(`[data-selection-side="${side}"] article[data-fighter-id="jungle-hunter"]`);
      await card.locator('img[data-art-ready="true"]').waitFor();
      assert.equal(await card.locator('[data-pit-technique-available]').getAttribute('data-pit-technique-available'), 'false');
      const facing = slot === 0 ? 'right' : 'left';
      const portrait = await card.locator('img[data-native-facing]').evaluate(img => ({ src: new URL(img.currentSrc).pathname, facing: img.dataset.nativeFacing, scale: new DOMMatrix(getComputedStyle(img).transform).a }));
      assert.equal(portrait.facing, facing); assert(portrait.src.endsWith('/final-duel-' + facing + '.png')); assert(portrait.scale > 0);
      await shot('jungle-final-selection-' + facing + '-' + (await page.viewportSize()).width);
    }
    await page.locator('[data-pit-selection-confirm]').click();
  }
  await choosePitStage(page, 'the-pit');
  await page.waitForFunction(() => document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'ready');
  await clearEvidence(); await page.locator('[data-pit-selection-confirm]').click();
  await page.waitForFunction(() => {
    if (document.querySelector('#error-title')) throw new Error('Game error boundary interrupted the actual duel');
    return document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'fight' && Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame) >= 12;
  });
  await page.locator('[data-pit-immersive]').focus();
}

try {
  browser = await chromium.launch({ channel: process.env.V57_EQUIPMENT_QA_BROWSER_CHANNEL || 'chrome', headless: true });
  for (const mobile of [false, true]) {
    const saved = await open(mobile);
    // The shipped roster forbids duplicate identities: two real bouts establish both native sides.
    for (const slot of [0, 1]) {
      await select(slot === 0 ? ['jungle-hunter', 'city-hunter'] : ['city-hunter', 'jungle-hunter'], slot);
      const facing = slot === 0 ? 'right' : 'left';
      const before = await read(); assert.equal(before.variants[slot], variant);
      assert.equal(before.art[slot], 'sprite-sheet-hold');
      assert.equal(await page.locator('[data-pit-plasma-unavailable]').count(), 1);
      for (let n = 0; n < 3; n++) { await press(slot === 0 ? 'KeyU' : 'Numpad7'); await page.waitForTimeout(180); }
      const after = await read(), observed = await evidence(); assert(after.frame > before.frame);
      const resourceCheck = verifyNoCombatGain(before, after, true);
      assert(observed.samples.filter(s => s.phase === 'fight').every(s => s.plasma === 0 && s.entities.length === 0));
      const draws = observed.draws.filter(d => d.phase === 'fight' && d.src.endsWith('/final-duel-' + facing + '.png'));
      assert(draws.length > 5, 'native ' + facing + ' page actually drawn'); assert(draws.every(d => d.a > 0 && d.d > 0 && d.b === 0 && d.c === 0));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await shot('jungle-final-no-cannon-' + facing + '-' + (mobile ? 'mobile' : 'desktop'));
      await returnPitSelection(page);
      const side = slot === 0 ? 'player' : 'opponent';
      assert.equal(await page.locator(`[data-selection-side="${side}"] [data-fighter-variant]`).getAttribute('data-fighter-variant'), variant);
      assert.equal(await storage(), saved); record('jungle-final-' + facing + '-' + (mobile ? 'mobile' : 'desktop'), { nativeFacing: facing, noMirroring: true, noPlasma: true, noOffensiveResourceGain: true, resourceCheck, selectionRetained: true });
    }
    if (!mobile) for (const slot of [0, 1]) {
      await select(slot === 0 ? ['falconer', 'city-hunter'] : ['city-hunter', 'falconer']);
      const key = slot === 0 ? 'KeyU' : 'Numpad7', side = slot === 0 ? 'left' : 'right';
      await page.keyboard.down('ArrowLeft'); await page.keyboard.down('Numpad6'); await page.waitForTimeout(800); await page.keyboard.up('ArrowLeft'); await page.keyboard.up('Numpad6');
      await page.waitForTimeout(100);
      const initial = await read(); await clearEvidence(); await press(key);
      await page.waitForFunction(id => JSON.parse(document.querySelector('canvas[data-pit-technique-entities]')?.dataset.pitTechniqueEntities || '[]').some(e => e.techniqueId === id), droneId);
      const called = (await read()).entities[0]; assert.equal(called.ownerSlot, slot);
      await page.waitForFunction(id => JSON.parse(document.querySelector('canvas[data-pit-technique-entities]')?.dataset.pitTechniqueEntities || '[]').some(e => e.id === id && e.age >= 24), called.id);
      await press(key);
      await page.waitForFunction(id => JSON.parse(document.querySelector('canvas[data-pit-technique-entities]')?.dataset.pitTechniqueEntities || '[]').some(e => e.id === id && e.phase === 'returning'), called.id);
      assert.match(await page.locator(`[data-pit-drone-phase="${side}"]`).innerText(), /RETOUR/);
      await shot('falconer-recall-slot-' + slot);
      await page.waitForFunction(() => JSON.parse(document.querySelector('canvas[data-pit-technique-entities]')?.dataset.pitTechniqueEntities || '[]').length === 0);
      const recall = await evidence(); assert(recall.samples.every(s => s.entities.length <= 1));
      assert.deepEqual([...new Set(recall.samples.flatMap(s => s.entities.map(e => e.id)))], [called.id]);
      assert(recall.samples.some(s => s.entities.some(e => e.phase === 'returning' && e.age < 72)), 'manual recall before automatic return');
      const recallResource = verifyNoCombatGain(initial, await read(), false);
      // Fresh real bout: pressure has run at the unchanged spawn distance since
      // tick 0, so its exact gain is computable without injecting/reading engine state.
      await returnPitSelection(page);
      await select(slot === 0 ? ['falconer', 'city-hunter'] : ['city-hunter', 'falconer']);
      const scanBefore = await read(); await clearEvidence(); await press(key);
      await page.waitForFunction(slot => [...document.querySelectorAll('[aria-label^="États de"]')][1 - slot]?.textContent.includes('TRAQUÉ'), slot);
      await shot('falconer-scan-slot-' + slot);
      await page.waitForFunction(() => JSON.parse(document.querySelector('canvas[data-pit-technique-entities]')?.dataset.pitTechniqueEntities || '[]').length === 0);
      const scanned = await read(), scanEvidence = await evidence();
      const scanResource = verifyNoCombatGain(scanBefore, scanned, true);
      assert(scanEvidence.samples.some(s => s.entities.some(e => e.hitCount === 1 && e.phase === 'returning')));
      assert(scanEvidence.samples.every(s => s.entities.length <= 1 && s.plasma === 0));
      assert.match(scanned.statuses[1 - slot], /TRAQUÉ/);
      record('falconer-slot-' + slot, { sameEntityOnRecall: called.id, manualRecall: true, singleSensor: true, scanApplied: true, noDamageOrOffensiveResourceGain: true, recallResource, scanResource, actualFrames: scanEvidence.samples.length });
      await returnPitSelection(page); assert.equal(await storage(), saved);
    }
    await context.close(); context = null; page = null;
  }
  assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []); assert.deepEqual(httpFailures, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ status: 'PASS', version: 'V57', url, checkedAt: new Date().toISOString(), checks, captures, errors, consoleErrors, httpFailures, allLocalStorageBytesUnchanged: true,
    scope: 'Real roster/stage flow and keyboard in isolated synthetic-save contexts. Passive Canvas/DOM observations only. Two held native Jungle poses, no new animation. Falconer scan/recall tested on both sides; engine/replay regression verified separately.', visualInspection: 'pending independent screenshot review' }, null, 2) + '\n');
} catch (error) {
  if (page) await shot('failure').catch(() => {});
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), stack: error.stack, checks, captures, errors, consoleErrors, httpFailures, state: page ? await read().catch(() => null) : null, evidence: page ? await evidence().catch(() => null) : null }, null, 2));
  throw error;
} finally { await context?.close().catch(() => {}); await browser?.close(); }
