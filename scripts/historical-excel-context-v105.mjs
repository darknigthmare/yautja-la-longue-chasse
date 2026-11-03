import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath, pathToFileURL} from 'node:url';

const REPOSITORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const EXCEL_HISTORY_COMMIT_V105 = '8eaae97b8511ed6b93183729f201af7eb844f830';
const MANIFEST = 'tests/fixtures/excel-history-v104-v105.json';
const MANIFEST_SHA256 = '0eba82d135b143991f48cc7ef80eb884538db39f1db42560ddf35678dd0c9e5e';
const ARCHIVE_SHA256 = '33c3c8a96a86702a819db845fe83d8566c95f674bbf5e13d0135861435705d6d';
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
  assert.equal(manifest.sourceCommit, EXCEL_HISTORY_COMMIT_V105);
  assert.equal(manifest.archive.sha256, ARCHIVE_SHA256);
  const compressed = await fsp.readFile(path.join(REPOSITORY, local(manifest.archive.path)));
  assert.equal(sha(compressed), ARCHIVE_SHA256, 'Historical source archive changed');
  assert.equal(compressed.length, manifest.archive.bytes);
  const payload = gunzipSync(compressed, {maxOutputLength: 40 * 1024 * 1024});
  assert.equal(payload.length, manifest.archive.uncompressedBytes);
  const archive = JSON.parse(payload);
  assert.equal(archive.schemaVersion, 1);
  assert.equal(archive.sourceCommit, EXCEL_HISTORY_COMMIT_V105);
  assert.deepEqual(archive.files.map(row => ({path: row.path, sha256: row.sha256, bytes: row.bytes})), manifest.sources, 'Historical source list changed');
  const paths = new Set([...manifest.sources, ...manifest.shared].map(row => local(row.path)));
  assert.equal(paths.size, manifest.sources.length + manifest.shared.length, 'Duplicate historical path');
  // Public assets and published products are shared only after their old hashes pass.
  await verifyRows(REPOSITORY, manifest.shared);
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'yautja-excel-history-v104-'));
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
export function getHistoricalExcelContextV105() {
  return pending ??= prepare();
}

export async function loadHistoricalExcelV105(release) {
  assert.ok(release === 'V100' || release === 'V104', 'Historical release must be V100 or V104');
  const context = await getHistoricalExcelContextV105();
  return import(pathToFileURL(path.join(context.root, 'scripts/build-excel-followup-' + release.toLowerCase() + '.mjs')).href);
}

/** Check both shared files and private source copies after executing real collectors/tests. */
export async function verifyHistoricalExcelContextV105() {
  const context = await getHistoricalExcelContextV105();
  await verifyRows(REPOSITORY, context.manifest.shared);
  await verifyRows(context.root, context.manifest.sources);
  for (const row of context.manifest.shared) {
    assert.equal(await fsp.readlink(path.join(context.root, row.path)), path.join(REPOSITORY, row.path), 'Historical shared link changed: ' + row.path);
  }
  return {sourceCommit: context.manifest.sourceCommit, sourcesVerified: context.manifest.sources.length, sharedVerified: context.manifest.shared.length};
}
