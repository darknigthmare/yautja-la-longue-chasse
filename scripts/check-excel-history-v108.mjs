#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadHistoricalExcelV108, runHistoricalTestsV108, verifyHistoricalExcelContextV108} from './historical-excel-context-v108.mjs';

export async function checkExcelHistoryV108({tests = false} = {}) {
  if (tests) {
    const result = await runHistoricalTestsV108();
    process.stdout.write(result.output);
  }
  const original = await loadHistoricalExcelV108();
  let result, integrity;
  try {result = await original.generateFollowupV107({check: true});}
  finally {integrity = await verifyHistoricalExcelContextV108();}
  return {result: 'PASS_HISTORICAL_REGENERATION', ...integrity, originalTestsExecuted: tests, release: 'V107', sha256: result.workbookSha256, bytes: result.bytes, inputFingerprintsVerified: result.snapshot.inputs.length};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert.ok(args.includes('--check') && args.every(arg => ['--check', '--tests'].includes(arg)) && new Set(args).size === args.length, 'Usage: node scripts/check-excel-history-v108.mjs --check [--tests]');
  console.log(JSON.stringify(await checkExcelHistoryV108({tests: args.includes('--tests')})));
}
