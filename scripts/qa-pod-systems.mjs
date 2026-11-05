import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';

/**
 * Native production /dev recipe. Run after npm run build:production:
 * POD_SYSTEMS_START_SERVER=1 node scripts/qa-pod-systems.mjs
 *
 * Only real buttons, keyboard inputs and disposable /dev sessions are used.
 * The observer reads DOM diagnostics and native persistence callbacks; it never
 * writes game state, advances a clock, substitutes an asset or changes a save.
 * Suspend/resume is explicitly in memory in /dev. Reload/reset deliberately
 * start another disposable trial, not a durable campaign load.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.env.POD_SYSTEMS_OUTPUT || 'outputs/qa-pod-systems');
const route = new URL(process.env.POD_SYSTEMS_URL || 'http://127.0.0.1:4199/dev');
route.search = ''; route.hash = '';
assert.equal(route.pathname.replace(/\/$/, ''), '/dev', 'Use the actual developer route.');
await fs.mkdir(out, { recursive: true });
const sha256 = value => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sourceCommit = git('rev-parse', 'HEAD');
if (process.env.POD_SYSTEMS_SOURCE_COMMIT) assert.equal(sourceCommit, process.env.POD_SYSTEMS_SOURCE_COMMIT);
const sourceFiles = [
  'app/dev/destinations.ts', 'app/dev/session.tsx', 'app/game/HuntCanvas.tsx',
  'app/game/PlanetArrivalCinematic.tsx', 'app/game/PlanetArrivalCinematic.module.css', 'app/game/sound.ts',
  'app/game/systems/huntPodRecovery.ts', 'app/game/systems/huntInsertion.ts',
  'app/game/systems/controlBindings.ts', 'app/game/systems/planetInsertion.ts',
  'app/game/systems/planetArrival.ts', 'app/game/systems/planetArrivalPodFlight.ts',
  'app/game/systems/planetArrivalPodArt.ts', 'scripts/qa-pod-systems.mjs', '.github/workflows/pod-systems.yml',
].sort();
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async file => [file, sha256(await fs.readFile(path.join(root, file)))])));
const compiled = await build({
  stdin: { contents: `export { resolveDevDestination } from './app/dev/destinations';
    export { PLANET_ARRIVAL_DURATION_MS, PLANET_ARRIVAL_SHOTS } from './app/game/systems/planetArrival';
    export { HUNT_POD_RECOVERY } from './app/game/systems/huntPodRecovery';`, resolveDir: root, loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const api = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
for (const id of ['arrival-triad-jungle-vey', 'mission-jungle-vey', 'arrival-ship-jungle-vey']) {
  assert.ok(api.resolveDevDestination(id), `Missing native developer destination: ${id}`);
}

const headless = process.env.POD_SYSTEMS_HEADED !== '1';
const workingTreeStatus = git('status', '--porcelain', '--untracked-files=no');
const report = {
  schema: 1, startedAt: new Date().toISOString(), sourceCommit, sourceHashes,
  workingTreeDirty: workingTreeStatus.length > 0, workingTreeStatus,
  url: route.href, browserMode: headless ? 'headless' : 'headed',
  runtime: 'Production Next /dev, native arrival and HuntCanvas; no injected gameplay state or clock',
  scope: 'Atmospheric shutters and heating, natural triad handoff, safe remote pod controls, native in-memory suspend/resume, single-pod and ship exclusions, isolated reset/reload. No campaign durability, art approval or performance qualification.',
  checks: [], captures: [], arrivalFrames: [], arrivalObservations: [], huntObservations: [],
  movement: [], persistence: [], storageChecks: [], storageOperations: [], databaseOpens: [],
  errors: [], consoleErrors: [], failedRequests: [],
};
const requested = new Set(), missing = new Set();
let browser, context, page, server, serverExit = null;
let currentCheck = 'setup', destinationId = null;

async function startServer() {
  if (process.env.POD_SYSTEMS_START_SERVER !== '1') return;
  assert.ok(route.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(route.hostname), 'Auto-start is loopback-only.');
  const cli = createRequire(import.meta.url).resolve('next/dist/bin/next');
  const log = await fs.open(path.join(out, 'next-server.log'), 'w');
  try {
    server = spawn(process.execPath, [cli, 'start', '--hostname', '127.0.0.1', '--port', route.port || '4199'], {
      cwd: root, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', log.fd, log.fd],
    });
  } finally { await log.close(); }
  server.once('exit', (code, signal) => { serverExit = { code, signal }; });
  report.server = { mode: 'production', log: 'next-server.log' };
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (serverExit) throw new Error(`Next exited before readiness: ${JSON.stringify(serverExit)}`);
    try { if ((await fetch(route, { signal: AbortSignal.timeout(5000) })).status === 200) return; }
    catch { /* The production listener is not ready yet. */ }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error('Production /dev did not become ready within 90 seconds.');
}

