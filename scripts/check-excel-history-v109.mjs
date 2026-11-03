#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadHistoricalExcelV109, runHistoricalTestsV109, verifyHistoricalExcelContextV109} from './historical-excel-context-v109.mjs';

export async function checkExcelHistoryV109({tests = false} = {}) {
  if (tests) {const result = await runHistoricalTestsV109(); process.stdout.write(result.output);}
  const original = await loadHistoricalExcelV109();
  let result, integrity;
  try {result = await original.generateFollowupV108({check: true});}
  finally {integrity = await verifyHistoricalExcelContextV109();}
  return {result: 'PASS_HISTORICAL_REGENERATION', ...integrity, originalTestsExecuted: tests, release: 'V108', sha256: result.workbookSha256, bytes: result.bytes, inputFingerprintsVerified: result.snapshot.inputs.length};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert.ok(args.includes('--check') && args.every(arg => ['--check', '--tests'].includes(arg)) && new Set(args).size === args.length, 'Usage: node scripts/check-excel-history-v109.mjs --check [--tests]');
  console.log(JSON.stringify(await checkExcelHistoryV109({tests: args.includes('--tests')})));
}
