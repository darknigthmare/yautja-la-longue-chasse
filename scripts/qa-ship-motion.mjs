import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

/**
 * Targeted rendering evidence for the real PlanetArrivalCinematic.
 *
 * node scripts/qa-ship-motion.mjs
 * SHIP_MOTION_VIDEO=1 node scripts/qa-ship-motion.mjs
 *
 * A disposable Vite host imports the unmodified production component. Every
 * fixture begins paused at a native shot boundary, then the normal controls and
 * native requestAnimationFrame advance it. This does not replace the renderer,
 * mutate its DOM/state, accelerate time, mock assets, or synthesize screenshots.
 * One explicitly labelled failure scenario returns HTTP 404 for optional views;
 * all other images remain real project files. No production/campaign handoff is
 * claimed by this focused component harness.
 *
 * An installed Chromium must launch under the executor's existing policy. Do
 * not add process, namespace, socket or sandbox workarounds after a denial.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.env.SHIP_MOTION_OUTPUT || 'outputs/qa-ship-motion');
const port = Number(process.env.SHIP_MOTION_HARNESS_PORT || 4288);
const headed = process.env.SHIP_MOTION_HEADED === '1';
const recordVideo = process.env.SHIP_MOTION_VIDEO === '1';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const exists = file => fs.access(file).then(() => true, () => false);
const near = (actual, expected, tolerance, label) => assert.ok(
  Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
  `${label}: observed ${actual}, expected ${expected} ± ${tolerance}`,
);
assert.ok(Number.isInteger(port) && port > 1023 && port < 65536, 'Use a valid loopback harness port.');
await fs.mkdir(out, { recursive: true });

const report = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  sourceCommit: git('rev-parse', 'HEAD'),
  workingTreeDirty: Boolean(git('status', '--porcelain')),
  scope: 'Actual-component ship-view rendering, registered hull/nozzle screen-space geometry and frozen engine effects; unchanged classic scenarios plus every inspected additional family and its consumed views; pod trio; ship insertion with and without optical camouflage; desktop 1280×720 and mobile 390×844. This is not campaign handoff, canonical art approval, or a production deployment test.',
  timing: 'Native requestAnimationFrame and ordinary Pause/Resume controls only. Requested times are thresholds. Reports retain observed elapsed times and each screenshot interval. Fixtures begin only at registered shot boundaries.',
  browserMode: headed ? 'headed' : 'headless',
  video: { requested: recordVideo, supported: null, files: [] },
  checks: [], frames: [], captures: [], launchObservations: [], registrationObservations: [], registrationDiagnostics: [],
  registrationNodeRetention: [],
  familyCoverage: [], heldViewPreparations: [], heldViewCaptureCleanupErrors: [],
  pageErrors: [], consoleErrors: [], missingAssets: [], requests: [], readinessFailures: [],
  sourceHashes: {}, assetHashes: {},
};
let browser, server, hostDir, api;
const contexts = [];
const requestedAssets = new Set();
const optionalPaths = new Set();
let currentCheck = 'setup';

async function check(name, action) {
  currentCheck = name;
  try {
    await action();
    report.checks.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.checks.push({ name, passed: false, message: error.message });
    throw error;
  }
}

async function loadFixtures() {
  const bundle = await build({
    stdin: { resolveDir: root, loader: 'ts', contents: `
      export { createPlanetArrival, inspectPlanetArrival, planetArrivalAssets, PLANET_ARRIVAL_SHOTS }
        from './app/game/systems/planetArrival';
      export { defaultSave } from './app/game/save';
      export { DEFAULT_SHIP_ID, shipProfileAssetPath } from './app/game/shipCatalogue';
      export { carrierArtForShip } from './app/game/systems/planetArrivalArt';
      export { arrivalCarrierPose, attachmentToStage } from './app/game/systems/planetArrivalSpatial';
      export { arrivalFormationSlots } from './app/game/systems/planetArrivalPresentation';
      export { ARRIVAL_SHIP_MOTION_FAMILIES, arrivalShipMotionAssetPaths, arrivalShipMotionFrame }
        from './app/game/systems/planetArrivalShipMotion';
    ` },
    bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
  });
  api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  assert.equal(api.DEFAULT_SHIP_ID, 'classic-predator-spaceship', 'Review the primary hull if the default changes.');
  const relevant = [
    'app/game/PlanetArrivalCinematic.tsx', 'app/game/PlanetArrivalCinematic.module.css',
    'app/game/HunterRigPreview.tsx', 'app/game/hunterRig.ts', 'app/game/shipCatalogue.ts',
    'app/game/worldScreens.ts', 'scripts/qa-ship-motion.mjs',
    ...(await fs.readdir(path.join(root, 'app/game/systems')))
      .filter(file => /^planetArrival.*\.ts$/.test(file))
      .map(file => `app/game/systems/${file}`),
  ].sort();
  report.sourceHashes = Object.fromEntries(await Promise.all(relevant.map(async file =>
    [file, sha256(await fs.readFile(path.join(root, file)))])));
}

async function startHost() {
  hostDir = await fs.mkdtemp(path.join(out, '.ship-motion-host-'));
  const relative = path.relative(hostDir, root).split(path.sep).join('/');
  const importPath = file => JSON.stringify(`${relative}/${file}`);
  await fs.writeFile(path.join(hostDir, 'index.html'), `<!doctype html><html lang="fr"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="icon" href="data:,"><title>Ship motion rendering audit</title>
    <style>*{box-sizing:border-box}body{margin:0;background:#070a0e;font-family:Arial,sans-serif}
    main{width:100%;max-width:1440px;margin:auto;padding:12px}@media(max-width:500px){main{padding:8px}}
    output{display:none}</style></head><body><main id="root"></main>
    <script type="module" src="/host.tsx"></script></body></html>`);
  await fs.writeFile(path.join(hostDir, 'host.tsx'), `
    import React, { useState } from 'react';
    import { createRoot } from 'react-dom/client';
    import PlanetArrivalCinematic from ${importPath('app/game/PlanetArrivalCinematic')};
    import { createPlanetArrival, inspectPlanetArrival, PLANET_ARRIVAL_SHOTS }
      from ${importPath('app/game/systems/planetArrival')};
    import { defaultSave } from ${importPath('app/game/save')};
    import { DEFAULT_SHIP_ID, isShipId } from ${importPath('app/game/shipCatalogue')};
    import { normalizePlanetInsertionPlan } from ${importPath('app/game/systems/planetInsertion')};
    const query = new URLSearchParams(location.search);
    const shipId = query.get('ship') ?? DEFAULT_SHIP_ID;
    if (!isShipId(shipId)) throw new Error('Unknown selected ship identity.');
    const shot = PLANET_ARRIVAL_SHOTS.find(item => item.id === query.get('shot'));
    const insertion = normalizePlanetInsertionPlan({ version: 1,
      method: query.get('method') ?? 'pod', team: 'triad',
      ...(query.get('cloak') === '1' ? { shipCloak: true } : {}) });
    if (!shot || !insertion) throw new Error('Unknown native ship-motion fixture.');
    const save = defaultSave('2026-11-05T00:00:00.000Z');
    const initial = { ...createPlanetArrival({ ownerCreatedAt: save.createdAt,
      runId: 'ship-motion:' + shot.id + ':' + insertion.method + ':' + Boolean(insertion.shipCloak) +
        (shipId === DEFAULT_SHIP_ID ? '' : ':' + shipId),
      missionId: 'jungle-vey', encounterRun: 1, personalShipId: shipId,
      hunterPresetId: save.appearance.presetId, insertion }),
      elapsedMs: shot.startMs, status: 'paused' as const };
    if (inspectPlanetArrival(initial).status !== 'valid') throw new Error('Invalid native arrival boundary.');
    function Host() {
      const [handoff, setHandoff] = useState('');
      const [exited, setExited] = useState(false);
      return <><PlanetArrivalCinematic state={initial} appearance={save.appearance} loadout={save.loadout}
        onCheckpoint={next => inspectPlanetArrival(next, save.createdAt, initial.runId).status === 'valid'}
        onHandoff={next => { setHandoff(next.completedBy ?? ''); return true; }}
        onExit={() => setExited(true)} />
        <output data-ship-motion-host="true" data-ship-motion-handoff={handoff} data-ship-motion-exited={exited} /></>;
    }
    createRoot(document.getElementById('root')!).render(<Host />);
  `);
  server = await createServer({
    configFile: false, root: hostDir, cacheDir: path.join(out, 'vite-cache'),
    publicDir: path.join(root, 'public'), plugins: [react()], logLevel: 'warn',
    server: { host: '127.0.0.1', port, strictPort: true, fs: { allow: [root] } },
    resolve: { alias: { '@': root, 'next/link': path.join(root, 'desktop/LocalLink.tsx') } },
  });
  await server.listen();
  report.harnessUrl = `http://127.0.0.1:${port}/`;
}

async function makeContext(viewport, video = false) {
  const options = { viewport: { width: viewport.width, height: viewport.height },
    hasTouch: viewport.id === 'mobile', reducedMotion: 'no-preference' };
  let context;
  if (video && recordVideo) {
    try {
      context = await browser.newContext({ ...options,
        recordVideo: { dir: path.join(out, 'videos'), size: options.viewport } });
      report.video.supported = true;
    } catch (error) {
      // A missing optional video encoder does not justify downloading binaries
      // or changing the browser's process policy.
      if (!/ffmpeg|video.*executable|executable.*video/i.test(error.message)) throw error;
      report.video.supported = false; report.video.reason = error.message;
    }
  }
  context ??= await browser.newContext(options);
  contexts.push(context);
  return context;
}

function watch(page, label, expectedFailures = new Set()) {
  page.setDefaultTimeout(20_000);
  page.on('pageerror', error => report.pageErrors.push({ label, message: error.message }));
  page.on('console', message => {
    if (message.type() === 'error') report.consoleErrors.push({ label, message: message.text() });
  });
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith('/game/')) requestedAssets.add(pathname);
  });
  page.on('response', response => {
    const pathname = new URL(response.url()).pathname;
    if (!pathname.startsWith('/game/')) return;
    const imageRequested = response.request().resourceType() === 'image';
    if (response.status() >= 400 || imageRequested && response.headers()['content-type']?.includes('text/html')) {
      report.missingAssets.push({ label, path: pathname, status: response.status(), expected: expectedFailures.has(pathname) });
    }
  });
}

async function openShot(page, shot, method = 'pod', cloak = false, resume = true, unavailable = new Set(), shipId = api.DEFAULT_SHIP_ID) {
  assert.ok(api.PLANET_ARRIVAL_SHOTS.some(item => item.id === shot));
  const url = new URL(report.harnessUrl);
  url.searchParams.set('shot', shot); url.searchParams.set('method', method);
  if (shipId !== api.DEFAULT_SHIP_ID) url.searchParams.set('ship', shipId);
  if (cloak) url.searchParams.set('cloak', '1');
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.bringToFront();
  await page.locator('[data-arrival-status="paused"]').waitFor({ timeout: 30_000 });
  const button = page.getByRole('button', { name: 'Reprendre l’arrivée', exact: true });
  await button.waitFor({ state: 'visible', timeout: 30_000 });
  assert.equal(await button.isEnabled(), true);
  const expectedPaths = api.arrivalShipMotionAssetPaths(shipId);
  const expectedTotal = expectedPaths.length;
  try {
    await page.waitForFunction(({ total, unavailable }) => {
      const root = document.querySelector('[data-arrival-run]');
      return root && Number(root.getAttribute('data-arrival-ship-motion-ready')) === total - unavailable &&
        Number(root.getAttribute('data-arrival-ship-motion-unavailable')) === unavailable;
    }, { total: expectedTotal, unavailable: unavailable.size ? expectedTotal : 0 }, { timeout: 15_000, polling: 'raf' });
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error;
    const diagnostic = { shot, method, cloak, shipId, expectedReady: unavailable.size ? 0 : expectedTotal,
      expectedUnavailable: unavailable.size ? expectedTotal : 0 };
    report.readinessFailures.push(diagnostic);
    try {
      diagnostic.observed = await page.evaluate(paths => {
        const root = document.querySelector('[data-arrival-run]');
        const resources = performance.getEntriesByType('resource');
        return {
          performanceMs: performance.now(), visibility: document.visibilityState,
          ready: root?.getAttribute('data-arrival-ship-motion-ready') ?? null,
          unavailable: root?.getAttribute('data-arrival-ship-motion-unavailable') ?? null,
          status: root?.getAttribute('data-arrival-status') ?? null,
          elapsedMs: root?.getAttribute('data-arrival-elapsed-exact') ?? root?.getAttribute('data-arrival-elapsed') ?? null,
          resources: paths.map(path => ({ path, entries: resources.filter(entry => new URL(entry.name).pathname === path)
            .map(entry => ({ initiatorType: entry.initiatorType, startTime: entry.startTime, fetchStart: entry.fetchStart,
              responseStart: entry.responseStart, responseEnd: entry.responseEnd, duration: entry.duration,
              transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize,
              decodedBodySize: entry.decodedBodySize, responseStatus: entry.responseStatus })) })),
          imageStatesScope: 'Mounted DOM images only; detached production preload images are not exposed.',
          mountedImages: [...document.images].map(image => ({ source: image.currentSrc || image.src,
            complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight })),
        };
      }, expectedPaths);
    } catch (observationError) { diagnostic.observationError = observationError.message; }
    try {
      const file = `readiness-failure-${report.readinessFailures.length}.png`;
      const bytes = await page.screenshot({ animations: 'allow', fullPage: true });
      await fs.writeFile(path.join(out, file), bytes);
      diagnostic.capture = { file, sha256: sha256(bytes) };
    } catch (captureError) { diagnostic.captureError = captureError.message; }
    if (diagnostic.observed) error.message += ` Readiness at timeout: ready=${diagnostic.observed.ready}, unavailable=${diagnostic.observed.unavailable}, status=${diagnostic.observed.status}, elapsedMs=${diagnostic.observed.elapsedMs}.`;
    throw error;
  }
  if (resume) {
    await button.click();
    await page.locator('[data-arrival-status="playing"]').waitFor();
  }
}

async function waitElapsed(page, elapsedMs, shot) {
  await page.waitForFunction(({ elapsedMs, shot }) => {
    const root = document.querySelector('[data-arrival-run]');
    if (!root) throw new Error('The actual component unmounted before the requested observation.');
    const status = root.getAttribute('data-arrival-status');
    if (status !== 'playing') throw new Error(`The native timeline unexpectedly became ${status}.`);
    const elapsed = Number(root.getAttribute('data-arrival-elapsed'));
    if (elapsed >= elapsedMs && root.getAttribute('data-arrival-shot') !== shot) {
      throw new Error(`Missed the requested native ${shot} shot at ${elapsedMs} ms; actual ${elapsed} ms.`);
    }
    return elapsed >= elapsedMs;
  }, { elapsedMs, shot }, { timeout: 25_000, polling: 'raf' });
}

async function frame(page) {
  return page.locator('[data-arrival-run]').evaluate(root => {
    const attribute = (element, name) => element?.getAttribute(name) ?? null;
    const rectangle = element => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
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
    const images = element => [...(element?.querySelectorAll('img') ?? [])].map(image => ({
      src: image.getAttribute('src'), complete: image.complete,
      width: image.naturalWidth, height: image.naturalHeight, opacity: opacity(image),
    }));
    const optics = element => ({
      lights: [...element.querySelectorAll('[data-arrival-light-source]')].map(item => item.getAttribute('data-arrival-light-source')),
      refractions: [...element.querySelectorAll('[data-arrival-cloak-refraction]')].map(item => ({
        source: item.getAttribute('data-arrival-cloak-refraction'), mask: getComputedStyle(item).maskImage,
        view: item.getAttribute('data-arrival-cloak-view'), transform: getComputedStyle(item).transform,
      })),
      rims: [...element.querySelectorAll('[data-arrival-cloak-rim]')].map(item => {
        const image = item.querySelector('image'), matrix = image?.getScreenCTM();
        return { source: item.getAttribute('data-arrival-cloak-rim'), href: image?.getAttribute('href'),
          view: item.getAttribute('data-arrival-cloak-view'), transform: getComputedStyle(item).transform,
          preserveAspectRatio: item.getAttribute('preserveAspectRatio'),
          sourceCanvas: { width: image?.width.baseVal.value ?? 0, height: image?.height.baseVal.value ?? 0 },
          sourcePixelCTM: matrix ? { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f } : null };
      }),
    });
    const engines = element => [...element.querySelectorAll('[data-arrival-engine]')].map(engine => ({
      kind: engine.getAttribute('data-arrival-engine'),
      view: engine.getAttribute('data-arrival-engine-view'),
      source: engine.getAttribute('data-arrival-engine-source'),
      power: Number(engine.getAttribute('data-arrival-engine-power')),
      opacity: opacity(engine), transform: getComputedStyle(engine).transform,
      origin: rectangle(engine.querySelector('[data-arrival-engine-origin]')),
      images: images(engine),
    }));
    const canvasGeometry = layer => {
      const style = getComputedStyle(layer), matrix = new DOMMatrixReadOnly(style.transform);
      const image = [...layer.querySelectorAll('img')].find(image =>
        image.getAttribute('src') === layer.getAttribute('data-arrival-ship-view-path'));
      return { sourceCanvas: { width: image?.naturalWidth ?? 0, height: image?.naturalHeight ?? 0 },
        renderedCanvas: { width: Number.parseFloat(style.width), height: Number.parseFloat(style.height) },
        linearTransform: { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d } };
    };
    const hull = element => element ? {
      view: attribute(element, 'data-arrival-ship-view'),
      from: attribute(element, 'data-arrival-ship-view-from'),
      to: attribute(element, 'data-arrival-ship-view-to'),
      mix: attribute(element, 'data-arrival-ship-view-mix'),
      path: attribute(element, 'data-arrival-ship-view-path'),
      fallback: attribute(element, 'data-arrival-ship-view-fallback'),
      calibration: attribute(element, 'data-arrival-ship-view-calibration'),
      cloak: Number(attribute(element, 'data-arrival-cloak-strength') ?? 0),
      contact: attribute(element, 'data-arrival-ship-contact'),
      transform: getComputedStyle(element).transform,
      bounds: rectangle(element), images: images(element), ...optics(element),
      anchors: Object.fromEntries(['nose', 'tail'].map(name =>
        [name, rectangle(element.querySelector(`[data-arrival-anchor="carrier-${name}"]`))])),
      engines: engines(element),
      layers: [...element.querySelectorAll('[data-arrival-ship-view-layer]')].map(layer => ({
        id: layer.getAttribute('data-arrival-ship-view-layer'),
        path: layer.getAttribute('data-arrival-ship-view-path'),
        opacity: Number(getComputedStyle(layer).opacity), transform: getComputedStyle(layer).transform,
        ...canvasGeometry(layer),
        bounds: rectangle(layer), images: images(layer), ...optics(layer),
        anchors: Object.fromEntries(['nose', 'tail'].map(name =>
          [name, rectangle(layer.querySelector(`[data-arrival-view-anchor="${name}"]`))])),
      })),
    } : null;
    const scene = root.querySelector('[data-arrival-scene]');
    return {
      observedPerformanceMs: performance.now(), elapsedMs: Number(root.getAttribute('data-arrival-elapsed')),
      elapsedExactMs: Number(root.getAttribute('data-arrival-elapsed-exact') ?? root.getAttribute('data-arrival-elapsed')),
      run: root.getAttribute('data-arrival-run'),
      captureViewport: { width: innerWidth, height: innerHeight, devicePixelRatio,
        clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight,
        scrollX, scrollY, visualViewport: window.visualViewport ? {
          width: visualViewport.width, height: visualViewport.height, scale: visualViewport.scale,
          offsetLeft: visualViewport.offsetLeft, offsetTop: visualViewport.offsetTop,
          pageLeft: visualViewport.pageLeft, pageTop: visualViewport.pageTop,
        } : null },
      shot: root.getAttribute('data-arrival-shot'), status: root.getAttribute('data-arrival-status'),
      method: root.getAttribute('data-arrival-method'), team: root.getAttribute('data-arrival-team'),
      scene: { ...rectangle(scene), ship: attribute(scene, 'data-arrival-ship') },
      stage: rectangle(root.querySelector('[data-arrival-stage]')),
      carrier: hull(root.querySelector('[data-arrival-carrier]')),
      ground: hull(root.querySelector('[data-arrival-ground-ship]')),
      anchors: [...root.querySelectorAll('[data-arrival-anchor]')].map(element => ({
        id: element.getAttribute('data-arrival-anchor'), ...rectangle(element),
      })),
      pods: [...root.querySelectorAll('[data-arrival-flight-pod]')].map(element => ({
        member: element.getAttribute('data-arrival-member'),
        launchX: Number(element.getAttribute('data-arrival-launch-x')),
        launchY: Number(element.getAttribute('data-arrival-launch-y')),
        launchMs: Number(element.getAttribute('data-arrival-launch-ms')),
        launchView: element.getAttribute('data-arrival-launch-view'),
      })),
    };
  });
}

function assertRegistration(hull) {
  for (const layer of hull.layers.filter(layer => layer.opacity > .001)) {
    for (const name of ['nose', 'tail']) {
      const source = layer.anchors[name], target = hull.anchors[name];
      assert.ok(source && target, `Both real ${layer.id}/${name} anchors must be mounted.`);
      near(Math.hypot(source.x - target.x, source.y - target.y), 0, .5,
        `${layer.id}/${name} registered pixels must coincide with the shared screen-space hull axis`);
    }
  }
}

function assertIsotropicSources(hull) {
  for (const layer of hull.layers.filter(layer => layer.opacity > .001)) {
    const { sourceCanvas: source, renderedCanvas: canvas, linearTransform: matrix } = layer;
    assert.ok(source?.width > 0 && source.height > 0 && canvas?.width > 0 && canvas.height > 0 && matrix,
      'Isotropy must be measured from a decoded source and its actual CSS canvas.');
    const x = { x: matrix.a * canvas.width / source.width, y: matrix.b * canvas.width / source.width };
    const y = { x: matrix.c * canvas.height / source.height, y: matrix.d * canvas.height / source.height };
    const sx = Math.hypot(x.x, x.y), sy = Math.hypot(y.x, y.y);
    assert.ok(sx > 0 && sy > 0);
    // Computed CSS matrices and dimensions are serialized at finite precision.
    // These relative guards inspect both pixel axes, independently of anchors.
    near(sx / sy, 1, .0001, `${layer.id} source-pixel scale must be isotropic`);
    near((x.x * y.x + x.y * y.y) / (sx * sy), 0, .0001, `${layer.id} source-pixel axes must remain perpendicular`);
    assert.ok(matrix.a * matrix.d - matrix.b * matrix.c > 0, 'Local registration must not introduce a reflection.');
  }
}

function assertRimRegistration(hull, shipId) {
  for (const layer of hull.layers.filter(layer => layer.opacity > .001)) {
    const rims = hull.rims.filter(rim => rim.view === layer.id);
    assert.equal(rims.length, 1, 'Every painted optical view needs one actual SVG image for pixel registration.');
    const rim = rims[0], matrix = rim.sourcePixelCTM;
    const art = layer.id === 'profile' ? api.carrierArtForShip(shipId)
      : api.ARRIVAL_SHIP_MOTION_FAMILIES[shipId]?.views[layer.id]?.art;
    assert.ok(art && matrix && ['a', 'b', 'c', 'd', 'e', 'f'].every(key => Number.isFinite(matrix[key])),
      'The native SVG image CTM must map its calibrated source pixels into the viewport.');
    assert.equal(rim.source, layer.path); assert.equal(rim.href, layer.path);
    assert.deepEqual([rim.sourceCanvas.width, rim.sourceCanvas.height], [art.width, art.height]);
    const sx = Math.hypot(matrix.a, matrix.b), sy = Math.hypot(matrix.c, matrix.d);
    assert.ok(sx > 0 && sy > 0);
    near(sx / sy, 1, .0001, `${layer.id} SVG source-pixel scale must be isotropic`);
    near((matrix.a * matrix.c + matrix.b * matrix.d) / (sx * sy), 0, .0001,
      `${layer.id} SVG source-pixel axes must remain perpendicular`);
    // This screen matrix includes the intentional carrier-facing mirror.
    // Its determinant may be negative; both real paint anchors remain decisive.
    for (const name of ['nose', 'tail']) {
      const x = art[name].x * art.width, y = art[name].y * art.height;
      const painted = layer.anchors[name];
      assert.ok(painted, `The painted ${layer.id}/${name} anchor must exist beside its rim.`);
      near(Math.hypot(matrix.a * x + matrix.c * y + matrix.e - painted.x,
        matrix.b * x + matrix.d * y + matrix.f - painted.y), 0, .5,
      `${layer.id}/${name} SVG source pixels must coincide with the actual painted layer`);
    }
  }
}

function assertEngines(hull, expected = false) {
  const visibleRear = hull.layers.filter(layer =>
    layer.opacity > .001 && ['rear-quarter', 'rear-quarter-shallow'].includes(layer.id));
  for (const engine of hull.engines) {
    assert.ok(visibleRear.some(layer => layer.id === engine.view),
      'An engine effect must belong to a currently rendered, inspected rear view.');
    assert.ok(['core', 'plume'].includes(engine.kind));
    assert.ok(Number.isFinite(engine.power) && engine.power > 0 && engine.power <= 1,
      'The real engine intensity must be bounded and visible.');
    assert.ok(engine.origin && Number.isFinite(engine.origin.x) && Number.isFinite(engine.origin.y));
    assert.ok(engine.images.some(image => image.src === engine.source && image.complete && image.width > 0),
      `The ${engine.kind} engine effect must use its own decoded source.`);
  }
  for (const view of new Set(hull.engines.map(engine => engine.view))) {
    const entries = hull.engines.filter(engine => engine.view === view);
    assert.equal(entries.length, 2, 'Each visible nozzle must use one core and one plume.');
    const core = entries.find(engine => engine.kind === 'core');
    const plume = entries.find(engine => engine.kind === 'plume');
    assert.ok(core && plume);
    near(Math.hypot(core.origin.x - plume.origin.x, core.origin.y - plume.origin.y), 0, .5,
      `${view} core and plume must share the exact rendered nozzle origin`);
  }
  if (!visibleRear.length) assert.equal(hull.engines.length, 0, 'No engine may appear on an occulted nozzle or fallback profile.');
  if (expected) {
    assert.equal(visibleRear.length, 1, 'Observe the held rear view to check its engine.');
    assert.equal(hull.engines.length, 2, 'Both rear engine effects must actually be mounted.');
    assert.ok(hull.engines.every(engine => engine.opacity > .001), 'Both rear engine effects must actually be visible.');
  }
}

function assertHull(snapshot, { ground = false, cloak = false, generated = false, engines = false,
  shipId = api.DEFAULT_SHIP_ID } = {}) {
  const hull = ground ? snapshot.ground : snapshot.carrier;
  assert.ok(hull, `A real ${ground ? 'grounded' : 'flying'} hull must be mounted.`);
  assert.equal(snapshot.scene.ship, shipId, 'The selected hull identity must not change.');
  near(snapshot.stage.width / snapshot.stage.height, 1280 / 720, .00001, 'Isotropic stage');
  assert.ok(hull.bounds.width > 0 && hull.bounds.height > 0, 'The hull must occupy a real rendered box.');
  assert.ok(hull.images.some(image => image.complete && image.width > 0 && image.opacity > .001),
    'At least one real, decoded hull image must remain visible.');
  if (!ground) {
    assert.ok(hull.view && hull.from && hull.to !== null && hull.path, 'The real renderer must identify its current view.');
    assert.ok(Number(hull.mix) >= 0 && Number(hull.mix) <= 1, 'The reported native view mix must be finite.');
    assert.ok(hull.layers.length > 0, 'The actual hull must render registered view layers.');
    assertRegistration(hull);
    assertEngines(hull, engines);
    if (shipId !== api.DEFAULT_SHIP_ID) {
      assertIsotropicSources(hull);
      if (cloak && hull.cloak > 0) assertRimRegistration(hull, shipId);
      assert.equal(hull.engines.length, 0, 'Additional hulls have no inspected engine-effect sockets.');
      const expected = api.arrivalShipMotionFrame(shipId, snapshot.elapsedExactMs, snapshot.method, false,
        hull.fallback === 'true' ? api.arrivalShipMotionAssetPaths(shipId) : []);
      const views = [{ view: expected.from, opacity: 1 - expected.mix },
        ...(expected.to ? [{ view: expected.to, opacity: expected.mix }] : [])].filter(item => item.opacity > 0);
      assert.equal(hull.layers.length, views.length);
      for (const { view, opacity } of views) {
        const layers = hull.layers.filter(layer => layer.id === view.id);
        assert.equal(layers.length, 1); assert.equal(layers[0].path, view.path);
        near(layers[0].opacity, opacity, .002, 'The selected hull must retain its exact native view mixture');
      }
    }
    for (const layer of hull.layers.filter(layer => layer.opacity > .001)) {
      assert.ok(layer.images.some(image => image.src === layer.path && image.complete && image.width > 0),
        `Visible ${layer.id} layer must use its own decoded source ${layer.path}.`);
      assert.ok(layer.lights.every(source => source === layer.path), 'Lighting masks must follow each view source.');
      if (shipId === api.DEFAULT_SHIP_ID && layer.path !== api.shipProfileAssetPath(shipId)) optionalPaths.add(layer.path);
      if (cloak && hull.cloak > 0) {
        const refractions = hull.refractions.filter(item => item.view === layer.id);
        const rims = hull.rims.filter(item => item.view === layer.id);
        assert.equal(refractions.length, 1, 'Each active view must have one matching refraction layer.');
        assert.equal(rims.length, 1, 'Each active view must have one matching rim layer.');
        for (const refraction of refractions) {
          assert.equal(refraction.source, layer.path);
          assert.ok(refraction.mask.includes(layer.path), 'The alpha mask must match the moving hull view.');
          assert.equal(refraction.transform, layer.transform, 'Refraction must keep the hull view registration.');
        }
        for (const rim of rims) {
          assert.equal(rim.source, layer.path); assert.equal(rim.href, layer.path);
          assert.equal(rim.transform, layer.transform, 'The rim must keep the hull view registration.');
        }
      }
    }
    if (generated) assert.ok(hull.layers.some(layer => layer.opacity > .05 &&
      layer.path !== api.shipProfileAssetPath(shipId)), 'A real authored additional view must be visible.');
  } else {
    assert.equal(hull.engines.length, 0, 'The parked catalogue hull must not retain flight engine effects.');
    const expected = api.shipProfileAssetPath(shipId);
    assert.ok(hull.images.every(image => image.src === expected), 'The grounded hull must return to the catalogue profile.');
    assert.ok(hull.lights.every(source => source === expected), 'Ground lighting must use that same profile.');
  }
  if (snapshot.method === 'ship') assert.equal(snapshot.pods.length, 0, 'Surface insertion must not launch capsules.');
}

async function capture(page, label, options) {
  const before = await frame(page);
  assertHull(before, options);
  const filename = `${label}.png`;
  const bytes = await page.locator('[data-arrival-scene]').screenshot({ animations: 'allow' });
  const after = await frame(page);
  await fs.writeFile(path.join(out, filename), bytes);
  report.frames.push({ label, ...before });
  report.captures.push({ label, file: filename, sha256: sha256(bytes),
    before: { elapsedMs: before.elapsedMs, shot: before.shot, view: before.carrier?.view ?? 'ground-profile' },
    after: { elapsedMs: after.elapsedMs, elapsedExactMs: after.elapsedExactMs, shot: after.shot,
      view: after.carrier?.view ?? 'ground-profile', from: after.carrier?.from ?? null,
      to: after.carrier?.to ?? null, mix: after.carrier?.mix ?? null } });
  assert.equal(after.shot, before.shot, 'A photograph must remain within its reported native shot.');
  return before;
}

const heldViewCaptureParameters = Object.freeze({
  format: 'png', fromSurface: true, captureBeyondViewport: false, optimizeForSpeed: true,
});

function assertHeldViewViewport(snapshot, viewport) {
  const actual = snapshot.captureViewport, scene = snapshot.scene;
  assert.deepEqual([actual.width, actual.height, actual.devicePixelRatio], [viewport.width, viewport.height, 1],
    'A held-view photograph must retain the configured CSS viewport and one source pixel per CSS pixel.');
  assert.ok(actual.visualViewport, 'The native visible viewport must be observable.');
  assert.deepEqual([actual.visualViewport.scale, actual.visualViewport.offsetLeft, actual.visualViewport.offsetTop,
    actual.visualViewport.pageLeft, actual.visualViewport.pageTop], [1, 0, 0, actual.scrollX, actual.scrollY],
  'The native full-viewport photograph must not introduce zoom or a visual viewport offset.');
  assert.ok([scene.x, scene.y, scene.width, scene.height, actual.scrollX, actual.scrollY,
    actual.clientWidth, actual.clientHeight, actual.visualViewport.width, actual.visualViewport.height].every(Number.isFinite));
  // Native scrollbars may make the visible/client area narrower than innerWidth.
  const visibleWidth = Math.min(actual.clientWidth, actual.visualViewport.width);
  const visibleHeight = Math.min(actual.clientHeight, actual.visualViewport.height);
  assert.ok(visibleWidth > 0 && visibleHeight > 0 && actual.clientWidth <= actual.width &&
    actual.visualViewport.width <= actual.width && actual.clientHeight <= actual.height &&
    actual.visualViewport.height <= actual.height);
  assert.ok(scene.width > 0 && scene.height > 0 && scene.x >= 0 && scene.y >= 0 &&
    scene.x + scene.width <= visibleWidth && scene.y + scene.height <= visibleHeight,
  'The complete actual arrival scene must lie inside the native viewport photograph.');
}

function assertHeldViewPng(bytes, viewport) {
  assert.ok(bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.toString('ascii', 12, 16) === 'IHDR', 'Keep a native PNG with its real IHDR dimensions.');
  assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [viewport.width, viewport.height],
    'The untouched held-view PNG must contain exactly the configured full viewport at DPR 1.');
}

async function prepareHeldViewCapture(page, viewport, shipId, firstRequestedAt) {
  const startedNodeMs = performance.now();
  // Native scrolling and font readiness happen before the requested pose, not
  // inside its before -> PNG -> after bracket. The timeline keeps running.
  await page.locator('[data-arrival-scene]').scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready.then(() => null));
  const snapshot = await frame(page);
  const preparation = { id: `held-view-${report.heldViewPreparations.length + 1}`, shipId,
    viewport: { ...viewport }, firstRequestedAt, startedNodeMs, completedNodeMs: performance.now(),
    run: snapshot.run, method: snapshot.method, shot: snapshot.shot, elapsedExactMs: snapshot.elapsedExactMs,
    scene: snapshot.scene, captureViewport: snapshot.captureViewport,
    captureMode: 'native-cdp-full-viewport-png', parameters: heldViewCaptureParameters };
  report.heldViewPreparations.push(preparation);
  assert.equal(snapshot.status, 'playing'); assert.equal(snapshot.scene.ship, shipId);
  assertHeldViewViewport(snapshot, viewport);
  assert.ok(snapshot.elapsedExactMs < firstRequestedAt,
    'Native full-viewport preparation must finish before the unchanged first held-pose threshold.');
  return preparation;
}

async function captureHeldView(page, session, preparation, label, options) {
  const startedNodeMs = performance.now();
  const before = await frame(page);
  const beforeReadCompletedNodeMs = performance.now();
  assertHull(before, options);
  assertHeldViewViewport(before, preparation.viewport);
  assert.equal(before.status, 'playing'); assert.equal(before.run, preparation.run);
  assert.deepEqual(before.captureViewport, preparation.captureViewport,
    'The prepared native viewport and scroll position must still be current.');
  // This dedicated session never sets Emulation or sends a clip. Unlike the
  // element screenshot pipeline, no scrolling/stability/font work occurs here.
  // optimizeForSpeed changes PNG encoding effort, not pixels; its gain is unproven.
  const captureStartedNodeMs = performance.now();
  const screenshot = await session.send('Page.captureScreenshot', heldViewCaptureParameters);
  const captureCompletedNodeMs = performance.now();
  let after, observationError;
  try { after = await frame(page); } catch (error) { observationError = error; }
  const afterReadCompletedNodeMs = performance.now();
  // Preserve the original full PNG after both observations, including a source
  // whose after-observation or strict held-pose guard subsequently rejects it.
  const bytes = Buffer.from(screenshot.data, 'base64'), filename = `${label}.png`;
  await fs.writeFile(path.join(out, filename), bytes);
  report.frames.push({ label, ...before });
  const recorded = { label, file: filename, sha256: sha256(bytes),
    captureMode: preparation.captureMode, parameters: heldViewCaptureParameters, preparationId: preparation.id,
    viewport: preparation.viewport, sceneBefore: before.scene, sceneAfter: after?.scene ?? null,
    captureViewportBefore: before.captureViewport, captureViewportAfter: after?.captureViewport ?? null,
    timings: { beforeReadMs: beforeReadCompletedNodeMs - startedNodeMs,
      screenshotRpcMs: captureCompletedNodeMs - captureStartedNodeMs,
      afterReadMs: afterReadCompletedNodeMs - captureCompletedNodeMs },
    before: { elapsedMs: before.elapsedMs, elapsedExactMs: before.elapsedExactMs, shot: before.shot, view: before.carrier?.view },
    after: after ? { elapsedMs: after.elapsedMs, elapsedExactMs: after.elapsedExactMs, shot: after.shot,
      view: after.carrier?.view, from: after.carrier?.from ?? null,
      to: after.carrier?.to ?? null, mix: after.carrier?.mix ?? null } : null };
  report.captures.push(recorded);
  try {
    if (observationError) throw observationError;
    assertHeldViewPng(bytes, preparation.viewport);
    assertHeldViewViewport(after, preparation.viewport);
    assert.equal(after.status, 'playing'); assert.equal(after.run, before.run);
    assert.equal(after.shot, before.shot, 'A photograph must remain within its reported native shot.');
    assert.deepEqual(after.scene, before.scene, 'The complete scene geometry must stay fixed throughout the native photograph.');
    assert.deepEqual(after.captureViewport, before.captureViewport,
      'Viewport, scroll, DPR and visual viewport must stay fixed throughout the native photograph.');
  } catch (error) {
    recorded.rejected = { message: error.message, afterObservationFailed: Boolean(observationError) };
    throw error;
  }
  return before;
}

function expectedLaunch(slot) {
  const art = api.carrierArtForShip(api.DEFAULT_SHIP_ID);
  const facing = art.nose.x < art.tail.x ? -1 : 1;
  const width = 550, height = width * art.height / art.width;
  const heading = Math.atan2((art.nose.y - art.tail.y) * art.height,
    (art.nose.x - art.tail.x) * art.width * facing) * 180 / Math.PI;
  const pose = api.arrivalCarrierPose('release', slot.delayMs / 8000);
  return api.attachmentToStage({ ...pose, angle: pose.angle - heading },
    (art.release.x - .5) * width * facing, (art.release.y - .5) * height);
}

async function observeLaunches(page) {
  return page.locator('[data-arrival-run]').evaluate(root => new Promise((resolve, reject) => {
    const seen = new Map();
    const observer = new MutationObserver(inspect);
    const timeout = setTimeout(() => finish(new Error('Three native pod launches were not observed.')), 18_000);
    function finish(error) { observer.disconnect(); clearTimeout(timeout); if (error) reject(error); else resolve([...seen.values()]); }
    function inspect() {
      if (!root.isConnected) { finish(new Error('The real arrival unmounted before launch observation.')); return; }
      for (const pod of root.querySelectorAll('[data-arrival-flight-pod]')) {
        const member = pod.getAttribute('data-arrival-member');
        if (seen.has(member)) continue;
        const stage = root.querySelector('[data-arrival-stage]').getBoundingClientRect();
        const release = root.querySelector('[data-arrival-anchor="carrier-release"]')?.getBoundingClientRect();
        seen.set(member, { member, elapsedMs: Number(root.getAttribute('data-arrival-elapsed')),
          launchMs: Number(pod.getAttribute('data-arrival-launch-ms')),
          launchX: Number(pod.getAttribute('data-arrival-launch-x')),
          launchY: Number(pod.getAttribute('data-arrival-launch-y')),
          launchView: pod.getAttribute('data-arrival-launch-view'),
          carrierView: root.querySelector('[data-arrival-carrier]')?.getAttribute('data-arrival-ship-view'),
          releaseAtObservation: release ? { x: (release.x - stage.x) / (stage.width / 1280),
            y: (release.y - stage.y) / (stage.height / 720) } : null,
        });
      }
      if (seen.size === 3) finish();
    }
    observer.observe(root, { subtree: true, childList: true, attributes: true });
    inspect();
  }));
}

/** Read registered pixels at real intermediate frame commits; never seek or
 * force a frame. Multiple samples per dissolve cover both contributing views. */
