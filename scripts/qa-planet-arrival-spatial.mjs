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
  'app/game/HuntCanvas.tsx', 'app/game/systems/planetInsertion.ts', 'app/game/systems/huntInsertion.ts',
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
  scope: 'Actual component rendering at native shot boundaries on desktop/mobile; all eight destinations; seven representative orbital hulls; four insertion combinations and three grounded hull profiles; natural production /dev arrival and real hunt handoffs. Spatial evidence is distinct from artistic or canonical approval. Ship contact and exit points follow source composition, without a claim about canonical landing gear or release bays.',
  timing: 'Unmodified native requestAnimationFrame. Samples wait for elapsed-time thresholds and retain observed times; no virtual or accelerated clock.',
  nativeUrl: nativeUrl.href, checks: [], samples: [], movement: [], captures: [],
  resizes: [], ships: [], insertions: [], native: {}, errors: [], consoleErrors: [], missingAssets: [], requestedAssets: [],
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
      export { carrierArtForShip } from './app/game/systems/planetArrivalArt';
      export { ARRIVAL_CONTACT_MS, arrivalFormationSlots } from './app/game/systems/planetArrivalPresentation';
      export { arrivalSurfaceShipGeometry } from './app/game/systems/planetArrivalSpatial';
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

async function readFrame(target = page) {
  return target.locator('[data-arrival-run]').evaluate(root => {
    const rect = element => {
      if (!element) return null;
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
    return {
      run: root.getAttribute('data-arrival-run'), shot: root.getAttribute('data-arrival-shot'),
      status: root.getAttribute('data-arrival-status'), elapsedMs: Number(root.getAttribute('data-arrival-elapsed')),
      reducedMotion: root.getAttribute('data-arrival-reduced-motion') === 'true',
      method: root.getAttribute('data-arrival-method'), team: root.getAttribute('data-arrival-team'),
      contact: root.querySelector('[data-arrival-scene]')?.getAttribute('data-arrival-contact') === 'true',
      scene: rect(root.querySelector('[data-arrival-scene]')), stage: rect(stage),
      stageLayout: stage ? { width: stage.offsetWidth, height: stage.offsetHeight, transform: getComputedStyle(stage).transform } : null,
      camera: rect(camera), cameraTransform: camera ? getComputedStyle(camera).transform : null,
      groundScale: camera ? Math.hypot(transformToRoot(camera).a, transformToRoot(camera).b) : null,
      flightPod: rect(root.querySelector('[data-arrival-flight-pod]')), anchors, anchorIds, lights, members,
      flightPods: [...root.querySelectorAll('[data-arrival-flight-pod]')].map(element => ({
        member: element.getAttribute('data-arrival-member'), ...rect(element), opacity: opacity(element),
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
  assert.deepEqual(frame.images.filter(image => !image.complete || image.width === 0 || image.height === 0), [],
    `${label}: undecoded or missing scene image.`);
  assert.ok(frame.svgImages.every(image => image.path && image.width > 0 && image.height > 0 &&
    frame.decodedSvg.some(decoded => decoded.path === image.path && decoded.complete && decoded.width > 0 && decoded.height > 0)),
  `${label}: every declared SVG source must be a decoded real image.`);
  assert.doesNotMatch(frame.statusText, /indisponible|n’a pas pu|pas été confirmé/i, `${label}: scene reported a runtime failure.`);
  assert.ok(['pod', 'ship'].includes(frame.method), `${label}: insertion method must be explicit.`);
  assert.ok(['solo', 'triad'].includes(frame.team), `${label}: expedition size must be explicit.`);
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

async function waitElapsed(milliseconds, shotId, target = page, allowComplete = false) {
  await target.waitForFunction(({ milliseconds, shotId, allowComplete }) => {
    const root = document.querySelector('[data-arrival-run]');
    if (!root) throw new Error('Arrival unmounted before the requested sample.');
    const status = root.getAttribute('data-arrival-status');
    if (status === 'paused' || status === 'recoverable-error') throw new Error(`Arrival unexpectedly ${status}.`);
    return (status === 'playing' || (allowComplete && status === 'complete')) && root.getAttribute('data-arrival-shot') === shotId &&
      Number(root.getAttribute('data-arrival-elapsed')) >= milliseconds;
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
  const url = new URL(`http://127.0.0.1:${harnessPort}/`);
  url.searchParams.set('mission', missionId); url.searchParams.set('shot', shotId);
  url.searchParams.set('ship', shipId);
  if (insertion) { url.searchParams.set('method', insertion.method); url.searchParams.set('team', insertion.team); }
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
        const samples = [['early', .1], ['middle', .5], ['late', .88]];
        if (shot.id === 'landing') samples.splice(2, 0, ['impact', .66]);
        if (shot.id === 'egress') samples.splice(1, 0,
          ['vent-dissipation', .26], ['threshold', .32], ['step-down', .40]);
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
    for (const variant of insertionVariants) {
      await check(`${viewport.id}: ${variant.id} real flight, contact and complete disembarkation`, async () => {
        for (const shotId of ['release', 'atmosphere']) {
          await openShot(primaryMission.id, shotId, false, api.DEFAULT_SHIP_ID, variant.plan);
          const shot = api.PLANET_ARRIVAL_SHOTS.find(candidate => candidate.id === shotId);
          await waitElapsed(shot.startMs + (shot.endMs - shot.startMs) * (shotId === 'release' ? .12 : .55), shotId);
          const frame = await capture(`${viewport.id}-${variant.id}-${shotId}`);
          assert.equal(frame.method, variant.plan.method); assert.equal(frame.team, variant.plan.team);
          if (variant.plan.method === 'pod') {
            assert.deepEqual(frame.flightPods.map(pod => pod.member), ['player', 'karhek', 'saketh']);
            if (shotId === 'atmosphere') for (const id of ['karhek', 'saketh']) {
              assert.ok(distance(frame.anchors['pod-nose'], frame.anchors[`${id}-pod-nose`]) > 1,
                'Every companion capsule must travel on its own visible trajectory.');
            }
          } else assert.ok(frame.images.some(image => image.path === api.shipProfileAssetPath(api.DEFAULT_SHIP_ID)),
            'Controlled descent must retain the actual selected hull.');
          await measureMovement(`${viewport.id}-${variant.id}-${shotId}`);
        }
        await openShot(primaryMission.id, 'landing', false, api.DEFAULT_SHIP_ID, variant.plan);
        const landing = api.PLANET_ARRIVAL_SHOTS.find(shot => shot.id === 'landing');
        await waitElapsed(landing.startMs + (landing.endMs - landing.startMs) * .35, landing.id);
        const approaching = await capture(`${viewport.id}-${variant.id}-before-contact`);
        assert.equal(approaching.contact, false);
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
        await capture(`${viewport.id}-${variant.id}-egress-walking`);
        const finalTime = egress.startMs + (egress.endMs - egress.startMs) * .96;
        // The harness keeps the completed scene mounted. If encoding spans
        // the final instant, retain that actual completed pose as evidence.
        await waitElapsed(finalTime, egress.id, page, true);
        const final = await capture(`${viewport.id}-${variant.id}-egress-final`);
        assertFinalFormation(final, variant.plan, `${viewport.id}-${variant.id}`);
        if (variant.plan.method === 'ship') {
          assert.ok(distance(groundPoint(grounded, 'ship-ground-contact'), groundPoint(final, 'ship-ground-contact')) <= 1.5,
            'The landed hull must remain stationary throughout disembarkation.');
        }
        report.insertions.push({ viewport: viewport.id, ...variant, ship: api.DEFAULT_SHIP_ID,
          finalMembers: final.members.map(member => ({ id: member.id, stage: member.stage, contact: member.contact })),
          finalAnchors: Object.fromEntries(Object.entries(final.anchors).filter(([id]) => /hunter-feet$|ship-ground-contact/.test(id))),
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
        await openShot(primaryMission.id, 'egress', false, shipId, plan);
        const egress = api.PLANET_ARRIVAL_SHOTS.find(shot => shot.id === 'egress');
        for (const progress of [.32, .42, .96]) {
          await waitElapsed(egress.startMs + (egress.endMs - egress.startMs) * progress, egress.id);
          const frame = await capture(`${viewport.id}-${shipId}-surface-egress-${Math.round(progress * 100)}`);
          if (progress === .96) {
            assertFinalFormation(frame, plan, `${viewport.id}-${shipId}`);
            assert.ok(distance(groundPoint(grounded, 'ship-ground-contact'), groundPoint(frame, 'ship-ground-contact')) <= 1.5);
          }
        }
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
  await check('Native ship and triad Skip preserves the actual hull, formation, patrols and usable companion orders', async () => {
    await page.keyboard.press('F8');
    await page.locator('[data-dev-catalogue]').waitFor();
    await page.locator('[data-dev-category="arrivals"]').click();
    await page.locator('[data-dev-launch="arrival-ship-triad-jungle-vey"]').click();
    await ready();
    const before = await capture('native-ship-triad-orbit');
    assert.equal(before.method, 'ship'); assert.equal(before.team, 'triad');
    const mounts = await page.evaluate(() => window.__arrivalSpatialObservations.huntMounts);
    await page.getByRole('button', { name: /^Passer l’arrivée/ }).tap();
    const session = page.locator('[data-dev-session="arrival-ship-triad-jungle-vey"]');
    await session.locator('.hunt-screen canvas.hunt-canvas').waitFor({ timeout: 90000 });
    await page.locator('[data-mission-opening-v78]').waitFor({ timeout: 90000 });
    await session.locator('[data-hunt-surface-ship-ready="true"]').waitFor({ timeout: 90000 });
    await page.waitForFunction(() => document.querySelector('[data-dev-session="arrival-ship-triad-jungle-vey"]')
      ?.hasAttribute('data-dev-hunt-insertion'), null, { timeout: 30000 });
    const snapshot = JSON.parse(await session.getAttribute('data-dev-hunt-insertion'));
    assert.deepEqual(snapshot.plan, { version: 1, method: 'ship', team: 'triad' });
    assert.deepEqual(snapshot.companions.map(member => member.id), ['karhek', 'saketh']);
    assert.deepEqual(snapshot.patrolIds, [`${snapshot.runId}:insertion-patrol-0`, `${snapshot.runId}:insertion-patrol-2`],
      'This real jungle entry has exactly two safe patrol placements; the other two are obstructed.');
    assert.deepEqual(JSON.parse(await session.getAttribute('data-dev-hunt-insertion-patrols')), snapshot.patrolIds,
      'Every declared insertion patrol must be present in the real persisted enemy snapshot.');
    assert.equal(snapshot.searchUntil, 35);
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
    await session.locator('canvas.hunt-canvas').screenshot({ path: path.join(out, 'native-ship-triad-hunt-canvas.png') });
    const details = page.locator('.hunt-screen details').filter({ has: page.locator('summary').filter({ hasText: /^Détails/ }) });
    if (await details.getAttribute('open') === null) await details.locator('summary').click();
    await page.getByRole('button', { name: 'Ka’rhek : tenir la position', exact: true }).click();
    await page.locator('[data-hunt-companion-id="karhek"][data-hunt-companion-order="hold"]').waitFor();
    await page.getByRole('button', { name: 'Ka’rhek : suivre', exact: true }).click();
    await page.locator('[data-hunt-companion-id="karhek"][data-hunt-companion-order="follow"]').waitFor();
    await page.screenshot({ path: path.join(out, 'native-ship-triad-hunt-orders.png'), fullPage: false });
    assert.equal(await page.evaluate(() => window.__arrivalSpatialObservations.huntMounts), mounts + 1,
      'Real companion commands must preserve the same running hunt.');
    assert.deepEqual(await storageSnapshot(page), protectedStorage);
    report.native.shipTriad = { runId: before.run, completedBy: 'skipped', huntCanvases: 1, snapshot,
      observedOrders: ['hold', 'follow'], surfaceShip: before.ship };
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
