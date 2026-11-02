import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";
const FILE="docs/clan-war-v139/Yautja_Guerres_Clans_Suivi_Production_V139_2026-10-31.xlsx";
function openZip(file){
 const b=readFileSync(file);assert.ok(b.length>315000,"Historical XLSX content truncated");
 let end=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)
  if(b.readUInt32LE(i)===0x06054b50){end=i;break;}
 assert.ok(end>=0,"ZIP end-of-central-directory missing");
 const count=b.readUInt16LE(end+10),xml=new Map();
 let p=b.readUInt32LE(end+16);
 for(let i=0;i<count;i++){
  assert.equal(b.readUInt32LE(p),0x02014b50);
  const method=b.readUInt16LE(p+10),size=b.readUInt32LE(p+20);
  const n=b.readUInt16LE(p+28),extra=b.readUInt16LE(p+30);
  const comment=b.readUInt16LE(p+32),offset=b.readUInt32LE(p+42);
  const name=b.subarray(p+46,p+46+n).toString("utf8");
  assert.equal(b.readUInt32LE(offset),0x04034b50);
  const start=offset+30+b.readUInt16LE(offset+26)+b.readUInt16LE(offset+28);
  if(name.endsWith(".xml")){
   const raw=b.subarray(start,start+size);
   assert.ok(method===0||method===8,"ZIP compression unsupported");
   xml.set(name,(method===8?inflateRawSync(raw):raw).toString("utf8"));
  }
  p+=46+n+extra+comment;
 }
 return xml;
}
const xml=openZip(FILE),book=xml.get("xl/workbook.xml")??"";
const sheets=[...xml].filter(([name])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(name));
const content=sheets.map(([,val])=>val).join("\n");
const count=regex=>new Set([...content.matchAll(regex)].map(x=>x[0])).size;
test("V139 45 XLSX sheets retain all earlier V130-V138 production and QA",()=>{
 assert.equal(sheets.length,45);
 for(const name of [
  "MISSIONS_1200","W3_24_RTS","CARTES_W3_12","W5_CAMPAGNES_36",
  "RTS_V134_SYNCHRO","MODES_V135_PARALLELE","QA_V135",
  "MODES_V136_PARALLELE","QA_V136","INTERMODES_V136",
  "ASSAUT_V137","QA_V137","SUIVI_V137",
  "ASSAUT_V138","QA_V138","CROISEMENTS_V138","SUIVI_V138",
  "ASSAUT_V139","OUTER_OPS_V139","INFILTRATION_V139","RTS_V139",
  "QA_V139","CROISEMENTS_V139","SUIVI_V139"])
  assert.ok(book.includes('name="'+name+'"'),"missing "+name);
});
test("V139 contains 15 requirements and 14 QA per mode with 28 cross-mode contracts",()=>{
 for(const mode of ["ASS","OUT","INF","RTS"]){
  assert.equal(count(new RegExp("CW139-"+mode+"-\\d{3}","g")),15,mode+" tasks");
  assert.equal(count(new RegExp("QA-CW139-"+mode+"-\\d{2}","g")),14,mode+" QA");
 }
 assert.equal(count(/CW139-(?:ASS|OUT|INF|RTS)-\d{3}/g),60);
 assert.equal(count(/QA-CW139-(?:ASS|OUT|INF|RTS)-\d{2}/g),56);
 assert.equal(count(/INT-CW139-\d{3}/g),28);
 assert.ok(content.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/48"));
});
test("V139 original 1200 dossiers plus 24 W3 RTS, 12 W3 maps and 36 W5 survive",()=>{
 assert.equal(count(/CW120-[AOSR]-(?:OR|LO|HO)-\d{3}/g),1200);
 assert.equal(count(/W3-RTS\d{2}/g),24);
 assert.equal(count(/W3-MAP\d{2}/g),12);
 assert.equal(count(/W5-LM\d{2}/g),36);
 const dash=xml.get("xl/worksheets/sheet45.xml")??"";
 assert.ok(dash.includes("COUNTIF")&&dash.includes("COUNTA"),
  "dashboard needs live status formulas, not manual completion");
 for(const error of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
  assert.ok(!content.includes(error),"Unexpected Excel formula error "+error);
});
