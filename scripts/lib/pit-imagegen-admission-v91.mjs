import { createHash } from 'node:crypto';
import { readFile, mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { validateHunterSpriteAtlas, processHunterSpriteTransparency } from '../../app/game/hunterSpriteAtlas.ts';
import { measureSpriteContact } from '../../app/game/spriteContact.ts';

// Intake only. Never edits a runtime registry, source pixels, simulation or saves.
// Distinct pixels are evidence of distinct drawings, never proof of anatomy/gait/lore.
export const PIT_IMAGEGEN_REVIEW_CHECKS_V91 = Object.freeze([
  'identityAndCostume', 'nativeFacing', 'anatomyAndEquipment',
  'motionSequence', 'frameCuts', 'registrationAndBodyReference',
]);
export const sha256V91 = value => createHash('sha256').update(value).digest('hex');
const clone = value => structuredClone(value);
const key = rect => rect.join(',');
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;
const safeId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,119}$/.test(value);
const digestJson = value => sha256V91(JSON.stringify(value));
let appearanceCatalogue;
async function existingAppearanceOwners() {
  appearanceCatalogue ??= (async () => {
    const names = ['pitUserHuntersV44.json', 'pitUserHuntersV62.json', 'pitUserHuntersV79.json', 'pitUserVariantsV63.json'];
    const documents = await Promise.all(names.map(async name => {
      const bytes = await readFile(new URL('../../app/game/data/' + name, import.meta.url));
      return { name, sha256: sha256V91(bytes), data: JSON.parse(bytes.toString('utf8')) };
    }));
    // Same ordered source catalogue and later-by-ID replacement as pitUserRoster.
    const hunters = new Map(documents.slice(0, 3).flatMap(d => d.data.fighters).map(h => [h.id, h]));
    const additions = new Map(documents[3].data.variantAdditions.map(a => [a.fighterId, a.variants]));
    const owners = new Set([...hunters.values()].flatMap(h => [...h.variants, ...(additions.get(h.id) ?? [])]
      .map(v => JSON.stringify([h.id, v.id]))));
    return { owners, sourceSha256: Object.fromEntries(documents.map(d => [d.name, d.sha256])) };
  })();
  return appearanceCatalogue;
}

function cutPixels(pixels, pageWidth, rect) {
  const [sx, sy, width, height] = rect, result = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const from = ((sy + y) * pageWidth + sx + x) * 4;
    // Hidden RGB and removed alpha noise never create a new drawing.
    if (pixels[from + 3]) for (let c = 0; c < 4; c++) result[(y * width + x) * 4 + c] = pixels[from + c];
  }
  return result;
}

function bounds(pixels, width, height, threshold) {
  let minX = width, minY = height, maxX = -1, maxY = -1, visible = 0, edge = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (pixels[(y * width + x) * 4 + 3] <= threshold) continue;
    visible++; minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    if (!x || !y || x === width - 1 || y === height - 1) edge++;
  }
  return { visible, edge, rect: visible ? [minX, minY, maxX - minX + 1, maxY - minY + 1] : null };
}

function trimmedFingerprint(pixels, width, rect, silhouette = false, mirror = false) {
  if (!rect) return null;
  const [sx, sy, w, h] = rect, canonical = Buffer.alloc(w * h * (silhouette ? 1 : 4));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const from = ((sy + y) * width + sx + x) * 4, dx = mirror ? w - 1 - x : x;
    if (silhouette) canonical[y * w + dx] = pixels[from + 3] >= 128 ? 255 : 0;
    else if (pixels[from + 3]) pixels.copy(canonical, (y * w + dx) * 4, from, from + 4);
  }
  return sha256V91(Buffer.concat([Buffer.from(w + ',' + h + ':'), canonical]));
}

