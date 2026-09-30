import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { renderPitRosterIcon } from './build-pit-roster-icons-v45.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inventory = JSON.parse(await fs.readFile('docs/v56-user-pack-inventory.json', 'utf8'));
const rows = [
  ['original-arid-ermit-yautja', 'Arid Ermit Yautja', 'Arid Ermit Yautja.png', 'arid-ermit-yautja', 485, 'exec-cd3d642c-c1c9-4c25-8a69-f318d767e4ba.png'],
  ['original-mutated-yautja', 'Yautja Mutated', 'Yautja Mutated.png', 'mutated-yautja', 500, 'exec-595d6403-fd92-4578-81bc-905a04b5448a.png'],
  ['guest-amengi-female', 'Amengi female', 'Amengi female.png', 'amengi-female', 715, 'exec-5b42891d-6a3b-4c17-a846-625063216955.png'],
];
const fighters = [];
await fs.mkdir('public/game/user-pack/v56/icons', { recursive: true });
await fs.mkdir('work-local/v56/cutout-qa', { recursive: true });
for (const [fighterId, name, sourceName, basename, pivotX, generationFile] of rows) {
  const source = inventory.files.find(entry => entry.name === sourceName);
  assert(source, `Missing inventoried source ${sourceName}`);
  assert.equal(hash(await fs.readFile(path.join('public/game/user-pack/v56/source', sourceName))), source.sha256, `${sourceName}: original must remain byte-identical`);
  const sourceSrc = `/game/user-pack/v56/source/${encodeURIComponent(sourceName)}`;
  const src = `/game/user-pack/v56/cutouts/${basename}.png`;
  const file = path.join('public', src.slice(1));
  const bytes = await fs.readFile(file), metadata = await sharp(bytes).metadata();
  assert(metadata.hasAlpha && metadata.format === 'png');
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = {};
  let transparent = 0, maximumAlpha = 0;
  for (let i = 3; i < data.length; i += 4) { if (data[i] === 0) transparent++; maximumAlpha = Math.max(maximumAlpha, data[i]); }
  for (const threshold of [0, 2, 16, 128, 240]) {
    let left = info.width, top = info.height, right = -1, bottom = -1, pixels = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] <= threshold) continue;
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); pixels++;
    }
    bounds[threshold] = { left, top, right, bottom, pixels };
  }
  assert(transparent > info.width * info.height * .3 && bounds[128].pixels > 10000, `${fighterId}: alpha coverage`);
  // Match runtime contact measurement; one stray antialias pixel must not shift a body.
  const minimumPixels = Math.max(2, Math.min(8, Math.ceil(info.width * .003)));
  let supportY = -1;
  for (let y = info.height - 1; y >= 0; y--) {
    let n = 0; for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] >= 128) n++;
    if (n >= minimumPixels) { supportY = y + 1; break; }
  }
  assert(supportY > bounds[128].top);
  const { data: icon, info: iconInfo } = await renderPitRosterIcon(bytes);
  const iconSrc = `/game/user-pack/v56/icons/${basename}.webp`;
  await fs.writeFile(path.join('public', iconSrc.slice(1)), icon);
  // QA-only matte shows actual native alpha; it never replaces the production PNG.
  await sharp(bytes).flatten({ background: '#34404a' }).resize({ height: 800 }).png().toFile(`work-local/v56/cutout-qa/${basename}-matte.png`);
  fighters.push({ fighterId, name, sourceName, sourceSrc, sourceSha256: source.sha256, sourceArchive: path.basename(inventory.archive.path),
    sourceArchiveSha256: inventory.archive.sha256, sourceEntry: sourceName, src, sha256: hash(bytes), bytes: bytes.length,
    width: info.width, height: info.height, pivot: [pivotX, supportY], bodyTopY: bounds[128].top, nativeFacing: 'right',
    frameCount: 1, nativeAnimationClips: 0, visualStatus: 'single-static-cutout', canonicalIdentityVerified: false,
    alpha: { transparentPixels: transparent, maximum: maximumAlpha, bounds },
    generationFile, generationTool: 'OpenAI built-in image_gen', nativeAlphaPreserved: true,
    groundNote: 'Pivot Y is the lowest substantial native-alpha support row. Supplied three-quarter stance has feet at different depths; rear-foot height is preserved, not certified as an authored lateral animation.',
    icon: { src: iconSrc, width: iconInfo.width, height: iconInfo.height, sourceSrc: src, sourceSha256: hash(bytes), sourceVariantId: 'v56-single-pose', bytes: icon.length },
  });
}
const manifest = { schemaVersion: 1, release: 'V56', tool: 'OpenAI built-in image_gen',
  sourcePolicy: 'Exact user labels; three distinct identities, no companion rows, no canonical design certification.',
  nativeAnimationClips: 0, animationClaim: 'Single bitmap poses. No authored animation sheet has been generated in this batch.', fighters };
await fs.writeFile('app/game/data/pitOriginalFighterArtV56.json', JSON.stringify(manifest, null, 2) + '\n');
await fs.writeFile('docs/v56-original-fighter-cutout-provenance.json', JSON.stringify({ ...manifest,
  prompts: 'docs/v56-original-fighter-cutout-prompts.json',
  acceptance: 'Actual matte inspection required; PNG decode and alpha bounds alone do not certify identity, hands, feet or framing.',
}, null, 2) + '\n');
console.log(JSON.stringify(fighters.map(({ fighterId, width, height, pivot, bodyTopY, alpha, bytes }) => ({ fighterId, width, height, pivot, bodyTopY, transparentPixels: alpha.transparentPixels, bytes }))));
