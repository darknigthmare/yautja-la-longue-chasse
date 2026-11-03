import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { validateHunterSpriteAtlas, resolveHunterSpriteAtlasFrame } from '../app/game/hunterSpriteAtlas.ts';
import {
  auditPitImagegenSheetV91, applyPitImagegenReviewV91, planPitImagegenAdmissionV91,
  archiveAndAuditPitImagegenBatchV91, PIT_IMAGEGEN_REVIEW_CHECKS_V91, sha256V91,
  auditPitImagegenFacingPairsV91,
} from '../scripts/lib/pit-imagegen-admission-v91.mjs';

// Small synthetic pixel fixtures only. These are not game artwork or human QA.
function contract(id = 'synthetic-walk', height = 128) {
  const split = height === 128 ? 64 : 65;
  return { id, expectedNativeFrames: 4, definition: { fighterId: 'user-ahab', variantId: 'ahab-avec-casque-0c8ceb1c95', bodyHeightPx: 40,
    atlas: { schemaVersion: 1, id: id + '-v91', characterId: 'user-ahab', variantId: 'ahab-avec-casque-0c8ceb1c95',
      sourceKind: 'authored-frames', status: 'draft',
      pages: [{ id: 'walk-right', src: '/game/sprites/v91/pit/' + id + '.png', width: 128, height,
        status: 'draft', transparency: { mode: 'alpha', noiseFloor: 2 } }],
      clips: [{ id: 'walk', facing: 'right', status: 'draft', loop: true, ticksPerSecond: 60,
        frames: Array.from({ length: 4 }, (_, i) => ({ pageId: 'walk-right',
          rect: [(i % 2) * 64, i < 2 ? 0 : split, 64, i < 2 ? split : height - split], pivot: [32, 54], durationTicks: 10 })) }] } } };
}

async function image(candidate, { translated = false, recolored = false, hiddenRgbOnly = false, borderAlpha = 0, seed = 0, opaque = false } = {}) {
  const page = candidate.definition.atlas.pages[0], pixels = Buffer.alloc(page.width * page.height * 4);
  const put = (x, y, color, alpha = 255) => {
    const offset = (y * page.width + x) * 4;
    pixels[offset] = color; pixels[offset + 1] = 91; pixels[offset + 2] = 35; pixels[offset + 3] = alpha;
  };
  candidate.definition.atlas.clips[0].frames.forEach((frame, i) => {
    const [sx, sy] = frame.rect, dx = translated ? i * 3 : 0;
    const arm = translated || recolored || hiddenRgbOnly ? 8 : 8 + i * 3, color = 110 + seed + (recolored ? i * 25 : 0);
    if (hiddenRgbOnly) for (let y = 0; y < frame.rect[3]; y++) for (let x = 0; x < frame.rect[2]; x++) put(sx + x, sy + y, 20 + i * 40, 0);
    for (let y = 12; y < 52; y++) for (let x = 22; x < 36; x++) put(sx + x + dx, sy + y, color);
    for (let y = 27; y < 34; y++) for (let x = 36; x < 36 + arm; x++) put(sx + x + dx, sy + y, color);
    if (borderAlpha) put(sx, sy + 20, color, borderAlpha);
  });
  let input = sharp(pixels, { raw: { width: page.width, height: page.height, channels: 4 } });
  if (opaque) input = input.removeAlpha();
  return input.png().toBuffer();
}

function approved(report) {
  return { id: report.id, sourceSha256: report.sourceSha256, contractSha256: report.contractSha256,
    decision: 'accept', reviewer: 'synthetic-unit-test-only', notes: 'Synthetic test of the explicit review gate, not an artistic approval.',
    checks: Object.fromEntries(PIT_IMAGEGEN_REVIEW_CHECKS_V91.map(key => [key, true])) };
}