/** One original PNG, one physical page; explicit irregular cuts are supported. */
export async function auditPitImagegenSheetV91(candidate, bytes) {
  const sourceSha256 = sha256V91(bytes), definition = clone(candidate?.definition ?? {});
  const contractSha256 = digestJson(definition), issues = [], warnings = [];
  const report = { schemaVersion: 1, release: 'V91', id: candidate?.id ?? null,
    sourceSha256, sourceBytes: bytes.length, contractSha256,
    technicalAccepted: false, visualStatus: 'pending', runtimeAccepted: false,
    canonicalFidelityCertified: false, frames: [], clips: [], issues, warnings,
    provenance: clone(candidate?.provenance ?? null),
    definition, limits: ['Pixel checks do not certify anatomy, identity, lore or motion quality.',
      'Ground contact measures alpha support, not the anatomical soles or a canonical standing-body height.'] };
  const reject = (code, detail) => issues.push({ code, detail });
  if (!safeId(candidate?.id)) reject('invalid-candidate-id', candidate?.id);
  if (candidate?.sourceSha256 && candidate.sourceSha256 !== sourceSha256) reject('source-sha-mismatch', candidate.sourceSha256);
  const validation = validateHunterSpriteAtlas(definition.atlas);
  if (!validation.valid) reject('runtime-atlas-contract-invalid', validation.issues);
  if (definition.atlas?.characterId !== definition.fighterId ||
      definition.atlas?.variantId !== definition.variantId || !definition.variantId) reject('appearance-owner-mismatch', null);
  if (typeof definition.fighterId === 'string' && typeof definition.variantId === 'string') {
    const catalogue = await existingAppearanceOwners();
    report.appearanceOwner = { matched: catalogue.owners.has(JSON.stringify([definition.fighterId, definition.variantId])),
      catalogueSourceSha256: catalogue.sourceSha256 };
    if (!report.appearanceOwner.matched) reject('appearance-not-in-existing-runtime-catalogue', [definition.fighterId, definition.variantId]);
  }
  if (!Number.isFinite(definition.bodyHeightPx) || definition.bodyHeightPx <= 0) reject('unmeasured-body-reference', null);
  if (!positiveInteger(candidate?.expectedNativeFrames) || candidate.expectedNativeFrames < 2) reject('expected-native-frame-count-required', null);
  if (definition.atlas?.pages?.length !== 1) reject('one-original-one-page-required', null);
  if (issues.length) return report;
  const page = definition.atlas.pages[0];
  if (!/^\/game\/sprites\/v91\/pit\/[a-z0-9/-]+\.png$/.test(page.src) || page.src.split('/').includes('..')) reject('unsafe-runtime-destination', page.src);
  if (page.transparency.mode !== 'alpha') reject('native-alpha-required', page.transparency.mode);
  if (page.width * page.height > 16_777_216) reject('runtime-pixel-budget-exceeded', null);
  if (definition.pageBodyHeightPx && Object.entries(definition.pageBodyHeightPx).some(([id, n]) => id !== page.id || !Number.isFinite(n) || n <= 0)) reject('invalid-page-body-reference', null);
  if (definition.atlas.clips.some(c => c.ticksPerSecond !== 60)) reject('pit-60-ticks-required', null);
  if (issues.length) return report;
  let metadata, decoded;
  try {
    metadata = await sharp(bytes, { limitInputPixels: 16_777_216 }).metadata();
    if (metadata.format !== 'png' || !metadata.hasAlpha) reject('native-rgba-png-required', metadata.format);
    if (metadata.width !== page.width || metadata.height !== page.height) reject('decoded-dimensions-mismatch', [metadata.width, metadata.height]);
    if (metadata.pages && metadata.pages !== 1) reject('animated-container-not-authored-atlas', metadata.pages);
    if (issues.length) return report;
    decoded = await sharp(bytes, { limitInputPixels: 16_777_216 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  } catch (error) { reject('png-decode-failed', error.message); return report; }
  report.image = { width: metadata.width, height: metadata.height, hasAlpha: metadata.hasAlpha, format: metadata.format };
  const prepared = processHunterSpriteTransparency(new Uint8ClampedArray(decoded.data), page.width, page.height, page.transparency);
  report.alphaNoisePixelsRemovedInPrivateMemory = prepared.alphaNoisePixels;
  const cells = new Map(), frameUsages = definition.atlas.clips.flatMap(c => c.frames);
  for (const frame of frameUsages) {
    if (cells.has(key(frame.rect))) continue;
    const [sx, sy, width, height] = frame.rect, pixels = cutPixels(prepared.pixels, page.width, frame.rect);
    const alpha = bounds(pixels, width, height, 0), solid = bounds(pixels, width, height, 127);
    let maximumRawEdgeAlpha = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (!x || !y || x === width - 1 || y === height - 1)
        maximumRawEdgeAlpha = Math.max(maximumRawEdgeAlpha, decoded.data[((sy + y) * page.width + sx + x) * 4 + 3]);
    }
    const contact = measureSpriteContact(pixels, width, height, frame.pivot[1]);
    const cell = { rect: frame.rect, visiblePixels: alpha.visible, borderPixelsAboveDeclaredNoiseFloor: alpha.edge,
      maximumRawEdgeAlpha, alphaBounds: alpha.rect,
      visibleRect: alpha.rect ? [sx + alpha.rect[0], sy + alpha.rect[1], alpha.rect[2], alpha.rect[3]] : null,
      margins: alpha.rect ? [alpha.rect[0], alpha.rect[1], width - alpha.rect[0] - alpha.rect[2], height - alpha.rect[1] - alpha.rect[3]] : null,
      pixelSha256: sha256V91(pixels), translationInvariantSha256: trimmedFingerprint(pixels, width, alpha.rect),
      solidSilhouetteSha256: trimmedFingerprint(pixels, width, solid.rect, true),
      mirroredContentSha256: trimmedFingerprint(pixels, width, alpha.rect, false, true),
      contact, declaredPivots: frameUsages.filter(f => key(f.rect) === key(frame.rect)).map(f => f.pivot),
      suggestedGroundPivot: contact ? [width / 2, contact.supportY] : null };
    if (!alpha.visible || !solid.visible || alpha.visible === width * height) reject('empty-or-opaque-cell', frame.rect);
    if (alpha.edge) reject('cell-edge-alpha-or-seam', { rect: frame.rect, pixels: alpha.edge });
    if (!contact) warnings.push({ code: 'no-solid-ground-support', rect: frame.rect });
    else if (Math.abs(frame.pivot[1] - contact.supportY) > height * .02)
      warnings.push({ code: 'pivot-ground-registration-needs-review', rect: frame.rect, pivotY: frame.pivot[1], supportY: contact.supportY });
    cells.set(key(frame.rect), cell); report.frames.push(cell);
  }
  const frameKeys = [...cells.keys()];
  for (let i = 0; i < frameKeys.length; i++) for (let j = i + 1; j < frameKeys.length; j++) {
    const a = cells.get(frameKeys[i]).rect, b = cells.get(frameKeys[j]).rect;
    const x0 = Math.max(a[0], b[0]), y0 = Math.max(a[1], b[1]);
    const x1 = Math.min(a[0] + a[2], b[0] + b[2]), y1 = Math.min(a[1] + a[3], b[1] + b[3]);
    if (x0 >= x1 || y0 >= y1) continue;
    let visibleIntersectionPixels = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++)
      if (prepared.pixels[(y * page.width + x) * 4 + 3]) visibleIntersectionPixels++;
    // The real atlas permits sharing a transparent gutter row. Only overlap of
    // actual prepared content is ambiguous. No RGB/alpha is changed by this test.
    if (visibleIntersectionPixels) reject('overlapping-source-cuts', { rectangles: [a, b],
      intersection: [x0, y0, x1 - x0, y1 - y0], visibleIntersectionPixels });
  }
  if (cells.size !== candidate.expectedNativeFrames) reject('unexpected-native-cell-count', { expected: candidate.expectedNativeFrames, observed: cells.size });
  report.distinctNativeDrawings = new Set(report.frames.map(f => f.translationInvariantSha256)).size;
  report.distinctSolidSilhouettes = new Set(report.frames.map(f => f.solidSilhouetteSha256)).size;
  for (const clip of definition.atlas.clips) {
    const frames = clip.frames.map(f => cells.get(key(f.rect)));
    const content = new Set(frames.map(f => f.translationInvariantSha256));
    const shapes = new Set(frames.map(f => f.solidSilhouetteSha256));
    report.clips.push({ id: clip.id, facing: clip.facing, sourceCellCount: new Set(clip.frames.map(f => key(f.rect))).size,
      distinctNativeDrawings: content.size, distinctSolidSilhouettes: shapes.size,
      totalTicks: clip.frames.reduce((n, f) => n + f.durationTicks, 0), loop: clip.loop,
      animatedEvidence: content.size >= 2 && shapes.size >= 2 });
  }
  // New V91 movement sheets must supply genuine animation per clip. Held poses and
  // one-cell attack phases require a separate, explicitly coordinated phase-group lot.
  for (const clip of report.clips) if (!clip.animatedEvidence) reject('no-distinct-motion-evidence', { clipId: clip.id, facing: clip.facing });
  for (const right of definition.atlas.clips.filter(c => c.facing === 'right')) {
    const left = definition.atlas.clips.find(c => c.id === right.id && c.facing === 'left');
    if (!left) continue;
    const rightHashes = new Set(right.frames.map(f => cells.get(key(f.rect)).mirroredContentSha256));
    if (left.frames.every(f => rightHashes.has(cells.get(key(f.rect)).translationInvariantSha256)))
      reject('left-facing-is-exact-mirror', right.id);
  }
  report.technicalAccepted = issues.length === 0;
  return report;
}

