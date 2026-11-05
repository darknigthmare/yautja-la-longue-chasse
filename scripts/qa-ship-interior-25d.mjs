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
 * Actual production Next /dev ship. Only the disposable setup URL is fulfilled.
 * The scene, services, images, controls, clocks and navigation are never mocked.
 * All room changes use the native map, walked thresholds and explicit E input.
 *
 * npm run build:production
 * SHIP_INTERIOR_QA_START_SERVER=1 node scripts/qa-ship-interior-25d.mjs
 *
 * CI installs the locked Chromium. A local browser policy denial is not a
 * request to change the sandbox: execute the repository workflow instead.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.env.SHIP_INTERIOR_QA_OUTPUT || 'outputs/qa-ship-interior-25d');
const route = new URL(process.env.SHIP_INTERIOR_QA_URL || 'http://127.0.0.1:4199/dev');
assert.equal(route.pathname.replace(/\/$/, ''), '/dev', 'The actual developer route is required.');
route.search = ''; route.hash = '';
const shipUrl = new URL(route); shipUrl.searchParams.set('lieu', 'ship');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sha256 = value => createHash('sha256').update(value).digest('hex');
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const activeShip = '[data-dev-session="ship"]:visible [data-ship-interior="2.5d"]:visible:not([inert]):not([aria-hidden="true"])';
await fs.mkdir(out, { recursive: true });
const sourceFiles = [
  'app/dev/client.tsx', 'app/dev/session.tsx', 'app/dev/services.tsx', 'app/dev/destinations.ts',
  'app/game/ShipInterior25D.tsx', 'app/game/ShipInterior25D.module.css',
  'app/game/systems/shipInterior25d.ts', 'app/game/systems/homeworldGeometryV64.ts',
  'app/game/shipInteriorKit.ts', 'app/game/shipInteriorV22.ts',
  'app/game/HunterRigPreview.tsx', 'app/game/hunterRig.ts',
  'scripts/qa-ship-interior-25d.mjs', '.github/workflows/ship-interior-25d.yml',
];
const artManifest = 'app/game/shipInterior25dArt.ts';
if (await fs.access(path.join(root, artManifest)).then(() => true, () => false)) sourceFiles.push(artManifest);
sourceFiles.sort();
const sourceCommit = git('rev-parse', 'HEAD');
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async file =>
  [file, sha256(await fs.readFile(path.join(root, file)))])));
const report = {
  schema: 1, startedAt: new Date().toISOString(), sourceCommit,
  workingTreeDirty: git('status', '--porcelain').length > 0, sourceHashes,
  url: shipUrl.href, runtime: 'actual production Next /dev and ShipInterior25D',
  scope: 'Eight physical rooms, both paired lifts, native keyboard and floor navigation, furniture collision, actual depth order and occlusion, temporary services and preserved return positions, mobile touch and scroll, protected campaign storage. DevServices are the isolated host panels; medbay/training mount the shared ShipHub. This does not qualify the complete campaign, artistic 1:1 fidelity, audio mix or performance.',
  checks: [], captures: [], rooms: [], transitions: [], services: [], movement: [], occlusion: [],
  mobile: [], storageChecks: [], storageOperations: [], databaseOpens: [], errors: [], consoleErrors: [],
};
const requested = new Set(), missing = new Set();
let browser, page, context, server, serverExit = null, currentCheck = 'setup', protectedStorage;
const [geometry, seed] = await Promise.all([
  build({ entryPoints: [path.join(root, 'app/game/systems/shipInterior25d.ts')], bundle: true,
    platform: 'node', format: 'esm', write: false, logLevel: 'silent' }),
  build({ stdin: { contents: [
    "export { defaultSave, SAVE_STORAGE_KEY } from './app/game/save';",
    "export { migrateLegacyCampaignSlot } from './app/game/systems/campaignSlots';",
  ].join('\n'), resolveDir: root, loader: 'ts' }, bundle: true, platform: 'browser',
  format: 'iife', globalName: '__shipInteriorQaSeed', write: false, logLevel: 'silent',
  define: { 'process.env.NODE_ENV': '"production"' } }),
]);
const api = await import('data:text/javascript;base64,' + Buffer.from(geometry.outputFiles[0].text).toString('base64'));
const rooms = api.SHIP_INTERIOR_25D_ROOMS, metrics = api.SHIP_INTERIOR_25D_METRICS;
const roomOrder = api.SHIP_INTERIOR_25D_ROOM_ORDER;
const serviceFor = {
  'galaxy-map': 'map', 'wall-armory': 'armory', 'clan-archives': 'codex',
  'appearance-forge': 'customization', 'trophy-hall': 'trophies',
  'medical-bay': 'medbay', 'training-arena': 'training', 'launch-airlock': 'airlock',
};
assert.equal(roomOrder.length, 8);
const ship = () => page.locator(activeShip);

