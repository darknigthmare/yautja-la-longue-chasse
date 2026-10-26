#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getHistoricalExcelContextV110, loadHistoricalExcelV110, runHistoricalTestsV110, verifyHistoricalExcelContextV110} from './historical-excel-context-v110.mjs';

export async function checkExcelHistoryV110({tests = false} = {}) {
  const context = await getHistoricalExcelContextV110();
  if (tests) {const result = await runHistoricalTestsV110(); process.stdout.write(result.output);}
  const original = await loadHistoricalExcelV110();
  let result, integrity;
  try {result = await original.generateFollowupV109({check: true});}
  finally {integrity = await verifyHistoricalExcelContextV110();}
  assert.equal(result.workbookSha256, 'e80fcea5fdf768d5c9b6fd1874f89bc42badee24fbac9a3cf7cecb447c49ed3f');
  return {result: 'PASS_HISTORICAL_REGENERATION', ...integrity, originalTestsExecuted: tests,
    originalTestFiles: tests ? context.manifest.historicalTests.length : 0,
    originalAssertions: tests ? context.manifest.expectedAssertions : 0,
    release: 'V109', sha256: result.workbookSha256, bytes: result.bytes, inputFingerprintsVerified: result.snapshot.inputs.length};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert.ok(args.includes('--check') && args.every(arg => ['--check', '--tests'].includes(arg)) && new Set(args).size === args.length,
    'Usage: node scripts/check-excel-history-v110.mjs --check [--tests]');
  console.log(JSON.stringify(await checkExcelHistoryV110({tests: args.includes('--tests')})));
}
