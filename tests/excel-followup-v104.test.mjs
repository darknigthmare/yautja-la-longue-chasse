import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {ROOT,REGISTRY,OUTPUTS,verifyRegistryV104,verifyNormalRowsV104,verifyCartographySourceV104,verifyFinalProofsV104,collectFollowupV104,generateFollowupV104,writeWorkbookV104,verifyWorkbookV104} from '../scripts/build-excel-followup-v104.mjs';

let directory,pending;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async relative=>JSON.parse(await fs.readFile(path.join(ROOT,relative),'utf8'));
const generated=()=>pending??=(generateFollowupV104({outputDir:directory}));
const python=(source,args=[])=>JSON.parse(execFileSync('python3',['-c',source,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000,maxBuffer:4*1024*1024}));
before(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'excel-followup-v104-test-'));});
after(async()=>{if(directory)await fs.rm(directory,{recursive:true,force:true});});

test('V104 rejects false closure, unnamed proof, missing browser validation and enlarged scope',async()=>{
 const baseline=await json(REGISTRY);verifyRegistryV104(baseline);
 const unknown=structuredClone(baseline);unknown.workstreams[0].status='TERMINE';assert.throws(()=>verifyRegistryV104(unknown),/Statut invalide/);
 const value=structuredClone(baseline),item=value.workstreams[0];
 value.baselineFreeze='FROZEN';item.status='VALIDE_CIBLE';item.tests='PASS 18 cas explicitement rapportés';item.browser='PASS parcours ciblé';item.proof=[];
 assert.throws(()=>verifyRegistryV104(value),/sans preuve finale/);
 item.proof=[{path:'tests/excel-followup-v104.test.mjs',sha256:'0'.repeat(64)}];assert.throws(()=>verifyRegistryV104(value),/Preuve finale portable/);
 item.proof=[{path:'docs/explicit-proof.json',sha256:'0'.repeat(64)}];item.browser='A_VALIDER';assert.throws(()=>verifyRegistryV104(value),/navigateur PASS/);
 item.browser='PASS parcours ciblé';item.validationScope='PERSONNAGES_COMPLETS';assert.throws(()=>verifyRegistryV104(value),/Portée limitée/);
 const missing=structuredClone(baseline);missing.baselineFreeze='FROZEN';const last=missing.workstreams.at(-1);last.status='VALIDE_CIBLE';assert.throws(()=>verifyRegistryV104(missing),/Enforcers 10 sans PNG/);
});

test('a changed final report cannot keep a validated proof, and an unvalidated filename creates no proof',async()=>{
 const relative='docs/v104-workstreams-source.json',bytes=await fs.readFile(path.join(ROOT,relative));
 assert.deepEqual(await verifyFinalProofsV104([{status:'EN_COURS',proof:[{path:'missing-report.json',sha256:'0'.repeat(64)}]}]),[]);
 await assert.rejects(verifyFinalProofsV104([{status:'VALIDE_CIBLE',proof:[{path:relative,sha256:'0'.repeat(64)}]}]),/Preuve finale modifiée/);
 const proof={path:relative,sha256:sha(bytes)};assert.deepEqual(await verifyFinalProofsV104([{status:'VALIDE_CIBLE',proof:[proof]}]),[proof]);
});

test('a changed V100 baseline pin is refused before collecting runtime or touching history',async()=>{
 const value=await json(REGISTRY),target=path.join(ROOT,value.baseline.path),original=await fs.readFile(target);
 value.baseline.sha256='0'.repeat(64);await assert.rejects(collectFollowupV104(value),/Base V100 modifiée/);
 assert.deepEqual(await fs.readFile(target),original);
});

test('cartography scenes, both source options and eight replicas retain the exact V6 corpus cells',async()=>{
 const source=await json('app/game/data/bibleCartographySceneV104.json'),bytes=await fs.readFile(path.join(ROOT,'public/game/dialogues/v85/bible-dialogues.json'));
 verifyCartographySourceV104(source,bytes);
 const wrongHash=structuredClone(source);wrongHash.sourceCorpusSha256='0'.repeat(64);assert.throws(()=>verifyCartographySourceV104(wrongHash,bytes),/Corpus V6/);
 const wrongCell=structuredClone(source);wrongCell.sheets[1].rows[0].cells.find(cell=>cell.address==='G3255').value='Texte substitué';assert.throws(()=>verifyCartographySourceV104(wrongCell,bytes),/Cellules V6 du cartographe altérées/);
 const missingOption=structuredClone(source);missingOption.sheets[2].rows.shift();assert.throws(()=>verifyCartographySourceV104(missingOption,bytes),/Cellules de cartographie attendues/);
});

