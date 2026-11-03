import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { measureSpriteContact } from '../app/game/spriteContact.ts';
import { renderPitRosterIcon } from './build-pit-roster-icons-v45.mjs';

const seeds = JSON.parse(await fs.readFile('docs/v62-generation/emissary-phg-seeds.json', 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fighterId = 'user-emissary-phg', variantId = 'emissary-phg-official-armour-v62';
const directory = '/game/sprites/v62/fighters/emissary-phg';
await fs.mkdir(`public${directory}`, { recursive: true });
const measured = [];
for (const seed of seeds.accepted) {
  assert(seed.visualReviewed === true);
  const bytes = await fs.readFile(seed.nativePath);
  const meta = await sharp(bytes).metadata();
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert(meta.hasAlpha);
  const columns = seed.kind === 'portrait' ? 1 : 3, rows = seed.kind === 'portrait' ? 1 : 2;
  const w = info.width / columns, h = info.height / rows;
  assert(Number.isInteger(w) && Number.isInteger(h));
  const frames = [];
  for (let index = 0; index < columns * rows; index++) {
    const x0 = index % columns * w, y0 = Math.floor(index / columns) * h;
    const pixels = Buffer.alloc(w * h * 4);
    let minX = w, minY = h, maxX = -1, maxY = -1, transparent = 0, borderAlpha = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const offset = ((y0 + y) * info.width + x0 + x) * 4;
      data.copy(pixels, (y * w + x) * 4, offset, offset + 4);
      const a = data[offset + 3];
      if (a > 2) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      else transparent++;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) borderAlpha = Math.max(borderAlpha, a);
    }
    assert(maxX >= minX && maxY >= minY && transparent > w * h * .15, 'Complete transparent silhouette required.');
    assert(borderAlpha <= 16, `${seed.id} frame${index}: source crosses cell edge (${borderAlpha}).`);
    const contact = measureSpriteContact(pixels, w, h, h);
    assert(contact);
    frames.push({ rect: [x0, y0, w, h], pivot: [w / 2, contact.supportY],
      alphaBounds: [minX, minY, maxX - minX + 1, maxY - minY + 1], maxEdgeAlpha: borderAlpha,
      supportY: contact.supportY, frameSha256: hash(pixels), transparentFraction: transparent / (w * h) });
  }
  if (seed.kind !== 'portrait') assert.equal(new Set(frames.map(frame => frame.frameSha256)).size, 6);
  const src = `${directory}/${seed.id}.png`;
  await fs.copyFile(seed.nativePath, `public${src}`);
  assert.equal(hash(await fs.readFile(`public${src}`)), hash(bytes));
  measured.push({ ...seed, src, sha256: hash(bytes), bytes: bytes.length, width: info.width, height: info.height,
    hasAlpha: true, sourcePixelsModified: false, frames });
}
const portrait = measured.find(item => item.kind === 'portrait');
assert(portrait);
const p = portrait.frames[0];
const { data: iconBytes, info: iconInfo } = await renderPitRosterIcon(await fs.readFile(`public${portrait.src}`));
const iconSrc = `${directory}/roster-icon.webp`;
await fs.writeFile(`public${iconSrc}`, iconBytes);
const icon = { src: iconSrc, width: iconInfo.width, height: iconInfo.height, bytes: iconBytes.length,
  sourceSrc: portrait.src, sourceSha256: portrait.sha256, sourceVariantId: variantId, sha256: hash(iconBytes) };
const variant = { id: variantId, label: 'Hunting Grounds · tenue militaire référencée', src: portrait.src,
  width: portrait.width, height: portrait.height, pivot: p.pivot, bodyTopY: p.alphaBounds[1], nativeFacing: 'right',
  sha256: portrait.sha256, sourceArchive: 'OpenAI intégré V62 · références primaires IllFonic / PlayStation',
  sourceEntry: 'docs/v62-generation/emissary-phg-art.json', frameCount: 1, animated: false,
  identityStatus: 'primary-game-incarnation', canonicalFidelityCertified: false,
  sourceUrls: seeds.referenceUrls, sourceNotes: seeds.loreLimits };
