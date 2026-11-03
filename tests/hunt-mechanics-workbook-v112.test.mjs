import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {buildHuntMechanicsWorkbook} from '../scripts/build-hunt-mechanics-workbook-v112.mjs';
const source=JSON.parse(await fs.readFile(new URL('../docs/hunt-mechanics-v112.json',import.meta.url),'utf8'));
const copy=value=>JSON.parse(JSON.stringify(value));
function entries(bytes){
 const buffer=Buffer.from(bytes),files=new Map();let offset=0;
 while(buffer.readUInt32LE(offset)===0x04034b50){
  assert.equal(buffer.readUInt16LE(offset+8),0,'deterministic stored ZIP members');
  const length=buffer.readUInt32LE(offset+18),nameLength=buffer.readUInt16LE(offset+26),extra=buffer.readUInt16LE(offset+28);
  const start=offset+30+nameLength+extra,name=buffer.subarray(offset+30,offset+30+nameLength).toString('utf8');
  assert.ok(!files.has(name));files.set(name,buffer.subarray(start,start+length).toString('utf8'));offset=start+length;
 }assert.equal(buffer.readUInt32LE(offset),0x02014b50);return files;
}
test('V112 workbook reproduces its delivered bytes and keeps every future requirement individually visible',async()=>{
 const one=buildHuntMechanicsWorkbook(source),two=buildHuntMechanicsWorkbook(copy(source));
 assert.deepEqual(one,two);assert.deepEqual(Buffer.from(one),await fs.readFile(new URL('../docs/YAUTJA_V112_MECANIQUES_CHASSE.xlsx',import.meta.url)));
 assert.equal(source.sheets.length,source.schemaVersion===3?22:21);assert.ok(source.sheets.reduce((n,s)=>n+s.rows.length,0)>=300);
 const future=source.sheets.find(s=>s.name==='FermetureFUT');
 assert.deepEqual(future.rows.map(r=>r.id),Array.from({length:12},(_,i)=>'FUT-'+String(i+1).padStart(2,'0')));
 assert.ok(source.sheets.some(s=>s.rows.some(r=>r.status==='NON_QUALIFIE')));
});
test('V112 OOXML package uses unique relationships, frozen headers and text rather than executable formulas',()=>{
 const sheets=entries(buildHuntMechanicsWorkbook(source)),workbook=sheets.get('xl/workbook.xml'),rels=sheets.get('xl/_rels/workbook.xml.rels');
 assert.equal((workbook.match(/<sheet name=/g)??[]).length,source.sheets.length);assert.equal((rels.match(/Type="[^"]+\/worksheet"/g)??[]).length,source.sheets.length);
 assert.equal((rels.match(new RegExp('Id="rId'+(source.sheets.length+1)+'"','g'))??[]).length,1);
 assert.equal((sheets.get('docProps/app.xml').match(/<vt:lpstr>/g)??[]).length,source.sheets.length);
 for(let index=1;index<=source.sheets.length;index++){const xml=sheets.get('xl/worksheets/sheet'+index+'.xml');assert.match(xml,/state="frozen"/);assert.match(xml,/<autoFilter ref=/);assert.doesNotMatch(xml,/<f(?:>| )/);}
 const special=copy(source);special.sheets.find(s=>s.name==='Qualification').rows.find(r=>r.id==='QA112-45').rule='=HYPERLINK("https://invalid", "not executed") <>&';
 const qualifiedSheet=source.sheets.findIndex(s=>s.name==='Qualification')+1;
 const xml=entries(buildHuntMechanicsWorkbook(special)).get('xl/worksheets/sheet'+qualifiedSheet+'.xml');
 assert.match(xml,/t="inlineStr"/);assert.ok(xml.includes('=HYPERLINK(&quot;https://invalid&quot;'));assert.doesNotMatch(xml,/<f>/);
});
test('invalid workbook schema, duplicate identities, unknown cells and nonfinite numbers are refused',()=>{
 for(const mutate of [s=>s.release='V999',s=>s.sheets.pop(),s=>s.sheets[1].rows[0].id=s.sheets[0].rows[0].id,
  s=>s.sheets[0].rows[0].unrecognized='not a column',s=>s.sheets[0].rows[0].rule=Infinity]){
  const invalid=copy(source);mutate(invalid);assert.throws(()=>buildHuntMechanicsWorkbook(invalid));
 }
});

test('closure cannot discard an original item, invent evidence or hide an unresolved human check',()=>{
 const mutateCases=[
  s=>s.closureBaseline.rows.pop(),
  s=>s.sheets[0].rows[0].rule+=' lowered',
  s=>s.sheets.find(x=>x.name==='Cloture').rows[0].criterion+=' amended',
  s=>s.sheets.find(x=>x.name==='Qualification').rows.find(r=>r.status==='VALIDE_AUTOMATISE').acceptance='commit absent ; commande test',
  s=>s.sheets.find(x=>x.name==='Pendule').rows.shift(),
  s=>s.sheets.find(x=>x.name==='Cloture').rows[0].status='UNVERIFIED_SUCCESS',
  s=>s.sheets.find(x=>x.name==='Cloture').rows.find(r=>r.status==='VALIDE_AUTOMATISE').proofs='NONEXISTENT',
  s=>s.sheets.find(x=>x.name==='Cloture').rows.find(r=>r.status==='VALIDE_AUTOMATISE').kind='REVUE_DOCUMENTAIRE',
  s=>s.sheets.find(x=>x.name==='Cloture').rows.find(r=>r.status==='NON_QUALIFIE'||r.status==='PARTIELLEMENT_QUALIFIE').remaining='',
  s=>s.sheets.find(x=>x.name==='Restant').rows[0].status='VALIDE_AUTOMATISE',
  s=>s.sheets.find(x=>x.name==='Restant').rows.splice(6,1),
 ];
 for(const mutate of mutateCases){const invalid=copy(source);mutate(invalid);assert.throws(()=>buildHuntMechanicsWorkbook(invalid));}
});

test('all 362 original cell contracts and archived open criteria retain independent SHA256 identities',()=>{
 const mutable=new Set(['QA112-41','PRF112-03','PRF112-04']);
 assert.equal(source.closureBaseline.commit,'f1856f6670fd959ed012c38f84e6d90d6f86a361');
 assert.equal(source.closureBaseline.sourceBlobSha,'12cf521e922693b8e5953424e3d1ef3cb6e82a80');
 const current=new Map(source.sheets.filter(s=>!['Cloture','Restant'].includes(s.name)).flatMap(s=>s.rows.map(r=>[r.id,r])));
 const archive=new Map(source.sheets.find(s=>s.name==='Cloture').rows.map(r=>[r.target,r.criterion]));
 for(const baseline of source.closureBaseline.rows){
   const row=current.get(baseline.id);
   const cells=Object.entries(row).filter(([key])=>key!=='status'&&!(key==='acceptance'&&mutable.has(row.id))).sort(([a],[b])=>a<b?-1:a>b?1:0);
   const actual=createHash('sha256').update(JSON.stringify(Object.fromEntries(cells)),'utf8').digest('hex');
   assert.equal(actual,baseline.contentSha256,baseline.id+' immutable cells');
   if(archive.has(baseline.id))assert.equal(createHash('sha256').update(archive.get(baseline.id),'utf8').digest('hex'),baseline.criterionSha256,baseline.id+' original criterion');
 }
 const allowed=copy(source);
 for(const sheet of allowed.sheets)for(const row of sheet.rows)if(mutable.has(row.id))row.acceptance+=' Updated evidence context.';
 assert.doesNotThrow(()=>buildHuntMechanicsWorkbook(allowed));
});

test('schema 2 compacts inline XML without losing edge or interior whitespace',()=>{
 const plain=copy(source);plain.sheets[0].title='Inside  spacing';
 const plainSheet=entries(buildHuntMechanicsWorkbook(plain)).get('xl/worksheets/sheet1.xml');
 assert.ok(plainSheet.includes('<t>Inside  spacing</t>'));
 const edged=copy(source);edged.sheets[0].title='  Edge text  ';
 const edgedSheet=entries(buildHuntMechanicsWorkbook(edged)).get('xl/worksheets/sheet1.xml');
 assert.ok(edgedSheet.includes('<t xml:space="preserve">  Edge text  </t>'));
 assert.ok(!edgedSheet.includes('<t>  Edge text  </t>'));
});

function sourceBindings(data, files) {
 const bindings=new Map();
 data.sheets.forEach((sheet,index)=>{
  const rels=files.get('xl/worksheets/_rels/sheet'+(index+1)+'.xml.rels');
  if(!rels)return;
  const targets=new Map([...rels.matchAll(/<Relationship Id="([^"]+)"[^>]* Target="([^"]+)"/g)].map(m=>[m[1],m[2]]));
  const xml=files.get('xl/worksheets/sheet'+(index+1)+'.xml');
  const links=new Map([...xml.matchAll(/<hyperlink ref="([^"]+)" r:id="([^"]+)"/g)].map(m=>[m[1],m[2]]));
  const column=String.fromCharCode(65+sheet.columns.findIndex(c=>c.key==='source'));
  sheet.rows.forEach((row,i)=>{if(links.has(column+(i+5)))bindings.set(row.id,targets.get(links.get(column+(i+5))));});
 });
 return bindings;
}

test('schema 2 activates print scaling only by explicit option while retaining all 569 historical destinations',()=>{
 const enabled=copy(source);enabled.printLayout={fitToPage:true};
 const built=entries(buildHuntMechanicsWorkbook(enabled));
 for(let i=1;i<=source.sheets.length;i++){
  const xml=built.get('xl/worksheets/sheet'+i+'.xml');
  assert.match(xml,/<sheetPr><pageSetUpPr fitToPage="1"\/><\/sheetPr><dimension/);
  assert.match(xml,/<pageSetup paperSize="8" orientation="landscape" fitToWidth="1" fitToHeight="0"\/>/);
 }
 const oldIds=new Set([
  ...source.closureBaseline.rows.map(r=>r.id),
  'ATL112-12','ATL112-13',
  ...Array.from({length:52},(_,i)=>'QA112-'+String(i+1).padStart(2,'0')),
  ...Array.from({length:12},(_,i)=>'PRF112-'+String(i+1).padStart(2,'0')),
  ...Array.from({length:219},(_,i)=>'CLS112-'+String(i+1).padStart(3,'0')),
  ...Array.from({length:8},(_,i)=>'REM112-'+String(i+1).padStart(2,'0')),
 ]);
 const legacy=[...sourceBindings(source,built)].filter(([id])=>oldIds.has(id)).sort(([a],[b])=>a<b?-1:a>b?1:0);
 assert.equal(legacy.length,569);
 assert.equal(createHash('sha256').update(JSON.stringify(Object.fromEntries(legacy))).digest('hex'),'13b9547c6ddc97488018630b8762ce05354424b0ca70d5cfa82832a1feb13eff');
 const old=copy(source);old.schemaVersion=1;old.sheets=old.sheets.filter(s=>!['Cloture','Restant','Reprise'].includes(s.name));
 for(const [name,xml] of entries(buildHuntMechanicsWorkbook(old)))if(/^xl\/worksheets\/sheet\d+\.xml$/.test(name))assert.doesNotMatch(xml,/<sheetPr>|fitToPage=/);
 for(const value of [null,{},[],{fitToPage:'true'},{fitToPage:true,unknown:true}]){
  const invalid=copy(source);invalid.printLayout=value;assert.throws(()=>buildHuntMechanicsWorkbook(invalid),/print layout option/);
 }
});

test('the frozen e4 source retains its exact 21-sheet bytes before and after opting into print scaling',async()=>{
 const raw=gunzipSync(await fs.readFile(new URL('./fixtures/hunt-mechanics-e4a6c64-v112.json.gz',import.meta.url)));
 assert.equal(createHash('sha256').update(raw).digest('hex'),'76b33d9f2acadf9bc6f07f395c545c0873c83a41d27f5168ac083bb5a4b9a8ff');
 const legacy=JSON.parse(raw),before=Buffer.from(buildHuntMechanicsWorkbook(legacy));
 assert.equal(before.length,722729);assert.equal(createHash('sha256').update(before).digest('hex'),'9e46b2e8ab8f8482458b79aaaf1c7d53bcd299fa25d443f465ac5d3ac367e58e');
 legacy.printLayout={fitToPage:false};assert.deepEqual(Buffer.from(buildHuntMechanicsWorkbook(legacy)),before);
 legacy.printLayout={fitToPage:true};const printable=Buffer.from(buildHuntMechanicsWorkbook(legacy));
 assert.equal(printable.length,723716);assert.equal(createHash('sha256').update(printable).digest('hex'),'2f23e46bbbddff5cafaeb03efe43a97768675f7663544b994728bc3fa4a2b0f8');
});

test('JavaScript and Python preserve only repository source URLs pinned to a full SHA',async()=>{
 const prefix='https://github.com/'+source.repository+'/blob/e4a6c64a1e77edad8865aa05ca7c2901d62bfa09/';
 const valid=['app/game/engine.ts','docs/hunt-mechanics-v112.md','scripts/build-hunt-mechanics-workbook-v112.mjs','tests/hunt-mechanics-workbook-v112.test.mjs','public/game/test_asset-1.png'].map(path=>prefix+path);
 const invalid=[
  prefix.replace('/blob/e4a6c64a1e77edad8865aa05ca7c2901d62bfa09/','/blob/main/')+'scripts/test.mjs',
  prefix.replace('e4a6c64a1e77edad8865aa05ca7c2901d62bfa09','e4a6c64')+'scripts/test.mjs',
  prefix.replace(source.repository,'other/repository')+'scripts/test.mjs',
  prefix.replace('https:','http:')+'scripts/test.mjs',
  prefix.replace('github.com','github.com.invalid')+'scripts/test.mjs',
  prefix+'private/test.mjs',prefix+'scripts/test.mjs?ref=main',prefix+'scripts/test.mjs#fragment',
  prefix+'scripts/../test.mjs',prefix+'scripts/./test.mjs',prefix+'scripts//test.mjs',prefix+'scripts/%2e%2e/test.mjs',
 ];
 const cases=[];
 for(const url of [...valid,...invalid]){
  const candidate=copy(source),proofs=candidate.sheets.find(s=>s.name==='Preuves');
  proofs.rows.push({id:'URL-TEST',status:'DOCUMENTE',topic:'Synthetic URL test',rule:'No qualification claimed.',source:url,acceptance:'Test fixture only.'});
  if(invalid.includes(url))assert.throws(()=>buildHuntMechanicsWorkbook(candidate),/Source URL must pin/);
  else assert.equal(sourceBindings(candidate,entries(buildHuntMechanicsWorkbook(candidate))).get('URL-TEST'),url);
  cases.push({url,valid:valid.includes(url)});
 }
 const python=String.raw`
import importlib.util,json,sys
spec=importlib.util.spec_from_file_location('v112_verifier',sys.argv[1])
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
payload=json.load(sys.stdin)
for case in payload['cases']:
    try:
        target=module.source_url(payload['source'],{'source':case['url'],'status':'DOCUMENTE'})
    except AssertionError:
        assert not case['valid'],case['url']
    else:
        assert case['valid'] and target==case['url'],case['url']
`;
 await new Promise((resolve,reject)=>{
  const child=spawn('python3',['-c',python,fileURLToPath(new URL('../scripts/verify-hunt-mechanics-workbook-v112.py',import.meta.url))],{timeout:10000});
  let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk});
  child.on('error',reject);child.on('close',code=>{try{assert.equal(code,0,stderr);resolve()}catch(error){reject(error)}});
  child.stdin.end(JSON.stringify({source,cases}));
 });
});
