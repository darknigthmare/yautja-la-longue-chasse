import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
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
 assert.equal(source.sheets.length,19);assert.ok(source.sheets.reduce((n,s)=>n+s.rows.length,0)>=300);
 const future=source.sheets.find(s=>s.name==='FermetureFUT');
 assert.deepEqual(future.rows.map(r=>r.id),Array.from({length:12},(_,i)=>'FUT-'+String(i+1).padStart(2,'0')));
 assert.ok(source.sheets.some(s=>s.rows.some(r=>r.status==='NON_QUALIFIE')));
});
test('V112 OOXML package uses nineteen unique relationships, frozen headers and text rather than executable formulas',()=>{
 const sheets=entries(buildHuntMechanicsWorkbook(source)),workbook=sheets.get('xl/workbook.xml'),rels=sheets.get('xl/_rels/workbook.xml.rels');
 assert.equal((workbook.match(/<sheet name=/g)??[]).length,19);assert.equal((rels.match(/Type="[^"]+\/worksheet"/g)??[]).length,19);
 assert.equal((rels.match(/Id="rId20"/g)??[]).length,1);
 assert.equal((sheets.get('docProps/app.xml').match(/<vt:lpstr>/g)??[]).length,19);
 for(let index=1;index<=19;index++){const xml=sheets.get('xl/worksheets/sheet'+index+'.xml');assert.match(xml,/state="frozen"/);assert.match(xml,/<autoFilter ref=/);assert.doesNotMatch(xml,/<f(?:>| )/);}
 const special=copy(source);special.sheets[0].rows[0].rule='=HYPERLINK("https://invalid", "not executed") <>&';
 const xml=entries(buildHuntMechanicsWorkbook(special)).get('xl/worksheets/sheet1.xml');
 assert.match(xml,/t="inlineStr"/);assert.ok(xml.includes('=HYPERLINK(&quot;https://invalid&quot;'));assert.doesNotMatch(xml,/<f>/);
});
test('invalid workbook schema, duplicate identities, unknown cells and nonfinite numbers are refused',()=>{
 for(const mutate of [s=>s.release='V999',s=>s.sheets.pop(),s=>s.sheets[1].rows[0].id=s.sheets[0].rows[0].id,
  s=>s.sheets[0].rows[0].unrecognized='not a column',s=>s.sheets[0].rows[0].rule=Infinity]){
  const invalid=copy(source);mutate(invalid);assert.throws(()=>buildHuntMechanicsWorkbook(invalid));
 }
});