async function observeRegistrationBlends(page, untilMs) {
  return page.locator('[data-arrival-run]').evaluate((root, untilMs) => new Promise((resolve, reject) => {
    const seen = new Set(), observations = [];
    // Identity is measured from the actual DOM objects, without attributes or
    // source-path-derived identifiers. Its scope is this observer.
    const observedNodes = new WeakMap();
    let nextNode = 1, inactiveShallow = null;
    const nodeIdentity = node => {
      if (!node) return null;
      if (!observedNodes.has(node)) observedNodes.set(node, nextNode++);
      return observedNodes.get(node);
    };
    const observer = new MutationObserver(inspect);
    const timeout = setTimeout(() => finish(new Error('The native view-registration interval did not complete.')), 30_000);
    const rectangle = element => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    const canvasGeometry = layer => {
      const style = getComputedStyle(layer), matrix = new DOMMatrixReadOnly(style.transform);
      const image = [...layer.querySelectorAll('img')].find(image =>
        image.getAttribute('src') === layer.getAttribute('data-arrival-ship-view-path'));
      return { sourceCanvas: { width: image?.naturalWidth ?? 0, height: image?.naturalHeight ?? 0 },
        sourceImage: { found: Boolean(image), src: image?.getAttribute('src') ?? null,
          currentSrc: image?.currentSrc ?? null, complete: image?.complete ?? null,
          naturalWidth: image?.naturalWidth ?? null, naturalHeight: image?.naturalHeight ?? null,
          nodeIdentity: nodeIdentity(image), connected: image?.isConnected ?? false,
          parentIdentity: nodeIdentity(image?.parentElement) },
        slotNode: { identity: nodeIdentity(layer), connected: layer.isConnected,
          parentIdentity: nodeIdentity(layer.parentElement) },
        renderedCanvas: { width: Number.parseFloat(style.width), height: Number.parseFloat(style.height) },
        linearTransform: { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d } };
    };
    function finish(error) {
      observer.disconnect(); clearTimeout(timeout);
      if (error) reject(error); else resolve(observations);
    }
    function inspect() {
      if (!root.isConnected) { finish(new Error('The arrival unmounted during native registration observation.')); return; }
      const elapsedMs = Number(root.getAttribute('data-arrival-elapsed'));
      if (elapsedMs >= untilMs) { finish(); return; }
      if (root.getAttribute('data-arrival-status') !== 'playing') {
        finish(new Error('The native view-registration interval stopped playing.')); return;
      }
      const hull = root.querySelector('[data-arrival-carrier]');
      if (!hull) return;
      const from = hull.getAttribute('data-arrival-ship-view-from');
      const to = hull.getAttribute('data-arrival-ship-view-to');
      const mix = Number(hull.getAttribute('data-arrival-ship-view-mix'));
      if (from === 'bank-dorsal' && !to && mix === 0) {
        const slot = hull.querySelector('[data-arrival-retained-view="bank-dorsal-shallow"]');
        inactiveShallow = { elapsedMs, from, to, mix, found: Boolean(slot),
          retainedView: slot?.getAttribute('data-arrival-retained-view') ?? null,
          path: slot?.getAttribute('data-arrival-ship-view-path') ?? null,
          opacity: slot ? Number(getComputedStyle(slot).opacity) : null,
          geometry: slot ? canvasGeometry(slot) : null };
      }
      if (!to || from === to || mix <= .03 || mix >= .97) return;
      const key = `${from}:${to}:${Math.floor(mix * 4)}`;
      if (seen.has(key)) return;
      seen.add(key);
      observations.push({ elapsedMs, from, to, mix, inactiveShallow,
        cloak: Number(hull.getAttribute('data-arrival-cloak-strength') ?? 0),
        rims: [...hull.querySelectorAll('[data-arrival-cloak-rim]')].map(item => {
          const image = item.querySelector('image'), matrix = image?.getScreenCTM();
          return { source: item.getAttribute('data-arrival-cloak-rim'), href: image?.getAttribute('href'),
            view: item.getAttribute('data-arrival-cloak-view'), preserveAspectRatio: item.getAttribute('preserveAspectRatio'),
            sourceCanvas: { width: image?.width.baseVal.value ?? 0, height: image?.height.baseVal.value ?? 0 },
            sourcePixelCTM: matrix ? { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f } : null };
        }),
        anchors: Object.fromEntries(['nose', 'tail'].map(name =>
          [name, rectangle(hull.querySelector(`[data-arrival-anchor="carrier-${name}"]`))])),
        layers: [...hull.querySelectorAll('[data-arrival-ship-view-layer]')].map(layer => ({
          id: layer.getAttribute('data-arrival-ship-view-layer'),
          path: layer.getAttribute('data-arrival-ship-view-path'),
          opacity: Number(getComputedStyle(layer).opacity), transform: getComputedStyle(layer).transform,
          ...canvasGeometry(layer),
          anchors: Object.fromEntries(['nose', 'tail'].map(name =>
            [name, rectangle(layer.querySelector(`[data-arrival-view-anchor="${name}"]`))])),
        })),
      });
    }
    observer.observe(root, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['data-arrival-elapsed', 'data-arrival-ship-view-mix'] });
    inspect();
  }), untilMs);
}

