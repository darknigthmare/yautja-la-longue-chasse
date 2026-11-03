/** Re-run the published V112 Homeworld/Pit verifications inside their own capsule.
 *
 * These five checks compare V112 artifacts with the V112 runtime they describe
 * (docs/v112-runtime-freeze.json pins 1 563 files). Run against the current
 * tree they fail by design once later work changes any pinned file, so they run
 * here against the published commit, read-only. `--tests` also executes the 22
 * original V112 test files there. Nothing in the current tree is rewritten.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {getHistoricalHomeworldExcelContextV113, verifyHistoricalHomeworldExcelContextV113, runHistoricalHomeworldTestsV113} from './historical-excel-context-homeworld-v113.mjs';

export const PUBLISHED_V112_CHECKS_V113 = [
  ['python3', 'scripts/audit-open-workstreams-v112.py', '--check'],
  [process.execPath, 'scripts/build-pit-backward-art-v112.mjs', '--check'],
  [process.execPath, 'scripts/build-runtime-public-inputs-v112.mjs', '--check'],
  [process.execPath, 'scripts/snapshot-runtime-v112.mjs', '--check', 'docs/v112-runtime-freeze.json'],
  [process.execPath, 'scripts/build-homeworld-followup-v112.mjs', '--check'],
];

export async function checkPublishedV112InCapsuleV113({tests = false} = {}) {
  const context = await getHistoricalHomeworldExcelContextV113();
  const integrity = await verifyHistoricalHomeworldExcelContextV113();
  const checks = [];
  for (const [command, ...args] of PUBLISHED_V112_CHECKS_V113) {
    const env = {...process.env}; delete env.NODE_TEST_CONTEXT;
    let output;
    try {output = execFileSync(command, args, {cwd: context.root, env, encoding: 'utf8', timeout: 600000, maxBuffer: 16 * 1024 * 1024});}
    catch (error) {throw new Error('Published V112 check failed in its capsule: ' + args.join(' ') + '\n' + String(error.stdout ?? '') + String(error.stderr ?? ''), {cause: error});}
    checks.push({script: args[0], output: output.trim().split('\n').at(-1)});
  }
  const results = [];
  if (tests) for (const file of context.manifest.historicalTests) results.push((await runHistoricalHomeworldTestsV113([file])).files[0]);
  if (tests) assert.equal(results.length, context.manifest.historicalTests.length);
  await verifyHistoricalHomeworldExcelContextV113();
  return {sourceCommit: context.manifest.sourceCommit, sourcesVerified: integrity.sourcesVerified, checks, testFiles: results.length, currentRuntimeCovered: false};
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const args = process.argv.slice(2);
  assert.ok(args.every(arg => ['--check', '--tests'].includes(arg)) && args.includes('--check'), 'Usage: --check [--tests]');
  console.log(JSON.stringify(await checkPublishedV112InCapsuleV113({tests: args.includes('--tests')})));
}
