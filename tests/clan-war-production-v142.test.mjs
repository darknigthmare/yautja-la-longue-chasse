import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

/** Test the actual V142 XLSX binary COMMITTED in PR #52, not a CSV stand-in. */
const file="docs/clan-war-v142/Yautja_Guerres_Clans_Suivi_Production_V142_2026-10-31.xlsx";
function loadXml(file){
 const b=readFileSync(file);
 assert.ok(b.length>420000,"V142 workbook content was truncated");
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

test("V142 workbook is real XLSX with 66 sheets and all V141 sheets retained",()=>{
 assert.equal(sheets.length,66);
 for(const name of ["MISSIONS_1200","W3_24_RTS","CARTES_W3_12","W5_CAMPAGNES_36",
  "ASSAUT_V141","OUTER_OPS_V141","INFILTRATION_V141","RTS_V141","SUIVI_V141",
  "ASSAUT_V142","OUTER_OPS_V142","INFILTRATION_V142","RTS_V142",
  "QA_V142","CROISEMENTS_V142","SUIVI_V142"])
  assert.ok(workbook.includes('name="'+name+'"'),"sheet missing "+name);
 assert.ok(combined.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/52"));
});

test("V142 records 72 unique specifications, 80 unique QA and 40 cross-mode IDs",()=>{
 for(const code of ["ASS","OUT","INF","RTS"]){
  assert.equal(countIds(new RegExp("CW142-"+code+"-\\d{3}","g")),18,code+" specs");
  assert.equal(countIds(new RegExp("QA-CW142-"+code+"-\\d{2}","g")),20,code+" QA");
 }
 assert.equal(countIds(/CW142-(?:ASS|OUT|INF|RTS)-\d{3}/g),72);
 assert.equal(countIds(/QA-CW142-(?:ASS|OUT|INF|RTS)-\d{2}/g),80);
 assert.equal(countIds(/INT-CW142-\d{3}/g),40);
 for(const term of ["issueWarAssaultFocusV142","warOuterRouteChoicesV142",
  "planWarStealthStepV142","commandWarRtsWaypointV142"])
  assert.ok(combined.includes(term),"missing code provenance "+term);
 assert.ok(combined.includes("Validé CI ciblée")&&combined.includes("À développer"));
});

test("V142 preserves 1200 design variants, source missions, and formula-linked dashboard",()=>{
 assert.equal(countIds(/CW120-[AOSR]-(?:OR|LO|HO)-\d{3}/g),1200);
 assert.equal(countIds(/W3-RTS\d{2}/g),24);
 assert.equal(countIds(/W3-MAP\d{2}/g),12);
 assert.equal(countIds(/W5-LM\d{2}/g),36);
 const sheet=xml.get("xl/worksheets/sheet66.xml")??"";
 assert.ok(sheet.includes("COUNTIF")&&sheet.includes("COUNTA"),
  "the latest statuses must be formulas, not hardcoded");
 for(const err of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
  assert.ok(!combined.includes(err),"broken workbook formula "+err);
});
