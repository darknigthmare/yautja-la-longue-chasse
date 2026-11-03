/** Read-only admission of supplied PNG/receipt pairs. This checks consistency;
 * it cannot authenticate a provider receipt or certify anatomy/animation. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const MAX_FILE_BYTES = 32 * 1024 * 1024;
const fail = code => { throw new Error(code); };

async function readInside(root, relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes('\0') || path.posix.isAbsolute(relative) || relative.split('/').some(part => !part || part === '.' || part === '..')) fail('UNSAFE_PATH');
  const actual = await fs.realpath(path.join(root, relative));
  if (!actual.startsWith(root + path.sep)) fail('PATH_OUTSIDE_PACKAGE');
  const stat = await fs.stat(actual);
  if (!stat.isFile() || stat.size > MAX_FILE_BYTES) fail('FILE_BUDGET');
  const bytes = await fs.readFile(actual);
  if (bytes.length > MAX_FILE_BYTES) fail('FILE_BUDGET');
  return bytes;
}

function submission(receipt, expectedHash) {
  const attempts = Array.isArray(receipt.attempts) ? receipt.attempts : [];
  const selected = attempts.filter(attempt => record(attempt) && attempt.acceptedForCurrentOutput === true);
  if (selected.length > 1) fail('AMBIGUOUS_ACCEPTED_ATTEMPT');
  if (selected.length === 1) {
    const attempt = selected[0];
    if (attempt.accepted !== true || attempt.sha256 !== expectedHash || !text(attempt.promptExact) || !text(attempt.nativeOutputName)) fail('ACCEPTED_ATTEMPT_MISMATCH');
    if (text(receipt.acceptedOutputPromptExact) && attempt.promptExact !== receipt.acceptedOutputPromptExact) fail('ACCEPTED_PROMPT_MISMATCH');
    if (text(receipt.nativeOutputName) && attempt.nativeOutputName !== receipt.nativeOutputName) fail('ACCEPTED_OUTPUT_MISMATCH');
    return {kind: 'accepted-attempt', promptSha256: sha(Buffer.from(attempt.promptExact)), outputName: attempt.nativeOutputName};
  }
  if (receipt.method !== 'builtin-imagegen' || receipt.tool !== 'image_gen.imagegen' || !text(receipt.nativeOutputId) || !text(receipt.nativeSourceName) || !text(receipt.promptExact)) fail('SUBMISSION_RECORD_MISSING');
  if (receipt.nativeSourceName !== receipt.nativeOutputId + '.png') fail('NATIVE_OUTPUT_MISMATCH');
  return {kind: 'native-output-record', promptSha256: sha(Buffer.from(receipt.promptExact)), outputName: receipt.nativeSourceName};
}

async function inspectPair(root, row, index, allowedIds) {
  const reject = reason => ({index, status: 'REFUSED', reason});
  if (!record(row) || !text(row.id) || !allowedIds.has(row.id)) return reject('UNKNOWN_ID');
  if (!hash(row.sha256) || !hash(row.receiptSha256) || !Number.isSafeInteger(row.bytes) || row.bytes < 1 || row.bytes > MAX_FILE_BYTES) return reject('PIN_MISSING');
  try {
    const receiptBytes = await readInside(root, row.receiptPath);
    if (sha(receiptBytes) !== row.receiptSha256) fail('RECEIPT_HASH_MISMATCH');
    const receipt = JSON.parse(receiptBytes.toString('utf8'));
    if (!record(receipt) || receipt.id !== row.id) fail('RECEIPT_ID_MISMATCH');
    if (receipt.sha256 !== row.sha256 || receipt.bytes !== row.bytes || receipt.repoPngPath !== row.pngPath) fail('RECEIPT_IMAGE_MISMATCH');
    if (receipt.state !== undefined && receipt.state !== 'accepted') fail('RECEIPT_NOT_ACCEPTED');
    const evidence = submission(receipt, row.sha256);
    if (!record(receipt.visualInspection) || receipt.visualInspection.accepted !== true) fail('VISUAL_REVIEW_MISSING');
    const bytes = await readInside(root, row.pngPath);
    if (sha(bytes) !== row.sha256 || bytes.length !== row.bytes) fail('PNG_HASH_MISMATCH');
    const image = sharp(bytes, {limitInputPixels: 16 * 1024 * 1024});
    const metadata = await image.metadata();
    if (metadata.format !== 'png' || !metadata.hasAlpha || metadata.width !== receipt.width || metadata.height !== receipt.height) fail('NATIVE_PNG_MISMATCH');
    const {data, info} = await image.ensureAlpha().raw().toBuffer({resolveWithObject: true});
    let transparent = 0, visible = 0, minX = info.width, minY = info.height, maxX = -1, maxY = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * info.channels + info.channels - 1];
      if (alpha === 0) transparent++;
      if (alpha > 20) { visible++; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    }
    if (!transparent || !visible) fail('EMPTY_OR_OPAQUE_PNG');
    return {index, id: row.id, status: 'CONSISTENT_SUPPLIED_RECORD', sha256: row.sha256, receiptSha256: row.receiptSha256,
      bytes: bytes.length, width: info.width, height: info.height, alphaVisibleThreshold: 20,
      alphaVisibleBBox: [minX, minY, maxX + 1, maxY + 1], silhouetteTouchesFrame: minX === 0 || minY === 0 || maxX === info.width - 1 || maxY === info.height - 1,
      evidence: {kind: evidence.kind, promptSha256: evidence.promptSha256},
      providerAuthenticityVerified: false, animated: false, canonicalFidelityCertified: false, automaticallyPublished: false};
  } catch (error) {
    // The report deliberately excludes supplied text and local paths.
    const reason = /^[A-Z_]+$/.test(error?.message ?? '') ? error.message : 'UNREADABLE_OR_INVALID_FILE';
    return reject(reason);
  }
}

export async function inspectProductionEvidenceV108(packageRoot, manifest, allowedIds) {
  if (!record(manifest) || manifest.schemaVersion !== 1 || !Array.isArray(manifest.assets) || !manifest.assets.length || manifest.assets.length > 256 || !(allowedIds instanceof Set) || !allowedIds.size) fail('INVALID_MANIFEST');
  const root = await fs.realpath(packageRoot), results = [], seen = new Set();
  for (let i = 0; i < manifest.assets.length; i++) {
    const row = manifest.assets[i];
    if (record(row) && seen.has(row.id)) { results.push({index: i, status: 'REFUSED', reason: 'DUPLICATE_ID'}); continue; }
    if (record(row)) seen.add(row.id);
    results.push(await inspectPair(root, row, i, allowedIds));
  }
  return {schemaVersion: 1, release: 'V108', scope: 'Consistency check of supplied static PNG/submission records. No provider authentication, historical recovery, animation admission or publication.',
    passed: results.every(row => row.status === 'CONSISTENT_SUPPLIED_RECORD'), checked: results.length, results,
    recoveredHistoricalReceipts: 0, recoveredHistoricalPngs: 0, promotedWorkstreams: 0};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 3) throw new Error('Usage: node scripts/inspect-production-evidence-v108.mjs PACKAGE_ROOT MANIFEST_JSON OUTPUT_JSON');
  const [packageRoot, manifestPath, outputPath] = args;
  const catalogue = JSON.parse(await fs.readFile(new URL('../docs/v107-open-workstreams-audit.json', import.meta.url), 'utf8'));
  const allowedIds = new Set(catalogue.items.map(row => row.id));
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const report = await inspectProductionEvidenceV108(packageRoot, manifest, allowedIds);
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({passed: report.passed, checked: report.checked, promotedWorkstreams: 0}));
  if (!report.passed) process.exitCode = 1;
}
