import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

const FILE="docs/clan-war-v138/Yautja_Guerres_Clans_Suivi_Production_V138_2026-10-31.xlsx";
function zipXml(file){
 const b=readFileSync(file);
 assert.ok(b.length>260000,"Actual workbook should retain historical detailed sheets");
 let end=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)
  if(b.readUInt32LE(i)===0x06054b50){end=i;break;}
 assert.ok(end>=0,"Missing ZIP central directory");
 const count=b.readUInt16LE(end+10);let p=b.readUInt32LE(end+16);
 const result=new Map();
 for(let i=0;i<count;i++){
  assert.equal(b.readUInt32LE(p),0x02014b50);
  const method=b.readUInt16LE(p+10),size=b.readUInt32LE(p+20);
  const len=b.readUInt16LE(p+28),extra=b.readUInt16LE(p+30);
  const comment=b.readUInt16LE(p+32),offset=b.readUInt32LE(p+42);
  const name=b.subarray(p+46,p+46+len).toString("utf8");
  assert.equal(b.readUInt32LE(offset),0x04034b50);
  const at=offset+30+b.readUInt16LE(offset+26)+b.readUInt16LE(offset+28);
  if(name.endsWith(".xml")){
   const data=b.subarray(at,at+size);
   assert.ok(method===0||method===8,"Unsupported ZIP compression");
   result.set(name,(method===8?inflateRawSync(data):data).toString("utf8"));
  }
  p+=46+len+extra+comment;
 }
 return result;
}
const xml=zipXml(FILE);
const workbook=xml.get("xl/workbook.xml")??"";
const files=[...xml].filter(([name])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(name));
const content=files.map(([,value])=>value).join("\n");
const unique=(regexp)=>new Set([...content.matchAll(regexp)].map(x=>x[0])).size;
test("V138 production workbook contains 38 genuine Excel sheets, not renamed CSV",()=>{
 assert.equal(files.length,38);
 for(const name of ["MISSIONS_1200","W3_24_RTS","CARTES_W3_12","W5_CAMPAGNES_36",
  "SUIVI_V137","ASSAUT_V137","OUTER_OPS_V137","INFILTRATION_V137","RTS_V137",
  "ASSAUT_V138","OUTER_OPS_V138","INFILTRATION_V138","RTS_V138",
  "QA_V138","CROISEMENTS_V138","SUIVI_V138"])
  assert.ok(workbook.includes('name="'+name+'"'),"Sheet missing: "+name);
});
test("V138 has 14 production requirements, 12 QA per mode and 24 shared interactions",()=>{
 for(const mode of ["ASS","OUT","INF","RTS"]){
  assert.equal(unique(new RegExp("CW138-"+mode+"-\\d{3}","g")),14,mode+" requirements");
  assert.equal(unique(new RegExp("QA-CW138-"+mode+"-\\d{2}","g")),12,mode+" QA checks");
 }
 assert.equal(unique(/CW138-(?:ASS|OUT|INF|RTS)-\d{3}/g),56);
 assert.equal(unique(/QA-CW138-(?:ASS|OUT|INF|RTS)-\d{2}/g),48);
 assert.equal(unique(/INT-CW138-\d{3}/g),24);
 assert.ok(content.includes("feat/v138-four-modes-tactics-intel-medics-20261031"));
});
test("Source catalog fidelity and formula-based dashboard remain unchanged",()=>{
 assert.equal(unique(/CW120-[AOSR]-(?:OR|LO|HO)-\d{3}/g),1200);
 assert.equal(unique(/W3-RTS\d{2}/g),24);
 assert.equal(unique(/W3-MAP\d{2}/g),12);
 assert.equal(unique(/W5-LM\d{2}/g),36);
 const last=xml.get("xl/worksheets/sheet38.xml")??"";
 assert.ok(last.includes("COUNTIF")&&last.includes("COUNTA"),"V138 dashboard is not formula-based");
 for(const err of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
  assert.ok(!content.includes(err),"Spreadsheet formula error: "+err);
});
