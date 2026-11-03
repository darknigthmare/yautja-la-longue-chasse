import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

/** Validate the actual V144 binary tracked by the PR. The complete historical
 * 73-sheet V143 source workbook stays in the parent branch: this is its
 * standalone, explicitly named supplement rather than a truncated clone. */
const file="docs/clan-war-v144/Yautja_Guerres_Clans_Suivi_Production_V144_2026-10-31_PR55.xlsx";
function xmlFromZip(filename){
 const buf=readFileSync(filename);
 assert.ok(buf.length>30000&&buf.length<200000,"V144 supplement binary size unexpected");
 let end=-1;
 for(let i=buf.length-22;i>=Math.max(0,buf.length-65557);i--){
  if(buf.readUInt32LE(i)===0x06054b50){end=i;break;}
 }
 assert.ok(end>=0,"XLSX ZIP central directory missing");
 const entries=buf.readUInt16LE(end+10);let pointer=buf.readUInt32LE(end+16);
 const xml=new Map();
 for(let i=0;i<entries;i++){
  assert.equal(buf.readUInt32LE(pointer),0x02014b50);
  const method=buf.readUInt16LE(pointer+10),length=buf.readUInt32LE(pointer+20);
  const n=buf.readUInt16LE(pointer+28),extra=buf.readUInt16LE(pointer+30);
  const comment=buf.readUInt16LE(pointer+32),local=buf.readUInt32LE(pointer+42);
  const path=buf.subarray(pointer+46,pointer+46+n).toString("utf8");
  assert.equal(buf.readUInt32LE(local),0x04034b50);
  const dataAt=local+30+buf.readUInt16LE(local+26)+buf.readUInt16LE(local+28);
  if(path.endsWith(".xml")){
   const b=buf.subarray(dataAt,dataAt+length);
   assert.ok(method===0||method===8);
   xml.set(path,(method===8?inflateRawSync(b):b).toString("utf8"));
  }
  pointer+=46+n+extra+comment;
 }
 return xml;
}
const entries=xmlFromZip(file);
const book=entries.get("xl/workbook.xml")??"";
const sheets=[...entries].filter(([n])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n));
const content=sheets.map(([,s])=>s).join("\n");
const count=regex=>new Set([...content.matchAll(regex)].map(m=>m[0])).size;

test("V144 production supplement has 9 real worksheets and links to intact V143 historical workbook",()=>{
 assert.equal(sheets.length,9);
 for(const name of ["ASSAUT_V144","OUTER_OPS_V144","INFILTRATION_V144",
  "RTS_V144","QA_V144","CROISEMENTS_V144","SOURCES_HISTORIQUES",
  "STATUTS_CI","SUIVI_V144"])
  assert.ok(book.includes('name="'+name+'"'),"missing sheet: "+name);
 assert.ok(content.includes("Yautja_Guerres_Clans_Suivi_Production_V143_2026-10-31.xlsx"),
  "historical source workbook link missing");
 assert.ok(content.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/55"));
});

test("V144 has 48 unique production tasks, 40 QA and 16 cross-mode contracts",()=>{
 for(const mode of ["ASS","OUT","INF","RTS"]){
  assert.equal(count(new RegExp("CW144-"+mode+"-\\d{3}","g")),12);
  assert.equal(count(new RegExp("QA144-"+mode+"-\\d{2}","g")),10);
 }
 assert.equal(count(/CW144-(?:ASS|OUT|INF|RTS)-\d{3}/g),48);
 assert.equal(count(/QA144-(?:ASS|OUT|INF|RTS)-\d{2}/g),40);
 assert.equal(count(/INT144-\d{3}/g),16);
 for(const functionName of ["regroupWarAssaultV144","inspectWarOuterPassageV144",
  "guardInvestigation","commandWarRtsReliefV144"])
  assert.ok(content.includes(functionName),"implementation trace absent: "+functionName);
 assert.ok(content.includes("Validé CI ciblée")&&content.includes("À développer"));
});

test("V144 formulas and source counts are not hardcoded completion or corrupted history",()=>{
 const dashboard=entries.get("xl/worksheets/sheet9.xml")??"";
 assert.ok(dashboard.includes("COUNTIF")&&dashboard.includes("COUNTA"),"dashboard formulas missing");
 for(const token of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
  assert.ok(!content.includes(token),"Excel formula error "+token);
 for(const volume of ["1200","6000","24","12","36","73"])
  assert.ok(content.includes('>'+volume+'<'),"historical count missing: "+volume);
 assert.ok(content.includes("CI ciblée")||content.includes("CI à confirmer"));
});
