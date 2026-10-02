import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { chromium } from 'playwright-core';
import { homeworldQaModelV64 } from './homeworld-qa-model-v64.mjs';
import { homeworldNavigatorV66 } from './homeworld-navigation-browser-v66.mjs';
import { firstTracksCompleted, p } from '../tests/helpers/solo-v67-campaign-route.mjs';

const url = process.env.V74_QA_URL ?? 'http://127.0.0.1:4192';
const output = process.env.V74_YOUTH_QA_OUTPUT ?? 'work-local/v74/qa/youth-motion-local';
const expectedVersion = process.env.YAUTJA_QA_EXPECTED_VERSION ?? 'V74';
await fs.mkdir(output, { recursive: true });
const api = homeworldQaModelV64(process.cwd(), ['homeworldCity.ts', 'homeworldSpatialCodex.ts', 'homeworldInteriorsV64.ts', 'homeworldGeometryV64.ts']);
const art = JSON.parse(await fs.readFile('app/game/data/homeworldYouthMotionArtV74.json', 'utf8'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [], captures = [], errors = [], failures = [];
const directions = { n: ['ArrowUp'], ne: ['ArrowUp', 'ArrowRight'], e: ['ArrowRight'], se: ['ArrowDown', 'ArrowRight'], s: ['ArrowDown'], sw: ['ArrowDown', 'ArrowLeft'], w: ['ArrowLeft'], nw: ['ArrowUp', 'ArrowLeft'] };
const ray = { n: [0, -1], ne: [Math.SQRT1_2, -Math.SQRT1_2], e: [1, 0], se: [Math.SQRT1_2, Math.SQRT1_2], s: [0, 1], sw: [-Math.SQRT1_2, Math.SQRT1_2], w: [-1, 0], nw: [-Math.SQRT1_2, -Math.SQRT1_2] };
const attach = page => { page.on('pageerror', error => errors.push(error.message)); page.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); }); page.setDefaultTimeout(60000); };
const motion = page => page.locator('[data-homeworld-actor] [data-motion-version="74"]').evaluate(node => {
  const actor = node.closest('[data-homeworld-actor]'), box = node.getBoundingClientRect(), anchor = node.parentElement.getBoundingClientRect();
  return { direction: node.dataset.nativeDirection, frame: node.dataset.nativeFrame, clip: node.dataset.homeworldUnbloodedV72,
    source: node.dataset.nativeSource, x: Number(actor.dataset.x), y: Number(actor.dataset.y), distance: Number(actor.dataset.youthDistanceV74),
    seconds: document.querySelector('[data-homeworld-viewport]').dataset.citySeconds, transform: getComputedStyle(node.parentElement).transform,
    // World zoom is deliberately applied by the camera; the native drawing itself has no transform/bob.
    localFoot: Number(node.style.top.slice(0, -2)) + Number(node.dataset.framePivotY) * Number(node.dataset.frameScale),
    cropWidth: box.width, cropHeight: box.height, anchorX: anchor.x, anchorY: anchor.y };
});
async function capture(page, name) { const file = output + '/' + name + '.png'; await page.screenshot({ path: file }); captures.push(file); }
async function openGame(page) {
  attach(page);
  await page.addInitScript(({ key, save }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save)); }, { key: p.SAVE_STORAGE_KEY, save: firstTracksCompleted() });
  await page.clock.install(); await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^Continuer/ }).click(); await page.locator('[data-homeworld-hub]').waitFor();
  assert.equal(await page.locator('main').getAttribute('data-game-content-version'), expectedVersion);
  await page.locator('[data-homeworld-actor] [data-motion-version="74"]').waitFor();
  // The production preloader owns readiness. Do not call Image.decode in the
  // browser recipe to conceal a missing first-step source/cold-cache defect.
  await page.locator('[data-homeworld-motion-ready="true"]').waitFor();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 150));
  const nav = homeworldNavigatorV66(page, api, { driverTickMs: 16, waypointTolerance: 3, pulseInputs: true });
  await nav.focus(); return nav;
}
function clearGaitPatch(point) {
  if (!api.isHomeworldWalkable(point)) return false;
  for (const [dx, dy] of Object.values(ray)) for (let d = 12; d <= 190; d += 12)
    if (!api.isHomeworldWalkable({ x: point.x + dx * d, y: point.y + dy * d })) return false;
  return true;
}
function accessiblePatch(from) {
  const candidates = [];
  for (let dx = -1200; dx <= 1200; dx += 48) for (let dy = -1200; dy <= 1200; dy += 48)
    candidates.push({ x: from.x + dx, y: from.y + dy, distance: Math.hypot(dx, dy) });
  candidates.sort((a, b) => a.distance - b.distance);
  for (const point of candidates) if (clearGaitPatch(point)) {
    const route = api.homeworldSpatialRoute(from, point);
    if (route.status === 'reachable') return { point, route };
  }
  throw new Error('No physically reachable clear gait patch; do not teleport or replace runtime collision');
}
function blockingRay(from) {
  for (const direction of ['n', 'e', 's', 'w']) {
    const [dx, dy] = ray[direction]; let last = from;
    for (let d = 16; d <= 2000; d += 16) {
      const next = { x: from.x + dx * d, y: from.y + dy * d };
      if (!api.isHomeworldWalkable(next)) {
        const route = api.homeworldSpatialRoute(from, last);
        if (route.status === 'reachable') return { direction, point: last, blocked: next, route };
        break;
      }
      last = next;
    }
  }
  throw new Error('No reachable physical collider for the current model');
}

