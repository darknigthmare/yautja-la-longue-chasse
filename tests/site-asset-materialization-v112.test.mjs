import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {materializeSiteAssetsV112, SITE_ASSET_REPOSITORY_V112, siteAssetUrlV112,
  validateSiteAssetManifestV112} from '../scripts/materialize-site-assets-v112.mjs';

const commit = 'e4a6c64a1e77edad8865aa05ca7c2901d62bfa09';
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const descriptor = (name, bytes) => ({path:name, size:bytes.length, gitBlobSha1:blob(bytes)});
const manifest = entries => ({schemaVersion:1, repository:SITE_ASSET_REPOSITORY_V112, commit,
  files:entries.map(([name, bytes]) => descriptor(name, bytes))});
async function temporary(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'yautja-site-assets-v112-'));
  t.after(() => rm(directory, {recursive:true, force:true}));
  return directory;
}
async function filesBelow(directory) {
  const names = [];
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    if (entry.isDirectory()) names.push(...(await filesBelow(path.join(directory, entry.name))).map(name => entry.name + '/' + name));
    else names.push(entry.name);
  }
  return names.sort();
}
async function localSource(t, respond) {
  const requested = [], server = createServer(respond);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = 'http://127.0.0.1:' + server.address().port;
  return {requested, fetchImpl(url, options) {
    assert.ok(url.startsWith('https://raw.githubusercontent.com/' + SITE_ASSET_REPOSITORY_V112 + '/' + commit + '/public/'));
    assert.equal(options.redirect, 'error');
    requested.push(url);
    const suffix = url.slice(url.indexOf('/public/') + '/public/'.length);
    return fetch(base + '/' + suffix, options);
  }};
}

test('pinned GitHub URL and manifest refuse mutable sources, escaping paths and conflicting entries', async t => {
  const directory = path.join(await temporary(t), 'not-created');
  const good = manifest([['game/écaille 1#.bin', Buffer.from('asset')]]);
  assert.equal(siteAssetUrlV112(commit, good.files[0].path),
    'https://raw.githubusercontent.com/' + SITE_ASSET_REPOSITORY_V112 + '/' + commit + '/public/game/%C3%A9caille%201%23.bin');
  for (const invalidPath of ['../escape', 'game/../escape', '/outside', 'game//body', 'game/./body', 'game/',
    'C:/outside', 'game\\outside', 'game/\nbody', '\ud800']) {
    const candidate = structuredClone(good); candidate.files[0].path = invalidPath;
    assert.throws(() => validateSiteAssetManifestV112(candidate), /Invalid Site asset/);
  }
  for (const patch of [{commit:'main'}, {commit:'e4a6c64'}, {repository:'other/repository'}, {url:'https://elsewhere.invalid'}]) {
    assert.throws(() => validateSiteAssetManifestV112({...good, ...patch}), /Invalid immutable/);
  }
  for (const patch of [{size:-1}, {size:1.5}, {size:Number.MAX_SAFE_INTEGER + 1}, {gitBlobSha1:'short'}, {url:'https://elsewhere.invalid'}]) {
    assert.throws(() => validateSiteAssetManifestV112({...good, files:[{...good.files[0], ...patch}]}), /Invalid Site asset/);
  }
  assert.throws(() => validateSiteAssetManifestV112({...good, files:[good.files[0], good.files[0]]}), /Duplicate/);
  assert.throws(() => validateSiteAssetManifestV112(manifest([['game', Buffer.from('x')], ['game/body', Buffer.from('y')]])), /conflict/);
  await assert.rejects(materializeSiteAssetsV112({...good, commit:'main'}, {directory, fetchImpl:() => assert.fail('invalid input must not request assets')}), /Invalid immutable/);
  assert.deepEqual(await filesBelow(path.dirname(directory)), []);
});

test('streams original binary, Unicode and empty blobs exactly, then verifies and skips every existing file', async t => {
  const directory = await temporary(t);
  const entries = [['game/body.bin', Buffer.from([0, 255, 128, 7, 0, 31])],
    ['game/écaille 1#.bin', Buffer.from('immutable original artwork')], ['empty.bin', Buffer.alloc(0)]];
  const source = await localSource(t, (request, response) => {
    const row = entries.find(([name]) => name === decodeURIComponent(request.url.slice(1)));
    assert.ok(row); response.writeHead(200); response.end(row[1]);
  });
  await mkdir(path.join(directory, 'game'));
  await writeFile(path.join(directory, 'game/body.bin'), Buffer.from('stale'));
  const result = await materializeSiteAssetsV112(manifest(entries), {directory, fetchImpl:source.fetchImpl, concurrency:2});
  assert.equal(result.downloaded, 3); assert.equal(result.skipped, 0); assert.equal(source.requested.length, 3);
  for (const [name, bytes] of entries) assert.deepEqual(await readFile(path.join(directory, name)), bytes);
  const repeated = await materializeSiteAssetsV112(manifest(entries), {directory, fetchImpl:() => assert.fail('exact files should not be downloaded')});
  assert.equal(repeated.downloaded, 0); assert.equal(repeated.skipped, 3);
  assert.deepEqual(await filesBelow(directory), entries.map(([name]) => name).sort());
});

