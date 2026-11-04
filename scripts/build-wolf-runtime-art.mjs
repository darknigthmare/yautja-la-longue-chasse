import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Re-encode only: no resize, crop, recolour or alpha modification. Generated
// PNG sources and the two V1 generation manifests remain byte-for-byte intact.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const production = path.join(root, 'production/wolf-castle-arrival-20261104');
const manifestNames = ['art-manifest-castle.json', 'art-manifest-arrival-and-characters.json', 'art-manifest-combat-v2.json'];
const check = process.argv.includes('--check');
const encoding = { quality: 86, alphaQuality: 100, effort: 6 };
const manifests = await Promise.all(manifestNames.map(async name => JSON.parse(await readFile(path.join(production, name), 'utf8'))));
const assets = manifests.flatMap(manifest => manifest.assets);
assert.equal(assets.length, 30, 'The existing 27 images and three independent combat poses form this pack');
assert.equal(new Set(assets.map(asset => asset.path)).size, assets.length);
const sha256 = data => createHash('sha256').update(data).digest('hex');

function analyseAlpha(data, width, height) {
  const alpha = Buffer.allocUnsafe(width * height);
  const bounds = [width, height, -1, -1];
  let transparent = 0, visible = 0, opaque = 0, edgePixels = 0, minimum = 255, maximum = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const a = data[index * 4 + 3];
      alpha[index] = a;
      minimum = Math.min(minimum, a);
      maximum = Math.max(maximum, a);
      if (a === 0) transparent++;
      if (a === 255) opaque++;
      if (a >= 16) {
        visible++;
        bounds[0] = Math.min(bounds[0], x);
        bounds[1] = Math.min(bounds[1], y);
        bounds[2] = Math.max(bounds[2], x + 1);
        bounds[3] = Math.max(bounds[3], y + 1);
      }
      if (a >= 128 && (x === 0 || y === 0 || x === width - 1 || y === height - 1)) edgePixels++;
    }
  }
  assert.ok(visible > 0, 'The image must contain visible pixels');
  return { alpha, data: { minimum, maximum, transparentPixels: transparent, opaquePixels: opaque,
    transparentFraction: transparent / (width * height), visiblePixelsAtAlpha16: visible,
    boundsAtAlpha16: bounds, opaqueEdgePixelsAtAlpha128: edgePixels, sha256: sha256(alpha) } };
}

function feetAnchor(data, width, height, bounds) {
  // All three poses have a complete unobstructed two-foot baseline. The lower
  // 7% band excludes the spear; its horizontal midpoint follows the body rather
  // than the increasingly wide weapon silhouette.
  const bandTop = Math.max(0, bounds[3] - Math.round((bounds[3] - bounds[1]) * .07));
  let left = width, right = -1;
  for (let y = bandTop; y < bounds[3]; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] >= 128) {
        left = Math.min(left, x);
        right = Math.max(right, x + 1);
      }
    }
  }
  assert.ok(right > left, 'The foot band must contain visible feet');
  return { x: (left + right) / 2, y: bounds[3], bandTop, bandLeft: left, bandRight: right,
    method: 'midpoint-of-alpha128-lower-7-percent-band' };
}

const report = { schemaVersion: 1, scope: 'wolf-castle-and-arrival-runtime-v2',
  encoding: { format: 'webp', ...encoding, resize: false, crop: false, alphaEqualityRequired: true },
  generatedSourcesPreserved: true, humanArtisticValidation: false, assets: [] };
