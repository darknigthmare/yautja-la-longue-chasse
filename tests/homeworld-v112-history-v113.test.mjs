import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {
  EXCEL_HOMEWORLD_HISTORY_COMMIT_V113, EXCEL_HOMEWORLD_HISTORY_MANIFEST_SHA256_V113, EXCEL_HOMEWORLD_HISTORY_ARCHIVE_SHA256_V113,
  getHistoricalHomeworldExcelContextV113, loadHistoricalHomeworldExcelV113, runHistoricalHomeworldTestsV113, verifyHistoricalHomeworldExcelContextV113,
} from '../scripts/historical-excel-context-homeworld-v113.mjs';

// The 22 original V112 Homeworld/Pit test files, byte-exact at the published commit.
const V112_TESTS = [
  'tests/homeworld-ecotones-v112.test.mjs', 'tests/homeworld-excel-followup-v112.test.mjs', 'tests/homeworld-excel-history-v112.test.mjs',
  'tests/homeworld-geometry-recovery-integration-v112.test.mjs', 'tests/homeworld-geometry-recovery-matrix-v112.test.mjs',
  'tests/homeworld-geometry-recovery-v112.test.mjs', 'tests/homeworld-ground-joints-v112.test.mjs', 'tests/homeworld-live-guidance-v112.test.mjs',
  'tests/homeworld-mobility-v112.test.mjs', 'tests/homeworld-natural-placements-v112.test.mjs', 'tests/homeworld-natural-rock-faces-v112.test.mjs',
  'tests/homeworld-public-life-v112.test.mjs', 'tests/homeworld-public-places-v112.test.mjs', 'tests/homeworld-spatial-v112.test.mjs',
  'tests/pit-backward-art-provenance-v112.test.mjs', 'tests/pit-backward-controls-v112.test.mjs', 'tests/pit-backward-throw-art-v112.test.mjs',
  'tests/pit-backward-throws-v112.test.mjs', 'tests/pit-browser-whiff-observation-v112.test.mjs', 'tests/pit-browser-worker-observation-v112.test.mjs',
  'tests/pit-replay-export-v112.test.mjs', 'tests/production-evidence-v112.test.mjs',
];

test('the V112 capsule keeps the published commit, its 22 original test files and a private real Git identity', async () => {
  // The later R7 publication remains the current workbook. The earlier
  // Homeworld/Pit capsule must recover its own original without rolling it back.
  const workbookPath = 'docs/YAUTJA_V112_SUIVI.xlsx', currentWorkbook = await fs.readFile(workbookPath);
  assert.equal(currentWorkbook.length, 9433700);
  assert.equal(createHash('sha256').update(currentWorkbook).digest('hex'), '723cc894b643d55dcd076cab8b615866c6879ecc481c55616adcdd0508d2eccc');
  const context = await getHistoricalHomeworldExcelContextV113();
  assert.equal(context.manifest.sourceCommit, EXCEL_HOMEWORLD_HISTORY_COMMIT_V113);
  assert.equal(context.manifest.release, 'V112');
  assert.deepEqual(context.manifest.historicalTests, V112_TESTS);
  assert.equal(context.manifest.products.V112[1].sha256, 'b29aa412000717cdfd81be1a60e2c2f9d8489c0b8b2ed5d29404668d04dd1d02');
  assert.equal(context.manifest.gitObjects.length, 1636);
  const historical = await loadHistoricalHomeworldExcelV113();
  assert.equal(historical.ROOT, context.root); assert.notEqual(historical.ROOT, process.cwd());
  const head = path.join(context.root, '.git/HEAD');
  assert.equal((await fs.lstat(head)).isSymbolicLink(), false); assert.equal((await fs.stat(head)).mode & 0o222, 0);
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], {cwd: context.root, encoding: 'utf8'}).trim(), EXCEL_HOMEWORLD_HISTORY_COMMIT_V113);
  const integrity = await verifyHistoricalHomeworldExcelContextV113();
  assert.equal(integrity.currentRuntimeCovered, false);
  assert.equal(integrity.sourcesVerified, 3279); assert.equal(integrity.sharedVerified, 1507);
  assert.equal(integrity.restoredSharedVerified, 82);
  const historicalWorkbook = await fs.readFile(path.join(context.root, workbookPath));
  assert.equal(historicalWorkbook.length, 9383908);
  assert.equal(createHash('sha256').update(historicalWorkbook).digest('hex'), 'b29aa412000717cdfd81be1a60e2c2f9d8489c0b8b2ed5d29404668d04dd1d02');
  const privateStat = await fs.lstat(path.join(context.root, workbookPath)), currentStat = await fs.stat(workbookPath);
  assert.equal(privateStat.isSymbolicLink(), false); assert.equal(privateStat.mode & 0o222, 0);
  assert.ok(privateStat.ino !== currentStat.ino || privateStat.dev !== currentStat.dev);
  assert.deepEqual(await fs.readFile(workbookPath), currentWorkbook);
  assert.match(EXCEL_HOMEWORLD_HISTORY_MANIFEST_SHA256_V113, /^[a-f0-9]{64}$/); assert.match(EXCEL_HOMEWORLD_HISTORY_ARCHIVE_SHA256_V113, /^[a-f0-9]{64}$/);
});

