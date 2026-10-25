import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const REPOSITORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const EXCEL_HISTORY_COMMIT_V108 = '887664d308279fbe168cee72a59155a818512107';
const MANIFEST = 'tests/fixtures/excel-history-v107-v108.json';
const MANIFEST_SHA = '9a193dec81066a49d389208dbba7e1eed547dfc1c6116997650a579bf02e5c66';
const ARCHIVE_SHA = '11e98330350ae6a1734637d357c2357f4ce7be8a12c407b4d46d2b7f346624b4';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let pending;
const local = file => {
  assert.ok(typeof file === 'string' && file && !path.isAbsolute(file) && !file.includes('\\') && !file.includes('\0') && file.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe historical path');
  return file;
};
async function verify(root, rows) {
  for (const row of rows) {
    const bytes = await fsp.readFile(path.join(root, local(row.path)));
    assert.equal(bytes.length, row.bytes, 'Historical size changed: ' + row.path);
    assert.equal(sha(bytes), row.sha256, 'Historical bytes changed: ' + row.path);
  }
}
async function prepare() {
  const manifestBytes = await fsp.readFile(path.join(REPOSITORY, MANIFEST));
  assert.equal(sha(manifestBytes), MANIFEST_SHA, 'Original V107 manifest changed');
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.sourceCommit, EXCEL_HISTORY_COMMIT_V108);
  assert.equal(manifest.archive.sha256, ARCHIVE_SHA);
  const compressed = await fsp.readFile(path.join(REPOSITORY, local(manifest.archive.path)));
  assert.equal(compressed.length, manifest.archive.bytes);
  assert.equal(sha(compressed), ARCHIVE_SHA, 'Original V107 capsule changed');
  assert.ok(Number.isSafeInteger(manifest.archive.uncompressedBytes) && manifest.archive.uncompressedBytes > 0 && manifest.archive.uncompressedBytes <= 80 * 1024 * 1024);
  const payload = gunzipSync(compressed, {maxOutputLength: 80 * 1024 * 1024});
  assert.equal(payload.length, manifest.archive.uncompressedBytes);
  const archive = JSON.parse(payload);
  assert.equal(archive.schemaVersion, 1);
  assert.equal(archive.sourceCommit, EXCEL_HISTORY_COMMIT_V108);
  assert.deepEqual(archive.files.map(({path, sha256, bytes}) => ({path, sha256, bytes})), manifest.sources);
  assert.equal(new Set([...manifest.sources, ...manifest.shared].map(row => local(row.path))).size, manifest.sources.length + manifest.shared.length);
  await verify(REPOSITORY, manifest.shared);
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'yautja-excel-history-v107-'));
  try {
    for (const row of archive.files) {
      const bytes = Buffer.from(row.base64, 'base64');
      assert.equal(bytes.length, row.bytes);
      assert.equal(sha(bytes), row.sha256);
      const target = path.join(root, row.path);
      await fsp.mkdir(path.dirname(target), {recursive: true});
      await fsp.writeFile(target, bytes, {mode: 0o444, flag: 'wx'});
    }
    for (const row of manifest.shared) {
      const target = path.join(root, row.path);
      await fsp.mkdir(path.dirname(target), {recursive: true});
      await fsp.symlink(path.join(REPOSITORY, row.path), target);
    }
    await fsp.symlink(path.join(REPOSITORY, 'node_modules'), path.join(root, 'node_modules'), 'dir');
    process.once('exit', () => fs.rmSync(root, {recursive: true, force: true}));
    return {root, manifest};
  } catch (error) {
    await fsp.rm(root, {recursive: true, force: true});
    throw error;
  }
}

/** Only explicit historical commands enter this context; game imports stay current. */
export function getHistoricalExcelContextV108() {return pending ??= prepare();}
export async function verifyHistoricalExcelContextV108() {
  const context = await getHistoricalExcelContextV108();
  await verify(context.root, context.manifest.sources);
  await verify(REPOSITORY, context.manifest.shared);
  for (const row of context.manifest.sources) {
    const stat = await fsp.lstat(path.join(context.root, row.path));
    assert.equal(stat.isSymbolicLink(), false);
    assert.equal(stat.mode & 0o222, 0, 'Private historical source is writable: ' + row.path);
  }
  for (const row of context.manifest.shared) assert.equal(await fsp.readlink(path.join(context.root, row.path)), path.join(REPOSITORY, row.path));
  return {sourceCommit: EXCEL_HISTORY_COMMIT_V108, sourcesVerified: context.manifest.sources.length, sharedVerified: context.manifest.shared.length, currentRuntimeCovered: false};
}
export async function loadHistoricalExcelV108() {
  const context = await getHistoricalExcelContextV108();
  return import(pathToFileURL(path.join(context.root, 'scripts/build-excel-followup-v107.mjs')).href);
}
/** The original assertions execute in a separate runner and historical cwd. */
export async function runHistoricalTestsV108(files = undefined) {
  const context = await getHistoricalExcelContextV108();
  files ??= context.manifest.historicalTests;
  assert.ok(Array.isArray(files) && files.length && new Set(files).size === files.length);
  for (const file of files) assert.ok(context.manifest.historicalTests.includes(file), 'Unreviewed historical test');
  const env = {...process.env}; delete env.NODE_TEST_CONTEXT;
  let output;
  try {output = execFileSync(process.execPath, ['--experimental-strip-types', '--test', '--test-concurrency=1', ...files], {cwd: context.root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024});}
  catch (error) {throw new Error('Original V107 assertions failed:\n' + String(error.stdout ?? '') + String(error.stderr ?? ''), {cause: error});}
  assert.match(output, /# fail 0(?:\r?\n|$)/);
  await verifyHistoricalExcelContextV108();
  return {sourceCommit: EXCEL_HISTORY_COMMIT_V108, files, output, currentRuntimeCovered: false};
}
