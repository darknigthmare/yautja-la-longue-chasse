import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {BASELINE_V110, WORKSTREAM_IDS_V110, collectFollowupV110, verifyRegistryV110, verifyProductionV110, buildSheetsV110, writeWorkbookV110, verifyWorkbookV110, generateFollowupV110} from '../scripts/build-excel-followup-v110.mjs';
const registry = async () => JSON.parse(await fs.readFile('docs/v110-homeworld-source.json', 'utf8'));
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'excel-v110-test-'));
test.after(async () => {await fs.rm(temporary, {recursive: true, force: true});});

test('V110 preserves its exact97 sheet baseline,56 open requirements and354 art targets as separate inventories', async () => {
  const snapshot = await collectFollowupV110(), prior = JSON.parse(await fs.readFile('docs/v109-workstreams.json', 'utf8'));
  assert.deepEqual(snapshot.baseline, BASELINE_V110); assert.equal(snapshot.historicalSheetCount, 97);
  assert.equal(snapshot.facts.newlyClosedSourceRequirements, 0); assert.equal(snapshot.facts.sourceActionsRemaining, 9);
  assert.equal(snapshot.facts.newArtAssets, 0); assert.equal(snapshot.facts.sourceCompletion, false);
  assert.equal(snapshot.sourceItems.length, 56); assert.equal(snapshot.artTargets.length, 354);
  for (const row of prior.openItems) {const next = snapshot.sourceItems.find(value => value.id === row.id); for (const key of Object.keys(row)) assert.deepEqual(next[key], row[key]); assert.equal(next.statusV110, 'OUVERT_SOURCE');}
  assert.ok(snapshot.artTargets.every(row => row.statusV110 === 'OUVERT_ART'));
  assert.deepEqual(snapshot.workstreams.map(row => row.id), WORKSTREAM_IDS_V110);
  assert.deepEqual(snapshot.remaining.map(row => row.status), ['OUVERT', 'OUVERT']);
});

test('unrelated closures, invented art, duplicate workstreams and unsupported browser promotions are refused', async () => {
  const original = await registry();
  for (const mutate of [value => value.closedSourceIds.push('M_F006_TH_F'), value => value.newArtAssets = 1, value => value.sourceCompletion = true, value => value.workstreams[1].id = value.workstreams[0].id, value => value.remaining[0].status = 'TERMINE', value => value.baseline.sha256 = '0'.repeat(64), value => {value.production = null; value.workstreams[0].status = 'VALIDE_CIBLE';}]) {
    const candidate = structuredClone(original); mutate(candidate); assert.throws(() => verifyRegistryV110(candidate));
  }
  assert.doesNotThrow(() => verifyRegistryV110(original));
});

test('105 worksheets retain all97 historical parts, styles, formulas and cells exactly', async () => {
  const snapshot = await collectFollowupV110(), workbook = await writeWorkbookV110(BASELINE_V110, buildSheetsV110(snapshot));
  const result = await verifyWorkbookV110(workbook);
  assert.equal(result.sheetNames.length, 105); assert.equal(result.originalSheetsPreserved, 97);
  assert.equal(result.originalSheetValuesFormulasTablesPreserved, true); assert.equal(result.originalStylePrefixPreserved, true);
  assert.equal(result.activeSheet, 'SyntheseV110'); assert.equal(result.formulas.length, 5);
  const valid = path.join(temporary, 'valid.xlsx'), changed = path.join(temporary, 'changed.xlsx'); await fs.writeFile(valid, workbook);
  execFileSync('python3', ['-c', String.raw`import sys
from zipfile import ZipFile,ZIP_STORED
import xml.etree.ElementTree as E
with ZipFile(sys.argv[1]) as a,ZipFile(sys.argv[2],'w',compression=ZIP_STORED) as b:
 for name in a.namelist():
  raw=a.read(name)
  if name=='xl/worksheets/v109-sheet-86.xml':
   root=E.fromstring(raw);next(root.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')).text='HISTORIQUE MODIFIE';raw=E.tostring(root)
  b.writestr(name,raw)
`, valid, changed]);
  await assert.rejects(verifyWorkbookV110(await fs.readFile(changed)), /Command failed/);
});

test('a V109 browser recipe cannot be relabelled as V110 validation', async () => {
  const original = JSON.parse(await fs.readFile('docs/v109-homeworld-validation.json', 'utf8'));
  const candidate = {...original, release: 'V110'};
  await fs.mkdir(path.join(process.cwd(), 'outputs'), {recursive: true});
  const directory = await fs.mkdtemp(path.join(process.cwd(), 'outputs', 'v110-evidence-rejection-')); 
  try {
    const file = path.join(directory, 'relabelled-v109.json'), bytes = Buffer.from(JSON.stringify(candidate)); await fs.writeFile(file, bytes);
    await assert.rejects(verifyProductionV110({path: path.relative(process.cwd(), file), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length}), /Explicit V110 Homeworld recipe required/);
  } finally {await fs.rm(directory, {recursive: true, force: true});}
});

test('V110 workbook and metadata regenerate exactly without executing browser or nativeExcel', async () => {
  const outputDir = path.join(temporary, 'products');
  const first = await generateFollowupV110({outputDir}), second = await generateFollowupV110({outputDir, check: true});
  assert.equal(first.workbookSha256, second.workbookSha256); assert.equal(first.qa.nativeExcelApplicationVerified, false); assert.equal(first.qa.nativeExcelCalculationEngineExecuted, false);
  if (first.snapshot.production) {assert.ok(first.snapshot.production.browserChecks > 0); assert.ok(first.snapshot.production.inspectedCaptures > 0);}
});
