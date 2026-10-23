import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

// Test the delivered HTML through file://, including filters and relative links.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'docs/suivi-production/v615');
const browserPath = process.argv.find(arg => arg.startsWith('--browser='))?.slice(10);
if (!browserPath) throw Error('Usage: node scripts/verify-npc-gallery-v615.mjs --browser=<Chromium executable>');
const read = async relative => JSON.parse(await fs.readFile(path.join(root, relative), 'utf8'));
const manifests = await Promise.all(['v611', 'v612', 'v613', 'v614', 'v615'].map(version => read(`docs/suivi-production/${version}/data/production-manifest.json`)));
const assets = manifests.flatMap(manifest => manifest.assets);
assert.equal(assets.length, 144);
const current = manifests[4].assets;
const historical = manifests[2].assets;
const finalPromptsRecovered = current.filter(asset => typeof asset.acceptedOutputPromptExact === 'string' && asset.acceptedOutputPromptExact.trim()).length;
assert.equal(finalPromptsRecovered, 18);
const historicalMissing = historical.filter(asset => !asset.acceptedOutputPromptExact?.trim()).length;
assert.equal(historicalMissing, 21);
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
  // Decode every native image in turn, without pinning 144 full-size bitmaps at once.
  await page.locator('img').evaluateAll(async images => {
    for (const image of images) {
      image.loading = 'eager';
      try { await image.decode(); }
      catch (error) { throw Error(`PNG decode failed: ${image.closest('.card')?.dataset.id}: ${String(error)}`); }
    }
  });
  const loaded = await page.locator('img').evaluateAll(images => images.map(image => ({ complete: image.complete, width: image.naturalWidth, height: image.naturalHeight })));
  assert.equal(loaded.length, 144);
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
    await page.waitForFunction(() => [...document.querySelectorAll('.card')].filter(card => !card.hidden).length === 144);
  };
  assert.equal(await visible(), 144);
  for (const [lot, count] of Object.entries({ 'V6.11': 36, 'V6.12': 36, 'V6.13': 36, 'V6.14': 18, 'V6.15': 18 })) {
    await page.selectOption('#lot', lot);
    assert.equal(await visible(), count);
  }
  await reset();
  for (const role of ['enforcers-comics:4', 'enforcers-comics:5', 'enforcers-comics:6', 'enforcers-comics:7', 'enforcers-comics:8', 'enforcers-comics:9', 'enforcers-comics:10', 'sucklings:2']) {
    await page.selectOption('#role', role);
    assert.equal(await visible(), 18);
  }
  await reset();
  await page.selectOption('#family', 'sucklings');
  assert.equal(await visible(), 18);
  await page.selectOption('#lot', 'V6.14');
  assert.equal(await visible(), 0, 'Incompatible family and lot must not show another cohort');
  await reset();
  await page.selectOption('#family', 'enforcers-comics');
  assert.equal(await visible(), 126);
  await reset();
  await page.selectOption('#group', 'human-accepted');
  assert.equal(await visible(), 8);
  await page.selectOption('#lot', 'V6.15');
  assert.equal(await visible(), 1);
  await page.selectOption('#role', 'sucklings:2');
  assert.equal(await visible(), 1);
  assert.equal(await page.locator('.card:not([hidden])').getAttribute('data-group'), 'human-accepted');
  await page.fill('#search', 'aucun-resultat-qa-v615');
  assert.equal(await visible(), 0);
  assert.equal(await page.locator('#empty').isVisible(), true);
  await reset();
  for (const field of ['group', 'family', 'lot', 'role', 'search']) assert.equal(await page.inputValue(`#${field}`), '');
  await page.fill('#search', 'VETERAN GRAVURES');
  assert.equal(await visible(), 18, 'Search must ignore French accents and letter case');
  await reset();
  assert.equal(await page.locator('.card[data-lot="V6.15"][data-prompt-status="recovered"]').count(), finalPromptsRecovered);
  const missingEvidence = await page.locator('.card[data-lot="V6.15"][data-prompt-status="unrecovered"] .prompt-evidence').allTextContents();
  assert.equal(missingEvidence.length, 18 - finalPromptsRecovered);
  assert.equal(missingEvidence.length, 0);
  const historicalMissingEvidence = await page.locator('.card[data-lot="V6.13"][data-prompt-status="unrecovered"] .prompt-evidence').allTextContents();
  assert.equal(historicalMissingEvidence.length, historicalMissing);
  assert(historicalMissingEvidence.every(text => text.includes('Non récupéré') && text.includes('prévisionnel')));
  await page.click('#background');
  assert.equal(await page.getAttribute('#background', 'aria-pressed'), 'true');
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: path.join(out, 'gallery-desktop.png') });
  // Render the eighteen delivered PNGs on the gallery's light surface in three
  // review panels. Only presentation is compacted; native files are untouched.
  await page.selectOption('#lot', 'V6.15');
  assert.equal(await visible(), 18);
  const reviewStyle = await page.addStyleTag({ content: '.grid{grid-template-columns:repeat(3,minmax(0,1fr))}.card-body{display:none}.sprite{height:500px}' });
  const lightReviewPanels = [];
  for (let panel = 0; panel < 3; panel++) {
    await page.locator('.card[data-lot="V6.15"]').evaluateAll((cards, index) => {
      for (let i = 0; i < cards.length; i++) cards[i].hidden = i < index * 6 || i >= (index + 1) * 6;
    }, panel);
    assert.equal(await visible(), 6);
    const screenshot = `current-lot-light-${panel + 1}.png`;
    await page.locator('#grid').screenshot({ path: path.join(out, screenshot) });
    lightReviewPanels.push(screenshot);
  }
  await reviewStyle.evaluate(style => style.remove());
  await reset();
  const groupScreens = [];
  for (const group of ['human-accepted', 'four-armed', 'bionic', 'pilot-kok']) {
    await page.selectOption('#group', group);
    await page.selectOption('#lot', 'V6.15');
    assert.equal(await visible(), 1);
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
  await page.selectOption('#group', 'human-accepted');
  await page.selectOption('#lot', 'V6.15');
  assert.equal(await visible(), 1);
  await page.locator('#filters').screenshot({ path: path.join(out, 'gallery-mobile-controls.png') });
  await page.locator('.card:not([hidden])').screenshot({ path: path.join(out, 'gallery-mobile-card.png') });
  const withoutJavaScript = await browser.newPage({ javaScriptEnabled: false });
  try {
    await withoutJavaScript.goto(pathToFileURL(path.join(base, 'index.html')).href);
    assert.equal(await withoutJavaScript.locator('.card').count(), 144);
    assert.equal(await withoutJavaScript.locator('a.download').count(), 144);
    assert.equal(await withoutJavaScript.locator('noscript').isVisible(), true);
  } finally { await withoutJavaScript.close(); }
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  const report = {
    verifiedAtUtc: new Date().toISOString(), browserVersion: browser.version(), deliveryTransport: 'file://',
    passed: true, nativeImagesLoaded: loaded.length, nativeDimensions: [1024, 1536], nativeDecodeStrategy: 'sequential-individual-decode', manifestIdentitiesVerified: identities.length,
    localLinksChecked: localLinks.length, filters: { all: 144, lots: { V611: 36, V612: 36, V613: 36, V614: 18, V615: 18 }, families: { enforcers: 126, sucklings: 18 }, eachRole: 18, oneGroup: 8, currentGroup: 1, currentRole: 1, empty: 0, reset: 144 },
    accentInsensitiveSearchVerified: true, finalPromptsRecoveredV615: finalPromptsRecovered, finalPromptsUnrecoveredV615: missingEvidence.length, historicalFinalPromptsUnrecoveredV613: historicalMissing,
    backgroundToggleVerified: true, withoutJavaScript: { cards: 144, downloads: 144 }, mobileViewport: mobile.viewport, mobileDocumentWidth: mobile.documentWidth, mobileCurrentGroupCards: 1,
    currentLotLightReviewPanels: lightReviewPanels, currentLotLightReviewIds: current.map(asset => asset.id),
    pageErrors: errors, externalNetworkRequests: external, screenshots: ['gallery-desktop.png', ...lightReviewPanels, ...groupScreens, 'gallery-mobile.png', 'gallery-mobile-controls.png', 'gallery-mobile-card.png'],
  };
  await fs.writeFile(path.join(out, 'browser-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
