import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

/** Read the exact binary XLSX committed in PR #50; no CSV placeholders. */
const file="docs/clan-war-v140/Yautja_Guerres_Clans_Suivi_Production_V140_2026-10-31.xlsx";
function openXml(path){
 const b=readFileSync(path);assert.ok(b.length>340000,"V140 workbook lost historical sheets");
 let end=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)
  if(b.readUInt32LE(i)===0x06054b50){end=i;break;}
 assert.ok(end>=0,"XLSX central-directory trailer missing");
 const count=b.readUInt16LE(end+10);
 const xml=new Map();let offset=b.readUInt32LE(end+16);
 for(let i=0;i<count;i++){
  assert.equal(b.readUInt32LE(offset),0x02014b50);
  const compression=b.readUInt16LE(offset+10),size=b.readUInt32LE(offset+20);
  const nameLen=b.readUInt16LE(offset+28),extra=b.readUInt16LE(offset+30);
  const comment=b.readUInt16LE(offset+32),entry=b.readUInt32LE(offset+42);
  const name=b.subarray(offset+46,offset+46+nameLen).toString("utf8");
  assert.equal(b.readUInt32LE(entry),0x04034b50);
  const start=entry+30+b.readUInt16LE(entry+26)+b.readUInt16LE(entry+28);
  if(name.endsWith(".xml")){
   const blob=b.subarray(start,start+size);
   assert.ok(compression===0||compression===8,"unsupported XLSX ZIP compression");
   xml.set(name,(compression===8?inflateRawSync(blob):blob).toString("utf8"));
  }
  offset+=46+nameLen+extra+comment;
 }
 return xml;
}
const parts=openXml(file),book=parts.get("xl/workbook.xml")??"";
const sheets=[...parts].filter(([name])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(name));
const all=sheets.map(([,xml])=>xml).join("\n");
const unique=regexp=>new Set([...all.matchAll(regexp)].map(m=>m[0])).size;

test("V140 workbook contains 52 original-plus-production sheets and preserves every V139 catalog",()=>{
 assert.equal(sheets.length,52,"unexpected worksheet count");
 for(const name of [
  "MISSIONS_1200","W3_24_RTS","CARTES_W3_12","W5_CAMPAGNES_36",
  "QA_V135","QA_V136","QA_V137","QA_V138","QA_V139",
  "SUIVI_V139","CROISEMENTS_V139",
  "ASSAUT_V140","OUTER_OPS_V140","INFILTRATION_V140",
  "RTS_V140","QA_V140","CROISEMENTS_V140","SUIVI_V140"
 ]){
  assert.ok(book.includes('name="'+name+'"'),"missing sheet "+name);
 }
 assert.ok(all.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/50"));
});

test("V140 64 production specs, 64 QA checks and 32 cross-mode IDs are all unique",()=>{
 for(const mode of ["ASS","OUT","INF","RTS"]){
  assert.equal(unique(new RegExp("CW140-"+mode+"-\\d{3}","g")),16,mode+" specs");
  assert.equal(unique(new RegExp("QA-CW140-"+mode+"-\\d{2}","g")),16,mode+" QA");
 }
 assert.equal(unique(/CW140-(?:ASS|OUT|INF|RTS)-\d{3}/g),64);
 assert.equal(unique(/QA-CW140-(?:ASS|OUT|INF|RTS)-\d{2}/g),64);
 assert.equal(unique(/INT-CW140-\d{3}/g),32);
 for(const fn of ["warAssaultWaveProfileV140","warOuterRouteProgressV140",
  "warStealthPatrolStepV140","warRtsEnvironmentalWindowV140"])
  assert.ok(all.includes(fn),"missing implementation trace "+fn);
 assert.ok(all.includes("Validé CI ciblée")&&all.includes("À développer"));
});

test("V140 old source catalog, QA links and formula dashboard remain physically intact",()=>{
 assert.equal(unique(/CW120-[AOSR]-(?:OR|LO|HO)-\d{3}/g),1200);
 assert.equal(unique(/W3-RTS\d{2}/g),24);
 assert.equal(unique(/W3-MAP\d{2}/g),12);
 assert.equal(unique(/W5-LM\d{2}/g),36);
 const dashboard=parts.get("xl/worksheets/sheet52.xml")??"";
 assert.ok(dashboard.includes("COUNTIF")&&dashboard.includes("COUNTA"),
  "latest production status must be computed, not painted by hand");
 for(const err of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
  assert.ok(!all.includes(err),"XLSX formula broken: "+err);
});
