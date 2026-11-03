import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

const FILE="docs/clan-war-v147/Yautja_Guerres_Clans_Avenants_Production_V144_V147_2026-11-01.xlsx";
function extractXml(file){
 const b=readFileSync(file);assert.ok(b.length>100000,"Workbook history unexpectedly truncated");
 let end=-1;
 for(let p=b.length-22;p>=Math.max(0,b.length-65557);p--){
  if(b.readUInt32LE(p)===0x06054b50){end=p;break;}
 }
 assert.ok(end>=0,"XLSX ZIP central directory missing");
 const xml=new Map(),count=b.readUInt16LE(end+10);
 let cursor=b.readUInt32LE(end+16);
 for(let n=0;n<count;n++){
  assert.equal(b.readUInt32LE(cursor),0x02014b50);
  const method=b.readUInt16LE(cursor+10),size=b.readUInt32LE(cursor+20);
  const nameLen=b.readUInt16LE(cursor+28),extra=b.readUInt16LE(cursor+30);
  const comment=b.readUInt16LE(cursor+32),local=b.readUInt32LE(cursor+42);
  const name=b.subarray(cursor+46,cursor+46+nameLen).toString("utf8");
  assert.equal(b.readUInt32LE(local),0x04034b50);
  if(name.endsWith(".xml")){
   const start=local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28);
   const raw=b.subarray(start,start+size);
   assert.ok(method===0||method===8,"Unsupported ZIP compression method");
   xml.set(name,(method===8?inflateRawSync(raw):raw).toString("utf8"));
  }
  cursor+=46+nameLen+extra+comment;
 }
 return xml;
}
const xml=extractXml(FILE),workbook=xml.get("xl/workbook.xml")??"";
const sheets=[...xml].filter(([key])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(key));
const body=sheets.map(([,value])=>value).join("\n");
const distinct=pattern=>new Set([...body.matchAll(pattern)].map(x=>x[0])).size;

test("V147 binary workbook really preserves V144–V146 and has eight new reconciliation sheets",()=>{
 assert.equal(sheets.length,32);
 for(const version of ["144","145","146","147"]){
  for(const name of ["ASSAUT","OUTER_OPS","INFILTRATION","RTS","QA","SUIVI"]){
   assert.ok(workbook.includes('name="'+name+"_V"+version+'"'),"Missing "+name+"_V"+version);
  }
 }
 for(const name of ["CONTINUITE_V85","INTERMODES_V147","DEPENDANCES_V147"]){
  assert.ok(workbook.includes('name="'+name+'"'),"Missing "+name);
 }
 for(const pr of ["61","68","70","72","76"]){
  assert.ok(body.includes("/pull/"+pr),"Missing tracked GitHub source PR "+pr);
 }
 assert.ok(body.includes("V85")&&body.includes("W3"),"W3/V85 separation lost");
});
test("V147 contains exactly 48 tasks, 32 QA procedures and 12 cross-mode contracts",()=>{
 for(const mode of ["ASS","OUT","INF","RTS"]){
  assert.equal(distinct(new RegExp("CW147-"+mode+"-\\d{3}","g")),12,mode+" tasks");
  assert.equal(distinct(new RegExp("QA-CW147-"+mode+"-\\d{2}","g")),8,mode+" QA");
 }
 assert.equal(distinct(/CW147-(?:ASS|OUT|INF|RTS)-\d{3}/g),48);
 assert.equal(distinct(/QA-CW147-(?:ASS|OUT|INF|RTS)-\d{2}/g),32);
 assert.equal(distinct(/INT-CW147-\d{3}/g),12);
 for(const symbol of [
  "warAssaultContactV141","clanWarOuterPaceV144",
  "clanWarStealthReinforcementV144","clanWarCouncilAuditV146"
 ]) assert.ok(body.includes(symbol),"Lost source trace "+symbol);
});
test("V147 formula-driven dashboard and historical QA remain physically preserved",()=>{
 assert.equal(distinct(/CW146-(?:ASS|OUT|INF|RTS)-\d{3}/g),48);
 assert.equal(distinct(/CW145-(?:ASS|OUT|INF|RTS)-\d{3}/g),48);
 assert.equal(distinct(/CW144-(?:ASS|OUT|INF|RTS)-\d{3}/g),48);
 const overview=xml.get("xl/worksheets/sheet32.xml")??"";
 assert.ok(overview.includes("COUNTIF")&&overview.includes("COUNTA"),
  "Production dashboard must use live formulas");
 for(const e of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
  assert.ok(!body.includes(e),"Spreadsheet formula error "+e);
 assert.ok(body.includes("Validé CI ciblée"));
 assert.ok(body.includes("À développer"));
 assert.ok(body.includes("QA manuelle")||body.includes("À exécuter manuellement"));
});
