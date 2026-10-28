import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {BASELINE_V112, collectFollowupV112, verifyRegistryV112, verifyProductionV112, normalizeSourceIdentityV112, verifySourceFreezeCoverageV112, buildSheetsV112, writeWorkbookV112, verifyWorkbookV112, generateFollowupV112} from '../scripts/build-homeworld-followup-v112.mjs';

const registry = async () => JSON.parse(await fs.readFile('docs/v112-homeworld-source.json', 'utf8'));
const inherited = async () => JSON.parse(await fs.readFile('docs/v111-homeworld-followup.json', 'utf8'));
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'excel-v112-test-'));
test.after(async () => {await fs.rm(temporary, {recursive: true, force: true});});

test('V112 retains every inherited requirement and keeps nine actions inside the 56 source rows', async () => {
  const snapshot = await collectFollowupV112(), prior = await inherited();
  assert.deepEqual(snapshot.baseline, BASELINE_V112); assert.equal(snapshot.historicalSheetCount, 113);
  assert.equal(snapshot.sourceItems.length, 56); assert.equal(snapshot.sourceItems.filter(row => row.familyId === 'pit-actions').length, 9);
  assert.equal(snapshot.facts.sourceActionsIncluded, 9); assert.equal(snapshot.facts.sourceRequirementsOpen + snapshot.facts.newlyClosedSourceRequirements, 56);
  assert.equal(snapshot.facts.sourceCompletion, false); assert.equal(snapshot.artTargets.length, 354);
  for (const row of prior.sourceItems) {
    const next = snapshot.sourceItems.find(value => value.id === row.id);
    for (const key of Object.keys(row)) assert.deepEqual(next[key], row[key]);
  }
  assert.ok(snapshot.artTargets.every(row => row.statusV112 === 'NON_CLOTURE_ART'));
  assert.deepEqual(snapshot.priorities.map(row => row.id), prior.sourceItems.map(row => row.id));
});

test('unrelated closures, partial closures, duplicate workstreams and unsupported browser promotions are refused', async () => {
  const original = await registry(), previous = await inherited();
  assert.doesNotThrow(() => verifyRegistryV112(original, previous));
  for (const mutate of [value => value.closedSourceIds.push('invented-source'), value => value.closedSourceIds.push('M_F006_TH_B'),
    value => value.sourceCompletion = true, value => value.workstreams[1].id = value.workstreams[0].id,
    value => value.baseline.sha256 = '0'.repeat(64), value => {value.production = null; value.workstreams[0].status = 'VALIDE_CIBLE';},
    value => value.sourceProgress.push({id: 'M_F006_TH_B', status: 'LIVRE_PARTIEL', progress: 'Limited pair', remaining: 'Other partners', proof: []})]) {
    const candidate = structuredClone(original); mutate(candidate); assert.throws(() => verifyRegistryV112(candidate, previous));
  }
});

test('122 worksheets retain all 113 historical parts and detect a cell-text-only mutation precisely', async () => {
  const snapshot = await collectFollowupV112(), workbook = await writeWorkbookV112(buildSheetsV112(snapshot));
  const result = await verifyWorkbookV112(workbook);
  assert.equal(result.sheetNames.length, 122); assert.equal(result.originalSheetsPreserved, 113);
  assert.equal(result.originalSheetValuesFormulasTablesPreserved, true); assert.equal(result.originalStylePrefixPreserved, true);
  assert.equal(result.activeSheet, 'SyntheseV112'); assert.equal(result.formulas.length, 5);
  const valid = path.join(temporary, 'valid.xlsx'), changed = path.join(temporary, 'changed.xlsx'); await fs.writeFile(valid, workbook);
  execFileSync('python3', ['-c', String.raw`import sys
from zipfile import ZipFile,ZIP_STORED
import xml.etree.ElementTree as E
target='xl/worksheets/v111-sheet-106.xml'
with ZipFile(sys.argv[1]) as a,ZipFile(sys.argv[2],'w',compression=ZIP_STORED) as b:
 for name in a.namelist():
  raw=a.read(name)
  if name==target:
   root=E.fromstring(raw); text=next(root.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')).text
   assert text and text.encode() in raw
   changed=raw.replace(text.encode(),b'HISTORIQUE MODIFIE',1)
   E.fromstring(changed)
   assert raw.startswith(b'<?xml') and changed.startswith(b'<?xml')
   raw=changed
  b.writestr(name,raw)
with ZipFile(sys.argv[1]) as a,ZipFile(sys.argv[2]) as b:
 assert [name for name in a.namelist() if a.read(name)!=b.read(name)]==[target]
`, valid, changed]);
  await assert.rejects(verifyWorkbookV112(await fs.readFile(changed)), /Historical workbook ZIP part changed: xl\/worksheets\/v111-sheet-106.xml/);
});

