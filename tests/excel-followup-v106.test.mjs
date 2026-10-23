import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {ROOT,REGISTRY,OUTPUTS,verifyRegistryV106,verifyArchiveSourceV106,verifyAssaultSourceV106,collectFollowupV106,generateFollowupV106,buildSheetsV106,writeWorkbookV106,verifyWorkbookV106} from '../scripts/build-excel-followup-v106.mjs';
import {collectRuntimeInputsV106} from '../scripts/collect-v106-runtime-inputs.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async file=>JSON.parse(await fs.readFile(path.join(ROOT,file),'utf8'));
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'yautja-v106-tests-'));
let result;
const generated=()=>result??=generateFollowupV106({outputDir:directory});
after(async()=>{await fs.rm(directory,{recursive:true,force:true});});
const python=(script,args)=>execFileSync('python3',['-c',script,...args],{maxBuffer:40*1024*1024});

test('V106 cannot promote without all production recipes, a freeze and pinned portable proofs',async()=>{
 const registry=await json(REGISTRY);verifyRegistryV106(registry);
 const changed=()=>structuredClone(registry);
 let value=changed();value.workstreams[0].status='TERMINE';assert.throws(()=>verifyRegistryV106(value),/Unbounded/);
 value=changed();value.baseline.sha256='0'.repeat(64);assert.throws(()=>verifyRegistryV106(value),/Pinned V105/);
 value=changed();value.workstreams[0].status='VALIDE_CIBLE';value.baselineFreeze='PENDING_RUNTIME_FREEZE';assert.throws(()=>verifyRegistryV106(value),/Freeze runtime/);
 value=changed();value.baselineFreeze='FROZEN';value.runtimeFreeze={path:'docs/v106-runtime-freeze.json',sha256:'a'.repeat(64)};
 value.workstreams.forEach(item=>{item.status='VALIDE_CIBLE';item.tests='PASS_TARGET';item.browser='PASS_CIBLE_PRODUCTION';item.proof=[{path:'docs/v106-validation-summary.json',sha256:'b'.repeat(64)},{path:'docs/domain-proof.json',sha256:'c'.repeat(64)}];});verifyRegistryV106(value);
 value.workstreams[2].status='EN_COURS';assert.throws(()=>verifyRegistryV106(value),/All three/);
 value.workstreams[2].status='VALIDE_CIBLE';value.workstreams[0].browser='PASS_DEV_ONLY';assert.throws(()=>verifyRegistryV106(value),/production browser/);
 value.workstreams[0].browser='PASS_CIBLE_PRODUCTION';value.workstreams[0].proof[0].path='/tmp/qa.json';assert.throws(()=>verifyRegistryV106(value),/Portable/);
});

test('the complete ROLE03 subset and option B retain exact provenance, rows and cells',async()=>{
 const source=await json('app/game/data/bibleArchiveSceneV106.json'),corpus=await fs.readFile(path.join(ROOT,'public/game/dialogues/v85/bible-dialogues.json'));
 const row=source.sheets.find(sheet=>sheet.name==='Choix et actions V6').rows.find(row=>row.number===789),cell=col=>row.cells.find(cell=>cell.address===col+'789').value;
 const option={address:'Choix et actions V6!A789:I789',action:cell('F'),conditions:cell('G')};assert.equal(verifyArchiveSourceV106(option,source,corpus).option,'B');
 assert.throws(()=>verifyArchiveSourceV106({...option,address:'Choix et actions V6!A788:I788'},source,corpus));
 assert.throws(()=>verifyArchiveSourceV106({...option,action:'Révéler toutes les lignées'},source,corpus),/text changed/);
 for(const mutate of [value=>value.sheets[0].rows[0].cells[8].value='Tout savoir',value=>value.sheets[1].rows.pop(),value=>value.sheets[2].rows[1].cells[6].value='Sans condition']){
  const altered=structuredClone(source);mutate(altered);assert.throws(()=>verifyArchiveSourceV106(option,altered,corpus),/changed/);
 }
});

