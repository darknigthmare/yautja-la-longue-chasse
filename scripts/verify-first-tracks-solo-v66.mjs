import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { homeworldQaModelV64 } from './homeworld-qa-model-v64.mjs';
import { cageRoute, p } from '../tests/helpers/youth-cage-played-route.mjs';
import { soloInput } from '../tests/helpers/solo-v66-played-route.mjs';

const url = process.env.V66_QA_URL ?? 'http://127.0.0.1:4182';
const output = process.env.V66_SOLO_QA_OUTPUT ?? 'work-local/v66/solo-browser';
const original = cageRoute().save, key = 'yautja-long-hunt.save';
const fixture = new Map([[key, JSON.stringify(original)]]);
const store = { getItem: k => fixture.get(k) ?? null, setItem: (k, v) => fixture.set(k, v), removeItem: k => fixture.delete(k) };
const savedNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (_name, _options, callback) => callback({}) } } });
try {
  const result = await p.migrateLegacyCampaignSlot(store); assert(result.ok, result.message);
  const slot = JSON.parse(store.getItem(p.campaignSlotStorageKey(1)));
  const checkpoint = await p.saveCampaignCheckpoint(1, { kind: 'auto', expectedRevision: slot.revision, location: 'homeworld' }, store); assert(checkpoint.ok, checkpoint.message);
} finally { if (savedNavigator) Object.defineProperty(globalThis, 'navigator', savedNavigator); else delete globalThis.navigator; }
const model = homeworldQaModelV64();
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(60000);
const errors = [], failures = [], checks = [], events = [], keys = new Set();
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
page.on('framenavigated', frame => { if (frame === page.mainFrame()) events.push({ navigation: frame.url(), at: new Date().toISOString() }); });
page.on('console', message => { if (/Fast Refresh|HMR/i.test(message.text())) events.push({ dev: message.text(), at: new Date().toISOString() }); });
const saved = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
const screenshot = name => page.screenshot({ path: output + '/' + name + '.jpg', type: 'jpeg', quality: 85 });
async function apply(desired) {
  for (const key of keys) if (!desired.has(key)) { await page.keyboard.up(key); keys.delete(key); }
  for (const key of desired) if (!keys.has(key)) { await page.keyboard.down(key); keys.add(key); }
}
const actor = () => page.locator('[data-homeworld-actor]').evaluate(e => ({ x: Number(e.dataset.x), y: Number(e.dataset.y) }));
async function focusCity() { const city = page.locator('[data-homeworld-viewport]'); await city.waitFor(); await page.waitForTimeout(180); await city.focus(); }
async function drive(target) {
  for (let i = 0; i < 700; i++) {
    const p = await actor(), dx = target.x - p.x, dy = target.y - p.y;
    if (Math.abs(dx) < 7 && Math.abs(dy) < 7) { await apply(new Set()); const end = await actor(); if (Math.abs(end.x - target.x) < 9 && Math.abs(end.y - target.y) < 9) return; }
    const desired = new Set(); if (Math.abs(dx) >= 7) desired.add(dx < 0 ? 'ArrowLeft' : 'ArrowRight'); if (Math.abs(dy) >= 7) desired.add(dy < 0 ? 'ArrowUp' : 'ArrowDown');
    await apply(desired); await page.waitForTimeout(24);
  }
  throw Error('Cannot reach physical target ' + JSON.stringify(target));
}
async function follow(points) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 32));
    for (let j = 1; j <= n; j++) await drive({ x: a.x + (b.x - a.x) * j / n, y: a.y + (b.y - a.y) * j / n });
  }
}
function insideRoute(room, from) {
  const queue = [from], previous = new Map(), points = new Map(), seen = new Set(); let last;
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i], k = p.x + ',' + p.y; if (seen.has(k)) continue; seen.add(k); points.set(k, p);
    const target = model.nearestHomeworldInteriorTargetV64(room, p);
    if (target?.pointId === 'training-service' && Math.hypot(p.x - target.position.x, p.y - target.position.y) < 48) { last = k; break; }
    for (const [dx, dy] of [[8, 0], [-8, 0], [0, 8], [0, -8]]) { const q = { x: p.x + dx, y: p.y + dy }, id = q.x + ',' + q.y; if (!seen.has(id) && !previous.has(id) && model.isHomeworldInteriorWalkableV64(room, q)) { previous.set(id, k); queue.push(q); } }
  }
  assert(last); const route = []; while (last) { route.push(points.get(last)); last = previous.get(last); } return route.reverse();
}
try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.evaluate(entries => { if (localStorage.length) throw Error('Fresh isolated browser required'); for (const [key, value] of entries) localStorage.setItem(key, value); }, [...fixture]);
  await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('button', { name: /^Continuer/ }).click(); await focusCity();
  assert.equal((await saved()).soloV66 ?? null, null);
  const building = model.HOMEWORLD_BUILDINGS.find(b => b.id === 'training-hall'), doorway = model.homeworldBuildingDoorwayV64(building);
  const route = model.homeworldSpatialRoute(await actor(), doorway.approach); assert.equal(route.status, 'reachable');
  await follow(route.points); await apply(new Set()); await page.keyboard.press('KeyE');
  await page.locator('[data-homeworld-interior-id="training-hall"]').waitFor(); await focusCity();
  const room = model.homeworldInteriorForBuildingV64('training-hall'); await follow(insideRoute(room, await actor()));
  await apply(new Set()); await page.keyboard.press('KeyE'); await page.locator('[data-solo-v66-enter]').waitFor();
  await screenshot('mentor-explicit-departure'); await page.locator('[data-solo-v66-enter]').click();
  const canvas = page.locator('[data-solo-v66] canvas'); await canvas.waitFor();
  await page.waitForFunction(() => document.querySelector('[data-solo-v66] canvas')?.dataset.soloAssets === 'true', null, { timeout: 120000 });
  await canvas.focus(); await page.clock.install(); await page.clock.runFor(100);
  checks.push({ name: 'physically-entered-dojo-explicit-start', routeDistance: route.distance, earlierYouthProofs: 20 });
  const read = () => canvas.evaluate(e => ({ phase: e.dataset.soloPhase, tick: Number(e.dataset.soloTick), player: { x: Number(e.dataset.soloX), y: Number(e.dataset.soloY), vy: Number(e.dataset.soloVy) }, inputArmed: e.dataset.soloArmed === 'true', clues: Number(e.dataset.soloClues), alert: Number(e.dataset.soloAlert), observationTicks: Number(e.dataset.soloObservation), attempts: Number(e.dataset.soloAttempts), paused: e.dataset.soloPaused === 'true' }));
  const bindings = original.settings.controlBindings, action = { left: bindings['pit.p1MoveLeft'][0], right: bindings['pit.p1MoveRight'][0], jump: bindings['pit.p1Jump'][0], interact: bindings['pit.p1Resource'][0] };
  let reloaded = false, quotaChecked = false, previousPhase = '', i = 0;
  for (; i < 2500; i++) {
    let s = await read(); if (s.phase === 'complete') break;
    if (s.phase !== previousPhase) { await apply(new Set()); await page.clock.runFor(80); previousPhase = s.phase; await screenshot('phase-' + s.phase); s = await read(); }
    if (s.phase === 'trail' && s.clues === 0 && !quotaChecked) {
      await apply(new Set());
      await page.evaluate(k => { window.__soloSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function (name, value) { if (name === k) throw new DOMException('QA isolated quota', 'QuotaExceededError'); return window.__soloSetItem.call(this, name, value); }; }, key);
      await page.getByRole('button', { name: 'Pause', exact: true }).click(); await page.clock.runFor(100); const paused = await read(); await page.clock.runFor(1200); assert.equal((await read()).tick, paused.tick);
      assert.equal((await saved()).soloV66.receipts.length, 1); await page.locator('[data-solo-v66]').getByRole('alert').waitFor(); await screenshot('quota-retains-scene');
      await page.evaluate(() => { Storage.prototype.setItem = window.__soloSetItem; }); await page.getByRole('button', { name: 'Reprendre', exact: true }).click(); await page.clock.runFor(100); await canvas.focus(); quotaChecked = true;
      checks.push({ name: 'refused-checkpoint-freezes-and-retries', tick: paused.tick, receiptsRetained: 1 }); continue;
    }
    if (s.phase === 'stalk' && !reloaded) {
      await apply(new Set()); await page.getByRole('button', { name: 'Pause', exact: true }).click(); await page.clock.runFor(100);
      const frozen = await read(); await page.clock.runFor(1300); assert.equal((await read()).tick, frozen.tick);
      await screenshot('stalk-paused'); await page.getByRole('button', { name: 'Sauvegarder et quitter', exact: true }).click(); await page.clock.runFor(100);
      assert.equal((await saved()).soloV66.checkpoint.tick, frozen.tick);
      await page.clock.resume(); await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('button', { name: /^Continuer/ }).click();
      await page.waitForFunction(() => document.querySelector('[data-solo-v66] canvas')?.dataset.soloAssets === 'true', null, { timeout: 120000 });
      await canvas.focus(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000)); await page.clock.runFor(100);
      assert.equal((await read()).phase, 'stalk'); assert.equal((await saved()).soloV66.receipts.length, 4);
      await page.setViewportSize({ width: 393, height: 852 }); await page.getByRole('button', { name: 'Tactile', exact: true }).click(); await page.clock.runFor(100); await screenshot('mobile-stalk');
      const bounds = await page.locator('[data-solo-v66] button:visible').evaluateAll(nodes => nodes.map(n => { const b = n.getBoundingClientRect(); return { text: n.textContent, x: b.x, y: b.y, right: b.right, bottom: b.bottom, width: b.width, height: b.height }; }));
      assert(bounds.every(b => b.x >= 0 && b.y >= 0 && b.right <= 394 && b.bottom <= 853 && b.height >= 44));
      const beforeTouch = await read(), button = await page.locator('[data-solo-action="left"]').boundingBox(); assert(button);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: button.x + button.width / 2, y: button.y + button.height / 2 }] });
      await page.clock.runFor(250); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.clock.runFor(60);
      const afterTouch = await read(); assert(afterTouch.player.x < beforeTouch.player.x - 5, 'real touch button moves the actor'); await cdp.detach();
      await page.setViewportSize({ width: 1280, height: 800 }); await canvas.focus(); reloaded = true;
      checks.push({ name: 'stalk-pause-cold-resume-mobile', exactStoredTick: frozen.tick, receipts: 4, bounds, touchMovement: { before: beforeTouch.player.x, after: afterTouch.player.x } }); continue;
    }
    if (s.paused || !s.inputArmed) { await apply(new Set()); await canvas.focus(); await page.clock.runFor(100); continue; }
    const input = soloInput({ ...s, previousJump: keys.has(action.jump), previousInteract: keys.has(action.interact), falseTrailRead: true }, { falseTrail: false });
    const desired = new Set(); if (input.move) desired.add(input.move < 0 ? action.left : action.right); if (input.jump) desired.add(action.jump); if (input.interact) desired.add(action.interact);
    await apply(desired); await page.clock.runFor(50);
  }
  assert(i < 2500, 'physical chapter completed'); await apply(new Set()); await page.clock.runFor(200);
  const complete = await saved(); assert.equal(complete.soloV66.status, 'completed'); assert.equal(complete.soloV66.receipts.length, 7);
  assert.equal(complete.prologue.chronicle.evidence.filter(e => e.id === 'first-tracks').length, 1);
  assert.deepEqual(complete.prologue.chronicle.rites, original.prologue.chronicle.rites);
  for (const field of ['inventory', 'statistics', 'loadout', 'youthTraining']) assert.deepEqual(complete[field], original[field]);
  await screenshot('complete'); await page.locator('[data-solo-return]').click(); await page.clock.runFor(150); await page.locator('[data-homeworld-hub]').waitFor();
  await page.clock.resume(); await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('button', { name: /^Continuer/ }).click(); await page.locator('[data-homeworld-hub]').waitFor();
  assert.equal((await saved()).soloV66.receipts.length, 7);
  // Wait for the real screen entrance animation before judging the returned city's visibility.
  await page.locator('[data-homeworld-hub]').evaluate(async element => {
    const animations = [];
    for (let node = element; node; node = node.parentElement) animations.push(...node.getAnimations().filter(animation => animation.animationName === 'screen-in'));
    await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
  });
  await page.waitForFunction(() => {
    for (let node = document.querySelector('[data-homeworld-hub]'); node; node = node.parentElement) if (Number(getComputedStyle(node).opacity) < .99) return false;
    return !!document.querySelector('[data-homeworld-hub]');
  });
  await screenshot('durable-return');
  checks.push({ name: 'all-seven-proofs-and-return-survive-reload', noAdultRewardsOrRanks: true });
  assert(reloaded && quotaChecked); assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  await fs.writeFile(output + '/report.json', JSON.stringify({ status: 'PASS', url, checks, errors, failures, events, limits: 'Isolated browser. Initial campaign actually simulated through nursery/cage; no runtime coordinates or proofs injected. Keyboard route and viewport bounds; native existing art reused. No canon rite, no new rank or adult ship.' }, null, 2));
  console.log(JSON.stringify({ status: 'PASS', checks: checks.length, output }));
} catch (error) { await screenshot('failure').catch(() => {}); await fs.writeFile(output + '/report.json', JSON.stringify({ status: 'FAIL', url, error: String(error), checks, errors, failures, events }, null, 2)); throw error; }
finally { await browser.close(); }
