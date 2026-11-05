import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

/**
 * Spatial rendering audit, separate from the campaign transaction suite.
 *
 * The disposable Vite host imports the actual PlanetArrivalCinematic. A valid
 * paused state starts at a native shot boundary; the normal Resume button and
 * requestAnimationFrame then advance it. No fake clock, source replacement,
 * transformed screenshot, DOM mutation, fabricated asset or mocked renderer is
 * used. Requested sample times are thresholds: the report records the actual
 * elapsed time and rendered anchors, including the screenshot interval.
 *
 * A final natural 62-second route uses the real production /dev page, with its
 * real HuntCanvas handoff, resize, pause, resume and Skip controls.
 *
 * npm run build:production
 * ARRIVAL_SPATIAL_START_SERVER=1 node scripts/qa-planet-arrival-spatial.mjs
 *
 * Chromium is installed by CI. Do not change the local process/socket policy
 * when an installed browser cannot launch in a restricted executor.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.env.ARRIVAL_SPATIAL_OUTPUT || 'outputs/qa-planet-arrival-spatial');
const nativeUrl = new URL(process.env.ARRIVAL_SPATIAL_URL || 'http://127.0.0.1:4197/dev');
assert.equal(nativeUrl.pathname.replace(/\/$/, ''), '/dev', 'Native verification must use /dev.');
nativeUrl.search = ''; nativeUrl.hash = '';
const harnessPort = Number(process.env.ARRIVAL_SPATIAL_HARNESS_PORT || 4196);
const headed = process.env.ARRIVAL_SPATIAL_HEADED === '1';
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
await fs.mkdir(out, { recursive: true });

const sourceFiles = [
  'app/game/PlanetArrivalCinematic.tsx', 'app/game/PlanetArrivalCinematic.module.css',
  'app/game/HunterRigPreview.tsx', 'app/game/hunterRig.ts', 'app/game/worldScreens.ts', 'app/game/shipCatalogue.ts',
  'app/dev/session.tsx', 'app/dev/destinations.ts', 'app/dev/client.tsx',
  'scripts/qa-planet-arrival-spatial.mjs',
  ...(await fs.readdir(path.join(root, 'app/game/systems')))
    .filter(file => /^planetArrival.*\.ts$/.test(file)).map(file => `app/game/systems/${file}`),
].sort();
const sourceCommit = git('rev-parse', 'HEAD');
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async file =>
  [file, sha256(await fs.readFile(path.join(root, file)))])));
const report = {
  schema: 1, startedAt: new Date().toISOString(), sourceCommit,
  workingTreeDirty: git('status', '--porcelain').length > 0, sourceHashes,
  browserMode: headed ? 'headed' : 'headless',
  scope: 'Actual component rendering at native shot boundaries on desktop/mobile; all eight destinations; seven representative hulls; one natural production /dev arrival and real hunt handoffs. Spatial evidence is distinct from artistic or canonical approval. Upgrade uses an interpretation of its authored perspective, not a claim about a canonical nozzle or release bay.',
  timing: 'Unmodified native requestAnimationFrame. Samples wait for elapsed-time thresholds and retain observed times; no virtual or accelerated clock.',
  nativeUrl: nativeUrl.href, checks: [], samples: [], movement: [], captures: [],
  resizes: [], ships: [], native: {}, errors: [], consoleErrors: [], missingAssets: [], requestedAssets: [],
};
const requested = new Set(), missing = new Set();
let browser, harness, harnessDir, nativeServer, nativeExit = null, page, currentCheck = 'setup';

const fixtureBundle = await build({
  stdin: {
    contents: `export { MISSIONS } from './app/game/data';
      export { PLANET_ARRIVAL_SHOTS, PLANET_ARRIVAL_CONTACT_PROGRESS, createPlanetArrival,
        planetArrivalAssets, planetArrivalLanding } from './app/game/systems/planetArrival';
      export { defaultSave } from './app/game/save';
      export { DEFAULT_SHIP_ID, isShipId, shipProfileAssetPath } from './app/game/shipCatalogue';
      export { carrierArtForShip } from './app/game/systems/planetArrivalArt';`,
    resolveDir: root, loader: 'ts',
  }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const api = await import('data:text/javascript;base64,' + Buffer.from(fixtureBundle.outputFiles[0].text).toString('base64'));
assert.equal(api.MISSIONS.length, 8, 'Review the destination matrix if the campaign catalogue changes.');
assert.equal(api.PLANET_ARRIVAL_SHOTS.length, 8);
const primaryMission = api.MISSIONS.find(mission => mission.id === 'jungle-vey');
assert.ok(primaryMission);
// The classic hull is already exercised through every shot and destination.
const additionalShips = [
  'avp-predator-mothership', 'avpr-scout-ship', 'wolf-ship',
  'fugitive-spaceship', 'upgrade-spaceship', 'feral-spaceship',
];
assert.ok(additionalShips.every(shipId => api.isShipId(shipId)));
const viewports = [
  { id: 'desktop', width: 1440, height: 1000 },
  { id: 'mobile', width: 390, height: 844 },
];

async function startHarness() {
  // Kept under the repository so Vite resolves the locked React dependencies.
  harnessDir = await fs.mkdtemp(path.join(out, '.spatial-host-'));
  const relative = path.relative(harnessDir, root).split(path.sep).join('/');
  const modulePath = file => `${relative}/${file}`;
  await fs.writeFile(path.join(harnessDir, 'index.html'), `<!doctype html><html lang="fr"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="icon" href="data:,"><title>Arrival spatial audit</title>
    <style>*{box-sizing:border-box}body{margin:0;background:#070a0e;font-family:Arial,sans-serif}
    main{max-width:1440px;margin:auto;padding:20px}@media(max-width:500px){main{padding:8px}}
    output{display:none}</style></head><body><main id="root"></main>
    <script type="module" src="/host.tsx"></script></body></html>`);
  await fs.writeFile(path.join(harnessDir, 'host.tsx'), `import React, { useState } from 'react';
    import { createRoot } from 'react-dom/client';
    import PlanetArrivalCinematic from ${JSON.stringify(modulePath('app/game/PlanetArrivalCinematic'))};
    import { createPlanetArrival, inspectPlanetArrival, PLANET_ARRIVAL_SHOTS } from ${JSON.stringify(modulePath('app/game/systems/planetArrival'))};
    import { defaultSave } from ${JSON.stringify(modulePath('app/game/save'))};
    import { DEFAULT_SHIP_ID, isShipId } from ${JSON.stringify(modulePath('app/game/shipCatalogue'))};
    import { MISSIONS } from ${JSON.stringify(modulePath('app/game/data'))};
    const query = new URLSearchParams(location.search);
    const mission = MISSIONS.find(item => item.id === query.get('mission'));
    const shot = PLANET_ARRIVAL_SHOTS.find(item => item.id === query.get('shot'));
    const ship = query.get('ship') ?? DEFAULT_SHIP_ID;
    if (!mission || !shot || !isShipId(ship)) throw new Error('Unknown spatial-audit fixture.');
    const save = defaultSave('2026-11-05T00:00:00.000Z');
    const initial = { ...createPlanetArrival({ ownerCreatedAt: save.createdAt,
      runId: 'spatial:' + mission.id + ':' + shot.id + ':' + ship, missionId: mission.id, encounterRun: 1,
      personalShipId: ship, hunterPresetId: save.appearance.presetId }),
      elapsedMs: shot.startMs, status: 'paused' as const };
    if (inspectPlanetArrival(initial).status !== 'valid') throw new Error('Invalid spatial-audit state.');
    function Host() {
      const [handoff, setHandoff] = useState('');
      const [exited, setExited] = useState(false);
      return <><PlanetArrivalCinematic state={initial} appearance={save.appearance} loadout={save.loadout}
        reducedMotion={query.get('reduced') === '1'}
        onCheckpoint={next => inspectPlanetArrival(next, save.createdAt, initial.runId).status === 'valid'}
        onHandoff={next => { setHandoff(next.completedBy ?? ''); return true; }}
        onExit={() => setExited(true)} />
        <output data-spatial-host="true" data-spatial-handoff={handoff} data-spatial-exited={exited} /></>;
    }
    createRoot(document.getElementById('root')!).render(<Host />);`);
  harness = await createServer({
    configFile: false, root: harnessDir, publicDir: path.join(root, 'public'),
    plugins: [react()], logLevel: 'warn',
    server: { host: '127.0.0.1', port: harnessPort, strictPort: true, fs: { allow: [root] } },
    resolve: { alias: { '@': root, 'next/link': path.join(root, 'desktop/LocalLink.tsx') } },
  });
  await harness.listen();
}

async function startNativeServer() {
  if (process.env.ARRIVAL_SPATIAL_START_SERVER !== '1') return;
  assert.ok(['localhost', '127.0.0.1'].includes(nativeUrl.hostname) && nativeUrl.protocol === 'http:',
    'An automatically started server is loopback-only.');
  const cli = createRequire(import.meta.url).resolve('next/dist/bin/next');
  const log = await fs.open(path.join(out, 'next-server.log'), 'w');
  try {
    nativeServer = spawn(process.execPath, [cli, 'start', '--hostname', '127.0.0.1', '--port', nativeUrl.port || '4197'], {
      cwd: root, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', log.fd, log.fd],
    });
  } finally { await log.close(); }
  nativeServer.once('exit', (code, signal) => { nativeExit = { code, signal }; });
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (nativeExit) throw new Error(`Next exited: ${JSON.stringify(nativeExit)}. See next-server.log.`);
    try {
      const response = await fetch(nativeUrl, { signal: AbortSignal.timeout(5000) });
      if (response.status === 200) return;
    } catch { /* The loopback listener is not ready yet. */ }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error('Production /dev did not become available within 90 seconds.');
}