test('source timings, damage, height and D:L cells are independently compared to V100 and V56',async()=>{
 const {snapshot}=await generated(),plan=await json('app/game/data/pitWorkbookAnimationPlanV100.json');
 const bytes=await fs.readFile(path.join(ROOT,plan.source.extractionPath)),extraction=JSON.parse(bytes);
 const verify=rows=>verifyNormalRowsV104(rows,plan,extraction,sha(bytes));verify(snapshot.normals);
 for(const [key,value,message] of [['cell','E10',/Cellule normale/],['damage',999,/Dégâts source/],['startup',999,/Timing normal/],['hitLevel','low',/Hauteur source/],['sourceText','substitué',/Source normale/]]){
  const rows=structuredClone(snapshot.normals);rows[0][key]=value;assert.throws(()=>verify(rows),message);
 }
 const duplicate=structuredClone(snapshot.normals);duplicate[1].key=duplicate[0].key;assert.throws(()=>verify(duplicate),/Neuf commandes distinctes/);
});

test('actual exports retain bounded coverage and separate static poses, BODY, mechanics and historic recipes',async()=>{
 const {snapshot,qa}=await generated();
 assert.equal(snapshot.normals.length,18);assert.equal(snapshot.facts.nativeNormalPhases,108);assert.equal(snapshot.facts.normalOrientations,36);
 assert(snapshot.normals.every(item=>item.recipe==='workbook-v104'&&item.mechanicsStatus==='RUNTIME_OPT_IN'&&item.artStatus==='BODY_NATIF_REUTILISE'));
 assert.deepEqual(snapshot.pitVersions,{legacySnapshot:11,normalSnapshot:12,legacyReplayEngine:11,normalReplayEngine:12});
 assert.deepEqual(snapshot.preserve.map(item=>[item.version,item.width,item.sectors,item.fighters]),[[1,4800,3,8],[2,6400,4,8]]);
 assert.equal(snapshot.facts.preserveSectorTarget,80);assert.equal(snapshot.facts.preserveFighterTarget,100);
 assert.equal(snapshot.cartography.find(item=>item.option==='A').status,'OUVERT');assert.equal(snapshot.cartographyLines.length,8);
 assert.equal(snapshot.planets.filter(item=>item.kind==='HISTORIQUE').length,30);assert.equal(snapshot.planets.filter(item=>item.kind==='FORMAT_PROC_V103').length,27);
 assert.equal(snapshot.variants.filter(item=>item.status==='PNG_DISPONIBLE').length,108);assert.equal(snapshot.variants.filter(item=>item.status==='MANQUANT_PNG').length,18);assert.equal(snapshot.facts.variantMasterIdentities,5120);
 assert(snapshot.variants.every(item=>item.animated===false&&item.placed===false&&item.canonical===false));
 assert.equal(snapshot.delivery.characters,'OUVERT');assert.equal(snapshot.delivery.entities,'OUVERT');assert.equal(snapshot.delivery.variantAnimations,'OUVERT');
 assert.equal(snapshot.facts.openPitDossiers,6);assert.equal(snapshot.facts.openWarStructures,6);
 assert.deepEqual(snapshot.enforcerReconciliation.mergedCounts,{'Présente dans main':2197,'Produite — à vérifier':205,'Conservée hors main':0,'Pas faite':2718});
 assert.equal(snapshot.enforcerReconciliation.finalReceiptsRecovered,15);assert.equal(snapshot.enforcerReconciliation.finalReceiptsMissing,21);assert.equal(snapshot.enforcerReconciliation.unrecoveredV610TraceRecords,36);
 const paths=new Set(snapshot.inputs.map(item=>item.path));
 for(const file of ['app/game/systems/pitWorkbookNormalsV104.ts','app/game/systems/homeworldCartographyDefinitionV104.ts','app/game/systems/gameReserveLookoutV104.ts','docs/v56-excel-priorities.json','docs/YAUTJA_V100_SUIVI.xlsx','docs/YAUTJA_V99_SUIVI.xlsx'])assert(paths.has(file),file);
 assert(snapshot.assets.every(item=>paths.has(item.path)));assert.equal(qa.result,'PASS_STRUCTURE');assert.equal(qa.nativeExcelApplicationVerified,false);assert.equal(qa.nativeExcelCalculationEngineExecuted,false);
});

