import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, REGISTRY, collectFollowupV99, generateFollowupV99 } from '../scripts/build-excel-followup-v99.mjs';

let directory, generated;
const python = (source, args = []) => JSON.parse(execFileSync('python3', ['-c', source, ...args], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000, maxBuffer: 2 * 1024 * 1024,
}));

before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'excel-followup-v99-test-'));
  generated = await generateFollowupV99({ outputDir: directory });
});
after(async () => { if (directory) await fs.rm(directory, { recursive: true, force: true }); });

test('V99 reconciles runtime populations while keeping literal workbook work open', () => {
  const { snapshot } = generated;
  assert.equal(snapshot.planets.length, 30);
  assert.equal(snapshot.facts.classicPlanets, 16);
  assert.equal(snapshot.facts.exoticPlanets, 14);
  assert(snapshot.planets.every(item => item.regions === 6 && item.territories === 36 && item.connected));
  assert(new Set(snapshot.planets.map(item => item.continents)).size >= 3);
  assert.equal(snapshot.structures.length, 18);
  assert.equal(snapshot.facts.runtimeStructures, 12);
  assert.deepEqual(snapshot.structures.filter(item => item.status === 'OUVERT').map(item => item.id), ['W3-S09', 'W3-S10', 'W3-S13', 'W3-S14', 'W3-S15', 'W3-S18']);
  assert.equal(snapshot.facts.dialogueScenes, 730);
  assert.equal(snapshot.facts.voiceProfiles, 210);
  assert.equal(snapshot.facts.distinctVoiceNames, 202);
  assert.equal(snapshot.facts.ambiguousVoiceNames, 8);
  assert.equal(snapshot.pitOpen.length, 6);
  assert.equal(snapshot.stageEvents.length, 522);
  assert(snapshot.stageEvents.every(item => item.cell && item.description && item.currentStatus === 'NON_RECERTIFIE_V99'));
  assert.equal(snapshot.workbookInventory.length, 5);
  assert.equal(snapshot.absentOriginals.length, 3);
  assert(!JSON.stringify(snapshot).includes('C:\\Users\\'));
});

test('V99 preserves historical sheet/table/shared-string bytes and original style definitions', () => {
  const report = python(String.raw`
import json, sys, xml.etree.ElementTree as E
from zipfile import ZipFile
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def canonical(e): return (e.tag,sorted(e.attrib.items()),e.text or '',[canonical(c) for c in e])
with ZipFile(sys.argv[1]) as old, ZipFile(sys.argv[2]) as new:
 allowed={'[Content_Types].xml','xl/workbook.xml','xl/_rels/workbook.xml.rels','xl/styles.xml'}
 changed=[f for f in old.namelist() if old.read(f)!=new.read(f)]
 assert set(changed)<=allowed, changed
 originals=E.fromstring(old.read('xl/workbook.xml')).find('s:sheets',n)
 sheets=E.fromstring(new.read('xl/workbook.xml')).find('s:sheets',n)
 assert [canonical(s) for s in originals]==[canonical(s) for s in list(sheets)[:len(originals)]]
 a,b=[E.fromstring(z.read('xl/styles.xml')) for z in [old,new]]
 for section in a:
  extended=b.find(section.tag)
  assert extended is not None
  assert [canonical(s) for s in section]==[canonical(s) for s in list(extended)[:len(section)]]
 print(json.dumps({'originalSheets':[s.attrib['name'] for s in originals], 'totalSheets':len(sheets), 'unchangedParts':len(old.namelist())-len(changed)}))
`, [path.join(ROOT, generated.snapshot.baseline.path), path.join(directory, 'YAUTJA_V99_SUIVI.xlsx')]);
  assert.deepEqual(report.originalSheets, ['LotV62', 'CombattantsV54', 'Resteclasseur', 'LotV63', 'StagesV54']);
  assert.equal(report.totalSheets, 15);
  assert(report.unchangedParts >= 10);
});