test('a historical V111 production report cannot certify V112', async () => {
  const original = JSON.parse(await fs.readFile('docs/v111-homeworld-validation.json', 'utf8'));
  await fs.mkdir('outputs', {recursive: true}); const directory = await fs.mkdtemp(path.join(process.cwd(), 'outputs', 'v112-proof-rejection-'));
  try {
    const file = path.join(directory, 'historical.json'), bytes = Buffer.from(JSON.stringify(original)); await fs.writeFile(file, bytes);
    await assert.rejects(verifyProductionV112({path: path.relative(process.cwd(), file), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length}), /V111.*V112/s);
  } finally {await fs.rm(directory, {recursive: true, force: true});}
});

test('failed or omitted network requests cannot receive a current production pass', async () => {
  await fs.mkdir('outputs', {recursive: true}); const directory = await fs.mkdtemp(path.join(process.cwd(), 'outputs', 'v112-network-rejection-'));
  try {
    for (const missing of [false, true]) {
      const report = {release: 'V112', status: 'PASS_CIBLE', production: {mode: 'compiled-app', runtimeCommit: 'a'.repeat(40), buildId: 'actual-build', browserErrors: 0, checksFailed: 0, checksPassed: 1,
        servedBuilds: [{status: 200, foundInHtml: true, expectedBuildId: 'actual-build', htmlSha256: 'b'.repeat(64)}]},
      checks: [{id: 'real-check', status: 'PASS'}], errors: [], consoleErrors: [], workerErrors: [], ...(missing ? {} : {requestsFailed: [{url: 'failed.png'}]})};
      const file = path.join(directory, 'network.json'), bytes = Buffer.from(JSON.stringify(report)); await fs.writeFile(file, bytes);
      await assert.rejects(verifyProductionV112({path: path.relative(process.cwd(), file), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length}), /Production errors must be explicitly empty: requestsFailed/);
    }
  } finally {await fs.rm(directory, {recursive: true, force: true});}
});

test('real raw file identities match frozen path identities without rewriting the executed evidence', () => {
  const entries = [{path: 'app/game/HomeworldHub.tsx', bytes: 20, sha256: 'a'.repeat(64)}, {path: 'public/game/actor.png', bytes: 40, sha256: 'b'.repeat(64)}];
  const executed = entries.map(({path: file, ...row}) => ({file, ...row})), original = structuredClone(executed);
  assert.deepEqual(normalizeSourceIdentityV112(executed[0]), entries[0]);
  assert.deepEqual(verifySourceFreezeCoverageV112(executed, {files: 2, bytes: 60, entries}), {sourcesVerified: 2, frozenSources: 2});
  assert.deepEqual(executed, original, 'Raw observations remain byte-serializable exactly as executed');
});

test('conflicting path aliases, duplicate observations and changed frozen bytes cannot be hidden by normalization', () => {
  const entry = {path: 'app/game/HomeworldHub.tsx', bytes: 20, sha256: 'a'.repeat(64)}, freeze = {files: 1, bytes: 20, entries: [entry]};
  assert.throws(() => normalizeSourceIdentityV112({...entry, file: 'app/game/Other.tsx'}), /Conflicting source path\/file aliases/);
  for (const row of [{...entry, bytes: 21}, {...entry, sha256: 'b'.repeat(64)}, {...entry, path: 'app/game/Other.tsx'}])
    assert.throws(() => verifySourceFreezeCoverageV112([row], freeze), /Executed source absent or different/);
  assert.throws(() => verifySourceFreezeCoverageV112([entry, entry], freeze), /Duplicate executed source path/);
  assert.throws(() => verifySourceFreezeCoverageV112([entry], {...freeze, files: 2, bytes: 40, entries: [entry, entry]}), /Duplicate frozen source path/);
});

test('V112 workbook and metadata reproduce exactly without executing historical gameplay or native Excel', async () => {
  const outputDir = path.join(temporary, 'products');
  const first = await generateFollowupV112({outputDir}), second = await generateFollowupV112({outputDir, check: true});
  assert.equal(first.workbookSha256, second.workbookSha256); assert.equal(first.qa.nativeExcelApplicationVerified, false);
  assert.equal(first.qa.nativeExcelCalculationEngineExecuted, false); assert.equal(first.qa.originalSheetsPreserved, 113);
});
