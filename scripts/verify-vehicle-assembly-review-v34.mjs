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
  assert.match(await page.locator('#load-status').innerText(), /^5 PNG vérifiés/);
  assert((await page.locator('header').innerText()).includes('REVUE DE MONTAGE · NON JOUABLE'));

  const manifest = await (await page.request.get(`${base}/game/assets/v34/vehicle-assembly-review/manifest.json`)).json();
  assert.equal(manifest.playable, false);
  assert.equal(manifest.resources.length, 5);
  assert.equal(manifest.assemblies.length, 2);
  for (const resource of manifest.resources) {
    const source = path.join(PUBLIC, resource.src.slice(1));
    assert.equal(crypto.createHash('sha256').update(await fs.readFile(source)).digest('hex'), resource.sha256);
  }

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
  assert.equal(await canvas.getAttribute('data-modules'), '');
  assert((await page.locator('#calibration').innerText()).includes('Calage non validé'));
  for (const side of ['right', 'left']) {
    await page.locator('#facing').selectOption(side);
    assert.equal(await canvas.getAttribute('data-overflow'), '0');
    await canvas.screenshot({ path: path.join(OUTPUT, `bone-bison-${side}-base-only.png`) });
  }
  for (const id of ['war-saddle', 'flank-guard']) {
    const toggle = page.locator(`input[data-module="${id}"]`);
    assert.equal(await toggle.isChecked(), false);
    await toggle.check();
    assert((await canvas.getAttribute('data-modules')).split(',').includes(id));
  }
  for (const side of ['right', 'left']) {
    await page.locator('#facing').selectOption(side);
    assert.equal(await canvas.getAttribute('data-overflow'), '0');
    assert.equal(await page.locator('#overflow').getAttribute('data-safe'), 'true');
    await canvas.screenshot({ path: path.join(OUTPUT, `bone-bison-${side}-modules.png`) });
  }
  checks.push({ assembly: 'bone-bison-war-fit', facings: ['right', 'left'], overflowPixels: 0,
    moduleToggles: ['war-saddle', 'flank-guard'], calibration: 'common-origin-unregistered' });

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
    keyedPixels,
    fringePixels,
    seatPoseHashes: seatFrames,
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