async function stopServer() {
  if (!server || serverExit) return;
  server.kill('SIGTERM');
  await new Promise(resolve => {
    const timer = setTimeout(() => { server.kill('SIGKILL'); resolve(); }, 5000);
    server.once('exit', () => { clearTimeout(timer); resolve(); });
  });
}

async function observeContext() {
  await context.exposeBinding('__podQaStorageEvent', (_source, event) => {
    const observed = { check: currentCheck, ...event };
    if (event.operation === 'indexedDB.open') report.databaseOpens.push(observed);
    else report.storageOperations.push(observed);
  });
  await context.addInitScript(() => {
    const audit = { frames: [], huntCanvasMounts: 0, storageOperations: [], databaseOpens: [] };
    window.__podQaAudit = audit;
    const isDev = () => location.pathname.replace(/\/$/, '') === '/dev';
    for (const operation of ['setItem', 'removeItem', 'clear']) {
      const native = Storage.prototype[operation];
      Storage.prototype[operation] = function (...args) {
        if (isDev()) {
          const event = { operation, area: this === localStorage ? 'local' : 'session',
            key: operation === 'clear' ? null : String(args[0]), url: location.href };
          audit.storageOperations.push(event); void window.__podQaStorageEvent(event);
        }
        return Reflect.apply(native, this, args);
      };
    }
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (...args) {
      if (isDev()) {
        const event = { operation: 'indexedDB.open', key: String(args[0]), url: location.href };
        audit.databaseOpens.push(event); void window.__podQaStorageEvent(event);
      }
      return Reflect.apply(open, this, args);
    };
    const seenCanvases = new WeakSet();
    let previousFrame = '';
    // Observe a naturally rendered frame at most once per 80 ms of the game's
    // own elapsed time. Narrow opening phases are recorded without changing
    // playback, scheduling a synthetic animation frame or writing to the scene.
    new MutationObserver(() => {
      if (!isDev()) return;
      for (const canvas of document.querySelectorAll('.hunt-screen canvas.hunt-canvas')) {
        if (!seenCanvases.has(canvas)) { seenCanvases.add(canvas); audit.huntCanvasMounts += 1; }
      }
      const arrival = document.querySelector('[data-dev-session] [data-arrival-run]');
      if (!arrival) return;
      const elapsed = Number(arrival.getAttribute('data-arrival-elapsed'));
      const run = arrival.getAttribute('data-arrival-run'), status = arrival.getAttribute('data-arrival-status');
      const key = `${run}:${status}:${Math.floor(elapsed / 80)}`;
      if (key === previousFrame) return;
      previousFrame = key;
      if (audit.frames.length >= 3000) throw new Error('The pod QA observation budget was exceeded.');
      audit.frames.push({ run, elapsed, status, shot: arrival.getAttribute('data-arrival-shot'),
        wallTime: performance.now(), pods: Array.from(arrival.querySelectorAll('[data-arrival-flight-pod]'), pod => ({
          id: pod.getAttribute('data-arrival-member'), localElapsed: Number(pod.getAttribute('data-arrival-pod-elapsed')),
          phase: pod.getAttribute('data-arrival-pod-phase'), shutters: pod.getAttribute('data-arrival-pod-shutters'),
          deployment: Number(pod.getAttribute('data-arrival-pod-deployment')), heat: Number(pod.getAttribute('data-arrival-pod-heat')),
          panels: Array.from(pod.querySelectorAll('[data-arrival-pod-shutter]'), panel => ({
            id: panel.getAttribute('data-arrival-pod-shutter'), transform: getComputedStyle(panel).transform,
          })),
        })) });
    }).observe(document, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['data-arrival-elapsed', 'data-arrival-status', 'data-arrival-pod-shutters', 'data-arrival-pod-deployment'] });
  });
  context.on('page', target => {
    target.setDefaultTimeout(30000);
    target.on('pageerror', error => report.errors.push({ check: currentCheck, message: error.message }));
    target.on('console', message => {
      if (message.type() === 'error') report.consoleErrors.push({ check: currentCheck, message: message.text() });
    });
    target.on('request', request => {
      const pathname = new URL(request.url()).pathname;
      if (pathname.startsWith('/game/') || pathname.startsWith('/audio/')) requested.add(pathname);
    });
    target.on('requestfailed', request => {
      const pathname = new URL(request.url()).pathname, error = request.failure()?.errorText;
      if (pathname.startsWith('/game/') || pathname.startsWith('/audio/')) report.failedRequests.push({ check: currentCheck, path: pathname, error });
    });
    target.on('response', response => {
      const pathname = new URL(response.url()).pathname;
      if (!(pathname.startsWith('/game/') || pathname.startsWith('/audio/'))) return;
      if (response.status() >= 400 || response.headers()['content-type']?.includes('text/html')) missing.add(pathname);
    });
  });
}