test('the assault retains the three exact V3 rules without closing physical structures',async()=>{
 const corpus=await json('docs/war-clans-v3-workbook-source.json'),contract={workbook:corpus.sourceWorkbook,sha256:corpus.sha256,sheet:'Règles de conquête',sources:[['CON-R09',14],['CON-R12',17],['CON-R14',19]].map(([id,row])=>({id,cells:`C${row}:H${row}`}))};
 assert.equal(verifyAssaultSourceV106(contract,corpus).length,3);
 const altered=structuredClone(contract);altered.sources[0].cells='C13:H13';assert.throws(()=>verifyAssaultSourceV106(altered,corpus),/cells changed/);
 assert.throws(()=>verifyAssaultSourceV106({...contract,sha256:'0'.repeat(64)},corpus),/provenance/);
 const {snapshot}=await generated();assert.equal(snapshot.facts.openWarStructures,6);assert.deepEqual(snapshot.openItems.filter(item=>item.domain==='Guerre de clans').map(item=>item.id),['W3-S09','W3-S10','W3-S13','W3-S14','W3-S15','W3-S18']);
});

test('current runtime probes stay separate from complete kits, campaigns, variants and production promotion',async()=>{
 const {snapshot,qa}=await generated(),f=snapshot.facts;
 assert.equal(f.sourceActions,52);assert.equal(f.nativeDirections,104);assert.equal(f.historicalSourceRuntimeBindings,35);
 assert.equal(f.sourceBindingsDeclared,35+f.newRuntimeMoves);assert.equal(f.sourceRuntimeBindings,snapshot.workstreams[0].status==='VALIDE_CIBLE'?f.sourceBindingsDeclared:35);
 assert.equal(f.sourceActionsRemaining,52-f.sourceRuntimeBindings);assert.equal(f.newNativeDrawings,0);assert.equal(f.campaignStages,16);assert.equal(f.variantConstraints,14);assert.equal(f.openWarStructures,6);
 assert.deepEqual(snapshot.pitVersions,{legacy:11,v104:12,v105:13,v106:14});assert.equal(f.motionPatterns,5);assert.equal(snapshot.motions.length,8);
 const partners=snapshot.actions.filter(item=>['TH_F','TH_B','FATALITE_1','FATALITE_2','CLEMENCE'].includes(item.key));assert.equal(partners.length,10);
 assert(partners.every(item=>item.runtimeAtlasId===''&&['OUVERT','SANS_MECANIQUE_COMBAT'].includes(item.mechanics)&&item.presentation!=='REGISTRE_PRESENTATION_V105'));
 assert(Object.entries(snapshot.delivery).filter(([key])=>key!=='canonicalFidelity').every(([,value])=>value==='OUVERT'));
 assert.equal(snapshot.campaignStages.length,16);assert.equal(snapshot.variantConstraints.length,14);
 assert.equal(snapshot.openItems.filter(item=>item.domain==='The Pit · campagne').length,16);assert.equal(snapshot.openItems.filter(item=>item.domain==='The Pit · variante').length,14);
 assert.equal(qa.result,'PASS_STRUCTURE');assert.equal(qa.originalSheetsPreserved,49);assert.equal(qa.sheetNames.length,60);assert.equal(qa.nativeExcelApplicationVerified,false);assert.equal(qa.nativeExcelCalculationEngineExecuted,false);
});

test('the pre-promotion inventory covers actual native pages, archive furniture and modular image requests',async()=>{
 const inventory=await collectRuntimeInputsV106();assert.equal(inventory.status,'INPUTS_ONLY');
 const paths=inventory.assets.map(item=>item.path);assert.equal(new Set(paths).size,paths.length);
 const npc=inventory.assets.filter(item=>item.scope.includes('modular NPC'));assert.equal(npc.length,18);assert.equal(npc.filter(item=>item.path.endsWith('.png')).length,1);assert.equal(npc.filter(item=>item.path.endsWith('.webp')).length,17);
 assert(paths.includes('public/game/assets/v3/actors/yautja/hunter/body/classic/full.webp'));assert(paths.includes('public/game/assets/v3/actors/yautja/hunter/body/classic/net/full.webp'));assert(!paths.includes('public/game/assets/v3/actors/yautja/hunter/body/classic/parts/head.webp'));
 assert(inventory.inputs.every(item=>!item.path.startsWith('docs/')),'Pre-freeze input inventory must avoid proof/master cycles');
 for(const item of inventory.assets){const bytes=await fs.readFile(path.join(ROOT,item.path));assert.equal(sha(bytes),item.sha256);assert.equal(bytes.length,item.bytes);assert(item.width>0&&item.height>0);}
});