test('the 27 historical sheets, ZIP payloads and all original style definitions survive byte-identically',async()=>{
 const {snapshot}=await generated();
 const result=python(String.raw`
import json,sys,xml.etree.ElementTree as E
from zipfile import ZipFile
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def canonical(e):return(e.tag,sorted(e.attrib.items()),e.text or '',[canonical(c) for c in e])
with ZipFile(sys.argv[1]) as old,ZipFile(sys.argv[2]) as new:
 changed=[f for f in old.namelist() if old.read(f)!=new.read(f)]
 assert set(changed)<={'[Content_Types].xml','xl/workbook.xml','xl/_rels/workbook.xml.rels','xl/styles.xml'},changed
 a,b=[E.fromstring(z.read('xl/workbook.xml')) for z in [old,new]]
 previous=a.find('s:sheets',n);current=b.find('s:sheets',n)
 assert len(previous)==27 and len(current)==39
 assert [canonical(s) for s in previous]==[canonical(s) for s in list(current)[:27]]
 assert b.find('s:bookViews/s:workbookView',n).attrib['activeTab']=='27'
 assert list(current)[27].attrib['name']=='SyntheseV104'
 sa,sb=[E.fromstring(z.read('xl/styles.xml')) for z in [old,new]]
 for section in sa:
  extended=sb.find(section.tag);assert extended is not None
  assert [canonical(c) for c in section]==[canonical(c) for c in list(extended)[:len(section)]]
 print(json.dumps({'oldNames':[s.attrib['name'] for s in previous],'unchangedParts':len(old.namelist())-len(changed),'newNames':[s.attrib['name'] for s in list(current)[27:]]}))
`,[path.join(ROOT,snapshot.baseline.path),path.join(directory,'YAUTJA_V104_SUIVI.xlsx')]);
 assert.equal(result.oldNames[5],'SyntheseV99');assert.equal(result.oldNames[15],'SyntheseV100');assert.equal(result.oldNames.at(-1),'JournalV100');
 assert(result.unchangedParts>=40);assert.equal(result.newNames.length,12);assert(result.newNames.includes('ManquantsV104'));
});

test('summary formula caches and all new navigation links are independently readable',async()=>{
 await generated();
 const result=python(String.raw`
import json,re,posixpath,sys,xml.etree.ElementTree as E
from zipfile import ZipFile
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'};rid='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
def value(c):return ''.join(c.find('s:is',n).itertext()) if c.attrib.get('t')=='inlineStr' else c.findtext('s:v',namespaces=n)
with ZipFile(sys.argv[1]) as z:
 rels={e.attrib['Id']:e.attrib['Target'] for e in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
 sheets={}
 for s in E.fromstring(z.read('xl/workbook.xml')).find('s:sheets',n):
  target=rels[s.attrib[rid]];target=target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join('xl',target))
  sheets[s.attrib['name']]=E.fromstring(z.read(target))
 values={name:{c.attrib['r']:value(c) for c in sheet.findall('.//s:c',n)} for name,sheet in sheets.items()}
 formulas=0
 for cell in sheets['SyntheseV104'].findall('.//s:c',n):
  formula=cell.findtext('s:f',namespaces=n)
  if formula is None:continue
  m=re.fullmatch(r"(COUNTA|COUNTIF)\('([^']+)'!([A-Z]+)(\d+):([A-Z]+)(\d+)(?:,\"([^\"]+)\")?\)",formula);assert m
  op,name,col,start,endcol,end,criterion=m.groups();assert col==endcol
  rows=[values[name].get(col+str(i)) for i in range(int(start),int(end)+1)]
  actual=sum(v not in [None,''] for v in rows) if op=='COUNTA' else rows.count(criterion)
  assert int(cell.findtext('s:v',namespaces=n))==actual
  formulas+=1
 for name,sheet in list(sheets.items())[27:]:
  assert sheet.find('s:autoFilter',n) is not None
  assert sheet.find('s:sheetViews/s:sheetView/s:pane',n).attrib['ySplit']=='4'
  if name!='SyntheseV104':assert sheet.find('s:hyperlinks/s:hyperlink',n).attrib['location']=="'SyntheseV104'!A1"
 print(json.dumps({'formulas':formulas,'normalRows':len(sheets['NormalesV104'].findall('s:sheetData/s:row',n))-4,'variantRows':len(sheets['VariantesV104'].findall('s:sheetData/s:row',n))-4}))
`,[path.join(directory,'YAUTJA_V104_SUIVI.xlsx')]);
 assert(result.formulas>=10);assert.equal(result.normalRows,18);assert.equal(result.variantRows,126);
});