const registrationError = error => error ? { name: error.name, message: error.message, stack: error.stack } : null;

/** Preserve the raw result before validation, including results whose caller
 * stops earlier. Diagnostics never count as validated registration evidence. */
function retainRegistrationResult(pending, context) {
  const retain = result => {
    const diagnostic = { ...context, observations: result.observations ?? null,
      observer: { status: result.error ? 'failed' : 'completed', error: registrationError(result.error) },
      validation: { status: 'not-run', stage: null, observationIndex: null, error: null } };
    report.registrationDiagnostics.push(diagnostic);
    return { ...result, diagnostic };
  };
  // A rejected observer returned no batch; its unreturned samples remain unknown.
  return pending.then(observations => retain({ observations }),
    error => retain({ error, observations: null }));
}

function validateRegistrationResult(result, validate) {
  const validation = result.diagnostic.validation;
  validation.status = 'running'; validation.stage = 'result';
  try {
    validate();
    validation.status = 'passed'; validation.stage = 'complete'; validation.observationIndex = null;
  } catch (error) {
    validation.status = 'failed'; validation.error = registrationError(error);
    throw error;
  }
}

function assertRegistrationNodeRetention(observations, optical) {
  const identities = new Map();
  let repeatedSourceSamples = 0;
  const ancestry = layer => ({ image: layer.sourceImage.nodeIdentity,
    imageParent: layer.sourceImage.parentIdentity, slot: layer.slotNode?.identity,
    slotParent: layer.slotNode?.parentIdentity });
  for (const observation of observations) {
    for (const layer of observation.layers) {
      const identity = layer.sourceImage?.nodeIdentity;
      assert.ok(layer.sourceImage?.found && Number.isInteger(identity) && identity > 0,
        'Every active view must expose the identity of its actual HTML image node.');
      assert.ok(layer.sourceImage.connected && layer.slotNode?.connected &&
        Object.values(ancestry(layer)).every(value => Number.isInteger(value) && value > 0),
      'The observed active image, keyed slot and their parents must be connected real nodes.');
      if (identities.has(layer.path)) {
        assert.equal(identity, identities.get(layer.path).image, 'A returning view must retain the same real HTML image node.');
        assert.deepEqual(ancestry(layer), identities.get(layer.path), 'The retained image and slot must keep their actual parents.');
        repeatedSourceSamples++;
      } else identities.set(layer.path, ancestry(layer));
    }
  }
  let dorsalReturn = null;
  if (!optical) {
    const before = observations.find(item => item.from === 'bank-dorsal-shallow' && item.to === 'bank-dorsal');
    const after = observations.find(item => item.from === 'bank-dorsal' && item.to === 'bank-dorsal-shallow');
    assert.ok(before && after && before.elapsedMs < after.elapsedMs,
      'Observe the shallow view on both sides of the intervening native dorsal hold.');
    const first = before.layers.find(layer => layer.id === 'bank-dorsal-shallow');
    const returned = after.layers.find(layer => layer.id === 'bank-dorsal-shallow');
    const inactive = after.inactiveShallow;
    assert.ok(first && returned);
    assert.ok(inactive?.found && before.elapsedMs < inactive.elapsedMs && inactive.elapsedMs < after.elapsedMs,
      'The actual retained shallow slot must be observed strictly between its two active uses.');
    assert.equal(inactive.retainedView, 'bank-dorsal-shallow');
    assert.equal(inactive.opacity, 0, 'The retained interval must have actual computed opacity zero.');
    assert.ok(inactive.geometry?.sourceImage.found && inactive.geometry.sourceImage.connected &&
      inactive.geometry.slotNode.connected, 'The inactive image and keyed slot must remain connected.');
    assert.equal(inactive.path, first.path);
    assert.equal(inactive.geometry.sourceImage.src, first.path);
    assert.deepEqual(ancestry(inactive.geometry), ancestry(first),
      'The zero-opacity interval must retain the actual image, keyed slot and both parents.');
    assert.equal(returned.path, first.path);
    assert.equal(returned.sourceImage.nodeIdentity, first.sourceImage.nodeIdentity,
      'The shallow view must reuse its image node after its zero-opacity interval.');
    dorsalReturn = { path: first.path, nodeIdentity: first.sourceImage.nodeIdentity, ancestry: ancestry(first),
      beforeElapsedMs: before.elapsedMs, inactive, afterElapsedMs: after.elapsedMs };
  }
  return { identityBasis: 'WeakMap keyed by actual image, slot and parent DOM objects within this observer',
    sourceNodes: identities.size, repeatedSourceSamples, dorsalReturn };
}

