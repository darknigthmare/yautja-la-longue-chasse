import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_MANIFEST = 'app/game/data/pitUserHuntersV44.json';
export const ICON_MANIFEST = 'app/game/data/pitRosterIconsV45.json';
export const ICON_DIRECTORY = 'public/game/sprites/v45/roster-icons';
export const ICON_OPTIONS = Object.freeze({ width: 128, height: 192, fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' });
const digest = value => createHash('sha256').update(value).digest('hex');

/** Derived display thumbnails only: no crop, recolour, mirror, generative edit or source write. */
export async function renderPitRosterIcon(source) {
  return sharp(source, { failOn: 'error' }).resize(ICON_OPTIONS).webp({ lossless: true, effort: 6 }).toBuffer({ resolveWithObject: true });
}

export async function buildPitRosterIcons({ check = false, baseDirectory = root } = {}) {
  const sourceManifest = JSON.parse(await fs.readFile(path.join(baseDirectory, SOURCE_MANIFEST), 'utf8'));
  assert.equal(sourceManifest.schemaVersion, 1);
  const fighters = sourceManifest.fighters.filter(fighter => fighter.id.startsWith('user-') && fighter.variants.length > 0);
  const uniqueIds = new Set();
  const derivedBySource = new Map();
  const icons = {};
  let sourceBytes = 0;
  let iconBytes = 0;
  for (const fighter of fighters) {
    assert.match(fighter.id, /^user-[a-z0-9-]+$/);
    assert(!uniqueIds.has(fighter.id), `Duplicate identity ${fighter.id}`);
    uniqueIds.add(fighter.id);
    const variant = fighter.variants[0];
    assert.equal(variant.frameCount, 1, `${fighter.id}: this pipeline is for static portraits only`);
    assert.equal(variant.animated, false);
    assert.match(variant.sha256, /^[a-f0-9]{64}$/);
    assert.equal(variant.src, `/game/sprites/v44/user-hunters/${variant.sha256}.png`);
    let derived = derivedBySource.get(variant.sha256);
    if (!derived) {
      const source = await fs.readFile(path.join(baseDirectory, 'public', variant.src.slice(1)));
      assert.equal(digest(source), variant.sha256, `${fighter.id}: original hash differs`);
      const metadata = await sharp(source, { failOn: 'error' }).metadata();
      assert.equal(metadata.width, variant.width);
      assert.equal(metadata.height, variant.height);
      assert.equal(metadata.hasAlpha, true);
      const { data, info } = await renderPitRosterIcon(source);
      const file = `${variant.sha256}.webp`;
      const destination = path.join(baseDirectory, ICON_DIRECTORY, file);
      if (check) {
        assert.deepEqual(await fs.readFile(destination), data, `${fighter.id}: stale icon; regenerate V45 icons`);
      } else {
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.writeFile(destination, data);
      }
      // Verify the source still equals the supplied bytes after rendering.
      assert.equal(digest(await fs.readFile(path.join(baseDirectory, 'public', variant.src.slice(1)))), variant.sha256);
      derived = { src: `/game/sprites/v45/roster-icons/${file}`, width: info.width, height: info.height,
        sourceSrc: variant.src, sourceSha256: variant.sha256, sourceBytes: source.length,
        sha256: digest(data), bytes: data.length };
      derivedBySource.set(variant.sha256, derived);
      sourceBytes += source.length;
      iconBytes += data.length;
    }
    icons[fighter.id] = { ...derived, sourceVariantId: variant.id };
  }
  const result = {
    schemaVersion: 1,
    purpose: 'Static roster thumbnails; supplied originals remain the combat and selected-preview assets.',
    derivation: { engine: 'sharp', sharpVersion: sharp.versions.sharp, webpVersion: sharp.versions.webp,
      resize: ICON_OPTIONS, format: 'webp', lossless: true, effort: 6, sourcePixelsModified: false,
      resizedDerivativesOnly: true, crop: false, mirror: false },
    summary: { identities: fighters.length, uniqueSources: derivedBySource.size, sourceBytes, iconBytes,
      transferReductionPercent: Math.round((1 - iconBytes / sourceBytes) * 10000) / 100 },
    icons,
  };
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  const output = path.join(baseDirectory, ICON_MANIFEST);
  if (check) assert.equal(await fs.readFile(output, 'utf8'), serialized, 'Stale roster icon manifest');
  else await fs.writeFile(output, serialized);
  const expected = new Set([...derivedBySource.values()].map(icon => path.basename(icon.src)));
  const actual = (await fs.readdir(path.join(baseDirectory, ICON_DIRECTORY))).filter(file => file.endsWith('.webp'));
  assert.deepEqual(actual.sort(), [...expected].sort(), 'Icon directory must exactly cover the chosen default sources');
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildPitRosterIcons({ check: process.argv.includes('--check') });
  process.stdout.write(`${JSON.stringify({ mode: process.argv.includes('--check') ? 'check' : 'build', ...result.summary })}\n`);
}