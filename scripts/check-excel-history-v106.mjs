#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadHistoricalExcelV106, verifyHistoricalExcelContextV106} from './historical-excel-context-v106.mjs';
import {checkExcelHistoryV105} from './check-excel-history-v105.mjs';

/** Original V105 generation and byte comparison, with a post-run integrity check. */
export async function checkExcelHistoryV106(releases = ['V105']) {
  const results = [];
  let integrity;
  try {
    for (const release of releases) {
      assert.equal(release, 'V105', 'Use the original V105 history command for V100/V104');
      const api = await loadHistoricalExcelV106(release);
      const result = await api.generateFollowupV105({check: true});
      results.push({release, sha256: result.workbookSha256, bytes: result.bytes, inputFingerprintsVerified: result.snapshot.inputs.length});
    }
  } finally {
    integrity = await verifyHistoricalExcelContextV106();
  }
  return {result: 'PASS_HISTORICAL_REGENERATION', ...integrity, releases: results};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const usage = 'Usage: node scripts/check-excel-history-v106.mjs --check [--release V105|all]';
  let release = 'V105', check = false, hasRelease = false;
  for (let at = 0; at < args.length; at++) {
    if (args[at] === '--check' && !check) check = true;
    else if (args[at] === '--release' && !hasRelease && ['V105', 'all'].includes(args[at + 1])) {release = args[++at]; hasRelease = true;}
    else assert.fail(usage);
  }
  assert.ok(check, usage);
  if (release === 'all') console.log(JSON.stringify(await checkExcelHistoryV105()));
  console.log(JSON.stringify(await checkExcelHistoryV106()));
}