test('V91 real atlas contract and actual PNG cuts pass without source modification or automatic approval', async () => {
  const candidate = contract(), bytes = await image(candidate), before = Buffer.from(bytes);
  const report = await auditPitImagegenSheetV91(candidate, bytes);
  assert.equal(report.technicalAccepted, true); assert.deepEqual(report.issues, []);
  assert.equal(report.distinctNativeDrawings, 4); assert.equal(report.distinctSolidSilhouettes, 4);
  assert.equal(report.visualStatus, 'pending'); assert.equal(report.runtimeAccepted, false);
  assert.equal(report.appearanceOwner.matched, true);
  assert(report.frames.every(f => f.borderPixelsAboveDeclaredNoiseFloor === 0 && f.contact.supportY === 52));
  assert.deepEqual(bytes, before); assert.equal(candidate.definition.atlas.status, 'draft');
  assert.equal(validateHunterSpriteAtlas(report.definition.atlas).valid, true);
});

test('V91 rejects four translated copies even though full cell pixel hashes are all different', async () => {
  const candidate = contract(), report = await auditPitImagegenSheetV91(candidate, await image(candidate, { translated: true }));
  assert.equal(new Set(report.frames.map(f => f.pixelSha256)).size, 4);
  assert.equal(report.distinctNativeDrawings, 1); assert.equal(report.distinctSolidSilhouettes, 1);
  assert.equal(report.technicalAccepted, false); assert(report.issues.some(i => i.code === 'no-distinct-motion-evidence'));
});

test('V91 recoloring one pose supplies no motion evidence', async () => {
  const candidate = contract(), report = await auditPitImagegenSheetV91(candidate, await image(candidate, { recolored: true }));
  assert.equal(report.distinctNativeDrawings, 4); assert.equal(report.distinctSolidSilhouettes, 1);
  assert.equal(report.technicalAccepted, false);
});

test('V91 hidden RGB under alpha zero never counts as new drawings', async () => {
  const candidate = contract(), report = await auditPitImagegenSheetV91(candidate, await image(candidate, { hiddenRgbOnly: true }));
  assert.equal(new Set(report.frames.map(f => f.pixelSha256)).size, 1);
  assert.equal(report.distinctNativeDrawings, 1); assert.equal(report.technicalAccepted, false);
});

test('V91 uses the actual alpha noise policy:2 permitted in private memory,3 refuses cuts/seams', async () => {
  const candidate = contract(), noisy = await image(candidate, { borderAlpha: 2 });
  const allowed = await auditPitImagegenSheetV91(candidate, noisy);
  assert.equal(allowed.technicalAccepted, true); assert.equal(allowed.alphaNoisePixelsRemovedInPrivateMemory, 4);
  assert(allowed.frames.every(f => f.maximumRawEdgeAlpha === 2));
  const clipped = await auditPitImagegenSheetV91(candidate, await image(candidate, { borderAlpha: 3 }));
  assert.equal(clipped.technicalAccepted, false); assert(clipped.issues.some(i => i.code === 'cell-edge-alpha-or-seam'));
});

test('V91 exact dimensions and native alpha are required, with no color-key conversion', async () => {
  const candidate = contract(), bytes = await image(candidate);
  const wrong = structuredClone(candidate); wrong.definition.atlas.pages[0].width = 129;
  assert((await auditPitImagegenSheetV91(wrong, bytes)).issues.some(i => i.code === 'decoded-dimensions-mismatch'));
  assert((await auditPitImagegenSheetV91(candidate, await image(candidate, { opaque: true }))).issues.some(i => i.code === 'native-rgba-png-required'));
  const colorKey = structuredClone(candidate); colorKey.definition.atlas.pages[0].transparency = { mode: 'color-key', rgb: [255, 0, 255], tolerance: 48 };
  assert((await auditPitImagegenSheetV91(colorKey, bytes)).issues.some(i => i.code === 'native-alpha-required'));
});

