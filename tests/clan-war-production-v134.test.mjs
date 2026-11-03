import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

const FILE="docs/clan-war-v134/Yautja_Guerres_Clans_Suivi_Production_V134_2026-10-31.xlsx";
function readOpenXml(path){
 const bytes=readFileSync(path);
 assert.ok(bytes.length>180000,"Classeur de production V134 vide/tronqué");
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)
  if(bytes.readUInt32LE(i)===0x06054b50){end=i;break;}
 assert.ok(end>=0,"ZIP XLSX sans répertoire");
 const count=bytes.readUInt16LE(end+10);let ptr=bytes.readUInt32LE(end+16);
 const files=new Map();
 for(let i=0;i<count;i++){
  assert.equal(bytes.readUInt32LE(ptr),0x02014b50);
  const compression=bytes.readUInt16LE(ptr+10),size=bytes.readUInt32LE(ptr+20);
  const nameSize=bytes.readUInt16LE(ptr+28),extra=bytes.readUInt16LE(ptr+30);
  const comment=bytes.readUInt16LE(ptr+32),offset=bytes.readUInt32LE(ptr+42);
  const name=bytes.subarray(ptr+46,ptr+46+nameSize).toString("utf8");
  assert.equal(bytes.readUInt32LE(offset),0x04034b50);
  const payload=offset+30+bytes.readUInt16LE(offset+26)+bytes.readUInt16LE(offset+28);
  const data=bytes.subarray(payload,payload+size);
  if(name.endsWith(".xml")){
   assert.ok(compression===8||compression===0,"ZIP mode unsupported");
   files.set(name,(compression===8?inflateRawSync(data):data).toString("utf8"));
  }
  ptr+=46+nameSize+extra+comment;
 }
 return files;
}
const files=readOpenXml(FILE);
const book=files.get("xl/workbook.xml");
const sheetFiles=[...files].filter(([name])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(name));
const textAll=sheetFiles.map(([,xml])=>xml).join("\n");
const exact=(reg)=>[...new Set([...textAll.matchAll(reg)].map(m=>m[0]))].sort();
test("XLSX V134 contains prior 17 sheets and one appended formatted, editable production sheet",()=>{
 assert.ok(book);
 assert.equal(sheetFiles.length,18);
 for(const label of ["ASSAUT","OUTER_OPS","INFILTRATION","RTS","MISSIONS_1200","W3_24_RTS",
  "CARTES_W3_12","W5_CAMPAGNES_36","QA_ACCEPTATION","00_PILOTAGE","RTS_V134_SYNCHRO"])
  assert.ok(book.includes('name="'+label+'"'),"missing "+label);
 assert.ok(textAll.includes("33/33"),"targeted CI status missing");
 assert.ok(textAll.includes("Validé CI ciblée"),"status provenance missing");
});
test("43 V134 tasks (19 shared +24 W3) and eight new QA checks are traceable",()=>{
 assert.equal(exact(/CW134-RALLY-\d{3}/g).length,19);
 assert.equal(exact(/CW134-MAP-\d{2}/g).length,24);
 assert.equal(exact(/QA-CW134-\d{3}/g).length,8);
 assert.ok(textAll.includes("W3-RTS24"));
 assert.ok(textAll.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/43"));
});
test("original V120 design-only atlas and W3 catalogs survive intact",()=>{
 assert.equal(exact(/CW120-[AOSR]-(?:OR|LO|HO)-\d{3}/g).length,1200);
 assert.equal(exact(/W3-RTS\d{2}/g).length,24);
 assert.equal(exact(/W3-MAP\d{2}/g).length,12);
 assert.equal(exact(/W5-LM\d{2}/g).length,36);
 assert.ok(textAll.includes("Design-only"));
 assert.ok(textAll.includes("À développer"));
});
