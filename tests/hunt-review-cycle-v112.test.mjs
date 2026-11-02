import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildHuntMechanicsWorkbook,createHuntCycleBaselineV112,resolveHuntReviewV112} from '../scripts/build-hunt-mechanics-workbook-v112.mjs';
import {buildHuntPrintableV112} from '../scripts/build-hunt-printable-v112.mjs';

const frozen=JSON.parse(gunzipSync(await fs.readFile(new URL('./fixtures/hunt-mechanics-e4a6c64-v112.json.gz',import.meta.url))));
const copy=value=>JSON.parse(JSON.stringify(value));
const sheet=(source,name)=>source.sheets.find(s=>s.name===name);
const row=(source,id)=>source.sheets.flatMap(s=>s.rows).find(r=>r.id===id);
const ref='e0347c7645667c6dd7fabc48527704d4b5f1ca32';
function fixture(){
 const source=copy(frozen);source.schemaVersion=3;source.printLayout={fitToPage:true};source.cycleBaseline=createHuntCycleBaselineV112(frozen);
 const entries=['CHA112-02','ROU112-06'].map((target,index)=>{
  const archived=sheet(source,'Cloture').rows.find(r=>r.target===target),id='CYCLE-TEST-'+index;
  const url='https://github.com/'+source.repository+'/blob/'+ref+'/docs/hunt-mechanics-v112.md';
  sheet(source,'Preuves').rows.push({id,status:'VALIDE_AUTOMATISE',topic:'Synthetic validation fixture',rule:'Schema validation only; no new qualification claimed.',source:url,acceptance:'commit '+ref+' ; commande synthetic-validation-test ; test fixture only.'});
  return {id:'RPR112-'+String(index+1).padStart(3,'0'),target,previous:archived.status,status:'VALIDE_AUTOMATISE',criterion:archived.criterion,kind:'AUTOMATISE',proofs:id,scope:'Synthetic journal validation only.',source:url,remaining:''};
 });
 source.sheets.push({name:'Reprise',title:'Journal de reprise',columns:copy(sheet(source,'Cloture').columns),rows:entries});return source;
}
function members(bytes){
 const b=Buffer.from(bytes),files=new Map();let at=0;
 while(b.readUInt32LE(at)===0x04034b50){const n=b.readUInt16LE(at+26),x=b.readUInt16LE(at+28),length=b.readUInt32LE(at+18),start=at+30+n+x;files.set(b.subarray(at+30,at+30+n).toString(),b.subarray(start,start+length).toString());at=start+length;}return files;
}
function statusCell(source,files,name,id){
 const table=sheet(source,name),index=source.sheets.indexOf(table)+1,number=table.rows.findIndex(r=>r.id===id)+5;
 const column=String.fromCharCode(65+table.columns.findIndex(c=>c.key==='status'));
 return files.get('xl/worksheets/sheet'+index+'.xml').match(new RegExp('<c r="'+column+number+'"[^>]*><is><t(?: [^>]*)?>([^<]*)</t></is></c>'))?.[1];
}

