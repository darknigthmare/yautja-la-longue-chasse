import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const packed=await build({stdin:{contents:[
  "export * from './app/game/systems/clanWarWorldClimateV126';",
  "export * from './app/game/systems/clanWarVariantAtlasV120';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(packed.outputFiles[0].text).toString("base64"));
const find=name=>{
  const row=api.CLAN_WAR_VARIANT_ATLAS_V120.find(v=>v.family==="homage"&&v.referenceName===name);
  assert.ok(row,"named source place must exist: "+name);return row;
};

test("Normandie and Grand urban names do not become mountain terrain through the substring and",()=>{
  for(const name of ["Pont de Normandie","Grand Central Terminal","Grand Palais de Peterhof"]){
    const source=find(name),before=JSON.stringify(source),coherent=api.coherentClanWarVariantV126(source);
    assert.equal(coherent.geography.worldId,"earth");
    assert.equal(coherent.environment.climate,"temperate",name);
    assert.doesNotMatch(coherent.environment.terrain,/montagne|altitude/u,name);
    assert.equal(JSON.stringify(source),before,"world reconciliation must not rewrite historical designs");
  }
});

test("actual mountain passes and the Andes retain alpine interpretation with unknown positions left unpinned",()=>{
  for(const name of ["Col du Grand-Saint-Bernard","Col du Galibier","Mont Everest"]){
    const row=api.coherentClanWarVariantV126(find(name));
    assert.equal(row.environment.climate,"alpine",name);
  }
  const andes=api.coherentClanWarVariantV126({...find("Pont de Normandie"),referenceName:"Andes"});
  assert.equal(andes.environment.climate,"alpine");
  assert.equal(andes.geography.latitude,null);
  assert.equal(andes.geography.longitude,null);
  assert.equal(andes.geography.accuracy,"unverified");
  assert.equal(andes.original.status,"design-only");
});
