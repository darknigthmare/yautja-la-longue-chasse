import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";
const filename="docs/clan-war-v144/Yautja_Guerres_Clans_Contrats_Bilans_V144_2026-10-31.xlsx";
const data=readFileSync(filename);
function decodeXlsx(b){
 assert.ok(b.length>24000,"The historical tracking addendum appears truncated");
 let tail=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)
  if(b.readUInt32LE(i)===0x06054b50){tail=i;break;}
 assert.ok(tail>=0,"Invalid XLSX ZIP central-directory trailer");
 const count=b.readUInt16LE(tail+10);
 let offset=b.readUInt32LE(tail+16);
 const files=new Map();
 for(let i=0;i<count;i++){
  assert.equal(b.readUInt32LE(offset),0x02014b50,"ZIP central entry");
  const method=b.readUInt16LE(offset+10),size=b.readUInt32LE(offset+20);
  const nameLen=b.readUInt16LE(offset+28),extra=b.readUInt16LE(offset+30),comment=b.readUInt16LE(offset+32);
  const local=b.readUInt32LE(offset+42),name=b.subarray(offset+46,offset+46+nameLen).toString("utf8");
  assert.equal(b.readUInt32LE(local),0x04034b50);
  const from=local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28);
  if(name.endsWith(".xml")){
   const raw=b.subarray(from,from+size);
   assert.ok(method===0||method===8);
   files.set(name,(method===8?inflateRawSync(raw):raw).toString("utf8"));
  }
  offset+=46+nameLen+extra+comment;
 }
 return files;
}
const xml=decodeXlsx(data);
const workbook=xml.get("xl/workbook.xml")??"";
const sheets=[...xml].filter(([name])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(name));
const contents=sheets.map(([,src])=>src).join("\n");
const uniq=rx=>new Set([...contents.matchAll(rx)].map(x=>x[0])).size;

test("V144 XLSX is the real companion of the preserved V143 73-sheet ledger",()=>{
 assert.equal(sheets.length,9);
 for(const name of ["00_PILOTAGE","01_ASSAUT","02_OUTER_OPS","03_INFILTRATION","04_RTS",
                    "05_QA","06_CONTRAT_V6_V85","07_MANQUANTS_1TO1","08_HISTORIQUE"]){
  assert.ok(workbook.includes('name="'+name+'"'),name+" not found");
 }
 assert.ok(contents.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/54"));
 assert.ok(contents.includes("V143"));
});
test("V144 companion contains 64 requirements, 24 QA, 12 mapping safeguards and 20 art/gameplay gaps",()=>{
 for(const mode of ["ASS","OUT","INF","RTS"]){
  assert.equal(uniq(new RegExp("CW144-"+mode+"-\\d{3}","g")),16,mode+" requirements");
  assert.equal(uniq(new RegExp("QA144-"+mode+"-\\d{2}","g")),6,mode+" QA cases");
 }
 assert.equal(uniq(/CW144-(?:ASS|OUT|INF|RTS)-\d{3}/g),64);
 assert.equal(uniq(/QA144-(?:ASS|OUT|INF|RTS)-\d{2}/g),24);
 assert.equal(uniq(/BR144-\d{3}/g),12);
 assert.equal(uniq(/BACK144-\d{3}/g),20);
});
test("V144 data retains no false claim of V85 writes or completed 1:1 levels",()=>{
 assert.ok(contents.includes("auditWarOperationsDebriefsV144"));
 assert.ok(contents.includes("auditWarRtsDebriefV144"));
 assert.ok(contents.includes("Validé CI V144"));
 assert.ok(contents.includes("Non commencé"));
 assert.ok(contents.includes("Interdit"));
 const dash=sheets[8]?.[1]??""; // summary may be at end in the workbook writer
 assert.ok(contents.includes("COUNTIF")&&contents.includes("COUNTA"),"Dashboard must contain formulas");
 for(const err of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
  assert.ok(!contents.includes(err),"Unexpected formula error: "+err);
 assert.ok(dash.length>0);
});