/** Review is bound to both original bytes and the exact cuts/pivots/timebase. */
export function applyPitImagegenReviewV91(report, review) {
  const result = clone(report);
  result.runtimeAccepted = false;
  if (!review) return result;
  if (digestJson(report.definition) !== report.contractSha256 || review.id !== report.id ||
      review.sourceSha256 !== report.sourceSha256 || review.contractSha256 !== report.contractSha256) {
    result.visualStatus = 'stale-review'; return result;
  }
  if (review.decision === 'reject') {
    result.visualStatus = 'rejected'; result.visualReview = clone(review); return result;
  }
  if (review.decision !== 'accept' || !review.reviewer?.trim() || !review.notes?.trim() ||
      !PIT_IMAGEGEN_REVIEW_CHECKS_V91.every(check => review.checks?.[check] === true)) {
    result.visualStatus = 'incomplete-review'; return result;
  }
  result.visualStatus = 'accepted'; result.visualReview = clone(review);
  result.runtimeAccepted = report.technicalAccepted;
  return result;
}

/** Separate physical L/R originals must not disguise one exact mirrored pose set. */
export function auditPitImagegenFacingPairsV91(reports) {
  const result = clone(reports);
  for (const left of result) {
    if (!left.technicalAccepted) continue;
    for (const clip of left.definition.atlas.clips.filter(c => c.facing === 'left')) {
      const counterparts = result.filter(r => r.technicalAccepted && r.definition.fighterId === left.definition.fighterId &&
        r.definition.variantId === left.definition.variantId && r.definition.atlas.clips.some(c => c.id === clip.id && c.facing === 'right'));
      const mirrors = new Set(counterparts.flatMap(r => r.definition.atlas.clips.filter(c => c.id === clip.id && c.facing === 'right')
        .flatMap(c => c.frames.map(f => r.frames.find(cell => key(cell.rect) === key(f.rect)).mirroredContentSha256))));
      if (!mirrors.size || !clip.frames.every(f => mirrors.has(left.frames.find(cell => key(cell.rect) === key(f.rect)).translationInvariantSha256))) continue;
      left.issues.push({ code: 'left-facing-is-exact-mirror-across-originals', detail: clip.id });
      left.technicalAccepted = false; left.runtimeAccepted = false;
    }
  }
  return result;
}

