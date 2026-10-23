import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath, pathToFileURL} from 'node:url';

const REPOSITORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const EXCEL_HISTORY_COMMIT_V107 = '92e7c824fd80d6b8152855b3d66560448f8c48c0';
const MANIFEST = 'tests/fixtures/excel-history-v106-v107.json';
const MANIFEST_SHA256 = '5461c2282b2efc3306d53a802f47dd0c245e1bc1b8062c4efa6fa72b90776d3a';
const ARCHIVE_SHA256 = 'd32bffee06fed497b197fd3c8a905b9201dd601002f11e1c73af206833ac65ca';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let pending;

function local(relative) {
  assert.equal(typeof relative, 'string', 'Historical path must be a string');
  assert.ok(relative.length && !relative.includes('\\') && !relative.includes('\0') && !path.posix.isAbsolute(relative) && relative.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe historical path: ' + relative);
  return relative;
}

async function verifyRows(root, rows) {
  for (const row of rows) {
    const bytes = await fsp.readFile(path.join(root, local(row.path)));
    assert.equal(bytes.length, row.bytes, 'Historical input size changed: ' + row.path);
    assert.equal(sha(bytes), row.sha256, 'Historical input changed: ' + row.path);
  }
}

async function prepare() {
  const manifestBytes = await fsp.readFile(path.join(REPOSITORY, MANIFEST));
  assert.equal(sha(manifestBytes), MANIFEST_SHA256, 'Historical manifest changed');
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.sourceCommit, EXCEL_HISTORY_COMMIT_V107);
  assert.equal(manifest.archive.sha256, ARCHIVE_SHA256);
  const compressed = await fsp.readFile(path.join(REPOSITORY, local(manifest.archive.path)));
  assert.equal(sha(compressed), ARCHIVE_SHA256, 'Historical source archive changed');
  assert.equal(compressed.length, manifest.archive.bytes);
  assert.ok(Number.isSafeInteger(manifest.archive.uncompressedBytes) && manifest.archive.uncompressedBytes > 0 && manifest.archive.uncompressedBytes <= 80 * 1024 * 1024, 'Historical source budget exceeded');
  const payload = gunzipSync(compressed, {maxOutputLength: 80 * 1024 * 1024});
  assert.equal(payload.length, manifest.archive.uncompressedBytes);
  const archive = JSON.parse(payload);
  assert.equal(archive.schemaVersion, 1);
  assert.equal(archive.sourceCommit, EXCEL_HISTORY_COMMIT_V107);
  assert.deepEqual(archive.files.map(row => ({path: row.path, sha256: row.sha256, bytes: row.bytes})), manifest.sources, 'Historical source list changed');
  const paths = new Set([...manifest.sources, ...manifest.shared].map(row => local(row.path)));
  assert.equal(paths.size, manifest.sources.length + manifest.shared.length, 'Duplicate historical path');
  // Public assets and published products are shared only after their old hashes pass.
  await verifyRows(REPOSITORY, manifest.shared);
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'yautja-excel-history-v106-'));
  try {
    for (const row of archive.files) {
      const bytes = Buffer.from(row.base64, 'base64');
      assert.equal(bytes.length, row.bytes);
      assert.equal(sha(bytes), row.sha256, 'Historical source blob changed: ' + row.path);
      const target = path.join(root, local(row.path));
      await fsp.mkdir(path.dirname(target), {recursive: true});
      await fsp.writeFile(target, bytes, {mode: 0o444, flag: 'wx'});
    }
    for (const row of manifest.shared) {
      const target = path.join(root, row.path);
      await fsp.mkdir(path.dirname(target), {recursive: true});
      await fsp.symlink(path.join(REPOSITORY, row.path), target);
    }
    await fsp.symlink(path.join(REPOSITORY, 'node_modules'), path.join(root, 'node_modules'), 'dir');
    const context = {root, manifest};
    process.once('exit', () => fs.rmSync(root, {recursive: true, force: true}));
    return context;
  } catch (error) {
    await fsp.rm(root, {recursive: true, force: true});
    throw error;
  }
}

/** Only historical Excel tests/commands opt into this context. Other imports stay current. */
export function getHistoricalExcelContextV107() {
  return pending ??= prepare();
}

export async function loadHistoricalExcelV107(release) {
  assert.equal(release, 'V106', 'Historical release must be V106');
  const context = await getHistoricalExcelContextV107();
  return import(pathToFileURL(path.join(context.root, 'scripts/build-excel-followup-' + release.toLowerCase() + '.mjs')).href);
}

/** Check both shared files and private source copies after executing real collectors/tests. */
export async function verifyHistoricalExcelContextV107() {
  const context = await getHistoricalExcelContextV107();
  await verifyRows(REPOSITORY, context.manifest.shared);
  await verifyRows(context.root, context.manifest.sources);
  for (const row of context.manifest.shared) {
    assert.equal(await fsp.readlink(path.join(context.root, row.path)), path.join(REPOSITORY, row.path), 'Historical shared link changed: ' + row.path);
  }
  return {sourceCommit: context.manifest.sourceCommit, sourcesVerified: context.manifest.sources.length, sharedVerified: context.manifest.shared.length};
}

/** The original all-app freeze is checked against V106's actual private sources. */
export async function loadHistoricalRuntimeSnapshotV107() {
  const context = await getHistoricalExcelContextV107();
  return import(pathToFileURL(path.join(context.root, 'scripts/snapshot-runtime-v106.mjs')).href);
}

/** The original bounded public-input collector remains isolated with V106. */
export async function loadHistoricalRuntimeInputsV107() {
  const context = await getHistoricalExcelContextV107();
  return import(pathToFileURL(path.join(context.root, 'scripts/collect-v106-runtime-inputs.mjs')).href);
}
