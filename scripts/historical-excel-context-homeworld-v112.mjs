import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createHistoricalExcelContext} from './lib/historical-excel-context.mjs';

export const EXCEL_HOMEWORLD_HISTORY_COMMIT_V112 = 'def899ad07fea582053c5c204e4e578d8e0d7f9b';
export const EXCEL_HOMEWORLD_HISTORY_MANIFEST_SHA256_V112 = 'd4bf56b2e785959bc2c0217bfd308d321707a9ecb5bc52b22dd70a1b6154572a';
export const EXCEL_HOMEWORLD_HISTORY_ARCHIVE_SHA256_V112 = '972cb71ff3b3448a7d298f7d8628d70783864f7b8b9debe3594b3bcf078741c6';
export const HISTORICAL_ECOTONES_V90_SHA_V112 = '95b3f0da59550328dad9c4aab926de9462d2eb74b654f84791b7d7c617079c81';
const context = createHistoricalExcelContext({
  repository: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  sourceCommit: EXCEL_HOMEWORLD_HISTORY_COMMIT_V112,
  release: 'V111',
  manifestPath: 'tests/fixtures/excel-history-v111-homeworld-v112.json',
  manifestSha256: EXCEL_HOMEWORLD_HISTORY_MANIFEST_SHA256_V112,
  archiveSha256: EXCEL_HOMEWORLD_HISTORY_ARCHIVE_SHA256_V112,
});
export async function getHistoricalHomeworldExcelContextV112() {
  return {...await context.get(), manifestSha256: EXCEL_HOMEWORLD_HISTORY_MANIFEST_SHA256_V112,
    archiveSha256: EXCEL_HOMEWORLD_HISTORY_ARCHIVE_SHA256_V112};
}
export const loadHistoricalHomeworldExcelV112 = context.load;
export const runHistoricalHomeworldTestsV112 = context.runTests;
/** The superseded renderer's original assertions run only in its private app. */
export async function runHistoricalEcotonesV90FromV112() {
  const historical = await context.get(), file = 'tests/homeworld-ecotones-v90.test.mjs';
  const group = historical.manifest.historicalGroups.find(row => row.release === 'V90-ECOTONES');
  assert.deepEqual(group, {release: 'V90-ECOTONES', files: [file], assertions: 7});
  assert.equal(historical.manifest.sources.find(row => row.path === file)?.sha256, HISTORICAL_ECOTONES_V90_SHA_V112);
  const result = await context.runTests([file]);
  assert.match(result.output, /# tests 7(?:\r?\n|$)/); assert.match(result.output, /# pass 7(?:\r?\n|$)/);
  return result;
}
export async function verifyHistoricalHomeworldExcelContextV112() {
  const integrity = await context.verify(), historical = await context.get();
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: historical.root, encoding: 'utf8'}).trim();
  assert.equal(commit, EXCEL_HOMEWORLD_HISTORY_COMMIT_V112, 'Historical Git HEAD changed');
  const tree = execFileSync('git', ['ls-tree', '-r', '-z', 'HEAD'], {cwd: historical.root, maxBuffer: 16 * 1024 * 1024});
  assert.equal(createHash('sha256').update(tree).digest('hex'), historical.manifest.gitTreeSha256, 'Historical Git tree changed');
  return {...integrity, privateGitObjectsVerified: historical.manifest.gitObjects.length, gitTreeVerified: true};
}
