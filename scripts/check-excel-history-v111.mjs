#!/usr/bin/env node
/**
 * Re-run V110 in a private directory using its exact reviewed Git preimages.
 * No archived source payload is published and no application import is redirected.
 * Assets, workbooks and evidence remain byte-checked, shared read-only inputs.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const SOURCE_COMMIT_V111 = 'dff1f6734284891b5a24238f890070616a8325cc';
export const FROZEN_V110_BLOB_V111 = '1b3c83e56e43601b63dc07aa1af1d2ff2abc286c';
export const V110_PREIMAGES_V111 = Object.freeze([
  {
    "path": "app/game/HomeworldHub.tsx",
    "gitBlobSha": "3591354cdf98340d00e9904f00c3339b531caf2a"
  },
  {
    "path": "app/game/HomeworldWorldMapV77.tsx",
    "gitBlobSha": "8cf85f0f79517e7d54d2284c2cf26e57fea5d7b6"
  },
  {
    "path": "app/game/HomeworldWorldSceneV77.tsx",
    "gitBlobSha": "46f705ecabb75a03ef2249c5613a1b179fc28a7e"
  },
  {
    "path": "app/game/systems/homeworld.ts",
    "gitBlobSha": "a3985bb00170b451e58d19b45b67b07086a185f0"
  },
  {
    "path": "app/game/HuntCanvas.tsx",
    "gitBlobSha": "8d002485c8e29a9d86db3c7e8ad4aa64f4a2b784"
  },
  {
    "path": "app/game/GameClient.tsx",
    "gitBlobSha": "ec93b23b14a34ca7c9dbd3e24091dc8ff08cbfb5"
  },
  {
    "path": "app/game/types.ts",
    "gitBlobSha": "8575c712942056ad818f723865705f0841e57ef1"
  },
  {
    "path": "app/game/save.ts",
    "gitBlobSha": "1d7c656780a80b16b0ef226fd91ddc02567182c1"
  },
  {
    "path": "app/game/systems/huntRitesRuntimeV77.ts",
    "gitBlobSha": "bdf31d19e19b831aa8914c68358fe17848ec7f6d"
  },
  {
    "path": "app/game/systems/ritesOfHuntV77.ts",
    "gitBlobSha": "541bced727af861d996d398106b8af271c1012e1"
  },
  {
    "path": "app/game/HuntRitesMenuV77.tsx",
    "gitBlobSha": "7d8dfea0be7c9ef330403a85ce3c5e883722ecca"
  },
  {
    "path": "app/game/buildInfo.ts",
    "gitBlobSha": "d932a0be13bcd175ed26cc5080dba60165873fc2"
  },
  {
    "path": "tests/enemy-trophy-runtime-v18.test.mjs",
    "gitBlobSha": "6be1dffabd1f94898274dc777052e30f6f6c9457"
  },
  {
    "path": "tests/hunt-jump-assist-runtime.test.mjs",
    "gitBlobSha": "dd2cf42b012b2db77734a2432df528297ac26db3"
  }
]);
export const V110_ORIGINAL_TESTS_V111 = Object.freeze([
  {
    "path": "tests/excel-followup-v110.test.mjs",
    "gitBlobSha": "26f2e632172906747afb18c6810c68dc0ec5f1ae"
  },
  {
    "path": "tests/excel-history-v110.test.mjs",
    "gitBlobSha": "3774f78aa02b919183a6c9b23cb56741b57ca296"
  },
  {
    "path": "tests/homeworld-archive-record-v110.test.mjs",
    "gitBlobSha": "c8867fc649ce1b91cf1c05b2ad66e4fde3a4dc9b"
  },
  {
    "path": "tests/homeworld-doorway-entry-v110.test.mjs",
    "gitBlobSha": "7a51898993971d4898877156634460dddfb07b35"
  },
  {
    "path": "tests/homeworld-evidence-v110.test.mjs",
    "gitBlobSha": "7ff9eceaee17a5b40d3eca2437bb705f1f7f599d"
  },
  {
    "path": "tests/homeworld-objectives-v110.test.mjs",
    "gitBlobSha": "5acb7d6575ac3ad4ed764891b981bf4c64721a3e"
  },
  {
    "path": "tests/homeworld-resident-contacts-v110.test.mjs",
    "gitBlobSha": "8e1ff977932871ad013e0bf2ecb3e20276be988b"
  },
  {
    "path": "tests/homeworld-transitions-v110.test.mjs",
    "gitBlobSha": "cfad4157a2096800df5303cb5dc292470e929794"
  }
]);
const REPOSITORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const gitBlobHashV111 = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const local = file => typeof file === 'string' && file.length > 0 && !path.isAbsolute(file) && !file.includes('\\') && !file.includes('\0') && file.split('/').every(part => part && part !== '.' && part !== '..');
const git = (root, args, timeout = 30000) => execFileSync('git', args, {cwd: root, timeout, maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});

export async function verifyFrozenInputsV111(root, freeze) {
  assert.ok(Array.isArray(freeze.entries) && freeze.files === freeze.entries.length);
  assert.equal(new Set(freeze.entries.map(row => row.path)).size, freeze.files);
  assert.equal(freeze.bytes, freeze.entries.reduce((sum, row) => sum + row.bytes, 0));
  for (const row of freeze.entries) {
    assert.ok(local(row.path), 'Unsafe frozen path');
    const bytes = await fs.readFile(path.join(root, row.path));
    assert.equal(bytes.length, row.bytes, 'Frozen V110 size changed: ' + row.path);
    assert.equal(sha256(bytes), row.sha256, 'Frozen V110 input changed: ' + row.path);
  }
  return freeze.files;
}

export async function restorePinnedSourceV111(root, row, readSource) {
  assert.ok(local(row.path), 'Unsafe historical source path');
  assert.match(row.gitBlobSha ?? '', /^[a-f0-9]{40}$/);
  const bytes = await readSource(row.path);
  assert.ok(Buffer.isBuffer(bytes));
  assert.equal(gitBlobHashV111(bytes), row.gitBlobSha, 'Historical Git source differs: ' + row.path);
  const target = path.join(root, row.path);
  await fs.mkdir(path.dirname(target), {recursive: true});
  // This is a private copy. Neither a current source nor a shared input is written.
  const stat = await fs.lstat(target).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));
  assert.ok(!stat?.isSymbolicLink(), 'Historical source target is a symlink');
  if (stat) await fs.chmod(target, 0o644);
  await fs.writeFile(target, bytes, {mode: 0o444});
  await fs.chmod(target, 0o444);
}

async function ensureSourceCommit(root) {
  try {git(root, ['cat-file', '-e', SOURCE_COMMIT_V111 + '^{commit}']); return;}
  catch { /* A shallow CI checkout may omit its base commit. */ }
  const remote = git(root, ['remote', 'get-url', 'origin']).toString('utf8').trim();
  assert.ok(/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)darknigthmare\/yautja-la-longue-chasse(?:\.git)?$/.test(remote),
    'Historical fetch requires the original repository origin');
  // Read-only, single-commit fetch. Never fetch the full multi-gigabyte history.
  git(root, ['-c', 'protocol.file.allow=never', 'fetch', '--filter=blob:none', '--no-tags', '--depth=1', 'origin', SOURCE_COMMIT_V111], 45000);
  git(root, ['cat-file', '-e', SOURCE_COMMIT_V111 + '^{commit}']);
}

