import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {BASELINE_V109, ROOT, REGISTRY, verifyRegistryV109, verifyProductionSummaryV109, verifyCaptureCoverageV109, collectFollowupV109, buildSheetsV109, writeWorkbookV109, verifyWorkbookV109, generateFollowupV109} from '../scripts/build-excel-followup-v109.mjs';
const registry = () => fs.readFile(path.join(ROOT, REGISTRY), 'utf8').then(JSON.parse);
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'excel-v109-tests-'));
after(() => fs.rm(temporary, {recursive: true, force: true}));

test('all eight families retain every V108 source field and all56 still-open source requirements', async () => {
  const snapshot = await collectFollowupV109();
  assert.equal(snapshot.workstreams.length, 9); assert.equal(snapshot.families.length, 8); assert.equal(snapshot.sourceItems.length, 56); assert.equal(snapshot.openItems.length, 56);
  assert.deepEqual(snapshot.closedOpenItemIds, []); assert.equal(snapshot.facts.newlyClosedItems, 0);
  for (const original of snapshot.originalOpenItems) {const current = snapshot.sourceItems.find(row => row.id === original.id); for (const key of Object.keys(original)) assert.deepEqual(current[key], original[key]); assert.equal(current.statusV109, 'OUVERT_SOURCE');}
  assert.equal(snapshot.historicalIntegrity.currentRuntimeCovered, false); assert.equal(snapshot.historicalIntegrity.evidenceCopiesVerified, 72);
  assert.equal(snapshot.definitionFacts.preserveUniqueSectors, 32); assert.equal(snapshot.definitionFacts.preserveUniqueAdults, 64);
  assert.equal(snapshot.definitionFacts.preserveNewReserves, 2); assert.equal(snapshot.definitionFacts.preserveNewSectors, 16); assert.equal(snapshot.definitionFacts.preserveNewAdults, 32);
  assert.equal(snapshot.definitionFacts.pitForwardNativeAdmittedRoles, 8); assert.equal(snapshot.definitionFacts.pitForwardNativeBodyDrawings, 48);
  assert.deepEqual(snapshot.definitionFacts.pitForwardBoundActionIds, ['M_F003_TH_F', 'M_F006_TH_F']);
  assert.equal(snapshot.definitionFacts.pitForwardSourceCompletion, false); assert.equal(snapshot.definitionFacts.pitForwardPartnerScope, 'unvaried-feral-scar-duo');
  for (const id of ['pitForwardAttackerFeralDrawings', 'pitForwardAttackerScarDrawings', 'pitForwardVictimFeralDrawings', 'pitForwardVictimScarDrawings']) assert.equal(snapshot.definitionFacts[id], 12);
  assert.equal(snapshot.baselineFreeze, 'FROZEN'); assert.equal(snapshot.freezeEntriesVerified, 1359);
  assert.equal(snapshot.production.browserChecks, 208); assert.equal(snapshot.production.inspectedCaptures, 65);
  assert.deepEqual(snapshot.workstreams.filter(row => row.status === 'VALIDE_CIBLE').map(row => row.id).sort(), ['homeworld-cargo', 'pit-actions', 'preserve-expansion', 'war-structures']);
  assert.equal(snapshot.delivery.completeKits, 'OUVERT'); assert.equal(snapshot.delivery.sourceCampaigns, 'OUVERT');
});

