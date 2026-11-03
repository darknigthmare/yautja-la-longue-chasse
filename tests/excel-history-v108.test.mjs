import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {EXCEL_HISTORY_COMMIT_V108, getHistoricalExcelContextV108, loadHistoricalExcelV108, runHistoricalTestsV108, verifyHistoricalExcelContextV108} from '../scripts/historical-excel-context-v108.mjs';

test('the original V107 sources and assertions live in a private context while current imports stay current', async () => {
  const context = await getHistoricalExcelContextV108();
  assert.equal(context.manifest.sourceCommit, EXCEL_HISTORY_COMMIT_V108);
  assert.equal(context.manifest.historicalTests.length, 17);
  assert.equal(context.manifest.sources.filter(row => row.path.startsWith('app/')).length, 844);
  assert.ok(context.manifest.sources.every(row => !/[Vv]108/.test(row.path)));
  assert.equal(context.manifest.products.V107[1].sha256, 'a9a2419702387868f6f54efd068008422609bc880b58e9a85c35a51e5fdfb66d');
  const historical = await loadHistoricalExcelV108(), current = await import('../scripts/build-excel-followup-v107.mjs');
  assert.equal(historical.ROOT, context.root); assert.equal(current.ROOT, process.cwd()); assert.notEqual(historical.ROOT, current.ROOT);
  const privateSource = path.join(context.root, 'app/game/save.ts');
  assert.equal((await fs.lstat(privateSource)).isSymbolicLink(), false); assert.equal((await fs.stat(privateSource)).mode & 0o222, 0);
  await verifyHistoricalExcelContextV108();
});

test('an edited historical source is rejected and cannot change the current application file', async () => {
  const context = await getHistoricalExcelContextV108(), relative = 'app/game/save.ts', target = path.join(context.root, relative);
  const original = await fs.readFile(target), current = await fs.readFile(relative);
  try {await fs.chmod(target, 0o644); await fs.appendFile(target, '\n'); await assert.rejects(verifyHistoricalExcelContextV108(), /Historical size changed: app\/game\/save.ts/);}
  finally {await fs.writeFile(target, original); await fs.chmod(target, 0o444);}
  assert.deepEqual(await fs.readFile(relative), current); await verifyHistoricalExcelContextV108();
});

test('the wrapper executes original assertions and refuses an unreviewed test path', async () => {
  const result = await runHistoricalTestsV108(['tests/open-workstreams-audit-v107.test.mjs']);
  assert.equal(result.currentRuntimeCovered, false); assert.match(result.output, /# tests 4\n/); assert.match(result.output, /# pass 4\n/);
  await assert.rejects(runHistoricalTestsV108(['tests/excel-history-v108.test.mjs']), /Unreviewed historical test/);
});