async function assertIsolated(label) {
  const storage = await page.evaluate(() => ({
    local: Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])),
    session: Object.fromEntries(Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])),
    writes: window.__podQaAudit.storageOperations, databases: window.__podQaAudit.databaseOpens,
  }));
  assert.deepEqual(storage.local, {}, `${label}: disposable /dev changed local storage.`);
  assert.deepEqual(storage.session, {}, `${label}: disposable /dev changed session storage.`);
  assert.deepEqual(storage.writes, [], `${label}: a write was attempted even if later reverted.`);
  assert.deepEqual(storage.databases, [], `${label}: IndexedDB was opened.`);
  assert.deepEqual(report.storageOperations, []); assert.deepEqual(report.databaseOpens, []);
  report.storageChecks.push({ label, localKeys: 0, sessionKeys: 0, sha256: sha256(JSON.stringify({ local: storage.local, session: storage.session })) });
}

async function check(name, run) {
  currentCheck = name;
  try {
    await run();
    if (page && new URL(page.url()).pathname === '/dev') await assertIsolated(name);
    report.checks.push({ name, passed: true }); console.log('PASS', name);
  } catch (error) {
    report.checks.push({ name, passed: false, message: error.message }); throw error;
  }
}

function session() { return page.locator(`[data-dev-session="${destinationId}"]`); }
function hunt() { return session().locator('.hunt-screen'); }
function arrival() { return session().locator('[data-arrival-run]'); }
const pauseDialog = () => page.getByRole('dialog', { name: 'Chasse en pause · Carte et sac', exact: true });
async function navigate(id) {
  destinationId = id;
  const url = new URL(route); url.searchParams.set('lieu', id);
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.bringToFront();
  await session().waitFor({ timeout: 90000 });
  assert.equal(await page.locator('[data-dev-session]').count(), 1);
  assert.equal(new URL(page.url()).searchParams.get('lieu'), id);
}

async function observeArrival(label) {
  const value = await arrival().evaluate(element => ({
    run: element.getAttribute('data-arrival-run'), elapsed: Number(element.getAttribute('data-arrival-elapsed')),
    status: element.getAttribute('data-arrival-status'), shot: element.getAttribute('data-arrival-shot'),
    method: element.getAttribute('data-arrival-method'), team: element.getAttribute('data-arrival-team'),
  }));
  report.arrivalObservations.push({ label, ...value }); return value;
}

async function arrivalReady() {
  await arrival().waitFor({ timeout: 90000 });
  await page.waitForFunction(id => {
    const scene = document.querySelector(`[data-dev-session="${id}"] [data-arrival-run]`);
    return scene && ['playing', 'paused', 'recoverable-error'].includes(scene.getAttribute('data-arrival-status'));
  }, destinationId, { timeout: 90000 });
  assert.doesNotMatch(await arrival().innerText(), /visuels sont indisponibles|n’a pas pu être enregistrée|n’a pas été confirmé/u);
  if (await arrival().getAttribute('data-arrival-status') === 'paused') {
    report.arrivalObservations.push({ label: 'initial-native-pause', ...await observeArrival('before-single-resume') });
    await arrival().getByRole('button', { name: 'Reprendre l’arrivée', exact: true }).click();
  }
  await arrival().and(page.locator('[data-arrival-status="playing"]')).waitFor();
  const first = await observeArrival('ready');
  assert.ok(first.run && first.elapsed < api.PLANET_ARRIVAL_SHOTS[3].startMs);
  return first;
}

async function waitForArrivalFrame(predicate, value, timeout = 90000) {
  const handle = await arrival().elementHandle(); assert.ok(handle);
  try { await page.waitForFunction(predicate, { scene: handle, value }, { timeout }); }
  finally { await handle.dispose(); }
}