test('V91 irregular native row split works but a falsely divisible grid is rejected by the real validator', async () => {
  const candidate = contract('irregular', 129), bytes = await image(candidate);
  assert.equal((await auditPitImagegenSheetV91(candidate, bytes)).technicalAccepted, true);
  candidate.definition.atlas.pages[0].grid = { columns: 2, rows: 2 };
  const report = await auditPitImagegenSheetV91(candidate, bytes);
  assert(report.issues.some(i => i.code === 'runtime-atlas-contract-invalid' && i.detail.some(d => d.code === 'page-not-divisible-by-grid')));
});

test('V91 real PNG cuts may share one transparent row without admitting any visible overlap', async () => {
  const candidate = contract('shared-gutter'), original = await image(candidate);
  const { data, info } = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const x of [28, 92]) data[(64 * info.width + x) * 4 + 3] = 2;
  candidate.definition.atlas.clips[0].frames[0].rect[3] = 65;
  candidate.definition.atlas.clips[0].frames[1].rect[3] = 65;
  const bytes = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  const report = await auditPitImagegenSheetV91(candidate, bytes);
  assert.equal(validateHunterSpriteAtlas(candidate.definition.atlas).valid, true);
  assert.equal(report.technicalAccepted, true); assert.equal(report.alphaNoisePixelsRemovedInPrivateMemory, 2);
  assert.equal(report.distinctNativeDrawings, 4); assert.deepEqual(report.issues, []);
  data[(64 * info.width + 28) * 4 + 3] = 3;
  const visibleOverlap = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  const rejected = await auditPitImagegenSheetV91(candidate, visibleOverlap);
  assert.equal(rejected.technicalAccepted, false);
  assert(rejected.issues.some(i => i.code === 'overlapping-source-cuts' && i.detail.visibleIntersectionPixels === 1));
});

test('V91 ownership, overlapping cuts, expected frame count and PIT timebase cannot be guessed', async () => {
  const original = contract(), bytes = await image(original);
  for (const [mutate, code] of [
    [c => { c.definition.variantId = 'another-mask'; }, 'appearance-owner-mismatch'],
    [c => { c.definition.fighterId = c.definition.atlas.characterId = 'user-no-such-yautja'; }, 'appearance-not-in-existing-runtime-catalogue'],
    [c => { c.definition.atlas.clips[0].frames[1].rect = [32, 0, 64, 64]; }, 'overlapping-source-cuts'],
    [c => { c.expectedNativeFrames = 5; }, 'unexpected-native-cell-count'],
    [c => { c.definition.atlas.clips[0].ticksPerSecond = 30; }, 'pit-60-ticks-required'],
  ]) {
    const candidate = structuredClone(original); mutate(candidate);
    assert((await auditPitImagegenSheetV91(candidate, bytes)).issues.some(i => i.code === code), code);
  }
});