async function capsuleRoute(page, viewport) {
  await openShot(page, 'carrier');
  await waitElapsed(page, 14_600, 'carrier');
  await capture(page, `${viewport.id}-orbital-approach`, { generated: true });
  // Catch now so an earlier scenario failure cannot leave an unhandled page
  // evaluation when the browser closes. The result is still asserted below.
  const registration = retainRegistrationResult(observeRegistrationBlends(page, 26_700),
    { viewport: viewport.id, shipId: api.DEFAULT_SHIP_ID, method: 'pod', optical: false, untilMs: 26_700 });
  await waitElapsed(page, 20_500, 'carrier');
  await capture(page, `${viewport.id}-orbital-dorsal-bank`);
  const launches = await observeLaunches(page);
  const slots = api.arrivalFormationSlots('triad');
  assert.deepEqual(launches.map(item => item.member), slots.map(slot => slot.id));
  for (const slot of slots) {
    const observed = launches.find(item => item.member === slot.id);
    const expected = expectedLaunch(slot);
    near(observed.launchX, expected.x, .00001, `${slot.id} canonical launch X`);
    near(observed.launchY, expected.y, .00001, `${slot.id} canonical launch Y`);
    assert.equal(observed.launchMs, 23_000 + slot.delayMs);
    assert.equal(observed.launchView, 'profile');
    assert.equal(observed.carrierView, 'profile', 'The carrier must hold its registered launch silhouette for the whole trio.');
    assert.ok(observed.elapsedMs >= observed.launchMs && observed.elapsedMs - observed.launchMs <= 350,
      'Record the first rendered launch within an actual native frame interval.');
  }
  report.launchObservations.push({ viewport: viewport.id, launches });
  await waitElapsed(page, 23_800, 'release');
  const released = await capture(page, `${viewport.id}-triad-release-profile`);
  assert.equal(released.pods.length, 3);
  for (const pod of released.pods) {
    const launch = launches.find(item => item.member === pod.member);
    assert.deepEqual([pod.launchX, pod.launchY, pod.launchMs], [launch.launchX, launch.launchY, launch.launchMs],
      'Each released capsule must retain its own original socket after the carrier moves.');
  }
  await waitElapsed(page, 26_700, 'release');
  await capture(page, `${viewport.id}-departure-three-quarter`, { generated: true, engines: true });
  const observed = await registration;
  validateRegistrationResult(observed, () => {
    if (observed.error) throw observed.error;
    assert.ok(observed.observations.length >= 2, 'Inspect actual intermediate mixtures, not only held endpoints.');
    let observationIndex = 0;
    for (const observation of observed.observations) {
      observed.diagnostic.validation.stage = 'observations';
      observed.diagnostic.validation.observationIndex = observationIndex++;
      assert.equal(observation.layers.length, 2, 'Both real view layers must be present during a dissolve.');
      assertRegistration(observation);
      for (const layer of observation.layers) {
        if (layer.path !== api.shipProfileAssetPath(api.DEFAULT_SHIP_ID)) optionalPaths.add(layer.path);
      }
    }
    observed.diagnostic.validation.stage = 'node-retention'; observed.diagnostic.validation.observationIndex = null;
    const retention = assertRegistrationNodeRetention(observed.observations, false);
    report.registrationNodeRetention.push({ viewport: viewport.id, shipId: api.DEFAULT_SHIP_ID, optical: false, ...retention });
    report.registrationObservations.push({ viewport: viewport.id, observations: observed.observations });
  });
  await pauseAndResume(page, { reuseScene: true, engines: true, label: `${viewport.id}-native-pause-held-engine` });
}

