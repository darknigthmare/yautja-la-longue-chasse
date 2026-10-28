import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
const compiled=await build({stdin:{contents:`export * from "./app/game/save";export * from "./app/game/data";export * from "./app/game/systems/harvestInventoryV112";`,resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,platform:"node",format:"esm",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const mission="jungle-vey";
const save=()=>{const s=api.defaultSave("2026-10-28T00:00:00.000Z");s.profile.clanMarks=100;s.inventory.fieldToolIds=["flaying-tool"];return s;};
const item=(partId="hide",run=0,corpse="prey")=>({id:mission+":"+run+":"+corpse+":"+partId,sourceId:mission+":"+run+":"+corpse,
  speciesId:"rifle-soldier",partId,label:"Peau préparée",quality:84,massKg:3,volumeUnits:2,stage:"raw"});
const use=(run=0,corpse="prey")=>mission+":"+run+":flay:"+corpse;
const deliver=(s,items=[item()],uses=[use()],success=true,run=0)=>api.deliverHarvestV112(s,items,uses,success,mission,run);
const depot=s=>api.harvestInventoryForV112(s.inventory);
test("old inventory migrates empty without granting a field tool",()=>{
  const s=save();delete s.inventory.harvestV112;delete s.inventory.fieldToolIds;
  const n=api.normalizeSave(s);assert.deepEqual(n.inventory.fieldToolIds,[]);
  assert.deepEqual(depot(n),api.emptyHarvestInventoryV112());
});
for(const mutation of [
  x=>x.version=2,x=>x.toolCondition=NaN,x=>x.toolCondition=101,x=>x.toolCondition=4.5,
  x=>x.specimens=[{...item(),massKg:Infinity}],x=>x.specimens=[{...item(),stage:"invented"}],
  x=>x.specimens=[item(),item()],x=>x.jobs=[{id:"invented"}],x=>x.toolUseIds=["x","x"],
  x=>x.settledEncounterRuns={"unknown":0},x=>x.archive=[{speciesId:"x",partId:"bone",label:"Bone",count:0,qualityTotal:0}],
  x=>x.specimens=[{...item(),stage:"mounted"}],
])test("present invalid or future preservation data is refused by actual save import: "+mutation.toString(),()=>{
  const s=save();mutation(s.inventory.harvestV112);
  assert.equal(api.normalizeHarvestInventoryV112(s.inventory.harvestV112),null);
  assert.equal(api.parseSaveImport(JSON.stringify(s)).save,null);
});
test("capacity is explicit for all armor classes and rejected pickup leaves source inventory untouched",()=>{
  assert.deepEqual(api.capacityForArmorV112("scout"),{massKg:24,volumeUnits:18});
  assert.deepEqual(api.capacityForArmorV112("hunter"),{massKg:36,volumeUnits:24});
  assert.deepEqual(api.capacityForArmorV112("berserker"),{massKg:52,volumeUnits:30});
  const carried=[{...item(),massKg:23}],before=structuredClone(carried),another={...item("bone"),massKg:2};
  const refused=api.tryCarrySpecimenV112(carried,another,"scout");
  assert.equal(refused.ok,false);assert.deepEqual(carried,before);assert.deepEqual(refused.items,before);
  assert.match(refused.reason,/reste sur la proie/);
  assert.equal(api.tryCarrySpecimenV112(carried,another,"hunter").ok,true);
});
test("volume can fill a pack before mass, and repeated anatomical part has no second slot",()=>{
  assert.equal(api.tryCarrySpecimenV112([{...item(),massKg:1,volumeUnits:18}],{...item("bone"),massKg:1,volumeUnits:1},"scout").ok,false);
  const one=api.tryCarrySpecimenV112([],item(),"scout");
  assert.equal(api.tryCarrySpecimenV112(one.items,item(),"scout").ok,false);
  assert.equal(api.tryCarrySpecimenV112([],{...item(),stage:"mounted"},"scout").ok,false);
});
test("load changes movement jump climb effort and noise continuously; body mass adds load",()=>{
  const empty=api.fieldLoadV112([],"hunter");assert.equal(empty.movementMultiplier,1);assert.equal(empty.jumpMultiplier,1);
  const full=api.fieldLoadV112([{...item(),massKg:36,volumeUnits:24}],"hunter");
  assert.equal(full.ratio,1);assert.ok(Math.abs(full.movementMultiplier-.68)<1e-12);assert.equal(full.jumpMultiplier,.84);
  assert.equal(full.climbStaminaMultiplier,1.6);assert.equal(full.noiseMultiplier,1.8);
  assert.equal(api.fieldLoadV112([],"hunter",72).overloaded,true);
  assert.ok(Math.abs(api.fieldLoadV112([],"hunter",72).movementMultiplier-.68)<1e-12);
});
test("a successful extraction deposits finite specimens and records actual tool wear atomically",()=>{
  const s=save(),before=structuredClone(s),r=deliver(s,[item()],[use(),mission+":0:harvest-hide:prey"]);
  assert.equal(r.ok,true);assert.deepEqual(s,before);
  assert.equal(r.inventory.harvestV112.specimens.length,1);assert.equal(r.inventory.harvestV112.toolCondition,90);
  assert.equal(r.inventory.harvestV112.settledEncounterRuns[mission],0);
});
test("failed and abandoned extraction only records completed work wear, without bringing specimens home",()=>{
  for(const success of [false]) {
    const r=deliver(save(),[item()],[use()],success);
    assert.equal(r.ok,true);assert.equal(r.inventory.harvestV112.specimens.length,0);
    assert.equal(r.inventory.harvestV112.toolCondition,95);
  }
});
test("same completed encounter cannot charge wear or restore a specimen after repair",()=>{
  let s=save(),r=deliver(s);s={...s,inventory:r.inventory};
  s=api.repairFieldToolV112(s).save;
  const same=deliver(s);assert.equal(same.ok,true);assert.equal(same.inventory,s.inventory);
  assert.equal(same.inventory.harvestV112.toolCondition,100);assert.equal(same.inventory.harvestV112.specimens.length,1);
});
test("per-mission watermark compacts usage receipts safely across later encounters",()=>{
  let s=save();s.inventory=deliver(s).inventory;s.missionProgress[mission].attempts=1;
  const next=deliver(s,[item("bone",1)],[use(1)],true,1);assert.equal(next.ok,true);
  const ledger=next.inventory.harvestV112;
  assert.equal(ledger.specimens.length,2);assert.equal(ledger.toolCondition,90);
  assert.deepEqual(ledger.toolUseIds,[use(1)]);assert.equal(ledger.settledEncounterRuns[mission],1);
  s.inventory=next.inventory;const old=deliver(s);assert.equal(old.inventory,s.inventory);
});
for(const [items,uses,run] of [
  [[{...item(),sourceId:"other:0:prey"}],[use()],0],
  [[item()],["other:0:flay:prey"],0],
  [[item()],[use()],1],
  [[item()],[use(),use()],0],
  ["invalid",[],0],[[],{},0],[[{...item(),massKg:-1}],[],0],
  [[item(),item()],[],0],
])test("forged, duplicated, malformed or stale mission payload is refused: "+JSON.stringify([items,uses,run]),()=>{
  const s=save(),before=structuredClone(s),r=deliver(s,items,uses,true,run);
  assert.equal(r.ok,false);assert.equal(r.inventory,s.inventory);assert.deepEqual(s,before);
});
test("tool-free campaign cannot claim wear or completed tool operations",()=>{
  const s=save();s.inventory.fieldToolIds=[];assert.equal(deliver(s).ok,false);
});
test("missing encounter proof cannot grant a new specimen; legacy empty results stay compatible",()=>{
  const s=save();assert.equal(api.deliverHarvestV112(s,[item()],[],true).ok,false);
  const legacy=api.deliverHarvestV112(s,undefined,undefined,true);assert.equal(legacy.ok,true);assert.equal(legacy.inventory,s.inventory);
});
function withItem(){let s=save();s.inventory=deliver(s,[item()],[]).inventory;return s;}
test("start pays once, each work unit survives save roundtrip, completed step cannot repeat",()=>{
  let s=withItem();const start=api.startConservationV112(s,item().id);assert.equal(start.ok,true);
  assert.equal(s.profile.clanMarks,100);s=start.save;assert.equal(s.profile.clanMarks,98);
  const same=api.startConservationV112(s,item().id);assert.equal(same.ok,false);assert.equal(same.save,s);
  const id=depot(s).jobs[0].id;
  for(let unit=1;unit<=3;unit++){
    const worked=api.workConservationV112(s,id);assert.equal(worked.ok,true);s=worked.save;
    assert.equal(depot(s).jobs[0].unitsDone,unit);assert.equal(s.profile.clanMarks,98);
    const parsed=api.parseSaveImport(JSON.stringify(s));assert.ok(parsed.save);s=parsed.save;
  }
  assert.equal(depot(s).specimens[0].stage,"cleaned");assert.equal(api.workConservationV112(s,id).ok,false);
});
test("all four conservation stages require paid work, preserve quality, and mount a separate physical specimen",()=>{
  let s=withItem(),count=0;
  for(const step of api.CONSERVATION_STEPS_V112){
    const started=api.startConservationV112(s,item().id);assert.equal(started.ok,true);s=started.save;
    for(let i=0;i<step.units;i++){s=api.workConservationV112(s,item().id+":"+step.to).save;count++;}
    assert.equal(depot(s).specimens[0].stage,step.to);
    assert.ok(api.parseSaveImport(JSON.stringify(s)).save);
  }
  assert.equal(count,15);assert.equal(s.profile.clanMarks,86);assert.equal(depot(s).specimens[0].quality,84);
  assert.equal(depot(s).jobs.filter(j=>j.status==="completed").length,4);
  assert.equal(api.startConservationV112(s,item().id).ok,false);
  assert.deepEqual(s.trophies,[]);assert.equal(s.profile.honor,0);
  const archived=api.archiveMountedSpecimenV112(s,item().id);assert.equal(archived.ok,true);s=archived.save;
  assert.equal(depot(s).specimens.length,0);assert.equal(depot(s).jobs.length,0);
  assert.deepEqual(depot(s).archive,[{speciesId:"rifle-soldier",partId:"hide",label:"Peau préparée",count:1,qualityTotal:84}]);
  assert.ok(api.parseSaveImport(JSON.stringify(s)).save);
  assert.equal(api.archiveMountedSpecimenV112(s,item().id).ok,false);
  assert.equal(deliver(s,[item()],[],true).inventory,s.inventory,"archive does not make an old source harvestable again");
});
test("archiving raw work is refused and insufficient marks never creates a job",()=>{
  let s=withItem();assert.equal(api.archiveMountedSpecimenV112(s,item().id).ok,false);
  s.profile.clanMarks=1;const r=api.startConservationV112(s,item().id);
  assert.equal(r.ok,false);assert.equal(r.save,s);assert.deepEqual(depot(s).jobs,[]);
});
test("queue has 16 work stations and does not charge a seventeenth item",()=>{
  let s=save();s.profile.clanMarks=1000;s.inventory.harvestV112.specimens=Array.from({length:17},(_,i)=>item("hide",0,"prey-"+i));
  for(const specimen of depot(s).specimens.slice(0,16)){const r=api.startConservationV112(s,specimen.id);assert.equal(r.ok,true);s=r.save;}
  const before=s.profile.clanMarks,r=api.startConservationV112(s,depot(s).specimens[16].id);
  assert.equal(r.ok,false);assert.equal(r.save.profile.clanMarks,before);assert.equal(depot(s).jobs.length,16);
});
test("full workbench refuses delivery as a whole, preserving every item and the terminal operation",()=>{
  const s=save();s.inventory.harvestV112.specimens=Array.from({length:256},(_,i)=>item("hide",0,"stored-"+i));
  const before=structuredClone(s),r=deliver(s,[item("bone",0,"new")],[]);
  assert.equal(r.ok,false);assert.match(r.reason,/Dépôt plein/);assert.equal(r.inventory,s.inventory);assert.deepEqual(s,before);
});
test("wear is deterministic at successful completion and worn tools remain recoverable free of charge",()=>{
  assert.equal(api.toolConditionAfterUsesV112(100,0),100);assert.equal(api.toolConditionAfterUsesV112(100,4),80);
  assert.equal(api.toolConditionAfterUsesV112(10,5),0);assert.equal(api.flayingToolWorkMultiplierV112(100),1);
  assert.equal(api.flayingToolWorkMultiplierV112(0),1.65);
  let s=save();s.inventory.harvestV112.toolCondition=0;const r=api.repairFieldToolV112(s);
  assert.equal(r.ok,true);assert.equal(r.save.profile.clanMarks,s.profile.clanMarks);assert.equal(depot(r.save).toolCondition,100);
  assert.equal(api.repairFieldToolV112(r.save).ok,false);
});
function result(outcome="success"){
  const m=api.MISSION_BY_ID[mission];
  return {missionId:mission,difficultyId:"hunter",outcome,score:80,elapsedSeconds:60,
    completedObjectiveIds:m.objectives.filter(o=>o.required||o.kind==="extract").map(o=>o.id),
    honorEvents:[],trophyQuality:"blooded",trophyClaims:[{id:"apex:0",definitionId:m.trophy.id,targetName:m.targetName,targetKind:m.targetKind,
      partId:m.trophy.partId,condition:"intact",quality:"blooded"}],kills:1,scans:0,secondWindUsed:false,completedAt:"2026-10-28T01:00:00.000Z",
    specimensV112:[item()],toolUseIdsV112:[use()],harvestEncounterRunV112:0};
}
test("real campaign reducer keeps specimens and tool wear through content unlocks in one result",()=>{
  const s=save(),before=structuredClone(s),next=api.applyMissionResult(s,result());
  assert.deepEqual(s,before);assert.equal(next.missionProgress[mission].attempts,1);
  assert.equal(depot(next).specimens.length,1);assert.equal(depot(next).toolCondition,95);
  assert.equal(depot(next).settledEncounterRuns[mission],0);assert.ok(api.parseSaveImport(JSON.stringify(next)).save);
});
test("actual failed/abandoned campaign results retain wear and no raw specimens",()=>{
  for(const outcome of ["failed","abandoned"]){const next=api.applyMissionResult(save(),result(outcome));
    assert.equal(depot(next).specimens.length,0);assert.equal(depot(next).toolCondition,95);
    assert.equal(next.missionProgress[mission].attempts,1);}
});
