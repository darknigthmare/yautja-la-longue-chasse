import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

const file="docs/clan-war-v152/Yautja_ClanWar_V152_Provenance_QA.xlsx";
function readExcelXml(path){
 const b=readFileSync(path);assert.ok(b.length>25000,"Excel V152 truncated or placeholder");
 let end=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)
  if(b.readUInt32LE(i)===0x06054b50){end=i;break;}
 assert.ok(end>=0,"Missing ZIP central-directory trailer");
 const count=b.readUInt16LE(end+10),parts=new Map();
 let offset=b.readUInt32LE(end+16);
 for(let i=0;i<count;i++){
  assert.equal(b.readUInt32LE(offset),0x02014b50);
  const method=b.readUInt16LE(offset+10),size=b.readUInt32LE(offset+20),
   nameLength=b.readUInt16LE(offset+28),extra=b.readUInt16LE(offset+30),
   comment=b.readUInt16LE(offset+32),at=b.readUInt32LE(offset+42);
  const name=b.subarray(offset+46,offset+46+nameLength).toString("utf8");
  assert.equal(b.readUInt32LE(at),0x04034b50);
  const start=at+30+b.readUInt16LE(at+26)+b.readUInt16LE(at+28);
  if(name.endsWith(".xml")){
   const bytes=b.subarray(start,start+size);
   assert.ok(method===0||method===8);
   parts.set(name,(method===8?inflateRawSync(bytes):bytes).toString("utf8"));
  }
  offset+=46+nameLength+extra+comment;
 }
 return parts;
}
const xml=readExcelXml(file);
const book=xml.get("xl/workbook.xml")??"";
const sheets=[...xml].filter(([name])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(name));
const contents=sheets.map(([,s])=>s).join("\n");
const unique=regex=>new Set([...contents.matchAll(regex)].map(x=>x[0])).size;

test("V152 companion has exactly 10 real sheets alongside untouched V151 5-sheet workbook",()=>{
 assert.equal(sheets.length,10);
 for(const name of ["00_PILOTAGE","01_QUATRE_MODES","02_QUALITE_QA","03_TERRITOIRES",
  "04_IDENTITES","05_RTS_24","06_PRS_GITHUB","07_SOURCES_1TO1","08_BACKLOG","09_GARDEFOUS"])
  assert.ok(book.includes('name="'+name+'"'),"Missing "+name);
});
test("V152 tracks 40 specs, 32 QA, 30 unverified geographies and 24 authored W3 missions",()=>{
 for(const code of ["ASS","OUT","INF","RTS"]){
  assert.equal(unique(new RegExp("CW152-"+code+"-\\d{3}","g")),10,code+" spec count");
  assert.equal(unique(new RegExp("QA152-"+code+"-\\d{2}","g")),8,code+" QA count");
 }
 assert.equal(unique(/CW152-(?:ASS|OUT|INF|RTS)-\d{3}/g),40);
 assert.equal(unique(/QA152-(?:ASS|OUT|INF|RTS)-\d{2}/g),32);
 assert.equal(unique(/W3-K\d{2}/g),30);
 assert.equal(unique(/W3-RTS\d{2}/g),24);
 assert.equal(unique(/LORE152-\d{2}/g),22);
 assert.equal(unique(/BACK152-\d{3}/g),24);
});
test("V152 source and canon labels explicitly prohibit auto-conquest and premature 1:1 claims",()=>{
 for(const phrase of ["Non certifié 1:1","Aucune mutation V85","CON-T01",
  "web-lock","github.com/darknigthmare/yautja-la-longue-chasse/pull/78",
  "predator.illfonic.com","thewaltdisneycompany.com"]){
  // The workbook is a planning artifact; source URLs and explicit caveats must survive.
  assert.ok(contents.toLowerCase().includes(phrase.toLowerCase()),"Lost safety/source label "+phrase);
 }
 const dash=xml.get("xl/worksheets/sheet10.xml")??"";
 assert.ok(dash.includes("COUNTIF")&&dash.includes("COUNTA"),"Formula-driven dashboard missing");
 for(const error of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
  assert.ok(!contents.includes(error),"Excel contains computed error "+error);
});