for (const mismatch of ['same-size-corruption', 'truncated', 'oversize', 'http-failure', 'timeout']) {
  test(`${mismatch}: refuse replacement and remove temporary files`, async t => {
    const directory = await temporary(t), expected = Buffer.from('original'), previous = Buffer.from('old-copy');
    await writeFile(path.join(directory, 'body.bin'), previous);
    const source = await localSource(t, (_request, response) => {
      if (mismatch === 'http-failure') { response.writeHead(503); response.end('unavailable'); return; }
      response.writeHead(200);
      if (mismatch === 'timeout') { response.write('o'); return; }
      response.end(mismatch === 'same-size-corruption' ? Buffer.from('tampered') : mismatch === 'truncated' ? Buffer.from('ori') : Buffer.from('original-but-extra'));
    });
    await assert.rejects(materializeSiteAssetsV112(manifest([['body.bin', expected]]), {
      directory, fetchImpl:source.fetchImpl, timeoutMs:mismatch === 'timeout' ? 100 : 5000,
    }));
    assert.deepEqual(await readFile(path.join(directory, 'body.bin')), previous);
    assert.deepEqual(await filesBelow(directory), ['body.bin']);
  });
}

test('refuses linked roots, parent directories and destination files before requesting anything', async t => {
  const workspace = await temporary(t), outside = path.join(workspace, 'outside'), root = path.join(workspace, 'public');
  await mkdir(outside); await mkdir(root); await writeFile(path.join(outside, 'body.bin'), 'outside stays intact');
  const source = manifest([['game/body.bin', Buffer.from('original')]]);
  const noFetch = () => assert.fail('symlinks must be rejected before network access');
  await symlink(outside, path.join(workspace, 'linked-root'));
  await assert.rejects(materializeSiteAssetsV112(source, {directory:path.join(workspace, 'linked-root'), fetchImpl:noFetch}), /real directories/);
  await symlink(outside, path.join(root, 'game'));
  await assert.rejects(materializeSiteAssetsV112(source, {directory:root, fetchImpl:noFetch}), /real directories/);
  await rm(path.join(root, 'game')); await mkdir(path.join(root, 'game'));
  await symlink(path.join(outside, 'body.bin'), path.join(root, 'game/body.bin'));
  await assert.rejects(materializeSiteAssetsV112(source, {directory:root, fetchImpl:noFetch}), /regular file/);
  assert.equal(await readFile(path.join(outside, 'body.bin'), 'utf8'), 'outside stays intact');
});

test('a link introduced while fetching is rejected without writing through it', async t => {
  const workspace = await temporary(t), outside = path.join(workspace, 'outside'), root = path.join(workspace, 'public');
  await mkdir(outside); await mkdir(root);
  const expected = Buffer.from('original');
  await assert.rejects(materializeSiteAssetsV112(manifest([['game/body.bin', expected]]), {directory:root, fetchImpl:async () => {
    await rm(path.join(root, 'game'), {recursive:true}); await symlink(outside, path.join(root, 'game'));
    return new Response(expected);
  }}), /real directories/);
  assert.deepEqual(await readdir(outside), []);
});

test('parallel transfers respect the configured bound and preserve every complete byte stream', async t => {
  const directory = await temporary(t), entries = Array.from({length:9}, (_, index) => ['game/' + index + '.bin', Buffer.alloc(4000, index)]);
  let active = 0, maximum = 0;
  const source = await localSource(t, (request, response) => {
    active++; maximum = Math.max(maximum, active);
    response.once('close', () => active--);
    const bytes = entries.find(([name]) => '/' + name === request.url)[1];
    response.writeHead(200); response.write(bytes.subarray(0, 2000));
    setTimeout(() => response.end(bytes.subarray(2000)), 20);
  });
  const result = await materializeSiteAssetsV112(manifest(entries), {directory, concurrency:3, fetchImpl:source.fetchImpl});
  assert.equal(result.downloaded, 9); assert.equal(result.downloadedBytes, 36000);
  assert.ok(maximum >= 1 && maximum <= 3, 'concurrent requests: ' + maximum);
  for (const [name, bytes] of entries) assert.deepEqual(await readFile(path.join(directory, name)), bytes);
  assert.equal((await filesBelow(directory)).some(name => name.endsWith('.tmp')), false);
});

test('one failed transfer aborts parallel streams and waits for every temporary file to be removed', async t => {
  const directory = await temporary(t), expected = Buffer.alloc(16000, 7);
  const entries = [['bad.bin', expected], ['slow-a.bin', expected], ['slow-b.bin', expected]];
  const source = await localSource(t, (request, response) => {
    response.writeHead(200);
    if (request.url === '/bad.bin') setTimeout(() => response.end(Buffer.alloc(16000, 8)), 20);
    else response.write(expected.subarray(0, 100));
  });
  await assert.rejects(materializeSiteAssetsV112(manifest(entries), {directory, concurrency:3, fetchImpl:source.fetchImpl}), /integrity mismatch/);
  assert.deepEqual(await filesBelow(directory), []);
});

test('CLI rejects URL overrides, repeated options and a missing immutable manifest without any download', () => {
  const script = fileURLToPath(new URL('../scripts/materialize-site-assets-v112.mjs', import.meta.url));
  for (const args of [[], ['--base-url', 'http://localhost'], ['--manifest', 'file.json', '--manifest', 'other.json']]) {
    const result = spawnSync(process.execPath, [script, ...args], {encoding:'utf8'});
    assert.equal(result.status, 1);
    assert.match(result.stderr, /immutable asset manifest is required|Usage:/);
    assert.equal(result.stdout, '');
  }
});
