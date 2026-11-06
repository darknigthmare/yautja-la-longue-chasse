import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

/**
 * Spatial rendering audit, separate from the campaign transaction suite.
 *
 * The disposable Vite host imports the actual PlanetArrivalCinematic. A valid
 * paused state starts at a native shot boundary; the normal Resume button and
 * requestAnimationFrame then advance it. No fake clock, source replacement,
 * rescaled or retouched screenshot, fabricated asset or mocked renderer is used.
 * Four opaque QA paint markers are added in harness padding outside the arrival
 * component. Their fresh nonce proves native X11 presentation after the before
 * observation; no game DOM, clock or state is altered. Requested sample times
 * are thresholds: the report records the actual
 * elapsed time and rendered anchors, including the screenshot interval.
 *
 * A final natural 62-second route uses the real production /dev page, with its
 * real HuntCanvas handoff, resize, pause, resume and Skip controls.
 *
 * npm run build:production
 * xvfb-run -a --server-args="-screen 0 1920x1200x24" env ARRIVAL_SPATIAL_HEADED=1
 *   ARRIVAL_SPATIAL_START_SERVER=1 node scripts/qa-planet-arrival-spatial.mjs
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
  'app/game/HuntCanvas.tsx', 'app/game/systems/planetInsertion.ts', 'app/game/systems/shipInsertionEnergy.ts', 'app/game/systems/huntInsertion.ts',
  'app/dev/session.tsx', 'app/dev/destinations.ts', 'app/dev/client.tsx',
  'scripts/qa-planet-arrival-spatial.mjs', 'scripts/qa-planet-arrival-x11.py',
  ...(await fs.readdir(path.join(root, 'app/game/systems')))
    .filter(file => /^planetArrival.*\.ts$/.test(file)).map(file => `app/game/systems/${file}`),
].sort();
const sourceCommit = git('rev-parse', 'HEAD');
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async file =>
  [file, sha256(await fs.readFile(path.join(root, file)))])));
const workingTreeStatus = git('status', '--porcelain');
const report = {
  schema: 1, startedAt: new Date().toISOString(), sourceCommit,
  workingTreeDirty: workingTreeStatus.length > 0, workingTreeStatus, sourceHashes,
  browserMode: headed ? 'headed' : 'headless',
  scope: 'Actual component rendering at native shot boundaries on desktop/mobile; all eight destinations; seven representative orbital hulls; four insertion combinations plus paid optical camouflage, and three grounded hull profiles; natural production /dev arrival and real hunt handoffs. Spatial evidence is distinct from artistic or canonical approval. Ship contact and exit points follow source composition, without a claim about canonical landing gear or release bays.',
  timing: 'Unmodified native requestAnimationFrame. Samples wait for elapsed-time thresholds and retain observed times; no virtual or accelerated clock. Dense egress geometry is measured without PNG encoding; its photographs use independent playbacks from the same native shot boundary. Final trio details allow at most three native playbacks solely when screenshot acquisition crosses completion; every rejected PNG and interval is retained separately.',
  nativeUrl: nativeUrl.href, checks: [], samples: [], movement: [], captures: [], rejectedCaptures: [], captureAttempts: [], capturePreflights: [], contactObservations: [],
  resizes: [], ships: [], insertions: [], native: {}, errors: [], consoleErrors: [], missingAssets: [], requestedAssets: [],
};
const requested = new Set(), missing = new Set();
let browser, harness, harnessDir, nativeServer, nativeExit = null, page, x11Client, currentCheck = 'setup';
let harnessContext, compositionVideo, compositionFinalization;
const x11LaunchArgs = ['--ozone-platform=x11', '--disable-gpu', '--disable-gpu-compositing', '--no-xshm'];

const fixtureBundle = await build({
  stdin: {
    contents: `export { MISSIONS } from './app/game/data';
      export { PLANET_ARRIVAL_SHOTS, PLANET_ARRIVAL_CONTACT_PROGRESS, createPlanetArrival,
        planetArrivalAssets, planetArrivalLanding } from './app/game/systems/planetArrival';
      export { defaultSave } from './app/game/save';
      export { DEFAULT_SHIP_ID, isShipId, shipProfileAssetPath } from './app/game/shipCatalogue';
      export { carrierArtForShip } from './app/game/systems/planetArrivalArt';
      export { ARRIVAL_CONTACT_MS, ARRIVAL_HUNTER_MOVE_START_MS, ARRIVAL_HUNTER_MOVE_END_MS, ARRIVAL_HUNTER_THRESHOLD_LEAVE_MS,
        ARRIVAL_HUNTER_GROUND_CONTACT_MS, arrivalFormationSlots,
        arrivalShipCloakFrame } from './app/game/systems/planetArrivalPresentation';
      export { arrivalSurfaceShipGeometry } from './app/game/systems/planetArrivalSpatial';
      export { arrivalShipMotionFrame, arrivalShipMotionAssetPaths } from './app/game/systems/planetArrivalShipMotion';
      export { arrivalPodEntryFrame, arrivalPodPanelAngle, ARRIVAL_POD_FLIGHT_PANELS,
        ARRIVAL_POD_SHUTTERS_OPEN_START_MS, ARRIVAL_POD_SHUTTERS_OPEN_END_MS } from './app/game/systems/planetArrivalPodFlight';
      export { expeditionMemberAppearance, expeditionMemberLoadout } from './app/game/systems/planetInsertion';
      export { hunterDreadPath, HUNTER_GEAR_V3 } from './app/game/hunterVisuals';`,
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
const insertionVariants = [
  { id: 'ship-solo', plan: { version: 1, method: 'ship', team: 'solo' } },
  { id: 'pod-triad', plan: { version: 1, method: 'pod', team: 'triad' } },
  { id: 'ship-triad', plan: { version: 1, method: 'ship', team: 'triad' } },
  { id: 'ship-cloaked-triad', plan: { version: 1, method: 'ship', team: 'triad', shipCloak: true } },
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
    import { normalizePlanetInsertionPlan } from ${JSON.stringify(modulePath('app/game/systems/planetInsertion'))};
    import { MISSIONS } from ${JSON.stringify(modulePath('app/game/data'))};
    const query = new URLSearchParams(location.search);
    const mission = MISSIONS.find(item => item.id === query.get('mission'));
    const shot = PLANET_ARRIVAL_SHOTS.find(item => item.id === query.get('shot'));
    const ship = query.get('ship') ?? DEFAULT_SHIP_ID;
    const insertion = query.has('method') || query.has('team') ? normalizePlanetInsertionPlan({
      version: 1, method: query.get('method'), team: query.get('team'),
      ...(query.get('cloak') === '1' ? { shipCloak: true } : {}),
    }) : undefined;
    if (!mission || !shot || !isShipId(ship)) throw new Error('Unknown spatial-audit fixture.');
    if (insertion === null) throw new Error('Unknown insertion plan.');
    const save = defaultSave('2026-11-05T00:00:00.000Z');
    const initial = { ...createPlanetArrival({ ownerCreatedAt: save.createdAt,
      runId: 'spatial:' + mission.id + ':' + shot.id + ':' + ship, missionId: mission.id, encounterRun: 1,
      personalShipId: ship, hunterPresetId: save.appearance.presetId, ...(insertion ? { insertion } : {}) }),
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

async function readFrame(target = page, contactObservation) {
  return target.locator('[data-arrival-run]').evaluate(async (root, contactObservation) => {
    const evaluationStartedAtMs = performance.now();
    // Thresholds and snapshots share one exact clock. Rounded display values
    // can enter a short contact interval before its real lower boundary.
    const readElapsedMs = () => Number(root.getAttribute('data-arrival-elapsed-exact') ?? root.getAttribute('data-arrival-elapsed'));
    if (contactObservation) {
      const initialRun = root.getAttribute('data-arrival-run');
      // Arm at the native shot boundary, before the short contact interval.
      // Resolve and measure in this browser task; no Node round trip, clock
      // override, pause, input or DOM change is involved in the observation.
      await new Promise((resolve, reject) => {
        const observer = new MutationObserver(inspect);
        const timer = setTimeout(() => finish(new Error('The native contact interval was not observed within 25 seconds.')), 25_000);
        function finish(error) {
          observer.disconnect(); clearTimeout(timer);
          if (error) reject(error); else resolve();
        }
        function inspect() {
          const roots = document.querySelectorAll('[data-arrival-run]');
          if (!root.isConnected || roots.length !== 1 || roots[0] !== root ||
              root.getAttribute('data-arrival-run') !== initialRun) {
            finish(new Error('The arrival root or run changed before the native contact measurement.')); return;
          }
          if (root.getAttribute('data-arrival-status') !== 'playing' ||
              root.getAttribute('data-arrival-shot') !== contactObservation.shot) {
            finish(new Error('The native contact measurement left its playing shot.')); return;
          }
          const elapsed = readElapsedMs();
          if (!Number.isFinite(elapsed) || elapsed >= contactObservation.endMs) {
            finish(new Error('The native contact interval ended before its geometry was observed.')); return;
          }
          const members = [...root.querySelectorAll('[data-arrival-hunter]')]
            .filter(member => member.getAttribute('data-arrival-member') === contactObservation.member);
          if (members.length !== 1) {
            finish(new Error('A native contact measurement requires exactly one requested hunter.')); return;
          }
          if (elapsed >= contactObservation.atMs &&
              members[0].getAttribute('data-arrival-hunter-contact') === contactObservation.contact &&
              Number(getComputedStyle(members[0]).opacity) > .02) finish();
        }
        observer.observe(root, { attributes: true, subtree: true,
          attributeFilter: ['data-arrival-elapsed-exact', 'data-arrival-elapsed', 'data-arrival-status', 'data-arrival-shot',
            'data-arrival-run', 'data-arrival-hunter-contact', 'style'] });
        inspect();
      });
      if (!root.isConnected || root.getAttribute('data-arrival-run') !== initialRun) {
        throw new Error('The native contact root changed before its geometry snapshot.');
      }
    }
    // A keyed step effect can mount after the shot's initial image preparation.
    // Let that actual DOM image reach its native ready state before taking one
    // synchronous geometry snapshot. No source, DOM, clock or input is changed.
    const readinessStartedAtMs = performance.now();
    const imageReady = image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
    const imageState = image => ({ path: image.getAttribute('src'), complete: image.complete,
      width: image.naturalWidth, height: image.naturalHeight, connected: image.isConnected });
    const pendingImages = new Set([...root.querySelectorAll('img')].filter(image => !imageReady(image)));
    const imageReadiness = { budgetMs: 500, startedAt: readElapsedMs(), endedAt: readElapsedMs(),
      waitedMs: 0, reason: 'ready', initialInvalidImages: [...pendingImages].map(imageState), invalidImages: [] };
    if (pendingImages.size) {
      const started = performance.now();
      const initialRun = root.getAttribute('data-arrival-run');
      const initialShot = root.getAttribute('data-arrival-shot');
      const initialStatus = root.getAttribute('data-arrival-status');
      while (true) {
        // Revalidate after every await, including the last one. A ready result
        // is followed immediately by the geometry reads in this browser task.
        const roots = document.querySelectorAll('[data-arrival-run]');
        if (!root.isConnected || roots.length !== 1 || roots[0] !== root ||
            root.getAttribute('data-arrival-run') !== initialRun ||
            root.getAttribute('data-arrival-shot') !== initialShot ||
            root.getAttribute('data-arrival-status') !== initialStatus) {
          imageReadiness.reason = 'native-context-changed'; break;
        }
        if (contactObservation && (readElapsedMs() < contactObservation.atMs || readElapsedMs() >= contactObservation.endMs)) {
          imageReadiness.reason = 'native-contact-window-ended'; break;
        }
        const remaining = imageReadiness.budgetMs - (performance.now() - started);
        if (remaining <= 0) { imageReadiness.reason = 'timeout'; break; }
        // Retain every unready node even if React removes it: disappearance
        // must not turn a genuinely broken image into a successful sample.
        for (const image of root.querySelectorAll('img')) if (!imageReady(image)) pendingImages.add(image);
        if ([...pendingImages].some(image => image.complete && !imageReady(image))) {
          imageReadiness.reason = 'image-error'; break;
        }
        if ([...pendingImages].every(imageReady)) break;
        await new Promise(resolve => {
          let frame = 0;
          const timer = setTimeout(() => { cancelAnimationFrame(frame); resolve(); }, remaining);
          frame = requestAnimationFrame(() => { clearTimeout(timer); resolve(); });
        });
      }
      imageReadiness.waitedMs = performance.now() - started;
      imageReadiness.endedAt = readElapsedMs();
      imageReadiness.invalidImages = [...pendingImages].filter(image => !imageReady(image)).map(imageState);
    }
    const geometryStartedAtMs = performance.now();
    let boxReads = 0;
    const rect = element => {
      if (!element) return null;
      boxReads += 1;
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const opacity = element => {
      let value = 1;
      for (let parent = element; parent && parent !== root; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden') return 0;
        value *= Number(style.opacity);
      }
      return value;
    };
    const transformToRoot = element => {
      let matrix = new DOMMatrix();
      for (let parent = element; parent && parent !== root; parent = parent.parentElement) {
        const transform = getComputedStyle(parent).transform;
        if (transform !== 'none') matrix = new DOMMatrix(transform).multiply(matrix);
      }
      return matrix;
    };
    const anchors = {};
    const anchorIds = [];
    for (const element of root.querySelectorAll('[data-arrival-anchor]')) {
      const id = element.getAttribute('data-arrival-anchor');
      const owner = element.closest('[data-arrival-member]')?.getAttribute('data-arrival-member') ?? 'player';
      const socket = element.closest('[data-arrival-vfx-source]')?.getAttribute('data-arrival-vfx-source') ?? null;
      anchorIds.push(id);
      anchors[id] = {
        ...rect(element), opacity: opacity(element),
        vfxSource: socket ? `${owner === 'player' ? '' : owner + '-'}${socket}` : null,
      };
    }
    const stage = root.querySelector('[data-arrival-stage]');
    const camera = root.querySelector('[data-arrival-ground-camera]');
    const hunter = root.querySelector('[data-arrival-hunter]');
    const hunterClip = hunter ? getComputedStyle(hunter).clipPath : 'none';
    const clipId = hunterClip.match(/#([^"')]+)/)?.[1];
    const clip = clipId ? document.getElementById(decodeURIComponent(clipId)) : null;
    const members = [...root.querySelectorAll('[data-arrival-hunter]')].map(element => {
      const rig = element.querySelector('[data-hunter-rig]');
      const clipValue = getComputedStyle(element).clipPath;
      const id = clipValue.match(/#([^"')]+)/)?.[1];
      const geometry = id ? document.getElementById(decodeURIComponent(id)) : null;
      return {
        id: element.getAttribute('data-arrival-member'), name: element.getAttribute('data-arrival-member-name'),
        stage: element.getAttribute('data-arrival-hunter-stage'), contact: element.getAttribute('data-arrival-hunter-contact'),
        portal: element.getAttribute('data-arrival-hunter-portal'), opacity: opacity(element), ...rect(element),
        clip: { value: clipValue, target: geometry?.tagName ?? null, parts: geometry?.children.length ?? 0 },
        rig: rig ? { preset: rig.getAttribute('data-preset'), headStyle: rig.getAttribute('data-head-style'),
          armor: rig.getAttribute('data-armor'), morph: rig.getAttribute('data-body-morph'),
          sources: [...rig.querySelectorAll('img')].map(image => image.getAttribute('src')) } : null,
      };
    });
    const groundShip = root.querySelector('[data-arrival-ground-ship]');
    const shipImage = groundShip?.querySelector('img');
    const cloakHulls = [...root.querySelectorAll('[data-arrival-cloak-strength]')].map(element => {
      const body = element.querySelector('[data-arrival-cloak-body]');
      const views = [...element.querySelectorAll('[data-arrival-ship-view-layer]')].map(view => {
        const style = getComputedStyle(view);
        const image = view.querySelector('[data-arrival-lit] img');
        return { id: view.getAttribute('data-arrival-ship-view-layer'),
          source: view.getAttribute('data-arrival-ship-view-path'), imageSource: image?.getAttribute('src'),
          opacity: Number(style.opacity), transform: style.transform, transformOrigin: style.transformOrigin,
          ...rect(view), image: rect(image) };
      });
      const lenses = [...element.querySelectorAll('[data-arrival-cloak-refraction]')].map(lens => {
        const style = getComputedStyle(lens);
        const filterId = style.backdropFilter.match(/#([^"')]+)/)?.[1];
        const filter = filterId ? document.getElementById(decodeURIComponent(filterId)) : null;
        const offset = filter?.querySelector('feOffset');
        const displacement = filter?.querySelector('feDisplacementMap');
        return { source: lens.getAttribute('data-arrival-cloak-refraction'), view: lens.getAttribute('data-arrival-cloak-view'),
          ...rect(lens), opacity: Number(style.opacity), mask: style.maskImage, size: style.maskSize,
          repeat: style.maskRepeat, filter: style.backdropFilter, transform: style.transform, transformOrigin: style.transformOrigin,
          animation: style.animationName, transition: style.transitionDuration,
          distortion: offset && displacement ? { x: Number(offset.getAttribute('dx')), y: Number(offset.getAttribute('dy')),
            scale: Number(displacement.getAttribute('scale')) } : null };
      });
      const rims = [...element.querySelectorAll('[data-arrival-cloak-rim]')].map(rim => {
        const style = getComputedStyle(rim);
        return { source: rim.getAttribute('data-arrival-cloak-rim'), view: rim.getAttribute('data-arrival-cloak-view'),
          ...rect(rim), opacity: Number(style.opacity), href: rim.querySelector('image')?.getAttribute('href'),
          transform: style.transform, transformOrigin: style.transformOrigin };
      });
      return {
        role: element.hasAttribute('data-arrival-ground-ship') ? 'ground-ship' : 'carrier',
        strength: Number(element.getAttribute('data-arrival-cloak-strength')), opacity: opacity(element),
        source: views[0]?.imageSource, image: views[0]?.image,
        canvas: rect(element.querySelector('[data-arrival-cloak-hull]')), views, lenses, rims,
        body: body ? { opacity: Number(getComputedStyle(body).opacity), ...rect(body) } : null,
        // Retain the first-layer summary used by the historical capture index;
        // spatial assertions below inspect every actual contributing view.
        lens: lenses[0] ?? null, rim: rims[0] ?? null, distortion: lenses[0]?.distortion ?? null,
      };
    });
    const lights = [...root.querySelectorAll('[data-arrival-lit]')].map(element => {
      const mask = element.querySelector('[data-arrival-light-mask]');
      const style = mask ? getComputedStyle(mask) : null;
      // Read the browser's gradient and actual transform chain, not the source
      // rotation attributes: a reversed hull must retain a fixed world light.
      const gradient = style?.backgroundImage.match(/linear-gradient\(([-\d.]+)deg/);
      const matrix = transformToRoot(mask);
      const radians = gradient ? (Number(gradient[1]) - 270) * Math.PI / 180 : NaN;
      const direction = matrix.transformPoint(new DOMPoint(Math.cos(radians), Math.sin(radians), 0, 0));
      const face = element.closest('[data-arrival-hatch-face]');
      const faceBackVisibility = face ? getComputedStyle(face).backfaceVisibility : null;
      const faceTowardCamera = face ? transformToRoot(face).m33 > 0 : true;
      return {
        role: element.getAttribute('data-arrival-lit'),
        source: element.getAttribute('data-arrival-light-source'),
        imageSource: element.querySelector('img')?.getAttribute('src') ?? null,
        environment: element.getAttribute('data-arrival-light-environment'),
        expectedWorldAngle: Number(element.getAttribute('data-arrival-light-world-angle')),
        renderedWorldAngle: gradient ? Math.atan2(direction.y, direction.x) * 180 / Math.PI : null,
        mask: style ? { image: style.maskImage, size: style.maskSize, repeat: style.maskRepeat, ...rect(mask) } : null,
        image: rect(element.querySelector('img')), faceBackVisibility, faceTowardCamera,
        opacity: opacity(element) * (faceBackVisibility === 'hidden' && !faceTowardCamera ? 0 : 1),
      };
    });
    const frame = {
      run: root.getAttribute('data-arrival-run'), shot: root.getAttribute('data-arrival-shot'),
      status: root.getAttribute('data-arrival-status'),
      elapsedMs: readElapsedMs(),
      imageReadiness,
      reducedMotion: root.getAttribute('data-arrival-reduced-motion') === 'true',
      method: root.getAttribute('data-arrival-method'), team: root.getAttribute('data-arrival-team'),
      shipCloak: root.getAttribute('data-arrival-ship-cloak') === 'true',
      shipViewsUnavailable: Number(root.getAttribute('data-arrival-ship-motion-unavailable')),
      sceneShipCloak: root.querySelector('[data-arrival-scene]')?.getAttribute('data-arrival-ship-cloak') === 'true',
      cloakPhase: root.querySelector('[data-arrival-scene]')?.getAttribute('data-arrival-cloak-phase'), cloakHulls,
      contact: root.querySelector('[data-arrival-scene]')?.getAttribute('data-arrival-contact') === 'true',
      scene: rect(root.querySelector('[data-arrival-scene]')), stage: rect(stage),
      stageLayout: stage ? { width: stage.offsetWidth, height: stage.offsetHeight, transform: getComputedStyle(stage).transform } : null,
      camera: rect(camera), cameraTransform: camera ? getComputedStyle(camera).transform : null,
      groundScale: camera ? Math.hypot(transformToRoot(camera).a, transformToRoot(camera).b) : null,
      flightPod: rect(root.querySelector('[data-arrival-flight-pod]')), anchors, anchorIds, lights, members,
      flightPods: [...root.querySelectorAll('[data-arrival-flight-pod]')].map(element => ({
        member: element.getAttribute('data-arrival-member'), ...rect(element), opacity: opacity(element),
        elapsedMs: Number(element.getAttribute('data-arrival-pod-elapsed')),
        phase: element.getAttribute('data-arrival-pod-phase'), shutters: element.getAttribute('data-arrival-pod-shutters'),
        deployment: Number(element.getAttribute('data-arrival-pod-deployment')),
        heat: Number(element.getAttribute('data-arrival-pod-heat')),
        hullHeat: Number(element.getAttribute('data-arrival-pod-hull-heat')),
        panels: [...element.querySelectorAll('[data-arrival-pod-shutter]')].map(panel => {
          const style = getComputedStyle(panel), matrix = new DOMMatrix(style.transform);
          return { id: panel.getAttribute('data-arrival-pod-shutter'),
            angle: Number(panel.getAttribute('data-arrival-shutter-angle')),
            renderedAngle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI,
            transform: style.transform, clip: style.clipPath };
        }),
      })),
      groundPods: [...root.querySelectorAll('[data-arrival-ground-pod]')].map(element => ({
        member: element.getAttribute('data-arrival-member'), ...rect(element), opacity: opacity(element),
      })),
      groundShip: groundShip ? { id: groundShip.getAttribute('data-arrival-ground-ship'),
        contact: groundShip.getAttribute('data-arrival-ship-contact') === 'true',
        source: shipImage?.getAttribute('src'), image: rect(shipImage),
        mirrored: shipImage ? transformToRoot(shipImage).a < 0 : false,
        opacity: opacity(groundShip), ...rect(groundShip) } : null,
      hunterStage: root.querySelector('[data-arrival-hunter-stage]')?.getAttribute('data-arrival-hunter-stage') ?? null,
      hunterContact: root.querySelector('[data-arrival-hunter-contact]')?.getAttribute('data-arrival-hunter-contact') ?? null,
      hunterPortal: root.querySelector('[data-arrival-hunter-portal]')?.getAttribute('data-arrival-hunter-portal') ?? null,
      hunterClip: { value: hunterClip, target: clip?.tagName ?? null, parts: clip?.children.length ?? 0 },
      impactMaterial: root.querySelector('[data-arrival-impact-material]')?.getAttribute('data-arrival-impact-material') ?? null,
      vents: [...root.querySelectorAll('[data-arrival-vent]')].map(element => ({
        side: element.getAttribute('data-arrival-vent'), member: element.getAttribute('data-arrival-member'), opacity: opacity(element),
        phases: [...element.querySelectorAll('img')].map(image => ({
          source: image.getAttribute('src'), opacity: Number(getComputedStyle(image).opacity),
        })),
      })),
      debris: [...root.querySelectorAll('[data-arrival-debris]')].map(element => ({
        id: Number(element.getAttribute('data-arrival-debris')), member: element.getAttribute('data-arrival-member'),
        ...rect(element), opacity: opacity(element),
        source: element.querySelector('img')?.getAttribute('src') ?? null,
      })),
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
    const finishedAtMs = performance.now();
    frame.observationTiming = { clock: 'browser performance.now()', evaluationStartedAtMs, readinessStartedAtMs,
      geometryStartedAtMs, finishedAtMs, contactObservationMs: readinessStartedAtMs - evaluationStartedAtMs,
      readinessCheckMs: geometryStartedAtMs - readinessStartedAtMs, geometryMs: finishedAtMs - geometryStartedAtMs,
      totalMs: finishedAtMs - evaluationStartedAtMs, boxReads };
    return frame;
  }, contactObservation);
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
const groundPoint = (frame, id) => ({
  x: (frame.anchors[id].x - frame.anchors['ground-reference'].x) / frame.groundScale,
  y: (frame.anchors[id].y - frame.anchors['ground-reference'].y) / frame.groundScale,
});

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
  assert.equal(frame.imageReadiness.reason, 'ready', `${label}: native image readiness failed (${frame.imageReadiness.reason}).`);
  assert.deepEqual(frame.imageReadiness.invalidImages, [], `${label}: an observed image failed even if its node was removed.`);
  assert.deepEqual(frame.images.filter(image => !image.complete || image.width === 0 || image.height === 0), [],
    `${label}: undecoded or missing scene image.`);
  assert.ok(frame.svgImages.every(image => image.path && image.width > 0 && image.height > 0 &&
    frame.decodedSvg.some(decoded => decoded.path === image.path && decoded.complete && decoded.width > 0 && decoded.height > 0)),
  `${label}: every declared SVG source must be a decoded real image.`);
  assert.doesNotMatch(frame.statusText, /indisponible|n’a pas pu|pas été confirmé/i, `${label}: scene reported a runtime failure.`);
  assert.ok(['pod', 'ship'].includes(frame.method), `${label}: insertion method must be explicit.`);
  assert.ok(['solo', 'triad'].includes(frame.team), `${label}: expedition size must be explicit.`);
  assert.equal(frame.sceneShipCloak, frame.shipCloak, `${label}: the scene must retain the accepted optical mode.`);
  if (frame.shipCloak) assert.equal(frame.method, 'ship', `${label}: capsules cannot inherit ship camouflage.`);
  const cloak = api.arrivalShipCloakFrame(frame.elapsedMs,
    { version: 1, method: frame.method, team: frame.team, ...(frame.shipCloak ? { shipCloak: true } : {}) }, frame.reducedMotion);
  assert.equal(frame.cloakPhase, cloak.phase, `${label}: optical release must follow the saved cinematic clock.`);
  for (const hull of frame.cloakHulls) {
    assert.ok(Math.abs(hull.strength - cloak.strength) < .002, `${label}: hull camouflage must follow its real elapsed time.`);
    const motion = api.arrivalShipMotionFrame(frame.ship, frame.elapsedMs, frame.method, frame.reducedMotion,
      frame.shipViewsUnavailable > 0 ? api.arrivalShipMotionAssetPaths(frame.ship) : []);
    const expectedViews = hull.role === 'ground-ship'
      ? [{ id: 'profile', path: api.shipProfileAssetPath(frame.ship), opacity: 1 }]
      : [{ id: motion.from.id, path: motion.from.path, opacity: 1 - motion.mix },
        ...(motion.to ? [{ id: motion.to.id, path: motion.to.path, opacity: motion.mix }] : [])]
        .filter(view => view.opacity > 0);
    assert.equal(hull.views.length, expectedViews.length, `${label}: every current view of the selected hull must be painted.`);
    assert.equal(hull.source, expectedViews[0].path, `${label}: camouflage must retain the selected hull's current view.`);
    for (const expected of expectedViews) {
      const views = hull.views.filter(view => view.id === expected.id);
      assert.equal(views.length, 1, `${label}: ${expected.id} must be painted exactly once.`);
      const view = views[0];
      assert.equal(view.source, expected.path); assert.equal(view.imageSource, expected.path);
      assert.ok(view.image && Math.abs(view.opacity - expected.opacity) < .002,
        `${label}: each actual source must keep its saved-time mixture.`);
    }
    if (!frame.shipCloak) {
      assert.equal(hull.body, null); assert.equal(hull.lens, null); assert.equal(hull.rim, null);
      assert.deepEqual(hull.lenses, []); assert.deepEqual(hull.rims, []);
      continue;
    }
    assert.ok(hull.body && hull.image && hull.canvas, `${label}: camouflage needs the real body beneath its optical layers.`);
    assert.ok(Math.abs(hull.body.opacity - cloak.hullOpacity) < .002, `${label}: the partially visible hull must use the saved optical envelope.`);
    assert.ok(['x', 'y', 'width', 'height'].every(key => Math.abs(hull.body[key] - hull.canvas[key]) < 1),
      `${label}: the global optical body must remain on the same registered carrier canvas.`);
    if (hull.strength === 0) {
      assert.equal(hull.body.opacity, 1, `${label}: the full opaque hull must return before ground contact.`);
      assert.equal(hull.lens, null); assert.equal(hull.rim, null);
      assert.deepEqual(hull.lenses, []); assert.deepEqual(hull.rims, []);
      continue;
    }
    assert.ok(hull.lens && hull.rim && hull.distortion, `${label}: active camouflage needs actual masked refraction, rim and SVG displacement.`);
    assert.equal(hull.lenses.length, hull.views.length); assert.equal(hull.rims.length, hull.views.length);
    for (const view of hull.views) {
      const lenses = hull.lenses.filter(lens => lens.view === view.id);
      const rims = hull.rims.filter(rim => rim.view === view.id);
      assert.equal(lenses.length, 1, `${label}: each painted view needs exactly one matching refraction layer.`);
      assert.equal(rims.length, 1, `${label}: each painted view needs exactly one matching rim.`);
      const lens = lenses[0], rim = rims[0];
      assert.equal(lens.source, view.source); assert.equal(rim.source, view.source); assert.equal(rim.href, view.source);
      assert.ok(lens.mask.includes(view.source), `${label}: refraction must be masked to the same painted silhouette.`);
      assert.equal(lens.size, '100% 100%'); assert.equal(lens.repeat, 'no-repeat');
      assert.equal(lens.animation, 'none'); assert.equal(lens.transition, '0s');
      for (const layer of [lens, rim]) {
        assert.ok(['x', 'y', 'width', 'height'].every(key => Math.abs(layer[key] - view.image[key]) < 1),
          `${label}: an optical layer drifted away from its actual ${view.id} image.`);
        assert.equal(layer.transform, view.transform, `${label}: optics must share the painted view's full registration.`);
        assert.equal(layer.transformOrigin, view.transformOrigin, `${label}: optics must rotate around the same source pivot.`);
      }
      assert.ok(Math.abs(lens.opacity - cloak.refractionOpacity * view.opacity) < .002);
      assert.ok(Math.abs(rim.opacity - cloak.rimOpacity * view.opacity) < .002);
      assert.ok(lens.distortion, `${label}: every active refraction must resolve its actual displacement filter.`);
      for (const [key, expected] of [['x', cloak.noiseOffsetX], ['y', cloak.noiseOffsetY], ['scale', cloak.distortionScale]]) {
        assert.ok(Math.abs(lens.distortion[key] - expected) < .02, `${label}: optical turbulence must be derived from the saved clock.`);
        if (frame.reducedMotion) assert.equal(lens.distortion[key], 0, `${label}: reduced motion must stop optical turbulence.`);
      }
    }
    assert.ok(Math.abs(hull.lenses.reduce((sum, lens) => sum + lens.opacity, 0) - cloak.refractionOpacity) < .002,
      `${label}: the complete refraction envelope must survive the view mixture.`);
    assert.ok(Math.abs(hull.rims.reduce((sum, rim) => sum + rim.opacity, 0) - cloak.rimOpacity) < .002,
      `${label}: the complete rim envelope must survive the view mixture.`);
  }
  assert.equal(new Set(frame.anchorIds).size, frame.anchorIds.length, `${label}: formation anchors must not overwrite one another.`);
  const formation = api.arrivalFormationSlots(frame.team);
  assert.deepEqual(frame.members.map(member => member.id), formation.map(slot => slot.id),
    `${label}: every selected hunter needs one real rig, and solo must remain one hunter.`);
  for (const member of frame.members) {
    assert.ok(member.rig?.sources.length > 0, `${label}: ${member.id} must render actual rig images.`);
    if (member.id === 'player') continue;
    const look = api.expeditionMemberAppearance(member.id), kit = api.expeditionMemberLoadout(member.id);
    assert.equal(member.rig.preset, look.presetId);
    assert.equal(member.rig.headStyle, look.headStyleId);
    assert.equal(member.rig.morph, look.bodyMorphId);
    assert.equal(member.rig.armor, kit.armorId);
    assert.ok(member.rig.sources.includes(api.hunterDreadPath(look.dreadStyleId)),
      `${label}: ${member.id} must retain its own registered dread source.`);
    for (const gear of kit.gearIds) assert.ok(member.rig.sources.includes(api.HUNTER_GEAR_V3[gear]),
      `${label}: ${member.id} must retain its actual assigned equipment.`);
  }
  for (const light of frame.lights) {
    assert.ok(light.mask && light.image && light.source, `${label}: ${light.role} needs an image and its alpha mask.`);
    assert.equal(light.imageSource, light.source, `${label}: lighting must follow the actual sprite source.`);
    assert.ok(light.mask.image.includes(light.source), `${label}: ${light.role} mask must use the same silhouette.`);
    assert.equal(light.mask.size, '100% 100%', `${label}: mask must cover the source at its native aspect ratio.`);
    assert.equal(light.mask.repeat, 'no-repeat', `${label}: lighting must not tile beyond the sprite.`);
    assert.ok(['x', 'y', 'width', 'height'].every(key => Math.abs(light.mask[key] - light.image[key]) < 1),
      `${label}: ${light.role} mask is detached from the rendered sprite.`);
    if (['carrier', 'flight-pod', 'ground-ship'].includes(light.role)) {
      assert.notEqual(light.renderedWorldAngle, null, `${label}: orbital sprites need a rendered key light.`);
      const delta = (light.renderedWorldAngle - light.expectedWorldAngle) * Math.PI / 180;
      assert.ok(Math.cos(delta) > .999, `${label}: ${light.role} light rotated with the hull or its source mirror.`);
    }
    if (['hatch', 'hatch-interior'].includes(light.role)) {
      assert.equal(light.faceBackVisibility, 'hidden', `${label}: only the correctly facing side of the rigid hatch may be visible.`);
    }
  }
  const a = frame.anchors;
  for (const pod of frame.flightPods) {
    const slot = formation.find(member => member.id === pod.member);
    assert.ok(slot, `${label}: the pod must belong to the selected formation.`);
    assert.ok(Math.abs(pod.elapsedMs - (frame.elapsedMs - slot.delayMs)) <= 1,
      `${label}: each pod must use its own saved-clock offset.`);
    const entry = api.arrivalPodEntryFrame(pod.elapsedMs, frame.reducedMotion);
    assert.equal(pod.phase, entry.phase); assert.equal(pod.shutters, entry.shutters);
    assert.equal(pod.deployment, entry.shuttersOpen); assert.equal(pod.heat, entry.heat);
    assert.equal(pod.hullHeat, entry.hullHeat);
    assert.deepEqual(pod.panels.map(panel => panel.id), ['upper', 'lower'],
      `${label}: each pod needs two independent rigid control petals.`);
    const prefix = pod.member === 'player' ? '' : pod.member + '-';
    for (const panel of pod.panels) {
      const art = api.ARRIVAL_POD_FLIGHT_PANELS.find(part => part.id === panel.id);
      // DOM attributes serialize both signed zeroes as "0". They are the same
      // mechanical angle; keep exact numeric equality for every other value.
      assert.ok(panel.angle === api.arrivalPodPanelAngle(art, entry.shuttersOpen),
        `${label}: the petal angle must follow its saved deployment state.`);
      assert.ok(Math.abs(panel.renderedAngle - panel.angle) < .001,
        `${label}: the browser must render the panel's mechanical angle.`);
      assert.notEqual(panel.clip, 'none', `${label}: the petal must be isolated from the original hull.`);
      const hinge = a[`${prefix}shutter-${panel.id}-hinge`], socket = a[`${prefix}shutter-${panel.id}-socket`];
      assert.ok(hinge && socket && distance(hinge, socket) <= 1.5,
        `${label}: ${pod.member} ${panel.id} panel must rotate about its own attached hinge.`);
    }
    const bow = a[`${prefix}bow-shock-origin`];
    if (bow?.opacity > .02) assert.ok(a[`${prefix}pod-nose`] && distance(bow, a[`${prefix}pod-nose`]) <= 1.5,
      `${label}: the bow shock must remain attached to the moving nose.`);
  }
  for (const effect of formation.flatMap(slot => ['release-origin', 'trail-origin']
    .map(id => `${slot.id === 'player' ? '' : slot.id + '-'}${id}`))) {
    if (!a[effect] || a[effect].opacity < .02) continue;
    assert.ok(a[effect].vfxSource && a[a[effect].vfxSource], `${label}: ${effect} needs its actual parent socket.`);
    assert.ok(distance(a[effect], a[a[effect].vfxSource]) <= 1.5,
      `${label}: ${effect} detached by ${distance(a[effect], a[a[effect].vfxSource]).toFixed(3)} screen pixels.`);
  }
  for (const slot of formation) {
    const prefix = slot.id === 'player' ? '' : slot.id + '-';
    if (a[`${prefix}trail-origin`]?.opacity > .02 && a[`${prefix}trail-end`] && a[`${prefix}pod-nose`] && a[`${prefix}pod-tail`]) {
      const trail = vector(a[`${prefix}trail-origin`], a[`${prefix}trail-end`]);
      const axis = vector(a[`${prefix}pod-tail`], a[`${prefix}pod-nose`]);
      assert.ok(cosine(trail, axis) < -.96, `${label}: ${slot.id} hot wake must point behind its capsule.`);
    }
  }
  if (frame.contact && frame.method === 'pod') {
    assert.ok(a['ground-reference'] && a['ground-capsule-reference'] && a['pod-ground'],
      `${label}: grounded frame needs ground and capsule contact anchors.`);
    assert.ok(distance(a['pod-ground'], a['ground-capsule-reference']) <= 1.5,
      `${label}: capsule contact floats above or penetrates its projected surface.`);
    for (const id of ['pod-ground', 'dust-ground']) {
      if (!a[id] || a[id].opacity < .02) continue;
      assert.ok(Math.abs(a[id].y - a['ground-reference'].y) <= 1.5,
        `${label}: ${id} differs from the projected floor by ${(a[id].y - a['ground-reference'].y).toFixed(3)} px.`);
    }
    if (a['door-hinge']?.opacity > .02 && a['door-hinge-reference']) {
      assert.ok(distance(a['door-hinge'], a['door-hinge-reference']) <= 1.5,
        `${label}: opening door detached from its physical hinge.`);
    }
    if (a['hunter-feet']?.opacity > .02) {
      assert.ok(a['hunter-support'] && a['capsule-threshold'], `${label}: emerging hunter needs its real support and doorway threshold.`);
      assert.ok(distance(a['hunter-feet'], a['hunter-support']) <= 1.5,
        `${label}: hunter feet detached from their projected support.`);
      assert.ok(a['capsule-threshold'].y < a['ground-reference'].y,
        `${label}: the capsule threshold must sit above the world surface.`);
      if (frame.hunterPortal === 'active') {
        assert.notEqual(frame.hunterClip.value, 'none', `${label}: hunter in the opening must be occluded by the real doorway.`);
        assert.equal(frame.hunterClip.target, 'clipPath', `${label}: hunter clipping must resolve to a real SVG aperture.`);
        assert.ok(frame.hunterClip.parts > 0, `${label}: the doorway aperture must contain rendered clipping geometry.`);
      } else {
        assert.equal(frame.hunterPortal, 'clear', `${label}: visible hunter needs an explicit doorway transition.`);
        assert.equal(frame.hunterClip.value, 'none', `${label}: hunter must be unclipped after clearing the capsule.`);
      }
      if (frame.hunterContact === 'threshold') {
        assert.equal(frame.hunterStage, 'cabin');
        assert.ok(Math.abs(a['hunter-feet'].y - a['capsule-threshold'].y) <= 1.5,
          `${label}: the hunter must stand on the doorway threshold before stepping down.`);
      } else if (frame.hunterContact === 'airborne') {
        assert.equal(frame.hunterStage, 'step-down');
        assert.ok(a['hunter-feet'].y >= a['capsule-threshold'].y - 1.5 &&
          a['hunter-feet'].y <= a['ground-reference'].y + 1.5,
        `${label}: the step down must remain between the threshold and the shared ground.`);
      } else {
        assert.equal(frame.hunterContact, 'ground', `${label}: visible hunter needs a known physical contact.`);
        assert.ok(['walking', 'standing'].includes(frame.hunterStage));
        assert.ok(Math.abs(a['hunter-feet'].y - a['ground-reference'].y) <= 1.5,
          `${label}: hunter must land on the world floor after the step down.`);
      }
    }
    for (const side of ['left', 'right']) {
      const vapor = a[`vapor-${side}-origin`];
      if (!vapor || vapor.opacity < .02) continue;
      assert.ok(a[`vent-${side}`], `${label}: ${side} vapor needs a physical capsule vent.`);
      assert.ok(distance(vapor, a[`vent-${side}`]) <= 1.5,
        `${label}: ${side} vapor detached while scaling or cross-fading.`);
    }
    for (const piece of frame.debris) {
      assert.ok(piece.source && piece.y <= a['ground-reference'].y + 1.5,
        `${label}: a visible independent fragment penetrates the shared ground.`);
    }
    for (const vent of frame.vents) {
      assert.equal(vent.phases.length, 2, `${label}: ${vent.side} vent must cross-fade two independent sprite phases.`);
      assert.equal(new Set(vent.phases.map(phase => phase.source)).size, 2,
        `${label}: dissipation cannot reuse the dense phase image.`);
      assert.ok(Math.abs(vent.phases.reduce((sum, phase) => sum + phase.opacity, 0) - 1) < .001,
        `${label}: the two phases must share one opacity envelope.`);
    }
  }
  if (frame.method === 'ship') {
    assert.equal(frame.flightPods.length, 0, `${label}: ship insertion must retain its hull during orbital descent.`);
    assert.equal(frame.groundPods.length, 0, `${label}: ship insertion must not replace the hull with a capsule on the surface.`);
    assert.equal(frame.vents.length, 0, `${label}: a landed hull must not use capsule vent emitters.`);
    assert.equal(frame.debris.length, 0, `${label}: controlled ship landing must not emit capsule ballistic fragments.`);
    assert.equal(frame.impactMaterial, null, `${label}: controlled ship landing must not reuse a capsule impact sprite.`);
    assert.equal(frame.anchorIds.some(id => /(?:release|trail)-origin$/.test(id)), false,
      `${label}: capsule release and reentry effects must not attach to the ship method.`);
    if (frame.groundShip) {
      assert.equal(frame.groundShip.id, frame.ship);
      assert.equal(frame.groundShip.source, api.shipProfileAssetPath(frame.ship), `${label}: the landed hull must use its real selected source.`);
      assert.ok(a['ship-ground-contact'] && a['ship-ground-reference'], `${label}: ship needs calibrated and final ground anchors.`);
      assert.ok(a['ship-ground-contact'].y <= a['ship-ground-reference'].y + 1.5,
        `${label}: the descending hull contact must not penetrate the ground.`);
    }
    if (frame.contact) {
      assert.ok(frame.groundShip?.contact, `${label}: scene contact requires a real grounded hull.`);
      assert.ok(distance(a['ship-ground-contact'], a['ship-ground-reference']) <= 1.5,
        `${label}: the source-calibrated ship support floats or penetrates its final point.`);
      assert.ok(Math.abs(a['ship-ground-contact'].y - a['ground-reference'].y) <= 1.5,
        `${label}: the hull and hunters must share the same projected floor.`);
      const art = api.carrierArtForShip(frame.ship), rendered = frame.groundShip.image;
      const sourcePoint = point => ({ x: rendered.x + (frame.groundShip.mirrored ? 1 - point.x : point.x) * rendered.width,
        y: rendered.y + point.y * rendered.height });
      assert.ok(distance(a['ship-ground-contact'], sourcePoint(art.groundContact)) <= 1.5,
        `${label}: the contact anchor must coincide with the measured alpha silhouette on the actual rendered image.`);
      assert.ok(distance(a['ship-ground-exit'], sourcePoint(art.groundExit)) <= 1.5,
        `${label}: the exit must stay attached to the same painted hull.`);
    }
  }
  for (const slot of formation) {
    const prefix = slot.id === 'player' ? '' : slot.id + '-';
    const member = frame.members.find(candidate => candidate.id === slot.id);
    if (frame.method === 'pod' && slot.index > 0) {
      const pod = frame.groundPods.find(candidate => candidate.member === slot.id);
      const ownContact = frame.elapsedMs >= api.ARRIVAL_CONTACT_MS + slot.delayMs;
      if (pod?.opacity > .02 && ownContact) {
        assert.ok(distance(a[`${prefix}pod-ground`], a[`${prefix}ground-capsule-reference`]) <= 1.5,
          `${label}: ${slot.id} capsule must land on its own ground reference.`);
        assert.ok(Math.abs(a[`${prefix}pod-ground`].y - a['ground-reference'].y) <= 1.5);
      }
      for (const side of ['left', 'right']) {
        const origin = a[`${prefix}vapor-${side}-origin`];
        if (origin?.opacity > .02) assert.ok(distance(origin, a[`${prefix}vent-${side}`]) <= 1.5,
          `${label}: ${slot.id} vapor must retain its own physical vent.`);
      }
      if (a[`${prefix}door-hinge`]?.opacity > .02) assert.ok(distance(a[`${prefix}door-hinge`], a[`${prefix}door-hinge-reference`]) <= 1.5,
        `${label}: ${slot.id} hatch must stay on its own hinge.`);
    }
    // The original player's capsule checks above remain strict. This extends
    // the same rendered geometry checks to every companion and ship exit.
    if (member.opacity <= .02 || (frame.method === 'pod' && slot.index === 0)) continue;
    const feet = a[`${prefix}hunter-feet`], support = a[`${prefix}hunter-support`];
    const threshold = a[`${prefix}${frame.method === 'ship' ? 'ship-egress-threshold' : 'capsule-threshold'}`];
    assert.ok(frame.contact && feet && support && threshold, `${label}: ${slot.id} needs real support after surface contact.`);
    assert.ok(distance(feet, support) <= 1.5, `${label}: ${slot.id} feet detached from their actual support.`);
    assert.ok(threshold.y <= a['ground-reference'].y + 1.5, `${label}: a disembarkation threshold cannot be below the floor.`);
    if (frame.method === 'ship') assert.ok(distance(threshold, a['ship-ground-exit']) <= 1.5,
      `${label}: ${slot.id} must leave the actual stationary hull exit.`);
    if (member.portal === 'active') {
      assert.notEqual(member.clip.value, 'none');
      assert.equal(member.clip.target, 'clipPath');
      assert.ok(member.clip.parts > 0, `${label}: ${slot.id} needs a real registered egress clip.`);
    } else {
      assert.equal(member.portal, 'clear');
      assert.equal(member.clip.value, 'none');
    }
    if (member.contact === 'threshold') assert.ok(Math.abs(feet.y - threshold.y) <= 1.5,
      `${label}: ${slot.id} must first traverse its actual threshold.`);
    else if (member.contact === 'airborne') {
      assert.equal(member.stage, 'step-down');
      assert.ok(feet.y >= threshold.y - 1.5 && feet.y <= a['ground-reference'].y + 1.5,
        `${label}: ${slot.id} must descend from its threshold to the floor.`);
    } else {
      assert.equal(member.contact, 'ground');
      assert.ok(['walking', 'standing'].includes(member.stage));
      assert.ok(Math.abs(feet.y - a['ground-reference'].y) <= 1.5,
        `${label}: ${slot.id} must plant its feet on the actual shared floor.`);
    }
  }
  if (!frame.contact || frame.reducedMotion) assert.equal(frame.debris.length, 0,
    `${label}: ballistic debris must not precede impact or override reduced motion.`);
}

async function capture(label, target = page, options = {}) {
  const decodedSvg = options.decodedSvg ?? await decodeSceneImages(target);
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

// Ordinary photographs keep their existing native CDP clip. The narrow final
// trio interval uses one full-viewport XGetImage on the verified software X11
// backend. A new opaque paint nonce is written outside the component after all
// before reads. Its presence in the same private full image proves freshness,
// not a pose timestamp. The unchanged after/geometry gates remain mandatory.
// Raw transfer, hashing, PNG encoding and lossless integer cropping all follow
// those observations. No source ROI override or padding search remains: paused
// calibration compares every full-viewport pixel against native CDP, separately
// for each triad/viewport, while retaining the original lower-scene target.
const momentCaptureSessions = new WeakMap();
const validatedCaptureProfiles = new WeakSet();
const usedPaintNonces = new Set();
const usedPaintPatterns = new Set();

function freezeCaptureData(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) freezeCaptureData(item);
    Object.freeze(value);
  }
  return value;
}

function x11PaintPattern(viewport) {
  const nonce = randomBytes(12).toString('hex');
  assert.ok(!usedPaintNonces.has(nonce)); usedPaintNonces.add(nonce);
  const corners = [['tl', 0, 0], ['tr', viewport.width - 4, 0],
    ['bl', 0, viewport.height - 8], ['br', viewport.width - 4, viewport.height - 8]];
  const markers = corners.map(([id, x, y], index) => {
    const signature = [[235, 17, 83], [23, 241, 67], [37, 59, 239], [251, 197, 19],
      [31 + index * 41, 221 - index * 31, 101 + index * 23], [211, 43, 167], [71, 181, 233], [149, 227, 53]];
    const payload = [...nonce].map(hex => {
      const digit = Number.parseInt(hex, 16);
      return [7 + digit * 16, 255 - digit * 13, 41 + digit * 11];
    });
    const rgb = [...signature, ...payload].flat();
    const encoded = JSON.stringify(rgb);
    assert.ok(!usedPaintPatterns.has(encoded), 'Every actual marker paint pattern must be new, not only its nonce label.');
    usedPaintPatterns.add(encoded);
    return { id, x, y, width: 4, height: 8, rgb };
  });
  return freezeCaptureData({ nonce, markers });
}

async function installX11PaintMarkers(target, pattern) {
  return target.evaluate(({ nonce, markers }) => {
    const root = document.querySelector('[data-arrival-run]');
    if (!root || document.querySelectorAll('[data-arrival-run]').length !== 1) throw new Error('Paint markers require one native arrival root.');
    if (document.visibilityState !== 'visible' || window.top !== window || root.querySelector('iframe,video,canvas,object,embed')) {
      throw new Error('X11 proof requires the visible single document arrival without independent surfaces.');
    }
    const bounds = root.getBoundingClientRect();
    for (const old of document.querySelectorAll('[data-spatial-x11-marker]')) old.remove();
    for (const marker of markers) {
      if (!Number.isInteger(marker.x) || !Number.isInteger(marker.y) || marker.x < 0 || marker.y < 0 ||
          marker.x + marker.width > innerWidth || marker.y + marker.height > innerHeight ||
          !(marker.x + marker.width <= bounds.left || marker.x >= bounds.right ||
            marker.y + marker.height <= bounds.top || marker.y >= bounds.bottom)) {
        throw new Error('Every opaque QA paint marker must fit entirely in native padding outside the arrival component.');
      }
      const element = document.createElement('div');
      element.setAttribute('data-spatial-x11-marker', marker.id);
      element.setAttribute('data-spatial-x11-nonce', nonce);
      element.setAttribute('aria-hidden', 'true');
      element.style.cssText = `all:initial;position:fixed;left:${marker.x}px;top:${marker.y}px;width:4px;height:8px;display:block;opacity:1;transform:none;filter:none;z-index:2147483647;pointer-events:none;overflow:hidden;contain:strict;`;
      for (let pixel = 0; pixel < 32; pixel += 1) {
        const cell = document.createElement('span');
        cell.style.cssText = `all:initial;position:absolute;left:${pixel % 4}px;top:${Math.floor(pixel / 4)}px;width:1px;height:1px;display:block;opacity:1;transform:none;filter:none;background:rgb(${marker.rgb.slice(pixel * 3, pixel * 3 + 3).join(',')});`;
        element.appendChild(cell);
      }
      document.body.appendChild(element);
    }
    return { nonce, visibilityState: document.visibilityState, markerCount: markers.length };
  }, pattern);
}

function assertX11Markers(moment, pattern, viewport, label) {
  assert.equal(moment.paintMarkers?.visibilityState, 'visible', `${label}: the native document must be visible.`);
  assert.equal(moment.paintMarkers?.independentSurfaces, 0, `${label}: no independent surface may replace part of the arrival.`);
  assert.equal(moment.paintMarkers?.topLevel, true);
  assert.equal(moment.paintMarkers?.markers.length, 4);
  for (const expected of pattern.markers) {
    const marker = moment.paintMarkers.markers.find(item => item.id === expected.id);
    assert.ok(marker);
    assert.deepEqual({ x: marker.x, y: marker.y, right: marker.right, bottom: marker.bottom },
      { x: expected.x, y: expected.y, right: expected.x + 4, bottom: expected.y + 8 });
    assert.equal(marker.position, 'fixed'); assert.equal(marker.opacity, '1');
    assert.equal(marker.cells, 32);
    const bounds = moment.captureLayout.root;
    assert.ok(marker.right <= bounds.x || marker.x >= bounds.right || marker.bottom <= bounds.y || marker.y >= bounds.bottom,
      `${label}: QA markers must never cover component pixels.`);
    assert.ok(marker.x >= 0 && marker.y >= 0 && marker.right <= viewport.width && marker.bottom <= viewport.height);
  }
}

async function startX11Capture() {
  assert.equal(headed, true, 'Native X11 evidence requires the actual headed Xvfb window.');
  const session = await browser.newBrowserCDPSession();
  const systemInfo = await session.send('SystemInfo.getInfo');
  const processInfo = await session.send('SystemInfo.getProcessInfo');
  const browserVersion = await session.send('Browser.getVersion');
  const browserPid = processInfo.processInfo.find(item => item.type === 'browser')?.id;
  report.nativeCapture = { backend: 'x11-xgetimage-software-no-xshm', requestedFlags: x11LaunchArgs,
    browserVersion, systemInfo, processInfo, browserPid, browserGuards: { passed: false }, windowPreparations: [],
    mutation: 'Four opaque 4x8 QA paint markers in harness padding, outside the arrival component; final nonce painted synchronously after all before reads.' };
  assert.equal(systemInfo.gpu.featureStatus.gpu_compositing, 'disabled_software');
  for (const flag of x11LaunchArgs) assert.ok(systemInfo.commandLine.split(/\s+/).includes(flag), `The native browser command must include ${flag}.`);
  assert.ok(!systemInfo.commandLine.split(/\s+/).some(flag => flag.startsWith('--headless')));
  assert.equal(browserVersion.product, 'Chrome/153.0.8010.12', 'The X11 source proof is pinned to this Chromium binary.');
  assert.equal(browserVersion.revision, '@971a7443b0c9b0a9b2860529b33331b76077ec62');
  assert.ok(Number.isSafeInteger(browserPid) && browserPid > 0);
  report.nativeCapture.browserGuards.passed = true;
  const child = spawn('python3', ['-u', path.join(root, 'scripts/qa-planet-arrival-x11.py')], {
    cwd: root, env: process.env, stdio: ['pipe', 'pipe', 'pipe'],
  });
  let nextId = 0, buffer = '', stderr = '', ended = false, queue = Promise.resolve();
  const pending = new Map();
  const rejectPending = error => { for (const item of pending.values()) { clearTimeout(item.timer); item.reject(error); } pending.clear(); };
  child.stdout.on('data', data => {
    buffer += data.toString('utf8');
    for (let index; (index = buffer.indexOf('\n')) >= 0;) {
      const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line), item = pending.get(message.id);
        if (!item) throw new Error('X11 helper returned an unknown response id.');
        pending.delete(message.id); clearTimeout(item.timer);
        if (message.ok) item.resolve(message.result);
        else { const error = new Error(message.error?.message ?? 'X11 helper rejected the request.'); error.x11Result = message.result; item.reject(error); }
      } catch (error) { rejectPending(error); }
    }
  });
  child.stderr.on('data', data => { stderr = (stderr + data.toString('utf8')).slice(-32_768); });
  child.on('error', rejectPending);
  child.on('exit', (code, signal) => {
    ended = true; report.nativeCapture.helperExit = { code, signal };
  });
  // exit may precede the last stdout bytes. Only close guarantees that stdio
  // has drained, so a successfully printed final JSON response remains valid.
  child.on('close', (code, signal) => {
    ended = true; rejectPending(new Error(`X11 helper closed (${code}, ${signal}). ${stderr}`));
  });
  const request = (op, params = {}, timeoutMs = 20_000) => {
    const send = () => new Promise((resolve, reject) => {
      if (ended) { reject(new Error('X11 helper is not running.')); return; }
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`X11 ${op} response timed out.`)); }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      child.stdin.write(JSON.stringify({ id, op, ...params }) + '\n', error => {
        if (error) { clearTimeout(timer); pending.delete(id); reject(error); }
      });
    });
    const result = queue.then(send, send); queue = result.catch(() => {}); return result;
  };
  const client = { request, browserPid, close: async () => {
    try {
      if (!ended) {
        report.nativeCapture.helperClose = await request('close', {}, 5000);
        assert.deepEqual(report.nativeCapture.helperClose.unexportedTokens, [], 'Every acquired native frame must be preserved before helper shutdown.');
        assert.deepEqual(report.nativeCapture.helperClose.recoveryFailures, [], 'Native orphan recovery must not fail.');
        assert.deepEqual(report.nativeCapture.helperClose.recoveredOrphans, [], 'A successful recipe must explicitly account for every acquired frame before shutdown.');
      }
    }
    finally { report.nativeCapture.helperStderr = stderr; if (!ended) child.kill('SIGTERM'); }
  } };
  x11Client = client;
  report.nativeCapture.helperSetup = await request('setup', { outputDir: out, browserPid, timeoutMs: 10_000 });
  assert.equal(report.nativeCapture.helperSetup.guards?.passed, true);
  return client;
}

function assertX11CaptureAck(ack, prepared, captureId, requireFresh) {
  assert.ok(ack?.token);
  assert.equal(ack.captureId, captureId);
  assert.equal(ack.calibrationId, prepared.captureProfile.x11Calibration.calibrationId);
  assert.equal(ack.nonce, prepared.capturePaintPattern.nonce);
  assert.equal(ack.nonceMatched, true, 'The unique full native copy must contain every expected nonce pixel.');
  assert.equal(ack.rejected, false, 'A timeout or invalid native frame cannot become accepted evidence.');
  assert.equal(ack.geometryGuard?.passed, true);
  if (requireFresh) assert.equal(ack.freshSinceCalibration, true, 'A final photograph requires new paint after its before observation.');
  assert.deepEqual(ack.origin, prepared.captureProfile.x11Calibration.origin);
  for (const key of ['depth', 'bitsPerPixel', 'byteOrder', 'byteOrderCode', 'redMask', 'greenMask', 'blueMask', 'format']) {
    assert.equal(ack.format[key], prepared.captureProfile.x11Calibration.format[key], `Native pixel format changed: ${key}.`);
  }
  assert.equal(ack.width, prepared.sourceRoi.width); assert.equal(ack.height, prepared.sourceRoi.height);
  assert.equal(ack.format.width, ack.width); assert.equal(ack.format.height, ack.height);
  assert.ok(ack.format.bytesPerLine >= ack.width * 4 && ack.format.bytesPerLine % 4 === 0);
}

async function exportX11Source(ack, basename, prepared, preserve = () => {}) {
  assert.ok(ack?.token, 'Every acquired native frame needs a retained private buffer token.');
  const exported = await x11Client.request('export', { token: ack.token, basename });
  const files = {};
  for (const role of ['raw', 'png', 'metadata']) {
    const item = exported[role];
    assert.ok(item && path.resolve(item.path).startsWith(out + path.sep));
    files[role] = { file: path.relative(out, item.path), bytes: item.bytes, sha256: item.sha256 };
  }
  const sourceCapture = { ...files.png, width: prepared.sourceRoi.width, height: prepared.sourceRoi.height,
    kind: 'native-x11-full-viewport-png', backend: 'x11-xgetimage-software-no-xshm',
    sourceRoi: prepared.sourceRoi, roi: prepared.sourceRoi, targetRoi: prepared.targetRoi,
    cssViewport: { width: prepared.captureProfile.viewport.width, height: prepared.captureProfile.viewport.height },
    profileId: prepared.captureProfile.id, calibrationId: ack.calibrationId,
    preparation: prepared.roiPreparation, captureAck: ack, raw: files.raw, metadata: files.metadata,
    rgbaSha256: exported.rgbaSha256, nativePixelEquality: exported.pixelEquality, nativeFormat: exported.nativeFormat,
    alphaPolicy: exported.alphaPolicy, exportTiming: exported.timings };
  // Files have been written by the helper. Retain their identities before any
  // subsequent hash, decode or crop assertion can reject this native source.
  preserve(sourceCapture);
  for (const role of ['raw', 'png', 'metadata']) {
    const item = exported[role];
    const bytes = await fs.readFile(item.path);
    assert.equal(bytes.length, item.bytes); assert.equal(sha256(bytes), item.sha256);
  }
  const bytes = await fs.readFile(path.join(out, files.png.file));
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, 'png');
  assert.equal(metadata.width, prepared.sourceRoi.width);
  assert.equal(metadata.height, prepared.sourceRoi.height);
  const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(decoded.info.width, prepared.sourceRoi.width); assert.equal(decoded.info.height, prepared.sourceRoi.height);
  assert.equal(decoded.info.channels, 4); assert.equal(sha256(decoded.data), exported.rgbaSha256);
  assert.equal(exported.pixelEquality?.matched, true);
  assert.equal(exported.pixelEquality?.rgbaBytes, decoded.data.length);
  assert.equal(exported.pixelEquality?.rgbaSha256, exported.rgbaSha256);
  assert.equal(exported.pixelEquality?.pngDecodedRgbaSha256, exported.rgbaSha256);
  assert.deepEqual(exported.nativeFormat, ack.format);
  return { bytes, sourceCapture };
}

async function retainX11CalibrationFailure(calibration, error) {
  const diagnostic = error.x11Result?.calibrationFailure;
  if (!diagnostic) return;
  // The helper retained its last existing root copy. Keep the exact receipt
  // before re-reading files; this diagnostic can never qualify a profile.
  calibration.calibrationFailure = diagnostic;
  const verification = { clock: 'Node performance.now()', startedAtMs: performance.now(),
    scope: 'Post-error verification of diagnostic files only; no image acquisition or profile selection.',
    files: [], errors: [], passed: false };
  calibration.calibrationFailureVerification = verification;
  for (const role of ['raw', 'png', 'metadata']) {
    const item = diagnostic.files?.[role];
    const result = { role, available: !!item };
    verification.files.push(result);
    if (!item) {
      if (role !== 'png') verification.errors.push({ role, message: 'Required diagnostic file was not preserved.' });
      continue;
    }
    try {
      assert.ok(typeof item.path === 'string' && path.resolve(item.path).startsWith(out + path.sep));
      result.file = path.relative(out, item.path);
      assert.equal(result.file, item.file);
      const bytes = await fs.readFile(item.path);
      result.bytes = bytes.length; result.sha256 = sha256(bytes);
      assert.equal(result.bytes, item.bytes); assert.equal(result.sha256, item.sha256);
      result.matched = true;
    } catch (verificationError) {
      result.matched = false;
      verification.errors.push({ role, message: verificationError.message });
    }
  }
  verification.finishedAtMs = performance.now();
  verification.passed = verification.errors.length === 0;
}

async function momentSessions(target) {
  if (!momentCaptureSessions.has(target)) {
    const metricsSession = await target.context().newCDPSession(target);
    const captureSession = await target.context().newCDPSession(target);
    momentCaptureSessions.set(target, { metricsSession, captureSession, baseline: null });
  }
  return momentCaptureSessions.get(target);
}

async function syncMomentViewport(target) {
  const sessions = await momentSessions(target);
  const viewport = target.viewportSize();
  assert.ok(viewport?.width > 0 && viewport.height > 0);
  // Match the locked Playwright 1.63.0 non-mobile context exactly. Keep this
  // session attached until context.close(); clear/detach could undo Playwright.
  sessions.baseline = { width: viewport.width, height: viewport.height,
    screenWidth: viewport.width, screenHeight: viewport.height, deviceScaleFactor: 1,
    mobile: false, screenOrientation: { angle: 0, type: 'landscapePrimary' }, dontSetVisibleSize: false };
  const physicalScreen = report.nativeCapture.helperSetup.screen;
  assert.deepEqual({ index: physicalScreen.index, width: physicalScreen.width,
    height: physicalScreen.height, depth: physicalScreen.depth }, { index: 0, width: 1920, height: 1200, depth: 24 });
  const preparation = { id: `window-preparation-${report.nativeCapture.windowPreparations.length + 1}`,
    clock: 'Node performance.now()', startedAtMs: performance.now(), passed: false,
    cssViewport: { ...viewport }, baseline: { ...sessions.baseline }, physicalScreen,
    idMeaning: 'cdpWindowId is a Chrome protocol window id, not an X11 drawable id.',
    purpose: 'Explicit native window space before calibration; not a demonstrated cause of any previous calibration failure.',
    observations: [] };
  report.nativeCapture.windowPreparations.push(preparation);
  // Playwright's Linux window insets are an estimate. Prepare actual native
  // space independently of CSS emulation, outside all final capture brackets.
  const send = async (operation, params = {}) => {
    const observation = { operation, params, startedAtMs: performance.now() };
    preparation.observations.push(observation);
    try {
      observation.result = await sessions.metricsSession.send(operation, params);
      return observation.result;
    } catch (error) { observation.error = error.message; throw error; }
    finally { observation.finishedAtMs = performance.now(); }
  };
  try {
    const located = await send('Browser.getWindowForTarget');
    preparation.cdpWindowId = located.windowId;
    assert.ok(Number.isSafeInteger(preparation.cdpWindowId) && preparation.cdpWindowId > 0);
    const windowId = preparation.cdpWindowId;
    preparation.boundsBefore = (await send('Browser.getWindowBounds', { windowId })).bounds;
    if (preparation.boundsBefore.windowState !== 'normal') {
      // Chromium restores instead of setting bounds in this branch. Send the
      // restore separately, then issue the geometry request below.
      await send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
      preparation.boundsAfterRestore = (await send('Browser.getWindowBounds', { windowId })).bounds;
      assert.equal(preparation.boundsAfterRestore.windowState, 'normal');
    }
    // Chromium 153 X11Window::AdjustSizeForDisplay subtracts one pixel from
    // each dimension when the requested size exactly equals an entire screen.
    preparation.requestedBounds = { left: 0, top: 0, width: 1919,
      height: 1199, windowState: 'normal' };
    await send('Browser.setWindowBounds', { windowId, bounds: preparation.requestedBounds });
    await send('Emulation.setDeviceMetricsOverride', sessions.baseline);
    preparation.boundsAfter = (await send('Browser.getWindowBounds', { windowId })).bounds;
    const actual = preparation.boundsAfter;
    assert.deepEqual({ left: actual.left, top: actual.top, width: actual.width,
      height: actual.height, windowState: actual.windowState }, preparation.requestedBounds,
    'The prepared native Chrome window must exactly match the fixed interior bounds, independently of CSS viewport metrics.');
    preparation.finishedAtMs = performance.now(); preparation.passed = true;
    sessions.windowPreparation = freezeCaptureData(preparation);
    return sessions;
  } catch (error) {
    preparation.finishedAtMs = performance.now(); preparation.error = error.message;
    throw error;
  }
}

function captureLayout(moment) {
  return { viewport: moment.captureViewport, layout: moment.captureLayout };
}

function assertCaptureLayout(moment, expected, viewport, label) {
  assert.deepEqual(captureLayout(moment), expected, `${label}: prepared capture must preserve the native CSS viewport and scene boxes.`);
  assert.equal(moment.captureViewport.innerWidth, viewport.width);
  assert.equal(moment.captureViewport.innerHeight, viewport.height);
  assert.equal(moment.captureViewport.devicePixelRatio, 1);
  assert.equal(moment.captureViewport.screen.width, viewport.width);
  assert.equal(moment.captureViewport.screen.height, viewport.height);
  assert.equal(moment.captureViewport.screen.orientation.angle, 0);
  assert.equal(moment.captureViewport.screen.orientation.type, 'landscape-primary');
  assert.equal(moment.captureViewport.visualViewport.scale, 1);
  assert.equal(moment.captureViewport.visualViewport.width, viewport.width);
  assert.equal(moment.captureViewport.visualViewport.height, viewport.height);
  assert.equal(moment.captureViewport.scrollX, 0);
  assert.equal(moment.captureViewport.scrollY, 0);
  assert.equal(moment.captureViewport.visualViewport.offsetLeft, 0);
  assert.equal(moment.captureViewport.visualViewport.offsetTop, 0);
  assert.equal(moment.captureViewport.visualViewport.pageLeft, 0);
  assert.equal(moment.captureViewport.visualViewport.pageTop, 0);
}

async function readMoment(target, region, schedule, paint) {
  return target.evaluate(({ region, schedule, paint }) => {
    const evaluationStartedAtMs = performance.now();
    const nativeCapture = region === 'formation-detail' || region === 'optical-full-viewport';
    const threshold = schedule?.atMs;
    const roots = document.querySelectorAll('[data-arrival-run]');
    if (roots.length !== 1) throw new Error('A native moment observation requires exactly one arrival root.');
    const root = roots[0];
    const readElapsedMs = () => Number(root.getAttribute('data-arrival-elapsed-exact') ?? root.getAttribute('data-arrival-elapsed'));
    const initialRun = root.getAttribute('data-arrival-run');
    const armedAt = readElapsedMs();
    const read = () => {
      const readStartedAtMs = performance.now();
      let boxReads = 0;
      const current = document.querySelectorAll('[data-arrival-run]');
      if (current.length !== 1 || current[0] !== root || root.getAttribute('data-arrival-run') !== initialRun) {
        throw new Error('The native arrival root or run changed during a moment observation.');
      }
      if (schedule && root.getAttribute('data-arrival-shot') !== schedule.shot) {
        throw new Error('The native moment observation reached a different shot than requested.');
      }
      const rect = element => {
        boxReads += 1;
        const bounds = element.getBoundingClientRect();
        return { x: bounds.x, y: bounds.y, right: bounds.right, bottom: bounds.bottom };
      };
      const union = bounds => ({
        x: Math.min(...bounds.map(item => item.x)), y: Math.min(...bounds.map(item => item.y)),
        right: Math.max(...bounds.map(item => item.right)), bottom: Math.max(...bounds.map(item => item.bottom)),
      });
      const members = [...root.querySelectorAll('[data-arrival-hunter]')].map(member => {
        // Rigs deliberately overflow their parent. Include the actual transformed
        // layer boxes, not only the nominal 2:3 canvas; transparent padding may
        // enlarge this conservative envelope but cannot crop a visible weapon.
        const layers = region === 'formation-detail'
          ? [...new Set([member, ...member.children, ...member.querySelectorAll('img, svg, image')])]
            .map(rect).filter(bounds => bounds.right > bounds.x && bounds.bottom > bounds.y) : [];
        return {
          id: member.getAttribute('data-arrival-member'), stage: member.getAttribute('data-arrival-hunter-stage'),
          contact: member.getAttribute('data-arrival-hunter-contact'),
          ...(region === 'formation-detail' ? {
            portal: member.getAttribute('data-arrival-hunter-portal'), opacity: Number(getComputedStyle(member).opacity),
            bounds: union(layers), coveredLayers: layers.length,
          } : {}),
        };
      });
      const supports = region === 'formation-detail'
        ? [...root.querySelectorAll('[data-arrival-anchor$="hunter-feet"], [data-arrival-anchor$="hunter-support"]')]
          .map(element => ({ id: element.getAttribute('data-arrival-anchor'), ...rect(element) })) : [];
      const moment = {
        run: root.getAttribute('data-arrival-run'), armedAt,
        elapsedMs: readElapsedMs(),
        shot: root.getAttribute('data-arrival-shot'), status: root.getAttribute('data-arrival-status'),
        method: root.getAttribute('data-arrival-method'), team: root.getAttribute('data-arrival-team'),
        shipCloak: root.getAttribute('data-arrival-ship-cloak') === 'true',
        ship: root.querySelector('[data-arrival-scene]')?.getAttribute('data-arrival-ship'),
        cloakPhase: root.querySelector('[data-arrival-scene]')?.getAttribute('data-arrival-cloak-phase'),
        contact: root.querySelector('[data-arrival-scene]')?.getAttribute('data-arrival-contact') === 'true',
        cloakHulls: [...root.querySelectorAll('[data-arrival-cloak-strength]')].map(hull => ({
          strength: Number(hull.getAttribute('data-arrival-cloak-strength')),
          bodyOpacity: hull.querySelector('[data-arrival-cloak-body]')
            ? Number(getComputedStyle(hull.querySelector('[data-arrival-cloak-body]')).opacity) : null,
          lens: !!hull.querySelector('[data-arrival-cloak-refraction]'), rim: !!hull.querySelector('[data-arrival-cloak-rim]'),
        })),
        members, ...(region === 'formation-detail' ? { supports } : {}),
        ...(nativeCapture ? {
          captureViewport: {
            innerWidth, innerHeight, devicePixelRatio, scrollX, scrollY,
            documentElement: { clientWidth: document.documentElement.clientWidth,
              clientHeight: document.documentElement.clientHeight },
            screen: { width: screen.width, height: screen.height,
              orientation: { angle: screen.orientation.angle, type: screen.orientation.type } },
            visualViewport: { offsetLeft: visualViewport.offsetLeft, offsetTop: visualViewport.offsetTop,
              pageLeft: visualViewport.pageLeft, pageTop: visualViewport.pageTop,
              width: visualViewport.width, height: visualViewport.height, scale: visualViewport.scale },
          },
          captureLayout: { root: rect(root), scene: rect(root.querySelector('[data-arrival-scene]')),
            stage: rect(root.querySelector('[data-arrival-stage]')) },
          focus: { document: document.hasFocus(), tag: document.activeElement?.tagName,
            id: document.activeElement?.id, ariaLabel: document.activeElement?.getAttribute('aria-label'),
            text: document.activeElement?.textContent.trim(), withinArrival: root.contains(document.activeElement) },
          paintMarkers: { visibilityState: document.visibilityState, topLevel: window.top === window,
            independentSurfaces: root.querySelectorAll('iframe,video,canvas,object,embed').length,
            markers: [...document.querySelectorAll('[data-spatial-x11-marker]')].map(element => ({
              id: element.getAttribute('data-spatial-x11-marker'), nonce: element.getAttribute('data-spatial-x11-nonce'),
              ...rect(element), position: getComputedStyle(element).position, opacity: getComputedStyle(element).opacity,
              cells: element.children.length,
            })) },
        } : {}),
      };
      // All native before reads are complete. Mutate real opaque paint in the
      // same document synchronously, never a compositor-only transform. The
      // helper must find this exact fresh pattern in its one full private copy.
      if (paint) {
        if (!nativeCapture || document.visibilityState !== 'visible' || window.top !== window ||
            root.querySelector('iframe,video,canvas,object,embed')) throw new Error('Fresh native paint requires the visible single arrival document.');
        for (const marker of paint.markers) {
          const element = document.querySelector(`[data-spatial-x11-marker="${marker.id}"]`);
          if (!element || element.children.length !== 32 || element.getAttribute('data-spatial-x11-nonce') === paint.nonce) {
            throw new Error('The final paint marker is missing or its nonce was already used.');
          }
          for (let pixel = 0; pixel < 32; pixel += 1) {
            element.children[pixel].style.backgroundColor = `rgb(${marker.rgb.slice(pixel * 3, pixel * 3 + 3).join(',')})`;
          }
          element.setAttribute('data-spatial-x11-nonce', paint.nonce);
        }
        moment.markerPaint = { nonce: paint.nonce, count: paint.markers.length, paintedAtMs: performance.now() };
      }
      const finishedAtMs = performance.now();
      moment.observationTiming = { clock: 'browser performance.now()', evaluationStartedAtMs, readStartedAtMs,
        finishedAtMs, scheduledWaitMs: readStartedAtMs - evaluationStartedAtMs,
        readMs: finishedAtMs - readStartedAtMs, totalMs: finishedAtMs - evaluationStartedAtMs, boxReads };
      return moment;
    };
    if (!Number.isFinite(threshold)) return read();
    // Arm before the final interval. Observe the actual React commit locally,
    // rather than returning waitElapsed to Node and resolving another locator
    // after the 250 ms standing interval has already begun. This observer only
    // reads the scene; it neither advances nor pauses its native clock.
    return new Promise((resolve, reject) => {
      const observer = new MutationObserver(inspect);
      const timer = setTimeout(() => {
        observer.disconnect(); reject(new Error('The native final formation was not observed within 25 seconds.'));
      }, 25_000);
      function inspect() {
        const status = root.getAttribute('data-arrival-status');
        const members = [...root.querySelectorAll('[data-arrival-hunter]')];
        const standing = region !== 'formation-detail' || members.length === 3 && members.every(member =>
          member.getAttribute('data-arrival-hunter-stage') === 'standing' && member.getAttribute('data-arrival-hunter-contact') === 'ground');
        if (!root.isConnected || status !== 'playing' || root.getAttribute('data-arrival-shot') !== schedule.shot ||
          readElapsedMs() >= threshold && standing) {
          observer.disconnect(); clearTimeout(timer);
          if (!root.isConnected) { reject(new Error('Arrival unmounted while awaiting its native final formation.')); return; }
          try { resolve(read()); } catch (error) { reject(error); }
        }
      }
      observer.observe(root, { attributes: true, subtree: true,
        attributeFilter: ['data-arrival-elapsed-exact', 'data-arrival-elapsed', 'data-arrival-status', 'data-arrival-hunter-stage', 'data-arrival-hunter-contact'] });
      inspect();
    });
  }, { region, schedule, paint });
}

async function losslessNativeDetailCrop(sourceBytes, clip, viewport) {
  const startedAtMs = performance.now();
  const source = await sharp(sourceBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const decodedAtMs = performance.now();
  assert.equal(source.info.channels, 4, 'The native source must decode to RGBA.');
  assert.equal(source.info.width, viewport.width, 'The native viewport must retain the existing one-to-one CSS pixel scale.');
  assert.equal(source.info.height, viewport.height, 'The native viewport must retain the existing one-to-one CSS pixel scale.');
  assert.equal(source.data.length, source.info.width * source.info.height * 4);
  assert.equal(clip.scale, 1);
  assert.ok([clip.x, clip.y, clip.width, clip.height].every(Number.isInteger), 'A lossless detail uses integer source pixels.');
  assert.ok(clip.x >= 0 && clip.y >= 0 && clip.width > 0 && clip.height > 0 &&
    clip.x + clip.width <= source.info.width && clip.y + clip.height <= source.info.height,
  'The complete detail rectangle must lie inside the preserved native source.');
  const rowBytes = clip.width * 4;
  const rgba = Buffer.allocUnsafe(rowBytes * clip.height);
  for (let row = 0; row < clip.height; row += 1) {
    const sourceStart = ((clip.y + row) * source.info.width + clip.x) * 4;
    source.data.copy(rgba, row * rowBytes, sourceStart, sourceStart + rowBytes);
  }
  const copiedAtMs = performance.now();
  const bytes = await sharp(rgba, { raw: { width: clip.width, height: clip.height, channels: 4 } })
    .png({ palette: false }).toBuffer();
  const encodedAtMs = performance.now();
  const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(decoded.info.width, clip.width); assert.equal(decoded.info.height, clip.height);
  assert.equal(decoded.info.channels, 4);
  assert.ok(decoded.data.equals(rgba), 'The encoded detail must preserve every RGBA byte copied from its native source.');
  const finishedAtMs = performance.now();
  return { bytes, pixelEquality: { matched: true, channels: 4, comparedBytes: rgba.length,
    sourceRegionRgbaSha256: sha256(rgba), decodedCropRgbaSha256: sha256(decoded.data) },
  processingTiming: { clock: 'Node performance.now()', startedAtMs, decodedAtMs, copiedAtMs, encodedAtMs, finishedAtMs,
    sourceDecodeMs: decodedAtMs - startedAtMs, rgbaCopyAndChecksMs: copiedAtMs - decodedAtMs,
    pngEncodeMs: encodedAtMs - copiedAtMs, pngDecodeAndCompareMs: finishedAtMs - encodedAtMs,
    totalMs: finishedAtMs - startedAtMs } };
}

async function captureMoment(label, prepared, target = page, attempt = 1, validateFrame, schedule) {
  return capturePreparedMoment(label, prepared, target, attempt, validateFrame, schedule);
}

async function capturePreparedMoment(label, prepared, target = page, attempt = 1, validateFrame, schedule) {
  const opticalFullViewport = prepared.region === 'optical-full-viewport';
  const nativeCapture = prepared.region === 'formation-detail' || opticalFullViewport;
  const acquisition = { label, attempt, region: prepared.region, schedule: schedule ?? null, before: null,
    timings: { clock: 'Node performance.now(); origin differs from browser performance.now()',
      startedAtMs: performance.now(), stages: {} } };
  const startStage = name => {
    acquisition.timings.stages[name] = { startedAtMs: performance.now() };
    acquisition.timings.activeStage = name;
  };
  const finishStage = name => {
    const stage = acquisition.timings.stages[name];
    stage.finishedAtMs = performance.now(); stage.durationMs = stage.finishedAtMs - stage.startedAtMs;
    acquisition.timings.activeStage = null;
  };
  const finishAcquisition = () => {
    acquisition.timings.finishedAtMs = performance.now();
    acquisition.timings.totalMs = acquisition.timings.finishedAtMs - acquisition.timings.startedAtMs;
    // The native PNG and all clock/geometry observations are already complete.
    // Log existing measurements now; never add I/O inside their critical window.
    console.log('QA_CAPTURE_TIMING ' + JSON.stringify({ sourceCommit, label, attempt, accepted: acquisition.accepted ?? false,
      elapsedBefore: acquisition.before?.elapsedMs ?? null, elapsedAfter: acquisition.after?.elapsedMs ?? null,
      afterStatus: acquisition.after?.status ?? null, measuredAt: acquisition.measuredAt ?? null,
      captureMode: acquisition.captureMode, fromSurface: acquisition.fromSurface,
      sourceCapture: acquisition.sourceCapture ?? null,
      nodeStageMs: Object.fromEntries(Object.entries(acquisition.timings.stages).map(([name, stage]) => [name, stage.durationMs ?? null])),
      browserBefore: acquisition.before?.observationTiming ?? null, browserAfter: acquisition.after?.observationTiming ?? null,
      browserGeometry: acquisition.geometryObservationTiming ?? null, rejection: acquisition.rejection ?? null }));
  };
  const preserveNativeSource = async file => {
    startStage('nativeRawExportAndPng');
    acquisition.nativeExport = { basename: file.replace(/\.png$/, ''), token: acquisition.captureAck?.token, status: 'requested' };
    try {
      const result = await exportX11Source(acquisition.captureAck, acquisition.nativeExport.basename, prepared,
        source => { acquisition.sourceCapture = source; });
      acquisition.nativeExport.status = 'verified';
      return result.bytes;
    } catch (error) {
      acquisition.nativeExport.status = 'failed'; acquisition.nativeExport.error = error.message;
      if (error.x11Result) acquisition.nativeExport.partial = error.x11Result;
      throw error;
    } finally { finishStage('nativeRawExportAndPng'); }
  };
  report.captureAttempts.push(acquisition);
  startStage('beforeObservationRpc');
  let before;
  try { before = await readMoment(target, prepared.region, schedule,
    nativeCapture ? prepared.capturePaintPattern : undefined); }
  finally { finishStage('beforeObservationRpc'); }
  acquisition.before = before;
  startStage('validationAndClip');
  assert.equal(before.status, 'playing', `${label}: a visual evidence capture must precede the terminal overlay.`);
  let { x, y, width, height } = prepared.scene;
  const contextFile = prepared.region === 'formation-detail' ? label.replace(/-egress-final-detail$/, '-egress-walking.png') : null;
  assert.ok(x >= 0 && y >= 0 && x + width <= target.viewportSize().width + 1 &&
    y + height <= target.viewportSize().height + 1, `${label}: the unmodified scene must fit the screenshot viewport.`);
  if (nativeCapture) {
    assertCaptureLayout(before, prepared.layout, target.viewportSize(), label);
    assertCaptureProfile(before, prepared.captureProfile, target.viewportSize(), label);
    assertX11Markers(before, prepared.capturePaintPattern, target.viewportSize(), label);
    assert.equal(before.markerPaint?.nonce, prepared.capturePaintPattern.nonce);
    assert.equal(before.markerPaint?.count, 4);
    assert.equal(prepared.captureProfile.kind, 'validated', `${label}: final photographs cannot search or select source profiles.`);
    assert.strictEqual(prepared.targetRoi, prepared.captureProfile.targetRoi);
    assert.strictEqual(prepared.sourceRoi, prepared.captureProfile.sourceRoi);
    assert.strictEqual(prepared.windowPreparation, prepared.sessions.windowPreparation,
      `${label}: native window preparation cannot change after the final source was prepared.`);
    assert.ok(prepared.roiPreparation.elapsedAfter < schedule.atMs,
      `${label}: the output ROI must be fully prepared before the unchanged final capture threshold.`);
  }
  if (prepared.region === 'formation-detail') {
    assert.equal(typeof validateFrame, 'function', `${label}: every final attempt needs the original formation and grounded-hull checks.`);
    assert.ok(report.captures.some(capture => capture.file === contextFile && capture.region === 'scene'),
      `${label}: a separate full-scene walking photograph must provide the actual formation context.`);
    assert.deepEqual(before.members.map(member => member.id), ['player', 'karhek', 'saketh'],
      `${label}: the detail must include the complete real trio.`);
    assert.ok(before.members.every(member => member.stage === 'standing' && member.contact === 'ground' &&
      member.portal === 'clear' && member.opacity > .02 && member.coveredLayers > 1),
    `${label}: all three visible hunters must have cleared their exits and reached their final ground pose.`);
    assert.deepEqual(before.supports.map(support => support.id).sort(),
      ['hunter-feet', 'hunter-support', 'karhek-hunter-feet', 'karhek-hunter-support', 'saketh-hunter-feet', 'saketh-hunter-support'].sort(),
      `${label}: the detail must include each actual foot and support anchor.`);
    const coverage = [...before.members.map(member => member.bounds), ...before.supports];
    assert.ok(coverage.every(bounds => Object.values(bounds).filter(value => typeof value === 'number').every(Number.isFinite)),
      `${label}: native detail coordinates must be finite.`);
    // Include a 20 CSS-pixel margin for shadows, labels and visible local floor.
    const left = Math.max(Math.ceil(x), Math.floor(Math.min(...coverage.map(bounds => bounds.x)) - 20));
    const top = Math.max(Math.ceil(y), Math.floor(Math.min(...coverage.map(bounds => bounds.y)) - 20));
    const right = Math.min(Math.floor(x + width), Math.ceil(Math.max(...coverage.map(bounds => bounds.right)) + 20));
    const bottom = Math.min(Math.floor(y + height), Math.ceil(Math.max(...coverage.map(bounds => bounds.bottom)) + 20));
    assert.ok(coverage.every(bounds => bounds.x >= left && bounds.y >= top && bounds.right <= right && bounds.bottom <= bottom),
      `${label}: no hunter layer or ground support may be cropped by the native detail rectangle.`);
    x = left; y = top; width = right - left; height = bottom - top;
    assert.ok(width > 0 && height > 0 && width * height < prepared.scene.width * prepared.scene.height,
      `${label}: the final formation detail must be a smaller native region, without rescaling.`);
  } else if (opticalFullViewport) {
    const profile = prepared.captureProfile;
    const opticalSchedules = new Map([
      [`${profile.viewport.id}-ship-cloaked-triad-decloaking`, 52_400],
      [`${profile.viewport.id}-ship-cloaked-triad-visible-before-contact`, 53_300],
    ]);
    assert.equal(profile.variant.id, 'ship-cloaked-triad', `${label}: optical photographs require the exact calibrated cloaked-triad profile.`);
    assert.ok(opticalSchedules.has(label), `${label}: the full-viewport optical mode is restricted to its two existing photographs.`);
    assert.deepEqual(schedule, { atMs: opticalSchedules.get(label), shot: 'landing' });
    assert.equal(attempt, 1, `${label}: optical photographs retain a single native acquisition.`);
    assert.ok(x >= 0 && y >= 0 && x + width <= target.viewportSize().width && y + height <= target.viewportSize().height,
      `${label}: the complete unmodified scene must fit inside the native full viewport without cropping.`);
    // Preserve the full native viewport. The scene has fractional CSS bounds,
    // so no scene crop, rounding, resampling or detail derivative is made here.
    ({ x, y, width, height } = prepared.sourceRoi);
  }
  const clip = { x, y, width, height, scale: 1 };
  const preparedRoiSource = nativeCapture;
  const sourceClip = preparedRoiSource ? { ...clip, x: x - prepared.sourceRoi.x, y: y - prepared.sourceRoi.y } : clip;
  if (prepared.region === 'formation-detail') {
    assert.ok(x >= prepared.targetRoi.x && y >= prepared.targetRoi.y &&
      x + width <= prepared.targetRoi.x + prepared.targetRoi.width &&
      y + height <= prepared.targetRoi.y + prepared.targetRoi.height,
    `${label}: the complete final detail must remain inside the original, pixel-calibrated lower-scene target.`);
    assert.ok(sourceClip.x >= 0 && sourceClip.y >= 0 &&
      sourceClip.x + width <= prepared.sourceRoi.width && sourceClip.y + height <= prepared.sourceRoi.height,
    `${label}: every final layer and the existing detail margin must fit the ROI prepared before the interval.`);
  }
  acquisition.captureMode = opticalFullViewport ? 'native-x11-full-viewport-raw-then-optical-png'
    : preparedRoiSource ? 'native-x11-full-viewport-raw-then-lossless-detail' : 'native-clipped-png';
  if (opticalFullViewport) acquisition.evidenceKind = 'native-x11-full-viewport-optical';
  acquisition.captureSessionRole = preparedRoiSource ? 'persistent-x11-helper' : 'metrics-baseline-owner';
  if (preparedRoiSource) acquisition.profileId = prepared.captureProfile.id;
  acquisition.fromSurface = preparedRoiSource ? null : true;
  acquisition.clip = clip;
  if (prepared.region === 'formation-detail') acquisition.sourceClip = sourceClip;
  finishStage('validationAndClip');
  // X11 returns only an acquisition ACK; no full pixels, PNG or hash cross the
  // pipe until after clock and geometry observations. Ordinary CDP retains its
  // previous acquisition/encode/transport span and unchanged clip.
  const captureStage = preparedRoiSource ? 'nativeX11CaptureRpc' : 'screenshotRpc';
  startStage(captureStage);
  let screenshot, captureError;
  try {
    if (preparedRoiSource) {
      acquisition.captureId = `${label}:attempt-${attempt}:${prepared.capturePaintPattern.nonce}`;
      try {
        acquisition.captureAck = await x11Client.request('capture', {
          calibrationId: prepared.captureProfile.x11Calibration.calibrationId,
          captureId: acquisition.captureId, ...prepared.capturePaintPattern, timeoutMs: 500,
        });
      } catch (error) {
        if (!error.x11Result?.token) throw error;
        acquisition.captureAck = error.x11Result; captureError = error;
      }
    } else {
      screenshot = await prepared.captureSession.send('Page.captureScreenshot', {
        format: 'png', clip, fromSurface: acquisition.fromSurface,
        captureBeyondViewport: false, optimizeForSpeed: true,
      });
    }
  } finally { finishStage(captureStage); }
  let after, measured;
  try {
    startStage('afterObservationRpc');
    try { after = await readMoment(target, prepared.region); }
    finally { finishStage('afterObservationRpc'); }
    acquisition.after = after;
    startStage('completeGeometryRpc');
    try { measured = { ...await readFrame(target), decodedSvg: prepared.decodedSvg }; }
    finally { finishStage('completeGeometryRpc'); }
    acquisition.measuredAt = measured.elapsedMs;
    acquisition.invalidImages = measured.images.filter(image => !image.complete || image.width === 0 || image.height === 0);
    acquisition.imageReadiness = measured.imageReadiness;
    acquisition.geometryObservationTiming = measured.observationTiming;
    startStage('pngMaterialization');
    const lateCompletion = prepared.region === 'formation-detail' && after.status === 'complete' && after.elapsedMs === 62_000;
    const photographLabel = label + (lateCompletion ? `-rejected-attempt-${attempt}` : '');
    const file = photographLabel + '.png';
    let bytes = preparedRoiSource ? null : Buffer.from(screenshot.data, 'base64');
    finishStage('pngMaterialization');
    if (preparedRoiSource) {
      bytes = await preserveNativeSource(opticalFullViewport ? file : `${photographLabel}-source-native.png`);
      if (captureError) throw captureError;
      assertX11CaptureAck(acquisition.captureAck, prepared, acquisition.captureId, true);
      if (prepared.region === 'formation-detail') {
        startStage('losslessDetailPostprocessing');
        try {
          const cropped = await losslessNativeDetailCrop(bytes, sourceClip, prepared.sourceRoi);
          bytes = cropped.bytes;
          acquisition.pixelEquality = cropped.pixelEquality;
          acquisition.cropProcessingTiming = cropped.processingTiming;
        } finally { finishStage('losslessDetailPostprocessing'); }
      }
    }
    // Both photograph times and exact geometry are already observed. Save the
    // native scene or verified derivative before assertions. The native full source
    // for a detail was saved first and survives every crop/assert failure.
    startStage('pngWrite');
    try { if (!opticalFullViewport) await fs.writeFile(path.join(out, file), bytes); }
    finally { finishStage('pngWrite'); }
    acquisition.file = file; acquisition.sha256 = sha256(bytes);
    startStage('assertionsAndReport');
    if (opticalFullViewport) {
      assert.equal(file, acquisition.sourceCapture.file, `${label}: the optical photograph is the preserved native full-viewport PNG itself.`);
      assert.equal(acquisition.sha256, acquisition.sourceCapture.sha256, `${label}: optical pixels must not be re-encoded or transformed.`);
    }
    assert.equal(after.run, before.run, `${label}: the photograph must retain the same native arrival run.`);
    assert.equal(after.shot, before.shot, `${label}: the photograph must stay within its actual native shot.`);
    assert.equal(after.cloakPhase, before.cloakPhase, `${label}: optical phase must remain unambiguous across the photograph.`);
    assert.equal(after.contact, before.contact, `${label}: the photograph cannot cross the native ground-contact boundary.`);
    assert.ok(after.elapsedMs >= before.elapsedMs, `${label}: the native clock cannot be rewound for a picture.`);
    assert.equal(measured.run, after.run, `${label}: subsequent geometry must retain the photographed native run.`);
    assert.equal(measured.shot, after.shot, `${label}: subsequent geometry must retain the photographed native shot.`);
    assert.equal(measured.cloakPhase, after.cloakPhase, `${label}: subsequent geometry must retain the photographed optical phase.`);
    assert.equal(measured.contact, after.contact, `${label}: subsequent geometry must retain the photographed ground-contact phase.`);
    assert.ok(measured.elapsedMs >= after.elapsedMs, `${label}: subsequent geometry must not rewind the native clock.`);
    if (nativeCapture && !lateCompletion) {
      assertCaptureLayout(after, prepared.layout, target.viewportSize(), label);
      assertX11Markers(after, prepared.capturePaintPattern, target.viewportSize(), label);
    }
    if (opticalFullViewport) assertCaptureProfile(after, prepared.captureProfile, target.viewportSize(), label);
    if (prepared.region === 'formation-detail') {
      const identityAndPose = members => members.map(({ id, stage, contact, portal, opacity }) => ({ id, stage, contact, portal, opacity }));
      assert.deepEqual(identityAndPose(after.members), identityAndPose(before.members),
        `${label}: the entire native detail capture must retain the same visible standing trio.`);
      assert.deepEqual(after.supports.map(support => support.id), before.supports.map(support => support.id));
      assert.ok([...after.members.map(member => member.bounds), ...after.supports].every(bounds =>
        bounds.x >= x && bounds.y >= y && bounds.right <= x + width && bounds.bottom <= y + height),
      `${label}: native movement during capture must not crop a hunter layer or ground support.`);
    }
    // A late detail remains rejected evidence. Only the existing native
    // playback retry may handle completion; other mismatches remain fatal.
    if (!lateCompletion) assert.equal(after.status, 'playing', `${label}: a terminal or paused overlay invalidates the photograph.`);
    assertSpatial(measured, label);
    validateFrame?.(measured);
    (lateCompletion ? report.rejectedCaptures : report.captures).push({ file, sha256: sha256(bytes), viewport: target.viewportSize(), shot: before.shot,
      region: prepared.region, clip, ...(contextFile ? { contextFile } : {}),
      ...(opticalFullViewport ? { evidenceKind: 'native-x11-full-viewport-optical', captureMode: acquisition.captureMode,
        sourceCapture: acquisition.sourceCapture }
        : preparedRoiSource ? { evidenceKind: 'verified-lossless-integer-rgba-crop', sourceCapture: acquisition.sourceCapture, sourceClip,
        pixelEquality: acquisition.pixelEquality } : { evidenceKind: 'native-clipped-png' }),
      attempt, accepted: !lateCompletion, ...(lateCompletion ? { rejection: 'Arrival completed during native acquisition; no visual proof accepted.' } : {}),
      elapsedBefore: before.elapsedMs, elapsedAfter: after.elapsedMs, measuredAt: measured.elapsedMs,
      observation: opticalFullViewport
        ? 'Live before reads, synchronous fresh paint outside the component, one full native X11 private copy, live after and complete geometry; raw and the identical full-viewport PNG exported only afterwards. Optical phase and ground-contact guards remain mandatory.'
        : preparedRoiSource
        ? 'Live before reads, synchronous fresh paint outside the component, one full native X11 private copy, live after and complete geometry; raw export, PNG and lossless crop only afterwards. The native interval remains mandatory.'
        : 'Live clock immediately before and after lossless PNG capture; native playing status, shot and optical phase must survive both observations. Complete geometry measured afterwards.' });
    report.samples.push({ label: photographLabel, ...measured, photoAccepted: !lateCompletion, capturedBefore: before, capturedAfter: after });
    acquisition.accepted = !lateCompletion; acquisition.file = file;
    if (lateCompletion) acquisition.rejection = 'Arrival completed during native acquisition; no visual proof accepted.';
    finishStage('assertionsAndReport'); finishAcquisition();
    return lateCompletion ? null : { frame: measured, capturedBefore: before, file, attempt };
  } catch (error) {
    if (acquisition.timings.activeStage) finishStage(acquisition.timings.activeStage);
    acquisition.timings.failureObservedAtMs = performance.now();
    acquisition.accepted = false; acquisition.rejection = error.message;
    if (measured) acquisition.failedMeasurement = measured;
    // readMoment/readFrame can themselves reject before the regular write.
    // Preserve the existing private X11 buffer or CDP PNG, without another capture.
    if (!acquisition.file) {
      startStage('failedPngPreservation');
      try {
        if (preparedRoiSource) {
          if (!acquisition.sourceCapture) await preserveNativeSource(`${label}-failed-attempt-${attempt}-source-native.png`);
        } else {
          const bytes = Buffer.from(screenshot.data, 'base64');
          const file = `${label}-failed-attempt-${attempt}.png`;
          await fs.writeFile(path.join(out, file), bytes);
          acquisition.file = file; acquisition.sha256 = sha256(bytes);
        }
      } catch (preservationError) { acquisition.preservationError = preservationError.message; }
      finally { finishStage('failedPngPreservation'); }
    }
    report.rejectedCaptures.push({ file: acquisition.file ?? acquisition.sourceCapture?.file ?? null,
      sha256: acquisition.sha256 ?? acquisition.sourceCapture?.sha256 ?? null,
      viewport: target.viewportSize(), shot: before.shot, region: prepared.region, clip,
      ...(opticalFullViewport ? { evidenceKind: 'native-x11-full-viewport-optical', captureMode: acquisition.captureMode,
        sourceCapture: acquisition.sourceCapture ?? null }
        : preparedRoiSource ? { evidenceKind: acquisition.file ? 'verified-lossless-integer-rgba-crop' : 'native-x11-full-viewport-source',
        sourceCapture: acquisition.sourceCapture ?? null, sourceClip, pixelEquality: acquisition.pixelEquality ?? null } : { evidenceKind: 'native-clipped-png' }),
      attempt, accepted: false, rejection: error.message,
      elapsedBefore: before.elapsedMs, elapsedAfter: after?.elapsedMs ?? null,
      measuredAt: acquisition.measuredAt ?? null, invalidImages: acquisition.invalidImages ?? null,
      imageReadiness: acquisition.imageReadiness ?? null,
      ...(acquisition.preservationError ? { preservationError: acquisition.preservationError } : {}),
      observation: 'Original PNG retained after a failed observation or assertion; not accepted visual evidence.' });
    finishAcquisition();
    throw error;
  }
}

function momentTargetRoi(scene) {
  const width = scene.width ?? scene.right - scene.x;
  const height = scene.height ?? scene.bottom - scene.y;
  const x = Math.ceil(scene.x), y = Math.floor(scene.y + height / 2);
  return Object.freeze({ x, y, width: Math.floor(scene.x + width) - x,
    height: Math.floor(scene.y + height) - y, scale: 1 });
}

function roiCandidates(scene, viewport) {
  // A full native viewport preserves all filter context. There is no geometry
  // search or smaller-source fallback; the historical target stays unchanged.
  return Object.freeze([Object.freeze({ targetRoi: momentTargetRoi(scene),
    sourceRoi: Object.freeze({ x: 0, y: 0, width: viewport.width, height: viewport.height, scale: 1 }) })]);
}

function variantCaptureIdentity(variant) {
  return Object.freeze({ id: variant.id, method: variant.plan.method, team: variant.plan.team,
    shipCloak: !!variant.plan.shipCloak, shipId: api.DEFAULT_SHIP_ID });
}

function assertCaptureProfile(moment, profile, viewport, label) {
  assert.ok(profile && Object.isFrozen(profile), `${label}: a native ROI needs its immutable capture profile.`);
  assert.ok(Object.isFrozen(profile.viewport) && Object.isFrozen(profile.variant) &&
    Object.isFrozen(profile.targetRoi) && Object.isFrozen(profile.sourceRoi));
  const viewportDefinition = viewports.find(item => item.width === viewport.width && item.height === viewport.height);
  assert.ok(viewportDefinition);
  assert.deepEqual(profile.viewport, { id: viewportDefinition.id, width: viewport.width, height: viewport.height, dpr: 1 },
    `${label}: a capture profile cannot cross CSS viewports.`);
  assert.equal(moment.captureViewport.devicePixelRatio, profile.viewport.dpr);
  const variant = insertionVariants.find(item => item.id === profile.variant.id);
  assert.ok(variant?.plan.team === 'triad', `${label}: only the calibrated trio variant can use this profile.`);
  assert.deepEqual(profile.variant, variantCaptureIdentity(variant));
  assert.deepEqual({ method: moment.method, team: moment.team, shipCloak: moment.shipCloak, shipId: moment.ship },
    { method: profile.variant.method, team: profile.variant.team, shipCloak: profile.variant.shipCloak,
      shipId: profile.variant.shipId }, `${label}: actual insertion intent and selected hull must match the calibrated variant.`);
  assert.deepEqual(momentTargetRoi(moment.captureLayout.scene), profile.targetRoi,
    `${label}: a capture profile cannot be reused for a different original target rectangle.`);
  assert.deepEqual(profile.sourceRoi, { x: 0, y: 0, width: viewport.width, height: viewport.height, scale: 1 });
  assert.ok(Object.isFrozen(profile.x11Calibration) && Object.isFrozen(profile.calibrationPattern));
  assert.equal(profile.x11Calibration.guards?.passed, true);
  assert.ok(typeof profile.x11Calibration.calibrationId === 'string' && profile.x11Calibration.calibrationId.length > 0);
  assert.deepEqual(profile.x11Calibration.viewport, { width: viewport.width, height: viewport.height });
  assert.deepEqual(profile.x11Calibration.markers, profile.calibrationPattern.markers);
  assert.equal(profile.x11Calibration.nonce, profile.calibrationPattern.nonce);
  assert.ok(Object.isFrozen(profile.windowPreparation));
  assert.equal(profile.windowPreparation.passed, true);
  assert.deepEqual(profile.windowPreparation.cssViewport, { width: viewport.width, height: viewport.height });
  assert.deepEqual(profile.windowPreparation.boundsAfter,
    { left: 0, top: 0, width: 1919, height: 1199, windowState: 'normal' });
  if (profile.kind === 'candidate') {
    assert.equal(moment.status, 'paused', `${label}: an unqualified source can only be examined under the native Pause control.`);
  } else {
    assert.equal(profile.kind, 'validated');
    assert.ok(validatedCaptureProfiles.has(profile), `${label}: playback requires the exact profile selected by its native calibration.`);
    assert.equal(profile.pixelEquality?.roiMatched, true);
    assert.equal(profile.pixelEquality?.restoredMatched, true);
    assert.equal(profile.pixelEquality?.fullMatched, true);
    assert.equal(profile.pixelEquality?.markerTargetMatched, true);
  }
}

async function prepareMoment(target = page, region = 'scene', captureAtMs, captureProfile) {
  assert.ok(['scene', 'formation-detail', 'optical-full-viewport'].includes(region));
  const nativeCapture = region === 'formation-detail' || region === 'optical-full-viewport';
  const decodedSvg = await decodeSceneImages(target);
  const scene = await target.locator('[data-arrival-scene]').boundingBox();
  assert.ok(scene);
  const sessions = await momentSessions(target);
  assert.ok(sessions.baseline, 'The metrics session must have the current full CSS viewport baseline.');
  const prepared = { decodedSvg, scene, region, sessions, captureProfile,
    captureSession: nativeCapture ? sessions.captureSession : sessions.metricsSession };
  if (!nativeCapture) return prepared;
  const before = await readMoment(target, region);
  if (before.status === 'playing') assert.ok(Number.isFinite(captureAtMs) && before.elapsedMs < captureAtMs,
    'A native output ROI must be configured before the final capture interval starts.');
  assertCaptureProfile(before, captureProfile, target.viewportSize(), 'ROI preparation');
  const windowPreparation = sessions.windowPreparation;
  assert.ok(windowPreparation && Object.isFrozen(windowPreparation) && windowPreparation.passed);
  assert.equal(windowPreparation.cdpWindowId, captureProfile.windowPreparation.cdpWindowId,
    'A calibrated X11 profile cannot move to a different Chrome protocol window.');
  assert.deepEqual(windowPreparation.cssViewport, captureProfile.windowPreparation.cssViewport);
  assert.deepEqual(windowPreparation.boundsAfter, captureProfile.windowPreparation.boundsAfter);
  prepared.windowPreparation = windowPreparation;
  prepared.layout = captureLayout(before);
  assertCaptureLayout(before, prepared.layout, target.viewportSize(), 'ROI preparation');
  assert.deepEqual(momentTargetRoi(scene), captureProfile.targetRoi);
  prepared.targetRoi = captureProfile.targetRoi;
  // Selection only occurs in the paused preflight. Playback reuses the exact
  // validated source rectangle, never a recalculated padding or a new candidate.
  const viewport = target.viewportSize();
  prepared.sourceRoi = captureProfile.sourceRoi;
  const sourceTop = prepared.sourceRoi.y;
  const targetBottom = prepared.targetRoi.y + prepared.targetRoi.height;
  const sourceBottom = sourceTop + prepared.sourceRoi.height;
  assert.ok(prepared.sourceRoi.width > 0 && prepared.sourceRoi.height > 0);
  assert.ok(prepared.targetRoi.width > 0 && prepared.targetRoi.height > 0);
  assert.ok(prepared.targetRoi.x >= prepared.sourceRoi.x && prepared.targetRoi.y >= prepared.sourceRoi.y &&
    prepared.targetRoi.x + prepared.targetRoi.width <= prepared.sourceRoi.x + prepared.sourceRoi.width &&
    targetBottom <= sourceBottom, 'The native source must preserve every pixel of the original calibration target.');
  prepared.roiPreparation = { elapsedBefore: before.elapsedMs, sourceRoi: prepared.sourceRoi,
    targetRoi: prepared.targetRoi,
    region, captureAtMs: captureAtMs ?? null,
    profileId: captureProfile.id, profileKind: captureProfile.kind,
    viewport: captureProfile.viewport, variant: captureProfile.variant,
    calibrationId: captureProfile.x11Calibration.calibrationId,
    windowPreparationId: windowPreparation.id, calibrationWindowPreparationId: captureProfile.windowPreparation.id,
    cdpWindowId: windowPreparation.cdpWindowId,
    contextPurpose: 'Full native X11 viewport, no source override; every full pixel and original target pixel must match native CDP under Pause.',
    cssViewport: viewport, layout: prepared.layout };
  const startedAtMs = performance.now();
  await installX11PaintMarkers(target, captureProfile.calibrationPattern);
  prepared.capturePaintPattern = captureProfile.kind === 'validated' ? x11PaintPattern(viewport) : captureProfile.calibrationPattern;
  const after = await readMoment(target, region);
  assertCaptureLayout(after, prepared.layout, target.viewportSize(), 'ROI configuration');
  assertCaptureProfile(after, captureProfile, target.viewportSize(), 'ROI configuration');
  assertX11Markers(after, captureProfile.calibrationPattern, viewport, 'Full viewport preparation');
  assert.equal(after.run, before.run); assert.equal(after.shot, before.shot);
  assert.equal(after.status, before.status, 'Preparing the output ROI must preserve the native playback status.');
  assert.ok(after.elapsedMs >= before.elapsedMs, 'Preparing the output ROI must not rewind the native clock.');
  if (after.status === 'playing') assert.ok(after.elapsedMs < captureAtMs,
    'The native output ROI must finish configuration before the unchanged final capture interval.');
  prepared.roiPreparation.elapsedAfter = after.elapsedMs;
  prepared.roiPreparation.durationMs = performance.now() - startedAtMs;
  return prepared;
}

async function preflightMomentRoi(viewport, variant, target = page) {
  const referenceCapture = Object.freeze({ method: 'Page.captureScreenshot',
    backend: 'chromium-renderer-surface-copy-output',
    parameters: Object.freeze({ format: 'png', fromSurface: true, captureBeyondViewport: false, optimizeForSpeed: true }) });
  const calibration = { viewport: viewport.id, kind: 'paused-capture-calibration-only', passed: false,
    variant: variantCaptureIdentity(variant),
    scope: 'Native Pause for this exact insertion variant. Three intact Chromium renderer-surface CopyOutput references without clip or resize. Auxiliary Playwright recording is requested on the harness; its activation or continuity is not measured. The full X11 image and restored CDP image must equal normal; markers must preserve every original target pixel. These strict comparisons qualify only this observed paused profile. Never final-formation visual evidence.',
    referenceCapture,
    candidatePolicy: { sources: ['full-viewport'], selection: 'single-full-viewport-exact-cdp-x11-and-full-restoration' },
    images: [], observations: [], candidates: [] };
  report.capturePreflights.push(calibration);
  let activeCandidate = null;
  const observe = async label => {
    const moment = await readMoment(target, 'formation-detail');
    const observation = { label, candidateIndex: activeCandidate?.index ?? null, ...moment };
    calibration.observations.push(observation);
    activeCandidate?.observations.push(observation);
    return moment;
  };
  const pausedState = moment => ({ run: moment.run, shot: moment.shot, status: moment.status,
    elapsedMs: moment.elapsedMs, cloakPhase: moment.cloakPhase, contact: moment.contact,
    method: moment.method, team: moment.team, shipCloak: moment.shipCloak, ship: moment.ship,
    members: moment.members, supports: moment.supports, cloakHulls: moment.cloakHulls,
    ...captureLayout(moment), focus: moment.focus });
  const source = async (suffix, session, size) => {
    // Renderer-surface CopyOutput is distinct from the native X11 screen copy.
    // Keep its unmodified PNG; the full paused RGBA comparisons below decide equality.
    const screenshot = await session.send(referenceCapture.method, referenceCapture.parameters);
    const bytes = Buffer.from(screenshot.data, 'base64');
    const prefix = variant.id === 'pod-triad' ? `${viewport.id}-roi-calibration` : `${viewport.id}-${variant.id}-roi-calibration`;
    const file = `${prefix}${activeCandidate ? `-candidate-${activeCandidate.index}` : ''}-${suffix}.png`;
    await fs.writeFile(path.join(out, file), bytes);
    const item = { file, sha256: sha256(bytes), bytes: bytes.length, evidenceKind: 'calibration-only-native-png',
      role: suffix, candidateIndex: activeCandidate?.index ?? null, referenceCapture };
    calibration.images.push(item);
    activeCandidate?.images.push(item);
    const metadata = await sharp(bytes).metadata();
    Object.assign(item, { width: metadata.width, height: metadata.height });
    assert.equal(metadata.format, 'png');
    assert.equal(metadata.width, size.width); assert.equal(metadata.height, size.height);
    return bytes;
  };
  let prepared;
  try {
    await openShot(primaryMission.id, 'egress', false, api.DEFAULT_SHIP_ID, variant.plan);
    await target.getByRole('button', { name: 'Pause', exact: true }).click();
    await target.locator('[data-arrival-status="paused"]').waitFor();
    const paused = await observe('paused-before-neutral-pointer');
    const finalAtMs = api.ARRIVAL_HUNTER_MOVE_END_MS + Math.max(...api.arrivalFormationSlots('triad').map(slot => slot.delayMs)) + 10;
    assert.ok(paused.elapsedMs < finalAtMs, 'Capture calibration must pause before the final visual evidence interval.');
    const bounds = paused.captureLayout.root;
    assert.ok(1 < bounds.x || 1 < bounds.y || 1 >= bounds.right || 1 >= bounds.bottom,
      'The native pointer position must be in neutral harness padding outside the component.');
    await target.mouse.move(1, 1);
    calibration.decodedSvg = await decodeSceneImages(target);
    // Pause transfers focus to its primary Resume button in a native rAF.
    // Observe that effect; do not manufacture focus for the calibration.
    await target.waitForFunction(() => document.activeElement?.matches('button') &&
      document.activeElement.closest('[data-arrival-status="paused"]') &&
      document.activeElement.textContent.trim() === 'Reprendre l’arrivée', null, { polling: 'raf' });
    const sessions = await momentSessions(target);
    const unmarkedBefore = await observe('unmarked-before');
    assert.equal(unmarkedBefore.status, 'paused');
    assert.equal(unmarkedBefore.paintMarkers.markers.length, 0, 'The unmarked reference must precede all QA paint markers.');
    const expected = pausedState(unmarkedBefore);
    const unmarked = await source('unmarked', sessions.captureSession, target.viewportSize());
    assert.deepEqual(pausedState(await observe('unmarked-after')), expected);
    const calibrationPattern = x11PaintPattern(target.viewportSize());
    await installX11PaintMarkers(target, calibrationPattern);
    const x11Calibration = freezeCaptureData(await x11Client.request('calibrate', {
      viewport: target.viewportSize(), browserPid: x11Client.browserPid, ...calibrationPattern,
    }));
    assert.equal(x11Calibration.guards?.passed, true);
    const before = await observe('normal-before');
    assert.equal(before.status, 'paused');
    assert.deepEqual(pausedState(before), expected, 'Adding paint outside the component must preserve native paused geometry, focus and clock.');
    assertX11Markers(before, calibrationPattern, target.viewportSize(), 'Paused full viewport calibration');
    const normal = await source('normal', sessions.captureSession, target.viewportSize());
    const normalFile = calibration.images.at(-1);
    assert.deepEqual(pausedState(await observe('normal-after')), expected);
    const candidates = roiCandidates(before.captureLayout.scene, target.viewportSize());
    calibration.uniqueCandidateCount = candidates.length;
    for (const [index, configuration] of candidates.entries()) {
      const candidate = Object.freeze({ ...configuration,
        id: `${viewport.id}:${variant.id}:x11-full-viewport`,
        kind: 'candidate', candidateIndex: index + 1,
        viewport: Object.freeze({ id: viewport.id, width: viewport.width, height: viewport.height, dpr: 1 }),
        variant: calibration.variant, x11Calibration, calibrationPattern, windowPreparation: sessions.windowPreparation });
      activeCandidate = { id: candidate.id, index: candidate.candidateIndex, sourceRoi: candidate.sourceRoi,
        targetRoi: candidate.targetRoi, x11Calibration,
        accepted: false, images: [], observations: [] };
      calibration.candidates.push(activeCandidate);
      let roi;
      prepared = undefined;
      {
        prepared = await prepareMoment(target, 'formation-detail', undefined, candidate);
        activeCandidate.roiPreparation = prepared.roiPreparation;
        assert.deepEqual(pausedState(await observe('roi-before')), expected,
        'Preparing the native output ROI must preserve paused clock, focus, viewport and every observed native box.');
        const prefix = variant.id === 'pod-triad' ? `${viewport.id}-roi-calibration` : `${viewport.id}-${variant.id}-roi-calibration`;
        activeCandidate.exportBasename = `${prefix}-candidate-${candidate.candidateIndex}-roi`;
        let captureError;
        try {
          activeCandidate.captureAck = await x11Client.request('capture', {
            calibrationId: x11Calibration.calibrationId, captureId: `${candidate.id}:calibration`,
            ...calibrationPattern, timeoutMs: 500,
          });
        } catch (error) {
          if (!error.x11Result?.token) throw error;
          activeCandidate.captureAck = error.x11Result; captureError = error;
        }
        assert.deepEqual(pausedState(await observe('roi-after')), expected);
        activeCandidate.geometry = { ...await readFrame(target), decodedSvg: prepared.decodedSvg };
        const exported = await exportX11Source(activeCandidate.captureAck, activeCandidate.exportBasename, prepared,
          value => { activeCandidate.sourceCapture = value; });
        roi = exported.bytes; activeCandidate.sourceCapture = exported.sourceCapture;
        const item = { file: exported.sourceCapture.file, sha256: exported.sourceCapture.sha256,
          bytes: exported.sourceCapture.bytes, width: prepared.sourceRoi.width, height: prepared.sourceRoi.height,
          evidenceKind: 'calibration-only-native-x11-png', role: 'roi', candidateIndex: candidate.candidateIndex };
        calibration.images.push(item); activeCandidate.images.push(item);
        if (captureError) throw captureError;
        assertX11CaptureAck(activeCandidate.captureAck, prepared, `${candidate.id}:calibration`, false);
        assertSpatial(activeCandidate.geometry, `${candidate.id}:calibration`);
      }
      assert.deepEqual(pausedState(await observe('restored-before')), expected,
      'Restoring the complete viewport must preserve the same paused native observation.');
      const restored = await source('restored', sessions.captureSession, target.viewportSize());
      assert.deepEqual(pausedState(await observe('restored-after')), expected);
      const expectedRoi = await losslessNativeDetailCrop(normal, prepared.targetRoi, target.viewportSize());
      const targetSourceClip = Object.freeze({ ...prepared.targetRoi,
        x: prepared.targetRoi.x - prepared.sourceRoi.x, y: prepared.targetRoi.y - prepared.sourceRoi.y });
      const actualRoi = await losslessNativeDetailCrop(roi, targetSourceClip, prepared.sourceRoi);
      activeCandidate.targetSourceClip = targetSourceClip;
      const expectedPixels = await sharp(expectedRoi.bytes).ensureAlpha().raw().toBuffer();
      const roiPixels = await sharp(actualRoi.bytes).ensureAlpha().raw().toBuffer();
      const normalPixels = await sharp(normal).ensureAlpha().raw().toBuffer();
      const restoredPixels = await sharp(restored).ensureAlpha().raw().toBuffer();
      const x11Pixels = await sharp(roi).ensureAlpha().raw().toBuffer();
      const unmarkedTarget = await losslessNativeDetailCrop(unmarked, prepared.targetRoi, target.viewportSize());
      const unmarkedPixels = await sharp(unmarkedTarget.bytes).ensureAlpha().raw().toBuffer();
      for (let alpha = 3; alpha < normalPixels.length; alpha += 4) assert.equal(normalPixels[alpha], 255,
        'Depth-24 X11 can only qualify against a completely opaque native CDP reference.');
      assert.ok(unmarkedPixels.equals(expectedPixels), 'QA paint outside the component must preserve every original target RGBA pixel.');
      assert.ok(x11Pixels.equals(normalPixels), 'The complete native X11 viewport must equal every native CDP RGBA pixel, without a mask or tolerance.');
      // The sole full-viewport candidate has no fallback. Restoration, target,
      // and complete CDP-to-X11 equality are all fatal requirements.
      assert.ok(restoredPixels.equals(normalPixels), 'The restored complete native image must retain every original RGBA pixel, without tolerance.');
      const targetPixelsEqual = roiPixels.equals(expectedPixels);
      activeCandidate.pixelEquality = Object.freeze({ roiMatched: targetPixelsEqual, roiBytes: roiPixels.length,
        expectedRoiRgbaSha256: sha256(expectedPixels), actualRoiRgbaSha256: sha256(roiPixels),
        restoredMatched: true, fullMatched: true, markerTargetMatched: true, fullBytes: normalPixels.length,
        unmarkedTargetRgbaSha256: sha256(unmarkedPixels), markedTargetRgbaSha256: sha256(expectedPixels),
        normalRgbaSha256: sha256(normalPixels), x11RgbaSha256: sha256(x11Pixels), restoredRgbaSha256: sha256(restoredPixels) });
      assert.ok(roiPixels.equals(expectedPixels), 'The prepared native ROI must equal the same integer pixels of the normal native image, without tolerance.');
      activeCandidate.accepted = true;
      calibration.sourceRoi = prepared.sourceRoi;
      calibration.targetRoi = prepared.targetRoi;
      calibration.targetSourceClip = targetSourceClip;
      calibration.roiPreparation = prepared.roiPreparation;
      calibration.pixelEquality = activeCandidate.pixelEquality;
      calibration.selectedProfile = Object.freeze({ ...candidate, kind: 'validated', pixelEquality: calibration.pixelEquality,
        calibrationFiles: Object.freeze({ normal: Object.freeze({ ...normalFile }),
          roi: Object.freeze({ ...activeCandidate.images.find(item => item.role === 'roi') }),
          restored: Object.freeze({ ...activeCandidate.images.find(item => item.role === 'restored') }) }) });
      validatedCaptureProfiles.add(calibration.selectedProfile);
      calibration.passed = true;
      console.log('QA_ROI_PROFILE ' + JSON.stringify({ viewport: viewport.id, variant: variant.id,
        profileId: candidate.id, accepted: true, sourceRoi: candidate.sourceRoi,
        targetRoi: candidate.targetRoi, pixelEquality: calibration.pixelEquality }));
      return calibration.selectedProfile;
    }
    assert.fail('No candidate native source preserved every original target pixel with exact full restoration.');
  } catch (error) {
    calibration.error = error.message;
    await retainX11CalibrationFailure(calibration, error);
    if (activeCandidate && !activeCandidate.rejection) activeCandidate.error = error.message;
    if (activeCandidate?.captureAck?.token && !activeCandidate.sourceCapture && prepared) {
      try {
        await exportX11Source(activeCandidate.captureAck, activeCandidate.exportBasename, prepared,
          value => { activeCandidate.sourceCapture = value; });
      } catch (preservationError) {
        activeCandidate.preservationError = preservationError.message;
        if (preservationError.x11Result) activeCandidate.partialExport = preservationError.x11Result;
      }
    }
    throw error;
  }
}

async function waitElapsed(milliseconds, shotId, target = page, allowComplete = false) {
  await target.waitForFunction(({ milliseconds, shotId, allowComplete }) => {
    const root = document.querySelector('[data-arrival-run]');
    if (!root) throw new Error('Arrival unmounted before the requested sample.');
    const status = root.getAttribute('data-arrival-status');
    if (status === 'paused' || status === 'recoverable-error') throw new Error(`Arrival unexpectedly ${status}.`);
    return (status === 'playing' || (allowComplete && status === 'complete')) && root.getAttribute('data-arrival-shot') === shotId &&
      Number(root.getAttribute('data-arrival-elapsed-exact') ?? root.getAttribute('data-arrival-elapsed')) >= milliseconds;
  }, { milliseconds, shotId, allowComplete }, { timeout: 25000, polling: 'raf' });
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

async function openShot(missionId, shotId, reducedMotion = false, shipId = api.DEFAULT_SHIP_ID, insertion) {
  assert.ok(api.isShipId(shipId), 'Spatial fixtures must use a registered hull.');
  await syncMomentViewport(page);
  const url = new URL(`http://127.0.0.1:${harnessPort}/`);
  url.searchParams.set('mission', missionId); url.searchParams.set('shot', shotId);
  url.searchParams.set('ship', shipId);
  if (insertion) {
    url.searchParams.set('method', insertion.method); url.searchParams.set('team', insertion.team);
    if (insertion.shipCloak) url.searchParams.set('cloak', '1');
  }
  if (reducedMotion) url.searchParams.set('reduced', '1');
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await ready();
}

async function measureMovement(label) {
  const first = await readFrame();
  if (!['carrier', 'release', 'descent', 'atmosphere'].includes(first.shot) || first.reducedMotion) return;
  await waitElapsed(first.elapsedMs + 260, first.shot);
  const last = await readFrame();
  const axisIds = first.method === 'ship' || first.shot === 'carrier' ? ['carrier-tail', 'carrier-nose'] : ['pod-tail', 'pod-nose'];
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

function assertFinalFormation(frame, plan, label) {
  const save = api.defaultSave('2026-11-05T00:00:00.000Z');
  const expected = api.createPlanetArrival({ ownerCreatedAt: save.createdAt, runId: 'formation-measurement',
    missionId: primaryMission.id, encounterRun: 1, personalShipId: frame.ship,
    hunterPresetId: save.appearance.presetId, insertion: plan });
  const landing = api.planetArrivalLanding(expected);
  assert.ok(frame.groundScale > 0 && frame.anchors['ground-reference']);
  for (const slot of api.arrivalFormationSlots(plan.team)) {
    const member = frame.members.find(candidate => candidate.id === slot.id);
    const prefix = slot.id === 'player' ? '' : slot.id + '-';
    const feet = frame.anchors[`${prefix}hunter-feet`];
    assert.equal(member.stage, 'standing', `${label}: ${slot.id} must finish its walk before handoff.`);
    assert.equal(member.contact, 'ground');
    assert.ok(member.opacity > .98, `${label}: ${slot.id} must actually remain visible at the final position.`);
    const expectedX = frame.anchors['ground-reference'].x +
      (landing.spawnX + landing.hunterWidth / 2 + slot.offsetX) * frame.groundScale;
    assert.ok(Math.abs(feet.x - expectedX) <= 1.5,
      `${label}: ${slot.id} must meet the simulation's exact final world offset.`);
    assert.ok(Math.abs(feet.y - frame.anchors['ground-reference'].y) <= 1.5);
  }
}

async function finalizeCompositionCapture() {
  const receipt = report.nativeCapture?.compositionCapture;
  if (!receipt) return;
  if (!compositionFinalization) compositionFinalization = (async () => {
    if (!harnessContext) { receipt.finalization.status = 'context-not-created'; return; }
    receipt.nodeMoments.closeStarted = { wallTime: new Date().toISOString(), monotonicMs: performance.now() };
    try {
      await harnessContext.close();
      receipt.nodeMoments.contextClosed = { wallTime: new Date().toISOString(), monotonicMs: performance.now() };
      if (!compositionVideo) throw new Error('The harness composition video handle is unavailable after context closure.');
      const savedPath = await compositionVideo.path();
      const bytes = await fs.readFile(savedPath);
      receipt.video = { file: path.relative(out, savedPath), bytes: bytes.length, sha256: sha256(bytes) };
      receipt.finalization.status = 'flushed-and-hashed';
    } catch (error) {
      receipt.finalization.status = 'failed';
      receipt.finalization.error = { message: error.message, stack: error.stack };
      throw error;
    } finally {
      receipt.nodeMoments.finalizationFinished = { wallTime: new Date().toISOString(), monotonicMs: performance.now() };
    }
  })();
  return compositionFinalization;
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
  browser = await chromium.launch({ executablePath, headless: !headed,
    args: ['--no-sandbox', '--disable-dev-shm-usage', ...x11LaunchArgs] });
  report.browserVersion = browser.version();
  await startX11Capture();
  const compositionRecordVideo = { dir: path.join(out, 'composition-video'), size: { width: 16, height: 16 } };
  report.nativeCapture.compositionCapture = {
    kind: 'auxiliary-playwright-record-video-request', owner: 'single-harness-context-and-page',
    requestedOptions: { recordVideo: compositionRecordVideo },
    scope: 'A persistent Playwright recording client is requested only for the harness. Full native paused pixel comparisons remain decisive. This auxiliary file is never visual, pose, clock or frame-selection evidence.',
    startAcknowledgementObserved: false, screencastEventsObserved: false,
    activationOrCadenceMeasured: false, continuousCaptureVerified: false,
    limitations: 'Playwright sends startScreencast without awaiting its acknowledgement or first frame. If no frame arrives, its recorder can create a synthetic white frame at close; a WebM file, hash or declared frame rate cannot establish native capture activation or absolute continuity.',
    nodeMoments: { configured: { wallTime: new Date().toISOString(), monotonicMs: performance.now() } },
    finalization: { status: 'pending' }, video: null,
  };
  harnessContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'no-preference',
    recordVideo: compositionRecordVideo });
  report.nativeCapture.compositionCapture.nodeMoments.contextCreated = { wallTime: new Date().toISOString(), monotonicMs: performance.now() };
  page = await harnessContext.newPage();
  compositionVideo = page.video();
  report.nativeCapture.compositionCapture.nodeMoments.pageCreated = { wallTime: new Date().toISOString(), monotonicMs: performance.now() };
  observePage(page, 'native-component-host');

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await syncMomentViewport(page);
    const captureProfiles = new Map();
    for (const variant of insertionVariants.filter(item => item.plan.team === 'triad')) {
      const calibrationLabel = variant.id === 'pod-triad'
        ? `${viewport.id}: prepared native ROI preserves paused pixels and CSS geometry`
        : `${viewport.id}: ${variant.id} prepared native ROI preserves paused pixels and CSS geometry`;
      await check(calibrationLabel, async () => {
        captureProfiles.set(variant.id, await preflightMomentRoi(viewport, variant));
      });
    }
    // Exercise narrow formation photographs first. This changes cache warmup
    // relative to older recipes; all other controls and coverage still run.
    for (const variant of insertionVariants) {
      await check(`${viewport.id}: ${variant.id} real flight, contact and complete disembarkation`, async () => {
        for (const shotId of variant.plan.shipCloak ? ['carrier', 'release', 'atmosphere'] : ['release', 'atmosphere']) {
          await openShot(primaryMission.id, shotId, false, api.DEFAULT_SHIP_ID, variant.plan);
          const shot = api.PLANET_ARRIVAL_SHOTS.find(candidate => candidate.id === shotId);
          await waitElapsed(shot.startMs + (shot.endMs - shot.startMs) * (shotId === 'release' ? .12 : .55), shotId);
          const frame = await capture(`${viewport.id}-${variant.id}-${shotId}`);
          assert.equal(frame.method, variant.plan.method); assert.equal(frame.team, variant.plan.team);
          assert.equal(frame.shipCloak, !!variant.plan.shipCloak);
          if (variant.plan.method === 'pod') {
            assert.deepEqual(frame.flightPods.map(pod => pod.member), ['player', 'karhek', 'saketh']);
            if (shotId === 'atmosphere') for (const id of ['karhek', 'saketh']) {
              assert.ok(distance(frame.anchors['pod-nose'], frame.anchors[`${id}-pod-nose`]) > 1,
                'Every companion capsule must travel on its own visible trajectory.');
            }
          } else {
            assert.equal(frame.ship, api.DEFAULT_SHIP_ID, 'Controlled descent must retain the actual selected hull.');
            const carriers = frame.cloakHulls.filter(hull => hull.role === 'carrier');
            assert.equal(carriers.length, 1, 'Controlled descent requires exactly one actual carrier hull.');
            const carrier = carriers[0];
            // capture() already checked each actual view source, imageSource
            // and mixture against this hull's exact native motion frame.
            assert.ok(carrier.opacity > .02 && carrier.views.length > 0 && carrier.views.every(view =>
              view.opacity > 0 && view.image?.width > 0 && view.image.height > 0),
            'Controlled descent must paint the selected carrier in visible real view images.');
          }
          await measureMovement(`${viewport.id}-${variant.id}-${shotId}`);
        }
        await openShot(primaryMission.id, 'landing', false, api.DEFAULT_SHIP_ID, variant.plan);
        const landing = api.PLANET_ARRIVAL_SHOTS.find(shot => shot.id === 'landing');
        if (variant.plan.shipCloak) {
          const opticalProfile = captureProfiles.get('ship-cloaked-triad');
          const prepared = await prepareMoment(page, 'optical-full-viewport', 52_400, opticalProfile);
          const releasing = await captureMoment(`${viewport.id}-${variant.id}-decloaking`, prepared, page, 1, undefined,
            { atMs: 52_400, shot: landing.id });
          assert.ok(Number.isFinite(releasing.capturedBefore.armedAt) && releasing.capturedBefore.armedAt < 52_400,
            'The decloaking photograph must be armed before its native release sample threshold.');
          assert.ok(releasing.capturedBefore.elapsedMs >= 52_300 && releasing.capturedBefore.elapsedMs < 53_300,
            'The photographed release must actually occur within the one-second optical envelope.');
          assert.equal(releasing.capturedBefore.cloakPhase, 'releasing');
          assert.ok(releasing.capturedBefore.cloakHulls.some(hull => hull.strength > 0 && hull.strength < 1 &&
            hull.bodyOpacity > .24 && hull.bodyOpacity < 1 && hull.lens && hull.rim));
          // Re-enter at the native shot boundary so encoding the release PNG
          // cannot consume the independent pre-contact evidence window.
          await openShot(primaryMission.id, 'landing', false, api.DEFAULT_SHIP_ID, variant.plan);
          const visiblePrepared = await prepareMoment(page, 'optical-full-viewport', 53_300, opticalProfile);
          const visible = await captureMoment(`${viewport.id}-${variant.id}-visible-before-contact`, visiblePrepared, page, 1, undefined,
            { atMs: 53_300, shot: landing.id });
          assert.ok(Number.isFinite(visible.capturedBefore.armedAt) && visible.capturedBefore.armedAt < 53_300,
            'The visible pre-contact photograph must be armed before optical release ends.');
          assert.equal(visible.capturedBefore.cloakPhase, 'off'); assert.equal(visible.capturedBefore.contact, false);
          assert.ok(visible.capturedBefore.cloakHulls.some(hull => hull.strength === 0 && hull.bodyOpacity === 1 && !hull.lens && !hull.rim));
        } else {
          await waitElapsed(landing.startMs + (landing.endMs - landing.startMs) * .35, landing.id);
          const approaching = await capture(`${viewport.id}-${variant.id}-before-contact`);
          assert.equal(approaching.contact, false);
        }
        await waitElapsed(landing.startMs + (landing.endMs - landing.startMs) * .75, landing.id);
        const grounded = await capture(`${viewport.id}-${variant.id}-grounded`);
        assert.equal(grounded.contact, true);
        if (variant.plan.method === 'pod') {
          assert.deepEqual(grounded.groundPods.map(pod => pod.member), ['player', 'karhek', 'saketh']);
          for (const id of ['player', 'karhek', 'saketh']) {
            const pieces = grounded.debris.filter(piece => piece.member === id);
            assert.equal(pieces.length, 9, `${id} must have its own nine physical impact fragments.`);
            assert.equal(new Set(pieces.map(piece => piece.id)).size, 9);
          }
        }
        await openShot(primaryMission.id, 'egress', false, api.DEFAULT_SHIP_ID, variant.plan);
        const egress = api.PLANET_ARRIVAL_SHOTS.find(shot => shot.id === 'egress');
        // Companion departures are 250 ms apart. Screenshot encoding in the
        // first CI run took up to 767 ms, so observe these short stages first
        // without blocking their native clock on image encoding.
        const decodedSvg = await decodeSceneImages();
        for (const progress of [.32, .37, .42, .55]) {
          await waitElapsed(egress.startMs + (egress.endMs - egress.startMs) * progress, egress.id);
          const label = `${viewport.id}-${variant.id}-egress-measured-${Math.round(progress * 100)}`;
          const measured = { ...await readFrame(), decodedSvg };
          assertSpatial(measured, label);
          report.samples.push({ label, ...measured });
        }
        // A full geometry read can straddle a short contact interval. Retain
        // the four overview samples, then fill only missing required contacts.
        // Every extra snapshot comes from one independent native playback,
        // prearmed at the midpoint of that member's real production window.
        for (const slot of api.arrivalFormationSlots(variant.plan.team)) {
          const contactWindows = [
            { contact: 'threshold', startMs: api.ARRIVAL_HUNTER_MOVE_START_MS + slot.delayMs,
              endMs: api.ARRIVAL_HUNTER_THRESHOLD_LEAVE_MS + slot.delayMs },
            { contact: 'airborne', startMs: api.ARRIVAL_HUNTER_THRESHOLD_LEAVE_MS + slot.delayMs,
              endMs: api.ARRIVAL_HUNTER_GROUND_CONTACT_MS + slot.delayMs },
            { contact: 'ground', startMs: api.ARRIVAL_HUNTER_GROUND_CONTACT_MS + slot.delayMs,
              endMs: egress.endMs },
          ];
          for (const contactWindow of contactWindows) {
            const measuredPrefix = `${viewport.id}-${variant.id}-egress-`;
            if (report.samples.some(sample => sample.label.startsWith(measuredPrefix) &&
                sample.members?.some(member => member.id === slot.id && member.opacity > .02 && member.contact === contactWindow.contact))) continue;
            await openShot(primaryMission.id, 'egress', false, api.DEFAULT_SHIP_ID, variant.plan);
            const decodedContactSvg = await decodeSceneImages();
            const requestedContact = { member: slot.id, contact: contactWindow.contact, shot: egress.id,
              startMs: contactWindow.startMs, atMs: contactWindow.startMs + (contactWindow.endMs - contactWindow.startMs) / 2,
              endMs: contactWindow.endMs };
            const label = `${viewport.id}-${variant.id}-egress-contact-${slot.id}-${contactWindow.contact}`;
            const observation = { label, requestedContact, measuredAt: null, accepted: false };
            report.contactObservations.push(observation);
            const measured = { ...await readFrame(page, requestedContact), decodedSvg: decodedContactSvg };
            observation.measuredAt = measured.elapsedMs;
            assert.equal(measured.status, 'playing'); assert.equal(measured.shot, egress.id);
            assert.equal(measured.method, variant.plan.method); assert.equal(measured.team, variant.plan.team);
            assert.equal(measured.shipCloak, !!variant.plan.shipCloak);
            assert.ok(measured.elapsedMs >= requestedContact.atMs && measured.elapsedMs < requestedContact.endMs,
              'Supplemental geometry must actually belong to the requested native contact interval.');
            assert.ok(measured.members.some(member => member.id === slot.id && member.opacity > .02 && member.contact === requestedContact.contact),
              'The requested visible hunter must have the requested contact in the complete geometry snapshot.');
            assertSpatial(measured, label);
            report.samples.push({ label, ...measured, requestedContact });
            observation.accepted = true;
          }
        }
        // Start fresh native egress shots for visual evidence. The dense
        // geometry samples above can consume the brief walking/final windows
        // on CI; their execution must not decide when these PNGs are taken.
        await openShot(primaryMission.id, 'egress', false, api.DEFAULT_SHIP_ID, variant.plan);
        const walkingPrepared = await prepareMoment();
        await waitElapsed(60_250, egress.id);
        const walking = await captureMoment(`${viewport.id}-${variant.id}-egress-walking`, walkingPrepared);
        assert.ok(walking.capturedBefore.members.some(member => member.stage === 'walking'),
          'The walking PNG must be requested while a real formation member is walking.');
        const finalDetail = variant.plan.team === 'triad';
        const finalTime = api.ARRIVAL_HUNTER_MOVE_END_MS + Math.max(...api.arrivalFormationSlots(variant.plan.team).map(slot => slot.delayMs)) + 10;
        const validateFinalFrame = frame => {
          assertFinalFormation(frame, variant.plan, `${viewport.id}-${variant.id}`);
          if (variant.plan.method === 'ship') assert.ok(
            distance(groundPoint(grounded, 'ship-ground-contact'), groundPoint(frame, 'ship-ground-contact')) <= 1.5,
            'The landed hull must remain stationary throughout disembarkation, including rejected photographic attempts.');
        };
        let finalCapture = null;
        for (let attempt = 1; attempt <= (finalDetail ? 3 : 1); attempt += 1) {
          await openShot(primaryMission.id, 'egress', false, api.DEFAULT_SHIP_ID, variant.plan);
          const finalPrepared = await prepareMoment(page, finalDetail ? 'formation-detail' : 'scene', finalTime,
            captureProfiles.get(variant.id));
          finalCapture = await captureMoment(`${viewport.id}-${variant.id}-egress-final${finalDetail ? '-detail' : ''}`,
            finalPrepared, page, attempt, validateFinalFrame, { atMs: finalTime, shot: egress.id });
          if (finalCapture) break;
        }
        assert.ok(finalCapture, 'Every final trio PNG crossed completion; all attempts remain rejected and no final visual proof is available.');
        assert.ok(finalCapture.capturedBefore.members.every(member => member.stage === 'standing' && member.contact === 'ground'),
          'The final PNG must be requested after every hunter is standing on the floor and before completion.');
        const final = finalCapture.frame;
        report.insertions.push({ viewport: viewport.id, ...variant, ship: api.DEFAULT_SHIP_ID,
          finalPhotograph: { file: finalCapture.file, attempts: finalCapture.attempt, rejectedAttempts: finalCapture.attempt - 1 },
          finalMembers: final.members.map(member => ({ id: member.id, stage: member.stage, contact: member.contact })),
          finalAnchors: Object.fromEntries(Object.entries(final.anchors).filter(([id]) => /hunter-feet$|ship-ground-contact/.test(id))),
        });
      });
    }
    for (const shot of api.PLANET_ARRIVAL_SHOTS) {
      await check(`${viewport.id}: ${shot.id} actual layers, anchors and motion`, async () => {
        await openShot(primaryMission.id, shot.id);
        const duration = shot.endMs - shot.startMs;
        const samples = [['early', .1], ['middle', .5], ['late', .88]];
        if (shot.id === 'landing') samples.splice(2, 0, ['impact', .66]);
        if (shot.id === 'egress') samples.splice(1, 0,
          ['vent-dissipation', .26], ['threshold', .32], ['step-down', .40]);
        if (shot.id === 'egress') {
          // Six PNG encodes cannot share this five-second native window: the
          // audited 66f run spent 1.534 s on one image and reached completion
          // before its last sample. Keep the dense geometry observations in
          // one unchanged playback, without image encoding between them.
          const decodedSvg = await decodeSceneImages();
          for (const [position, progress] of samples) {
            await waitElapsed(shot.startMs + duration * progress, shot.id);
            const label = `${viewport.id}-${shot.id}-${position}`;
            const measured = { ...await readFrame(), decodedSvg };
            assertSpatial(measured, label);
            report.samples.push({ label, ...measured });
          }
          // Each picture starts at the real shot boundary and requests its
          // PNG before the expensive complete geometry read. No pause overlay,
          // forced clock, or completed frame is substituted for emergence.
          for (const [position, progress] of samples) {
            await openShot(primaryMission.id, shot.id);
            const prepared = await prepareMoment();
            await waitElapsed(shot.startMs + duration * progress, shot.id);
            await captureMoment(`${viewport.id}-${shot.id}-${position}-image`, prepared);
          }
          return;
        }
        for (const [position, progress] of samples) {
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
          const prepared = shotId === 'egress' ? await prepareMoment() : null;
          await waitElapsed(shot.startMs + (shot.endMs - shot.startMs) * progress, shotId);
          const label = `${viewport.id}-${mission.id}-${shotId}`;
          const frame = prepared ? (await captureMoment(label, prepared)).frame : await capture(label);
          assert.equal(frame.planet, expected.destinationId);
          if (shotId === 'carrier') {
            assert.equal(frame.planetImage, assets.planet, 'Planet calibration must retain the registered source path.');
            assert.ok([...frame.images, ...frame.svgImages].some(image => image.path === assets.planet),
              'Destination must render its registered planet artwork.');
          }
          else {
            assert.ok(frame.groundFrame, 'Destination must use the native biome crop.');
            assert.equal(await page.locator('[data-arrival-ground-frame] image').getAttribute('href'), assets.ground);
            if (shotId === 'landing') {
              assert.ok(frame.images.some(image => image.path === assets.impactDust),
                'Impact must render the actual destination material, including wet and ice variants.');
              assert.equal(frame.impactMaterial, mission.biome === 'ice' ? 'ice' :
                ['ocean', 'swamp'].includes(mission.biome) ? 'wet' : 'dry');
            }
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
    for (const shipId of ['wolf-ship', 'avpr-scout-ship']) {
      await check(`${viewport.id}: ${shipId} measured hull support and attached exit on the real surface`, async () => {
        const plan = { version: 1, method: 'ship', team: 'solo' };
        await openShot(primaryMission.id, 'landing', false, shipId, plan);
        const landing = api.PLANET_ARRIVAL_SHOTS.find(shot => shot.id === 'landing');
        await waitElapsed(landing.startMs + (landing.endMs - landing.startMs) * .75, landing.id);
        const grounded = await capture(`${viewport.id}-${shipId}-surface-contact`);
        assert.equal(grounded.groundShip.contact, true);
        const egress = api.PLANET_ARRIVAL_SHOTS.find(shot => shot.id === 'egress');
        for (const progress of [.32, .42, .96]) {
          await openShot(primaryMission.id, 'egress', false, shipId, plan);
          const prepared = await prepareMoment();
          const atMs = progress === .96 ? api.ARRIVAL_HUNTER_MOVE_END_MS + 10
            : egress.startMs + (egress.endMs - egress.startMs) * progress;
          await waitElapsed(atMs, egress.id);
          const photographed = await captureMoment(`${viewport.id}-${shipId}-surface-egress-${Math.round(progress * 100)}`, prepared);
          const frame = photographed.frame;
          if (progress === .96) {
            assert.ok(photographed.capturedBefore.members.every(member => member.stage === 'standing' && member.contact === 'ground'),
              'The actual final support must be photographed before the terminal overlay.');
            assertFinalFormation(frame, plan, `${viewport.id}-${shipId}`);
            assert.ok(distance(groundPoint(grounded, 'ship-ground-contact'), groundPoint(frame, 'ship-ground-contact')) <= 1.5);
          }
        }
      });
    }
  }

  for (const viewport of viewports) {
    await check(`${viewport.id}: pod petals stay attached through deployment, pause and reduced motion`, async () => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await syncMomentViewport(page);
      const plan = { version: 1, method: 'pod', team: 'triad' };
      await openShot(primaryMission.id, 'atmosphere', false, api.DEFAULT_SHIP_ID, plan);
      await waitElapsed(api.ARRIVAL_POD_SHUTTERS_OPEN_START_MS + 350, 'atmosphere');
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await page.locator('[data-arrival-status="paused"]').waitFor();
      const paused = { ...await readFrame(), decodedSvg: await decodeSceneImages() };
      assertSpatial(paused, `${viewport.id}-pod-petals-paused`);
      assert.ok(paused.flightPods.some(pod => pod.deployment > 0 && pod.deployment < 1),
        'The real Pause button must freeze an observed mechanical deployment, not only an endpoint.');
      await page.waitForTimeout(350);
      const held = await readFrame();
      assert.equal(held.elapsedMs, paused.elapsedMs);
      assert.deepEqual(held.flightPods, paused.flightPods, 'A native pause freezes every petal, hull and heat envelope.');
      for (const [id, anchor] of Object.entries(paused.anchors).filter(([id]) => /shutter-|bow-shock|trail-|pod-(nose|tail)/.test(id))) {
        assert.deepEqual(held.anchors[id], anchor, `${id}: no attachment may advance on another clock while paused.`);
      }
      report.samples.push({ label: `${viewport.id}-pod-petals-paused`, ...paused });
      await page.getByRole('button', { name: 'Reprendre l’arrivée', exact: true }).click();
      const lastDelay = Math.max(...api.arrivalFormationSlots('triad').map(slot => slot.delayMs));
      await waitElapsed(api.ARRIVAL_POD_SHUTTERS_OPEN_END_MS + lastDelay + 150, 'atmosphere');
      const opened = await capture(`${viewport.id}-pod-petals-opened`);
      assert.equal(opened.flightPods.length, 3);
      assert.ok(opened.flightPods.every(pod => pod.shutters === 'open' && pod.deployment === 1));
      await openShot(primaryMission.id, 'atmosphere', true, api.DEFAULT_SHIP_ID, plan);
      await waitElapsed(api.ARRIVAL_POD_SHUTTERS_OPEN_START_MS + lastDelay + 150, 'atmosphere');
      const reduced = await capture(`${viewport.id}-pod-petals-reduced-motion`);
      assert.equal(reduced.reducedMotion, true);
      assert.ok(reduced.flightPods.every(pod => pod.deployment === 1 && pod.panels.every(panel => Math.abs(panel.renderedAngle) < .001)),
        'Reduced motion retains fully deployed petals without gradual mechanical travel.');
    });
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
  await check('Reduced motion preserves every explicit insertion method and complete formation', async () => {
    for (const variant of insertionVariants) {
      await openShot(primaryMission.id, 'egress', true, api.DEFAULT_SHIP_ID, variant.plan);
      const egress = api.PLANET_ARRIVAL_SHOTS.find(shot => shot.id === 'egress');
      await waitElapsed(egress.startMs + 1_250, egress.id);
      const frame = await capture(`mobile-reduced-motion-${variant.id}`);
      assert.equal(frame.reducedMotion, true);
      assertFinalFormation(frame, variant.plan, `reduced-${variant.id}`);
    }
  });
  await check('Optical camouflage pauses with the real clock and keeps reduced-motion refraction static', async () => {
    const variant = insertionVariants.find(item => item.plan.shipCloak);
    await openShot(primaryMission.id, 'atmosphere', true, api.DEFAULT_SHIP_ID, variant.plan);
    const frame = await capture('mobile-reduced-motion-ship-cloaked-triad-active');
    assert.equal(frame.cloakPhase, 'active');
    assert.ok(frame.cloakHulls.some(hull => hull.opacity > .02 && hull.strength === 1 && hull.body.opacity === .24));
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.locator('[data-arrival-status="paused"]').waitFor();
    const paused = await readFrame();
    await page.waitForTimeout(200);
    const held = await readFrame();
    assert.equal(held.elapsedMs, paused.elapsedMs);
    assert.deepEqual(held.cloakHulls, paused.cloakHulls, 'A real pause must freeze the complete optical surface.');
    await page.getByRole('button', { name: 'Reprendre l’arrivée', exact: true }).click();
    await waitElapsed(paused.elapsedMs + 100, 'atmosphere');
    assert.equal((await readFrame()).cloakPhase, 'active');
  });
  currentCheck = 'Harness auxiliary composition video finalization';
  await finalizeCompositionCapture();

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
    // Arrival hands off to the real modal briefing. Complete that user step
    // before using the toolbar behind it; never force a click through a modal.
    await page.locator('[data-mission-opening-v78]').waitFor({ timeout: 90000 });
    await page.getByRole('button', { name: 'Commencer la chasse', exact: true }).click();
    await page.locator('[data-mission-opening-v78]').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => [...document.querySelectorAll('.hunt-screen summary')].some(element => {
      const match = element.textContent?.match(/Détails\s*·\s*(\d+):(\d+)/);
      return match && Number(match[1]) * 60 + Number(match[2]) > 0;
    }), null, { timeout: 30000 });
    assert.equal(await page.evaluate(() => window.__arrivalSpatialObservations.huntMounts), 1,
      'Dismissing the briefing must preserve the natural arrival hunt.');
    assert.deepEqual(await storageSnapshot(page), protectedStorage);
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
  for (const variant of insertionVariants.filter(item => item.plan.method === 'ship' && item.plan.team === 'triad')) {
    await check(`Native ${variant.id} Skip preserves the actual hull, paid plan, pressure and usable companion orders`, async () => {
      const destinationId = `arrival-${variant.id}-jungle-vey`;
      await page.keyboard.press('F8');
      await page.locator('[data-dev-catalogue]').waitFor();
      await page.locator('[data-dev-category="arrivals"]').click();
      await page.locator(`[data-dev-launch="${destinationId}"]`).click();
      await ready();
      const before = await capture(`native-${variant.id}-orbit`);
      assert.equal(before.method, 'ship'); assert.equal(before.team, 'triad');
      assert.equal(before.shipCloak, !!variant.plan.shipCloak);
      const session = page.locator(`[data-dev-session="${destinationId}"]`);
      const expectedEnergy = variant.plan.shipCloak ? 70 : 100;
      assert.equal(await session.getAttribute('data-dev-insertion-energy'), String(expectedEnergy));
      assert.equal(await session.getAttribute('data-dev-insertion-energy-run'), variant.plan.shipCloak ? before.run : null);
      const mounts = await page.evaluate(() => window.__arrivalSpatialObservations.huntMounts);
      await page.getByRole('button', { name: /^Passer l’arrivée/ }).tap();
      await session.locator('.hunt-screen canvas.hunt-canvas').waitFor({ timeout: 90000 });
      await page.locator('[data-mission-opening-v78]').waitFor({ timeout: 90000 });
      await session.locator('[data-hunt-surface-ship-ready="true"]').waitFor({ timeout: 90000 });
      await page.waitForFunction(id => document.querySelector(`[data-dev-session="${id}"]`)
        ?.hasAttribute('data-dev-hunt-insertion'), destinationId, { timeout: 30000 });
      const snapshot = JSON.parse(await session.getAttribute('data-dev-hunt-insertion'));
      assert.deepEqual(snapshot.plan, variant.plan);
      assert.deepEqual(snapshot.companions.map(member => member.id), ['karhek', 'saketh']);
      assert.deepEqual(snapshot.patrolIds, (variant.plan.shipCloak ? [0] : [0, 2]).map(index => `${snapshot.runId}:insertion-patrol-${index}`),
        'The real jungle entry must create one cloaked patrol or two uncloaked patrols at its unobstructed placements.');
      assert.deepEqual(JSON.parse(await session.getAttribute('data-dev-hunt-insertion-patrols')), snapshot.patrolIds,
        'Every declared insertion patrol must be present in the real persisted enemy snapshot.');
      assert.equal(snapshot.searchUntil, variant.plan.shipCloak ? 18 : 35);
      assert.equal(await session.getAttribute('data-dev-insertion-energy'), String(expectedEnergy), 'Skip cannot repeat the paid departure debit.');
      assert.equal(await session.getAttribute('data-dev-insertion-energy-run'), variant.plan.shipCloak ? before.run : null);
      for (const member of snapshot.companions) {
        const slot = api.arrivalFormationSlots('triad').find(candidate => candidate.id === member.id);
        assert.equal(member.x + member.width / 2, snapshot.origin.x + slot.offsetX,
          'Skip must create the same exact formation centers as the final cinematic frame.');
        assert.equal(member.y + member.height, snapshot.origin.y);
        assert.equal(member.status, 'active'); assert.equal(member.grounded, true);
      }
      const hunt = session.locator('.hunt-screen');
      assert.equal(await hunt.getAttribute('data-hunt-insertion-method'), 'ship');
      assert.equal(await hunt.getAttribute('data-hunt-insertion-team'), 'triad');
      assert.equal(await hunt.getAttribute('data-hunt-insertion-run-id'), before.run);
      assert.equal(await hunt.getAttribute('data-hunt-insertion-ship-id'), before.ship);
      assert.equal(await session.getAttribute('data-dev-arrival-completed-by'), 'skipped');
      assert.equal(await session.getAttribute('data-dev-arrival-run'), before.run);
      assert.equal(await page.evaluate(() => window.__arrivalSpatialObservations.huntMounts), mounts + 1);
      await page.getByRole('button', { name: 'Commencer la chasse', exact: true }).click();
      await page.locator('[data-mission-opening-v78]').waitFor({ state: 'hidden' });
      await session.locator('canvas.hunt-canvas').screenshot({ path: path.join(out, `native-${variant.id}-hunt-canvas.png`) });
      const details = page.locator('.hunt-screen details').filter({ has: page.locator('summary').filter({ hasText: /Triade · ordres et état/ }) });
      if (await details.getAttribute('open') === null) await details.locator('summary').click();
      await page.getByRole('button', { name: 'Ka’rhek : tenir la position', exact: true }).click();
      await page.locator('[data-hunt-companion-id="karhek"][data-hunt-companion-order="hold"]').waitFor();
      await page.getByRole('button', { name: 'Ka’rhek : suivre', exact: true }).click();
      await page.locator('[data-hunt-companion-id="karhek"][data-hunt-companion-order="follow"]').waitFor();
      await page.screenshot({ path: path.join(out, `native-${variant.id}-hunt-orders.png`), fullPage: false });
      assert.equal(await page.evaluate(() => window.__arrivalSpatialObservations.huntMounts), mounts + 1,
        'Real companion commands must preserve the same running hunt.');
      assert.deepEqual(await storageSnapshot(page), protectedStorage);
      report.native[variant.plan.shipCloak ? 'shipCloakedTriad' : 'shipTriad'] = {
        runId: before.run, completedBy: 'skipped', huntCanvases: 1, snapshot,
        observedOrders: ['hold', 'follow'], surfaceShip: before.ship, energy: expectedEnergy,
        energyRun: await session.getAttribute('data-dev-insertion-energy-run'),
      };
    });
  }
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
  await check('Independent impact fragments, vent phases and world-aligned masked light were actually observed', async () => {
    for (const viewport of viewports) {
      const samples = report.samples.filter(sample => sample.label.startsWith(viewport.id + '-'));
      assert.ok(samples.some(sample => sample.debris.length === 9 && sample.debris.every(piece => piece.opacity > .02)),
        `${viewport.id}: the real impact burst must be sampled while active.`);
      assert.ok(samples.some(sample => sample.label === `${viewport.id}-egress-vent-dissipation` &&
        ['left', 'right'].every(side => sample.anchors[`vapor-${side}-origin`]?.opacity > .02) &&
        sample.vents.every(vent => vent.phases[1].opacity > vent.phases[0].opacity)),
      `${viewport.id}: both real vent emitters must be observed during dissipation.`);
      for (const contact of ['threshold', 'airborne', 'ground']) {
        assert.ok(samples.some(sample => sample.anchors['hunter-feet']?.opacity > .02 && sample.hunterContact === contact),
          `${viewport.id}: the real hunter must be observed with ${contact} contact during emergence.`);
      }
      for (const role of ['carrier', 'flight-pod', 'ground-pod', 'ground-ship', 'hatch', 'hatch-interior', 'impact-dust']) {
        assert.ok(samples.some(sample => sample.lights.some(light => light.role === role && light.opacity > .02)),
          `${viewport.id}: the ${role} source mask must be observed on an active sprite.`);
      }
      for (const method of ['pod', 'ship']) for (const id of ['player', 'karhek', 'saketh']) {
        const formationSamples = samples.filter(sample => sample.method === method && sample.team === 'triad' && !sample.reducedMotion);
        for (const contact of ['threshold', 'airborne', 'ground']) {
          assert.ok(formationSamples.some(sample => sample.members.some(member =>
            member.id === id && member.opacity > .02 && member.contact === contact)),
          `${viewport.id}: ${method} ${id} must actually be observed at ${contact} contact.`);
        }
      }
      const cloaked = samples.filter(sample => sample.shipCloak && !sample.reducedMotion);
      assert.ok(cloaked.some(sample => sample.cloakPhase === 'active' && sample.cloakHulls.some(hull =>
        hull.opacity > .02 && hull.strength === 1 && hull.body?.opacity === .24 && hull.lens && hull.rim)),
      `${viewport.id}: active camouflage must actually be seen on the selected visible hull.`);
      assert.ok(cloaked.some(sample => sample.capturedBefore?.cloakPhase === 'releasing' &&
        sample.capturedBefore.cloakHulls.some(hull => hull.strength > 0 && hull.strength < 1)),
      `${viewport.id}: the real decloaking envelope must be photographed before restoration.`);
      assert.ok(cloaked.some(sample => sample.capturedBefore?.cloakPhase === 'off' && !sample.capturedBefore.contact &&
        sample.capturedBefore.cloakHulls.some(hull => hull.strength === 0 && hull.bodyOpacity === 1)),
      `${viewport.id}: the actual hull must be fully opaque before its ground contact.`);
    }
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
  // Flush the harness-only diagnostic also on early failure, before report.json.
  // Keep any native acquisition failure as the primary error.
  try { await finalizeCompositionCapture(); }
  catch (error) {
    report.passed = false; process.exitCode = 1;
    report.failure ??= { check: 'Harness auxiliary composition video finalization', message: error.message, stack: error.stack };
    console.error(error);
  }
  if (x11Client) {
    try { await x11Client.close(); }
    catch (error) {
      report.nativeCapture.closeError = error.message; report.passed = false; process.exitCode = 1;
    }
  }
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
  // Duplicate compact, existing evidence after the browser has closed so a
  // remote review can inspect CI output without changing any native capture.
  if (process.env.GITHUB_ACTIONS === 'true') {
    const review = JSON.stringify(Object.fromEntries(["schema","startedAt","finishedAt","sourceCommit","workingTreeDirty","workingTreeStatus","sourceHashes","browserVersion","browserMode","nativeCapture","scope","timing","passed","checks","captures","rejectedCaptures","captureAttempts","capturePreflights","contactObservations","resizes","ships","insertions","native","errors","consoleErrors","missingAssets","failure"]
      .filter(key => report[key] !== undefined).map(key => [key, report[key]])));
    const chunkSize = 12_000, parts = Math.ceil(review.length / chunkSize);
    for (let part = 0; part < parts; part++) console.log('QA_REVIEW_JSON ' + JSON.stringify({
      suite: 'spatial', sourceCommit: report.sourceCommit, part, parts, characters: review.length,
      text: review.slice(part * chunkSize, (part + 1) * chunkSize),
    }));
  }
  // Export existing accepted PNG bytes after every browser operation. Detail
  // files are verified lossless crops; their retained native source and pixel
  // proof accompany the log. No image is rescaled or reconstructed for review.
  if (process.env.GITHUB_ACTIONS === 'true') {
    const selectedFiles = new Set(viewports.flatMap(viewport => [
      ...['pod-triad', 'ship-triad', 'ship-cloaked-triad'].flatMap(variant =>
        ['egress-walking', 'egress-final-detail'].map(moment => `${viewport.id}-${variant}-${moment}.png`)),
      ...['atmosphere', 'decloaking', 'visible-before-contact'].map(moment =>
        `${viewport.id}-ship-cloaked-triad-${moment}.png`),
    ]));
    console.log('::group::Native arrival PNGs and verified lossless detail crops for remote review');
    for (const capture of report.captures.filter(item => selectedFiles.has(item.file))) {
      const bytes = await fs.readFile(path.join(out, capture.file));
      assert.equal(sha256(bytes), capture.sha256, 'The review log must copy exactly the recorded PNG.');
      const data = bytes.toString('base64'), chunkSize = 12_000, parts = Math.ceil(data.length / chunkSize);
      for (let part = 0; part < parts; part++) console.log('QA_REVIEW_PNG ' + JSON.stringify({
        suite: 'spatial', sourceCommit: report.sourceCommit, file: capture.file,
        sha256: capture.sha256, bytes: bytes.length, part, parts,
        evidenceKind: capture.evidenceKind ?? 'native-png',
        ...(capture.sourceCapture ? { sourceCapture: capture.sourceCapture, sourceClip: capture.sourceClip, pixelEquality: capture.pixelEquality } : {}),
        data: data.slice(part * chunkSize, (part + 1) * chunkSize),
      }));
    }
    console.log('::endgroup::');
  }
}
