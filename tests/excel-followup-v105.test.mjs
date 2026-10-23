import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {ROOT,REGISTRY,OUTPUTS,verifyRegistryV105,verifyFinalProofsV105,verifyFrozenInputsV105,verifySourceScopeV105,verifyHomeworldSourceV105,verifyConvoySourceV105,collectFollowupV105,buildSheetsV105,writeWorkbookV105,verifyWorkbookV105,generateFollowupV105} from '../scripts/build-excel-followup-v105.mjs';

let directory,pending;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async relative=>JSON.parse(await fs.readFile(path.join(ROOT,relative),'utf8'));
const generated=()=>pending??=generateFollowupV105({outputDir:directory});
const python=(source,args=[])=>execFileSync('python3',['-c',source,...args],{stdio:['ignore','pipe','pipe'],timeout:30000,maxBuffer:8*1024*1024});
before(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'excel-followup-v105-test-'));});
after(async()=>{if(directory)await fs.rm(directory,{recursive:true,force:true});});

test('bounded workstreams reject global closure, missing browser proof and foreign baseline',async()=>{
 const baseline=await json(REGISTRY);verifyRegistryV105(baseline);
 const unknown=structuredClone(baseline);unknown.workstreams[0].status='TERMINE';assert.throws(()=>verifyRegistryV105(unknown),/Statut limité/);
 const enlarged=structuredClone(baseline);enlarged.workstreams[0].validationScope='PERSONNAGES_COMPLETS';assert.throws(()=>verifyRegistryV105(enlarged),/Portée limitée/);
 const foreign=structuredClone(baseline);foreign.baseline.sha256='0'.repeat(64);assert.throws(()=>verifyRegistryV105(foreign),/Empreinte V104/);
 const value=structuredClone(baseline),item=value.workstreams[0];item.status='VALIDE_CIBLE';item.tests='PASS cas exécutés';item.browser='PASS recette ciblée';
 value.baselineFreeze='PENDING_RUNTIME_FREEZE';assert.throws(()=>verifyRegistryV105(value),/Geler le runtime/);
 value.baselineFreeze='FROZEN';item.proof=[];assert.throws(()=>verifyRegistryV105(value),/sans preuve finale/);
 item.proof=[{path:'tests/pretend-proof.mjs',sha256:'0'.repeat(64)}];assert.throws(()=>verifyRegistryV105(value),/Preuve finale portable/);
 item.proof=[{path:'docs/explicit-proof.json',sha256:'0'.repeat(64)}];item.browser='A_VALIDER';assert.throws(()=>verifyRegistryV105(value),/navigateur PASS/);
});

test('proofs require exact report bytes; an unexecuted filename cannot promote a workstream',async()=>{
 assert.deepEqual(await verifyFinalProofsV105([{status:'EN_COURS',proof:[{path:'missing.json',sha256:'0'.repeat(64)}]}]),[]);
 const path=REGISTRY,bytes=await fs.readFile(`${ROOT}/${path}`),proof={path,sha256:sha(bytes)};
 await assert.rejects(verifyFinalProofsV105([{status:'VALIDE_CIBLE',proof:[{...proof,sha256:'0'.repeat(64)}]}]),/Preuve finale modifiée/);
 assert.deepEqual(await verifyFinalProofsV105([{status:'VALIDE_CIBLE',proof:[proof]}]),[proof]);
 await assert.rejects(verifyFinalProofsV105([],[{status:'PASS_CIBLE',evidence:[{...proof,sha256:'0'.repeat(64)}]}]),/Preuve finale modifiée/);
 const registry=await json(REGISTRY);registry.validations=[{id:'fake',status:'PASS_CIBLE',scope:'scope',limit:'limit',command:'node tests/file.mjs',evidence:['tests/file.mjs']}];assert.throws(()=>verifyRegistryV105(registry),/portable/);
});

test('a validated runtime cannot retain its proof after a host, UI or public input changes',()=>{
 const entries=[{path:'app/game/PitCanvas.tsx',sha256:'1'.repeat(64)},{path:'public/game/native.png',sha256:'2'.repeat(64)}],freeze={files:2,entries};
 assert.equal(verifyFrozenInputsV105([...entries,{path:'docs/report.json',sha256:'3'.repeat(64)}],freeze),2);
 assert.throws(()=>verifyFrozenInputsV105([{...entries[0],sha256:'0'.repeat(64)}],freeze),/Runtime différent du gel/);
 assert.throws(()=>verifyFrozenInputsV105([{path:'app/game/NewHost.tsx',sha256:'1'.repeat(64)}],freeze),/Runtime différent du gel/);
 assert.throws(()=>verifyFrozenInputsV105([entries[0]],{files:2,entries:[entries[0],entries[0]]}),/dupliquée/);
 assert.throws(()=>verifyFrozenInputsV105([entries[0]],{files:3,entries}),/incomplet/);
});