const signature = snapshot => ({ elapsedMs: snapshot.elapsedMs,
  view: snapshot.carrier && {
    id: snapshot.carrier.view, from: snapshot.carrier.from, to: snapshot.carrier.to,
    mix: snapshot.carrier.mix, path: snapshot.carrier.path,
    layers: snapshot.carrier.layers.map(layer => ({ id: layer.id, path: layer.path, opacity: layer.opacity })),
    engines: snapshot.carrier.engines.map(engine => ({ kind: engine.kind, view: engine.view, source: engine.source, power: engine.power })),
  },
});

async function pauseAndResume(page, { reuseScene = false, engines = false, label = 'native-pause-held-view' } = {}) {
  if (!reuseScene) {
    await openShot(page, 'carrier');
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-arrival-status="playing"]');
      const hull = root?.querySelector('[data-arrival-carrier]');
      const mix = Number(hull?.getAttribute('data-arrival-ship-view-mix'));
      return hull && hull.getAttribute('data-arrival-ship-view-from') !== hull.getAttribute('data-arrival-ship-view-to') && mix > .1 && mix < .7;
    }, null, { timeout: 14_000, polling: 'raf' });
  }
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.locator('[data-arrival-status="paused"]').waitFor();
  const paused = await frame(page); assertHull(paused, { engines });
  await page.waitForTimeout(350);
  const held = await frame(page);
  assert.deepEqual(signature(held), signature(paused), 'Native pause must freeze the actual view, mix and source layers.');
  assert.deepEqual(held.carrier.layers, paused.carrier.layers, 'The displayed layer geometry and optics must stay frozen.');
  assert.deepEqual(held.carrier.engines, paused.carrier.engines, 'Engine intensity, image and real nozzle geometry must stay frozen.');
  const resumedCommit = page.locator('[data-arrival-run]').evaluate(root => new Promise((resolve, reject) => {
    const observer = new MutationObserver(inspect);
    const timeout = setTimeout(() => finish(new Error('No ordinary native Resume commit was observed.')), 5000);
    function finish(error, value) { observer.disconnect(); clearTimeout(timeout); if (error) reject(error); else resolve(value); }
    function inspect() {
      if (!root.isConnected) { finish(new Error('The paused arrival was replaced.')); return; }
      if (root.getAttribute('data-arrival-status') !== 'playing') return;
      const hull = root.querySelector('[data-arrival-carrier]');
      finish(null, { elapsedMs: Number(root.getAttribute('data-arrival-elapsed')), view: hull && {
        id: hull.getAttribute('data-arrival-ship-view'), from: hull.getAttribute('data-arrival-ship-view-from'),
        to: hull.getAttribute('data-arrival-ship-view-to'), mix: hull.getAttribute('data-arrival-ship-view-mix'),
        path: hull.getAttribute('data-arrival-ship-view-path'),
        layers: [...hull.querySelectorAll('[data-arrival-ship-view-layer]')].map(layer => ({
          id: layer.getAttribute('data-arrival-ship-view-layer'), path: layer.getAttribute('data-arrival-ship-view-path'),
          opacity: Number(getComputedStyle(layer).opacity),
        })),
        engines: [...hull.querySelectorAll('[data-arrival-engine]')].map(engine => ({
          kind: engine.getAttribute('data-arrival-engine'), view: engine.getAttribute('data-arrival-engine-view'),
          source: engine.getAttribute('data-arrival-engine-source'), power: Number(engine.getAttribute('data-arrival-engine-power')),
        })),
      } });
    }
    observer.observe(root, { attributes: true, attributeFilter: ['data-arrival-status'] }); inspect();
  }));
  await page.getByRole('button', { name: 'Reprendre l’arrivée', exact: true }).click();
  assert.deepEqual(await resumedCommit, signature(paused), 'Resume must preserve the exact saved view before the next native animation frame.');
  report.frames.push({ label, ...paused });
  await page.waitForTimeout(350);
  const advanced = await frame(page);
  assert.ok(advanced.elapsedMs > paused.elapsedMs, 'The ordinary timeline must continue after Resume.');
}

