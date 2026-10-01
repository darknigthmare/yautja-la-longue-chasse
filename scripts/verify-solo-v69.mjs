import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { homeworldQaModelV64 } from './homeworld-qa-model-v64.mjs';
import { homeworldNavigatorV66 } from './homeworld-navigation-browser-v66.mjs';
import { cohortCampaignRoute } from '../tests/helpers/solo-v68-played-route.mjs';
import { p } from '../tests/helpers/solo-v67-campaign-route.mjs';
import { thresholdsInput } from '../tests/helpers/solo-v69-played-route.mjs';

const url = process.env.V69_QA_URL ?? 'http://127.0.0.1:4187';
const output = process.env.V69_SOLO_QA_OUTPUT ?? 'work-local/v69/solo-browser';
const original = cohortCampaignRoute().save, key = 'yautja-long-hunt.save';
const fixture = new Map([[key, JSON.stringify(original)]]), store = { getItem: k => fixture.get(k) ?? null, setItem: (k, v) => fixture.set(k, v), removeItem: k => fixture.delete(k) };
const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (_name, _options, callback) => callback({}) } } });
try {
  assert((await p.migrateLegacyCampaignSlot(store)).ok);
  const slot = JSON.parse(store.getItem(p.campaignSlotStorageKey(1)));
  assert((await p.saveCampaignCheckpoint(1, { kind: 'auto', expectedRevision: slot.revision, location: 'homeworld' }, store)).ok);
} finally { if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator); else delete globalThis.navigator; }
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); page.setDefaultTimeout(60000);
const errors = [], failures = [], checks = [], captures = [], keys = new Set();
page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() >= 400) failures.push({ url: r.url(), status: r.status() }); });
const canvas = page.locator('[data-solo-v69] canvas');
const saved = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
const capture = async name => { const path = output + '/' + name + '.jpg'; await page.screenshot({ path, type: 'jpeg', quality: 85 }); captures.push(path); };
async function apply(desired) { for (const key of keys) if (!desired.has(key)) { await page.keyboard.up(key); keys.delete(key); } for (const key of desired) if (!keys.has(key)) { await page.keyboard.down(key); keys.add(key); } }
const bindings = original.settings.controlBindings, action = { left: bindings['pit.p1MoveLeft'][0], right: bindings['pit.p1MoveRight'][0], jump: bindings['pit.p1Jump'][0], command: bindings['pit.p1AttackMedium'][0], interact: bindings['pit.p1Resource'][0] };
const read = async () => canvas.evaluate(e => {
  const d = e.dataset;
  return { phase: d.soloPhase, tick: Number(d.soloTick), inputArmed: d.soloArmed === 'true', paused: d.soloPaused === 'true',
    player: { x: Number(d.soloX), y: Number(d.soloY), vx: Number(d.soloVx), vy: Number(d.soloVy), facing: Number(d.soloFacing), crouched: d.soloCrouched === 'true' },
    veteran: { x: Number(d.soloVeteranX), facing: Number(d.soloVeteranFacing) }, observedTurns: Number(d.soloObservedTurns), observedTicks: Number(d.soloObservedTicks), shadowPosts: Number(d.soloShadowPosts), alarm: Number(d.soloAlarm), detections: Number(d.soloDetections),
    gateTimers: JSON.parse(d.soloGateTimers), gatesCrossed: Number(d.soloGatesCrossed), trainee: { x: Number(d.soloTraineeX), following: d.soloTraineeFollowing === 'true' }, waitingSignal: d.soloWaitingSignal === 'true', scouted: d.soloScouted === 'true', escortSignals: Number(d.soloEscortSignals), scan: Number(d.soloScan), walked: Number(d.soloWalked) };
});
try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.evaluate(entries => { if (localStorage.length) throw Error('Fresh isolated browser required'); for (const [key, value] of entries) localStorage.setItem(key, value); }, [...fixture]);
  await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('button', { name: /^Continuer/ }).click(); await page.locator('[data-homeworld-hub]').waitFor();
  await page.clock.install(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000)); await page.clock.runFor(200);
  const navigator = homeworldNavigatorV66(page, homeworldQaModelV64()); await navigator.openPoint('training-service'); await page.locator('[data-solo-v69-enter]').waitFor(); await capture('01-physical-mentor-start'); await page.locator('[data-solo-v69-enter]').click();
  await canvas.waitFor(); await page.clock.runFor(200);
  for (let i = 0; i < 40 && await canvas.getAttribute('data-solo-assets') !== 'true'; i++) { await page.waitForTimeout(100); await page.clock.runFor(100); }
  assert.equal(await canvas.getAttribute('data-solo-assets'), 'true'); await canvas.focus(); checks.push({ name: 'prior-chain-played-fixture-only-physical-mentor-start', routes: navigator.routes });
  let previousPhase = '', quotaChecked = false, resumed = false, settingsChecked = false, touchChecked = false, expiredChecked = false, i = 0;
  for (; i < 5000; i++) {
    let s = await read(); if (s.phase === 'complete') break;
    if (s.phase !== previousPhase) { await apply(new Set()); await page.clock.runFor(80); previousPhase = s.phase; await capture('phase-' + s.phase); s = await read(); }
    if (s.phase === 'signals' && !quotaChecked && !s.paused) {
      await apply(new Set()); await page.evaluate(k => { window.__thresholdSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function (name, value) { if (name === k) throw new DOMException('QA isolated quota', 'QuotaExceededError'); return window.__thresholdSetItem.call(this, name, value); }; }, key);
      await page.clock.runFor(2500); await page.locator('[data-solo-v69]').getByRole('alert').waitFor(); const frozen = await read(); await page.clock.runFor(1000); assert.equal((await read()).tick, frozen.tick); assert.equal((await saved()).soloV69.receipts.length, 2);
      await capture('quota-retains-observation'); await page.evaluate(() => { Storage.prototype.setItem = window.__thresholdSetItem; }); await page.locator('[data-solo-v69]').getByRole('button', { name: 'Reprendre', exact: true }).click(); await page.clock.runFor(100); await canvas.focus();
      quotaChecked = true; checks.push({ name: 'quota-freezes-observation-proof-and-retries-same-scene', tick: frozen.tick }); continue;
    }
    if (s.phase === 'stealth' && !touchChecked && !s.paused) {
      await apply(new Set()); await page.setViewportSize({ width: 393, height: 852 }); await page.getByRole('button', { name: 'Tactile', exact: true }).click(); await page.clock.runFor(80); await capture('portrait-stealth-controls');
      const bounds = await page.locator('[data-solo-v69] button:visible').evaluateAll(nodes => nodes.map(n => { const b = n.getBoundingClientRect(); return { label: n.textContent, x: b.x, y: b.y, right: b.right, bottom: b.bottom, height: b.height }; })); assert(bounds.every(b => b.x >= 0 && b.y >= 0 && b.right <= 394 && b.bottom <= 853 && b.height >= 44));
      const before = await read(), button = await page.locator('[data-solo-action="left"]').boundingBox(); assert(button); const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: button.x + button.width / 2, y: button.y + button.height / 2 }] }); await page.clock.runFor(200); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.clock.runFor(80); assert((await read()).player.x < before.player.x - 5); await cdp.detach();
      await page.setViewportSize({ width: 1280, height: 800 }); await canvas.focus(); touchChecked = true; checks.push({ name: 'portrait-native-view-controls-and-real-touch-movement', bounds }); continue;
    }
    if (s.phase === 'gate-second' && !resumed && !s.paused) {
      await apply(new Set()); await page.getByRole('button', { name: 'Pause', exact: true }).click(); await page.clock.runFor(100); const frozen = await read(); await page.clock.runFor(1000); assert.equal((await read()).tick, frozen.tick);
      await page.getByRole('button', { name: 'Sauvegarder et quitter', exact: true }).click(); await page.clock.runFor(100); assert.equal((await saved()).soloV69.checkpoint.tick, frozen.tick);
      await page.clock.resume(); await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('button', { name: /^Continuer/ }).click(); await canvas.waitFor(); await page.waitForFunction(() => document.querySelector('[data-solo-v69] canvas')?.dataset.soloAssets === 'true', null, { timeout: 120000 });
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000)); await page.clock.runFor(100); await canvas.focus(); assert.equal((await read()).phase, 'gate-second'); assert.equal((await saved()).soloV69.receipts.length, 5); resumed = true;
      checks.push({ name: 'first-sas-proof-cold-resume-without-replaying-prior-chapter', tick: frozen.tick }); continue;
    }
    if (s.phase === 'gate-second' && s.gateTimers[1] > 0 && !expiredChecked && !s.paused) {
      await apply(new Set()); await page.clock.runFor(4200); const expired = await read(); assert.equal(expired.gateTimers[1], 0); assert.equal(expired.gatesCrossed, 1); assert.equal((await saved()).soloV69.receipts.length, 5); await capture('gate-window-expired-prior-sas-retained');
      expiredChecked = true; checks.push({ name: 'timed-sas-expiration-retry-retains-first-sas', x: expired.player.x }); continue;
    }
    if (s.phase === 'escort' && !settingsChecked && !s.paused) {
      await apply(new Set()); await page.getByRole('button', { name: 'Pause', exact: true }).click(); await page.clock.runFor(80); await page.locator('[data-solo-v69]').getByRole('button', { name: 'Réglages', exact: true }).click(); await page.clock.runFor(120);
      const settings = page.getByRole('dialog', { name: 'Réglages du biomask' }); await settings.waitFor(); const frozen = await read(); await page.clock.runFor(1800); const after = await read(); assert.equal(after.tick, frozen.tick); assert.equal(after.trainee.x, frozen.trainee.x);
      await settings.getByRole('button', { name: 'Fermer', exact: true }).click(); await page.clock.runFor(80); await page.locator('[data-solo-v69]').getByRole('button', { name: 'Reprendre', exact: true }).click(); await page.clock.runFor(80); await canvas.focus();
      settingsChecked = true; checks.push({ name: 'settings-freeze-hazard-escort-and-durable-clock', tick: frozen.tick }); continue;
    }
    if (s.paused && await page.locator('[data-solo-v69]').getByRole('alert').isVisible()) throw Error('Unexpected durable checkpoint refusal: ' + await page.locator('[data-solo-v69]').getByRole('alert').innerText());
    if (s.paused || !s.inputArmed) { await apply(new Set()); await canvas.focus(); await page.clock.runFor(100); continue; }
    const input = thresholdsInput({ ...s, previousJump: keys.has(action.jump), previousInteract: keys.has(action.interact), previousCommand: keys.has(action.command) });
    const desired = new Set(); if (input.move) desired.add(input.move < 0 ? action.left : action.right); if (input.jump) desired.add(action.jump); if (input.interact) desired.add(action.interact); if (input.command) desired.add(action.command);
    await apply(desired); await page.clock.runFor(50);
  }
  assert(i < 5000, 'actual playable preparation completed'); await apply(new Set()); await page.clock.runFor(200);
  const complete = await saved(); assert.equal(complete.soloV69.status, 'completed'); assert.equal(complete.soloV69.receipts.length, 12); assert.equal(p.getChronicleRank(complete.prologue.chronicle), 'young-blood');
  for (const field of ['prologue', 'inventory', 'statistics', 'loadout', 'youthTraining', 'soloV66', 'soloV67', 'soloV68']) assert.deepEqual(complete[field], original[field]);
  assert(complete.soloV69.checkpoint.walked >= 10500); assert(complete.soloV69.checkpoint.trainee.reached); assert(complete.soloV69.checkpoint.waitingSignal && complete.soloV69.checkpoint.scouted); assert(p.parseSaveImport(JSON.stringify(complete)).save);
  await capture('preparation-complete-no-Blooded'); await page.locator('[data-solo-return]').click(); await page.clock.runFor(200); await page.locator('[data-homeworld-hub]').waitFor();
  await page.clock.resume(); await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('button', { name: /^Continuer/ }).click(); await page.locator('[data-homeworld-hub]').waitFor(); assert.equal((await saved()).soloV69.receipts.length, 12); await page.waitForTimeout(700); await capture('durable-city-return');
  const hub = page.locator('[data-homeworld-hub]'); await hub.getByRole('button', { name: 'Navigation', exact: true }).click(); const welcome = hub.locator('[data-unblooded-welcome]'); await welcome.waitFor(); assert.equal((await welcome.locator('h2').innerText()).trim(), 'Young Blood — Les seuils maîtrisés'); assert.match(await welcome.innerText(), /encore Young Blood/); await capture('preparation-welcome-after-reload');
  checks.push({ name: '12-proofs-scout-sas-novice-and-physical-return-survive-reload-without-granting-Blooded', noNewRiteWeaponShipOrKill: true });
  assert(quotaChecked && resumed && settingsChecked && touchChecked && expiredChecked); assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  const report = { status: 'PASS', url, checks, captures, errors, failures, limits: 'Fresh isolated browser. Only the initial after-V68 fixture is supplied, played through prior actual models. V69 uses public keyboard/touch input and declared quota injection; no actor coordinates, counters or receipts injected. Existing native training art reused. This is preparation, not a Temple/xenomorph encounter or Blooded rite.' };
  await fs.writeFile(output + '/report.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify({ status: report.status, checks: checks.length, captures: captures.length, output }));
} catch (error) { await capture('failure').catch(() => {}); const lastPhysicalState = await canvas.evaluate(e => ({ ...e.dataset })).catch(() => null), lastDurableState = await saved().then(s => s.soloV69).catch(() => null); await fs.writeFile(output + '/report.json', JSON.stringify({ status: 'FAIL', url, error: String(error), lastPhysicalState, lastDurableState, checks, captures, errors, failures }, null, 2)); throw error; }
finally { await browser.close(); }