test('all source action cells plus campaign and variant constraints are independently checked',async()=>{
 const plan=await json('app/game/data/pitWorkbookAnimationPlanV100.json'),scope=await json('app/game/data/pitWorkbookScopeV105.json');
 const bytes=await fs.readFile(`${ROOT}/${plan.source.extractionPath}`),extraction=JSON.parse(bytes);
 const verify=value=>verifySourceScopeV105(value,plan,extraction,sha(bytes));verify(scope);
 for(const mutate of [value=>value.fighters[0].actions[0].sourceText='substitution',value=>value.fighters[1].actions[0].cell='E7',value=>value.fighters[0].campaignStages[0].sourceText='substitution',value=>value.fighters[1].variantConstraints[6].sourceText='substitution',value=>value.fighters[0].identity.cells.A10='F999']){
  const value=structuredClone(scope);mutate(value);assert.throws(()=>verify(value),/altér/);
 }
 const duplicate=structuredClone(scope);duplicate.fighters[0].actions[1].actionId=duplicate.fighters[0].actions[0].actionId;assert.throws(()=>verify(duplicate),/dupliquée/);
 const shifted=structuredClone(scope);shifted.fighters[0].campaignStages[0].cell='E10';assert.throws(()=>verify(shifted),/Cellules de contraintes/);
});

test('Homeworld option A and three convoy source rows retain source provenance and exact addresses',async()=>{
 const source=await json('app/game/data/bibleCartographySceneV104.json'),corpus=await fs.readFile(`${ROOT}/public/game/dialogues/v85/bible-dialogues.json`);
 const row=source.sheets.find(s=>s.name==='Choix et actions V6').rows.find(r=>r.number===806),get=col=>row.cells.find(c=>c.address===col+'806').value;
 const option={option:'A',address:'Choix et actions V6!A806:I806',action:get('F'),conditions:get('G'),consequence:get('H')};verifyHomeworldSourceV105(option,source,corpus);
 assert.throws(()=>verifyHomeworldSourceV105({...option,action:'révéler toute la carte'},source,corpus),/Texte option A/);
 assert.throws(()=>verifyHomeworldSourceV105(option,{...source,sourceCorpusSha256:'0'.repeat(64)},corpus),/Corpus V6/);
 const clans=await json('docs/war-clans-v3-workbook-source.json'),contract={workbook:clans.sourceWorkbook,sha256:clans.sha256,sources:[['CON-R04',9],['CON-R10',15],['CON-R11',16]].map(([id,n])=>({id,sheet:'Règles de conquête',cells:`C${n}:H${n}`}))};
 assert.equal(verifyConvoySourceV105(contract,clans).length,3);
 assert.throws(()=>verifyConvoySourceV105({...contract,sha256:'0'.repeat(64)},clans),/Provenance V3/);
 const wrong=structuredClone(contract);wrong.sources[0].cells='C8:H8';assert.throws(()=>verifyConvoySourceV105(wrong,clans),/Cellules convoi/);
});

test('actual exports keep 52 BODY studies distinct from 25 movements, 10 presentations and open partners',async()=>{
 const {snapshot,qa}=await generated(),f=snapshot.facts;
 assert.equal(f.sourceActions,52);assert.equal(f.nativeDirections,104);assert.equal(f.historicalNormals,18);assert.equal(f.newRuntimeMoves,7);assert.equal(f.allSourceRuntimeMoves,25);assert.equal(f.newRuntimePresentations,10);assert.equal(f.newRuntimeMoveClips,38);assert.equal(f.newRuntimePresentationClips,20);
 assert.deepEqual(snapshot.pitVersions,{legacy:11,v104:12,v105:13});assert.equal(f.campaignStages,16);assert.equal(f.variantConstraints,14);assert.equal(f.openWarStructures,6);
 assert(snapshot.clips.every(item=>item.frames>0&&item.durationTicks60>0&&item.pages.every(p=>/^[a-f0-9]{64}$/.test(p.sha256))));
 const partner=snapshot.actions.filter(item=>['TH_F','TH_B','FATALITE_1','FATALITE_2','CLEMENCE'].includes(item.key));assert.equal(partner.length,10);assert(partner.every(item=>item.runtimeAtlasId===''&&item.mechanics!=='CONTACT_V105_PARTIEL'&&item.presentation!=='REGISTRE_PRESENTATION_V105'));
 const equip=snapshot.actions.filter(item=>item.key==='EQUIP');assert(equip.every(item=>item.mechanics==='GESTE_EQUIPEMENT_SANS_INVENTAIRE'&&item.runtimeClips.length===4&&item.runtimeClips.every(c=>!c.id.endsWith('.active'))));
 assert.equal(snapshot.actions.find(item=>item.fighterId==='scar'&&item.key==='S4').mechanics,'PARADE_CONTACT_FRONTALE_PARTIELLE');
 assert(Object.entries(snapshot.delivery).filter(([key])=>key!=='canonicalFidelity').every(([,value])=>value==='OUVERT'));
 assert.equal(snapshot.openItems.filter(item=>item.domain==='The Pit · campagne').length,16);assert.equal(snapshot.openItems.filter(item=>item.domain==='The Pit · variante').length,14);
 const inputs=new Set(snapshot.inputs.map(item=>item.path));assert(snapshot.assets.every(item=>inputs.has(item.path)));assert.equal(qa.result,'PASS_STRUCTURE');assert.equal(qa.nativeExcelApplicationVerified,false);assert.equal(qa.nativeExcelCalculationEngineExecuted,false);
 assert.equal(qa.formulas.length,7);assert.equal(qa.originalSheetsPreserved,39);assert.equal(qa.sheetNames.length,49);
});

