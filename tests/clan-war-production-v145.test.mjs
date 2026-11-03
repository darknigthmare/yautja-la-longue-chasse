import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

const FILE="docs/clan-war-v145/Yautja_Guerres_Clans_Avenants_Production_V144_V145_2026-11-01.xlsx";
function readXlsx(file){
 const b=readFileSync(file);assert.ok(b.length>45000,"V144/V145 workbook unexpectedly truncated");
 let end=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)
  if(b.readUInt32LE(i)===0x06054b50){end=i;break;}
 assert.ok(end>=0,"XLSX ZIP trailer not found");
 let index=b.readUInt32LE(end+16),count=b.readUInt16LE(end+10);
 const xml=new Map();
 while(count--){
  assert.equal(b.readUInt32LE(index),0x02014b50);
  const compression=b.readUInt16LE(index+10),size=b.readUInt32LE(index+20);
  const namelen=b.readUInt16LE(index+28),extra=b.readUInt16LE(index+30);
  const comment=b.readUInt16LE(index+32),local=b.readUInt32LE(index+42);
  const name=b.subarray(index+46,index+46+namelen).toString("utf8");
  assert.equal(b.readUInt32LE(local),0x04034b50);
  if(name.endsWith(".xml")){
   const at=local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28);
   const data=b.subarray(at,at+size);
   assert.ok(compression===0||compression===8,"Unknown compression in real Excel");
   xml.set(name,(compression===8?inflateRawSync(data):data).toString("utf8"));
  }
  index+=46+namelen+extra+comment;
 }
 return xml;
}
const parts=readXlsx(FILE),workbook=parts.get("xl/workbook.xml")??"";
const sheets=[...parts].filter(([name])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(name));
const all=sheets.map(([,value])=>value).join("\n");
const unique=re=>new Set([...all.matchAll(re)].map(m=>m[0])).size;

test("V145 production workbook preserves all eight V144 sheets and adds eight real V145 sheets",()=>{
 assert.equal(sheets.length,16);
 for(const name of [
  "ASSAUT_V144","OUTER_OPS_V144","INFILTRATION_V144","RTS_V144",
  "QA_V144","INTERMODES_V144","HISTORIQUE_ET_CANON","SUIVI_V144",
  "ASSAUT_V145","OUTER_OPS_V145","INFILTRATION_V145","RTS_V145",
  "QA_V145","INTERMODES_V145","HISTORIQUE_V145","SUIVI_V145"
 ]) assert.ok(workbook.includes('name="'+name+'"'),"Missing "+name);
 assert.ok(all.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/53"));
 assert.ok(all.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/56"));
 assert.ok(all.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/59"));
 assert.ok(all.includes("NON recopiées")||all.includes("NON recopié"),
  "External 73-sheet V143 must be explicitly documented, not falsely claimed here");
});
test("V145 requirements/QA/contracts have exact unique IDs and source code traceability",()=>{
 for(const code of ["ASS","OUT","INF","RTS"]){
  assert.equal(unique(new RegExp("CW145-"+code+"-\\d{3}","g")),12);
  assert.equal(unique(new RegExp("QA-CW145-"+code+"-\\d{2}","g")),8);
 }
 assert.equal(unique(/CW145-(?:ASS|OUT|INF|RTS)-\d{3}/g),48);
 assert.equal(unique(/QA-CW145-(?:ASS|OUT|INF|RTS)-\d{2}/g),32);
 assert.equal(unique(/INT-CW145-\d{3}/g),12);
 for(const implementation of [
  "commandWarAssaultInterposeV145","warOuterTravelLedgerV145",
  "commandStealthV115","commandWarRtsPostHandoverV145"
 ]) assert.ok(all.includes(implementation),"Missing source in tracker: "+implementation);
});
test("V145 retains honest formula-driven progress, historical V144 IDs and no Excel errors",()=>{
 assert.equal(unique(/CW144-(?:ASS|OUT|INF|RTS)-\d{3}/g),48);
 assert.equal(unique(/QA-CW144-(?:ASS|OUT|INF|RTS)-\d{2}/g),32);
 assert.equal(unique(/INT-CW144-\d{3}/g),12);
 const summary=parts.get("xl/worksheets/sheet16.xml")??"";
 assert.ok(summary.includes("COUNTIF")&&summary.includes("COUNTA"),
  "V145 dashboard requires linked formulas");
 assert.ok(all.includes("Validé CI ciblée"));
 assert.ok(all.includes("Partiel"));
 assert.ok(all.includes("À développer"));
 assert.ok(all.includes("À exécuter manuellement"));
 for(const issue of ["#REF!","#VALUE!","#DIV/0!","#NAME?"])
  assert.ok(!all.includes(issue),"Unexpected spreadsheet formula error "+issue);
});
