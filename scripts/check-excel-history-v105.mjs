#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadHistoricalExcelV105, verifyHistoricalExcelContextV105} from './historical-excel-context-v105.mjs';

/** Execute original collectors and byte comparisons, never return a cached QA declaration. */
export async function checkExcelHistoryV105(releases = ['V100', 'V104']) {
  const results = [];
  let integrity;
  try {
    for (const release of releases) {
      const api = await loadHistoricalExcelV105(release);
      const result = await api['generateFollowup' + release]({check: true});
      results.push({release, sha256: result.workbookSha256, bytes: result.bytes, inputFingerprintsVerified: result.snapshot.inputs.length});
    }
  } finally {
    integrity = await verifyHistoricalExcelContextV105();
  }
  return {result: 'PASS_HISTORICAL_REGENERATION', ...integrity, releases: results};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  let release = 'all', check = false, hasRelease = false;
  const usage = 'Usage: node scripts/check-excel-history-v105.mjs --check [--release V100|V104|all]';
  for (let at = 0; at < args.length; at++) {
    if (args[at] === '--check' && !check) check = true;
    else if (args[at] === '--release' && !hasRelease && ['V100', 'V104', 'all'].includes(args[at + 1])) {
      release = args[++at]; hasRelease = true;
    } else assert.fail(usage);
  }
  assert.ok(check, usage);
  console.log(JSON.stringify(await checkExcelHistoryV105(release === 'all' ? ['V100', 'V104'] : [release])));
}