await fs.writeFile('app/game/data/pitUserHuntersV62.json', JSON.stringify({ schemaVersion: 1, release: 'V62', fighters: [{
  id: fighterId, name: 'Emissary — Hunting Grounds', sourceLabel: 'Predator: Hunting Grounds · Emissary DLC · références officielles',
  artProvenance: 'openai-primary-reference', canonicalFidelityCertified: false, variants: [variant], icon,
}] }, null, 2) + '\n');
const sheets = measured.filter(item => item.kind === 'idle');
assert.deepEqual(sheets.map(item => item.facing).sort(), ['left', 'right']);
const pages = sheets.map(item => ({ id: item.id, src: item.src, width: item.width, height: item.height,
  status: 'validated', transparency: { mode: 'alpha', noiseFloor: 2 } }));
const reference = Object.fromEntries(sheets.map(item => [item.id, Math.round(item.frames.reduce((sum, frame) => sum + frame.supportY - frame.alphaBounds[1], 0) / 6)]));
const clips = sheets.map(item => ({ id: 'idle', facing: item.facing, status: 'validated', loop: true,
  ticksPerSecond: 60, frames: item.frames.map(frame => ({ pageId: item.id, rect: frame.rect, pivot: frame.pivot, durationTicks: 12 })) }));
const common = { fighterId, variantId, bodyHeightPx: reference[sheets[0].id], pageBodyHeightPx: reference,
  visibleFrameBounds: sheets.flatMap(item => item.frames.map(frame => ({ pageId: item.id, rect: frame.rect,
    visibleRect: [frame.rect[0] + frame.alphaBounds[0], frame.rect[1] + frame.alphaBounds[1], frame.alphaBounds[2], frame.alphaBounds[3]] }))) };
const atlas = { schemaVersion: 1, id: 'emissary-phg-idle-v62', characterId: fighterId, variantId,
  sourceKind: 'authored-frames', status: 'validated', pages, clips };
// A separate declared one-drawing stance permits honest native-side fallback in uncovered actions.
// The idle animation remains the first matching definition; no new attack clip is invented.
const held = { ...common, visibleFrameBounds: undefined,
  heldPoseClips: sheets.map(item => ({ id: 'idle', facing: item.facing })),
  atlas: { ...atlas, id: 'emissary-phg-stance-v62', clips: clips.map(clip => ({ ...clip, loop: false,
    frames: [{ ...clip.frames[0], durationTicks: 1 }] })) } };
await fs.writeFile('app/game/data/pitUserAnimationsV62.json', JSON.stringify([{ ...common, atlas }, held], null, 2) + '\n');
await fs.writeFile('docs/v62-generation/emissary-phg-art.json', JSON.stringify({ schemaVersion: 1, fighterId, variantId,
  sourceCells: ['02_PERSONNAGES!A207:V207', '03_MANQUANTS!A12:L12'], method: 'builtin-imagegen',
  referenceUrls: seeds.referenceUrls, loreLimits: seeds.loreLimits, accepted: measured, rejected: seeds.rejected,
  deliveredNativeDrawings: measured.reduce((sum, item) => sum + item.frames.length, 0), nativeAnimationClips: 2,
  heldFallbackClipsAreNotAnimations: true, complete18ActionKit: false, icon,
  iconDerivation: { crop: false, mirror: false, resizeOnly: true, losslessWebp: true, sourcePixelsModified: false },
  visualRuntimeReview: 'pending' }, null, 2) + '\n');
console.log(JSON.stringify({ fighterId, pngs: measured.length, nativeDrawings: 13, iconBytes: icon.bytes,
  pages: measured.map(item => ({ id: item.id, frames: item.frames.map(frame => ({ bounds: frame.alphaBounds, pivot: frame.pivot, edge: frame.maxEdgeAlpha })) })) }));