test('OOXML links resolve and cached counters agree with the actual editable rows', () => {
  const report = python(String.raw`
import json,re,sys,posixpath,xml.etree.ElementTree as E
from zipfile import ZipFile
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
r='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
def value(c):
 if c is None:return None
 if c.attrib.get('t')=='inlineStr':return ''.join(c.itertext())
 return c.findtext('s:v',namespaces=n)
with ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 assert len(z.namelist())==len(set(z.namelist()))
 for f in z.namelist():
  if f.endswith('.xml') or f.endswith('.rels'):E.fromstring(z.read(f))
  if not f.endswith('.rels'):continue
  base='' if f=='_rels/.rels' else posixpath.join(posixpath.dirname(posixpath.dirname(f)),posixpath.basename(f)[:-5])
  for link in E.fromstring(z.read(f)):
   if link.attrib.get('TargetMode')=='External':continue
   target=link.attrib['Target']
   target=target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(base),target))
   assert target in z.namelist(),(f,target)
 book=E.fromstring(z.read('xl/workbook.xml'))
 rels={e.attrib['Id']:e.attrib['Target'] for e in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
 def sheet_target(sheet):
  target=rels[sheet.attrib['{'+r+'}id']]
  return target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join('xl',target))
 sheets={s.attrib['name']:E.fromstring(z.read(sheet_target(s))) for s in book.find('s:sheets',n)}
 assert book.find('s:bookViews/s:workbookView',n).attrib['activeTab']=='5'
 assert book.find('s:calcPr',n).attrib['fullCalcOnLoad']=='1'
 values={name:{c.attrib['r']:value(c) for c in sheet.findall('.//s:sheetData/s:row/s:c',n)} for name,sheet in sheets.items()}
 formula_count=0;edit_delta=None
 for c in sheets['SyntheseV99'].findall('.//s:c',n):
  formula=c.findtext('s:f',namespaces=n)
  if formula is None:continue
  match=re.fullmatch(r"(COUNTA|COUNTIF)\('([^']+)'!([A-Z]+)(\d+):([A-Z]+)(\d+)(?:,\"([^\"]+)\")?\)",formula)
  assert match,formula
  op,sheet,col,start,endcol,end,criterion=match.groups();assert col==endcol
  rows=[values[sheet].get(col+str(i)) for i in range(int(start),int(end)+1)]
  actual=sum(v not in [None,''] for v in rows) if op=='COUNTA' else rows.count(criterion)
  assert int(c.findtext('s:v',namespaces=n))==actual,(formula,actual)
  if op=='COUNTIF' and criterion=='VALIDE_CIBLE':
   changed=next((v for v in rows if v!=criterion),None)
   assert changed is not None
   modified=rows.copy();modified[rows.index(changed)]=criterion
   edit_delta=modified.count(criterion)-actual
  formula_count+=1
 for name,sheet in list(sheets.items())[5:]:
  assert sheet.find('s:autoFilter',n) is not None,name
  assert sheet.find('s:sheetViews/s:sheetView/s:pane',n).attrib['ySplit']=='4',name
 print(json.dumps({'formulas':formula_count,'editDelta':edit_delta,'worksheets':len(sheets)}))
`, [path.join(directory, 'YAUTJA_V99_SUIVI.xlsx')]);
  assert.equal(report.worksheets, 15);
  assert.equal(report.formulas, 12);
  assert.equal(report.editDelta, 1);
});

test('source strings starting with spreadsheet operators stay literal and original input remains unchanged', async () => {
  const baseline = generated.snapshot.baseline;
  const beforeBytes = await fs.readFile(path.join(ROOT, baseline.path));
  const request = path.join(directory, 'literal-request.json');
  const literal = '=HYPERLINK("https://example.invalid/", "source")';
  await fs.writeFile(request, JSON.stringify({ root: ROOT, baseline, sheets: [{
    name: 'LiteralV99', title: 'Textes source', subtitle: 'Vérification',
    columns: [{ key: 'text', label: 'Texte', width: 80 }],
    rows: [literal, '+SUM(1,2)', '-1+2', '@SUM(A1:A2)'].map(text => ({ text })),
  }] }));
  const workbook = execFileSync('python3', [path.join(ROOT, 'scripts/build-excel-followup-v99.py'), '--request', request], { stdio: ['ignore','pipe','pipe'], maxBuffer: 4 * 1024 * 1024, timeout: 30000 });
  const target = path.join(directory, 'literal.xlsx');
  await fs.writeFile(target, workbook);
  const report = python(String.raw`
import json,sys,xml.etree.ElementTree as E
from zipfile import ZipFile
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with ZipFile(sys.argv[1]) as z:
 s=E.fromstring(z.read('xl/worksheets/v99-sheet-6.xml'))
 assert not s.findall('.//s:f',n)
 c=s.find(".//s:c[@r='A5']",n)
 print(json.dumps({'type':c.attrib['t'],'text':c.findtext('s:is/s:t',namespaces=n)}))
`, [target]);
  assert.deepEqual(report, { type: 'inlineStr', text: literal });
  assert.deepEqual(await fs.readFile(path.join(ROOT, baseline.path)), beforeBytes);
});

test('a claimed validation needs explicit test results and cannot come from a filename', async () => {
  const registry = JSON.parse(await fs.readFile(path.join(ROOT, REGISTRY), 'utf8'));
  registry.workstreams[0].status = 'VALIDE_CIBLE';
  registry.workstreams[0].tests = 'A_VALIDER';
  registry.workstreams[0].proof = ['tests/excel-followup-v99.test.mjs'];
  await assert.rejects(collectFollowupV99(registry), /Validation sans preuve explicite/);
});

test('regeneration is deterministic and check rejects a stale output', async () => {
  const again = await generateFollowupV99({ outputDir: directory, check: true });
  assert.equal(again.workbookSha256, generated.workbookSha256);
  const target = path.join(directory, 'v99-workstreams.json');
  const original = await fs.readFile(target);
  await fs.writeFile(target, `${original}\n`);
  await assert.rejects(generateFollowupV99({ outputDir: directory, check: true }), /Suivi périmé/);
  await fs.writeFile(target, original);
});
