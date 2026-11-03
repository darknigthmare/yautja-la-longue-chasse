import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";
const file="docs/clan-war-v145/Yautja_Guerres_Clans_Preuves_Transfert_V145_2026-11-01.xlsx";
function unpack(path){
 const binary=readFileSync(path);
 assert.ok(binary.length>45000,"V145 workbook appears truncated");
 let end=-1;
 for(let i=binary.length-22;i>=Math.max(0,binary.length-65557);i--)
  if(binary.readUInt32LE(i)===0x06054b50){end=i;break;}
 assert.ok(end>=0,"XLSX EOCD absent");
 const count=binary.readUInt16LE(end+10);
 let cursor=binary.readUInt32LE(end+16);
 const map=new Map();
 for(let i=0;i<count;i++){
  assert.equal(binary.readUInt32LE(cursor),0x02014b50);
  const method=binary.readUInt16LE(cursor+10),size=binary.readUInt32LE(cursor+20),
    nameLen=binary.readUInt16LE(cursor+28),extra=binary.readUInt16LE(cursor+30),
    comment=binary.readUInt16LE(cursor+32),local=binary.readUInt32LE(cursor+42);
  const name=binary.subarray(cursor+46,cursor+46+nameLen).toString("utf8");
  assert.equal(binary.readUInt32LE(local),0x04034b50);
  const start=local+30+binary.readUInt16LE(local+26)+binary.readUInt16LE(local+28);
  if(name.endsWith(".xml")){
   const data=binary.subarray(start,start+size);
   assert.ok(method===0||method===8);
   map.set(name,(method===8?inflateRawSync(data):data).toString("utf8"));
  }
  cursor+=46+nameLen+extra+comment;
 }
 return map;
}
const xml=unpack(file);
const book=xml.get("xl/workbook.xml")??"";
const sheets=[...xml].filter(([path])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(path));
const contents=sheets.map(([,source])=>source).join("\n");
const unique=rx=>new Set([...contents.matchAll(rx)].map(x=>x[0])).size;
test("V145 binary XLSX has 19 real sheets and preserves every V144 companion page",()=>{
 assert.equal(sheets.length,19);
 for(const name of ["00_PILOTAGE","01_ASSAUT","02_OUTER_OPS","03_INFILTRATION","04_RTS",
  "05_QA","06_CONTRAT_V6_V85","07_MANQUANTS_1TO1","08_HISTORIQUE",
  "09_ASSAUT_V145","10_OUTER_OPS_V145","11_INFILTRATION_V145","12_RTS_V145",
  "13_QA_V145","14_SECURITE_V145","15_MAPPING_V145","16_BACKLOG_V145",
  "17_CROISEMENTS_V145","18_PILOTAGE_V145"])
  assert.ok(book.includes('name="'+name+'"'),"Missing workbook tab "+name);
});
test("V145 workbook retains 32 source-linked requirements, 24 QA, 14 guards and 12 map anti-forgery examples",()=>{
 for(const mode of ["ASS","OUT","INF","RTS"]){
  assert.equal(unique(new RegExp("CW145-"+mode+"-\\d{3}","g")),8);
  assert.equal(unique(new RegExp("QA145-"+mode+"-\\d{2}","g")),6);
 }
 assert.equal(unique(/CW145-(?:ASS|OUT|INF|RTS)-\d{3}/g),32);
 assert.equal(unique(/QA145-(?:ASS|OUT|INF|RTS)-\d{2}/g),24);
 assert.equal(unique(/SEC145-\d{2}/g),14);
 assert.equal(unique(/MAP145-\d{2}/g),12);
 assert.equal(unique(/BACK145-\d{3}/g),20);
 assert.equal(unique(/X145-\d{2}/g),12);
});
test("V145 ledger keeps W3-K unpaired with CON-T and formula-driven non-conquest status",()=>{
 assert.ok(contents.includes("W3-K01"));
 assert.ok(contents.includes("CON-T01"));
 assert.ok(contents.includes("Non apparié"));
 assert.ok(contents.includes("reviewWarProofSyncV145"));
 assert.ok(contents.includes("importWarProofV145"));
 assert.ok(contents.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/58"));
 const dashboard=xml.get("xl/worksheets/sheet19.xml")??"";
 assert.ok(dashboard.includes("COUNTIF")&&dashboard.includes("COUNTA"),"Dashboard must be formula-driven");
 for(const error of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
  assert.ok(!contents.includes(error),"Formula error detected: "+error);
});