test('all 39 historical sheet payloads, styles and relationships remain intact in the 49-sheet workbook',async()=>{
 const {snapshot}=await generated();
 const result=JSON.parse(python(String.raw`
import json,sys,xml.etree.ElementTree as E
from zipfile import ZipFile
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with ZipFile(sys.argv[1]) as old,ZipFile(sys.argv[2]) as new:
 changed=[f for f in old.namelist() if old.read(f)!=new.read(f)]
 assert set(changed)<={'[Content_Types].xml','xl/workbook.xml','xl/_rels/workbook.xml.rels','xl/styles.xml'},changed
 a=E.fromstring(old.read('xl/workbook.xml')).find('s:sheets',n)
 b=E.fromstring(new.read('xl/workbook.xml')).find('s:sheets',n)
 assert len(a)==39 and len(b)==49
 assert [s.attrib for s in a]==[s.attrib for s in list(b)[:39]]
 assert b[39].attrib['name']=='SyntheseV105'
 print(json.dumps({'changed':changed,'preserved':len(old.namelist())-len(changed)}))
`,[path.join(ROOT,snapshot.baseline.path),path.join(directory,OUTPUTS[1])]).toString());
 assert.equal(result.changed.length,4);assert.equal(result.preserved,52);
});

test('literal source formulas stay text while trusted summary formulas have independently verified caches',async()=>{
 const {snapshot}=await generated(),sheets=buildSheetsV105(snapshot);
 sheets.find(s=>s.name==='ManquantsV105').rows[0].remaining='=HYPERLINK("https://example.invalid","source")';
 const workbook=await writeWorkbookV105(snapshot.baseline,sheets);await verifyWorkbookV105(workbook,snapshot.baseline);
 const file=path.join(directory,'literal.xlsx');await fs.writeFile(file,workbook);
 const result=JSON.parse(python(String.raw`
import json,sys,xml.etree.ElementTree as E
from zipfile import ZipFile
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with ZipFile(sys.argv[1]) as z:
 sheet=E.fromstring(z.read('xl/worksheets/v105-sheet-46.xml'))
 cell=sheet.find("s:sheetData/s:row[@r='5']/s:c[@r='E5']",n)
 print(json.dumps({'type':cell.attrib['t'],'formulas':len(cell.findall('s:f',n)),'text':''.join(cell.find('s:is',n).itertext())}))
`,[file]).toString());
 assert.equal(result.type,'inlineStr');assert.equal(result.formulas,0);assert(result.text.startsWith('=HYPERLINK'));
 const forged=structuredClone(sheets);forged[0].rows[0].value.cached=999;
 await assert.rejects(async()=>verifyWorkbookV105(await writeWorkbookV105(snapshot.baseline,forged),snapshot.baseline),/COUNTA|AssertionError/);
});

test('a modified historical worksheet is rejected even when its XML and ZIP remain valid',async()=>{
 const {snapshot}=await generated();
 const tampered=python(String.raw`
import io,sys
from zipfile import ZipFile,ZIP_STORED
with ZipFile(sys.argv[1]) as z: parts={name:z.read(name) for name in z.namelist()}
name=next(name for name in parts if name.startswith('xl/worksheets/') and '/v105-' not in name)
parts[name]+=b'\n'
out=io.BytesIO()
with ZipFile(out,'w',compression=ZIP_STORED) as z:
 for name,data in parts.items():z.writestr(name,data)
sys.stdout.buffer.write(out.getvalue())
`,[path.join(directory,OUTPUTS[1])]);
 await assert.rejects(verifyWorkbookV105(tampered,snapshot.baseline),/AssertionError|worksheets/);
 await assert.rejects(writeWorkbookV105({...snapshot.baseline,sha256:'0'.repeat(64)},buildSheetsV105(snapshot)),/frozen V104/);
});

test('a stale derived product fails check without mutation; historic workbook bytes never change',async()=>{
 const {snapshot,workbookSha256}=await generated(),base=await fs.readFile(`${ROOT}/${snapshot.baseline.path}`);
 const second=await generateFollowupV105({outputDir:directory,check:true});assert.equal(second.workbookSha256,workbookSha256);
 const target=path.join(directory,OUTPUTS[0]);await fs.appendFile(target,'stale');const stale=await fs.readFile(target);
 await assert.rejects(generateFollowupV105({outputDir:directory,check:true}),/périmé/);assert.deepEqual(await fs.readFile(target),stale);assert.deepEqual(await fs.readFile(`${ROOT}/${snapshot.baseline.path}`),base);
 const changed=await json(REGISTRY);changed.baseline.sha256='0'.repeat(64);await assert.rejects(collectFollowupV105(changed),/Empreinte V104/);
});
