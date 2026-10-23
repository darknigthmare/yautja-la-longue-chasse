import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {snapshotRuntimeV106} from '../scripts/snapshot-runtime-v106.mjs';
import {HISTORICAL_RUNTIME_COMMIT_V106,assertAllowedSourceV614,assertCurrentRuntimeDeltaV614,assertStaticRegistryV614,
  getHistoricalRuntimeContextV614,loadHistoricalRuntimeSnapshotV614,verifyHistoricalRuntimeContextV614} from '../scripts/historical-runtime-context-v614.mjs';

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

test('the V106 production freeze still matches its historical sources, without claiming V6.14 browser QA', async () => {
  const report = await json('docs/v106-validation-summary.json');
  assert.equal(report.release, 'V106');
  assert.equal(report.status, 'PASS_CIBLE');
  assert.equal(report.runtimeCommit, HISTORICAL_RUNTIME_COMMIT_V106);
  const freeze = JSON.parse(await verifyFile(report.sourceFreeze));
  const context = await getHistoricalRuntimeContextV614();
  const historical = await loadHistoricalRuntimeSnapshotV614();
  assert.notEqual(context.root, process.cwd());
  assert.equal(context.fixture.currentDelta.currentRuntimeCoveredByHistoricalQA, false);
  assert.deepEqual(await historical.snapshotRuntimeV106(), freeze, 'Historical V106 runtime differs from the played production journeys');
  assert.deepEqual(await verifyHistoricalRuntimeContextV614(), {
    runtimeCommit: HISTORICAL_RUNTIME_COMMIT_V106, inputsVerified: 963, archivedSources: 2,
  });
});

test('the current runtime differs only by the two exact library edits and the static V6.14 registry', async () => {
  const {fixture, freeze} = await getHistoricalRuntimeContextV614();
  const current = await snapshotRuntimeV106();
  assert.deepEqual(assertCurrentRuntimeDeltaV614(current, freeze, fixture), {
    historicalFiles: 963, unchangedFiles: 961,
    modifiedPaths: ['app/game/RecentSpriteLibraryV85.tsx', 'app/game/systems/recentSpriteLibraryV85.ts'],
    addedPaths: ['app/game/data/enforcerProductionV614.json'], currentRuntimeCoveredByHistoricalQA: false,
  });
  for (const row of fixture.currentDelta.modified) assertAllowedSourceV614(row.path, await fs.readFile(row.path), fixture);
  assertStaticRegistryV614(await fs.readFile(fixture.currentDelta.added[0].path), fixture,
    await json('docs/suivi-production/v614/data/production-manifest.json'));
});

test('the V6.14 boundary rejects unrelated changes, removed inputs, extra files and altered allowed payloads', async () => {
  const {fixture, freeze, current} = await getHistoricalRuntimeContextV614();
  const changed = structuredClone(current);
  changed.entries.find(row => row.path === 'app/game/systems/pitCombat.ts').sha256 = '0'.repeat(64);
  assert.throws(() => assertCurrentRuntimeDeltaV614(changed, freeze, fixture), /Only the two reviewed V6.14 library sources may change/);
  const removed = structuredClone(current);
  const removedRow = removed.entries.splice(removed.entries.findIndex(row => row.path === 'app/game/systems/pitCombat.ts'), 1)[0];
  removed.files--; removed.bytes -= removedRow.bytes;
  assert.throws(() => assertCurrentRuntimeDeltaV614(removed, freeze, fixture), /No V106 runtime input may be removed/);
  const added = structuredClone(current);
  added.entries.push({path: 'app/unreviewed.ts', bytes: 0, sha256: sha('')}); added.files++;
  assert.throws(() => assertCurrentRuntimeDeltaV614(added, freeze, fixture), /Only the V6.14 static registry may be added/);
  const library = fixture.currentDelta.modified[1];
  const libraryBytes = await fs.readFile(library.path);
  assert.throws(() => assertAllowedSourceV614(library.path, Buffer.concat([
    libraryBytes, Buffer.from('\n// unrelated change\n'),
  ]), fixture), /Unexpected V6.14 source bytes/);
  const registry = await json(fixture.currentDelta.added[0].path);
  registry.assets[0].priority = 1000;
  const manifest = await json('docs/suivi-production/v614/data/production-manifest.json');
  assert.throws(() => assertStaticRegistryV614(Buffer.from(JSON.stringify(registry)), fixture, manifest), /Reviewed V6.14 registry/);
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
      assert.equal(sha(await fs.readFile(file)), source.sha256, file + ': source changed after QA');
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
