import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

/** Verify the REAL XLSX bytes committed in the V136 PR, not a CSV substitute. */
const XLSX="docs/clan-war-v136/Yautja_Guerres_Clans_Suivi_Production_V136_2026-10-31.xlsx";
function readWorkbookZip(path){
 const raw=readFileSync(path);
 assert.ok(raw.length>205000,"V136 workbook unexpectedly short");
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

test("V136 workbook: 24 real XLSX worksheets; 20 inherited and 4 new production worksheets",()=>{
 assert.equal(sheetFiles.length,24);
 for(const name of ["00_PILOTAGE","MODES_V135_PARALLELE","QA_V135","RTS_V134_SYNCHRO",
  "MODES_V136_PARALLELE","QA_V136","INTERMODES_V136","SUIVI_V136",
  "MISSIONS_1200","W3_24_RTS","CARTES_W3_12","W5_CAMPAGNES_36"])
  assert.ok(book.includes('name="'+name+'"'),"missing "+name);
 assert.ok(all.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/45"));
});

test("V136 workbook: 48 uniquely tracked mode requirements, 32 tests, 16 cross-mode interfaces",()=>{
 for(const mode of ["ASS","OUT","INF","RTS"]){
  assert.equal(count(new RegExp("CW136-"+mode+"-\\d{3}","g")),12,mode+" tasks");
  assert.equal(count(new RegExp("QA-CW136-"+mode+"-\\d{2}","g")),8,mode+" QA checks");
 }
 assert.equal(count(/CW136-(?:ASS|OUT|INF|RTS)-\d{3}/g),48);
 assert.equal(count(/QA-CW136-(?:ASS|OUT|INF|RTS)-\d{2}/g),32);
 const matrix=files.get("xl/worksheets/sheet23.xml")??"";
 const rowNumbers=[...matrix.matchAll(/<(?:[A-Za-z_][\w.-]*:)?row[^>]*\sr="(\d+)"/g)].map(m=>Number(m[1]));
 assert.equal(rowNumbers.filter(n=>n>=5&&n<=20).length,16);
 assert.ok(all.includes("Validé CI ciblée")&&all.includes("À développer"),
  "not all statuses may be marked complete");
});

test("V136 workbook: source variations and W3/W5 geography remain untouched",()=>{
 assert.equal(count(/CW120-[AOSR]-(?:OR|LO|HO)-\d{3}/g),1200);
 assert.equal(count(/W3-RTS\d{2}/g),24);
 assert.equal(count(/W3-MAP\d{2}/g),12);
 assert.equal(count(/W5-LM\d{2}/g),36);
 assert.ok(!all.includes("#REF!"),"broken source references in cells");
});
