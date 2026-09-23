import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { choosePitFighter } from './pit-selection-browser-helpers.mjs';

const base = (process.env.V45_QA_URL || 'http://127.0.0.1:4174').replace(/\/$/, '');
const output = process.env.V45_QA_OUTPUT || 'work/v45/browser-qa';
await fs.mkdir(output, { recursive: true });
const catalogue = JSON.parse(await fs.readFile('app/game/data/pitUserHuntersV44.json', 'utf8'));
const icons = JSON.parse(await fs.readFile('app/game/data/pitRosterIconsV45.json', 'utf8'));
const ahab = catalogue.fighters.find(fighter => fighter.id === 'user-ahab');
const masked = ahab?.variants.find(variant => variant.id === 'ahab-avec-casque-0c8ceb1c95');
const unmasked = ahab?.variants.find(variant => variant.id === 'ahab-sans-casque-91544a7fb2');
assert(masked && unmasked, 'The two explicitly supplied Ahab appearances are required');
const bundle = await build({ stdin: { contents: "export {PIT_SPRITE_SHEET_REGISTRY} from './app/game/pitSpriteSheetRegistry'; export {PIT_VERSUS_FIGHTER_IDS} from './app/game/systems/pitRosterExpansion';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const { PIT_SPRITE_SHEET_REGISTRY: registry, PIT_VERSUS_FIGHTER_IDS: rosterIds } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const targets = registry.filter(entry => entry.fighterId === ahab.id && entry.variantId === masked.id);
const validatedClips = targets.flatMap(entry => entry.atlas.clips.filter(clip => clip.status === 'validated').map(clip => ({ entry, clip })));
assert.deepEqual(validatedClips.map(({ clip }) => [clip.id, clip.facing, clip.frames.length]).sort(), [['high-guard', 'right', 2], ['idle', 'right', 2]], 'Only the reviewed right-facing Ahab clips may be certified');
const mappings = validatedClips.flatMap(({ entry, clip }) => clip.frames.map((frame, index) => ({ fighter: entry.fighterId, variant: entry.variantId, atlas: entry.atlas.id, clip: clip.id, facing: clip.facing, index, rect: frame.rect, src: entry.atlas.pages.find(source => source.id === frame.pageId).src })));
const errors = [], failures = [], checks = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let page;
function watch(current) {
  current.setDefaultTimeout(45000);
  current.on('pageerror', error => errors.push(error.message));
  current.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
}
async function instrument(current) {
  await current.addInitScript(mappings => {
    // Passive draw observation only: never changes inputs, game state, localStorage or render arguments.
    const original = CanvasRenderingContext2D.prototype.drawImage;
    const origins = new WeakMap();
    window.__v45VisualEvidence = { draws: [], sources: [] };
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      const source = args[0] instanceof HTMLImageElement ? args[0].src : origins.get(args[0]);
      if (source) origins.set(this.canvas, source);
      const observed = this.canvas.hasAttribute('data-pit-arena-id') || this.canvas.closest('[data-pit-production-lab]');
      if (observed && source) {
        const evidence = window.__v45VisualEvidence;
        if (!evidence.sources.includes(source)) evidence.sources.push(source);
        if (args.length === 9) {
          const transform = this.getTransform();
          for (const mapping of mappings.filter(item => source.endsWith(item.src) && item.rect.every((value, index) => value === args[index + 1]))) {
            evidence.draws.push({ ...mapping, destination: args.slice(5), determinant: transform.a * transform.d - transform.b * transform.c });
          }
        }
        if (evidence.draws.length > 3000) evidence.draws.splice(0, 1000);
      }
      return original.apply(this, args);
    };
  }, mappings);
}
async function clearEvidence() { await page.evaluate(() => { window.__v45VisualEvidence = { draws: [], sources: [] }; }); }
const evidence = () => page.evaluate(() => window.__v45VisualEvidence);
const confirm = () => page.locator('[data-pit-selection-confirm]').click();
const saveState = () => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a], [b]) => a.localeCompare(b)))));
async function enter() {
  await enterCampaignDeck(page, { url: base });
  await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  await page.locator('[data-pit-roster-total]').waitFor();
}
async function startMatch({ player, playerVariant = null, opponent, opponentVariant = null }) {
  await enter();
  await page.getByRole('radio', { name: /^Versus local/ }).click();
  await choosePitFighter(page, player);
  await page.locator('[data-pit-variant-select]').selectOption(playerVariant ?? '');
  await confirm();
  await page.locator('[data-pit-selection-slot="opponent"]').waitFor();
  await choosePitFighter(page, opponent);
  await page.locator('[data-pit-variant-select]').selectOption(opponentVariant ?? '');
  await confirm();
  await page.locator('[data-pit-stage-preview][data-preview-status="ready"]').waitFor();
  await confirm();
  await page.locator('canvas[data-pit-arena-id]').waitFor();
  await page.locator('[data-pit-match-loading]').waitFor({ state: 'detached' });
  await page.locator('canvas[data-pit-arena-id]').click();
  await clearEvidence();
}
async function checkStatic(slot, variant, label, guardKey) {
  const marker = page.locator(`[data-pit-bitmap-slot="${slot}"]`);
  await page.waitForFunction(slot => document.querySelector(`[data-pit-bitmap-slot="${slot}"]`)?.getAttribute('data-pit-bitmap-status') === 'static-bitmap', slot);
  assert.equal(await marker.getAttribute('data-pit-bitmap-id'), ahab.id);
  assert.equal(await marker.getAttribute('data-pit-bitmap-variant'), variant.id);
  await page.waitForFunction(src => window.__v45VisualEvidence.sources.some(source => source.endsWith(src)), variant.src);
  assert.equal((await evidence()).draws.length, 0, `${label}: another Ahab appearance or orientation was borrowed`);
  await page.keyboard.down(guardKey);
  try {
    await page.waitForTimeout(500);
    assert.equal(await marker.getAttribute('data-pit-bitmap-status'), 'static-bitmap');
    assert.equal((await evidence()).draws.length, 0, `${label}: guard borrowed a different costume or facing`);
    await page.locator('canvas[data-pit-arena-id]').screenshot({ path: path.join(output, `${label}.png`) });
  } finally { await page.keyboard.up(guardKey); }
  checks.push({ name: label, fighter: ahab.id, variant: variant.id, slot, status: 'static-bitmap', exactSourceDrawn: variant.src, idleAndGuardFallback: true, borrowedAtlasDraws: 0 });
}

