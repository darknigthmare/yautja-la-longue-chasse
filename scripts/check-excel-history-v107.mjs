#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadHistoricalExcelV107, verifyHistoricalExcelContextV107} from './historical-excel-context-v107.mjs';
import {checkExcelHistoryV105} from './check-excel-history-v105.mjs';
import {checkExcelHistoryV106} from './check-excel-history-v106.mjs';

/** Original V106 generation and byte comparison, with a post-run integrity check. */
export async function checkExcelHistoryV107(releases = ['V106']) {
  const results = [];
  let integrity;
  try {
    for (const release of releases) {
      assert.equal(release, 'V106', 'Use the original history commands for V100/V104/V105');
      const api = await loadHistoricalExcelV107(release);
      const result = await api.generateFollowupV106({check: true});
      results.push({release, sha256: result.workbookSha256, bytes: result.bytes, inputFingerprintsVerified: result.snapshot.inputs.length});
    }
  } finally {
    integrity = await verifyHistoricalExcelContextV107();
  }
  return {result: 'PASS_HISTORICAL_REGENERATION', ...integrity, releases: results};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const usage = 'Usage: node scripts/check-excel-history-v107.mjs --check [--release V106|all]';
  let release = 'V106', check = false, hasRelease = false;
  for (let at = 0; at < args.length; at++) {
    if (args[at] === '--check' && !check) check = true;
    else if (args[at] === '--release' && !hasRelease && ['V106', 'all'].includes(args[at + 1])) {release = args[++at]; hasRelease = true;}
    else assert.fail(usage);
  }
  assert.ok(check, usage);
  if (release === 'all') {console.log(JSON.stringify(await checkExcelHistoryV105()));console.log(JSON.stringify(await checkExcelHistoryV106()));}
  console.log(JSON.stringify(await checkExcelHistoryV107()));
}
