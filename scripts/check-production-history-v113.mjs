/** Re-run the published V113 certificates against their exact source inputs.
 * Later sources and the later V113 freeze remain independent, current inputs.
 * No certificate, freeze, image, or original assertion is rewritten here.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {constants, createReadStream} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {attachHistoricalGitObjects, historicalGitFailure, assertNoExternalGitPathOverrides, historicalGitEnvironment as gitEnvironment} from './lib/historical-git.mjs';

export const V113_PRODUCTION_PUBLICATION_COMMIT = '837684333b42ee1a5e3a0be9ce1967e2486a2fd3';
export const V113_PRODUCTION_PUBLICATION_TREE = 'f33b92e0127713179fadab73576e37062df0398f';
export const V113_PRODUCTION_RUNTIME_COMMIT = '719fe0d77e65be5349b76f507938309f56a67619';
export const V113_PRODUCTION_BUILD_ID = 'OzWVxNAbS8mWbL_Pue9Zg';
const FREEZE = 'docs/v113-runtime-freeze.json';
const FREEZE_PIN = Object.freeze({path: FREEZE, bytes: 367432, sha256: 'f39b5089fc130a726b87a6120470dacb3c3ef41098582a7203844620ce57f164'});
const CERTIFICATES = Object.freeze([
  {path: 'docs/v113-homeworld-validation.json', bytes: 866216, sha256: '7d42b5a70705d8720fca2a50818554b6e9973db988645d1b687d8862c8c61a66'},
  {path: 'docs/v113-pit-validation.json', bytes: 1379421, sha256: 'e2440ed86acfdb81a1f5d68147e92993fa4636939586666d078055d6eb1eff6c'},
]);
const ORIGINAL_TEST = 'tests/homeworld-current-production-v113.test.mjs';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ORIGIN = 'https://github.com/darknigthmare/yautja-la-longue-chasse.git';
const contexts = new WeakMap();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const objectSha = (type, bytes) => createHash('sha1').update(type + ' ' + bytes.length + '\0').update(bytes).digest('hex');
const local = file => typeof file === 'string' && file.length > 0 && !path.isAbsolute(file) &&
  !file.includes('\\') && !file.includes('\0') && file.split('/').every(part => part && part !== '.' && part !== '..') && !file.startsWith('.git/');
function git(root, args, {env = gitEnvironment()} = {}) {
  assertNoExternalGitPathOverrides();
  try {return execFileSync('git', ['-C', root, ...args], {env, timeout: 60000, maxBuffer: 192 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});}
  catch (error) {throw historicalGitFailure(error, {operation: args[0], label: 'V113 historical', env});}
}
function fetchEnvironment() {
  const env = gitEnvironment(), token = env.GH_TOKEN ?? env.GITHUB_TOKEN;
  if (token) {
    const index = Number(env.GIT_CONFIG_COUNT ?? 0); assert.ok(Number.isSafeInteger(index) && index >= 0);
    env.GIT_CONFIG_COUNT = String(index + 1); env['GIT_CONFIG_KEY_' + index] = 'http.https://github.com/.extraheader';
    env['GIT_CONFIG_VALUE_' + index] = 'AUTHORIZATION: basic ' + Buffer.from('x-access-token:' + token).toString('base64');
  }
  return env;
}
function ensureCommit(state, commit) {
  assert.ok([V113_PRODUCTION_PUBLICATION_COMMIT, V113_PRODUCTION_RUNTIME_COMMIT].includes(commit));
  try {assert.equal(objectSha('commit', git(state.root, ['cat-file', 'commit', commit])), commit); return;}
  catch {
    // Fetch only these immutable identities, and only into the private Git.
    git(state.root, ['fetch', '--no-tags', '--no-write-fetch-head', '--filter=blob:none', '--depth=1', ORIGIN, commit], {env: fetchEnvironment()});
    assert.equal(objectSha('commit', git(state.root, ['cat-file', 'commit', commit])), commit);
    state.fetchedCommits.push(commit);
  }
}
function treeEntries(root, commit) {
  return new Map(git(root, ['ls-tree', '-r', '-z', '--full-tree', commit]).toString('utf8').split('\0').filter(Boolean).map(line => {
    const at = line.indexOf('\t'), [mode, type, blob] = line.slice(0, at).split(' ');
    return [line.slice(at + 1), {mode, type, blob}];
  }));
}
function readBlob(state, row) {
  const env = fetchEnvironment(); delete env.GIT_NO_LAZY_FETCH;
  const bytes = git(state.root, ['-c', 'remote.origin.promisor=true', '-c', 'remote.origin.partialclonefilter=blob:none', 'cat-file', 'blob', row.gitBlobSha], {env});
  assert.equal(objectSha('blob', bytes), row.gitBlobSha, 'V113 historical blob identity changed: ' + row.path);
  if (row.bytes !== undefined) assert.equal(bytes.length, row.bytes, 'V113 historical size changed: ' + row.path);
  if (row.sha256 !== undefined) assert.equal(sha(bytes), row.sha256, 'V113 historical bytes changed: ' + row.path);
  return bytes;
}
function rowFromTree(tree, file) {
  assert.ok(local(file), 'Unsafe V113 historical input');
  const entry = tree.get(file);
  assert.ok(entry && entry.type === 'blob' && ['100644', '100755'].includes(entry.mode), 'V113 historical input is not a regular published blob: ' + file);
  return {path: file, gitBlobSha: entry.blob};
}
async function regularPath(root, file) {
  let directory = root;
  for (const part of file.split('/').slice(0, -1)) {
    directory = path.join(directory, part);
    const stat = await fs.lstat(directory).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));
    if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) return false;
  }
  const stat = await fs.lstat(path.join(root, file)).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));
  return Boolean(stat?.isFile() && !stat.isSymbolicLink());
}
async function fingerprint(root, file) {
  assert.ok(await regularPath(root, file), 'V113 historical input must be a private regular file: ' + file);
  const stat = await fs.stat(path.join(root, file)), hash = createHash('sha256'), blob = createHash('sha1').update('blob ' + stat.size + '\0');
  let bytes = 0;
  for await (const chunk of createReadStream(path.join(root, file))) {bytes += chunk.length; hash.update(chunk); blob.update(chunk);}
  assert.equal(bytes, stat.size, 'V113 input changed while being read: ' + file);
  return {path: file, bytes, sha256: hash.digest('hex'), gitBlobSha: blob.digest('hex')};
}
const matches = (actual, expected) => actual && actual.bytes === expected.bytes && actual.sha256 === expected.sha256 && actual.gitBlobSha === expected.gitBlobSha;
async function verifyRow(root, row) {
  assert.ok(matches(await fingerprint(root, row.path), row), 'V113 historical input changed: ' + row.path);
  assert.equal((await fs.stat(path.join(root, row.path))).mode & 0o222, 0, 'V113 private input must remain read-only: ' + row.path);
}
async function initialize(state, objectRepository) {
  git(state.root, ['-c', 'init.defaultBranch=v113-history', 'init', '--quiet']);
  git(state.root, ['config', 'remote.origin.url', ORIGIN]);
  const {alternate, inheritedShallowCommits} = await attachHistoricalGitObjects({root: state.root, objectRepository});
  state.alternate = alternate; state.inheritedShallowCommits = inheritedShallowCommits;
  ensureCommit(state, V113_PRODUCTION_PUBLICATION_COMMIT); ensureCommit(state, V113_PRODUCTION_RUNTIME_COMMIT);
  assert.equal(git(state.root, ['rev-parse', V113_PRODUCTION_PUBLICATION_COMMIT + '^{tree}']).toString().trim(), V113_PRODUCTION_PUBLICATION_TREE);
  state.tree = treeEntries(state.root, V113_PRODUCTION_PUBLICATION_COMMIT);
  const runtime = treeEntries(state.root, V113_PRODUCTION_RUNTIME_COMMIT);
  const freezeRow = {...rowFromTree(state.tree, FREEZE), ...FREEZE_PIN};
  const freeze = JSON.parse(readBlob(state, freezeRow));
  assert.equal(freeze.files, 1964); assert.equal(freeze.entries.length, 1964); assert.equal(freeze.bytes, 1089650270);
  const inputs = new Map();
  function add(pin) {
    const row = {...rowFromTree(state.tree, pin.path), ...pin};
    assert.ok(Number.isSafeInteger(row.bytes) && row.bytes >= 0); assert.match(row.sha256, /^[a-f0-9]{64}$/);
    if (inputs.has(row.path)) assert.deepEqual(inputs.get(row.path), row, 'Conflicting V113 historical input');
    else inputs.set(row.path, row);
  }
  for (const pin of freeze.entries) {
    add(pin); assert.deepEqual(state.tree.get(pin.path), runtime.get(pin.path), 'V113 publication differs from its certified runtime: ' + pin.path);
  }
  assert.deepEqual([...state.tree.keys()].filter(file => file.startsWith('app/')).sort(), freeze.entries.map(row => row.path).filter(file => file.startsWith('app/')).sort(), 'Frozen application inventory must be complete');
  add(freezeRow); state.certificatePaths = new Set();
  for (const certificate of CERTIFICATES) {
    add(certificate); state.certificatePaths.add(certificate.path);
    const report = JSON.parse(readBlob(state, inputs.get(certificate.path)));
    assert.deepEqual(report.sourceFreeze, FREEZE_PIN); assert.equal(report.release, 'V113');
    assert.equal(report.production.runtimeCommit, V113_PRODUCTION_RUNTIME_COMMIT); assert.equal(report.production.buildId, V113_PRODUCTION_BUILD_ID);
    const base = 'docs/qa/v113-' + report.domain.toLowerCase(), entryPath = base + '/entry.json';
    const entryBytes = readBlob(state, rowFromTree(state.tree, entryPath)), entry = JSON.parse(entryBytes);
    add({path: entryPath, bytes: entryBytes.length, sha256: sha(entryBytes)}); state.certificatePaths.add(entryPath);
    assert.equal(entry.portableFiles.length, 40);
    for (const row of entry.portableFiles) {
      assert.ok(row.path.startsWith(base + '/'), 'Portable V113 evidence must stay in its domain');
      add({path: row.path, bytes: row.bytes, sha256: row.sha256}); state.certificatePaths.add(row.path);
    }
  }
  state.rows = [...inputs.values()].sort((a, b) => a.path.localeCompare(b.path));
  assert.equal(state.rows.length, 2049); assert.equal(state.certificatePaths.size, 84); assert.ok(inputs.has(ORIGINAL_TEST));
  // Committed certificates and their images stay byte-exact in the current
  // branch too. The later freeze and later runtime sources are not certificates.
  const currentTree = treeEntries(state.repository, 'HEAD');
  for (const file of state.certificatePaths) assert.deepEqual(currentTree.get(file), state.tree.get(file), 'Committed V113 certificate changed: ' + file);
  await fs.writeFile(path.join(state.root, '.git/HEAD'), V113_PRODUCTION_PUBLICATION_COMMIT + '\n', {mode: 0o444});
  await fs.chmod(path.join(state.root, '.git/HEAD'), 0o444);
}
export async function prepareProductionHistoryV113({repository = ROOT, objectRepository = repository} = {}) {
  assertNoExternalGitPathOverrides();
  repository = await fs.realpath(repository); objectRepository = await fs.realpath(objectRepository);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'yautja-production-history-v113-'));
  const state = {root, repository, copiedCurrent: 0, restoredGit: 0, fetchedCommits: [], observedCurrent: [], deadline: Date.now() + 600000};
  try {
    await initialize(state, objectRepository);
    for (const row of state.rows) {
      assert.ok(Date.now() < state.deadline, 'V113 historical preparation time bound exceeded');
      const current = await regularPath(repository, row.path) ? await fingerprint(repository, row.path) : null;
      if (current && state.certificatePaths.has(row.path)) assert.ok(matches(current, row), 'Current V113 certificate bytes changed: ' + row.path);
      state.observedCurrent.push({path: row.path, current});
      const target = path.join(root, row.path); await fs.mkdir(path.dirname(target), {recursive: true});
      if (matches(current, row)) {await fs.copyFile(path.join(repository, row.path), target, constants.COPYFILE_FICLONE); state.copiedCurrent++;}
      else {await fs.writeFile(target, readBlob(state, row)); state.restoredGit++;}
      await fs.chmod(target, 0o444);
    }
    const lock = state.rows.find(row => row.path === 'package-lock.json');
    assert.ok(matches(state.observedCurrent.find(row => row.path === lock.path).current, lock), 'Historical V113 execution requires the exact installed package lockfile');
    state.nodeModules = await fs.realpath(path.join(repository, 'node_modules'));
    await fs.symlink(state.nodeModules, path.join(root, 'node_modules'), 'dir');
    const context = {root, repository, sourceCommit: V113_PRODUCTION_PUBLICATION_COMMIT, runtimeCommit: V113_PRODUCTION_RUNTIME_COMMIT,
      dispose: () => fs.rm(root, {recursive: true, force: true})};
    contexts.set(context, state); await verifyProductionHistoryV113(context); return context;
  } catch (error) {await fs.rm(root, {recursive: true, force: true}); throw error;}
}
function contextState(context) {
  const state = contexts.get(context); assert.ok(state, 'Unrecognized V113 historical context');
  assert.equal(context.root, state.root, 'V113 historical context root changed'); assert.equal(context.repository, state.repository, 'V113 historical context repository changed');
  assert.equal(context.sourceCommit, V113_PRODUCTION_PUBLICATION_COMMIT, 'V113 historical context source changed');
  assert.equal(context.runtimeCommit, V113_PRODUCTION_RUNTIME_COMMIT, 'V113 historical context runtime changed'); return state;
}
export async function verifyProductionHistoryV113(context) {
  const state = contextState(context), expected = new Set(state.rows.map(row => row.path));
  const head = path.join(state.root, '.git/HEAD');
  assert.ok((await fs.lstat(path.join(state.root, '.git'))).isDirectory(), 'V113 historical Git must be private');
  assert.ok(!(await fs.lstat(head)).isSymbolicLink(), 'V113 historical HEAD must be private');
  assert.equal(await fs.readFile(head, 'utf8'), V113_PRODUCTION_PUBLICATION_COMMIT + '\n', 'V113 historical HEAD changed');
  assert.equal((await fs.stat(head)).mode & 0o222, 0, 'V113 historical HEAD must remain read-only');
  if (state.alternate) {
    assert.ok(!(await fs.lstat(state.alternate.path)).isSymbolicLink(), 'V113 Git alternate must be private');
    assert.equal(await fs.readFile(state.alternate.path, 'utf8'), state.alternate.bytes, 'V113 Git alternate changed');
  }
  for (const commit of [V113_PRODUCTION_PUBLICATION_COMMIT, V113_PRODUCTION_RUNTIME_COMMIT]) assert.equal(objectSha('commit', git(state.root, ['cat-file', 'commit', commit])), commit);
  assert.equal(objectSha('tree', git(state.root, ['cat-file', 'tree', V113_PRODUCTION_PUBLICATION_TREE])), V113_PRODUCTION_PUBLICATION_TREE);
  async function walk(relative = '') {
    for (const item of await fs.readdir(path.join(state.root, relative), {withFileTypes: true})) {
      const file = relative ? relative + '/' + item.name : item.name;
      if (!relative && ['.git', 'node_modules'].includes(item.name)) continue;
      assert.ok(!item.isSymbolicLink(), 'V113 historical directory contains a symlink: ' + file);
      if (item.isDirectory()) await walk(file); else assert.ok(item.isFile() && expected.has(file), 'Unexpected V113 historical input: ' + file);
    }
  }
  await walk(); for (const row of state.rows) await verifyRow(state.root, row);
  assert.equal(await fs.realpath(path.join(state.root, 'node_modules')), state.nodeModules, 'V113 historical dependencies changed');
  return {sourceCommit: V113_PRODUCTION_PUBLICATION_COMMIT, sourceTree: V113_PRODUCTION_PUBLICATION_TREE,
    runtimeCommit: V113_PRODUCTION_RUNTIME_COMMIT, buildId: V113_PRODUCTION_BUILD_ID, frozenInputs: 1964,
    privateRegularFiles: state.rows.length, certificateFiles: state.certificatePaths.size, captures: 78,
    copiedMatchingCurrentFiles: state.copiedCurrent, restoredPinnedGitFiles: state.restoredGit,
    fetchedCanonicalCommits: [...state.fetchedCommits], inheritedShallowCommits: [...state.inheritedShallowCommits], currentRuntimeCovered: false};
}
export async function verifyProductionCurrentInputsUnchangedV113(context) {
  const state = contextState(context);
  for (const row of state.observedCurrent) {
    const current = await regularPath(state.repository, row.path) ? await fingerprint(state.repository, row.path) : null;
    assert.deepEqual(current, row.current, 'Current input changed while preserving V113: ' + row.path);
  }
  return {currentInputsUnchanged: state.observedCurrent.length};
}
export async function runProductionHistoryV113(context) {
  assertNoExternalGitPathOverrides();
  const state = contextState(context); await verifyProductionHistoryV113(context);
  assertNoExternalGitPathOverrides();
  const env = {...process.env}; delete env.NODE_TEST_CONTEXT;
  const commands = [
    ['scripts/snapshot-runtime-v113.mjs', '--check', FREEZE],
    ['--experimental-strip-types', '--test', '--test-reporter=tap', '--test-concurrency=1', ORIGINAL_TEST],
  ];
  const outputs = [];
  for (const args of commands) {
    const timeout = Math.min(300000, state.deadline - Date.now()); assert.ok(timeout > 0, 'V113 historical execution time bound exceeded');
    try {outputs.push(execFileSync(process.execPath, args, {cwd: state.root, env, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024}));}
    catch (error) {const failure = new Error('Original V113 command failed: ' + args.join(' ')); failure.stdout = error.stdout; failure.stderr = error.stderr; throw failure;}
  }
  assert.equal(JSON.parse(outputs[0].trim().split(/\r?\n/).at(-1)).status, 'PASS');
  for (const [name, count] of [['tests', 1], ['pass', 1], ['fail', 0], ['skipped', 0], ['cancelled', 0]]) assert.match(outputs[1], new RegExp('^# ' + name + ' ' + count + '(?:\\r?$)', 'm'));
  return {status: 'PASS_HISTORICAL_V113_PRODUCTION', ...await verifyProductionHistoryV113(context), ...await verifyProductionCurrentInputsUnchangedV113(context),
    originalTestExecuted: ORIGINAL_TEST, originalAssertions: 1, originalCommandsExecuted: 2,
    runtimeBrowserEvidenceReexecuted: false, outputs};
}
export async function checkProductionHistoryV113(options) {
  const context = await prepareProductionHistoryV113(options);
  try {return await runProductionHistoryV113(context);} finally {await context.dispose();}
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.deepEqual(process.argv.slice(2), ['--check'], 'Usage: node scripts/check-production-history-v113.mjs --check');
  try {console.log(JSON.stringify(await checkProductionHistoryV113()));}
  catch (error) {if (error.stdout) process.stdout.write(error.stdout); if (error.stderr) process.stderr.write(error.stderr); throw error;}
}