/** Pure proposal. It never creates public files or edits/prepends a runtime registry. */
export function planPitImagegenAdmissionV91(reports, expectedSubmissions = 10) {
  if (reports.length !== expectedSubmissions) throw new Error(`Expected exactly ${expectedSubmissions} submitted originals, got ${reports.length}`);
  const seenIds = new Set(), seenSources = new Set(), seenDestinations = new Set();
  for (const report of reports) {
    if (!safeId(report.id) || seenIds.has(report.id) || seenSources.has(report.sourceSha256)) throw new Error('Duplicate or unsafe original identity');
    seenIds.add(report.id); seenSources.add(report.sourceSha256);
    if (!report.runtimeAccepted || !applyPitImagegenReviewV91(report, report.visualReview).runtimeAccepted) continue;
    const src = report.definition.atlas.pages[0].src;
    if (seenDestinations.has(src)) throw new Error('Duplicate runtime destination');
    seenDestinations.add(src);
  }
  const accepted = reports.filter(report => report.runtimeAccepted && applyPitImagegenReviewV91(report, report.visualReview).runtimeAccepted);
  const registryProposal = accepted.map(report => {
    const definition = clone(report.definition); definition.atlas.status = 'validated';
    definition.atlas.pages.forEach(p => { p.status = 'validated'; });
    definition.atlas.clips.forEach(c => { c.status = 'validated'; });
    definition.visibleFrameBounds = report.frames.map(f => ({ pageId: definition.atlas.pages[0].id, rect: f.rect, visibleRect: f.visibleRect }));
    return definition;
  });
  return { schemaVersion: 1, release: 'V91', expectedSubmissions, submitted: reports.length,
    accepted: accepted.length, completeTenPngAdmission: expectedSubmissions === 10 && accepted.length === 10,
    allOriginalsMustBePreserved: true, runtimeRegistryChanged: false, registryProposal,
    preservationCopyPlan: reports.map(r => ({ id: r.id, sourceSha256: r.sourceSha256,
      preservedOriginal: r.preservedOriginal ?? null, destination: `art-source/v91/pit/intake/${r.id}-${r.sourceSha256}.png`,
      runtimeAccepted: accepted.includes(r) })),
    exactCopyPlan: accepted.map(r => ({ id: r.id, sourceSha256: r.sourceSha256, destination: 'public' + r.definition.atlas.pages[0].src })),
    refusedOrPending: reports.filter(r => !accepted.includes(r)).map(r => ({ id: r.id, sourceSha256: r.sourceSha256,
      technicalAccepted: r.technicalAccepted, visualStatus: r.visualStatus })) };
}