test('V91 review binds exact source and registration; pending/incomplete/stale/rejected never enter proposals', async () => {
  const candidate = contract(), bytes = await image(candidate), report = await auditPitImagegenSheetV91(candidate, bytes);
  const review = approved(report), complete = applyPitImagegenReviewV91(report, review);
  assert.equal(complete.runtimeAccepted, true); assert.equal(complete.canonicalFidelityCertified, false);
  const noCheck = structuredClone(review); noCheck.checks.anatomyAndEquipment = false;
  assert.equal(applyPitImagegenReviewV91(report, noCheck).runtimeAccepted, false);
  const movedPivot = structuredClone(candidate); movedPivot.definition.atlas.clips[0].frames[0].pivot[1]++;
  assert.equal(applyPitImagegenReviewV91(await auditPitImagegenSheetV91(movedPivot, bytes), review).visualStatus, 'stale-review');
  assert.equal(applyPitImagegenReviewV91(await auditPitImagegenSheetV91(candidate, await image(candidate, { seed: 1 })), review).visualStatus, 'stale-review');
  const rejected = applyPitImagegenReviewV91(report, { ...review, decision: 'reject', notes: 'Anatomy problem in synthetic review.' });
  assert.equal(rejected.runtimeAccepted, false); assert.equal(rejected.visualStatus, 'rejected');
  assert.equal(planPitImagegenAdmissionV91([report], 1).registryProposal.length, 0);
  assert.equal(planPitImagegenAdmissionV91([rejected], 1).registryProposal.length, 0);
  const plan = planPitImagegenAdmissionV91([complete], 1), atlas = plan.registryProposal[0].atlas;
  assert.equal(validateHunterSpriteAtlas(atlas).valid, true);
  assert.equal(plan.registryProposal[0].variantId, candidate.definition.variantId);
  assert.deepEqual([0, 10, 20, 30].map(t => resolveHunterSpriteAtlasFrame(atlas, 'walk', 'right', t).frameIndex), [0, 1, 2, 3]);
  assert.equal(resolveHunterSpriteAtlasFrame(atlas, 'walk', 'left', 0), null);
  assert.equal(atlas.status, 'validated'); assert.equal(report.definition.atlas.status, 'draft');
});

test('V91 archives all ten byte-identical originals, including malformed and visually refused, and retains prior receipts', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'pit-admission-v91-'));
  try {
    const candidates = [], reviews = [], originals = [];
    for (let i = 0; i < 10; i++) {
      const candidate = contract('synthetic-' + i), bytes = i === 9 ? Buffer.from('not a PNG, preserved as supplied') : await image(candidate, { seed: i });
      candidate.sourcePath = path.join(temp, 'source-' + i + '.png');
      await writeFile(candidate.sourcePath, bytes); originals.push(bytes); candidates.push(candidate);
      if (i < 2) {
        const report = await auditPitImagegenSheetV91(candidate, bytes);
        reviews.push({ ...approved(report), decision: i === 0 ? 'accept' : 'reject' });
      }
    }
    const output = path.join(temp, 'admission'), first = await archiveAndAuditPitImagegenBatchV91({ schemaVersion: 1, candidates, reviews }, output);
    assert.equal(first.admission.submitted, 10); assert.equal(first.admission.accepted, 1);
    assert.equal(first.admission.completeTenPngAdmission, false); assert.equal(first.admission.registryProposal.length, 1);
    assert.equal(first.admission.exactCopyPlan.length, 1); assert.equal(first.reports[1].visualStatus, 'rejected');
    assert(first.reports[9].issues.some(i => i.code === 'png-decode-failed'));
    for (let i = 0; i < 10; i++) {
      assert.deepEqual(await readFile(first.reports[i].preservedOriginal), originals[i]);
      assert.deepEqual(await readFile(candidates[i].sourcePath), originals[i]);
      assert.equal(sha256V91(originals[i]), first.reports[i].sourceSha256);
    }
    assert.equal((await readdir(path.join(output, 'originals'))).length, 10);
    const repeated = await archiveAndAuditPitImagegenBatchV91({ schemaVersion: 1, candidates, reviews }, output);
    assert.equal(repeated.receiptPath, first.receiptPath);
    const pending = await archiveAndAuditPitImagegenBatchV91({ schemaVersion: 1, candidates }, output);
    assert.equal(pending.admission.accepted, 0); assert.notEqual(pending.receiptPath, first.receiptPath);
    assert.equal((await readdir(path.join(output, 'receipts'))).length, 2);
    assert.equal(JSON.parse(await readFile(first.receiptPath, 'utf8')).reports[1].visualStatus, 'rejected');
    assert.equal((await readdir(output)).includes('public'), false);
    const rejectedSource = path.join(temp, 'extra-rejected-attempt.png'), rejectedBytes = Buffer.from('additional failed imagegen original');
    await writeFile(rejectedSource, rejectedBytes);
    const extra = await archiveAndAuditPitImagegenBatchV91({ schemaVersion: 1, candidates, reviews,
      rejectedAttempts: [{ id: 'wrong-facing-attempt', sourcePath: rejectedSource, reason: 'Wrong native facing; root declined this attempt.' }] }, output);
    assert.equal(extra.admission.submitted, 10); assert.equal(extra.admission.physicalOriginalsPreserved, 11);
    assert.equal(extra.admission.preservationCopyPlan.length, 11); assert.equal(extra.admission.exactCopyPlan.length, 1);
    assert.equal(extra.rejectedAttempts[0].runtimeAccepted, false);
    assert.deepEqual(await readFile(extra.rejectedAttempts[0].preservedOriginal), rejectedBytes);
    assert.equal((await readdir(path.join(output, 'originals'))).length, 11);
    await assert.rejects(archiveAndAuditPitImagegenBatchV91({ schemaVersion: 1, candidates: candidates.slice(1) }, output), /exactly ten/);
  } finally {
    assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
    assert(path.basename(temp).startsWith('pit-admission-v91-'));
    await rm(temp, { recursive: true, force: true });
  }
});