function observePage(target, label) {
  target.setDefaultTimeout(20000);
  target.on('pageerror', error => report.errors.push({ label, message: error.message }));
  target.on('console', message => {
    if (message.type() === 'error') report.consoleErrors.push({ label, message: message.text() });
  });
  target.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/game/')) requested.add('public' + url.pathname);
  });
  target.on('response', response => {
    const url = new URL(response.url());
    if ((url.pathname.startsWith('/game/') || url.pathname.startsWith('/audio/')) &&
        (response.status() >= 400 || (['image', 'media'].includes(response.request().resourceType()) &&
          response.headers()['content-type']?.includes('text/html')))) missing.add(url.pathname);
  });
}

async function check(name, run) {
  currentCheck = name;
  try { await run(); report.checks.push({ name, passed: true }); console.log('PASS', name); }
  catch (error) {
    report.checks.push({ name, passed: false, message: error.message });
    throw error;
  }
}

async function readFrame(target = page) {
  return target.locator('[data-arrival-run]').evaluate(root => {
    const rect = element => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const anchors = {};
    for (const element of root.querySelectorAll('[data-arrival-anchor]')) {
      let opacity = 1;
      for (let parent = element; parent && parent !== root; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden') opacity = 0;
        opacity *= Number(style.opacity);
      }
      anchors[element.getAttribute('data-arrival-anchor')] = {
        ...rect(element), opacity,
        vfxSource: element.closest('[data-arrival-vfx-source]')?.getAttribute('data-arrival-vfx-source') ?? null,
      };
    }
    const stage = root.querySelector('[data-arrival-stage]');
    const camera = root.querySelector('[data-arrival-ground-camera]');
    return {
      run: root.getAttribute('data-arrival-run'), shot: root.getAttribute('data-arrival-shot'),
      status: root.getAttribute('data-arrival-status'), elapsedMs: Number(root.getAttribute('data-arrival-elapsed')),
      reducedMotion: root.getAttribute('data-arrival-reduced-motion') === 'true',
      contact: root.querySelector('[data-arrival-scene]')?.getAttribute('data-arrival-contact') === 'true',
      scene: rect(root.querySelector('[data-arrival-scene]')), stage: rect(stage),
      stageLayout: stage ? { width: stage.offsetWidth, height: stage.offsetHeight, transform: getComputedStyle(stage).transform } : null,
      camera: rect(camera), cameraTransform: camera ? getComputedStyle(camera).transform : null,
      flightPod: rect(root.querySelector('[data-arrival-flight-pod]')), anchors,
      planet: root.querySelector('[data-arrival-scene]')?.getAttribute('data-arrival-planet'),
      ship: root.querySelector('[data-arrival-scene]')?.getAttribute('data-arrival-ship'),
      planetImage: root.querySelector('[data-arrival-planet-image]')?.getAttribute('data-arrival-planet-image') ?? null,
      groundFrame: root.querySelector('[data-arrival-ground-frame]')?.getAttribute('data-arrival-ground-frame'),
      images: [...root.querySelectorAll('img')].map(image => ({
        path: image.getAttribute('src'), complete: image.complete, width: image.naturalWidth, height: image.naturalHeight,
      })),
      svgImages: [...root.querySelectorAll('svg image')].map(image => ({
        path: image.getAttribute('href') ?? image.getAttributeNS('http://www.w3.org/1999/xlink', 'href'),
        width: Number(image.getAttribute('width')), height: Number(image.getAttribute('height')),
      })),
      statusText: root.querySelector('[role="status"]')?.textContent?.trim() ?? '',
      viewport: { width: innerWidth, height: innerHeight },
      overflow: { document: document.documentElement.scrollWidth, body: document.body.scrollWidth },
    };
  });
}

