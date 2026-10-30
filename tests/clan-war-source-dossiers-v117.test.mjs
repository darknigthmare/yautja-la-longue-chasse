import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

const compilation=await build({
  stdin:{contents:"export * from './app/game/systems/clanWarMissionDossiersV117'; export * from './app/game/systems/clanWarBibleV6';",resolveDir:process.cwd()},
  bundle:true,write:false,platform:"node",target:"es2022",format:"esm",logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+Buffer.from(compilation.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const catalog=api.warMissionDossiersV117(rules);

test("108 source-authored scenes, 12 campaigns, 12 maps, 15 doctrines, 18 accords are read verbatim",()=>{
  assert.equal(catalog.version,1);
  assert.equal(catalog.missions.length,108);
  assert.equal(catalog.missions.filter(s=>s.kind==="narrative").length,48);
  assert.equal(catalog.missions.filter(s=>s.kind==="rts").length,24);
  assert.equal(catalog.missions.filter(s=>s.kind==="three-mode").length,36);
  assert.equal(catalog.campaigns.length,12);
  assert.equal(catalog.maps.length,12);
  assert.equal(catalog.doctrines.length,15);
  assert.equal(catalog.diplomacy.length,18);
  assert.ok(catalog.missions.every(m=>m.playability==="dossier-only"));
  assert.ok(catalog.missions.every(m=>m.sourceCells.length>=9));
  assert.ok(catalog.missions.every(m=>m.provenance.includes("Bible V6")));
  assert.equal(new Set(catalog.missions.map(m=>m.id)).size,108);
  assert.equal(catalog.sourceSha,rules.metadata.sha256);
});

test("every W3-N, W3-RTS and W5-LM source cell survives into a dossier without invented narratives",()=>{
  for(const mission of catalog.missions){
    const entry=rules.entries.find(e=>e.sheet===mission.sheet&&e.id===mission.id);
    assert.ok(entry,mission.id);
    assert.equal(mission.title,String(entry.title),mission.id);
    assert.equal(mission.row,entry.row);
    const from=col=>String(entry.fields.find(f=>f.column===col)?.value??"").trim();
    if(mission.kind==="narrative"){
      assert.equal(mission.situation,from("G"));assert.equal(mission.choice,from("J"));
      assert.equal(mission.completion,from("K"));assert.equal(mission.retreat,from("L"));
      assert.equal(mission.rewardText,from("M"));assert.equal(mission.continuity,from("N"));
    }else if(mission.kind==="rts"){
      assert.equal(mission.situation,from("E"));assert.equal(mission.approach,from("I"));
      assert.equal(mission.choice,from("K"));assert.equal(mission.completion,from("L"));
      assert.equal(mission.retreat,from("M"));
    }else{
      assert.equal(mission.situation,from("G"));assert.equal(mission.approach,from("H"));
      assert.equal(mission.choice,from("I"));assert.equal(mission.completion,from("J"));
      assert.equal(mission.originalMode,from("E"));
    }
  }
});

test("all twelve linked campaign chapters are present, references validated, with no roster fabrication",()=>{
  for(const campaign of catalog.campaigns){
    assert.equal(campaign.missionIds.length,3,campaign.id);
    for(const id of campaign.missionIds){
      const mission=catalog.missions.find(m=>m.id===id);
      assert.ok(mission,campaign.id+" → "+id);
      assert.equal(mission.parentId,campaign.id);
      assert.equal(mission.mapId,campaign.mapId);
      assert.equal(mission.playability,"dossier-only");
    }
    assert.ok(catalog.maps.some(m=>m.id===campaign.mapId));
    for(const id of campaign.recommendedUnits)assert.ok(rules.units.find(u=>u.id===id));
  }
  assert.deepEqual(catalog.missingReferences,[]);
});

test("search respects accents, original mode, ID, title and class and never mutates source Bible",()=>{
  const baseline=JSON.stringify(rules.entries);
  assert.equal(api.searchWarMissionDossiersV117(catalog,"","narrative").length,48);
  assert.equal(api.searchWarMissionDossiersV117(catalog,"","rts").length,24);
  assert.equal(api.searchWarMissionDossiersV117(catalog,"","three-mode").length,36);
  const stone=api.searchWarMissionDossiersV117(catalog,"pierre");
  assert.ok(stone.length>0);
  const id=api.searchWarMissionDossiersV117(catalog,"W3-N01");
  assert.equal(id.length,1);
  assert.equal(id[0].id,"W3-N01");
  assert.equal(api.searchWarMissionDossiersV117(catalog,"no-mission-can-match").length,0);
  assert.equal(JSON.stringify(rules.entries),baseline);
});

test("alternate validated private rules keep caller-owned copies, not a global singleton",()=>{
  const altered={...rules,metadata:{...rules.metadata,sha256:"PRIVATE-ALTERED"},
    entries:rules.entries.map(e=>e.id==="W3-N01"?{...e,title:"Alternative narrative explicitly edited by private user"}:e)};
  const custom=api.warMissionDossiersV117(altered);
  assert.equal(custom.sourceSha,"PRIVATE-ALTERED");
  assert.equal(custom.missions.find(m=>m.id==="W3-N01").title,"Alternative narrative explicitly edited by private user");
  assert.notEqual(catalog.missions.find(m=>m.id==="W3-N01").title,"Alternative narrative explicitly edited by private user");
});