async function writeImmutable(file, bytes) {
  await mkdir(path.dirname(file), { recursive: true });
  try {
    const handle = await open(file, 'wx');
    try { await handle.writeFile(bytes); } finally { await handle.close(); }
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (sha256V91(await readFile(file)) !== sha256V91(bytes)) throw new Error('Refusing to overwrite different evidence: ' + file);
  }
}

/** Every original, including undecodable/rejected files, is copied before auditing. */
export async function archiveAndAuditPitImagegenBatchV91(intake, outputDirectory) {
  if (intake?.schemaVersion !== 1 || !Array.isArray(intake.candidates) || intake.candidates.length !== 10)
    throw new Error('V91 intake requires exactly ten explicit candidates');
  if (intake.rejectedAttempts !== undefined && !Array.isArray(intake.rejectedAttempts)) throw new Error('Rejected attempts must be explicit records');
  const root = path.resolve(outputDirectory);
  const reviews = intake.reviews ?? [], reports = [], rejectedAttempts = [];
  // Failed generations are additional physical originals, never substituted into
  // the ten final target slots or silently dropped when a replacement is generated.
  for (const attempt of intake.rejectedAttempts ?? []) {
    if (!safeId(attempt.id) || typeof attempt.sourcePath !== 'string' || !attempt.reason?.trim()) throw new Error('Rejected original requires identity/path/reason');
    const bytes = await readFile(attempt.sourcePath), sourceSha256 = sha256V91(bytes);
    if (attempt.sourceSha256 && attempt.sourceSha256 !== sourceSha256) throw new Error('Rejected original SHA mismatch');
    const preservedOriginal = path.join(root, 'originals', `${attempt.id}-${sourceSha256}.png`);
    await writeImmutable(preservedOriginal, bytes);
    rejectedAttempts.push({ ...clone(attempt), sourceSha256, sourceBytes: bytes.length,
      preservedOriginal, runtimeAccepted: false, visualStatus: 'rejected-attempt' });
  }
  for (const candidate of intake.candidates) {
    if (!safeId(candidate.id) || typeof candidate.sourcePath !== 'string') throw new Error('Unsafe candidate/source path');
    const bytes = await readFile(candidate.sourcePath), sourceSha256 = sha256V91(bytes);
    const preserved = path.join(root, 'originals', `${candidate.id}-${sourceSha256}.png`);
    await writeImmutable(preserved, bytes);
    const technical = await auditPitImagegenSheetV91(candidate, bytes);
    const matchingReviews = reviews.filter(r => r.id === candidate.id);
    if (matchingReviews.length > 1) throw new Error('Ambiguous duplicate visual review');
    const report = applyPitImagegenReviewV91(technical, matchingReviews[0]);
    report.preservedOriginal = preserved;
    if (sha256V91(await readFile(candidate.sourcePath)) !== sourceSha256) throw new Error('Original changed during audit');
    reports.push(report);
  }
  const pairAudited = auditPitImagegenFacingPairsV91(reports);
  const admission = planPitImagegenAdmissionV91(pairAudited);
  admission.preservationCopyPlan.push(...rejectedAttempts.map(a => ({ id: a.id, sourceSha256: a.sourceSha256,
    preservedOriginal: a.preservedOriginal, destination: `art-source/v91/pit/intake/${a.id}-${a.sourceSha256}.png`, runtimeAccepted: false })));
  admission.additionalRejectedAttempts = rejectedAttempts.length;
  admission.physicalOriginalsPreserved = reports.length + rejectedAttempts.length;
  // Hash-addressed manifests retain previous reviews instead of replacing refusals.
  const receipt = { intakeSourceKind: 'explicit-imagegen-originals', reports: pairAudited, rejectedAttempts, admission };
  const receiptPath = path.join(root, 'receipts', digestJson(receipt) + '.json');
  await writeImmutable(receiptPath, Buffer.from(JSON.stringify(receipt, null, 2) + '\n'));
  return { receiptPath, ...receipt };
}