async function decodeSceneImages(target = page) {
  return target.locator('[data-arrival-run]').evaluate(async root => {
    await Promise.all([...root.querySelectorAll('img')].map(image => image.decode()));
    // SVGImageElement has neither decode() nor naturalWidth. Decode the exact
    // declared href with an unattached browser Image, preserving the live SVG
    // and its crop/transform. This probes the real asset, never a replacement.
    const sources = [...new Set([...root.querySelectorAll('svg image')].map(image =>
      image.getAttribute('href') ?? image.getAttributeNS('http://www.w3.org/1999/xlink', 'href')))];
    return Promise.all(sources.map(async source => {
      if (!source) throw new Error('An SVG image has no source href.');
      const image = new Image();
      image.src = new URL(source, document.baseURI).href;
      await image.decode();
      if (!image.complete || !image.naturalWidth || !image.naturalHeight) throw new Error(`Undecoded SVG artwork: ${source}`);
      return { path: source, complete: image.complete, width: image.naturalWidth, height: image.naturalHeight };
    }));
  });
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const vector = (from, to) => ({ x: to.x - from.x, y: to.y - from.y });
const cosine = (a, b) => (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y));

function assertSpatial(frame, label) {
  assert.ok(frame.scene && frame.stage && frame.stageLayout, `${label}: missing canonical stage.`);
  assert.equal(frame.stageLayout.width, 1280, `${label}: canonical stage width.`);
  assert.equal(frame.stageLayout.height, 720, `${label}: canonical stage height.`);
  const sx = frame.stage.width / 1280, sy = frame.stage.height / 720;
  assert.ok(Math.abs(sx - sy) < .002, `${label}: stage must scale uniformly (${sx}, ${sy}).`);
  assert.ok(frame.stage.x >= frame.scene.x - 1 && frame.stage.y >= frame.scene.y - 1 &&
    frame.stage.right <= frame.scene.right + 1 && frame.stage.bottom <= frame.scene.bottom + 1,
  `${label}: fitted stage must remain inside the scene.`);
  assert.ok(frame.overflow.document <= frame.viewport.width + 1 && frame.overflow.body <= frame.viewport.width + 1,
    `${label}: horizontal page overflow.`);
  assert.deepEqual(frame.images.filter(image => !image.complete || image.width === 0 || image.height === 0), [],
    `${label}: undecoded or missing scene image.`);
  assert.ok(frame.svgImages.every(image => image.path && image.width > 0 && image.height > 0 &&
    frame.decodedSvg.some(decoded => decoded.path === image.path && decoded.complete && decoded.width > 0 && decoded.height > 0)),
  `${label}: every declared SVG source must be a decoded real image.`);
  assert.doesNotMatch(frame.statusText, /indisponible|n’a pas pu|pas été confirmé/i, `${label}: scene reported a runtime failure.`);
  const a = frame.anchors;
  for (const effect of ['release-origin', 'trail-origin']) {
    if (!a[effect] || a[effect].opacity < .02) continue;
    assert.ok(a[effect].vfxSource && a[a[effect].vfxSource], `${label}: ${effect} needs its actual parent socket.`);
    assert.ok(distance(a[effect], a[a[effect].vfxSource]) <= 1.5,
      `${label}: ${effect} detached by ${distance(a[effect], a[a[effect].vfxSource]).toFixed(3)} screen pixels.`);
  }
  if (a['trail-origin']?.opacity > .02 && a['trail-end'] && a['pod-nose'] && a['pod-tail']) {
    const trail = vector(a['trail-origin'], a['trail-end']);
    const axis = vector(a['pod-tail'], a['pod-nose']);
    assert.ok(cosine(trail, axis) < -.96, `${label}: hot wake must point behind the capsule.`);
  }
  if (frame.contact) {
    assert.ok(a['ground-reference'] && a['ground-capsule-reference'] && a['pod-ground'],
      `${label}: grounded frame needs ground and capsule contact anchors.`);
    assert.ok(distance(a['pod-ground'], a['ground-capsule-reference']) <= 1.5,
      `${label}: capsule contact floats above or penetrates its projected surface.`);
    for (const id of ['pod-ground', 'dust-ground', 'hunter-feet']) {
      if (!a[id] || a[id].opacity < .02) continue;
      assert.ok(Math.abs(a[id].y - a['ground-reference'].y) <= 1.5,
        `${label}: ${id} differs from the projected floor by ${(a[id].y - a['ground-reference'].y).toFixed(3)} px.`);
    }
    if (a['door-hinge']?.opacity > .02 && a['door-hinge-reference']) {
      assert.ok(distance(a['door-hinge'], a['door-hinge-reference']) <= 1.5,
        `${label}: opening door detached from its physical hinge.`);
    }
  }
}

