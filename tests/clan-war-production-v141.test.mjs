import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

/** Inspect the actual XLSX bytes committed in V141, not a renamed CSV. */
const FILE="docs/clan-war-v141/Yautja_Guerres_Clans_Suivi_Production_V141_2026-10-31.xlsx";
function readZipXml(path){
 const data=readFileSync(path);
 assert.ok(data.length>390000,"V141 workbook lost historical production sheets");
 let end=-1;
 for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--)
  if(data.readUInt32LE(i)===0x06054b50){end=i;break;}
 assert.ok(end>=0,"XLSX central-directory record missing");
 const num=data.readUInt16LE(end+10);
 const xml=new Map();let offset=data.readUInt32LE(end+16);
 for(let i=0;i<num;i++){
  assert.equal(data.readUInt32LE(offset),0x02014b50);
  const method=data.readUInt16LE(offset+10),size=data.readUInt32LE(offset+20);
  const length=data.readUInt16LE(offset+28),extra=data.readUInt16LE(offset+30);
  const comment=data.readUInt16LE(offset+32),fileOffset=data.readUInt32LE(offset+42);
  const name=data.subarray(offset+46,offset+46+length).toString("utf8");
  assert.equal(data.readUInt32LE(fileOffset),0x04034b50);
  const at=fileOffset+30+data.readUInt16LE(fileOffset+26)+data.readUInt16LE(fileOffset+28);
  if(name.endsWith(".xml")){
   const raw=data.subarray(at,at+size);
   assert.ok(method===0||method===8,"unknown XLSX ZIP compression");
   xml.set(name,(method===8?inflateRawSync(raw):raw).toString("utf8"));
  }
  offset+=46+length+extra+comment;
 }
 return xml;
}
const xml=readZipXml(FILE),book=xml.get("xl/workbook.xml")??"";
const sheets=[...xml].filter(([name])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(name));
const content=sheets.map(([,v])=>v).join("\n");
const count=reg=>new Set([...content.matchAll(reg)].map(m=>m[0])).size;

test("V141 workbook has 59 real sheets and keeps all 52 V140 originals",()=>{
 assert.equal(sheets.length,59);
 for(const name of [
  "MISSIONS_1200","W3_24_RTS","CARTES_W3_12","W5_CAMPAGNES_36",
  "ASSAUT_V140","OUTER_OPS_V140","INFILTRATION_V140","RTS_V140",
  "QA_V140","CROISEMENTS_V140","SUIVI_V140",
  "ASSAUT_V141","OUTER_OPS_V141","INFILTRATION_V141","RTS_V141",
  "QA_V141","CROISEMENTS_V141","SUIVI_V141"])
  assert.ok(book.includes('name="'+name+'"'),"sheet absent: "+name);
 assert.ok(content.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/51"));
});

test("V141: 68 requirements, 72 QA checks, 36 interactions with unique IDs",()=>{
 for(const code of ["ASS","OUT","INF","RTS"]){
  assert.equal(count(new RegExp("CW141-"+code+"-\\d{3}","g")),17,code+" spec IDs");
  assert.equal(count(new RegExp("QA-CW141-"+code+"-\\d{2}","g")),18,code+" QA IDs");
 }
 assert.equal(count(/CW141-(?:ASS|OUT|INF|RTS)-\d{3}/g),68);
 assert.equal(count(/QA-CW141-(?:ASS|OUT|INF|RTS)-\d{2}/g),72);
 assert.equal(count(/INT-CW141-\d{3}/g),36);
 for(const name of ["warAssaultContactV141","warOuterWeightedProgressV141",
  "warStealthDecoyPatrolV141","updateEnemyAI"])
  assert.ok(content.includes(name),"missing code evidence "+name);
});

test("V141 source variation IDs and formula-based dashboard survive intact",()=>{
 assert.equal(count(/CW120-[AOSR]-(?:OR|LO|HO)-\d{3}/g),1200);
 assert.equal(count(/W3-RTS\d{2}/g),24);
 assert.equal(count(/W3-MAP\d{2}/g),12);
 assert.equal(count(/W5-LM\d{2}/g),36);
 const dashboard=xml.get("xl/worksheets/sheet59.xml")??"";
 assert.ok(dashboard.includes("COUNTIF")&&dashboard.includes("COUNTA"),
  "formula-linked progress dashboard missing");
 for(const err of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
  assert.ok(!content.includes(err),"broken Excel formula: "+err);
});
