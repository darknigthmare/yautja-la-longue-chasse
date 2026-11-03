import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { loadHistoricalExcelV105, verifyHistoricalExcelContextV105 } from '../scripts/historical-excel-context-v105.mjs';
const { ROOT, REGISTRY, OUTPUTS, verifyPlanV100, collectFollowupV100, generateFollowupV100 } = await loadHistoricalExcelV105('V100');

let directory, generated;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = async relative => JSON.parse(await fs.readFile(path.join(ROOT, relative), 'utf8'));
const python = (source, args = []) => JSON.parse(execFileSync('python3', ['-c', source, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000, maxBuffer: 4 * 1024 * 1024 }));
before(async () => { directory = await fs.mkdtemp(path.join(os.tmpdir(), 'excel-followup-v100-test-')); generated = await generateFollowupV100({ outputDir: directory }); });
after(async () => { try { if (directory) await fs.rm(directory, { recursive: true, force: true }); } finally { await verifyHistoricalExcelContextV105(); } });

test('V100 has exactly 52 source identities and 104 orientations without closing the source work', () => {
  const { snapshot } = generated;
  assert.equal(snapshot.animations.length, 52); assert.equal(snapshot.orientations.length, 104);
  for (const fighterId of ['feral-hunter', 'scar']) {
    const actions = snapshot.animations.filter(item => item.fighterId === fighterId);
    assert.equal(actions.length, 26); assert.equal(actions.filter(item => item.category === 'move').length, 18); assert.equal(actions.filter(item => item.category === 'presentation').length, 8);
    assert.equal(new Set(actions.map(item => item.actionId)).size, 26);
    assert(actions.every(item => item.sourceText.startsWith(item.actionId + ' · ') && item.sourceSha256.length === 64 && item.extractionSha256.length === 64));
  }
  const bodyComplete = snapshot.facts.admittedActions === 52 && snapshot.facts.admittedOrientations === 104;
  assert.equal(snapshot.delivery.all52BodyStudiesAdmitted, bodyComplete); assert.equal(snapshot.delivery.all52GesturesDelivered, bodyComplete);
  const provenFighters = new Set(snapshot.workstreams.filter(item => item.id.startsWith('PIT-') && item.status === 'VALIDE_CIBLE' && item.validationScope === 'BODY_STUDIES_ONLY' && item.browser.startsWith('PASS'))
    .flatMap(item => item.bodyStudyFighterId ? [item.bodyStudyFighterId] : ['feral-hunter', 'scar']));
  const allBodyProven = bodyComplete && ['feral-hunter', 'scar'].every(fighterId => provenFighters.has(fighterId));
  assert.equal(snapshot.delivery.all52BodyStudiesProven, allBodyProven);
  assert.equal(snapshot.delivery.browser, allBodyProven ? 'PASS_CIBLE_BODY' : 'A_VALIDER'); assert.equal(snapshot.delivery.mechanics, 'NON_CERTIFIE_CLASSEUR');
  for (const item of snapshot.animations) {
    assert.equal(item.browserStatus, provenFighters.has(item.fighterId) ? 'PASS_CIBLE_BODY' : 'A_VALIDER');
    assert.equal(item.mechanicsStatus, 'NON_CERTIFIE_CLASSEUR');
  }
  assert.equal(snapshot.animations.filter(item => item.artStatus !== 'ADMIS_DEUX_SENS').length, 52 - snapshot.facts.admittedActions);
  assert(snapshot.animations.some(item => item.combatStatus === 'RACCORDE_VISUEL'));
  assert.equal(snapshot.pitOpen.length, 6); assert(snapshot.pitOpen.every(item => item.playable === false));
  assert.deepEqual(snapshot.structures.filter(item => item.status === 'OUVERT').map(item => item.id), ['W3-S09', 'W3-S10', 'W3-S13', 'W3-S14', 'W3-S15', 'W3-S18']);
  assert.equal(snapshot.planets.length, 30); assert.equal(snapshot.contacts.length, 16);
  assert.equal(snapshot.facts.evacuationEscortsPerPatient, 2); assert.equal(snapshot.facts.evacuationSupplyCost, 1);
  assert(!JSON.stringify(snapshot).includes('C:\\Users\\'));
});

