import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {EXCEL_HISTORY_COMMIT_V109, getHistoricalExcelContextV109, loadHistoricalExcelV109, runHistoricalTestsV109, verifyHistoricalExcelContextV109} from '../scripts/historical-excel-context-v109.mjs';

test('all original V108 tests and inputs live in a private context while current imports remain current', async () => {
  const context = await getHistoricalExcelContextV109();
  assert.equal(context.manifest.sourceCommit, EXCEL_HISTORY_COMMIT_V109);
  assert.equal(context.manifest.historicalTests.length, 10); assert.equal(context.manifest.expectedAssertions, 75);
  assert.equal(context.manifest.sources.filter(row => row.path.startsWith('app/')).length, 862);
  assert.ok(context.manifest.sources.every(row => !/[Vv]109/.test(row.path)));
  assert.equal(context.manifest.products.V108[1].sha256, '2a9490d4e37ff63405039f4f7e7b8c473373f15f83414ca5ff46e142ca5cdaba');
  assert.equal(context.manifest.materializedShared.length, 72);
  const containedPng = path.join(context.root, context.manifest.materializedShared.find(file => file.endsWith('.png')));
  assert.equal((await fs.lstat(containedPng)).isSymbolicLink(), false);
  assert.equal((await fs.stat(containedPng)).mode & 0o222, 0);
  const historical = await loadHistoricalExcelV109(), current = await import('../scripts/build-excel-followup-v108.mjs');
  assert.equal(historical.ROOT, context.root); assert.equal(current.ROOT, process.cwd()); assert.notEqual(historical.ROOT, current.ROOT);
  const source = path.join(context.root, 'app/game/save.ts');
  assert.equal((await fs.lstat(source)).isSymbolicLink(), false); assert.equal((await fs.stat(source)).mode & 0o222, 0);
  await verifyHistoricalExcelContextV109();
});

test('tampering with private V108 source is rejected and cannot alter the current game', async () => {
  const context = await getHistoricalExcelContextV109(), file = 'app/game/save.ts', historical = path.join(context.root, file);
  const original = await fs.readFile(historical), current = await fs.readFile(file);
  try {await fs.chmod(historical, 0o644); await fs.appendFile(historical, '\n'); await assert.rejects(verifyHistoricalExcelContextV109(), /Historical size changed: app\/game\/save.ts/);}
  finally {await fs.writeFile(historical, original); await fs.chmod(historical, 0o444);}
  assert.deepEqual(await fs.readFile(file), current); await verifyHistoricalExcelContextV109();
});

test('the V109 wrapper executes unchanged V108 save assertions and refuses unreviewed test files', async () => {
  const result = await runHistoricalTestsV109(['tests/pit-workbook-save-session-v108.test.mjs']);
  assert.equal(result.currentRuntimeCovered, false); assert.match(result.output, /# tests 9\n/); assert.match(result.output, /# pass 9\n/);
  await assert.rejects(runHistoricalTestsV109(['tests/excel-history-v109.test.mjs']), /Unreviewed historical test/);
});