async function capture(label, target = page) {
  const decodedSvg = await decodeSceneImages(target);
  const before = { ...await readFrame(target), decodedSvg };
  assertSpatial(before, label);
  const file = label + '.png';
  const bytes = await target.locator('[data-arrival-scene]').screenshot({ animations: 'allow' });
  await fs.writeFile(path.join(out, file), bytes);
  const after = await readFrame(target);
  report.captures.push({ file, sha256: sha256(bytes), viewport: target.viewportSize(),
    shot: before.shot, elapsedBefore: before.elapsedMs, elapsedAfter: after.elapsedMs });
  report.samples.push({ label, ...before });
  return before;
}

async function waitElapsed(milliseconds, shotId, target = page) {
  await target.waitForFunction(({ milliseconds, shotId }) => {
    const root = document.querySelector('[data-arrival-run]');
    if (!root) throw new Error('Arrival unmounted before the requested sample.');
    const status = root.getAttribute('data-arrival-status');
    if (status === 'paused' || status === 'recoverable-error') throw new Error(`Arrival unexpectedly ${status}.`);
    return status === 'playing' && root.getAttribute('data-arrival-shot') === shotId &&
      Number(root.getAttribute('data-arrival-elapsed')) >= milliseconds;
  }, { milliseconds, shotId }, { timeout: 25000, polling: 'raf' });
}

