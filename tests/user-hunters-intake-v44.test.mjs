import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const readJson = (name) => JSON.parse(readFileSync(path.join(root, name), 'utf8'));
const catalog = readJson('app/game/data/pitUserHuntersV44.json');
const report = readJson('docs/v44-user-hunters-intake.json');
const variants = catalog.fighters.flatMap((fighter) => fighter.variants);

test('V44 hunter intake accounts for every archive PNG without promoting historical references', () => {
  assert.equal(report.inputPngCount, report.entries.length);
  assert.equal(report.inputPngCount, report.variantCount + report.duplicateEntries + report.excludedEntries);
  assert.equal(report.archives.length, 10);
  assert.equal(report.archives.find((archive) => archive.name.endsWith('.html')).embeddedAssetsTotal, 48);
  assert.equal(report.archives.find((archive) => archive.name.endsWith('.html')).hunterAssetsSelected, 12);
  assert.equal(report.entries.filter((entry) => entry.archive.endsWith('.rar')).length, 50);
  assert.equal(report.fighterCount, catalog.fighters.length);
  assert.equal(report.variantCount, variants.length);
  assert.equal(catalog.exclusions.length, report.excludedEntries);
  assert.equal(new Set(variants.map((variant) => variant.sha256)).size, variants.length);
  for (const variant of variants) {
    assert.doesNotMatch(variant.sourceEntry, /HISTORIQUE|AVANT_CORRECTION|NON_VALIDEES|PLANCHE/i);
    assert.equal(variant.frameCount, 1);
    assert.equal(variant.animated, false);
  }
});

test('V44 one identity contains mask and costume variants without duplicate roster tiles', () => {
  assert.equal(new Set(catalog.fighters.map((fighter) => fighter.id)).size, catalog.fighters.length);
  const city = catalog.fighters.find((fighter) => fighter.id === 'city-hunter');
  assert.ok(city.variants.some((variant) => variant.sourceEntry.includes('city_hunter/avec_casque.png')));
  assert.ok(city.variants.some((variant) => variant.sourceEntry.includes('city_hunter/sans_casque.png')));
  assert.ok(city.variants.some((variant) => variant.sourceEntry.includes('city_hunter_genesis/')));
  assert.ok(city.variants.some((variant) => variant.sourceEntry.endsWith('35_predator2_city_hunter.png')));
  assert.equal(catalog.fighters.filter((fighter) => fighter.id === 'valkyrie').length, 1);
  assert.ok(catalog.fighters.find((fighter) => fighter.id === 'valkyrie').variants.length >= 4);
  for (const fighter of catalog.fighters) {
    assert.doesNotMatch(fighter.name, /\.png|_|a clean|a full body/i);
    assert.equal(fighter.canonicalFidelityCertified, false);
    assert.ok(['source-labelled', 'descriptive-source-name'].includes(fighter.identityStatus));
  }
});

test('V44 full published art set matches source SHA and reviewed geometry', () => {
  let bytes = 0;
  for (const variant of variants) {
    const local = path.resolve(root, 'public', variant.src.replace(/^\//, ''));
    assert.ok(local.startsWith(path.join(root, 'public', 'game', 'sprites', 'v44') + path.sep));
    const png = readFileSync(local);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(createHash('sha256').update(png).digest('hex'), variant.sha256, variant.src);
    assert.equal(png.readUInt32BE(16), variant.width);
    assert.equal(png.readUInt32BE(20), variant.height);
    assert.equal(variant.orientationStatus, 'visual-contact-reviewed');
    assert.ok(['left', 'right'].includes(variant.nativeFacing));
    assert.ok(variant.pivot[0] >= 0 && variant.pivot[0] < variant.width);
    assert.ok(variant.pivot[1] < variant.height && variant.pivot[1] > variant.bodyTopY);
    assert.equal(variant.alphaRange[0], 0);
    bytes += png.length;
  }
  assert.equal(bytes, report.publishedBytes);
});
