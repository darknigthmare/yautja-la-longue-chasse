#!/usr/bin/env node
/** Execute the original independent V111 checker from its original V111 app. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {EXCEL_HOMEWORLD_HISTORY_COMMIT_V112, getHistoricalHomeworldExcelContextV112, verifyHistoricalHomeworldExcelContextV112} from './historical-excel-context-homeworld-v112.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIRS = ['app', 'scripts', 'tests', 'desktop', 'db', 'drizzle', 'build', 'worker'];

/** The independent checker restores fourteen explicit V110 Git preimages.
 * Start it from V111's private sources, so later V112 changes cannot enter its
 * remaining 1,386 frozen inputs. No checker assertion or source is replaced.
 * Its original single-commit shallow-fetch behavior remains available in CI.
 */
export async function checkIndependentExcelHistoryV112({tests = false} = {}) {
  const historical = await getHistoricalHomeworldExcelContextV112();
  await verifyHistoricalHomeworldExcelContextV112();
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'yautja-v111-independent-base-v112-'));
  try {
    // These must be real private copies. Symlinking an application directory
    // would let the original checker's prune step change the outer capsule.
    for (const directory of SOURCE_DIRS) {
      const source = path.join(historical.root, directory);
      if ((await fs.stat(source).catch(() => null))?.isDirectory())
        await fs.cp(source, path.join(base, directory), {recursive: true});
    }
    for (const entry of await fs.readdir(historical.root, {withFileTypes: true})) {
      if (entry.isFile()) await fs.copyFile(path.join(historical.root, entry.name), path.join(base, entry.name));
    }
    for (const directory of ['public', 'art-source', 'docs', '.openai', 'node_modules'])
      await fs.symlink(path.join(ROOT, directory), path.join(base, directory), 'dir');
    // Git is used only by the unchanged checker to read its exact V110 blobs.
    // Its historical art census is not run here. The normal V111 regeneration
    // keeps the independent real def899ad tree stored inside its own capsule.
    const gitDirectory = execFileSync('git', ['rev-parse', '--absolute-git-dir'], {cwd: ROOT, encoding: 'utf8'}).trim();
    await fs.symlink(gitDirectory, path.join(base, '.git'), 'dir');
    const original = await import(pathToFileURL(path.join(base, 'scripts/check-excel-history-v111.mjs')).href);
    assert.equal(original.SOURCE_COMMIT_V111, 'dff1f6734284891b5a24238f890070616a8325cc');
    assert.equal(original.V110_PREIMAGES_V111.length, 14);
    assert.equal(original.V110_ORIGINAL_TESTS_V111.length, 8);
    const result = await original.checkExcelHistoryV111({tests, repository: base});
    assert.equal(result.frozenInputsVerified, 1386); assert.equal(result.originalTestFiles, 8);
    assert.equal(result.sha256, '0b7d7890c8d235a9cda0f6d61c62001efe150f2c4022924c20d88196afcdbd7c');
    await verifyHistoricalHomeworldExcelContextV112();
    return {...result, sourceBaseCommit: EXCEL_HOMEWORLD_HISTORY_COMMIT_V112,
      originalCheckerUnmodified: true, currentRuntimeCovered: false};
  } finally {await fs.rm(base, {recursive: true, force: true});}
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert.ok(args.includes('--check') && args.every(arg => ['--check', '--tests'].includes(arg)) && new Set(args).size === args.length,
    'Usage: node scripts/check-excel-history-compat-v112.mjs --check [--tests]');
  console.log(JSON.stringify(await checkIndependentExcelHistoryV112({tests: args.includes('--tests')})));
}
