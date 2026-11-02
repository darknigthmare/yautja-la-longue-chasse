import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

const FILE="docs/clan-war-v146/Yautja_Guerres_Clans_Avenants_Production_V144_V146_2026-11-01.xlsx";
function parse(file){
 const data=readFileSync(file);
 assert.ok(data.length>75000,"V146 full 3-version addendum truncated");
 let end=-1;
 for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--)
  if(data.readUInt32LE(i)===0x06054b50){end=i;break;}
 assert.ok(end>=0,"Invalid XLSX ZIP directory");
 let remaining=data.readUInt16LE(end+10),p=data.readUInt32LE(end+16);
 const xml=new Map();
 while(remaining--){
  assert.equal(data.readUInt32LE(p),0x02014b50);
  const size=data.readUInt32LE(p+20),method=data.readUInt16LE(p+10);
  const length=data.readUInt16LE(p+28),extra=data.readUInt16LE(p+30);
  const comment=data.readUInt16LE(p+32),local=data.readUInt32LE(p+42);
  const name=data.subarray(p+46,p+46+length).toString("utf8");
  assert.equal(data.readUInt32LE(local),0x04034b50);
  if(name.endsWith(".xml")){
   const begin=local+30+data.readUInt16LE(local+26)+data.readUInt16LE(local+28);
   const raw=data.subarray(begin,begin+size);
   assert.ok(method===0||method===8);
   xml.set(name,(method===8?inflateRawSync(raw):raw).toString("utf8"));
  }
  p+=46+length+extra+comment;
 }
 return xml;
}
const files=parse(FILE),book=files.get("xl/workbook.xml")??"";
const sheetEntries=[...files].filter(([name])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(name));
const data=sheetEntries.map(([,xml])=>xml).join("\n");
const distinct=regex=>new Set([...data.matchAll(regex)].map(m=>m[0])).size;

test("V146 XLSX really contains 24 sheets and preserves both V144/V145 addenda",()=>{
 assert.equal(sheetEntries.length,24);
 for(const version of ["144","145","146"]){
  for(const sheet of ["ASSAUT","OUTER_OPS","INFILTRATION","RTS","QA","INTERMODES","SUIVI"]){
   const name=sheet+"_V"+version;
   assert.ok(book.includes('name="'+name+'"'),"missing sheet "+name);
  }
 }
 for(const name of ["HISTORIQUE_ET_CANON","HISTORIQUE_V145","CONTINUITE_V85"])
  assert.ok(book.includes('name="'+name+'"'),"missing "+name);
 for(const n of ["53","56","59","61"])
  assert.ok(data.includes("/pull/"+n),"missing historical PR "+n);
 assert.ok(data.includes("73 feuilles")&&data.includes("NON incluses"),
  "source V143 is referenced, not incorrectly claimed as physically copied");
});
test("V146 48 unique requirements, 32 QA, 12 cross-mode and 16 explicit V85 blockers",()=>{
 for(const code of ["ASS","OUT","INF","RTS"]){
  assert.equal(distinct(new RegExp("CW146-"+code+"-\\d{3}","g")),12);
  assert.equal(distinct(new RegExp("QA-CW146-"+code+"-\\d{2}","g")),8);
 }
 assert.equal(distinct(/CW146-(?:ASS|OUT|INF|RTS)-\d{3}/g),48);
 assert.equal(distinct(/QA-CW146-(?:ASS|OUT|INF|RTS)-\d{2}/g),32);
 assert.equal(distinct(/INT-CW146-\d{3}/g),12);
 assert.equal(distinct(/BRG-V146-(?:ASS|OUT|INF|RTS)-\d{2}/g),16);
 assert.ok(data.includes("buildWarCouncilAuditV146"),"Council implementation trace missing");
 assert.ok(data.includes("campagne V85")&&data.includes("aucun résultat"),
  "Spreadsheet must state the restricted campaign handoff using its actual French source text");
});
test("V146 dashboard status formulas and historical records survive export",()=>{
 const dashboard=files.get("xl/worksheets/sheet24.xml")??"";
 assert.ok(dashboard.includes("COUNTIF")&&dashboard.includes("COUNTA"));
 for(const error of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
  assert.ok(!data.includes(error),"Formula error "+error);
 assert.ok(data.includes("Validé CI ciblée"));
 assert.ok(data.includes("Partiel"));
 assert.ok(data.includes("À développer"));
 assert.ok(data.includes("À exécuter manuellement"));
 assert.equal(distinct(/CW144-(?:ASS|OUT|INF|RTS)-\d{3}/g),48);
 assert.equal(distinct(/CW145-(?:ASS|OUT|INF|RTS)-\d{3}/g),48);
});
