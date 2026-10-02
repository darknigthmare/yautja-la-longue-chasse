import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { homeworldQaModelV64 } from './homeworld-qa-model-v64.mjs';
import { homeworldNavigatorV66 } from './homeworld-navigation-browser-v66.mjs';
import { firstTracksCompleted, p } from '../tests/helpers/solo-v67-campaign-route.mjs';

const url = process.env.V75_QA_URL ?? 'http://localhost:4193';
const output = process.env.V75_WAYFINDING_QA_OUTPUT ?? 'work-local/v75/qa/wayfinding-candidate';
const expectedVersion = process.env.YAUTJA_QA_EXPECTED_VERSION ?? 'V75';
const naturalDevHydration = process.env.V75_QA_NATURAL_HYDRATION === '1';
await fs.mkdir(output, { recursive: true });
const api = homeworldQaModelV64(process.cwd(), ['homeworldWayfindingV75.ts', 'homeworld.ts', 'homeworldCity.ts', 'homeworldSpatialCodex.ts', 'homeworldInteriorsV64.ts', 'homeworldGeometryV64.ts']);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [], captures = [], errors = [], failures = [], consoleErrors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(60000); page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
const fixture = firstTracksCompleted();
const actor = () => page.locator('[data-homeworld-actor]').evaluate(e => ({ x: Number(e.dataset.x), y: Number(e.dataset.y) }));
const saved = () => page.evaluate(key => localStorage.getItem(key), p.SAVE_STORAGE_KEY);
const time = () => page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds');
const dialog = () => page.getByRole('dialog', { name: 'Repères pratiques', exact: true });
const guide = () => page.locator('[data-homeworld-wayfinding-guide]');
const roomId = () => page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id');
async function capture(name) { const path = output + '/' + name + '.png'; await page.screenshot({ path }); captures.push(path); }
let nav;
async function openFinder() { await page.getByRole('button', { name: 'Repères', exact: true }).click(); await dialog().waitFor(); await nav.tick(120); }
async function closeFinder() { await page.keyboard.press('Escape'); await nav.tick(120); await dialog().waitFor({ state: 'hidden' }); assert(await page.locator('[data-homeworld-viewport]').evaluate(e => document.activeElement === e), 'Host restores world focus before QA helper'); }
async function choose(id, search = '') {
  await openFinder(); await dialog().getByRole('button', { name: 'Tous', exact: true }).click(); await dialog().getByRole('searchbox').fill(search); await dialog().locator('[data-wayfinding-destination="' + id + '"]').click();
  assert.equal(await dialog().locator('[data-wayfinding-detail]').getAttribute('data-wayfinding-detail'), id);
}
async function followSelected(id) {
  const from = await actor(), inside = await roomId(), plan = api.homeworldWayfindingPlanV75(fixture, from, inside, id);
  assert.equal(plan.status, 'reachable', id + ' actual model route');
  await dialog().getByRole('button', { name: 'Suivre à pied ce repère', exact: true }).click(); await nav.tick(150);
  assert.equal(await guide().getAttribute('data-wayfinding-target'), id); assert.deepEqual(await actor(), from, 'Selecting a guide never moves actor');
  for (const stage of plan.stages) {
    assert.equal((await roomId()) ?? 'city', stage.space);
    await nav.focus(); await nav.follow(stage.route.points); await nav.tick(450);
    assert.equal(await guide().getAttribute('data-homeworld-wayfinding-guide'), 'arrived', stage.space + ' public arrival');
    await capture('arrival-' + id.replace(/:/g, '-') + '-' + stage.space);
    if (stage !== plan.stages.at(-1)) { await page.keyboard.press('KeyE'); await nav.tick(180); }
  }
  checks.push({ name: 'physical-stage-route-followed-by-keyboard', id, spaces: plan.stages.map(s => s.space), distance: plan.distance, final: await actor(), noActorMutation: true });
}
try {
  await page.addInitScript(({ key, save }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save)); }, { key: p.SAVE_STORAGE_KEY, save: fixture });
  // Dev hydration can be stalled by the fake-clock bootstrap. Candidate-only
  // mode leaves startup natural, then takes control after real preload readiness.
  // Final compiled/local and public gates install before mount like V74.
  if (!naturalDevHydration) await page.clock.install(); await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^Continuer/ }).click(); await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({ timeout: 120000 });
  if (naturalDevHydration) await page.clock.install();
  assert.equal(await page.locator('main').getAttribute('data-game-content-version'), expectedVersion);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 150));
  nav = homeworldNavigatorV66(page, api, { driverTickMs: 16, waypointTolerance: 3, pulseInputs: true }); await nav.focus();
  checks.push({ name: 'compiled-version-and-native-motion-readiness', expectedVersion });
  assert.equal(await page.getByRole('button', { name: 'Repères', exact: true }).count(), 1, 'One host entry button');
  await openFinder(); const before = await actor(), beforeSave = await saved(), beforeTime = await time();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('KeyE'); await nav.tick(1200);
  assert.deepEqual(await actor(), before); assert.equal(await saved(), beforeSave); assert.equal(await time(), beforeTime);
  assert(await dialog().getByRole('searchbox').evaluate(e => document.activeElement === e));
  checks.push({ name: 'search-focus-modal-freezes-world-input-time-and-save' });
  await dialog().getByRole('searchbox').fill('memoire'); assert(await dialog().locator('[data-wayfinding-destination="point:memory-service"]').count());
  await dialog().getByRole('searchbox').fill('not present 172943'); assert.equal(await dialog().locator('[data-wayfinding-destination]').count(), 0);
  assert.equal(await dialog().locator('[data-wayfinding-detail]').count(), 0, 'An empty search has no unrelated actionable old detail');
  await dialog().getByRole('searchbox').fill(''); await dialog().getByRole('button', { name: 'Sorties', exact: true }).click();
  assert.equal(await dialog().locator('[data-wayfinding-destination]').count(), 9);
  assert.equal(await dialog().locator('[data-wayfinding-destination="region:forbidden-reserve"]').count(), 0);
  checks.push({ name: 'accent-search-empty-results-and-sensitive-Reserve-hidden' });
  const focusable = dialog().locator('button:not(:disabled),input:not(:disabled),[tabindex="0"]');
  await focusable.last().focus(); await page.keyboard.press('Tab'); assert(await focusable.first().evaluate(e => document.activeElement === e));
  await page.keyboard.press('Shift+Tab'); assert(await focusable.last().evaluate(e => document.activeElement === e));
  await capture('desktop-modal-physical-exits'); await closeFinder(); await nav.tick(500); assert.deepEqual(await actor(), before);
  checks.push({ name: 'focus-trap-Escape-focus-return-and-no-held-input' });
  await choose('point:dock-officer-point', 'amarrage'); await capture('desktop-door-and-officer-detail'); await followSelected('point:dock-officer-point');
  await page.keyboard.press('KeyE'); await nav.tick(120); await page.locator('[data-homeworld-hub]').getByRole('dialog').waitFor(); await capture('officer-real-dialogue-not-auto-granted'); await nav.closeDialog();
  checks.push({ name: 'guide-arrival-does-not-open-or-complete-dialogue-without-interaction' });
  await choose('point:market-service', 'armurerie'); assert.equal(await dialog().locator('[data-wayfinding-selected-access]').getAttribute('data-wayfinding-selected-access'), 'restricted');
  assert.equal(await dialog().getByRole('button', { name: 'Suivre à pied ce repère' }).isEnabled(), true);
  await capture('youth-station-access-distinct-from-door'); await followSelected('point:market-service');
  await page.keyboard.press('KeyE'); await nav.tick(120); const stationDialog = page.locator('[data-homeworld-hub]').getByRole('dialog'); await stationDialog.waitFor();
  await capture('reserved-armory-real-interaction'); await nav.closeDialog();
  const afterWalk = await saved(), heldPosition = await actor(); await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const frozenTime = await time(); await nav.tick(1500); assert.equal(await time(), frozenTime); assert.deepEqual(await actor(), heldPosition); assert.equal(await saved(), afterWalk);
  assert.equal(await guide().getAttribute('data-wayfinding-paused'), 'true'); await capture('paused-held-guide');
  await page.getByRole('button', { name: 'Reprendre', exact: true }).click(); await nav.tick(150); assert(await page.locator('[data-homeworld-viewport]').evaluate(e => document.activeElement === e));
  checks.push({ name: 'pause-freezes-held-guide-world-and-save-HUD-resume-focus' });

  await page.setViewportSize({ width: 393, height: 852 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await nav.tick(150);
  await openFinder(); await dialog().getByRole('button', { name: 'Objectif actuel', exact: true }).click();
  const viewport = await page.locator('[data-homeworld-viewport]').boundingBox(), modal = await dialog().boundingBox();
  assert(modal.x >= viewport.x - 1 && modal.y >= viewport.y - 1 && modal.x + modal.width <= viewport.x + viewport.width + 1 && modal.y + modal.height <= viewport.y + viewport.height + 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await capture('mobile-portrait-modal-objective-reduced-motion');
  await dialog().getByRole('button', { name: 'Services', exact: true }).click(); await dialog().getByRole('searchbox').fill('memoire');
  await dialog().locator('[data-wayfinding-destination="point:memory-service"]').click(); await capture('mobile-portrait-search-and-detail');
  await dialog().getByRole('button', { name: 'Suivre à pied ce repère', exact: true }).scrollIntoViewIfNeeded();
  const button = await dialog().getByRole('button', { name: 'Suivre à pied ce repère', exact: true }).boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const tap = { x: button.x + button.width / 2, y: button.y + button.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [tap] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await nav.tick(200);
  assert.equal(await dialog().count(), 0); assert.equal(await guide().getAttribute('data-wayfinding-target'), 'point:memory-service'); assert.deepEqual(await actor(), heldPosition);
  const guideBox = await guide().boundingBox(); assert(guideBox.x >= viewport.x - 1 && guideBox.x + guideBox.width <= viewport.x + viewport.width + 1);
  const heroBox = await page.locator('[data-homeworld-actor] [data-motion-version="74"]').boundingBox();
  const promptNode = page.locator('[data-homeworld-viewport] > button').first();
  const promptBox = await promptNode.count() ? await promptNode.boundingBox() : null;
  const overlaps = box => box && guideBox.x < box.x + box.width && guideBox.x + guideBox.width > box.x && guideBox.y < box.y + box.height && guideBox.y + guideBox.height > box.y;
  assert(!overlaps(heroBox), 'Compact portrait guidance clears native hero source box');
  assert(!overlaps(promptBox), 'Compact portrait guidance clears the real interaction prompt');
  await capture('mobile-portrait-held-guide-real-touch-selection');
  checks.push({ name: 'mobile-contained-modal-search-real-touch-guide-no-auto-walk-reduced-motion', viewport, modal, guideBox, heroBox, promptBox });
  const clearPosition = await actor(), clearSave = await saved();
  await guide().getByRole('button', { name: 'Effacer le repère', exact: true }).click(); await nav.tick(120); assert.equal(await guide().count(), 0);
  assert.deepEqual(await actor(), clearPosition); assert.equal(await saved(), clearSave);
  checks.push({ name: 'held-guide-can-be-cleared-without-state-or-coordinate-change' });
  assert.equal(errors.length, 0, JSON.stringify(errors)); assert.equal(failures.length, 0, JSON.stringify(failures));
  if (!naturalDevHydration) assert.equal(consoleErrors.length, 0, JSON.stringify(consoleErrors));
} catch (error) { errors.push({ testFailure: error.stack }); try { checks.push({ name: 'failure-read-only-diagnostics', diagnostic: await page.evaluate(key => ({
    keyCount: localStorage.length, keys: Object.keys(localStorage), fixtureBytes: localStorage.getItem(key)?.length ?? 0,
    bodyEnd: document.body.innerText.slice(-1200), documentState: document.readyState,
  }), p.SAVE_STORAGE_KEY) }); await capture('FAIL'); } catch {} }
finally {
  await fs.writeFile(output + '/report.json', JSON.stringify({ status: errors.length || failures.length ? 'FAIL' : 'PASS', url, expectedVersion, naturalDevHydration, checks, captures, errors, failures, consoleErrors,
    limits: ['Prerequisites are seeded from a save produced by actual campaign model play, not a full browser replay of every chapter.', 'Movement uses public keyboard events and touch selection; no private actor/phase edits, teleport, save rewards or proof fabrication.', 'Routes for all 43 doors and points are additionally checked by the dedicated real model tests.', 'Mobile is Chrome emulation, not an actual phone.'] }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ status: errors.length || failures.length ? 'FAIL' : 'PASS', checks: checks.length, captures: captures.length, output }));
if (errors.length || failures.length) process.exitCode = 1;
