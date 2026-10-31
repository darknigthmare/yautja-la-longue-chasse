import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

const FILE="docs/clan-war-v140/Yautja_Guerres_Clans_Suivi_Production_V140_2026-10-31.xlsx";
const zip=readFileSync(FILE);
assert.ok(zip.length>340000,"V140 XLSX should retain its original 45-sheets source and new backlog");
let end=-1;
for(let i=zip.length-22;i>=Math.max(0,zip.length-65557);i--)
 if(zip.readUInt32LE(i)===0x06054b50){end=i;break;}
assert.ok(end>=0,"XLSX ZIP central directory is required");
const total=zip.readUInt16LE(end+10),parts=new Map();
let ptr=zip.readUInt32LE(end+16);
for(let i=0;i<total;i++){
 assert.equal(zip.readUInt32LE(ptr),0x02014b50,"ZIP central header invalid");
 const method=zip.readUInt16LE(ptr+10),length=zip.readUInt32LE(ptr+20);
 const n=zip.readUInt16LE(ptr+28),extra=zip.readUInt16LE(ptr+30),
   comment=zip.readUInt16LE(ptr+32),offset=zip.readUInt32LE(ptr+42);
 const name=zip.subarray(ptr+46,ptr+46+n).toString("utf8");
 assert.equal(zip.readUInt32LE(offset),0x04034b50);
 const at=offset+30+zip.readUInt16LE(offset+26)+zip.readUInt16LE(offset+28);
 if(name.endsWith(".xml")){
  assert.ok(method===0||method===8);
  const payload=zip.subarray(at,at+length);
  parts.set(name,(method===8?inflateRawSync(payload):payload).toString("utf8"));
 }
 ptr+=46+n+extra+comment;
}
const book=parts.get("xl/workbook.xml")??"";
const worksheets=[...parts].filter(([id])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(id));
const textAll=worksheets.map(([,value])=>value).join("\n");
const unique=expr=>new Set([...textAll.matchAll(expr)].map(match=>match[0])).size;

test("V140 workbook retains 45 inherited sheets and adds FOUR substantial backlog/QA/priority/dashboard worksheets",()=>{
 assert.equal(worksheets.length,49);
 for(const label of [
  "MISSIONS_1200","W3_24_RTS","CARTES_W3_12","W5_CAMPAGNES_36",
  "ASSAUT_V139","OUTER_OPS_V139","INFILTRATION_V139","RTS_V139",
  "QA_V139","CROISEMENTS_V139","SUIVI_V139",
  "POINTS_OUVERTS_V140","QA_V140","PRIORITES_V140","SUIVI_V140",
 ])assert.ok(book.includes('name="'+label+'"'),"Missing worksheet "+label);
});
test("V140 source backlog includes four unique implemented pilots, 26 open V139 requirements, 24 QA IDs",()=>{
 assert.equal(unique(/CW140-(?:ASS|OUT|INF|RTS)-\d{3}/g),4);
 assert.equal(unique(/QA-CW140-(?:ASS|OUT|INF|RTS)-\d{2}/g),24);
 assert.equal(unique(/CW139-(?:ASS|OUT|INF|RTS)-\d{3}/g),60,
  "Source V139 IDs must stay stable across history");
 const tracker=parts.get("xl/worksheets/sheet46.xml")??"";
 assert.ok(tracker.includes("Lot V140 implémenté"),"Missing pilot status evidence");
 assert.ok(tracker.includes("Partiel — prototype"),"Must not falsely mark source backlog as complete");
 assert.ok(textAll.includes("105/105"),"Source-linked CI result missing");
});
test("V140 preserves 1200 design-only variants, 24 RTS missions, 12 maps, 36 W5 and a formula-driven dashboard",()=>{
 assert.equal(unique(/CW120-[AOSR]-(?:OR|LO|HO)-\d{3}/g),1200);
 assert.equal(unique(/W3-RTS\d{2}/g),24);
 assert.equal(unique(/W3-MAP\d{2}/g),12);
 assert.equal(unique(/W5-LM\d{2}/g),36);
 const dashboard=parts.get("xl/worksheets/sheet49.xml")??"";
 assert.ok(dashboard.includes("COUNTIF")&&dashboard.includes("COUNTA")&&dashboard.includes("COUNTIFS"),
  "Dashboard must use derived formulas, not hand-edited success totals");
 for(const error of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
  assert.ok(!textAll.includes(error),"Excel formula error "+error);
});
