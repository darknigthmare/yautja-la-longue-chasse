import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import sharp from 'sharp';

const manifest = JSON.parse(await fs.readFile('app/game/data/pitRosterIconsV45.json', 'utf8'));
const sourceManifest = JSON.parse(await fs.readFile('app/game/data/pitUserHuntersV44.json', 'utf8'));
const sourceFighters = sourceManifest.fighters.filter(fighter => fighter.id.startsWith('user-') && fighter.variants.length > 0);
const digest = value => createHash('sha256').update(value).digest('hex');
const local = src => path.join('public', src.slice(1));

test('every supplied identity has one small icon for its default appearance, without replacing historical art', () => {
  assert.deepEqual(Object.keys(manifest.icons).sort(), sourceFighters.map(fighter => fighter.id).sort());
  assert.equal(manifest.summary.identities, sourceFighters.length);
  for (const fighter of sourceFighters) {
    const icon = manifest.icons[fighter.id];
    const original = fighter.variants[0];
    assert.equal(icon.sourceVariantId, original.id);
    assert.equal(icon.sourceSrc, original.src);
    assert.equal(icon.sourceSha256, original.sha256);
    assert.equal(icon.src, `/game/sprites/v45/roster-icons/${original.sha256}.webp`);
    assert(icon.width > 0 && icon.width <= 128);
    assert(icon.height > 0 && icon.height <= 192);
    assert(Math.abs(icon.width / icon.height - original.width / original.height) < 0.006, `${fighter.id}: silhouette aspect ratio changed`);
    assert(icon.bytes <= 40 * 1024, `${fighter.id}: grid icon exceeds 40 KiB`);
    assert(icon.bytes < icon.sourceBytes / 50, `${fighter.id}: source-sized image accidentally used as icon`);
  }
  assert(manifest.summary.iconBytes < manifest.summary.sourceBytes * 0.02, 'the default supplied roster must save at least 98% transfer');
  assert.equal(manifest.derivation.crop, false);
  assert.equal(manifest.derivation.mirror, false);
  assert.equal(manifest.derivation.lossless, true);
});

test('all shipped icons decode at declared dimensions with alpha and intact source hashes', async () => {
  let originalBytes = 0, derivedBytes = 0;
  const unique = new Map(Object.values(manifest.icons).map(icon => [icon.sourceSha256, icon]));
  for (const icon of unique.values()) {
    const source = await fs.readFile(local(icon.sourceSrc));
    assert.equal(digest(source), icon.sourceSha256, `Source modified: ${icon.sourceSrc}`);
    assert.equal(source.length, icon.sourceBytes);
    const image = await fs.readFile(local(icon.src));
    assert.equal(digest(image), icon.sha256, `Derived file changed: ${icon.src}`);
    assert.equal(image.length, icon.bytes);
    const metadata = await sharp(image).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, icon.width);
    assert.equal(metadata.height, icon.height);
    assert.equal(metadata.hasAlpha, true);
    originalBytes += source.length; derivedBytes += image.length;
  }
  assert.equal(originalBytes, manifest.summary.sourceBytes);
  assert.equal(derivedBytes, manifest.summary.iconBytes);
  assert.equal(unique.size, manifest.summary.uniqueSources);
});

test('lossless encoded thumbnails preserve the complete resized source and transparent silhouette', async () => {
  const icons = Object.values(manifest.icons);
  // Three independently encoded source silhouettes, including the catalogue boundaries.
  for (const icon of [icons[0], icons[Math.floor(icons.length / 2)], icons.at(-1)]) {
    const expected = await sharp(local(icon.sourceSrc)).resize(manifest.derivation.resize).ensureAlpha().raw().toBuffer();
    const actual = await sharp(local(icon.src)).ensureAlpha().raw().toBuffer();
    assert.equal(actual.length, expected.length);
    let visible = 0, transparent = 0;
    for (let pixel = 0; pixel < actual.length; pixel += 4) {
      assert.equal(actual[pixel + 3], expected[pixel + 3], `Alpha differs at ${pixel}`);
      if (expected[pixel + 3]) {
        visible++;
        assert.deepEqual(actual.subarray(pixel, pixel + 3), expected.subarray(pixel, pixel + 3), `Visible pixels differ at ${pixel}`);
      } else transparent++;
    }
    assert(visible > 0 && transparent > 0, 'portrait must retain visible art and transparent margins');
  }
});

const bundle = await build({ stdin: { contents: `
export {default as Selection} from './app/game/PitSelectionFlow';
export {getPitRosterIcon} from './app/game/pitRosterIcons';
export {PIT_VERSUS_FIGHTER_IDS} from './app/game/systems/pitRosterExpansion';
export {createElement} from 'react';
export {renderToStaticMarkup} from 'react-dom/server';
`, loader: 'tsx', resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', loader: { '.module.css': 'empty' }, logLevel: 'silent' });
const evaluated = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), evaluated, evaluated.exports);
const { Selection, getPitRosterIcon, PIT_VERSUS_FIGHTER_IDS, createElement, renderToStaticMarkup } = evaluated.exports;
const noop = () => {};

test('every roster page requests supplied thumbnails only, while historical portraits stay unchanged', () => {
  const seen = new Set();
  for (let start = 0; start < PIT_VERSUS_FIGHTER_IDS.length; start += 24) {
    const html = renderToStaticMarkup(createElement(Selection, {
      playerId: PIT_VERSUS_FIGHTER_IDS[start], opponentId: 'city-hunter', arenaId: 'temple',
      playerVariantId: null, opponentVariantId: null, mode: 'cpu', locked: false, imposed: false,
      eventOnly: false, playerPreview: null, opponentPreview: null, onPlayerChange: noop,
      onOpponentChange: noop, onPlayerVariantChange: noop, onOpponentVariantChange: noop,
      onArenaChange: noop, onLaunch: noop, onExit: noop, launchLabel: 'COMBAT', launchDisabled: false,
      reducedMotion: true, highContrast: false,
    }));
    let pageBytes = 0;
    for (const match of html.matchAll(/<button[^>]*role="option"[^>]*data-choice-id="([^"]+)"[^>]*>(.*?)<\/button>/gs)) {
      const [, id, tile] = match;
      if (id.startsWith('user-')) {
        const icon = getPitRosterIcon(id);
        assert(icon, id);
        assert(tile.includes(`src="${icon.src}"`), `${id}: missing lightweight portrait`);
        assert(tile.includes(`data-pit-roster-icon="${id}"`));
        assert.doesNotMatch(tile, /\/v44\/user-hunters\//, `${id}: original source leaked into grid`);
        assert.match(tile, /loading="lazy" decoding="async"/);
        pageBytes += icon.bytes;
        seen.add(id);
      } else {
        assert.doesNotMatch(tile, /data-pit-roster-icon/);
        if (id === 'city-hunter') assert.match(tile, /\/v31\/film-plates\/city-hunter\.png/);
      }
    }
    assert(pageBytes < 960 * 1024, 'a supplied roster page must stay below 960 KiB');
  }
  assert.deepEqual([...seen].sort(), Object.keys(manifest.icons).sort());
  for (const invalid of ['city-hunter', 'user-missing', '__proto__', 'constructor']) assert.equal(getPitRosterIcon(invalid), null);
});