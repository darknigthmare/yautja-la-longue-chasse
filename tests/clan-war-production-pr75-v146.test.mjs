import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";
const file="docs/clan-war-v146/Yautja_Guerres_Clans_Provenance_V146_2026-11-01.xlsx";
function unpack(path){
 const binary=readFileSync(path);
 assert.ok(binary.length>70000,"V146 workbook missing historical V145 pages");
 let end=-1;
 for(let i=binary.length-22;i>=Math.max(0,binary.length-65557);i--)
  if(binary.readUInt32LE(i)===0x06054b50){end=i;break;}
 assert.ok(end>=0,"XLSX EOCD missing");
 const count=binary.readUInt16LE(end+10),found=new Map();
 let cursor=binary.readUInt32LE(end+16);
 for(let i=0;i<count;i++){
  assert.equal(binary.readUInt32LE(cursor),0x02014b50);
  const method=binary.readUInt16LE(cursor+10),size=binary.readUInt32LE(cursor+20);
  const names=binary.readUInt16LE(cursor+28),extra=binary.readUInt16LE(cursor+30),
   comment=binary.readUInt16LE(cursor+32),local=binary.readUInt32LE(cursor+42);
  const name=binary.subarray(cursor+46,cursor+46+names).toString("utf8");
  assert.equal(binary.readUInt32LE(local),0x04034b50);
  const start=local+30+binary.readUInt16LE(local+26)+binary.readUInt16LE(local+28);
  if(name.endsWith(".xml")){
   const data=binary.subarray(start,start+size);
   assert.ok(method===0||method===8);
   found.set(name,(method===8?inflateRawSync(data):data).toString("utf8"));
  }
  cursor+=46+names+extra+comment;
 }
 return found;
}
const xml=unpack(file),book=xml.get("xl/workbook.xml")??"";
const sheets=[...xml].filter(([path])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(path));
const body=sheets.map(([,contents])=>contents).join("\n");
const uniq=rx=>new Set([...body.matchAll(rx)].map(x=>x[0])).size;

test("V146 XLSX has 26 actual sheets, preserving all nine V144 and 19 V145 legacy sheets",()=>{
 assert.equal(sheets.length,26);
 for(const name of ["00_PILOTAGE","01_ASSAUT","02_OUTER_OPS","03_INFILTRATION","04_RTS",
   "05_QA","06_CONTRAT_V6_V85","07_MANQUANTS_1TO1","08_HISTORIQUE",
   "09_ASSAUT_V145","10_OUTER_OPS_V145","11_INFILTRATION_V145",
   "12_RTS_V145","13_QA_V145","14_SECURITE_V145","15_MAPPING_V145",
   "16_BACKLOG_V145","17_CROISEMENTS_V145","18_PILOTAGE_V145",
   "19_GEO_V146","20_ROSTER_V146","21_MODES_V146","22_QA_V146",
   "23_PROVENANCE_V146","24_BACKLOG_V146","25_PILOTAGE_V146"])
  assert.ok(book.includes('name="'+name+'"'),"Missing "+name);
});
test("V146 workbook has 32 four-mode requirements, 24 QA, 12 historical map examples and 12 open roadmap tasks",()=>{
 for(const mode of ["ASS","OUT","INF","RTS"]){
  assert.equal(uniq(new RegExp("CW146-"+mode+"-\\d{3}","g")),8,mode+" production");
  assert.equal(uniq(new RegExp("QA146-"+mode+"-\\d{2}","g")),6,mode+" QA");
 }
 assert.equal(uniq(/CW146-(?:ASS|OUT|INF|RTS)-\d{3}/g),32);
 assert.equal(uniq(/QA146-(?:ASS|OUT|INF|RTS)-\d{2}/g),24);
 assert.equal(uniq(/GEO146-\d{2}/g),12);
 assert.equal(uniq(/ID146-\d{2}/g),8);
 assert.equal(uniq(/SEC146-\d{2}/g),10);
 assert.equal(uniq(/BACK146-\d{2}/g),12);
 assert.ok(body.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/60"));
});
test("V146 source-origin ledger maintains the no-fake-mapping barrier and dynamic dashboard",()=>{
 for(const check of ["auditWarTerritorySourcesV146","auditWarRosterSourcesV146",
   "inspectWarSourcesV146","warSourceReceiptFingerprintV146",
   "W3-K01","CON-T01","Non prouvé","À développer","Validé CI ciblée"]){
  assert.ok(body.includes(check),"Missing provenance proof: "+check);
 }
 const dashboard=xml.get("xl/worksheets/sheet26.xml")??"";
 assert.ok(dashboard.includes("COUNTIF")&&dashboard.includes("COUNTA"),"V146 dashboard formulas missing");
 for(const err of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
  assert.ok(!body.includes(err),"Excel formula error: "+err);
});
