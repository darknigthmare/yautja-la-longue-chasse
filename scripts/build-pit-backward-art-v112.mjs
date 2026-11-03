#!/usr/bin/env node
/** Register unchanged native PNG regions. Never write or transform image pixels. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DELIVERY = 'docs/suivi-production/v112-pit-backward/native-frame-delivery.json';
const REVIEW = 'docs/suivi-production/v112-pit-backward/visual-review.json';
const OUTPUT = 'app/game/data/pitWorkbookThrowsV112.json';
const BORDER_REVIEW = 'docs/suivi-production/v112-pit-backward/native-uv-border-review.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async (root, file) => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const nativePath = file => /^public\/game\/sprites\/v112\/pit\/(?:feral-hunter|scar)\/[a-z0-9-]+\.png$/.test(file);

export function inspectNativeBackwardRegionV112(rgba, info, frame) {
  const {width, height, channels} = info;
  assert.equal(channels, 4, 'Native RGBA is required');
  const [x, y, w, h] = frame.rect;
  assert([x, y, w, h].every(Number.isSafeInteger) && x > 0 && y > 0 && w > 2 && h > 2 && x + w < width && y + h < height,
    'A complete selected UV needs an outer source gutter');
  assert(Array.isArray(frame.pivot) && frame.pivot.length === 2 && frame.pivot.every(Number.isFinite));
  assert(Number.isFinite(frame.anatomicalBodyHeightPx) && frame.anatomicalBodyHeightPx > 100 && frame.anatomicalBodyHeightPx < 4000);
  let maxEdge = 0, pixels = 0, zero = 0, x0 = width, y0 = height, x1 = -1, y1 = -1;
  let coreX0 = width, coreY0 = height, coreX1 = -1, coreY1 = -1;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const alpha = rgba[(yy * width + xx) * channels + 3];
    if (xx === x || yy === y || xx === x + w - 1 || yy === y + h - 1) maxEdge = Math.max(maxEdge, alpha);
    if (alpha === 0) zero++;
    if (alpha > 16) {coreX0 = Math.min(coreX0, xx); coreY0 = Math.min(coreY0, yy); coreX1 = Math.max(coreX1, xx); coreY1 = Math.max(coreY1, yy);}
    if (alpha >= 128) {pixels++; x0 = Math.min(x0, xx); y0 = Math.min(y0, yy); x1 = Math.max(x1, xx); y1 = Math.max(y1, yy);}
  }
  assert.equal(maxEdge, 0, 'Every selected native UV border must be exactly alpha0');
  assert(pixels > 1000 && zero > 0, 'A real independent body and native transparency are required');
  const visibleRect = [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
  assert.deepEqual(visibleRect, frame.visibleRect, 'Measured native alpha128 body bounds changed');
  assert.deepEqual([coreX0, coreY0, coreX1, coreY1], frame.visibleBodyBox, 'Measured native alpha16 body bounds changed');
  assert.equal(frame.otherPosePixelsAboveAlpha16, 0, 'Only visually reviewed isolated body regions may be admitted');
  if (frame.anchorKind === 'measured-ground-support') {
    const minimumPixels = Math.max(2, Math.min(8, Math.ceil(w * .003)));
    let support = -1;
    for (let yy = y + h - 1; yy >= y && support < 0; yy--) {
      let count = 0;
      for (let xx = x; xx < x + w; xx++) if (rgba[(yy * width + xx) * channels + 3] >= 128) count++;
      if (count >= minimumPixels) support = yy + 1 - y;
    }
    assert.equal(frame.pivot[1], support, 'Grounded drawing must retain its measured lowest support');
  } else assert.equal(frame.anchorKind, 'authored-airborne-floor-reference');
  return {rect: [...frame.rect], visibleRect, boundaryMaxAlpha: maxEdge, visiblePixels: pixels,
    transparentPixels: zero, anatomicalBodyHeightPx: frame.anatomicalBodyHeightPx, anchorKind: frame.anchorKind};
}

export async function buildPitBackwardArtV112(root = ROOT) {
  const delivery = await json(root, DELIVERY), review = await json(root, REVIEW);
  assert.equal(review.status, 'SOURCE_REGIONS_REVIEWED');
  assert.equal(review.selectedNativeDrawings, 48);
  assert.equal(delivery.groups.length, 8);
  const roles = new Set(), sources = new Map(), slots = [], admissions = [];
  for (const group of delivery.groups) {
    assert(['feral-hunter', 'scar'].includes(group.fighterId) && ['attacker', 'victim'].includes(group.role) && ['left', 'right'].includes(group.facing));
    const key = [group.fighterId, group.role, group.facing].join('/');
    assert(!roles.has(key), 'Every native role/orientation must be unique'); roles.add(key);
    assert.equal(group.frames.length, 6);
    const pages = new Map();
    for (const page of group.pages) {
      assert(nativePath(page.path));
      assert(!pages.has(page.pageId));
      const bytes = await fs.readFile(path.join(root, page.path));
      assert.equal(sha(bytes), page.sha256, 'Native PNG SHA256 changed');
      assert.equal(bytes.length, page.bytes);
      const receipt = await json(root, page.receiptPath);
      assert.equal(receipt.tool, 'image_gen.imagegen');
      assert.equal(receipt.transparentBackgroundRequested, true);
      assert.equal(receipt.filesEditedAfterGeneration, false);
      assert.equal(receipt.status, 'SELECTED_SOURCE_REGIONS');
      assert.equal(receipt.output.path, page.path);
      assert.equal(receipt.output.sha256, page.sha256);
      assert.equal(receipt.output.bytes, page.bytes);
      assert(receipt.submittedPrompt && receipt.submittedReferences.length > 0);
      for (const reference of receipt.submittedReferences) {
        assert(reference.preservedPath, 'Every submitted reference must have a preserved repository source');
        const referenceBytes = await fs.readFile(path.join(root, reference.preservedPath));
        assert.equal(sha(referenceBytes), reference.sha256, 'Native generation reference changed');
        assert.equal(referenceBytes.length, reference.bytes);
      }
      const decoded = await sharp(bytes).raw().toBuffer({resolveWithObject: true});
      assert.equal(decoded.info.width, page.width); assert.equal(decoded.info.height, page.height);
      assert.equal(decoded.info.channels, 4);
      pages.set(page.pageId, {...page, ...decoded}); sources.set(page.path, {path: page.path, sha256: page.sha256, bytes: page.bytes});
    }
    const timings = group.role === 'attacker' ? [5, 5, 1, 2, 16, 16] : [4, 4, 3, 14, 24, 18];
    const frames = group.frames.map((frame, index) => {
      assert.equal(frame.index, index); assert.equal(frame.durationTicks, timings[index]);
      const page = pages.get(frame.pageId); assert(page);
      assert.equal(page.anatomicalBodyHeightPx, frame.anatomicalBodyHeightPx);
      slots.push({slot: key + '/' + index, sourcePath: page.path, pageId: frame.pageId,
        ...inspectNativeBackwardRegionV112(page.data, page.info, frame)});
      return {pageId: frame.pageId, rect: [...frame.rect], pivot: [...frame.pivot], durationTicks: frame.durationTicks};
    });
    assert.equal(new Set(frames.map(frame => JSON.stringify([frame.pageId, frame.rect]))).size, 6);
    const atlasId = group.fighterId + '-backward-throw-' + group.role + '-' + group.facing + '-v112';
    admissions.push({fighterId: group.fighterId, role: group.role, facing: group.facing,
      sources: group.pages.map(({pageId, path: sourcePath, sha256, bytes, receiptPath}) => ({pageId, path: sourcePath, sha256, bytes, receiptPath})),
      review: {status: 'validated', scope: delivery.scope, notes: delivery.calibrationScope + ' Source illustration and native alpha borders are checked independently. See visual-review.json, including the double-shield rejection. Runtime contact and playback have separate public QA.'},
      definition: {fighterId: group.fighterId, bodyHeightPx: group.bodyHeightPx,
        pageBodyHeightPx: Object.fromEntries(group.pages.map(page => [page.pageId, page.anatomicalBodyHeightPx])),
        visibleFrameBounds: group.frames.map(frame => ({pageId: frame.pageId, rect: frame.rect, visibleRect: frame.visibleRect})),
        atlas: {schemaVersion: 1, id: atlasId, characterId: group.fighterId, variantId: 'BODY', sourceKind: 'authored-frames', status: 'validated',
          pages: group.pages.map(page => ({id: page.pageId, src: '/' + page.path.slice(7), width: page.width, height: page.height, status: 'validated', transparency: {mode: 'alpha'}})),
          clips: [{id: group.role === 'attacker' ? 'workbook.' + group.sourceActionId : 'workbook.backward-throw-v112.victim', facing: group.facing, status: 'validated', loop: false, ticksPerSecond: 60, frames}]}}});
  }
  assert.equal(roles.size, 8); assert.equal(sources.size, 22);
  assert.equal(new Set(slots.map(slot => JSON.stringify([sources.get(slot.sourcePath).sha256, slot.rect]))).size, 48);
  return {
    manifest: {schemaVersion: 1, scope: delivery.scope, sourceDeliveryPath: DELIVERY, sourceReviewPath: REVIEW,
      nativeUvReviewPath: BORDER_REVIEW, sourceCompletion: false, closedSourceIds: [], admissions},
    borderReview: {schemaVersion: 1, release: 'V112', scope: 'Read-only native pixel, provenance, exact alpha0 UV border and anatomical-anchor checks. No image pixels rewritten. Visual anatomy and public app behavior remain separate proofs.',
      sourceDeliveryPath: DELIVERY, sourceReviewPath: REVIEW, validNativeRegions: 48, pendingNativeReplacements: 0,
      sourceCompletion: false, sources: [...sources.values()], slots},
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert(args.length === 1 && ['--write', '--check'].includes(args[0]));
  const result = await buildPitBackwardArtV112();
  for (const [file, value] of [[OUTPUT, result.manifest], [BORDER_REVIEW, result.borderReview]]) {
    const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
    if (args[0] === '--write') await fs.writeFile(path.join(ROOT, file), bytes);
    else assert.deepEqual(await fs.readFile(path.join(ROOT, file)), bytes, 'Regenerated native registration differs: ' + file);
  }
  console.log(JSON.stringify({result: 'PASS_NATIVE_BACKWARD_ROLES', roles: 8, nativeDrawings: 48, unchangedPngPages: 22, sourceCompletion: false}));
}