test('schema 3 displays two current decisions while retaining exact historical review data',()=>{
 const source=fixture(),before=copy(source),files=members(buildHuntMechanicsWorkbook(source)),states=resolveHuntReviewV112(source);
 assert.deepEqual(source,before);assert.equal(source.sheets.length,22);
 assert.deepEqual(sheet(source,'Cloture'),sheet(frozen,'Cloture'));assert.deepEqual(source.closureBaseline,frozen.closureBaseline);
 assert.deepEqual(sheet(source,'Restant'),sheet(frozen,'Restant'));assert.equal(source.reviewRef,frozen.reviewRef);
 for(const [id,name] of [['CHA112-02','Charge'],['ROU112-06','Routes']]){
  assert.equal(row(source,id).status,'PARTIELLEMENT_QUALIFIE');assert.equal(states.get(id),'VALIDE_AUTOMATISE');assert.equal(statusCell(source,files,name,id),'VALIDE_AUTOMATISE');
  const archived=sheet(source,'Cloture').rows.find(r=>r.target===id);assert.equal(statusCell(source,files,'Cloture',archived.id),'PARTIELLEMENT_QUALIFIE');
 }
 for(const id of ['ROU112-05','CHA112-05','FUT-11','FUT-12','ECO112-11'])assert.equal(states.get(id),'PARTIELLEMENT_QUALIFIE');
 for(const id of ['SRC112-10','PRF112-07',...Array.from({length:8},(_,i)=>'REM112-'+String(i+1).padStart(2,'0'))])assert.equal(states.get(id),'NON_QUALIFIE');
 const counts={};for(const record of sheet(source,'Cloture').rows){const status=states.get(record.target);counts[status]=(counts[status]??0)+1;}
 assert.deepEqual(counts,{DOCUMENTE:9,NON_QUALIFIE:2,VALIDE_AUTOMATISE:203,PARTIELLEMENT_QUALIFIE:5});
 const html=buildHuntPrintableV112(source);assert.equal((html.match(/data-current-target=/g)||[]).length,2);assert.equal((html.match(/data-transition=/g)||[]).length,2);assert.equal((html.match(/data-effective-status>VALIDE_AUTOMATISE/g)||[]).length,2);assert.match(html,/22 onglets/);
});

test('schema 3 rejects rewritten archives, promoted raw statuses and unsupported journal claims',()=>{
 const mutate=[
  s=>s.cycleBaseline.commit='0'.repeat(40),s=>s.cycleBaseline.sourceJsonSha256='0'.repeat(64),
  s=>s.cycleBaseline.remainingSheet.rows[0].rule+=' changed',s=>sheet(s,'Cloture').rows[0].scope+=' changed',
  s=>s.reviewRef=ref,s=>row(s,'CHA112-02').status='VALIDE_AUTOMATISE',
  s=>row(s,s.closureBaseline.rows.find(r=>r.status==='BASE_V111').id).status='VALIDE_AUTOMATISE',
  s=>sheet(s,'Reprise').rows[0].previous='NON_QUALIFIE',s=>sheet(s,'Reprise').rows[0].criterion+=' lowered',
  s=>sheet(s,'Reprise').rows[0].proofs='MISSING',s=>sheet(s,'Reprise').rows[0].remaining='REM112-08',
  s=>sheet(s,'Reprise').rows[0].source=sheet(s,'Reprise').rows[0].source.replace(ref,'main'),
  s=>sheet(s,'Reprise').rows[0].id='RPR112-099',s=>sheet(s,'Reprise').rows[0].status='BASE_V111',
  s=>sheet(s,'Reprise').rows[0].kind='REVUE_DOCUMENTAIRE',
  s=>row(s,'CYCLE-TEST-0').acceptance='commit '+'0'.repeat(40)+' ; commande synthetic-test',
  s=>row(s,'REM112-01').status='VALIDE_AUTOMATISE',s=>row(s,'REM112-01').acceptance='Criterion omitted',
  s=>row(s,'QA112-46').source='scripts/changed.mjs',s=>sheet(s,'Reprise').columns[0].label='Changed contract',
 ];
 for(const change of mutate){const source=fixture();change(source);assert.throws(()=>buildHuntMechanicsWorkbook(source));}
});

