import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {BASELINE_V111, WORKSTREAM_IDS_V111, verifyArtBlobIdentityV111, collectFollowupV111, verifyRegistryV111, verifyProductionV111, buildSheetsV111, writeWorkbookV111, verifyWorkbookV111, generateFollowupV111} from '../scripts/build-homeworld-followup-v111.mjs';
const registry = async () => JSON.parse(await fs.readFile('docs/v111-homeworld-source.json', 'utf8'));
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'excel-v111-test-'));
test.after(async () => {await fs.rm(temporary, {recursive: true, force: true});});

test('V111 preserves its exact 105 sheet baseline, 56 open requirements and 354 art targets as separate inventories', async () => {
  const snapshot = await collectFollowupV111(), prior = JSON.parse(await fs.readFile('docs/v110-workstreams.json', 'utf8'));
  assert.deepEqual(snapshot.baseline, BASELINE_V111); assert.equal(snapshot.historicalSheetCount, 105);
  assert.equal(snapshot.facts.newlyClosedSourceRequirements, 0); assert.equal(snapshot.facts.sourceActionsRemaining, 9);
  assert.equal(snapshot.facts.newArtAssets, (await registry()).nativeAssets.length); assert.equal(snapshot.facts.sourceCompletion, false);
  assert.equal(snapshot.sourceItems.length, 56); assert.equal(snapshot.artTargets.length, 354);
  for (const row of prior.sourceItems) {const next = snapshot.sourceItems.find(value => value.id === row.id); for (const key of Object.keys(row)) assert.deepEqual(next[key], row[key]); assert.equal(next.statusV111, 'OUVERT_SOURCE');}
  assert.ok(snapshot.artTargets.every(row => row.statusV111 === 'NON_CLOTURE_ART'));
  assert.deepEqual(snapshot.workstreams.map(row => row.id), WORKSTREAM_IDS_V111);
  assert.deepEqual(snapshot.remaining.map(row => row.status), ['OUVERT', 'OUVERT']);
});

test('unrelated closures, invented art, duplicate workstreams and unsupported browser promotions are refused', async () => {
  const original = await registry();
  for (const mutate of [value => value.closedSourceIds.push('M_F006_TH_F'), value => value.newArtAssets = value.nativeAssets.length + 1, value => value.sourceCompletion = true, value => value.workstreams[1].id = value.workstreams[0].id, value => value.remaining[0].status = 'TERMINE', value => value.baseline.sha256 = '0'.repeat(64), value => {value.production = null; value.workstreams[0].status = 'VALIDE_CIBLE';}]) {
    const candidate = structuredClone(original); mutate(candidate); assert.throws(() => verifyRegistryV111(candidate));
  }
  const proof = path => ({path, sha256: 'a'.repeat(64), bytes: 32});
  for (const samePath of [true, false]) {
    const candidate = structuredClone(original);
    candidate.nativeAssets = ['a', 'b'].map(id => ({id, status: 'ADMITTED', png: proof('public/' + (samePath ? 'copied' : id) + '.png'), receipt: proof('art-source/' + id + '.json'), runtime: proof('app/game/data/native.json')}));
    candidate.newArtAssets = 2;
    assert.throws(() => verifyRegistryV111(candidate), /Distinct admitted PNG|copied PNG/);
  }
  assert.doesNotThrow(() => verifyRegistryV111(original));
});

test('113 worksheets retain all 105 historical parts, styles, formulas and cells exactly', async () => {
  const snapshot = await collectFollowupV111(), workbook = await writeWorkbookV111(BASELINE_V111, buildSheetsV111(snapshot));
  const result = await verifyWorkbookV111(workbook);
  assert.equal(result.sheetNames.length, 113); assert.equal(result.originalSheetsPreserved, 105);
  assert.equal(result.originalSheetValuesFormulasTablesPreserved, true); assert.equal(result.originalStylePrefixPreserved, true);
  assert.equal(result.activeSheet, 'SyntheseV111'); assert.equal(result.formulas.length, 5);
  const valid = path.join(temporary, 'valid.xlsx'), changed = path.join(temporary, 'changed.xlsx'); await fs.writeFile(valid, workbook);
  execFileSync('python3', ['-c', String.raw`import sys
from zipfile import ZipFile,ZIP_STORED
import xml.etree.ElementTree as E
with ZipFile(sys.argv[1]) as a,ZipFile(sys.argv[2],'w',compression=ZIP_STORED) as b:
 for name in a.namelist():
  raw=a.read(name)
  if name=='xl/worksheets/v110-sheet-98.xml':
   root=E.fromstring(raw);next(root.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')).text='HISTORIQUE MODIFIE';raw=E.tostring(root)
  b.writestr(name,raw)
`, valid, changed]);
  await assert.rejects(verifyWorkbookV111(await fs.readFile(changed)), /Command failed/);
});

test('a V110 browser recipe cannot be relabelled as V111 validation', async () => {
  const original = JSON.parse(await fs.readFile('docs/v110-homeworld-validation.json', 'utf8'));
  const candidate = {...original, release: 'V111'};
  await fs.mkdir(path.join(process.cwd(), 'outputs'), {recursive: true});
  const directory = await fs.mkdtemp(path.join(process.cwd(), 'outputs', 'v111-evidence-rejection-')); 
  try {
    const file = path.join(directory, 'relabelled-v110.json'), bytes = Buffer.from(JSON.stringify(candidate)); await fs.writeFile(file, bytes);
    await assert.rejects(verifyProductionV111({path: path.relative(process.cwd(), file), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length}), /Explicit V111 Homeworld recipe required/);
  } finally {await fs.rm(directory, {recursive: true, force: true});}
});

test('V111 workbook and metadata regenerate exactly without executing browser or native Excel', async () => {
  const outputDir = path.join(temporary, 'products');
  const first = await generateFollowupV111({outputDir}), second = await generateFollowupV111({outputDir, check: true});
  assert.equal(first.workbookSha256, second.workbookSha256); assert.equal(first.qa.nativeExcelApplicationVerified, false); assert.equal(first.qa.nativeExcelCalculationEngineExecuted, false);
  if (first.snapshot.production) {assert.ok(first.snapshot.production.browserChecks > 0); assert.ok(first.snapshot.production.inspectedCaptures > 0);}
});


test('historical art fallback binds the audited bytes to the current regular Git blob, while sparse identity is not visual admission', () => {
  const bytes = Buffer.from('original audited native source bytes');
  const oid = createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
  const row = {path: 'public/game/homeworld/example.png', sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, gitBlobOid: oid};
  const tree = {mode: '100644', type: 'blob', oid};
  assert.equal(verifyArtBlobIdentityV111(row, tree), 'GIT_TREE_IDENTITY');
  assert.equal(verifyArtBlobIdentityV111(row, tree, bytes), 'BYTES_AND_GIT_TREE_IDENTITY');
  for (const changed of [undefined, {...tree, oid: 'a'.repeat(40)}, {...tree, mode: '120000'}, {...tree, type: 'commit'}]) assert.throws(() => verifyArtBlobIdentityV111(row, changed));
  assert.throws(() => verifyArtBlobIdentityV111({...row, gitBlobOid: undefined}, tree));
  assert.throws(() => verifyArtBlobIdentityV111(row, tree, Buffer.from('changed current bytes')));
  const changed = Buffer.from('new dirty native source bytes');
  assert.throws(() => verifyArtBlobIdentityV111({...row, sha256: createHash('sha256').update(changed).digest('hex'), bytes: changed.length}, tree, changed), /do not belong/);
});