async function capture(name, expected = null) {
  const before = expected ? await observeArrival(`${name}-before`) : null;
  if (expected) for (const [key, value] of Object.entries(expected)) assert.equal(before[key], value, `${name}: wrong ${key} before capture.`);
  const bytes = await page.screenshot({ fullPage: false });
  await fs.writeFile(path.join(out, `${name}.png`), bytes);
  const after = expected ? await observeArrival(`${name}-after`) : null;
  if (expected) for (const [key, value] of Object.entries(expected)) assert.equal(after[key], value, `${name}: wrong ${key} after capture.`);
  report.captures.push({ file: `${name}.png`, sha256: sha256(bytes), bytes: bytes.length, viewport: page.viewportSize(), before, after });
}

async function beginHunt() {
  await hunt().waitFor({ timeout: 90000 });
  await page.locator('[data-mission-opening-v78]').waitFor({ timeout: 90000 });
  await page.getByRole('button', { name: 'Commencer la chasse', exact: true }).click();
  await page.locator('[data-mission-opening-v78]').waitFor({ state: 'hidden' });
  await hunt().locator('.hunt-canvas').waitFor();
  if (Number(await hunt().getAttribute('data-hunt-pod-count')) > 0) {
    await hunt().and(page.locator('[data-hunt-pod-assets-ready="true"]')).waitFor({ timeout: 90000 });
  }
  await session().and(page.locator('[data-dev-hunt-insertion]')).waitFor();
  await hunt().locator('.hunt-canvas').focus();
}

async function observeCheckpoint() {
  return session().evaluate(element => {
    const number = name => element.hasAttribute(name) ? Number(element.getAttribute(name)) : null;
    return { generation: Number(element.getAttribute('data-dev-hunt-generation')),
      elapsed: number('data-dev-hunt-elapsed'), x: number('data-dev-hunt-x'), y: number('data-dev-hunt-y'),
      insertion: JSON.parse(element.getAttribute('data-dev-hunt-insertion') || 'null') };
  });
}

async function observeHunt(label) {
  const live = await hunt().evaluate(element => ({
    state: element.getAttribute('data-hunt-pod-state'), reason: element.getAttribute('data-hunt-pod-safety'),
    remaining: Number(element.getAttribute('data-hunt-pod-remaining')), count: Number(element.getAttribute('data-hunt-pod-count')),
    distance: Number(element.getAttribute('data-hunt-pod-distance')), radioDistance: Number(element.getAttribute('data-hunt-pod-radio-distance')),
    run: element.getAttribute('data-hunt-insertion-run-id'), method: element.getAttribute('data-hunt-insertion-method'),
    team: element.getAttribute('data-hunt-insertion-team'), assetsReady: element.getAttribute('data-hunt-pod-assets-ready'),
  }));
  const checkpoint = await observeCheckpoint();
  assert.ok([live.remaining, live.distance, live.radioDistance, checkpoint.generation].every(Number.isFinite));
  if (checkpoint.insertion !== null) assert.ok([checkpoint.elapsed, checkpoint.x, checkpoint.y].every(Number.isFinite));
  const observed = { label, live, checkpoint, canvasMounts: await page.evaluate(() => window.__podQaAudit.huntCanvasMounts) };
  report.huntObservations.push(observed); return observed;
}

async function pressX() { await hunt().locator('.hunt-canvas').focus(); await page.keyboard.press('x'); }
async function pauseHunt() { await hunt().locator('.hunt-pause-button').click(); await pauseDialog().waitFor(); }
async function resumeHunt() { await pauseDialog().getByRole('button', { name: 'Reprendre', exact: true }).click(); await pauseDialog().waitFor({ state: 'hidden' }); }
async function setFieldOpen(open) {
  const details = hunt().locator('[data-hunt-pod-panel]').locator('xpath=ancestor::details[1]');
  if (await details.evaluate(element => element.open) !== open) await details.locator('summary').click();
}
async function companionOrder(id, order) {
  await setFieldOpen(true);
  const row = hunt().locator(`[data-hunt-companion-id="${id}"]`);
  await row.getByRole('button', { name: order === 'hold' ? /tenir la position/u : /suivre/u }).click();
  await row.and(page.locator(`[data-hunt-companion-order="${order}"]`)).waitFor();
  await setFieldOpen(false);
}