test('missing families, count-only source closures, reused recipes and naked promotions cannot validate V109', async () => {
  for (const mutate of [value => value.workstreams.pop(), value => value.workstreams[0].status = 'TERMINE', value => value.closedOpenItemIds.push('M_F006_TH_F'), value => {const row = value.workstreams[0]; row.status = 'VALIDE_CIBLE'; row.tests = 'PASS'; row.browser = 'PASS';}, value => value.baseline.sha256 = '0'.repeat(64)]) {
    const value = await registry(); mutate(value); assert.throws(() => verifyRegistryV109(value));
  }
  const master = {release: 'V109', status: 'PASS_CIBLE', runtimeCommit: 'a'.repeat(40), productionBuildId: 'forged', production: ['Pit', 'Homeworld', 'Clans', 'Preserve'].map(domain => ({domain, report: {path: 'docs/reused.json'}}))};
  await assert.rejects(verifyProductionSummaryV109(master, {entries: []}));
  master.production.forEach(row => {row.report.path = 'docs/' + row.domain + '.json'; row.status = 'PASS_CIBLE'; row.buildId = 'forged'; row.runtimeCommit = master.runtimeCommit; row.driver = 'scripts/qa-old-v108.mjs';});
  await assert.rejects(verifyProductionSummaryV109(master, {entries: []}), /explicit V109 domain driver/);
  master.production.forEach(row => {row.driver = 'scripts/qa-clan-supply-route-v109.mjs'; row.command = 'node ' + row.driver;});
  await assert.rejects(verifyProductionSummaryV109(master, {entries: []}), /Recipe does not match its domain: Pit/);
});

test('97 worksheets preserve all85 historical cells, formulas, tables, styles and ZIP sheet parts', async () => {
  const snapshot = await collectFollowupV109(), workbook = await writeWorkbookV109(snapshot.baseline, buildSheetsV109(snapshot)), structural = await verifyWorkbookV109(workbook);
  assert.equal(structural.sheetNames.length, 97); assert.equal(structural.originalSheetsPreserved, 85); assert.equal(structural.originalSheetValuesFormulasTablesPreserved, true); assert.equal(structural.originalStylePrefixPreserved, true); assert.equal(structural.activeSheet, 'SyntheseV109'); assert.equal(structural.formulas.length, 7);
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
  await assert.rejects(verifyWorkbookV109(await fs.readFile(forged), BASELINE_V109));
});

test('missing, duplicated, uninspected or relabelled screenshots cannot certify a V109 production report', () => {
  const names = ['entry.png', 'return.png'];
  const evidence = names.map((file, index) => ({path: 'docs/qa/v109-proof-test/' + file, sha256: String(index + 1).repeat(64), bytes: 100 + index}));
  const valid = {opened: evidence.map(row => row.path), portableFiles: structuredClone(evidence), recordedCaptures: structuredClone(evidence), rawCaptures: evidence.map((row, index) => ({file: names[index], sha256: row.sha256, bytes: row.bytes}))};
  assert.doesNotThrow(() => verifyCaptureCoverageV109(valid));
  for (const mutate of [value => value.portableFiles.pop(), value => value.portableFiles.push({...value.portableFiles[0]}), value => value.rawCaptures[1].file = value.rawCaptures[0].file, value => value.opened.push('docs/qa/v109-proof-test/uninspected.png'), value => value.rawCaptures[0].sha256 = 'f'.repeat(64), value => value.recordedCaptures[0].bytes++, value => value.rawCaptures[0].file = 'another-journey.png']) {
    const forged = structuredClone(valid); mutate(forged); assert.throws(() => verifyCaptureCoverageV109(forged));
  }
  const reused = structuredClone(valid), alias = {...reused.portableFiles[0], path: 'docs/qa/v109-proof-test/alias/entry.png'};
  reused.portableFiles[1] = alias; reused.recordedCaptures[1] = {...alias}; reused.opened[1] = alias.path;
  assert.throws(() => verifyCaptureCoverageV109(reused), /One raw capture cannot account for two portable images/);
});

test('the current V109 follow-up regenerates exactly without pretending to run a browser or native Excel', async () => {
  const outputDir = path.join(temporary, 'products'), generated = await generateFollowupV109({outputDir}), checked = await generateFollowupV109({outputDir, check: true});
  assert.equal(generated.workbookSha256, checked.workbookSha256); assert.equal(generated.qa.nativeExcelApplicationVerified, false); assert.equal(generated.qa.nativeExcelCalculationEngineExecuted, false);
});