async function pruneNewAppFiles(root, allowed) {
  async function visit(relative) {
    for (const entry of await fs.readdir(path.join(root, relative), {withFileTypes: true})) {
      const file = relative + '/' + entry.name;
      if (entry.isDirectory()) await visit(file);
      else if (!allowed.has(file)) await fs.rm(path.join(root, file));
    }
  }
  await visit('app');
}

/** Build a source-only copy; old XLSX files and reports are never rewritten. */
export async function prepareHistoricalV110V111(repository = REPOSITORY) {
  await ensureSourceCommit(repository);
  const freezeBytes = await fs.readFile(path.join(repository, 'docs/v110-runtime-freeze.json'));
  assert.equal(gitBlobHashV111(freezeBytes), FROZEN_V110_BLOB_V111, 'Published V110 freeze changed');
  const freeze = JSON.parse(freezeBytes);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'yautja-v110-history-v111-'));
  try {
    // Copy source folders so Node resolves imports and ROOT inside the private copy.
    const sourceDirs = ['app', 'scripts', 'tests', 'desktop', 'db', 'drizzle', 'build', 'worker'];
    for (const directory of sourceDirs) {
      const source = path.join(repository, directory);
      if (await fs.stat(source).catch(() => null)) await fs.cp(source, path.join(root, directory), {recursive: true});
    }
    for (const entry of await fs.readdir(repository, {withFileTypes: true})) {
      if (entry.isFile()) await fs.copyFile(path.join(repository, entry.name), path.join(root, entry.name));
    }
    for (const directory of ['public', 'art-source', 'docs', '.openai', 'node_modules']) {
      await fs.symlink(path.join(repository, directory), path.join(root, directory), 'dir');
    }
    // V110 inventories all application files, so new V111 modules do not enter it.
    await pruneNewAppFiles(root, new Set(freeze.entries.filter(row => row.path.startsWith('app/')).map(row => row.path)));
    for (const row of V110_PREIMAGES_V111) await restorePinnedSourceV111(root, row,
      file => Promise.resolve(git(repository, ['show', SOURCE_COMMIT_V111 + ':' + file])));
    // Current test fixtures may adapt to the current runtime. Execute only
    // their exact original Git bytes in this private historical directory.
    for (const row of V110_ORIGINAL_TESTS_V111) await restorePinnedSourceV111(root, row,
      file => Promise.resolve(git(repository, ['show', SOURCE_COMMIT_V111 + ':' + file])));
    await verifyFrozenInputsV111(root, freeze);
    return {root, freeze, sourceCommit: SOURCE_COMMIT_V111, dispose: () => fs.rm(root, {recursive: true, force: true})};
  } catch (error) {
    await fs.rm(root, {recursive: true, force: true});
    throw error;
  }
}

