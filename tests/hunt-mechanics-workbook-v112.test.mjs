import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
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
 assert.equal(source.sheets.length,21);assert.ok(source.sheets.reduce((n,s)=>n+s.rows.length,0)>=300);
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