test('held native frames are distinguished from actual visible drawings and both sides have provenance', async () => {
  const { snapshot } = generated;
  for (const facing of ['right', 'left']) {
    const launcher = snapshot.orientations.find(item => item.actionId === 'M_F006_S1' && item.facing === facing);
    assert.equal(launcher.timelineFrames, 5); assert.equal(launcher.distinctDrawings, 4);
    assert.equal(new Set(launcher.frames.map(frame => frame.pixelSha256)).size, 4);
    assert(launcher.sourcePages.every(page => page.src.includes('v59') && page.sha256.length === 64));
  }
  for (const item of snapshot.orientations.filter(item => item.status === 'MANQUANT_ART')) {
    assert.equal(item.timelineFrames, 0); assert.equal(item.distinctDrawings, 0); assert.deepEqual(item.frames, []);
  }
  for (const asset of snapshot.assets) {
    assert.equal(hash(await fs.readFile(path.join(ROOT, asset.path))), asset.sha256);
    assert(snapshot.inputs.some(input => input.path === asset.path && input.sha256 === asset.sha256));
  }
});

test('wrong source cells, substituted prose, altered timings and duplicated actions are rejected', async () => {
  const plan = await readJson('app/game/data/pitWorkbookAnimationPlanV100.json'), extractionBytes = await fs.readFile(path.join(ROOT, plan.source.extractionPath)), extraction = JSON.parse(extractionBytes);
  const verify = value => verifyPlanV100(value, extraction, hash(extractionBytes));
  const wrongCell = structuredClone(plan); wrongCell.fighters[0].actions[0].cell = 'E10';
  assert.throws(() => verify(wrongCell), /Cellules source/);
  const wrongText = structuredClone(plan); wrongText.fighters[0].actions[0].sourceText = wrongText.fighters[0].actions[1].sourceText;
  assert.throws(() => verify(wrongText), /Texte\/cellule source/);
  const wrongTicks = structuredClone(plan); wrongTicks.fighters[0].actions[0].phaseTicks.active++;
  assert.throws(() => verify(wrongTicks), /Timings proposés/);
  const duplicate = structuredClone(plan); duplicate.fighters[0].actions[1].id = duplicate.fighters[0].actions[0].id;
  assert.throws(() => verify(duplicate), /dupliqué/);
  assert.throws(() => verifyPlanV100(plan, extraction, '0'.repeat(64)), /Extraction source modifiée/);
});

test('no filename can promote pending character proof or claim an untested workstream', async () => {
  const registry = await readJson(REGISTRY);
  registry.workstreams[0].status = 'VALIDE_CIBLE'; registry.workstreams[0].tests = 'PASS'; registry.workstreams[0].proof = ['tests/pit-workbook-animation-v100.test.mjs'];
  delete registry.workstreams[0].validationScope;
  delete registry.workstreams[0].browser;
  delete registry.workstreams[0].bodyStudyFighterId;
  await assert.rejects(collectFollowupV100(registry), /limiter sa portée aux études BODY/);
  registry.workstreams[0].validationScope = 'BODY_STUDIES_ONLY';
  await assert.rejects(collectFollowupV100(registry), /preuve navigateur explicite/);
  const unsupported = await readJson(REGISTRY);
  unsupported.workstreams.find(item => item.id.startsWith('HOMEWORLD-')).tests = 'A_VALIDER';
  await assert.rejects(collectFollowupV100(unsupported), /Validation sans preuve explicite/);
});

