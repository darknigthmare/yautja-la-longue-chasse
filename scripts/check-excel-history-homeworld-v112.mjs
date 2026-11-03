#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getHistoricalHomeworldExcelContextV112, loadHistoricalHomeworldExcelV112, runHistoricalHomeworldTestsV112, verifyHistoricalHomeworldExcelContextV112} from './historical-excel-context-homeworld-v112.mjs';

export async function checkHomeworldExcelHistoryV112({tests = false} = {}) {
  const context = await getHistoricalHomeworldExcelContextV112();
  if (tests) {const result = await runHistoricalHomeworldTestsV112(); process.stdout.write(result.output);}
  const original = await loadHistoricalHomeworldExcelV112();
  let result, integrity;
  try {result = await original.generateFollowupV111({check: true});}
  finally {integrity = await verifyHistoricalHomeworldExcelContextV112();}
  assert.equal(result.workbookSha256, 'fa5ebf78a08c36b4a567246dfae41de535a8e36c7294ba33190e3e1e2ec9ad05');
  assert.equal(result.qa.sheetNames.length, 113);
  return {result: 'PASS_HISTORICAL_REGENERATION', ...integrity, originalTestsExecuted: tests,
    originalTestFiles: tests ? context.manifest.historicalTests.length : 0,
    originalAssertions: tests ? context.manifest.expectedAssertions : 0,
    originalGroups: context.manifest.historicalGroups,
    release: 'V111', sha256: result.workbookSha256, bytes: result.bytes, inputFingerprintsVerified: result.snapshot.inputs.length};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert.ok(args.includes('--check') && args.every(arg => ['--check', '--tests'].includes(arg)) && new Set(args).size === args.length,
    'Usage: node scripts/check-excel-history-homeworld-v112.mjs --check [--tests]');
  console.log(JSON.stringify(await checkHomeworldExcelHistoryV112({tests: args.includes('--tests')})));
}