test('a later closure preserves an earlier partial journal entry and requires the current remaining status',()=>{
 const source=fixture(),journal=sheet(source,'Reprise').rows,criterion=sheet(source,'Cloture').rows.find(r=>r.target==='ROU112-05').criterion;
 journal.push({...copy(journal[0]),id:'RPR112-003',target:'ROU112-05',previous:'PARTIELLEMENT_QUALIFIE',status:'PARTIELLEMENT_QUALIFIE',kind:'AUTOMATISE_PARTIEL',criterion,remaining:'REM112-08'});
 const remaining=source.cycleBaseline.remainingSheet.rows.find(r=>r.id==='REM112-08');
 journal.push({...copy(journal[0]),id:'RPR112-004',target:'REM112-08',previous:'NON_QUALIFIE',criterion:remaining.rule+' | '+remaining.acceptance});
 row(source,'REM112-08').status='VALIDE_AUTOMATISE';
 assert.throws(()=>buildHuntMechanicsWorkbook(source),/outstanding action/);
 journal.push({...copy(journal[0]),id:'RPR112-005',target:'ROU112-05',previous:'PARTIELLEMENT_QUALIFIE',criterion});
 assert.doesNotThrow(()=>buildHuntMechanicsWorkbook(source));assert.equal(resolveHuntReviewV112(source).get('REM112-08'),'VALIDE_AUTOMATISE');assert.equal(journal[2].remaining,'REM112-08');
});

test('the independent Python resolver agrees with current decisions and refuses a forged proof commit',async()=>{
 const source=fixture(),script=String.raw`
import copy,importlib.util,json,sys
spec=importlib.util.spec_from_file_location('v112',sys.argv[1]);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
source=json.load(sys.stdin);states=module.effective_statuses(source)
assert states['CHA112-02']==states['ROU112-06']=='VALIDE_AUTOMATISE'
assert states['REM112-08']=='NON_QUALIFIE'
invalid=copy.deepcopy(source)
next(r for s in invalid['sheets'] for r in s['rows'] if r['id']=='CYCLE-TEST-0')['acceptance']='commit '+'0'*40+' ; commande fake'
try:module.effective_statuses(invalid)
except AssertionError:pass
else:raise AssertionError('Forged proof commit accepted')
`;
 await new Promise((resolve,reject)=>{const child=spawn('python3',['-c',script,fileURLToPath(new URL('../scripts/verify-hunt-mechanics-workbook-v112.py',import.meta.url))],{timeout:10000});let errors='';child.stderr.on('data',c=>{errors+=c});child.on('error',reject);child.on('close',code=>{try{assert.equal(code,0,errors);resolve()}catch(error){reject(error)}});child.stdin.end(JSON.stringify(source));});
});

test('the approved geometric composition closes four criteria while retaining all eight original remaining actions',async()=>{
 const source=JSON.parse(await fs.readFile(new URL('../docs/hunt-mechanics-v112.json',import.meta.url),'utf8'));
 assert.deepEqual(sheet(source,'Reprise').rows.map(r=>r.target),['CHA112-02','ROU112-06','ROU112-05','CHA112-05']);
 assert.deepEqual(sheet(source,'Restant'),sheet(frozen,'Restant'));
 const states=resolveHuntReviewV112(source),counts={};
 for(const record of sheet(source,'Cloture').rows){const status=states.get(record.target);counts[status]=(counts[status]??0)+1;}
 assert.deepEqual(counts,{DOCUMENTE:9,NON_QUALIFIE:2,VALIDE_AUTOMATISE:205,PARTIELLEMENT_QUALIFIE:3});
 const proof=row(source,'PRF112-15');
 assert.equal(proof.source,'https://github.com/'+source.repository+'/blob/6e5999aa2507e296f754f581e5b97caa566fb7f2/docs/qa/v112-ground-deposit-composition/composed-review.md');
 for(const commit of ['6e5999aa2507e296f754f581e5b97caa566fb7f2','e0347c7645667c6dd7fabc48527704d4b5f1ca32','9e463aa136c97e102dc9a975405370a4c7bc5d3a'])assert.ok(proof.acceptance.includes(commit));
 for(const target of ['ROU112-05','CHA112-05']){const entry=sheet(source,'Reprise').rows.find(r=>r.target===target);assert.equal(entry.proofs,'PRF112-15');assert.equal(entry.status,'VALIDE_AUTOMATISE');assert.match(entry.scope,/géométrique/);assert.match(entry.scope,/abandon/);assert.match(entry.scope,/REM112-08/);}
 assert.equal(states.get('REM112-08'),'NON_QUALIFIE');
});