test('all 15 historical sheets, their ZIP payloads and original style definitions survive unchanged', () => {
  const result = python(String.raw`
import json,sys,xml.etree.ElementTree as E
from zipfile import ZipFile
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def canonical(e):return(e.tag,sorted(e.attrib.items()),e.text or '',[canonical(c) for c in e])
with ZipFile(sys.argv[1]) as old,ZipFile(sys.argv[2]) as new:
 changed=[f for f in old.namelist() if old.read(f)!=new.read(f)]
 assert set(changed)<={'[Content_Types].xml','xl/workbook.xml','xl/_rels/workbook.xml.rels','xl/styles.xml'},changed
 a,b=[E.fromstring(z.read('xl/workbook.xml')) for z in [old,new]]
 previous=a.find('s:sheets',n);current=b.find('s:sheets',n)
 assert [canonical(s) for s in previous]==[canonical(s) for s in list(current)[:15]]
 assert len(previous)==15 and len(current)==27
 assert b.find('s:bookViews/s:workbookView',n).attrib['activeTab']=='15'
 assert list(current)[15].attrib['name']=='SyntheseV100'
 sa,sb=[E.fromstring(z.read('xl/styles.xml')) for z in [old,new]]
 for section in sa:
  extended=sb.find(section.tag);assert extended is not None
  assert [canonical(c) for c in section]==[canonical(c) for c in list(extended)[:len(section)]]
 print(json.dumps({'originalNames':[s.attrib['name'] for s in previous],'unchangedParts':len(old.namelist())-len(changed),'newNames':[s.attrib['name'] for s in list(current)[15:]]}))
`, [path.join(ROOT, generated.snapshot.baseline.path), path.join(directory, 'YAUTJA_V100_SUIVI.xlsx')]);
  assert.equal(result.originalNames[5], 'SyntheseV99'); assert.equal(result.originalNames.at(-1), 'JournalV99');
  assert(result.unchangedParts >= 28); assert(result.newNames.includes('AnimationsV100')); assert(result.newNames.includes('OrientationsV100'));
});

test('new counters, formula caches, hyperlink destinations and editable row ranges are independently readable', () => {
  const result = python(String.raw`
import json,re,posixpath,sys,xml.etree.ElementTree as E
from zipfile import ZipFile
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'};r='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
def value(c):return ''.join(c.find('s:is',n).itertext()) if c.attrib.get('t')=='inlineStr' else c.findtext('s:v',namespaces=n)
with ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 rels={e.attrib['Id']:e.attrib['Target'] for e in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
 book=E.fromstring(z.read('xl/workbook.xml'));sheets={}
 for s in book.find('s:sheets',n):
  target=rels[s.attrib[r]];target=target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join('xl',target))
  sheets[s.attrib['name']]=E.fromstring(z.read(target))
 values={name:{c.attrib['r']:value(c) for c in sheet.findall('.//s:c',n)} for name,sheet in sheets.items()}
 checked=0;edit_delta=None
 for cell in sheets['SyntheseV100'].findall('.//s:c',n):
  formula=cell.findtext('s:f',namespaces=n)
  if formula is None:continue
  m=re.fullmatch(r"(COUNTA|COUNTIF)\('([^']+)'!([A-Z]+)(\d+):([A-Z]+)(\d+)(?:,\"([^\"]+)\")?\)",formula);assert m
  op,sheet,col,start,endcol,end,criterion=m.groups();assert col==endcol
  rows=[values[sheet].get(col+str(i)) for i in range(int(start),int(end)+1)]
  actual=sum(v not in [None,''] for v in rows) if op=='COUNTA' else rows.count(criterion)
  assert int(cell.findtext('s:v',namespaces=n))==actual
  if criterion=='RACCORDE_VISUEL':
   edited=rows.copy();index=next(i for i,v in enumerate(rows) if v!=criterion);edited[index]=criterion;edit_delta=edited.count(criterion)-actual
  checked+=1
 for name,sheet in list(sheets.items())[15:]:
  assert sheet.find('s:autoFilter',n) is not None
  if name!='SyntheseV100':
   assert sheet.find('s:hyperlinks/s:hyperlink',n).attrib['location']=="'SyntheseV100'!A1"
   assert 'SyntheseV100' in values[name]['A3']
 print(json.dumps({'formulas':checked,'editDelta':edit_delta,'sourceRows':len(sheets['AnimationsV100'].findall('s:sheetData/s:row',n))-4,'orientationRows':len(sheets['OrientationsV100'].findall('s:sheetData/s:row',n))-4}))
`, [path.join(directory, 'YAUTJA_V100_SUIVI.xlsx')]);
  assert(result.formulas >= 14); assert.equal(result.editDelta, 1); assert.equal(result.sourceRows, 52); assert.equal(result.orientationRows, 104);
});

