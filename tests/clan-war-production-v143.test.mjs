import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

/** Test the actual V143 XLSX binary COMMITTED in PR #53, not a CSV stand-in. */
const file="docs/clan-war-v143/Yautja_Guerres_Clans_Suivi_Production_V143_2026-10-31.xlsx";
function loadXml(file){
 const b=readFileSync(file);
 assert.ok(b.length>480000,"V143 workbook content was truncated");
 let end=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)
  if(b.readUInt32LE(i)===0x06054b50){end=i;break;}
 assert.ok(end>=0,"XLSX ZIP end-of-directory missing");
 const count=b.readUInt16LE(end+10);
 let p=b.readUInt32LE(end+16);const xml=new Map();
 for(let i=0;i<count;i++){
  assert.equal(b.readUInt32LE(p),0x02014b50);
  const method=b.readUInt16LE(p+10),size=b.readUInt32LE(p+20);
  const len=b.readUInt16LE(p+28),extra=b.readUInt16LE(p+30),
   comment=b.readUInt16LE(p+32),offset=b.readUInt32LE(p+42);
  const name=b.subarray(p+46,p+46+len).toString("utf8");
  assert.equal(b.readUInt32LE(offset),0x04034b50);
  const dataAt=offset+30+b.readUInt16LE(offset+26)+b.readUInt16LE(offset+28);
  if(name.endsWith(".xml")){
   const raw=b.subarray(dataAt,dataAt+size);
   assert.ok(method===0||method===8,"unsupported XLSX compression mode");
   xml.set(name,(method===8?inflateRawSync(raw):raw).toString("utf8"));
  }
  p+=46+len+extra+comment;
 }
 return xml;
}
const xml=loadXml(file),workbook=xml.get("xl/workbook.xml")??"";
const sheets=[...xml].filter(([k])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k));
const combined=sheets.map(([,content])=>content).join("\n");
const countIds=re=>new Set([...combined.matchAll(re)].map(m=>m[0])).size;

test("V143 workbook is a real XLSX with 73 sheets retaining all V142 catalogs",()=>{
 assert.equal(sheets.length,73);
 for(const name of [
  "MISSIONS_1200","W3_24_RTS","CARTES_W3_12","W5_CAMPAGNES_36",
  "ASSAUT_V141","QA_V141","CROISEMENTS_V141","SUIVI_V141",
  "ASSAUT_V142","OUTER_OPS_V142","INFILTRATION_V142","RTS_V142",
  "QA_V142","CROISEMENTS_V142","SUIVI_V142",
  "ASSAUT_V143","OUTER_OPS_V143","INFILTRATION_V143","RTS_V143",
  "QA_V143","CROISEMENTS_V143","SUIVI_V143"])
   assert.ok(workbook.includes('name="'+name+'"'),"sheet missing "+name);
 assert.ok(combined.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/53"));
});

test("V143 tracks 76 unique requirements, 88 QA and 44 cross-mode rules",()=>{
 for(const code of ["ASS","OUT","INF","RTS"]){
  assert.equal(countIds(new RegExp("CW143-"+code+"-\\d{3}","g")),19,code+" requirements");
  assert.equal(countIds(new RegExp("QA-CW143-"+code+"-\\d{2}","g")),22,code+" QA checks");
 }
 assert.equal(countIds(/CW143-(?:ASS|OUT|INF|RTS)-\d{3}/g),76);
 assert.equal(countIds(/QA-CW143-(?:ASS|OUT|INF|RTS)-\d{2}/g),88);
 assert.equal(countIds(/INT-CW143-\d{3}/g),44);
 for(const source of ["commandWarAssaultBraceV143","commandWarOuterIncidentV143",
  "commandWarStealthDashV143","commandWarRtsMarchV143"])
   assert.ok(combined.includes(source),"missing code trace "+source);
 assert.ok(combined.includes("Validé CI ciblée")&&combined.includes("À développer"));
});

test("V143 original 1,200 V120 IDs, 24 scenarios, 12 maps and 36 W5 remain intact",()=>{
 assert.equal(countIds(/CW120-[AOSR]-(?:OR|LO|HO)-\d{3}/g),1200);
 assert.equal(countIds(/W3-RTS\d{2}/g),24);
 assert.equal(countIds(/W3-MAP\d{2}/g),12);
 assert.equal(countIds(/W5-LM\d{2}/g),36);
 const dash=xml.get("xl/worksheets/sheet73.xml")??"";
 assert.ok(dash.includes("COUNTIF")&&dash.includes("COUNTA"),
  "dashboard must compute source statuses rather than hardcode them");
 for(const err of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
   assert.ok(!combined.includes(err),"broken Excel formula "+err);
});
