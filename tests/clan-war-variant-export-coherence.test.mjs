import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {homeworldSceneSsrV78} from "./helpers/homeworld-scene-ssr-v78.mjs";

const packed=await build({stdin:{contents:[
  "export * from './app/game/systems/clanWarVariantExportV126';",
  "export * from './app/game/systems/clanWarVariantAtlasV120';",
  "export * from './app/game/systems/clanWarWorldClimateV126';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(packed.outputFiles[0].text).toString("base64"));
const all=api.CLAN_WAR_VARIANT_ATLAS_V120;
const filters={mode:"all",family:"all",query:""};

function readCsv(text){
  const rows=[];let row=[],value="",quoted=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(char==='"'){
      if(quoted&&text[i+1]==='"'){value+='"';i++;}
      else quoted=!quoted;
    }else if(!quoted&&char===';'){row.push(value);value="";}
    else if(!quoted&&char==='\r'&&text[i+1]==='\n'){
      row.push(value);rows.push(row);row=[];value="";i++;
    }else value+=char;
  }
  row.push(value);rows.push(row);assert.equal(quoted,false);
  const header=rows.shift();
  return rows.map(values=>{assert.equal(values.length,header.length);return Object.fromEntries(header.map((key,i)=>[key,values[i]]));});
}

test("all 1200 JSON exports match the current atlas world/climate and retain exact original source designs",()=>{
  const before=JSON.stringify(all);
  const payload=JSON.parse(JSON.stringify(api.clanWarVariantExportV126(all,filters)));
  assert.equal(payload.schema,126);assert.equal(payload.sourceSchema,120);
  assert.equal(payload.status,"design-only");assert.equal(payload.total,1200);
  assert.deepEqual(payload.filteredBy,filters);
  assert.deepEqual(payload.variants,api.CLAN_WAR_COHERENT_VARIANTS_V126);
  for(let i=0;i<all.length;i++)assert.deepEqual(payload.variants[i].original,all[i]);
  assert.equal(JSON.stringify(all),before,"exports cannot rewrite the historical catalog");
  const homages=payload.variants.filter(v=>v.original.family==="homage");
  assert.equal(homages.length,400);
  for(const item of homages){assert.equal(item.geography.worldId,"earth");assert.equal(item.original.canonClaim,false);}
});

test("CSV's current fields use reconciled locations, climates and liquids instead of alien source placeholders",()=>{
  const rows=readCsv(api.clanWarVariantCsvV126(all));
  assert.equal(rows.length,1200);
  for(let i=0;i<all.length;i++){
    const current=api.coherentClanWarVariantV126(all[i]),row=rows[i];
    assert.equal(row.ID,all[i].id);
    assert.equal(row.Lieu,current.geography.siteName);
    assert.equal(row.Monde,current.geography.worldId);
    assert.equal(row.Biome,current.environment.biome);
    assert.equal(row.Météo,current.environment.weather);
    assert.equal(row["Zone liquide"],current.environment.liquid);
    assert.equal(row.Danger,current.environment.effectiveHazard);
    assert.equal(row["Événement"],current.environment.effectiveTwist);
    assert.equal(row["Lieu source V120"],all[i].settingName);
    assert.equal(row["Météo source V120 remplacée"],all[i].environment.weather);
    if(current.geography.worldKind!=="earth"){
      assert.equal(row.Latitude,"");assert.equal(row.Longitude,"");
    }
  }
});

test("desert, indoor and multiregion exports preserve their respective corrected weather and exact source evidence",()=>{
  const names=["Erg Chebbi","Musée du Louvre","Pont de Normandie"];
  const selected=names.map(name=>all.find(v=>v.family==="homage"&&v.referenceName===name));
  assert(selected.every(Boolean));
  const rows=readCsv(api.clanWarVariantCsvV126(selected));
  assert.equal(rows[0].Monde,"earth");
  assert.doesNotMatch(rows[0].Météo,/neige|blizzard|glacier/iu);
  assert.equal(rows[1].Météo,"pas de météo extérieure à l'intérieur");
  assert.equal(rows[2].Météo,"météo variable selon secteurs parcourus");
  const payload=api.clanWarVariantExportV126(selected,{...filters,family:"homage",query:"sélection"});
  assert.deepEqual(payload.variants.map(v=>v.original),selected);
  assert.equal(payload.variants[1].environment.siteKind,"interior");
  assert.equal(payload.variants[2].environment.siteKind,"multi-region");
});

test("CSV retains Unicode, quotes, semicolons and newlines while neutralizing spreadsheet executable prefixes",()=>{
  const source=all.find(v=>v.family==="original"),before=JSON.stringify(source);
  const editable={...source,title:'=HYPERLINK("https://example.invalid";"x")',
    referenceName:'  @Éclipse; "archive"\r\nseconde ligne',
    operation:{...source.operation,primaryObjective:"+1+1",secondaryObjective:"-2+3"}};
  const [row]=readCsv(api.clanWarVariantCsvV126([editable]));
  assert.equal(row["Titre source V120"],"'"+editable.title);
  assert.equal(row["Référence"],"'"+editable.referenceName);
  assert.equal(row.Objectif,"'+1+1");
  assert.equal(row["Objectif secondaire"],"'-2+3");
  assert.equal(JSON.stringify(source),before);
  const json=api.clanWarVariantExportV126([editable],filters);
  assert.equal(json.variants[0].original.title,editable.title,"JSON preserves historical text rather than applying spreadsheet escaping");
});

test("a filtered export contains exactly the chosen source IDs and remains an unqualified design catalog",()=>{
  const selected=api.searchClanWarVariantsV120("","outer","homage");
  const payload=api.clanWarVariantExportV126(selected,{mode:"outer",family:"homage",query:""});
  assert.equal(payload.total,100);
  assert.deepEqual(payload.variants.map(v=>v.sourceId),selected.map(v=>v.id));
  assert.equal(new Set(readCsv(api.clanWarVariantCsvV126(selected)).map(v=>v.ID)).size,100);
  assert.equal(payload.variants.every(v=>v.original.status==="design-only"&&v.original.operation.neverAutoAnnex===true),true);
  assert.deepEqual(api.clanWarVariantExportV126([],filters).variants,[]);
  assert.equal(readCsv(api.clanWarVariantCsvV126([])).length,0);
});

const ui=homeworldSceneSsrV78().load("app/game/ClanWarVariantAtlasV120.tsx");
const escaped=value=>value.replaceAll("&","&amp;").replaceAll("<","&lt;")
  .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#x27;");
for(const name of ["Musée du Louvre","Pont de Normandie"])test("real SSR detail and exports agree on current place and secondary biome: "+name,()=>{
  const original=all.find(v=>v.family==="homage"&&v.referenceName===name);
  assert.ok(original);
  const before=JSON.stringify(original),csv=readCsv(api.clanWarVariantCsvV126([original]))[0];
  const coherent=api.clanWarVariantExportV126([original],filters).variants[0];
  const html=renderToStaticMarkup(React.createElement(ui.ClanWarVariantDetailV126,{chosen:original}));
  const title=html.match(/<h4>([\s\S]*?)<\/h4>/)?.[1];assert.ok(title);
  assert.equal(title,escaped(original.operation.missionType)+" · "+escaped(coherent.geography.siteName));
  assert.doesNotMatch(title,/Reconstruction|écho/u);
  const secondary=html.match(/<dd data-clan-war-secondary-objective="[^"]*">([\s\S]*?)<\/dd>/)?.[1];
  assert.equal(secondary,escaped(csv["Objectif secondaire"]));
  assert(secondary.includes(escaped(coherent.environment.biome)));
  const history=html.slice(html.indexOf("<details><summary>Consulter le brouillon V120 original"));
  assert(history.includes(escaped(original.title)),"original title remains inside historical disclosure");
  assert(history.includes(escaped(original.operation.secondaryObjective)),"original biome remains in source history");
  assert.equal(JSON.stringify(original),before,"SSR must preserve source identities and design records");
});
