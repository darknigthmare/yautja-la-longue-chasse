import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {EXCEL_HISTORY_COMMIT_V110, getHistoricalExcelContextV110, loadHistoricalExcelV110, runHistoricalTestsV110, verifyHistoricalExcelContextV110} from '../scripts/historical-excel-context-v110.mjs';

test('the certified V109 source and its 12 unchanged test files remain private while V110 imports stay current', async () => {
  const context = await getHistoricalExcelContextV110();
  assert.equal(context.manifest.sourceCommit, EXCEL_HISTORY_COMMIT_V110);
  assert.equal(context.manifest.historicalTests.length, 12); assert.equal(context.manifest.expectedAssertions, 95);
  assert.equal(context.manifest.sources.filter(row => row.path.startsWith('app/')).length, 884);
  assert.ok(context.manifest.sources.every(row => !/[Vv]110/.test(row.path)));
  assert.equal(context.manifest.products.V109[1].sha256, 'e80fcea5fdf768d5c9b6fd1874f89bc42badee24fbac9a3cf7cecb447c49ed3f');
  assert.equal(context.manifest.materializedShared.length, 45);
  assert.ok(context.manifest.materializedShared.every(file => file.endsWith('.json')));
  const nativeReview = path.join(context.root, context.manifest.materializedShared[0]);
  assert.equal((await fs.lstat(nativeReview)).isSymbolicLink(), false); assert.equal((await fs.stat(nativeReview)).mode & 0o222, 0);
  const historical = await loadHistoricalExcelV110(), current = await import('../scripts/build-excel-followup-v109.mjs');
  assert.equal(historical.ROOT, context.root); assert.equal(current.ROOT, process.cwd()); assert.notEqual(historical.ROOT, current.ROOT);
  const source = path.join(context.root, 'app/game/HomeworldHub.tsx');
  assert.equal((await fs.lstat(source)).isSymbolicLink(), false); assert.equal((await fs.stat(source)).mode & 0o222, 0);
  const product = path.join(context.root, 'docs/YAUTJA_V109_SUIVI.xlsx');
  assert.equal(await fs.readlink(product), path.join(process.cwd(), 'docs/YAUTJA_V109_SUIVI.xlsx'));
  const integrity = await verifyHistoricalExcelContextV110();
  assert.equal(integrity.sourcesVerified, 1531); assert.equal(integrity.sharedVerified, 1073); assert.equal(integrity.currentRuntimeCovered, false);
});

test('tampering with private V109 source is rejected without changing the current Homeworld', async () => {
  const context = await getHistoricalExcelContextV110(), file = 'app/game/HomeworldHub.tsx', historical = path.join(context.root, file);
  const original = await fs.readFile(historical), current = await fs.readFile(file);
  try {await fs.chmod(historical, 0o644); await fs.appendFile(historical, '\n'); await assert.rejects(verifyHistoricalExcelContextV110(), /Historical size changed: app\/game\/HomeworldHub.tsx/);}
  finally {await fs.writeFile(historical, original); await fs.chmod(historical, 0o444);}
  assert.deepEqual(await fs.readFile(file), current); await verifyHistoricalExcelContextV110();
});

test('the V110 wrapper executes unchanged V109 publication assertions and refuses unreviewed tests', async () => {
  const result = await runHistoricalTestsV110(['tests/production-publication-v109.test.mjs']);
  assert.equal(result.currentRuntimeCovered, false); assert.match(result.output, /# tests 3\n/); assert.match(result.output, /# pass 3\n/);
  await assert.rejects(runHistoricalTestsV110(['tests/excel-history-v110.test.mjs']), /Unreviewed historical test/);
});
