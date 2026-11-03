import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

/** Verify the REAL XLSX bytes committed in the V137 PR, not a CSV substitute. */
const XLSX="docs/clan-war-v137/Yautja_Guerres_Clans_Suivi_Production_V137_2026-10-31.xlsx";
function readWorkbookZip(path){
 const raw=readFileSync(path);
 assert.ok(raw.length>220000,"V136 workbook unexpectedly short");
 let eocd=-1;
 for(let i=raw.length-22;i>=Math.max(0,raw.length-65557);i--)
  if(raw.readUInt32LE(i)===0x06054b50){eocd=i;break;}
 assert.ok(eocd>=0,"XLSX lacks central directory");
 const num=raw.readUInt16LE(eocd+10);
 let p=raw.readUInt32LE(eocd+16);
 const xml=new Map();
 for(let i=0;i<num;i++){
  assert.equal(raw.readUInt32LE(p),0x02014b50);
  const method=raw.readUInt16LE(p+10),size=raw.readUInt32LE(p+20);
  const nameLen=raw.readUInt16LE(p+28),extra=raw.readUInt16LE(p+30);
  const comment=raw.readUInt16LE(p+32),offset=raw.readUInt32LE(p+42);
  const name=raw.subarray(p+46,p+46+nameLen).toString("utf8");
  assert.equal(raw.readUInt32LE(offset),0x04034b50);
  const dataAt=offset+30+raw.readUInt16LE(offset+26)+raw.readUInt16LE(offset+28);
  if(name.endsWith(".xml")){
   const compressed=raw.subarray(dataAt,dataAt+size);
   assert.ok(method===0||method===8,"ZIP compression unsupported");
   xml.set(name,(method===8?inflateRawSync(compressed):compressed).toString("utf8"));
  }
  p+=46+nameLen+extra+comment;
 }
 return xml;
}
const files=readWorkbookZip(XLSX);
const book=files.get("xl/workbook.xml")??"";
const sheetFiles=[...files].filter(([p])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(p));
const all=sheetFiles.map(([,text])=>text).join("\n");
const count=(reg,txt=all)=>new Set([...txt.matchAll(reg)].map(m=>m[0])).size;

test("V137 workbook has 31 worksheets and preserves 24 V136 sheets",()=>{
 assert.equal(sheetFiles.length,31);
 for(const name of ["MISSIONS_1200","W3_24_RTS","CARTES_W3_12","W5_CAMPAGNES_36",
  "RTS_V134_SYNCHRO","MODES_V135_PARALLELE","QA_V135",
  "MODES_V136_PARALLELE","QA_V136","INTERMODES_V136","SUIVI_V136",
  "ASSAUT_V137","OUTER_OPS_V137","INFILTRATION_V137","RTS_V137",
  "QA_V137","CROISEMENTS_V137","SUIVI_V137"]){
  assert.ok(book.includes('name="'+name+'"'),"missing sheet "+name);
 }
 assert.ok(all.includes("feat/v137-clan-war-four-modes-20261031"));
});
test("V137 includes 13 tasks and 10 QA checkpoints for each of four game modes",()=>{
 for(const mode of ["ASS","OUT","INF","RTS"]){
  assert.equal(count(new RegExp("CW137-"+mode+"-\\d{3}","g")),13,mode+" production tasks");
  assert.equal(count(new RegExp("QA-CW137-"+mode+"-\\d{2}","g")),10,mode+" QA entries");
 }
 assert.equal(count(/CW137-(?:ASS|OUT|INF|RTS)-\d{3}/g),52);
 assert.equal(count(/QA-CW137-(?:ASS|OUT|INF|RTS)-\d{2}/g),40);
 assert.equal(count(/INT-CW137-\d{3}/g),20);
 assert.ok(all.includes("Validé CI ciblée")&&all.includes("À développer"));
});
test("V137 catalogue IDs, existing lore sheets and dashboard formulas survive",()=>{
 assert.equal(count(/CW120-[AOSR]-(?:OR|LO|HO)-\d{3}/g),1200);
 assert.equal(count(/W3-RTS\d{2}/g),24);
 assert.equal(count(/W3-MAP\d{2}/g),12);
 assert.equal(count(/W5-LM\d{2}/g),36);
 const dashboard=files.get("xl/worksheets/sheet31.xml")??"";
 assert.ok(dashboard.includes("COUNTIF")&&dashboard.includes("COUNTA"),
   "dashboard must use formulas rather than hardcoded status totals");
 for(const error of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])assert.ok(!all.includes(error),error);
});