try {
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  watch(page); await instrument(page); await enter();
  const saved = await saveState();
  const seen = new Set(), historical = new Set(), pageSizes = [];
  const roster = page.locator('[data-pit-roster-total]');
  assert.equal(Number(await roster.getAttribute('data-pit-roster-total')), rosterIds.length);
  for (let pageIndex = 0; pageIndex < Math.ceil(rosterIds.length / 24); pageIndex++) {
    const tiles = roster.getByRole('option');
    assert((await tiles.count()) <= 24);
    let bytes = 0;
    for (let index = 0; index < await tiles.count(); index++) {
      const tile = tiles.nth(index), id = await tile.getAttribute('data-choice-id');
      if (id.startsWith('user-')) {
        const expected = icons.icons[id], image = tile.locator('img[data-pit-roster-icon]');
        assert(expected, `Missing icon contract ${id}`);
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(image => image.decode());
        const actual = await image.evaluate(image => ({ src: new URL(image.currentSrc).pathname, width: image.naturalWidth, height: image.naturalHeight, loading: image.loading }));
        assert.deepEqual(actual, { src: expected.src, width: expected.width, height: expected.height, loading: 'lazy' });
        assert.equal(await tile.locator('img[src*="/v44/user-hunters/"]').count(), 0);
        assert(!seen.has(id), `${id}: duplicate roster identity`);
        seen.add(id); bytes += expected.bytes;
      } else {
        historical.add(id);
        assert.equal(await tile.locator('[data-pit-roster-icon]').count(), 0);
        assert.equal(await tile.locator('img[src*="/v45/roster-icons/"]').count(), 0);
      }
    }
    pageSizes.push(bytes);
    if (pageIndex === 1) await page.screenshot({ path: path.join(output, 'roster-small-icons.png') });
    const next = page.locator('[data-pit-roster-page-next]');
    if (pageIndex + 1 < Math.ceil(rosterIds.length / 24)) await next.click();
    else assert(await next.isDisabled());
  }
  assert.deepEqual([...seen].sort(), Object.keys(icons.icons).sort());
  assert.equal(historical.size, rosterIds.length - seen.size);
  assert.equal(await saveState(), saved, 'Roster navigation changed campaign progression');
  const iconEntries = Object.values(icons.icons);
  for (let offset = 0; offset < iconEntries.length; offset += 8) {
    await Promise.all(iconEntries.slice(offset, offset + 8).map(async icon => {
      const response = await page.request.get(base + icon.src);
      assert(response.ok(), `${icon.src}: HTTP ${response.status()}`);
      assert.match(response.headers()['content-type'], /^image\/webp/);
      const body = await response.body();
      assert.equal(body.length, icon.bytes);
      assert.equal(createHash('sha256').update(body).digest('hex'), icon.sha256);
      await response.dispose();
    }));
  }
  checks.push({ name: 'all-roster-pages', identities: rosterIds.length, suppliedIcons: seen.size, historicalPortraitsUntouched: historical.size, iconsDecodedAndShaVerified: iconEntries.length, maximumMountedTiles: 24, maximumSuppliedPageBytes: Math.max(...pageSizes), sourcePngUsedByGrid: 0, campaignUnchanged: true });

  await page.goto(base + '/pit-lab', { waitUntil: 'networkidle' });
  const lab = page.locator('[data-pit-production-lab]');
  await page.locator('#production-fighter').selectOption(ahab.id);
  const appearances = await page.locator('#production-variant option').evaluateAll(options => options.map(option => option.value));
  assert.deepEqual(appearances, ahab.variants.map(variant => variant.id));
  await page.locator('#production-variant').selectOption(masked.id);
  assert.equal(await lab.getAttribute('data-variant'), masked.id);
  for (const { entry, clip } of validatedClips) {
    await page.locator('#production-atlas').selectOption(entry.atlas.id);
    await page.locator('#production-clip').selectOption(clip.id);
    await page.locator('#production-facing').selectOption('right');
    await page.waitForFunction(() => document.querySelector('[data-pit-production-lab]')?.dataset.renderStatus === 'ready');
    await page.getByRole('button', { name: 'Début', exact: true }).click();
    const frames = [];
    for (let index = 0; index < clip.frames.length; index++) {
      if (index) await page.getByRole('button', { name: '+1 dessin', exact: true }).click();
      await page.waitForFunction(index => Number(document.querySelector('[data-pit-production-lab]')?.dataset.frameIndex) === index, index);
      const screenshot = await page.locator('canvas').screenshot({ path: path.join(output, `ahab-${clip.id}-right-${index}.png`) });
      frames.push(createHash('sha256').update(screenshot).digest('hex'));
    }
    assert.equal(new Set(frames).size, clip.frames.length, 'Lab frames must visibly differ');
    checks.push({ name: 'masked-ahab-lab', atlas: entry.atlas.id, variant: masked.id, clip: clip.id, facing: 'right', distinctDrawings: frames.length });
    await clearEvidence();
    await page.locator('#production-facing').selectOption('left');
    await page.waitForFunction(() => document.querySelector('[data-pit-production-lab]')?.dataset.renderStatus === 'missing-clip');
    assert(await page.getByRole('button', { name: 'Lecture', exact: true }).isDisabled());
    assert.equal((await evidence()).draws.length, 0, 'Unavailable left orientation must stay empty in lab');
  }
  await page.locator('#production-variant').selectOption(unmasked.id);
  await page.waitForFunction(() => document.querySelector('[data-pit-production-lab]')?.dataset.renderStatus === 'missing-atlas');
  assert.equal(await lab.getAttribute('data-variant'), unmasked.id);
  assert(await page.locator('#production-atlas').isDisabled());
  assert.match(await page.locator('[data-pit-lab-coverage]').innerText(), /^0 atlas/);
  await page.locator('#production-fighter').selectOption('city-hunter');
  assert.equal(await page.locator('#production-variant').inputValue(), '');
  await page.waitForFunction(() => document.querySelector('[data-pit-production-lab]')?.dataset.renderStatus === 'ready');
  const cityVariant = catalogue.fighters.find(fighter => fighter.id === 'city-hunter').variants[0];
  await page.locator('#production-variant').selectOption(cityVariant.id);
  await page.waitForFunction(() => document.querySelector('[data-pit-production-lab]')?.dataset.renderStatus === 'missing-atlas');
  assert.match(await page.locator('[data-pit-lab-coverage]').innerText(), /^0 atlas/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(output, 'lab-exact-appearance-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  checks.push({ name: 'lab-appearance-isolation', ahabAppearanceCount: appearances.length, missingLeftClipNotMirrored: true, unmaskedAhabAtlasCount: 0, cityImportedAtlasCount: 0, historicalCityDefaultPreserved: true, mobileNoHorizontalOverflow: true });

  await startMatch({ player: ahab.id, playerVariant: masked.id, opponent: 'city-hunter' });
  for (const clip of ['idle', 'high-guard']) {
    await clearEvidence();
    if (clip === 'high-guard') await page.keyboard.down('KeyI');
    try {
      await page.waitForFunction(clip => new Set(window.__v45VisualEvidence.draws.filter(draw => draw.clip === clip && draw.facing === 'right').map(draw => draw.index)).size === 2, clip);
      const draws = (await evidence()).draws.filter(draw => draw.clip === clip);
      assert(draws.every(draw => draw.variant === masked.id && draw.facing === 'right' && draw.determinant > 0 && draw.destination[2] > 0 && draw.destination[3] > 0));
      const marker = page.locator('[data-pit-bitmap-slot="0"]');
      assert.equal(await marker.getAttribute('data-pit-bitmap-variant'), masked.id);
      assert.equal(await marker.getAttribute('data-pit-bitmap-status'), 'sprite-sheet-animation');
      if (clip === 'high-guard') {
        // Guard is an entrance followed by a held defensive pose, never a repeating sway.
        await page.waitForTimeout(750);
        await clearEvidence();
        await page.waitForTimeout(550);
        const maintained = (await evidence()).draws.filter(draw => draw.clip === 'high-guard');
        assert(maintained.length > 0, 'Held guard must still render');
        assert.deepEqual([...new Set(maintained.map(draw => draw.index))], [1], 'A held guard must stay on drawing 1');
        await page.keyboard.up('KeyI');
        await clearEvidence();
        await page.waitForFunction(() => window.__v45VisualEvidence.draws.some(draw => draw.clip === 'idle'));
        await clearEvidence();
        await page.keyboard.down('KeyI');
        await page.waitForFunction(() => window.__v45VisualEvidence.draws.some(draw => draw.clip === 'high-guard' && draw.index === 0));
      }
      await page.locator('canvas[data-pit-arena-id]').screenshot({ path: path.join(output, `ahab-masked-right-${clip}-combat.png`) });
      checks.push({ name: 'masked-ahab-live-animation', variant: masked.id, clip, facing: 'right', uniqueDrawings: 2, nativeNotMirrored: true, realKeyboardControl: clip === 'high-guard', ...(clip === 'high-guard' ? { heldFinalDrawing: 1, maintainedObservationMs: 550, releasedThenRestartedAtDrawing: 0 } : {}) });
    } finally { if (clip === 'high-guard') await page.keyboard.up('KeyI'); }
  }
  await startMatch({ player: 'city-hunter', opponent: ahab.id, opponentVariant: masked.id });
  await checkStatic(1, masked, 'ahab-masked-left-static', 'Numpad9');
  await startMatch({ player: ahab.id, playerVariant: unmasked.id, opponent: 'city-hunter' });
  await checkStatic(0, unmasked, 'ahab-unmasked-right-static', 'KeyI');
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  const report = { passed: true, checkedAt: new Date().toISOString(), version: 'V45', url: base, checks, errors, failures, limitations: ['Browser and keyboard validation only; no physical controller certification.', 'Ahab masked: idle and high guard, right-facing only. Other appearances and uncovered directions remain static source art.', 'The reduced roster thumbnails do not change full-resolution combat sources.'] };
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} catch (error) {
  if (page && !page.isClosed()) {
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), checks, errors, failures, body: await page.locator('body').innerText().catch(() => null), visualEvidence: await evidence().catch(() => null) }, null, 2));
  }
  throw error;
} finally { await browser.close(); }