test('tampering with private V112 source or its Git HEAD is rejected without changing current files', async () => {
  const context = await getHistoricalHomeworldExcelContextV113(), current = await fs.readFile('app/game/HuntCanvas.tsx');
  for (const relative of ['app/game/HuntCanvas.tsx', '.git/HEAD']) {
    const file = path.join(context.root, relative), original = await fs.readFile(file);
    try {await fs.chmod(file, 0o644); await fs.appendFile(file, '\n'); await assert.rejects(verifyHistoricalHomeworldExcelContextV113(), /Historical size changed/);}
    finally {await fs.writeFile(file, original); await fs.chmod(file, 0o444);}
  }
  assert.deepEqual(await fs.readFile('app/game/HuntCanvas.tsx'), current); await verifyHistoricalHomeworldExcelContextV113();
});

test('the restored original V112 workbook remains immutable without changing the later R7 workbook', async () => {
  const context = await getHistoricalHomeworldExcelContextV113(), relative = 'docs/YAUTJA_V112_SUIVI.xlsx';
  const current = await fs.readFile(relative), file = path.join(context.root, relative), original = await fs.readFile(file);
  try {
    await fs.chmod(file, 0o644); await fs.appendFile(file, '\n'); await fs.chmod(file, 0o444);
    await assert.rejects(verifyHistoricalHomeworldExcelContextV113(), /Historical shared preimage size changed/);
  } finally {await fs.chmod(file, 0o644); await fs.writeFile(file, original); await fs.chmod(file, 0o444);}
  assert.deepEqual(await fs.readFile(relative), current);
  await verifyHistoricalHomeworldExcelContextV113();
});

test('historical audio stays private while the current pod sounds remain available', async () => {
  const relative = 'public/audio/manifest.json', current = await fs.readFile(relative);
  const podSounds = ['pod-arm', 'pod-cancel', 'pod-detonate'];
  assert.ok(podSounds.every(id => JSON.parse(current).entries.some(entry => entry.id === id)));
  const context = await getHistoricalHomeworldExcelContextV113(), file = path.join(context.root, relative);
  const historical = await fs.readFile(file), row = context.manifest.shared.find(entry => entry.path === relative);
  assert.ok(context.restoredPaths.has(relative), 'Changed audio must use its reviewed historical preimage');
  assert.equal(historical.length, row.bytes);
  assert.equal(createHash('sha256').update(historical).digest('hex'), row.sha256);
  assert.ok(podSounds.every(id => !JSON.parse(historical).entries.some(entry => entry.id === id)));
  const privateStat = await fs.lstat(file), currentStat = await fs.stat(relative);
  assert.equal(privateStat.isSymbolicLink(), false); assert.equal(privateStat.mode & 0o222, 0);
  assert.ok(privateStat.ino !== currentStat.ino || privateStat.dev !== currentStat.dev);
  await verifyHistoricalHomeworldExcelContextV113();
  assert.deepEqual(await fs.readFile(relative), current, 'Historical verification cannot roll back current audio');
});

test('the capsule refuses test files outside the reviewed V112 inventory', async () => {
  await assert.rejects(runHistoricalHomeworldTestsV113(['tests/homeworld-v112-history-v113.test.mjs']), /Unreviewed historical test/);
});

// One run per file keeps each original suite under the capsule's five-minute bound.
for (const file of V112_TESTS) {
  test('unchanged V112 assertions pass in their published application: ' + file, async () => {
    const result = await runHistoricalHomeworldTestsV113([file]);
    assert.equal(result.currentRuntimeCovered, false);
    assert.match(result.output, /# fail 0(?:\r?\n|$)/); assert.match(result.output, /# pass [1-9]\d*(?:\r?\n|$)/);
  });
}
