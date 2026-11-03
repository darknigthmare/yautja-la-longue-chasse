import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";
const FILE="docs/clan-war-v144/Yautja_Guerres_Clans_Avenant_Production_V144_2026-10-31.xlsx";
function xlsxXml(file){
 const data=readFileSync(file);assert.ok(data.length>25000);
 let end=-1;
 for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--){
  if(data.readUInt32LE(i)===0x06054b50){end=i;break;}
 }
 assert.ok(end>=0,"ZIP trailer missing");
 let cursor=data.readUInt32LE(end+16),count=data.readUInt16LE(end+10);
 const out=new Map();
 while(count--){
  assert.equal(data.readUInt32LE(cursor),0x02014b50);
  const size=data.readUInt32LE(cursor+20),compression=data.readUInt16LE(cursor+10);
  const nameLen=data.readUInt16LE(cursor+28),extra=data.readUInt16LE(cursor+30);
  const comment=data.readUInt16LE(cursor+32),entry=data.readUInt32LE(cursor+42);
  const name=data.subarray(cursor+46,cursor+46+nameLen).toString("utf8");
  assert.equal(data.readUInt32LE(entry),0x04034b50);
  if(name.endsWith(".xml")){
   const start=entry+30+data.readUInt16LE(entry+26)+data.readUInt16LE(entry+28);
   const b=data.subarray(start,start+size);
   assert.ok(compression===0||compression===8);
   out.set(name,(compression===8?inflateRawSync(b):b).toString("utf8"));
  }
  cursor+=46+nameLen+extra+comment;
 }
 return out;
}
const files=xlsxXml(FILE),workbook=files.get("xl/workbook.xml")??"";
const sheets=[...files].filter(([name])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(name));
const whole=sheets.map(([,v])=>v).join("\n");
const unique=regex=>new Set([...whole.matchAll(regex)].map(m=>m[0])).size;
test("V144 Excel is a genuine eight-sheet production addendum, with V143 history explicitly referenced",()=>{
 assert.equal(sheets.length,8,"Unexpected V144 sheet count");
 for(const name of ["SUIVI_V144","ASSAUT_V144","OUTER_OPS_V144",
  "INFILTRATION_V144","RTS_V144","QA_V144","INTERMODES_V144","HISTORIQUE_ET_CANON"]){
  assert.ok(workbook.includes('name="'+name+'"'),"Missing worksheet "+name);
 }
 assert.ok(whole.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/53"));
 assert.ok(whole.includes("https://github.com/darknigthmare/yautja-la-longue-chasse/pull/56"));
 assert.ok(whole.includes("NON recopié")||whole.includes("NON recopié".replace("é","e")));
});
test("V144 has 48 unique mode requirements, 32 real QA IDs and 12 cross-mode contracts",()=>{
 for(const tag of ["ASS","OUT","INF","RTS"]){
  assert.equal(unique(new RegExp("CW144-"+tag+"-\\d{3}","g")),12);
  assert.equal(unique(new RegExp("QA-CW144-"+tag+"-\\d{2}","g")),8);
 }
 assert.equal(unique(/CW144-(?:ASS|OUT|INF|RTS)-\d{3}/g),48);
 assert.equal(unique(/QA-CW144-(?:ASS|OUT|INF|RTS)-\d{2}/g),32);
 assert.equal(unique(/INT-CW144-\d{3}/g),12);
 for(const engine of ["commandWarAssaultRegroupV144","commandWarOuterRerouteV144",
  "commandWarStealthAlertReinforcementV144","commandWarRtsCrossfireV144"])
  assert.ok(whole.includes(engine),"Missing source trace for "+engine);
});
test("V144 formula-based dashboard and honest status do not certify an imaginary full release",()=>{
 const dashboard=files.get("xl/worksheets/sheet8.xml")??"";
 assert.ok(dashboard.includes("COUNTIF")&&dashboard.includes("COUNTA"));
 for(const error of ["#REF!","#DIV/0!","#VALUE!","#NAME?"])
  assert.ok(!whole.includes(error),"Broken formula "+error);
 assert.ok(whole.includes("Validé CI ciblée"));
 assert.ok(whole.includes("À développer"));
 assert.ok(whole.includes("À exécuter manuellement"));
});
