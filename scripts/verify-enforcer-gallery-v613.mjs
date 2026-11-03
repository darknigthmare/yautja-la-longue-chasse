import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

// Test the delivered HTML through file://, including filters and relative links.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'docs/suivi-production/v613');
const browserPath = process.argv.find(arg => arg.startsWith('--browser='))?.slice(10);
if (!browserPath) throw Error('Usage: node scripts/verify-enforcer-gallery-v613.mjs --browser=<Chromium executable>');
const read = async relative => JSON.parse(await fs.readFile(path.join(root, relative), 'utf8'));
const manifests = await Promise.all(['v611', 'v612', 'v613'].map(version => read(`docs/suivi-production/${version}/data/production-manifest.json`)));
const assets = manifests.flatMap(manifest => manifest.assets);
assert.equal(assets.length, 108);
const current = manifests[2].assets;
const finalPromptsRecovered = current.filter(asset => typeof asset.acceptedOutputPromptExact === 'string' && asset.acceptedOutputPromptExact.trim()).length;
const out = path.join(base, 'gallery-preview');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: browserPath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [], external = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
try {
  await page.goto(pathToFileURL(path.join(base, 'index.html')).href);
  const identities = await page.locator('.card').evaluateAll(cards => cards.map(card => ({ id: card.dataset.id, sha256: card.dataset.sha256 })));
  assert.deepEqual(identities.sort((a, b) => a.id.localeCompare(b.id)), assets.map(asset => ({ id: asset.id, sha256: asset.sha256 })).sort((a, b) => a.id.localeCompare(b.id)));
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); })));
  const loaded = await page.locator('img').evaluateAll(images => images.map(image => ({ complete: image.complete, width: image.naturalWidth, height: image.naturalHeight })));
  assert.equal(loaded.length, 108);
  assert(loaded.every(image => image.complete && image.width === 1024 && image.height === 1536));
  const hrefs = await page.locator('a[href]').evaluateAll(links => [...new Set(links.map(link => link.getAttribute('href')))]);
  const localLinks = hrefs.filter(href => !/^https?:/.test(href));
  for (const href of localLinks) {
    assert(!path.isAbsolute(href), `Offline link must be relative: ${href}`);
    assert((await fs.stat(path.resolve(base, href))).isFile(), `Missing offline link: ${href}`);
  }
  const visible = () => page.locator('.card:not([hidden])').count();
  const reset = async () => {
    await page.click('#reset');
    await page.waitForFunction(() => [...document.querySelectorAll('.card')].filter(card => !card.hidden).length === 108);
  };
  assert.equal(await visible(), 108);
  for (const lot of ['V6.11', 'V6.12', 'V6.13']) {
    await page.selectOption('#lot', lot);
    assert.equal(await visible(), 36);
  }
  await reset();
  for (const role of ['4', '5', '6', '7', '8', '9']) {
    await page.selectOption('#role', role);
    assert.equal(await visible(), 18);
  }
  await reset();
  await page.selectOption('#group', 'human-accepted');
  assert.equal(await visible(), 6);
  await page.selectOption('#lot', 'V6.13');
  assert.equal(await visible(), 2);
  await page.selectOption('#role', '8');
  assert.equal(await visible(), 1);
  assert.equal(await page.locator('.card:not([hidden])').getAttribute('data-group'), 'human-accepted');
  await page.fill('#search', 'aucun-resultat-qa-v613');
  assert.equal(await visible(), 0);
  assert.equal(await page.locator('#empty').isVisible(), true);
  await reset();
  for (const field of ['group', 'lot', 'role', 'search']) assert.equal(await page.inputValue(`#${field}`), '');
  await page.fill('#search', 'VETERAN GRAVURES');
  assert.equal(await visible(), 18, 'Search must ignore French accents and letter case');
  await reset();
  assert.equal(await page.locator('.card[data-lot="V6.13"][data-prompt-status="recovered"]').count(), finalPromptsRecovered);
  const missingEvidence = await page.locator('.card[data-lot="V6.13"][data-prompt-status="unrecovered"] .prompt-evidence').allTextContents();
  assert.equal(missingEvidence.length, 36 - finalPromptsRecovered);
  assert(missingEvidence.every(text => text.includes('Non récupéré') && text.includes('prévisionnel')));
  await page.click('#background');
  assert.equal(await page.getAttribute('#background', 'aria-pressed'), 'true');
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: path.join(out, 'gallery-desktop.png') });
  const groupScreens = [];
  for (const group of ['human-accepted', 'four-armed', 'bionic', 'pilot-kok']) {
    await page.selectOption('#group', group);
    await page.selectOption('#lot', 'V6.13');
    assert.equal(await visible(), 2);
    await page.locator('#grid').scrollIntoViewIfNeeded();
    await page.locator('#grid').screenshot({ path: path.join(out, `${group}.png`) });
    groupScreens.push(`${group}.png`);
  }
  await reset();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  const mobile = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth }));
  assert(mobile.documentWidth <= mobile.viewport, 'Mobile horizontal overflow');
  await page.screenshot({ path: path.join(out, 'gallery-mobile.png') });
  const withoutJavaScript = await browser.newPage({ javaScriptEnabled: false });
  try {
    await withoutJavaScript.goto(pathToFileURL(path.join(base, 'index.html')).href);
    assert.equal(await withoutJavaScript.locator('.card').count(), 108);
    assert.equal(await withoutJavaScript.locator('a.download').count(), 108);
    assert.equal(await withoutJavaScript.locator('noscript').isVisible(), true);
  } finally { await withoutJavaScript.close(); }
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  const report = {
    passed: true, nativeImagesLoaded: loaded.length, nativeDimensions: [1024, 1536], manifestIdentitiesVerified: identities.length,
    localLinksChecked: localLinks.length, filters: { all: 108, eachLot: 36, eachRole: 18, oneGroup: 6, currentGroup: 2, currentRole: 1, empty: 0, reset: 108 },
    accentInsensitiveSearchVerified: true, finalPromptsRecoveredV613: finalPromptsRecovered, finalPromptsUnrecoveredV613: missingEvidence.length,
    backgroundToggleVerified: true, withoutJavaScript: { cards: 108, downloads: 108 }, mobileViewport: mobile.viewport, mobileDocumentWidth: mobile.documentWidth,
    pageErrors: errors, externalNetworkRequests: external, screenshots: ['gallery-desktop.png', ...groupScreens, 'gallery-mobile.png'],
  };
  await fs.writeFile(path.join(out, 'browser-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