async function ready(target = page) {
  await target.bringToFront();
  await target.locator('[data-arrival-run]').waitFor({ timeout: 60000 });
  await target.waitForFunction(() => {
    const arrival = document.querySelector('[data-arrival-run]');
    return arrival && arrival.getAttribute('data-arrival-status') !== 'prepared' &&
      !arrival.textContent.includes('Chargement du vaisseau, de la capsule et du terrain.');
  }, null, { timeout: 30000 });
  if (await target.locator('[data-arrival-status="paused"]').count()) {
    const text = await target.locator('[data-arrival-run]').textContent();
    assert.doesNotMatch(text, /n’a pas pu être enregistrée|pas été confirmé|visuels sont indisponibles/i,
      'A failed checkpoint/asset must fail, never be retried by readiness.');
    await target.getByRole('button', { name: 'Reprendre l’arrivée', exact: true }).click();
  }
  await target.locator('[data-arrival-status="playing"]').waitFor();
  await decodeSceneImages(target);
}

async function openShot(missionId, shotId, reducedMotion = false, shipId = api.DEFAULT_SHIP_ID) {
  assert.ok(api.isShipId(shipId), 'Spatial fixtures must use a registered hull.');
  const url = new URL(`http://127.0.0.1:${harnessPort}/`);
  url.searchParams.set('mission', missionId); url.searchParams.set('shot', shotId);
  url.searchParams.set('ship', shipId);
  if (reducedMotion) url.searchParams.set('reduced', '1');
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await ready();
}

async function measureMovement(label) {
  const first = await readFrame();
  if (!['carrier', 'release', 'descent', 'atmosphere'].includes(first.shot) || first.reducedMotion) return;
  await waitElapsed(first.elapsedMs + 260, first.shot);
  const last = await readFrame();
  const axisIds = first.shot === 'carrier' ? ['carrier-tail', 'carrier-nose'] : ['pod-tail', 'pod-nose'];
  const [tailId, noseId] = axisIds;
  assert.ok(first.anchors[tailId] && first.anchors[noseId] && last.anchors[tailId] && last.anchors[noseId],
    `${label}: missing actual sprite axis markers.`);
  const center = frame => ({ x: (frame.anchors[tailId].x + frame.anchors[noseId].x) / 2,
    y: (frame.anchors[tailId].y + frame.anchors[noseId].y) / 2 });
  const delta = vector(center(first), center(last));
  const length = Math.hypot(delta.x, delta.y);
  assert.ok(length > .05, `${label}: active flight must actually move.`);
  const alignment = cosine(vector(last.anchors[tailId], last.anchors[noseId]), delta);
  assert.ok(alignment > .90, `${label}: capsule/hull faces away from its rendered movement (cos=${alignment}).`);
  report.movement.push({ label, shot: first.shot, fromMs: first.elapsedMs, toMs: last.elapsedMs,
    from: center(first), to: center(last), alignment, screenDistance: length });
}