async function shipRoute(page, viewport, cloak) {
  const prefix = `${viewport.id}-ship-${cloak ? 'cloaked' : 'visible'}`;
  await openShot(page, 'release', 'ship', cloak);
  await waitElapsed(page, 25_600, 'release');
  await capture(page, `${prefix}-deorbit`, { cloak, generated: true });
  await waitElapsed(page, 34_200, 'descent');
  await capture(page, `${prefix}-descent`, { cloak, generated: true });
  await openShot(page, 'atmosphere', 'ship', cloak);
  await waitElapsed(page, 43_300, 'atmosphere');
  await capture(page, `${prefix}-atmospheric-flight`, { cloak, generated: true });
  await openShot(page, 'landing', 'ship', cloak);
  await waitElapsed(page, 54_300, 'landing');
  const grounded = await capture(page, `${prefix}-catalogue-contact`, { ground: true, cloak });
  assert.equal(grounded.ground.contact, 'true');
  await openShot(page, 'egress', 'ship', cloak);
  await waitElapsed(page, 57_400, 'egress');
  await capture(page, `${prefix}-catalogue-egress`, { ground: true, cloak });
}

async function additionalFamilyRoute(page, viewport, shipId) {
  const family = api.ARRIVAL_SHIP_MOTION_FAMILIES[shipId];
  assert.ok(family && shipId !== api.DEFAULT_SHIP_ID && family.methods.includes('pod'));
  const observedPaths = new Set();
  const coverage = { viewport: viewport.id, shipId, methods: [...family.methods], expectedPaths: [...family.paths],
    sourceReview: family.sourceReview, views: [], transitions: [], passed: false };
  report.familyCoverage.push(coverage);
  let captureSession, preparation, routeError;
  const photograph = async (id, time, untilMs, shot, cloak = false) => {
    await waitElapsed(page, time, shot);
    const label = `${viewport.id}-${shipId}-${id}`;
    const observed = await captureHeldView(page, captureSession, preparation, label, { shipId, generated: true, cloak });
    const recorded = report.captures.at(-1);
    assert.equal(observed.carrier.fallback, 'false', 'Additional-family evidence must actually load that family.');
    assert.equal(observed.carrier.from, id); assert.equal(observed.carrier.to, '');
    assert.equal(observed.carrier.path, family.views[id].path);
    assert.equal(recorded.after.view, id, 'A held-view photograph must retain its source throughout acquisition.');
    assert.equal(recorded.after.from, id); assert.equal(recorded.after.to, '');
    assert.equal(Number(recorded.after.mix), 0);
    assert.ok(recorded.after.elapsedExactMs < untilMs, 'The entire native photograph must precede the next view or shot.');
    observedPaths.add(observed.carrier.path);
    coverage.views.push({ id, path: observed.carrier.path, file: recorded.file, sha256: recorded.sha256,
      method: observed.method, cloak, requestedAt: time, heldUntilMs: untilMs,
      elapsedBefore: observed.elapsedExactMs, elapsedAfter: recorded.after.elapsedExactMs,
      captureMode: recorded.captureMode, preparationId: preparation.id });
  };
  const consumeBlends = async (pending, optical = false) => {
    const result = await pending;
    validateRegistrationResult(result, () => {
      if (result.error) throw result.error;
      assert.ok(result.observations.length >= 2, `${shipId}: inspect real intermediate native mixtures.`);
      let observationIndex = 0;
      for (const observation of result.observations) {
        result.diagnostic.validation.stage = 'observations';
        result.diagnostic.validation.observationIndex = observationIndex++;
        assert.equal(observation.layers.length, 2);
        assertRegistration(observation); assertIsotropicSources(observation);
        if (optical) {
          assert.ok(observation.cloak > 0, 'The additional ship dissolve must actually be optically cloaked.');
          assertRimRegistration(observation, shipId);
        }
        for (const layer of observation.layers) assert.ok(layer.path === api.shipProfileAssetPath(shipId) ||
          family.paths.includes(layer.path), 'A native dissolve cannot borrow an image from a different hull.');
      }
      result.diagnostic.validation.stage = 'summary'; result.diagnostic.validation.observationIndex = null;
      const transitions = [...new Set(result.observations.map(observation => `${observation.from}->${observation.to}`))];
      const differentCanvasObservations = result.observations.filter(observation => new Set(observation.layers
        .map(layer => `${layer.sourceCanvas.width}x${layer.sourceCanvas.height}`)).size > 1);
      if (optical) {
        const profile = api.carrierArtForShip(shipId);
        if (Object.values(family.views).some(view => view.art.width !== profile.width || view.art.height !== profile.height)) {
          assert.ok(differentCanvasObservations.length > 0,
            'Observe an actual cloaked profile-to-view dissolve with different native canvases; held views cannot prove the SVG correction.');
        }
        coverage.opticalRegistration = { observations: result.observations.length,
          differentCanvasObservations: differentCanvasObservations.length,
          differentCanvasTransitions: [...new Set(differentCanvasObservations.map(observation => `${observation.from}->${observation.to}`))] };
      }
      result.diagnostic.validation.stage = 'node-retention';
      const retention = assertRegistrationNodeRetention(result.observations, optical);
      report.registrationNodeRetention.push({ viewport: viewport.id, shipId, optical, ...retention });
      coverage.transitions.push(...transitions);
      report.registrationObservations.push({ viewport: viewport.id, shipId, optical, observations: result.observations,
        transitionsObserved: transitions });
    });
  };
  try {
    await openShot(page, 'carrier', 'pod', false, true, new Set(), shipId);
    const podBlends = retainRegistrationResult(observeRegistrationBlends(page, 27_200),
      { viewport: viewport.id, shipId, method: 'pod', optical: false, untilMs: 27_200 });
    captureSession = await page.context().newCDPSession(page);
    preparation = await prepareHeldViewCapture(page, viewport, shipId, 14_200);
    for (const [id, time, untilMs, shot] of [
      ['forward-quarter', 14_200, 15_200, 'carrier'], ['forward-quarter-shallow', 16_000, 17_100, 'carrier'],
      ['bank-dorsal-shallow', 19_100, 20_000, 'carrier'], ['bank-dorsal', 20_200, 21_000, 'carrier'],
      ['rear-quarter-shallow', 25_200, 26_400, 'release'], ['rear-quarter', 26_800, 31_000, 'release'],
    ]) await photograph(id, time, untilMs, shot);
    await consumeBlends(podBlends);
    if (family.methods.includes('ship')) {
      // A separate ordinary ship playback reveals the two otherwise unused
      // ventral views and checks their actual optical masks on the same pixels.
      await openShot(page, 'release', 'ship', true, true, new Set(), shipId);
      const shipBlends = retainRegistrationResult(observeRegistrationBlends(page, 27_200),
        { viewport: viewport.id, shipId, method: 'ship', optical: true, untilMs: 27_200 });
      preparation = await prepareHeldViewCapture(page, viewport, shipId, 25_200);
      await photograph('bank-ventral-shallow', 25_200, 26_200, 'release', true);
      await photograph('bank-ventral', 26_800, 31_000, 'release', true);
      await consumeBlends(shipBlends, true);
    }
    assert.deepEqual([...observedPaths].sort(), [...family.paths].sort(),
      'Every registered additional view must be painted and photographed during a native playback.');
    coverage.transitions = [...new Set(coverage.transitions)];
    coverage.passed = true;
  } catch (error) {
    routeError = error;
    throw error;
  } finally {
    if (captureSession) {
      try { await captureSession.detach(); } catch (error) {
        report.heldViewCaptureCleanupErrors.push({ viewport: viewport.id, shipId, message: error.message });
        if (!routeError) throw error;
      }
    }
  }
}

