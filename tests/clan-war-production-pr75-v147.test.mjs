import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

/** Inspect the EXACT binary XLSX committed to GitHub. */
const file="docs/clan-war-v147/Yautja_Guerres_Clans_Source_Conseil_V147_2026-11-01.xlsx";
function unpackXlsx(filename){
 const b=readFileSync(filename);
 assert.ok(b.length>95000,"The V146 history was lost from the V147 workbook");
 let end=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)
  if(b.readUInt32LE(i)===0x06054b50){end=i;break;}
 assert.ok(end>=0,"XLSX ZIP directory missing");
 const count=b.readUInt16LE(end+10),files=new Map();
 let at=b.readUInt32LE(end+16);
 for(let i=0;i<count;i++){
  assert.equal(b.readUInt32LE(at),0x02014b50);
  const method=b.readUInt16LE(at+10),size=b.readUInt32LE(at+20);
  const nameLen=b.readUInt16LE(at+28),extra=b.readUInt16LE(at+30);
  const comment=b.readUInt16LE(at+32),local=b.readUInt32LE(at+42);
  const name=b.subarray(at+46,at+46+nameLen).toString("utf8");
  assert.equal(b.readUInt32LE(local),0x04034b50);
  const begin=local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28);
  if(name.endsWith(".xml")){
   const bytes=b.subarray(begin,begin+size);
   assert.ok(method===0||method===8);
   files.set(name,(method===8?inflateRawSync(bytes):bytes).toString("utf8"));
  }
  at+=46+nameLen+extra+comment;
 }
 return files;
}
const files=unpackXlsx(file),book=files.get("xl/workbook.xml")??"";
const worksheets=[...files].filter(([name])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(name));
const text=worksheets.map(([,content])=>content).join("\n");
const unique=rx=>new Set([...text.matchAll(rx)].map(match=>match[0])).size;

test("V147 XLSX has 33 true worksheets: all 26 V146 sheets plus 7 new production/QA views",()=>{
 assert.equal(worksheets.length,33);
 for(const name of [
  "00_PILOTAGE","01_ASSAUT","02_OUTER_OPS","03_INFILTRATION","04_RTS",
  "08_HISTORIQUE","09_ASSAUT_V145","18_PILOTAGE_V145",
  "19_GEO_V146","20_ROSTER_V146","21_MODES_V146",
  "22_QA_V146","23_PROVENANCE_V146","24_BACKLOG_V146","25_PILOTAGE_V146",
  "26_CONSEIL_V147","27_SOURCE_W3_V147","28_RTS_W3_24_V147",
  "29_PR_V147","30_QA_V147","31_FIDELITE_1TO1","32_PILOTAGE_V147"
 ]){
  assert.ok(book.includes('name="'+name+'"'),name+" missing");
 }
});
test("V147 workbook tracks 20 requirements, 24 QA cases, 16 W3 invariants, 24 RTS source scenarios and 11 open PRs",()=>{
 for(const mode of ["ASS","OUT","INF","RTS"]){
  assert.equal(unique(new RegExp("CW147-"+mode+"-\\d{2}","g")),5,mode+" requirements");
 }
 assert.equal(unique(/CW147-(?:ASS|OUT|INF|RTS)-\d{2}/g),20);
 assert.equal(unique(/QA147-(?:ASS|OUT|INF|RTS)-\d{2}/g),24);
 assert.equal(unique(/SRC147-\d{2}/g),16);
 assert.equal(unique(/ART147-\d{2}/g),24);
 assert.equal(unique(/PR-(?:42|60|61|65|67|68|69|70|71|72|73)/g),11);
 assert.equal(unique(/W3-RTS\d{2}/g),24);
 assert.ok(text.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/75"));
});
test("V147 fidelity register and dashboard do not claim cinema authenticity or automatic V85 conquest",()=>{
 for(const phrase of ["À vérifier","À développer","À réconcilier"]){
  assert.ok(text.includes(phrase),phrase+" missing from production status");
 }
 const dashboard=files.get("xl/worksheets/sheet33.xml")??"";
 assert.ok(dashboard.includes("COUNTIF")&&dashboard.includes("COUNTA"),
  "Dashboard should derive its figures from the production sheets");
 for(const err of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
  assert.ok(!text.includes(err),"Formula error "+err);
});