export async function checkExcelHistoryV111({tests = false, repository = REPOSITORY} = {}) {
  const context = await prepareHistoricalV110V111(repository);
  try {
    let output = '';
    if (tests) {
      const environment = {...process.env}; delete environment.NODE_TEST_CONTEXT;
      output = execFileSync(process.execPath, ['--experimental-strip-types', '--test', '--test-reporter=tap', '--test-concurrency=1',
        ...V110_ORIGINAL_TESTS_V111.map(row => row.path)], {
        cwd: context.root, env: environment, encoding: 'utf8', timeout: 300000, maxBuffer: 8 * 1024 * 1024,
      });
      assert.match(output, /# fail 0(?:\r?\n|$)/); assert.match(output, /# skipped 0(?:\r?\n|$)/);
      process.stdout.write(output);
    }
    const historical = await import(pathToFileURL(path.join(context.root, 'scripts/build-excel-followup-v110.mjs')).href);
    assert.equal(historical.ROOT, context.root);
    const result = await historical.generateFollowupV110({check: true});
    const verified = await verifyFrozenInputsV111(context.root, context.freeze);
    return {result: 'PASS_HISTORICAL_REGENERATION', release: 'V110', sourceCommit: SOURCE_COMMIT_V111,
      frozenInputsVerified: verified, originalTestFiles: V110_ORIGINAL_TESTS_V111.length, originalTestsExecuted: tests,
      sha256: result.workbookSha256, bytes: result.bytes, currentRuntimeCovered: false};
  } finally {await context.dispose();}
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert.ok(args.includes('--check') && args.every(arg => ['--check', '--tests'].includes(arg)) && new Set(args).size === args.length,
    'Usage: node scripts/check-excel-history-v111.mjs --check [--tests]');
  console.log(JSON.stringify(await checkExcelHistoryV111({tests: args.includes('--tests')})));
}