async function walkUntil(reason, label) {
  // A bounded real-input walk; no actor teleport, artificial checkpoint, health
  // change, obstacle removal or virtual time is allowed to rescue a failing route.
  const start = await observeHunt(`${label}-start`);
  for (let pulse = 0; pulse < 140; pulse++) {
    const state = await observeHunt(`${label}-${pulse}`);
    if (state.live.reason === reason && state.live.distance >= api.HUNT_POD_RECOVERY.safeRadius + 48) {
      report.movement.push({ label, pulses: pulse, start, finish: state }); return state;
    }
    assert.notEqual(state.live.reason, 'out-of-range', 'The walk lost radio contact before it reached a safe formation.');
    assert.equal(state.live.state, 'ready', 'The traversal unexpectedly armed or destroyed a pod.');
    const canvas = hunt().locator('.hunt-canvas');
    await canvas.scrollIntoViewIfNeeded(); await canvas.focus();
    await page.keyboard.down('ArrowRight');
    try { await page.waitForTimeout(650); }
    finally { await page.keyboard.up('ArrowRight'); }
  }
  throw new Error(`The native ground traversal did not reach ${reason} within 140 real input pulses (${label}).`);
}

async function suspendAndResume(label, expectedPhase) {
  const before = await observeHunt(`${label}-before`);
  assert.equal(before.live.state, expectedPhase);
  assert.equal(before.checkpoint.insertion.podRecovery.phase, expectedPhase);
  await pauseDialog().getByRole('button', { name: 'Suspendre et sauvegarder', exact: true }).click();
  await page.getByRole('heading', { name: 'Essai suspendu', exact: true }).waitFor();
  assert.equal(await hunt().count(), 0, 'Suspending must unmount the live Canvas.');
  await assertIsolated(`${label}-suspended`);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Reprendre cet essai', exact: true }).click();
  await hunt().waitFor(); await pauseDialog().waitFor();
  await hunt().and(page.locator('[data-hunt-pod-assets-ready="true"]')).waitFor({ timeout: 90000 });
  const after = await observeHunt(`${label}-restored`);
  assert.equal(after.live.state, expectedPhase); assert.equal(after.live.run, before.live.run);
  assert.equal(after.live.remaining, before.live.remaining, 'An in-memory reload must not restart or consume the countdown.');
  assert.equal(after.checkpoint.generation, before.checkpoint.generation + 1);
  assert.equal(after.canvasMounts, before.canvasMounts + 1);
  // The developer owner deliberately clears its previous observations when it
  // remounts. A restored paused Canvas emits no checkpoint until a native action.
  // Suspend again while still paused to obtain a fresh serialized observation,
  // without playing even one countdown tick or inventing diagnostics in the app.
  await pauseDialog().getByRole('button', { name: 'Suspendre et sauvegarder', exact: true }).click();
  await page.getByRole('heading', { name: 'Essai suspendu', exact: true }).waitFor();
  const reserialized = await observeCheckpoint();
  assert.ok(reserialized.insertion, 'The actual suspension callback must publish its snapshot.');
  assert.equal(reserialized.elapsed, before.checkpoint.elapsed);
  assert.equal(reserialized.x, before.checkpoint.x); assert.equal(reserialized.y, before.checkpoint.y);
  assert.deepEqual(reserialized.insertion.podRecovery, before.checkpoint.insertion.podRecovery);
  await page.getByRole('button', { name: 'Reprendre cet essai', exact: true }).click();
  await hunt().waitFor(); await pauseDialog().waitFor();
  await hunt().and(page.locator('[data-hunt-pod-assets-ready="true"]')).waitFor({ timeout: 90000 });
  const secondRestore = await observeHunt(`${label}-second-restore`);
  assert.equal(secondRestore.live.remaining, before.live.remaining);
  assert.equal(secondRestore.live.state, expectedPhase);
  assert.equal(secondRestore.live.run, before.live.run);
  assert.equal(secondRestore.checkpoint.generation, before.checkpoint.generation + 2);
  assert.equal(secondRestore.canvasMounts, before.canvasMounts + 2);
  report.persistence.push({ label, storage: 'disposable in-memory /dev checkpoint', before, after, reserialized, secondRestore });
  return secondRestore;
}

