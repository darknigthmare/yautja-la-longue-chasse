import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";
import {build} from "esbuild";

const WORKBOOK="docs/clan-war-v130/Yautja_Guerres_Clans_Plan_Production_V130_2026-10-30.xlsx";
function unzipXlsx(file){
 const bytes=readFileSync(file);
 assert.ok(bytes.length>100000,"registre XLSX semble vide");
 let eocd=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
   if(bytes.readUInt32LE(i)===0x06054b50){eocd=i;break;}
 }
 assert.ok(eocd>=0,"archive OpenXML sans répertoire ZIP");
 let p=bytes.readUInt32LE(eocd+16);
 const count=bytes.readUInt16LE(eocd+10),out=new Map();
 for(let i=0;i<count;i++){
  assert.equal(bytes.readUInt32LE(p),0x02014b50,"répertoire ZIP corrompu");
  const method=bytes.readUInt16LE(p+10),length=bytes.readUInt32LE(p+20);
  const nameLength=bytes.readUInt16LE(p+28),extraLength=bytes.readUInt16LE(p+30);
  const commentLength=bytes.readUInt16LE(p+32),local=bytes.readUInt32LE(p+42);
  const name=bytes.subarray(p+46,p+46+nameLength).toString("utf8");
  assert.equal(bytes.readUInt32LE(local),0x04034b50,"entrée ZIP invalide "+name);
  const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);
  const content=bytes.subarray(start,start+length);
  const xml=method===8?inflateRawSync(content):method===0?content:null;
  assert.ok(xml,"compression ZIP non supportée dans "+name);
  out.set(name,xml.toString("utf8"));
  p+=46+nameLength+extraLength+commentLength;
 }
 return out;
}
const files=unzipXlsx(WORKBOOK);
const book=files.get("xl/workbook.xml");
assert.ok(book,"manifest OpenXML manquant");
const sheets=[...files].filter(([path])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(path)).map(([,body])=>body).join("\n");
const unique=(pattern)=>[...new Set([...sheets.matchAll(pattern)].map(x=>x[0]))].sort();
const ids=unique(/CW120-[AOSR]-(?:OR|LO|HO)-\d{3}/g);
const W3=unique(/W3-RTS\d{2}/g);
const maps=unique(/W3-MAP\d{2}/g);
const W5=unique(/W5-LM\d{2}/g);
const tasks=unique(/CW130-(?:ASSAULT|OUTER|STEALTH|RTS|SYS|NET)-\d{3}/g);
const bundles=await build({
 stdin:{contents:[
 "export * from './app/game/systems/clanWarVariantAtlasV120';",
 "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
 "export * from './app/game/systems/clanWarBibleV6';",
 ].join("\n"),resolveDir:process.cwd()},
 bundle:true,write:false,platform:"node",format:"esm",target:"es2022",logLevel:"silent"
});
const api=await import("data:text/javascript;base64,"+Buffer.from(bundles.outputFiles[0].text).toString("base64"));

test("le classeur V130 contient 17 vrais onglets, pas un CSV renommé",()=>{
 assert.ok(book.includes('name="00_PILOTAGE"'));
 assert.ok(book.includes('name="MISSIONS_1200"'));
 assert.ok(book.includes('name="LORE_CONTINUITE"'));
 assert.equal([...files.keys()].filter(p=>/^xl\/worksheets\/sheet\d+\.xml$/.test(p)).length,17);
 assert.ok(sheets.includes("Design-only"));
});
test("les 1 200 IDs réels de l'Excel correspondent exactement au générateur du jeu",()=>{
 assert.equal(ids.length,1200);
 assert.deepEqual(ids,api.CLAN_WAR_VARIANT_ATLAS_V120.map(x=>x.id).sort());
 assert.ok(api.CLAN_WAR_VARIANT_ATLAS_V120.every(x=>x.status==="design-only"&&!x.canonClaim));
 for(const mode of ["A","O","S","R"])for(const family of ["OR","LO","HO"])
  assert.equal(ids.filter(s=>s.startsWith("CW120-"+mode+"-"+family+"-")).length,100);
});
test("les plans W3, W5, routes et backlog de production sont identifiables dans l'Excel",()=>{
 assert.equal(W3.length,24);
 assert.deepEqual(W3,[...api.WAR_SOURCE_RTS_IDS_V129].sort());
 assert.equal(maps.length,12);
 assert.equal(W5.length,36);
 assert.equal(tasks.length,125);
 const audit=api.auditWarRtsSourceMissionsV129(api.DEFAULT_WAR_RULES_V6);
 assert.deepEqual(audit.issues,[]);
 assert.equal(audit.steps,72);
});
test("la source RTS doit venir de l'onglet Scénarios RTS même si un faux ID existe ailleurs",()=>{
 const rules=api.DEFAULT_WAR_RULES_V6;
 const source=rules.entries.find(e=>e.id==="W3-RTS01"&&e.sheet==="Scénarios RTS");
 assert.ok(source,"Bible V6 Scénarios RTS introuvable");
 const expected=api.buildWarRtsMissionV129("W3-RTS01",rules);
 const fake={...source,sheet:"Archives non RTS",title:"FAUSSE MISSION"};
 const compromised={...rules,entries:[fake,...rules.entries]};
 const actual=api.buildWarRtsMissionV129("W3-RTS01",compromised);
 assert.equal(actual.name,expected.name);
 assert.equal(actual.mapId,expected.mapId);
 const removed={...rules,entries:rules.entries.filter(e=>e!==source)};
 assert.throws(()=>api.buildWarRtsMissionV129("W3-RTS01",removed),/Mission absente/);
});
