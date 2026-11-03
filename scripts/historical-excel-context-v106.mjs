import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath, pathToFileURL} from 'node:url';

const REPOSITORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const EXCEL_HISTORY_COMMIT_V106 = '28e9b6360ae30530525d55e307380d46d0eef8e1';
const MANIFEST = 'tests/fixtures/excel-history-v105-v106.json';
const MANIFEST_SHA256 = '09cc2b6d344245d36c7c8688360e7bb5e2127fb582f31f9a796033af27a59416';
const ARCHIVE_SHA256 = '1f09fd1491d6c76ff1fd1788c0963f062aebe8a594131d7554bc0e3323481c3c';
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
  assert.equal(manifest.sourceCommit, EXCEL_HISTORY_COMMIT_V106);
  assert.equal(manifest.archive.sha256, ARCHIVE_SHA256);
  const compressed = await fsp.readFile(path.join(REPOSITORY, local(manifest.archive.path)));
  assert.equal(sha(compressed), ARCHIVE_SHA256, 'Historical source archive changed');
  assert.equal(compressed.length, manifest.archive.bytes);
  assert.ok(Number.isSafeInteger(manifest.archive.uncompressedBytes) && manifest.archive.uncompressedBytes > 0 && manifest.archive.uncompressedBytes <= 80 * 1024 * 1024, 'Historical source budget exceeded');
  const payload = gunzipSync(compressed, {maxOutputLength: 80 * 1024 * 1024});
  assert.equal(payload.length, manifest.archive.uncompressedBytes);
  const archive = JSON.parse(payload);
  assert.equal(archive.schemaVersion, 1);
  assert.equal(archive.sourceCommit, EXCEL_HISTORY_COMMIT_V106);
  assert.deepEqual(archive.files.map(row => ({path: row.path, sha256: row.sha256, bytes: row.bytes})), manifest.sources, 'Historical source list changed');
  const paths = new Set([...manifest.sources, ...manifest.shared].map(row => local(row.path)));
  assert.equal(paths.size, manifest.sources.length + manifest.shared.length, 'Duplicate historical path');
  // Public assets and published products are shared only after their old hashes pass.
  await verifyRows(REPOSITORY, manifest.shared);
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'yautja-excel-history-v105-'));
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
export function getHistoricalExcelContextV106() {
  return pending ??= prepare();
}

export async function loadHistoricalExcelV106(release) {
  assert.equal(release, 'V105', 'Historical release must be V105');
  const context = await getHistoricalExcelContextV106();
  return import(pathToFileURL(path.join(context.root, 'scripts/build-excel-followup-' + release.toLowerCase() + '.mjs')).href);
}

/** Check both shared files and private source copies after executing real collectors/tests. */
export async function verifyHistoricalExcelContextV106() {
  const context = await getHistoricalExcelContextV106();
  await verifyRows(REPOSITORY, context.manifest.shared);
  await verifyRows(context.root, context.manifest.sources);
  for (const row of context.manifest.shared) {
    assert.equal(await fsp.readlink(path.join(context.root, row.path)), path.join(REPOSITORY, row.path), 'Historical shared link changed: ' + row.path);
  }
  return {sourceCommit: context.manifest.sourceCommit, sourcesVerified: context.manifest.sources.length, sharedVerified: context.manifest.shared.length};
}

/** The original all-app freeze is checked against V105's actual private sources. */
export async function loadHistoricalRuntimeSnapshotV106() {
  const context = await getHistoricalExcelContextV106();
  return import(pathToFileURL(path.join(context.root, 'scripts/snapshot-runtime-v105.mjs')).href);
}
