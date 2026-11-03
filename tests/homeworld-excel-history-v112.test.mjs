import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {EXCEL_HOMEWORLD_HISTORY_COMMIT_V112, EXCEL_HOMEWORLD_HISTORY_MANIFEST_SHA256_V112, EXCEL_HOMEWORLD_HISTORY_ARCHIVE_SHA256_V112, HISTORICAL_ECOTONES_V90_SHA_V112, getHistoricalHomeworldExcelContextV112, loadHistoricalHomeworldExcelV112, runHistoricalHomeworldTestsV112, runHistoricalEcotonesV90FromV112, verifyHistoricalHomeworldExcelContextV112} from '../scripts/historical-excel-context-homeworld-v112.mjs';

test('history retains sixteen original V111 files plus original V90 assertions and a private real Git identity', async () => {
  const context = await getHistoricalHomeworldExcelContextV112();
  assert.equal(context.manifest.sourceCommit, EXCEL_HOMEWORLD_HISTORY_COMMIT_V112);
  assert.equal(context.manifestSha256, EXCEL_HOMEWORLD_HISTORY_MANIFEST_SHA256_V112);
  assert.equal(context.archiveSha256, EXCEL_HOMEWORLD_HISTORY_ARCHIVE_SHA256_V112);
  assert.equal(context.manifest.historicalTests.length, 17); assert.equal(context.manifest.expectedAssertions, 132);
  assert.deepEqual(context.manifest.historicalGroups.map(row => [row.release, row.files.length, row.assertions]), [['V111', 16, 125], ['V90-ECOTONES', 1, 7]]);
  assert.equal(context.manifest.products.V111[1].sha256, 'fa5ebf78a08c36b4a567246dfae41de535a8e36c7294ba33190e3e1e2ec9ad05');
  assert.equal(context.manifest.gitObjects.length, 1608);
  const historical = await loadHistoricalHomeworldExcelV112(), current = await import('../scripts/build-homeworld-followup-v111.mjs');
  assert.equal(historical.ROOT, context.root); assert.equal(current.ROOT, process.cwd()); assert.notEqual(historical.ROOT, current.ROOT);
  const head = path.join(context.root, '.git/HEAD');
  assert.equal((await fs.lstat(head)).isSymbolicLink(), false); assert.equal((await fs.stat(head)).mode & 0o222, 0);
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], {cwd: context.root, encoding: 'utf8'}).trim(), EXCEL_HOMEWORLD_HISTORY_COMMIT_V112);
  const integrity = await verifyHistoricalHomeworldExcelContextV112();
  assert.equal(integrity.currentRuntimeCovered, false); assert.equal(integrity.gitTreeVerified, true);
});

test('tampering with private V111 source or its private Git HEAD is rejected without changing current files', async () => {
  const context = await getHistoricalHomeworldExcelContextV112(), current = await fs.readFile('app/game/HomeworldHub.tsx');
  for (const relative of ['app/game/HomeworldHub.tsx', '.git/HEAD']) {
    const file = path.join(context.root, relative), original = await fs.readFile(file);
    try {await fs.chmod(file, 0o644); await fs.appendFile(file, '\n'); await assert.rejects(verifyHistoricalHomeworldExcelContextV112(), /Historical size changed/);}
    finally {await fs.writeFile(file, original); await fs.chmod(file, 0o444);}
  }
  assert.deepEqual(await fs.readFile('app/game/HomeworldHub.tsx'), current); await verifyHistoricalHomeworldExcelContextV112();
});

test('V112 history executes the unchanged V111 doorway assertions and refuses tests outside the reviewed inventory', async () => {
  const result = await runHistoricalHomeworldTestsV112(['tests/homeworld-continuation-integration-v111.test.mjs']);
  assert.equal(result.currentRuntimeCovered, false); assert.match(result.output, /# tests 11\n/); assert.match(result.output, /# pass 11\n/);
  await assert.rejects(runHistoricalHomeworldTestsV112(['tests/homeworld-excel-followup-v112.test.mjs']), /Unreviewed historical test/);
});

test('the superseded V90 renderer keeps its seven exact assertions in the private original application', async () => {
  const context = await getHistoricalHomeworldExcelContextV112();
  assert.equal(context.manifest.sources.find(row => row.path === 'tests/homeworld-ecotones-v90.test.mjs').sha256, HISTORICAL_ECOTONES_V90_SHA_V112);
  const result = await runHistoricalEcotonesV90FromV112();
  assert.equal(result.currentRuntimeCovered, false); assert.match(result.output, /# tests 7\n/); assert.match(result.output, /# fail 0\n/);
});
