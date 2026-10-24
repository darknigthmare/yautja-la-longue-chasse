import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {getHistoricalExcelContextV107,loadHistoricalRuntimeSnapshotV107,verifyHistoricalExcelContextV107} from '../scripts/historical-excel-context-v107.mjs';
const {root:ROOT}=await getHistoricalExcelContextV107();
const {snapshotRuntimeV106}=await loadHistoricalRuntimeSnapshotV107();
const read=file=>fs.readFile(path.join(ROOT,file));
after(()=>verifyHistoricalExcelContextV107());

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async file => JSON.parse(await read(file));
async function verifyFile(entry) {
  const file = entry.path ?? entry.file;
  assert.ok(typeof file === 'string' && file.startsWith('docs/') && !file.split(/[\\/]/).includes('..'), 'Portable local evidence required');
  const bytes = await read(file);
  assert.equal(bytes.length, entry.bytes, file + ': evidence size changed');
  assert.equal(sha(bytes), entry.sha256, file + ': evidence changed');
  return bytes;
}

test('the production freeze still matches every application source and its bounded public input set', async () => {
  const report = await json('docs/v106-validation-summary.json');
  assert.equal(report.release, 'V106');
  assert.equal(report.status, 'PASS_CIBLE');
  assert.match(report.runtimeCommit, /^[0-9a-f]{40}$/);
  const freeze = JSON.parse(await verifyFile(report.sourceFreeze));
  assert.deepEqual(await snapshotRuntimeV106(), freeze, 'Runtime changed after the played production journeys');
});

test('all three production journeys share the same build and preserve their portable evidence bytes', async () => {
  const report = await json('docs/v106-validation-summary.json');
  const frozenPublic = new Set(JSON.parse(await verifyFile(report.sourceFreeze)).entries
    .filter(entry => entry.path.startsWith('public/')).map(entry => entry.path));
  assert.deepEqual(report.production.map(item => item.domain).sort(), ['Clans', 'Homeworld', 'Pit']);
  for (const item of report.production) {
    const proof = JSON.parse(await verifyFile(item.report));
    assert.match(proof.status, /^PASS/);
    assert.ok(['production', 'compiled-app'].includes(proof.production?.mode ?? proof.mode), item.domain + ': compiled application evidence required');
    assert.equal(proof.production.browserErrors, 0);
    assert.equal(proof.production.checksFailed, 0);
    assert.ok(proof.production.checksPassed > 0, item.domain + ': no executed browser checks');
    const served = proof.production.servedBuilds ?? proof.servedBuilds;
    assert.ok(served?.length > 0, item.domain + ': served HTML identity required');
    for (const response of served) {
      assert.equal(response.status, 200);
      assert.equal(response.expectedBuildId, report.productionBuildId);
      assert.equal(response.foundInHtml, true);
    }
    const before = proof.sourceBefore ?? proof.production.sourceBefore;
    const after = proof.sourceAfter ?? proof.production.sourceAfter;
    assert.ok(before?.length > 0, item.domain + ': source fingerprints required');
    assert.deepEqual(before, after, item.domain + ': sources changed during QA');
    for (const source of after) {
      const file = source.file ?? source.path;
      assert.ok(typeof file === 'string' && !file.startsWith('/') && !file.split(/[\\/]/).includes('..'));
      if (file.startsWith('public/')) assert.ok(frozenPublic.has(file), file + ': observed public input missing from the runtime freeze');
      assert.equal(sha(await read(file)), source.sha256, file + ': source changed after QA');
    }
    assert.equal(item.buildId, report.productionBuildId);
    assert.equal(item.runtimeCommit, report.runtimeCommit);
    assert.equal(proof.production?.buildId ?? proof.buildId ?? proof.productionBuildId, report.productionBuildId);
    assert.equal(proof.production.runtimeCommit, report.runtimeCommit);
    assert.equal(proof.scope?.runtimeCommit ?? proof.runtimeCommit, report.runtimeCommit);
    assert.ok(item.portableFiles.length > 0, item.domain + ': no reviewable evidence');
    for (const file of item.portableFiles) await verifyFile(file);
    for (const evidence of proof.evidence ?? []) {
      const portable = item.portableFiles.find(file => (file.file ?? file.path) === (evidence.file ?? evidence.path));
      assert.ok(portable, item.domain + ': advertised evidence missing from the portable summary');
      assert.equal(portable.sha256, evidence.sha256);
      assert.equal(portable.bytes, evidence.bytes);
    }
  }
});
