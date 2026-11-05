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
 * Run against the real Next /dev route, for example:
 * DEV_TRAVEL_QA_URL=http://127.0.0.1:4193/dev node scripts/qa-dev-travel-browser.mjs
 * Set DEV_TRAVEL_QA_START_SERVER=1 to run Next and Chromium in the same process
 * tree/network namespace. DEV_TRAVEL_QA_SERVER_MODE=production uses next start
 * after a separate successful production build; the default is next dev.
 *
 * The only fulfilled request is a disposable setup document, used BEFORE /dev
 * to create a valid campaign slot through the production migration. The real
 * route, scenes, input, assets and scene callbacks are never intercepted.
 * Storage instrumentation observes writes and calls the original native method;
 * it does not make a leaking sandbox pass by preventing those writes.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.env.DEV_TRAVEL_QA_OUTPUT || 'outputs/qa-dev-travel');
const route = new URL(process.env.DEV_TRAVEL_QA_URL || 'http://127.0.0.1:4193/dev');
route.search = ''; route.hash = '';
assert.equal(route.pathname.replace(/\/$/, ''), '/dev', 'The test must use the actual /dev route.');
await fs.mkdir(out, { recursive: true });
const sha256 = value => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sourceCommit = git('rev-parse', 'HEAD');
if (process.env.DEV_TRAVEL_QA_SOURCE_COMMIT) {
  assert.equal(sourceCommit, process.env.DEV_TRAVEL_QA_SOURCE_COMMIT, 'Requested source commit differs from the checkout.');
}
const sourceFiles = [
  ...(await fs.readdir(path.join(root, 'app/dev'))).filter(file => /\.(tsx?|css)$/.test(file)).map(file => `app/dev/${file}`),
  'app/game/HomeworldHub.tsx', 'app/game/HomeworldRegionV68.tsx', 'app/game/PhysicalShipDeck.tsx',
  'app/game/ClanShipHub.tsx', 'app/game/ClanShipInterior.tsx', 'app/game/HuntCanvas.tsx', 'app/game/ShipHub.tsx',
  'app/game/WolfCastleScene.tsx', 'app/game/PlanetArrivalCinematic.tsx',
  'app/game/systems/wolfCastle.ts', 'app/game/systems/planetArrival.ts', 'app/game/systems/planetArrivalRun.ts',
  'app/game/systems/planetInsertion.ts', 'app/game/systems/shipInsertionEnergy.ts', 'app/game/systems/huntInsertion.ts',
  'scripts/qa-dev-travel-browser.mjs',
].sort();
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async file => [
  file, sha256(await fs.readFile(path.join(root, file))),
])));
const seedBundle = await build({
  stdin: {
    contents: `export { defaultSave, SAVE_STORAGE_KEY } from './app/game/save';
      export { migrateLegacyCampaignSlot, loadCampaignSlots } from './app/game/systems/campaignSlots';
      export { DEV_DESTINATIONS, createDevSave, createDevArrival } from './app/dev/destinations';
      export { DEFAULT_SHIP_ID, shipProfileAssetPath } from './app/game/shipCatalogue';
      export { shipInsertionCharge } from './app/game/systems/shipInsertionEnergy';
      export { WOLF_CASTLE_ROOMS, WOLF_CASTLE_ART_ROOT } from './app/game/systems/wolfCastle';
      export { wolfCastleRuntimeAsset } from './app/game/systems/wolfCastleRuntimeArt';
      export { planetArrivalAssets, planetArrivalDestination, PLANET_ARRIVAL_SHOTS } from './app/game/systems/planetArrival';`,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true, platform: 'browser', format: 'iife', globalName: '__devTravelQaSeed',
  write: false, logLevel: 'silent', define: { 'process.env.NODE_ENV': '"production"' },
});
const headless = process.env.DEV_TRAVEL_QA_HEADLESS !== '0';
const report = {
  schema: 1,
  startedAt: new Date().toISOString(),
  sourceCommit,
  workingTreeDirty: git('status', '--porcelain').length > 0,
  sourceHashes,
  url: route.href,
  runtime: 'actual Next /dev route and production scene components',
  browserMode: headless ? 'headless' : 'headed',
  scope: 'Direct travel, real movement and mission startup, Wolf castle rooms and approach, eight destination arrivals and four explicit insertion variants including a paid cloaked approach, natural and skipped handoffs, reset, URL entry, keyboard and touch, and campaign storage isolation. No complete campaign, art approval or performance qualification.',
  checks: [], captures: [], errors: [], consoleErrors: [], storageOperations: [], databaseOpens: [],
  storageChecks: [], roomVisits: [], movement: [], huntObservations: [], missingAssets: [],
  castleVisits: [], arrivalVisits: [], arrivalTransitions: [], arrivalResets: [], arrivalPauses: [], requestedAssets: [],
};
const missing = new Set();
const requested = new Set();
const loaded = new Set();
let browser, page, protectedState, emptyContext, server;
let serverExit = null;
let currentCheck = 'setup';

async function startServerIfRequested() {
  if (process.env.DEV_TRAVEL_QA_START_SERVER !== '1') return;
  assert.ok(['127.0.0.1', 'localhost'].includes(route.hostname) && route.protocol === 'http:', 'A managed test server must be loopback-only.');
  const production = process.env.DEV_TRAVEL_QA_SERVER_MODE === 'production';
  const distDir = process.env.DEV_TRAVEL_QA_DIST_DIR || (production ? '.next' : '.next-dev-travel');
  const port = route.port || '4193';
  const cli = createRequire(import.meta.url).resolve('next/dist/bin/next');
  const args = [cli, production ? 'start' : 'dev', ...(production ? [] : ['--webpack']), '--hostname', '127.0.0.1', '--port', port];
  const logPath = path.join(out, 'next-server.log');
  const log = await fs.open(logPath, 'w');
  try {
    server = spawn(process.execPath, args, {
      cwd: root, env: { ...process.env, YAUTJA_NEXT_DIST_DIR: distDir }, stdio: ['ignore', log.fd, log.fd],
    });
  } finally { await log.close(); }
  server.once('exit', (code, signal) => { serverExit = { code, signal }; });
  report.server = { mode: production ? 'production' : 'development', distDir, log: 'next-server.log' };
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    if (serverExit) throw new Error(`Next exited before readiness: ${JSON.stringify(serverExit)}. See ${logPath}.`);
    try {
      const response = await fetch(route, { signal: AbortSignal.timeout(10000) });
      if (response.status === 200) return;
    } catch { /* The local listener or first route compilation is not ready yet. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Next did not serve /dev within 180 seconds. See ${logPath}.`);
}

async function stopServer() {
  if (!server || serverExit) return;
  server.kill('SIGTERM');
  await new Promise(resolve => {
    const timer = setTimeout(() => { server.kill('SIGKILL'); resolve(); }, 5000);
    server.once('exit', () => { clearTimeout(timer); resolve(); });
  });
}

function destinationUrl(id) {
  const next = new URL(route);
  if (id) next.searchParams.set('lieu', id);
  return next.href;
}

async function storageSnapshot(target) {
  return target.evaluate(() => {
    const snapshot = storage => Object.fromEntries(Object.keys(storage).sort().map(key => [key, storage.getItem(key)]));
    return { local: snapshot(localStorage), session: snapshot(sessionStorage) };
  });
}

async function assertStorageUnchanged(target, expected, label) {
  const actual = await storageSnapshot(target);
  for (const area of ['local', 'session']) {
    assert.deepEqual(Object.keys(actual[area]), Object.keys(expected[area]), `${label}: ${area} storage keys changed.`);
    for (const key of Object.keys(expected[area])) {
      assert.ok(actual[area][key] === expected[area][key], `${label}: stored bytes changed for ${key}.`);
    }
  }
  report.storageChecks.push({ label, keys: Object.keys(actual.local).length, sha256: sha256(JSON.stringify(actual)) });
  assert.equal(report.storageOperations.length, 0, `${label}: /dev attempted a persistent storage mutation.`);
  assert.equal(report.databaseOpens.length, 0, `${label}: /dev opened a persistent IndexedDB database.`);
}

async function observeContext(context, name) {
  await context.exposeBinding('__devTravelQaStorageEvent', (_source, event) => {
    const entry = { context: name, check: currentCheck, ...event };
    if (entry.operation === 'indexedDB.open') report.databaseOpens.push(entry);
    else report.storageOperations.push(entry);
  });
  await context.addInitScript(() => {
    const observing = () => location.pathname.replace(/\/$/, '') === '/dev';
    for (const operation of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[operation];
      Storage.prototype[operation] = function (...args) {
        if (observing()) {
          void window.__devTravelQaStorageEvent({
            operation, area: this === localStorage ? 'local' : 'session',
            key: operation === 'clear' ? null : String(args[0]), url: location.href,
          });
        }
        return Reflect.apply(original, this, args);
      };
    }
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (...args) {
      if (observing()) void window.__devTravelQaStorageEvent({ operation: 'indexedDB.open', key: String(args[0]), url: location.href });
      return Reflect.apply(open, this, args);
    };
    // Observe native canvas identities only; never replace a renderer, advance
    // a clock, modify scene props or inject a gameplay checkpoint.
    const seen = new WeakSet();
    const observations = { huntCanvasMounts: 0 };
    new MutationObserver(() => {
      if (!observing()) return;
      for (const canvas of document.querySelectorAll('.hunt-screen canvas.hunt-canvas')) {
        if (!seen.has(canvas)) { seen.add(canvas); observations.huntCanvasMounts += 1; }
      }
    }).observe(document, { childList: true, subtree: true });
    window.__devTravelQaObservations = observations;
  });
  context.on('page', target => {
    target.setDefaultTimeout(30000);
    target.on('pageerror', error => report.errors.push({ check: currentCheck, context: name, message: error.message }));
    target.on('console', message => {
      if (message.type() === 'error') report.consoleErrors.push({ check: currentCheck, context: name, message: message.text() });
    });
    target.on('request', request => {
      const pathname = new URL(request.url()).pathname;
      if (pathname.startsWith('/game/')) requested.add(pathname);
    });
    target.on('response', response => {
      if (!response.url().includes('/game/')) return;
      const pathname = new URL(response.url()).pathname;
      if (response.status() >= 400 || (response.request().resourceType() === 'image' && response.headers()['content-type']?.includes('text/html'))) {
        missing.add(pathname);
      } else if (response.status() >= 200 && response.status() < 400) loaded.add(pathname);
    });
  });
}

async function check(name, run) {
  currentCheck = name;
  try {
    await run();
    if (page && protectedState && new URL(page.url()).pathname === '/dev') await assertStorageUnchanged(page, protectedState, name);
    report.checks.push({ name, passed: true });
    console.log('PASS', name);
  } catch (error) {
    report.checks.push({ name, passed: false, message: error.message });
    throw error;
  }
}

async function capture(name, target = page) {
  await target.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const bytes = await target.screenshot({ fullPage: false });
  await fs.writeFile(path.join(out, name + '.png'), bytes);
  report.captures.push({ file: name + '.png', sha256: sha256(bytes), viewport: target.viewportSize() });
}

async function noHorizontalOverflow(target, label) {
  const widths = await target.evaluate(() => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth,
  }));
  assert.ok(widths.document <= widths.viewport + 1, `${label}: document overflows horizontally (${JSON.stringify(widths)}).`);
  assert.ok(widths.body <= widths.viewport + 1, `${label}: body overflows horizontally (${JSON.stringify(widths)}).`);
}

async function jump(id, target = page) {
  if (await target.locator('[data-dev-destination]').count()) await target.locator('[data-dev-destination]').selectOption(id);
  else await target.locator(`[data-dev-launch="${id}"]`).click();
  await target.locator(`[data-dev-session="${id}"]`).waitFor();
  assert.equal(new URL(target.url()).searchParams.get('lieu'), id, 'Quick travel must update the direct URL.');
}

async function clanReady(room, target = page) {
  await target.locator(`[data-clan-ship-status="aboard"][data-clan-ship-room="${room}"]`).waitFor();
  await target.locator(`[data-clan-interior][data-interior-room="${room}"]`).waitFor();
  await target.waitForFunction(() => {
    const image = document.querySelector('[data-interior-background]');
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
  });
  await target.locator('[data-interior-background]').evaluate(image => image.decode());
  const info = await target.locator('[data-clan-interior]').evaluate(element => ({
    room: element.getAttribute('data-interior-room'),
    x: Number(element.getAttribute('data-interior-actor-x')),
    y: Number(element.getAttribute('data-interior-actor-y')),
    image: element.querySelector('[data-interior-background]')?.getAttribute('src'),
    unavailable: Array.from(element.querySelectorAll('[data-art-unavailable="true"]'), item => item.getAttribute('data-interior-art')),
  }));
  assert.ok(Number.isFinite(info.x) && Number.isFinite(info.y), 'Clan Ship actor coordinates must be finite.');
  assert.deepEqual(info.unavailable, [], `Missing visible Clan Ship props in ${room}.`);
  assert.equal(info.image, `/game/clan-ship/interiors/${room}-v1.webp`, 'Each arrival must display its real room backdrop.');
  report.roomVisits.push(info);
  return info;
}

async function decodeRenderedImages(target, selector) {
  const images = await target.locator(selector).evaluate(async element => {
    const native = Array.from(element.querySelectorAll('img'));
    await Promise.all(native.map(image => image.decode()));
    const decoded = native.map(image => ({ src: image.currentSrc || image.src, width: image.naturalWidth, height: image.naturalHeight }));
    // SVG image elements do not expose decode(). Their real rendered hrefs
    // are decoded through the native image loader, without changing the scene.
    const sources = [...new Set(Array.from(element.querySelectorAll('image'), image => image.href.baseVal).filter(Boolean))];
    const svgImages = await Promise.all(sources.map(async src => {
      const image = new Image(); image.src = src;
      await image.decode();
      return { src: image.src, width: image.naturalWidth, height: image.naturalHeight };
    }));
    decoded.push(...svgImages);
    return decoded.map(image => ({ ...image, src: new URL(image.src, location.href).pathname }));
  });
  assert.ok(images.length > 0 && images.every(image => image.width > 0 && image.height > 0), `${selector}: native scene images must decode to nonempty pixels.`);
  return images;
}

const activeCastleSelector = '[data-wolf-castle-status]:not([inert]):not([aria-hidden="true"])';
const activeCastleInteriorSelector = `${activeCastleSelector} [data-wolf-castle-interior]`;

async function castleReady(room, target = page) {
  // A streamed URL entry can briefly retain an explicitly suspended copy.
  // Follow the same active/non-inert scene that can receive native input;
  // two active candidates still fail Playwright's strict locator checks.
  const selector = `${activeCastleSelector}[data-wolf-castle-status="aboard"][data-wolf-castle-room="${room.id}"]`;
  const castle = target.locator(selector);
  await castle.waitFor({ timeout: 90000 });
  await castle.locator('[data-wolf-castle-interior]').waitFor();
  const destination = await castle.evaluate(element => element.closest('[data-dev-session]')?.getAttribute('data-dev-session'));
  assert.equal(destination, new URL(target.url()).searchParams.get('lieu'), 'The active castle must belong to the requested developer destination.');
  const images = await decodeRenderedImages(target, selector);
  assert.ok(images.some(image => image.src === room.background), `Wolf ${room.id} must render its authored room backdrop.`);
  const position = await castle.locator('[data-wolf-castle-interior]').evaluate(element => ({
    x: Number(element.getAttribute('data-wolf-castle-x')),
    y: Number(element.getAttribute('data-wolf-castle-y')),
  }));
  assert.ok(Number.isFinite(position.x) && Number.isFinite(position.y), 'The real Wolf actor must have finite coordinates.');
  const info = { room: room.id, destination, ...position, background: room.background, decodedImages: images.length };
  report.castleVisits.push(info);
  return info;
}

async function waitForLoadedAssets(paths, label) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline && paths.some(src => !loaded.has(src))) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.deepEqual(paths.filter(src => !requested.has(src)), [], `${label}: the native scene did not request its declared assets.`);
  assert.deepEqual(paths.filter(src => !loaded.has(src) || missing.has(src)), [], `${label}: declared scene assets did not load successfully.`);
}

async function observeArrival(target = page) {
  return target.locator('[data-arrival-run]').evaluate(element => ({
    run: element.getAttribute('data-arrival-run'),
    shot: element.getAttribute('data-arrival-shot'),
    status: element.getAttribute('data-arrival-status'),
    elapsed: Number(element.getAttribute('data-arrival-elapsed')),
    method: element.getAttribute('data-arrival-method'),
    team: element.getAttribute('data-arrival-team'),
    shipCloak: element.getAttribute('data-arrival-ship-cloak') === 'true',
    energy: Number(element.closest('[data-dev-session]')?.getAttribute('data-dev-insertion-energy')),
    energyRun: element.closest('[data-dev-session]')?.getAttribute('data-dev-insertion-energy-run'),
    planet: element.querySelector('[data-arrival-scene]')?.getAttribute('data-arrival-planet'),
    ship: element.querySelector('[data-arrival-scene]')?.getAttribute('data-arrival-ship'),
    hunter: element.querySelector('[data-arrival-hunter]')?.getAttribute('data-arrival-hunter'),
    spawn: element.querySelector('[data-arrival-spawn]')?.getAttribute('data-arrival-spawn'),
  }));
}

async function pageDiagnostics(target = page) {
  return target.evaluate(() => {
    const arrival = document.querySelector('[data-arrival-run]');
    const session = document.querySelector('[data-dev-session]');
    const panel = arrival?.querySelector('[aria-labelledby="arrival-pause-title"]');
    const active = document.activeElement;
    return {
      url: location.href, focused: document.hasFocus(), hidden: document.hidden, visibility: document.visibilityState,
      activeElement: active ? { tag: active.tagName, role: active.getAttribute('role'), label: active.getAttribute('aria-label'),
        text: active.textContent?.trim().slice(0, 160) } : null,
      session: session ? { id: session.getAttribute('data-dev-session'), stage: session.getAttribute('data-dev-stage'),
        arrivalStatus: session.getAttribute('data-dev-arrival-status'), arrivalElapsed: session.getAttribute('data-dev-arrival-elapsed') } : null,
      arrival: arrival ? {
        run: arrival.getAttribute('data-arrival-run'), shot: arrival.getAttribute('data-arrival-shot'),
        status: arrival.getAttribute('data-arrival-status'), elapsed: Number(arrival.getAttribute('data-arrival-elapsed')),
        heading: panel?.querySelector('h2')?.textContent?.trim() ?? '',
        reason: Array.from(panel?.querySelectorAll('p') ?? []).at(-1)?.textContent?.trim() ?? '',
        statusNote: arrival.querySelector('[role="status"]')?.textContent?.trim() ?? '',
      } : null,
    };
  });
}

async function arrivalReady(expected, target = page) {
  await target.locator(`[data-dev-session="${expected.id}"][data-dev-stage="arrival"]`).waitFor({ timeout: 90000 });
  await target.waitForFunction(() => {
    const arrival = document.querySelector('[data-arrival-run]');
    return arrival && arrival.getAttribute('data-arrival-status') !== 'prepared';
  }, null, { timeout: 90000 });
  if (await target.locator('[data-arrival-status="paused"]').count()) {
    const before = await pageDiagnostics(target);
    const pause = { id: expected.id, before, resumeAttempted: false };
    report.arrivalPauses.push(pause);
    assert.equal(before.arrival?.status, 'paused');
    assert.doesNotMatch(`${before.arrival.reason}\n${before.arrival.statusNote}`,
      /L’arrivée n’a pas pu être enregistrée|Le passage vers la chasse n’a pas été confirmé|visuels sont indisponibles/u,
      'An arrival checkpoint, handoff or asset error must fail instead of being retried.');
    if (!before.focused || before.hidden || before.visibility !== 'visible') {
      await target.bringToFront();
      await target.waitForFunction(() => document.hasFocus() && !document.hidden, null, { timeout: 30000 });
      pause.afterActivation = await pageDiagnostics(target);
    }
    // The production arrival can start paused, as in the existing campaign QA.
    // Use one native, actionable Resume button; never loop over further pauses.
    pause.resumeAttempted = true;
    await target.getByRole('button', { name: 'Reprendre l’arrivée', exact: true }).click();
    await target.locator('[data-arrival-status="playing"]').waitFor();
    await target.waitForFunction(({ run, elapsed }) => {
      const arrival = document.querySelector('[data-arrival-run]');
      if (arrival?.getAttribute('data-arrival-run') !== run || arrival.getAttribute('data-arrival-status') !== 'playing') {
        throw new Error('The arrival changed run or paused again after its single native resume.');
      }
      return Number(arrival.getAttribute('data-arrival-elapsed')) > elapsed;
    }, { run: before.arrival.run, elapsed: before.arrival.elapsed });
    pause.afterResume = await pageDiagnostics(target);
  }
  await target.locator('[data-arrival-status="playing"]').waitFor();
  const value = await observeArrival(target);
  assert.ok(value.run && Number.isFinite(value.elapsed), 'The cinematic must expose a real run and a finite native timeline.');
  assert.equal(value.planet, expected.planet);
  assert.equal(value.ship, expected.ship);
  assert.equal(value.hunter, expected.hunter);
  assert.equal(value.method, expected.insertion.method);
  assert.equal(value.team, expected.insertion.team);
  assert.equal(value.shipCloak, !!expected.insertion.shipCloak);
  assert.equal(value.energy, expected.energy);
  assert.equal(value.energyRun, expected.insertion.shipCloak ? value.run : null);
  assert.equal(value.spawn, `${expected.missionId}:spawn`);
  assert.equal(await target.locator('[data-arrival-run] h1').textContent(), expected.name);
  assert.ok((await target.locator('[data-arrival-run]').textContent()).includes(expected.title), 'The arrival must name its actual mission.');
  assert.equal(await target.locator('.hunt-screen').count(), 0, 'Gameplay must not mount before arrival is handed off.');
  const images = await decodeRenderedImages(target, '[data-arrival-run]');
  assert.ok(images.some(image => image.src === expected.assets.ground), 'Arrival must render the native mission terrain source.');
  await waitForLoadedAssets(Object.values(expected.assets), expected.id);
  report.arrivalVisits.push({ id: expected.id, ...value, assets: expected.assets, decodedImages: images.length });
  return value;
}

async function freshArrival(expected, label, target = page) {
  await target.locator(`[data-dev-session="${expected.id}"][data-dev-stage="arrival"]`).waitFor({ timeout: 90000 });
  await target.locator('[data-arrival-run]').waitFor({ timeout: 90000 });
  // Read before image decoding. A cached arrival may already be playing;
  // there is no requirement to observe its transient prepared state.
  const value = await observeArrival(target);
  assert.equal(value.shot, 'orbit', `${label}: the fresh arrival must begin at its first native shot.`);
  assert.ok(value.elapsed >= 0 && value.elapsed <= 1000, `${label}: arrival must restart near zero, observed ${value.elapsed} ms.`);
  assert.equal(await target.locator('.hunt-screen').count(), 0, `${label}: resetting the arrival must remove gameplay.`);
  report.arrivalResets.push({ label, id: expected.id, ...value });
  await arrivalReady(expected, target);
  return value;
}

async function assertArrivalHandoff(expected, completion, run, mountsBefore, target = page) {
  const session = target.locator(`[data-dev-session="${expected.id}"][data-dev-stage="hunt"]`);
  await session.waitFor({ timeout: 180000 });
  await target.locator('.hunt-screen canvas.hunt-canvas').waitFor({ timeout: 90000 });
  await target.locator('[data-mission-opening-v78]').waitFor({ timeout: 90000 });
  assert.equal(new URL(target.url()).searchParams.get('lieu'), expected.id, 'Handoff must retain the bookmarked arrival destination.');
  assert.equal(await target.locator('[data-arrival-run]').count(), 0, 'The native arrival must unmount at handoff.');
  assert.equal(await target.locator('.hunt-screen canvas.hunt-canvas').count(), 1);
  assert.equal(await target.locator('.hunt-screen').getAttribute('aria-label'), `Mission ${expected.title} sur ${expected.name}`, 'The actual HuntCanvas must receive the same mission as the arrival.');
  const handoff = await session.evaluate(element => ({
    run: element.getAttribute('data-dev-arrival-run'),
    status: element.getAttribute('data-dev-arrival-status'),
    completedBy: element.getAttribute('data-dev-arrival-completed-by'),
    elapsed: Number(element.getAttribute('data-dev-arrival-elapsed')),
    mission: element.getAttribute('data-dev-arrival-mission'),
    huntGeneration: Number(element.getAttribute('data-dev-hunt-generation')),
  }));
  assert.equal(handoff.run, run, 'Handoff must keep the native arrival run identity.');
  assert.equal(handoff.status, 'complete');
  assert.equal(handoff.completedBy, completion);
  assert.equal(handoff.mission, expected.missionId);
  if (completion === 'natural') assert.equal(handoff.elapsed, 62000, 'Natural handoff requires all 62 seconds of the real timeline.');
  assert.equal(await target.evaluate(() => window.__devTravelQaObservations.huntCanvasMounts), mountsBefore + 1, 'One arrival must mount HuntCanvas exactly once.');
  await target.getByRole('button', { name: 'Commencer la chasse', exact: true }).click();
  await target.locator('[data-mission-opening-v78]').waitFor({ state: 'hidden' });
  await target.waitForFunction(() => Array.from(document.querySelectorAll('.hunt-screen summary')).some(element => {
    const match = element.textContent?.match(/Détails\s*·\s*(\d+):(\d+)/);
    return match && Number(match[1]) * 60 + Number(match[2]) > 0;
  }), null, { timeout: 30000 });
  assert.equal(await target.evaluate(() => window.__devTravelQaObservations.huntCanvasMounts), mountsBefore + 1, 'Leaving the native briefing must preserve the same hunt canvas.');
  assert.equal(Number(await session.getAttribute('data-dev-hunt-generation')), handoff.huntGeneration);
  report.arrivalTransitions.push({ id: expected.id, ...handoff, huntCanvasMounts: 1 });
}

async function moveWithKeyboard(target, focusSelector, actorSelector, xAttribute, yAttribute, label) {
  const actor = () => target.locator(actorSelector).evaluate((element, fields) => ({
    x: Number(element.getAttribute(fields[0])), y: Number(element.getAttribute(fields[1])),
  }), [xAttribute, yAttribute]);
  // A null selector deliberately relies on focus restored by the application.
  if (focusSelector) await target.locator(focusSelector).focus();
  const before = await actor();
  await target.keyboard.down('ArrowRight');
  try {
    await target.waitForFunction(({ selector, field, x }) => Number(document.querySelector(selector)?.getAttribute(field)) > x + 12,
      { selector: actorSelector, field: xAttribute, x: before.x }, { timeout: 10000 });
  } finally { await target.keyboard.up('ArrowRight'); }
  const after = await actor();
  report.movement.push({ label, before, after });
  return { before, after };
}

try {
  await startServerIfRequested();
  // Actions installs Playwright's pinned browser. A local system Chromium is a
  // fallback only when that installed executable is absent; never change the
  // sandbox's process/socket policy to make a browser launch.
  const executablePath = process.env.CHROMIUM_EXECUTABLE || await fs.access(chromium.executablePath())
    .then(() => undefined, () => '/usr/bin/chromium');
  browser = await chromium.launch({
    executablePath,
    headless, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  report.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
  await observeContext(context, 'existing-campaign');
  page = await context.newPage();
  const setupUrl = new URL('/__dev-travel-qa-seed', route).href;
  await context.route(setupUrl, request => request.fulfill({
    status: 200, contentType: 'text/html', body: '<!doctype html><html lang="fr"><title>Isolated QA setup</title><body></body></html>',
  }));
  await page.goto(setupUrl, { waitUntil: 'domcontentloaded' });
  await page.addScriptTag({ content: seedBundle.outputFiles[0].text });
  const seeded = await page.evaluate(async () => {
    const api = window.__devTravelQaSeed;
    const save = api.defaultSave('2026-11-01T12:00:00.000Z');
    save.profile.hunterName = 'QA campagne à conserver';
    save.profile.playTimeSeconds = 321;
    save.settings.masterVolume = 0;
    const raw = JSON.stringify(save);
    localStorage.setItem(api.SAVE_STORAGE_KEY, raw);
    localStorage.setItem(api.SAVE_STORAGE_KEY + '.backup', raw);
    const result = await api.migrateLegacyCampaignSlot();
    localStorage.setItem('qa.unrelated-preserved', 'Ce contenu ne fait pas partie du jeu.');
    sessionStorage.setItem('qa.session-preserved', 'Onglet existant');
    const arrivals = api.DEV_DESTINATIONS.filter(destination => destination.kind === 'arrival').map(destination => {
      const fixture = api.createDevSave(destination);
      const { state } = api.createDevArrival(destination, fixture);
      return { id: destination.id, missionId: destination.missionId, name: state.destinationDisplayName,
        title: api.planetArrivalDestination(destination.missionId).mission.title,
        planet: state.destinationId, ship: state.personalShipId, hunter: state.hunterPresetId,
        explicitInsertion: state.insertion !== undefined,
        insertion: state.insertion ?? { version: 1, method: 'pod', team: 'solo' },
        energy: api.shipInsertionCharge(fixture.shipInsertionEnergy, fixture.createdAt, state.personalShipId),
        assets: api.planetArrivalAssets(state) };
    });
    return {
      ok: result.ok, failure: result.message, slot: result.slotId,
      destinations: api.DEV_DESTINATIONS.map(({ id, kind, category, roomId, missionId }) => ({ id, kind, category, roomId, missionId })),
      castleRooms: api.WOLF_CASTLE_ROOMS.map(room => ({ id: room.id,
        background: api.wolfCastleRuntimeAsset(`${api.WOLF_CASTLE_ART_ROOT}${room.background}.png`) })),
      castleApproachAssets: [api.wolfCastleRuntimeAsset(`${api.WOLF_CASTLE_ART_ROOT}castle-exterior.png`), api.shipProfileAssetPath(api.DEFAULT_SHIP_ID)],
      arrivals,
      arrivalShots: api.PLANET_ARRIVAL_SHOTS,
    };
  });
  assert.equal(seeded.ok, true, seeded.failure);
  assert.equal(seeded.slot, 1, 'The protected fixture must contain a real migrated campaign slot.');
  protectedState = await storageSnapshot(page);
  report.protectedStorage = { keys: Object.keys(protectedState.local), sha256: sha256(JSON.stringify(protectedState)) };
  await context.unroute(setupUrl);

  await check('Hidden /dev route opens directly with noindex and a complete destination catalogue', async () => {
    await page.goto(route.href, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('[data-dev-catalogue]').waitFor({ timeout: 120000 });
    assert.ok((await page.locator('meta[name="robots"]').getAttribute('content'))?.includes('noindex'));
    assert.equal(await page.locator('[data-dev-launch]').count(), seeded.destinations.length);
    for (const id of ['ship', 'clan-hangar', 'homeworld-port', 'mission-jungle-vey', 'wolf-approach', 'wolf-royal-audience', 'arrival-jungle-vey']) {
      assert.equal(await page.locator(`[data-dev-launch="${id}"]`).count(), 1, `${id} is missing from the catalogue.`);
    }
    await noHorizontalOverflow(page, 'Desktop catalogue');
    await capture('01-desktop-catalogue');
  });

  await check('Category and accent-insensitive search filter actual destination buttons', async () => {
    await page.locator('[data-dev-category="clan"]').click();
    assert.equal(await page.locator('[data-dev-launch]').count(), 8);
    await page.locator('[data-dev-search]').fill('entrainement');
    assert.equal(await page.locator('[data-dev-launch]').count(), 1);
    assert.equal(await page.locator('[data-dev-launch]').getAttribute('data-dev-launch'), 'clan-entrainement');
    await page.locator('[data-dev-search]').fill('');
    await page.locator('[data-dev-category="all"]').click();
  });

  await check('Keyboard launch opens the real personal deck, movement works, and reset restores the starting point', async () => {
    await page.locator('[data-dev-launch="ship"]').focus();
    await page.keyboard.press('Enter');
    await page.locator('[data-dev-session="ship"] .physical-ship-deck').waitFor({ timeout: 120000 });
    const moved = await moveWithKeyboard(page, '.physical-ship-deck', '.physical-ship-deck', 'data-player-x', 'data-player-y', 'personal-ship');
    await page.locator('[data-dev-reset]').click();
    await page.waitForFunction(({ x, y }) => {
      const deck = document.querySelector('.physical-ship-deck');
      return Number(deck?.getAttribute('data-player-x')) === x && Number(deck?.getAttribute('data-player-y')) === y;
    }, moved.before);
    await capture('02-personal-ship');
  });

  await check('Changing equipment in the test armory stays in memory and returning preserves the personal deck', async () => {
    await page.locator('.ship-level-accessibility > summary').click();
    await page.locator('.physical-ship-deck__station-shortcuts').getByRole('button', { name: /armurerie/i }).click();
    const armory = page.locator('[data-dev-service="armory"]');
    await armory.waitFor();
    const weapon = armory.getByLabel(/^Arme\s+1(?=\D|$)/);
    const before = await weapon.inputValue();
    const next = await weapon.locator('option').evaluateAll((options, selected) => options.find(option => !option.disabled && option.value !== selected)?.value, before);
    assert.ok(next, 'The test armory must offer an alternative real weapon.');
    await weapon.selectOption(next);
    assert.equal(await weapon.inputValue(), next);
    await page.locator('[data-dev-service-back]').click();
    await page.locator('.physical-ship-deck[data-suspended="false"]').waitFor();
    await page.locator('.physical-ship-deck__station-shortcuts').getByRole('button', { name: /armurerie/i }).click();
    assert.equal(await page.locator('[data-dev-service="armory"]').getByLabel(/^Arme\s+1(?=\D|$)/).inputValue(), next);
    await page.locator('[data-dev-service-back]').click();
  });

  await check('All seven Clan Ship room arrivals mount the real interior and their authored scenery', async () => {
    for (const room of ['hangar', 'armurerie', 'entrainement', 'conseil', 'archives', 'trophees', 'soins']) {
      await jump('clan-' + room);
      await clanReady(room);
      await assertStorageUnchanged(page, protectedState, 'direct-clan-' + room);
    }
    await jump('clan-hangar');
    await clanReady('hangar');
    await moveWithKeyboard(page, '[data-interior-world]', '[data-clan-interior]', 'data-interior-actor-x', 'data-interior-actor-y', 'clan-hangar');
    await noHorizontalOverflow(page, 'Desktop Clan Ship');
    await capture('03-clan-hangar');
  });

  await check('Approach, docking and boarding use the real Clan Ship transitions within the test session', async () => {
    await jump('clan-docking');
    await page.locator('[data-clan-ship-status="free-flight"]').waitFor();
    for (const [action, state] of [['approach', 'approach'], ['dock', 'docked'], ['board', 'aboard']]) {
      await page.locator(`[data-clan-ship-action="${action}"]`).click();
      await page.locator(`[data-clan-ship-status="${state}"]`).waitFor();
    }
    await clanReady('hangar');
  });

  await check('Homeworld port and market open at distinct real city positions, and city movement works', async () => {
    const points = [];
    for (const id of ['homeworld-port', 'homeworld-market']) {
      await jump(id);
      await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({ timeout: 120000 });
      points.push(await page.locator('[data-homeworld-actor]').evaluate(element => ({
        x: Number(element.getAttribute('data-x')), y: Number(element.getAttribute('data-y')),
        level: element.getAttribute('data-homeworld-level-v77'),
      })));
      await assertStorageUnchanged(page, protectedState, id);
      if (id === 'homeworld-port') {
        await moveWithKeyboard(page, '[data-homeworld-viewport]', '[data-homeworld-actor]', 'data-x', 'data-y', 'homeworld-port');
      }
    }
    assert.ok(points[0].level !== points[1].level || Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) > 200, 'Two named city arrivals must not both fall back to the default port.');
    await noHorizontalOverflow(page, 'Desktop Homeworld');
    await capture('04-homeworld-market');
  });

  await check('A regional destination opens its live village, and F8 returns to the catalogue even from its modal', async () => {
    await jump('region-glass-desert');
    await page.locator('[data-homeworld-region-v68="glass-desert"][data-zone="village"]').waitFor({ timeout: 120000 });
    // The native region starts paused and exposes this entry action only after its scenery is ready.
    await page.locator('[data-region-resume]').click({ timeout: 120000 });
    await page.waitForFunction(() => Number(document.querySelector('[data-homeworld-region-v68="glass-desert"]')?.getAttribute('data-state-tick')) > 2);
    // The actor anchor is intentionally 0 by 0; its positioned sprite carries the visible bounds.
    const regionSprite = page.locator('[data-region-player] img').first();
    await regionSprite.waitFor();
    await regionSprite.evaluate(image => image.decode());
    await capture('05-regional-village');
    await page.locator('[data-village-open-atlas-v70]').click();
    await page.locator('[data-region-resume]').waitFor();
    await page.keyboard.press('F8');
    await page.locator('[data-dev-catalogue]').waitFor();
    assert.equal(await page.locator('[data-dev-session]').count(), 0);
  });

  await check('All nine Wolf castle arrivals render their real rooms, accept movement and reset the disposable visit', async () => {
    assert.equal(seeded.castleRooms.length, 9);
    assert.equal(seeded.destinations.filter(destination => destination.kind === 'wolf').length, 10);
    await page.locator('[data-dev-category="wolf"]').click();
    assert.equal(await page.locator('[data-dev-launch]').count(), 10);
    await page.locator('[data-dev-category="all"]').click();
    for (const room of seeded.castleRooms) {
      await jump(`wolf-${room.id}`);
      const initial = await castleReady(room);
      if (room.id === 'royal-berth') {
        await moveWithKeyboard(page, activeCastleInteriorSelector, activeCastleInteriorSelector,
          'data-wolf-castle-x', 'data-wolf-castle-y', 'wolf-royal-berth');
        await page.locator(`${activeCastleInteriorSelector}[data-wolf-castle-moving="false"]`).waitFor();
        await page.locator('[data-dev-reset]').click();
        await page.waitForFunction(({ selector, x, y }) => {
          const actor = document.querySelector(selector);
          return Number(actor?.getAttribute('data-wolf-castle-x')) === x && Number(actor?.getAttribute('data-wolf-castle-y')) === y;
        }, { ...initial, selector: activeCastleInteriorSelector });
        const reset = await castleReady(room);
        assert.equal(reset.x, initial.x); assert.equal(reset.y, initial.y);
      }
      if (room.id === 'royal-audience') await capture('10-wolf-castle-audience');
      await assertStorageUnchanged(page, protectedState, `direct-wolf-${room.id}`);
    }
  });

  await check('Wolf approach, boarding, settings and departure use native actions, and F8 escapes its real map', async () => {
    await jump('wolf-approach');
    const activeCastle = page.locator(activeCastleSelector);
    await page.locator(`${activeCastleSelector}[data-wolf-castle-status="approach"]`).waitFor();
    const approachImages = await decodeRenderedImages(page, `${activeCastleSelector}[data-wolf-castle-status="approach"]`);
    for (const src of seeded.castleApproachAssets) assert.ok(approachImages.some(image => image.src === src), `Wolf approach must display ${src}.`);
    await capture('09-wolf-castle-approach');
    await activeCastle.locator('[data-wolf-castle-action="board"]').click();
    const berth = seeded.castleRooms.find(room => room.id === 'royal-berth');
    const beforeSettings = await castleReady(berth);
    await activeCastle.locator('[data-wolf-castle-menu]').click();
    await page.locator('[data-dev-service="settings"]').waitFor();
    await assertStorageUnchanged(page, protectedState, 'wolf-settings-open');
    await page.locator('[data-dev-service-back]').click();
    await page.waitForFunction(selector => document.querySelector(selector)?.contains(document.activeElement), activeCastleInteriorSelector);
    const afterSettings = await castleReady(berth);
    assert.equal(afterSettings.x, beforeSettings.x); assert.equal(afterSettings.y, beforeSettings.y);
    await moveWithKeyboard(page, null, activeCastleInteriorSelector,
      'data-wolf-castle-x', 'data-wolf-castle-y', 'wolf-after-settings-native-focus');
    await page.locator(`${activeCastleInteriorSelector}[data-wolf-castle-moving="false"]`).waitFor();
    await activeCastle.locator('[data-wolf-castle-interact="personal-ship"]').click();
    await activeCastle.locator('[data-wolf-castle-dialog="departure"]').waitFor();
    await activeCastle.locator('[data-wolf-castle-action="depart"]').click();
    await page.locator('[data-dev-session="ship"]').waitFor();
    assert.equal(new URL(page.url()).searchParams.get('lieu'), 'ship');

    await page.goto(destinationUrl('wolf-royal-archives'), { waitUntil: 'domcontentloaded', timeout: 120000 });
    const archives = seeded.castleRooms.find(room => room.id === 'royal-archives');
    const initial = await castleReady(archives);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    const reloaded = await castleReady(archives);
    assert.equal(reloaded.x, initial.x); assert.equal(reloaded.y, initial.y);
    await activeCastle.locator('[data-wolf-castle-map]').click();
    await activeCastle.locator('[data-wolf-castle-dialog="map"]').waitFor();
    await page.keyboard.press('F8');
    await page.locator('[data-dev-catalogue]').waitFor();
    assert.equal(await page.locator('[data-wolf-castle-status]').count(), 0);
  });

  await check('Eight destination arrivals and four insertion variants preload their real resources and preserve their paid identities', async () => {
    assert.equal(seeded.arrivals.filter(arrival => !arrival.explicitInsertion).length, 8);
    assert.equal(seeded.arrivals.filter(arrival => arrival.explicitInsertion).length, 4);
    await page.locator('[data-dev-category="arrivals"]').click();
    assert.equal(await page.locator('[data-dev-launch]').count(), seeded.arrivals.length);
    for (const expected of seeded.arrivals) {
      await jump(expected.id);
      await arrivalReady(expected);
      await assertStorageUnchanged(page, protectedState, expected.id);
      await page.keyboard.press('F8');
      await page.locator('[data-dev-catalogue]').waitFor();
      assert.equal(await page.locator('[data-arrival-run]').count(), 0);
      assert.equal(await page.locator('.hunt-screen').count(), 0);
    }
    await page.locator('[data-dev-category="all"]').click();
  });

  await check('Arrival pause, mobile controls, reload, reset and native Skip preserve the campaign and enter one real hunt', async () => {
    const expected = seeded.arrivals.find(destination => destination.missionId === 'jungle-vey');
    await jump(expected.id);
    await arrivalReady(expected);
    await page.waitForFunction(() => {
      const arrival = document.querySelector('[data-arrival-run][data-arrival-status="playing"]');
      const active = document.activeElement;
      return Number(arrival?.getAttribute('data-arrival-elapsed')) >= 2000 && document.hasFocus() && !document.hidden &&
        active instanceof HTMLButtonElement && arrival.contains(active) && active.textContent?.trim() === 'Pause' && !active.disabled;
    });
    await page.keyboard.press('Escape');
    await page.locator('[data-arrival-status="paused"]').waitFor();
    const paused = await observeArrival();
    await page.waitForTimeout(650);
    assert.equal((await observeArrival()).elapsed, paused.elapsed, 'Native pause must freeze the arrival timeline.');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await noHorizontalOverflow(page, 'Mobile arrival pause');
    assert.equal(await page.locator('[data-arrival-run]').getAttribute('data-arrival-reduced-motion'), 'true');
    await capture('11-arrival-pause-mobile');
    await page.getByRole('button', { name: 'Reprendre l’arrivée', exact: true }).tap();
    await page.waitForFunction(elapsed => Number(document.querySelector('[data-arrival-run]')?.getAttribute('data-arrival-elapsed')) > elapsed, paused.elapsed);
    assert.equal((await observeArrival()).run, paused.run);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('[data-dev-reset]').click();
    await freshArrival(expected, 'reset-during-arrival');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await freshArrival(expected, 'bookmarked-arrival-reload');
    await page.locator('[data-arrival-run]').getByRole('button', { name: 'Pause', exact: true }).click();
    await page.locator('[data-arrival-status="paused"]').waitFor();
    await page.locator('[data-arrival-run]').getByRole('button', { name: /revenir.*(?:menu|lieux)/i }).click();
    await page.locator('[data-dev-catalogue]').waitFor();
    assert.equal(await page.locator('[data-arrival-run]').count(), 0);
    await assertStorageUnchanged(page, protectedState, 'arrival-native-exit');

    await jump(expected.id);
    const beforeSkip = await arrivalReady(expected);
    const mountsBefore = await page.evaluate(() => window.__devTravelQaObservations.huntCanvasMounts);
    await page.locator('[data-arrival-run]').getByRole('button', { name: /^Passer l’arrivée/ }).click();
    await assertArrivalHandoff(expected, 'skipped', beforeSkip.run, mountsBefore);
    await assertStorageUnchanged(page, protectedState, 'arrival-skipped-handoff');
    await page.locator('[data-dev-reset]').click();
    await freshArrival(expected, 'reset-after-handoff');
  });

  await check('A full natural arrival presents all eight shots and hands the same mission to one real hunt without storage writes', async () => {
    const expected = seeded.arrivals.find(destination => destination.missionId === 'jungle-vey');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('[data-dev-reset]').click();
    const first = await freshArrival(expected, 'natural-arrival-start');
    await page.locator('[data-arrival-reduced-motion="false"]').waitFor();
    assert.equal(first.shot, 'orbit');
    const shots = [first];
    const mountsBefore = await page.evaluate(() => window.__devTravelQaObservations.huntCanvasMounts);
    for (const shot of seeded.arrivalShots.slice(1)) {
      await page.locator(`[data-arrival-shot="${shot.id}"][data-arrival-status="playing"]`).waitFor({ timeout: 120000 });
      const current = await observeArrival();
      assert.equal(current.run, first.run, 'Natural arrival must retain its run across every native shot.');
      assert.ok(current.elapsed > shots.at(-1).elapsed, 'The native arrival clock must advance without restarting.');
      assert.equal(current.planet, expected.planet); assert.equal(current.ship, expected.ship);
      shots.push(current);
      if (shot.id === 'egress') {
        await page.waitForFunction(start => Number(document.querySelector('[data-arrival-run]')?.getAttribute('data-arrival-elapsed')) >= start + 1000, shot.startMs);
        await page.locator('[data-arrival-ground-pod="true"]').waitFor();
        assert.equal(await page.locator('[data-arrival-scene]').getAttribute('data-arrival-contact'), 'true');
        await capture('12-arrival-natural-egress');
      }
    }
    assert.deepEqual(shots.map(shot => shot.shot), seeded.arrivalShots.map(shot => shot.id));
    await assertArrivalHandoff(expected, 'natural', first.run, mountsBefore);
    report.arrivalTransitions.at(-1).shots = shots;
    await assertStorageUnchanged(page, protectedState, 'arrival-natural-handoff');
    await capture('13-hunt-after-natural-arrival');
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  await check('A real mission keeps its position and clock after walking into a newly discovered room', async () => {
    await jump('mission-jungle-vey');
    await page.locator('[data-mission-opening-v78]').waitFor({ timeout: 120000 });
    await page.getByRole('button', { name: 'Commencer la chasse', exact: true }).click();
    await page.locator('[data-mission-opening-v78]').waitFor({ state: 'hidden' });
    await page.locator('.hunt-canvas').waitFor();
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.hunt-screen summary')).some(element => {
      const match = element.textContent?.match(/Détails\s*·\s*(\d+):(\d+)/);
      return match && Number(match[1]) * 60 + Number(match[2]) > 0;
    }), null, { timeout: 30000 });

    // These read-only /dev diagnostics come from HuntCanvas's public native
    // checkpoint callback. The test never reads React internals, sets an actor
    // position, advances the simulation clock, or rewrites a scene callback.
    const observe = async () => {
      const value = await page.locator('[data-dev-session="mission-jungle-vey"]').evaluate(element => ({
        x: Number(element.getAttribute('data-dev-hunt-x')),
        elapsed: Number(element.getAttribute('data-dev-hunt-elapsed')),
        generation: Number(element.getAttribute('data-dev-hunt-generation')),
        rooms: JSON.parse(element.getAttribute('data-dev-hunt-discovered-rooms') || '[]'),
      }));
      assert.ok(Number.isFinite(value.x) && Number.isFinite(value.elapsed), 'Native hunt checkpoint diagnostics must be finite.');
      report.huntObservations.push(value);
      return value;
    };
    await page.locator('[data-dev-hunt-x]').waitFor();
    // Capture a fresh checkpoint after the first room has been discovered.
    // The initial insertion snapshot can still have an empty room list; using
    // it here would mistake the starting room for a second-room discovery.
    await page.locator('.hunt-pause-button').click();
    await page.getByRole('dialog', { name: 'Chasse en pause · Carte et sac', exact: true }).waitFor();
    await page.waitForFunction(() => {
      const session = document.querySelector('[data-dev-session="mission-jungle-vey"]');
      const rooms = JSON.parse(session?.getAttribute('data-dev-hunt-discovered-rooms') || '[]');
      return Number(session?.getAttribute('data-dev-hunt-elapsed')) > 0 && rooms.includes('jungle-pilot-approach');
    });
    const initial = await observe();
    assert.ok(initial.rooms.includes('jungle-pilot-approach'), 'The baseline checkpoint must include the real insertion room.');
    await page.getByRole('button', { name: 'Reprendre', exact: true }).click();
    let discovered = initial;
    // The next ground room starts 575 pixels beyond this fixture's insertion.
    // The observed CI run advanced about 23 pixels per 650 ms input pulse.
    // Bound the real-input traversal while retaining the native discovery exit.
    for (let attempt = 0; attempt < 40; attempt++) {
      await page.locator('.hunt-canvas').focus();
      await page.keyboard.down('ArrowRight');
      try { await page.waitForTimeout(650); }
      finally { await page.keyboard.up('ArrowRight'); }
      await page.locator('.hunt-pause-button').click();
      await page.getByRole('dialog', { name: 'Chasse en pause · Carte et sac', exact: true }).waitFor();
      const observed = await observe();
      assert.equal(observed.generation, initial.generation, 'A discovery must not create a new hunt generation.');
      assert.ok(observed.elapsed > discovered.elapsed, 'The mission clock restarted while acknowledging exploration.');
      discovered = observed;
      await page.getByRole('button', { name: 'Reprendre', exact: true }).click();
      if (discovered.x >= initial.x + 300 && discovered.rooms.some(room => !initial.rooms.includes(room))) break;
    }
    assert.ok(discovered.x >= initial.x + 300, 'The hunter did not walk at least 300 world pixels through real input.');
    assert.ok(discovered.rooms.some(room => !initial.rooms.includes(room)), 'The walk must discover another room to exercise the exploration acknowledgement.');
    await page.waitForTimeout(1000);
    assert.equal(await page.locator('[data-mission-opening-v78]').count(), 0, 'The briefing must not reopen after a discovery.');
    await page.locator('.hunt-pause-button').click();
    await page.getByRole('dialog', { name: 'Chasse en pause · Carte et sac', exact: true }).waitFor();
    const afterDiscovery = await observe();
    assert.equal(afterDiscovery.generation, initial.generation);
    assert.ok(afterDiscovery.x >= initial.x + 300, 'Exploration acknowledgement returned the hunter to the insertion spawn.');
    assert.ok(afterDiscovery.elapsed > discovered.elapsed, 'The live clock must continue after the newly discovered room.');
    assert.ok(discovered.rooms.every(room => afterDiscovery.rooms.includes(room)), 'Acknowledged discovered rooms must remain present in the native checkpoint.');
    await page.getByRole('button', { name: 'Reprendre', exact: true }).click();
    await capture('06-hunt-active');
    await page.locator('[data-dev-reset]').click();
    await page.locator('[data-mission-opening-v78]').waitFor({ timeout: 120000 });
    const reset = await observe();
    assert.equal(reset.x, initial.x, 'Explicit reset must return to the insertion spawn.');
    assert.equal(reset.elapsed, 0, 'Explicit reset must restart the hunt clock.');
  });

  await check('Direct bookmarked room URLs and reload recreate a disposable session', async () => {
    await page.goto(destinationUrl('clan-trophees'), { waitUntil: 'domcontentloaded', timeout: 120000 });
    await clanReady('trophees');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('[data-dev-session="clan-trophees"]').waitFor();
    await clanReady('trophees');
  });

  await check('Unknown destination is recoverable through the catalogue', async () => {
    await page.goto(destinationUrl('unknown-dev-location'), { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('[data-dev-catalogue]').waitFor();
    assert.equal(await page.locator('[data-dev-session]').count(), 0);
    assert.match(await page.locator('[data-dev-notice]').innerText(), /inconnu/i);
    await page.locator('[data-dev-launch="ship"]').click();
    await page.locator('.physical-ship-deck').waitFor();
    await page.locator('[data-dev-back]').click();
    await page.locator('[data-dev-catalogue]').waitFor();
    await page.waitForFunction(() => document.activeElement?.getAttribute('data-dev-launch') === 'ship');
  });

  await check('Mobile catalogue and Clan Ship support touch at 390 px without horizontal overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await noHorizontalOverflow(page, 'Mobile catalogue');
    await capture('07-mobile-catalogue');
    await page.locator('[data-dev-launch="clan-hangar"]').tap();
    await clanReady('hangar');
    await noHorizontalOverflow(page, 'Mobile Clan Ship');
    await capture('08-mobile-clan');
    await page.locator('[data-dev-back]').tap();
    await page.locator('[data-dev-catalogue]').waitFor();
    await noHorizontalOverflow(page, 'Mobile catalogue after return');
  });

  await check('An empty browser can visit and reset a real room without creating any save or database', async () => {
    emptyContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    await observeContext(emptyContext, 'empty-browser');
    const blankPage = await emptyContext.newPage();
    await blankPage.goto(destinationUrl('clan-hangar'), { waitUntil: 'domcontentloaded', timeout: 120000 });
    await clanReady('hangar', blankPage);
    await blankPage.locator('[data-dev-reset]').click();
    await clanReady('hangar', blankPage);
    await blankPage.locator('[data-dev-back]').click();
    await blankPage.locator('[data-dev-catalogue]').waitFor();
    await assertStorageUnchanged(blankPage, { local: {}, session: {} }, 'empty-browser-after-reset-and-return');
    await emptyContext.close(); emptyContext = null;
  });

  await check('Leaving development returns to the ordinary game menu with no developer navigation entry', async () => {
    await assertStorageUnchanged(page, protectedState, 'before-leaving-dev');
    assert.equal(await page.locator('[data-dev-quit]').getAttribute('href'), '/');
    await page.locator('[data-dev-quit]').click();
    await page.waitForURL(url => url.origin === route.origin && url.pathname === '/', { timeout: 120000 });
    await page.locator('[data-campaign-menu]').waitFor({ timeout: 120000 });
    assert.equal(await page.locator('[data-dev-travel]').count(), 0);
    assert.equal(await page.locator('a[href^="/dev"]:visible').count(), 0);
  });

  await check('Visited development scenes produce no missing asset, uncaught JavaScript exception or storage write', async () => {
    assert.deepEqual([...missing].sort(), [], 'Every requested game asset must load successfully.');
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.storageOperations, []);
    assert.deepEqual(report.databaseOpens, []);
  });
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack || String(error);
  console.error(error.stack || error);
  if (page && !page.isClosed()) {
    try { report.failureState = await pageDiagnostics(); }
    catch (diagnosticError) { report.failureStateError = String(diagnosticError); }
    try { await capture('failure'); } catch { /* Preserve the original failure. */ }
  }
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  report.missingAssets = [...missing].sort();
  report.requestedAssets = [...requested].sort();
  report.passedChecks = report.checks.filter(result => result.passed).length;
  report.failedChecks = report.checks.filter(result => !result.passed).length;
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await emptyContext?.close();
  await browser?.close();
  await stopServer();
  console.log(JSON.stringify({ passed: report.passed, checks: report.passedChecks, failed: report.failedChecks, missingAssets: report.missingAssets.length, report: path.join(out, 'report.json') }));
}