test('source operators remain text and forged caches or historical bytes are refused',async()=>{
 const registry=await json(REGISTRY),columns=[{key:'text',label:'Source',width:100},{key:'other',label:'Reste',width:30}];
 const specs=[{name:'SyntheseV104',title:'Synthèse littérale',subtitle:'Contrôle isolé',columns,rows:[{text:{formula:"COUNTA('LiteralV104'!A5:A8)",cached:4}}]},{name:'LiteralV104',title:'Source',subtitle:'Texte exact',columns,rows:['=HYPERLINK("https://example.invalid/","source")','+SUM(1,2)','-1+2','@SUM(A1:A2)'].map(text=>({text}))}];
 const bytes=await writeWorkbookV104(registry.baseline,specs);await verifyWorkbookV104(bytes,registry.baseline);
 const target=path.join(directory,'literal.xlsx');await fs.writeFile(target,bytes);
 const result=python(String.raw`
import json,sys,xml.etree.ElementTree as E
from zipfile import ZipFile,ZIP_STORED
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with ZipFile(sys.argv[1]) as z:
 parts={name:z.read(name) for name in z.namelist()}
 original_parts=parts.copy()
 sheet=E.fromstring(parts['xl/worksheets/v104-sheet-29.xml']);assert not sheet.findall('.//s:f',n)
 texts=[c.findtext('s:is/s:t',namespaces=n) for c in sheet.findall('s:sheetData/s:row/s:c',n) if c.attrib['r'] in ['A5','A6','A7','A8']]
 summary=E.fromstring(parts['xl/worksheets/v104-sheet-28.xml']);summary.find('.//s:c[@r="A5"]/s:v',n).text='999'
 parts['xl/worksheets/v104-sheet-28.xml']=E.tostring(summary)
 with ZipFile(sys.argv[2],'w',compression=ZIP_STORED) as out:
  for name,data in parts.items():out.writestr(name,data)
 historical=next(name for name in original_parts if name.startswith('xl/worksheets/') and name.endswith('.xml') and not name.startswith('xl/worksheets/v104-'))
 original_parts[historical]+=b' '
 with ZipFile(sys.argv[3],'w',compression=ZIP_STORED) as out:
  for name,data in original_parts.items():out.writestr(name,data)
 print(json.dumps(texts))
`,[target,path.join(directory,'forged.xlsx'),path.join(directory,'forged-history.xlsx')]);
 assert.deepEqual(result,['=HYPERLINK("https://example.invalid/","source")','+SUM(1,2)','-1+2','@SUM(A1:A2)']);
 await assert.rejects(verifyWorkbookV104(await fs.readFile(path.join(directory,'forged.xlsx')),registry.baseline));
 await assert.rejects(verifyWorkbookV104(await fs.readFile(path.join(directory,'forged-history.xlsx')),registry.baseline));
 const {qa}=await generated();assert.equal(qa.originalSheetsPreserved,27);
});

test('generation is reproducible and check rejects every stale output without rewriting it',async()=>{
 const first=await generated(),again=await generateFollowupV104({outputDir:directory,check:true});assert.equal(first.workbookSha256,again.workbookSha256);
 for(const name of OUTPUTS){
  const target=path.join(directory,name),original=await fs.readFile(target),changed=Buffer.concat([original,Buffer.from('\n')]);
  await fs.writeFile(target,changed);await assert.rejects(generateFollowupV104({outputDir:directory,check:true}),/Suivi V104 périmé/);
  assert.deepEqual(await fs.readFile(target),changed);await fs.writeFile(target,original);
 }
});