async function failureRoute(viewport, shipId = api.DEFAULT_SHIP_ID) {
  const classic = shipId === api.DEFAULT_SHIP_ID;
  const observed = classic ? optionalPaths : new Set(report.familyCoverage
    .filter(item => item.shipId === shipId && item.passed).flatMap(item => item.views.map(view => view.path)));
  assert.ok(observed.size, 'Observe actual additional view files before checking their optional fallback.');
  // One unavailable sibling must keep the whole optional family disabled; a
  // partial pack must not make the silhouette pop between unrelated views.
  const blocked = new Set([observed.values().next().value]);
  const failureLabel = classic ? 'intentional-optional-view-404' : `intentional-optional-view-404:${shipId}`;
  const prefix = classic ? 'desktop-missing-optional-view' : `${viewport.id}-${shipId}-missing-optional-view`;
  const context = await makeContext(viewport);
  const page = await context.newPage(); watch(page, failureLabel, blocked);
  await page.route('**/game/**', route => blocked.has(new URL(route.request().url()).pathname)
    ? route.fulfill({ status: 404, contentType: 'text/plain', body: 'Intentional QA failure for an optional ship view.' })
    : route.continue());
  const failedResponse = page.waitForResponse(response => blocked.has(new URL(response.url()).pathname) && response.status() === 404);
  await openShot(page, 'carrier', 'pod', false, true, blocked, shipId);
  await failedResponse;
  await waitElapsed(page, 14_600, 'carrier');
  const fallback = await capture(page, `${prefix}-profile-fallback`, { shipId });
  assert.equal(fallback.carrier.fallback, 'true');
  assert.equal(fallback.carrier.path, api.shipProfileAssetPath(shipId));
  assert.ok(fallback.carrier.layers.every(layer => layer.path === api.shipProfileAssetPath(shipId)));
  await openShot(page, 'release', 'pod', false, true, blocked, shipId);
  await waitElapsed(page, 26_700, 'release');
  const departingFallback = await capture(page, `${prefix}-departure-fallback`, { shipId });
  assert.equal(departingFallback.carrier.fallback, 'true');
  assert.equal(departingFallback.carrier.path, api.shipProfileAssetPath(shipId));
  assert.equal(departingFallback.carrier.engines.length, 0,
    'The unavailable rear view must not leave its engine attached to the fallback profile.');
  assert.ok(report.missingAssets.some(item => item.label === failureLabel && item.expected),
    'The failure scenario must observe a real intercepted HTTP 404, not a silent renderer change.');
  await context.close();
}