test('source operators remain literal and generating V100 never rewrites its baseline', async () => {
  const baselinePath = path.join(ROOT, generated.snapshot.baseline.path), oldBytes = await fs.readFile(baselinePath);
  const request = path.join(directory, 'literal-request.json');
  await fs.writeFile(request, JSON.stringify({ root: ROOT, baseline: generated.snapshot.baseline, sheets: [{ name:'LiteralV100',title:'Source',subtitle:'Texte littéral',columns:[{key:'text',label:'Source',width:100}],rows:['=HYPERLINK("https://example.invalid/","source")','+SUM(1,2)','-1+2','@SUM(A1:A2)'].map(text=>({text})) }] }));
  const bytes = execFileSync('python3', [path.join(ROOT,'scripts/build-excel-followup-v100.py'),'--request',request], { stdio:['ignore','pipe','pipe'],timeout:30000,maxBuffer:8*1024*1024 });
  const target = path.join(directory,'literal.xlsx'); await fs.writeFile(target,bytes);
  const result = python(String.raw`
import json,sys,xml.etree.ElementTree as E
from zipfile import ZipFile
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with ZipFile(sys.argv[1]) as z:
 s=E.fromstring(z.read('xl/worksheets/v100-sheet-16.xml'));assert not s.findall('.//s:f',n)
 cells=s.findall('s:sheetData/s:row/s:c',n)
 print(json.dumps([c.findtext('s:is/s:t',namespaces=n) for c in cells if c.attrib['r'] in ['A5','A6','A7','A8']]))
`,[target]);
  assert.deepEqual(result,['=HYPERLINK("https://example.invalid/","source")','+SUM(1,2)','-1+2','@SUM(A1:A2)']);
  assert.deepEqual(await fs.readFile(baselinePath),oldBytes);
});

test('runtime contacts, evacuation modules, historical sources and actual admitted PNGs are in the sparse input manifest', () => {
  const paths = new Set(generated.snapshot.inputs.map(item => item.path));
  for (const required of ['app/game/systems/homeworldStreetContactsV100.ts','app/game/systems/clanWarEvacuationV100.ts','app/game/pitWorkbookCombatRegistryV100.ts','docs/YAUTJA_V99_SUIVI.xlsx','docs/v56-excel-priorities.json','scripts/build-excel-followup-v99.mjs','scripts/build-excel-followup-v99.py','docs/v99-workstreams-source.json']) assert(paths.has(required),required);
  assert(generated.snapshot.assets.every(asset => paths.has(asset.path)));
  assert.equal(generated.qa.result,'PASS_STRUCTURE'); assert.equal(generated.qa.nativeExcelApplicationVerified,false);
  assert.equal(generated.qa.originalSheetsPreserved,15);
});

test('regeneration is byte deterministic and check rejects each stale product without overwriting it', async () => {
  const again = await generateFollowupV100({outputDir:directory,check:true}); assert.equal(again.workbookSha256,generated.workbookSha256);
  for (const output of OUTPUTS) {
    const target = path.join(directory,output), original = await fs.readFile(target), changed = Buffer.concat([original,Buffer.from('\n')]);
    await fs.writeFile(target,changed);
    await assert.rejects(generateFollowupV100({outputDir:directory,check:true}),/Suivi V100 périmé/);
    assert.deepEqual(await fs.readFile(target),changed);
    await fs.writeFile(target,original);
  }
});
