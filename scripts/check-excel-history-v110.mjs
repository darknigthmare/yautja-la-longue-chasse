#!/usr/bin/env node
/**
 * Re-run V109 in a private directory using its exact reviewed Git preimages.
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

export const SOURCE_COMMIT_V110 = '9f412db553d16c4323a0b730f9523f86eddfb939';
export const FROZEN_V109_BLOB = '22383d20d26812709611b5b664366255180422ed';
export const V109_PREIMAGES = Object.freeze([
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
export const V109_ORIGINAL_TESTS = Object.freeze([
  {
    "path": "tests/clan-supply-route-v109.test.mjs",
    "gitBlobSha": "e4da0b7aaa982666df02bfaff29843418c41aafe"
  },
  {
    "path": "tests/excel-followup-v109.test.mjs",
    "gitBlobSha": "a1b7b17f37d2fd7ef6abdd91cb86899d6d891ad0"
  },
  {
    "path": "tests/excel-history-v109.test.mjs",
    "gitBlobSha": "0044674bfe2b608e04467b67b3342b6a181b8b5f"
  },
  {
    "path": "tests/game-reserve-biomes-persistence-v109.test.mjs",
    "gitBlobSha": "8aa3f95205f90fb8235d74f1e14fdecc390a8de4"
  },
  {
    "path": "tests/game-reserve-biomes-v109.test.mjs",
    "gitBlobSha": "a835c7273a1158e08a8512974ffccaa19be1c6af"
  },
  {
    "path": "tests/game-reserve-rendering-v109.test.mjs",
    "gitBlobSha": "63cb0385653a8ca7b814be9d0fa1499eb6e31c4a"
  },
  {
    "path": "tests/homeworld-archive-plaque-v109.test.mjs",
    "gitBlobSha": "e19e6ea3b08c1e716e64383d6571fa45f216fb35"
  },
  {
    "path": "tests/homeworld-dynamic-navigation-v109.test.mjs",
    "gitBlobSha": "fa945bd152e740a87562d48b08a6da4982c3d675"
  },
  {
    "path": "tests/pit-engine-compatibility-v109.test.mjs",
    "gitBlobSha": "eeb6e91ab80f7497f1d0dde5b52c85dff4f01d74"
  },
  {
    "path": "tests/pit-forward-throw-art-v109.test.mjs",
    "gitBlobSha": "9d83b906fe6025c33ba31fefbaeb0465c4db335e"
  },
  {
    "path": "tests/pit-forward-throws-v109.test.mjs",
    "gitBlobSha": "43df22ac6eac076e7dc0bbfa2108f508bdc8dde8"
  },
  {
    "path": "tests/production-publication-v109.test.mjs",
    "gitBlobSha": "1a8b7983542ed27a5355183f77984ad5a696e2ec"
  }
]);
const REPOSITORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const gitBlobHashV110 = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const local = file => typeof file === 'string' && file.length > 0 && !path.isAbsolute(file) && !file.includes('\\') && !file.includes('\0') && file.split('/').every(part => part && part !== '.' && part !== '..');
const git = (root, args, timeout = 30000) => execFileSync('git', args, {cwd: root, timeout, maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});

export async function verifyFrozenInputsV110(root, freeze) {
  assert.ok(Array.isArray(freeze.entries) && freeze.files === freeze.entries.length);
  assert.equal(new Set(freeze.entries.map(row => row.path)).size, freeze.files);
  assert.equal(freeze.bytes, freeze.entries.reduce((sum, row) => sum + row.bytes, 0));
  for (const row of freeze.entries) {
    assert.ok(local(row.path), 'Unsafe frozen path');
    const bytes = await fs.readFile(path.join(root, row.path));
    assert.equal(bytes.length, row.bytes, 'Frozen V109 size changed: ' + row.path);
    assert.equal(sha256(bytes), row.sha256, 'Frozen V109 input changed: ' + row.path);
  }
  return freeze.files;
}

export async function restorePinnedSourceV110(root, row, readSource) {
  assert.ok(local(row.path), 'Unsafe historical source path');
  assert.match(row.gitBlobSha ?? '', /^[a-f0-9]{40}$/);
  const bytes = await readSource(row.path);
  assert.ok(Buffer.isBuffer(bytes));
  assert.equal(gitBlobHashV110(bytes), row.gitBlobSha, 'Historical Git source differs: ' + row.path);
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
  try {git(root, ['cat-file', '-e', SOURCE_COMMIT_V110 + '^{commit}']); return;}
  catch { /* A shallow CI checkout may omit its base commit. */ }
  const remote = git(root, ['remote', 'get-url', 'origin']).toString('utf8').trim();
  assert.ok(/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)darknigthmare\/yautja-la-longue-chasse(?:\.git)?$/.test(remote),
    'Historical fetch requires the original repository origin');
  // Read-only, single-commit fetch. Never fetch the full multi-gigabyte history.
  git(root, ['-c', 'protocol.file.allow=never', 'fetch', '--filter=blob:none', '--no-tags', '--depth=1', 'origin', SOURCE_COMMIT_V110], 45000);
  git(root, ['cat-file', '-e', SOURCE_COMMIT_V110 + '^{commit}']);
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
export async function prepareHistoricalV109V110(repository = REPOSITORY) {
  await ensureSourceCommit(repository);
  const freezeBytes = await fs.readFile(path.join(repository, 'docs/v109-runtime-freeze.json'));
  assert.equal(gitBlobHashV110(freezeBytes), FROZEN_V109_BLOB, 'Published V109 freeze changed');
  const freeze = JSON.parse(freezeBytes);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'yautja-v109-history-v110-'));
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
    // V109 inventories all application files, so new V110 modules do not enter it.
    await pruneNewAppFiles(root, new Set(freeze.entries.filter(row => row.path.startsWith('app/')).map(row => row.path)));
    for (const row of V109_PREIMAGES) await restorePinnedSourceV110(root, row,
      file => Promise.resolve(git(repository, ['show', SOURCE_COMMIT_V110 + ':' + file])));
    for (const row of V109_ORIGINAL_TESTS) {
      assert.equal(gitBlobHashV110(await fs.readFile(path.join(root, row.path))), row.gitBlobSha,
        'Original V109 assertion changed: ' + row.path);
    }
    await verifyFrozenInputsV110(root, freeze);
    return {root, freeze, sourceCommit: SOURCE_COMMIT_V110, dispose: () => fs.rm(root, {recursive: true, force: true})};
  } catch (error) {
    await fs.rm(root, {recursive: true, force: true});
    throw error;
  }
}