async function storageSnapshot(target) {
  return target.evaluate(() => {
    const read = storage => Object.fromEntries(Object.keys(storage).sort().map(key => [key, storage.getItem(key)]));
    return { local: read(localStorage), session: read(sessionStorage) };
  });
}

try {
  if (process.env.ARRIVAL_SPATIAL_SOURCE_COMMIT) {
    assert.equal(sourceCommit, process.env.ARRIVAL_SPATIAL_SOURCE_COMMIT, 'Evidence must match the requested source commit.');
    assert.equal(git('diff', '--name-only', 'HEAD', '--', ...sourceFiles), '', 'Audited source must not differ from the requested commit.');
  }
  await startHarness();
  await startNativeServer();
  const executablePath = process.env.CHROMIUM_EXECUTABLE || await fs.access(chromium.executablePath())
    .then(() => undefined, () => '/usr/bin/chromium');
  browser = await chromium.launch({ executablePath, headless: !headed, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'no-preference' });
  page = await context.newPage(); observePage(page, 'native-component-host');

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const shot of api.PLANET_ARRIVAL_SHOTS) {
      await check(`${viewport.id}: ${shot.id} actual layers, anchors and motion`, async () => {
        await openShot(primaryMission.id, shot.id);
        const duration = shot.endMs - shot.startMs;
        for (const [position, progress] of [['early', .1], ['middle', .5], ['late', .88]]) {
          await waitElapsed(shot.startMs + duration * progress, shot.id);
          await capture(`${viewport.id}-${shot.id}-${position}`);
          if (position === 'middle') await measureMovement(`${viewport.id}-${shot.id}`);
        }
      });
    }
    for (const mission of api.MISSIONS.filter(mission => mission.id !== primaryMission.id)) {
      await check(`${viewport.id}: ${mission.planetName} own planet, landscape and grounded emergence`, async () => {
        const save = api.defaultSave('2026-11-05T00:00:00.000Z');
        const expected = api.createPlanetArrival({ ownerCreatedAt: save.createdAt,
          runId: 'expected', missionId: mission.id, encounterRun: 1,
          personalShipId: api.DEFAULT_SHIP_ID, hunterPresetId: save.appearance.presetId });
        const assets = api.planetArrivalAssets(expected);
        for (const [shotId, progress] of [['carrier', .18], ['landing', .72], ['egress', .72]]) {
          const shot = api.PLANET_ARRIVAL_SHOTS.find(candidate => candidate.id === shotId);
          await openShot(mission.id, shotId);
          await waitElapsed(shot.startMs + (shot.endMs - shot.startMs) * progress, shotId);
          const frame = await capture(`${viewport.id}-${mission.id}-${shotId}`);
          assert.equal(frame.planet, expected.destinationId);
          if (shotId === 'carrier') {
            assert.equal(frame.planetImage, assets.planet, 'Planet calibration must retain the registered source path.');
            assert.ok([...frame.images, ...frame.svgImages].some(image => image.path === assets.planet),
              'Destination must render its registered planet artwork.');
          }
          else {
            assert.ok(frame.groundFrame, 'Destination must use the native biome crop.');
            assert.equal(await page.locator('[data-arrival-ground-frame] image').getAttribute('href'), assets.ground);
          }
        }
      });
    }
    for (const shipId of additionalShips) {
      await check(`${viewport.id}: ${shipId} source orientation and attached release effect`, async () => {
        const profile = api.shipProfileAssetPath(shipId);
        const calibration = api.carrierArtForShip(shipId);
        await openShot(primaryMission.id, 'carrier', false, shipId);
        const carrier = api.PLANET_ARRIVAL_SHOTS.find(shot => shot.id === 'carrier');
        await waitElapsed(carrier.startMs + (carrier.endMs - carrier.startMs) * .5, carrier.id);
        const frame = await capture(`${viewport.id}-${shipId}-carrier`);
        assert.equal(frame.ship, shipId, 'A selected hull must retain its own identity.');
        assert.ok(frame.images.some(image => image.path === profile), 'The real catalogue profile must be rendered.');
        await measureMovement(`${viewport.id}-${shipId}-carrier`);
        await openShot(primaryMission.id, 'release', false, shipId);
        const release = api.PLANET_ARRIVAL_SHOTS.find(shot => shot.id === 'release');
        await waitElapsed(release.startMs + (release.endMs - release.startMs) * .1, release.id);
        const ejection = await capture(`${viewport.id}-${shipId}-release`);
        assert.equal(ejection.ship, shipId);
        assert.ok(ejection.anchors['carrier-release'] && ejection.anchors['pod-tail'] &&
          ejection.anchors['release-origin']?.opacity > .02,
        'The observed ejection must include the hull socket, capsule and active release effect.');
        report.ships.push({ viewport: viewport.id, shipId, profile,
          directionBasis: calibration.directionBasis, review: calibration.review,
          scope: shipId === 'upgrade-spaceship' ? 'Projection of the authored perspective; canonical release geometry remains unasserted.' :
            'Rendered source orientation and attachment; no assertion of canonical release geometry.',
        });
      });
    }
  }

  await check('Reduced motion preserves sockets, ground contact and the native cut duration', async () => {
    await openShot(primaryMission.id, 'landing', true);
    const landing = api.PLANET_ARRIVAL_SHOTS.find(shot => shot.id === 'landing');
    await waitElapsed(landing.startMs + 1200, landing.id);
    const before = await readFrame();
    assert.equal(before.reducedMotion, true); assert.equal(before.contact, false);
    await waitElapsed(landing.startMs + (landing.endMs - landing.startMs) * api.PLANET_ARRIVAL_CONTACT_PROGRESS + 150, landing.id);
    const after = await capture('mobile-reduced-motion-ground-contact');
    assert.equal(after.contact, true); assert.equal(after.reducedMotion, true);
  });
  await context.close();

  const nativeContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'no-preference',
    recordVideo: { dir: path.join(out, 'video'), size: { width: 1440, height: 1000 } },
  });
  page = await nativeContext.newPage(); observePage(page, 'production-dev');
  const nativeVideo = page.video();
  let protectedStorage;
  await check('Production /dev runs all eight shots naturally, with real resize and exactly one hunt', async () => {
    await page.goto(nativeUrl.href, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('[data-dev-catalogue]').waitFor({ timeout: 60000 });
    protectedStorage = await storageSnapshot(page);
    await page.evaluate(() => {
      // Read-only observation of native canvas identities. No renderer, clock,
      // callback, browser storage method or simulation state is replaced.
      const seen = new WeakSet();
      const observations = { huntMounts: 0 };
      new MutationObserver(() => {
        for (const canvas of document.querySelectorAll('.hunt-screen canvas.hunt-canvas')) {
          if (!seen.has(canvas)) { seen.add(canvas); observations.huntMounts += 1; }
        }
      }).observe(document, { childList: true, subtree: true });
      Object.assign(window, { __arrivalSpatialObservations: observations });
    });
    await page.locator('[data-dev-category="arrivals"]').click();
    await page.locator(`[data-dev-launch="arrival-${primaryMission.id}"]`).click();
    await ready();
    const first = await readFrame();
    const visited = [first.shot];
    assert.equal(first.shot, 'orbit');
    report.native.runId = first.run;
    await capture('native-orbit');
    for (const shot of api.PLANET_ARRIVAL_SHOTS.slice(1)) {
      await waitElapsed(shot.startMs + 900, shot.id);
      visited.push(shot.id);
      const frame = await capture(`native-${shot.id}`);
      assert.equal(frame.run, first.run);
      if (shot.id === 'carrier') {
        await page.getByRole('button', { name: 'Pause', exact: true }).click();
        await page.locator('[data-arrival-status="paused"]').waitFor();
        const before = await capture('native-before-resize-paused');
        await page.waitForTimeout(350);
        assert.equal((await readFrame()).elapsedMs, before.elapsedMs, 'Native pause must freeze elapsed time.');
        await page.setViewportSize({ width: 320, height: 820 });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const after = await capture('native-after-resize-paused-320');
        assert.equal(after.elapsedMs, before.elapsedMs, 'Resize must not advance paused time.');
        for (const id of ['carrier-nose', 'carrier-tail', 'carrier-release']) {
          assert.ok(before.anchors[id] && after.anchors[id], 'Resize needs the actual hull anchors.');
          const normalized = (frame, axis) => (frame.anchors[id][axis] - frame.stage[axis]) /
            (axis === 'x' ? frame.stage.width : frame.stage.height);
          assert.ok(Math.abs(normalized(before, 'x') - normalized(after, 'x')) < .003 &&
            Math.abs(normalized(before, 'y') - normalized(after, 'y')) < .003,
          `${id}: resize must preserve composition and sprite orientation.`);
        }
        report.resizes.push({ before, after });
        await page.getByRole('button', { name: 'Reprendre l’arrivée', exact: true }).tap();
        await page.locator('[data-arrival-status="playing"]').waitFor();
      }
    }
    await page.locator('.hunt-screen canvas.hunt-canvas').waitFor({ timeout: 30000 });
    assert.equal(await page.locator('[data-arrival-run]').count(), 0);
    assert.equal(await page.locator('.hunt-screen canvas.hunt-canvas').count(), 1);
    assert.equal(await page.evaluate(() => window.__arrivalSpatialObservations.huntMounts), 1,
      'One natural arrival must create exactly one native hunt canvas.');
    const session = page.locator(`[data-dev-session="arrival-${primaryMission.id}"]`);
    assert.equal(await session.getAttribute('data-dev-arrival-run'), first.run);
    assert.equal(await session.getAttribute('data-dev-arrival-completed-by'), 'natural');
    assert.equal(await session.getAttribute('data-dev-arrival-elapsed'), '62000');
    assert.deepEqual(visited, api.PLANET_ARRIVAL_SHOTS.map(shot => shot.id));
    assert.deepEqual(await storageSnapshot(page), protectedStorage, 'Native test travel must preserve browser campaign storage.');
    report.native.shots = visited; report.native.completedBy = 'natural';
    await page.screenshot({ path: path.join(out, 'native-hunt-after-arrival.png'), fullPage: false });
  });
  await check('Native Reset and Skip retain the same destination and mount one real hunt', async () => {
    await page.locator('[data-dev-reset]').click();
    await ready();
    const before = await readFrame();
    assert.equal(before.shot, 'orbit');
    assert.ok(before.elapsedMs < 1500, 'Reset should restart at the beginning.');
    await page.getByRole('button', { name: /^Passer l’arrivée/ }).tap();
    await page.locator('.hunt-screen canvas.hunt-canvas').waitFor({ timeout: 30000 });
    const session = page.locator(`[data-dev-session="arrival-${primaryMission.id}"]`);
    assert.equal(await session.getAttribute('data-dev-arrival-completed-by'), 'skipped');
    assert.equal(await session.getAttribute('data-dev-arrival-run'), before.run);
    assert.equal(await page.locator('.hunt-screen canvas.hunt-canvas').count(), 1);
    assert.equal(await page.evaluate(() => window.__arrivalSpatialObservations.huntMounts), 2,
      'Reset then Skip must create exactly one additional native hunt canvas.');
    assert.equal(await page.locator('[data-arrival-run]').count(), 0);
    assert.deepEqual(await storageSnapshot(page), protectedStorage);
    report.native.skip = { runId: before.run, completedBy: 'skipped', huntCanvases: 1 };
  });
  await nativeContext.close();
  if (nativeVideo) {
    const savedPath = await nativeVideo.path();
    report.native.video = { file: path.relative(out, savedPath), sha256: sha256(await fs.readFile(savedPath)) };
  }
  await check('All requested artwork loads and neither renderer reports a browser exception', async () => {
    assert.deepEqual([...missing], []);
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.consoleErrors, []);
  });
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = { check: currentCheck, message: error.message, stack: error.stack };
  if (page && !page.isClosed()) {
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    report.failure.frame = await readFrame(page).catch(() => null);
  }
  console.error(error);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  report.missingAssets = [...missing].sort(); report.requestedAssets = [...requested].sort();
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close();
  if (harness) await harness.close();
  if (nativeServer && !nativeExit) {
    nativeServer.kill('SIGTERM');
    await new Promise(resolve => {
      const timer = setTimeout(() => { if (!nativeExit) nativeServer.kill('SIGKILL'); resolve(); }, 5000);
      nativeServer.once('exit', () => { clearTimeout(timer); resolve(); });
    });
  }
  if (harnessDir) await fs.rm(harnessDir, { recursive: true, force: true });
  console.log(`Spatial evidence: ${path.relative(root, out)}/report.json`);
}
