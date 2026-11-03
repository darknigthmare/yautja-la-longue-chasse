import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {inspectProductionEvidenceV108} from '../scripts/inspect-production-evidence-v108.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function fixture(t, mutate = () => {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'yautja-evidence-v108-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  const pixels = Buffer.alloc(8 * 8 * 4);
  for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) pixels.set([30, 90, 140, 255], (y * 8 + x) * 4);
  const png = await sharp(pixels, {raw: {width: 8, height: 8, channels: 4}}).png().toBuffer();
  const receipt = {id: 'known', repoPngPath: 'sprite.png', sha256: sha(png), bytes: png.length, width: 8, height: 8,
    method: 'builtin-imagegen', tool: 'image_gen.imagegen', nativeOutputId: 'example-output', nativeSourceName: 'example-output.png',
    promptExact: 'Actual fixture submission', visualInspection: {accepted: true}};
  await mutate(receipt);
  const receiptBytes = Buffer.from(JSON.stringify(receipt));
  await fs.writeFile(path.join(root, 'sprite.png'), png);
  await fs.writeFile(path.join(root, 'receipt.json'), receiptBytes);
  const row = {id: 'known', pngPath: 'sprite.png', receiptPath: 'receipt.json', sha256: sha(png), receiptSha256: sha(receiptBytes), bytes: png.length};
  return {root, row, run: assets => inspectProductionEvidenceV108(root, {schemaVersion: 1, assets: assets ?? [row]}, new Set(['known']))};
}

test('decodes alpha and preserves the limits of a supplied submission record', async t => {
  const f = await fixture(t), report = await f.run();
  assert.equal(report.passed, true);
  assert.deepEqual(report.results[0].alphaVisibleBBox, [2, 2, 6, 6]);
  assert.equal(report.results[0].providerAuthenticityVerified, false);
  assert.equal(report.results[0].automaticallyPublished, false);
  assert.equal(report.promotedWorkstreams, 0);
  assert.equal(report.recoveredHistoricalReceipts, 0);
});

test('a planned prompt, even accepted visually, is not a submission record', async t => {
  const f = await fixture(t, receipt => { delete receipt.nativeOutputId; receipt.plannedPrompt = receipt.promptExact; });
  assert.equal((await f.run()).results[0].reason, 'SUBMISSION_RECORD_MISSING');
});

test('selected attempts must match the final pixels, prompt and output', async t => {
  const f = await fixture(t, receipt => {
    receipt.nativeOutputName = 'accepted.png';
    receipt.acceptedOutputPromptExact = 'accepted actual prompt';
    receipt.attempts = [{accepted: true, acceptedForCurrentOutput: true, sha256: receipt.sha256,
      nativeOutputName: 'accepted.png', promptExact: 'accepted actual prompt'}];
  });
  assert.equal((await f.run()).passed, true);
  const g = await fixture(t, receipt => { receipt.attempts = [{accepted: true, acceptedForCurrentOutput: true, sha256: '0'.repeat(64), nativeOutputName: 'other.png', promptExact: 'other prompt'}]; });
  assert.equal((await g.run()).results[0].reason, 'ACCEPTED_ATTEMPT_MISMATCH');
  const h = await fixture(t, receipt => {
    receipt.acceptedOutputPromptExact = 'final';
    receipt.attempts = [{accepted: true, acceptedForCurrentOutput: true, sha256: receipt.sha256, nativeOutputName: 'out.png', promptExact: 'planned'}];
  });
  assert.equal((await h.run()).results[0].reason, 'ACCEPTED_PROMPT_MISMATCH');
});

test('IDs, duplicate rows and pinned receipt bytes are checked independently', async t => {
  const f = await fixture(t);
  assert.equal((await f.run([{...f.row, id: 'invented'}])).results[0].reason, 'UNKNOWN_ID');
  assert.equal((await f.run([f.row, f.row])).results[1].reason, 'DUPLICATE_ID');
  await fs.appendFile(path.join(f.root, 'receipt.json'), ' ');
  assert.equal((await f.run()).results[0].reason, 'RECEIPT_HASH_MISMATCH');
  const g = await fixture(t, receipt => { receipt.id = 'some-other-known-dossier'; });
  assert.equal((await g.run()).results[0].reason, 'RECEIPT_ID_MISMATCH');
});

test('rejects traversal and symlink escapes without reporting supplied paths', async t => {
  const f = await fixture(t);
  assert.equal((await f.run([{...f.row, receiptPath: '../outside.json'}])).results[0].reason, 'UNSAFE_PATH');
  await fs.symlink('/etc/hosts', path.join(f.root, 'escape.json'));
  const report = await f.run([{...f.row, receiptPath: 'escape.json'}]);
  assert.equal(report.results[0].reason, 'PATH_OUTSIDE_PACKAGE');
  assert.ok(!JSON.stringify(report).includes('/etc/hosts'));
});

test('changed PNG bytes and future manifest formats are refused', async t => {
  const f = await fixture(t);
  await fs.appendFile(path.join(f.root, 'sprite.png'), 'changed');
  assert.equal((await f.run()).results[0].reason, 'PNG_HASH_MISMATCH');
  await assert.rejects(inspectProductionEvidenceV108(f.root, {schemaVersion: 2, assets: []}, new Set(['known'])), /INVALID_MANIFEST/);
});

test('real V107 and PR15 records are admissible without recovering the older gaps', async () => {
  const root = path.resolve(import.meta.dirname, '..');
  for (const lot of ['v107-enforcer-poses', 'v614']) {
    const receiptPath = `docs/suivi-production/${lot}/receipts/feral--enforcers-comics-10.json`;
    const receiptBytes = await fs.readFile(path.join(root, receiptPath)), receipt = JSON.parse(receiptBytes);
    const row = {id: receipt.id, pngPath: receipt.repoPngPath, receiptPath, sha256: receipt.sha256, bytes: receipt.bytes, receiptSha256: sha(receiptBytes)};
    const report = await inspectProductionEvidenceV108(root, {schemaVersion: 1, assets: [row]}, new Set([receipt.id]));
    assert.equal(report.passed, true, JSON.stringify(report));
    assert.equal(report.recoveredHistoricalReceipts, 0);
    assert.equal(report.recoveredHistoricalPngs, 0);
  }
});

test('all 36 published consistency results regenerate from their actual pinned PNG and receipt bytes', async () => {
  const root = path.resolve(import.meta.dirname, '..');
  const catalogue = JSON.parse(await fs.readFile(path.join(root, 'docs/v107-open-workstreams-audit.json'), 'utf8'));
  for (const lot of ['v107-enforcer-poses', 'v614']) {
    const base = path.join(root, 'docs/qa/v108-production-evidence', lot);
    const manifest = JSON.parse(await fs.readFile(base + '-input.json', 'utf8'));
    const expected = JSON.parse(await fs.readFile(base + '-report.json', 'utf8'));
    assert.equal(manifest.assets.length, 18);
    assert.deepEqual(await inspectProductionEvidenceV108(root, manifest, new Set(catalogue.items.map(row => row.id))), expected);
    assert.equal(expected.passed, true);
  }
});
