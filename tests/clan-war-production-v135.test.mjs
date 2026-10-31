import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

const BOOK="docs/clan-war-v135/Yautja_Guerres_Clans_Suivi_Production_V135_2026-10-31.xlsx";
function readZipXml(file){
 const data=readFileSync(file);assert.ok(data.length>190000);
 let eocd=-1;
 for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--)
  if(data.readUInt32LE(i)===0x06054b50){eocd=i;break;}
 assert.ok(eocd>=0,"XLSX ZIP central index missing");
 let p=data.readUInt32LE(eocd+16);const entries=data.readUInt16LE(eocd+10);
 const xml=new Map();
 for(let i=0;i<entries;i++){
  assert.equal(data.readUInt32LE(p),0x02014b50);
  const method=data.readUInt16LE(p+10),size=data.readUInt32LE(p+20);
  const len=data.readUInt16LE(p+28),extra=data.readUInt16LE(p+30),comment=data.readUInt16LE(p+32);
  const offset=data.readUInt32LE(p+42),name=data.subarray(p+46,p+46+len).toString("utf8");
  assert.equal(data.readUInt32LE(offset),0x04034b50);
  const at=offset+30+data.readUInt16LE(offset+26)+data.readUInt16LE(offset+28);
  if(name.endsWith(".xml")){
   const raw=data.subarray(at,at+size);
   assert.ok(method===0||method===8);
   xml.set(name,(method===8?inflateRawSync(raw):raw).toString("utf8"));
  }
  p+=46+len+extra+comment;
 }
 return xml;
}
const files=readZipXml(BOOK);
const workbook=files.get("xl/workbook.xml")??"";
const worksheets=[...files].filter(([p])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(p));
const content=worksheets.map(([,text])=>text).join("\n");
const count=regex=>new Set([...content.matchAll(regex)].map(x=>x[0])).size;
test("production Excel V135 preserves 18 sheets and adds separate parallel modes plus QA",()=>{
 assert.equal(worksheets.length,20);
 for(const name of ["00_PILOTAGE","MODES_V135_PARALLELE","QA_V135","MISSIONS_1200","W3_24_RTS","RTS_V134_SYNCHRO","CHAINES_PR"])
  assert.ok(workbook.includes('name="'+name+'"'),"sheet missing: "+name);
 assert.ok(content.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/44"));
});
test("48 mode tasks and 24 QA IDs are unique, source V120/W3/W5 unchanged",()=>{
 for(const code of ["ASS","OUT","INF","RTS"]){
  assert.equal(count(new RegExp("CW135-"+code+"-\\d{3}","g")),12,code+" task count");
  assert.equal(count(new RegExp("QA-CW135-"+code+"-\\d{2}","g")),6,code+" QA count");
 }
 assert.equal(count(/CW120-[AOSR]-(?:OR|LO|HO)-\d{3}/g),1200);
 assert.equal(count(/W3-RTS\d{2}/g),24);
 assert.equal(count(/W3-MAP\d{2}/g),12);
 assert.equal(count(/W5-LM\d{2}/g),36);
 assert.ok(content.includes("À développer"));
 assert.ok(content.includes("Implémenté — CI en cours"));
});