const mapping = {};
const combatFrames = {};
let originalBytes = 0, runtimeBytes = 0;
for (const asset of assets) {
  assert.match(asset.path, /^public\/game\/(wolf-castle|planet-arrival)\/v[12]\/[a-z0-9-]+\.png$/);
  const source = await readFile(path.join(root, asset.path));
  const sourceHash = sha256(source);
  if (asset.sha256) assert.equal(sourceHash, asset.sha256, `Original source changed: ${asset.path}`);
  const sourceMeta = await sharp(source).metadata();
  const { data: sourcePixels, info: sourceInfo } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(sourceInfo.channels, 4);
  const sourceAlpha = analyseAlpha(sourcePixels, sourceInfo.width, sourceInfo.height);
  const runtimeFile = asset.path.replace(/\.png$/, '.webp');
  if (!check) {
    await sharp(source).keepMetadata().webp(encoding).toFile(path.join(root, runtimeFile));
  }
  const runtime = await readFile(path.join(root, runtimeFile));
  const runtimeMeta = await sharp(runtime).metadata();
  const { data: runtimePixels, info: runtimeInfo } = await sharp(runtime).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(runtimeInfo.width, sourceInfo.width, `Width changed: ${runtimeFile}`);
  assert.equal(runtimeInfo.height, sourceInfo.height, `Height changed: ${runtimeFile}`);
  assert.equal(runtimeInfo.channels, 4);
  const runtimeAlpha = analyseAlpha(runtimePixels, runtimeInfo.width, runtimeInfo.height);
  assert.ok(runtimeAlpha.alpha.equals(sourceAlpha.alpha), `Alpha changed: ${runtimeFile}`);
  assert.deepEqual(runtimeAlpha.data.boundsAtAlpha16, sourceAlpha.data.boundsAtAlpha16);
  assert.ok(runtime.length < source.length, `Optimized copy is not smaller: ${runtimeFile}`);
  const expectedTransparent = asset.expectedTransparency ?? asset.transparent ?? asset.requestedTransparentBackground;
  if (expectedTransparent) {
    assert.equal(sourceMeta.hasAlpha, true, `Missing alpha: ${asset.path}`);
    assert.ok(sourceAlpha.data.transparentPixels > 0, `Opaque transparent sprite: ${asset.path}`);
  }
  assert.equal(sha256(await readFile(path.join(root, asset.path))), sourceHash, `Original changed during conversion: ${asset.path}`);
  originalBytes += source.length;
  runtimeBytes += runtime.length;
  mapping['/' + asset.path.slice('public/'.length)] = '/' + runtimeFile.slice('public/'.length);
  report.assets.push({ id: asset.id, source: asset.path, runtime: runtimeFile,
    width: sourceInfo.width, height: sourceInfo.height, hasAlpha: Boolean(sourceMeta.hasAlpha),
    sourceBytes: source.length, runtimeBytes: runtime.length, bytesSaved: source.length - runtime.length,
    sourceSha256: sourceHash, runtimeSha256: sha256(runtime),
    sourceAlpha: sourceAlpha.data, runtimeAlpha: runtimeAlpha.data,
    dimensionsEqual: true, alphaPixelsEqual: true, originalsUnchanged: true,
    runtimeFormat: runtimeMeta.format, technicalStatus: 'checked', artisticStatus: 'awaiting-human-validation' });
  if (asset.path.includes('/v2/royal-guard-')) {
    assert.equal(sourceAlpha.data.opaqueEdgePixelsAtAlpha128, 0, 'New combat poses may not clip their edges');
    const anchor = feetAnchor(sourcePixels, sourceInfo.width, sourceInfo.height, sourceAlpha.data.boundsAtAlpha16);
    const pose = asset.id.replace('royal-guard-', '');
    combatFrames[pose] = { asset: '/' + runtimeFile.slice('public/'.length), width: sourceInfo.width,
      height: sourceInfo.height, footX: anchor.x, footY: anchor.y, referenceStandingHeight: 1027 };
    if (!check) Object.assign(asset, { width: sourceInfo.width, height: sourceInfo.height,
      hasAlphaChannel: Boolean(sourceMeta.hasAlpha), alphaMin: sourceAlpha.data.minimum, alphaMax: sourceAlpha.data.maximum,
      fullyTransparentPixels: sourceAlpha.data.transparentPixels, transparentFraction: sourceAlpha.data.transparentFraction,
      visibleBoundingBoxAtAlpha16: sourceAlpha.data.boundsAtAlpha16, opaqueEdgePixelsAtAlpha128: 0,
      footAnchor: anchor, suggestedFootAnchorNormalized: [anchor.x / sourceInfo.width, anchor.y / sourceInfo.height],
      bytes: source.length, sha256: sourceHash, runtimeBytes: runtime.length, runtimeSha256: sha256(runtime),
      technicalStatus: 'checked', edgeReview: 'full visible silhouette; zero alpha128 pixels on image edges',
      scaleConvention: 'Shared 1027px standing reference across all three poses; overhead reach and crouch keep their authored extent.' });
  }
}
report.totals = { assetCount: assets.length, existingAssetCount: 27, newCombatPoseCount: 3,
  originalBytes, runtimeBytes, bytesSaved: originalBytes - runtimeBytes,
  reductionPercent: (1 - runtimeBytes / originalBytes) * 100,
  transparentAssetCount: report.assets.filter(asset => asset.hasAlpha).length,
  alphaEqualCount: report.assets.filter(asset => asset.alphaPixelsEqual).length };
const moduleSource = `/**
 * Deterministic WebP encoding of the original individual PNG assets.
 * Dimensions and every alpha pixel are unchanged; generated PNGs stay intact.
 * Rebuild/audit: node scripts/build-wolf-runtime-art.mjs [--check]
 */
export const WOLF_CASTLE_RUNTIME_ART: Readonly<Record<string, string>> = Object.freeze(${JSON.stringify(mapping, null, 2)});

export function wolfCastleRuntimeAsset(source: string): string {
  return WOLF_CASTLE_RUNTIME_ART[source] ?? source;
}

export type WolfCastleCombatPose = 'ready' | 'windup' | 'lunge';
const COMBAT_FRAMES = ${JSON.stringify(combatFrames, null, 2)} as const;

/** One image per pose. The horizontal anchor follows the feet, not the spear. */
export function wolfCastleCombatSpriteFrame(pose: WolfCastleCombatPose, x: number, footY: number, standingHeight = 214) {
  const frame = COMBAT_FRAMES[pose];
  const scale = standingHeight / frame.referenceStandingHeight;
  return { asset: frame.asset, x: x - frame.footX * scale, y: footY - frame.footY * scale,
    width: frame.width * scale, height: frame.height * scale };
}
`;
const reportFile = path.join(production, 'runtime-art-v2.json');
const moduleFile = path.join(root, 'app/game/systems/wolfCastleRuntimeArt.ts');
if (check) {
  const committed = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.deepEqual(report, committed, 'Runtime audit must match the inspected asset bytes');
  assert.equal(await readFile(moduleFile, 'utf8'), moduleSource, 'Runtime mapping/foot frames differ from their measured sources');
} else {
  await writeFile(reportFile, JSON.stringify(report, null, 2) + '\n');
  await writeFile(moduleFile, moduleSource);
  await writeFile(path.join(production, manifestNames[2]), JSON.stringify(manifests[2], null, 2) + '\n');
}
console.log(JSON.stringify({ mode: check ? 'verified' : 'encoded-and-verified', ...report.totals }, null, 2));
