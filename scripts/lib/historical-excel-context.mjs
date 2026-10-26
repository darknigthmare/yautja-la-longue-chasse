/** Explicit, isolated historical execution. No application import hooks. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const local = file => {
  assert.ok(typeof file === 'string' && file && !path.isAbsolute(file) && !file.includes('\\') && !file.includes('\0') && file.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe historical path');
  return file;
};
async function verifyFiles(root, rows) {
  for (const row of rows) {
    const bytes = await fsp.readFile(path.join(root, local(row.path)));
    assert.equal(bytes.length, row.bytes, 'Historical size changed: ' + row.path);
    assert.equal(sha(bytes), row.sha256, 'Historical bytes changed: ' + row.path);
  }
}

export function createHistoricalExcelContext({repository, manifestPath, manifestSha256, archiveSha256, sourceCommit, release}) {
  let pending;
  async function prepare() {
    const manifestBytes = await fsp.readFile(path.join(repository, local(manifestPath)));
    assert.equal(sha(manifestBytes), manifestSha256, 'Original ' + release + ' manifest changed');
    const manifest = JSON.parse(manifestBytes);
    assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.sourceCommit, sourceCommit); assert.equal(manifest.release, release);
    assert.equal(manifest.archive.sha256, archiveSha256);
    const compressed = await fsp.readFile(path.join(repository, local(manifest.archive.path)));
    assert.equal(compressed.length, manifest.archive.bytes); assert.equal(sha(compressed), archiveSha256, 'Original capsule changed');
    assert.ok(Number.isSafeInteger(manifest.archive.uncompressedBytes) && manifest.archive.uncompressedBytes > 0 && manifest.archive.uncompressedBytes <= 96 * 1024 * 1024);
    const payload = gunzipSync(compressed, {maxOutputLength: 96 * 1024 * 1024});
    assert.equal(payload.length, manifest.archive.uncompressedBytes);
    const archive = JSON.parse(payload);
    assert.equal(archive.schemaVersion, 1); assert.equal(archive.sourceCommit, sourceCommit);
    assert.deepEqual(archive.files.map(({path, sha256, bytes}) => ({path, sha256, bytes})), manifest.sources);
    assert.equal(new Set([...manifest.sources, ...manifest.shared].map(row => local(row.path))).size, manifest.sources.length + manifest.shared.length);
    assert.ok(Array.isArray(manifest.materializedShared));
    const copies = new Set(manifest.materializedShared.map(local)); assert.equal(copies.size, manifest.materializedShared.length);
    assert.ok([...copies].every(file => manifest.shared.some(row => row.path === file)));
    await verifyFiles(repository, manifest.shared);
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'yautja-excel-history-' + release.toLowerCase() + '-'));
    try {
      for (const row of archive.files) {
        const bytes = Buffer.from(row.base64, 'base64'); assert.equal(bytes.length, row.bytes); assert.equal(sha(bytes), row.sha256);
        const target = path.join(root, row.path); await fsp.mkdir(path.dirname(target), {recursive: true}); await fsp.writeFile(target, bytes, {mode: 0o444, flag: 'wx'});
      }
      // Package-contained evidence rejects symlinks by design. Keep those files
      // as verified private, read-only copies; do not weaken the original guard.
      for (const row of manifest.shared) {const target = path.join(root, row.path); await fsp.mkdir(path.dirname(target), {recursive: true});
        if (copies.has(row.path)) {await fsp.copyFile(path.join(repository, row.path), target, fs.constants.COPYFILE_EXCL); await fsp.chmod(target, 0o444);}
        else await fsp.symlink(path.join(repository, row.path), target);
      }
      await fsp.symlink(path.join(repository, 'node_modules'), path.join(root, 'node_modules'), 'dir');
      process.once('exit', () => fs.rmSync(root, {recursive: true, force: true}));
      return {root, manifest};
    } catch (error) {await fsp.rm(root, {recursive: true, force: true}); throw error;}
  }
  const get = () => pending ??= prepare();
  async function verify() {
    const context = await get(); await verifyFiles(context.root, context.manifest.sources); await verifyFiles(repository, context.manifest.shared);
    for (const row of context.manifest.sources) {const stat = await fsp.lstat(path.join(context.root, row.path)); assert.equal(stat.isSymbolicLink(), false); assert.equal(stat.mode & 0o222, 0, 'Private historical source is writable: ' + row.path);}
    const copies = new Set(context.manifest.materializedShared);
    await verifyFiles(context.root, context.manifest.shared.filter(row => copies.has(row.path)));
    for (const row of context.manifest.shared) {
      const target = path.join(context.root, row.path);
      if (copies.has(row.path)) {const stat = await fsp.lstat(target); assert.equal(stat.isSymbolicLink(), false); assert.equal(stat.mode & 0o222, 0, 'Private historical evidence is writable: ' + row.path);}
      else assert.equal(await fsp.readlink(target), path.join(repository, row.path));
    }
    return {sourceCommit, sourcesVerified: context.manifest.sources.length, sharedVerified: context.manifest.shared.length, evidenceCopiesVerified: copies.size, currentRuntimeCovered: false};
  }
  async function load() {const context = await get(); return import(pathToFileURL(path.join(context.root, local(context.manifest.generator.path))).href);}
  async function runTests(files) {
    const context = await get(), fullSuite = files === undefined;
    files ??= context.manifest.historicalTests;
    assert.ok(Array.isArray(files) && files.length && new Set(files).size === files.length);
    for (const file of files) assert.ok(context.manifest.historicalTests.includes(file), 'Unreviewed historical test');
    const env = {...process.env}; delete env.NODE_TEST_CONTEXT;
    let output;
    try {output = execFileSync(process.execPath, ['--experimental-strip-types', '--test', '--test-reporter=tap', '--test-concurrency=1', ...files], {cwd: context.root, env, encoding: 'utf8', timeout: 300000, maxBuffer: 8 * 1024 * 1024});}
    catch (error) {throw new Error('Original ' + release + ' assertions failed:\n' + String(error.stdout ?? '') + String(error.stderr ?? ''), {cause: error});}
    assert.match(output, /# fail 0(?:\r?\n|$)/); assert.match(output, /# skipped 0(?:\r?\n|$)/);
    if (fullSuite) assert.match(output, new RegExp('# tests ' + context.manifest.expectedAssertions + '(?:\\r?\\n|$)'));
    await verify(); return {sourceCommit, files, output, currentRuntimeCovered: false};
  }
  return {get, verify, load, runTests};
}