async function startServer() {
  if (process.env.SHIP_INTERIOR_QA_START_SERVER !== '1') return;
  assert.ok(['127.0.0.1', 'localhost'].includes(route.hostname) && route.protocol === 'http:');
  const log = await fs.open(path.join(out, 'next-server.log'), 'w');
  try {
    server = spawn(process.execPath, [createRequire(import.meta.url).resolve('next/dist/bin/next'),
      'start', '--hostname', '127.0.0.1', '--port', route.port || '4199'], {
      cwd: root, env: { ...process.env, YAUTJA_NEXT_DIST_DIR: process.env.SHIP_INTERIOR_QA_DIST_DIR || '.next' },
      stdio: ['ignore', log.fd, log.fd],
    });
  } finally { await log.close(); }
  server.once('exit', (code, signal) => { serverExit = { code, signal }; });
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    if (serverExit) throw new Error('Production server exited: ' + JSON.stringify(serverExit));
    try { if ((await fetch(route, { signal: AbortSignal.timeout(10000) })).status === 200) return; }
    catch { /* The bounded local startup is not ready yet. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Production /dev did not become ready in 180 seconds.');
}

async function check(name, run) {
  currentCheck = name;
  try { await run(); report.checks.push({ name, passed: true }); console.log('PASS', name); }
  catch (error) { report.checks.push({ name, passed: false, message: error.message }); throw error; }
}

async function snapshotStorage() {
  return page.evaluate(() => {
    const read = storage => Object.fromEntries(Object.keys(storage).sort().map(key => [key, storage.getItem(key)]));
    return { local: read(localStorage), session: read(sessionStorage) };
  });
}

async function assertStorage(label) {
  const actual = await snapshotStorage();
  assert.deepEqual(actual, protectedStorage, label + ': campaign bytes or unrelated storage changed.');
  assert.deepEqual(report.storageOperations, [], label + ': the temporary host attempted a storage mutation.');
  assert.deepEqual(report.databaseOpens, [], label + ': the temporary host opened a persistent database.');
  report.storageChecks.push({ label, sha256: sha256(JSON.stringify(actual)) });
}

async function observe(element = ship()) {
  return element.evaluate(root => {
    const rectangle = node => {
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom };
    };
    const actor = root.querySelector('[data-ship-actor]'), world = root.querySelector('[data-ship-world]');
    return {
      room: root.getAttribute('data-ship-room'), deck: root.getAttribute('data-ship-deck'),
      x: Number(root.getAttribute('data-player-x')), y: Number(root.getAttribute('data-player-y')),
      navigation: root.getAttribute('data-ship-navigation') === 'true',
      suspended: root.getAttribute('data-suspended') === 'true', nearby: root.getAttribute('data-ship-nearby'),
      moving: actor.getAttribute('data-actor-moving') === 'true',
      actor: { ...rectangle(actor), depth: Number(actor.getAttribute('data-actor-depth')),
        zIndex: Number(getComputedStyle(actor).zIndex) },
      world: { ...rectangle(world), transform: getComputedStyle(world).transform, layoutWidth: world.offsetWidth },
      viewport: rectangle(root.querySelector('[data-ship-viewport]')),
      fixtures: [...root.querySelectorAll('[data-ship-fixture]')].map(fixture => ({
        id: fixture.getAttribute('data-ship-fixture'), depth: Number(fixture.getAttribute('data-fixture-depth')),
        occluding: fixture.getAttribute('data-occluding') === 'true',
        zIndex: Number(getComputedStyle(fixture).zIndex),
        opacity: Number(getComputedStyle(fixture.querySelector('[data-ship-art]').parentElement).opacity),
        art: [...fixture.querySelectorAll('img')].map(image => image.getAttribute('src')),
      })),
      projection: root.getAttribute('data-ship-projection'),
      focusWithin: root.contains(document.activeElement),
      overflow: { viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth },
    };
  });
}

async function ready(roomId) {
  await ship().waitFor({ timeout: 120000 });
  if (roomId) await page.locator(activeShip + '[data-ship-room="' + roomId + '"]').waitFor();
  const images = await ship().evaluate(async root => {
    const images = [...root.querySelectorAll('img')];
    await Promise.all(images.map(image => image.decode()));
    return images.map(image => ({ src: image.currentSrc || image.src, width: image.naturalWidth, height: image.naturalHeight }));
  });
  assert.ok(images.length > 0 && images.every(image => image.width > 0 && image.height > 0), 'Every native image must decode.');
  const observed = await observe();
  assert.equal(observed.projection, 'homeworld-35');
  assert.equal(observed.deck, rooms[observed.room].deck);
  assert.equal(observed.world.layoutWidth, rooms[observed.room].width);
  assert.deepEqual(observed.fixtures.map(fixture => fixture.id), rooms[observed.room].fixtures.map(fixture => fixture.id));
  assert.ok(Number.isFinite(observed.x) && Number.isFinite(observed.y));
  assert.ok(observed.overflow.document <= observed.overflow.viewport + 1 && observed.overflow.body <= observed.overflow.viewport + 1,
    'The native interior must not overflow the page horizontally.');
  report.rooms.push({ room: observed.room, deck: observed.deck, x: observed.x, y: observed.y, decodedImages: images.length });
  return observed;
}

async function capture(name) {
  const bytes = await page.screenshot({ fullPage: true });
  await fs.writeFile(path.join(out, name + '.png'), bytes);
  report.captures.push({ file: name + '.png', sha256: sha256(bytes), viewport: page.viewportSize(), state: await observe().catch(() => null) });
}

async function waitGround(field, value, relation = 'near') {
  const element = await ship().elementHandle();
  assert.ok(element);
  try {
    await page.waitForFunction(({ element, field, value, relation }) => {
      const actual = Number(element.getAttribute('data-player-' + field));
      return element.isConnected && (relation === 'less' ? actual <= value : relation === 'greater' ? actual >= value : Math.abs(actual - value) < 2);
    }, { element, field, value, relation }, { timeout: 15000, polling: 'raf' });
  } finally { await element.dispose(); }
}

async function keyboardTo(key, field, value, relation, label) {
  await ship().focus();
  const before = await observe();
  await page.keyboard.down(key);
  try { await waitGround(field, value, relation); }
  finally { await page.keyboard.up(key); }
  await page.locator(activeShip + ' [data-ship-actor][data-actor-moving="false"]').waitFor();
  const after = await observe();
  assert.equal(after.room, before.room, 'Walking alone must not cross a room boundary.');
  assert.ok(distance(before, after) > 5, label + ': native input did not move the actor.');
  report.movement.push({ label, input: key, before, after });
  return { before, after };
}

async function settled(roomId) {
  await page.locator(activeShip + '[data-ship-room="' + roomId + '"][data-ship-navigation="false"]').waitFor({ timeout: 25000 });
  await page.locator(activeShip + ' [data-ship-actor][data-actor-moving="false"]').waitFor();
  return observe();
}

async function guideTo(targetRoom) {
  const before = await observe(), route = api.shipInterior25dRoomRoute(before.room, targetRoom);
  assert.ok(route.length);
  await ship().locator('[data-ship-plan-toggle]').click();
  await ship().locator('[data-ship-guide="' + targetRoom + '"]').click();
  await ship().evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  for (let i = 1; i < route.length; i++) {
    const from = route[i - 1], to = route[i];
    const atDoor = await settled(from);
    assert.equal(atDoor.nearby, 'door', 'The route must stop at a physical threshold.');
    const door = rooms[from].doors.find(candidate => candidate.targetRoomId === to);
    assert.ok(door && api.canShipInterior25dTransition(from, to, atDoor), 'The real actor must be in range of the intended door.');
    const expected = api.shipInterior25dTransition(from, door.id, atDoor);
    assert.equal(await ship().locator('[data-ship-door="' + door.id + '"]').getAttribute('data-door-ready'), 'true');
    // Give the live scene another native frame: a guide must not auto-enter.
    await page.waitForTimeout(100);
    assert.equal((await observe()).room, from, 'Guidance cannot silently change rooms.');
    await ship().focus();
    await page.keyboard.press('e');
    await page.locator(activeShip + '[data-ship-room="' + to + '"]').waitFor();
    report.transitions.push({ from, to, kind: door.kind, door: door.id, atDoor,
      pairedEntry: expected.actor, observedEntry: await observe(), input: 'KeyE' });
  }
  const arrived = await settled(targetRoom);
  assert.equal(arrived.nearby, targetRoom);
  assert.ok(api.isNearShipInterior25dStation(targetRoom, arrived), 'The guide must end within physical service reach.');
  return arrived;
}

async function serviceAndReturn(roomId) {
  const before = await observe(), serviceId = serviceFor[roomId];
  const originalRoot = await ship().elementHandle();
  await ship().focus();
  await page.keyboard.press('e');
  const service = page.locator('[data-dev-service="' + serviceId + '"]:visible');
  await service.waitFor({ timeout: 90000 });
  assert.equal(await originalRoot.getAttribute('data-suspended'), 'true');
  assert.ok((await service.innerText()).trim().length > 30, 'The service must mount its actual controls.');
  await page.keyboard.down('ArrowRight');
  try { await page.waitForTimeout(160); } finally { await page.keyboard.up('ArrowRight'); }
  const hidden = await observe(originalRoot);
  assert.equal(hidden.x, before.x); assert.equal(hidden.y, before.y); assert.equal(hidden.room, before.room);
  let selectedWeapon;
  if (serviceId === 'armory') {
    const weapon = service.getByLabel(/^Arme\s+1(?=\D|$)/);
    const previous = await weapon.inputValue();
    selectedWeapon = await weapon.locator('option').evaluateAll((options, previous) =>
      options.find(option => !option.disabled && option.value !== previous)?.value, previous);
    assert.ok(selectedWeapon);
    await weapon.selectOption(selectedWeapon);
    assert.equal(await weapon.inputValue(), selectedWeapon);
  }
  await service.locator('[data-dev-service-back]').click();
  const after = await ready(roomId);
  assert.equal(after.x, before.x); assert.equal(after.y, before.y);
  assert.equal(after.focusWithin, true, 'The real scene must restore keyboard focus after its service closes.');
  if (selectedWeapon) {
    await page.keyboard.press('e');
    await service.waitFor();
    assert.equal(await service.getByLabel(/^Arme\s+1(?=\D|$)/).inputValue(), selectedWeapon, 'Equipment must survive a native return within the temporary session.');
    await service.locator('[data-dev-service-back]').click();
    await ready(roomId);
  }
  await originalRoot.dispose();
  await assertStorage('service-' + roomId);
  report.services.push({ room: roomId, service: serviceId, before: { x: before.x, y: before.y },
    after: { x: after.x, y: after.y }, nativeSharedPanel: ['medbay', 'training'].includes(serviceId), selectedWeapon });
}

async function verifyMotion(label) {
  const samples = await page.evaluate(() => window.__shipInteriorQaMotion.splice(0));
  assert.ok(samples.length > 3, label + ': live rendering must produce motion observations.');
  let movements = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i], room = rooms[sample.room];
    assert.ok(room && Number.isFinite(sample.x) && Number.isFinite(sample.y));
    // Data attributes round to .01. Only reject an actual intrusion beyond
    // that rounding, rather than treating a rounded contact as penetration.
    for (const { footprint } of room.fixtures) {
      assert.ok(!(sample.x > footprint.x - metrics.actorHalfWidth + .02 &&
        sample.x < footprint.x + footprint.width + metrics.actorHalfWidth - .02 &&
        sample.y > footprint.y - metrics.actorHalfDepth + .02 &&
        sample.y < footprint.y + footprint.depth + metrics.actorHalfDepth - .02),
      label + ': the rendered actor entered a furniture collision footprint.');
    }
    const previous = samples[i - 1];
    if (previous?.room === sample.room && distance(previous, sample) > .02) {
      movements++;
      assert.ok(distance(previous, sample) <= metrics.speed * ((sample.at - previous.at) / 1000 + .1) + 1,
        label + ': an observed move exceeded native speed and scheduling tolerance.');
    }
  }
  assert.ok(movements > 2, label + ': no continuous native walk was observed.');
  report.movement.push({ label, sampleCount: samples.length, movements, samples });
}

async function touchHold(cdp, direction, field, delta) {
  const button = ship().locator('[data-ship-direction="' + direction + '"]');
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox(), before = await observe();
  assert.ok(box);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 0, radiusX: 2, radiusY: 2, force: 1 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  try { await waitGround(field, before[field] + delta, delta > 0 ? 'greater' : 'less'); }
  finally { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  await page.locator(activeShip + ' [data-ship-actor][data-actor-moving="false"]').waitFor();
  return { direction, before, after: await observe() };
}

try {
  if (process.env.SHIP_INTERIOR_QA_SOURCE_COMMIT) {
    assert.equal(sourceCommit, process.env.SHIP_INTERIOR_QA_SOURCE_COMMIT);
    assert.equal(git('diff', '--name-only', 'HEAD', '--', ...sourceFiles), '', 'Source differs from the requested commit.');
  }
  await startServer();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    headless: process.env.SHIP_INTERIOR_QA_HEADED !== '1', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browserVersion = browser.version();
  context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, hasTouch: true,
    reducedMotion: 'no-preference', recordVideo: { dir: path.join(out, 'video'), size: { width: 1280, height: 960 } } });
  await context.exposeBinding('__shipInteriorQaWrite', (_source, event) => {
    const entries = event.operation === 'indexedDB.open' ? report.databaseOpens : report.storageOperations;
    entries.push({ check: currentCheck, ...event });
  });
  await context.addInitScript(() => {
    const observing = () => location.pathname.replace(/\/$/, '') === '/dev';
    for (const operation of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[operation];
      Storage.prototype[operation] = function (...args) {
        if (observing()) void window.__shipInteriorQaWrite({ operation, area: this === localStorage ? 'local' : 'session', key: args[0] ?? null });
        return Reflect.apply(original, this, args);
      };
    }
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (...args) {
      if (observing()) void window.__shipInteriorQaWrite({ operation: 'indexedDB.open', key: String(args[0]) });
      return Reflect.apply(open, this, args);
    };
    window.__shipInteriorQaMotion = [];
    new MutationObserver(() => {
      if (!observing()) return;
      const active = [...document.querySelectorAll('[data-dev-session="ship"] [data-ship-interior="2.5d"]')]
        .filter(element => element.getClientRects().length && !element.closest('[inert],[aria-hidden="true"],[hidden]'));
      if (active.length !== 1) return;
      const root = active[0], samples = window.__shipInteriorQaMotion;
      const sample = { room: root.getAttribute('data-ship-room'),
        x: Number(root.getAttribute('data-player-x')), y: Number(root.getAttribute('data-player-y')), at: performance.now() };
      const previous = samples.at(-1);
      if (!previous || previous.room !== sample.room || previous.x !== sample.x || previous.y !== sample.y) samples.push(sample);
    }).observe(document, { subtree: true, attributes: true,
      attributeFilter: ['data-player-x', 'data-player-y', 'data-ship-room', 'data-suspended'] });
  });
  page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => report.errors.push({ check: currentCheck, message: error.message }));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push({ check: currentCheck, message: message.text() }); });
  page.on('request', request => { const pathname = new URL(request.url()).pathname; if (pathname.startsWith('/game/')) requested.add(pathname); });
  page.on('response', response => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith('/game/') && (response.status() >= 400 ||
      (response.request().resourceType() === 'image' && response.headers()['content-type']?.includes('text/html')))) missing.add(pathname);
  });
  const setupUrl = new URL('/__ship-interior-qa-setup', route).href;
  await context.route(setupUrl, request => request.fulfill({ status: 200, contentType: 'text/html',
    body: '<!doctype html><html><head><title>Temporary QA setup</title></head><body></body></html>' }));
  await page.goto(setupUrl);
  await page.addScriptTag({ content: seed.outputFiles[0].text });
  const seeded = await page.evaluate(async () => {
    const api = window.__shipInteriorQaSeed, save = api.defaultSave('2026-11-01T12:00:00.000Z');
    save.profile.hunterName = 'Campagne protégée — essai intérieur'; save.profile.playTimeSeconds = 321;
    save.settings.masterVolume = 0;
    const raw = JSON.stringify(save);
    localStorage.setItem(api.SAVE_STORAGE_KEY, raw); localStorage.setItem(api.SAVE_STORAGE_KEY + '.backup', raw);
    const migration = await api.migrateLegacyCampaignSlot();
    localStorage.setItem('qa.ship.unrelated', 'Conserver cette valeur'); sessionStorage.setItem('qa.ship.session', 'Session préexistante');
    return { ok: migration.ok, message: migration.message, slot: migration.slotId };
  });
  assert.equal(seeded.ok, true, seeded.message); assert.equal(seeded.slot, 1);
  protectedStorage = await snapshotStorage();
  report.protectedStorage = { keys: Object.keys(protectedStorage.local), sha256: sha256(JSON.stringify(protectedStorage)) };
  await context.unroute(setupUrl);
  await page.goto(shipUrl.href, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.bringToFront();

  await check('The real developer URL mounts the 2.5D room and preserves an existing campaign', async () => {
    const initial = await ready('galaxy-map');
    assert.equal(initial.x, rooms['galaxy-map'].spawn.x); assert.equal(initial.y, rooms['galaxy-map'].spawn.y);
    assert.ok((await page.locator('meta[name="robots"]').getAttribute('content'))?.includes('noindex'));
    await assertStorage('initial'); await capture('01-desktop-navigation');
  });
  await check('Keyboard movement uses both ground axes, native depth projection and released input', async () => {
    const horizontal = await keyboardTo('ArrowRight', 'x', 680, 'greater', 'keyboard-x');
    const vertical = await keyboardTo('ArrowUp', 'y', 560, 'less', 'keyboard-y');
    const normalized = state => ({ x: (state.actor.x - state.world.x) / (state.world.width / state.world.layoutWidth),
      y: (state.actor.y - state.world.y) / (state.world.width / state.world.layoutWidth) });
    const from = normalized(vertical.before), to = normalized(vertical.after);
    assert.ok(Math.abs((to.y - from.y) / (vertical.after.y - vertical.before.y) - metrics.depthScale) < .005);
    assert.ok(horizontal.after.x > horizontal.before.x && Math.abs(vertical.after.x - vertical.before.x) < .05);
    const stopped = await observe();
    await page.waitForTimeout(180);
    const after = await observe();
    assert.equal(after.x, stopped.x); assert.equal(after.y, stopped.y); assert.equal(after.moving, false);
    await verifyMotion('two-axis-keyboard');
  });
  await check('Furniture blocks native movement and fades only when the hunter really walks behind it', async () => {
    await guideTo('galaxy-map');
    const main = rooms['galaxy-map'].fixtures[0], contactY = main.footprint.y + main.footprint.depth + metrics.actorHalfDepth;
    await ship().focus(); await page.keyboard.down('ArrowUp');
    try {
      await waitGround('y', contactY + 10, 'less');
      await page.waitForTimeout(450);
      const one = await observe(); await page.waitForTimeout(180); const two = await observe();
      assert.equal(two.y, one.y); assert.ok(two.y >= contactY - .02);
    } finally { await page.keyboard.up('ArrowUp'); }
    const front = await observe(), fixtureFront = front.fixtures.find(fixture => fixture.id === main.id);
    assert.equal(fixtureFront.occluding, false); assert.equal(fixtureFront.opacity, 1);
    assert.ok(front.actor.zIndex > fixtureFront.zIndex);
    await capture('02-console-front-collision');
    const laneX = main.footprint.x - metrics.actorHalfWidth - 65;
    const rearY = main.footprint.y - metrics.actorHalfDepth - 36;
    await keyboardTo('ArrowLeft', 'x', laneX, 'less', 'console-side-lane');
    await keyboardTo('ArrowUp', 'y', rearY, 'less', 'console-rear-lane');
    await keyboardTo('ArrowRight', 'x', main.x, 'greater', 'console-behind');
    const fixture = ship().locator('[data-ship-fixture="' + main.id + '"]');
    const fixtureElement = await fixture.elementHandle();
    try {
      await page.waitForFunction(element => Number(getComputedStyle(element.querySelector('[data-ship-art]').parentElement).opacity) <= .3,
        fixtureElement, { timeout: 5000, polling: 'raf' });
    } finally { await fixtureElement.dispose(); }
    const behind = await observe(), fixtureBehind = behind.fixtures.find(fixture => fixture.id === main.id);
    assert.equal(fixtureBehind.occluding, true); assert.ok(fixtureBehind.opacity <= .3);
    assert.ok(behind.actor.zIndex < fixtureBehind.zIndex);
    report.occlusion.push({ fixture: main.id, front, behind });
    await capture('03-console-behind-occlusion'); await verifyMotion('real-console-detour');
  });
  await check('A real floor click walks around the console to its service without crossing the solid', async () => {
    const before = await observe(), destination = rooms[before.room].station.approach;
    assert.equal(api.isShipInterior25dSegmentWalkable(before.room, before, destination), false);
    const path = api.planShipInterior25dPath(before.room, before, destination); assert.ok(path && path.points.length > 2);
    const point = await ship().evaluate((root, destination) => {
      const world = root.querySelector('[data-ship-world]'), viewport = root.querySelector('[data-ship-viewport]').getBoundingClientRect();
      const actor = root.querySelector('[data-ship-actor]').getBoundingClientRect(), scale = world.getBoundingClientRect().width / world.offsetWidth;
      return { x: actor.x + (destination.x - Number(root.getAttribute('data-player-x'))) * scale,
        y: actor.y + (destination.y - Number(root.getAttribute('data-player-y'))) * destination.depthScale * scale,
        viewport: { x: viewport.x, y: viewport.y, right: viewport.right, bottom: viewport.bottom } };
    }, { ...destination, depthScale: metrics.depthScale });
    // Avoid the service beacon itself: click 46 physical units to its right,
    // still within interaction reach, on the genuine floor.
    const clickTarget = { x: destination.x + 46, y: destination.y };
    const scale = before.world.width / before.world.layoutWidth;
    const x = point.x + 46 * scale, y = point.y;
    assert.ok(x > point.viewport.x && x < point.viewport.right && y > point.viewport.y && y < point.viewport.bottom);
    await page.mouse.click(x, y);
    await ship().evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const after = await settled(before.room);
    assert.ok(distance(after, clickTarget) < 2, 'The real pointer projection must reach the clicked ground coordinate.');
    assert.equal(after.nearby, before.room);
    await verifyMotion('pointer-path-around-console'); await capture('04-pointer-service-arrival');
  });
  for (const roomId of roomOrder) {
    await check('Walk the connected ship to ' + rooms[roomId].label + ', use its service and return at the same position', async () => {
      await guideTo(roomId); await ready(roomId); await capture('room-' + roomId);
      await serviceAndReturn(roomId);
    });
  }
  await check('The aft lift also requires a walked threshold and supports the reverse journey', async () => {
    await guideTo('appearance-forge'); await guideTo('launch-airlock');
    await guideTo('galaxy-map'); await guideTo('trophy-hall');
    for (const [from, to] of [['galaxy-map', 'trophy-hall'], ['trophy-hall', 'galaxy-map'],
      ['launch-airlock', 'appearance-forge'], ['appearance-forge', 'launch-airlock']]) {
      assert.ok(report.transitions.some(transition => transition.from === from && transition.to === to && transition.kind === 'lift'),
        'The actual walk must cover the paired lift ' + from + ' -> ' + to);
    }
    await verifyMotion('eight-room-tour-and-lifts');
  });
  const cdp = await context.newCDPSession(page);
  for (const width of [390, 320]) {
    await check('Mobile ' + width + ' px keeps the camera readable, touch movement working and scroll separate from walking', async () => {
      await page.setViewportSize({ width, height: 844 });
      await page.locator('[data-dev-reset]').click();
      await ready('galaxy-map');
      const viewport = ship().locator('[data-ship-viewport]');
      await viewport.scrollIntoViewIfNeeded();
      const before = await observe(), box = await viewport.boundingBox(); assert.ok(box);
      const swipeX = box.x + box.width * .5, startY = Math.min(box.y + box.height * .75, 700);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: swipeX, y: startY, id: 0 }] });
      for (let i = 1; i <= 6; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: swipeX, y: startY - i * 22, id: 0 }] });
        await page.waitForTimeout(25);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(120);
      const afterSwipe = await observe();
      assert.equal(afterSwipe.x, before.x); assert.equal(afterSwipe.y, before.y); assert.equal(afterSwipe.navigation, false);
      const horizontal = await touchHold(cdp, 'right', 'x', 25);
      const vertical = await touchHold(cdp, 'up', 'y', -25);
      await guideTo('wall-armory'); await ready('wall-armory'); await serviceAndReturn('wall-armory');
      await viewport.scrollIntoViewIfNeeded();
      const camera = await observe(), scale = camera.world.width / camera.world.layoutWidth;
      assert.ok(scale > .5 && scale <= 1.1, 'Mobile camera must preserve a readable physical scale.');
      assert.ok(camera.actor.x >= camera.viewport.x && camera.actor.x <= camera.viewport.right &&
        camera.actor.y >= camera.viewport.y && camera.actor.y <= camera.viewport.bottom, 'The camera must retain the hunter inside the real viewport.');
      report.mobile.push({ width, swipe: { before, after: afterSwipe }, horizontal, vertical, camera });
      await capture('mobile-' + width + '-armory'); await assertStorage('mobile-' + width);
      await page.evaluate(() => { window.__shipInteriorQaMotion.length = 0; });
    });
  }
  await check('F8 unmounts the test and a real URL reload recreates the initial ship without changing the campaign', async () => {
    await page.keyboard.press('F8'); await page.locator('[data-dev-catalogue]').waitFor();
    assert.equal(await page.locator('[data-ship-interior]').count(), 0);
    await assertStorage('after-F8');
    await page.goto(shipUrl.href, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const reset = await ready('galaxy-map');
    assert.equal(reset.x, rooms['galaxy-map'].spawn.x); assert.equal(reset.y, rooms['galaxy-map'].spawn.y);
    await assertStorage('after-reload');
  });
  await check('Every requested asset exists and the actual scene produces no browser or console exception', async () => {
    assert.deepEqual([...missing], []); assert.deepEqual(report.errors, []); assert.deepEqual(report.consoleErrors, []);
    assert.equal(report.services.filter(entry => roomOrder.includes(entry.room)).length >= 8, true);
    for (const id of roomOrder) assert.ok(report.services.some(entry => entry.room === id));
  });
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = { check: currentCheck, message: error.message, stack: error.stack };
  if (page && !page.isClosed()) {
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    report.failure.state = await observe().catch(() => null);
    report.failure.page = await page.locator('body').innerText().catch(() => '');
  }
  console.error(error); process.exitCode = 1;
} finally {
  const video = page?.video();
  if (context) await context.close();
  if (video) {
    const file = await video.path().catch(() => null);
    if (file) report.video = { file: path.relative(out, file), sha256: sha256(await fs.readFile(file)) };
  }
  report.finishedAt = new Date().toISOString();
  report.missingAssets = [...missing].sort(); report.requestedAssets = [...requested].sort();
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close();
  if (server && !serverExit) {
    server.kill('SIGTERM');
    await new Promise(resolve => {
      const timer = setTimeout(() => { if (!serverExit) server.kill('SIGKILL'); resolve(); }, 5000);
      server.once('exit', () => { clearTimeout(timer); resolve(); });
    });
  }
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length,
    failed: report.checks.filter(check => !check.passed).length, missingAssets: report.missingAssets.length,
    report: path.relative(root, path.join(out, 'report.json')) }));
}