test('V91 exact-ten plan rejects duplicate original bytes or ambiguous destinations', async () => {
  const candidate = contract(), report = await auditPitImagegenSheetV91(candidate, await image(candidate));
  assert.throws(() => planPitImagegenAdmissionV91([report]), /exactly 10/);
  assert.throws(() => planPitImagegenAdmissionV91([report, { ...report, id: 'other-id' }], 2), /Duplicate/);
  const complete = applyPitImagegenReviewV91(report, approved(report));
  const duplicate = structuredClone(complete); duplicate.id = 'other-id'; duplicate.sourceSha256 = 'a'.repeat(64);
  duplicate.visualReview.id = duplicate.id; duplicate.visualReview.sourceSha256 = duplicate.sourceSha256;
  assert.throws(() => planPitImagegenAdmissionV91([complete, duplicate], 2), /Duplicate runtime/);
});

test('V91 L/R sheets cannot register an exact flipped copy as independently authored facing', async () => {
  const right = contract('synthetic-right'), rightBytes = await image(right);
  const left = contract('synthetic-left'); left.definition.atlas.clips[0].facing = 'left';
  const leftBytes = await sharp(rightBytes).flop().png().toBuffer();
  const reports = await Promise.all([auditPitImagegenSheetV91(right, rightBytes), auditPitImagegenSheetV91(left, leftBytes)]);
  assert(reports.every(r => r.technicalAccepted));
  const reviewed = reports.map(r => applyPitImagegenReviewV91(r, approved(r)));
  const checked = auditPitImagegenFacingPairsV91(reviewed);
  assert.equal(checked[0].runtimeAccepted, true); assert.equal(checked[1].runtimeAccepted, false);
  assert(checked[1].issues.some(i => i.code === 'left-facing-is-exact-mirror-across-originals'));
  assert.equal(planPitImagegenAdmissionV91(checked, 2).registryProposal.length, 1);
});

test('V91 a forged boolean cannot bypass the explicit SHA-bound review gate', async () => {
  const candidate = contract(), report = await auditPitImagegenSheetV91(candidate, await image(candidate));
  report.runtimeAccepted = true;
  assert.equal(planPitImagegenAdmissionV91([report], 1).registryProposal.length, 0);
  const complete = applyPitImagegenReviewV91(report, approved(report));
  complete.definition.atlas.clips[0].frames[0].pivot[1]++;
  assert.equal(planPitImagegenAdmissionV91([complete], 1).registryProposal.length, 0);
  // Re-auditing a changed contract is necessary; the old review cannot be reused.
  const changed = await auditPitImagegenSheetV91({ ...candidate, definition: complete.definition }, await image(candidate));
  assert.equal(applyPitImagegenReviewV91(changed, complete.visualReview).runtimeAccepted, false);
});
