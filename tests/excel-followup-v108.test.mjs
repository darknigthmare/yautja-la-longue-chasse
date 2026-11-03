import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {BASELINE_V108, ROOT, REGISTRY, verifyRegistryV108, verifyProductionSummaryV108, verifyCaptureCoverageV108, collectFollowupV108, buildSheetsV108, writeWorkbookV108, verifyWorkbookV108, generateFollowupV108} from '../scripts/build-excel-followup-v108.mjs';
const registry = () => fs.readFile(path.join(ROOT, REGISTRY), 'utf8').then(JSON.parse);
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'excel-v108-tests-'));
after(() => fs.rm(temporary, {recursive: true, force: true}));

test('all eight families and the separate Homeworld operation retain all56 still-open source rows', async () => {
  const snapshot = await collectFollowupV108();
  assert.equal(snapshot.workstreams.length, 9); assert.equal(snapshot.families.length, 8); assert.equal(snapshot.openItems.length, 56);
  assert.deepEqual(snapshot.closedOpenItemIds, []); assert.equal(snapshot.facts.newlyClosedItems, 0); assert.equal(snapshot.facts.newNativeBodyDrawings, 0);
  for (const row of snapshot.originalOpenItems) {const next = snapshot.openItems.find(item => item.id === row.id); for (const key of Object.keys(row)) assert.deepEqual(next[key], row[key]); assert.equal(next.statusV108, 'OUVERT_SOURCE');}
  assert.equal(snapshot.definitionFacts.preserveUniqueSectors, 16); assert.equal(snapshot.definitionFacts.preserveUniqueAdults, 32);
  assert.equal(snapshot.definitionFacts.homeworldCargoLots, 2); assert.equal(snapshot.definitionFacts.clanPhysicalWorks, 6);
  assert.equal(snapshot.delivery.completeKits, 'OUVERT'); assert.equal(snapshot.delivery.sourceCampaigns, 'OUVERT');
});

test('missing families, source closures and naked production promotions cannot validate a follow-up', async () => {
  for (const mutate of [value => value.workstreams.pop(), value => value.workstreams[0].status = 'TERMINE', value => value.closedOpenItemIds.push('PIT-KITS-COMPLETS'), value => {const row = value.workstreams[0]; row.status = 'VALIDE_CIBLE'; row.tests = 'PASS'; row.browser = 'PASS';}, value => value.baseline.sha256 = '0'.repeat(64)]) {
    const value = await registry(); mutate(value); assert.throws(() => verifyRegistryV108(value));
  }
  const master = {release: 'V108', status: 'PASS_CIBLE', runtimeCommit: 'a'.repeat(40), productionBuildId: 'forged', production: ['Pit', 'Homeworld', 'Clans', 'Preserve'].map(domain => ({domain, report: {path: 'docs/reused.json'}}))};
  await assert.rejects(verifyProductionSummaryV108(master, {entries: []}));
  master.production.forEach(row => {row.report.path = 'docs/' + row.domain + '.json'; row.status = 'PASS_CIBLE'; row.buildId = 'forged'; row.runtimeCommit = master.runtimeCommit; row.driver = 'scripts/qa-old-v107.mjs';});
  await assert.rejects(verifyProductionSummaryV108(master, {entries: []}), /explicit V108 domain driver/);
  master.production.forEach(row => {row.driver = 'scripts/qa-clan-logistics-v108.mjs'; row.command = 'node ' + row.driver;});
  await assert.rejects(verifyProductionSummaryV108(master, {entries: []}), /Recipe does not match its domain: Pit/);
});

test('85 worksheets preserve every historical cell, formula, table, style prefix and ZIP sheet part', async () => {
  const snapshot = await collectFollowupV108(), workbook = await writeWorkbookV108(snapshot.baseline, buildSheetsV108(snapshot)), structural = await verifyWorkbookV108(workbook);
  assert.equal(structural.sheetNames.length, 85); assert.equal(structural.originalSheetsPreserved, 73); assert.equal(structural.originalSheetValuesFormulasTablesPreserved, true); assert.equal(structural.originalStylePrefixPreserved, true); assert.equal(structural.activeSheet, 'SyntheseV108'); assert.equal(structural.formulas.length, 7);
  const valid = path.join(temporary, 'valid.xlsx'), forged = path.join(temporary, 'forged.xlsx'); await fs.writeFile(valid, workbook);
  execFileSync('python3', ['-c', String.raw`import sys
from zipfile import ZipFile,ZIP_STORED
import xml.etree.ElementTree as E
with ZipFile(sys.argv[1]) as a,ZipFile(sys.argv[2],'w',compression=ZIP_STORED) as b:
 for name in a.namelist():
  raw=a.read(name)
  if name=='xl/worksheets/sheet1.xml':
   root=E.fromstring(raw);next(root.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')).text='999999';raw=E.tostring(root)
  b.writestr(name,raw)
`, valid, forged]);
  await assert.rejects(verifyWorkbookV108(await fs.readFile(forged), BASELINE_V108));
});

test('missing, duplicated, uninspected or relabelled portable screenshots cannot certify a production report', () => {
  const names = ['entry.png', 'return.png'];
  const evidence = names.map((file, index) => ({path: 'docs/qa/v108-proof-test/' + file, sha256: String(index + 1).repeat(64), bytes: 100 + index}));
  const valid = {opened: evidence.map(row => row.path), portableFiles: structuredClone(evidence), recordedCaptures: structuredClone(evidence), rawCaptures: evidence.map((row, index) => ({file: names[index], sha256: row.sha256, bytes: row.bytes}))};
  assert.doesNotThrow(() => verifyCaptureCoverageV108(valid));
  for (const mutate of [value => value.portableFiles.pop(), value => value.portableFiles.push({...value.portableFiles[0]}), value => value.rawCaptures[1].file = value.rawCaptures[0].file, value => value.opened.push('docs/qa/v108-proof-test/uninspected.png'), value => value.rawCaptures[0].sha256 = 'f'.repeat(64), value => value.recordedCaptures[0].bytes++, value => value.rawCaptures[0].file = 'another-journey.png']) {
    const forged = structuredClone(valid); mutate(forged); assert.throws(() => verifyCaptureCoverageV108(forged));
  }
  const reused = structuredClone(valid), alias = {...reused.portableFiles[0], path: 'docs/qa/v108-proof-test/alias/entry.png'};
  reused.portableFiles[1] = alias; reused.recordedCaptures[1] = {...alias}; reused.opened[1] = alias.path;
  assert.throws(() => verifyCaptureCoverageV108(reused), /One raw capture cannot account for two portable images/);
});

test('current V108 products regenerate exactly without claiming a browser or native Excel execution', async () => {
  const outputDir = path.join(temporary, 'products'); const generated = await generateFollowupV108({outputDir}), checked = await generateFollowupV108({outputDir, check: true});
  assert.equal(generated.workbookSha256, checked.workbookSha256); assert.equal(generated.qa.nativeExcelApplicationVerified, false); assert.equal(generated.qa.nativeExcelCalculationEngineExecuted, false);
});
