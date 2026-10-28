#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getHistoricalHomeworldExcelContextV111, loadHistoricalHomeworldExcelV111, runHistoricalHomeworldTestsV111, verifyHistoricalHomeworldExcelContextV111} from './historical-excel-context-homeworld-v111.mjs';

export async function checkHomeworldExcelHistoryV111({tests = false} = {}) {
  const context = await getHistoricalHomeworldExcelContextV111();
  if (tests) {const result = await runHistoricalHomeworldTestsV111(); process.stdout.write(result.output);}
  const original = await loadHistoricalHomeworldExcelV111();
  let result, integrity;
  try {result = await original.generateFollowupV110({check: true});}
  finally {integrity = await verifyHistoricalHomeworldExcelContextV111();}
  assert.equal(result.workbookSha256, '0b7d7890c8d235a9cda0f6d61c62001efe150f2c4022924c20d88196afcdbd7c');
  return {result: 'PASS_HISTORICAL_REGENERATION', ...integrity, originalTestsExecuted: tests,
    originalTestFiles: tests ? context.manifest.historicalTests.length : 0,
    originalAssertions: tests ? context.manifest.expectedAssertions : 0,
    release: 'V110', sha256: result.workbookSha256, bytes: result.bytes, inputFingerprintsVerified: result.snapshot.inputs.length};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert.ok(args.includes('--check') && args.every(arg => ['--check', '--tests'].includes(arg)) && new Set(args).size === args.length,
    'Usage: node scripts/check-excel-history-homeworld-v111.mjs --check [--tests]');
  console.log(JSON.stringify(await checkHomeworldExcelHistoryV111({tests: args.includes('--tests')})));
}