try {
  await loadFixtures();
  await startHost();
  currentCheck = 'Chromium availability under the existing environment policy';
  let executablePath = process.env.CHROMIUM_EXECUTABLE;
  if (!executablePath) executablePath = await exists(chromium.executablePath()) ? chromium.executablePath() : '/usr/bin/chromium';
  browser = await chromium.launch({ executablePath, headless: !headed });
  report.browserVersion = browser.version();

  const viewports = [{ id: 'desktop', width: 1280, height: 720 }, { id: 'mobile', width: 390, height: 844 }];
  for (const viewport of viewports) {
    const context = await makeContext(viewport, viewport.id === 'desktop');
    const page = await context.newPage(); watch(page, viewport.id);
    await check(`${viewport.id}: real view blends, registered hull/nozzle geometry, engine pause and all three pod launches`,
      () => capsuleRoute(page, viewport));
    if (viewport.id === 'desktop') {
      await check('desktop: ordinary Pause/Resume preserves the exact native view and mixture', () => pauseAndResume(page));
      await check('desktop: visible ship deorbit/atmosphere and catalogue ground profile', () => shipRoute(page, viewport, false));
    }
    await check(`${viewport.id}: cloaked moving hull uses matching body/light/refraction/rim sources`,
      () => shipRoute(page, viewport, true));
    for (const shipId of Object.keys(api.ARRIVAL_SHIP_MOTION_FAMILIES).filter(id => id !== api.DEFAULT_SHIP_ID)) {
      await check(`${viewport.id}: ${shipId} complete inspected view family and isotropic native registration`,
        () => additionalFamilyRoute(page, viewport, shipId));
    }
    const video = page.video();
    await context.close();
    if (video) {
      const destination = path.join(out, 'videos', `${viewport.id}-native-ship-motion.webm`);
      await video.saveAs(destination);
      report.video.files.push({ file: path.relative(out, destination), sha256: sha256(await fs.readFile(destination)) });
    }
  }
  await check('desktop: missing optional views visibly fall back to the selected catalogue hull',
    () => failureRoute(viewports[0]));
  const fallbackSizes = new Set();
  for (const [shipId, family] of Object.entries(api.ARRIVAL_SHIP_MOTION_FAMILIES)) {
    if (shipId === api.DEFAULT_SHIP_ID || fallbackSizes.has(family.paths.length)) continue;
    fallbackSizes.add(family.paths.length);
    await check(`desktop: ${shipId} missing view retains its own complete ${family.paths.length}-view family fallback`,
      () => failureRoute(viewports[0], shipId));
  }
  await check('rendered fixtures have no unexpected image failures or JavaScript errors', async () => {
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.missingAssets.filter(item => !item.expected), []);
  });
  await check('source files stayed unchanged throughout this rendering evidence', async () => {
    for (const [file, hash] of Object.entries(report.sourceHashes)) {
      assert.equal(sha256(await fs.readFile(path.join(root, file))), hash, `Source changed while capturing: ${file}`);
    }
  });
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = { check: currentCheck, message: error.message, stack: error.stack };
  process.exitCode = 1;
  console.error(`FAIL ${currentCheck}: ${error.message}`);
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  if (server) await server.close().catch(() => {});
  if (hostDir) await fs.rm(hostDir, { recursive: true, force: true });
  report.requests = [...requestedAssets].sort();
  for (const asset of report.requests) {
    const file = path.join(root, 'public', asset);
    if (await exists(file)) report.assetHashes[asset] = sha256(await fs.readFile(file));
  }
  report.completedAt = new Date().toISOString();
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length,
    captures: report.captures.length, report: path.join(out, 'report.json') }));
}
