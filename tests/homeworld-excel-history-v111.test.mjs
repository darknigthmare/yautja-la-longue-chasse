import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {EXCEL_HOMEWORLD_HISTORY_COMMIT_V111, getHistoricalHomeworldExcelContextV111, loadHistoricalHomeworldExcelV111, runHistoricalHomeworldTestsV111, verifyHistoricalHomeworldExcelContextV111} from '../scripts/historical-excel-context-homeworld-v111.mjs';

test('the certified V110 sources and eight original tests remain private while V111 imports stay current', async () => {
  const context = await getHistoricalHomeworldExcelContextV111();
  assert.equal(context.manifest.sourceCommit, EXCEL_HOMEWORLD_HISTORY_COMMIT_V111);
  assert.equal(context.manifest.historicalTests.length, 8); assert.equal(context.manifest.expectedAssertions, 56);
  assert.equal(context.manifest.sources.filter(row => row.path.startsWith('app/')).length, 892);
  assert.ok(context.manifest.sources.every(row => !/[Vv]111/.test(row.path)));
  assert.equal(context.manifest.products.V110[1].sha256, '0b7d7890c8d235a9cda0f6d61c62001efe150f2c4022924c20d88196afcdbd7c');
  assert.equal(context.manifest.materializedShared.length, 45);
  assert.ok(context.manifest.materializedShared.every(file => file.endsWith('.json')));
  const nativeReview = path.join(context.root, context.manifest.materializedShared[0]);
  assert.equal((await fs.lstat(nativeReview)).isSymbolicLink(), false); assert.equal((await fs.stat(nativeReview)).mode & 0o222, 0);
  const historical = await loadHistoricalHomeworldExcelV111(), current = await import('../scripts/build-excel-followup-v110.mjs');
  assert.equal(historical.ROOT, context.root); assert.equal(current.ROOT, process.cwd()); assert.notEqual(historical.ROOT, current.ROOT);
  const source = path.join(context.root, 'app/game/HomeworldHub.tsx');
  assert.equal((await fs.lstat(source)).isSymbolicLink(), false); assert.equal((await fs.stat(source)).mode & 0o222, 0);
  const product = path.join(context.root, 'docs/YAUTJA_V110_SUIVI.xlsx');
  assert.equal(await fs.readlink(product), path.join(process.cwd(), 'docs/YAUTJA_V110_SUIVI.xlsx'));
  const integrity = await verifyHistoricalHomeworldExcelContextV111();
  assert.equal(integrity.sourcesVerified, 1543); assert.equal(integrity.sharedVerified, 1123); assert.equal(integrity.currentRuntimeCovered, false);
});

test('tampering with private V110 source is rejected without changing the current Homeworld', async () => {
  const context = await getHistoricalHomeworldExcelContextV111(), file = 'app/game/HomeworldHub.tsx', historical = path.join(context.root, file);
  const original = await fs.readFile(historical), current = await fs.readFile(file);
  try {await fs.chmod(historical, 0o644); await fs.appendFile(historical, '\n'); await assert.rejects(verifyHistoricalHomeworldExcelContextV111(), /Historical size changed: app\/game\/HomeworldHub.tsx/);}
  finally {await fs.writeFile(historical, original); await fs.chmod(historical, 0o444);}
  assert.deepEqual(await fs.readFile(file), current); await verifyHistoricalHomeworldExcelContextV111();
});

test('the V111 Homeworld wrapper executes unchanged V110 doorway assertions and refuses unreviewed tests', async () => {
  const result = await runHistoricalHomeworldTestsV111(['tests/homeworld-doorway-entry-v110.test.mjs']);
  assert.equal(result.currentRuntimeCovered, false); assert.match(result.output, /# tests 3\n/); assert.match(result.output, /# pass 3\n/);
  await assert.rejects(runHistoricalHomeworldTestsV111(['tests/homeworld-excel-history-v111.test.mjs']), /Unreviewed historical test/);
});