let page;
try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); const nav = await openGame(page);
  const patch = accessiblePatch(await nav.position()); await nav.follow(patch.route.points); const centre = await nav.position();
  await capture(page, 'desktop-native-unblooded-idle');
  for (const [direction, keys] of Object.entries(directions)) {
    await nav.focus(); const start = await motion(page), samples = [];
    for (const key of keys) await page.keyboard.down(key);
    for (let i = 0; i < 24; i++) { await nav.tick(16); samples.push(await motion(page)); }
    const moving = samples.filter(sample => sample.clip === 'walk'); assert(moving.length > 8, direction + ' real physical movement');
    assert(moving.every(sample => sample.direction === direction && sample.transform === 'none' && Math.abs(sample.localFoot) < .001),
      JSON.stringify({ direction, badSamples: moving.filter(sample => sample.direction !== direction || sample.transform !== 'none' || Math.abs(sample.localFoot) >= .001) }));
    assert.deepEqual(new Set(moving.map(sample => sample.frame)), new Set(['0', '1', '2', '3']), direction + ' all four travel-driven poses');
    assert(moving.every(sample => sample.source.includes('/game/homeworld/v74/youth/')));
    assert(moving.at(-1).distance > start.distance + 80, 'native cycle follows actual travel');
    await capture(page, 'desktop-' + direction + '-walking');
    for (const key of keys) await page.keyboard.up(key); await nav.tick(80);
    const stopped = await motion(page); assert.equal(stopped.clip, 'idle'); assert.equal(stopped.direction, direction);
    const still = await motion(page); await nav.tick(320); const later = await motion(page);
    assert.equal(later.distance, still.distance); assert.equal(later.direction, still.direction); assert.deepEqual(await nav.position(), { x: later.x, y: later.y });
    checks.push({ name: 'keyboard-four-native-poses-and-remembered-idle', direction, samples, stopped });
    await nav.follow([await nav.position(), centre]);
  }
  await nav.focus(); await page.keyboard.down('ArrowRight'); await nav.tick(100); await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const paused = await motion(page); await nav.tick(1000); assert.deepEqual(await motion(page), paused);
  await capture(page, 'desktop-pause-freezes-native-pose-and-distance');
  await page.keyboard.up('ArrowRight'); await page.getByRole('button', { name: 'Reprendre', exact: true }).click(); await nav.tick(240);
  assert.equal((await motion(page)).clip, 'idle');
  const resumedWorldFocus = await page.locator('[data-homeworld-viewport]').evaluate(e => document.activeElement === e && document.hasFocus());
  assert(resumedWorldFocus, 'Final HUD resume restores actual keyboard control before the recipe can refocus');
  checks.push({ name: 'pause-frozen-distance-facing-frame-and-no-stale-held-input', paused, resumedWorldFocus });
  // Check the real HUD focus restoration above first. The public helper then
  // asserts focus explicitly; follow() itself does not steal it from dialogs.
  await nav.focus();
  await nav.follow([await nav.position(), centre]);
  const wall = blockingRay(await nav.position()); await nav.follow(wall.route.points); await nav.focus();
  for (const key of directions[wall.direction]) await page.keyboard.down(key); await nav.tick(420);
  const blocked = await motion(page); await nav.tick(300); const blockedAgain = await motion(page);
  assert.equal(blockedAgain.clip, 'idle'); assert.equal(blockedAgain.distance, blocked.distance);
  assert.equal(blockedAgain.x, blocked.x); assert.equal(blockedAgain.y, blocked.y); assert.equal(blockedAgain.direction, wall.direction);
  for (const key of directions[wall.direction]) await page.keyboard.up(key); await nav.tick(80);
  await capture(page, 'desktop-collision-stops-native-cycle'); checks.push({ name: 'real-physical-collision-stops-travel-and-walk', wall, blocked, blockedAgain });
  for (const source of Object.values(art.sources)) {
    const response = await page.request.get(url + source.src); assert.equal(response.status(), 200);
    const sha = crypto.createHash('sha256').update(await response.body()).digest('hex'); assert.equal(sha, source.sha256);
    checks.push({ name: 'native-source-http-sha', src: source.src, sha256: sha });
  }
  const mobile = await browser.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
  const mobileNav = await openGame(mobile), mobilePatch = accessiblePatch(await mobileNav.position()); await mobileNav.follow(mobilePatch.route.points);
  const cdp = await mobile.context().newCDPSession(mobile);
  const buttonPoint = async name => { const box = await mobile.getByRole('button', { name, exact: true }).boundingBox(); assert(box); return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; };
  const touch = await buttonPoint('Marcher vers le fond'); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...touch, id: 1 }] });
  const mobileSamples = []; for (let i = 0; i < 24; i++) { await mobileNav.tick(16); mobileSamples.push(await motion(mobile)); }
  const mobileMoving = mobileSamples.filter(sample => sample.clip === 'walk'); assert(mobileMoving.length > 8); assert(mobileMoving.every(sample => sample.direction === 'n'));
  assert.deepEqual(new Set(mobileMoving.map(sample => sample.frame)), new Set(['0', '1', '2', '3']));
  await capture(mobile, 'mobile-touch-native-rear-walk'); await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await mobileNav.tick(160);
  const cancelled = await motion(mobile); assert.equal(cancelled.clip, 'idle'); assert.equal(cancelled.direction, 'n');
  const position = await mobileNav.position(); await mobileNav.tick(320); assert.deepEqual(await mobileNav.position(), position);
  assert.equal(await mobile.locator('[data-homeworld-hub]').evaluate(e => e.scrollWidth > e.clientWidth + 1), false, 'portrait screen remains contained');
  await capture(mobile, 'mobile-touch-cancel-remembers-rear-idle'); checks.push({ name: 'mobile-native-touch-walk-all-four-frames-cancel-no-stale-input', samples: mobileSamples, cancelled });
  await mobile.close(); assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  const report = { status: 'PASS', url, expectedVersion, checks, captures, errors, failures, limits: 'Campaign prerequisites were model-played into a new isolated localStorage fixture. Actual Homeworld movement is reached only through public keyboard input; all eight directions, collision, pause and trusted CDP mobile touch are played without actor injection. This does not prove physical-device performance, account synchronization, combat animation completeness or film-canonical youth identity.' };
  await fs.writeFile(output + '/report.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify({ status: report.status, checks: checks.length, captures: captures.length, output }));
} catch (error) {
  if (page) await capture(page, 'failure').catch(() => {});
  await fs.writeFile(output + '/report.json', JSON.stringify({ status: 'FAIL', url, expectedVersion, error: String(error), checks, captures, errors, failures }, null, 2)); throw error;
} finally { await browser.close(); }