export async function checkExcelHistoryV110({tests = false, repository = REPOSITORY} = {}) {
  const context = await prepareHistoricalV109V110(repository);
  try {
    let output = '';
    if (tests) {
      const environment = {...process.env}; delete environment.NODE_TEST_CONTEXT;
      output = execFileSync(process.execPath, ['--experimental-strip-types', '--test', '--test-reporter=tap', '--test-concurrency=1',
        ...V109_ORIGINAL_TESTS.map(row => row.path)], {
        cwd: context.root, env: environment, encoding: 'utf8', timeout: 300000, maxBuffer: 8 * 1024 * 1024,
      });
      assert.match(output, /# fail 0(?:\r?\n|$)/); assert.match(output, /# skipped 0(?:\r?\n|$)/);
      process.stdout.write(output);
    }
    const historical = await import(pathToFileURL(path.join(context.root, 'scripts/build-excel-followup-v109.mjs')).href);
    assert.equal(historical.ROOT, context.root);
    const result = await historical.generateFollowupV109({check: true});
    const verified = await verifyFrozenInputsV110(context.root, context.freeze);
    return {result: 'PASS_HISTORICAL_REGENERATION', release: 'V109', sourceCommit: SOURCE_COMMIT_V110,
      frozenInputsVerified: verified, originalTestFiles: V109_ORIGINAL_TESTS.length, originalTestsExecuted: tests,
      sha256: result.workbookSha256, bytes: result.bytes, currentRuntimeCovered: false};
  } finally {await context.dispose();}
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert.ok(args.includes('--check') && args.every(arg => ['--check', '--tests'].includes(arg)) && new Set(args).size === args.length,
    'Usage: node scripts/check-excel-history-v110.mjs --check [--tests]');
  console.log(JSON.stringify(await checkExcelHistoryV110({tests: args.includes('--tests')})));
}
