import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

const file="docs/clan-war-v144/Yautja_Guerres_Clans_Suivi_Production_V144_2026-10-31_PR57.xlsx";
const bytes=readFileSync(file);
function xmlInWorkbook(){
 assert.ok(bytes.length>20000,"V144 register seems truncated");
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)
  if(bytes.readUInt32LE(i)===0x06054b50){end=i;break;}
 assert.ok(end>=0,"XLSX central directory missing");
 const total=bytes.readUInt16LE(end+10),xml=new Map();
 let offset=bytes.readUInt32LE(end+16);
 for(let i=0;i<total;i++){
  assert.equal(bytes.readUInt32LE(offset),0x02014b50);
  const compression=bytes.readUInt16LE(offset+10),size=bytes.readUInt32LE(offset+20);
  const length=bytes.readUInt16LE(offset+28),extra=bytes.readUInt16LE(offset+30);
  const comment=bytes.readUInt16LE(offset+32),start=bytes.readUInt32LE(offset+42);
  const filename=bytes.subarray(offset+46,offset+46+length).toString("utf8");
  assert.equal(bytes.readUInt32LE(start),0x04034b50);
  const dataAt=start+30+bytes.readUInt16LE(start+26)+bytes.readUInt16LE(start+28);
  if(filename.endsWith(".xml")){
   const raw=bytes.subarray(dataAt,dataAt+size);
   assert.ok(compression===0||compression===8);
   xml.set(filename,(compression===8?inflateRawSync(raw):raw).toString("utf8"));
  }
  offset+=46+length+extra+comment;
 }
 return xml;
}
const files=xmlInWorkbook();
const book=files.get("xl/workbook.xml")??"";
const sheets=[...files].filter(([key])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(key));
const all=sheets.map(([,content])=>content).join("\n");
const unique=regex=>new Set([...all.matchAll(regex)].map(r=>r[0])).size;

test("V144 incremental XLSX has 9 genuine tabs; it links to historical V143 instead of pretending 73 copies",()=>{
 assert.equal(sheets.length,9);
 for(const n of ["PILOTAGE_V144","ASSAUT_V144","OUTER_OPS_V144","INFILTRATION_V144",
  "RTS_V144","QA_V144","INTERMODES_V144","PROVENANCE_V143","ROADMAP_V145"])
  assert.ok(book.includes('name="'+n+'"'),"missing tab "+n);
 assert.ok(all.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/57"));
 assert.ok(all.includes("Yautja_Guerres_Clans_Suivi_Production_V143_2026-10-31.xlsx"));
 assert.ok(all.includes("73 onglets"));
});

test("V144 contains 52 distinct requirements, 32 QA receipts, 16 inter-mode checks, and all four source mechanics",()=>{
 for(const code of ["ASS","OUT","INF","RTS"]){
  assert.equal(unique(new RegExp("CW144-"+code+"-\\d{3}","g")),13,code+" requirements");
  assert.equal(unique(new RegExp("QA-V144-"+code+"-\\d{2}","g")),8,code+" checks");
 }
 assert.equal(unique(/CW144-(?:ASS|OUT|INF|RTS)-\d{3}/g),52);
 assert.equal(unique(/QA-V144-(?:ASS|OUT|INF|RTS)-\d{2}/g),32);
 assert.equal(unique(/CROSS-V144-\d{3}/g),16);
 for(const symbol of ["commandWarAssaultBaseScreenV144","commandWarOuterPaceV144",
  "warStealthReinforcementV144","commandWarRtsSwapV144"])
  assert.ok(all.includes(symbol),"missing traced implementation "+symbol);
});

test("V144 dashboard has formula-driven status, historical design volumes, no spreadsheet errors",()=>{
 const dashboard=files.get("xl/worksheets/sheet9.xml")??"";
 assert.ok(dashboard.includes("COUNTIF")&&dashboard.includes("COUNTA"));
 assert.ok(all.includes("1200")&&all.includes("24")&&all.includes("12")&&all.includes("36"));
 for(const error of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
  assert.equal(all.includes(error),false,"spreadsheet formula error "+error);
});
