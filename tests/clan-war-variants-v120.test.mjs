import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle=await build({
  stdin:{
    contents:"export * from './app/game/systems/clanWarVariantAtlasV120';",
    resolveDir:process.cwd(),
  },bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"
});
const api=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const all=api.CLAN_WAR_VARIANT_ATLAS_V120;
const modes=["assault","outer","stealth","rts"];
const families=["original","lore","homage"];
const uniq=arr=>new Set(arr).size;

test("the V120 mission atlas has EXACTLY 100 variants per mode and family, 1200 total",()=>{
  assert.equal(all.length,1200);
  assert.equal(api.clanWarVariantCountsV120().total,1200);
  for(const mode of modes){
    assert.equal(all.filter(v=>v.mode===mode).length,300);
    for(const family of families){
      const subset=all.filter(v=>v.mode===mode&&v.family===family);
      assert.equal(subset.length,100,mode+" / "+family);
      assert.equal(api.clanWarVariantCountsV120()[mode+":"+family],100);
      assert.equal(uniq(subset.map(v=>v.id)),100);
      assert.equal(uniq(subset.map(v=>v.title)),100);
      assert.equal(uniq(subset.map(v=>v.settingName)),100);
      assert.equal(uniq(subset.map(v=>v.operation.resultReceipt)),100);
    }
  }
  assert.equal(uniq(all.map(v=>v.id)),1200);
  assert.equal(uniq(all.map(v=>v.title)),1200);
  assert.equal(uniq(all.map(v=>v.production.uniquenessSignature)),1200);
});

test("biomes, hazards, objectives, topology and climate are NOT recycled as renamed clones",()=>{
  for(const mode of modes)for(const family of families){
    const list=all.filter(v=>v.mode===mode&&v.family===family);
    assert.ok(uniq(list.map(v=>v.environment.biome))>=25,mode+"/"+family+" biome diversity");
    assert.ok(uniq(list.map(v=>v.environment.layout))>=25,mode+"/"+family+" geometry diversity");
    assert.ok(uniq(list.map(v=>v.environment.environmentalHazard))>=32,mode+"/"+family+" hazard diversity");
    assert.ok(uniq(list.map(v=>v.environment.weather))>=25,mode+"/"+family+" weather diversity");
    assert.ok(uniq(list.map(v=>v.operation.missionType))>=25,mode+"/"+family+" objective diversity");
    assert.ok(uniq(list.map(v=>v.operation.primaryObjective))>=25);
    assert.ok(uniq(list.map(v=>v.environment.territoryShapeRequest))>=90);
    assert.ok(list.every(v=>v.environment.entrances.length===2 && v.environment.entrances[0]!==v.environment.entrances[1]));
  }
});

test("400 distinct real-world inspiration names appear in the homage quarter, never a fictional canon claim",()=>{
  const homages=all.filter(v=>v.family==="homage");
  assert.equal(homages.length,400);
  assert.equal(uniq(homages.map(v=>v.referenceName)),400);
  assert.ok(homages.every(v=>v.referenceKind==="real-place-homage"&&!v.canonClaim));
  assert.ok(homages.every(v=>v.inspirationNote.includes("Aucune guerre Yautja historique revendiquée")));
  const named=homages.map(v=>v.referenceName);
  for(const ref of ["Cité de Carcassonne","Viaduc de Millau","Musée du Louvre","Calanques de Marseille"]){
    assert.ok(named.includes(ref),ref);
  }
});

test("all 400 original and 400 lore-context scenarios remain explicitly invented, continuity bounded",()=>{
  const original=all.filter(v=>v.family==="original"),lore=all.filter(v=>v.family==="lore");
  assert.equal(original.length,400);assert.equal(lore.length,400);
  assert.equal(uniq(original.map(v=>v.referenceName)),1);
  assert.ok(original.every(v=>v.referenceName===null&&v.referenceKind==="none"));
  assert.equal(uniq(lore.map(v=>v.referenceName)),25);
  assert.ok(lore.every(v=>!!v.referenceWork&&!!v.referenceContinuity&&
    v.referenceKind==="fiction-inspired"&&v.inspirationNote.includes("NON CANONIQUE")));
  for(const work of ["Prey (2022)","Predator: Badlands (2025)","Predator: Killer of Killers (2025)",
    "Aliens vs. Predator: Three World War (comics)"]){
    assert.ok(lore.some(v=>v.referenceWork===work),work);
  }
});

test("all 1200 are honest design specs with success, failure, extraction, hazard/power outage and no hidden annexation",()=>{
  const maxLen=4200;
  for(const variant of all){
    assert.equal(variant.status,"design-only");
    assert.equal(variant.version,120);
    assert.equal(variant.canonClaim,false);
    assert.equal(variant.operation.neverAutoAnnex,true);
    assert.ok(variant.operation.dynamicPhases.length===4);
    assert.ok(variant.operation.primaryObjective.length>=40);
    assert.ok(variant.operation.secondaryObjective.length>=25);
    assert.ok(variant.operation.victoryProof.length>=35);
    assert.ok(variant.operation.failure.length>=40);
    assert.ok(variant.operation.fallback.length>=70);
    assert.ok(variant.environment.powerFailure.length>=80);
    assert.ok(variant.environment.terrain.length>=4);
    assert.ok(variant.environment.liquid.length>=4);
    assert.ok(variant.environment.sky.length>=4);
    assert.ok(variant.environment.mapScaleHint.length>=10);
    assert.ok(variant.environment.territoryShapeRequest.startsWith("forme-region-V120-"));
    assert.ok(variant.environment.islandShapeRequest.startsWith("forme-île-proposée-"));
    assert.ok(variant.production.neededSprites.length>=4);
    assert.ok(variant.production.neededTiles.length>=4);
    assert.ok(variant.production.missingSystems.length>=4);
    assert.ok(variant.production.gameplayBackend.startsWith("clanWarOperationsV115."));
    assert.ok(variant.operation.recommendedUnitIds.every(x=>/^W3-U\d{2}$/.test(x)));
    assert.ok(variant.title.length<maxLen);
  }
});

test("normalized accent-friendly search and family filtering do not mutate the source",()=>{
  const allLength=all.length;
  assert.equal(api.searchClanWarVariantsV120("").length,1200);
  assert.equal(api.searchClanWarVariantsV120("","stealth","lore").length,100);
  assert.equal(api.searchClanWarVariantsV120("","rts","original").length,100);
  assert.equal(api.searchClanWarVariantsV120("","outer","homage").length,100);
  assert.equal(api.searchClanWarVariantsV120("CW120-A-OR-001").length,1);
  assert.equal(api.searchClanWarVariantsV120("calanques").length,1);
  assert.equal(api.searchClanWarVariantsV120("no-results-at-all-rrzz").length,0);
  assert.equal(all.length,allLength);
  const copy=api.createClanWarVariantAtlasV120();
  assert.deepEqual(copy,all);
  assert.notEqual(copy,all);
});
