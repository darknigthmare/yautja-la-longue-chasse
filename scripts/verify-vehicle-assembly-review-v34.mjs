import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');
const OUTPUT = path.join(ROOT, 'work/v34/vehicle-assembly-review-qa');
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
]);

function fileFor(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  const relative = pathname.replace(/^\/+/, '');
  const candidate = path.resolve(PUBLIC, relative || 'index.html');
  if (candidate !== PUBLIC && !candidate.startsWith(PUBLIC + path.sep)) return null;
  return candidate;
}

const server = http.createServer(async (request, response) => {
  const file = fileFor(request.url ?? '/');
  if (!file) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const bytes = await fs.readFile(file);
    response.writeHead(200, { 'content-type': mime.get(path.extname(file)) ?? 'application/octet-stream' });
    response.end(bytes);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await fs.mkdir(OUTPUT, { recursive: true });
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
assert(address && typeof address === 'object');
const base = `http://127.0.0.1:${address.port}`;
const url = `${base}/game/assets/v34/vehicle-assembly-review/index.html`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const checks = [];

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
  assert.equal(await page.locator('#error').innerText(), '');
  assert.equal(await page.locator('body').getAttribute('data-ready'), 'true');
  const keyedPixels = Number(await page.locator('body').getAttribute('data-keyed-pixels'));
  const fringePixels = Number(await page.locator('body').getAttribute('data-fringe-pixels'));
  assert(keyedPixels > 0, 'Color-key pipeline did not remove pixels');
  assert(fringePixels > 0, 'Connected-magenta despill did not report fringe processing');
  assert.match(await page.locator('#load-status').innerText(), /^10 PNG vérifiés/);
  assert((await page.locator('header').innerText()).includes('REVUE DE MONTAGE · NON JOUABLE'));

  const manifest = await (await page.request.get(`${base}/game/assets/v34/vehicle-assembly-review/manifest.json`)).json();
  assert.equal(manifest.playable, false);
  assert.equal(manifest.resources.length, 10);
  assert.equal(manifest.assemblies.length, 3);
  for (const resource of manifest.resources) {
    const source = path.join(PUBLIC, resource.src.slice(1));
    assert.equal(crypto.createHash('sha256').update(await fs.readFile(source)).digest('hex'), resource.sha256);
  }
  const bisonProvenance = JSON.parse(await fs.readFile(path.join(ROOT, 'art-source/v34/vehicles/bone-bison-de-guerre/provenance.json'), 'utf8'));
  const walkExpectations = new Map([
    ['walk-right-r1', { status: 'rejected', borderPixels: 14 }],
    ['walk-left-r1', { status: 'rejected', borderPixels: 43 }],
    ['walk-right-r2', { status: 'authored-review', borderPixels: 0 }],
    ['walk-left-r2', { status: 'authored-review', borderPixels: 0 }],
  ]);
  for (const [id, expectation] of walkExpectations) {
    const asset = bisonProvenance.assets.find(candidate => candidate.id === id);
    assert(asset, `Source de marche absente : ${id}`);
    assert.equal(asset.status, expectation.status);
    assert.equal(asset.cells.length, 6);
    assert.equal(asset.cells.reduce((sum, cell) => sum + cell.gridBorderPixels, 0), expectation.borderPixels);
    assert(asset.cells.every((cell, index) => cell.phase === `walk-${index + 1}` && cell.runtimeFrameAccepted === false));
    assert.deepEqual(asset.runtimeClips, []);
    if (expectation.status === 'rejected') assert(asset.rejectionReason?.trim());
    const sourceBytes = await fs.readFile(path.join(ROOT, asset.sourcePath));
    const publicBytes = await fs.readFile(path.join(PUBLIC, asset.publicPath.slice(1)));
    assert(sourceBytes.equals(publicBytes));
    assert.equal(crypto.createHash('sha256').update(sourceBytes).digest('hex'), asset.sha256);
  }
  assert.equal(bisonProvenance.acceptedRuntimeClips, 0);
  const bisonAssembly = manifest.assemblies.find(assembly => assembly.id === 'bone-bison-war-fit');
  assert.equal(bisonAssembly?.calibrationStatus, 'static-module-fit-review');
  for (const part of bisonAssembly.modules) {
    assert.equal(part.anchorMode, undefined);
    for (const side of ['right', 'left']) {
      const transform = part.transformByFacing?.[side];
      assert(transform && transform.scale > 0 && Number.isFinite(transform.x) && Number.isFinite(transform.y));
    }
  }


  const razorProvenance = JSON.parse(await fs.readFile(path.join(ROOT, 'art-source/v34/vehicles/razorwing/provenance.json'), 'utf8'));
  const activeRazorSources = new Map([
    ['flight-body-layer-r1', 2],
    ['near-wing-right-beat-r1', 6],
    ['near-wing-left-beat-r1', 6],
    ['far-wing-right-beat-r1', 6],
    ['far-wing-left-beat-r1', 6],
  ]);
  for (const [id, reviewFrameCount] of activeRazorSources) {
    const asset = razorProvenance.assets.find(candidate => candidate.id === id);
    assert(asset, 'Source Razorwing absente : ' + id);
    assert.equal(asset.status, 'authored-review');
    assert.equal(asset.gameplayImplemented, false);
    assert.deepEqual(asset.runtimeClips, []);
    assert.equal(asset.reviewFrames.length, reviewFrameCount);
    assert(asset.cells.every(cell => cell.runtimeFrameAccepted === false));
    for (const frame of asset.reviewFrames) {
      const [x, y, width, height] = frame.rect;
      assert(x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= asset.width && y + height <= asset.height);
      assert(frame.pivot[0] >= 0 && frame.pivot[1] >= 0 && frame.pivot[0] <= width && frame.pivot[1] <= height);
    }
    const sourceBytes = await fs.readFile(path.join(ROOT, asset.sourcePath));
    const publicBytes = await fs.readFile(path.join(PUBLIC, asset.publicPath.slice(1)));
    assert(sourceBytes.equals(publicBytes));
    assert.equal(crypto.createHash('sha256').update(sourceBytes).digest('hex'), asset.sha256);
  }
  const rejectedRazorCorrections = [
    'flight-body-layer-r2',
    'flight-body-layer-r2-attempt2',
    'flight-body-layer-r2-attempt3',
    'flight-body-layer-r2-attempt4',
    'flight-body-layer-alpha-attempt1',
  ];
  for (const id of rejectedRazorCorrections) {
    const asset = razorProvenance.assets.find(candidate => candidate.id === id);
    assert(asset, 'Tentative Razorwing non archivee : ' + id);
    assert.equal(asset.status, 'rejected');
    assert(asset.rejectionReason?.trim());
    assert.equal(asset.gameplayImplemented, false);
    assert.deepEqual(asset.runtimeClips, []);
    const sourceBytes = await fs.readFile(path.join(ROOT, asset.sourcePath));
    const publicBytes = await fs.readFile(path.join(PUBLIC, asset.publicPath.slice(1)));
    assert(sourceBytes.equals(publicBytes));
    assert.equal(crypto.createHash('sha256').update(sourceBytes).digest('hex'), asset.sha256);
  }
  const alphaAttempt = razorProvenance.assets.find(asset => asset.id === 'flight-body-layer-alpha-attempt1');
  assert.equal(alphaAttempt.transparency.mode, 'alpha');
  assert.deepEqual(alphaAttempt.rawAlpha, { zero: 0, partial: 0, opaque: 1572864 });
  assert.equal(razorProvenance.acceptedRuntimeClips, 0);
  const razorAssembly = manifest.assemblies.find(assembly => assembly.id === 'razorwing-flight-rig-review');
  assert.equal(razorAssembly?.calibrationStatus, 'estimated-flight-rig-review');
  assert.equal(razorAssembly?.playable, false);
  assert(razorAssembly.notes.some(note => note.includes('pixels magenta')));
  assert.deepEqual(razorAssembly.animation.linkedModuleIds, ['near-wing', 'far-wing']);
  assert.equal(razorAssembly.modules.find(part => part.id === 'far-wing')?.layer, 'behind');
  assert.equal(razorAssembly.modules.find(part => part.id === 'near-wing')?.layer, 'front');
  const flightBodyResource = manifest.resources.find(resource => resource.id === 'flight-body-layer-r1');
  assert.equal(flightBodyResource.transparency.tolerance, 64);
  assert.equal(flightBodyResource.transparency.fringe.radius, 3);
  assert.equal(razorProvenance.assets.find(asset => asset.id === 'flight-body-layer-r1').transparency.tolerance, 48);

  const canvas = page.locator('#assembly-canvas');
  assert.equal(await canvas.getAttribute('data-assembly'), 'ejection-seat-controller');
  assert.equal(await page.locator('#facing-control').isHidden(), true);
  assert.deepEqual(await page.locator('#facing option').allTextContents(), ['Vers la droite']);
  assert.equal(await canvas.getAttribute('data-facing'), 'right');
  const seatFrames = [];
  for (let index = 0; index < 4; index += 1) {
    assert.equal(await canvas.getAttribute('data-pose'), String(index));
    assert.equal(await canvas.getAttribute('data-overflow'), '0');
    assert.equal(await page.locator('#overflow').getAttribute('data-safe'), 'true');
    const file = path.join(OUTPUT, `seat-controller-pose-${index + 1}.png`);
    await canvas.screenshot({ path: file });
    const bytes = await fs.readFile(file);
    seatFrames.push(crypto.createHash('sha256').update(bytes).digest('hex'));
    if (index < 3) await page.locator('#next').click();
  }
  assert.equal(new Set(seatFrames).size, 4, 'Controller poses are not visually distinct');
  const armToggle = page.locator('input[data-module="controller-arm"]');
  await armToggle.uncheck();
  assert.equal(await canvas.getAttribute('data-modules'), '');
  assert.equal(await page.locator('#play').isDisabled(), true);
  await canvas.screenshot({ path: path.join(OUTPUT, 'seat-base-only.png') });
  await armToggle.check();
  assert.equal(await canvas.getAttribute('data-overflow'), '0');
  checks.push({ assembly: 'ejection-seat-controller', facing: 'right', distinctPoses: 4, overflowPixels: 0,
    orientationSelectorHidden: true, armToggle: true, calibration: 'manual visual review required' });

  await page.locator('#assembly').selectOption('bone-bison-war-fit');
  assert.equal(await page.locator('#facing-control').isVisible(), true);
  assert.deepEqual(await page.locator('#facing option').allTextContents(), ['Vers la droite', 'Vers la gauche']);
  assert((await page.locator('#calibration').innerText()).includes('Modules calés séparément'));
  assert.equal(await page.locator('#calibration').getAttribute('data-status'), 'static-module-fit-review');
  const bisonToggles = new Map();
  for (const id of ['war-saddle', 'flank-guard']) {
    const toggle = page.locator(`input[data-module="${id}"]`);
    assert.equal(await toggle.isChecked(), true);
    bisonToggles.set(id, toggle);
    await toggle.uncheck();
  }
  assert.equal(await canvas.getAttribute('data-modules'), '');
  const bisonBaseHashes = new Map();
  for (const side of ['right', 'left']) {
    await page.locator('#facing').selectOption(side);
    assert.equal(await canvas.getAttribute('data-overflow'), '0');
    const file = path.join(OUTPUT, `bone-bison-${side}-base-only.png`);
    await canvas.screenshot({ path: file });
    bisonBaseHashes.set(side, crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex'));
  }
  for (const toggle of bisonToggles.values()) await toggle.check();
  const bisonModuleHashes = new Map();
  for (const side of ['right', 'left']) {
    await page.locator('#facing').selectOption(side);
    assert.equal(await canvas.getAttribute('data-overflow'), '0');
    assert.equal(await page.locator('#overflow').getAttribute('data-safe'), 'true');
    assert.deepEqual(new Set((await canvas.getAttribute('data-modules')).split(',')), new Set(['war-saddle', 'flank-guard']));
    const file = path.join(OUTPUT, `bone-bison-${side}-modules.png`);
    await canvas.screenshot({ path: file });
    const digest = crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
    bisonModuleHashes.set(side, digest);
    assert.notEqual(digest, bisonBaseHashes.get(side), `Modules invisibles sur la vue ${side}`);
  }
  checks.push({ assembly: 'bone-bison-war-fit', facings: ['right', 'left'], overflowPixels: 0,
    moduleToggles: ['war-saddle', 'flank-guard'], calibration: 'static-module-fit-review',
    distinctModuleCompositions: bisonModuleHashes.size });


  await page.locator('#assembly').selectOption('razorwing-flight-rig-review');
  assert.equal(await page.locator('#facing-control').isVisible(), true);
  assert.deepEqual(await page.locator('#facing option').allTextContents(), ['Vers la droite', 'Vers la gauche']);
  assert((await page.locator('#calibration').innerText()).includes('vol non valid'));
  assert.equal(await page.locator('#calibration').getAttribute('data-status'), 'estimated-flight-rig-review');
  assert.equal(await canvas.getAttribute('data-playable'), 'false');
  await page.locator('#background').selectOption('light');
  const nearWingToggle = page.locator('input[data-module="near-wing"]');
  const farWingToggle = page.locator('input[data-module="far-wing"]');
  assert.equal(await nearWingToggle.isChecked(), true);
  assert.equal(await farWingToggle.isChecked(), true);
  const razorPoseHashes = {};
  for (const side of ['right', 'left']) {
    await page.locator('#facing').selectOption(side);
    const hashes = [];
    for (let phase = 0; phase < 6; phase += 1) {
      assert.equal(await canvas.getAttribute('data-pose'), String(phase));
      assert.equal(await canvas.getAttribute('data-overflow'), '0');
      assert.equal(await page.locator('#overflow').getAttribute('data-safe'), 'true');
      assert.deepEqual(new Set((await canvas.getAttribute('data-modules')).split(',')), new Set(['far-wing', 'near-wing']));
      const file = path.join(OUTPUT, 'razorwing-' + side + '-phase-' + (phase + 1) + '.png');
      await canvas.screenshot({ path: file });
      hashes.push(crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex'));
      if (phase < 5) await page.locator('#next').click();
    }
    assert.equal(new Set(hashes).size, 6, 'Les six poses Razorwing ne sont pas distinctes : ' + side);
    razorPoseHashes[side] = hashes;
  }
  await page.locator('#facing').selectOption('right');
  await nearWingToggle.uncheck();
  assert.equal(await canvas.getAttribute('data-modules'), 'far-wing');
  assert.equal(await page.locator('#play').isDisabled(), false);
  const farOnlyPath = path.join(OUTPUT, 'razorwing-right-far-only.png');
  await canvas.screenshot({ path: farOnlyPath });
  const farOnlyHash = crypto.createHash('sha256').update(await fs.readFile(farOnlyPath)).digest('hex');
  await farWingToggle.uncheck();
  assert.equal(await canvas.getAttribute('data-modules'), '');
  assert.equal(await page.locator('#play').isDisabled(), true);
  const bodyOnlyPath = path.join(OUTPUT, 'razorwing-right-body-only.png');
  await canvas.screenshot({ path: bodyOnlyPath });
  const bodyOnlyHash = crypto.createHash('sha256').update(await fs.readFile(bodyOnlyPath)).digest('hex');
  await nearWingToggle.check();
  assert.equal(await canvas.getAttribute('data-modules'), 'near-wing');
  assert.equal(await page.locator('#play').isDisabled(), false);
  const nearOnlyPath = path.join(OUTPUT, 'razorwing-right-near-only.png');
  await canvas.screenshot({ path: nearOnlyPath });
  const nearOnlyHash = crypto.createHash('sha256').update(await fs.readFile(nearOnlyPath)).digest('hex');
  await farWingToggle.check();
  const bothPath = path.join(OUTPUT, 'razorwing-right-both-wings.png');
  await canvas.screenshot({ path: bothPath });
  const bothHash = crypto.createHash('sha256').update(await fs.readFile(bothPath)).digest('hex');
  assert.equal(new Set([bodyOnlyHash, farOnlyHash, nearOnlyHash, bothHash]).size, 4, 'Les bascules des ailes ne produisent pas quatre compositions distinctes');
  checks.push({
    assembly: 'razorwing-flight-rig-review',
    facings: ['right', 'left'],
    reviewCompositions: 12,
    distinctPosesPerFacing: { right: new Set(razorPoseHashes.right).size, left: new Set(razorPoseHashes.left).size },
    moduleToggles: ['far-wing', 'near-wing'],
    moduleCombinationHashes: { bodyOnlyHash, farOnlyHash, nearOnlyHash, bothHash },
    layerOrder: ['far-wing', 'body', 'near-wing'],
    calibration: 'estimated-flight-rig-review',
    playable: false,
    visibleMagentaResidueDocumented: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: path.join(OUTPUT, 'mobile.png'), fullPage: true });
  assert.deepEqual(errors, []);

  const result = {
    passed: true,
    checkedAt: new Date().toISOString(),
    url,
    ephemeralPort: address.port,
    resourcesShaVerified: manifest.resources.length,
    boneBisonWalkSourcesVerified: walkExpectations.size,
    razorwingActiveSourcesVerified: activeRazorSources.size,
    razorwingCorrectionAttemptsRejected: rejectedRazorCorrections.length,
    razorwingReviewCompositionsVerified: 12,
    boneBisonWalkSummary: Object.fromEntries([...walkExpectations].map(([id, expectation]) => [id, expectation])),
    keyedPixels,
    fringePixels,
    seatPoseHashes: seatFrames,
    razorwingPoseHashes: razorPoseHashes,
    mobileNoHorizontalOverflow: true,
    checks,
    errors,
  };
  await fs.writeFile(path.join(OUTPUT, 'browser-qa.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
