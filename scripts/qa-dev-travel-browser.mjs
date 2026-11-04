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
  'scripts/qa-dev-travel-browser.mjs',
].sort();
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async file => [
  file, sha256(await fs.readFile(path.join(root, file))),
])));
const seedBundle = await build({
  stdin: {
    contents: `export { defaultSave, SAVE_STORAGE_KEY } from './app/game/save';
      export { migrateLegacyCampaignSlot, loadCampaignSlots } from './app/game/systems/campaignSlots';
      export { DEV_DESTINATIONS } from './app/dev/destinations';`,
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
  scope: 'Direct travel, real movement and mission startup, reset, URL entry, keyboard and touch, and campaign storage isolation. No complete campaign, art approval or performance qualification.',
  checks: [], captures: [], errors: [], consoleErrors: [], storageOperations: [], databaseOpens: [],
  storageChecks: [], roomVisits: [], movement: [], huntObservations: [], missingAssets: [],
};
const missing = new Set();
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
  });
  context.on('page', target => {
    target.setDefaultTimeout(30000);
    target.on('pageerror', error => report.errors.push({ check: currentCheck, context: name, message: error.message }));
    target.on('console', message => {
      if (message.type() === 'error') report.consoleErrors.push({ check: currentCheck, context: name, message: message.text() });
    });
    target.on('response', response => {
      if (!response.url().includes('/game/')) return;
      if (response.status() >= 400 || (response.request().resourceType() === 'image' && response.headers()['content-type']?.includes('text/html'))) {
        missing.add(new URL(response.url()).pathname);
      }
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

async function moveWithKeyboard(target, focusSelector, actorSelector, xAttribute, yAttribute, label) {
  const actor = () => target.locator(actorSelector).evaluate((element, fields) => ({
    x: Number(element.getAttribute(fields[0])), y: Number(element.getAttribute(fields[1])),
  }), [xAttribute, yAttribute]);
  await target.locator(focusSelector).focus();
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
    return { ok: result.ok, failure: result.message, slot: result.slotId, destinations: api.DEV_DESTINATIONS.map(({ id, kind, category, roomId }) => ({ id, kind, category, roomId })) };
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
    for (const id of ['ship', 'clan-hangar', 'homeworld-port', 'mission-jungle-vey']) {
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
    const weapon = armory.getByLabel('Arme 1', { exact: true });
    const before = await weapon.inputValue();
    const next = await weapon.locator('option').evaluateAll((options, selected) => options.find(option => !option.disabled && option.value !== selected)?.value, before);
    assert.ok(next, 'The test armory must offer an alternative real weapon.');
    await weapon.selectOption(next);
    assert.equal(await weapon.inputValue(), next);
    await page.locator('[data-dev-service-back]').click();
    await page.locator('.physical-ship-deck[data-suspended="false"]').waitFor();
    await page.locator('.physical-ship-deck__station-shortcuts').getByRole('button', { name: /armurerie/i }).click();
    assert.equal(await page.locator('[data-dev-service="armory"]').getByLabel('Arme 1', { exact: true }).inputValue(), next);
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
    await page.waitForFunction(() => Number(document.querySelector('[data-homeworld-region-v68="glass-desert"]')?.getAttribute('data-state-tick')) > 2);
    await page.locator('[data-region-player]').waitFor();
    await capture('05-regional-village');
    await page.locator('[data-village-open-atlas-v70]').click();
    await page.locator('[data-region-resume]').waitFor();
    await page.keyboard.press('F8');
    await page.locator('[data-dev-catalogue]').waitFor();
    assert.equal(await page.locator('[data-dev-session]').count(), 0);
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
    const initial = await observe();
    let discovered = initial;
    for (let attempt = 0; attempt < 10; attempt++) {
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

  await check('Visited development scenes produce no uncaught JavaScript exception or storage write', async () => {
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
    try { await capture('failure'); } catch { /* Preserve the original failure. */ }
  }
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  report.missingAssets = [...missing].sort();
  report.passedChecks = report.checks.filter(result => result.passed).length;
  report.failedChecks = report.checks.filter(result => !result.passed).length;
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await emptyContext?.close();
  await browser?.close();
  await stopServer();
  console.log(JSON.stringify({ passed: report.passed, checks: report.passedChecks, failed: report.failedChecks, missingAssets: report.missingAssets.length, report: path.join(out, 'report.json') }));
}