try {
  if (process.env.POD_SYSTEMS_REQUIRE_CLEAN === '1') assert.equal(report.workingTreeDirty, false, 'The reviewed checkout must be clean.');
  await startServer();
  browser = await chromium.launch({ headless, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  report.browserVersion = browser.version();
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1,
    reducedMotion: 'no-preference', recordVideo: { dir: path.join(out, 'video'), size: { width: 1440, height: 1000 } } });
  await observeContext(); page = await context.newPage();
  let triadRun, heldAt, countdownBeforePause, destroyedAt;

  await check('Native triad arrival keeps the three shutters folded in space', async () => {
    await navigate('arrival-triad-jungle-vey');
    const first = await arrivalReady(); triadRun = first.run;
    assert.equal(first.method, 'pod'); assert.equal(first.team, 'triad');
    await waitForArrivalFrame(({ scene, value }) => {
      if (!scene.isConnected || scene.getAttribute('data-arrival-run') !== value.run || scene.getAttribute('data-arrival-status') !== 'playing') {
        throw new Error('The original arrival stopped before the space sample.');
      }
      const pods = Array.from(scene.querySelectorAll('[data-arrival-flight-pod]'));
      return scene.getAttribute('data-arrival-shot') === 'descent' && pods.length === 3 &&
        pods.every(pod => pod.getAttribute('data-arrival-pod-shutters') === 'closed');
    }, { run: triadRun });
    await arrival().getByRole('button', { name: 'Pause', exact: true }).click();
    await arrival().and(page.locator('[data-arrival-status="paused"]')).waitFor();
    await capture('01-space-shutters-closed', { run: triadRun, status: 'paused', shot: 'descent' });
    await arrival().getByRole('button', { name: 'Reprendre l’arrivée', exact: true }).click();
  });

  await check('Actual atmospheric playback heats each pod and opens its panels before surface contact', async () => {
    await waitForArrivalFrame(({ scene, value }) => {
      if (!scene.isConnected || scene.getAttribute('data-arrival-run') !== value.run || scene.getAttribute('data-arrival-status') !== 'playing') {
        throw new Error('The original arrival stopped before atmospheric deployment.');
      }
      const pods = Array.from(scene.querySelectorAll('[data-arrival-flight-pod]'));
      return scene.getAttribute('data-arrival-shot') === 'atmosphere' && pods.length === 3 && pods.every(pod =>
        pod.getAttribute('data-arrival-pod-shutters') === 'open' && Number(pod.getAttribute('data-arrival-pod-heat')) > 0);
    }, { run: triadRun });
    await arrival().getByRole('button', { name: 'Pause', exact: true }).click();
    await arrival().and(page.locator('[data-arrival-status="paused"]')).waitFor();
    await capture('02-atmosphere-shutters-open', { run: triadRun, status: 'paused', shot: 'atmosphere' });
    const frames = await page.evaluate(() => window.__podQaAudit.frames);
    report.arrivalFrames.push(...frames);
    for (const id of ['hunter', 'karhek', 'saketh']) {
      const observations = frames.filter(frame => frame.run === triadRun && frame.status === 'playing')
        .flatMap(frame => frame.pods.filter(pod => pod.id === id).map(pod => ({ ...pod, elapsed: frame.elapsed })));
      const space = observations.find(pod => pod.phase === 'space' && pod.shutters === 'closed');
      const entry = observations.find(pod => pod.phase === 'entry' && pod.shutters === 'closed' && pod.heat > 0);
      const opening = observations.find(pod => pod.shutters === 'opening' && pod.deployment > 0 && pod.deployment < 1);
      const deployed = observations.find(pod => pod.shutters === 'open' && pod.heat > 0);
      assert.ok(space && entry && opening && deployed, `${id}: a real closed/heated/opening/deployed phase was not observed.`);
      assert.ok(space.elapsed < entry.elapsed && entry.elapsed < opening.elapsed && opening.elapsed < deployed.elapsed);
      assert.equal(opening.panels.length, 2); assert.equal(deployed.panels.length, 2);
      assert.notDeepEqual(space.panels, deployed.panels, `${id}: mechanical transforms never changed.`);
    }
    await arrival().getByRole('button', { name: 'Reprendre l’arrivée', exact: true }).click();
  });

  await check('The complete 62-second arrival hands off once to three physical capsules', async () => {
    await hunt().waitFor({ timeout: 90000 });
    assert.equal(await arrival().count(), 0);
    assert.equal(await session().getAttribute('data-dev-arrival-run'), triadRun);
    assert.equal(await session().getAttribute('data-dev-arrival-completed-by'), 'natural');
    assert.equal(Number(await session().getAttribute('data-dev-arrival-elapsed')), api.PLANET_ARRIVAL_DURATION_MS);
    assert.equal(await page.evaluate(() => window.__podQaAudit.huntCanvasMounts), 1);
    await beginHunt();
    const initial = await observeHunt('triad-hunt-initial');
    assert.equal(initial.live.count, 3); assert.equal(initial.live.state, 'ready'); assert.equal(initial.live.team, 'triad');
    assert.equal(initial.checkpoint.insertion.companions.length, 2);
    await hunt().locator('.hunt-canvas').scrollIntoViewIfNeeded(); await capture('03-triad-capsules-on-ground');
  });

  await check('X cannot arm beside the pods, or while one companion stays inside the safety radius', async () => {
    assert.equal((await observeHunt('initial-safety')).live.reason, 'unsafe-player');
    await pressX(); await page.waitForTimeout(250);
    assert.equal((await observeHunt('blocked-nearby')).live.state, 'ready');
    await companionOrder('karhek', 'hold');
    heldAt = await hunt().locator('[data-hunt-companion-id="karhek"]').getAttribute('data-hunt-companion-x');
    const distant = await walkUntil('unsafe-companion', 'leave-held-companion-near-pod');
    assert.ok(distant.live.distance >= api.HUNT_POD_RECOVERY.safeRadius);
    assert.equal(await hunt().locator('[data-hunt-companion-id="karhek"]').getAttribute('data-hunt-companion-order'), 'hold');
    assert.equal(await hunt().locator('[data-hunt-companion-id="karhek"]').getAttribute('data-hunt-companion-x'), heldAt);
    await pressX(); await page.waitForTimeout(250);
    assert.equal((await observeHunt('blocked-by-companion')).live.state, 'ready');
    await setFieldOpen(true);
    assert.equal(await hunt().locator('[data-hunt-pod-command]').isDisabled(), true);
    await capture('04-ally-safety-interlock');
    await companionOrder('karhek', 'follow');
  });

  await check('Walking the whole triad away enables arming and a second X cancels', async () => {
    const safe = await walkUntil('ready', 'move-whole-triad-to-safety');
    assert.ok(safe.live.radioDistance <= api.HUNT_POD_RECOVERY.radioRange);
    await companionOrder('karhek', 'hold'); await companionOrder('saketh', 'hold');
    await pressX();
    await hunt().and(page.locator('[data-hunt-pod-state="countdown"]')).waitFor();
    const armed = await observeHunt('first-arm'); assert.ok(armed.live.remaining > 0 && armed.live.remaining <= 3);
    await pressX(); await hunt().and(page.locator('[data-hunt-pod-state="ready"]')).waitFor();
    assert.equal((await observeHunt('manual-cancel')).live.remaining, 0);
  });

  await check('Native pause and in-memory suspend/resume conserve the exact countdown', async () => {
    await pressX(); await hunt().and(page.locator('[data-hunt-pod-state="countdown"]')).waitFor();
    await pauseHunt(); countdownBeforePause = await observeHunt('armed-paused');
    assert.ok(countdownBeforePause.live.remaining > 0);
    await page.waitForTimeout(1200);
    const still = await observeHunt('armed-still-paused');
    assert.equal(still.live.remaining, countdownBeforePause.live.remaining);
    assert.equal(still.checkpoint.elapsed, countdownBeforePause.checkpoint.elapsed);
    assert.equal(still.checkpoint.insertion.podRecovery.remainingSeconds, still.live.remaining);
    await capture('05-countdown-paused');
    await suspendAndResume('countdown', 'countdown');
    await capture('06-countdown-restored');
  });

  await check('Resume completes one destruction and the native checkpoint cannot rearm it', async () => {
    await resumeHunt();
    await hunt().and(page.locator('[data-hunt-pod-state="destroyed"]')).waitFor({ timeout: 45000 });
    await hunt().locator('.hunt-canvas').scrollIntoViewIfNeeded();
    await capture('07-destruction-native');
    await pauseHunt();
    const destroyed = await observeHunt('destroyed-paused');
    const pod = destroyed.checkpoint.insertion.podRecovery;
    assert.equal(pod.phase, 'destroyed'); assert.equal(pod.remainingSeconds, 0);
    assert.ok(Number.isFinite(pod.destroyedAt) && pod.destroyedAt <= destroyed.checkpoint.elapsed);
    assert.ok(destroyed.checkpoint.elapsed - pod.destroyedAt < api.HUNT_POD_RECOVERY.effectSeconds,
      'The native destruction capture must finish before its actual effect lifetime expires.');
    destroyedAt = pod.destroyedAt;
    assert.equal(new Set(pod.alertedIds).size, pod.alertedIds.length);
    await suspendAndResume('destroyed', 'destroyed');
    await resumeHunt(); await pressX(); await page.waitForTimeout(750); await pauseHunt();
    const after = await observeHunt('destroyed-after-extra-command');
    assert.equal(after.checkpoint.insertion.podRecovery.destroyedAt, destroyedAt);
    assert.equal(after.live.state, 'destroyed'); assert.equal(after.live.remaining, 0);
    assert.equal(await hunt().locator('[data-hunt-pod-command]').count(), 0);
  });

  await check('Reset and reload deliberately create fresh isolated trials; a direct solo hunt has one pod', async () => {
    await resumeHunt();
    await page.locator('[data-dev-reset]').click();
    await arrival().waitFor({ timeout: 90000 });
    assert.equal(await hunt().count(), 0);
    const reset = await observeArrival('explicit-reset');
    assert.equal(reset.shot, 'orbit'); assert.ok(reset.elapsed < 1500);
    await navigate('mission-jungle-vey'); await beginHunt();
    const solo = await observeHunt('direct-solo');
    assert.equal(solo.live.count, 1); assert.equal(solo.live.team, 'solo'); assert.equal(solo.live.state, 'ready');
    assert.equal(solo.checkpoint.insertion.companions.length, 0);
    await pressX(); await page.waitForTimeout(250);
    assert.equal((await observeHunt('solo-nearby-command')).live.state, 'ready');
    await assertIsolated('before-disposable-reload');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await beginHunt();
    const reloaded = await observeHunt('direct-solo-reloaded');
    assert.equal(reloaded.live.count, 1); assert.equal(reloaded.live.state, 'ready');
    assert.equal(reloaded.checkpoint.generation, 0);
    assert.equal(reloaded.checkpoint.insertion.podRecovery.destroyedAt, null);
    await hunt().locator('.hunt-canvas').scrollIntoViewIfNeeded(); await capture('08-direct-solo-pod');
  });

  await check('A native landed-ship hunt never creates a pod or its remote control', async () => {
    await navigate('arrival-ship-jungle-vey'); await arrivalReady();
    await arrival().getByRole('button', { name: /^Passer l’arrivée/u }).click();
    await beginHunt();
    const ship = await observeHunt('landed-ship-exclusion');
    assert.equal(ship.live.method, 'ship'); assert.equal(ship.live.state, 'absent'); assert.equal(ship.live.count, 0);
    assert.equal(ship.checkpoint.insertion.podRecovery, undefined);
    assert.equal(await hunt().locator('[data-hunt-pod-command]').count(), 0);
    await pressX(); await page.waitForTimeout(250);
    assert.equal((await observeHunt('landed-ship-after-X')).live.state, 'absent');
  });

  await check('Every requested game image loads and all native sessions remain free of runtime errors and storage writes', async () => {
    assert.deepEqual([...missing], []);
    assert.deepEqual(report.failedRequests.filter(request => request.error !== 'net::ERR_ABORTED'), []);
    assert.deepEqual(report.errors, []); assert.deepEqual(report.consoleErrors, []);
    assert.deepEqual(report.storageOperations, []); assert.deepEqual(report.databaseOpens, []);
    assert.ok([...requested].some(file => file.startsWith('/game/planet-arrival/v3/')));
  });
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.stack || String(error);
  console.error(error.stack || error);
  if (page) {
    try {
      report.failureState = await page.evaluate(() => ({ url: location.href, hidden: document.hidden, focused: document.hasFocus(),
        activeElement: document.activeElement?.outerHTML?.slice(0, 800), text: document.body?.innerText?.slice(0, 18000),
        diagnostics: Array.from(document.querySelectorAll('[data-dev-session], [data-arrival-run], .hunt-screen'), element =>
          Object.fromEntries(Array.from(element.attributes).filter(attribute => attribute.name.startsWith('data-')).map(attribute => [attribute.name, attribute.value]))),
        arrivalFrames: window.__podQaAudit?.frames,
      }));
      await capture('failure');
    } catch (diagnosticError) { report.failureStateError = String(diagnosticError); }
  }
  process.exitCode = 1;
} finally {
  if (context) await context.close();
  if (browser) await browser.close();
  await stopServer();
  report.finishedAt = new Date().toISOString(); report.checkoutCommit = git('rev-parse', 'HEAD');
  report.missingAssets = [...missing].sort(); report.requestedAssets = [...requested].sort();
  report.passedChecks = report.checks.filter(check => check.passed).length;
  report.failedChecks = report.checks.filter(check => !check.passed).length;
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, checks: report.passedChecks, failed: report.failedChecks,
    captures: report.captures.length, missingAssets: report.missingAssets.length, report: path.join(out, 'report.json') }));
}