test('all 49 historical worksheet payloads and style/relationship prefixes survive the 60-sheet workbook',async()=>{
 const {snapshot}=await generated();
 const checked=JSON.parse(python(String.raw`
import json,sys,xml.etree.ElementTree as E
from zipfile import ZipFile
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with ZipFile(sys.argv[1]) as old,ZipFile(sys.argv[2]) as new:
 changed=[f for f in old.namelist() if old.read(f)!=new.read(f)]
 assert set(changed)=={'[Content_Types].xml','xl/workbook.xml','xl/_rels/workbook.xml.rels','xl/styles.xml'},changed
 a=E.fromstring(old.read('xl/workbook.xml')).find('s:sheets',n)
 b=E.fromstring(new.read('xl/workbook.xml')).find('s:sheets',n)
 assert len(a)==49 and len(b)==60
 assert [s.attrib for s in a]==[s.attrib for s in list(b)[:49]]
 assert b[49].attrib['name']=='SyntheseV106'
 print(json.dumps({'changed':changed,'preserved':len(old.namelist())-len(changed)}))
`,[path.join(ROOT,snapshot.baseline.path),path.join(directory,OUTPUTS[1])]).toString());
 assert.equal(checked.changed.length,4);assert.equal(checked.preserved,62);
});

test('untrusted source formula strings stay literal and forged summary caches fail independently',async()=>{
 const {snapshot}=await generated(),sheets=buildSheetsV106(snapshot);
 sheets.find(sheet=>sheet.name==='ManquantsV106').rows[0].remaining='=HYPERLINK("https://example.invalid","source")';
 const workbook=await writeWorkbookV106(snapshot.baseline,sheets);await verifyWorkbookV106(workbook,snapshot.baseline);
 const file=path.join(directory,'literal.xlsx');await fs.writeFile(file,workbook);
 const checked=JSON.parse(python(String.raw`
import json,sys,xml.etree.ElementTree as E
from zipfile import ZipFile
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with ZipFile(sys.argv[1]) as z:
 sheet=E.fromstring(z.read('xl/worksheets/v106-sheet-57.xml'))
 cell=sheet.find("s:sheetData/s:row[@r='5']/s:c[@r='E5']",n)
 print(json.dumps({'type':cell.attrib['t'],'formulas':len(cell.findall('s:f',n)),'text':''.join(cell.find('s:is',n).itertext())}))
`,[file]).toString());assert.equal(checked.type,'inlineStr');assert.equal(checked.formulas,0);assert(checked.text.startsWith('=HYPERLINK'));
 const altered=structuredClone(sheets);altered[0].rows[0].value.cached=999;
 await assert.rejects(async()=>verifyWorkbookV106(await writeWorkbookV106(snapshot.baseline,altered),snapshot.baseline),/COUNTA|AssertionError/);
});

test('a modified historical worksheet and a stale derived product are both rejected without repair',async()=>{
 const {snapshot,workbookSha256}=await generated();
 const tampered=python(String.raw`
import io,sys
from zipfile import ZipFile,ZIP_STORED
with ZipFile(sys.argv[1]) as z: parts={name:z.read(name) for name in z.namelist()}
name=next(name for name in parts if name.startswith('xl/worksheets/') and '/v106-' not in name)
parts[name]+=b'\n'
out=io.BytesIO()
with ZipFile(out,'w',compression=ZIP_STORED) as z:
 for name,data in parts.items():z.writestr(name,data)
sys.stdout.buffer.write(out.getvalue())
`,[path.join(directory,OUTPUTS[1])]);
 await assert.rejects(verifyWorkbookV106(tampered,snapshot.baseline),/AssertionError|worksheets/);
 await assert.rejects(writeWorkbookV106({...snapshot.baseline,sha256:'0'.repeat(64)},buildSheetsV106(snapshot)),/frozen V105/);
 const baseline=await fs.readFile(path.join(ROOT,snapshot.baseline.path));assert.equal((await generateFollowupV106({outputDir:directory,check:true})).workbookSha256,workbookSha256);
 const target=path.join(directory,OUTPUTS[0]);await fs.appendFile(target,'stale');const stale=await fs.readFile(target);
 await assert.rejects(generateFollowupV106({outputDir:directory,check:true}),/périmé/);assert.deepEqual(await fs.readFile(target),stale);assert.deepEqual(await fs.readFile(path.join(ROOT,snapshot.baseline.path)),baseline);
 const changed=await json(REGISTRY);changed.baseline.sha256='0'.repeat(64);await assert.rejects(collectFollowupV106(changed),/Pinned V105/);
});
