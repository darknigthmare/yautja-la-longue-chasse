import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {snapshotRuntimeV105} from '../scripts/snapshot-runtime-v105.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
async function verifyFile(entry) {
  const file = entry.path ?? entry.file;
  assert.ok(typeof file === 'string' && file.startsWith('docs/') && !file.split(/[\\/]/).includes('..'), 'Portable local evidence required');
  const bytes = await fs.readFile(file);
  assert.equal(bytes.length, entry.bytes, file + ': evidence size changed');
  assert.equal(sha(bytes), entry.sha256, file + ': evidence changed');
  return bytes;
}

test('the production freeze still matches every application source and its bounded public input set', async () => {
  const report = await json('docs/v105-validation-summary.json');
  assert.equal(report.release, 'V105');
  assert.equal(report.status, 'PASS_CIBLE');
  const freeze = JSON.parse(await verifyFile(report.sourceFreeze));
  assert.deepEqual(await snapshotRuntimeV105(), freeze, 'Runtime changed after the played production journeys');
});

test('all three production journeys share the same build and preserve their portable evidence bytes', async () => {
  const report = await json('docs/v105-validation-summary.json');
  assert.deepEqual(report.production.map(item => item.domain).sort(), ['Clans', 'Homeworld', 'Pit']);
  for (const item of report.production) {
    const proof = JSON.parse(await verifyFile(item.report));
    assert.match(proof.status, /^PASS/);
    assert.equal(item.buildId, report.productionBuildId);
    assert.equal(item.runtimeCommit, report.runtimeCommit);
    assert.equal(proof.production?.buildId ?? proof.buildId ?? proof.productionBuildId, report.productionBuildId);
    assert.equal(proof.scope?.runtimeCommit ?? proof.runtimeCommit, report.runtimeCommit);
    assert.ok(item.portableFiles.length > 0, item.domain + ': no reviewable evidence');
    for (const file of item.portableFiles) await verifyFile(file);
  }
});
